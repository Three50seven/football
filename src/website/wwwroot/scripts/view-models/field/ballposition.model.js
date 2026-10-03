(function ($) {
    var self = this;

    self.ballSpotStart = ko.observable(0); //set initial ball spot on home kickoff spot
    self.yardsTraveled = ko.observable(0);
    self.yardsToFirst = ko.observable(10);
    self.yardsToTouchdown = ko.computed(function () {
        return 100 - (self.ballSpotStart() + self.yardsTraveled()); //subtract start from 100 to get total yards needed for a touchdown;
    });//ko.observable(71); 
    self.currentBallSpot = ko.computed(function () {
        let yards = self.yardsToTouchdown();
        if (yards > 50)
            yards = 100 - yards;

        return yards;
    });
    //currentTeamWithBall must be declared before the computeds below that read it, so the line to gain always
    //resolves against a live observable rather than whatever happens to be on the global at that moment.
    self.currentTeamWithBall = ko.observable(0);

    //Field progress (yards from the home goal line) of the line the offense must reach for a new set of downs.
    //null means there is no line to draw - e.g. the offense is already first & goal and the goal line is the marker.
    self.lineToGainProgress = ko.computed(function () {
        return HELPERS.getLineToGainProgress(self.ballSpotStart(), self.yardsTraveled(), self.yardsToFirst());
    });

    //Special teams plays (kickoffs, punts, field goals) and point attempts have no down and distance to mark up.
    //This is a computed so the line reappears the moment a kick finishes - resetKickoffFlags clears
    //showKickoffControls right after SetBallPosition has already run, and the receiving team is then set up at
    //1st & 10 with no positive yards gained yet.
    self.showLineToGain = ko.computed(function () {
        let onSpecialTeams = (typeof self.showKickoffControls === 'function' && self.showKickoffControls()) ||
            (typeof self.pointAttemptAfterTouchDown === 'function' && self.pointAttemptAfterTouchDown());

        return !onSpecialTeams && self.lineToGainProgress() !== null;
    });

    //true when the offense is the home team, which is what decides whether a spot is measured left to right or mirrored.
    //Mirrors the direction ballSpot resolves, which needs BOTH the point attempt team and an active point attempt
    //flag. pointAttemptTeamId is only ever cleared on a game reset, so testing it on its own would pin every later
    //drive to whichever team last scored and put the home offense on the away side.
    self.offenseIsHomeTeam = ko.computed(function () {
        let isPointAttempt = self.pointAttemptTeamId &&
            ((typeof self.isExtraPointKick === 'function' && self.isExtraPointKick()) ||
                (typeof self.isTwoPointConversion === 'function' && self.isTwoPointConversion()));

        return isPointAttempt
            ? self.pointAttemptTeamId === self.homeTeamID()
            : self.currentTeamWithBall() === self.homeTeamID();
    });

    //x offset on the field SVG for the line to gain, or null when there is no line to draw. Measured from the
    //offense's OWN goal line, so the home team works right and the away team works left.
    self.lineToGainX = ko.computed(function () {
        //stay null whenever the line is hidden, so the bound x1/x2 are never left at a stale spot
        if (!self.showLineToGain())
            return null;

        return HELPERS.getFieldXPosition(self.lineToGainProgress(), self.offenseIsHomeTeam());
    });

    //x offset for the line of scrimmage - the spot of the ball itself. Unlike the line to gain this is always drawn:
    //the ball really does sit on this line for the next snap, including in the red zone and during special teams.
    self.lineOfScrimmageX = ko.computed(function () {
        //clamped like ballSpot, so a ball in an end zone still marks where it actually is
        let fieldProgress = HELPERS.clampFieldProgress(self.ballSpotStart() + self.yardsTraveled());
        return HELPERS.getFieldXPosition(fieldProgress, self.offenseIsHomeTeam());
    });

    self.SetupKickoffBallSpot = function () {
        console.log('SETTING UP KICKOFF BALL SPOT');
        let extraPointKickActive = typeof self.isExtraPointKick === 'function' && self.isExtraPointKick();
        let kickoffActive = typeof self.isKickoff === 'function' && self.isKickoff();
        let safetyKickActive = typeof self.isSafety === 'function' && self.isSafety();
        console.log('isExtraPointKick: %s, isKickoff: %s, isSafety: %s', extraPointKickActive, kickoffActive, safetyKickActive);
        
        if (extraPointKickActive || kickoffActive || safetyKickActive) {
            self.yardsTraveled(0);
            $('#home-team-trail, #away-team-trail').css('width', '0px');

            //set spot depending on type of kick, default is normal kickoff
            let spot = MODULES.Constants.KICKOFF_SPOT;

            if (kickoffActive) {
                console.log('SPOT BEFORE CHANGE (KICKOFF): %s', spot);
                spot = spot + 30;
            }
            if (safetyKickActive) {
                spot = MODULES.Constants.SAFETY_KICKOFF_SPOT;
                console.log('SPOT BEFORE CHANGE (SAFETY): %s', spot);
                spot = spot + 60;
            }
            if (extraPointKickActive) {
                spot = MODULES.Constants.EXTRA_POINT_KICK_SPOT;
                console.log('SPOT BEFORE CHANGE (EXTRA POINT): %s', spot);
            }
            self.ballSpotStart(spot);
        }
        console.log('just return ball spot: %s', self.ballSpotStart());
        ////otherwise (field goal or  leave the ball kick off spot
        self.SetBallPosition();
        return self.ballSpotStart();
    };
    self.ballSpot = ko.computed(function () {
        //home end-zone is always left
        //away end-zone is always right
        //front of football spot indicator is where ball is on field. e.g. 50yd line will be ~85px
        let isHomeTeam = false;
        let spot = 0;
        let min = 20; //left goal line in the responsive field coordinate system
        //let max = 2; //max for away team i.e. TOUCHDOWN 0 yards to go
        let fieldScale = $('#field-img').width() / 220 || 1;
        let ratio = 1.8 * fieldScale; //180 divided by 100, scaled to the responsive field width
        let fieldProgress = HELPERS.clampFieldProgress(100 - self.yardsToTouchdown());
        let driveStart = HELPERS.clampFieldProgress(self.ballSpotStart());

        let isPointAttempt = self.pointAttemptTeamId &&
            ((typeof self.isExtraPointKick === 'function' && self.isExtraPointKick()) ||
                (typeof self.isTwoPointConversion === 'function' && self.isTwoPointConversion()));
        if (isPointAttempt) {
            isHomeTeam = self.pointAttemptTeamId === self.homeTeamID();
        }
        else if (self.currentTeamWithBall() === self.homeTeamID()) {
            isHomeTeam = true;
        }

        if (isHomeTeam) {
            isHomeTeam = true;
            min = 20 * fieldScale; //left goal line in the responsive field coordinate system
            //max = 175; //max for home team i.e. TOUCHDOWN
        }

        //calculate based on max and min, when home team, subtract from 100 to get correct start position on field:
        spot = isHomeTeam ? min + fieldProgress * ratio : 200 * fieldScale - fieldProgress * ratio;

        //show trail for team
        let ballWidth = 5 * fieldScale;
        let trailWidth = Math.max(0, (fieldProgress - driveStart) * ratio - ballWidth);
        let ballMargin = Math.max(0, Math.min(spot - (isHomeTeam ? ballWidth : 0), $('#field-img').width() - ballWidth));
        $('#home-team-trail, #away-team-trail').css('height', (10 * fieldScale) + 'px');
        $('#ball-position-img').css({
            height: (10 * fieldScale) + 'px',
            width: ballWidth + 'px'
        });

        if (isHomeTeam) {
            $('#away-team-trail').css('width', '0px');
            $('#home-team-trail').css('background-image', 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,1))');
            $('#home-team-trail').css('width', trailWidth + 'px');
            $('#home-team-trail').css('margin-left', 20 * fieldScale + driveStart * ratio + 'px');
            $('#ball-position-img').css('margin-left', ballMargin + 'px');
            //console.log('HOME => yardsTraveled:' + self.yardsTraveled() + ' ballSpotStart:' + self.ballSpotStart() + ' trailWidth: ' + trailWidth);
        }
        else {
            let marginWidth = 200 * fieldScale - trailWidth - driveStart * ratio;
            //console.log('margin-width: ' + marginWidth);
            $('#home-team-trail').css('width', '0px');
            $('#away-team-trail').css('background-image', 'linear-gradient(to left, rgba(255,255,255,0), rgba(255,255,255,1))');
            $('#away-team-trail').css('width', trailWidth + 'px');
            $('#away-team-trail').css('margin-left', marginWidth + 'px');
            $('#ball-position-img').css('margin-left', ballMargin + 'px');
            //console.log('AWAY => yardsTraveled:' + self.yardsTraveled() + ' ballSpotStart:' + self.ballSpotStart() + ' trailWidth: ' + trailWidth);
        }

        //console.log('==============');
        //console.log('yardsTraveled:' + self.yardsTraveled() + ' ballSpotStart:' + self.ballSpotStart());
        //console.log('ratio:' + ratio + ' yards to touchdown:' + self.yardsToTouchdown());
        //console.log('spot:' + spot + ' is home team:' + isHomeTeam + ' max: ' + max + ' min: ' + min);
        return spot; //this is max 100 (goal line) and min 0 (goal line)
    });
    self.ChangePossession = function () {
        self.yardsToFirst(10);
        self.currentDown(1);
        self.playCountForPossession(1); //reset play count for possession
        self.timeOfPossession(0); //reset time of possession
        self.consecutiveDelayOfGamePenalties(0); //new team taking over gets a clean slate

        //change possession of ball
        if (self.currentTeamWithBall() === self.awayTeamID())
            self.currentTeamWithBall(self.homeTeamID());
        else
            self.currentTeamWithBall(self.awayTeamID());
    };
})(jQuery);