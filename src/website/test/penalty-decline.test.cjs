const assert = require('node:assert/strict');
const test = require('node:test');

const { createGameContext } = require('./helpers/play-context.cjs');

// Exercises the penalty decline/enforcement decision inside getPlayResult: the offended
// team only declines when the play's own outcome beats the enforced outcome (a failed
// 3rd/4th-down snap the defense already won, or a touchdown the flag cannot beat).
//
// Each snap is scripted through a single Penalties entry, so the test controls which unit
// drew the flag. The turnover chances are rolled before the flag is drawn, so rolls are
// consumed in this order:
//   1. big-play check, 2. play yardage, 3. interception check (pass only),
//   4. fumble check (only when the play can fumble), 5. MAIN_PENALTY_PERCENT check,
//   6. committing-unit roll (0 = OFFENSE, 1 = DEFENSE), 7. the entry's own chance roll,
//   8. the pick among eligible entries, 9. out-of-bounds check (run only)
// (the out-of-bounds roll is only reached on a short gain, so a leftover value is harmless)
function createPenaltyPlay(options = {}) {
    const game = createGameContext();

    game.MODULES.Constants.MAIN_PENALTY_PERCENT = 100; //every snap draws a flag
    game.MODULES.GameVariables.DiceSumTotal = options.diceSum ?? 8; //7+ gains, 3- or less loses
    //a single GENERAL entry - a run play can draw it (PASS-only flags are filtered out)
    game.MODULES.GameVariables.Penalties = [
        options.penalty ?? { name: 'Holding', yards: 10, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 100, automaticFirstDown: false }
    ];
    game.currentDown(options.down ?? 1);
    game.yardsToFirst(options.yardsToFirst ?? 10);

    //stubs for the recordPlay a turnover runs inside getPlayResult - this context drives
    //the play logic, not the game clock around it
    game.isRunning = () => true;
    game.StartCounter = () => {};
    game.AdvanceTime = () => {};

    //a pass asks for an interception check and a fumble check, a run only the fumble check;
    //only a run can run out of bounds afterwards
    const turnoverRolls = options.play === 'pass' ? [100, 100] : [100];
    const queue = [
        1,                          //big-play check - keep the yardage cap at 15
        options.yardsRoll ?? 8,     //play yardage (the loss itself when the dice sum is low)
        ...turnoverRolls,           //interception check / fumble check - never fire
        1,                          //MAIN_PENALTY_PERCENT check
        options.committedBy ?? 0,   //0 = OFFENSE, 1 = DEFENSE
        1,                          //the entry's chance roll
        0,                          //pick the only eligible entry
        ...(options.play === 'pass' ? [] : [100]) //out-of-bounds check - never
    ];
    game.UTILITIES.getRandomInt = () => (queue.length ? queue.shift() : 100);

    return game;
}

test('an accepted offensive flag wipes the play and walks off from the line of scrimmage', () => {
    const game = createPenaltyPlay({ down: 1, yardsRoll: 8 });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /On the Offense/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.match(result.playResultText, /Holding \(10 YARDS\)/);
    assert.equal(result.yards, -10); //the 8 gained are wiped - the flag is walked off from the snap
    assert.equal(result.isPenalty, true);
    assert.equal(result.penalty.yards, 10);
    assert.equal(result.penalty.penaltySideOfBall, 'OFFENSE');
    assert.equal(game.currentDown(), 1); //an accepted foul replays the down
    assert.equal(game.yardsToFirst(), 20); //1st & 10 plus the flag = 1st & 20

    game.playMaker.recordGameStats(game.homeTeamInfo(), result);
    const home = game.gamePlayStats()[0];
    assert.equal(home.totalPenalties, 1);
    assert.equal(home.totalPenaltyYards, -10);
    assert.equal(home.totalYardsRushing, 0); //an accepted flag wipes the run gain
});

test('the defense declines an offensive flag on a failed 3rd down - the down it won is worth more', () => {
    const game = createPenaltyPlay({ down: 3, yardsRoll: 2 });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /On the Offense/); //the feedback still names who drew the flag
    assert.match(result.playResultText, /PENALTY DECLINED/);
    assert.equal(result.yards, 2); //the flag is ignored - no penalty yards added or subtracted
    assert.equal(result.isPenalty, false);
    assert.equal(result.penalty, undefined); //nothing to attribute stats to
    assert.equal(game.currentDown(), 4); //the play's own outcome still costs the down
    assert.equal(game.yardsToFirst(), 8);

    game.playMaker.recordGameStats(game.homeTeamInfo(), result);
    const home = game.gamePlayStats()[0];
    assert.equal(home.totalYardsRushing, 2); //the play's own gain still counts
    assert.equal(home.totalPenalties, 0); //a declined flag books nothing
    assert.equal(home.totalPenaltyYards, 0);
});

test('the same failed run on 1st down keeps the flag - the defense trades a down for the yards', () => {
    const game = createPenaltyPlay({ down: 1, yardsRoll: 2 });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.equal(result.yards, -10); //the 2 gained are wiped - the flag walks off from the line of scrimmage
    assert.equal(result.isPenalty, true);
    assert.equal(game.currentDown(), 1); //the down the offense lost on the play is replayed
    assert.equal(game.yardsToFirst(), 20); //1st & 10 plus the flag = 1st & 20
});


test('the defense does not decline a flag that erases a 3rd-down conversion', () => {
    const game = createPenaltyPlay({ down: 3, yardsRoll: 12 });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.equal(result.yards, -10); //the 12 gained are wiped - the flag walks off from the line of scrimmage
    assert.equal(game.currentDown(), 3); //the conversion is wiped - 3rd down is replayed
    assert.equal(game.yardsToFirst(), 20); //1st & 10 plus the flag = 1st & 20
});

test('a defensive flag is enforced on top of the play - the offense takes the yards', () => {
    const game = createPenaltyPlay({ down: 1, yardsRoll: 8, committedBy: 1 });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /On the Defense/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.equal(result.yards, 18); //8 gained + 10 fouled
    assert.equal(result.isPenalty, true);
    assert.equal(result.penalty.penaltySideOfBall, 'DEFENSE');
    assert.equal(result.isFirstDown, true); //past the sticks with the flag folded in
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);
});

test('a defensive flag is enforced even when the play lost yardage - the offense recovers ground', () => {
    //a sack plus a defensive flag is exactly where the old `_yards < -enforcedYards` check
    //went wrong: (-12 < -10) read as "decline", leaving the offense stuck at -12 instead of -2
    const game = createPenaltyPlay({ down: 1, diceSum: 2, yardsRoll: 12, committedBy: 1 });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /On the Defense/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.equal(result.yards, -2); //12 lost, 10 recovered from the flag
    assert.equal(result.isPenalty, true);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 12);
});


test('the defense declines a flag on a failed 4th down - the turnover on downs stands', () => {
    const game = createPenaltyPlay({ down: 4, yardsRoll: 2 });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /PENALTY DECLINED/);
    assert.match(result.playResultText, /TURNOVER ON DOWNS/);
    assert.equal(result.isPenalty, false);
    assert.equal(result.isTurnover, true); //accepting would have replayed 4th down for the offense
    assert.equal(result.yards, 2);
});

test('the offense declines a defensive flag when the play already scored - the touchdown stands', () => {
    const game = createPenaltyPlay({ down: 1, yardsRoll: 10, committedBy: 1 });

    //yardsToTouchdown is a plain observable in the shared context - make it follow the ball
    //the way the real game does, so the 10-yard run can actually reach the goal line
    const startTraveled = game.yardsTraveled();
    game.yardsToTouchdown = () => 10 - (game.yardsTraveled() - startTraveled);
    game.UpdateBoxScore = () => {}; //addScore touches the box score
    game.setTimeout = () => {}; //addScore queues a toast - there is nothing to paint here

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.equal(result.yards, 10); //no flag yards folded into the score
    assert.equal(result.isPenalty, false);
    assert.equal(result.penalty, undefined);
    assert.equal(result.playResultText, 'TOUCHDOWN'); //the scoring text replaces the play text
    assert.equal(game.homeTeamScore(), 6);
});

test('an automatic first down is announced only when a defensive flag carrying one is enforced', () => {
    const personalFoul = { name: 'Personal Foul', yards: 15, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 100, automaticFirstDown: true };

    const defenseFlag = createPenaltyPlay({ down: 1, yardsRoll: 8, committedBy: 1, penalty: personalFoul });
    const enforced = defenseFlag.playMaker.getPlayResult(defenseFlag.GAME_PLAY_TYPES.RUN);
    assert.match(enforced.playResultText, /On the Defense/);
    assert.match(enforced.playResultText, /AUTOMATIC FIRST DOWN/);
    assert.match(enforced.playResultText, /PENALTY ENFORCED/);
    assert.equal(enforced.penalty.automaticFirstDown, true);
    assert.equal(enforced.yards, 23);

    //the same flag drawn by the offense never hands anyone an automatic first down
    const offenseFlag = createPenaltyPlay({ down: 1, yardsRoll: 8, committedBy: 0, penalty: personalFoul });
    const byOffense = offenseFlag.playMaker.getPlayResult(offenseFlag.GAME_PLAY_TYPES.RUN);
    assert.match(byOffense.playResultText, /On the Offense/);
    assert.match(byOffense.playResultText, /PENALTY ENFORCED/);
    assert.doesNotMatch(byOffense.playResultText, /AUTOMATIC FIRST DOWN/);
    assert.equal(byOffense.yards, -15); //the 8 gained are wiped - the 15 yard flag walks off from the line of scrimmage
});


test('a 10 yard completion with offensive pass interference is 1st and 20, not 1st and 10', () => {
    const game = createPenaltyPlay({
        down: 1,
        yardsRoll: 10,
        committedBy: 0,
        play: 'pass',
        penalty: { name: 'Offensive Pass Interference', yards: 10, penaltySideOfBall: 'OFFENSE', penaltyType: 'PASS', chance: 100, automaticFirstDown: false }
    });

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.match(result.playResultText, /On the Offense/);
    assert.match(result.playResultText, /PENALTY ENFORCED/);
    assert.match(result.playResultText, /Offensive Pass Interference \(10 YARDS\)/);
    assert.equal(result.yards, -10); //the 10 gained are wiped - the flag walks off from the line of scrimmage
    assert.equal(result.isPenalty, true);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 20); //the reported bug: this stayed 1st & 10 while the gain cancelled the flag
});

