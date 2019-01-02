(function ($) {
    var self = this;

    self.hasRolled = ko.observable(false);
    self.RollDice = function () {
        gameDice.init();
        self.hasRolled(true); //flag that the user has rolled the dice            
    };
})(jQuery);