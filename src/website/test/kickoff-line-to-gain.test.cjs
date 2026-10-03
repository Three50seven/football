const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const base = 'C:\\Projects\\Learning_Repos\\football\\football\\src\\website\\';
const koSource = fs.readFileSync(base + 'wwwroot\\content\\js\\lib\\knockout-bundle.min.js', 'utf8');
const helperSource = fs.readFileSync(base + 'wwwroot\\scripts\\utilities\\game.helpers.js', 'utf8');
const ballPositionSource = fs.readFileSync(base + 'wwwroot\\scripts\\view-models\\field\\ballposition.model.js', 'utf8');
const fieldSource = fs.readFileSync(base + 'wwwroot\\scripts\\view-models\\field\\field.model.js', 'utf8');

// Minimal DOM just rich enough for Knockout's IE feature detection to finish initialising. Nothing here binds
// to the DOM - the computeds are driven directly, with a manual subscriber standing in for the data-bind.
function createElement(tag) {
    return {
        tagName: String(tag).toUpperCase(),
        nodeType: 1,
        style: {},
        childNodes: [],
        attributes: {},
        innerHTML: '',
        parentNode: null,
        getElementsByTagName: () => [],
        setAttribute(k, v) { this.attributes[k] = v; },
        getAttribute(k) { return this.attributes[k]; },
        removeAttribute(k) { delete this.attributes[k]; },
        hasAttribute(k) { return k in this.attributes; },
        appendChild(c) { this.childNodes.push(c); return c; },
        removeChild() {},
        insertBefore() {},
        cloneNode() { return createElement(tag); },
        addEventListener() {},
        removeEventListener() {}
    };
}

// Runs the real Knockout plus the real ballposition.model.js, then replays the kickoff sequence from
// playmaker.kickoff() in the same order it happens there.
function createLiveContext() {
    const document = {
        createElement,
        createTextNode: () => ({ nodeType: 3 }),
        createDocumentFragment: () => createElement('fragment'),
        documentElement: createElement('html'),
        body: createElement('body'),
        addEventListener() {},
        removeEventListener() {},
        getElementById: () => null,
        querySelectorAll: () => []
    };

    const context = {
        console: { log() {}, warn() {}, error() {} },
        setTimeout, clearTimeout, setInterval, clearInterval,
        document, navigator: { userAgent: 'node' },
        MODULES: { Constants: { END_ZONE_YARDS: 10 } },
        UTILITIES: {}
    };
    //the custom class binding Knockout loads with reaches for a few more DOM helpers at registration time
    document.createComment = (text) => ({ nodeType: 8, textContent: text });
    document.createProcessingInstruction = () => ({ nodeType: 7 });
    document.importNode = (n) => n;
    document.nodeType = 9;
    document.childNodes = [];
    context.window = context;
    context.self = context;
    context.jQuery = function () {
        //field.model.js registers a window resize handler at load; the rest are the field markup updates
        return { css: () => {}, length: 0, width: () => 850, on: () => {}, addClass: () => {}, removeClass: () => {}, attr: () => {} };
    };
    context.$ = context.jQuery;

    vm.createContext(context);
    vm.runInContext(koSource, context); //provides context.ko
    vm.runInContext(helperSource, context);

    //home/away team ids live in hometeam/awayteam.model.js and the kick flags in kickoff.model.js, but the line to
    //gain computeds resolve them through the shared global, so they have to exist before the model under test runs
    context.homeTeamID = context.ko.observable(10);
    context.awayTeamID = context.ko.observable(20);
    context.showKickoffControls = context.ko.observable(true);
    context.pointAttemptAfterTouchDown = context.ko.observable(false);
    context.isExtraPointKick = context.ko.observable(false);
    context.isTwoPointConversion = context.ko.observable(false);
    context.pointAttemptTeamId = 0;
    context.currentDown = context.ko.observable(1); //lives in main.game.model.js, used when a set of downs starts

    vm.runInContext(ballPositionSource, context);
    //field.model.js supplies SetBallPosition(), which playmaker calls after every play and every kickoff
    vm.runInContext(fieldSource, context);
    return context;
}

// Reads the bound values the same way the line's data-bind does, and re-reads whenever a dependency changes.
function trackLine(context) {
    const view = { visible: false, x: null, updates: 0 };
    const refresh = () => {
        view.visible = context.showLineToGain();
        view.x = context.lineToGainX();
        view.updates++;
    };
    context.showLineToGain.subscribe(refresh);
    context.lineToGainX.subscribe(refresh);
    refresh();
    return view;
}
// Seeds the game state the way playmaker.kickoff() expects it: teams picked, ball parked on the kickoff spot.
function seedKickoff(context) {
    context.homeTeamID(10);
    context.awayTeamID(20);
    context.showKickoffControls(true);
    context.pointAttemptAfterTouchDown(false);
    context.isExtraPointKick(false);
    context.isTwoPointConversion(false);
    context.pointAttemptTeamId = 0;
    context.currentTeamWithBall(20); //away receives
    context.ballSpotStart(65); //kickoff spot while the meter is up
    context.yardsTraveled(0);
    context.yardsToFirst(10);
}

// The kick goes: the receiving team is placed at 1st & 10 on the new spot and the special teams flags clear,
// exactly as playmaker.kickoff() does at lines 613-644.
function completeKickoff(context, newSpot) {
    context.ballSpotStart(newSpot);
    context.yardsTraveled(0);
    context.yardsToFirst(10);
    context.currentDown(1);
    context.currentTeamWithBall(20);
    context.SetBallPosition(); //line 641 - renders while showKickoffControls is still true
    context.showKickoffControls(false); //line 644 - resetKickoffFlags
}

test('the line to gain appears on a touchback, with no play made', () => {
    const context = createLiveContext();
    seedKickoff(context);

    const view = trackLine(context);
    assert.equal(view.visible, false, 'hidden while the kick meter is up');

    completeKickoff(context, 20); //touchback puts the ball on the 20

    assert.equal(view.visible, true, 'visible right after the touchback, before any play');
    assert.equal(context.lineToGainProgress(), 30, 'sticks 10 yards beyond the 20');
    assert.equal(view.x, 146); //away offense works left: 200 - 30*1.8
});

test('the line to gain appears after a kickoff return that does not reach first and goal', () => {
    const context = createLiveContext();
    seedKickoff(context);
    const view = trackLine(context);

    completeKickoff(context, 40); //returned to the receiving team's own 40

    assert.equal(view.visible, true);
    assert.equal(context.lineToGainProgress(), 50, 'sticks on the 50 yard line');
    assert.equal(view.x, 200 - (50 * 1.8)); //110, the middle of the field

    context.ballSpotStart(55); //deep return to the opponent 45 (own 45)
    context.SetBallPosition();

    assert.equal(view.visible, true);
    assert.equal(context.lineToGainProgress(), 65, 'sticks on the opponent 35');
    assert.equal(view.x, 200 - (65 * 1.8));
});

test('the line to gain stays hidden after a kickoff return to first and goal', () => {
    const context = createLiveContext();
    seedKickoff(context);
    const view = trackLine(context);

    completeKickoff(context, 90); //own 10, so the sticks are the goal line itself

    assert.equal(view.visible, false, 'no line to draw when the sticks are the goal line');
    assert.equal(view.x, null);
});

test('the line of scrimmage sits on the ball, and stays there through a kickoff', () => {
    const context = createLiveContext();
    seedKickoff(context);

    completeKickoff(context, 20); //touchback puts the ball on the receiving team's own 20

    //always drawn, even though the line to gain is up and the ball has not moved for a play yet
    assert.equal(context.lineOfScrimmageX(), 200 - (20 * 1.8), 'away offense, so the spot is mirrored');

    context.ballSpotStart(40); //a deep return
    context.SetBallPosition();
    assert.equal(context.lineOfScrimmageX(), 200 - (40 * 1.8));
});

test('the line of scrimmage is mirrored for the home offense', () => {
    const context = createLiveContext();
    seedKickoff(context);
    context.currentTeamWithBall(10); //home offense

    context.ballSpotStart(25);
    context.yardsTraveled(0);
    context.SetBallPosition();

    assert.equal(context.lineOfScrimmageX(), 20 + (25 * 1.8), 'home works right');
});

test('the line of scrimmage tracks the ball as yards are gained', () => {
    const context = createLiveContext();
    seedKickoff(context);
    context.currentTeamWithBall(10); //home offense
    context.ballSpotStart(20);
    context.showKickoffControls(false); //live offense, so the line to gain is up too
    context.yardsTraveled(0);

    //1st & 10 - the ball and the line to gain are on the same line
    assert.equal(context.lineOfScrimmageX(), 20 + (20 * 1.8));
    assert.equal(context.lineToGainX(), 20 + (30 * 1.8));

    //a 4 yard gain leaves the sticks where they were and moves the ball up to them
    context.yardsTraveled(4);
    context.yardsToFirst(6);
    assert.equal(context.lineOfScrimmageX(), 20 + (24 * 1.8), 'ball advanced 4 yards');
    assert.equal(context.lineToGainX(), 20 + (30 * 1.8), 'sticks stayed put');
});

test('the line of scrimmage is still drawn on first and goal, where the line to gain is not', () => {
    const context = createLiveContext();
    seedKickoff(context);
    context.currentTeamWithBall(10);
    context.ballSpotStart(95); //opponent 5
    context.yardsToFirst(3);

    assert.equal(context.lineToGainX(), null, 'the sticks are the goal line, so no yellow marker');
    assert.equal(context.lineOfScrimmageX(), 20 + (95 * 1.8), 'the ball is still on the field');
});