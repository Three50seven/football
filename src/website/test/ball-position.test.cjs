const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const helperSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'utilities', 'game.helpers.js'),
    'utf8'
);

function createHelpers() {
    const context = {
        MODULES: { Constants: { END_ZONE_YARDS: 10 } },
        UTILITIES: {},
        self: {}
    };

    vm.createContext(context);
    vm.runInContext(helperSource, context);
    return context.HELPERS;
}

test('field progress is capped at ten yards into either end zone', () => {
    const helpers = createHelpers();

    assert.equal(helpers.clampFieldProgress(-50), -10);
    assert.equal(helpers.clampFieldProgress(-10), -10);
    assert.equal(helpers.clampFieldProgress(50), 50);
    assert.equal(helpers.clampFieldProgress(110), 110);
    assert.equal(helpers.clampFieldProgress(160), 110);
});

test('a run cannot continue beyond the opponent goal line', () => {
    const helpers = createHelpers();

    assert.equal(helpers.capRunYardsAtGoalLine(56, 10), 10);
    assert.equal(helpers.capRunYardsAtGoalLine(10, 10), 10);
    assert.equal(helpers.capRunYardsAtGoalLine(6, 10), 6);
});

test('negative plays are preserved for safety detection', () => {
    const helpers = createHelpers();

    assert.equal(helpers.capRunYardsAtGoalLine(-15, 1), -15);
});