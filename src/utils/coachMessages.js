export function getWelcomeMessage(gameInfo, isWhitePerspective) {
  if (!gameInfo) return "-";

  let playerName = (isWhitePerspective ? gameInfo.white : gameInfo.black) || 'Player';
  
  // Clean the name: keep alphanumeric, underscores, hyphens, and spaces.
  // Take the first part before a comma (e.g. "Carlsen, Magnus" -> "Carlsen"), 
  // then take the first word so it acts like a first name or username.
  playerName = playerName
    .split(',')[0]
    .replace(/[^a-zA-Z0-9_ -]/g, '')
    .trim()
    .split(' ')[0] || 'Player';

  const won = (isWhitePerspective && gameInfo.result === '1-0') || (!isWhitePerspective && gameInfo.result === '0-1');
  const draw = gameInfo.result === '1/2-1/2';
  const lost = (isWhitePerspective && gameInfo.result === '0-1') || (!isWhitePerspective && gameInfo.result === '1-0');

  const pool = [
    `Let's look at your game, ${playerName}.`,
    `Ready to review this match, ${playerName}?`,
    `Let's dive into your game, ${playerName}!`,
    `Time to analyze your moves, ${playerName}.`,
    `Let's see what happened in this game, ${playerName}.`,
    `Hey! Let's look at some chess, ${playerName}.`,
    `Let's find the brilliancies and blunders in this one, ${playerName}.`,
    `Let's review the moments of this game, ${playerName}.`
  ];

  if (won) {
    pool.push(`You won, ${playerName}! Let's see how you did it.`);
    pool.push(`Great victory, ${playerName}! Let's review the game moments.`);
    pool.push(`A well-deserved win, ${playerName}! Let's analyze your moves.`);
  } else if (lost) {
    pool.push(`Tough loss, ${playerName}. Let's find out where things went wrong.`);
    pool.push(`Let's review this game and learn from it, ${playerName}.`);
    pool.push(`You'll get them next time, ${playerName}! Let's look at the moves.`);
  } else if (draw) {
    pool.push(`A hard-fought draw, ${playerName}! Let's review.`);
    pool.push(`It's a draw! Let's see where the balance shifted, ${playerName}.`);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
