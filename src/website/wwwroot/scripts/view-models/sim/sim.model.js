(function ($) {
    var self = this;    
    self.simBoxScore = ko.observableArray();

    self.SimGame = function () {
        self.gameSimulated(true);
        sim.simGame();
    };
})(jQuery);