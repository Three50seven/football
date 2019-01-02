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
    self.currentTeamWithBall = ko.observable(0);
    self.SetupKickoffBallSpot = function () {
        console.log('SETTING UP KICKOFF BALL SPOT');
        console.log('isExtraPointKick: %s, isKickoff: %s, isSafety: %s', isExtraPointKick(), isKickoff(), isSafety());
        //if (isExtraPointKick() || isKickoff() || isSafety()) {
        //    //set spot depending on type of kick, default is normal kickoff
        //    let spot = MODULES.Constants.KICKOFF_SPOT;

        //    let kickingTeam = self.homeTeamID();

        //    //if the team with ball is the home team, they are receiving, so set kicking team to away team
        //    if (self.currentTeamWithBall() === self.homeTeamID()) {
        //        kickingTeam = self.awayTeamID();
        //    }                

        //    //KICKOFF => if kicking team is away team, kick from right of field, otherwise kick from left of field (default)
        //    //SAFETY => same side of field as KICKOFF, just use different kickoff spot
        //    //EXTRA POINT => if kicking team is home team, kick from right of field, otherwise kick from left of field (default)
        //    //since receiving team is already marked as having the ball on kickoffs, add 30 + 2 (ball width) to mark kickoff spot
        //    //for safety it will be 60 + 2 (ball width)
        //    if (isKickoff()) {
        //        console.log('SPOT BEFORE CHANGE (KICKOFF): %s', spot);
        //        if (kickingTeam === self.awayTeamID()) {
        //            spot = spot + 32;
        //        }
        //    }

        //    if (isSafety()) {
        //        spot = MODULES.Constants.SAFETY_KICKOFF_SPOT;
        //        console.log('SPOT BEFORE CHANGE (SAFETY): %s', spot);
        //        if (kickingTeam === self.awayTeamID()) {
        //            spot = spot + 62;
        //        }
        //    }

        //    if (isExtraPointKick()) {
        //        spot = MODULES.Constants.EXTRA_POINT_KICK_SPOT;

        //        console.log('SPOT BEFORE CHANGE (EXTRA POINT): %s', spot);
        //        if (kickingTeam === self.homeTeamID()) {
        //            spot = 100 - spot; //subtract spot from 100 to move ball to right side of field
        //        }
        //    }

        //    self.ballSpotStart(spot);

        //    console.log('AFTER KICKOFF SPOT SET => Home Team: %s, Away Team: %s, Kicking Team %s, Spot: %s', self.homeTeamID(), self.awayTeamID(), kickingTeam, spot);
        //}
        if (isExtraPointKick() || isKickoff() || isSafety()) {
            //set spot depending on type of kick, default is normal kickoff
            let spot = MODULES.Constants.KICKOFF_SPOT;

            if (isKickoff()) {
                console.log('SPOT BEFORE CHANGE (KICKOFF): %s', spot);
                spot = spot + 30;
            }
            if (isSafety()) {
                spot = MODULES.Constants.SAFETY_KICKOFF_SPOT;
                console.log('SPOT BEFORE CHANGE (SAFETY): %s', spot);
                spot = spot + 60;
            }
            if (isExtraPointKick()) {
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
        let min = 180; //minimum for away team i.e. Starting on team's GOALLINE 100 yards to go
        //let max = 2; //max for away team i.e. TOUCHDOWN 0 yards to go
        let ratio = 1.8; //180 divided by 100 (number of pixels to travel across 100 yards)

        if (self.currentTeamWithBall() === self.homeTeamID()) {
            isHomeTeam = true;
            min = -4; //minimum for home team i.e. Starting on team's GOALLINE
            //max = 175; //max for home team i.e. TOUCHDOWN
        }

        //calculate based on max and min, when home team, subtract from 100 to get correct start position on field:
        spot = isHomeTeam ? min + (100 - self.yardsToTouchdown()) * ratio + 1 : self.yardsToTouchdown() * ratio - 1;

        //show trail for team
        let trailWidth = self.yardsTraveled() * ratio;

        if (isHomeTeam) {
            $('#away-team-trail').css('width', '0px');
            $('#home-team-trail').css('background-image', 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,1)');
            $('#home-team-trail').css('width', trailWidth + 'px');
            $('#home-team-trail').css('margin-left', self.ballSpotStart() * ratio + 'px');
            //console.log('HOME => yardsTraveled:' + self.yardsTraveled() + ' ballSpotStart:' + self.ballSpotStart() + ' trailWidth: ' + trailWidth);
        }
        else {
            let marginWidth = 181 - trailWidth - self.ballSpotStart() * ratio;
            //console.log('margin-width: ' + marginWidth);
            $('#home-team-trail').css('width', '0px');
            $('#away-team-trail').css('background-image', 'linear-gradient(to left, rgba(255,255,255,0), rgba(255,255,255,1)');
            $('#away-team-trail').css('width', trailWidth + 'px');
            $('#away-team-trail').css('margin-left', marginWidth + 'px');
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

        //change possession of ball
        if (self.currentTeamWithBall() === self.awayTeamID())
            self.currentTeamWithBall(self.homeTeamID());
        else
            self.currentTeamWithBall(self.awayTeamID());
    };
})(jQuery);