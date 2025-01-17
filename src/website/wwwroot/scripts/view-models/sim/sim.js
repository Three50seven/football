var sim = {
    init: function () {        
        sim.simGame();
    },
    simGame: function () {        
        //TODO: Sim each quarter for box score
        //determine winner or tie based on score
        //show results       

        let homeTeamScore = sim.getTeamScore();
        let awayTeamScore = sim.getTeamScore();

        self.homeTeamScore(homeTeamScore);
        self.awayTeamScore(awayTeamScore);
    },
    getScoreMax: function () {
        let bigScoreChance = UTILITIES.getRandomInt(1, 100) >= 95;
        let scoreMax = 21; //average in 2024 for both teams is about 22 points, so setting normal max to around this number
        let maxHistoricalScore = 75; //max historical (as of 2025 season is 72 by one team) - adding a field goal for record breaker

        //Chance of a big score is increased
        if (bigScoreChance)
            scoreMax = maxHistoricalScore;

        console.log('scoreMax: %s, bigScoreChance: %s', scoreMax, bigScoreChance)

        return scoreMax;
    },
    getScoreMin: function () {
        let safetyChance = UTILITIES.getRandomInt(1, 100) >= 95;
        let minScore = 0;
        let score = UTILITIES.getRandomInt(minScore, sim.getScoreMax());

        //safety is lowest possible score besides zero, but it's rare, so we want to limit scores divisible by 2
        if (!safetyChance) {
            while (score % 2 === 0) {
                score = UTILITIES.getRandomInt(minScore, sim.getScoreMax());
            }
        }

        return score;
    },
    getTeamScore: function () {
        let score = UTILITIES.getRandomInt(sim.getScoreMin(), sim.getScoreMax());

        // team cannot have a score of 1, so keep trying until it's no longer 1
        while (score === 1) {
            score = UTILITIES.getRandomInt(sim.getScoreMin(), sim.getScoreMax());
        };

        return score;
    }
};