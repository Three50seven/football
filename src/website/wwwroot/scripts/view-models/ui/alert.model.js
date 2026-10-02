//In-page alert dialog. A calmer stand-in for the native window.alert() the game used to fire
//on every penalty, timeout and period change.
//
//Why not just keep alert(): a native alert blocks the whole event loop until it is dismissed, which
//also freezes the game and play clocks behind it. Reproducing that takes two layers, because this
//dialog is not modal and the game keeps running while it is on screen:
//  1. Suspend/resume (here) - stop both clocks the moment the dialog opens and put them back on
//     dismissal if nothing else touched them in the meantime.
//  2. A tick guard in timer.model.js - the play that raised an alert usually records itself
//     afterwards and restarts the clocks behind the dialog, so stopping them is not enough on its
//     own. The interval callbacks no-op while a dialog is up, which is what actually freezes them.
//
//Why the clockEpoch check in layer 1: while the dialog is open the game may legitimately stop or start
//a clock itself (a delay of game penalty stops the game clock). timer.model.js bumps clockEpoch on
//every clock start/stop, so on dismissal the clocks are only restarted when the epoch still matches
//the one captured at suspend time - meaning nothing touched them and the game has not already made
//its own decision.
//
//Public API:
//  ShowGameAlert(message, options)
//    message - the text shown in the body of the dialog (required)
//    options - { title, tone, buttonText, onDismiss }, all optional
//              tone: 'info' | 'quarter' | 'final' | 'warning' | 'penalty' | 'forfeit'
//              onDismiss: callback run when the player clicks OK, before the clocks are restored
//  DismissGameAlert() - closes the dialog (also bound to Enter/Escape)
//  ClearGameAlerts()   - closes the dialog and drops anything queued, used on a game reset
(function ($) {
    var self = this;

    //ALERT DIALOG STATE:
    self.gameAlertIsOpen = ko.observable(false);
    self.gameAlertTitle = ko.observable('');
    self.gameAlertMessage = ko.observable('');
    self.gameAlertTone = ko.observable('info');
    self.gameAlertButtonText = ko.observable('OK');

    //alerts raised while the dialog is already up wait their turn instead of replacing it - the two
    //minute warning and the end of the quarter can land back to back and both need to be read
    var alertQueue = [];
    var alertOnDismiss = null;
    var suspendedClocks = null;

    //the markup stays tone-agnostic and just picks up a class, so a new tone only needs CSS
    self.gameAlertToneClass = ko.computed(function () {
        return 'game-alert-tone-' + self.gameAlertTone();
    });

    self.SuspendClocksForAlert = function () {
        //guard: already suspended, or the timer model has not loaded
        if (suspendedClocks || typeof self.StartCounter !== 'function')
            return;

        let wasGameClockRunning = self.isRunning();
        let wasPlayClockRunning = self.playClockTimerId !== 0;
        let playClockSecondsLeft = self.playClockRemaining();

        self.StopCounter();
        self.StopPlayClock();

        //read the epoch AFTER stopping - StopCounter and StopPlayClock bump it themselves
        suspendedClocks = {
            gameClockRunning: wasGameClockRunning,
            playClockRunning: wasPlayClockRunning,
            playClockSecondsLeft: playClockSecondsLeft,
            clockEpoch: self.clockEpoch
        };
    };

    self.ResumeClocksAfterAlert = function () {
        if (!suspendedClocks)
            return;

        let suspended = suspendedClocks;
        suspendedClocks = null;

        //something restarted or stopped a clock while the dialog was up - the game already
        //decided what should be running, so leave it alone
        if (self.clockEpoch !== suspended.clockEpoch)
            return;

        if (suspended.playClockRunning)
            self.StartPlayClock(suspended.playClockSecondsLeft);

        if (suspended.gameClockRunning)
            self.StartCounter();
    };

    //put focus on the OK button so Enter dismisses the dialog and a stray spacebar cannot roll
    //dice or call a play behind it
    self.FocusGameAlertButton = function () {
        if (typeof document === 'undefined')
            return;

        window.setTimeout(function () {
            let okButton = document.getElementById('gameAlertOkButton');

            if (okButton && okButton.focus)
                okButton.focus();
        }, 0);
    };

    self.gameAlertOnKeyDown = function (viewModel, event) {
        if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            self.DismissGameAlert();
            return false;
        }

        return true;
    };

    //the backdrop closes the dialog on a click, but a click on the dialog itself must not - otherwise
    //the OK button would double-handle and this would swallow the event before the button sees it
    self.gameAlertOnDialogClick = function (viewModel, event) {
        event.stopPropagation();
        return true;
    };

    function OpenGameAlert(request) {
        let options = request.options;
        let wasOpen = self.gameAlertIsOpen();

        self.gameAlertTitle(options.title || '');
        self.gameAlertMessage(request.message);
        self.gameAlertTone(options.tone || 'info');
        self.gameAlertButtonText(options.buttonText || 'OK');
        alertOnDismiss = options.onDismiss || null;

        self.SuspendClocksForAlert();

        //only flip the flag when the dialog is actually appearing - handing over to a queued
        //alert rewrites the content in place so the overlay never blinks off and on again
        if (!wasOpen)
            self.gameAlertIsOpen(true);

        self.FocusGameAlertButton();
    }

    self.ShowGameAlert = function (message, options) {
        let request = { message: message, options: options || {} };

        //queue rather than replace, so a burst of alerts each get their own turn
        if (self.gameAlertIsOpen()) {
            alertQueue.push(request);
            return;
        }

        OpenGameAlert(request);
    };

    self.DismissGameAlert = function () {
        if (!self.gameAlertIsOpen())
            return;

        if (alertQueue.length > 0) {
            //hand straight over to the next alert. suspendedClocks is deliberately left in
            //place, so the clocks stay stopped and the player's timer keeps its remaining
            //seconds across the whole run of queued alerts
            OpenGameAlert(alertQueue.shift());
            return;
        }

        self.gameAlertIsOpen(false);

        let onDismiss = alertOnDismiss;
        alertOnDismiss = null;

        //the callback runs last so it sees the dialog already closed and can start a clock,
        //which ResumeClocksAfterAlert then respects rather than undoing
        if (onDismiss)
            onDismiss();

        self.ResumeClocksAfterAlert();
    };

    self.ClearGameAlerts = function () {
        alertQueue.length = 0;
        alertOnDismiss = null;
        suspendedClocks = null;
        self.gameAlertIsOpen(false);
    };
})(jQuery);