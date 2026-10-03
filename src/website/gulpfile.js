/// <binding Clean='BuildAllAssets' ProjectOpened='ProjectOpen' />
"use strict";

const fs = require("fs");
const { src, dest, series } = require("gulp");

const bundler = require("./gulp_modules/bundler");
const cleaner = require("./gulp_modules/cleaner");
const helper = require("./gulp_modules/helper");
const transformer = require("json-config-transform");

function Clean() {
    // The cleaner module is synchronous and returns nothing,
    // so wrap it in a Promise for Gulp.
    return Promise.resolve(
        cleaner({
            basePath: "./wwwroot/",
            directories: ["content/js", "content/css"]
        })
    );
}

function BundleAssets(options, onComplete) {
    console.log(" **** Bundling Assets ****");

    const settings = Object.assign(
        {
            basePath: "./wwwroot/",
            projectDirectory: null,
            appsettingsPath: "./appsettings.json",
            newerOnly: false
        },
        options
    );

    return bundler({
        basePath: settings.basePath,
        projectDirectory: settings.projectDirectory,
        bundlingSettings: require(settings.appsettingsPath).Bundling,

        // Minify CSS/JS bundles
        minify: helper.ArgumentAsBool(
            process.argv,
            "--minify",
            true
        ).Value,

        compileES5: helper.ArgumentAsBool(
            process.argv,
            "--compile-es5",
            false
        ).Value,

        newerOnly: settings.newerOnly,

        logEnabled: helper.ArgumentAsBool(
            process.argv,
            "--logEnabled",
            true
        ).Value
    })(onComplete);
}

function CopyProjectFiles(source, destination) {
    console.log("Copying Project Files: " + source + " -> " + destination);

    const sourceRoot = source.split("*")[0];

    if (sourceRoot && !fs.existsSync(sourceRoot)) {
        console.log("Skipping missing source: " + sourceRoot);
        return Promise.resolve();
    }

    return src(source, { allowEmpty: true })
        .pipe(dest(destination));
}

/*
 * Asset pipeline
 *
 * Source:
 *   wwwroot/styles/**//*.css
 *   wwwroot/scripts/**//*.js
 *
 * The bundler is responsible for combining and minifying
 * the CSS and JavaScript according to the Bundling configuration
 * in appsettings.json.
 */
const DeployAssetFiles = series(
    (onComplete) => BundleAssets({}, onComplete)
);

function TransformJson(onComplete) {
    transformer({
        environment: helper.Argument(
            process.argv,
            "--env",
            "Local"
        ).Value,

        configSource: helper.Argument(
            process.argv,
            "--configSource",
            "./appsettings.json"
        ).Value,

        outputPath: helper.Argument(
            process.argv,
            "--outputfile",
            "./appsettings_output.json"
        ).Value,

        logEnabled: helper.ArgumentAsBool(
            process.argv,
            "--logEnabled",
            true
        ).Value,

        indent: helper.ArgumentAsBool(
            process.argv,
            "--indent",
            true
        ).Value
    });

    onComplete();
}

exports.ProjectOpen = series(
    Clean,
    DeployAssetFiles
);

exports.BuildAllAssets = series(
    Clean,
    DeployAssetFiles
);

exports.Bundle = DeployAssetFiles;

exports.TransformJson = TransformJson;
