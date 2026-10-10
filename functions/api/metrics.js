// /functions/api/metrics.js
import { classifyMove, countClassifications, calcACPL } from '../moveClassifier.js';
import { calculateGameAccuracy } from '../accuracy.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { action, payload } = body;

    if (action === 'classifyMoves') {
      const classifications = payload.movesData.map(data => classifyMove(data));
      return new Response(JSON.stringify({ classifications }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (action === 'calculateMetrics') {
      const { movesArray, whiteRating, blackRating } = payload;
      const gameAccuracy = calculateGameAccuracy(movesArray, whiteRating, blackRating);
      
      const whiteACPL = calcACPL(movesArray, 'w');
      const blackACPL = calcACPL(movesArray, 'b');
      
      const whiteElo = gameAccuracy.white.estimatedRating;
      const blackElo = gameAccuracy.black.estimatedRating;

      const whiteCounts = countClassifications(movesArray, 'w');
      const blackCounts = countClassifications(movesArray, 'b');

      const openingMoves = movesArray.filter(m => m.phase === 'opening');
      const middlegameMoves = movesArray.filter(m => m.phase === 'middlegame');
      const endgameMoves = movesArray.filter(m => m.phase === 'endgame');

      const phases = {
        opening: calculateGameAccuracy(openingMoves, whiteRating, blackRating),
        middlegame: calculateGameAccuracy(middlegameMoves, whiteRating, blackRating),
        endgame: calculateGameAccuracy(endgameMoves, whiteRating, blackRating)
      };

      return new Response(JSON.stringify({
        gameAccuracy,
        phases,
        whiteACPL, blackACPL,
        whiteElo, blackElo,
        whiteCounts, blackCounts
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    }
  });
}
