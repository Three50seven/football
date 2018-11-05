var HELPERS = {
    getDownText: function (playAttempt, yardsToFirst) {
        let yardsToFirstText = '';

        //null/empty check
        if (yardsToFirst) {
            yardsToFirstText = yardsToFirst.toString();
        }

        if (self.yardsToTouchdown() <= self.yardsToFirst())
            yardsToFirstText = 'GOAL';

        return getNumberWithEnding(playAttempt) + ' & ' + yardsToFirstText;
    },

    getYardText: function () {
        let yardText = self.homeTeamInfo().teamName();

        if (self.currentTeamWithBall() === self.awayTeamID() && self.yardsToTouchdown() > 50)
            yardText = self.awayTeamInfo().teamName();

        return yardText + ' ' + self.currentBallSpot();
    }
};