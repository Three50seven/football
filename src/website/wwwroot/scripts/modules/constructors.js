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
        PlayResult: function (yards, playText, isTurnover = false, playType = '', isFirstDown = false, displayText = '', stopsGameClock = false, deadBallStopsClock = false, noPlayTime = false) {
            this.yards = yards;
            this.playResultText = playText;
            this.isTurnover = isTurnover;
            this.playType = playType;
            this.isFirstDown = isFirstDown;
            this.displayText = displayText;
            this.stopsGameClock = stopsGameClock; //true when the ball went dead in a way that stops the game clock (an incompletion, a run out of bounds, etc.)
            this.deadBallStopsClock = deadBallStopsClock; //true for special teams plays that went dead with the clock stopped (a touchback, a kickoff penalty, a recovered onside kick, a muffled punt)
            this.noPlayTime = noPlayTime; //true when the play consumed no play time at all - a touchback or a kick out of bounds, where the ball never came live
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
        TeamArrayRecord: function (teamId, teamColor, teamCity, teamMascot, teamAbbreviation) {
            this.teamId = teamId;
            this.teamColor = teamColor;
            this.teamCity = teamCity;
            this.teamMascot = teamMascot;
            this.teamAbbreviation = teamAbbreviation;
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

                return MODULES.Constants.TeamImageRoot + 'svgs/' + this.teamColor + '.svg';
            };
            this.teamImage = function () {
                if (!this.teamColor)
                    return '';

                return MODULES.Constants.TeamImageRoot + 'svgs/' + this.teamColor + '.svg';
            };
        }
    };
})();