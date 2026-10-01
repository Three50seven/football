const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = (relativePath) => fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', relativePath), 'utf8');

const constantsSource = read(path.join('modules', 'constants.js'));
const lookupSource = read(path.join('modules', 'lookup.types.js'));
const constructorsSource = read(path.join('modules', 'constructors.js'));
const playmakerSource = read(path.join('view-models', 'play-maker', 'playmaker.js'));

function observable(value) {
    const fn = function (next) {
        if (!arguments.length) return fn.value;
        fn.value = next;
        return fn;
    };
    fn.value = value;
    return fn;
}

// Loads the real constants/lookup/constructors and playmaker.js, then runs a single snap through getPlayResult so the
// no-gain pass/run branches can be exercised. `DiceSumTotal` of 4-6 means the play gains no yards, and the chance
// constants are forced to 0/100 so only the branch under test can fire.
function createPlayContext(options = {}) {
    const $ = function () { return { val: () => '', text: () => {}, length: 0, css: () => $(), removeClass: () => $(), addClass: () => $(), outerWidth: () => 0 }; };
    $.grep = (arr, predicate) => arr.filter(predicate);

    const context = {
        console: { log() {} },
        alert() {},
        ko: { observable: observable },
        $: $,
        jQuery: $,
        HELPERS: {
            capRunYardsAtGoalLine: (runYards, distanceToGoalLine) => {
                if (runYards <= 0 || distanceToGoalLine < 0)
                    return runYards;
                return runYards > distanceToGoalLine ? distanceToGoalLine : runYards;
            }
        },
        UTILITIES: {
            getRandomInt: (min, max) => Math.floor(Math.random() * (max - min + 1) + min),
            splitAndTitleCase: (str) => str.charAt(0).toUpperCase() + str.slice(1)
        },
        MODULES: { GameVariables: { DiceSumTotal: options.diceSum ?? 5, Teams: [] } },
        playMaker: null
    };
    context.self = context;

    vm.createContext(context);
    vm.runInContext(constantsSource, context);
    vm.runInContext(lookupSource, context);
    vm.runInContext(constructorsSource, context);
    vm.runInContext(playmakerSource, context);

    //only the chance under test is allowed to fire - turnovers are always off
    context.MODULES.Constants.INTERCEPTION_CHANCE_PERCENT = 0;
    context.MODULES.Constants.FUMBLE_CHANCE_PERCENT = 0;
    context.MODULES.Constants.NO_GAIN_PASS_COMPLETION_CHANCE_PERCENT = options.noGainCompletionChance ?? 0;
    context.MODULES.Constants.RUN_OUT_OF_BOUNDS_CHANCE_PERCENT = options.outOfBoundsChance ?? 0;
    context.MODULES.Constants.RUN_OUT_OF_BOUNDS_END_OF_HALF_CHANCE_PERCENT = options.outOfBoundsEndOfHalfChance ?? 0;
    context.MODULES.Constants.RUN_OUT_OF_BOUNDS_LEADING_END_OF_HALF_CHANCE_PERCENT = options.outOfBoundsLeadingEndOfHalfChance ?? 0;
    if (options.outOfBoundsMaxYards !== undefined)
        context.MODULES.Constants.RUN_OUT_OF_BOUNDS_MAX_YARDS = options.outOfBoundsMaxYards;

    if (options.randomInt !== undefined)
        context.UTILITIES.getRandomInt = options.randomInt;

    context.homeTeamID = observable(10);
    context.awayTeamID = observable(20);
    context.currentTeamWithBall = observable(options.teamWithBall ?? 10);
    context.homeTeamInfo = () => ({ teamName: () => 'HOME' });
    context.awayTeamInfo = () => ({ teamName: () => 'AWAY' });
    context.currentQuarter = observable(options.quarter ?? 1);
    context.currentDown = observable(1);
    context.yardsToFirst = observable(options.yardsToFirst ?? 10);
    const initialTraveled = options.yardsTraveled ?? 40;
    const initialToTouchdown = options.yardsToTouchdown ?? 60;
    context.yardsTraveled = observable(initialTraveled);
    //yardsToTouchdown is a computed off the spot of the ball, so it shrinks as yardsTraveled grows
    context.yardsToTouchdown = () => initialToTouchdown - (context.yardsTraveled() - initialTraveled);
    context.playCountForPossession = observable(1);
    context.consecutiveDelayOfGamePenalties = observable(0);
    context.pointAttemptTeamId = 0;
    context.homeTeamScore = observable(options.homeScore ?? 0);
    context.awayTeamScore = observable(options.awayScore ?? 0);
    context.pointAttemptAfterTouchDown = observable(false);
    context.isSafety = observable(false);
    context.SetupKickoff = () => {};
    context.UpdateBoxScore = () => {};
    context.StopCounter = () => {};
    context.SetBallPosition = () => {};
    context.ShowHideSpecialTeamsMenu = () => {};

    return context;
}

test('a no-gain pass can be completed for no gain and keeps the clock running', () => {
    const self = createPlayContext({ noGainCompletionChance: 100 });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.PASS);

    assert.equal(result.yards, 0);
    assert.equal(result.playType, self.GAME_PLAY_TYPES.PASS);
    assert.match(result.playResultText, /Complete/);
    assert.equal(result.stopsGameClock, false); // a completion does not stop the clock
});

test('a no-gain pass is incomplete (a clock-stopping play) when the completion roll fails', () => {
    const self = createPlayContext({ noGainCompletionChance: 0 });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.PASS);

    assert.equal(result.yards, 0);
    assert.match(result.playResultText, /Incomplete/);
    assert.equal(result.stopsGameClock, true);
});

test('a short run can go out of bounds, which stops the clock', () => {
    const self = createPlayContext({ outOfBoundsChance: 100, outOfBoundsEndOfHalfChance: 100 });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.RUN);

    assert.equal(result.yards, 0);
    assert.equal(result.playType, self.GAME_PLAY_TYPES.RUN);
    assert.match(result.playResultText, /Out of Bounds/);
    assert.equal(result.stopsGameClock, true);
});

test('a short positive run can go out of bounds, which stops the clock', () => {
    //dice of 7+ is a positive run: the scripted rolls are consumed in order (big-play check, run yardage,
    //interception check, fumble check, out-of-bounds check), so the run gains 4 yards and the final roll of 1 hits
    const rolls = [1, 4, 100, 100, 1];
    const self = createPlayContext({
        diceSum: 8,
        outOfBoundsChance: 100,
        outOfBoundsEndOfHalfChance: 100,
        randomInt: (min, max) => rolls.length ? rolls.shift() : max
    });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.RUN);

    assert.equal(result.yards, 4);
    assert.match(result.playResultText, /Out of Bounds/);
    assert.equal(result.stopsGameClock, true);
});

test('a negative run can go out of bounds, which stops the clock', () => {
    //dice of 3 or less is a loss: scripted rolls are the sack/loss yardage then the out-of-bounds check
    const rolls = [1, 5, 100, 1];
    const self = createPlayContext({
        diceSum: 2,
        outOfBoundsChance: 100,
        outOfBoundsEndOfHalfChance: 100,
        randomInt: (min, max) => rolls.length ? rolls.shift() : max
    });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.RUN);

    assert.equal(result.yards, -5);
    assert.match(result.playResultText, /Out of Bounds/);
    assert.equal(result.stopsGameClock, true);
});

test('a short run stays in bounds and keeps the clock running when the roll fails', () => {
    const self = createPlayContext({ outOfBoundsChance: 0, outOfBoundsEndOfHalfChance: 0 });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /no gain/);
    assert.equal(result.stopsGameClock, false);
});

test('a long run stays in bounds even when the out-of-bounds roll would hit', () => {
    //gains 12 of the 10 needed, so the run picks up the first down and is not short enough to go out of bounds
    const rolls = [1, 12, 100, 100, 1];
    const self = createPlayContext({
        diceSum: 8,
        yardsToFirst: 10,
        outOfBoundsChance: 100,
        outOfBoundsEndOfHalfChance: 100,
        randomInt: (min, max) => rolls.length ? rolls.shift() : max
    });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.RUN);

    assert.equal(result.yards, 12);
    assert.doesNotMatch(result.playResultText, /Out of Bounds/);
    assert.equal(result.stopsGameClock, false);
});

test('a touchdown run never goes out of bounds - the score stops the clock on its own', () => {
    //60 yards to the goal line, so a scripted 60-yard run scores before the out-of-bounds roll can fire
    const rolls = [1, 60, 100, 100, 1];
    const self = createPlayContext({
        diceSum: 8,
        yardsToFirst: 10,
        outOfBoundsChance: 100,
        outOfBoundsEndOfHalfChance: 100,
        randomInt: (min, max) => rolls.length ? rolls.shift() : max
    });
    const result = self.playMaker.getPlayResult(self.GAME_PLAY_TYPES.RUN);

    assert.match(result.playResultText, /TOUCHDOWN/);
    assert.doesNotMatch(result.playResultText, /Out of Bounds/);
});

test('going out of bounds is only likely at the end of a half (2nd/4th quarter)', () => {
    //base chance off, end-of-half chance on: the outer quarters stay in bounds, the 2nd/4th go out
    const firstQuarter = createPlayContext({ quarter: 1, outOfBoundsChance: 0, outOfBoundsEndOfHalfChance: 100 });
    assert.equal(firstQuarter.playMaker.getPlayResult(firstQuarter.GAME_PLAY_TYPES.RUN).stopsGameClock, false);

    const thirdQuarter = createPlayContext({ quarter: 3, outOfBoundsChance: 0, outOfBoundsEndOfHalfChance: 100 });
    assert.equal(thirdQuarter.playMaker.getPlayResult(thirdQuarter.GAME_PLAY_TYPES.RUN).stopsGameClock, false);

    const secondQuarter = createPlayContext({ quarter: 2, outOfBoundsChance: 0, outOfBoundsEndOfHalfChance: 100 });
    assert.equal(secondQuarter.playMaker.getPlayResult(secondQuarter.GAME_PLAY_TYPES.RUN).stopsGameClock, true);

    const fourthQuarter = createPlayContext({ quarter: 4, outOfBoundsChance: 0, outOfBoundsEndOfHalfChance: 100 });
    assert.equal(fourthQuarter.playMaker.getPlayResult(fourthQuarter.GAME_PLAY_TYPES.RUN).stopsGameClock, true);
});

test('a leading offense stays in bounds at the end of a half to run out the clock', () => {
    //home has the ball and leads 14-7, so the 5% leading chance misses on a roll of 6 while the 50% trailing chance would hit
    const leading = createPlayContext({
        quarter: 4,
        homeScore: 14,
        awayScore: 7,
        outOfBoundsChance: 0,
        outOfBoundsEndOfHalfChance: 100,
        outOfBoundsLeadingEndOfHalfChance: 5,
        randomInt: () => 6
    });
    const leadingResult = leading.playMaker.getPlayResult(leading.GAME_PLAY_TYPES.RUN);
    assert.doesNotMatch(leadingResult.playResultText, /Out of Bounds/);
    assert.equal(leadingResult.stopsGameClock, false);

    //same roll goes out when the offense trails 7-14, since the 50% trailing chance hits on a 6
    const trailing = createPlayContext({
        quarter: 4,
        homeScore: 7,
        awayScore: 14,
        outOfBoundsChance: 0,
        outOfBoundsEndOfHalfChance: 100,
        outOfBoundsLeadingEndOfHalfChance: 5,
        randomInt: () => 6
    });
    assert.equal(trailing.playMaker.getPlayResult(trailing.GAME_PLAY_TYPES.RUN).stopsGameClock, true);

    //a tie is not a lead - the offense is still trying to stop the clock
    const tied = createPlayContext({
        quarter: 4,
        homeScore: 14,
        awayScore: 14,
        outOfBoundsChance: 0,
        outOfBoundsEndOfHalfChance: 100,
        outOfBoundsLeadingEndOfHalfChance: 0,
        randomInt: () => 6
    });
    assert.equal(tied.playMaker.getPlayResult(tied.GAME_PLAY_TYPES.RUN).stopsGameClock, true);
});

test('a leading away offense stays in bounds in overtime to run out the clock', () => {
    const leading = createPlayContext({
        quarter: 5,
        teamWithBall: 20,
        homeScore: 21,
        awayScore: 28,
        outOfBoundsChance: 0,
        outOfBoundsEndOfHalfChance: 100,
        outOfBoundsLeadingEndOfHalfChance: 5,
        randomInt: () => 6
    });
    const result = leading.playMaker.getPlayResult(leading.GAME_PLAY_TYPES.RUN);
    assert.doesNotMatch(result.playResultText, /Out of Bounds/);
    assert.equal(result.stopsGameClock, false);
});
