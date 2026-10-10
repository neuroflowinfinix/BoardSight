/**
 * Utility functions for fetching Lichess studies and managing session storage cache.
 */

const SESSION_CACHE_PREFIX = 'lichess_study_';

/**
 * Extracts study ID and optional chapter ID from a Lichess study URL or raw ID string.
 * Examples:
 *  - "vR4s213G" -> { studyId: "vR4s213G", chapterId: null }
 *  - "https://lichess.org/study/vR4s213G" -> { studyId: "vR4s213G", chapterId: null }
 *  - "https://lichess.org/study/vR4s213G/9p1d0rZ2" -> { studyId: "vR4s213G", chapterId: "9p1d0rZ2" }
 */
export function extractStudyInfo(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // URL matching: e.g. https://lichess.org/study/AXx2pMBm/Swl0PxS6 or lichess.org/study/AXx2pMBm
  if (str.toLowerCase().includes('lichess.org/study/')) {
    try {
      const pathAfterStudy = str.split(/lichess\.org\/study\//i)[1];
      if (pathAfterStudy) {
        const parts = pathAfterStudy.split('?')[0].split('#')[0].split('/');
        const studyId = parts[0];
        const chapterId = parts[1] || null;
        if (studyId && /^[a-zA-Z0-9]+$/.test(studyId)) {
          return { studyId, chapterId };
        }
      }
    } catch (e) {
      // Fall through to regex
    }
  }

  // Bare ID matching (e.g., 8-character alphanumeric string like AXx2pMBm)
  const bareMatch = str.match(/^[a-zA-Z0-9]{4,16}$/);
  if (bareMatch) {
    return {
      studyId: str,
      chapterId: null
    };
  }

  return null;
}

/**
 * Fetches the complete PGN for a Lichess study.
 * Uses sessionStorage to cache study PGNs for the duration of the web session.
 * 
 * @param {string} studyId 
 * @returns {Promise<string>} Raw PGN string for all chapters
 */
export async function fetchStudyPgn(studyId) {
  if (!studyId) throw new Error('No study ID provided.');

  const cacheKey = `${SESSION_CACHE_PREFIX}${studyId}`;
  
  // 1. Check Session Storage Cache
  try {
    const cachedPgn = sessionStorage.getItem(cacheKey);
    if (cachedPgn) {
      console.log(`[StudyCache] Loaded study ${studyId} from sessionStorage.`);
      return cachedPgn;
    }
  } catch (e) {
    console.warn('[StudyCache] Failed to access sessionStorage', e);
  }

  // 2. Fetch from Lichess API
  const apiUrl = `https://lichess.org/api/study/${studyId}.pgn`;
  console.log(`[StudyFetcher] Fetching Lichess study from ${apiUrl}...`);

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/x-chess-pgn, text/plain, */*'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Study "${studyId}" not found or is private on Lichess.`);
    }
    throw new Error(`Failed to fetch study from Lichess (Status ${response.status}).`);
  }

  const pgnText = await response.text();

  if (!pgnText || !pgnText.trim()) {
    throw new Error('Received empty PGN file for study.');
  }

  // 3. Save to Session Storage Cache
  try {
    sessionStorage.setItem(cacheKey, pgnText);
  } catch (e) {
    console.warn('[StudyCache] Failed to save study to sessionStorage', e);
  }

  return pgnText;
}

/**
 * Clears cached study from sessionStorage.
 */
export function clearStudyCache(studyId) {
  try {
    if (studyId) {
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${studyId}`);
    } else {
      // Clear all study caches
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(SESSION_CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (e) {
    console.warn('[StudyCache] Failed to clear sessionStorage cache', e);
  }
}
