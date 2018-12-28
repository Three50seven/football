//GAME VARIABLES USED IN A GAME INSTANCE
MODULES.GameVariables = (function () {
    var _totalPlayCount = 1;
    var _diceSumTotal = 0;
    var _teams = new TeamArray();
    var _timeIntervalCountDown = 1000; //Modify this value to set how fast the clock counts down for a quarter, 1000 = 1 second, 500 = half second, etc.
    var _kickoffSliderDifficulty = 10; //change to higher number to slow down kick sliders, change to lower number to speed up    

    //object constructor for a new teams array, stored in, MODULES.GameVariables.Teams
    function TeamArray() {
        var teamArray = new Array();

        teamArray.push(new MODULES.Constructors.TeamArrayRecord(1, 'cardinals', 'Arizona', 'Cardinals'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(2, 'falcons', 'Atlanta', 'Falcons'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(3, 'ravens', 'Baltimore', 'Ravens'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(4, 'bills', 'Buffalo', 'Bills'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(5, 'panthers', 'Carolina', 'Panthers'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(6, 'bears', 'Chicago', 'Bears'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(7, 'bengals', 'Cincinnati', 'Bengals'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(8, 'browns', 'Cleveland', 'Browns'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(9, 'cowboys', 'Dallas', 'Cowboys'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(10, 'broncos', 'Denver', 'Broncos'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(11, 'lions', 'Detroit', 'Lions'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(12, 'packers', 'Green Bay', 'Packers'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(13, 'texans', 'Houston', 'Texans'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(14, 'colts', 'Indianapolis', 'Colts'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(15, 'jaguars', 'Jacksonville', 'Jaguars'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(16, 'chiefs', 'Kansas City', 'Chiefs'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(17, 'chargers', 'Los Angeles', 'Chargers'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(18, 'rams', 'Los Angeles', 'Rams'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(19, 'dolphins', 'Miami', 'Dolphins'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(20, 'vikings', 'Minnesota', 'Vikings'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(21, 'patriots', 'New England', 'Patriots'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(22, 'saints', 'New Orleans', 'Saints'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(23, 'giants', 'New York', 'Giants'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(24, 'jets', 'New York', 'Jets'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(25, 'raiders', 'Oakland', 'Raiders'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(26, 'eagles', 'Philadelphia', 'Eagles'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(27, 'steelers', 'Pittsburgh', 'Steelers'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(28, 'forty-niners', 'San Francisco', '49ers'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(29, 'seahawks', 'Seattle', 'Seahawks'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(30, 'buccaneers', 'Tampa Bay', 'Buccaneers'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(31, 'titans', 'Tennessee', 'Titans'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(32, 'redskins', 'Washington', 'Redskins'));

        return teamArray;
    }

    return {
        TotalPlayCount: _totalPlayCount,
        DiceSumTotal: _diceSumTotal,
        Teams: _teams,
        TimeIntervalCountDown: _timeIntervalCountDown,
        KickoffSliderDifficulty: _kickoffSliderDifficulty
    };

})();