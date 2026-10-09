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
        TWO_MINUTE_WARNING_SECONDS: 120, //the clock stops for a warning at 2:00 of the 2nd and 4th quarters
        PLAY_CLOCK_NORMAL: 40, //seconds the offense has to snap after the end of the previous play
        PLAY_CLOCK_SHORT: 25, //seconds the offense has to snap after an administrative stoppage (penalty, timeout, etc.)
        CHAIN_CREW_DELAY_SECONDS: 5, //extra game-clock time an incomplete pass costs in the 1st-3rd quarters while the chain crew moves
        NO_GAIN_PASS_COMPLETION_CHANCE_PERCENT: 40, //chance a "no gain" pass is a completion for zero yards rather than an incompletion
        RUN_OUT_OF_BOUNDS_CHANCE_PERCENT: 10, //base chance a short run carries out of bounds (which stops the clock)
        RUN_OUT_OF_BOUNDS_END_OF_HALF_CHANCE_PERCENT: 50, //higher chance in the 2nd/4th quarter as the offense tries to stop the clock
        RUN_OUT_OF_BOUNDS_LEADING_END_OF_HALF_CHANCE_PERCENT: 5, //leading offense at the end of a half/OT stays in bounds to run out the clock
        RUN_OUT_OF_BOUNDS_MAX_YARDS: 10, //a run must be shorter than this (or short of the first-down marker) to have a chance to go out of bounds
        THROWAWAY_PER_QUARTER: 2, //number of times a player can call a throwaway per quarter
        INTENTIONAL_GROUNDING_CHANCE_PERCENT: 5, //chance a throwaway results in an intentional grounding penalty        
        DELAY_OF_GAME_PENALTY_YARDS: 5, //back stop in case the 'Delay of Game' table entry is missing from penalties array
        UNSPORTSMANLIKE_CONDUCT_PENALTY_YARDS: 15, //back stop in case the 'Unsportsmanlike Conduct' table entry is missing from penalties array
        MAX_CONSECUTIVE_DELAY_OF_GAME_PENALTIES: 3, //a 3rd straight delay of game by the same team without a snap results in a forfeit
        SPIKE_YARDS_LOST: 2,
        INTERCEPTION_CHANCE_PERCENT: 3,
        INTERCEPTION_RETURN_TOUCHDOWN_CHANCE_PERCENT: 5, //chance an interception is taken all the way back by the defense (a pick 6)
        FACE_MASK_CHANCE_PERCENT: 1,
        FUMBLE_CHANCE_PERCENT: 2,
        FUMBLE_RECOVERY_RETURN_TOUCHDOWN_CHANCE_PERCENT: 3, //chance a recovered fumble is returned for a touchdown
        PUNT_BLOCK_CHANCE_PERCENT: 5,
        PUNT_MUFF_CHANCE_PERCENT: 5,
        ONSIDE_RECOVERY_CHANCE_PERCENT: 20,
        BLOCKED_FIELD_GOAL_RETURN_CHANCE_PERCENT: 65,
        BLOCKED_FIELD_GOAL_TOUCHDOWN_CHANCE_PERCENT: 1,
        MAIN_PENALTY_PERCENT: 5, //chance a penalty occurs, then the following are chances or how often the penalty occurs for each specific type
        FALSE_START_CHANCE_PERCENT: 5, //This and the following penalty chances need to be increased as well as MAIN_PENALTY_PERCENT if penalties are too rare
        OFFSIDE_CHANCE_PERCENT: 2,
        DEFENSIVE_PASS_INTERFERENCE_CHANCE_PERCENT: 5,
        OFFENSIVE_PASS_INTERFERENCE_CHANCE_PERCENT: 5,
        HOLDING_CHANCE_PERCENT: 5,
        ROUGHING_THE_PASSER_CHANCE_PERCENT: 1,
        PERSONAL_FOUL_CHANCE_PERCENT: 1,
        TRIPPING_CHANCE_PERCENT: 1,
        CLIPPING_CHANCE_PERCENT: 1,
        ILLEGAL_FORMATION_CHANCE_PERCENT: 1,
        UNSPORTSMANLIKE_CONDUCT_CHANCE_PERCENT: 1
    };

})();