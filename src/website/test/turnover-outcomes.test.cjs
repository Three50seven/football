const assert = require('node:assert/strict');
const test = require('node:test');

const { createGameContext } = require('./helpers/play-context.cjs');

// Exercises the live-ball turnover outcomes in getPlayResult:
//   1. a defensive flag sends an intercepted/fumbled ball back to the offense on any down -
//      even a 4th-down attempt, where the enforced flag can give the offense its try back
//   2. an interception or recovered fumble can be returned for a touchdown (a pick 6 / return TD)
//   3. a recovery left in an end zone is a touchback - the recovering team takes over on its own
//      touchback yard line with a fresh set of downs, like a turnover on downs
//
// Rolls are consumed in this order: 1. big-play check, 2. play yardage, 3. interception check
// (pass only), 4. fumble check (only when the play can fumble), 5. MAIN_PENALTY_PERCENT check,
// 6. committing-unit roll, 7. the entry's own chance roll, 8. the pick among eligible entries,
// 9. return-touchdown check (turnover plays only). A leftover out-of-bounds check falls through
// to the stub's default roll of 100 - the out-of-bounds chances are 0 in this context.
function createTurnoverPlay(options = {}) {
    const game = createGameContext();

    game.MODULES.Constants.MAIN_PENALTY_PERCENT = options.penaltyChance ?? 0;
    game.MODULES.Constants.INTERCEPTION_CHANCE_PERCENT = options.interceptionChance ?? 0;
    game.MODULES.Constants.FUMBLE_CHANCE_PERCENT = options.fumbleChance ?? 0;
    game.MODULES.Constants.INTERCEPTION_RETURN_TOUCHDOWN_CHANCE_PERCENT = options.interceptionReturnChance ?? 0;
    game.MODULES.Constants.FUMBLE_RECOVERY_RETURN_TOUCHDOWN_CHANCE_PERCENT = options.fumbleReturnChance ?? 0;
    game.MODULES.GameVariables.DiceSumTotal = options.diceSum ?? 8; //7+ gains, 3- or less loses
    game.MODULES.GameVariables.Penalties = [
        options.penalty ?? { name: 'Holding', yards: 10, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 100, automaticFirstDown: false }
    ];
    game.currentDown(options.down ?? 1);
    game.yardsToFirst(options.yardsToFirst ?? 10);
    game.ballSpotStart(options.ballSpotStart ?? 50);

    //yardsToTouchdown follows the ball the way the real game's computed observable does -
    //the shared context pins it at 50, which would hide every end zone
    game.yardsToTouchdown = () => 100 - (game.ballSpotStart() + game.yardsTraveled());

    //stubs for the recordPlay/addScore that run inside getPlayResult - this context drives
    //the play logic, not the game clock or the DOM around it
    game.isRunning = () => true;
    game.StartCounter = () => {};
    game.AdvanceTime = () => {};
    game.UpdateBoxScore = () => {};
    game.setTimeout = () => {};

    const queue = (options.rolls ?? []).slice();
    game.UTILITIES.getRandomInt = () => (queue.length ? queue.shift() : 100);

    return game;
}

test('a defensive flag sends an intercepted ball back to the offense', () => {
    const game = createTurnoverPlay({
        play: 'pass',
        down: 1,
        interceptionChance: 100, //the pass is picked...
        penaltyChance: 100,      //...but the defense is flagged on the snap
        rolls: [
            1,        //big-play check - keep the yardage cap at 15
            7,        //pass yardage
            1,        //interception check - fires
            100,      //MAIN_PENALTY_PERCENT check - draws the flag
            1,        //committing unit: 1 = DEFENSE
            1,        //the entry's own chance roll
            0         //pick the only eligible entry
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.equal(result.isTurnover, false); //the offense accepts the flag, so nothing was turned over
    assert.equal(result.isPenalty, true);
    assert.equal(result.penalty.penaltySideOfBall, 'DEFENSE');
    assert.equal(game.currentTeamWithBall(), 10); //home still has the ball
    assert.match(result.playResultText, /Pass INTERCEPTED/); //the recovery still happened on the field
    assert.match(result.playResultText, /On the Defense/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.match(result.playResultText, /TURNOVER NEGATED/);
    //the interception's yardage goes with the wiped recovery - only the flag is walked off
    assert.equal(result.yards, 10);
    assert.equal(game.yardsTraveled(), 10);
    assert.equal(result.isFirstDown, true); //10 yards on 1st & 10 clears the sticks
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);

    //no turnover books, the flag books to the defense
    game.playMaker.recordGameStats(game.homeTeamInfo(), result);
    const home = game.gamePlayStats()[0];
    const away = game.gamePlayStats()[1];
    assert.equal(home.totalTurnovers, 0);
    assert.equal(home.totalPenalties, 0);
    assert.equal(away.totalPenalties, 1);
    assert.equal(away.totalPenaltyYards, -10);
});

test('a defensive flag sends a fumbled ball back to the offense and replays the down short of the sticks', () => {
    const game = createTurnoverPlay({
        down: 2,
        yardsToFirst: 15, //2nd & 15 - the flag alone is not enough for a new set of downs
        fumbleChance: 100, //the ball is on the ground and the defense recovered...
        penaltyChance: 100, //...and the defense is flagged on the same play
        rolls: [
            1,        //big-play check
            8,        //run yardage
            1,        //fumble check - fires
            100,      //MAIN_PENALTY_PERCENT check - draws the flag
            1,        //committing unit: 1 = DEFENSE
            1,        //the entry's own chance roll
            0         //pick the only eligible entry
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.equal(result.isTurnover, false);
    assert.equal(result.isPenalty, true);
    assert.equal(game.currentTeamWithBall(), 10);
    assert.match(result.playResultText, /FUMBLE RECOVERED BY DEFENSE/);
    assert.match(result.playResultText, /TURNOVER NEGATED/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.equal(result.yards, 10); //the fumble's own yardage is wiped - only the flag is enforced
    assert.equal(game.currentDown(), 2); //no new set of downs, so the down is replayed...
    assert.equal(game.yardsToFirst(), 5); //...at the new spot: 2nd & 5
    assert.equal(game.yardsTraveled(), 10);
});

test('a defensive flag on a 4th-down interception gives the ball back to the offense', () => {
    const game = createTurnoverPlay({
        play: 'pass',
        down: 4,
        interceptionChance: 100,
        penaltyChance: 100,
        rolls: [
            1,        //big-play check
            7,        //pass yardage
            1,        //interception check - fires
            100,      //MAIN_PENALTY_PERCENT check - draws the flag
            1,        //committing unit: 1 = DEFENSE
            1,        //the entry's own chance roll
            0         //pick the only eligible entry
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.equal(result.isTurnover, false); //the offense accepts - even on a 4th-down attempt
    assert.equal(result.isPenalty, true);
    assert.equal(result.penalty.penaltySideOfBall, 'DEFENSE');
    assert.equal(game.currentTeamWithBall(), 10); //home keeps the ball
    assert.match(result.playResultText, /Pass INTERCEPTED/);
    assert.match(result.playResultText, /TURNOVER NEGATED/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.equal(result.yards, 10); //only the flag is walked off
    assert.equal(game.currentDown(), 1); //4th & 10 plus the 10 yard flag clears the sticks
    assert.equal(game.yardsToFirst(), 10);
    assert.equal(result.isFirstDown, true);

    //no turnover books, the flag books to the defense
    game.playMaker.recordGameStats(game.homeTeamInfo(), result);
    const home = game.gamePlayStats()[0];
    const away = game.gamePlayStats()[1];
    assert.equal(home.totalTurnovers, 0);
    assert.equal(away.totalPenalties, 1);
    assert.equal(away.totalPenaltyYards, -10);
});

test('a defensive flag on a 4th-down fumble lets the offense try the down over again', () => {
    const game = createTurnoverPlay({
        down: 4,
        yardsToFirst: 15, //4th & 15 - the flag alone is not enough for a new set of downs
        fumbleChance: 100, //the ball is on the ground and the defense recovered...
        penaltyChance: 100, //...and the defense is flagged on the same play
        rolls: [
            1,        //big-play check
            8,        //run yardage
            1,        //fumble check - fires
            100,      //MAIN_PENALTY_PERCENT check - draws the flag
            1,        //committing unit: 1 = DEFENSE
            1,        //the entry's own chance roll
            0         //pick the only eligible entry
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.equal(result.isTurnover, false);
    assert.equal(result.isPenalty, true);
    assert.equal(game.currentTeamWithBall(), 10);
    assert.match(result.playResultText, /FUMBLE RECOVERED BY DEFENSE/);
    assert.match(result.playResultText, /TURNOVER NEGATED/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.equal(result.yards, 10); //the fumble's own yardage is wiped - only the flag is enforced
    assert.equal(game.currentDown(), 4); //no first down, so 4th down is tried over again...
    assert.equal(game.yardsToFirst(), 5); //...at the new spot: 4th & 5
    assert.equal(game.yardsTraveled(), 10);
});

test('an interception can be returned for a touchdown - a pick 6 scores for the defense', () => {
    const game = createTurnoverPlay({
        play: 'pass',
        interceptionChance: 100,
        interceptionReturnChance: 100, //the defender goes all the way
        rolls: [
            1,        //big-play check
            7,        //pass yardage (where the ball was caught)
            1,        //interception check - fires
            100,      //MAIN_PENALTY_PERCENT check - no flag
            1         //return-touchdown check - fires
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.equal(result.isTurnover, true); //it is still the offense's turnover...
    assert.equal(result.isReturnTouchdown, true); //...and the defense's touchdown
    assert.match(result.playResultText, /Pass INTERCEPTED/);
    assert.match(result.playResultText, /PICK 6/);
    assert.match(result.playResultText, /RETURNED FOR A TOUCHDOWN/);
    assert.equal(game.awayTeamScore(), 6); //the recovering team scores...
    assert.equal(game.homeTeamScore(), 0); //the offense does not
    assert.equal(game.pointAttemptTeamId, 20);
    assert.equal(game.pointAttemptAfterTouchDown(), true); //...and the point-after flow arms up
    assert.equal(game.currentTeamWithBall(), 20);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);

    const home = game.gamePlayStats()[0];
    assert.equal(home.totalTurnovers, 1); //the interception still books against the offense
});

test('a recovered fumble can be returned for a touchdown', () => {
    const game = createTurnoverPlay({
        fumbleChance: 100,
        fumbleReturnChance: 100,
        rolls: [
            1,        //big-play check
            8,        //run yardage
            1,        //fumble check - fires
            100,      //MAIN_PENALTY_PERCENT check - no flag
            1         //return-touchdown check - fires
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.equal(result.isTurnover, true);
    assert.equal(result.isReturnTouchdown, true);
    assert.match(result.playResultText, /FUMBLE RECOVERED BY DEFENSE/);
    assert.match(result.playResultText, /RETURNED FOR A TOUCHDOWN/);
    assert.doesNotMatch(result.playResultText, /PICK 6/); //a fumble return is not a pick 6
    assert.equal(game.awayTeamScore(), 6);
    assert.equal(game.pointAttemptTeamId, 20);
    assert.equal(game.pointAttemptAfterTouchDown(), true);
    assert.equal(game.currentTeamWithBall(), 20);
});

test('an interception tackled in the throwing team\'s own end zone is a touchback', () => {
    const game = createTurnoverPlay({
        play: 'pass',
        ballSpotStart: 3,      //the offense is backed up to its own 3...
        diceSum: 2,            //...and the drop back loses more yards than the ball is from the goal line
        interceptionChance: 100,
        rolls: [
            1,        //big-play check
            12,       //pass yardage - a 12 yard loss puts the ball at the -9 spot
            1,        //interception check - fires
            100,      //MAIN_PENALTY_PERCENT check - no flag
            100       //return-touchdown check - no return
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.equal(result.isTurnover, true);
    assert.equal(result.isReturnTouchdown, false);
    assert.match(result.playResultText, /Pass INTERCEPTED/);
    assert.match(result.playResultText, /TOUCHBACK/);
    //the recovering team takes over on its own touchback yard line with 1st and 10
    assert.equal(game.ballSpotStart(), game.MODULES.Constants.TOUCHBACK_YARD_LINE);
    assert.equal(game.yardsTraveled(), 0);
    assert.equal(game.currentTeamWithBall(), 20);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);
});

test('an interception left in the end zone the offense was attacking is a touchback too', () => {
    const game = createTurnoverPlay({
        play: 'pass',
        ballSpotStart: 95,     //1st & goal from the 5
        interceptionChance: 100,
        rolls: [
            1,        //big-play check
            5,        //pass yardage - the ball reaches the goal line
            1,        //interception check - fires
            100,      //MAIN_PENALTY_PERCENT check - no flag
            100       //return-touchdown check - no return
        ]
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.equal(result.isTurnover, true);
    assert.match(result.playResultText, /TOUCHBACK/);
    assert.equal(game.ballSpotStart(), game.MODULES.Constants.TOUCHBACK_YARD_LINE);
    assert.equal(game.yardsTraveled(), 0);
    assert.equal(game.currentTeamWithBall(), 20);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);
});

