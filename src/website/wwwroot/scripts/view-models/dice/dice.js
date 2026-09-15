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
        $("#diceValues").empty();
        let pipPositions = {
            1: [5],
            2: [1, 9],
            3: [1, 5, 9],
            4: [1, 3, 7, 9],
            5: [1, 3, 5, 7, 9],
            6: [1, 3, 4, 6, 7, 9]
        };

        for (var i = 0, len = dice.length; i < len; i++) {
            let die = dice[i];
            let dieFace = document.createElement("span");
            dieFace.className = "die-result";
            dieFace.setAttribute("role", "img");
            dieFace.setAttribute("aria-label", "Die " + (i + 1) + " rolled " + die.valueRolled);

            for (let pipPosition = 1; pipPosition <= 9; pipPosition++) {
                let pip = document.createElement("span");
                pip.className = "die-pip";

                if (pipPositions[die.valueRolled].indexOf(pipPosition) >= 0)
                    pip.className += " die-pip-visible";

                dieFace.appendChild(pip);
            }

            $("#diceValues").append(dieFace);
        }

        $("#diceTotal").text(diceSum);

        $("#diceValues").removeClass("dice-rolling").addClass("dice-rolling");
        window.setTimeout(function () {
            $("#diceValues").removeClass("dice-rolling");
        }, 650);
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