(function ($) {
    var self = this;    
    self.simBoxScore = ko.observableArray();
    self.simGameSummary = ko.observable();
    self.simHistory = ko.observableArray();
    self.simMatchupRecord = ko.computed(function () {
        let wins = 0, losses = 0, ties = 0;
        self.simHistory().forEach(function (entry) {
            let homeScore = entry.boxScore[0].totalScore;
            let awayScore = entry.boxScore[1].totalScore;
            if (homeScore > awayScore) wins++;
            else if (homeScore < awayScore) losses++;
            else ties++;
        });
        return { wins: wins, losses: losses, ties: ties };
    });

    self.SimGame = function () {
        sim.simGame();
    };
})(jQuery);