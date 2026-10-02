//GAME VARIABLES USED IN A GAME INSTANCE
MODULES.GameVariables = (function () {
    var _totalPlayCount = 1;
    var _diceSumTotal = 0;
    var _teams = new TeamArray();
    var _timeIntervalCountDown = 1000; //Modify this value to set how fast the clock counts down for a quarter, 1000 = 1 second, 500 = half second, etc.
    var _kickoffSliderDifficulty = 5; //change to higher number to slow down kick sliders, change to lower number to speed up    

    //object constructor for a new teams array, stored in, MODULES.GameVariables.Teams
    function TeamArray() {
        var teamArray = new Array();

        teamArray.push(new MODULES.Constructors.TeamArrayRecord(1, 'cardinals', 'Arizona', 'Cardinals', 'ARI'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(2, 'falcons', 'Atlanta', 'Falcons', 'ATL'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(3, 'ravens', 'Baltimore', 'Ravens', 'BAL'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(4, 'bills', 'Buffalo', 'Bills', 'BUF'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(5, 'panthers', 'Carolina', 'Panthers', 'CAR'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(6, 'bears', 'Chicago', 'Bears', 'CHI'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(7, 'bengals', 'Cincinnati', 'Bengals', 'CIN'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(8, 'browns', 'Cleveland', 'Browns', 'CLE'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(9, 'cowboys', 'Dallas', 'Cowboys', 'DAL'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(10, 'broncos', 'Denver', 'Broncos', 'DEN'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(11, 'lions', 'Detroit', 'Lions', 'DET'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(12, 'packers', 'Green Bay', 'Packers', 'GB'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(13, 'texans', 'Houston', 'Texans', 'HOU'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(14, 'colts', 'Indianapolis', 'Colts', 'IND'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(15, 'jaguars', 'Jacksonville', 'Jaguars', 'JAX'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(16, 'chiefs', 'Kansas City', 'Chiefs', 'KC'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(17, 'chargers', 'Los Angeles', 'Chargers', 'LAC'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(18, 'rams', 'Los Angeles', 'Rams', 'LAR'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(19, 'dolphins', 'Miami', 'Dolphins', 'MIA'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(20, 'vikings', 'Minnesota', 'Vikings', 'MIN'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(21, 'patriots', 'New England', 'Patriots', 'NE'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(22, 'saints', 'New Orleans', 'Saints', 'NO'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(23, 'giants', 'New York', 'Giants', 'NYG'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(24, 'jets', 'New York', 'Jets', 'NYJ'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(25, 'raiders', 'Las Vegas', 'Raiders', 'LV'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(26, 'eagles', 'Philadelphia', 'Eagles', 'PHI'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(27, 'steelers', 'Pittsburgh', 'Steelers', 'PIT'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(28, 'forty-niners', 'San Francisco', '49ers', 'SF'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(29, 'seahawks', 'Seattle', 'Seahawks', 'SEA'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(30, 'buccaneers', 'Tampa Bay', 'Buccaneers', 'TB'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(31, 'titans', 'Tennessee', 'Titans', 'TEN'));
        teamArray.push(new MODULES.Constructors.TeamArrayRecord(32, 'commanders', 'Washington', 'Commanders', 'WAS'));

        teamArray = teamArray.sort((a, b) => a.teamCity.localeCompare(b.teamCity) || a.teamMascot.localeCompare(b.teamMascot));

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