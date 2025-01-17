(function ($) {
    var self = this;

    self.gameBoxScore = ko.observableArray();

    self.InitializeBoxScore = function () {
        //insert two team records for this game
        let homeBoxScore = new MODULES.Constructors.GameBoxScoreRecord(
            self.homeTeamID(),
            self.homeTeamInfo().teamName(),
            0, 0, 0, 0, 0, 0
        );
        let awayBoxScore = new MODULES.Constructors.GameBoxScoreRecord(
            self.awayTeamID(),
            self.awayTeamInfo().teamName(),
            0, 0, 0, 0, 0, 0
        );

        self.gameBoxScore.push(homeBoxScore);
        self.gameBoxScore.push(awayBoxScore);
    };
    self.UpdateBoxScore = function () {
        //TODO: call this at the end of each score to add total score for each team
        let quarter = self.currentQuarter();
        let homeTeam = $.grep(self.gameBoxScore(), function (team) { return team.teamId === self.homeTeamID(); })[0]; //get the home team
        let awayTeam = $.grep(self.gameBoxScore(), function (team) { return team.teamId === self.awayTeamID(); })[0]; //get the away team

        if (self.gameBoxScore().length > 0) {
            if (quarter === 1) {
                homeTeam.firstQuarterScore = self.homeTeamScore();
                awayTeam.firstQuarterScore = self.awayTeamScore();
            }
            if (quarter === 2) {
                homeTeam.secondQuarterScore = self.homeTeamScore() - homeTeam.firstQuarterScore;
                awayTeam.secondQuarterScore = self.awayTeamScore() - awayTeam.firstQuarterScore;
            }
            if (quarter === 3) {
                homeTeam.thirdQuarterScore = self.homeTeamScore() - homeTeam.firstQuarterScore - homeTeam.secondQuarterScore;
                awayTeam.thirdQuarterScore = self.awayTeamScore() - awayTeam.firstQuarterScore - awayTeam.secondQuarterScore;
            }
            if (quarter === 4) {
                homeTeam.fourthQuarterScore = self.homeTeamScore() - homeTeam.firstQuarterScore - homeTeam.secondQuarterScore - homeTeam.thirdQuarterScore;
                awayTeam.fourthQuarterScore = self.awayTeamScore() - awayTeam.firstQuarterScore - awayTeam.secondQuarterScore - awayTeam.thirdQuarterScore;
            }
            if (quarter >= 5) { //OverTime
                homeTeam.overtimeScore = self.homeTeamScore() - homeTeam.firstQuarterScore - homeTeam.secondQuarterScore - homeTeam.thirdQuarterScore - homeTeam.fourthQuarterScore;
                awayTeam.overtimeScore = self.awayTeamScore() - awayTeam.firstQuarterScore - awayTeam.secondQuarterScore - awayTeam.thirdQuarterScore - awayTeam.fourthQuarterScore;
            }

            self.gameBoxScore.refresh(homeTeam);
        }
        else {
            console.log('ERROR: gameBoxScore array was never initialized. Initializing...');
            self.InitializeBoxScore();
            console.log('Updating Box Score...');
            self.UpdateBoxScore();
        }
    };
}) (jQuery);