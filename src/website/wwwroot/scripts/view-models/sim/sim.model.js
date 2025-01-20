(function ($) {
    var self = this;    
    self.simBoxScore = ko.observableArray();
    self.simGameSummary = ko.observable();

    self.SimGame = function () {
        self.gameSimulated(true);
        sim.simGame();
    };
})(jQuery);