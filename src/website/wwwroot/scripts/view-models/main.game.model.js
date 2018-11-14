var mainGameModel = function (vm) {
    var self = this;
    //Timer Source: https://stackoverflow.com/questions/20467548/knockout-js-how-to-implement-countdown-timer
    //GENERAL GAME VARIABLES:
    self.gameStarted = ko.observable(false); //flag, when true, indicates all game setup is complete (e.g. teams selected, etc.)
    self.currentQuarter = ko.observable(1);
    self.currentQuarterDisplay = ko.computed(function () {
        return getNumberWithEnding(self.currentQuarter());
    });
    self.currentDown = ko.observable(1);
    self.ballSpotStart = ko.observable(0); //set initial ball spot on home kickoff spot
    self.yardsTraveled = ko.observable(0);
    self.yardsToFirst = ko.observable(10);
    self.yardsToTouchdown = ko.computed(function () {
        return 100 - (self.ballSpotStart() + self.yardsTraveled()); //subtract start from 100 to get total yards needed for a touchdown;
    });//ko.observable(71); 
    self.currentBallSpot = ko.computed(function () {
        let yards = self.yardsToTouchdown();
        if (yards > 50)
            yards = 100 - yards;

        return yards;
    });
    self.playCountForPossession = ko.observable(1);
    self.timeOfPossession = ko.observable(0);
    self.hasRolled = ko.observable(false);
    self.currentTeamWithBall = ko.observable(0);
    self.teamPlayHistory = ko.observableArray();
    self.gamePlayStats = ko.observableArray();
    self.gameBoxScore = ko.observableArray();
    self.needCoinToss = ko.observable(true); //determines when coin toss is needed        
    self.CloseSpecialTeamsMenu = function () {
        $('#specialTeamsMenu').removeClass(SHOW_SPECIAL_TEAMS_CLASS);
    };
    self.ClearCoinColors = function () {
        //clear class on current coin
        $(".side-a").removeClass(self.homeTeamInfo().teamBgColor());
        $(".side-b").removeClass(self.homeTeamInfo().teamBgColor());
        $(".side-a").removeClass(self.awayTeamInfo().teamBgColor());
        $(".side-b").removeClass(self.awayTeamInfo().teamBgColor());
    };
    self.ChooseCoinSide = function () {
        self.ClearCoinColors();

        //use away team info on heads of coin if heads is selected, otherwise away team is tails
        let coinSideSelected = parseInt($('input[name=selectCoinSide]:checked').val(), 10);
        if (coinSideSelected === 1) {
            $(".side-a").addClass(self.awayTeamInfo().teamBgColor());
            $("#side-a-txt").text(self.awayTeamInfo().teamName());

            $(".side-b").addClass(self.homeTeamInfo().teamBgColor());
            $("#side-b-txt").text(self.homeTeamInfo().teamName());
        }
        else {
            $(".side-b").addClass(self.awayTeamInfo().teamBgColor());
            $("#side-b-txt").text(self.awayTeamInfo().teamName());

            $(".side-a").addClass(self.homeTeamInfo().teamBgColor());
            $("#side-a-txt").text(self.homeTeamInfo().teamName());
        }
        return true; //return true so radio button is checked
    };
    self.vm = ko.observable(vm);
};