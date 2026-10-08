const assert = require('node:assert/strict');
const test = require('node:test');

const { createGameContext } = require('./helpers/play-context.cjs');

test('a short run followed by a play past the sticks resets to 1st and 10', () => {
    const game = createGameContext();
    game.currentDown(1);
    game.yardsToFirst(10);
    game.MODULES.GameVariables.DiceSumTotal = 10; //positive yardage roll
    game.UTILITIES.getRandomInt = () => 8;

    game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    //the reported setup: a run that stops short leaves 2nd and 2
    assert.equal(game.currentDown(), 2);
    assert.equal(game.yardsToFirst(), 2);

    game.UTILITIES.getRandomInt = () => 15;
    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    //the follow-up play clears the sticks, so the chains reset instead of staying at the old distance
    assert.equal(result.isFirstDown, true);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);
    assert.equal(game.HELPERS.getDownText(game.currentDown(), game.yardsToFirst()), '1st & 10');
});

test('intentional grounding costs a down without leaking into the next series', () => {
    const game = createGameContext();
    game.currentDown(2);
    game.yardsToFirst(2);
    game.MODULES.Constants.INTENTIONAL_GROUNDING_CHANCE_PERCENT = 100;
    game.UTILITIES.getRandomInt = () => 1;
    game.MODULES.GameVariables.DiceSumTotal = 5;

    const grounding = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.THROWAWAY);

    assert.equal(grounding.isPenalty, true);
    assert.equal(grounding.yards, -10);
    assert.equal(game.currentDown(), 3);
    assert.equal(game.yardsToFirst(), 12); //loss of down plus the yards assessed from the foul

    //the loss-of-down flag is scoped to a single play, so the next snap still earns its first down
    game.MODULES.GameVariables.DiceSumTotal = 10;
    game.UTILITIES.getRandomInt = () => 15;
    const nextPlay = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.PASS);

    assert.equal(nextPlay.isFirstDown, true);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);
});

test('a plain throwaway keeps the down sequence intact for the next play', () => {
    const game = createGameContext();
    game.currentDown(1);
    game.yardsToFirst(10);
    game.UTILITIES.getRandomInt = () => 1;

    game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.THROWAWAY);

    assert.equal(game.currentDown(), 2);
    assert.equal(game.yardsToFirst(), 10);

    game.MODULES.GameVariables.DiceSumTotal = 10;
    game.UTILITIES.getRandomInt = () => 12;
    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.equal(result.isFirstDown, true);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);
});

test('a run that reaches the sticks in one play still resets the chains', () => {
    const game = createGameContext();
    game.currentDown(3);
    game.yardsToFirst(9);
    game.MODULES.GameVariables.DiceSumTotal = 10;
    game.UTILITIES.getRandomInt = () => 14;

    const result = game.playMaker.getPlayResult(game.GAME_PLAY_TYPES.RUN);

    assert.equal(result.isFirstDown, true);
    assert.equal(result.isThirdDownConversion, true);
    assert.equal(game.currentDown(), 1);
    assert.equal(game.yardsToFirst(), 10);
    assert.equal(game.HELPERS.getDownText(game.currentDown(), game.yardsToFirst()), '1st & 10');
});
