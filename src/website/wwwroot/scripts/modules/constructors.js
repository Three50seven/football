//CONSTRUCTORS
MODULES.Constructors = (function () {
    return {
        GamePlayStatRecord: function (teamId, teamName, totalPlayCount, totalYardsRushing, totalYardsPassing, totalTimePossession, totalTurnovers, totalFirstDowns) {
            this.teamId = teamId;
            this.teamName = teamName;
            this.totalPlayCount = totalPlayCount;
            this.totalYardsRushing = totalYardsRushing;
            this.totalYardsPassing = totalYardsPassing;
            this.totalTimePossession = totalTimePossession;
            this.totalTurnovers = totalTurnovers;
            this.totalFirstDowns = totalFirstDowns;
            this.fullTeamName = UTILITIES.getFullTeamName(this.teamName, this.teamId);
            this.totalTimePossessionDisplay = UTILITIES.getTimeDisplay(this.totalTimePossession); //TODO: BUG, Not correctly displaying time as 00:00
        },
        GameBoxScoreRecord: function (teamId, teamName, firstQuarterScore, secondQuarterScore, thirdQuarterScore, fourthQuarterScore, overtimeScore) {
            this.teamId = teamId;
            this.teamName = teamName;
            this.firstQuarterScore = firstQuarterScore;
            this.secondQuarterScore = secondQuarterScore;
            this.thirdQuarterScore = thirdQuarterScore;
            this.fourthQuarterScore = fourthQuarterScore;
            this.overtimeScore = overtimeScore;
            this.fullTeamName = UTILITIES.getFullTeamName(this.teamName, this.teamId);
            this.totalScore = function () { //TODO: BUG, ADDING SINGLE SCORE FOR EACH QUARTER INSTEAD OF GETTING TOTAL
                let first = this.firstQuarterScore ? this.firstQuarterScore : 0;
                let second = this.firstQuarterScore ? this.firstQuarterScore : 0;
                let third = this.firstQuarterScore ? this.firstQuarterScore : 0;
                let fourth = this.firstQuarterScore ? this.firstQuarterScore : 0;
                let ot = this.firstQuarterScore ? this.firstQuarterScore : 0;

                //return sum of all quarters for total
                return first + second + third + fourth + ot;
            };
        },
        PlayResult: function (yards, playText, isTurnover = false, playType = '') {
            this.yards = yards;
            this.playResultText = playText;
            this.isTurnover = isTurnover;
            this.playType = playType;
        },
        PlayHistory: function (playId, teamId, teamName, down, playCount, playYards, playResult, ballSpot) {
            this.playId = playId;
            this.totalPlayCount = MODULES.GameVariables.TotalPlayCount;
            this.teamId = teamId;
            this.teamName = teamName;
            this.down = down;
            this.playCount = playCount;
            this.playYards = playYards;
            this.playResult = playResult;
            this.ballSpot = ballSpot;
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