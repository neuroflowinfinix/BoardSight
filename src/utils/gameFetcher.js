// src/utils/gameFetcher.js

export const fetchLichessGames = async (username, limit = 5) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return [];

    const res = await fetch(`https://lichess.org/api/games/user/${trimmedUsername}?max=${limit}`, {
        headers: { 'Accept': 'application/x-chess-pgn' }
    });

    if (res.status === 404) {
        throw new Error('USER_NOT_FOUND');
    }
    if (!res.ok) {
        throw new Error('API_ERROR');
    }

    const pgnData = await res.text();
    if (!pgnData || !pgnData.trim()) return [];

    // Lichess returns concatenated PGNs. Split them safely using the Event header.
    // Handles both \n\n\n and \r\n\r\n line endings.
    const games = pgnData
        .split(/\r?\n\r?\n(?=\[Event )/)
        .filter(g => g.trim().length > 0);

    return games.map(pgn => ({ platform: 'Lichess', pgn: pgn.trim() }));
};

export const fetchChessComGames = async (username, limit = 5) => {
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) return [];

    // 1. Get the list of monthly archives
    const archiveRes = await fetch(`https://api.chess.com/pub/player/${trimmedUsername}/games/archives`);
    if (archiveRes.status === 404 || archiveRes.status === 422) {
        throw new Error('USER_NOT_FOUND');
    }
    if (!archiveRes.ok) {
        throw new Error('API_ERROR');
    }

    const archiveData = await archiveRes.json();
    if (!archiveData.archives || archiveData.archives.length === 0) return [];

    // 2. Fetch recent archives starting from the latest month working backwards if needed
    const archives = [...archiveData.archives];
    const games = [];

    while (archives.length > 0 && games.length < limit) {
        const latestArchiveUrl = archives.pop();
        try {
            const gamesRes = await fetch(latestArchiveUrl);
            if (!gamesRes.ok) continue;
            const gamesData = await gamesRes.json();
            if (!gamesData.games || !Array.isArray(gamesData.games)) continue;

            // Extract valid PGNs
            const validGames = gamesData.games.filter(g => g && g.pgn && typeof g.pgn === 'string');
            for (let i = validGames.length - 1; i >= 0 && games.length < limit; i--) {
                games.push({ platform: 'Chess.com', pgn: validGames[i].pgn });
            }
        } catch (error) {
            console.error("Chess.com Archive Fetch Error:", latestArchiveUrl, error);
        }
    }

    return games;
};