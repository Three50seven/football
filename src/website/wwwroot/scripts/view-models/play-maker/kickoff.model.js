(function ($) {
    var self = this;

    self.pointAttemptAfterTouchDown = ko.observable(false); //determines when extra point or 2 point conversion is needed
    self.showKickoffControls = ko.observable(true); //determines when to show kickoff controls
    self.isKickoff = ko.observable(false); //determines when kick is a normal or onside kickoff
    self.isSafety = ko.observable(false); //determines when kickoff is a safety kick
    self.isPunt = ko.observable(false); //determines when kick is a punt
    self.isFieldGoal = ko.observable(false); //determines when kick is a field goal
    self.isExtraPointKick = ko.observable(false); //determines when kick is an extra point attempt
    self.isTwoPointConversion = ko.observable(false);
    self.teamReceivingInitialKickoff = ko.observable(0); //stores value of team receiving ball at start of game
    self.periodKickoffReceivingTeam = 0;

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

    self.StopKickoffSliders = function () {
        clearInterval(self.kickoffPowerSliderIntervalId);
        clearInterval(self.kickoffAngleSliderIntervalId);
        self.kickoffPowerSliderIntervalId = 0;
        self.kickoffAngleSliderIntervalId = 0;
    };

    //Oscillates a kick meter until the player locks it in. Each meter gets its own
    //position/direction so the power and angle sliders move independently.
    self.StartKickoffSlider = function (sliderSelector, readoutSelector, startValue, startDirection) {
        var min = 1;
        var max = 100;
        var position = startValue;
        var direction = startDirection;

        return window.setInterval(function () {
            position += direction;

            if (position >= max) {
                position = max;
                direction = -1;
            }
            else if (position <= min) {
                position = min;
                direction = 1;
            }

            $(sliderSelector).val(position);
            $(readoutSelector).text(position);
        }, MODULES.GameVariables.KickoffSliderDifficulty);
    };

    self.GetKickoffPower = function () {
        var power = parseInt($("#kickoffPower").val(), 10);
        $("#kickoffPower").prop('disabled', true);

        //stop slider movement after getting value
        clearInterval(self.kickoffPowerSliderIntervalId);
        self.kickoffPowerSliderIntervalId = 0;

        $("#kickoffPowerSelected").text(power);
        $("#kickPowerMeter").addClass('kick-meter-locked');
        self.kickoffPower = power;
    };
    self.GetKickoffAngle = function () {
        var angle = parseInt($("#kickoffAngle").val(), 10);
        $("#kickoffAngle").prop('disabled', true);

        //stop slider movement after getting value
        clearInterval(self.kickoffAngleSliderIntervalId);
        self.kickoffAngleSliderIntervalId = 0;

        $("#kickoffAngleSelected").text(angle);
        $("#kickAngleMeter").addClass('kick-meter-locked');
        self.kickoffAngle = angle;
    };
    self.Kickoff = function () {
        console.log('kickoffPowerSelected: %s kickoffAngleSelected: %s', self.kickoffPower, self.kickoffAngle);
        if (self.kickoffPower >= 0 && self.kickoffAngle >= 0) {
            //handle kickoff
            playMaker.kickoff(self.kickoffPower, self.kickoffAngle);
        }
        else {
            alert('Select kick power and angle');
        }
    };
    self.SetupKickoff = function () {
        self.StopKickoffSliders();
        self.showKickoffControls(true); //used to show kickoff controls
        self.StopCounter(); //the quarter clock does not run while the kick is being set up

        //enable sliders and reset values:
        $("#kickoffPower").prop('disabled', false);
        $("#kickoffAngle").prop('disabled', false);
        self.kickoffPower = -1;
        self.kickoffAngle = -1;
        $("#kickoffAngleSelected").text('--');
        $("#kickoffPowerSelected").text('--');
        $("#kickPowerMeter, #kickAngleMeter").removeClass('kick-meter-locked');

        //set initial kickoff ball spot for display:
        self.SetupKickoffBallSpot();

        //start each meter at a different point so the two are never in lockstep
        self.kickoffPowerSliderIntervalId = self.StartKickoffSlider("#kickoffPower", "#kickoffPowerSelected", 1, 1);
        self.kickoffAngleSliderIntervalId = self.StartKickoffSlider("#kickoffAngle", "#kickoffAngleSelected", 65, -1);
    };
    self.PuntBall = function () {
        if (self.isTwoPointConversion())
            return;

        self.isPunt(true);
        self.SetupKickoff();
    };
    self.KickFieldGoal = function () {
        if (self.isTwoPointConversion())
            return;

        self.isFieldGoal(true);
        self.SetupKickoff();
    };
})(jQuery);