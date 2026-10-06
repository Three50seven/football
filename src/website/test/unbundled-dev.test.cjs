const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectDir = path.resolve(__dirname, '..');
const bundles = require(path.join(projectDir, 'bundles.json'));
const appsettings = require(path.join(projectDir, 'appsettings.json'));

test('all raw files referenced in bundles.json exist on disk', () => {
    function checkBundleFiles(bundleList) {
        for (const bundle of bundleList) {
            for (const file of bundle.files || []) {
                const subBundle = bundles.find((b) => (b.name || '').toLowerCase() === file.toLowerCase());
                if (subBundle) continue; // nested bundle reference
                const fullPath = path.join(projectDir, 'wwwroot', file);
                assert.ok(
                    fs.existsSync(fullPath),
                    `File referenced in bundle "${bundle.name}" does not exist: ${fullPath}`
                );
            }
        }
    }

    checkBundleFiles(bundles);
});

test('unbundled dev transform replaces bundle tags with raw source files for Football.html', async () => {
    const { unbundledDevPlugin } = await import('../vite.config.mjs');
    const plugin = unbundledDevPlugin();

    assert.equal(plugin.apply, 'serve', 'plugin must only apply during dev serve');

    const rawHtml = fs.readFileSync(path.join(projectDir, 'Football.html'), 'utf8');
    const transformed = plugin.transformIndexHtml(rawHtml);

    // CSS bundles replaced with raw stylesheets
    assert.ok(transformed.includes('/wwwroot/styles/main.css'), 'contains main.css');
    assert.ok(transformed.includes('/wwwroot/styles/team-colors.css'), 'contains team-colors.css');
    assert.ok(!transformed.includes('/wwwroot/content/css/styles.min.css'), 'styles.min.css replaced');

    // JS bundles replaced with individual raw script tags
    assert.ok(transformed.includes('/wwwroot/scripts/libraries/JQuery/jquery-3.3.1.min.js'), 'contains jquery');
    assert.ok(transformed.includes('/wwwroot/scripts/libraries/Knockout/knockout-3.4.2.js'), 'contains knockout');
    assert.ok(transformed.includes('/wwwroot/scripts/custom-bindings/knockout/knockout.bindings.js'), 'contains knockout.bindings');
    assert.ok(transformed.includes('/wwwroot/scripts/utilities/utilities.js'), 'contains utilities');
    assert.ok(transformed.includes('/wwwroot/scripts/utilities/game.helpers.js'), 'contains game.helpers');
    assert.ok(transformed.includes('/wwwroot/scripts/modules/constants.js'), 'contains constants');
    assert.ok(transformed.includes('/wwwroot/scripts/modules/constructors.js'), 'contains constructors');
    assert.ok(transformed.includes('/wwwroot/scripts/view-models/play-maker/playmaker.js'), 'contains playmaker');
    assert.ok(transformed.includes('/wwwroot/scripts/view-models/football.js'), 'contains football');

    // Bundles should not be present in transformed dev HTML
    assert.ok(!transformed.includes('/wwwroot/content/js/lib/knockout-bundle.min.js'), 'knockout-bundle replaced');
    assert.ok(!transformed.includes('/wwwroot/content/js/utilities/utilities-bundle.min.js'), 'utilities-bundle replaced');
    assert.ok(!transformed.includes('/wwwroot/content/js/modules/main-bundle.min.js'), 'main-bundle replaced');
    assert.ok(!transformed.includes('/wwwroot/content/js/viewmodels/main-game-bundle.min.js'), 'main-game-bundle replaced');
});

test('unbundled dev transform replaces bundle tags with raw styles for index.html', async () => {
    const { unbundledDevPlugin } = await import('../vite.config.mjs');
    const plugin = unbundledDevPlugin();

    const rawHtml = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
    const transformed = plugin.transformIndexHtml(rawHtml);

    assert.ok(transformed.includes('/wwwroot/styles/main.css'), 'index contains main.css');
    assert.ok(transformed.includes('/wwwroot/styles/team-colors.css'), 'index contains team-colors.css');
    assert.ok(!transformed.includes('/wwwroot/content/css/styles.min.css'), 'index styles.min.css replaced');
});

