(function ($) {
    var self = this;
    
    //GENERAL GAME VARIABLES:
    self.gameStarted = ko.observable(false); //flag, when true, indicates all game setup is complete (e.g. teams selected, etc.)    
    self.currentDown = ko.observable(1);    
    self.playCountForPossession = ko.observable(1); 
    self.gameSimulated = ko.observable(false);
    self.completedGameAddedToHistory = ko.observable(false);
    self.pointAttemptTeamId = 0;
    
    //GENERAL GAME FUNCTIONS:
    self.teamsPicked = ko.computed(function () {
        let picked = false;
        if (homeTeamID() && awayTeamID() && homeTeamID() > 0 && awayTeamID() > 0) {
            picked = true;
        }
        self.ChooseCoinSide();
        return picked;
    });   
    self.SelectTeam = function () {
        let teamIdSelected = parseInt($('input[name=selectTeam]:checked').val(), 10);

        if (teamIdSelected === self.homeTeamID()) {
            alert('The away team must be different than the home team.  Please select a different team.');
        }
        else {
            self.ClearCoinColors();

            //console.log('Team Selected %s.', typeof teamIdSelected);

            if (typeof teamIdSelected === 'number') {

                //console.log('Team Selected %s.', teamIdSelected);

                if (!self.homeTeamID())
                    self.homeTeamID(teamIdSelected);
                else
                    self.awayTeamID(teamIdSelected);
            }
        }
    };
    self.StartGame = function () {
        self.currentTeamWithBall(self.teamReceivingInitialKickoff());
        self.pointAttemptAfterTouchDown(false);
        self.SetupField();
        self.isKickoff(true);
        self.SetupKickoff();
        self.gameStarted(true);
        self.InitializeBoxScore();
        self.InitializeGameStats();
        self.StartPlayClock(MODULES.Constants.PLAY_CLOCK_NORMAL); //offense has 40 seconds to snap the first play
    };
    self.ResetGameMetrics = function () {
        self.ResetField();
        self.StopCounter();
        self.StopPlayClock();
        self.StopKickoffSliders();
        self.gameStarted(false);
        self.isGamePaused(false);
        self.wasGameClockRunningBeforePause = false;
        self.wasPlayClockRunningBeforePause = false;
        self.gameOver(false);
        self.currentQuarter(1);
        self.elapsedTime(0);
        self.playClockRemaining(MODULES.Constants.PLAY_CLOCK_NORMAL);
        self.currentDown(1);
        self.playCountForPossession(1);
        self.timeOfPossession(0);
        self.currentTeamWithBall(0);
        self.pointAttemptTeamId = 0;
        self.ballSpotStart(0);
        self.yardsTraveled(0);
        self.yardsToFirst(10);
        self.homeTeamScore(0);
        self.awayTeamScore(0);
        self.homeTeamTimeOuts(3);
        self.awayTeamTimeOuts(3);
        self.gameBoxScore([]);
        self.gamePlayStats([]);
        self.teamPlayHistory([]);
        self.pointAttemptAfterTouchDown(false);
        self.showKickoffControls(true);
        self.isKickoff(false);
        self.isSafety(false);
        self.isPunt(false);
        self.isFieldGoal(false);
        self.isExtraPointKick(false);
        self.isBeginningOfHalf = true;
        self.lastTimeoutTeam(0);
        self.consecutiveDelayOfGamePenalties(0);
        self.completedGameAddedToHistory(false);
    };
    self.ResetGameForCoinToss = function () {
        self.ResetGameMetrics();
        self.gameSimulated(false);
        clearTimeout(self.coinTossTimerId);
        self.coinTossValue(0);
        self.coinTossWinner(0);
        self.coinTossLoser(0);
        self.coinTossWinningOption('receive');
        self.teamReceivingInitialKickoff(0);
        $('#coin').removeClass('heads tails');
        self.ChooseCoinSide();
        $('#coin').off('click').on('click', self.TossCoin);
    };
    self.ResetTeams = function () {
        self.ClearCoinColors();
        self.homeTeamID(0);
        self.awayTeamID(0);
        self.simHistory([]);
        self.ResetGameForCoinToss();
        console.log('TEAMS RESET');
    };
    self.CloseSpecialTeamsMenu = function () {
        $('#specialTeamsMenu').removeClass(MODULES.Constants.SHOW_SPECIAL_TEAMS_CLASS);
    };
    self.ShowHideSpecialTeamsMenu = function () {
        //show/hide special teams menu depending on down
        if (self.currentDown() === 4) {
            $('#specialTeamsMenu').addClass(MODULES.Constants.SHOW_SPECIAL_TEAMS_CLASS);
        }
        else {
            $('#specialTeamsMenu').removeClass(MODULES.Constants.SHOW_SPECIAL_TEAMS_CLASS);
        }
    };    
})(jQuery);