var sim = {
    simGame: function () {
        //TODO: Sim each quarter for box score
        //determine winner or tie based on score
        //show results        
        let gameScore = sim.simScore();

        self.homeTeamScore(gameScore.homeTeam.total);
        self.awayTeamScore(gameScore.awayTeam.total);

        sim.displayBoxScore(gameScore);
        sim.generateGameSummary(gameScore);
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
        let homeTeamQuarters = generateQuarterScores();
        let awayTeamQuarters = generateQuarterScores();

        // Apply home team advantage to each quarter
        homeTeamQuarters = homeTeamQuarters.map(score => score + Math.round(score * homeTeamAdvantage));

        // Calculate total scores
        let homeTeamScore = homeTeamQuarters.reduce((a, b) => a + b, 0);
        let awayTeamScore = awayTeamQuarters.reduce((a, b) => a + b, 0);

        // Check for overtime
        let overtime = null;
        if (homeTeamScore === awayTeamScore) {
            let tieBreaker = UTILITIES.getRandomInt(1, 2);
            overtime = {
                homeTeam: generateOvertimeScore(),
                awayTeam: generateOvertimeScore()
            };
            // Ensure non-negative overtime scores and prevent 1 or both teams from having 6, use tie breaker if both teams have 6 since they can't both score a touchdown
            if (overtime.homeTeam === 1) overtime.homeTeam = 3;
            if (overtime.awayTeam === 1) overtime.awayTeam = 3;
            if ((overtime.homeTeam === 6 && overtime.awayTeam === 6) ||
                (overtime.homeTeam === 2 && overtime.awayTeam === 2)){ //if a team scores a safety, the game is over as well
                if (tieBreaker === 1) {
                    overtime.awayTeam = 0;
                } else {
                    overtime.homeTeam = 0;
                }
            }
        }

        return {
            homeTeam: {
                total: homeTeamScore + (overtime ? overtime.homeTeam : 0),
                quarters: homeTeamQuarters,
                overtime: overtime ? overtime.homeTeam : null
            },
            awayTeam: {
                total: awayTeamScore + (overtime ? overtime.awayTeam : 0),
                quarters: awayTeamQuarters,
                overtime: overtime ? overtime.awayTeam : null
            }
        };
    },
    displayBoxScore: function (simResult) {
        let boxScore = [];
        
        // Add Team 1 (HOME) scores
        boxScore.push(new MODULES.Constructors.GameBoxScoreRecord(
            self.homeTeamID(),
            self.homeTeamInfo().teamName(),
            simResult.homeTeam.quarters[0],
            simResult.homeTeam.quarters[1],
            simResult.homeTeam.quarters[2],
            simResult.homeTeam.quarters[3],
            simResult.homeTeam.overtime,
            simResult.homeTeam.total
        ));

        // Add Team 2 (AWAY) scores
        boxScore.push(new MODULES.Constructors.GameBoxScoreRecord(
            self.awayTeamID(),
            self.awayTeamInfo().teamName(),
            simResult.awayTeam.quarters[0],
            simResult.awayTeam.quarters[1],
            simResult.awayTeam.quarters[2],
            simResult.awayTeam.quarters[3],
            simResult.awayTeam.overtime,
            simResult.awayTeam.total
        ));

        self.simBoxScore(boxScore);
    },
    generateGameSummary: function (simResult) {
        let homeTeam = self.homeTeamInfo().teamName();
        let awayTeam = self.awayTeamInfo().teamName();
        let totalHomeScore = simResult.homeTeam.total;
        let totalAwayScore = simResult.awayTeam.total;
        let summary = `Final Score: ${homeTeam} ${simResult.homeTeam.total} - ${awayTeam} ${simResult.awayTeam.total}<br />`;       

        const homeWinSummaries = [
            `The ${homeTeam} emerged victorious with a strong performance, especially in the crucial moments of the game.`,
            `The ${homeTeam} dominated the field, securing a well-deserved win.`,
            `The ${homeTeam} outplayed ${awayTeam} with a stellar performance.`,
            `The ${homeTeam} clinched the victory with a last-minute surge.`,
            `The ${homeTeam} showed great resilience to come out on top.`,
            `The ${homeTeam} secured the win with a solid defense and strategic plays.`,
            `The ${homeTeam} triumphed with an impressive display of skill.`,
            `The ${homeTeam} took control of the game and never looked back.`,
            `The ${homeTeam} delivered a commanding performance to win the game.`,
            `The ${homeTeam} outscored ${awayTeam} in a thrilling match.`,
            `The ${homeTeam} emerged as the clear winner with consistent scoring.`,
            `The ${homeTeam} pulled off a remarkable victory with teamwork and determination.`,
            `The ${homeTeam} edged out ${awayTeam} in a closely contested game.`,
            `The ${homeTeam} prevailed with a strong finish in the final quarter.`,
            `The ${homeTeam} secured the win with a balanced attack and solid defense.`,
            `The ${homeTeam} outlasted ${awayTeam} in a hard-fought battle.`,
            `The ${homeTeam} came out on top with a well-executed game plan.`,
            `The ${homeTeam} won the game with a combination of skill and strategy.`,
            `The ${homeTeam} emerged victorious with a dominant performance.`,
            `The ${homeTeam} clinched the win with a decisive play in the final moments.`
        ];

        const awayWinSummaries = [
            `The ${awayTeam} clinched the win with consistent scoring and a solid defense.`,
            `The ${awayTeam} outperformed ${homeTeam} to secure the victory.`,
            `The ${awayTeam} dominated the game with a strong offensive showing.`,
            `The ${awayTeam} emerged victorious with a well-rounded performance.`,
            `The ${awayTeam} took control of the game and never let go.`,
            `The ${awayTeam} secured the win with a balanced attack and solid defense.`,
            `The ${awayTeam} outscored ${homeTeam} in a thrilling match.`,
            `The ${awayTeam} delivered a commanding performance to win the game.`,
            `The ${awayTeam} showed great resilience to come out on top.`,
            `The ${awayTeam} triumphed with an impressive display of skill.`,
            `The ${awayTeam} outlasted ${homeTeam} in a hard-fought battle.`,
            `The ${awayTeam} prevailed with a strong finish in the final quarter.`,
            `The ${awayTeam} pulled off a remarkable victory with teamwork and determination.`,
            `The ${awayTeam} emerged as the clear winner with consistent scoring.`,
            `The ${awayTeam} took control of the game and never looked back.`,
            `The ${awayTeam} won the game with a combination of skill and strategy.`,
            `The ${awayTeam} secured the win with a solid defense and strategic plays.`,
            `The ${awayTeam} edged out ${homeTeam} in a closely contested game.`,
            `The ${awayTeam} emerged victorious with a dominant performance.`,
            `The ${awayTeam} clinched the win with a decisive play in the final moments.`
        ];

        const tieSummaries = [
            `The game ended in a thrilling tie, showcasing the evenly matched skills of both teams.`,
            `Both teams fought hard, resulting in an exciting tie.`,
            `The match concluded in a draw, reflecting the balanced competition.`,
            `Neither team could pull ahead, ending the game in a tie.`,
            `The game was a nail-biter, finishing in a well-deserved tie.`,
            `Both teams displayed great effort, resulting in a tie.`,
            `The evenly matched teams ended the game in a thrilling tie.`,
            `The game concluded in a draw, with both teams showing equal prowess.`,
            `A hard-fought battle ended in a tie, highlighting the teams' equal strengths.`,
            `The game was a showcase of skill, ending in a balanced tie.`,
            `Both teams gave it their all, resulting in an exciting tie.`,
            `The match ended in a draw, with neither team able to secure the win.`,
            `A thrilling game concluded in a tie, reflecting the teams' equal abilities.`,
            `The game was a testament to both teams' skills, ending in a tie.`,
            `Neither team could claim victory, resulting in a well-fought tie.`,
            `The match ended in a draw, showcasing the teams' balanced competition.`,
            `Both teams played exceptionally well, concluding the game in a tie.`,
            `The game was a close contest, ending in a thrilling tie.`,
            `A hard-fought match ended in a tie, highlighting the teams' equal strengths.`,
            `The game concluded in a draw, with both teams showing equal prowess.`
        ];

        if (totalHomeScore > totalAwayScore) {
            const randomIndex = Math.floor(Math.random() * homeWinSummaries.length);
            summary += `<br />${homeWinSummaries[randomIndex]}`;
        } else if (totalHomeScore < totalAwayScore) {
            const randomIndex = Math.floor(Math.random() * awayWinSummaries.length);
            summary += `<br />${awayWinSummaries[randomIndex]}`;
        } else {
            const randomIndex = Math.floor(Math.random() * tieSummaries.length);
            summary += `<br />${tieSummaries[randomIndex]}`;
        }

        self.simGameSummary(summary);
    }
};