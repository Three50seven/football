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
            kickoffYards = UTILITIES.getRandomInt(66, 75);
        else if (kickoffPower >= 85)
            kickoffYards = 65;
        else if (kickoffPower >= 70)
            kickoffYards = UTILITIES.getRandomInt(50, 64);
        else if (kickoffPower >= 60)
            kickoffYards = UTILITIES.getRandomInt(40, 50);
        else if (kickoffPower >= 50)
            kickoffYards = UTILITIES.getRandomInt(30, 40);
        else if (kickoffPower >= 40)
            kickoffYards = UTILITIES.getRandomInt(20, 30);
        else if (kickoffPower >= 30)
            kickoffYards = UTILITIES.getRandomInt(10, 20);
        else
            kickoffYards = UTILITIES.getRandomInt(1, 10);
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
            kickoffYards = UTILITIES.getRandomInt(60, 70); //max field goal in NFL is 64yards as of 11/3/2018, this allows random yardage between 60 and 70yds max
        else if (kickoffPower >= 80)
            kickoffYards = UTILITIES.getRandomInt(50, 60);
        else if (kickoffPower >= 70)
            kickoffYards = UTILITIES.getRandomInt(40, 50);
        else if (kickoffPower >= 60)
            kickoffYards = UTILITIES.getRandomInt(30, 40);
        else if (kickoffPower >= 50)
            kickoffYards = UTILITIES.getRandomInt(20, 30);
        else if (kickoffPower >= 40)
            kickoffYards = UTILITIES.getRandomInt(10, 20);
        else
            kickoffYards = UTILITIES.getRandomInt(1, 10);

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
            kickoffYards = UTILITIES.getRandomInt(distanceToEndZone + 1, distanceToEndZone + 10);
        else if (kickoffPower >= 75)
            kickoffYards = distanceToEndZone; //between 75 and 80, is a kick to the goal line essentially
        else if (kickoffPower >= 70)
            kickoffYards = UTILITIES.getRandomInt(distanceToEndZone - 15, distanceToEndZone - 1);
        else if (kickoffPower >= 60)
            kickoffYards = UTILITIES.getRandomInt(distanceToEndZone - 25, distanceToEndZone - 15);
        else if (kickoffPower >= 50)
            kickoffYards = UTILITIES.getRandomInt(distanceToEndZone - 35, distanceToEndZone - 25);
        else if (kickoffPower >= 40)
            kickoffYards = UTILITIES.getRandomInt(distanceToEndZone - 45, distanceToEndZone - 35);
        else if (kickoffPower >= 30)
            kickoffYards = UTILITIES.getRandomInt(distanceToEndZone - 55, distanceToEndZone - 45);
        else
            kickoffYards = UTILITIES.getRandomInt(1, distanceToEndZone - 55);
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