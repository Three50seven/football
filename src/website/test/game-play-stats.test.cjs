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

function createGameContext(knockout = { observable, observableArray }) {
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
        ko: knockout,
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
                MAX_CONSECUTIVE_DELAY_OF_GAME_PENALTIES: 3
            },
            GameVariables: {
                TotalPlayCount: 0,
                DiceSumTotal: 10,
                Teams: teams,
                //mirrors the Penalties table in game.variables.js so vm-loaded playmaker paths can draw flags
                Penalties: [
                    { name: 'False Start', yards: 5, penaltySideOfBall: 'OFFENSE', penaltyType: 'PRESNAP', chance: 5, automaticFirstDown: false },
                    { name: 'Offside', yards: 5, penaltySideOfBall: 'ANY', penaltyType: 'PRESNAP', chance: 2, automaticFirstDown: false },
                    { name: 'Defensive Pass Interference', yards: 15, penaltySideOfBall: 'DEFENSE', penaltyType: 'PASS', chance: 5, automaticFirstDown: true },
                    { name: 'Offensive Pass Interference', yards: 10, penaltySideOfBall: 'OFFENSE', penaltyType: 'PASS', chance: 5, automaticFirstDown: false },
                    { name: 'Holding', yards: 10, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 5, automaticFirstDown: false },
                    { name: 'Roughing the Passer', yards: 15, penaltySideOfBall: 'DEFENSE', penaltyType: 'PASS', chance: 1, automaticFirstDown: true },
                    { name: 'Personal Foul', yards: 15, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 1, automaticFirstDown: true },
                    { name: 'Tripping', yards: 10, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 1, automaticFirstDown: false },
                    { name: 'Clipping', yards: 15, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 1, automaticFirstDown: false },
                    { name: 'Face Mask', yards: 15, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 1, automaticFirstDown: true },
                    { name: 'Illegal Formation', yards: 5, penaltySideOfBall: 'OFFENSE', penaltyType: 'PRESNAP', chance: 1, automaticFirstDown: false },
                    { name: 'Unsportsmanlike Conduct', yards: 15, penaltySideOfBall: 'ANY', penaltyType: 'GENERAL', chance: 1, automaticFirstDown: false },
                    { name: 'Delay of Game', yards: 5, penaltySideOfBall: 'OFFENSE', penaltyType: 'PRESNAP', automaticFirstDown: false }
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
        10, 'HOME', 5, 20, 30, 100, 1, 2, 5, 5, 3, 1, 2, 1
    );

    assert.equal(stat.teamId, 10);
    assert.equal(stat.totalPlayCount, 5);
    assert.equal(stat.totalYardsRushing, 20);
    assert.equal(stat.totalYardsPassing, 30);
    assert.equal(stat.totalTurnovers, 1);
    assert.equal(stat.totalFirstDowns, 2);
    assert.equal(stat.totalPenalties, 5);
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
        12, 'Pass Complete', false, game.GAME_PLAY_TYPES.PASS, true, '', false, false, false, true, false, false, false
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
        3, 'Run Successful', false, game.GAME_PLAY_TYPES.RUN, true, '', false, false, false, false, true, false, false
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

test('recordGameStats records penalty count and penalty yards for an isPenalty play result', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];

    const playResult = new game.MODULES.Constructors.PlayResult(
        -5, 'Delay of Game - 5 Yard Penalty', false, '', false, '', false, false, false, false, false, false, false, true
    );
    playResult.penalty = { name: 'Delay of Game', yards: 5, penaltySideOfBall: 'OFFENSE', automaticFirstDown: false };

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalPenalties, 1);
    assert.equal(homeTeam.totalPenaltyYards, -5);
    assert.equal(homeTeam.totalPenaltySide, 'OFFENSE');
});

test('recordGameStats charges a defensive foul to the defending team, not the offense', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];
    const awayTeam = game.gamePlayStats()[1];

    const playResult = new game.MODULES.Constructors.PlayResult(
        15, 'Roughing the Passer - AUTOMATIC FIRST DOWN - PENALTY: Roughing the Passer (15 YARDS)', false, game.GAME_PLAY_TYPES.PASS, true, '', false, false, false, false, false, false, false, true
    );
    playResult.penalty = { name: 'Roughing the Passer', yards: 15, penaltySideOfBall: 'DEFENSE', automaticFirstDown: true };

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalYardsPassing, 0); //this result contains only penalty yardage
    assert.equal(homeTeam.totalPenalties, 0);
    assert.equal(homeTeam.totalPenaltyYards, 0);
    assert.equal(awayTeam.totalPenalties, 1);
    assert.equal(awayTeam.totalPenaltyYards, -15);
    assert.equal(awayTeam.totalPenaltySide, 'DEFENSE');
    assert.equal(homeTeam.totalPenaltySide, 'NONE');
    assert.equal(homeTeam.totalFirstDowns, 1); //automatic first down still credits the offense
});

test('recordGameStats charges an offensive holding foul to the offense with no rush/pass yards', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];

    const playResult = new game.MODULES.Constructors.PlayResult(
        -10, 'Run - PENALTY: Holding (10 YARDS)', false, game.GAME_PLAY_TYPES.RUN, false, '', false, false, false, false, false, false, false, true
    );
    playResult.penalty = { name: 'Holding', yards: 10, penaltySideOfBall: 'OFFENSE', automaticFirstDown: false };

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalYardsRushing, 0);
    assert.equal(homeTeam.totalPenalties, 1);
    assert.equal(homeTeam.totalPenaltyYards, -10);
    assert.equal(homeTeam.totalPenaltySide, 'OFFENSE');
});

test('recordGameStats counts both flags on a repeated delay of game', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];

    const playResult = new game.MODULES.Constructors.PlayResult(
        -20, 'Delay of Game - 5 Yard Penalty + Unsportsmanlike Conduct - 15 Yard Penalty', false, '', false, '', false, false, false, false, false, false, false, true
    );
    playResult.penalty = { name: 'Delay of Game', yards: 20, penaltySideOfBall: 'OFFENSE', automaticFirstDown: false };
    playResult.penaltyCount = 2;

    game.playMaker.recordGameStats(game.homeTeamInfo(), playResult);

    assert.equal(homeTeam.totalPenalties, 2);
    assert.equal(homeTeam.totalPenaltyYards, -20);
    assert.equal(homeTeam.totalPenaltySide, 'OFFENSE');
});

test('recordGameStats records the penalty side for offense and defense penalties', () => {
    const game = createGameContext();
    const homeTeam = game.gamePlayStats()[0];
    const awayTeam = game.gamePlayStats()[1];

    //an offensive flag is drawn by the offense - counted against the offense
    const offensePenalty = new game.MODULES.Constructors.PlayResult(
        -10, 'Run - PENALTY: Holding (10 YARDS)', false, game.GAME_PLAY_TYPES.RUN, false, '', false, false, false, false, false, false, false, true
    );
    offensePenalty.penalty = { name: 'Holding', yards: 10, penaltySideOfBall: 'OFFENSE', automaticFirstDown: false };
    game.playMaker.recordGameStats(game.homeTeamInfo(), offensePenalty);

    assert.equal(homeTeam.totalPenalties, 1);
    assert.equal(homeTeam.totalPenaltyYards, -10);
    assert.equal(homeTeam.totalPenaltySide, 'OFFENSE');
    assert.equal(awayTeam.totalPenalties, 0);
    assert.equal(awayTeam.totalPenaltySide, 'NONE');

    //a defensive flag is drawn by the offense but committed by the defense - counted against the defense
    const defensePenalty = new game.MODULES.Constructors.PlayResult(
        15, 'Roughing the Passer - PENALTY: Roughing the Passer (15 YARDS)', false, game.GAME_PLAY_TYPES.PASS, true, '', false, false, false, false, false, false, false, true
    );
    defensePenalty.penalty = { name: 'Roughing the Passer', yards: 15, penaltySideOfBall: 'DEFENSE', automaticFirstDown: true };
    game.playMaker.recordGameStats(game.homeTeamInfo(), defensePenalty);

    //the offense's own holding penalty is cumulative, the defense's defensive foul is reported separately
    assert.equal(homeTeam.totalPenalties, 1);
    assert.equal(homeTeam.totalPenaltySide, 'OFFENSE');
    assert.equal(awayTeam.totalPenalties, 1);
    assert.equal(awayTeam.totalPenaltyYards, -15);
    assert.equal(awayTeam.totalPenaltySide, 'DEFENSE');
});

for (const offenseId of [10, 20]) {
    for (const playType of ['run', 'pass']) {
        for (const gain of [8, 0, -12]) {
            test(`defensive penalty preserves ${gain} ${playType} yards for team ${offenseId}`, () => {
                const game = createGameContext();
                const offenseInfo = offenseId === 10 ? game.homeTeamInfo() : game.awayTeamInfo();
                const offense = game.gamePlayStats().find(team => team.teamId === offenseId);
                const defense = game.gamePlayStats().find(team => team.teamId !== offenseId);
                const result = new game.MODULES.Constructors.PlayResult(
                    gain + 10, 'Defensive Holding', false, playType
                );
                result.isPenalty = true;
                result.penalty = { yards: 10, penaltySideOfBall: 'DEFENSE' };

                game.playMaker.recordGameStats(offenseInfo, result);

                assert.equal(offense.totalYardsRushing, playType === 'run' ? gain : 0);
                assert.equal(offense.totalYardsPassing, playType === 'pass' ? gain : 0);
                assert.equal(offense.totalPenaltyYards, 0);
                assert.equal(offense.totalPenalties, 0);
                assert.equal(defense.totalPenaltyYards, -10);
                assert.equal(defense.totalPenalties, 1);
                assert.equal(defense.totalPlayCount, 0);
                assert.equal(defense.totalTimePossession, 0);
                assert.equal(defense.penaltySideLabel(), 'Defense');
            });
        }
    }
}

test('penalty side retains both units across possession changes and clean plays', () => {
    const game = createGameContext();
    const home = game.gamePlayStats()[0];
    assert.equal(home.penaltySideLabel(), '-');

    const offensiveFlag = new game.MODULES.Constructors.PlayResult(-5, 'False Start');
    offensiveFlag.isPenalty = true;
    offensiveFlag.penalty = { yards: 5, penaltySideOfBall: 'OFFENSE' };
    game.playMaker.recordGameStats(game.homeTeamInfo(), offensiveFlag);
    assert.equal(home.penaltySideLabel(), 'Offense');

    game.currentTeamWithBall(20);
    const defensiveFlag = new game.MODULES.Constructors.PlayResult(10, 'Defensive Holding');
    defensiveFlag.isPenalty = true;
    defensiveFlag.penalty = { yards: 10, penaltySideOfBall: 'DEFENSE' };
    game.playMaker.recordGameStats(game.awayTeamInfo(), defensiveFlag);

    game.currentTeamWithBall(10);
    const cleanPlay = new game.MODULES.Constructors.PlayResult(8, 'Run', false, game.GAME_PLAY_TYPES.RUN);
    game.playMaker.recordGameStats(game.homeTeamInfo(), cleanPlay);
    game.playMaker.recordGameStats(game.homeTeamInfo(), offensiveFlag);

    assert.equal(home.totalPenaltySide, 'BOTH');
    assert.equal(home.penaltySideLabel(), 'Offense & Defense');
    assert.equal(home.totalPenalties, 3);
    assert.equal(home.totalPenaltyYards, -20);
    assert.equal(home.totalYardsRushing, 8);
});

test('both stats tables share a three-column template with team logos and row headers', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'Football.html'), 'utf8');
    const tables = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/g)]
        .map(match => match[0])
        .filter(table => table.includes("name: 'teamStatsTemplate'"));
    const template = html.match(/<script type="text\/html" id="teamStatsTemplate">([\s\S]*?)<\/script>/)[1];

    assert.equal(tables.length, 2);
    assert.equal((template.match(/scope="col"/g) || []).length, 3);
    assert.equal((template.match(/scope="row"/g) || []).length, 1);
    assert.equal((template.match(/<td\b/g) || []).length, 2);
    assert.match(template, /homeTeamInfo\(\)\.teamImage\(\)/);
    assert.match(template, /awayTeamInfo\(\)\.teamImage\(\)/);
    assert.match(template, /homeTeamInfo\(\)\.teamCityAndName\(\)/);
    assert.match(template, /awayTeamInfo\(\)\.teamCityAndName\(\)/);
    assert.match(template, /foreach: gameStatRows\(\)/);
    assert.match(template, /text: home/);
    assert.match(template, /text: away/);
    assert.equal((html.match(/class="scroller stats-comparison-scroller"/g) || []).length, 2);
});

test('stat rows include every displayed stat and match teams by ID regardless of array order', () => {
    const game = createGameContext();
    const [home, away] = game.gamePlayStats();
    const properties = [
        'totalPlayCount', 'totalYardsRushing', 'totalYardsPassing', 'totalYards',
        'totalPenaltyYards', 'penaltySideLabel', 'totalTimePossessionDisplay',
        'totalTurnovers', 'totalFumblesLost', 'totalInterceptionsThrown', 'totalSacks',
        'totalTackles', 'totalFirstDowns', 'totalThirdDownConversions',
        'totalFourthDownConversions', 'totalFieldGoalAttempts', 'totalFieldGoalsMade'
    ];
    properties.forEach((property, index) => {
        if (property === 'penaltySideLabel') {
            home.totalPenaltySide = 'OFFENSE';
            away.totalPenaltySide = 'DEFENSE';
        }
        else {
            home[property] = index + 10;
            away[property] = index + 100;
        }
    });
    game.gamePlayStats([away, home]);
    const rows = game.gameStatRows();
    assert.equal(rows.length, properties.length);
    assert.equal(new Set(rows.map(row => row.label)).size, properties.length);
    properties.forEach((property, index) => {
        assert.equal(rows[index].home, typeof home[property] === 'function' ? home[property]() : home[property]);
        assert.equal(rows[index].away, typeof away[property] === 'function' ? away[property]() : away[property]);
    });
});

test('stat rows update after a play and clear with a new game', () => {
    const game = createGameContext();
    const result = new game.MODULES.Constructors.PlayResult(8, 'Run', false, game.GAME_PLAY_TYPES.RUN);
    game.playMaker.recordGameStats(game.homeTeamInfo(), result);
    assert.equal(game.gameStatRows().find(row => row.label === 'Total Yards').home, 8);
    assert.equal(game.gameStatRows().find(row => row.label === 'Total Yards').away, 0);
    game.gamePlayStats([]);
    assert.equal(game.gameStatRows().length, 0);
    game.InitializeGameStats();
    assert.equal(game.gameStatRows().find(row => row.label === 'Total Yards').home, 0);
});

test('real Knockout bindings always receive both teams during initialization and updates', () => {
    const knockout = require('../wwwroot/scripts/libraries/Knockout/knockout-3.4.2.js');
    const game = createGameContext(knockout);
    game.gamePlayStats([]);
    const rows = knockout.computed(() => game.gameStatRows());
    const notifications = [];
    game.gamePlayStats.subscribe(stats => notifications.push(stats.length));
    game.InitializeGameStats();
    assert.equal(rows().length, 17);
    const result = new game.MODULES.Constructors.PlayResult(8, 'Run', false, game.GAME_PLAY_TYPES.RUN);
    game.playMaker.recordGameStats(game.homeTeamInfo(), result);
    assert.equal(rows().find(row => row.label === 'Total Yards').home, 8);
    assert.deepEqual(notifications, [2, 2]);
    rows.dispose();
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
