(function ($) {
    var self = this;
    
    //GENERAL GAME VARIABLES:
    self.gameStarted = ko.observable(false); //flag, when true, indicates all game setup is complete (e.g. teams selected, etc.)    
    self.currentDown = ko.observable(1);    
    self.playCountForPossession = ko.observable(1);    
    
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
    };
    self.ResetTeams = function () {
        self.ClearCoinColors();
        self.homeTeamID(0);
        self.awayTeamID(0);
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