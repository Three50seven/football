/// <binding Clean='BuildAssets' ProjectOpened='ProjectOpen' />
"use strict";

const fs = require("fs");
const { src, dest, watch, series } = require("gulp");

let bundler = require("./gulp_modules/bundler"),
    cleaner = require("./gulp_modules/cleaner"),
    helper = require("./gulp_modules/helper"),
    transformer = require("json-config-transform");

function Clean() {
  return cleaner({
    basePath: "./wwwroot/",
    directories: ["content/js", "content/css"]
  });
}

function BundleAssets(options, onComplete) {
    console.log(" **** Bundling Assets ****");

    let settings = Object.assign({}, {
        basePath: "./wwwroot/",
        projectDirectory: null,
        appsettingsPath: "./appsettings.json",
        newerOnly: false,
    }, options);

    return bundler({
        basePath: settings.basePath,
        projectDirectory: settings.projectDirectory,
        bundlingSettings: require(settings.appsettingsPath).Bundling,
        minify: helper.ArgumentAsBool(process.argv, "--minify", true).Value,
        compileES5: helper.ArgumentAsBool(process.argv, "--compile-es5", false).Value,
        newerOnly: settings.newerOnly,
        logEnabled: helper.ArgumentAsBool(process.argv, "--logEnabled", true).Value
    })(onComplete);
}

function CopyProjectFiles(source, destination) {
    console.log("Copying Project Files: " + source + " -> " + destination);
    let sourceRoot = source.split("*")[0];
    if (sourceRoot && !fs.existsSync(sourceRoot)) {
        console.log("Skipping missing source: " + sourceRoot);
        return Promise.resolve();
    }

    return src(source, { allowEmpty: true }).pipe(dest(destination));
}

const DeployAssetFiles = series(
    (onComplete) => BundleAssets({}, onComplete),
    () => CopyProjectFiles(
        "./wwwroot/scripts/Lib/Minified/**",
        "./wwwroot/content/js/lib/"),
    () => CopyProjectFiles(
        "./wwwroot/sass/lib/static/**",
        "./wwwroot/content/css/"));

function TransformJson(onComplete) {
    // more than meets the eye...
    transformer({
        environment: helper.Argument(process.argv, "--env", "Local").Value,
        configSource: helper.Argument(process.argv, "--configSource", "./appsettings.json").Value,
        outputPath: helper.Argument(process.argv, "--outputfile", "./appsettings_output.json").Value,
        logEnabled: helper.ArgumentAsBool(process.argv, "--logEnabled", true).Value,
        indent: helper.ArgumentAsBool(process.argv, "--indent", true).Value
    });
    onComplete();
}

exports.ProjectOpen = series(Clean, DeployAssetFiles);
exports.BuildAllAssets = series(Clean, DeployAssetFiles);
exports.Bundle = DeployAssetFiles;
exports.TransformJson = TransformJson;
