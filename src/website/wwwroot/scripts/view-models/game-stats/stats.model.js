(function ($) {
    var self = this;
    
    self.gamePlayStats = ko.observableArray();  

    self.InitializeGameStats = function () {
        //insert two team records for this game
        let homeTeamPlayStat = new MODULES.Constructors.GamePlayStatRecord(
            self.homeTeamID(),
            self.homeTeamInfo().teamName(),
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        );
        let awayTeamPlayStat = new MODULES.Constructors.GamePlayStatRecord(
            self.awayTeamID(),
            self.awayTeamInfo().teamName(),
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        );

        self.gamePlayStats.push(homeTeamPlayStat);
        self.gamePlayStats.push(awayTeamPlayStat);
    };
    self.UpdateGameStat = function (teamStatUpdates) {
        if (self.gamePlayStats().length > 0) {
            let team = $.grep(self.gamePlayStats(), function (team) { return team.teamId === teamStatUpdates.teamId; })[0]; //get the team that needs an update

            team.totalPlayCount += teamStatUpdates.totalPlayCount;
            team.totalYardsRushing += teamStatUpdates.totalYardsRushing;
            team.totalYardsPassing += teamStatUpdates.totalYardsPassing;
            team.totalTimePossession += teamStatUpdates.totalTimePossession;
            team.totalTurnovers += teamStatUpdates.totalTurnovers;
            team.totalFirstDowns += teamStatUpdates.totalFirstDowns;
            team.totalPenaltyYards += teamStatUpdates.totalPenaltyYards;
            team.totalThirdDownConversions = (team.totalThirdDownConversions || 0) + (teamStatUpdates.totalThirdDownConversions || 0);
            team.totalFourthDownConversions = (team.totalFourthDownConversions || 0) + (teamStatUpdates.totalFourthDownConversions || 0);
            team.totalFieldGoalAttempts = (team.totalFieldGoalAttempts || 0) + (teamStatUpdates.totalFieldGoalAttempts || 0);
            team.totalFieldGoalsMade = (team.totalFieldGoalsMade || 0) + (teamStatUpdates.totalFieldGoalsMade || 0);
            team.totalTimePossessionDisplay = UTILITIES.getTimeDisplay(team.totalTimePossession); //recalculate display text since it isn't an observable

            self.gamePlayStats.refresh(team);
        }
        else {
            console.log('ERROR: gamePlayStats array was never initialized. Initializing...');
            self.InitializeGameStats();
            console.log('Updating Box Score...');
            self.UpdateGameStat(teamStatUpdates);
        }
    };
    self.ShowOtherGameInfo = function () {
        if ($("#gameInfoBox").is(":hidden")) {
            $("#gameInfoBox").show("slow");
        } else {
            $("#gameInfoBox").slideUp();
        }
    };

    //initially set game info to hidden
    $("#gameInfoBox").slideUp();
})(jQuery);