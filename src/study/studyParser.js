/**
 * Multi-chapter PGN parser for Lichess studies.
 * Extracts study chapters, chapter titles, FEN, moves, and annotations/comments for each move.
 */

const NAG_MAP = {
  '$1': '!',
  '$2': '?',
  '$3': '!!',
  '$4': '??',
  '$5': '!?',
  '$6': '?!',
};

function cleanCommentText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\[%(cal|csl|eval|clk|emt|tag)\s+[^\]]+\]/gi, '')
    // replace multiple spaces/tabs with single space, but preserve newlines
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Extracts Lichess arrows and circles from raw comment text.
 */
function extractDrawings(raw) {
  const arrows = [];
  const circles = [];
  if (!raw) return { arrows, circles };

  const calMatch = raw.match(/\[%cal\s+([^\]]+)\]/gi);
  if (calMatch) {
    calMatch.forEach(match => {
      const inner = match.replace(/\[%cal\s+/i, '').replace(/\]$/, '');
      inner.split(',').forEach(a => arrows.push(a.trim()));
    });
  }

  const cslMatch = raw.match(/\[%csl\s+([^\]]+)\]/gi);
  if (cslMatch) {
    cslMatch.forEach(match => {
      const inner = match.replace(/\[%csl\s+/i, '').replace(/\]$/, '');
      inner.split(',').forEach(c => circles.push(c.trim()));
    });
  }

  return { arrows, circles };
}

/**
 * Splits a full multi-game Lichess study PGN into separate chapter PGN strings.
 * 
 * @param {string} fullPgn 
 * @returns {Array<string>} Array of raw chapter PGN strings
 */
export function splitStudyChapters(fullPgn) {
  if (!fullPgn || !fullPgn.trim()) return [];

  // PGN blocks usually begin with [Event "..."]
  const rawBlocks = fullPgn.split(/(?=\[\s*Event\s+)/i).filter(b => b.trim().length > 0);
  
  if (rawBlocks.length === 0) {
    // Fallback: split by double newlines before header blocks
    return fullPgn.split(/\n\s*\n(?=\[)/).filter(b => b.trim().length > 0);
  }

  return rawBlocks;
}

/**
 * Parses a single chapter PGN block, extracting headers, moves, and move comments.
 * 
 * @param {string} chapterPgn 
 * @param {number} chapterIndex 
 * @returns {Object} Chapter object
 */
export function parseChapter(chapterPgn, chapterIndex = 0) {
  const headers = {};
  
  // Extract all [Header "Value"] lines
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match;
  while ((match = headerRegex.exec(chapterPgn)) !== null) {
    headers[match[1]] = match[2];
  }

  // Extract Site URL to find chapterId if available (e.g., https://lichess.org/study/vR4s213G/9p1d0rZ2)
  let chapterId = null;
  const siteUrl = headers.ChapterURL || headers.Site;
  if (siteUrl) {
    const siteMatch = siteUrl.match(/\/([a-zA-Z0-9]+)$/);
    if (siteMatch) chapterId = siteMatch[1];
  }

  // Determine chapter title (prioritize ChapterName, then Chapter, then Event)
  let title = headers.ChapterName || headers.Chapter || headers.Event || `Chapter ${chapterIndex + 1}`;
  if (title.includes(': ') && !headers.ChapterName && !headers.Chapter) {
    const parts = title.split(': ');
    if (parts.length > 1) {
      title = parts.slice(1).join(': ');
    }
  }

  // Strip headers to get move text
  const moveText = chapterPgn.replace(/\[\w+\s+"[^"]*"\]/g, '').trim();

  // Extract main-line moves with their comments and NAGs
  const moveData = parseMovesAndComments(moveText);

  return {
    index: chapterIndex,
    chapterId: chapterId || `chapter_${chapterIndex + 1}`,
    title: title.trim(),
    event: headers.StudyName || headers.Event || 'Lichess Study',
    site: siteUrl || '',
    startingFen: headers.FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    isChess960: (headers.Variant && headers.Variant.toLowerCase() === 'chess960') || false,
    orientation: headers.Orientation || 'white',
    introComment: moveData.introComment,
    introArrows: moveData.introArrows || [],
    introCircles: moveData.introCircles || [],
    headers,
    moves: moveData.moves,
    cleanPgn: moveData.cleanPgn,
    rawPgn: chapterPgn,
  };
}

/**
 * Parses move text, tokenizing main line SAN moves and capturing `{ comments }` and `$N NAGs`.
 * 
 * @param {string} moveText 
 * @returns {{ moves: Array, cleanPgn: string, introComment: string|null }}
 */
function parseMovesAndComments(moveText) {
  const moves = [];
  const cleanTokens = [];
  let filterDepth = 0;

  let i = 0;
  const len = moveText.length;
  let currentSan = null;
  let currentComment = [];
  let currentNag = null;
  let introComments = [];
  
  let currentArrows = [];
  let currentCircles = [];
  let introArrows = [];
  let introCircles = [];

  const flushCurrentMove = () => {
    if (currentSan) {
      const commentText = currentComment.map(c => cleanCommentText(c)).filter(Boolean).join('\n\n');
      moves.push({
        san: currentSan,
        comment: commentText || null,
        nag: currentNag || null,
        arrows: [...currentArrows],
        circles: [...currentCircles],
      });
      currentSan = null;
      currentComment = [];
      currentNag = null;
      currentArrows = [];
      currentCircles = [];
    }
  };

  while (i < len) {
    const ch = moveText[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Line comment ;
    if (ch === ';') {
      while (i < len && moveText[i] !== '\n') i++;
      continue;
    }

    // Variations ( ... )
    if (ch === '(') {
      filterDepth++;
      i++;
      continue;
    }
    if (ch === ')') {
      filterDepth = Math.max(0, filterDepth - 1);
      i++;
      continue;
    }

    // Block comment { ... }
    if (ch === '{') {
      i++;
      const start = i;
      while (i < len && moveText[i] !== '}') i++;
      const rawContent = moveText.slice(start, i).trim();
      if (i < len) i++; // consume '}'

      if (filterDepth === 0) {
        const drawings = extractDrawings(rawContent);
        if (currentSan) {
          if (drawings.arrows.length) currentArrows.push(...drawings.arrows);
          if (drawings.circles.length) currentCircles.push(...drawings.circles);
        } else {
          if (drawings.arrows.length) introArrows.push(...drawings.arrows);
          if (drawings.circles.length) introCircles.push(...drawings.circles);
        }

        const cleanC = cleanCommentText(rawContent);
        if (cleanC) {
          if (currentSan) {
            currentComment.push(cleanC);
          } else {
            introComments.push(cleanC);
          }
        }
      }
      continue;
    }

    // NAG $N
    if (ch === '$') {
      i++;
      const start = i;
      while (i < len && /\d/.test(moveText[i])) i++;
      const nagCode = '$' + moveText.slice(start, i);
      if (filterDepth === 0 && currentSan) {
        currentNag = NAG_MAP[nagCode] || nagCode;
      }
      continue;
    }

    // Move number / Symbol / SAN / Result
    const symStart = i;
    while (i < len && !/[\s{}();$<>]/.test(moveText[i])) i++;
    const symbol = moveText.slice(symStart, i);

    if (!symbol) {
      i++;
      continue;
    }

    if (filterDepth === 0) {
      // Move number (e.g. 1. or 1... or 12.)
      if (/^\d+\.+$/.test(symbol)) {
        cleanTokens.push(symbol);
        continue;
      }

      // Result (1-0, 0-1, 1/2-1/2, *)
      if (symbol === '1-0' || symbol === '0-1' || symbol === '1/2-1/2' || symbol === '*') {
        flushCurrentMove();
        cleanTokens.push(symbol);
        continue;
      }

      // Extract NAG suffix from SAN if attached directly (e.g., f6?, b4!!, Nxe5!?)
      let sanPart = symbol;
      let nagPart = null;
      // Extract any trailing !, ?, !!, !?, ?!, ??
      const annoMatch = symbol.match(/^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[KQRBN])?[+#]?|[O0]-[O0](?:-[O0])?[+#]?|--)([?!]+)$/);
      if (annoMatch) {
        sanPart = annoMatch[1];
        nagPart = annoMatch[2];
      }

      // Validate SAN move
      const sanRegex = /^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=?[KQRBN])?|[O0]-[O0](-[O0])?|--)[+#]*$/;
      if (sanRegex.test(sanPart)) {
        flushCurrentMove(); // Save previous move
        currentSan = sanPart;
        if (nagPart) currentNag = nagPart;
        cleanTokens.push(sanPart);
      }
    }
  }

  flushCurrentMove();

  const cleanPgn = cleanTokens.join(' ');
  const introComment = introComments.join('\n\n').trim() || null;

  return { 
    moves, 
    cleanPgn, 
    introComment,
    introArrows,
    introCircles
  };
}

/**
 * Full study parser entry point.
 * 
 * @param {string} fullPgn 
 * @returns {{ title: string, chapters: Array<Object> }}
 */
export function parseStudyPgn(fullPgn) {
  const chapterBlocks = splitStudyChapters(fullPgn);
  if (chapterBlocks.length === 0) {
    throw new Error('No chapters found in PGN.');
  }

  const chapters = chapterBlocks.map((block, index) => parseChapter(block, index));
  
  // Extract main study title from first chapter's StudyName or Event header
  let studyTitle = 'Lichess Study';
  if (chapters[0]) {
    if (chapters[0].headers.StudyName) {
      studyTitle = chapters[0].headers.StudyName;
    } else if (chapters[0].event) {
      if (chapters[0].event.includes(': ')) {
        studyTitle = chapters[0].event.split(': ')[0];
      } else {
        studyTitle = chapters[0].event;
      }
    }
  }

  return {
    title: studyTitle,
    chapters,
  };
}
