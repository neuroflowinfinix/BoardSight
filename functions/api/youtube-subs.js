// /functions/api/youtube-subs.js
// ─────────────────────────────────────────────────────────────────────────────
// YouTube Subscriber Count Fetcher for @neuroflow_infinix (Chess Catalyst)
// ─────────────────────────────────────────────────────────────────────────────

export async function onRequestGet(context) {
  try {
    const channelUrl = 'https://www.youtube.com/@neuroflow_infinix';
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube fetch responded with status: ${response.status}`);
    }

    const html = await response.text();

    // Match subscriber count from YouTube channel metadata
    let subCount = null;

    // Pattern 1: {"text":{"content":"149 subscribers"}}
    const matchContent = html.match(/"text":\s*\{\s*"content":\s*"([^"]*subscribers?)"\s*\}/i);
    if (matchContent && matchContent[1]) {
      subCount = matchContent[1];
    }

    // Pattern 2: "subscriberCountText":{"simpleText":"149 subscribers"}
    if (!subCount) {
      const matchSimple = html.match(/"subscriberCountText":\s*\{\s*"simpleText":\s*"([^"]+)"\s*\}/i);
      if (matchSimple && matchSimple[1]) {
        subCount = matchSimple[1];
      }
    }

    // Pattern 3: "subscriberCountText":{"accessibility":{"accessibilityData":{"label":"149 subscribers"}}}
    if (!subCount) {
      const matchLabel = html.match(/"subscriberCountText":\s*\{\s*"accessibility":\s*\{\s*"accessibilityData":\s*\{\s*"label":\s*"([^"]+)"\s*\}\s*\}\s*\}/i);
      if (matchLabel && matchLabel[1]) {
        subCount = matchLabel[1];
      }
    }

    // Pattern 4: Fallback generic regex for sub count
    if (!subCount) {
      const matchRegex = html.match(/(\d+(?:\.\d+)?[KMB]?)\s+subscribers/i);
      if (matchRegex && matchRegex[0]) {
        subCount = matchRegex[0];
      }
    }

    if (subCount) {
      // Clean and normalize e.g. "149 subscribers" -> "149 subs"
      const normalized = subCount.replace(/subscribers?/i, 'subs').trim();
      return new Response(JSON.stringify({
        success: true,
        channel: 'Chess Catalyst',
        subCount: normalized,
        raw: subCount
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=600' // cache for 10 minutes on edge
        }
      });
    }

    // Fallback if structure changes
    return new Response(JSON.stringify({
      success: false,
      channel: 'Chess Catalyst',
      subCount: '149 subs',
      note: 'Using fallback value'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('[YouTube Subs Fetch Error]', error);
    return new Response(JSON.stringify({
      success: false,
      channel: 'Chess Catalyst',
      subCount: '149 subs',
      error: error.message
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}
