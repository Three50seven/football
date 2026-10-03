const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const helperSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'utilities', 'game.helpers.js'),
    'utf8'
);

const ballPositionSource = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', 'view-models', 'field', 'ballposition.model.js'),
    'utf8'
);

// Minimal Knockout stand-in: computeds are plain thunks re-evaluated on every read, which is enough to assert the
// values each computed produces for a given game state (Knockout's real dependency tracking is not under test here).
function observable(value) {
    const fn = function (next) {
        if (!arguments.length) return fn.value;
        fn.value = next;
        return fn;
    };
    fn.value = value;
    return fn;
}

// Loads the real ballposition.model.js so lineToGainProgress/showLineToGain/lineToGainX are exercised as shipped.
// The team and special-teams observables must exist BEFORE the model script runs, because its computeds resolve
// them through the shared `self` global the same way they do in the browser.
function createBallPositionContext(state = {}) {
    const context = {
        console: { log() {} },
        jQuery: function () { return { css: () => {}, length: 0 }; },
        ko: { observable, computed: (fn) => fn },
        MODULES: { Constants: { END_ZONE_YARDS: 10, KICKOFF_SPOT: 35, SAFETY_KICKOFF_SPOT: 20, EXTRA_POINT_KICK_SPOT: 15 } },
        UTILITIES: {}
    };
    context.$ = context.jQuery;

    context.homeTeamID = observable(10);
    context.awayTeamID = observable(20);
    context.showKickoffControls = observable(state.showKickoffControls ?? false);
    context.pointAttemptAfterTouchDown = observable(state.pointAttemptAfterTouchDown ?? false);
    //the kick flags live in kickoff.model.js, but ballSpot guards them with typeof checks, so mirror that shape
    context.isExtraPointKick = observable(state.isExtraPointKick ?? false);
    context.isTwoPointConversion = observable(state.isTwoPointConversion ?? false);
    context.pointAttemptTeamId = state.pointAttemptTeamId ?? 0;

    vm.createContext(context);
    vm.runInContext(helperSource, context);
    vm.runInContext(ballPositionSource, context);

    //currentTeamWithBall is created by the model itself as ko.observable(0), so seed it after the script has run -
    //setting it beforehand would just be overwritten
    context.currentTeamWithBall(state.teamWithBall ?? 10);

    //as are the ball position observables
    context.ballSpotStart(state.ballSpotStart ?? 20);
    context.yardsTraveled(state.yardsTraveled ?? 0);
    context.yardsToFirst(state.yardsToFirst ?? 10);

    return context;
}

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

test('line to gain is the yards needed beyond the ball', () => {
    const helpers = createHelpers();

    //1st & 10 from the 20 - ten yards up field
    assert.equal(helpers.getLineToGainProgress(20, 0, 10), 30);

    //after a 4 yard gain on the same play, 2nd & 6 - the line has moved 4 yards up field with the ball
    assert.equal(helpers.getLineToGainProgress(20, 4, 6), 30);

    //3rd & 1 from the 40
    assert.equal(helpers.getLineToGainProgress(40, 7, 3), 50);
});

test('line to gain is dropped on first & goal, where the goal line is the marker', () => {
    const helpers = createHelpers();

    //3rd & 3 from the 97 - reaching the sticks is a touchdown, so there is no line short of the goal line
    assert.equal(helpers.getLineToGainProgress(97, 0, 3), null);

    //the line landing exactly on the goal line is the goal line itself
    assert.equal(helpers.getLineToGainProgress(90, 0, 10), null);

    //an offense already past the goal line (negative yards to touchdown) still has no line to draw
    assert.equal(helpers.getLineToGainProgress(102, 0, 10), null);

    //a line still short of the goal line is kept
    assert.equal(helpers.getLineToGainProgress(89, 0, 10), 99);
});

test('line to gain is dropped when it falls off the back of the field', () => {
    const helpers = createHelpers();

    //penalty backed the offense up so far that the sticks land behind its own goal line
    assert.equal(helpers.getLineToGainProgress(2, -5, 1), null);
});

test('each team works away from its own end zone', () => {
    const helpers = createHelpers();

    //the home goal line is the left edge of the SVG, the away goal line the right edge
    assert.equal(helpers.getFieldXPosition(0, true), 20);
    assert.equal(helpers.getFieldXPosition(100, true), 200);
    assert.equal(helpers.getFieldXPosition(0, false), 200);
    assert.equal(helpers.getFieldXPosition(100, false), 20);

    //the 50 yard line is the midpoint for both teams
    assert.equal(helpers.getFieldXPosition(50, true), 110);
    assert.equal(helpers.getFieldXPosition(50, false), 110);
});

test('the line to gain moves in the direction the offense is attacking', () => {
    const helpers = createHelpers();

    //home offense on 1st & 10 from its own 20 - the sticks are 10 yards to the RIGHT of the ball
    const homeBall = helpers.getFieldXPosition(20, true);
    const homeLine = helpers.getFieldXPosition(helpers.getLineToGainProgress(20, 0, 10), true);
    assert.equal(homeLine - homeBall, 18); //10 yards * 1.8 units per yard

    //away offense on 1st & 10 from its own 20 - the sticks are 10 yards to the LEFT of the ball
    const awayBall = helpers.getFieldXPosition(20, false);
    const awayLine = helpers.getFieldXPosition(helpers.getLineToGainProgress(20, 0, 10), false);
    assert.equal(awayBall - awayLine, 18);

    //the two offenses on the same yard line put their sticks on opposite sides of their ball
    assert.ok(homeLine > homeBall);
    assert.ok(awayLine < awayBall);
});

test('the ball position model declares its observables before the computeds that read them', () => {
    // currentTeamWithBall is read by lineToGainX. If the observable is assigned after that computed is created,
    // the computed closes over an undefined value and the minified bundle throws "is not a function" at runtime.
    const source = ballPositionSource;
    const declaredAt = source.indexOf('self.currentTeamWithBall = ko.observable');
    const readAt = source.indexOf('self.currentTeamWithBall()');

    assert.ok(declaredAt > -1, 'currentTeamWithBall must still be an observable');
    assert.ok(readAt > -1, 'lineToGainX must still read currentTeamWithBall');
    assert.ok(declaredAt < readAt,
        `currentTeamWithBall is declared at ${declaredAt} but read at ${readAt} - the observable must come first`);
});

test('the line to gain is hidden while the special teams meter is up', () => {
    const context = createBallPositionContext({ showKickoffControls: true, ballSpotStart: 65 });

    assert.equal(context.lineToGainProgress(), 75);
    assert.equal(context.showLineToGain(), false);
    assert.equal(context.lineToGainX(), null);
});

test('the line to gain appears right after the kick, before any positive yards', () => {
    //mirrors playmaker.kickoff(): the receiving team takes over at 1st & 10 at the 20, then resetKickoffFlags
    //clears showKickoffControls *after* SetBallPosition has already run.
    const context = createBallPositionContext({ teamWithBall: 20, showKickoffControls: true, ballSpotStart: 20 });

    //while the kick meter is still up there is nothing to mark up
    assert.equal(context.showLineToGain(), false);
    assert.equal(context.lineToGainX(), null);

    //the kick goes - flags reset and the receiving team is live at 1st & 10 with zero yards gained
    context.showKickoffControls(false);
    assert.equal(context.showLineToGain(), true);
    assert.equal(context.lineToGainProgress(), 30);
    //away offense works left, so its sticks sit 10 yards to the left of the ball at x=164
    assert.equal(context.lineToGainX(), 146);
});

test('the line to gain tracks the receiving team across the whole kickoff sequence', () => {
    const context = createBallPositionContext({ teamWithBall: 20, showKickoffControls: true, ballSpotStart: 65 });

    context.showKickoffControls(false);
    context.ballSpotStart(20); //kickoff return to the 20
    context.yardsTraveled(0);
    context.yardsToFirst(10);
    assert.equal(context.lineToGainX(), 146);

    //the offense then gains 4 yards and is 2nd & 6 - the line stays put on the field while the ball advances
    context.yardsTraveled(4);
    context.yardsToFirst(6);
    assert.equal(context.lineToGainProgress(), 30);
    assert.equal(context.lineToGainX(), 146);
});

test('the line to gain is hidden for a point after attempt', () => {
    const context = createBallPositionContext({
        teamWithBall: 10,
        pointAttemptAfterTouchDown: true,
        pointAttemptTeamId: 10,
        ballSpotStart: 85
    });

    assert.equal(context.showLineToGain(), false);
    assert.equal(context.lineToGainX(), null);
});

test('a stale point attempt team does not flip the home offense to the away side', () => {
    //pointAttemptTeamId is set on a touchdown and only cleared by a game reset, so it stays set for the rest of
    //the game. The line must still follow the team actually holding the ball, not the team that last scored.
    const context = createBallPositionContext({
        teamWithBall: 10, //home offense, attacking right
        pointAttemptTeamId: 20, //away team scored earlier and never cleared this
        isExtraPointKick: false,
        isTwoPointConversion: false,
        ballSpotStart: 20
    });

    //home works right: ball at x=56, sticks 10 yards further right at x=74
    assert.equal(context.lineToGainProgress(), 30);
    assert.equal(context.lineToGainX(), 74);
});

test('a stale point attempt team does not flip the away offense to the home side', () => {
    const context = createBallPositionContext({
        teamWithBall: 20, //away offense, attacking left
        pointAttemptTeamId: 10, //home team scored earlier and never cleared this
        isExtraPointKick: false,
        isTwoPointConversion: false,
        ballSpotStart: 20
    });

    //away works left: ball at x=164, sticks 10 yards further left at x=146
    assert.equal(context.lineToGainX(), 146);
});

test('an active point attempt still follows the kicking team', () => {
    //a two point conversion is an active point attempt, so the ball - and the line - follow the kicking team
    const context = createBallPositionContext({
        teamWithBall: 10,
        pointAttemptTeamId: 20,
        isTwoPointConversion: true,
        ballSpotStart: 98,
        yardsToFirst: 2
    });

    //the two point spot is the goal line itself, so there is no separate line to gain to draw
    assert.equal(context.lineToGainProgress(), null);
    assert.equal(context.lineToGainX(), null);
});

test('the line to gain follows a real point attempt that still has a line to gain', () => {
    const context = createBallPositionContext({
        teamWithBall: 10,
        pointAttemptTeamId: 20, //away team is kicking, so it lines up facing left
        isExtraPointKick: true,
        ballSpotStart: 85,
        yardsToFirst: 3
    });

    assert.equal(context.lineToGainProgress(), 88);
    //an active extra point follows the kicking team (away), so it is mirrored to x=200-88*1.8
    assert.equal(context.lineToGainX(), 200 - (88 * 1.8));
});