//CONSTRUCTORS
MODULES.Constructors = (function () {
    return {
        GamePlayStatRecord: function (teamId, teamName, totalPlayCount, totalYardsRushing, totalYardsPassing, totalTimePossession, totalTurnovers, totalFirstDowns, totalPenaltyYards = 0) {
            this.teamId = teamId;
            this.teamName = teamName;
            this.totalPlayCount = totalPlayCount;
            this.totalYardsRushing = totalYardsRushing;
            this.totalYardsPassing = totalYardsPassing;
            this.totalTimePossession = totalTimePossession;
            this.totalTurnovers = totalTurnovers;
            this.totalFirstDowns = totalFirstDowns;
            this.totalPenaltyYards = totalPenaltyYards;
            this.fullTeamName = UTILITIES.getFullTeamName(this.teamName, this.teamId);
            this.totalTimePossessionDisplay = UTILITIES.getTimeDisplay(this.totalTimePossession);
        },
        GameBoxScoreRecord: function (teamId, teamName, firstQuarterScore, secondQuarterScore, thirdQuarterScore, fourthQuarterScore, overtimeScore, totalScore) {
            this.teamId = teamId;
            this.teamName = teamName;
            this.firstQuarterScore = firstQuarterScore;
            this.secondQuarterScore = secondQuarterScore;
            this.thirdQuarterScore = thirdQuarterScore;
            this.fourthQuarterScore = fourthQuarterScore;
            this.overtimeScore = overtimeScore;
            this.fullTeamName = UTILITIES.getFullTeamName(this.teamName, this.teamId);
            this.totalScore = totalScore;
            this.teamImagePath = UTILITIES.getTeamImagePath(this.teamId);
        },
        PlayResult: function (yards, playText, isTurnover = false, playType = '', isFirstDown = false) {
            this.yards = yards;
            this.playResultText = playText;
            this.isTurnover = isTurnover;
            this.playType = playType;
            this.isFirstDown = isFirstDown;
        },
        PlayHistory: function (playId, teamId, teamName, down, playCount, playYards, playResult, ballSpot, quarter, timeOfPossession, score, gameClock) {
            this.playId = playId;
            this.totalPlayCount = MODULES.GameVariables.TotalPlayCount;
            this.teamId = teamId;
            this.teamName = teamName;
            this.down = down;
            this.playCount = playCount;
            this.playYards = playYards;
            this.playResult = playResult;
            this.ballSpot = ballSpot;
            this.quarter = quarter;
            this.timeOfPossessionDisplay = UTILITIES.getTimeDisplay(timeOfPossession);
            this.score = score;
            this.gameClock = gameClock;
            this.fullTeamName = UTILITIES.getFullTeamName(this.teamName, this.teamId);
        },
        TeamArrayRecord: function (teamId, teamColor, teamCity, teamMascot) {
            this.teamId = teamId;
            this.teamColor = teamColor;
            this.teamCity = teamCity;
            this.teamMascot = teamMascot;
            this.teamCityAndName = function () {
                if (!this.teamCity || !this.teamMascot)
                    return '';

                return this.teamCity + ' ' + this.teamMascot;
            };
            this.teamName = function () {
                if (!this.teamMascot)
                    return '';

                return this.teamMascot.toUpperCase();
            };
            this.teamBgColor = function () {
                if (!this.teamColor)
                    return '';

                return this.teamColor + '-bg';
            };
            this.teamThumbnail = function () {
                if (!this.teamColor)
                    return '';

                return MODULES.Constants.TeamImageRoot + 'thumbs/' + this.teamColor + '.png';
            };
            this.teamImage = function () {
                if (!this.teamColor)
                    return '';

                return MODULES.Constants.TeamImageRoot + 'large/' + this.teamColor + '.png';
            };
        }
    };
})();