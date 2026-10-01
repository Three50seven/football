const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const playmakerSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'play-maker', 'playmaker.js'),
    'utf8'
);

const GAME_PLAY_TYPES = {
    RUN: 'run',
    PASS: 'pass',
    PENALTY: 'penalty',
    TWOPOINTCONVERSION: 'twopointconversion'
};

const CHAIN_CREW_DELAY_SECONDS = 5; //mirrors MODULES.Constants.CHAIN_CREW_DELAY_SECONDS in constants.js

function observable(value) {
    const fn = function (next) {
        if (!arguments.length) return fn.value;
        fn.value = next;
        return fn;
    };
    fn.value = value;
    return fn;
}

// Loads playmaker.js with a stubbed `self` so recordTimeOfPossession can be exercised in isolation.
function createPlaymaker(options = {}) {
    const calls = { advanceTime: [], playClock: [], startCounter: 0, stopCounter: 0 };

    const self = {
        elapsedTime: observable(options.elapsedTime ?? 0),
        elapsedTimeAtLastPlay: options.elapsedTimeAtLastPlay ?? 0,
        isRunning: () => options.isRunning ?? true,
        currentQuarter: () => options.quarter ?? 1,
        pointAttemptAfterTouchDown: () => false,
        timeOfPossession: observable(0),
        StartCounter: () => { calls.startCounter += 1; },
        StopCounter: () => { calls.stopCounter += 1; },
        StartPlayClock: (seconds) => { calls.playClock.push(seconds); },
        StopPlayClock: () => {},
        AdvanceTime: (seconds) => {
            calls.advanceTime.push(seconds);
            self.elapsedTime(self.elapsedTime() + seconds);
        }
    };

    const context = {
        console: { log() {} },
        self,
        playMaker: null,
        GAME_PLAY_TYPES,
        KICKOFF_TYPES: { EXTRAPOINT: 'extrapoint' },
        MODULES: { Constants: { PLAY_CLOCK_NORMAL: 40, PLAY_CLOCK_SHORT: 25, CHAIN_CREW_DELAY_SECONDS: CHAIN_CREW_DELAY_SECONDS } },
        UTILITIES: {},
        $: () => ({ val: () => '', text: () => {} })
    };

    vm.createContext(context);
    vm.runInContext(playmakerSource, context);

    return { playMaker: context.playMaker, self, calls };
}

test('a run counts its own simulated time plus the ticks that already came off the clock', () => {
    const { playMaker, self, calls } = createPlaymaker({ elapsedTime: 106, elapsedTimeAtLastPlay: 100 });

    playMaker.recordTimeOfPossession(GAME_PLAY_TYPES.RUN, 20);

    // 30 (huddle/play clock) + 10 (run) + 6 (real ticks during the play)
    assert.equal(self.timeOfPossession(), 46);
    // the clock is only skipped ahead by the simulated portion - the 6 ticks already happened
    assert.equal(calls.advanceTime[0], 40);
    assert.equal(self.elapsedTime(), 146);
    // the snapshot moves forward, so the next play starts counting from here
    assert.equal(self.elapsedTimeAtLastPlay, 146);
});

test('a pass uses the simulated estimate and does not re-skip the real ticks', () => {
    const { playMaker, self, calls } = createPlaymaker({ elapsedTime: 9, elapsedTimeAtLastPlay: 5 });

    playMaker.recordTimeOfPossession(GAME_PLAY_TYPES.PASS, 25);

    // 25 (drop back) + 5 (yards) + 4 (real ticks)
    assert.equal(self.timeOfPossession(), 34);
    assert.equal(calls.advanceTime[0], 30);
});

test('an incomplete pass outside the 4th quarter keeps the clock running but charges the chain-crew delay', () => {
    const { playMaker, self, calls } = createPlaymaker({ quarter: 1, elapsedTime: 3, elapsedTimeAtLastPlay: 0 });

    playMaker.recordTimeOfPossession(GAME_PLAY_TYPES.PASS, 0, false, true);

    // 4 (quick incomplete pass) + 5 (chain crew) + 3 ticks
    assert.equal(self.timeOfPossession(), 4 + CHAIN_CREW_DELAY_SECONDS + 3);
    assert.equal(calls.advanceTime[0], 4 + CHAIN_CREW_DELAY_SECONDS);
    assert.deepEqual(calls.playClock, [25]); // incomplete pass shortens the next play clock
    assert.equal(calls.stopCounter, 0); // the game clock keeps running
});

test('an incomplete pass in the 4th quarter stops the game clock until the next snap', () => {
    const { playMaker, self, calls } = createPlaymaker({ quarter: 4, elapsedTime: 3, elapsedTimeAtLastPlay: 0 });

    playMaker.recordTimeOfPossession(GAME_PLAY_TYPES.PASS, 0, false, true);

    assert.equal(self.timeOfPossession(), 7); // 4 + 3 ticks, no chain-crew delay
    assert.equal(calls.advanceTime[0], 4);
    assert.deepEqual(calls.playClock, [25]);
    assert.equal(calls.stopCounter, 1); // the clock does not restart until the next snap
    assert.equal(calls.startCounter, 0);
});

test('a completed pass for zero yards is not treated as an incomplete pass', () => {
    const { playMaker, self, calls } = createPlaymaker({ quarter: 4, elapsedTime: 3, elapsedTimeAtLastPlay: 0 });

    playMaker.recordTimeOfPossession(GAME_PLAY_TYPES.PASS, 0, false, false);

    // a 0-yard completion still runs the normal pass timing and never stops the clock
    assert.equal(self.timeOfPossession(), 28); // 25 + 3 ticks
    assert.equal(calls.advanceTime[0], 25);
    assert.deepEqual(calls.playClock, [40]); // normal play clock, not the shortened one
    assert.equal(calls.stopCounter, 0);
});

test('a turnover stops the game clock until the next snap', () => {
    const { playMaker, self, calls } = createPlaymaker({ quarter: 1, elapsedTime: 20, elapsedTimeAtLastPlay: 10 });

    playMaker.recordTimeOfPossession(GAME_PLAY_TYPES.RUN, 8, true);

    // 30 (huddle/play clock) + 4 (run) + 10 ticks
    assert.equal(self.timeOfPossession(), 44);
    assert.equal(calls.advanceTime[0], 34);
    assert.equal(calls.stopCounter, 1);
});

test('a kickoff return adds the time spent running the return yards', () => {
    const { playMaker, self, calls } = createPlaymaker({ elapsedTime: 10, elapsedTimeAtLastPlay: 10 });

    playMaker.recordTimeOfPossession('', 30);

    // 10 (kick/return base) + 15 (running 30 return yards) + 0 ticks
    assert.equal(self.timeOfPossession(), 25);
    assert.equal(calls.advanceTime[0], 25);
});

test('a kick by itself does not add return yards to the clock', () => {
    const { playMaker, self, calls } = createPlaymaker({ elapsedTime: 4, elapsedTimeAtLastPlay: 4 });

    playMaker.recordTimeOfPossession('kickoff', 65);

    assert.equal(self.timeOfPossession(), 10); // base only
    assert.equal(calls.advanceTime[0], 10);
});

test('a point-after try has no time of possession and never runs the clock', () => {
    const { playMaker, self, calls } = createPlaymaker({ elapsedTime: 50, elapsedTimeAtLastPlay: 50 });

    playMaker.recordTimeOfPossession('extrapoint', 0);

    assert.equal(self.timeOfPossession(), 0);
    assert.equal(calls.advanceTime.length, 0);
    assert.equal(calls.stopCounter, 1);
});
