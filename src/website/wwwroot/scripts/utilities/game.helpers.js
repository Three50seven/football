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
    },

    //every .field-score-feedback-tone-* class main.css understands - stripped on each show so a
    //tone from a previous play can never outlive it (the new tone is added right after)
    fieldScoreFeedbackToneClasses: 'field-score-feedback-tone-score field-score-feedback-tone-penalty field-score-feedback-tone-turnover field-score-feedback-tone-negative field-score-feedback-tone-neutral',

    getPlayToastTone: function (type, playText) {
        //Maps a toast to one of the .field-score-feedback-tone-* classes in main.css. The markup
        //stays tone-agnostic and CSS owns every color, the same way gameAlertToneClass works in
        //ui/alert.model.js - a new tone only needs a class here and a rule there.
        //Score toasts (addScore) carry a SCORE_TYPES value; generic play toasts (display) carry
        //only their text, so those tones are read off the wording the play engine produces.
        
        if (type !== null && type !== undefined) {
            //a safety is scored against the offense - red, with losses and turnovers; every
            //other SCORE_TYPES value is points on the board for the team this toast names
            if (type === SCORE_TYPES.SAFETY)
                return 'negative';

            return 'score';
        }

        let text = playText || '';

        //a missed kick reads NO GOOD - check it before the generic GOOD that marks a made kick;
        //the touchdown marker is SCORE_TYPES.TOUCHDOWN.toUpperCase() as produced by getPlayResult
        if (/\bNO GOOD\b/i.test(text))
            return 'neutral';
        if (/\bTOUCHDOWN\b|\bGOOD\b/i.test(text))
            return 'score';
        if (/penalt|delay of game|no yardage/i.test(text))
            return 'penalty';
        if (/intercept|fumble|turnover|change of possession|muffed/i.test(text))
            return 'turnover';
        if (/sack|for a loss|for -\d+ yards|\bSAFETY\b/i.test(text))
            return 'negative';

        //ordinary gains, incompletes, coins and simulated quarters keep the classic gold accent
        return 'neutral';                
    }
};