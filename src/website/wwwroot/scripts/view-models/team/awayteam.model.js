(function ($) {
    var self = this;

    //AWAY TEAM VARIABLES:
    self.awayTeamID = ko.observable(0); //11
    self.awayTeamInfo = ko.computed(function () {
        if (self.awayTeamID() === 'undefined' || self.awayTeamID() <= 0)
            return new MODULES.Constructors.TeamArrayRecord();
        return $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.awayTeamID(); })[0]; //get the team selected by user;
    });
    self.awayTeamTimeOuts = ko.observable(3);
    self.awayTeamScore = ko.observable(0);
})(jQuery);