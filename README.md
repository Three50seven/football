# football
JavaScript Football game

## Penalty statistics

Accepted penalties are charged to the team that committed the foul. Penalty yards
against that team are displayed as negative yards, separately from rushing and
passing yards. Both stats tables show whether the team's fouls were committed on
offense, defense, or both.

A defensive penalty retains the offense's valid play yardage and adds the enforced
penalty yards to field movement, stopping short of the goal line. An accepted
offensive penalty wipes the play yardage. Declined penalties do not add penalty
counts or yards.

## Team statistics

The pause menu and gameplay stats use the same vertically scrolling comparison:
one row per stat, with home and away columns showing team names and logos in a
sticky header.

Other Game Info starts collapsed. Its keyboard-accessible Expand/Collapse control
reveals the team comparison in a single scroll area, with no nested scrollbars.

Game and simulation box scores share a responsive card layout with team logos,
quarter-by-quarter scoring, overtime, and highlighted totals. All scoring columns
remain visible on mobile, with team names wrapping to fit.

Play history uses vertically scrolling cards in gameplay and the pause menu.
Each card shows the team logo, quarter and clock, full play result, and a
responsive detail grid for down, drive play, yardage, ball spot, possession time,
and score. Plays remain newest first.

Both stats tables include fumbles lost and interceptions thrown by each team,
and sacks and tackles credited to its defense. Lost muffed punts count as fumbles
lost; turnovers on downs, missed kicks, and two-point tries do not count as
fumbles lost or interceptions thrown.

Tackles count in-bounds runs and completed passes stopped by the defense,
including sacks and stops on downs. Touchdowns, incompletions, out-of-bounds
plays, live-ball turnovers, spikes, and plays with accepted penalties do not
credit a tackle or sack. Sacks are the game's negative-yardage pass plays.

Total yards are rushing yards plus net passing yards (including sack losses),
excluding penalty and special-teams yardage.
