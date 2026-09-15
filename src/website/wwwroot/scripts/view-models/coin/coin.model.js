(function ($) {
    var self = this;

    self.needCoinToss = ko.observable(true); //determines when coin toss is needed

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
    self.coinTossValue = ko.observable(0);
    self.coinTossTimerId = 0;
    self.coinTossWinner = ko.observable(0); //stores team id of coin toss winner
    self.coinTossLoser = ko.observable(0); //stores team id of coin toss loser
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
    self.TossCoin = function () {
        let coinValue = UTILITIES.getRandomInt(1, 2); //pick 1 or 2 randomly, 1=heads, 2=tails
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

        clearTimeout(self.coinTossTimerId);
        self.coinTossTimerId = setTimeout(function () {
            self.coinTossValue(coinValue);
        }, 4000); //show the result after the coin animation has completed

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
    self.RecordCoinTossHistory = function () {
        let winningTeam = self.coinTossWinnerInfo();
        let receivingTeam = self.teamReceivingInitialKickoffInfo();

        if (!winningTeam || !receivingTeam)
            return;

        let optionText = self.coinTossWinningOption() === 'kickoff' ? 'kickoff' : 'receive';
        let resultText = 'Coin Toss: ' + winningTeam.teamCityAndName() + ' won and elected to ' + optionText + '. ' + receivingTeam.teamCityAndName() + ' will receive the opening kickoff.';

        self.AddPlayHistory(new MODULES.Constructors.PlayHistory(self.teamPlayHistory().length + 1,
            self.coinTossWinner(),
            winningTeam.teamName(),
            'Coin Toss',
            0,
            '0 Yards',
            resultText,
            '',
            self.currentQuarter(),
            0,
            self.homeTeamScore() + ' - ' + self.awayTeamScore(),
            self.remainingTimeDisplay()));

        playMaker.display(resultText, winningTeam);
    };

    self.RecordOvertimeCoinToss = function (winningTeamId) {
        let winningTeam = winningTeamId === self.homeTeamID() ? self.homeTeamInfo() : self.awayTeamInfo();
        let resultText = 'Overtime Coin Toss: ' + winningTeam.teamCityAndName() + ' won and elected to receive. ' +
            winningTeam.teamCityAndName() + ' will receive the overtime kickoff.';

        self.AddPlayHistory(new MODULES.Constructors.PlayHistory(self.teamPlayHistory().length + 1,
            winningTeamId,
            winningTeam.teamName(),
            'Overtime Coin Toss',
            0,
            '0 Yards',
            resultText,
            '',
            self.currentQuarter(),
            0,
            self.homeTeamScore() + ' - ' + self.awayTeamScore(),
            self.remainingTimeDisplay()));

        playMaker.display(resultText, winningTeam);
    };
})(jQuery);