//STORAGE FUNCTIONS Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
var gameStorage = {
    storageAvailable: function (type) {
        try {
            var storage = window[type],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
            return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                storage.length !== 0;
        }
    },

    clearLocalStorage: function () {
        localStorage.clear();
        console.log('STORAGE CLEARED!');
    },

    //save to localStorage
    populateStorage: function (item, data) {
        localStorage.setItem(item, data);

        console.log(item + ' saved a value of ' + data);
    },

    getStorage: function (item) {
        var itemValue = localStorage.getItem(item);

        return itemValue;
    },

    //must parse arrays from string
    getArrayStorage: function (item) {
        var itemValue = JSON.parse(localStorage.getItem(item));

        return itemValue;
    },

    //test whether the storage object has already been populated
    saveGetData: function (item, data, overwrite) {
        //if the item doesn't have a value or overwrite flag is set to true, populate localStorage with key/value pair
        if (overwrite || !localStorage.getItem(item)) {
            gameStorage.populateStorage(item, data);
            console.log('item: %s, data: %s', item, data);
        }
        else if (localStorage.getItem(item)) {
            gameStorage.getStorage(item);
        }
    },

    getAllStorage: function () {
        console.log('========STORAGE=========');
        let currentQuarter = gameStorage.getStorage('currentQuarter');
        let currentDown = gameStorage.getStorage('currentDown');
        let ballSpotStart = gameStorage.getStorage('ballSpotStart');
        let yardsTraveled = gameStorage.getStorage('yardsTraveled');
        let yardsToFirst = gameStorage.getStorage('yardsToFirst');
        let currentTeamWithBall = gameStorage.getStorage('currentTeamWithBall');
        let teamPlayHistory = gameStorage.getArrayStorage('teamPlayHistory');
        let homeTeamID = gameStorage.getStorage('homeTeamID');
        let homeTeamTimeOuts = gameStorage.getStorage('homeTeamTimeOuts');
        let homeTeamScore = gameStorage.getStorage('homeTeamScore');
        let awayTeamID = gameStorage.getStorage('awayTeamID');
        let awayTeamTimeOuts = gameStorage.getStorage('awayTeamTimeOuts');
        let awayTeamScore = gameStorage.getStorage('awayTeamScore');
        console.log('currentQuarter: ' + currentQuarter);
        console.log('currentDown: ' + currentDown);
        console.log('ballSpotStart: ' + ballSpotStart);
        console.log('yardsTraveled: ' + yardsTraveled);
        console.log('yardsToFirst: ' + yardsToFirst);
        console.log('currentTeamWithBall: ' + currentTeamWithBall);
        console.log('teamPlayHistory ARRAY: ' + teamPlayHistory);
        console.log('homeTeamID: ' + homeTeamID);
        console.log('homeTeamTimeOuts: ' + homeTeamTimeOuts);
        console.log('homeTeamScore: ' + homeTeamScore);
        console.log('awayTeamID: ' + awayTeamID);
        console.log('awayTeamTimeOuts: ' + awayTeamTimeOuts);
        console.log('awayTeamScore: ' + awayTeamScore);
        console.log('========END STORAGE=========');

        //set javascript/knockout variables to stored values
        self.currentQuarter(currentQuarter);
        self.currentDown(currentDown);
        self.ballSpotStart(ballSpotStart);
        self.yardsTraveled(yardsTraveled);
        self.yardsToFirst(yardsToFirst);
        self.currentTeamWithBall(currentTeamWithBall);

        if (teamPlayHistory) {
            self.teamPlayHistory(teamPlayHistory);
        }

        self.homeTeamID(homeTeamID);
        self.homeTeamTimeOuts(homeTeamTimeOuts);
        self.homeTeamScore(homeTeamScore);
        self.awayTeamID(awayTeamID);
        self.awayTeamTimeOuts(awayTeamTimeOuts);
        self.awayTeamScore(awayTeamScore);
    },

    saveGame: function () {
        let overwrite = true;
        gameStorage.saveGetData('currentQuarter', self.currentQuarter(), overwrite);
        gameStorage.saveGetData('currentDown', self.currentDown(), overwrite);
        gameStorage.saveGetData('ballSpotStart', self.ballSpotStart(), overwrite);
        gameStorage.saveGetData('yardsTraveled', self.yardsTraveled(), overwrite);
        gameStorage.saveGetData('yardsToFirst', self.yardsToFirst(), overwrite);
        gameStorage.saveGetData('currentTeamWithBall', self.currentTeamWithBall(), overwrite);
        gameStorage.saveGetData('teamPlayHistory', JSON.stringify(self.teamPlayHistory()), overwrite); //must stringify arrays
        gameStorage.saveGetData('homeTeamID', self.homeTeamID(), overwrite);
        gameStorage.saveGetData('homeTeamTimeOuts', self.homeTeamTimeOuts(), overwrite);
        gameStorage.saveGetData('homeTeamScore', self.homeTeamScore(), overwrite);
        gameStorage.saveGetData('awayTeamID', self.awayTeamID(), overwrite);
        gameStorage.saveGetData('awayTeamTimeOuts', self.awayTeamTimeOuts(), overwrite);
        gameStorage.saveGetData('awayTeamScore', self.awayTeamScore(), overwrite);

        gameStorage.getAllStorage();
    },

    getSavedData: function getSavedData() {
        if (gameStorage.storageAvailable('localStorage')) {
            gameStorage.getAllStorage();
        }
        else {
            console.log('localStorage is not available');
        }
    }
};
//END STORAGE FUNCTIONS