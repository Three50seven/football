﻿//CONSTRUCTORS
//object constructor for gamePlayStats record
function GamePlayStatRecord(teamId, teamName, totalPlayCount, totalYardsRushing, totalYardsPassing, totalTimePossession, totalTurnovers, totalFirstDowns) {
    this.teamId = teamId;
    this.teamName = teamName;
    this.totalPlayCount = totalPlayCount;
    this.totalYardsRushing = totalYardsRushing;
    this.totalYardsPassing = totalYardsPassing;
    this.totalTimePossession = totalTimePossession;
    this.totalTurnovers = totalTurnovers;
    this.totalFirstDowns = totalFirstDowns;
    this.fullTeamName = getFullTeamName(this.teamName, this.teamId);
    this.totalTimePossessionDisplay = UTILITIES.getTimeDisplay(this.totalTimePossession); //TODO: BUG, Not correctly displaying time as 00:00
}

//object constructor for gameBoxScore
function GameBoxScoreRecord(teamId, teamName, firstQuarterScore, secondQuarterScore, thirdQuarterScore, fourthQuarterScore, overtimeScore) {
    this.teamId = teamId;
    this.teamName = teamName;
    this.firstQuarterScore = firstQuarterScore;
    this.secondQuarterScore = secondQuarterScore;
    this.thirdQuarterScore = thirdQuarterScore;
    this.fourthQuarterScore = fourthQuarterScore;
    this.overtimeScore = overtimeScore;
    this.fullTeamName = getFullTeamName(this.teamName, this.teamId);
    this.totalScore = function () {
        let first = this.firstQuarterScore ? this.firstQuarterScore : 0;
        let second = this.firstQuarterScore ? this.firstQuarterScore : 0;
        let third = this.firstQuarterScore ? this.firstQuarterScore : 0;
        let fourth = this.firstQuarterScore ? this.firstQuarterScore : 0;
        let ot = this.firstQuarterScore ? this.firstQuarterScore : 0;

        //return sum of all quarters for total
        return first + second + third + fourth + ot;
    };
}

//object constructor for new play result record
function PlayResult(yards, playText, isTurnover = false, playType = '') {
    this.yards = yards;
    this.playResultText = playText;
    this.isTurnover = isTurnover;
    this.playType = playType;
}

//object constructor for a new play history record, stored in array, self.teamPlayHistory()
function PlayHistory(playId, teamId, teamName, down, playCount, playYards, playResult, ballSpot) {
    this.playId = playId;
    this.totalPlayCount = _totalPlayCount;
    this.teamId = teamId;
    this.teamName = teamName;
    this.down = down;
    this.playCount = playCount;
    this.playYards = playYards;
    this.playResult = playResult;
    this.ballSpot = ballSpot;
    this.fullTeamName = getFullTeamName(this.teamName, this.teamId);
}

//object constructor for a new teams array, stored in, _teams
function TeamArray() {
    var teamArray = new Array();

    teamArray.push(new TeamArrayRecord(1, 'cardinals', 'Arizona', 'Cardinals'));
    teamArray.push(new TeamArrayRecord(2, 'falcons', 'Atlanta', 'Falcons'));
    teamArray.push(new TeamArrayRecord(3, 'ravens', 'Baltimore', 'Ravens'));
    teamArray.push(new TeamArrayRecord(4, 'bills', 'Buffalo', 'Bills'));
    teamArray.push(new TeamArrayRecord(5, 'panthers', 'Carolina', 'Panthers'));
    teamArray.push(new TeamArrayRecord(6, 'bears', 'Chicago', 'Bears'));
    teamArray.push(new TeamArrayRecord(7, 'bengals', 'Cincinnati', 'Bengals'));
    teamArray.push(new TeamArrayRecord(8, 'browns', 'Cleveland', 'Browns'));
    teamArray.push(new TeamArrayRecord(9, 'cowboys', 'Dallas', 'Cowboys'));
    teamArray.push(new TeamArrayRecord(10, 'broncos', 'Denver', 'Broncos'));
    teamArray.push(new TeamArrayRecord(11, 'lions', 'Detroit', 'Lions'));
    teamArray.push(new TeamArrayRecord(12, 'packers', 'Green Bay', 'Packers'));
    teamArray.push(new TeamArrayRecord(13, 'texans', 'Houston', 'Texans'));
    teamArray.push(new TeamArrayRecord(14, 'colts', 'Indianapolis', 'Colts'));
    teamArray.push(new TeamArrayRecord(15, 'jaguars', 'Jacksonville', 'Jaguars'));
    teamArray.push(new TeamArrayRecord(16, 'chiefs', 'Kansas City', 'Chiefs'));
    teamArray.push(new TeamArrayRecord(17, 'chargers', 'Los Angeles', 'Chargers'));
    teamArray.push(new TeamArrayRecord(18, 'rams', 'Los Angeles', 'Rams'));
    teamArray.push(new TeamArrayRecord(19, 'dolphins', 'Miami', 'Dolphins'));
    teamArray.push(new TeamArrayRecord(20, 'vikings', 'Minnesota', 'Vikings'));
    teamArray.push(new TeamArrayRecord(21, 'patriots', 'New England', 'Patriots'));
    teamArray.push(new TeamArrayRecord(22, 'saints', 'New Orleans', 'Saints'));
    teamArray.push(new TeamArrayRecord(23, 'giants', 'New York', 'Giants'));
    teamArray.push(new TeamArrayRecord(24, 'jets', 'New York', 'Jets'));
    teamArray.push(new TeamArrayRecord(25, 'raiders', 'Oakland', 'Raiders'));
    teamArray.push(new TeamArrayRecord(26, 'eagles', 'Philadelphia', 'Eagles'));
    teamArray.push(new TeamArrayRecord(27, 'steelers', 'Pittsburgh', 'Steelers'));
    teamArray.push(new TeamArrayRecord(28, 'forty-niners', 'San Francisco', '49ers'));
    teamArray.push(new TeamArrayRecord(29, 'seahawks', 'Seattle', 'Seahawks'));
    teamArray.push(new TeamArrayRecord(30, 'buccaneers', 'Tampa Bay', 'Buccaneers'));
    teamArray.push(new TeamArrayRecord(31, 'titans', 'Tennessee', 'Titans'));
    teamArray.push(new TeamArrayRecord(32, 'redskins', 'Washington', 'Redskins'));

    return teamArray;
}

function TeamArrayRecord(teamId, teamColor, teamCity, teamMascot) {
    this.teamId = teamId;
    this.teamColor = teamColor;
    this.teamCity = teamCity;
    this.teamMascot = teamMascot;
    this.teamCityAndName = function () {
        if (!this.teamCity || !this.teamMascot)
            return '';

        return this.teamCity + ' ' + this.teamMascot;
    };
    this.teamName = function () {
        if (!this.teamMascot)
            return '';

        return this.teamMascot.toUpperCase();
    };
    this.teamBgColor = function () {
        if (!this.teamColor)
            return '';

        return this.teamColor + '-bg';
    };
    this.teamThumbnail = function () {
        if (!this.teamColor)
            return '';

        return 'content/images/teams/thumbs/' + this.teamColor + '.png';
    };
    this.teamImage = function () {
        if (!this.teamColor)
            return '';

        return 'content/images/teams/large/' + this.teamColor + '.png';
    };
}