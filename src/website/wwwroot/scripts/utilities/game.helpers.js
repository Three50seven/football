var HELPERS = {
    clampFieldProgress: function (fieldProgress) {
        return Math.max(-MODULES.Constants.END_ZONE_YARDS,
            Math.min(fieldProgress, 100 + MODULES.Constants.END_ZONE_YARDS));
    },

    //The line to gain is the spot the offense must reach to earn a new set of downs, so it sits yardsToFirst yards
    //beyond the ball. Both spots are measured in yards from the offense's OWN goal line, which is the same frame
    //ballSpotStart/yardsTraveled already use, so the line advances with the ball for either team.
    //A null result means there is no line worth drawing: once it reaches or passes the opponent goal line the
    //offense is already "first & goal" and the goal line itself is the marker.
    getLineToGainProgress: function (ballSpotStart, yardsTraveled, yardsToFirst) {
        let lineToGain = ballSpotStart + yardsTraveled + yardsToFirst;

        if (lineToGain <= 0 || lineToGain >= 100)
            return null;

        return lineToGain;
    },

    //Converts a spot measured in yards from the offense's own goal line into an x offset on the field SVG, whose
    //viewBox is 220 units wide with goal lines at x=20 (home) and x=200 (away) - 100 yards spans 180 units, so each
    //yard is 1.8 units. The home team works right, the away team works left, so the two teams mirror each other.
    getFieldXPosition: function (yardsFromOwnGoalLine, isHomeTeam) {
        return isHomeTeam ? 20 + (yardsFromOwnGoalLine * 1.8) : 200 - (yardsFromOwnGoalLine * 1.8);
    },

    capRunYardsAtGoalLine: function (runYards, distanceToGoalLine) {
        if (runYards <= 0 || distanceToGoalLine < 0)
            return runYards;

        return Math.min(runYards, distanceToGoalLine);
    },

    getDownText: function (playAttempt, yardsToFirst) {
        if (typeof self.isTwoPointConversion === 'function' && self.isTwoPointConversion())
            return '1st & GOAL';

        let yardsToFirstText = '';

        //null/empty check
        if (yardsToFirst) {
            yardsToFirstText = yardsToFirst.toString();
        }

        if (self.yardsToTouchdown() <= self.yardsToFirst())
            yardsToFirstText = 'GOAL';

        return UTILITIES.getNumberWithEnding(playAttempt) + ' & ' + yardsToFirstText;
    },

    getYardText: function () {
        let offenseIsHome = self.currentTeamWithBall() === self.homeTeamID();
        let ballIsInOffenseTerritory = self.yardsToTouchdown() > 50;
        let ballIsInHomeTerritory = offenseIsHome === ballIsInOffenseTerritory;
        let yardText = ballIsInHomeTerritory ? self.homeTeamInfo().teamName() : self.awayTeamInfo().teamName();

        return yardText + ' ' + self.currentBallSpot();
    },

    getTeamInfo: function (teamId) {
        return $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === teamId; })[0];
    }
};