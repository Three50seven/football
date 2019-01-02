(function ($) {
    var self = this;

    self.SetupField = function () {
        console.log('SETTING UP FIELD');
        //$('#end-zone-left').addClass(self.homeTeamInfo().teamBgColor());            
        //$('#end-zone-right').addClass(self.awayTeamInfo().teamBgColor());
        $('#end-zone-left-img').addClass(self.homeTeamInfo().teamBgColor());
        $('#end-zone-right-img').addClass(self.awayTeamInfo().teamBgColor());
        //adjust the team names based on length of characters:
        $('#end-zone-left-txt').css('top', self.GetHomeTeamTextPosition(self.homeTeamInfo().teamName().length) + '%');
        $('#end-zone-right-txt').css('top', self.GetAwayTeamTextPosition(self.awayTeamInfo().teamName().length) + '%');
        self.SetBallPosition();
    };
    self.SetBallPosition = function () {
        console.log('SETTING BALL POSITION');
        //$('#ball-position').css('margin-left', self.ballSpot() + 'px'); //195 is max for right position, 0 is max left
        $('#ball-position-img').css('margin-left', self.ballSpot() + 'px');

        //TODO: REMOVE BELOW AFTER TESTING (uncomment $('#ball-position-img').css('margin-left', self.ballSpot() + 'px'); ABOVE)
        //TEST TRAIL:
        //let counter = 100;
        //let swapBall = false;

        //(function move() {
        //    if (swapBall)
        //        self.currentTeamWithBall(28); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
        //    else
        //        self.currentTeamWithBall(11); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
        //    self.yardsToTouchdown(counter);
        //    self.ballSpotStart = ko.observable(0);
        //    self.yardsTraveled = ko.observable(100-counter);
        //    $('#ball-position-img').css('margin-left', self.ballSpot() + 'px');                
        //    //background - image: linear - gradient(to right, rgba(255, 0, 0, 0), rgba(255, 0, 0, 1));
        //    setTimeout(move, 100); //football mover countdown
        //    //if (counter === 100) {
        //    //    reverse = -1;
        //    //}
        //    if (counter === 0) {
        //        swapBall = !swapBall;
        //        counter = 100;
        //    }
        //    counter -= 1; //+= 1 * reverse;
        //})();
        //END TEST TRAIL

        //TEST BALL MOVEMENT:
        //let counter = 100;
        //let swapBall = false;

        //(function move() {
        //    if (swapBall)
        //        self.currentTeamWithBall(28); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
        //    else
        //        self.currentTeamWithBall(11); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
        //    self.yardsToTouchdown(counter);
        //    $('#ball-position-img').css('margin-left', self.ballSpot() + 'px');                
        //    //background - image: linear - gradient(to right, rgba(255, 0, 0, 0), rgba(255, 0, 0, 1));
        //    setTimeout(move, 500); //football mover countdown
        //    //if (counter === 100) {
        //    //    reverse = -1;
        //    //}
        //    if (counter === 0) {
        //        swapBall = !swapBall;
        //        counter = 100;
        //    }
        //    counter -= 1; //+= 1 * reverse;
        //})();
        //END TEST BALL MOVEMENT:
        //TODO: REMOVE ABOVE AFTER TESTING
    };
    self.GetHomeTeamTextPosition = function (teamNameLength) {
        let topPercentage = 58;
        switch (teamNameLength) {
            case 5:
                topPercentage = 60;
                break;
            case 6:
                topPercentage = 64;
                break;
            case 7:
                topPercentage = 68;
                break;
            case 8:
                topPercentage = 70;
                break;
            case 9:
                topPercentage = 72;
                break;
            case 10:
                topPercentage = 74;
        }
        //console.log('top Percentage:' + topPercentage + ' home team name length:' + teamNameLength);
        return topPercentage;
    };
    self.GetAwayTeamTextPosition = function (teamNameLength) {
        let topPercentage = 42;
        switch (teamNameLength) {
            case 5:
                topPercentage = 40;
                break;
            case 6:
                topPercentage = 36;
                break;
            case 7:
                topPercentage = 34;
                break;
            case 8:
                topPercentage = 30;
                break;
            case 9:
                topPercentage = 28;
                break;
            case 10:
                topPercentage = 26;
        }
        //console.log('top Percentage:' + topPercentage + ' away team name length:' + teamNameLength);
        return topPercentage;
    };
})(jQuery);