const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = (relativePath) => fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', relativePath), 'utf8');

const constructorsSource = read(path.join('modules', 'constructors.js'));
const boxscoreSource = read(path.join('view-models', 'game-stats', 'boxscore.model.js'));
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

function observableArray(initial = []) {
    const fn = function (next) {
        if (!arguments.length) return fn.value;
        fn.value = next;
        return fn;
    };
    fn.value = initial.slice();
    fn.push = (item) => { fn.value.push(item); };
    fn.refresh = () => {};
    return fn;
}

// Loads the real constructors, the real box-score model, and playmaker.js with a stubbed global `self`.
// NOTE: like the browser, `self` IS the global object, because every model IIFE does `var self = this`
// (which is the global object) and the code in playmaker.js reads/writes through that shared `self`.
function createGame(options = {}) {
    //the team records carry a teamId because forfeitGame() decides who wins by comparing
    //homeTeamInfo()/awayTeamInfo()'s teamId against homeTeamID(), and it looks the offending team up
    //with HELPERS.getTeamInfo() out of this same list - exactly like the real game variables do.
    const teams = [
        { teamId: 10, teamName: () => 'HOME' },
        { teamId: 20, teamName: () => 'AWAY' }
    ];
    const homeInfo = teams[0];
    const awayInfo = teams[1];

    const $ = function () { return { val: () => '', text: () => {} }; };
    $.grep = function (arr, predicate) {
        const matches = [];
        for (let i = 0; i < arr.length; i++)
            if (predicate(arr[i], i)) matches.push(arr[i]);
        return matches;
    };

    const context = {
        console: { log() {} },
        ShowGameAlert() {},
        ko: { observable, observableArray },
        $,
        jQuery: $,
        HELPERS: {
            //mirrors game.helpers.js: a grep over the game variables' team list
            getTeamInfo: (teamId) => $.grep(teams, (team) => team.teamId === teamId)[0]
        },
        UTILITIES: {
            getFullTeamName: (teamName) => teamName,
            getTeamImagePath: () => 'image.png',
            getTimeDisplay: (seconds) => String(seconds)
        },
        MODULES: { Constructors: {}, Constants: { PLAY_CLOCK_NORMAL: 40, PLAY_CLOCK_SHORT: 25 }, GameVariables: { Teams: teams } },
        GAME_PLAY_TYPES: {},
        SCORE_TYPES: {},
        KICKOFF_TYPES: {},
        completedGamesAdded: 0,
        playMaker: null
    };
    context.self = context;
    context.sim = { addCompletedGameToHistory: () => { context.completedGamesAdded += 1; } };

    context.homeTeamID = observable(10);
    context.awayTeamID = observable(20);
    // reference-stable team objects, exactly like the real ko.computed homeTeamInfo()/awayTeamInfo()
    context.homeTeamInfo = () => homeInfo;
    context.awayTeamInfo = () => awayInfo;
    context.homeTeamScore = observable(options.homeScore ?? 17);
    context.awayTeamScore = observable(options.awayScore ?? 10);
    context.currentQuarter = observable(options.quarter ?? 3);
    context.gameOver = observable(false);
    context.StopCounter = () => {};
    context.StopPlayClock = () => {};

    vm.createContext(context);
    vm.runInContext(constructorsSource, context);
    vm.runInContext(boxscoreSource, context);
    vm.runInContext(playmakerSource, context);

    return context;
}

test('gameBoxScore holds exactly one record per team', () => {
    const self = createGame();
    self.InitializeBoxScore();

    const box = self.gameBoxScore();
    assert.equal(box.length, 2);
    assert.deepEqual(box.map((entry) => entry.teamId).sort(), [self.homeTeamID(), self.awayTeamID()]);
});

test('a home-team forfeit resets every box-score row and awards the away team a 2-0 win', () => {
    const self = createGame({ homeScore: 21, awayScore: 14, quarter: 3 });
    self.InitializeBoxScore();

    self.playMaker.forfeitGame(self.homeTeamID()); // home team is the offender

    assert.equal(self.gameOver(), true);
    assert.equal(self.homeTeamScore(), 0); // offending team scores nothing
    assert.equal(self.awayTeamScore(), 2); // winner awarded a 2-0 win

    const homeBox = self.gameBoxScore().find((entry) => entry.teamId === self.homeTeamID());
    const awayBox = self.gameBoxScore().find((entry) => entry.teamId === self.awayTeamID());

    assert.deepEqual(
        [homeBox.firstQuarterScore, homeBox.secondQuarterScore, homeBox.thirdQuarterScore, homeBox.fourthQuarterScore, homeBox.overtimeScore],
        [0, 0, 0, 0, 0]);
    assert.equal(homeBox.totalScore, 0);

    assert.deepEqual(
        [awayBox.firstQuarterScore, awayBox.secondQuarterScore, awayBox.thirdQuarterScore, awayBox.fourthQuarterScore, awayBox.overtimeScore],
        [0, 0, 0, 0, 0]);
    assert.equal(awayBox.totalScore, 2);

    assert.equal(self.completedGamesAdded, 1); // the forfeited game is still recorded in history
});

test('an away-team forfeit awards the home team the 2-0 win', () => {
    const self = createGame({ homeScore: 3, awayScore: 24, quarter: 4 });
    self.InitializeBoxScore();

    self.playMaker.forfeitGame(self.awayTeamID()); // away team is the offender

    assert.equal(self.homeTeamScore(), 2);
    assert.equal(self.awayTeamScore(), 0);

    const homeBox = self.gameBoxScore().find((entry) => entry.teamId === self.homeTeamID());
    const awayBox = self.gameBoxScore().find((entry) => entry.teamId === self.awayTeamID());

    assert.equal(homeBox.totalScore, 2);
    assert.equal(awayBox.totalScore, 0);
    assert.equal(awayBox.thirdQuarterScore, 0); // the awarded points are not dropped into the live quarter
});
