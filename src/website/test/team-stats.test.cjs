const assert = require('node:assert/strict');
const test = require('node:test');
const { createGameContext } = require('./helpers/play-context.cjs');

function playSnap(options = {}) {
    const game = createGameContext();
    const playType = options.playType ?? game.GAME_PLAY_TYPES.RUN;
    const offenseId = options.offenseId ?? 10;
    game.currentTeamWithBall(offenseId);
    game.currentDown(options.down ?? 1);
    game.MODULES.GameVariables.DiceSumTotal = options.dice ?? 8;
    Object.assign(game.MODULES.Constants, options.constants);
    if (options.penalty)
        game.MODULES.GameVariables.Penalties = [options.penalty];
    game.isRunning = () => true;
    game.StartCounter = () => {};
    game.AdvanceTime = () => {};
    game.UpdateBoxScore = () => {};
    game.setTimeout = () => {};
    if (options.goalDistance !== undefined)
        game.yardsToTouchdown = () => options.goalDistance - game.yardsTraveled();

    const rolls = (options.rolls ?? [1, 8, 100, 100, 100]).slice();
    game.UTILITIES.getRandomInt = () => rolls.length ? rolls.shift() : 100;
    const result = game.playMaker.getPlayResult(playType);
    if (!result.isTurnover && !result.wasRecorded)
        game.playMaker.recordGameStats(offenseId === 10 ? game.homeTeamInfo() : game.awayTeamInfo(), result);
    return {
        game,
        result,
        offense: game.gamePlayStats().find(team => team.teamId === offenseId),
        defense: game.gamePlayStats().find(team => team.teamId !== offenseId)
    };
}

test('new statistics initialize to zero and total yards reflect constructor yardage', () => {
    const game = createGameContext();
    const stat = new game.MODULES.Constructors.GamePlayStatRecord(10, 'HOME', 1, 8, -3, 10, 0, 0);
    assert.equal(stat.totalYards, 5);
    for (const key of ['totalFumblesLost', 'totalInterceptionsThrown', 'totalSacks', 'totalTackles'])
        assert.equal(stat[key], 0);
});

for (const offenseId of [10, 20]) {
    test(`a sack credits the defense, including its tackle, for offense ${offenseId}`, () => {
        const { offense, defense, result } = playSnap({ offenseId, playType: 'pass', dice: 2 });
        assert.equal(result.isSack, true);
        assert.equal(offense.totalYardsPassing, -8);
        assert.equal(offense.totalYards, -8);
        assert.equal(offense.totalSacks, 0);
        assert.equal(offense.totalTackles, 0);
        assert.equal(defense.totalSacks, 1);
        assert.equal(defense.totalTackles, 1);
        assert.equal(defense.totalPlayCount, 0);
        assert.equal(defense.totalTimePossession, 0);
        assert.equal(defense.totalYards, 0);
    });

    test(`a lost fumble is recorded against offense ${offenseId} before possession flips`, () => {
        const { offense, defense, game } = playSnap({
            offenseId, constants: { FUMBLE_CHANCE_PERCENT: 100 }, rolls: [1, 8, 1, 100, 100]
        });
        assert.notEqual(game.currentTeamWithBall(), offenseId);
        assert.equal(offense.totalFumblesLost, 1);
        assert.equal(offense.totalInterceptionsThrown, 0);
        assert.equal(offense.totalTurnovers, 1);
        assert.equal(defense.totalFumblesLost, 0);
        assert.equal(defense.totalTackles, 0);
    });

    test(`a pick-six counts one interception thrown by offense ${offenseId}`, () => {
        const { offense, defense, result } = playSnap({
            offenseId, playType: 'pass',
            constants: { INTERCEPTION_CHANCE_PERCENT: 100, INTERCEPTION_RETURN_TOUCHDOWN_CHANCE_PERCENT: 100 },
            rolls: [1, 8, 1, 100, 1]
        });
        assert.equal(result.isReturnTouchdown, true);
        assert.equal(offense.totalInterceptionsThrown, 1);
        assert.equal(offense.totalFumblesLost, 0);
        assert.equal(offense.totalTurnovers, 1);
        assert.equal(defense.totalInterceptionsThrown, 0);
        assert.equal(defense.totalTackles, 0);
    });
}

for (const playType of ['run', 'pass']) {
    test(`an in-bounds ${playType} credits a tackle but not a sack`, () => {
        const { offense, defense } = playSnap({ playType });
        assert.equal(offense.totalYards, 8);
        assert.equal(defense.totalTackles, 1);
        assert.equal(defense.totalSacks, 0);
    });

    test(`a ${playType} touchdown does not credit a tackle`, () => {
        const { defense, game } = playSnap({ playType, goalDistance: 8 });
        assert.equal(game.homeTeamScore(), 6);
        assert.equal(defense.totalTackles, 0);
    });
}

test('a run stopped on downs counts a tackle but not a lost fumble or interception', () => {
    const { offense, defense } = playSnap({ down: 4 });
    assert.equal(offense.totalTurnovers, 1);
    assert.equal(offense.totalFumblesLost, 0);
    assert.equal(offense.totalInterceptionsThrown, 0);
    assert.equal(defense.totalTackles, 1);
});

test('a loss on a run is a tackle, not a sack', () => {
    const { offense, defense } = playSnap({ dice: 2 });
    assert.equal(offense.totalYards, -8);
    assert.equal(defense.totalTackles, 1);
    assert.equal(defense.totalSacks, 0);
});

test('an incomplete pass credits neither a tackle nor a sack', () => {
    const { offense, defense, result } = playSnap({ playType: 'pass', dice: 5, rolls: [1, 100, 100, 100] });
    assert.match(result.playResultText, /Incomplete/);
    assert.equal(offense.totalYards, 0);
    assert.equal(defense.totalTackles, 0);
    assert.equal(defense.totalSacks, 0);
});

test('a completed no-gain pass credits a tackle', () => {
    const { defense } = playSnap({
        playType: 'pass', dice: 5, constants: { NO_GAIN_PASS_COMPLETION_CHANCE_PERCENT: 100 },
        rolls: [1, 1, 100, 100]
    });
    assert.equal(defense.totalTackles, 1);
});

test('an out-of-bounds run does not credit a tackle', () => {
    const { defense, result } = playSnap({
        constants: { RUN_OUT_OF_BOUNDS_CHANCE_PERCENT: 100 }, rolls: [1, 3, 100, 100, 1]
    });
    assert.match(result.playResultText, /Out of Bounds/);
    assert.equal(defense.totalTackles, 0);
});

test('total yards accumulate net play yardage and exclude penalties and kicking yards', () => {
    const game = createGameContext();
    const record = (yards, playType, penalty) => {
        const result = new game.MODULES.Constructors.PlayResult(yards, 'Play', false, playType);
        result.isPenalty = !!penalty;
        result.penalty = penalty;
        game.playMaker.recordGameStats(game.homeTeamInfo(), result);
    };
    record(8, 'run');
    record(12, 'pass');
    record(-4, 'pass');
    record(15, 'run', { yards: 10, penaltySideOfBall: 'DEFENSE' });
    record(-10, 'pass', { yards: 10, penaltySideOfBall: 'OFFENSE' });
    record(40, 'punt');
    const home = game.gamePlayStats()[0];
    assert.equal(home.totalYardsRushing, 13);
    assert.equal(home.totalYardsPassing, 8);
    assert.equal(home.totalYards, 21);
});

for (const committedBy of [0, 1]) {
    test(`an accepted flag by unit ${committedBy} does not credit a sack or tackle`, () => {
        const { defense, result } = playSnap({
            playType: 'pass', dice: 2,
            constants: { MAIN_PENALTY_PERCENT: 100 },
            penalty: { name: 'Holding', yards: 10, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 100 },
            rolls: [1, 8, 100, 100, 1, committedBy, 1, 0]
        });
        assert.equal(result.isPenalty, true);
        assert.equal(defense.totalSacks, 0);
        assert.equal(defense.totalTackles, 0);
    });
}

test('a declined offensive flag retains the defensive sack and tackle', () => {
    const { defense, result } = playSnap({
        playType: 'pass', dice: 2, down: 3,
        constants: { MAIN_PENALTY_PERCENT: 100 },
        penalty: { name: 'Holding', yards: 10, penaltySideOfBall: 'OFFENSE', penaltyType: 'GENERAL', chance: 100 },
        rolls: [1, 8, 100, 100, 1, 0, 1, 0]
    });
    assert.equal(result.isPenalty, false);
    assert.match(result.playResultText, /DECLINED/);
    assert.equal(defense.totalSacks, 1);
    assert.equal(defense.totalTackles, 1);
});

test('a muffed punt lost to the kicking team counts against the receiving team', () => {
    const game = createGameContext();
    game.isRunning = () => true;
    game.StartCounter = () => {};
    game.AdvanceTime = () => {};
    game.convertKickoffPowerToYards = () => 30;
    game.getKickoffType = () => game.KICKOFF_TYPES.PUNT;
    game.UTILITIES.getRandomInt = () => 100;
    game.MODULES.Constants.PUNT_MUFF_CHANCE_PERCENT = 100;
    game.isPunt(true);

    game.playMaker.kickoff(30, 50);

    const [home, away] = game.gamePlayStats();
    assert.equal(home.totalFumblesLost, 0);
    assert.equal(away.totalFumblesLost, 1);
    assert.equal(away.totalTurnovers, 1);
    assert.equal(away.totalInterceptionsThrown, 0);
    assert.equal(home.totalTackles, 0);
    assert.equal(away.totalTackles, 0);
});
