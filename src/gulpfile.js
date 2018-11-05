//TODO: 11/5/2018 - THIS IS NOT CUSTOMIZED FOR THIS PROJECT
/// <binding AfterBuild='fullprocess' />

/*
This file in the main entry point for defining Gulp tasks and using Gulp plugins.
Click here to learn more. http://go.microsoft.com/fwlink/?LinkId=518007
also reference: https://gulpjs.com/docs/en/getting-started/creating-tasks
*/

var paths = {
    webroot: "",
    bundleDefinitionRoot: "./website/Config/BundleDefinitions/",
    scriptsDestDirectory: "website/content/js/",
    stylesDestDirectory: "website/content/css/"
};

// flag to only updated bundle files if the script file is newer
var onlyNewerFiles = true;

var gulp = require("gulp");
    //concat = require("gulp-concat"),
    //cssmin = require("gulp-cssmin"),
    //uglify = require("gulp-uglify"),
    //newer = require("gulp-newer");

var scriptBundles = [],
    styleBundles = [],
    bundlesLib = require(paths.bundleDefinitionRoot + "bundles-lib.json"),
    bundlesModules = require(paths.bundleDefinitionRoot + "bundles-modules.json"),
    bundlesViewModels = require(paths.bundleDefinitionRoot + "bundles-viewmodels.json"),
    stylesheetDefinitions = require(paths.bundleDefinitionRoot + "stylesheet-definitions.json");

scriptBundles = scriptBundles.concat(bundlesLib.scripts);
scriptBundles = scriptBundles.concat(bundlesModules.scripts);
scriptBundles = scriptBundles.concat(bundlesViewModels.scripts);

styleBundles = styleBundles.concat(bundlesLib.styles);
styleBundles = styleBundles.concat(bundlesModules.styles);
styleBundles = styleBundles.concat(bundlesViewModels.styles);
styleBundles = styleBundles.concat(stylesheetDefinitions.styles);

function BuildFiles(bundle, bundlesList) {
    var bundleFiles = [];

    if (bundle && bundle.files && bundle.files.length) {
        for (var j = 0; j < bundle.files.length; j++) {
            //if "file" is found as a bundle name, recursively get that bundle's files
            var existingBundle = bundlesList.filter(function (b) {
                return b.name === bundle.files[j];
            });

            if (existingBundle && existingBundle.length) {
                bundleFiles = bundleFiles.concat(BuildFiles(existingBundle[0], bundlesList));
            } else {
                bundleFiles.push(bundle.files[j]);
            }
        }
    }

    return bundleFiles;
}

gulp.task("bundlejs", gulp.parallel(function () {

    if (scriptBundles && scriptBundles.length) {
        for (var i = 0; i < scriptBundles.length; i++) {
            var scriptBundle = scriptBundles[i];
            if (scriptBundle.referenceOnly) {
                console.log("Bundle for " + scriptBundle.name + " is set to only be referenced. No bundling for this bundle.")
                continue;
            }

            console.log("Bundling " + scriptBundle.name + " ... ");

            var files = BuildFiles(scriptBundle, scriptBundles); //get list of files for this bundle

            var dest = paths.scriptsDestDirectory;
            dest += scriptBundle.subpath || "";

            if (dest.slice(-1) != "/") { dest += "/"; }

            dest += scriptBundle.filename || (scriptBundle.name + ".min.js");

            var gulpTask = gulp.src(files, { base: "." });

            if (onlyNewerFiles) {
                gulpTask = gulpTask.pipe(newer(dest));
            }

            gulpTask.pipe(concat(dest))
                .pipe(uglify())
                .pipe(gulp.dest("."));
        }
    }
    else {
        console.log("No JS bundles found.");
    }

    console.log("Bundling JS process complete.");
}));

gulp.task("bundlecss", gulp.parallel(function () {

    if (styleBundles && styleBundles.length) {
        for (var i = 0; i < styleBundles.length; i++) {
            var styleBundle = styleBundles[i];
            if (styleBundle.referenceOnly) {
                console.log("Bundle for " + styleBundle.name + " is set to only be referenced. No bundling for this bundle.")
                continue;
            }

            console.log("Bundling " + styleBundle.name + " ... ");

            var files = BuildFiles(styleBundle, styleBundles); //get list of files for this bundle

            var dest = paths.stylesDestDirectory;
            dest += styleBundle.subpath || "";

            if (dest.slice(-1) != "/") { dest += "/"; }

            dest += styleBundle.filename || (styleBundle.name + ".min.css");

            gulp.src(files, { base: "." })
                .pipe(concat(dest))
                .pipe(cssmin())
                .pipe(gulp.dest("."));
        }
    }
    else {
        console.log("No CSS bundles found.");
    }

    console.log("Bundling CSS process complete.");
}));

gulp.task("fullprocess", gulp.parallel(["bundlejs", "bundlecss"]));

/*
function defaultTask(cb) {
    // place code for your default task here
    cb();
}

exports.default = defaultTask;
*/