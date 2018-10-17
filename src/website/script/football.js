//POTENTIAL GAME ENGINES TO ANIMATE FIELD: https://gist.github.com/bebraw/768272
//START_HERE TAG IS USED TO MARK WHERE I LEFT OFF IN DEV:

var _totalPlayCount = 0;
var _diceSumTotal = 0;
var _teams = new TeamArray();
var _timeIntervalCountDown = 1000; //Modify this value to set how fast the clock counts down for a quarter, 1000 = 1 second, 500 = half second, etc.
var _kickoffSliderDifficulty = 10; //change to higher number to slow down slider, change to lower number to speed up

//DOCUMENT READY FUNCTION:
$(function () {
    var viewModel = function () {
        var self = this;

        //Timer Source: https://stackoverflow.com/questions/20467548/knockout-js-how-to-implement-countdown-timer
        //GENERAL GAME VARIABLES:
        self.gameStarted = ko.observable(false); //flag, when true, indicates all game setup is complete (e.g. teams selected, etc.)
        self.currentQuarter = ko.observable(1);
        self.currentQuarterDisplay = ko.computed(function () {
            return getNumberWithEnding(self.currentQuarter());
        });
        self.currentDown = ko.observable(1);
        self.ballSpotStart = ko.observable(35); //set initial ball spot on home kickoff spot
        self.yardsTraveled = ko.observable(0);
        self.yardsToFirst = ko.observable(10);        
        self.yardsToTouchdown = ko.computed(function () {
            return 100 - (self.ballSpotStart() + self.yardsTraveled()); //subtract start from 100 to get total yards needed for a touchdown;
        });//ko.observable(71); 
        self.currentBallSpot = ko.computed(function () {
            let yards = self.yardsToTouchdown();
            if (yards > 50)
                yards = 100 - yards;

            return yards;
        });
        self.playCountForPossession = ko.observable(0);
        self.hasRolled = ko.observable(false);
        self.currentTeamWithBall = ko.observable(0);
        self.teamPlayHistory = ko.observableArray();
        self.boxScore = ko.observableArray(); //TODO: Populate with data for table: boxScore
        self.teamStats = ko.observableArray(); //TODO: Populate with data for table: gameStats        
        self.needCoinToss = ko.observable(true); //determines when coin toss is needed

        //HOME TEAM VARIABLES:        
        self.homeTeamID = ko.observable(0); //28
        self.homeTeamInfo = ko.computed(function () {
            if (self.homeTeamID() === 'undefined' || self.homeTeamID() <= 0)
                return new TeamArrayRecord();

            let thisTeam = $.grep(_teams, function (team) { return team.teamId === self.homeTeamID(); })[0];
            return $.grep(_teams, function (team) { return team.teamId === self.homeTeamID(); })[0]; //get the team selected by user;
        });
        self.homeTeamTimeOuts = ko.observable(3);
        self.homeTeamScore = ko.observable(0);

        //AWAY TEAM VARIABLES:
        self.awayTeamID = ko.observable(0); //11
        self.awayTeamInfo = ko.computed(function () {
            if(self.awayTeamID() === 'undefined' || self.awayTeamID() <= 0)
                return new TeamArrayRecord();

            let thisTeam = $.grep(_teams, function (team) { return team.teamId === self.awayTeamID(); })[0];
            return $.grep(_teams, function (team) { return team.teamId === self.awayTeamID(); })[0]; //get the team selected by user;
        });
        self.awayTeamTimeOuts = ko.observable(3);
        self.awayTeamScore = ko.observable(0);

        //GAME TIMER VARIABLES
        self.timerId = 0;
        self.elapsedTime = ko.observable(0);
        self.initialTime = ko.observable(900);
        self.remainingTime = ko.computed(function () {
            return self.initialTime() - self.elapsedTime();
        });
        //display time source: https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
        self.remainingTimeDisplay = ko.computed(function () {
            if (self.remainingTime() > 0) {
                var minutes = Math.floor(self.remainingTime() / 60);
                var seconds = self.remainingTime() - minutes * 60;
                return str_pad_left(minutes, '0', 2) + ':' + str_pad_left(seconds, '0', 2);
            }
            else {
                return '00:00';
            }
        });
        self.isRunning = ko.observable(false);
        self.StartCounter = function () {
            //self.elapsedTime(0); //do not reset the counter each time counter is started
            self.isRunning(true);
            self.timerId = window.setInterval(function () {
                self.elapsedTime(self.elapsedTime() + 1);
                if (self.remainingTime() === 0) {
                    clearInterval(self.timerId);
                    self.isRunning(false);
                    self.Callback();
                }
            }, _timeIntervalCountDown);
        };
        self.StopCounter = function () {
            clearInterval(self.timerId);
            self.isRunning(false);
        };
        self.Callback = function () { };

        //GENERAL GAME FUNCTIONS:
        self.teamsPicked = ko.computed(function () {
            let picked = false;
            if (homeTeamID() && awayTeamID() && homeTeamID() > 0 && awayTeamID() > 0)
                picked = true;
            return picked;
        });
        self.ballSpot = ko.computed(function () {
            //home end-zone is always left
            //away end-zone is always right
            //front of football spot indicator is where ball is on field. e.g. 50yd line will be ~85px
            let isHomeTeam = false;
            let spot = 0;
            let min = 180; //minimum for away team i.e. Starting on team's GOALLINE 100 yards to go
            let max = 2; //max for away team i.e. TOUCHDOWN 0 yards to go
            let ratio = 1.8; //180 divided by 100 (number of pixels to travel across 100 yards)

            if (self.currentTeamWithBall() === self.homeTeamID()) {
                isHomeTeam = true;
                min = -4; //minimum for home team i.e. Starting on team's GOALLINE
                max = 175; //max for home team i.e. TOUCHDOWN
            }

            //calculate based on max and min, when home team, subtract from 100 to get correct start position on field:
            spot = isHomeTeam ? min + (100 - self.yardsToTouchdown()) * ratio + 1 : self.yardsToTouchdown() * ratio - 1;

            //show trail for team
            let trailWidth = self.yardsTraveled() * ratio;

            if (isHomeTeam) {
                $('#away-team-trail').css('width', '0px');
                $('#home-team-trail').css('background-image', 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,1)');
                $('#home-team-trail').css('width', trailWidth + 'px');
                $('#home-team-trail').css('margin-left', self.ballSpotStart() * ratio + 'px');
                console.log('HOME => yardsTraveled:' + self.yardsTraveled() + ' ballSpotStart:' + self.ballSpotStart() + ' trailWidth: ' + trailWidth);
            }
            else {
                let marginWidth = (181 - trailWidth) - (self.ballSpotStart() * ratio);
                console.log('margin-width: ' + marginWidth);
                $('#home-team-trail').css('width', '0px');
                $('#away-team-trail').css('background-image', 'linear-gradient(to left, rgba(255,255,255,0), rgba(255,255,255,1)');
                $('#away-team-trail').css('width', trailWidth + 'px');
                $('#away-team-trail').css('margin-left', marginWidth + 'px');

                //$('#away-team-trail').css('background-image', 'linear-gradient(to left, rgba(255,255,255,0), rgba(255,255,255,1)');
                //$('#away-team-trail').css('width', trailWidth + 'px');
                ////subtract from max margin to correctly position on field display                
                //$('#away-team-trail').css('margin-left', m + 'px');
                console.log('AWAY => yardsTraveled:' + self.yardsTraveled() + ' ballSpotStart:' + self.ballSpotStart() + ' trailWidth: ' + trailWidth);
            }

            console.log('==============');
            console.log('yardsTraveled:' + self.yardsTraveled() + ' ballSpotStart:' + self.ballSpotStart());
            //console.log('ratio:' + ratio + ' yards to touchdown:' + self.yardsToTouchdown());
            console.log('spot:' + spot + ' is home team:' + isHomeTeam + ' max: ' + max + ' min: ' + min);
            return spot; //this is max 100 (goal line) and min 0 (goal line)
        });
        self.AddPlayHistory = function (playHistory) {
            self.teamPlayHistory.push(playHistory);
            //self.teamPlayHistory.reverse();
            self.teamPlayHistory.sort(function (left, right) {
                return right.playId === left.playId ? 0 : right.playId < left.playId ? -1 : 1;
            });
        };
        self.AddBoxScore = function () {

        };
        self.RollDice = function () {
            gameDice.init();
            self.hasRolled(true); //flag that the user has rolled the dice
        };
        self.ResetGame = function () {
            gameStorage.clearLocalStorage();
        };
        self.SaveGame = function () {
            gameStorage.saveGame();
        };
        self.GetGameSaves = function () {
            gameStorage.getSavedData();
        };
        self.MakePlay = function () {
            playMaker.init();            
            $('input[name=selectPlay][value=pass]').prop('checked', 'checked');//reset play selector to default
        };
        self.SetupField = function () {
            console.log('setting up field.');
            //$('#end-zone-left').addClass(self.homeTeamInfo().teamBgColor());            
            //$('#end-zone-right').addClass(self.awayTeamInfo().teamBgColor());
            $('#end-zone-left-img').addClass(self.homeTeamInfo().teamBgColor());
            $('#end-zone-right-img').addClass(self.awayTeamInfo().teamBgColor());
            //adjust the team names based on length of characters:
            $('#end-zone-left-txt').css('top', self.GetHomeTeamTextPosition(self.homeTeamInfo().teamName().length) + '%');
            $('#end-zone-right-txt').css('top', self.GetAwayTeamTextPosition(self.awayTeamInfo().teamName().length) + '%');
            self.SetBallPosition();
        };
        self.SetBallPosition = function () {
            //$('#ball-position').css('margin-left', self.ballSpot() + 'px'); //195 is max for right position, 0 is max left
            $('#ball-position-img').css('margin-left', self.ballSpot() + 'px');

            //TODO: REMOVE BELOW AFTER TESTING (uncomment $('#ball-position-img').css('margin-left', self.ballSpot() + 'px'); ABOVE)
            //TEST TRAIL:
            //let counter = 100;
            //let swapBall = false;

            //(function move() {
            //    if (swapBall)
            //        self.currentTeamWithBall(28); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
            //    else
            //        self.currentTeamWithBall(11); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
            //    self.yardsToTouchdown(counter);
            //    self.ballSpotStart = ko.observable(0);
            //    self.yardsTraveled = ko.observable(100-counter);
            //    $('#ball-position-img').css('margin-left', self.ballSpot() + 'px');                
            //    //background - image: linear - gradient(to right, rgba(255, 0, 0, 0), rgba(255, 0, 0, 1));
            //    setTimeout(move, 100); //football mover countdown
            //    //if (counter === 100) {
            //    //    reverse = -1;
            //    //}
            //    if (counter === 0) {
            //        swapBall = !swapBall;
            //        counter = 100;
            //    }
            //    counter -= 1; //+= 1 * reverse;
            //})();
            //END TEST TRAIL

            //TEST BALL MOVEMENT:
            //let counter = 100;
            //let swapBall = false;

            //(function move() {
            //    if (swapBall)
            //        self.currentTeamWithBall(28); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
            //    else
            //        self.currentTeamWithBall(11); //11 away,28 home TESTING: TODO: REMOVE AFTER TESTING
            //    self.yardsToTouchdown(counter);
            //    $('#ball-position-img').css('margin-left', self.ballSpot() + 'px');                
            //    //background - image: linear - gradient(to right, rgba(255, 0, 0, 0), rgba(255, 0, 0, 1));
            //    setTimeout(move, 500); //football mover countdown
            //    //if (counter === 100) {
            //    //    reverse = -1;
            //    //}
            //    if (counter === 0) {
            //        swapBall = !swapBall;
            //        counter = 100;
            //    }
            //    counter -= 1; //+= 1 * reverse;
            //})();
            //END TEST BALL MOVEMENT:
            //TODO: REMOVE ABOVE AFTER TESTING
        };
        self.GetHomeTeamTextPosition = function (teamNameLength) {
            let topPercentage = 58;
            switch (teamNameLength) {
                case 5:
                    topPercentage = 60;
                    break;
                case 6:
                    topPercentage = 64;
                    break;
                case 7:
                    topPercentage = 68;
                    break;
                case 8:
                    topPercentage = 70;
                    break;
                case 9:
                    topPercentage = 72;
                    break;
                case 10:
                    topPercentage = 74;
            }
            //console.log('top Percentage:' + topPercentage + ' home team name length:' + teamNameLength);
            return topPercentage;
        };
        self.GetAwayTeamTextPosition = function (teamNameLength) {
            let topPercentage = 42;
            switch (teamNameLength) {
                case 5:
                    topPercentage = 40;
                    break;
                case 6:
                    topPercentage = 36;
                    break;
                case 7:
                    topPercentage = 34;
                    break;
                case 8:
                    topPercentage = 30;
                    break;
                case 9:
                    topPercentage = 28;
                    break;
                case 10:
                    topPercentage = 26;
            }
            //console.log('top Percentage:' + topPercentage + ' away team name length:' + teamNameLength);
            return topPercentage;
        };
        //KICKOFF AND COIN TOSS VARIABLES/FUNCTIONS
        self.pointAttemptAfterTouchDown = ko.observable(false); //determines when extra point or 2 point conversion is needed
        self.kickoffNeeded = ko.observable(true); //determines when kickoff is needed
        self.isKickoff = ko.observable(false); //determines when kick is a normal or onside kickoff
        self.isSafety = ko.observable(false); //determines when kickoff is a safety kick
        self.isPunt = ko.observable(false); //determines when kick is a punt
        self.isFieldGoal = ko.observable(false); //determines when kick is a field goal
        self.isExtraPointKick = ko.observable(false); //determines when kick is an extra point attempt
        self.coinTossValue = ko.observable(0).extend({ throttle: 4000 }); //delay updating coin toss value until after 5 seconds (to allow coin animation to finish)
        self.coinTossWinner = ko.observable(0); //stores team id of coin toss winner
        self.coinTossLoser = ko.observable(0); //stores team id of coin toss loser
        self.teamReceivingInitialKickoff = ko.observable(0); //stores value of team receiving ball at start of game
        self.isBeginningOfHalf = true; //flag to indicate when the beginning of a half occurs
        self.coinTossWinningOption = ko.observable('receive'); //stores value of the option chosen by the coin-toss winning team
        self.coinTossResultText = ko.computed(function () {
            if (self.coinTossValue() === 1)
                return 'Heads';
            else
                return 'Tails';
        });
        self.coinTossWinnerInfo = ko.computed(function () {
            if (self.coinTossWinner() === self.homeTeamID())
                return self.homeTeamInfo();
            else
                return self.awayTeamInfo();
        });
        self.teamReceivingInitialKickoffInfo = ko.computed(function () {
            if (self.teamReceivingInitialKickoff() === self.homeTeamID())
                return self.homeTeamInfo();
            else
                return self.awayTeamInfo();
        });
        self.kickoffPowerSliderIntervalId = 0;
        self.kickoffAngleSliderIntervalId = 0;
        self.kickoffPower = -1;
        self.kickoffAngle = -1;        
        self.TossCoin = function () {
            //START_HERE
            let coinValue = getRandomInt(1, 2); //pick 1 or 2 randomly, 1=heads, 2=tails
            let coinSideSelected = parseInt($('input[name=selectCoinSide]:checked').val(), 10);

            //disable the coin from being clicked again while the animation is playing
            $("#coin").unbind().click(function () {
            });

            //play coin animation
            $('#coin').removeClass();
            setTimeout(function () {
                if (coinValue === 1) {
                    $('#coin').addClass('heads');
                }
                else {
                    $('#coin').addClass('tails');
                }
            }, 100);

            self.coinTossValue(coinValue);

            //visiting team always gets to choose coin toss option (heads or tails)
            if (coinValue === coinSideSelected) {
                self.coinTossWinner(self.awayTeamID());
                self.coinTossLoser(self.homeTeamID());
            }
            else {
                self.coinTossWinner(self.homeTeamID());
                self.coinTossLoser(self.awayTeamID());
            }
        };
        self.SelectCoinTossWinningOption = function () {
            let option = $('input[name=selectCoinTossWinner]:checked').val();
            console.log('COIN TOSS WINNING OPTION: %s', option);
            self.coinTossWinningOption(option);

            if (option === 'receive')
                self.teamReceivingInitialKickoff(self.coinTossWinner());
            else
                self.teamReceivingInitialKickoff(self.coinTossLoser());
        };
        self.GetKickoffPower = function () {           
            var power = parseInt($("#kickoffPower").val(), 10);
            $("#kickoffPower").prop('disabled', true);

            //stop slider movement after getting value
            clearInterval(self.kickoffPowerSliderIntervalId);
            
            $("#kickoffPowerSelected").text(power);
            self.kickoffPower = power;
        };
        self.GetKickoffAngle = function () {
            var angle = parseInt($("#kickoffAngle").val(), 10);
            $("#kickoffAngle").prop('disabled', true);

            //stop slider movement after getting value
            clearInterval(self.kickoffAngleSliderIntervalId);

            $("#kickoffAngleSelected").text(angle);
            self.kickoffAngle = angle;
        };
        self.Kickoff = function () {
            console.log('kickoffPowerSelected: %s kickoffAngleSelected: %s', self.kickoffPower, self.kickoffAngle);
            if (self.kickoffPower >= 0 && self.kickoffAngle >= 0) {
                //handle kickoff
                playMaker.kickoff(kickoffPower, kickoffAngle);

                //reset kickoffNeeded and other kick flags to false
                self.kickoffNeeded(false);   
                self.isKickoff(false);
                self.isSafety(false);
                self.isPunt(false);
                self.isFieldGoal(false);
            }
            else {
                alert('Select kick power and angle');
            }
        };
        self.SetupKickoff = function () {
            let min = 0;
            let max = 100;
            let reverse = 1;
            let i = min;

            //enable sliders and reset values:
            $("#kickoffPower").prop('disabled', false);
            $("#kickoffAngle").prop('disabled', false);  
            self.kickoffPower = -1;
            self.kickoffAngle = -1;
            $("#kickoffAngleSelected").text('select angle');
            $("#kickoffPowerSelected").text('select power');

            //setup power slider movement
            self.kickoffPowerSliderIntervalId = window.setInterval(function () {
                $("#kickoffPower").val(i += 1 * reverse);
                if (i === max)
                    reverse = -1;
                if (i === min)
                    reverse = 1;
            }, _kickoffSliderDifficulty);

            //setup angle slider movement
            self.kickoffAngleSliderIntervalId = window.setInterval(function () {
                $("#kickoffAngle").val(i += 1 * reverse);
                if (i === max)
                    reverse = -1;
                if (i === min)
                    reverse = 1;
            }, _kickoffSliderDifficulty);
        };      
        //END KICKOFF VARIABLES/FUNCTIONS
        self.SelectTeam = function () {
            let teamIdSelected = parseInt($('input[name=selectTeam]:checked').val(), 10);

            //console.log('Team Selected %s.', typeof teamIdSelected);

            if (typeof teamIdSelected === 'number') {

                //console.log('Team Selected %s.', teamIdSelected);

                if (!self.homeTeamID())
                    self.homeTeamID(teamIdSelected);
                else
                    self.awayTeamID(teamIdSelected);
            }            
        };
        self.StartGame = function () {
            self.currentTeamWithBall(self.teamReceivingInitialKickoff());
            self.pointAttemptAfterTouchDown(false);
            self.SetupField();
            self.kickoffNeeded(true);
            self.isKickoff(true);
            self.SetupKickoff();
            self.gameStarted(true);
        };
        self.ResetTeams = function () {            
            self.homeTeamID(0);
            self.awayTeamID(0);
            console.log('TEAMS RESET');
        };
    }; //END KNOCKOUT viewModel

    //KO binding to set a DOM object's class
    ko.bindingHandlers['class'] = {
        'update': function (element, valueAccessor) {
            if (element['__ko__previousClassValue__']) {
                $(element).removeClass(element['__ko__previousClassValue__']);
            }
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).addClass(value);
            element['__ko__previousClassValue__'] = value;
        }
    };

    ko.applyBindings(viewModel);
}); //END DOCUMENT READY FUNCTION

//object constructor for a new play history record, stored in array, self.teamPlayHistory()
function PlayHistory(teamId, teamName, down, playCount, playYards, playResult, ballSpot) {
    this.playId = self.teamPlayHistory().length + 1;
    this.totalPlayCount = _totalPlayCount;
    this.teamId = teamId;
    this.teamName = teamName;
    this.down = down;
    this.playCount = playCount;
    this.playYards = playYards;
    this.playResult = playResult;
    this.ballSpot = ballSpot;
    this.fullTeamName = function () {
        if (!this.teamName)
            return '';

        if (self.awayTeamID() === teamId) {
            return this.teamName + ' (away)';
        }
        else {
            return this.teamName + ' (home)';
        }
    };
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
}

var gameDice = {
    init: function () {
        gameDice.roll();
    },

    generateDie: function (minSpread, maxSpread) {
        let die = {};
        die.minValue = minSpread;
        die.maxValue = maxSpread;
        return die;
    },

    getAllDice: function () {
        let numberOfDice = 2;
        let newDice = [];
        for (var i = 0; i < numberOfDice; i++) {
            newDice.push(gameDice.generateDie(1, 6));
        }
        return newDice;
    },

    display: function (dice, diceSum) {
        //clear results in list of die values
        $("#diceValues").empty();

        for (var i = 0, len = dice.length; i < len; i++) {
            let die = dice[i];
            let listItem = document.createElement("li");
            let dieText =
                "Die " + (i + 1) + " = " + die.valueRolled;

            listItem.appendChild(document.createTextNode(dieText));
            $("#diceTotal").text(diceSum);
            $("#diceValues").append(listItem);
        }
    },

    roll: function () {
        var dice = gameDice.getAllDice();
        var diceSum = 0;

        for (var i = 0, len = dice.length; i < len; i++) {
            let die = dice[i];
            let randInt = getRandomInt(die.minValue, die.maxValue);
            die.valueRolled = randInt;
            diceSum += randInt;
        }

        _diceSumTotal = diceSum;

        //display results:    
        gameDice.display(dice, diceSum);
    }
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getNumberWithEnding(number) {
    //just return 0 if anything less than 1 is passed in
    if (number <= 0)
        return 0;
    //get the 'th' numbers first since this covers the majority:
    if ((number % 100) == 10 || (number % 100) == 11 || (number % 100) == 12 || (number % 100) == 13
        || (number % 10) == 4 || (number % 10) == 5 || (number % 10) == 6 || (number % 10) == 7
        || (number % 10) == 8 || (number % 10) == 9 || (number % 10) == 0)
        return number.toString() + 'th';
    if ((number % 10) == 1)
        return number.toString() + 'st';
    if ((number % 10) == 2)
        return number.toString() + 'nd';
    if ((number % 10) == 3)
        return number.toString() + 'rd';
}

var playMaker = {
    init: function () {
        playMaker.play();
    },

    display: function (playText) {
        $("#playResult").text(playText);
        $("#playCount").text(_totalPlayCount);
    },

    getPlayResult: function (playSelected) {
        let _yards = 0;
        let _playResultText = titleCase(playSelected);
        let _positiveYards = false;
        let _negativeYards = false;
        let bigYardPlay = getRandomInt(1, 100) >= 85;
        let yardageMax = 15;
        let turnover = false;

        self.playCountForPossession(self.playCountForPossession() + 1);

        //Chance of a big yard play is increased
        if (bigYardPlay)
            yardageMax = self.yardsToTouchdown();

        //TODO: add chance for fumbles and interceptions
        //TODO: add chance for muffed punt or punt block/return or field goal block/return
        if (_diceSumTotal >= 7)
            _positiveYards = true;

        if (_diceSumTotal <= 3)
            _negativeYards = true;

        //HANDLE EXTRA POINT (after touchdown) PLAYS:
        if (playSelected === 'extraPoint' || playSelected === 'twoPointConversion') {
            self.pointAttemptAfterTouchDown(false); //reset flag after extra point attempt
            turnover = true; //always change possession after extra point attempts
            self.kickoffNeeded(true);
            self.isExtraPointKick(true);
            self.SetupKickoff();

            //EXTRA POINT
            if (playSelected === 'extraPoint' && _diceSumTotal >= 4) {
                _yards = getRandomInt(1, 45); //need 25 yards for good extra point

                //Chance of extra point being missed (need a number >= 10 out of 100 chances)
                if (_yards >= 25 && getRandomInt(1, 100) >= 10) {
                    _playResultText = _playResultText + ' GOOD';
                    playMaker.addScore('extrapoint');
                }
                else {
                    _playResultText = _playResultText + ' NO GOOD';
                }
            }
            else if (playSelected === 'extraPoint') {
                _yards = 0;
                _playResultText = _playResultText + ' Blocked';
            }

            //TWO POINT CONVERSION:
            if (playSelected === 'twoPointConversion' && _diceSumTotal >= 6) {
                _yards = getRandomInt(1, 4); //need two yards for 2 point conversion
                if (_yards >= 2) {
                    _playResultText = _playResultText + ' SUCCESSFUL';
                    playMaker.addScore('twopointconversion');
                }
                else {
                    _playResultText = _playResultText + ' FAILED';
                }
            }
            else if (playSelected === 'twoPointConversion') {
                _playResultText = _playResultText + ' FAILED';
            }
                
        }

        //always turnover ball if punting or kicking a field goal
        if (playSelected === 'punt' || playSelected === 'fieldGoal')
            turnover = true;

        //HANDLE PUNT
        if (playSelected === 'punt') {
            self.kickoffNeeded(true);
            self.isPunt(true);
            if (_diceSumTotal >= 4) {
                _yards = getRandomInt(1, self.yardsToTouchdown() + 10); //account for touchback
                if (_yards >= self.yardsToTouchdown()) {
                    _playResultText = _playResultText + ' - Touchback';
                    _yards = self.yardsToTouchdown() - 20; //set on 20 yard line
                }
                else
                    _playResultText = _playResultText;
            } else {
                _yards = 0;
                _playResultText = _playResultText + ' Blocked';
            }
        }        

        //HANDLE FIELD GOAL
        if (playSelected === 'fieldGoal' && _diceSumTotal >= 4) {
            let fieldGoalSuccess = true;
            //Chance of field goal does down for every 5 yards over 30 away from goal line
            if (self.yardsToTouchdown() >= 50)
                fieldGoalSuccess = false; //automatically miss if the team is not past the 50 yard line
            else if (self.yardsToTouchdown() >= 45 && getRandomInt(1, 100) <= 85)
                fieldGoalSuccess = false;
            else if (self.yardsToTouchdown() >= 40 && getRandomInt(1, 100) <= 75)
                fieldGoalSuccess = false;
            else if (self.yardsToTouchdown() >= 35 && getRandomInt(1, 100) <= 65)
                fieldGoalSuccess = false;

            if (fieldGoalSuccess) {
                _yards = self.yardsToTouchdown() + 10; //add 10 yards to account for end-zone length
                _playResultText = _playResultText + ' GOOD';
                playMaker.addScore('fieldgoal');
                self.kickoffNeeded(true);
                self.isKickoff(true);
                self.SetupKickoff();
            } else {
                _yards = self.yardsToTouchdown();
                _playResultText = _playResultText + ' attempt missed';
            }
        }
        else if (playSelected === 'fieldGoal') {
            _yards = 0;
            _playResultText = _playResultText + ' Blocked';
        }

        //POSITIVE YARDAGE PLAYS
        if (_positiveYards && playSelected === 'pass') {

            _yards = getRandomInt(1, yardageMax);
            _playResultText = _playResultText + ' Complete';
        }
        if (_positiveYards && playSelected === 'run') {
            _yards = getRandomInt(1, yardageMax);
            _playResultText = _playResultText + ' Successful';
        }
        //NEGATIVE YARDAGE PLAYS
        if (_negativeYards && playSelected === 'pass') {
            _yards = getRandomInt(1, 15) * -1;
            _playResultText = 'Sacked for a loss';
        }
        if (_negativeYards && playSelected === 'run') {
            _yards = getRandomInt(1, 15) * -1;
            _playResultText = _playResultText + ' - tackled for a loss';
        }
        //NO GAIN PLAYS
        if (!_positiveYards && !_negativeYards && playSelected ==='pass') {
            _yards = 0;
            _playResultText = _playResultText + ' Incomplete';
        }
        if (!_positiveYards && !_negativeYards && playSelected === 'run') {
            _yards = 0;
            _playResultText = _playResultText + ' for no gain';
        }

        //TOUCHDOWN
        if (_yards >= self.yardsToTouchdown() && (playSelected === 'pass' || playSelected === 'run')) {
            _playResultText = 'TOUCHDOWN';
            playMaker.addScore('touchdown');
            self.pointAttemptAfterTouchDown(true);
        }

        //SAFETY
        if (100 - self.yardsToTouchdown() < 0 && (playSelected === 'pass' || playSelected === 'run')) {
            _playResultText = 'SAFETY';
            playMaker.addScore('safety');
            self.kickoffNeeded(true);
            self.isKickoff(true);
            self.SetupKickoff();
        }  

        //DETERMINE DOWN
        if (_yards >= self.yardsToFirst() && (playSelected === 'pass' || playSelected === 'run')) {
            self.yardsToFirst(10); //reset yards to first for next set of downs
            self.currentDown(1); //reset to first down
        }
        else {
            if (self.currentDown() === 4)
                turnover = true;
            else {
                self.yardsToFirst(self.yardsToFirst() - _yards); //subtract the yards from the current yards to First Down
                self.currentDown(self.currentDown() + 1);  //increment the current Down
            }
        }

        //TURNOVER
        if (turnover) {
            self.yardsToFirst(10);
            self.currentDown(1);
            self.playCountForPossession(0); //reset play count for possession
            self.ballSpotStart(self.yardsToTouchdown()); 
            self.yardsTraveled(0); //reset yards traveled for possession
            _playResultText = _playResultText + ' Change of Possession';

            //change possession
            if (self.currentTeamWithBall() === self.awayTeamID())
                self.currentTeamWithBall(self.homeTeamID());
            else
                self.currentTeamWithBall(self.awayTeamID());
        }

        console.log('YARDS: ' + _yards);
        let playResult = { yards: _yards, playResultText: _playResultText };

        //set the new position of the ball (if not kicking fieldgoal, extrapoint, or two point conversion):
        if (playSelected !== 'fieldGoal' && playSelected !== 'extraPoint' && playSelected !== 'twoPointConversion') {            
            self.yardsTraveled(self.yardsTraveled() + _yards);
        }        
        self.SetBallPosition();

        return playResult;
    },

    kickoff: function (kickoffPower, kickoffAngle) {
        let kickoffType = $('input[name=selectKickoffPlay]:checked').val();
        let _yards = convertKickoffPowerToYards(kickoffType, kickoffPower, kickoffAngle);
        let _returnYards = 0;
        let _kickoffResultText = titleCase(kickoffType);
        let ballKickOffSpot = 35; //set ball Spot Start at 35 yard line        
        let isTouchback = false; //flag to determine when touchback occurs
        let isPenalty = false; //flag to determine when there is a penalty on the kickoff                
        
        console.log('kickoffPower: %s, kickoffAngle: %s', kickoffPower, kickoffAngle);

        //determine spot of kick off
        if (self.isPunt() || self.isFieldGoal()) {
            ballKickOffSpot = self.currentBallSpot();
        }
        if (self.isSafety()) {
            ballKickOffSpot = 20;
        }

        let totalMaxKickWithoutTouchback = 100 - ballKickOffSpot; //variable used in calculations below for determining max return yards etc.
        console.log('BEGINNING Kickoff Yards: %s, totalMaxKickWithoutTouchback: %s, BALL KICK OFF SPOT: %s', _yards, totalMaxKickWithoutTouchback, ballKickOffSpot);

        //if it's the first quarter, the team receiving should be set to the currentTeam with the ball
        let receivingTeam = self.awayTeamID();
        let kickingTeam = self.homeTeamID();

        if (self.isBeginningOfHalf && self.teamReceivingInitialKickoff() === self.homeTeamID()) {
            receivingTeam = self.homeTeamID();
            kickingTeam = self.awayTeamID();
        }

        //when kicking from away side, subtract from 100 so ball spot start is right side of field
        if (kickingTeam === awayTeamID())
            ballKickOffSpot = 100 - ballKickOffSpot;

        //set to false after kickoff TODO: reset to true when 2nd quarter begins
        self.isBeginningOfHalf = false;

        //normal change of possession after kickoff
        if (!self.isBeginningOfHalf) {
            if (self.currentTeamWithBall() === self.homeTeamID()) {
                receivingTeam = self.homeTeamID();
                kickingTeam = self.awayTeamID();
            }
        }
        
        //handle kickoff type
        if (kickoffType === 'onside') {
            let onsideSuccessful = false;

            //onside kick must have power greater than 25 and a sharp angle, less than 21 or greater than 79
            if (kickoffPower >= 25 && (kickOffAngle <= 20 || kickoffAngle >= 80)) {
                onsideSuccessful = true;
            }
            else {
                onsideSuccessful = false;
            }

            if (onsideSuccessful) {
                _yards = getRandomInt(10, 20); //ball at least has to travel 10 yards, but has a chance of traveling 20

                //now determine if kicking team gets the ball or the return team gets it. TODO: is this 20%?
                if (getRandomInt(1, 100) <= 20) {
                    receivingTeam = kickingTeam; //essentially a turnover
                }
                else {
                    //team return yards:
                    if (getRandomInt(1, 100) <= 5) {
                        _returnYards = getRandomInt(1, 10); //small chance of returning for 1-10 yards
                    }
                    else
                        _returnYards = 0;
                }
            }
            else {
                //unsuccessful onside kick, receiving team gets ball, either because ball didn't travel far enough (penalty) or they fielded the ball and returned it
                if (kickoffPower < 25) {
                    _yards = 35; //mark spot at opposing teams 35 for penalty
                    _kickoffResultText += ' Unsuccessful - Ball did not travel proper distance.';
                    isPenalty = true;
                }
                else if (kickoffAngle > 20 || kickoffAngle < 80) {
                    _returnYards = getRandomInt(1, _yards + ballKickOffSpot); //ball can easily be returned for touchdown since it's essentially a normal kickoff
                    _kickoffResultText += ' Unsuccessful - Receiving team made a return.';
                }
                else {
                    _yards = 35; //mark spot at opposing teams 35 for penalty
                    _kickoffResultText += ' Unsuccessful - Ball went out of bounds.';
                    isPenalty = true;
                }
            }
        }
        else {
            //normal kick
            console.log('NORMAL KICKOFF');
            //if angle is extreme, no matter what the power is, the ball will go out of bounds:
            if (kickoffAngle <= 20 || kickoffAngle >= 80) {
                _yards = 35; //mark spot at opposing teams 35 for penalty
                _kickoffResultText += ' Penalty - Ball kicked out of bounds.';
                isPenalty = true;
            }
            else if (_yards >= 76) {
                isTouchback = true; //ball is kicked out of bounds behind end zone, so no chance of return
            }
            else {
                //get random int to determine if team runs it out of end zone
                console.log('Kickoff Yards: %s, totalMaxKickWithoutTouchback: %s', _yards, totalMaxKickWithoutTouchback);
                if (_yards >= totalMaxKickWithoutTouchback) {
                    if (getRandomInt(1, 100) >= 85) {
                        let minYards = _yards - totalMaxKickWithoutTouchback;
                        let maxYards = 40;
                        let chanceOfBigReturn = getRandomInt(1, 100);
                        console.log('Chance of big return: %s, Minimum Return Yards: %s, Maximum Return Yards: %s', chanceOfBigReturn, minYards, maxYards);

                        //chance of big return; There is a small chance the ball will be returned, but most likely result will be a touchback
                        if (chanceOfBigReturn >= 90) {
                            maxYards = _yards + ballKickOffSpot;
                            //receiving team will at least run the ball out of the end-zone if they "decide" to return (yards kicked - 65 (total max kick for goal line reception)
                            _returnYards = getRandomInt(minYards, maxYards);
                        }
                        else { //bigger chance of just a 40yd return.
                            _returnYards = getRandomInt(minYards, maxYards); //more likely chance only allows for return of 40 yards
                        }
                    } else {
                        isTouchback = true;
                    }
                }
                else {
                    console.log('Chance of normal return, Minimum Return Yards: %s, Maximum Return Yards: %s', 1, _yards + ballKickOffSpot);
                    _returnYards = getRandomInt(1, _yards + ballKickOffSpot); //ball is most likely going to be returned on a normal kickoff under 65 yards
                }
            }
        }

        self.currentTeamWithBall(receivingTeam); //this will be the team running or getting a touchback.
        
        console.log('Kickoff type: %s, Kickoff distance: %s, kickoff return: %s, TeamID With Ball: %s', kickoffType, _yards, _returnYards, receivingTeam);

        //create a play result and record it in the play history
        let kickoffResult = { yards: _yards, playResultText: _kickoffResultText };        

        //record/show play results       
        self.currentTeamWithBall(kickingTeam); //set current team with ball to kickoff team briefly to record the correct team name in the history
        playMaker.recordPlay(kickoffResult);
        
        //show return of kick (if any), but only for kicks that allow for returns
        if (!self.isFieldGoal() && !self.isExtraPointKick()) {
            //Handle new spot of ball
            if (isTouchback || isPenalty) {
                if (isTouchback) {
                    _kickoffResultText += ' - TOUCHBACK';
                    //set ball at 20 yard line when a touchback occurs
                    _yards = 20;
                }

                //home is left end-zone, away is right
                if (self.currentTeamWithBall() === self.awayTeamID()) {
                    self.ballSpotStart(100 - _yards);
                }
                else {
                    self.ballSpotStart(_yards);
                }
            }
            else {
                let ballSpotTotal = ballKickOffSpot + _yards - _returnYards;
                console.log('BALL SPOT TOTAL: %s', ballSpotTotal);

                if (self.currentTeamWithBall() === self.awayTeamID()) {
                    self.ballSpotStart(100 - ballSpotTotal); //add the yards kicked, and subtract the yards returned from the ball kickoff spot to get new ball start.
                }
                else {
                    self.ballSpotStart(ballSpotTotal);
                }
            }
            //TODO: Handle return for Touchdown 

            //create a play result and record it in the play history
            let returnResult = { yards: _returnYards, playResultText: 'Kickoff Return' };
            self.currentTeamWithBall(receivingTeam); //set back to receiving team for proper team in play history
            playMaker.recordPlay(returnResult);
        }

        //set the new position of the ball
        self.SetBallPosition();        
    },

    recordPlay: function (thisPlaysResult) {
        let team = $.grep(_teams, function (team) { return team.teamId === self.currentTeamWithBall(); })[0]; //get the current team making the play
        let pluralizer = 's';
        let yardsText = thisPlaysResult.yards.toString() + " Yard" + pluralizer;
        console.log('This Play:' + thisPlaysResult.playResultText + ' by the ' + team.teamName() + ' for ' + yardsText);

        if (thisPlaysResult.yards === 1 || thisPlaysResult.yards === -1)
            pluralizer = '';

        //PlayHistory: teamId, teamName, down, playCount, playYards, playResult, ballSpot
        self.AddPlayHistory(new PlayHistory(self.currentTeamWithBall(),
            team.teamName(),
            getDownText(self.currentDown(), self.yardsToFirst()),
            self.playCountForPossession(),
            yardsText,
            thisPlaysResult.playResultText,
            getYardText())); //Spot of Ball text in Play History

        playMaker.display(thisPlaysResult.playResultText + ' for ' + thisPlaysResult.yards.toString() + ' Yard' + pluralizer);
    },

    play: function () {
        let playSelected = $('input[name=selectPlay]:checked').val();
        if (playSelected) {
            self.hasRolled(false); //reset flag so player has to roll before making next play
            let thisPlaysResult = playMaker.getPlayResult(playSelected);

            playMaker.recordPlay(thisPlaysResult);                       

            _totalPlayCount += 1;            
        } else {
            self.hasRolled(true);
            alert('Choose a play');
        }
    },

    addScore: function (type) {
        let score = 0;
        switch (type) {
            case 'touchdown':
                score = 6;
                break;
            case 'fieldgoal':
                score = 3;
                break;
            case 'extrapoint':
                score = 1;
                break;
            case 'safety', 'twopointconversion':
                score = 2;
                break;
        }
        if (currentTeamWithBall() === homeTeamID()) {
            homeTeamScore(homeTeamScore() + score);
            if (type === 'safety')
                awayTeamScore(awayTeamScore() + score);
        }
        else {
            awayTeamScore(awayTeamScore() + score);
            if (type === 'safety')
                homeTeamScore(homeTeamScore() + score);
        }            
    }
};

function convertKickoffPowerToYards(kickoffType, kickoffPower, kickoffAngle) {
    let angleSubtractor = 0;
    let kickoffYards = 0;    

    //max kickoff before touchback = 65yds
    if (kickoffType === 'onside') {
        //onside kick with a power greater than 90 will result in touchback
        if (kickoffPower >= 90)
            kickoffYards = getRandomInt(66, 75);
        else if (kickoffPower >= 85)
            kickoffYards = 65;
        else if (kickoffPower >= 70)
            kickoffYards = getRandomInt(50, 64);
        else if (kickoffPower >= 60)
            kickoffYards = getRandomInt(40, 50);
        else if (kickoffPower >= 50)
            kickoffYards = getRandomInt(30, 40);
        else if (kickoffPower >= 40)
            kickoffYards = getRandomInt(20, 30);
        else if (kickoffPower >= 30)
            kickoffYards = getRandomInt(10, 20);
        else
            kickoffYards = getRandomInt(1, 10);
    }
    else {        
        //normal kickoff with a power greater than 80 will result in touchback
        if (kickoffPower >= 98)
            kickoffYards = 76; //kick is out of bounds in end zone with no chance of return (TOUCHBACK)
        else if (kickoffPower >= 80)
            kickoffYards = getRandomInt(66, 75);
        else if (kickoffPower >= 75)
            kickoffYards = 65; //between 75 and 80, is a kick to the goal line essentially
        else if (kickoffPower >= 70)
            kickoffYards = getRandomInt(50, 64);
        else if (kickoffPower >= 60)
            kickoffYards = getRandomInt(40, 50);
        else if (kickoffPower >= 50)
            kickoffYards = getRandomInt(30, 40);
        else if (kickoffPower >= 40)
            kickoffYards = getRandomInt(20, 30);
        else if (kickoffPower >= 30)
            kickoffYards = getRandomInt(10, 20);
        else
            kickoffYards = getRandomInt(1, 10);
    }

    //for every 10 degrees outside of middle kick, reduce total yards kicked;
    //perfect middle kick is 50, reduce by specific factor of the kick power (determined above) if angle is <= 40 or >= 60
    if (kickoffAngle <= 0 || kickoffAngle >= 100)
        angleSubtractor = Math.round(kickoffYards/2.8);
    else if (kickoffAngle <= 10 || kickoffAngle >= 90)
        angleSubtractor = Math.round(kickoffYards / 3.8);
    else if (kickoffAngle <= 20 || kickoffAngle >= 80)
        angleSubtractor = Math.round(kickoffYards / 4.8);
    else if (kickoffAngle <= 30 || kickoffAngle >= 70)
        angleSubtractor = Math.round(kickoffYards / 5.8);
    else if (kickoffAngle <= 40 || kickoffAngle >= 60)
        angleSubtractor = Math.round(kickoffYards / 6.8);

    console.log('KICKOFF: Type: %s, Power: %s, Angle: %s, Angle subtractor: %s, Yards: ', kickoffType, kickoffPower, kickoffAngle, angleSubtractor, kickoffYards);

    return kickoffYards - angleSubtractor;
}

function getDownText(playAttempt, yardsToFirst) {
    let yardsToFirstText = '';

    //null/empty check
    if (yardsToFirst) {
        yardsToFirstText = yardsToFirst.toString(); 
    }

    if (self.yardsToTouchdown() <= 10)
        yardsToFirstText = 'GOAL';

    return getNumberWithEnding(playAttempt) + ' & ' + yardsToFirstText;
}

function getYardText() {
    let yardText = self.homeTeamInfo().teamName();    

    if (self.currentTeamWithBall() === self.awayTeamID() && self.yardsToTouchdown() > 50)
        yardText = self.awayTeamInfo().teamName();

    return yardText + ' ' + self.currentBallSpot();
}

function str_pad_left(string, pad, length) {
    return (new Array(length + 1).join(pad) + string).slice(-length);
}

function titleCase(str) {
    let splitStr = '';

    if (str) {
        str = str.replace(/([A-Z]+)/g, "$1").replace(/([A-Z][a-z])/g, " $1"); //split on capital letters first (camel case strings)

        splitStr = str.toLowerCase().split(' ');
        for (var i = 0; i < splitStr.length; i++) {
            // You do not need to check if i is larger than splitStr length, as your for does that for you
            // Assign it back to the array
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        splitStr = splitStr.join(' ');
    }    
    // Directly return the joined string
    return splitStr;
}

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

/*
function loadField() {
	//Load Field (source: http://jsfiddle.net/vZ8UT/)
	//source2: https://stackoverflow.com/questions/34772957/how-to-make-canvas-responsive
	//Create a new image object
	var backgroundImage = new Image(); 
	backgroundImage.src = "content/images/FootballField_no_grass.PNG";
	backgroundImage.height = 700;
	backgroundImage.width = 1400;
	//Create a canvas
	var canvas = document.createElement('canvas');
	canvas.id = 'mainCanvas';

	//Assuming that image object has loaded correctly...
	canvas.width = backgroundImage.width || 1280;
	canvas.height = backgroundImage.width || 931;

	var ctx = canvas.getContext('2d');

	//Append to the page, assuming we were able to get an element with id 'mainField'
	//... this code is far too assuming.
	document.getElementById('mainField').appendChild(canvas);

	//ctx.fillRect(4,4,10,10);
	
	//Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    //Here you draw the backgroundImage object to the canvas
    //using HTML5 2d Context's drawImage
    //Read more here: http://dev.w3.org/html5/2dcontext/#dom-context-2d-drawimage
	backgroundImage.onload = function() {
		ctx.drawImage(backgroundImage, 0, 0);		
	}
}

function resize(){    
    $("#mainCanvas").outerHeight($(window).height()-$("#mainCanvas").offset().top- Math.abs($("#mainCanvas").outerHeight(true) - $("#mainCanvas").outerHeight()));
  }
  $(document).ready(function(){
    //resize();
    $(window).on("resize", function(){                      
       // resize();
    });
  });
*/