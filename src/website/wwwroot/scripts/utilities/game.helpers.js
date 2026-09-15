var HELPERS = {
    getDownText: function (playAttempt, yardsToFirst) {
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