const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const timerSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'timer', 'timer.model.js'),
    'utf8'
);
const playmakerSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'play-maker', 'playmaker.js'),
    'utf8'
);
const kickoffSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'play-maker', 'kickoff.js'),
    'utf8'
);
const { createPlaymaker } = require('./possession.test.cjs');

function observable(initialValue) {
    let value = initialValue;
    return function (nextValue) {
        if (arguments.length)
            value = nextValue;
        return value;
    };
}

function createTimer(options = {}) {
    const alerts = [];
    const context = {
        ShowGameAlert: (message, alertOptions) => alerts.push(message),
        clearInterval() {},
        console: { log() {} },
        jQuery: {},
        setInterval() { return 1; },
        window: { setInterval: (callback) => 1 },
        $: () => ({ val: () => '', text: () => {}, prop: () => {} }),
        MODULES: {
            Constants: {
                MAX_TIME_OF_QUARTER: 900,
                PLAY_CLOCK_NORMAL: 40,
                PLAY_CLOCK_SHORT: 25,
                TWO_MINUTE_WARNING_SECONDS: 120
            },
            GameVariables: { TimeIntervalCountDown: 1000 }
        },
        UTILITIES: {
            getNumberWithEnding: number => `${number}th`,
            getTimeDisplay: seconds => String(seconds)
        },
        ko: {
            observable,
            computed: callback => {
                const computed = (...args) => callback(...args);
                computed.peek = () => callback();
                return computed;
            }
        },
        playMaker: { delayOfGamePenalty() {} },
        pointAttemptAfterTouchDown: observable(false),
        showKickoffControls: observable(false),
        ...options.extra
    };

    vm.createContext(context);
    vm.runInContext(timerSource, context);
    context.currentQuarter(options.quarter ?? 1);
    return { context, alerts };
}

test('a play that crosses 2:00 flags the warning instead of alerting mid-play', () => {
    const { context, alerts } = createTimer({ quarter: 2 });
    context.elapsedTime(770); // 130 remaining
    context.deferPeriodAlerts = true;
    context.AdvanceTime(20); // 110 remaining, crossed 2:00

    assert.equal(context.twoMinuteWarningPending, true);
    assert.equal(alerts.length, 0); // no alert until the play finishes

    context.deferPeriodAlerts = false;
    context.CompletePendingPeriodAlerts();

    assert.equal(context.twoMinuteWarningPending, false);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /Two minute warning/);
});

test('a play that runs out the clock flags quarter end instead of alerting mid-play', () => {
    const { context, alerts } = createTimer({ quarter: 1 });
    let ended = false;
    const originalEnd = context.EndQuarter;
    context.EndQuarter = () => { ended = true; };
    context.elapsedTime(895);
    context.deferPeriodAlerts = true;
    context.AdvanceTime(30);

    assert.equal(ended, false);
    assert.equal(context.quarterEndPendingAfterPlay, true);
    assert.equal(alerts.length, 0);

    context.deferPeriodAlerts = false;
    context.EndQuarter = originalEnd;
    context.CompletePendingPeriodAlerts();

    assert.equal(context.currentQuarter(), 2); // quarter advanced only after the play
});

test('the two-minute warning only fires in the 2nd/4th quarter, once per half', () => {
    const firstHalf = createTimer({ quarter: 1 });
    firstHalf.context.elapsedTime(780);
    assert.equal(firstHalf.context.CheckTwoMinuteWarning(), false);

    const secondQuarter = createTimer({ quarter: 2 });
    secondQuarter.context.elapsedTime(780);
    assert.equal(secondQuarter.context.CheckTwoMinuteWarning(), true);
    assert.equal(secondQuarter.context.CheckTwoMinuteWarning(), false); // already flagged

    const fourthQuarter = createTimer({ quarter: 4 });
    fourthQuarter.context.elapsedTime(780);
    assert.equal(fourthQuarter.context.CheckTwoMinuteWarning(), true);
});

test('a touchback kick leaves the game clock stopped', () => {
    // a touchback or a kick out of bounds never puts the ball in play, so it consumes no play time
    // at all - neither the kick nor the (empty) return result may charge simulated seconds for it.
    const playmaker = createPlaymaker({ isRunning: false });
    const { calls } = playmaker;

    playmaker.playMaker.recordTimeOfPossession('kickoff', 65, false, false, true, true);

    assert.deepEqual(calls.advanceTime, []); // no play seconds simulated for a touchback
    assert.equal(calls.startCounter, 1); // the clock runs during the kick's time of possession
    assert.equal(calls.stopCounter, 1); // and is stopped again when the play ends
    assert.deepEqual(calls.playClock, [25]); // administrative stoppage before the next snap

    // the same kick recorded as a return result must not charge the 10 second base + return yards
    const asReturn = createPlaymaker({ isRunning: false });
    asReturn.playMaker.recordTimeOfPossession('', 0, false, false, true, true);

    assert.deepEqual(asReturn.calls.advanceTime, []); // still no simulated play seconds
    assert.equal(asReturn.calls.stopCounter, 1);

    // a normal returned kickoff: deadBallStopsClock = false leaves the clock running and charges the base time
    const returned = createPlaymaker({ isRunning: false });
    returned.playMaker.recordTimeOfPossession('kickoff', 65, false, false, false, false);

    assert.equal(returned.calls.startCounter, 1);
    assert.equal(returned.calls.stopCounter, 0); // clock keeps running after a returned kick
    assert.deepEqual(returned.calls.advanceTime, [10]); // the standard special teams base time
    assert.deepEqual(returned.calls.playClock, [25]); // administrative stoppage before the next snap

    // a returned kickoff still charges the returner's running time
    const kickReturn = createPlaymaker({ isRunning: false });
    kickReturn.playMaker.recordTimeOfPossession('', 30, false, false, false, false);

    assert.deepEqual(kickReturn.calls.advanceTime, [10 + 15]); // base + 30 return yards
});
