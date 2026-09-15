const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const kickoffSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'play-maker', 'kickoff.js'),
    'utf8'
);

function createConverter(options = {}) {
    const randomInt = options.randomInt || ((minimum, maximum) => Math.floor((minimum + maximum) / 2));
    const yardsToTouchdown = options.yardsToTouchdown ?? 50;
    const context = {
        console: { log() {} },
        KICKOFF_TYPES: {
            KICKOFF: 'kickoff',
            ONSIDE: 'onside',
            PUNT: 'punt',
            FIELDGOAL: 'fieldgoal',
            EXTRAPOINT: 'extrapoint',
            SAFETY: 'safety'
        },
        MODULES: {
            Constants: {
                KICKOFF_SPOT: 35,
                SAFETY_KICKOFF_SPOT: 20
            }
        },
        UTILITIES: { getRandomInt: randomInt },
        self: {
            isPunt: () => false,
            isFieldGoal: () => false,
            isSafety: () => false,
            isExtraPointKick: () => false,
            yardsToTouchdown: () => yardsToTouchdown
        },
        $: () => ({ val: () => 'kickoff' })
    };

    vm.createContext(context);
    vm.runInContext(kickoffSource, context);
    return context.convertKickoffPowerToYards;
}

test('extra-point power thresholds produce their intended center-kick ranges', () => {
    const convert = createConverter();

    assert.equal(convert('extrapoint', 24, 50), 24);
    assert.equal(convert('extrapoint', 25, 50), 25);
    assert.equal(convert('extrapoint', 40, 50), 29);
    assert.equal(convert('extrapoint', 60, 50), 31);
});

test('punt power maps directly to yards on a centered kick', () => {
    const convert = createConverter();

    assert.equal(convert('punt', 1, 50), 1);
    assert.equal(convert('punt', 50, 50), 50);
    assert.equal(convert('punt', 100, 50), 100);
});

test('angle penalties are symmetric and increase toward either sideline', () => {
    const convert = createConverter();
    const centered = convert('punt', 70, 50);

    assert.equal(convert('punt', 70, 40), convert('punt', 70, 60));
    assert.equal(convert('punt', 70, 30), convert('punt', 70, 70));
    assert.equal(convert('punt', 70, 20), convert('punt', 70, 80));
    assert.equal(convert('punt', 70, 10), convert('punt', 70, 90));
    assert.equal(convert('punt', 70, 0), convert('punt', 70, 100));
    assert.ok(centered > convert('punt', 70, 40));
    assert.ok(convert('punt', 70, 40) > convert('punt', 70, 30));
    assert.ok(convert('punt', 70, 30) > convert('punt', 70, 20));
    assert.ok(convert('punt', 70, 20) > convert('punt', 70, 10));
    assert.ok(convert('punt', 70, 10) > convert('punt', 70, 0));
});

test('onside power bands request the documented random ranges', () => {
    const requestedRanges = [];
    const convert = createConverter({
        randomInt: (minimum, maximum) => {
            requestedRanges.push([minimum, maximum]);
            return minimum;
        }
    });

    convert('onside', 29, 50);
    convert('onside', 30, 50);
    convert('onside', 40, 50);
    convert('onside', 50, 50);
    convert('onside', 60, 50);
    convert('onside', 70, 50);
    assert.equal(convert('onside', 85, 50), 65);
    convert('onside', 90, 50);

    assert.deepEqual(requestedRanges, [
        [1, 10], [10, 20], [20, 30], [30, 40],
        [40, 50], [50, 64], [66, 75]
    ]);
});

test('normal and safety kickoffs use their respective distances to the end zone', () => {
    const convert = createConverter({ randomInt: (minimum) => minimum });

    assert.equal(convert('kickoff', 75, 50), 65);
    assert.equal(convert('kickoff', 98, 50), 76);
    assert.equal(convert('safety', 75, 50), 80);
    assert.equal(convert('safety', 98, 50), 91);
});

test('field-goal boost increases as the offense approaches the goal line', () => {
    const randomInt = (minimum) => minimum;
    const farKick = createConverter({ randomInt, yardsToTouchdown: 40 });
    const mediumKick = createConverter({ randomInt, yardsToTouchdown: 20 });
    const shortKick = createConverter({ randomInt, yardsToTouchdown: 1 });

    assert.equal(farKick('fieldgoal', 80, 50), 51);
    assert.equal(mediumKick('fieldgoal', 80, 50), 54);
    assert.equal(shortKick('fieldgoal', 80, 50), 60);
});

test('all valid slider inputs produce finite non-negative yardage', () => {
    const kickTypes = ['kickoff', 'onside', 'punt', 'fieldgoal', 'extrapoint', 'safety'];
    const convert = createConverter();

    for (const kickType of kickTypes) {
        for (let power = 1; power <= 100; power++) {
            for (let angle = 1; angle <= 100; angle++) {
                const yards = convert(kickType, power, angle);
                assert.ok(Number.isFinite(yards), `${kickType} ${power}/${angle} was not finite`);
                assert.ok(yards >= 0, `${kickType} ${power}/${angle} produced ${yards} yards`);
            }
        }
    }
});