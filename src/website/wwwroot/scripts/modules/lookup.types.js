//LOOKUP TYPES:
//TODO: Use these instead of relying on 'magic' strings
var KICKOFF_TYPES = {
    KICKOFF: 'kickoff',
    ONSIDE: 'onside',
    PUNT: 'punt',
    FIELDGOAL: 'fieldgoal',
    EXTRAPOINT: 'extrapoint',
    SAFETY: 'safety'
};

var GAME_PLAY_TYPES = {
    RUN: 'run',
    PASS: 'pass',
    EXTRAPOINT: 'extraPoint',
    TWOPOINTCONVERSION: 'twoPointConversion',
    FIELDGOAL: 'fieldGoal',
    THROWAWAY: 'throwaway',
    SPIKE: 'spike'
};

var SCORE_TYPES = {
    TOUCHDOWN: 'touchdown',
    FIELDGOAL: 'fieldgoal',
    SAFETY: 'safety',
    EXTRAPOINT: 'extrapoint',
    TWOPOINTCONVERSION: 'twopointconversion'
};

var PENALTY_SIDE_OF_BALL_TYPES = {
    OFFENSE: 'OFFENSE',
    DEFENSE: 'DEFENSE',
    ANY: 'ANY' 
};

//expose penalty enums on MODULES for use in game.variables.js and elsewhere
var PENALTY_TYPES = {
    PRESNAP: 'PRESNAP', //only presnap situations can draw this type of penalty
    PASS: 'PASS', //only pass plays can draw this type of penalty
    GENERAL: 'GENERAL' //pass or run plays can draw this type of penalty
};
if (typeof MODULES !== 'undefined' && MODULES !== null) {
    MODULES.PENALTY_SIDE_OF_BALL_TYPES = PENALTY_SIDE_OF_BALL_TYPES;
    MODULES.PENALTY_TYPES = PENALTY_TYPES;
}