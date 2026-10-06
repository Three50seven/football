const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = (relativePath) => fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', relativePath), 'utf8');

const constructorsSource = read(path.join('modules', 'constructors.js'));
const lookupSource = read(path.join('modules', 'lookup.types.js'));
const helpersSource = read(path.join('utilities', 'game.helpers.js'));
const utilitiesSource = read(path.join('utilities', 'utilities.js'));
const statsModelSource = read(path.join('view-models', 'game-stats', 'stats.model.js'));
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

function createGameContext() {
    const teams = [
        { teamId: 10, teamName: () => 'HOME', teamCityAndName: () => 'Home City HOME', teamImage: () => '' },
        { teamId: 20, teamName: () => 'AWAY', teamCityAndName: () => 'Away City AWAY', teamImage: () => '' }
    ];

    const $ = function () {
        return {
            val: () => '',
            text: () => {},
            attr: () => ({ show: () => {} }),
            show: () => {},
            hide: () => {},
            removeClass: () => ({ addClass: () => {} }),
            addClass: () => {},
            css: () => {},
            empty: () => {},
            is: () => false,
            slideUp: () => {}
        };
    };
    $.grep = function (arr, predicate) {
        const matches = [];
        for (let i = 0; i < arr.length; i++)
            if (predicate(arr[i], i)) matches.push(arr[i]);
        return matches;
    };

    const context = {
        console: { log() {} },
        $,
        jQuery: $,
        ko: {
            observable,
            observableArray
        },
        MODULES: {
            Constants: {
                END_ZONE_YARDS: 10,
                NO_GAIN_PASS_COMPLETION_CHANCE_PERCENT: 0,
                INTERCEPTION_CHANCE_PERCENT: 0,
                FUMBLE_CHANCE_PERCENT: 0,
                RUN_OUT_OF_BOUNDS_MAX_YARDS: 5,
                RUN_OUT_OF_BOUNDS_CHANCE_PERCENT: 0,
                RUN_OUT_OF_BOUNDS_LEADING_END_OF_HALF_CHANCE_PERCENT: 0,
                RUN_OUT_OF_BOUNDS_END_OF_HALF_CHANCE_PERCENT: 0,
                KICKOFF_SPOT: 35,
                TOUCHBACK_YARD_LINE: 25,
                EXTRA_POINT_KICK_SPOT: 15,
                TWO_POINT_CONVERSION_SPOT: 2,
                SAFETY_KICKOFF_SPOT: 20,
                PUNT_BLOCK_CHANCE_PERCENT: 0,
                PUNT_MUFF_CHANCE_PERCENT: 0,
                ONSIDE_RECOVERY_CHANCE_PERCENT: 0,
                BLOCKED_FIELD_GOAL_RETURN_CHANCE_PERCENT: 0,
                BLOCKED_FIELD_GOAL_TOUCHDOWN_CHANCE_PERCENT: 0,
                SPIKE_YARDS_LOST: 2,
                DELAY_OF_GAME_PENALTY_YARDS: 5,
                MAX_CONSECUTIVE_DELAY_OF_GAME_PENALTIES: 3,
                UNSPORTSMANLIKE_CONDUCT_PENALTY_YARDS: 15
            },
            GameVariables: {
                TotalPlayCount: 0,
                DiceSumTotal: 10,
                Teams: teams
            }
        },
        homeTeamID: observable(10),
        awayTeamID: observable(20),
        homeTeamInfo: observable(teams[0]),
        awayTeamInfo: observable(teams[1]),
        currentTeamWithBall: observable(10),
        homeTeamScore: observable(0),
        awayTeamScore: observable(0),
        currentDown: observable(1),
        yardsToFirst: observable(10),
        yardsToTouchdown: observable(50),
        yardsTraveled: observable(0),
        ballSpotStart: observable(50),
        currentBallSpot: () => 50,
        currentQuarter: observable(1),
        playCountForPossession: observable(0),
        timeOfPossession: observable(10),
        remainingTimeDisplay: observable('15:00'),
        gameOver: observable(false),
        hasRolled: observable(true),
        pointAttemptAfterTouchDown: observable(false),
        isTwoPointConversion: observable(false),
        isExtraPointKick: observable(false),
        isSafety: observable(false),
        isFieldGoal: observable(false),
        isPunt: observable(false),
        isKickoff: observable(false),
        showKickoffControls: observable(false),
        teamPlayHistory: observableArray([]),
        lastTimeoutTeam: observable(0),
        elapsedTime: observable(0),
        consecutiveDelayOfGamePenalties: observable(0),
        AddPlayHistory: (playHistory) => context.teamPlayHistory.push(playHistory),
        StopCounter() {},
        StopPlayClock() {},
        StartPlayClock() {},
        CheckTwoMinuteWarning() {},
        CompletePendingPeriodAlerts() {},
        SetBallPosition() {},
        ChangePossession() {
            context.currentTeamWithBall(context.currentTeamWithBall() === 10 ? 20 : 10);
        },
        SetupKickoff() {},
        ShowHideSpecialTeamsMenu() {},
        ShowPlayResultAlerts() {},
        ShowGameAlert() {}
    };
    context.self = context;

    vm.createContext(context);
    vm.runInContext(lookupSource, context);
    vm.runInContext(utilitiesSource, context);
    vm.runInContext(constructorsSource, context);
    vm.runInContext(helpersSource, context);
    vm.runInContext(statsModelSource, context);
    vm.runInContext(playmakerSource, context);

    context.InitializeGameStats();

    return context;
}

test('GamePlayStatRecord initializes all new properties with correct defaults', () => {
    const game = createGameContext();
    const stat = new game.MODULES.Constructors.GamePlayStatRecord(
        10, 'HOME', 5, 20, 30, 100, 1, 2, 5, 3, 1, 2, 1
    );

    assert.equal(stat.teamId, 10);
    assert.equal(stat.totalPlayCount, 5);
    assert.equal(stat.totalYardsRushing, 20);
    assert.equal(stat.totalYardsPassing, 30);
    assert.equal(stat.totalTurnovers, 1);
    assert.equal(stat.totalFirstDowns, 2);
    assert.equal(stat.totalPenaltyYards, 5);
    assert.equal(stat.totalThirdDownConversions, 3);
    assert.equal(stat.totalFourthDownConversions, 1);
    assert.equal(stat.totalFieldGoalAttempts, 2);
    assert.equal(stat.totalFieldGoalsMade, 1);
});

test('GamePlayStatRecord defaults new properties to 0 when omitted', () => {
    const game = createGameContext();
    const stat = new game.MODULES.Constructors.GamePlayStatRecord(
        10, 'HOME', 1, 0, 0, 10, 0, 0
    );

    assert.equal(stat.totalThirdDownConversions, 0);
    assert.equal(stat.totalFourthDownConversions, 0);
    assert.equal(stat.totalFieldGoalAttempts, 0);
    assert.equal(stat.totalFieldGoalsMade, 0);
});

test('recordGameStats increments totalThirdDownConversions on a 3rd down conversion', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];
    assert.equal(homeTeam.totalThirdDownConversions, 0);

    const playResult = new game.MODULES.Constructors.PlayResult(
        12, 'Pass Complete', false, game.GAME_PLAY_TYPES.PASS, true, '', false, false, false, true, false
    );

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalThirdDownConversions, 1);
    assert.equal(homeTeam.totalFourthDownConversions, 0);
    assert.equal(homeTeam.totalFirstDowns, 1);
    assert.equal(homeTeam.totalYardsPassing, 12);
});

test('recordGameStats increments totalFourthDownConversions on a 4th down conversion', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];
    assert.equal(homeTeam.totalFourthDownConversions, 0);

    const playResult = new game.MODULES.Constructors.PlayResult(
        3, 'Run Successful', false, game.GAME_PLAY_TYPES.RUN, true, '', false, false, false, false, true
    );

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalThirdDownConversions, 0);
    assert.equal(homeTeam.totalFourthDownConversions, 1);
    assert.equal(homeTeam.totalFirstDowns, 1);
    assert.equal(homeTeam.totalYardsRushing, 3);
});

test('recordGameStats increments field goal attempts and makes for a successful field goal', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];

    const playResult = new game.MODULES.Constructors.PlayResult(
        42, 'Field Goal GOOD', false, game.KICKOFF_TYPES.FIELDGOAL, false, '', false, false, false, false, false, true, true
    );

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalFieldGoalAttempts, 1);
    assert.equal(homeTeam.totalFieldGoalsMade, 1);
});

test('recordGameStats increments field goal attempts but not made for a missed field goal', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];

    const playResult = new game.MODULES.Constructors.PlayResult(
        42, 'Field Goal NO GOOD', true, game.GAME_PLAY_TYPES.FIELDGOAL, false, '', false, false, false, false, false, true, false
    );

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalFieldGoalAttempts, 1);
    assert.equal(homeTeam.totalFieldGoalsMade, 0);
});

test('getPlayResult correctly identifies 3rd down conversion on 3rd down gain reaching first down marker', () => {
    const game = createGameContext();
    game.UTILITIES.getRandomInt = () => 8;
    game.currentDown(3);
    game.yardsToFirst(5);
    game.yardsToTouchdown(40);
    game.MODULES.GameVariables.DiceSumTotal = 10; // Positive yardage

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.equal(result.isThirdDownConversion, true);
    assert.equal(result.isFourthDownConversion, false);
    assert.equal(result.isFirstDown, true);
});

test('getPlayResult correctly identifies 4th down conversion on 4th down touchdown', () => {
    const game = createGameContext();
    game.UTILITIES.getRandomInt = () => 5;
    game.currentDown(4);
    game.yardsToFirst(2);
    game.yardsToTouchdown(2);
    game.MODULES.GameVariables.DiceSumTotal = 10; // Positive yardage

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.equal(result.isFourthDownConversion, true);
    assert.equal(result.isThirdDownConversion, false);
});
