(function ($) {
    var self = this;

    self.ResetGame = function () {
        gameStorage.clearLocalStorage();
    };
    self.SaveGame = function () {
        gameStorage.saveGame();
    };
    self.GetGameSaves = function () {
        gameStorage.getSavedData();
    };
}) (jQuery);