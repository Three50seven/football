(function ($) {
    var self = this;

    //HOME TEAM VARIABLES: 
    self.homeTeamID = ko.observable(0);
    self.homeTeamInfo = ko.computed(function () {
        if (self.homeTeamID() === 'undefined' || self.homeTeamID() <= 0)
            return new MODULES.Constructors.TeamArrayRecord();
        return $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.homeTeamID(); })[0]; //get the team selected by user;
    });
    self.homeTeamTimeOuts = ko.observable(3);
    self.homeTeamScore = ko.observable(0);
})(jQuery);