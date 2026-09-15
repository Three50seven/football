(function ($) {
    var self = this;

    self.ResetField = function () {
        $('#end-zone-left-img, #end-zone-right-img').removeClass();
        $('#field-img .field-endzone-home').css('fill', '#a71930');
        $('#field-img .field-endzone-away').css('fill', '#241773');
    };

    self.SetupField = function () {
        console.log('SETTING UP FIELD');
        self.ResetField();
        $('#end-zone-left-img').addClass(self.homeTeamInfo().teamBgColor());
        $('#end-zone-right-img').addClass(self.awayTeamInfo().teamBgColor());
        $('#field-img .field-endzone-home').css('fill', $('#end-zone-left-img').css('background-color'));
        $('#field-img .field-endzone-away').css('fill', $('#end-zone-right-img').css('background-color'));
        //adjust the team names based on length of characters:
        $('#end-zone-left-txt').css('top', self.GetHomeTeamTextPosition(self.homeTeamInfo().teamName().length) + '%');
        $('#end-zone-right-txt').css('top', self.GetAwayTeamTextPosition(self.awayTeamInfo().teamName().length) + '%');
        self.SetBallPosition();
    };
    self.SetBallPosition = function () {
        console.log('SETTING BALL POSITION');
        self.ballSpot();
    };

    $(window).on('resize', function () {
        if (self.gameStarted && self.gameStarted()) {
            self.SetBallPosition();
        }
    });
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