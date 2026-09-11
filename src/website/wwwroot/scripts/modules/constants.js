MODULES.Constants = (function () {

    return {
        TeamImageRoot: "wwwroot/content/images/teams/",
        KICKOFF_SPOT: 35,
        SAFETY_KICKOFF_SPOT: 20,
        EXTRA_POINT_KICK_SPOT: 15,
        END_ZONE_YARDS: 10,
        TWO_POINT_CONVERSION_SPOT: 2,
        TOUCHBACK_YARD_LINE: 20,
        SHOW_SPECIAL_TEAMS_CLASS: 'show-sub-menu',
        MAX_TIME_OF_QUARTER: 900, //900 seconds = 15 minutes
        PLAY_CLOCK_NORMAL: 40, //seconds the offense has to snap after the end of the previous play
        PLAY_CLOCK_SHORT: 25, //seconds the offense has to snap after an administrative stoppage (penalty, timeout, etc.)
        DELAY_OF_GAME_PENALTY_YARDS: 5,
        UNSPORTSMANLIKE_CONDUCT_PENALTY_YARDS: 15,
        MAX_CONSECUTIVE_DELAY_OF_GAME_PENALTIES: 3, //a 3rd straight delay of game by the same team without a snap results in a forfeit
        SPIKE_YARDS_LOST: 2
    };

})();