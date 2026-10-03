const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const projectDirectory = path.join(__dirname, '..');
const bundler = require(path.join(projectDirectory, 'gulp_modules', 'bundler'));
const bundlingSettings = require(path.join(projectDirectory, 'appsettings.json')).Bundling;

// Where a bundle actually lands is decided by three steps that each resolve paths differently:
//   1. gulp-concat builds the output file as path.join(file.base, target). src() is called with
//      { base: "." }, so file.base is the cwd - and path.join APPENDS an absolute target instead of
//      replacing it, which doubles the path on Linux.
//   2. vinyl-fs computes file.relative from that (possibly mangled) file.path.
//   3. vinyl-fs dest(".") writes to path.resolve(cwd, file.relative).
// Reproducing all three is the only way to catch this without a Linux runner: when gulp-concat was
// handed an absolute target, every bundle was written to a nested copy of the project tree on the CI
// build (src/website/opt/build/repo/src/website/wwwroot/...) and nothing failed loudly.
function resolveWritePath(pathApi, cwd, concatTarget) {
    const filePath = pathApi.join(cwd, concatTarget);              // 1. gulp-concat
    const fileRelative = pathApi.relative(cwd, filePath);          // 2.
    return pathApi.resolve(pathApi.resolve(cwd, '.'), fileRelative); // 3. dest(".")
}

function buildStylesBundle() {
    const originalCwd = process.cwd();
    process.chdir(projectDirectory); // the bundler resolves the concat target against process.cwd()
    try {
        return new bundler.Bundle(
            { name: 'styles', files: ['styles/main.css', 'styles/team-colors.css'] },
            bundlingSettings,
            //same value PerformBundleProcess builds - note path.join keeps the trailing separator,
            //which Bundle relies on when it joins the base path and the output directory together
            path.join(projectDirectory, './wwwroot/')
        );
    } finally {
        process.chdir(originalCwd);
    }
}

test('a bundle hands gulp-concat an output path relative to the cwd', () => {
    const bundle = buildStylesBundle();

    assert.ok(
        !path.isAbsolute(bundle.OutputPathRelative),
        'concat target must be relative, otherwise path.join() in gulp-concat doubles it on Linux: ' + bundle.OutputPathRelative
    );
    assert.equal(
        path.resolve(projectDirectory, bundle.OutputPathRelative),
        path.normalize(bundle.OutputPath),
        'the relative target must resolve back to the bundle\'s absolute output path'
    );
});

test('a bundle lands in wwwroot/content/css on a POSIX (CI/Linux) layout', () => {
    const bundle = buildStylesBundle();
    // the same relative target as Linux would build, using forward slashes
    const relativeTarget = bundle.OutputPathRelative.split(path.sep).join('/');
    const expected = '/opt/build/repo/src/website/wwwroot/content/css/styles.min.css';

    assert.equal(resolveWritePath(path.posix, '/opt/build/repo/src/website', relativeTarget), expected);
});

test('a bundle lands in wwwroot/content/css on a Windows layout', () => {
    const bundle = buildStylesBundle();
    const expected = path.join(projectDirectory, 'wwwroot', 'content', 'css', 'styles.min.css');

    assert.equal(resolveWritePath(path.win32, projectDirectory, bundle.OutputPathRelative), expected);
});