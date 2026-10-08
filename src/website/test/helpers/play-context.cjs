const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = (relativePath) => fs.readFileSync(
    path.join(__dirname, '..', '..', 'wwwroot', 'scripts', relativePath), 'utf8');

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
        ko: { observable, observableArray },
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
                INTENTIONAL_GROUNDING_CHANCE_PERCENT: 0,
                THROWAWAY_PER_QUARTER: 2
            },
            GameVariables: {
                TotalPlayCount: 0,
                DiceSumTotal: 10,
                Teams: teams,
                //minimal Penalties table so grounding throwaways can draw their flag in vm-loaded plays
                Penalties: [
                    { name: 'Intentional Grounding', yards: 10, penaltySideOfBall: 'OFFENSE', penaltyType: 'PASS', chance: 100, automaticFirstDown: false }
                ]
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
        homeTeamThrowaways: observable(0),
        awayTeamThrowaways: observable(0),
        consecutiveDelayOfGamePenalties: observable(0),
        AddPlayHistory: (playHistory) => context.teamPlayHistory.push(playHistory),
        StopCounter() {},
        StopPlayClock() {},
        StartPlayClock() {},
        CheckTwoMinuteWarning() {},
        CompletePendingPeriodAlerts() {},
        SetBallPosition() {},
        ChangePossession() {
            context.yardsToFirst(10);
            context.currentDown(1);
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

module.exports = { createGameContext, observable, observableArray };

