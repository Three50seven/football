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
        let bigYardPlay = UTILITIES.getRandomInt(1, 100) >= 85;
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
                _yards = UTILITIES.getRandomInt(1, 4); //need two yards for 2 point conversion
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

            _yards = UTILITIES.getRandomInt(1, yardageMax);
            _playResultText = _playResultText + ' Complete';
        }
        if (_positiveYards && playSelected === GAME_PLAY_TYPES.RUN) {
            _yards = UTILITIES.getRandomInt(1, yardageMax);
            _playResultText = _playResultText + ' Successful';
        }
        //NEGATIVE YARDAGE PLAYS
        if (_negativeYards && playSelected === GAME_PLAY_TYPES.PASS) {
            _yards = UTILITIES.getRandomInt(1, 15) * -1;
            _playResultText = 'Sacked for a loss';
        }
        if (_negativeYards && playSelected === GAME_PLAY_TYPES.RUN) {
            _yards = UTILITIES.getRandomInt(1, 15) * -1;
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
        let chanceOfBlock = UTILITIES.getRandomInt(1, 100); //random number used for determining a chance of a block for kicks that can be blocked

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
                _yards = UTILITIES.getRandomInt(10, 20); //ball at least has to travel 10 yards, but has a chance of traveling 20

                //now determine if kicking team gets the ball or the return team gets it. TODO: is this 20%?
                if (UTILITIES.getRandomInt(1, 100) <= 20) {
                    receivingTeam = kickingTeam; //essentially a turnover
                }
                else {
                    //team return yards:
                    if (UTILITIES.getRandomInt(1, 100) <= 5) {
                        _returnYards = UTILITIES.getRandomInt(1, 10); //small chance of returning for 1-10 yards
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
                    _returnYards = UTILITIES.getRandomInt(1, _yards + ballKickOffSpot); //ball can easily be returned for touchdown since it's essentially a normal kickoff
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
                        if (UTILITIES.getRandomInt(1, 100) >= 85) {
                            let minYards = _yards - totalMaxKickWithoutTouchback;
                            let maxYards = 40;
                            let chanceOfBigReturn = UTILITIES.getRandomInt(1, 100);
                            console.log('Chance of big return: %s, Minimum Return Yards: %s, Maximum Return Yards: %s', chanceOfBigReturn, minYards, maxYards);

                            //chance of big return; There is a small chance the ball will be returned, but most likely result will be a touchback
                            if (chanceOfBigReturn >= 90) {
                                maxYards = _yards + ballKickOffSpot;
                                //receiving team will at least run the ball out of the end-zone if they "decide" to return (yards kicked - 65 (total max kick for goal line reception)
                                _returnYards = UTILITIES.getRandomInt(minYards, maxYards);
                            }
                            else { //bigger chance of just a 40yd return.
                                _returnYards = UTILITIES.getRandomInt(minYards, maxYards); //more likely chance only allows for return of 40 yards
                            }
                        } else {
                            isTouchback = true;
                        }
                    }
                    else {
                        console.log('Chance of normal return, Minimum Return Yards: %s, Maximum Return Yards: %s', 1, _yards + ballKickOffSpot);
                        _returnYards = UTILITIES.getRandomInt(1, _yards + ballKickOffSpot); //ball is most likely going to be returned on a normal kickoff under 65 yards
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