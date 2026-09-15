var playMaker = {
    init: function (playSelected) {
        playMaker.play(playSelected);
    },

    initPlayAfterTouchdown: function () {
        playMaker.playAfterTouchdown();
    },

    display: function (playText, team) {
        if (team) {
            $("#lastPlayTeamIcon").attr("src", team.teamImage()).show();
            $("#lastPlayTeamName").text(team.teamCityAndName());
            $("#lastPlaySeparator").show();
        }
        else {
            $("#lastPlayTeamIcon").attr("src", "").hide();
            $("#lastPlayTeamName").text("");
            $("#lastPlaySeparator").hide();
        }

        $("#playResult").text(playText);

        let lastPlay = $(".last-play-container");
        lastPlay.removeClass("last-play-update");
        if (lastPlay.length)
            void lastPlay[0].offsetWidth;
        lastPlay.addClass("last-play-update");
    },

    displayScore: function (score, type, team) {
        let labels = {};
        labels[SCORE_TYPES.TOUCHDOWN] = 'TOUCHDOWN';
        labels[SCORE_TYPES.FIELDGOAL] = 'FIELD GOAL IS GOOD';
        labels[SCORE_TYPES.EXTRAPOINT] = 'THE EXTRA POINT IS GOOD';
        labels[SCORE_TYPES.TWOPOINTCONVERSION] = 'THE POINT CONVERSION IS GOOD';
        labels[SCORE_TYPES.SAFETY] = 'SAFETY';

        let feedback = $("#field-score-feedback");
        let field = $("#field-img");
        let ball = $("#ball-position-img");
        if (!feedback.length || !field.length || !ball.length)
            return;

        feedback.text('+' + score + ' ' + labels[type] + ' - ' + team.teamCityAndName());
        feedback.removeClass("field-score-feedback-active").css('left', '0px');

        let ballLeft = parseFloat(ball.css('margin-left')) || 0;
        let fieldWidth = field.width();
        feedback.css('max-width', Math.max(fieldWidth * 0.72, 120) + 'px');
        feedback.addClass("field-score-feedback-active");

        let feedbackWidth = feedback.outerWidth();
        let feedbackLeft = ballLeft + 10;
        if (feedbackLeft + feedbackWidth > fieldWidth - 4)
            feedbackLeft = Math.max(4, ballLeft - feedbackWidth - 10);
        feedback.css('left', feedbackLeft + 'px');
    },

    getPlayResult: function (playSelected, pointAttemptPlayType) {
        let _yards = 0;
        let _playResultText = UTILITIES.splitAndTitleCase(playSelected);
        let _positiveYards = false;
        let _negativeYards = false;
        let bigYardPlay = UTILITIES.getRandomInt(1, 100) >= 85;
        let yardageMax = 15;
        let turnover = false;
        let isLiveBallTurnover = false;
        let isKickoffAlreadySetup = false; //true once a safety/2pt conversion has already placed the ball for the next kickoff
        let distanceToGoalLine = self.yardsToTouchdown(); //distance needed for a touchdown before this play's yardage is applied
        let isOverthrownIncomplete = false; //a pass thrown beyond the back of the end zone is incomplete, not a touchdown

        self.playCountForPossession(self.playCountForPossession() + 1);
        self.consecutiveDelayOfGamePenalties(0); //the ball was snapped, so the delay of game streak is broken

        //Chance of a big yard play is increased
        if (bigYardPlay)
            yardageMax = distanceToGoalLine;

        if (MODULES.GameVariables.DiceSumTotal >= 7)
            _positiveYards = true;

        if (MODULES.GameVariables.DiceSumTotal <= 3)
            _negativeYards = true;

        //HANDLE TWO POINT CONVERSION (after touchdown) PLAYS:
        if (playSelected === GAME_PLAY_TYPES.TWOPOINTCONVERSION) {
            let attemptingTeam = self.pointAttemptTeamId || self.currentTeamWithBall();
            let defensiveTeam = attemptingTeam === self.homeTeamID() ? self.awayTeamID() : self.homeTeamID();
            let defensiveReturn = UTILITIES.getRandomInt(1, 100) <= 2;
            let conversionSucceeded = pointAttemptPlayType === GAME_PLAY_TYPES.PASS
                ? MODULES.GameVariables.DiceSumTotal >= 7
                : MODULES.GameVariables.DiceSumTotal >= 6;

            self.currentTeamWithBall(attemptingTeam);

            if (defensiveReturn) {
                self.currentTeamWithBall(defensiveTeam);
                _playResultText = UTILITIES.getRandomInt(1, 2) === 1
                    ? 'FUMBLE RECOVERED AND RETURNED FOR 2 POINTS'
                    : 'INTERCEPTED AND RETURNED FOR 2 POINTS';
                playMaker.addScore(SCORE_TYPES.TWOPOINTCONVERSION);
            }
            else if (conversionSucceeded) {
                _yards = MODULES.Constants.TWO_POINT_CONVERSION_SPOT;
                _playResultText = 'TWO POINT CONVERSION GOOD';
                playMaker.addScore(SCORE_TYPES.TWOPOINTCONVERSION);
            }
            else {
                _playResultText = pointAttemptPlayType === GAME_PLAY_TYPES.PASS
                    ? 'TWO POINT CONVERSION FAILED - PASS INCOMPLETE'
                    : 'TWO POINT CONVERSION FAILED - RUN STOPPED';
            }

            let conversionResult = new MODULES.Constructors.PlayResult(_yards, _playResultText, defensiveReturn, playSelected);
            playMaker.recordPlay(conversionResult);
            conversionResult.wasRecorded = true;

            self.isTwoPointConversion(false);
            self.currentTeamWithBall(defensiveTeam);
            self.yardsTraveled(0);
            self.yardsToFirst(10);
            self.currentDown(1);
            self.isKickoff(true);
            self.SetupKickoff();
            self.ShowHideSpecialTeamsMenu();

            return conversionResult;
        }

        //POSITIVE YARDAGE PLAYS
        if (_positiveYards && playSelected === GAME_PLAY_TYPES.PASS) {
            _yards = UTILITIES.getRandomInt(1, yardageMax);

            //a pass thrown past the goal line plus the depth of the end zone sails out the back - ruled incomplete
            if (distanceToGoalLine > 0 && _yards >= distanceToGoalLine + MODULES.Constants.END_ZONE_YARDS) {
                _yards = 0;
                isOverthrownIncomplete = true;
                _playResultText = _playResultText + ' Incomplete - Overthrown';
            }
            else {
                _playResultText = _playResultText + ' Complete';
            }
        }
        if (_positiveYards && playSelected === GAME_PLAY_TYPES.RUN) {
            _yards = UTILITIES.getRandomInt(1, yardageMax);
            _yards = HELPERS.capRunYardsAtGoalLine(_yards, distanceToGoalLine);

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
        if (!_positiveYards && !_negativeYards && !isOverthrownIncomplete && playSelected === GAME_PLAY_TYPES.PASS) {
            _playResultText = _playResultText + ' Incomplete';
        }
        if (!_positiveYards && !_negativeYards && playSelected === GAME_PLAY_TYPES.RUN) {
            _playResultText = _playResultText + ' for no gain';
        }

        if (playSelected === GAME_PLAY_TYPES.PASS && UTILITIES.getRandomInt(1, 100) <= MODULES.Constants.INTERCEPTION_CHANCE_PERCENT) {
            turnover = true;
            isLiveBallTurnover = true;
            _playResultText = 'Pass INTERCEPTED';
        }
        else {
            let canFumble = playSelected === GAME_PLAY_TYPES.RUN ||
                (playSelected === GAME_PLAY_TYPES.PASS && (_positiveYards || _negativeYards) && !isOverthrownIncomplete);

            if (canFumble && UTILITIES.getRandomInt(1, 100) <= MODULES.Constants.FUMBLE_CHANCE_PERCENT) {
                turnover = true;
                isLiveBallTurnover = true;
                _playResultText += ' - FUMBLE RECOVERED BY DEFENSE';
            }
        }

        //apply this play's yardage to the field position first so the scoring checks below reflect the new spot of the ball
        if (playSelected !== 'fieldGoal' && playSelected !== 'extraPoint' && playSelected !== 'twoPointConversion') {
            self.yardsTraveled(self.yardsTraveled() + _yards);
        }

        //TOUCHDOWN
        let isTouchdown = false;
        if (!turnover && self.yardsToTouchdown() <= 0 && (playSelected === GAME_PLAY_TYPES.PASS || playSelected === GAME_PLAY_TYPES.RUN)) {
            _playResultText = SCORE_TYPES.TOUCHDOWN.toUpperCase();
            self.pointAttemptTeamId = self.currentTeamWithBall();
            playMaker.addScore(SCORE_TYPES.TOUCHDOWN);
            self.pointAttemptAfterTouchDown(true);
            isTouchdown = true;
        }

        //SAFETY
        if (!turnover && self.yardsToTouchdown() > 100 && (playSelected === GAME_PLAY_TYPES.PASS || playSelected === GAME_PLAY_TYPES.RUN)) {
            _playResultText = SCORE_TYPES.SAFETY.toUpperCase();
            playMaker.addScore(SCORE_TYPES.SAFETY);
            self.isSafety(true);
            self.SetupKickoff();
            isKickoffAlreadySetup = true;
            turnover = true;
        }

        //DETERMINE DOWN
        let isTurnoverOnDowns = false;
        let isFirstDown = false;
        if (turnover) {
            self.yardsToFirst(10);
            self.currentDown(1);
        }
        else if (isTouchdown) {
            self.yardsToFirst(10);
            self.currentDown(1);
        }
        else if (_yards >= self.yardsToFirst() && (playSelected === GAME_PLAY_TYPES.PASS || playSelected === GAME_PLAY_TYPES.RUN)) {
            self.yardsToFirst(10); //reset yards to first for next set of downs
            self.currentDown(1); //reset to first down
            isFirstDown = !isTouchdown; //a touchdown is recorded as a score, not a first down
        }
        else {
            if (self.currentDown() === 4) {
                turnover = true;
                isTurnoverOnDowns = true;
            }
            else {
                self.yardsToFirst(self.yardsToFirst() - _yards); //subtract the yards from the current yards to First Down
                self.currentDown(self.currentDown() + 1);  //increment the current Down
            }
        }

        console.log('YARDS: ' + _yards);
        let playResult = new MODULES.Constructors.PlayResult(_yards, _playResultText, turnover, playSelected, isFirstDown);

        self.SetBallPosition();

        if (isTouchdown)
            $('#home-team-trail, #away-team-trail').css('width', '0px');

        //TURNOVER
        if (turnover) {
            let isDefensiveTouchback = isLiveBallTurnover && self.yardsToTouchdown() <= 0;

            //before turning over the ball, record the play of the team turning over the ball
            if (isDefensiveTouchback)
                _playResultText += ' - TOUCHBACK';
            else if (!isLiveBallTurnover)
                _playResultText = _playResultText + (isTurnoverOnDowns ? ' - TURNOVER ON DOWNS' : ' Change of Possession');
            playResult.playResultText = _playResultText;
            playMaker.recordPlay(playResult);

            //now handle turnover events
            _yards = 0;
            //a safety/2pt conversion above already placed the ball for the next kickoff - don't overwrite it here
            if (isDefensiveTouchback) {
                self.ballSpotStart(MODULES.Constants.TOUCHBACK_YARD_LINE);
            }
            else if (!isKickoffAlreadySetup) {
                self.ballSpotStart(self.yardsToTouchdown());
            }
            self.yardsTraveled(0); //reset yards traveled for possession

            self.ChangePossession();
        }

        self.ShowHideSpecialTeamsMenu();

        //on turnovers, this will return the play of the team taking over possession
        return playResult;
    },

    kickoff: function (kickoffPower, kickoffAngle) {
        let kickoffType = getKickoffType();
        if (kickoffType === KICKOFF_TYPES.EXTRAPOINT)
            self.StopCounter();
        else
            self.StartCounter(); //the quarter clock starts the moment the ball is kicked

        let _yards = convertKickoffPowerToYards(kickoffType, kickoffPower, kickoffAngle);
        let recordedKickYards = _yards;
        let _returnYards = 0;
        let _kickoffResultText = UTILITIES.splitAndTitleCase(kickoffType);
        let ballKickOffSpot = MODULES.Constants.KICKOFF_SPOT; //set ball Spot Start at 35 yard line        
        let isTouchback = false; //flag to determine when touchback occurs
        let isPenalty = false; //flag to determine when there is a penalty on the kickoff
        let isPuntBlocked = false;
        let isMuffedPunt = false;
        let isOnsideRecoveredByKickingTeam = false;
        let isReturnTypeKickoff = kickoffType === KICKOFF_TYPES.KICKOFF || kickoffType === KICKOFF_TYPES.ONSIDE || kickoffType === KICKOFF_TYPES.PUNT || kickoffType === KICKOFF_TYPES.SAFETY;
        let chanceOfBlock = UTILITIES.getRandomInt(1, 100); //random number used for determining a chance of a block for kicks that can be blocked

        console.log('kickoffPower: %s, kickoffAngle: %s', kickoffPower, kickoffAngle);

        //determine spot of kick off
        if (self.isPunt()) {
            ballKickOffSpot = 100 - self.yardsToTouchdown();
        }
        else if (self.isFieldGoal()) {
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
        let teamWithBallBeforeKick = self.currentTeamWithBall();
        let isBeginningOfHalfKickoff = self.isBeginningOfHalf && (kickoffType === KICKOFF_TYPES.KICKOFF || kickoffType === KICKOFF_TYPES.ONSIDE);
        if (kickoffType === KICKOFF_TYPES.EXTRAPOINT && self.pointAttemptTeamId) {
            teamWithBallBeforeKick = self.pointAttemptTeamId;
            self.currentTeamWithBall(teamWithBallBeforeKick);
        }

        if (kickoffType === KICKOFF_TYPES.EXTRAPOINT || kickoffType === KICKOFF_TYPES.FIELDGOAL) {
            kickingTeam = teamWithBallBeforeKick;
            receivingTeam = kickingTeam === self.homeTeamID() ? self.awayTeamID() : self.homeTeamID();
        }
        else if (kickoffType === KICKOFF_TYPES.PUNT) {
            kickingTeam = teamWithBallBeforeKick;
            receivingTeam = kickingTeam === self.homeTeamID() ? self.awayTeamID() : self.homeTeamID();
        }

        if (isBeginningOfHalfKickoff) {
            receivingTeam = self.periodKickoffReceivingTeam || self.teamReceivingInitialKickoff();
            kickingTeam = receivingTeam === self.homeTeamID() ? self.awayTeamID() : self.homeTeamID();
        }
        else if (kickoffType === KICKOFF_TYPES.KICKOFF || kickoffType === KICKOFF_TYPES.ONSIDE || kickoffType === KICKOFF_TYPES.SAFETY) {
            if (self.currentTeamWithBall() === self.homeTeamID()) {
                receivingTeam = self.homeTeamID();
                kickingTeam = self.awayTeamID();
            }
        }

        if (isBeginningOfHalfKickoff) {
            self.isBeginningOfHalf = false;
            self.periodKickoffReceivingTeam = 0;
        }

        if (kickoffType === KICKOFF_TYPES.ONSIDE) {
            let onsideSuccessful = false;

            //onside kick must have power greater than 25 and a sharp angle, less than 21 or greater than 79
            if (kickoffPower >= 25 && (kickoffAngle <= 20 || kickoffAngle >= 80)) {
                onsideSuccessful = true;
            }
            else {
                onsideSuccessful = false;
            }

            if (onsideSuccessful) {
                _yards = UTILITIES.getRandomInt(10, 20); //ball at least has to travel 10 yards, but has a chance of traveling 20

                if (UTILITIES.getRandomInt(1, 100) <= MODULES.Constants.ONSIDE_RECOVERY_CHANCE_PERCENT) {
                    isOnsideRecoveredByKickingTeam = true;
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
            //Field goals and extra points have a very small chance of being blocked.
            let isBlocked = chanceOfBlock <= 2;
            let distanceToGoalPosts = kickoffType === KICKOFF_TYPES.FIELDGOAL
                ? self.yardsToTouchdown() + MODULES.Constants.END_ZONE_YARDS
                : ballKickOffSpot + MODULES.Constants.END_ZONE_YARDS;
            if (kickoffType === KICKOFF_TYPES.FIELDGOAL)
                recordedKickYards = distanceToGoalPosts;
            let isGoodKick = _yards >= distanceToGoalPosts;

            if (!isBlocked && isGoodKick) {
                _kickoffResultText += ' GOOD';
                playMaker.addScore(kickoffType);
            }
            else if (isBlocked) {
                _kickoffResultText += ' Blocked';
            }
            else {
                _kickoffResultText += ' NO GOOD';
            }

            if (kickoffType === KICKOFF_TYPES.FIELDGOAL && (isBlocked || !isGoodKick)) {
                playMaker.handleFailedFieldGoal(_kickoffResultText, isBlocked, recordedKickYards);
                return;
            }

            if (kickoffType === KICKOFF_TYPES.EXTRAPOINT && isBlocked) {
                playMaker.handleBlockedExtraPoint(_kickoffResultText);
                return;
            }
        }
        else {
            //Normal Kickoff, Punt, Safety
            console.log('HANDLE NORMAL KICKOFF/PUNT/SAFETY');
            if (chanceOfBlock <= MODULES.Constants.PUNT_BLOCK_CHANCE_PERCENT && kickoffType === KICKOFF_TYPES.PUNT) {
                isPuntBlocked = true;
                _kickoffResultText += ' Blocked';
                _yards = UTILITIES.getRandomInt(0, Math.min(10, totalMaxKickWithoutTouchback));
                _returnYards = UTILITIES.getRandomInt(0, Math.min(40, ballKickOffSpot + _yards));
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

        if (kickoffType === KICKOFF_TYPES.PUNT && !isPuntBlocked && !isTouchback && !isPenalty &&
            UTILITIES.getRandomInt(1, 100) <= MODULES.Constants.PUNT_MUFF_CHANCE_PERCENT) {
            isMuffedPunt = true;
            _returnYards = 0;
        }

        //self.currentTeamWithBall(receivingTeam); //this will be the team running or getting a touchback.

        console.log('Kickoff type: %s, Kickoff distance: %s, kickoff return: %s, TeamID With Ball: %s', kickoffType, _yards, _returnYards, receivingTeam);

        //create a play result and record it in the play history
        let kickoffResult = new MODULES.Constructors.PlayResult(recordedKickYards, _kickoffResultText, false, kickoffType);

        //record/show play results       
        self.currentTeamWithBall(kickingTeam); //set current team with ball to kickoff team briefly to record the correct team name in the history
        if (kickoffType === KICKOFF_TYPES.KICKOFF || kickoffType === KICKOFF_TYPES.ONSIDE || kickoffType === KICKOFF_TYPES.SAFETY) {
            self.ballSpotStart(ballKickOffSpot);
            self.yardsTraveled(0);
        }
        playMaker.recordPlay(kickoffResult);

        //show return of kick (if any), but only for kicks that allow for returns
        if (isReturnTypeKickoff) {
            let _returnPlayText = isOnsideRecoveredByKickingTeam ? 'Onside Kick Recovered by Kicking Team' :
                isPuntBlocked ? 'Blocked Punt Return' : kickoffType === KICKOFF_TYPES.PUNT ? 'Punt Return' : 'Kickoff Return';
            let returnDisplayText = '';
            let isReturnTouchdown = false;
            let newFieldPosition = 0;

            //Handle new spot of ball
            if (isTouchback || isPenalty) {
                if (isTouchback) {
                    _returnPlayText += ' - TOUCHBACK';
                    //set ball at the appropriate yard line when a touchback occurs
                    _yards = MODULES.Constants.TOUCHBACK_YARD_LINE;
                    returnDisplayText = 'TOUCHBACK - the ball will be placed on the ' + _yards + ' yard line';
                }
                self.ballSpotStart(_yards);
            }
            else if (isOnsideRecoveredByKickingTeam) {
                newFieldPosition = Math.min(ballKickOffSpot + _yards, 100);
                self.ballSpotStart(newFieldPosition);
            }
            else {
                //distance from the receiving team's own goal line: how far the kick traveled past the kick spot, minus the return yards
                newFieldPosition = 100 - (ballKickOffSpot + _yards) + _returnYards;
                console.log('NEW FIELD POSITION: %s', newFieldPosition);

                if (!isMuffedPunt && newFieldPosition >= 100) {
                    newFieldPosition = 100;
                    isReturnTouchdown = true;
                    _returnPlayText += ' TOUCHDOWN';
                }

                newFieldPosition = Math.max(0, Math.min(newFieldPosition, 100));
                self.ballSpotStart(newFieldPosition);
            }

            if (isMuffedPunt)
                _returnPlayText += ' - MUFFED, RECOVERED BY KICKING TEAM';

            //the receiving team starts a fresh set of downs at the new spot of the ball
            self.yardsTraveled(0);
            self.yardsToFirst(10);
            self.currentDown(1);
            self.playCountForPossession(1);
            self.timeOfPossession(0);

            //create a play result and record it in the play history
            let returnResult = new MODULES.Constructors.PlayResult(_returnYards, _returnPlayText, isMuffedPunt, '', false, returnDisplayText);
            self.currentTeamWithBall(receivingTeam); //set back to receiving team for proper team in play history

            if (isReturnTouchdown) {
                self.pointAttemptTeamId = receivingTeam;
                playMaker.addScore(SCORE_TYPES.TOUCHDOWN);
                self.pointAttemptAfterTouchDown(true);
                $('#home-team-trail, #away-team-trail').css('width', '0px');
            }

            playMaker.recordPlay(returnResult);

            if (isMuffedPunt) {
                self.currentTeamWithBall(kickingTeam);
                self.ballSpotStart(100 - newFieldPosition);
                self.yardsTraveled(0);
            }
        }

        //set the new position of the ball
        self.SetBallPosition();

        //setup for next kickoff
        playMaker.resetKickoffFlags(kickoffType);

        //if it's an extrapoint or fieldgoal, we need to kick the ball off after the attempt:
        if (!isReturnTypeKickoff) {
            self.yardsToFirst(10); //reset yards to first for next set of downs
            self.currentDown(1); //reset to first down
            self.isKickoff(true);
            self.currentTeamWithBall(receivingTeam);
            self.SetupKickoff();
        }
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

    //A missed or blocked field goal gives the defense a new drive at the physical spot of the kick.
    handleFailedFieldGoal: function (kickResultText, isBlocked, kickYards) {
        let attemptingTeam = self.currentTeamWithBall();
        let defensiveTeam = attemptingTeam === self.homeTeamID() ? self.awayTeamID() : self.homeTeamID();
        let kickResult = new MODULES.Constructors.PlayResult(kickYards, kickResultText, true, GAME_PLAY_TYPES.FIELDGOAL);

        playMaker.recordPlay(kickResult);
        playMaker.resetKickoffFlags(KICKOFF_TYPES.FIELDGOAL);
        self.ballSpotStart(self.yardsToTouchdown());
        self.yardsTraveled(0);
        self.ChangePossession();

        if (isBlocked && UTILITIES.getRandomInt(1, 100) <= MODULES.Constants.BLOCKED_FIELD_GOAL_RETURN_CHANCE_PERCENT) {
            let recoveryYardsBehindLine = UTILITIES.getRandomInt(0, 10);
            let recoverySpot = Math.min(self.ballSpotStart() + recoveryYardsBehindLine, 100);
            self.ballSpotStart(recoverySpot);

            let isReturnTouchdown = UTILITIES.getRandomInt(1, 100) <= MODULES.Constants.BLOCKED_FIELD_GOAL_TOUCHDOWN_CHANCE_PERCENT;
            let returnYards = isReturnTouchdown ? self.yardsToTouchdown() : UTILITIES.getRandomInt(1, Math.max(1, Math.min(30, self.yardsToTouchdown())));
            let returnText = 'Blocked Field Goal Recovered ' + recoveryYardsBehindLine + ' Yards Behind the Line - Return';

            self.yardsTraveled(returnYards);

            if (isReturnTouchdown) {
                returnText += ' TOUCHDOWN';
                self.pointAttemptTeamId = defensiveTeam;
                playMaker.addScore(SCORE_TYPES.TOUCHDOWN);
                self.pointAttemptAfterTouchDown(true);
                $('#home-team-trail, #away-team-trail').css('width', '0px');
            }

            playMaker.recordPlay(new MODULES.Constructors.PlayResult(returnYards, returnText, false, GAME_PLAY_TYPES.FIELDGOAL));
            self.SetBallPosition();
            return;
        }

        self.currentTeamWithBall(defensiveTeam);
        self.SetBallPosition();
    },

    //A blocked extra point may be returned for two points; no extra point follows the return score.
    handleBlockedExtraPoint: function (kickResultText) {
        let attemptingTeam = self.currentTeamWithBall();
        let defensiveTeam = attemptingTeam === self.homeTeamID() ? self.awayTeamID() : self.homeTeamID();
        let kickResult = new MODULES.Constructors.PlayResult(0, kickResultText, true, GAME_PLAY_TYPES.EXTRAPOINT);

        playMaker.recordPlay(kickResult);

        if (UTILITIES.getRandomInt(1, 100) === 1) {
            self.currentTeamWithBall(defensiveTeam);
            playMaker.addScore(SCORE_TYPES.TWOPOINTCONVERSION);
            playMaker.recordPlay(new MODULES.Constructors.PlayResult(0, 'Blocked Extra Point Return for 2 Points', false, GAME_PLAY_TYPES.EXTRAPOINT));

            //The scoring defense receives the ensuing kickoff after a returned blocked extra point.
            self.currentTeamWithBall(defensiveTeam);
        }
        else {
            self.currentTeamWithBall(attemptingTeam);
        }

        self.isExtraPointKick(false);
        self.isKickoff(true);
        self.SetupKickoff();
    },

    //the offense spikes the ball (intentional incomplete pass) to stop the clock, at the cost of a down
    spike: function () {
        self.playCountForPossession(self.playCountForPossession() + 1);
        self.consecutiveDelayOfGamePenalties(0); //the ball was legally snapped, so the delay of game streak is broken

        let spikeYards = -MODULES.Constants.SPIKE_YARDS_LOST;
        let playResultText = 'Spiked the ball to stop the clock - Incomplete';
        let turnover = self.currentDown() === 4;

        self.yardsTraveled(self.yardsTraveled() + spikeYards); //spiking the ball costs 2 yards
        self.yardsToFirst(self.yardsToFirst() - spikeYards); //the lost yards are added to the distance needed for a first down

        if (self.yardsToTouchdown() > 100) {
            playResultText = 'SAFETY - Spike in Own End Zone';
            let safetyResult = new MODULES.Constructors.PlayResult(spikeYards, playResultText, true, GAME_PLAY_TYPES.PASS);

            playMaker.addScore(SCORE_TYPES.SAFETY);
            playMaker.recordPlay(safetyResult);

            self.yardsTraveled(0);
            self.yardsToFirst(10);
            self.currentDown(1);
            self.isSafety(true);
            self.SetupKickoff();
            self.ChangePossession();
            self.ShowHideSpecialTeamsMenu();
            return;
        }

        if (!turnover)
            self.currentDown(self.currentDown() + 1);

        let playResult = new MODULES.Constructors.PlayResult(spikeYards, playResultText, turnover, GAME_PLAY_TYPES.PASS);

        self.SetBallPosition();

        if (turnover) {
            playResult.playResultText = playResultText + ' Change of Possession';
            playMaker.recordPlay(playResult);
            self.ballSpotStart(self.yardsToTouchdown());
            self.yardsTraveled(0);
            self.ChangePossession();
        }
        else {
            playMaker.recordPlay(playResult);
        }

        self.StopCounter(); //a spike stops the main game clock until the next snap

        self.ShowHideSpecialTeamsMenu();
    },

    applyOffensivePenaltyYards: function (penaltyYards) {
        let distanceToOwnGoal = 100 - self.yardsToTouchdown();
        let appliedPenaltyYards = penaltyYards;

        if (penaltyYards >= distanceToOwnGoal) {
            appliedPenaltyYards = Math.min(Math.ceil(distanceToOwnGoal / 2), Math.max(distanceToOwnGoal - 1, 0));
        }

        self.yardsTraveled(self.yardsTraveled() - appliedPenaltyYards);
        self.yardsToFirst(self.yardsToFirst() + appliedPenaltyYards);

        return appliedPenaltyYards;
    },

    getPenaltyText: function (appliedPenaltyYards, fullPenaltyYards) {
        if (appliedPenaltyYards === 0)
            return 'No Yardage - Ball at the 1 Yard Line';

        return appliedPenaltyYards === fullPenaltyYards ? fullPenaltyYards + ' Yard Penalty' : appliedPenaltyYards + ' Yard Half-the-Distance Penalty';
    },

    //the play clock expired before the snap - whistle the play dead and assess a 5 yard delay of game penalty
    delayOfGamePenalty: function () {
        if (self.gameOver() || self.showKickoffControls() || self.pointAttemptAfterTouchDown())
            return;

        self.hasRolled(false); //whistle dead - any play in progress before the clock expired does not count
        $('#diceValues').empty();

        let offendingTeam = self.currentTeamWithBall();
        self.consecutiveDelayOfGamePenalties(self.consecutiveDelayOfGamePenalties() + 1);

        //REPEATED VIOLATIONS: an endless loop of delay of game penalties is treated as unsportsmanlike conduct, and ultimately a forfeit
        if (self.consecutiveDelayOfGamePenalties() >= MODULES.Constants.MAX_CONSECUTIVE_DELAY_OF_GAME_PENALTIES) {
            playMaker.forfeitGame(offendingTeam);
            return;
        }

        self.playCountForPossession(self.playCountForPossession() + 1);
        let penaltyYards = playMaker.applyOffensivePenaltyYards(MODULES.Constants.DELAY_OF_GAME_PENALTY_YARDS);
        let delayPenaltyText = playMaker.getPenaltyText(penaltyYards, MODULES.Constants.DELAY_OF_GAME_PENALTY_YARDS);
        let penaltyText = 'Delay of Game - ' + delayPenaltyText;


        if (self.consecutiveDelayOfGamePenalties() === 2) {
            //a second straight delay of game is also assessed as unsportsmanlike conduct
            let unsportsmanlikePenaltyYards = playMaker.applyOffensivePenaltyYards(MODULES.Constants.UNSPORTSMANLIKE_CONDUCT_PENALTY_YARDS);
            let unsportsmanlikePenaltyText = playMaker.getPenaltyText(unsportsmanlikePenaltyYards, MODULES.Constants.UNSPORTSMANLIKE_CONDUCT_PENALTY_YARDS);
            penaltyYards += unsportsmanlikePenaltyYards;
            penaltyText += ' + Unsportsmanlike Conduct - ' + unsportsmanlikePenaltyText;
            alert('DELAY OF GAME - repeated violation! ' + unsportsmanlikePenaltyText + ' for unsportsmanlike conduct has been assessed. One more delay of game will result in a forfeit.');
        }
        else {
            alert('DELAY OF GAME - the offense failed to snap the ball in time. ' + delayPenaltyText + '.');
        }

        self.SetBallPosition();

        let playResult = new MODULES.Constructors.PlayResult(-penaltyYards, penaltyText, false, GAME_PLAY_TYPES.PENALTY);
        playMaker.recordPlay(playResult);
    },

    //the offending team's repeated delay of game violations are ruled an unfair act, ending the game in a forfeit
    forfeitGame: function (offendingTeamId) {
        self.StopCounter();
        self.StopPlayClock();
        self.gameOver(true);
        sim.addCompletedGameToHistory();

        let winningTeam = offendingTeamId === self.homeTeamID() ? self.awayTeamInfo() : self.homeTeamInfo();
        let offendingTeamInfo = offendingTeamId === self.homeTeamID() ? self.homeTeamInfo() : self.awayTeamInfo();

        alert('FORFEIT - ' + offendingTeamInfo.teamName() + ' repeatedly failed to snap the ball in time. ' +
            'Officials have ruled this an unfair act, and the game is awarded to ' + winningTeam.teamName() + ' by forfeit.');
    },

    recordTimeOfPossession: function (typeOfPlay, yards) {
        if (typeOfPlay === GAME_PLAY_TYPES.TWOPOINTCONVERSION || typeOfPlay === KICKOFF_TYPES.EXTRAPOINT) {
            self.timeOfPossession(0);
            self.StopCounter();
            self.StopPlayClock();
            return;
        }

        let timeSpentWithBall = 0; //represents seconds off the game clock for this play
        let nextPlayClockSeconds = MODULES.Constants.PLAY_CLOCK_NORMAL; //40s, unless the clock was stopped by this play
        //SOURCE: https://www.teamrankings.com/nfl/stat/average-time-of-possession-net-of-ot

        if (typeOfPlay === GAME_PLAY_TYPES.RUN) {
            //huddle/play clock plus time for the run itself, roughly 1-2 minutes from play call to the whistle
            timeSpentWithBall = 30 + Math.max(Math.round(yards / 2), 0);
        }
        else if (typeOfPlay === GAME_PLAY_TYPES.PASS) {
            //an incomplete pass (or a spike) stops the clock almost immediately and shortens the next play clock
            if (yards === 0) {
                timeSpentWithBall = 4;
                nextPlayClockSeconds = MODULES.Constants.PLAY_CLOCK_SHORT;
            }
            else {
                timeSpentWithBall = 25 + Math.max(Math.round(yards / 5), 0);
            }
        }
        else if (typeOfPlay === GAME_PLAY_TYPES.PENALTY) {
            timeSpentWithBall = 0; //whistle blown before the snap - no game clock runs off
            nextPlayClockSeconds = MODULES.Constants.PLAY_CLOCK_SHORT;
        }
        else {
            timeSpentWithBall = 10; //kickoffs, returns, and other special teams plays
            nextPlayClockSeconds = MODULES.Constants.PLAY_CLOCK_SHORT;
        }

        console.log('TIME SPENT WITH BALL THIS PLAY: %s seconds', timeSpentWithBall);

        self.timeOfPossession(timeSpentWithBall); //record time of possession in seconds

        //resume the game clock at the snap (e.g. after a timeout), then skip the clock ahead realistically for this play
        if (!self.isRunning() && !self.pointAttemptAfterTouchDown())
            self.StartCounter();

        self.AdvanceTime(timeSpentWithBall);

        if (self.pointAttemptAfterTouchDown()) {
            self.StopCounter();
            self.StopPlayClock();
        }
        else {
            self.StartPlayClock(nextPlayClockSeconds);
        }
    },

    recordPlay: function (thisPlaysResult) {
        let team = $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === self.currentTeamWithBall(); })[0]; //get the current team making the play
        let pluralizer = 's';

        self.lastTimeoutTeam(0); //a completed play clears the "no consecutive timeouts" restriction

        if (thisPlaysResult.yards === 1 || thisPlaysResult.yards === -1)
            pluralizer = '';

        let yardsText = thisPlaysResult.yards.toString() + " Yard" + pluralizer;
        console.log('This Play:' + thisPlaysResult.playResultText + ' by the ' + team.teamName() + ' for ' + yardsText);

        //RECORD TIME OF POSSESSION (before logging, so the play history shows this play's time)
        this.recordTimeOfPossession(thisPlaysResult.playType, thisPlaysResult.yards);

        //MODULES.Constructors.PlayHistory: teamId, teamName, down, playCount, playYards, playResult, ballSpot, quarter, timeOfPossession
        self.AddPlayHistory(new MODULES.Constructors.PlayHistory(self.teamPlayHistory().length + 1, self.currentTeamWithBall(),
            team.teamName(),
            HELPERS.getDownText(self.currentDown(), self.yardsToFirst()),
            self.playCountForPossession(),
            yardsText,
            thisPlaysResult.playResultText,
            HELPERS.getYardText(), //Spot of Ball text in Play History
            self.currentQuarter(),
            self.timeOfPossession(),
            self.homeTeamScore() + ' - ' + self.awayTeamScore(),
            self.remainingTimeDisplay()));

        let displayText = thisPlaysResult.displayText || thisPlaysResult.playResultText + ' for ' + thisPlaysResult.yards.toString() + ' Yard' + pluralizer;
        playMaker.display(displayText, team);

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

        if (thisPlaysResult.playType === GAME_PLAY_TYPES.PENALTY) {
            playStatsRecord.totalPenaltyYards = thisPlaysResult.yards; //already a negative value (e.g. -5)
        }

        if (thisPlaysResult.isTurnover)
            playStatsRecord.totalTurnovers = 1;

        if (thisPlaysResult.isFirstDown)
            playStatsRecord.totalFirstDowns = 1;

        self.UpdateGameStat(playStatsRecord);
    },

    play: function (playSelected, pointAttemptPlayType) {
        playSelected = playSelected || $('input[name=selectPlay]:checked').val();
        if (playSelected) {
            self.hasRolled(false); //reset flag so player has to roll before making next play

            //clear results in list of die values
            $("#diceValues").empty();

            let thisPlaysResult = playMaker.getPlayResult(playSelected, pointAttemptPlayType);

            //turnover plays are already recorded (with the correct pre-turnover team/down) inside getPlayResult
            if (!thisPlaysResult.isTurnover && !thisPlaysResult.wasRecorded) {
                playMaker.recordPlay(thisPlaysResult);
            }

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
        self.StopCounter();
        self.StopPlayClock();

        if (playSelected === GAME_PLAY_TYPES.EXTRAPOINT) {
            self.currentTeamWithBall(self.pointAttemptTeamId);
            self.isTwoPointConversion(false);
            self.isExtraPointKick(true);
            self.SetupKickoff();
        }
        else if (playSelected === GAME_PLAY_TYPES.TWOPOINTCONVERSION) {
            spot = MODULES.Constants.TWO_POINT_CONVERSION_SPOT;
            self.currentTeamWithBall(self.pointAttemptTeamId);
            self.isTwoPointConversion(true);
            self.showKickoffControls(false);
            self.hasRolled(false);
            self.currentDown(1);
            self.yardsToFirst(spot);
        }

        self.ballSpotStart(100 - spot);
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
            case SCORE_TYPES.SAFETY:
            case SCORE_TYPES.TWOPOINTCONVERSION:
                score = 2;
                break;
        }

            let scoringTeamId = self.currentTeamWithBall();
            if (type === SCORE_TYPES.SAFETY)
                scoringTeamId = scoringTeamId === self.homeTeamID() ? self.awayTeamID() : self.homeTeamID();
            let scoringTeam = $.grep(MODULES.GameVariables.Teams, function (team) { return team.teamId === scoringTeamId; })[0];

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

        if (scoringTeam) {
            setTimeout(function () {
                playMaker.displayScore(score, type, scoringTeam);
            }, 0);
        }

        self.StopCounter(); //the clock stops after any score, until the next kickoff/snap
    }
};