/**
 * Parse PGN headers and extract per-move clock times.
 *
 * Core parsing approach inspired by en-croissant's lexer (lexer.rs):
 * instead of running regex over the full move text (which corrupts clock
 * strings like "0:09:59.7"), we walk the text character-by-character and
 * emit typed tokens — exactly like a proper lexer would.
 *
 * Preserved from original:
 *  - parsePGN(pgn)  →  { headers, clocks, cleanPgn }
 *  - formatClock(seconds)  →  "M:SS" / "H:MM:SS"
 *  - Chess960 / Variant + FEN header detection
 *  - Decimal clock values (e.g. 0:09:59.7)
 *  - Precise error messages with character position
 */

// ─── Public API ──────────────────────────────────────────────────────────────

export function parsePGN(pgn) {
  const headers = {};

  // --- Header extraction (unchanged) ---
  const headerRe = /\[(\w+)\s+"([^"]*)"\]/g;
  let m;
  while ((m = headerRe.exec(pgn)) !== null) {
    headers[m[1]] = m[2];
  }

  // Explicit Chess960 fallback for weirdly-formatted files
  if (pgn.toLowerCase().includes('[variant "chess960"]')) {
    headers.Variant = 'Chess960';
  }

  // Strip headers, leaving only the move text
  const moveText = pgn.replace(/\[\w+\s+"[^"]*"\]/g, '').trim();

  // --- Tokenise (never touches inside {} blocks) ---
  const tokens = tokenize(moveText); // may throw PGNParseError

  // --- Walk tokens, collect clocks for main-line moves only ---
  const clocks = [];
  let variationDepth = 0;
  let pendingClock    = null;
  let awaitingComment = false;

  for (const tok of tokens) {
    switch (tok.type) {
      case 'paren_open':
        variationDepth++;
        break;

      case 'paren_close':
        variationDepth--;
        break;

      case 'san':
        if (variationDepth > 0) break; // ignore moves inside variations
        if (awaitingComment) {
          clocks.push(pendingClock); // previous move had no clock comment
        }
        pendingClock    = null;
        awaitingComment = true;
        break;

      case 'comment':
        // Only capture the first clock comment after a main-line move
        if (variationDepth === 0 && awaitingComment && pendingClock === null) {
          const clkMatch = tok.value.match(/\[%clk\s+([\d:.]+)\]/);
          if (clkMatch) {
            pendingClock = parseClockString(clkMatch[1]);
          }
        }
        break;

      case 'result':
        if (awaitingComment) {
          clocks.push(pendingClock);
          awaitingComment = false;
        }
        break;

      // 'nag' and 'move_number' tokens are simply skipped
    }
  }

  // Flush the very last move if it had no result token after it
  if (awaitingComment) {
    clocks.push(pendingClock);
  }

  // Reconstruct a clean PGN string stripped of all NAGs ($), comments, and variations
  // Feed `cleanPgn` to your downstream library (e.g., chess.js) to avoid invalid move errors
  const cleanTokens = [];
  let filterDepth = 0;

  for (const tok of tokens) {
    if (tok.type === 'paren_open') {
      filterDepth++;
    } else if (tok.type === 'paren_close') {
      filterDepth--;
    } else if (filterDepth === 0) {
      if (tok.type === 'move_number' || tok.type === 'san' || tok.type === 'result') {
        cleanTokens.push(tok.value);
      }
    }
  }

  const cleanPgn = cleanTokens.join(' ');

  return { headers, clocks, cleanPgn };
}

export function formatClock(seconds) {
  if (seconds == null) return '--:--';
  const h   = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);           // floor so decimals don't bleed into display
  if (h > 0) {
    return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// ─── Custom error class (preserves position info) ────────────────────────────

export class PGNParseError extends Error {
  /**
   * @param {string} message   Human-readable description
   * @param {number} position  Character offset in the move-text where parsing broke
   * @param {string} context   Short snippet of text around the error
   */
  constructor(message, position, context = '') {
    super(message);
    this.name     = 'PGNParseError';
    this.position = position;
    this.context  = context;
  }
}

// ─── Tokeniser ───────────────────────────────────────────────────────────────

/**
 * Walk `moveText` character-by-character and emit typed tokens.
 *
 * Token types (mirrors en-croissant's lexer.rs Token enum):
 *   { type: 'san',         value: string }
 *   { type: 'comment',     value: string }   ← raw content between { }
 *   { type: 'nag',         value: string }   ← e.g. "$2"
 *   { type: 'paren_open'  }                  ← variation start (
 *   { type: 'paren_close' }                  ← variation end   )
 *   { type: 'move_number', value: string }   ← "1." / "23..." etc.
 *   { type: 'result',      value: string }   ← "1-0" / "0-1" / "1/2-1/2" / "*"
 *
 * Critically, move-number tokens are identified AFTER reading the full symbol,
 * so they never corrupt clock strings that happen to contain "59." etc.
 *
 * @param   {string}   moveText
 * @returns {Array}    token list
 * @throws  {PGNParseError}
 */
function tokenize(moveText) {
  const tokens = [];
  const len    = moveText.length;
  let   i      = 0;

  while (i < len) {
    const ch = moveText[i];

    // ── Whitespace ───────────────────────────────────────────────────────────
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      i++;
      continue;
    }

    // ── Line comment  ;  (ignored entirely, like en-croissant) ───────────────
    if (ch === ';') {
      while (i < len && moveText[i] !== '\n') i++;
      continue;
    }

    // ── Block comment  { … }  ────────────────────────────────────────────────
    if (ch === '{') {
      const start = i;
      i++;
      const commentStart = i;
      while (i < len && moveText[i] !== '}') i++;
      if (i >= len) {
        const snippet = moveText.slice(Math.max(0, start - 10), start + 20);
        throw new PGNParseError(
          `Unclosed comment '{' at position ${start}`,
          start,
          snippet,
        );
      }
      tokens.push({ type: 'comment', value: moveText.slice(commentStart, i) });
      i++; // consume '}'
      continue;
    }

    // ── Variation delimiters ─────────────────────────────────────────────────
    if (ch === '(') { tokens.push({ type: 'paren_open'  }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'paren_close' }); i++; continue; }

    // ── NAG  $N ──────────────────────────────────────────────────────────────
    if (ch === '$') {
      const start = i;
      i++;
      while (i < len && moveText[i] >= '0' && moveText[i] <= '9') i++;
      tokens.push({ type: 'nag', value: moveText.slice(start, i) });
      continue;
    }

    // ── Angle-bracket annotations  <…>  (some exporters emit these) ──────────
    if (ch === '<') {
      while (i < len && moveText[i] !== '>') i++;
      if (i < len) i++; // consume '>'
      continue;
    }

    // ── Symbol: move number, SAN, or result ──────────────────────────────────
    // Read everything that isn't whitespace or a special delimiter
    const symStart = i;
    while (i < len && !/[\s{}();$<>]/.test(moveText[i])) i++;
    const symbol = moveText.slice(symStart, i);

    if (!symbol) {
      i++; // skip any stray character we couldn't classify
      continue;
    }

    // Move number: one or more digits followed by one or more dots
    // e.g. "1."  "23."  "1..."  "23..."
    // This check happens on the WHOLE symbol, so "59.7" (inside a clock
    // string in a comment) is never even seen here — it's inside {} tokens.
    if (/^\d+\.+$/.test(symbol)) {
      tokens.push({ type: 'move_number', value: symbol });
      continue;
    }

    // Game result
    if (symbol === '1-0' || symbol === '0-1' || symbol === '1/2-1/2' || symbol === '*') {
      tokens.push({ type: 'result', value: symbol });
      continue;
    }

    // Validate if the symbol is actually a SAN move before adding it.
    // Matches standard moves, castling, captures, promotions, and null moves (--).
    // Safely ignores garbage text like "chess.com", "android", etc.
    const sanRegex = /^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=?[KQRBN])?|[O0]-[O0](-[O0])?|--)[+#]*$/;
    
    if (sanRegex.test(symbol)) {
      // Normalize digit zeros in castling notation to standard uppercase letter 'O'
      let normalizedSan = symbol;
      if (/^[0O]-[0O](-[0O])?[+#]*$/.test(symbol)) {
        normalizedSan = symbol.replace(/0/g, 'O');
      }
      tokens.push({ type: 'san', value: normalizedSan });
    }
  }

  return tokens;
}

// ─── Clock helpers (unchanged from original) ─────────────────────────────────

function parseClockString(str) {
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}
