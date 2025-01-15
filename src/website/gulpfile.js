/// <binding Clean='BuildAssets' ProjectOpened='ProjectOpen' />
"use strict";

const { src, dest, watch, series } = require("gulp");

let bundler = require("./gulp_modules/bundler"),
    cleaner = require("./gulp_modules/cleaner"),
    helper = require("./gulp_modules/helper"),
    transformer = require("json-config-transform"),
    sass = require('gulp-sass')(require('sass')),
    sassGlob = require("./gulp_modules/sassGlobber"),
    sourcemaps = require('gulp-sourcemaps'),
    imagemin = require('gulp-imagemin'),
    autoprefixer = require('gulp-autoprefixer');

function Clean(onComplete) {
    cleaner({
        basePath: "./wwwroot/",
        directories: [
            "content/js",
            "content/css"
        ]
    });
    onComplete();
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
    return src(source).pipe(dest(destination));
}

// TODO - is jquery ui static css still needed?
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

function SassCompile(sourceFile, destinationFolder) {
    console.log("Compiling Sass: " + sourceFile + " -> " + destinationFolder);

    return src(sourceFile)
        .pipe(sourcemaps.init())
        .pipe(sassGlob())
        .pipe(sass({ outputStyle: 'expanded' }).on('error', console.log))
        .pipe(autoprefixer())
        .pipe(sourcemaps.write('./'))
        .pipe(dest(destinationFolder));
}

//const Sass = series(
//    () => SassCompile('./wwwroot/sass/styles.scss', './wwwroot/content/css'),
//    () => SassCompile('./wwwroot/sass/richtext-editor-styles.scss', './wwwroot/content/css'));

//function MinifyImages() {
//    return src('./wwwroot/content/images/src/**')
//        .pipe(imagemin())
//        .pipe(dest('./wwwroot/content/images/min'))
//}

//function WatchTask() {
//    watch('./wwwroot/sass/**', Sass);
//    watch('./wwwroot/content/images/src/**', MinifyImages);
//}


//exports.ProjectOpen = series(
//    Clean,
//    Sass,
//    DeployAssetFiles,
//    MinifyImages,
//    WatchTask
//);
//exports.BuildAllAssets = series(Clean, Sass, MinifyImages, DeployAssetFiles);
exports.ProjectOpen = series(Clean, DeployAssetFiles);
exports.BuildAllAssets = series(Clean, DeployAssetFiles);
exports.Bundle = DeployAssetFiles;
exports.TransformJson = TransformJson;