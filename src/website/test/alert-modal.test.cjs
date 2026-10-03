const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const alertSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'ui', 'alert.model.js'),
    'utf8'
);
const timerSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'timer', 'timer.model.js'),
    'utf8'
);

function observable(initialValue) {
    let value = initialValue;
    return function (nextValue) {
        if (arguments.length)
            value = nextValue;
        return value;
    };
}

// Loads the real alert model against stand-in clocks that bump clockEpoch exactly the way
// timer.model.js does, so the suspend/resume guard can be exercised for real.
function createAlertDialog() {
    const calls = { counterStarts: 0, counterStops: 0, playClockStarts: [], playClockStops: 0 };

    const context = {
        console: { log() {} },
        jQuery: {},
        ko: {
            observable,
            computed: callback => callback
        },
        clockEpoch: 0,
        timerId: 0,
        playClockTimerId: 0,
        isRunning: observable(false),
        playClockRemaining: observable(40),
        StartCounter() {
            calls.counterStarts++;
            context.clockEpoch++;
            context.isRunning(true);
            context.timerId = 1;
        },
        StopCounter() {
            calls.counterStops++;
            context.clockEpoch++;
            context.isRunning(false);
            context.timerId = 0;
        },
        StartPlayClock(seconds) {
            calls.playClockStarts.push(seconds);
            context.clockEpoch++;
            context.playClockRemaining(seconds);
            context.playClockTimerId = 1;
        },
        StopPlayClock() {
            calls.playClockStops++;
            context.clockEpoch++;
            context.playClockTimerId = 0;
        }
    };

    vm.createContext(context);
    vm.runInContext(alertSource, context);

    return { context, calls };
}

// Loads the REAL alert model together with the REAL timer model, keeping hold of the interval
// callbacks so the ticks can be driven by hand. Stubs of the clock functions cannot catch this bug -
// it lives in what the interval callbacks do while a dialog is up.
function createAlertWithRealTimer() {
    const armedTicks = [];
    let nextTimerId = 0;

    const context = {
        console: { log() {} },
        jQuery: {},
        ko: {
            observable,
            computed: callback => callback
        },
        setInterval() { return ++nextTimerId; },
        clearInterval() {},
        window: { setInterval() { return ++nextTimerId; } },
        MODULES: {
            Constants: {
                MAX_TIME_OF_QUARTER: 900,
                PLAY_CLOCK_NORMAL: 40,
                PLAY_CLOCK_SHORT: 25,
                TWO_MINUTE_WARNING_SECONDS: 120
            },
            GameVariables: { TimeIntervalCountDown: 1000 }
        },
        UTILITIES: {
            getNumberWithEnding: number => `${number}th`,
            getTimeDisplay: seconds => String(seconds)
        },
        pointAttemptAfterTouchDown: observable(false),
        showKickoffControls: observable(false),
        playMaker: { delayOfGamePenalty() { context.delayOfGameFired += 1; } },
        delayOfGameFired: 0
    };

    // keep hold of every interval callback the timer model arms, so a test can drive the ticks
    const realWindowSetInterval = context.window.setInterval;
    context.window.setInterval = (callback) => {
        armedTicks.push(callback);
        return realWindowSetInterval();
    };

    vm.createContext(context);
    vm.runInContext(timerSource, context);
    vm.runInContext(alertSource, context);

    // each clock's callback mentions only its own observable, which tells them apart reliably
    // even when the same clock is re-armed several times
    const lastTickMatching = pattern => {
        const matches = armedTicks.filter(tick => pattern.test(tick.toString()));
        return matches[matches.length - 1];
    };

    return {
        context,
        tickGameClock: () => lastTickMatching(/AdvanceTime/)(),
        tickPlayClock: () => lastTickMatching(/playClockRemaining/)()
    };
}
test('an alert opens the dialog with its title, message, tone and an OK button', () => {
    const { context } = createAlertDialog();

    context.ShowGameAlert('The 1st quarter is complete.', {
        title: 'End of the 1st Quarter',
        tone: 'quarter'
    });

    assert.equal(context.gameAlertIsOpen(), true);
    assert.equal(context.gameAlertTitle(), 'End of the 1st Quarter');
    assert.equal(context.gameAlertMessage(), 'The 1st quarter is complete.');
    assert.equal(context.gameAlertTone(), 'quarter');
    assert.equal(context.gameAlertToneClass(), 'game-alert-tone-quarter');
    assert.equal(context.gameAlertButtonText(), 'OK');
});

test('an alert with no options falls back to the neutral tone, no title and an OK button', () => {
    const { context } = createAlertDialog();

    context.ShowGameAlert('Choose a play');

    assert.equal(context.gameAlertIsOpen(), true);
    assert.equal(context.gameAlertTitle(), '');
    assert.equal(context.gameAlertTone(), 'info');
    assert.equal(context.gameAlertToneClass(), 'game-alert-tone-info');
    assert.equal(context.gameAlertButtonText(), 'OK');
});

test('a second alert raised while one is open is queued rather than replacing it', () => {
    const { context } = createAlertDialog();

    context.ShowGameAlert('Two minute warning - 2:00 remaining', { title: 'Two Minute Warning' });
    context.ShowGameAlert('End of the 2nd quarter', { title: 'End of the 2nd Quarter' });

    assert.equal(context.gameAlertMessage(), 'Two minute warning - 2:00 remaining', 'the first alert stays put');
    assert.equal(context.gameAlertIsOpen(), true);

    context.DismissGameAlert();

    assert.equal(context.gameAlertIsOpen(), true, 'the dialog stays up for the queued alert');
    assert.equal(context.gameAlertTitle(), 'End of the 2nd Quarter');

    context.DismissGameAlert();

    assert.equal(context.gameAlertIsOpen(), false);
});

test('the onDismiss callback runs when the player closes the dialog', () => {
    const { context } = createAlertDialog();
    let dismissed = false;

    context.ShowGameAlert('End of the 1st quarter', { onDismiss: () => { dismissed = true; } });
    assert.equal(dismissed, false, 'nothing runs while the dialog is up');

    context.DismissGameAlert();

    assert.equal(dismissed, true);
});
test('the clocks are suspended while the dialog is up and restarted when it closes', () => {
    const { context, calls } = createAlertDialog();

    context.StartCounter(); //game clock running
    context.StartPlayClock(40); //play clock running with 40s left
    calls.counterStarts = 0;
    calls.playClockStarts.length = 0;

    context.ShowGameAlert('No Timeouts Remaining');

    assert.equal(context.isRunning(), false, 'game clock stopped');
    assert.equal(context.playClockTimerId, 0, 'play clock stopped');

    context.DismissGameAlert();

    assert.equal(context.isRunning(), true, 'game clock runs again');
    assert.deepEqual(calls.playClockStarts, [40], 'play clock resumes with the time it had left');
});

test('a clock the game changed while the dialog was up is left alone on dismissal', () => {
    const { context, calls } = createAlertDialog();

    context.StartCounter();
    calls.counterStarts = 0;

    context.ShowGameAlert('DELAY OF GAME - the offense failed to snap the ball in time.');

    //the penalty is recorded while the dialog is still up, and a penalty stops the game clock
    context.StopCounter();

    context.DismissGameAlert();

    assert.equal(context.isRunning(), false, 'the penalty already decided the clock stays stopped');
    assert.equal(calls.counterStarts, 0, 'the dialog does not override that decision');
});

test('an onDismiss callback that starts a clock wins over the automatic resume', () => {
    const { context, calls } = createAlertDialog();

    context.StartCounter();
    context.ShowGameAlert('End of the 1st quarter', {
        onDismiss: () => context.StartPlayClock(25)
    });

    context.DismissGameAlert();

    assert.deepEqual(calls.playClockStarts, [25], 'the next snap gets the shortened play clock');
});

test('clearing alerts closes the dialog and drops anything still queued', () => {
    const { context } = createAlertDialog();

    context.ShowGameAlert('Final Score: HOME 21 - AWAY 17', { title: 'Game Over' });
    context.ShowGameAlert('End of the 1st quarter');

    context.ClearGameAlerts();

    assert.equal(context.gameAlertIsOpen(), false);

    //a stray dismiss must not resurrect the queued alert over the new coin toss
    context.DismissGameAlert();
    assert.equal(context.gameAlertIsOpen(), false);
});

test('Enter and Escape close the dialog, other keys are left alone', () => {
    const { context } = createAlertDialog();
    let prevented = 0;
    const keyEvent = key => ({ key, preventDefault() { prevented++; } });

    context.ShowGameAlert('Choose a play');

    context.gameAlertOnKeyDown(context, keyEvent('a'));

    assert.equal(context.gameAlertIsOpen(), true, 'a plain key does not close the dialog');
    assert.equal(prevented, 0);

    context.gameAlertOnKeyDown(context, keyEvent('Escape'));

    assert.equal(context.gameAlertIsOpen(), false);
    assert.equal(prevented, 1);
});

test('a click inside the dialog is stopped so it does not fall through to the backdrop', () => {
    const { context } = createAlertDialog();
    let stopped = 0;

    context.ShowGameAlert('Choose a play');
    context.gameAlertOnDialogClick(context, { stopPropagation() { stopped++; } });

    assert.equal(stopped, 1);
    assert.equal(context.gameAlertIsOpen(), true, 'the dialog survives its own click');
});

test('the play clock cannot expire behind an open alert', () => {
    const { context, tickPlayClock } = createAlertWithRealTimer();

    context.StartPlayClock(1);

    context.ShowGameAlert('No Timeouts Remaining', { title: 'No Timeouts Remaining' });
    tickPlayClock();

    assert.equal(context.playClockRemaining(), 1, 'the play clock is held');
    assert.equal(context.delayOfGameFired, 0, 'no penalty fires while the dialog is up');

    context.DismissGameAlert();
    tickPlayClock();

    assert.equal(context.delayOfGameFired, 1, 'it fires once the player dismisses the alert');
});

test('the clocks stay frozen when the play that raised the alert restarts them behind the dialog', () => {
    // this is the delay of game flow: ShowGameAlert runs, then delayOfGamePenalty keeps going and
    // records the play, which starts the game clock and a fresh 25 second play clock. Those
    // restarts must not be able to tick behind the player's back.
    const { context, tickGameClock, tickPlayClock } = createAlertWithRealTimer();

    context.elapsedTime(300);

    context.ShowGameAlert('DELAY OF GAME - the offense failed to snap the ball in time.', {
        title: 'Delay of Game',
        tone: 'penalty'
    });

    // what recordPlay/recordTimeOfPossession does once control returns to delayOfGamePenalty
    context.StartCounter();
    context.StartPlayClock(25);

    tickGameClock();
    tickPlayClock();

    assert.equal(context.elapsedTime(), 300, 'the game clock did not advance');
    assert.equal(context.playClockRemaining(), 25, 'the play clock did not advance');

    context.DismissGameAlert();

    tickGameClock();
    tickPlayClock();

    assert.equal(context.elapsedTime(), 301, 'the game clock resumes after dismissal');
    assert.equal(context.playClockRemaining(), 24, 'the play clock resumes from where it was held');
});

test('the play clock is still held across a run of queued alerts', () => {
    const { context, tickPlayClock } = createAlertWithRealTimer();

    context.StartPlayClock(30);

    context.ShowGameAlert('Two minute warning - 2:00 remaining', { title: 'Two Minute Warning' });
    context.ShowGameAlert('End of the 2nd quarter', { title: 'End of the 2nd Quarter' });

    context.DismissGameAlert();
    tickPlayClock();

    assert.equal(context.playClockRemaining(), 30, 'still held while the second alert is up');

    context.DismissGameAlert();
    tickPlayClock();

    assert.equal(context.playClockRemaining(), 29, 'resumes only after the last alert clears');
});

test('a run of queued alerts holds the clocks stopped until the queue drains', () => {
    const { context, calls } = createAlertDialog();

    context.StartCounter();
    context.StartPlayClock(17);
    calls.counterStarts = 0;
    calls.playClockStarts.length = 0;

    context.ShowGameAlert('Two minute warning - 2:00 remaining', { title: 'Two Minute Warning' });
    context.ShowGameAlert('End of the 2nd quarter', { title: 'End of the 2nd Quarter' });
    context.ShowGameAlert('Halftime - the away team receives the second-half kickoff.', { title: 'Halftime' });

    context.DismissGameAlert();
    assert.equal(context.isRunning(), false, 'still suspended after the first dismissal');
    assert.equal(context.gameAlertTitle(), 'End of the 2nd Quarter');

    context.DismissGameAlert();
    assert.equal(context.isRunning(), false, 'still suspended after the second dismissal');
    assert.equal(context.gameAlertTitle(), 'Halftime');

    context.DismissGameAlert();

    assert.equal(context.gameAlertIsOpen(), false, 'the dialog closes once the queue drains');
    assert.equal(context.isRunning(), true, 'the game clock resumes');
    assert.deepEqual(calls.playClockStarts, [17], 'the play clock resumes with the time it had left');
});