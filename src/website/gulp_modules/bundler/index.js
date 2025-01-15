"use strict";

const { src, dest, series } = require("gulp");

let concat = require("gulp-concat"),
    cssmin = require("gulp-cssmin"),
    newer = require("gulp-newer"),
    terser = require("gulp-terser-js"),
    PluginError = require('plugin-error'),
    path = require('path'),
    async = require('async'),
    babel = require("gulp-babel"),
    logEnabled = false;

let PLUGIN_NAME = 'bundler';

function ToBool(value) {
    if (value === undefined) {
        return false;
    } else if (typeof value === 'boolean') {
        return value;
    } else if (typeof value === 'number') {
        value = value.toString();
    } else if (typeof value !== 'string') {
        return false;
    }

    switch (value.toLowerCase()) {
        case "true":
        case "yes":
        case "1":
            return true;
        default:
            return false;
    }
}

function Bundle(config, bundlingSettings, outputBasePath) {
    if (!config) {
        throw new PluginError(PLUGIN_NAME, "Bundle config paramater null.");
    }

    // force lowercase all config properties to remove case-sensitivity
    for (let prop in config) {
        let originalProp = prop;

        prop = prop.toLowerCase();

        if (prop !== originalProp) {
            config[prop] = config[originalProp];
            delete config[originalProp];
        }
    }

    if (!config.files || !config.files.length) {
        throw new PluginError(PLUGIN_NAME, "Bundle must have at least one file under Files reference.");
    }

    let _ext;

    for (let i = 0; i < config.files.length; i++) {
        _ext = /(?:\.([^.]+))?$/.exec(config.outputfilename || config.files[i])[1];
        if (_ext) {
            break;
        }
    }

    if (!_ext) {
        throw new PluginError(PLUGIN_NAME, "Extension not determined on bundle definition. Provide OutputFileName or at least one file in Files list with a valid file extension.");
    }

    this.Extension = _ext.toLowerCase();
    this.Name = config.name;
    this.OutputFileName = config.outputfilename || this.Name.replace(" ", "_") + ".min." + this.Extension;
    this.SubPath = config.subpath || "";
    this.Files = config.files;
    this.ReferenceOnly = ToBool(config.referenceonly);
    this.StaticOutputPath = config.staticoutputpath;
    this.OutputDirectory = config.outputdirectory || bundlingSettings.OutputDirectories[this.Extension] || "";

    if (this.OutputDirectory.slice(-1) !== "/") {
        this.OutputDirectory += "/";
    }

    // build output path
    let _outputPath = (outputBasePath || "") + this.OutputDirectory + this.SubPath;
    if (_outputPath.slice(-1) !== "/") {
        _outputPath += "/";
    }
    _outputPath += this.OutputFileName;

    this.OutputPath = _outputPath;

    this.Concat = function () {
        return concat(this.OutputPath);
    };

    // any custom properties found on in the json config for this bundle
    for (let prop in config) {
        if (!this[prop]) {
            this[prop] = config[prop];
        }
    }
}

// recursively build out list of files in a bundle
function BuildListOfFiles(bundle, bundlesList, sourceBasePath) {
    let bundleFiles = [];

    if (bundle && bundle.Files && bundle.Files.length) {
        for (let i = 0; i < bundle.Files.length; i++) {

            // if "file" is found as a bundle name, recursively get that bundle's files
            let existingBundle = bundlesList.filter(function (b) {
                return b.Name === bundle.Files[i];
            });

            if (existingBundle && existingBundle.length) {
                bundleFiles = bundleFiles.concat(BuildListOfFiles(existingBundle[0], bundlesList, sourceBasePath));
            } else {
                let file = bundle.Files[i];
                if (sourceBasePath && sourceBasePath.length)
                    file = sourceBasePath + file;
                bundleFiles.push(file);
            }
        }
    }

    return bundleFiles;
}

function BuildBundleTasks(bundles, basePath, newerOnly) {
    let bundleTasks = [];

    if (bundles && bundles.length) {
        let completedCount = 0,
            totalBundleCount = bundles.length;

        // intro task
        bundleTasks.push(function (next) {
            Log("*** Starting bundling. Newer Only: " + newerOnly + " ***");
            Log("Bundle count: " + totalBundleCount);
            if (next)
                next();
        });

        // create a task/function for each bundle
        for (let i = 0; i < totalBundleCount; i++) {
            let bundle = bundles[i];

            if (bundle.ReferenceOnly) {
                Log("Bundle for " + bundle.Name + " is set to only be referenced. No bundling for this bundle.");

                if (bundle.StaticOutputPath) {
                    (function (bundle) {
                        bundleTasks.push(function (next) {
                            src(basePath + bundle.StaticOutputPath, { base: "." })
                                .on("end", function () {
                                    Log("Bundling " + bundle.Name + " ... ");
                                    Log(" - Bundle " + bundle.Name + " marked as have a *static output* of '" + bundle.StaticOutputPath + "'. It will have this static output copied to destination.");
                                })
                                .pipe(bundle.Concat())
                                .pipe(dest("."))
                                .on("end", function () {
                                    completedCount++;
                                    Log(" - Static Output '" + bundle.StaticOutputPath + "' copied to '" + bundle.OutputPath + "'.");
                                    if (next)
                                        next();
                                });
                        });
                    })(bundle);
                } else {
                    completedCount++;
                }

                continue;
            }

            // create new function for this bundle and add it to the list
            // this list will be called called in syncronous-friendly way
            bundleTasks.push(function (next) {
                let files = BuildListOfFiles(bundle, bundles, basePath),
                    gulpTask = src(files, { base: "." });

                if (newerOnly) {
                    gulpTask.pipe(newer(bundle.OutputPath));
                }

                gulpTask
                    .on("end", function () {
                        Log("Bundling " + bundle.Name + " ... ");
                        for (let i = 0; i < files.length; i++) {
                            Log(" - Includes file " + files[i] + ".");
                        }
                    })
                    .pipe(bundle.Concat())
                    .pipe(dest("."))
                    .on("end", function () {
                        completedCount++;

                        if (completedCount === totalBundleCount) {
                            Log("*** Bundling process complete. ***");
                        }

                        // call next step for async logic
                        if (next)
                            next();
                    });
            });
        }
    } else {
        // just return callback to indicate no bundles were found
        bundleTasks.push(function (next) {
            Log("No bundles found.");
            if (next)
                next();
        });
    }

    return bundleTasks;
}

function Log(message) {
    if (logEnabled) {
        console.log(message);
    }
}

function PerformBundleProcess(options, onComplete) {
    // validate options
    if (!options) {
        throw new PluginError(PLUGIN_NAME, "Options object required.");
    }

    if (!options.bundlingSettings) {
        throw new PluginError(PLUGIN_NAME, "Options values bundlingSettings required.");
    }

    if (!options.basePath) {
        options.basePath = "./";
    }

    if (!options.projectDirectory) {
        options.projectDirectory = process.cwd();
    } else {
        options.projectDirectory = path.join(process.cwd(), options.projectDirectory);
    }

    options.basePath = path.join(options.projectDirectory, options.basePath);
    logEnabled = options.logEnabled === true;

    Log("Initializing bundling process...");
    Log("Options:");

    for (var prop in options) {
        Log(" - " + prop + ": " + options[prop]);
    }

    let tasks = [];

    // verify and build configuration
    let bundleConfigPath = path.join(options.projectDirectory, options.bundlingSettings.BundlesConfigFilePath);
    let bundleConfigs = require(bundleConfigPath);
    if (toString.call(bundleConfigs) !== "[object Array]") {
        throw new PluginError(PLUGIN_NAME, "Bundle configuration invalid. Root configuration at " + bundleConfigPath + " must be an array.");
    }

    let bundles = bundleConfigs.map(function (item) {
        return new Bundle(item, options.bundlingSettings, options.basePath);
    });

    let bundleTasks = BuildBundleTasks(bundles, options.basePath, ToBool(options.newerOnly));
    for (let i = 0; i < bundleTasks.length; i++) {
        tasks.push(bundleTasks[i]);
    }

    if (options.compileES5 === true) {
        let appJsSubFolders = ["/modules", "/viewmodels"];

        for (let i = 0; i < appJsSubFolders.length; i++) {
            tasks.push(function CompileJsforES5(next) {
                Log("** Compiling '" + appJsSubFolders[i] + "' for ES5 **");
                Log("Babel for folder '" + appJsSubFolders[i] + "'...");
                let dir = path.join(options.basePath, options.bundlingSettings.OutputDirectories["js"], appJsSubFolders[i]);

                src(dir + '/**/*.js')
                    .pipe(babel({
                        "presets": [
                            [
                                "@babel/preset-env",
                                {
                                    "useBuiltIns": false,
                                    "modules": false,
                                    "targets": "> 0.25%, not dead",
                                    "debug": false
                                }
                            ]
                        ]
                    }))
                    .pipe(dest(dir))
                    .on("end", function () {
                        Log("** ES5 Compile Complete **");

                        // call next step for async logic
                        if (next)
                            next();
                    });
            });
        }
    }

    if (options.minify === true) {
        tasks.push(function MinifiyCss(next) {
            let dir = path.join(options.basePath, options.bundlingSettings.OutputDirectories["css"]);
            Log("** Minifying CSS Files **");

            src(dir + "/**/*.min.css")
                .pipe(cssmin())
                .pipe(dest(dir))
                .on("end", function () {
                    Log("** CSS Files Minified **");

                    // call next step for async logic
                    if (next)
                        next();
                });
        });

        tasks.push(function MinifiyJs(next) {
            let dir = path.join(options.basePath, options.bundlingSettings.OutputDirectories["js"]);
            Log("** Minifying JS Files **");

            src(dir + "/**/*.js")
                .pipe(terser())
                .pipe(dest(dir))
                .on("end", function () {
                    Log("** JS Files Minified **");

                    // call next step for async logic
                    if (next)
                        next();
                });
        });
    }

    // create single task around list of tasks via an async series
    // ref - https://stackoverflow.com/a/27463293/9882811
    var bundleTask = function (onComplete) {
        async.series(tasks, onComplete);
    };

    bundleTask.displayName = "Bundling Process";

    // series is not really necessary here since only one official task is called
    // but keeping so gulp plays nicely
    return series(bundleTask);
}

module.exports = PerformBundleProcess;