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
            let randInt = UTILITIES.getRandomInt(die.minValue, die.maxValue);
            die.valueRolled = randInt;
            diceSum += randInt;
        }

        MODULES.GameVariables.DiceSumTotal = diceSum;

        //display results:    
        gameDice.display(dice, diceSum);
    }
};