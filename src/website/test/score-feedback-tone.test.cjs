const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = (relativePath) => fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'scripts', relativePath), 'utf8');

const lookupSource = read(path.join('modules', 'lookup.types.js'));
const playmakerSource = read(path.join('view-models', 'play-maker', 'playmaker.js'));

// Loads the real lookup types and playmaker.js with a small jQuery stand-in that records the
// classes and inline styles written to #field-score-feedback, so the tests can assert on the
// tone the toast picks up. The two selectors displayPlayToast measures against are plain stubs.
function createToastContext() {
    const classes = new Set();
    const styles = {};
    let text = '';

    const feedback = {
        length: 1,
        text: (value) => { text = value; return feedback; },
        removeClass: (names) => {
            String(names).split(/\s+/).filter(Boolean).forEach((name) => classes.delete(name));
            return feedback;
        },
        addClass: (names) => {
            String(names).split(/\s+/).filter(Boolean).forEach((name) => classes.add(name));
            return feedback;
        },
        css: (property, value) => {
            if (value === undefined)
                return styles[property];
            styles[property] = value;
            return feedback;
        },
        outerWidth: () => 120
    };

    const field = { length: 1, width: () => 600 };
    const ball = { length: 1, css: () => undefined };

    const $ = (selector) => {
        if (selector === '#field-score-feedback') return feedback;
        if (selector === '#field-img') return field;
        if (selector === '#ball-position-img') return ball;
        return { length: 0, val: () => '', text: () => {} };
    };

    const context = {
        console: { log() {} },
        $,
        jQuery: $,
        HELPERS: {
            getDownText: (down, yardsToFirst) => `${down} & ${yardsToFirst}`,
            getYardText: () => ' midfield'
        },
        currentDown: () => 1,
        yardsToFirst: () => 10,
        team: { teamCityAndName: () => 'Denver Broncos' }
    };
    context.self = context;

    vm.createContext(context);
    vm.runInContext(lookupSource, context);
    vm.runInContext(playmakerSource, context);

    return {
        context,
        classes,
        styles,
        text: () => text,
        //only the tone-* classes currently on the toast, in insertion order
        toneClasses: () => Array.from(classes).filter((name) => name.startsWith('field-score-feedback-tone-')),
        showToast: (score, type, playText) =>
            context.playMaker.displayPlayToast(score, type, playText ?? null, context.team),
        tone: (type, playText) => context.playMaker.getPlayToastTone(type, playText ?? null)
    };
}

test('a touchdown toast carries the score tone and the active class', () => {
    const toast = createToastContext();

    toast.showToast(6, toast.context.SCORE_TYPES.TOUCHDOWN, null);

    assert.ok(toast.classes.has('field-score-feedback-tone-score'), 'score tone applied');
    assert.ok(toast.classes.has('field-score-feedback-active'), 'toast shown');
    assert.match(toast.text(), /TOUCHDOWN/);
});

test('a made kick scores points, so it keeps the score tone', () => {
    const toast = createToastContext();

    toast.showToast(3, toast.context.SCORE_TYPES.FIELDGOAL, null);

    assert.deepEqual(toast.toneClasses(), ['field-score-feedback-tone-score']);
});

test('a safety is grouped with the bad-play tones, not the scoring tones', () => {
    const toast = createToastContext();

    toast.showToast(2, toast.context.SCORE_TYPES.SAFETY, null);

    assert.deepEqual(toast.toneClasses(), ['field-score-feedback-tone-negative']);
});

test('an ordinary play falls back to the neutral tone', () => {
    const toast = createToastContext();

    toast.showToast(null, null, 'Run Successful for 5 Yards');

    assert.deepEqual(toast.toneClasses(), ['field-score-feedback-tone-neutral']);
});

test('a penalty play lights the penalty tone', () => {
    const toast = createToastContext();

    toast.showToast(null, null, 'Delay of Game - 5 Yard Penalty for -5 Yards');

    assert.deepEqual(toast.toneClasses(), ['field-score-feedback-tone-penalty']);
});

test('a turnover lights the turnover tone', () => {
    const toast = createToastContext();

    toast.showToast(null, null, 'Pass INTERCEPTED');

    assert.deepEqual(toast.toneClasses(), ['field-score-feedback-tone-turnover']);
});

test('a sack lights the negative tone', () => {
    const toast = createToastContext();

    toast.showToast(null, null, 'Sacked for a loss for -7 Yards');

    assert.deepEqual(toast.toneClasses(), ['field-score-feedback-tone-negative']);
});

test('the previous toast tone is stripped before the next one shows', () => {
    const toast = createToastContext();

    toast.showToast(6, toast.context.SCORE_TYPES.TOUCHDOWN, null);
    toast.showToast(null, null, 'Pass Complete for 12 Yards');

    //the touchdown's green tone must not survive into the ordinary play
    assert.deepEqual(toast.toneClasses(), ['field-score-feedback-tone-neutral']);
});

test('the toast never paints with inline color or border-color styles', () => {
    const toast = createToastContext();

    toast.showToast(6, toast.context.SCORE_TYPES.TOUCHDOWN, null);
    toast.showToast(null, null, 'Delay of Game - 5 Yard Penalty for -5 Yards');

    //tone colors belong to --toast-accent in main.css; an inline style would override it
    assert.equal(toast.styles.color, undefined, 'no inline text color');
    assert.equal(toast.styles['border-color'], undefined, 'no inline border color');
});

test('getPlayToastTone maps the wording the play engine actually produces', () => {
    const toast = createToastContext();
    const SCORE_TYPES = toast.context.SCORE_TYPES;

    //score toasts pass a SCORE_TYPES value
    assert.equal(toast.tone(SCORE_TYPES.TOUCHDOWN, null), 'score');
    assert.equal(toast.tone(SCORE_TYPES.EXTRAPOINT, null), 'score');
    assert.equal(toast.tone(SCORE_TYPES.TWOPOINTCONVERSION, null), 'score');
    assert.equal(toast.tone(SCORE_TYPES.SAFETY, null), 'negative');

    //generic play toasts only carry their text
    assert.equal(toast.tone(null, 'TOUCHDOWN for 12 Yards'), 'score');
    assert.equal(toast.tone(null, 'Field Goal NO GOOD'), 'neutral');
    assert.equal(toast.tone(null, 'Delay of Game - 5 Yard Penalty'), 'penalty');
    assert.equal(toast.tone(null, 'Run Successful - FUMBLE RECOVERED BY DEFENSE'), 'turnover');
    assert.equal(toast.tone(null, 'Run - tackled for a loss for -4 Yards'), 'negative');
    assert.equal(toast.tone(null, 'Pass Complete for 8 Yards'), 'neutral');
});

//main.css owns every toast color, so the rules are asserted here where a regression would
//otherwise only show up as a washed-out toast in the browser
const mainCss = fs.readFileSync(
    path.join(__dirname, '..', 'wwwroot', 'styles', 'main.css'), 'utf8');

test('every toast tone paints a real accent - no rule falls back to transparent', () => {
    for (const tone of ['score', 'penalty', 'turnover', 'negative', 'neutral']) {
        const rule = mainCss.match(
            new RegExp(`#field-score-feedback\\.field-score-feedback-tone-${tone}\\s*\\{([^}]*)\\}`));

        assert.ok(rule, `tone rule for ${tone} exists in main.css`);
        assert.match(rule[1], /--toast-accent:\s*[^;]+;/, `${tone} defines --toast-accent`);
        assert.match(rule[1], /--toast-accent-soft:\s*[^;]+;/, `${tone} defines --toast-accent-soft`);
        //transparent strips both the border and the glow; neutral is the most common toast
        //state, so it must keep a visible accent like every other tone
        assert.doesNotMatch(rule[1], /transparent/, `${tone} must not use transparent`);
    }
});

test('the toast border and glow are painted from the accent custom properties', () => {
    const base = mainCss.match(/#field-score-feedback\s*\{([^}]*)\}/);

    assert.ok(base, 'the base #field-score-feedback rule exists');
    assert.match(base[1], /border:\s*1px solid var\(--toast-accent\)/, 'border reads --toast-accent');
    assert.match(base[1], /var\(--toast-accent-soft\)/, 'box-shadow glow reads --toast-accent-soft');
});