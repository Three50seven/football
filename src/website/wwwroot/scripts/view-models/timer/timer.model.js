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
    self.gameOver = ko.observable(false);
    self.lastTimeoutTeam = ko.observable(0); //tracks the team that most recently called a timeout, prevents back-to-back timeouts by the same team
    self.playClockTimerId = 0;
    self.playClockRemaining = ko.observable(MODULES.Constants.PLAY_CLOCK_NORMAL);
    self.isGamePaused = ko.observable(false);
    self.wasGameClockRunningBeforePause = false;
    self.wasPlayClockRunningBeforePause = false;
    self.consecutiveDelayOfGamePenalties = ko.observable(0); //tracks repeated delay of game violations by the team currently snapping the ball

    //FUNCTIONS
    self.currentQuarterDisplay = ko.computed(function () {
        return self.gameOver() ? 'Final' : UTILITIES.getNumberWithEnding(self.currentQuarter());
    });
    self.remainingTime = ko.computed(function () {
        return self.initialTime() - self.elapsedTime();
    });
    //display time source: https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
    self.remainingTimeDisplay = ko.computed(function () {
        return UTILITIES.getTimeDisplay(self.remainingTime());
    });
    self.playClockDisplay = ko.computed(function () {
        return Math.max(self.playClockRemaining(), 0);
    });
    self.StartCounter = function () {
        //self.elapsedTime(0); //do not reset the counter each time counter is started
        if (self.gameOver())
            return;

        clearInterval(self.timerId);
        self.isRunning(true);
        self.timerId = window.setInterval(function () {
            self.AdvanceTime(1);
        }, MODULES.GameVariables.TimeIntervalCountDown);
    };
    self.StopCounter = function () {
        clearInterval(self.timerId);
        self.isRunning(false);
    };
    //starts (or restarts) the play clock the offense has to snap the ball; 40s after a normal play, 25s after an administrative stoppage
    self.StartPlayClock = function (seconds) {
        clearInterval(self.playClockTimerId);
        self.playClockRemaining(seconds);

        self.playClockTimerId = window.setInterval(function () {
            //pause the play clock while special teams/point-after formations are being set up
            if (self.gameOver() || self.showKickoffControls() || self.pointAttemptAfterTouchDown())
                return;

            self.playClockRemaining(self.playClockRemaining() - 1);

            if (self.playClockRemaining() <= 0) {
                clearInterval(self.playClockTimerId);
                playMaker.delayOfGamePenalty();
            }
        }, MODULES.GameVariables.TimeIntervalCountDown);
    };
    self.StopPlayClock = function () {
        clearInterval(self.playClockTimerId);
        self.playClockTimerId = 0;
    };
    self.PauseGame = function () {
        if (!self.gameStarted() || self.gameOver() || self.isGamePaused())
            return;

        self.wasGameClockRunningBeforePause = self.isRunning();
        self.wasPlayClockRunningBeforePause = self.playClockTimerId !== 0;
        self.StopCounter();
        self.StopPlayClock();
        self.isGamePaused(true);
    };
    self.ResumeGame = function () {
        if (!self.isGamePaused())
            return;

        self.isGamePaused(false);
        if (self.wasGameClockRunningBeforePause)
            self.StartCounter();
        if (self.wasPlayClockRunningBeforePause)
            self.StartPlayClock(self.playClockRemaining());
    };
    //moves the game clock forward by the given number of seconds and handles the end of a quarter/game when time expires
    self.AdvanceTime = function (seconds) {
        if (self.gameOver() || !seconds || seconds <= 0)
            return;

        self.elapsedTime(Math.min(self.elapsedTime() + seconds, self.initialTime()));

        if (self.remainingTime() <= 0) {
            self.EndQuarter();
        }
    };
    self.EndQuarter = function () {
        self.StopCounter();
        self.elapsedTime(0);

        if (self.currentQuarter() === 2) { //end of the first half - timeouts reset for the second half
            self.homeTeamTimeOuts(3);
            self.awayTeamTimeOuts(3);
            self.isBeginningOfHalf = true;
        }

        self.currentQuarter(self.currentQuarter() + 1);

        if (self.currentQuarter() > 4) {
            if (self.homeTeamScore() === self.awayTeamScore()) {
                alert('End of regulation - the score is tied, heading to overtime!');
                self.StartCounter();
            }
            else {
                self.gameOver(true);
                sim.addCompletedGameToHistory();
                alert('Game Over! Final Score: ' + self.homeTeamInfo().teamName() + ' ' + self.homeTeamScore() +
                    ' - ' + self.awayTeamInfo().teamName() + ' ' + self.awayTeamScore());
            }
        }
        else {
            alert('End of the ' + UTILITIES.getNumberWithEnding(self.currentQuarter() - 1) + ' quarter');
            self.StartCounter();
        }
    };
    //shared timeout logic used by both teams; disallows the same team from calling consecutive timeouts
    self.CallTeamTimeout = function (teamId) {
        if (self.gameOver())
            return;

        if (self.lastTimeoutTeam() === teamId) {
            alert('The same team cannot call back-to-back timeouts.');
            return;
        }

        let timeoutsRemaining = teamId === self.homeTeamID() ? self.homeTeamTimeOuts() : self.awayTeamTimeOuts();

        if (timeoutsRemaining <= 0) {
            alert('No Timeouts Remaining');
            return;
        }

        if (teamId === self.homeTeamID())
            self.homeTeamTimeOuts(self.homeTeamTimeOuts() - 1);
        else
            self.awayTeamTimeOuts(self.awayTeamTimeOuts() - 1);

        self.lastTimeoutTeam(teamId);
        self.StopCounter(); //timeout stops the clock until the next snap
        self.StartPlayClock(MODULES.Constants.PLAY_CLOCK_SHORT); //administrative stoppage - next snap only gets 25 seconds
    };
    self.CallHomeTimeout = function () {
        self.CallTeamTimeout(self.homeTeamID());
    };
    self.CallAwayTimeout = function () {
        self.CallTeamTimeout(self.awayTeamID());
    };
})(jQuery);