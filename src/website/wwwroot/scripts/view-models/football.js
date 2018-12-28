//POTENTIAL GAME ENGINES TO ANIMATE FIELD: https://gist.github.com/bebraw/768272
//START_HERE TAG IS USED TO MARK WHERE I LEFT OFF IN DEV:



//DOCUMENT READY FUNCTION:
$(function () {
      //Shared Models for both the ViewModels    

    //START_HERE: Continue breaking down view model for KnockOut.js (See view-models\main-game-model.js and below comments for start)
    //source: https://stackoverflow.com/questions/25253547/split-viewmodel-into-multiple-viewmodels-in-knockout-js
    //var officeModel = function (vm) {
    //    var self = this;
    //    self.header = ko.observable("Administration");
    //    self.vm = ko.observable(vm);
    //};

    //var viewModel1 = function () {
    //    var self = this;
    //    self.profileModel = new profileModel("Called from viewModel1");
    //    self.officeModel = new officeModel("office model Called from viewModel1");
    //};

    //var viewModel2 = function () {
    //    var self = this;
    //    self.profileModel = new profileModel("Called from viewModel2");
    //    self.officeModel = new officeModel("office model Called from viewModel2");
    //};

    ////the overall view model
    //var viewModel = function () {
    //    var self = this;
    //    self.profile = new profileModel(),
    //    self.office = new officeModel(),
    //    self.viewModel1 = new viewModel1(),
    //    self.viewModel2 = new viewModel2()
    //};

    //var viewModel = function () {
    //    var self = this;

    //    self.mainGameModel = new mainGameModel(),

    //    //HOME TEAM VARIABLES:        
    //        self.homeTeamID = ko.observable(0); //28
    //    ...........
    //    ko.applyBindings(new viewModel());


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
        self.ballSpotStart = ko.observable(0); //set initial ball spot on home kickoff spot
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
        self.playCountForPossession = ko.observable(1);
        self.timeOfPossession = ko.observable(0);
        self.hasRolled = ko.observable(false);
        self.currentTeamWithBall = ko.observable(0);
        self.teamPlayHistory = ko.observableArray();
        self.gamePlayStats = ko.observableArray();
        self.gameBoxScore = ko.observableArray();
        self.needCoinToss = ko.observable(true); //determines when coin toss is needed        
        self.CloseSpecialTeamsMenu = function () {            
            $('#specialTeamsMenu').removeClass(MODULES.Constants.SHOW_SPECIAL_TEAMS_CLASS);
        };
        self.ClearCoinColors = function () {
            //clear class on current coin
            $(".side-a").removeClass(self.homeTeamInfo().teamBgColor());
            $(".side-b").removeClass(self.homeTeamInfo().teamBgColor());
            $(".side-a").removeClass(self.awayTeamInfo().teamBgColor());
            $(".side-b").removeClass(self.awayTeamInfo().teamBgColor());
        };
        self.ChooseCoinSide = function () {
            self.ClearCoinColors();

            //use away team info on heads of coin if heads is selected, otherwise away team is tails
            let coinSideSelected = parseInt($('input[name=selectCoinSide]:checked').val(), 10);
            if (coinSideSelected === 1) {
                $(".side-a").addClass(self.awayTeamInfo().teamBgColor());
                $("#side-a-txt").text(self.awayTeamInfo().teamName());

                $(".side-b").addClass(self.homeTeamInfo().teamBgColor());
                $("#side-b-txt").text(self.homeTeamInfo().teamName());
            }
            else {
                $(".side-b").addClass(self.awayTeamInfo().teamBgColor());
                $("#side-b-txt").text(self.awayTeamInfo().teamName());

                $(".side-a").addClass(self.homeTeamInfo().teamBgColor());
                $("#side-a-txt").text(self.homeTeamInfo().teamName());
            }
            return true; //return true so radio button is checked
        };

        //HOME TEAM VARIABLES:        
        self.homeTeamID = ko.observable(0); //28
        self.homeTeamInfo = ko.computed(function () {
            if (self.homeTeamID() === 'undefined' || self.homeTeamID() <= 0)
                return new MODULES.Constructors.TeamArrayRecord();

            let thisTeam = $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.homeTeamID(); })[0];
            return $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.homeTeamID(); })[0]; //get the team selected by user;
        });
        self.homeTeamTimeOuts = ko.observable(3);
        self.homeTeamScore = ko.observable(0);

        //AWAY TEAM VARIABLES:
        self.awayTeamID = ko.observable(0); //11
        self.awayTeamInfo = ko.computed(function () {
            if (self.awayTeamID() === 'undefined' || self.awayTeamID() <= 0)
                return new MODULES.Constructors.TeamArrayRecord();

            let thisTeam = $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.awayTeamID(); })[0];
            return $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.awayTeamID(); })[0]; //get the team selected by user;
        });
        self.awayTeamTimeOuts = ko.observable(3);
        self.awayTeamScore = ko.observable(0);

        //GAME TIMER VARIABLES
        self.currentTeamHasTimeOuts = ko.computed(function () {
            if (self.currentTeamWithBall() === self.awayTeamID() && self.awayTeamTimeOuts() > 0)
                return true;
            if (self.currentTeamWithBall() === self.homeTeamID() && self.homeTeamTimeOuts() > 0)
                return true;

            return false;
        });
        self.timerId = 0;
        self.elapsedTime = ko.observable(0);
        self.initialTime = ko.observable(MODULES.Constants.MAX_TIME_OF_QUARTER);
        self.remainingTime = ko.computed(function () {
            return self.initialTime() - self.elapsedTime();
        });
        //display time source: https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
        self.remainingTimeDisplay = ko.computed(function () {
            return UTILITIES.getTimeDisplay(self.remainingTime());
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
            }, MODULES.GameVariables.TimeIntervalCountDown);
        };
        self.StopCounter = function () {
            clearInterval(self.timerId);
            self.isRunning(false);
        };
        self.Callback = function () { };

        //GENERAL GAME FUNCTIONS:
        self.teamsPicked = ko.computed(function () {
            let picked = false;
            if (homeTeamID() && awayTeamID() && homeTeamID() > 0 && awayTeamID() > 0) {
                picked = true;
            }
            self.ChooseCoinSide();
            return picked;
        });
        self.SetupKickoffBallSpot = function () {
            console.log('SETTING UP KICKOFF BALL SPOT');            
            console.log('isExtraPointKick: %s, isKickoff: %s, isSafety: %s', isExtraPointKick(), isKickoff(), isSafety());
            //if (isExtraPointKick() || isKickoff() || isSafety()) {
            //    //set spot depending on type of kick, default is normal kickoff
            //    let spot = MODULES.Constants.KICKOFF_SPOT;

            //    let kickingTeam = self.homeTeamID();

            //    //if the team with ball is the home team, they are receiving, so set kicking team to away team
            //    if (self.currentTeamWithBall() === self.homeTeamID()) {
            //        kickingTeam = self.awayTeamID();
            //    }                

            //    //KICKOFF => if kicking team is away team, kick from right of field, otherwise kick from left of field (default)
            //    //SAFETY => same side of field as KICKOFF, just use different kickoff spot
            //    //EXTRA POINT => if kicking team is home team, kick from right of field, otherwise kick from left of field (default)
            //    //since receiving team is already marked as having the ball on kickoffs, add 30 + 2 (ball width) to mark kickoff spot
            //    //for safety it will be 60 + 2 (ball width)
            //    if (isKickoff()) {
            //        console.log('SPOT BEFORE CHANGE (KICKOFF): %s', spot);
            //        if (kickingTeam === self.awayTeamID()) {
            //            spot = spot + 32;
            //        }
            //    }

            //    if (isSafety()) {
            //        spot = MODULES.Constants.SAFETY_KICKOFF_SPOT;
            //        console.log('SPOT BEFORE CHANGE (SAFETY): %s', spot);
            //        if (kickingTeam === self.awayTeamID()) {
            //            spot = spot + 62;
            //        }
            //    }

            //    if (isExtraPointKick()) {
            //        spot = MODULES.Constants.EXTRA_POINT_KICK_SPOT;

            //        console.log('SPOT BEFORE CHANGE (EXTRA POINT): %s', spot);
            //        if (kickingTeam === self.homeTeamID()) {
            //            spot = 100 - spot; //subtract spot from 100 to move ball to right side of field
            //        }
            //    }

            //    self.ballSpotStart(spot);

            //    console.log('AFTER KICKOFF SPOT SET => Home Team: %s, Away Team: %s, Kicking Team %s, Spot: %s', self.homeTeamID(), self.awayTeamID(), kickingTeam, spot);
            //}
            if (isExtraPointKick() || isKickoff() || isSafety()) {
                //set spot depending on type of kick, default is normal kickoff
                let spot = MODULES.Constants.KICKOFF_SPOT;

                if (isKickoff()) {
                    console.log('SPOT BEFORE CHANGE (KICKOFF): %s', spot);
                    spot = spot + 30;
                }
                if (isSafety()) {
                    spot = MODULES.Constants.SAFETY_KICKOFF_SPOT;
                    console.log('SPOT BEFORE CHANGE (SAFETY): %s', spot);
                    spot = spot + 60;
                }
                if (isExtraPointKick()) {
                    spot = MODULES.Constants.EXTRA_POINT_KICK_SPOT;
                    console.log('SPOT BEFORE CHANGE (EXTRA POINT): %s', spot);
                }
                self.ballSpotStart(spot);
            }
            console.log('just return ball spot: %s', self.ballSpotStart());
            ////otherwise (field goal or  leave the ball kick off spot
            self.SetBallPosition();
            return self.ballSpotStart();
        };
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
                let marginWidth = 181 - trailWidth - self.ballSpotStart() * ratio;
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
        self.InitializeBoxScore = function () {
            //insert two team records for this game
            let homeBoxScore = new MODULES.Constructors.GameBoxScoreRecord(
                self.homeTeamID(),
                self.homeTeamInfo().teamName(),
                0, 0, 0, 0, 0
            );
            let awayBoxScore = new MODULES.Constructors.GameBoxScoreRecord(
                self.awayTeamID(),
                self.awayTeamInfo().teamName(),
                0, 0, 0, 0, 0
            );

            self.gameBoxScore.push(homeBoxScore);
            self.gameBoxScore.push(awayBoxScore);
        };
        self.UpdateBoxScore = function () {
            //TODO: call this at the end of each score to add total score for each team
            let quarter = self.currentQuarter();
            let homeTeam = $.grep(self.gameBoxScore(), function (team) { return team.teamId === self.homeTeamID(); })[0]; //get the home team
            let awayTeam = $.grep(self.gameBoxScore(), function (team) { return team.teamId === self.awayTeamID(); })[0]; //get the away team

            if (self.gameBoxScore().length > 0) {
                if (quarter === 1) {
                    homeTeam.firstQuarterScore = self.homeTeamScore();
                    awayTeam.firstQuarterScore = self.awayTeamScore();
                }
                if (quarter === 2) {
                    homeTeam.secondQuarterScore = self.homeTeamScore() - homeTeam.firstQuarterScore;
                    awayTeam.secondQuarterScore = self.awayTeamScore() - awayTeam.firstQuarterScore;
                }
                if (quarter === 3) {
                    homeTeam.thirdQuarterScore = self.homeTeamScore() - homeTeam.firstQuarterScore - homeTeam.secondQuarterScore;
                    awayTeam.thirdQuarterScore = self.awayTeamScore() - awayTeam.firstQuarterScore - awayTeam.secondQuarterScore;
                }
                if (quarter === 4) {
                    homeTeam.fourthQuarterScore = self.homeTeamScore() - homeTeam.firstQuarterScore - homeTeam.secondQuarterScore - homeTeam.thirdQuarterScore;
                    awayTeam.fourthQuarterScore = self.awayTeamScore() - awayTeam.firstQuarterScore - awayTeam.secondQuarterScore - awayTeam.thirdQuarterScore;
                }
                if (quarter >= 5) {
                    homeTeam.overtimeScore = self.homeTeamScore() - homeTeam.firstQuarterScore - homeTeam.secondQuarterScore - homeTeam.thirdQuarterScore - homeTeam.fourthQuarterScore;
                    awayTeam.overtimeScore = self.awayTeamScore() - awayTeam.firstQuarterScore - awayTeam.secondQuarterScore - awayTeam.thirdQuarterScore - awayTeam.fourthQuarterScore;
                }

                self.gameBoxScore.refresh(homeTeam);
            }
            else {
                console.log('ERROR: gameBoxScore array was never initialized. Initializing...');
                self.InitializeBoxScore();
                console.log('Updating Box Score...');
                self.UpdateBoxScore();
            }
        };
        self.InitializeGameStats = function () {
            //insert two team records for this game
            let homeTeamPlayStat = new MODULES.Constructors.GamePlayStatRecord(
                self.homeTeamID(),
                self.homeTeamInfo().teamName(),
                0, 0, 0, 0, 0, 0
            );
            let awayTeamPlayStat = new MODULES.Constructors.GamePlayStatRecord(
                self.awayTeamID(),
                self.awayTeamInfo().teamName(),
                0, 0, 0, 0, 0, 0
            );

            self.gamePlayStats.push(homeTeamPlayStat);
            self.gamePlayStats.push(awayTeamPlayStat);
        };
        self.UpdateGameStat = function (teamStatUpdates) {
            //TODO: call this at the end of each play to update team stats
            if (self.gamePlayStats().length > 0) {
                let team = $.grep(self.gamePlayStats(), function (team) { return team.teamId === teamStatUpdates.teamId; })[0]; //get the team that needs an update

                team.totalPlayCount += teamStatUpdates.totalPlayCount;
                team.totalYardsRushing += teamStatUpdates.totalYardsRushing;
                team.totalYardsPassing += teamStatUpdates.totalYardsPassing;
                team.totalTimePossession += teamStatUpdates.totalTimePossession;
                team.totalTurnovers += teamStatUpdates.totalTurnovers;
                team.totalFirstDowns += teamStatUpdates.totalFirstDowns;

                self.gamePlayStats.refresh(team);
            }
            else {
                console.log('ERROR: gamePlayStats array was never initialized. Initializing...');
                self.InitializeGameStats();
                console.log('Updating Box Score...');
                self.UpdateGameStat();
            }
        };
        self.RollDice = function () {
            gameDice.init();
            self.hasRolled(true); //flag that the user has rolled the dice            
        };
        self.CallTimeout = function () {
            console.log('TODO: Setup Timeout functionality.');
            if (self.currentTeamHasTimeOuts()) {
                if (self.currentTeamWithBall() === self.awayTeamID())
                    self.awayTeamTimeOuts(self.awayTeamTimeOuts() - 1);
                else
                    self.homeTeamTimeOuts(self.homeTeamTimeOuts() - 1);
            }
            else
                alert('No Timeouts Remaining');
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
        self.MakePlayAfterTD = function () {
            //handles plays after a touchdown (point after attempt or 2 point conversion)
            playMaker.initPlayAfterTouchdown();
            $('input[name=afterTDPlay][value=extraPoint]').prop('checked', 'checked');//reset play selector to default
        };
        self.SetupField = function () {
            console.log('SETTING UP FIELD');
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
            console.log('SETTING BALL POSITION');
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
        self.showKickoffControls = ko.observable(true); //determines when to show kickoff controls
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

            //call function to set default value
            self.SelectCoinTossWinningOption();
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
            }
            else {
                alert('Select kick power and angle');
            }
        };
        self.SetupKickoff = function () {
            self.showKickoffControls(true); //used to show kickoff controls

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

            //set initial kickoff ball spot for display:
            self.SetupKickoffBallSpot();

            //setup power slider movement
            self.kickoffPowerSliderIntervalId = window.setInterval(function () {
                $("#kickoffPower").val(i += 1 * reverse);
                if (i === max)
                    reverse = -1;
                if (i === min)
                    reverse = 1;
            }, MODULES.GameVariables.KickoffSliderDifficulty);

            //setup angle slider movement
            self.kickoffAngleSliderIntervalId = window.setInterval(function () {
                $("#kickoffAngle").val(i += 1 * reverse);
                if (i === max)
                    reverse = -1;
                if (i === min)
                    reverse = 1;
            }, MODULES.GameVariables.KickoffSliderDifficulty);
        };
        self.ShowHideSpecialTeamsMenu = function () {
            //show/hide special teams menu depending on down
            if (self.currentDown() === 4) {
                $('#specialTeamsMenu').addClass(MODULES.Constants.SHOW_SPECIAL_TEAMS_CLASS);
            }
            else {
                $('#specialTeamsMenu').removeClass(MODULES.Constants.SHOW_SPECIAL_TEAMS_CLASS);
            }
        };
        self.ChangePossession = function () {
            self.yardsToFirst(10);
            self.currentDown(1);
            self.playCountForPossession(1); //reset play count for possession
            self.timeOfPossession(0); //reset time of possession

            //change possession of ball
            if (self.currentTeamWithBall() === self.awayTeamID())
                self.currentTeamWithBall(self.homeTeamID());
            else
                self.currentTeamWithBall(self.awayTeamID());
        };
        self.PuntBall = function () {
            self.isPunt(true);
            self.SetupKickoff();
        };
        self.KickFieldGoal = function () {
            self.isFieldGoal(true);
            self.SetupKickoff();
        };
        //END KICKOFF VARIABLES/FUNCTIONS
        self.SelectTeam = function () {
            let teamIdSelected = parseInt($('input[name=selectTeam]:checked').val(), 10);

            if (teamIdSelected === self.homeTeamID()) {
                alert('The away team must be different than the home team.  Please select a different team.');
            }
            else {
                self.ClearCoinColors();

                //console.log('Team Selected %s.', typeof teamIdSelected);

                if (typeof teamIdSelected === 'number') {

                    //console.log('Team Selected %s.', teamIdSelected);

                    if (!self.homeTeamID())
                        self.homeTeamID(teamIdSelected);
                    else
                        self.awayTeamID(teamIdSelected);
                }
            }
        };
        self.StartGame = function () {
            self.currentTeamWithBall(self.teamReceivingInitialKickoff());
            self.pointAttemptAfterTouchDown(false);
            self.SetupField();
            self.isKickoff(true);
            self.SetupKickoff();
            self.gameStarted(true);
            self.InitializeBoxScore();
            self.InitializeGameStats();
        };
        self.ResetTeams = function () {
            self.ClearCoinColors();
            self.homeTeamID(0);
            self.awayTeamID(0);
            console.log('TEAMS RESET');
        };
        self.ShowOtherGameInfo = function () {
            if ($("#gameInfoBox").is(":hidden")) {
                $("#gameInfoBox").show("slow");
            } else {
                $("#gameInfoBox").slideUp();
            }
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

    //KO function to "refresh" an observable array when a non observable item is updated. (refreshes the DOM)
    //source: https://stackoverflow.com/questions/13231738/refresh-observablearray-when-items-are-not-observables
    ko.observableArray.fn.refresh = function (item) {
        var index = this['indexOf'](item);
        if (index >= 0) {
            this.splice(index, 1);
            this.splice(index, 0, item);
        }
    };

    ko.applyBindings(viewModel);

    //initially set game info to hidden
    $("#gameInfoBox").slideUp();
}); //END DOCUMENT READY FUNCTION

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

        MODULES.GameVariables.DiceSumTotal = diceSum;

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
    if (number % 100 === 10 || number % 100 === 11 || number % 100 === 12 || number % 100 === 13
        || number % 10 === 4 || number % 10 === 5 || number % 10 === 6 || number % 10 === 7
        || number % 10 === 8 || number % 10 === 9 || number % 10 === 0)
        return number.toString() + 'th';
    if (number % 10 === 1)
        return number.toString() + 'st';
    if (number % 10 === 2)
        return number.toString() + 'nd';
    if (number % 10 === 3)
        return number.toString() + 'rd';
}

var playMaker = {
    init: function () {
        playMaker.play();
    },

    initPlayAfterTouchdown: function () {
        playMaker.playAfterTouchdown();
    },

    display: function (playText) {
        $("#playResult").text(playText);
        $("#playCount").text(MODULES.GameVariables.TotalPlayCount);
    },

    getPlayResult: function (playSelected) {
        let _yards = 0;
        let _playResultText = UTILITIES.splitAndTitleCase(playSelected);
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
        if (MODULES.GameVariables.DiceSumTotal >= 7)
            _positiveYards = true;

        if (MODULES.GameVariables.DiceSumTotal <= 3)
            _negativeYards = true;

        //HANDLE EXTRA POINT (after touchdown) PLAYS:
        if (playSelected === GAME_PLAY_TYPES.TWOPOINTCONVERSION) {
            turnover = true; //always change possession after extra point attempts
            self.isKickoff(true);
            self.SetupKickoff();

            //TWO POINT CONVERSION:
            if (playSelected === GAME_PLAY_TYPES.TWOPOINTCONVERSION && MODULES.GameVariables.DiceSumTotal >= 6) {
                _yards = getRandomInt(1, 4); //need two yards for 2 point conversion
                if (_yards >= MODULES.Constants.TWO_POINT_CONVERSION_SPOT) {
                    _playResultText = _playResultText + ' SUCCESSFUL';
                    playMaker.addScore(SCORE_TYPES.TWOPOINTCONVERSION);
                }
                else {
                    _playResultText = _playResultText + ' FAILED';
                }
            }
            else if (playSelected === GAME_PLAY_TYPES.TWOPOINTCONVERSION) {
                _playResultText = _playResultText + ' FAILED';
            }

        }

        //POSITIVE YARDAGE PLAYS
        if (_positiveYards && playSelected === GAME_PLAY_TYPES.PASS) {

            _yards = getRandomInt(1, yardageMax);
            _playResultText = _playResultText + ' Complete';
        }
        if (_positiveYards && playSelected === GAME_PLAY_TYPES.RUN) {
            _yards = getRandomInt(1, yardageMax);
            _playResultText = _playResultText + ' Successful';
        }
        //NEGATIVE YARDAGE PLAYS
        if (_negativeYards && playSelected === GAME_PLAY_TYPES.PASS) {
            _yards = getRandomInt(1, 15) * -1;
            _playResultText = 'Sacked for a loss';
        }
        if (_negativeYards && playSelected === GAME_PLAY_TYPES.RUN) {
            _yards = getRandomInt(1, 15) * -1;
            _playResultText = _playResultText + ' - tackled for a loss';
        }
        //NO GAIN PLAYS
        if (!_positiveYards && !_negativeYards && playSelected === GAME_PLAY_TYPES.PASS) {
            _playResultText = _playResultText + ' Incomplete';
        }
        if (!_positiveYards && !_negativeYards && playSelected === GAME_PLAY_TYPES.RUN) {
            _playResultText = _playResultText + ' for no gain';
        }

        //TOUCHDOWN
        if (_yards >= self.yardsToTouchdown() && (playSelected === GAME_PLAY_TYPES.PASS || playSelected === GAME_PLAY_TYPES.RUN)) {
            _playResultText = SCORE_TYPES.TOUCHDOWN.toUpperCase();
            playMaker.addScore(SCORE_TYPES.TOUCHDOWN);
            self.pointAttemptAfterTouchDown(true);
        }

        //SAFETY
        if (self.yardsToTouchdown() > 100 && (playSelected === GAME_PLAY_TYPES.PASS || playSelected === GAME_PLAY_TYPES.RUN)) {
            _playResultText = SCORE_TYPES.SAFETY.toUpperCase();
            playMaker.addScore(SCORE_TYPES.SAFETY);
            self.isSafety(true);
            self.SetupKickoff();
            turnover = true;
        }

        //DETERMINE DOWN
        if (_yards >= self.yardsToFirst() && (playSelected === GAME_PLAY_TYPES.PASS || playSelected === GAME_PLAY_TYPES.RUN)) {
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

        console.log('YARDS: ' + _yards);
        let playResult = new MODULES.Constructors.PlayResult(_yards, _playResultText, turnover, playSelected);

        //set the new position of the ball (if not kicking fieldgoal, extrapoint, or two point conversion):
        if (playSelected !== 'fieldGoal' && playSelected !== 'extraPoint' && playSelected !== 'twoPointConversion') {
            self.yardsTraveled(self.yardsTraveled() + _yards);
        }
        self.SetBallPosition();

        //TURNOVER
        if (turnover) {
            //before turning over the ball, record the play of team turning over the ball
            playMaker.recordPlay(playResult);

            //now handle turnover events
            _yards = 0;
            self.ballSpotStart(self.yardsToTouchdown());
            self.yardsTraveled(0); //reset yards traveled for possession
            _playResultText = _playResultText + ' Change of Possession';

            self.ChangePossession();
        }

        self.ShowHideSpecialTeamsMenu();

        //on turnovers, this will return the play of the team taking over possession
        return playResult;
    },

    kickoff: function (kickoffPower, kickoffAngle) {
        let kickoffType = getKickoffType();
        let _yards = convertKickoffPowerToYards(kickoffType, kickoffPower, kickoffAngle);
        let _returnYards = 0;
        let _kickoffResultText = UTILITIES.splitAndTitleCase(kickoffType);
        let ballKickOffSpot = MODULES.Constants.KICKOFF_SPOT; //set ball Spot Start at 35 yard line        
        let isTouchback = false; //flag to determine when touchback occurs
        let isPenalty = false; //flag to determine when there is a penalty on the kickoff
        let isReturnTypeKickoff = kickoffType === KICKOFF_TYPES.KICKOFF || kickoffType === KICKOFF_TYPES.ONSIDE || kickoffType === KICKOFF_TYPES.PUNT || kickoffType === KICKOFF_TYPES.SAFETY;
        let chanceOfBlock = getRandomInt(1, 100); //random number used for determining a chance of a block for kicks that can be blocked

        console.log('kickoffPower: %s, kickoffAngle: %s', kickoffPower, kickoffAngle);

        //determine spot of kick off
        if (self.isPunt() || self.isFieldGoal()) {
            ballKickOffSpot = self.currentBallSpot();
        }
        if (self.isSafety()) {
            ballKickOffSpot = MODULES.Constants.SAFETY_KICKOFF_SPOT;
        }
        if (self.isExtraPointKick()) {
            ballKickOffSpot = MODULES.Constants.EXTRA_POINT_KICK_SPOT;
        }
        
        let totalMaxKickWithoutTouchback = 100 - ballKickOffSpot; //variable used in calculations below for determining max return yards etc.
        let touchbackNoReturn = totalMaxKickWithoutTouchback + 11; //total yards that a kick can be made with no possibility of return - ball is kicked through the end zone 
        //(11 yards + distance to end - zone from ball kick off spot = 100 - kickoffspot + 11)

        console.log('BEGINNING Kickoff Yards: %s, totalMaxKickWithoutTouchback: %s, BALL KICK OFF SPOT: %s', _yards, totalMaxKickWithoutTouchback, ballKickOffSpot);

        //if it's the first quarter, the team receiving should be set to the currentTeam with the ball
        let receivingTeam = self.awayTeamID();
        let kickingTeam = self.homeTeamID();

        if (self.isBeginningOfHalf && self.teamReceivingInitialKickoff() === self.homeTeamID()) {
            receivingTeam = self.homeTeamID();
            kickingTeam = self.awayTeamID();
        }

        //set to false after kickoff TODO: reset to true when 2nd quarter begins
        self.isBeginningOfHalf = false;

        //normal change of possession after kickoff
        if (!self.isBeginningOfHalf) {
            if (self.currentTeamWithBall() === self.homeTeamID()) {
                receivingTeam = self.homeTeamID();
                kickingTeam = self.awayTeamID();
            }
        }

        if (kickoffType === KICKOFF_TYPES.ONSIDE) {
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
        else if (kickoffType === KICKOFF_TYPES.EXTRAPOINT || kickoffType === KICKOFF_TYPES.FIELDGOAL) {
            //handle field goals and extra point kicks very similarly
            if (chanceOfBlock > 6) {
                //need 25 yards for good extra point
                if (_yards > totalMaxKickWithoutTouchback + MODULES.Constants.END_ZONE_YARDS) {
                    _kickoffResultText += ' GOOD';                    
                    playMaker.addScore(kickoffType);
                }
                else {
                    _kickoffResultText += ' NO GOOD';
                }
            }
            else {
                _kickoffResultText += ' Blocked';
            }
        }        
        else {
            //Normal Kickoff, Punt, Safety
            console.log('HANDLE NORMAL KICKOFF/PUNT/SAFETY');
            if (chanceOfBlock < 6 && kickoffType === KICKOFF_TYPES.PUNT) {
                _kickoffResultText += ' Blocked';
            }
            else {
                //handle normal kicks and touchback logic
                //if angle is extreme, no matter what the power is, the ball will go out of bounds: (only for safety kicks and normal kickoffs
                if ((kickoffAngle <= 20 || kickoffAngle >= 80) && (kickoffType === KICKOFF_TYPES.SAFETY || kickoffType === KICKOFF_TYPES.KICKOFF)) {
                    _yards = 35; //mark spot at opposing teams 35 for penalty
                    _kickoffResultText += ' Penalty - Ball kicked out of bounds.';
                    isPenalty = true;
                }
                else if (_yards >= touchbackNoReturn) {
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
        }

        //self.currentTeamWithBall(receivingTeam); //this will be the team running or getting a touchback.

        console.log('Kickoff type: %s, Kickoff distance: %s, kickoff return: %s, TeamID With Ball: %s', kickoffType, _yards, _returnYards, receivingTeam);

        //create a play result and record it in the play history
        let kickoffResult = new MODULES.Constructors.PlayResult(_yards, _kickoffResultText);

        //record/show play results       
        self.currentTeamWithBall(kickingTeam); //set current team with ball to kickoff team briefly to record the correct team name in the history
        playMaker.recordPlay(kickoffResult);

        //show return of kick (if any), but only for kicks that allow for returns
        if (isReturnTypeKickoff) {
            let _returnPlayText = 'Kickoff Return';

            //Handle new spot of ball
            if (isTouchback || isPenalty) {
                if (isTouchback) {
                    _returnPlayText += ' - TOUCHBACK';
                    //set ball at 20 yard line when a touchback occurs
                    _yards = MODULES.Constants.TOUCHBACK_YARD_LINE;
                }

                ////home is left end-zone, away is right
                //if (self.currentTeamWithBall() === self.awayTeamID()) {
                //    self.ballSpotStart(100 - _yards);
                //}
                //else {
                self.ballSpotStart(_yards);
                //}
            }
            else {
                let ballSpotTotal = 100 - ballKickOffSpot + _yards - _returnYards;
                console.log('BALL SPOT TOTAL: %s', ballSpotTotal);

                //if (self.currentTeamWithBall() === self.awayTeamID()) {
                //    self.ballSpotStart(100 - ballSpotTotal); //add the yards kicked, and subtract the yards returned from the ball kickoff spot to get new ball start.
                //}
                //else {
                self.ballSpotStart(100 - ballSpotTotal);
                //}
            }
            //TODO: Handle return for Touchdown 

            //create a play result and record it in the play history
            let returnResult = new MODULES.Constructors.PlayResult(_returnYards, _returnPlayText);
            self.currentTeamWithBall(receivingTeam); //set back to receiving team for proper team in play history
            playMaker.recordPlay(returnResult);
        }

        //set the new position of the ball
        self.SetBallPosition();

        //setup for next kickoff
        playMaker.resetKickoffFlags(kickoffType);
    },

    resetKickoffFlags: function (kickoffType) {
        self.showKickoffControls(false);

        if (kickoffType === KICKOFF_TYPES.KICKOFF || kickoffType === KICKOFF_TYPES.ONSIDE)
            self.isKickoff(false);
        else if (kickoffType === KICKOFF_TYPES.EXTRAPOINT)
            self.isExtraPointKick(false);
        else if (kickoffType === KICKOFF_TYPES.SAFETY)
            self.isSafety(false);
        else if (kickoffType === KICKOFF_TYPES.FIELDGOAL)
            self.isFieldGoal(false);
        else if (kickoffType === KICKOFF_TYPES.PUNT)
            self.isPunt(false);
    },

    recordTimeOfPossession: function (typeOfPlay, yards) {
        let timeSpentWithBall = 0; //represents second team spent with ball
        //SOURCE: https://www.teamrankings.com/nfl/stat/average-time-of-possession-net-of-ot
        //nfl avgerages (time of possession) = avg. time of possession / avg. number of plays 
        //~26.20s / play on high end
        //~28.40s / play on low end
        //27.3 rounded up to 27 even = time per play

        timeSpentWithBall += 5; //automatically add 5 seconds for setting up play etc.

        //(TODO: Subtract time from clock based on yards and type of play)
        if (typeOfPlay === GAME_PLAY_TYPES.RUN)
            timeSpentWithBall += Math.round(yards / 2); //run 2 yards/second

        if (typeOfPlay === GAME_PLAY_TYPES.PASS) {
            timeSpentWithBall += 2; //automatically add 2 seconds for time to throw.
            timeSpentWithBall += Math.round(yards / 10); //pass 10 yards/second
            timeSpentWithBall += Math.round(yards / 4 / 2); //count about 1/4 of the pass yards as a catch and run, so use part of the 2yards/s calc. for 1/4 of the yards
        }

        console.log('TIME OF POSSESSION: %s', self.timeOfPossession());

        timeSpentWithBall = Math.round(timeSpentWithBall);

        self.timeOfPossession(timeSpentWithBall); //record time of possession in seconds

        //TODO: Handle SETTING THE REMAINING TIME in a game-wide time management function that changes the quarter etc.
    },

    recordPlay: function (thisPlaysResult) {
        let team = $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.currentTeamWithBall(); })[0]; //get the current team making the play
        let pluralizer = 's';

        if (thisPlaysResult.yards === 1 || thisPlaysResult.yards === -1)
            pluralizer = '';

        let yardsText = thisPlaysResult.yards.toString() + " Yard" + pluralizer;
        console.log('This Play:' + thisPlaysResult.playResultText + ' by the ' + team.teamName() + ' for ' + yardsText);

        //MODULES.Constructors.PlayHistory: teamId, teamName, down, playCount, playYards, playResult, ballSpot
        self.AddPlayHistory(new MODULES.Constructors.PlayHistory(self.teamPlayHistory().length + 1, self.currentTeamWithBall(),
            team.teamName(),
            HELPERS.getDownText(self.currentDown(), self.yardsToFirst()),
            self.playCountForPossession(),
            yardsText,
            thisPlaysResult.playResultText,
            HELPERS.getYardText())); //Spot of Ball text in Play History

        playMaker.display(thisPlaysResult.playResultText + ' for ' + thisPlaysResult.yards.toString() + ' Yard' + pluralizer);

        //RECORD TIME OF POSSESSION
        this.recordTimeOfPossession(thisPlaysResult.playSelected, thisPlaysResult.yards);

        //now record stats for this play
        this.recordGameStats(team, thisPlaysResult);
    },

    recordGameStats: function (team, thisPlaysResult) {
        let playStatsRecord = new MODULES.Constructors.GamePlayStatRecord(team.teamId, team.teamName, 1, 0, 0, self.timeOfPossession(), 0, 0); //construct new GamePlayStatRecord

        if (thisPlaysResult.playType === GAME_PLAY_TYPES.RUN) {
            playStatsRecord.totalYardsRushing = thisPlaysResult.yards;
        }

        if (thisPlaysResult.playType === GAME_PLAY_TYPES.PASS) {
            playStatsRecord.totalYardsPassing = thisPlaysResult.yards;
        }

        if (thisPlaysResult.isTurnover)
            playStatsRecord.totalTurnovers = 1;

        self.UpdateGameStat(playStatsRecord);
    },

    play: function () {
        let playSelected = $('input[name=selectPlay]:checked').val();
        if (playSelected) {
            self.hasRolled(false); //reset flag so player has to roll before making next play

            //clear results in list of die values
            $("#diceValues").empty();

            let thisPlaysResult = playMaker.getPlayResult(playSelected);

            playMaker.recordPlay(thisPlaysResult);

            MODULES.GameVariables.TotalPlayCount += 1;
        } else {
            self.hasRolled(true);
            alert('Choose a play');
        }
    },

    playAfterTouchdown: function () {
        let playSelected = $('input[name=afterTDPlay]:checked').val();
        let spot = MODULES.Constants.EXTRA_POINT_KICK_SPOT;

        self.yardsTraveled(0); //reset yards traveled since team already got TD
        self.pointAttemptAfterTouchDown(false); //reset point after attempt flag

        //START_HERE
        if (playSelected === GAME_PLAY_TYPES.EXTRAPOINT) {
            self.isExtraPointKick(true);
            self.SetupKickoff();
        }
        else if (playSelected === GAME_PLAY_TYPES.TWOPOINTCONVERSION) {
            spot = MODULES.Constants.TWO_POINT_CONVERSION_SPOT;
        }

        self.ballSpotStart(spot);
        self.SetBallPosition();
        //this is going to use same kickoff params as normal kickoffs
        //already wrote conversion from kickoff power and angle [e.g. convertKickoffPowerToYards('extrapoint', 39, 40);]
    },

    addScore: function (type) {
        let score = 0;
        switch (type) {
            case SCORE_TYPES.TOUCHDOWN:
                score = 6;
                break;
            case SCORE_TYPES.FIELDGOAL:
                score = 3;
                break;
            case SCORE_TYPES.EXTRAPOINT:
                score = 1;
                break;
            case SCORE_TYPES.SAFETY, SCORE_TYPES.TWOPOINTCONVERSION:
                score = 2;
                break;
        }
        if (currentTeamWithBall() === homeTeamID()) {
            //add score to home team, unless safety
            if (type === SCORE_TYPES.SAFETY)
                awayTeamScore(awayTeamScore() + score);
            else
                homeTeamScore(homeTeamScore() + score);
        }
        else { //add score to away team, unless safety
            if (type === SCORE_TYPES.SAFETY)
                homeTeamScore(homeTeamScore() + score);
            else
                awayTeamScore(awayTeamScore() + score);
        }

        //update the box score
        self.UpdateBoxScore();
    }
};

function getKickoffType() {
    //default to the normal or onside kick (depending on user selection)
    let kickOffType = $('input[name=selectKickoffPlay]:checked').val();

    if (self.isPunt())
        kickOffType = KICKOFF_TYPES.PUNT;
    else if (self.isFieldGoal())
        kickOffType = KICKOFF_TYPES.FIELDGOAL;
    else if (self.isSafety())
        kickOffType = KICKOFF_TYPES.SAFETY;
    else if (self.isExtraPointKick())
        kickOffType = KICKOFF_TYPES.EXTRAPOINT;

    return kickOffType;
}

function convertKickoffPowerToYards(kickoffType, kickoffPower, kickoffAngle) {
    let angleSubtractor = 0;
    let kickoffYards = 0;

    if (kickoffType === KICKOFF_TYPES.EXTRAPOINT) {
        //need at least 25 yards for successful extra point kick (ball placed on 15yd line and end zone is 10 yds)
        if (kickoffPower >= 60)
            kickoffYards = 31;
        else if (kickoffPower >= 40)
            kickoffYards = 29;
        else if (kickoffPower >= 25)
            kickoffYards = 25; //must kick a very "straight" angled kick so no yards are subtracted
        else
            kickoffYards = kickoffPower; //anything under 25 basically will result in not enough yards

    }    
    else if (kickoffType === KICKOFF_TYPES.ONSIDE) {
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
    else if (kickoffType === KICKOFF_TYPES.PUNT) {
        //average punt = 50yards on high end, 42yrds on low end, longest punt in NFL was 98yards (1 yd line to 1 yd line, otherwise it's a touchback)
        //just set the punt distance to the power; 100 = 100 yds, 50 = 50yds etc.
        kickoffYards = kickoffPower;
    }
    else if (kickoffType === KICKOFF_TYPES.FIELDGOAL) {
        let boostYards = 0;
        //Add "boost" yards depending on how close the team is within the 40 yard line to the end zone
        if (self.yardsToTouchdown() >= 40)
            boostYards = 1;
        else if (self.yardsToTouchdown() >= 30)
            boostYards = 2;
        else if (self.yardsToTouchdown() >= 20)
            boostYards = 4;
        else if (self.yardsToTouchdown() >= 10)
            boostYards = 6;
        else if (self.yardsToTouchdown() >= 5)
            boostYards = 8;
        else if (self.yardsToTouchdown() >= 4)
            boostYards = 9;
        else if (self.yardsToTouchdown() >= 1)
            boostYards = 10; //basically make it almost a given if the team is on the goal line by giving them ten yards, even the lowest power (as long as it's "straight") will result in a good kick

        if (kickoffPower >= 90)
            kickoffYards = getRandomInt(60, 70); //max field goal in NFL is 64yards as of 11/3/2018, this allows random yardage between 60 and 70yds max
        else if (kickoffPower >= 80)
            kickoffYards = getRandomInt(50, 60);
        else if (kickoffPower >= 70)
            kickoffYards = getRandomInt(40, 50);
        else if (kickoffPower >= 60)
            kickoffYards = getRandomInt(30, 40);
        else if (kickoffPower >= 50)
            kickoffYards = getRandomInt(20, 30);
        else if (kickoffPower >= 40)
            kickoffYards = getRandomInt(10, 20);
        else
            kickoffYards = getRandomInt(1, 10);

        kickoffYards += boostYards; //add boost yards (determined by how close to end-zone team is), this makes the kick "easier" depending on how close to the goal posts the team is
    }
    else {
        //Handle normal kickoffs and safety kicks (and any other kick types that don't have a special case above)
        //max kickoff before touchback = 65yds
        let distanceToEndZone = function () {
            if (kickoffType === KICKOFF_TYPES.SAFETY)
                return 100 - MODULES.Constants.SAFETY_KICKOFF_SPOT;
            else
                return 100 - MODULES.Constants.KICKOFF_SPOT;
        }();
        
        //normal kickoff with a power greater than 80 will result in touchback
        if (kickoffPower >= 98)
            kickoffYards = distanceToEndZone + 11; //kick is out of bounds in end zone with no chance of return (TOUCHBACK)
        else if (kickoffPower >= 80)
            kickoffYards = getRandomInt(distanceToEndZone + 1, distanceToEndZone + 10);
        else if (kickoffPower >= 75)
            kickoffYards = distanceToEndZone; //between 75 and 80, is a kick to the goal line essentially
        else if (kickoffPower >= 70)
            kickoffYards = getRandomInt(distanceToEndZone - 15, distanceToEndZone - 1);
        else if (kickoffPower >= 60)
            kickoffYards = getRandomInt(distanceToEndZone - 25, distanceToEndZone - 15);
        else if (kickoffPower >= 50)
            kickoffYards = getRandomInt(distanceToEndZone - 35, distanceToEndZone - 25);
        else if (kickoffPower >= 40)
            kickoffYards = getRandomInt(distanceToEndZone - 45, distanceToEndZone - 35);
        else if (kickoffPower >= 30)
            kickoffYards = getRandomInt(distanceToEndZone - 55, distanceToEndZone - 45);
        else
            kickoffYards = getRandomInt(1, distanceToEndZone - 55);
    }

    //for every 10 degrees outside of middle kick, reduce total yards kicked;
    //perfect middle kick is 50, reduce by specific factor of the kick power (determined above) if angle is <= 40 or >= 60
    if (kickoffAngle <= 0 || kickoffAngle >= 100)
        angleSubtractor = Math.round(kickoffYards / 2.8);
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