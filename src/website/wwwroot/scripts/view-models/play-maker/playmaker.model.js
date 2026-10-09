(function ($) {
    var self = this;

    self.teamPlayHistory = ko.observableArray();
    self.homeTeamThrowaways = ko.observable(0);
    self.awayTeamThrowaways = ko.observable(0);

    self.AddPlayHistory = function (playHistory) {
        self.teamPlayHistory.push(playHistory);
        //self.teamPlayHistory.reverse();
        self.teamPlayHistory.sort(function (left, right) {
            return right.playId === left.playId ? 0 : right.playId < left.playId ? -1 : 1;
        });
    };

    self.MakePlay = function (playSelected) {
        if (self.isTwoPointConversion())
            playMaker.play(GAME_PLAY_TYPES.TWOPOINTCONVERSION, playSelected);
        else
            playMaker.init(playSelected);
    };

    self.MakePassPlay = function () {
        self.MakePlay(GAME_PLAY_TYPES.PASS);
    };

    self.MakeRunPlay = function () {
        self.MakePlay(GAME_PLAY_TYPES.RUN);
    };

    self.MakeThrowAwayPass = function () {
        let currentTeam = self.currentTeamWithBall();

        if (currentTeam === self.homeTeamID()) {
            self.homeTeamThrowaways(self.homeTeamThrowaways() + 1);
        } else {
            self.awayTeamThrowaways(self.awayTeamThrowaways() + 1);
        }

        self.MakePlay(GAME_PLAY_TYPES.THROWAWAY);
    };

    self.SpikeBall = function () {
        if (self.isTwoPointConversion())
            return;

        playMaker.spike();
        MODULES.GameVariables.TotalPlayCount += 1;
    };

    self.MakePlayAfterTD = function () {
        //handles plays after a touchdown (point after attempt or 2 point conversion)
        playMaker.initPlayAfterTouchdown();
        $('input[name=afterTDPlay][value=extraPoint]').prop('checked', 'checked');//reset play selector to default
    };
})(jQuery);