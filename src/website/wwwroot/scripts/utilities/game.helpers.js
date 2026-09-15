var HELPERS = {
    clampFieldProgress: function (fieldProgress) {
        return Math.max(-MODULES.Constants.END_ZONE_YARDS,
            Math.min(fieldProgress, 100 + MODULES.Constants.END_ZONE_YARDS));
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
    }
};