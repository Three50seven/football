(function ($) {
    var self = this;

    self.pointAttemptAfterTouchDown = ko.observable(false); //determines when extra point or 2 point conversion is needed
    self.showKickoffControls = ko.observable(true); //determines when to show kickoff controls
    self.isKickoff = ko.observable(false); //determines when kick is a normal or onside kickoff
    self.isSafety = ko.observable(false); //determines when kickoff is a safety kick
    self.isPunt = ko.observable(false); //determines when kick is a punt
    self.isFieldGoal = ko.observable(false); //determines when kick is a field goal
    self.isExtraPointKick = ko.observable(false); //determines when kick is an extra point attempt
    self.teamReceivingInitialKickoff = ko.observable(0); //stores value of team receiving ball at start of game

    self.teamReceivingInitialKickoffInfo = ko.computed(function () {
        if (self.teamReceivingInitialKickoff() === self.homeTeamID())
            return self.homeTeamInfo();
        else
            return self.awayTeamInfo();
    });
    self.kickoffPowerSliderIntervalId = 0;
    self.kickoffAngleSliderIntervalId = 0;
    self.kickoffPower = -1;
    self.kickoffAngle = -1;

    self.GetKickoffPower = function () {
        var power = parseInt($("#kickoffPower").val(), 10);
        $("#kickoffPower").prop('disabled', true);

        //stop slider movement after getting value
        clearInterval(self.kickoffPowerSliderIntervalId);

        $("#kickoffPowerSelected").text(power);
        self.kickoffPower = power;
    };
    self.GetKickoffAngle = function () {
        var angle = parseInt($("#kickoffAngle").val(), 10);
        $("#kickoffAngle").prop('disabled', true);

        //stop slider movement after getting value
        clearInterval(self.kickoffAngleSliderIntervalId);

        $("#kickoffAngleSelected").text(angle);
        self.kickoffAngle = angle;
    };
    self.Kickoff = function () {
        console.log('kickoffPowerSelected: %s kickoffAngleSelected: %s', self.kickoffPower, self.kickoffAngle);
        if (self.kickoffPower >= 0 && self.kickoffAngle >= 0) {
            //handle kickoff
            playMaker.kickoff(kickoffPower, kickoffAngle);
        }
        else {
            alert('Select kick power and angle');
        }
    };
    self.SetupKickoff = function () {
        self.showKickoffControls(true); //used to show kickoff controls

        let min = 0;
        let max = 100;
        let reverse = 1;
        let i = min;

        //enable sliders and reset values:
        $("#kickoffPower").prop('disabled', false);
        $("#kickoffAngle").prop('disabled', false);
        self.kickoffPower = -1;
        self.kickoffAngle = -1;
        $("#kickoffAngleSelected").text('select angle');
        $("#kickoffPowerSelected").text('select power');

        //set initial kickoff ball spot for display:
        self.SetupKickoffBallSpot();

        //setup power slider movement
        self.kickoffPowerSliderIntervalId = window.setInterval(function () {
            $("#kickoffPower").val(i += 1 * reverse);
            if (i === max)
                reverse = -1;
            if (i === min)
                reverse = 1;
        }, MODULES.GameVariables.KickoffSliderDifficulty);

        //setup angle slider movement
        self.kickoffAngleSliderIntervalId = window.setInterval(function () {
            $("#kickoffAngle").val(i += 1 * reverse);
            if (i === max)
                reverse = -1;
            if (i === min)
                reverse = 1;
        }, MODULES.GameVariables.KickoffSliderDifficulty);
    };
    self.PuntBall = function () {
        self.isPunt(true);
        self.SetupKickoff();
    };
    self.KickFieldGoal = function () {
        self.isFieldGoal(true);
        self.SetupKickoff();
    };
})(jQuery);