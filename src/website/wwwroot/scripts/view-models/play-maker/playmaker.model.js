(function ($) {
    var self = this;

    self.teamPlayHistory = ko.observableArray();

    self.AddPlayHistory = function (playHistory) {
        self.teamPlayHistory.push(playHistory);
        //self.teamPlayHistory.reverse();
        self.teamPlayHistory.sort(function (left, right) {
            return right.playId === left.playId ? 0 : right.playId < left.playId ? -1 : 1;
        });
    };

    self.MakePlay = function () {
        playMaker.init();
        $('input[name=selectPlay][value=pass]').prop('checked', 'checked');//reset play selector to default
    };

    self.MakePlayAfterTD = function () {
        //handles plays after a touchdown (point after attempt or 2 point conversion)
        playMaker.initPlayAfterTouchdown();
        $('input[name=afterTDPlay][value=extraPoint]').prop('checked', 'checked');//reset play selector to default
    };
})(jQuery);