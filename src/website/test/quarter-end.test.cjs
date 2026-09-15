const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const timerSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'timer', 'timer.model.js'),
    'utf8'
);

function observable(initialValue) {
    let value = initialValue;
    return function (nextValue) {
        if (arguments.length)
            value = nextValue;
        return value;
    };
}

test('quarter expiration waits until the point-after try is complete', () => {
    const context = {
        alert() {},
        clearInterval() {},
        console: { log() {} },
        jQuery: {},
        setInterval() { return 1; },
        MODULES: {
            Constants: {
                MAX_TIME_OF_QUARTER: 900,
                PLAY_CLOCK_NORMAL: 40,
                PLAY_CLOCK_SHORT: 25
            },
            GameVariables: { TimeIntervalCountDown: 1000 }
        },
        UTILITIES: {
            getNumberWithEnding: number => `${number}th`,
            getTimeDisplay: seconds => String(seconds)
        },
        ko: {
            observable,
            computed: callback => callback
        },
        pointAttemptAfterTouchDown: observable(true),
        showKickoffControls: observable(false)
    };

    vm.createContext(context);
    vm.runInContext(timerSource, context);
    context.elapsedTime(899);
    context.AdvanceTime(30);

    assert.equal(context.currentQuarter(), 1);
    assert.equal(context.remainingTime(), 0);
    assert.equal(context.quarterEndPendingAfterTry, true);
    assert.equal(context.isRunning(), false);

    let completedQuarter = false;
    context.EndQuarter = () => { completedQuarter = true; };
    context.CompleteQuarterAfterTry();

    assert.equal(completedQuarter, true);
    assert.equal(context.quarterEndPendingAfterTry, false);
});