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
        CHAIN_CREW_DELAY_SECONDS: 5, //extra game-clock time an incomplete pass costs in the 1st-3rd quarters while the chain crew moves
        NO_GAIN_PASS_COMPLETION_CHANCE_PERCENT: 40, //chance a "no gain" pass is a completion for zero yards rather than an incompletion
        RUN_OUT_OF_BOUNDS_CHANCE_PERCENT: 10, //base chance a short run carries out of bounds (which stops the clock)
        RUN_OUT_OF_BOUNDS_END_OF_HALF_CHANCE_PERCENT: 50, //higher chance in the 2nd/4th quarter as the offense tries to stop the clock
        RUN_OUT_OF_BOUNDS_LEADING_END_OF_HALF_CHANCE_PERCENT: 5, //leading offense at the end of a half/OT stays in bounds to run out the clock
        RUN_OUT_OF_BOUNDS_MAX_YARDS: 10, //a run must be shorter than this (or short of the first-down marker) to have a chance to go out of bounds
        DELAY_OF_GAME_PENALTY_YARDS: 5,
        UNSPORTSMANLIKE_CONDUCT_PENALTY_YARDS: 15,
        MAX_CONSECUTIVE_DELAY_OF_GAME_PENALTIES: 3, //a 3rd straight delay of game by the same team without a snap results in a forfeit
        SPIKE_YARDS_LOST: 2,
        INTERCEPTION_CHANCE_PERCENT: 3,
        FUMBLE_CHANCE_PERCENT: 2,
        PUNT_BLOCK_CHANCE_PERCENT: 5,
        PUNT_MUFF_CHANCE_PERCENT: 5,
        ONSIDE_RECOVERY_CHANCE_PERCENT: 20,
        BLOCKED_FIELD_GOAL_RETURN_CHANCE_PERCENT: 65,
        BLOCKED_FIELD_GOAL_TOUCHDOWN_CHANCE_PERCENT: 1
    };

})();