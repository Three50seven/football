(function ($) {
    var self = this;

    //Timer Source: https://stackoverflow.com/questions/20467548/knockout-js-how-to-implement-countdown-timer
    //GAME TIMER VARIABLES
    self.currentQuarter = ko.observable(1);
    self.timeOfPossession = ko.observable(0);
    self.isBeginningOfHalf = true; //flag to indicate when the beginning of a half occurs
    self.timerId = 0;
    self.elapsedTime = ko.observable(0);
    self.initialTime = ko.observable(MODULES.Constants.MAX_TIME_OF_QUARTER);
    self.isRunning = ko.observable(false);

    //FUNCTIONS
    self.currentQuarterDisplay = ko.computed(function () {
        return UTILITIES.getNumberWithEnding(self.currentQuarter());
    });
    self.currentTeamHasTimeOuts = ko.computed(function () {
        if (self.currentTeamWithBall() === self.awayTeamID() && self.awayTeamTimeOuts() > 0)
            return true;
        if (self.currentTeamWithBall() === self.homeTeamID() && self.homeTeamTimeOuts() > 0)
            return true;

        return false;
    });    
    self.remainingTime = ko.computed(function () {
        return self.initialTime() - self.elapsedTime();
    });
    //display time source: https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
    self.remainingTimeDisplay = ko.computed(function () {
        return UTILITIES.getTimeDisplay(self.remainingTime());
    });    
    self.StartCounter = function () {
        //self.elapsedTime(0); //do not reset the counter each time counter is started
        self.isRunning(true);
        self.timerId = window.setInterval(function () {
            self.elapsedTime(self.elapsedTime() + 1);
            if (self.remainingTime() === 0) {
                clearInterval(self.timerId);
                self.isRunning(false);
                self.Callback();
            }
        }, MODULES.GameVariables.TimeIntervalCountDown);
    };
    self.StopCounter = function () {
        clearInterval(self.timerId);
        self.isRunning(false);
    };
    self.Callback = function () { };
    self.CallTimeout = function () {
        console.log('TODO: Setup Timeout functionality.');
        if (self.currentTeamHasTimeOuts()) {
            if (self.currentTeamWithBall() === self.awayTeamID())
                self.awayTeamTimeOuts(self.awayTeamTimeOuts() - 1);
            else
                self.homeTeamTimeOuts(self.homeTeamTimeOuts() - 1);
        }
        else
            alert('No Timeouts Remaining');
    };
})(jQuery);