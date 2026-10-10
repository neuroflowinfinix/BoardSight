// /functions/api/analyze.js
// ─────────────────────────────────────────────────────────────────────────────
//  Coach Explanation Endpoint
//  Called once per move when the user navigates to it (enrichMove idle callback).
// ─────────────────────────────────────────────────────────────────────────────

import { generateMoveExplanation } from '../enginex/moveExplainer.js';

export async function onRequestPost(context) {
  try {
    const params = await context.request.json();
    if (!params || !params.move || !params.preFen || !params.fen) {
      return new Response(JSON.stringify({ error: "Missing required move data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const coachExplanation = generateMoveExplanation(params);

    return new Response(JSON.stringify(coachExplanation), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

// Handle CORS preflight
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