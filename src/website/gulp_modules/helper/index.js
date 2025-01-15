"use strict";

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
        case "y":
        case "t":
            return true;
        default:
            return false;
    }
}

function Argument(args, key, defaultValue) {
    let self = this;

    function _getArgumentValue(args, key) {
        let index = args.indexOf(key);

        if (index > -1 && args.length > index + 1) {
            return args[index + 1];
        }

        return undefined;
    }

    self.Value = defaultValue;
    self.Argument = _getArgumentValue(args, key);

    if (self.Argument !== undefined)
        self.Value = self.Argument;
}

function BoolArgument(args, key, defaultValue) {
    let self = this;

    function _getArgumentValue(args, key) {
        let index = args.indexOf(key);

        if (index > -1 && args.length > index + 1) {
            return args[index + 1];
        }

        return undefined;
    }

    self.Value = defaultValue === undefined ? false : defaultValue;
    self.Argument = _getArgumentValue(args, key);

    if (self.Argument !== undefined)
        self.Value = ToBool(self.Argument);
}

exports.ToBool = ToBool;
exports.Argument = function (args, key, defaultValue) {
    return new Argument(args, key, defaultValue);
};
exports.ArgumentAsBool = function (args, key, defaultValue) {
    return new BoolArgument(args, key, defaultValue);
};