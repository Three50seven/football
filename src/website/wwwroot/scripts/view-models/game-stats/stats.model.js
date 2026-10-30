(function ($) {
    var self = this;
    
    self.gamePlayStats = ko.observableArray();  

    self.gameStatRows = function () {
        let stats = self.gamePlayStats();
        if (stats.length === 0)
            return [];

        let home = stats.find(team => team.teamId === self.homeTeamID());
        let away = stats.find(team => team.teamId === self.awayTeamID());
        let definitions = [
            ['Total Plays', 'totalPlayCount'],
            ['Rushing Yards', 'totalYardsRushing'],
            ['Net Passing Yards', 'totalYardsPassing'],
            ['Total Yards', 'totalYards'],
            ['Penalty Yards Against', 'totalPenaltyYards'],
            ['Penalties Committed On', 'penaltySideLabel'],
            ['Time of Possession', 'totalTimePossessionDisplay'],
            ['Turnovers', 'totalTurnovers'],
            ['Fumbles Lost', 'totalFumblesLost'],
            ['Interceptions Thrown', 'totalInterceptionsThrown'],
            ['Sacks (Defense)', 'totalSacks'],
            ['Tackles (Defense)', 'totalTackles'],
            ['First Downs', 'totalFirstDowns'],
            ['Third Down Conversions', 'totalThirdDownConversions'],
            ['Fourth Down Conversions', 'totalFourthDownConversions'],
            ['Field Goal Attempts', 'totalFieldGoalAttempts'],
            ['Field Goals Made', 'totalFieldGoalsMade']
        ];
        return definitions.map(([label, property]) => ({
            label: label,
            home: typeof home[property] === 'function' ? home[property]() : home[property],
            away: typeof away[property] === 'function' ? away[property]() : away[property]
        }));
    };

    self.InitializeGameStats = function () {
        //insert two team records for this game
        let homeTeamPlayStat = new MODULES.Constructors.GamePlayStatRecord(
            self.homeTeamID(), self.homeTeamInfo().teamName(),
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        );
        let awayTeamPlayStat = new MODULES.Constructors.GamePlayStatRecord(
            self.awayTeamID(), self.awayTeamInfo().teamName(),
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        );

        self.gamePlayStats(self.gamePlayStats().concat([homeTeamPlayStat, awayTeamPlayStat]));
    };
    self.UpdateGameStat = function (teamStatUpdates) {
        if (self.gamePlayStats().length > 0) {
            let team = $.grep(self.gamePlayStats(), function (team) { return team.teamId === teamStatUpdates.teamId; })[0]; //get the team that needs an update

            team.totalPlayCount += teamStatUpdates.totalPlayCount;
            team.totalYardsRushing += teamStatUpdates.totalYardsRushing;
            team.totalYardsPassing += teamStatUpdates.totalYardsPassing;
            team.totalYards = team.totalYardsRushing + team.totalYardsPassing;
            team.totalFumblesLost += teamStatUpdates.totalFumblesLost;
            team.totalInterceptionsThrown += teamStatUpdates.totalInterceptionsThrown;
            team.totalSacks += teamStatUpdates.totalSacks;
            team.totalTackles += teamStatUpdates.totalTackles;
            team.totalTimePossession += teamStatUpdates.totalTimePossession;
            team.totalTurnovers += teamStatUpdates.totalTurnovers;
            team.totalFirstDowns += teamStatUpdates.totalFirstDowns;
            team.totalPenalties += teamStatUpdates.totalPenalties;
            team.totalPenaltyYards += teamStatUpdates.totalPenaltyYards;
            let incomingSide = teamStatUpdates.totalPenaltySide;
            if (incomingSide !== 'NONE') {
                team.totalPenaltySide = team.totalPenaltySide === 'NONE' || team.totalPenaltySide === incomingSide
                    ? incomingSide
                    : 'BOTH';
            }
            team.totalThirdDownConversions = (team.totalThirdDownConversions || 0) + (teamStatUpdates.totalThirdDownConversions || 0);
            team.totalFourthDownConversions = (team.totalFourthDownConversions || 0) + (teamStatUpdates.totalFourthDownConversions || 0);
            team.totalFieldGoalAttempts = (team.totalFieldGoalAttempts || 0) + (teamStatUpdates.totalFieldGoalAttempts || 0);
            team.totalFieldGoalsMade = (team.totalFieldGoalsMade || 0) + (teamStatUpdates.totalFieldGoalsMade || 0);
            team.totalTimePossessionDisplay = UTILITIES.getTimeDisplay(team.totalTimePossession); //recalculate display text since it isn't an observable

            self.gamePlayStats(self.gamePlayStats().slice());
        }
        else {
            console.log('ERROR: gamePlayStats array was never initialized. Initializing...');
            self.InitializeGameStats();
            console.log('Updating Box Score...');
            self.UpdateGameStat(teamStatUpdates);
        }
    };
    self.otherGameInfoExpanded = ko.observable(false);
    self.ShowOtherGameInfo = function () {
        self.otherGameInfoExpanded(!self.otherGameInfoExpanded());
    };
})(jQuery);