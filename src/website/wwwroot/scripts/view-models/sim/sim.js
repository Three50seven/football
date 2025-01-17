var sim = {
    simGame: function () {
        //TODO: Sim each quarter for box score
        //determine winner or tie based on score
        //show results        
        let gameScore = sim.simScore();

        self.homeTeamScore(gameScore.team1.total);
        self.awayTeamScore(gameScore.team2.total);

        sim.displayBoxScore(gameScore);
        console.log(`Home Team: (${self.homeTeamInfo().teamCityAndName()}): ${gameScore.team1.total}, Quarters: ${gameScore.team1.quarters}, Overtime: ${gameScore.team1.overtime}`);
        console.log(`Away Team: (${self.awayTeamInfo().teamCityAndName()}): ${gameScore.team2.total}, Quarters: ${gameScore.team2.quarters}, Overtime: ${gameScore.team2.overtime}`);
    },
    simScore: function () {
        // Helper function to generate a random number based on a normal distribution and average score (per 2024 season)
        //let averageScore = 22.9; //average in 2024 for both teams is 22.9 points, so setting normal max to around this number
        //let maxHistoricalPoints = 75; //max historical (as of 2025 season is 72 by one team) - adding a field goal for record breaker
        let homeTeamAdvantage = 0.05// Default home team advantage is 5%
        function randomNormalDistribution(mean, stdDev) {
            let u1 = Math.random();
            let u2 = Math.random();
            let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            return mean + stdDev * randStdNormal;
        }

        // Helper function to generate a realistic quarter score
        function generateQuarterScore() {
            const scores = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
                14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
                29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42]; // Common football scores - highest NFL score is 37 in a quarter as of 2024            
            const probabilities = [
                0.15, 0.005, 0.15, 0.005, 0.005, 0.10, 0.15, 0.005, 0.005, 0.10,
                0.005, 0.01, 0.01, 0.10, 0.01, 0.005, 0.005, 0.005, 0.005, 0.005,
                0.005, 0.002, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001,
                0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001,
                0.001, 0.001, 0.001, 0.001, 0.001
            ]; // Probabilities for each score
            /*
                Scores of 0, 3, 6, 7, 10, and 14 have higher probabilities, making them the most common.
                Scores of 2, 4, 5, 8, 9, and 11 have lower probabilities.
                Scores higher than 21 have very low probabilities, making them less likely to occur.
            */
            const random = Math.random();
            let cumulativeProbability = 0;
            for (let i = 0; i < scores.length; i++) {
                cumulativeProbability += probabilities[i];
                if (random < cumulativeProbability) {
                    return scores[i];
                }
            }
            return 0; // Fallback in case of rounding errors
        }

        function generateOvertimeScore() {
            const scores = [0, 2, 3, 6]; // Common football scores
            const probabilities = [0.1, 0.001, 0.4495, 0.4495]; // Probabilities for each overtime score
            const random = Math.random();
            let cumulativeProbability = 0;
            for (let i = 0; i < scores.length; i++) {
                cumulativeProbability += probabilities[i];
                if (random < cumulativeProbability) {
                    return scores[i];
                }
            }
            return 0; // Fallback in case of rounding errors
        }

        // Generate scores for each quarter
        function generateQuarterScores() {
            let quarters = [];
            for (let i = 0; i < 4; i++) {
                let score;
                do {
                    score = generateQuarterScore();
                } while (score === 1 || (score === 2 && Math.random() < 0.9)); // Prevent score of 1 and make 2 rare
                quarters.push(score);
            }
            return quarters;
        }

        // Generate scores for both teams
        let team1Quarters = generateQuarterScores();
        let team2Quarters = generateQuarterScores();

        // Apply home team advantage to each quarter
        team1Quarters = team1Quarters.map(score => score + Math.round(score * homeTeamAdvantage));

        // Calculate total scores
        let team1Score = team1Quarters.reduce((a, b) => a + b, 0);
        let team2Score = team2Quarters.reduce((a, b) => a + b, 0);

        // Check for overtime
        let overtime = null;
        if (team1Score === team2Score) {
            let tieBreaker = UTILITIES.getRandomInt(1, 2) === 1;
            overtime = {
                team1: generateOvertimeScore(),
                team2: generateOvertimeScore()
            };
            // Ensure non-negative overtime scores and prevent 1 or both teams from having 6, use tie breaker if both teams have 6 since they can't both score a touchdown
            if (overtime.team1 === 1) overtime.team1 = 3;
            if (overtime.team2 === 1) overtime.team2 = 3;
            if ((overtime.team1 === 6 && overtime.team2 === 6) ||
                (overtime.team1 === 2 && overtime.team2 === 2)){ //if a team scores a safety, the same is over as well
                if (tieBreaker === 1) {
                    overtime.team2 = 0;
                } else {
                    overtime.team1 = 0;
                }
            }
        }

        return {
            team1: {
                total: team1Score + (overtime ? overtime.team1 : 0),
                quarters: team1Quarters,
                overtime: overtime ? overtime.team1 : null
            },
            team2: {
                total: team2Score + (overtime ? overtime.team2 : 0),
                quarters: team2Quarters,
                overtime: overtime ? overtime.team2 : null
            }
        };
    },
    displayBoxScore: function (simResult) {
        let boxScore = [];
        
        // Add Team 1 (HOME) scores
        boxScore.push(new MODULES.Constructors.GameBoxScoreRecord(
            self.homeTeamID(),
            self.homeTeamInfo().teamName(),
            simResult.team1.quarters[0],
            simResult.team1.quarters[1],
            simResult.team1.quarters[2],
            simResult.team1.quarters[3],
            simResult.team1.overtime,
            simResult.team1.total
        ));

        // Add Team 2 (AWAY) scores
        boxScore.push(new MODULES.Constructors.GameBoxScoreRecord(
            self.awayTeamID(),
            self.awayTeamInfo().teamName(),
            simResult.team2.quarters[0],
            simResult.team2.quarters[1],
            simResult.team2.quarters[2],
            simResult.team2.quarters[3],
            simResult.team2.overtime,
            simResult.team2.total
        ));

        self.simBoxScore(boxScore);

        console.log('SIM BOX SCORE:', self.simBoxScore());
    }
};