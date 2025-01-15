"use strict";

let del = require('del'),
    path = require('path');

function CleanOutputDirectories(baseDir, directories) {
    function _clean(dir) {
        console.log("* Cleaning output directory '" + dir + "'... *");
        const deletedPaths = del.sync([dir + "/**", "!" + dir], { force: true, dryRun: false });
        console.log('Files and directories removed:\n', deletedPaths.join('\n'));
        console.log("* Cleaning complete. *");
    }

    if (directories) {
        for (let i = 0; i < directories.length; i++) {
            _clean(path.posix.join(baseDir, directories[i]));
        }
    }
}

function PerformClean(options) {
    if (!options) {
        options = {
            basePath: "./",
            directories: []
        };
    }

    CleanOutputDirectories(options.basePath, options.directories);
}

module.exports = PerformClean;