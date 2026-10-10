import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { parsePGN } from '../utils/pgnParser';
import { fetchClassifications } from '../utils/apiClient';
import { UciController } from '../hooks/UciController';
import { getEngineConfig, getFlavorLabel, resolveEngineId } from '../utils/engineDetector';
import { loadOpeningsDatabase, isBookMove, getOpeningInfoByColor } from '../utils/openingsDatabase';
import { findAllHangingSquares } from '../../functions/enginex/hangingPieceTracker.js';
import { findAllForks } from '../../functions/enginex/forkTracker.js';
import { detectMate } from '../../functions/enginex/mateExplainer.js';
import { findAllChecks } from '../../functions/enginex/checkTracker.js';
import { findAllPinnedPieces } from '../../functions/enginex/pinTracker.js';
import { findAllCheckBlockers } from '../../functions/enginex/checkBlockerTracker.js';
import { findAllDiscoveries } from '../../functions/enginex/discoveryTracker.js';

import { StreakTracker } from '../../functions/enginex/streakTracker.js';
import { fetchExplanation } from '../utils/apiClient';
import { detectSacrifice } from '../../functions/enginex/sacrificeTracker.js';
// ── Phase Detector ─────────────────────────────────────────────────────────
function detectGamePhase(moveIndex, totalMoves) {
  const movePct = moveIndex / Math.max(1, totalMoves);
  if (movePct <= 0.30) return 'opening';
  if (movePct <= 0.70) return 'middlegame';
  return 'endgame';
}

// ── Safe Initialization Helper ──────────────────────────────────────────────
// Strips non-standard castling letters so chess.js doesn't crash on boot.
function initSafeChess(fen) {
  let safeFen = fen;
  const parts = safeFen.split(/\s+/);
  if (parts.length >= 3 && /[^KQkq-]/.test(parts[2])) {
    parts[2] = '-'; // We strip weird letters; our manual 960 engine handles the rest!
    safeFen = parts.join(' ');
  }
  try {
    return new Chess(safeFen);
  } catch (e) {
    if (parts.length >= 3) {
      parts[2] = '-';
      safeFen = parts.join(' ');
    }
    try { return new Chess(safeFen); } catch (e2) { return null; }
  }
}

// ── FRC Database Loader ────────────────────────────────────────────────────
let frcDbCache = null;
async function loadFRCDatabase() {
  if (frcDbCache) return frcDbCache;
  try {
    const res = await fetch('/frc.tsv');
    const text = await res.text();
    const boardMap = new Map();
    const idMap = new Map();
    for (const line of text.split('\n')) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const id = parts[0].trim();
        const fen = parts[1].trim();
        boardMap.set(fen.split(' ')[0], fen);
        idMap.set(id, fen);
        const numMatch = id.match(/\d+/);
        if (numMatch) {
          idMap.set(numMatch[0], fen);
        }
      } else if (parts.length === 1 && parts[0].includes('/')) {
        const fen = parts[0].trim();
        boardMap.set(fen.split(' ')[0], fen);
      }
    }
    frcDbCache = { boardMap, idMap };
    return frcDbCache;
  } catch (e) {
    console.error("Failed to load frc.tsv", e);
    return { boardMap: new Map(), idMap: new Map() };
  }
}

// ── Refined Manual Chess960 Castling Engine ────────────────────────────────
function apply960Castle(chessInstance, color, moveSan) {
  try {
    const fen = chessInstance.fen();
    const parts = fen.split(' ');
    const board = parts[0];

    // Standard destination squares for King and Rook in 960/Standard
    const rank = color === 'w' ? '1' : '8';
    const kingDest = (moveSan === 'O-O' ? 'g' : 'c') + rank;
    const rookDest = (moveSan === 'O-O' ? 'f' : 'd') + rank;

    const ranks = board.split('/');
    const targetRank = color === 'w' ? 7 : 0;
    let rankStr = ranks[targetRank];

    // Expand FEN rank to find physical piece indices
    let expanded = '';
    for (let i = 0; i < rankStr.length; i++) {
      if (/[1-8]/.test(rankStr[i])) expanded += ' '.repeat(parseInt(rankStr[i]));
      else expanded += rankStr[i];
    }

    const kingChar = color === 'w' ? 'K' : 'k';
    const rookChar = color === 'w' ? 'R' : 'r';
    const kingIndex = expanded.indexOf(kingChar);

    // In 960, the Kingside rook is ALWAYS the one to the right of the king
    let rookIndex = -1;
    if (moveSan === 'O-O') {
      rookIndex = expanded.indexOf(rookChar, kingIndex + 1);
    } else {
      rookIndex = expanded.lastIndexOf(rookChar, kingIndex - 1);
    }

    if (kingIndex === -1 || rookIndex === -1) return null;

    const kingSq = String.fromCharCode(97 + kingIndex) + rank;
    const rookSq = String.fromCharCode(97 + rookIndex) + rank;

    // 1. Physically move pieces
    chessInstance.remove(kingSq);
    chessInstance.remove(rookSq);
    // Use put to avoid triggering standard chess.js move validation again
    chessInstance.put({ type: 'k', color }, kingDest);
    chessInstance.put({ type: 'r', color }, rookDest);

    // 2. Manually rebuild the FEN to force the turn change and castling loss
    let newFen = chessInstance.fen();
    let newParts = newFen.split(' ');

    // Switch Turn
    newParts[1] = color === 'w' ? 'b' : 'w';

    // Strip Castling Rights for the player who just castled
    let cr = newParts[2];
    if (color === 'w') cr = cr.replace(/[KQ]/g, '');
    else cr = cr.replace(/[kq]/g, '');
    newParts[2] = cr === '' ? '-' : cr;

    // Reset Halfmove clock and En Passant
    newParts[3] = '-';
    newParts[4] = '0';

    // Increment Fullmove counter if black just moved
    if (color === 'b') {
      newParts[5] = (parseInt(newParts[5]) + 1).toString();
    }

    const finalFen = newParts.join(' ');
    chessInstance.load(finalFen);

    return {
      color,
      from: kingSq,
      to: kingDest,
      piece: 'k',
      san: moveSan,
      flags: 'c',
      lan: kingSq + rookSq // Engines often prefer this for 960 castling
    };
  } catch (e) {
    return null;
  }
}

export function useGameAnalysis(settings = { depth: 13, movetime: 1000, multiPV: 3 }, onEngineNameChange = null) {
  const [activeEngineName, setActiveEngineName] = useState(settings.engine || 'stockfish');
  const [engineReady, setEngineReady] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [liveEvalData, setLiveEvalData] = useState({ depth: 0, topMoves: [] });
  const evalTurnRef = useRef('w');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingBookMoves, setIsFetchingBookMoves] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [analyzedMoves, setAnalyzedMoves] = useState([]);
  const [positions, setPositions] = useState([]);
  const [gameInfo, setGameInfo] = useState(null);
  const [mainLineMoves, setMainLineMoves] = useState([]);
  const [mainLinePositions, setMainLinePositions] = useState([]);

  // Engine loading status for the UI loading flow
  // Stages: 'detecting' → 'testing' → 'ready' | 'error'
  const [engineLoadingStatus, setEngineLoadingStatus] = useState({
    stage: 'detecting',   // 'detecting' | 'testing' | 'ready' | 'error'
    detectedFlavor: null, // e.g. "Stockfish 19 (Multi-threaded)"
    engineLabel: null,    // final loaded engine name
    errorMessage: null,
  });

  // Refs to safely access the latest state inside the free move callback
  const analyzedMovesRef = useRef([]);
  const positionsRef = useRef([]);
  const gameInfoRef = useRef(null);
  useEffect(() => { analyzedMovesRef.current = analyzedMoves; }, [analyzedMoves]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { gameInfoRef.current = gameInfo; }, [gameInfo]);
  const [pgnError, setPgnError] = useState(null);

  const workerRef = useRef(null);
  const resolverRef = useRef(null);
  const topMovesRef = useRef({});
  const timeoutRef = useRef(null);
  const enrichPendingRef = useRef(new Set()); // Tracks in-flight enrichMove calls by index
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const [engineError, setEngineError] = useState(null);

  // Store the onEngineNameChange callback in a ref so useEffect doesn't re-trigger
  const onEngineNameChangeRef = useRef(onEngineNameChange);
  useEffect(() => { onEngineNameChangeRef.current = onEngineNameChange; }, [onEngineNameChange]);

  // 1. Initialize the UCI Controller with instant feature detection
  useEffect(() => {
    const engineSetting = settingsRef.current.engine || 'stockfish';
    const { detection, workerPaths } = getEngineConfig(engineSetting);

    setActiveEngineName(engineSetting);

    if (!detection || workerPaths.length === 0) {
      setEngineLoadingStatus({
        stage: 'error',
        detectedFlavor: null,
        engineLabel: null,
        errorMessage: 'No compatible engine flavor found for this browser.',
      });
      setEngineError('No compatible engine flavor found for this browser.');
      setEngineReady(false);
      return;
    }

    const flavorLabel = getFlavorLabel(detection);
    setEngineLoadingStatus({
      stage: 'detecting',
      detectedFlavor: flavorLabel,
      engineLabel: null,
      errorMessage: null,
    });

    // Brief delay so the "Finding best engine..." message is visible
    const detectTimer = setTimeout(() => {
      setEngineLoadingStatus(prev => ({
        ...prev,
        stage: 'testing',
      }));
    }, 400);

    const threads = settingsRef.current.threads || 2;

    workerRef.current = new UciController(
      workerPaths,
      (evalData) => {
        // Live UI throttled update
        const bestScore = evalData.topMoves[0]?.score ?? 0;
        setLiveScore(evalTurnRef.current === 'w' ? bestScore : -bestScore);
        setLiveEvalData({ ...evalData });
      },
      (isReady, errorMsg, activePath) => {
        setEngineReady(isReady);
        if (isReady) {
          setEngineError(null);
          setEngineLoadingStatus({
            stage: 'ready',
            detectedFlavor: flavorLabel,
            engineLabel: flavorLabel,
            errorMessage: null,
          });
          if (onEngineNameChangeRef.current) {
            onEngineNameChangeRef.current(flavorLabel);
          }
        } else if (errorMsg) {
          setEngineError(errorMsg);
          setEngineLoadingStatus({
            stage: 'error',
            detectedFlavor: flavorLabel,
            engineLabel: null,
            errorMessage: errorMsg,
          });
        }
      },
      engineSetting,
      threads,
      detection  // Pass detection metadata to UciController
    );

    return () => {
      clearTimeout(detectTimer);
      if (workerRef.current) workerRef.current.destroy();
    };
  }, [settings.engine]);

  // 2. Safe Reload
  const reloadEngine = useCallback(() => {
    const engineSetting = settingsRef.current.engine || 'stockfish';
    const { detection, workerPaths } = getEngineConfig(engineSetting);

    setEngineReady(false);
    setEngineError(null);
    setActiveEngineName(engineSetting);
    if (workerRef.current) workerRef.current.destroy();

    if (!detection || workerPaths.length === 0) {
      setEngineLoadingStatus({
        stage: 'error',
        detectedFlavor: null,
        engineLabel: null,
        errorMessage: 'No compatible engine flavor found for this browser.',
      });
      setEngineError('No compatible engine flavor found for this browser.');
      return;
    }

    const flavorLabel = getFlavorLabel(detection);
    setEngineLoadingStatus({
      stage: 'testing',
      detectedFlavor: flavorLabel,
      engineLabel: null,
      errorMessage: null,
    });

    const threads = settingsRef.current.threads || 2;

    workerRef.current = new UciController(
      workerPaths,
      (evalData) => {
        const bestScore = evalData.topMoves[0]?.score ?? 0;
        setLiveScore(evalTurnRef.current === 'w' ? bestScore : -bestScore);
        setLiveEvalData({ ...evalData });
      },
      (isReady, errorMsg, activePath) => {
        setEngineReady(isReady);
        if (isReady) {
          setEngineError(null);
          setEngineLoadingStatus({
            stage: 'ready',
            detectedFlavor: flavorLabel,
            engineLabel: flavorLabel,
            errorMessage: null,
          });
          if (onEngineNameChangeRef.current) {
            onEngineNameChangeRef.current(flavorLabel);
          }
        } else if (errorMsg) {
          setEngineError(errorMsg);
          setEngineLoadingStatus({
            stage: 'error',
            detectedFlavor: flavorLabel,
            engineLabel: null,
            errorMessage: errorMsg,
          });
        }
      },
      engineSetting,
      threads,
      detection
    );
  }, []);

  // 3. Clean Evaluate Promise
  const evaluatePosition = useCallback((fen) => {
    evalTurnRef.current = fen.split(' ')[1] || 'w';
    
    // Handle instant game over without asking engine
    try {
      const check = initSafeChess(fen);
      if (check && check.isGameOver()) {
        const score = check.isCheckmate() ? -10000 : 0;
        return Promise.resolve({ bestMove: null, score, topMoves: [{ score, move: null }] });
      }
    } catch (_e) { }

    const { depth, movetime, nodes, multiPV } = settingsRef.current;
    const pvCount = Math.max(1, multiPV ?? 3);
    
    // Let the controller handle the queuing, stopping, and starting
    return workerRef.current.evaluatePosition(fen, depth, movetime, pvCount, nodes ?? 300);
  }, []);

  const makeFreeMove = useCallback((currentFen, positionIndex, from, to, promotion = '') => {
      try {
        const chess = initSafeChess(currentFen === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : currentFen);
        if (!chess) return false;
        const moveResult = chess.move({ from, to, promotion: promotion || undefined });
        if (!moveResult) return false;

        const isOverwriting = positionIndex < analyzedMovesRef.current.length;
        const prevIsBranch = positionIndex > 0 && analyzedMovesRef.current[positionIndex - 1]?.isBranch;
        
        // If we are just playing the exact same move that's already in the main line, 
        // don't branch or overwrite it! Just advance the position.
        // Compare using both SAN and from/to to be absolutely bulletproof.
        if (isOverwriting && !prevIsBranch) {
            const existingMove = analyzedMovesRef.current[positionIndex];
            const isMatch = existingMove && (
                existingMove.san === moveResult.san || 
                (existingMove.from === from && existingMove.to === to && (existingMove.promotion || '') === (promotion || ''))
            );
            if (isMatch) {
                return true;
            }
        }

        const isBranchMove = isOverwriting || prevIsBranch;

        // Save the main line exactly ONCE when the first branch move is made
        if (isBranchMove && !analyzedMovesRef.current.some(m => m.isBranch)) {
          setMainLineMoves([...analyzedMovesRef.current]);
          setMainLinePositions([...positionsRef.current]);
        }

      const newFen = chess.fen();
      const color = positionIndex % 2 === 0 ? 'w' : 'b';
      const moveNumber = Math.floor(positionIndex / 2) + 1;

      setPositions(prev => {
        const base = prev.length === 0 ? [currentFen === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : currentFen] : prev;
        return [...base.slice(0, positionIndex + 1), newFen];
      });

      setAnalyzedMoves(prev => {
        const isOverwriting = positionIndex < prev.length;
        const prevIsBranch = positionIndex > 0 && prev[positionIndex - 1]?.isBranch;
        const isBranch = isOverwriting || prevIsBranch;

        const newMove = {
          from: moveResult.from, to: moveResult.to, san: moveResult.san,
          color, piece: moveResult.piece, flags: moveResult.flags,
          promotion: moveResult.promotion ?? null, moveNumber,
          fen: newFen, preFen: currentFen === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : currentFen, isBranch,
          classification: null, clock: null, whiteScore: null, loss: null,
          engineBestMove: null, engineTopMoves: [],
          playerMoveUCI: from + to + (promotion || ''),
          openingInfo: null, isBookMove: false,
          hangingSquares: null,
          forkSquares: null,
          checkSquares: null,
          pinSquares: null,
          blockSquares: null,
          discoverySquares: null,
          isSacrifice: null,
          coachExplanation: null,
          _deferredData: {
            bestMoveSan: null, currentIsBookMove: false, currentIsNovelty: false, currentIsLastBookMove: false,
            isOnlySoundMove: false, timeSpent: null, captureStreak: 0, pvStr: null, evalStr: null
          },
          phase: detectGamePhase(positionIndex + 1, prev.length + 1),
        };
        return [...prev.slice(0, positionIndex), newMove];
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  const analyzeGame = useCallback(async (pgn, isManual960 = false, initialFen = null) => {
    setIsAnalyzing(true);
    setAnalyzedMoves([]);
    setPositions([]);
    setMainLineMoves([]);
    setMainLinePositions([]);
    setGameInfo(null);
    setPgnError(null);
    enrichPendingRef.current.clear(); // Clear stale in-flight markers from previous game

    try {
      const { headers, clocks, cleanPgn } = parsePGN(pgn);
      const is960 = isManual960 || headers.Variant?.toLowerCase().includes('960') || !!headers.FEN;

      const info = {
        white: headers.White || 'White',
        black: headers.Black || 'Black',
        whiteElo: headers.WhiteElo ? parseInt(headers.WhiteElo) : null,
        blackElo: headers.BlackElo ? parseInt(headers.BlackElo) : null,
        site: headers.Site || '',
        event: headers.Event || '',
        date: headers.Date || '',
        result: headers.Result || '*',
        whiteUrl: headers.WhiteUrl || null,
        blackUrl: headers.BlackUrl || null,
        whiteTitle: headers.WhiteTitle || null,
        blackTitle: headers.BlackTitle || null,
        openingInfo: null,
      };
      setGameInfo(info);

      let startFen = headers.FEN || initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      if (is960) {
        const { boardMap, idMap } = await loadFRCDatabase();
      const trimmedFen = startFen.trim();

      // If the provided FEN is actually an ID from the 960 toggle
      if (idMap.has(trimmedFen)) {
        startFen = idMap.get(trimmedFen);
      } else {
        const boardStr = startFen.split(/\s+/)[0];
        // If the board layout matches a valid 960 position, use the pristine FEN
        if (boardMap.has(boardStr)) {
          const pristineFen = boardMap.get(boardStr);
          const startParts = startFen.split(/\s+/);
          const pristineParts = pristineFen.split(/\s+/);
          // Preserve turn and move numbers if they existed in the original
          if (startParts.length >= 6) {
            pristineParts[1] = startParts[1];
            pristineParts[5] = startParts[5];
          }
          startFen = pristineParts.join(' ');
        }
      }
    }

    const replayGame = initSafeChess(startFen);
    if (!replayGame) {
      setPgnError("The starting position (FEN) is invalid.");
      setIsAnalyzing(false);
      setGameInfo(null);
      return [];
    }

    // Completely bypass `chess.loadPgn()`. We manually extract and validate every move!
    const firstToken = cleanPgn.split(/\s+/)[0];

    // We can now safely use the tokenised `cleanPgn` to prevent chess.js from crashing
    const sansClean = cleanPgn.replace(/\d+\.+/g, '').split(/\s+/).filter(m => m && !['1-0', '0-1', '1/2-1/2', '*'].includes(m));
    const moves = [];
    const normalizedStartFen = initSafeChess(startFen)?.fen() ?? startFen;
    const fenList = [normalizedStartFen];
    let turn = replayGame.turn();
    let moveCount = 1;

    for (const san of sansClean) {
      const normalizedSan = san.replace(/^0-0(-0)?([+#]?)$/, (_, q, ch) => (q ? 'O-O-O' : 'O-O') + (ch || ''));
      let moveObj = null;
      try {
        moveObj = replayGame.move(normalizedSan);
      } catch (e) {
        // If standard logic fails (like 960 castling), our manual engine takes over!
        if (is960 && (normalizedSan === 'O-O' || normalizedSan === 'O-O-O')) {
          moveObj = apply960Castle(replayGame, turn, normalizedSan);
        }
      }

      if (!moveObj) {
        setPgnError(`Move ${moveCount} of ${turn === 'w' ? 'White' : 'Black'} is invalid: check your PGN please (${san})`);
        setIsAnalyzing(false);
        setGameInfo(null);
        return [];
      }

      moves.push(moveObj);
      fenList.push(replayGame.fen());

      if (turn === 'b') moveCount++;
      turn = turn === 'w' ? 'b' : 'w';
    }

    // Reset engine hash table once for the new game
    if (workerRef.current) {
      workerRef.current.newGame();
    }

    // Tell Stockfish to analyze using Chess960 rules!
    if (workerRef.current && workerRef.current.worker) {
      workerRef.current.worker.postMessage(`setoption name UCI_Chess960 value ${is960 ? 'true' : 'false'}`);
    }

    const sanArr = moves.map(m => m.san);
    const totalMoves = moves.length;
    if (totalMoves === 0) {
      setIsAnalyzing(false);
      return [];
    }
    setProgress({ current: 0, total: totalMoves, percent: 0 });

    // Load the new enhanced opening database (TSV-based)
    setIsFetchingBookMoves(true);
    const openingsDb = await loadOpeningsDatabase();
    setIsFetchingBookMoves(false);
    
    // Direct lookup by moves (longest match first) — no need to generate all FENs
    const openingResult = openingsDb.lookupByMoves(sanArr);

    const bookLimit = openingsDb.getBookDepth(sanArr);

    let whiteOpeningInfo = null;
    let blackOpeningInfo = null;

    if (openingResult && !is960) {
      // Compute white and black opening depths
      const whiteDepth = bookLimit % 2 === 1 ? bookLimit : Math.max(0, bookLimit - 1);
      const blackDepth = bookLimit % 2 === 0 ? bookLimit : Math.max(0, bookLimit - 1);
      
      // For white: get opening from moves up to white's last book move
      if (whiteDepth > 0) {
        const whiteOpening = openingsDb.lookupByMoves(sanArr.slice(0, whiteDepth));
        if (whiteOpening) {
          whiteOpeningInfo = {
            eco: whiteOpening.eco,
            opening: whiteOpening.name,
            bookDepth: whiteDepth,
          };
        }
      }
      
      // For black: get opening from moves up to black's last book move
      if (blackDepth > 0) {
        const blackOpening = openingsDb.lookupByMoves(sanArr.slice(0, blackDepth));
        if (blackOpening) {
          blackOpeningInfo = {
            eco: blackOpening.eco,
            opening: blackOpening.name,
            bookDepth: blackDepth,
          };
        }
      }
    }

    // Display opening info IMMEDIATELY when found (don't wait for analysis to complete)
    setGameInfo(prev => ({ ...prev, whiteOpeningInfo, blackOpeningInfo, openingInfo: null }));

    setPositions(fenList);
    const evals = [];
    let captureStreak = 0;
    const tempAnalyzedMoves = []; // Store moves locally to prevent per-move rendering

    try {
      for (let i = 0; i <= totalMoves; i++) {
        const ev = await evaluatePosition(fenList[i]);
        evals.push(ev);

        if (i === 0) continue;

        const moveIdx = i - 1;
        const mv = moves[moveIdx];
        const preEval = evals[i - 1];
        const postEval = evals[i];

        const preScore = preEval.score;
        const postScore = -postEval.score;
        const whiteScore = mv.color === 'w' ? postScore : -postScore;
        const loss = Math.max(0, preScore - postScore);

        const playerMoveUCI = mv.from + mv.to + (mv.promotion ? mv.promotion.toLowerCase() : '');
        const currentIsBookMove = moveIdx < bookLimit; // Seamlessly use our universally calculated limit
        const currentIsNovelty = moveIdx === bookLimit && bookLimit > 0; // The exact moment they left book
        const currentIsLastBookMove = moveIdx === bookLimit - 1 && bookLimit > 0;

        if (mv.captured) captureStreak++;
        else captureStreak = 0;

        const pv1Score = preEval.topMoves?.[0]?.score ?? 0;
        const pv2Entry = preEval.topMoves?.[1] ?? null;
        
        const prevMv = moveIdx > 0 ? moves[moveIdx - 1] : null;

        // En Croissant (score.ts) Great Move ("!") logic:
        const clampCP = (cp) => Math.max(-1000, Math.min(1000, typeof cp === 'number' ? cp : (cp?.value ?? 0)));
        const s1 = clampCP(pv1Score);
        const s2 = pv2Entry !== null ? clampCP(pv2Entry.score) : null;
        const spp = clampCP(i >= 2 ? -evals[i - 2].score : 0);

        const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

        let isOnlySoundMove = false;
        if (s2 !== null) {
          const pvWinDiff = winPct(s1) - winPct(s2);
          const turnWinDiff = winPct(s1) - winPct(spp);
          const moveLoss = winPct(s1) - winPct(clampCP(postScore));
          if (pvWinDiff > 10 && turnWinDiff > 5 && moveLoss <= 5) {
            isOnlySoundMove = true;
          }
        }
        const isSacrifice = detectSacrifice(fenList[i], mv, postEval, preScore, postScore, prevMv);

        let postEvalStr = null;
        if (postEval.topMoves?.[0]) {
          const ps = postEval.topMoves[0].score;
          if (Math.abs(ps) > 9000) {
            const movesToMate = 10000 - Math.abs(ps);
            postEvalStr = ps > 0 ? `M${movesToMate}` : `-M${movesToMate}`;
          } else {
            postEvalStr = (ps / 100).toFixed(2);
          }
        }

        let evalStr = null;
        if (preEval.topMoves?.[0]) {
          const s = preEval.topMoves[0].score;
          if (Math.abs(s) > 9000) {
            const movesToMate = 10000 - Math.abs(s);
            evalStr = s > 0 ? `M${movesToMate}` : `-M${movesToMate}`;
          } else {
            evalStr = (s / 100).toFixed(2);
          }
        }

        const clock = clocks[moveIdx] ?? null;
        const prevClock = moveIdx >= 2 ? clocks[moveIdx - 2] : (clocks[0] ?? null);
        const timeSpent = (prevClock !== null && clock !== null) ? Math.max(0, prevClock - clock) : null;

        // Convert UCI best move to SAN for coach explanation
        let bestMoveSan = null;
        if (preEval.topMoves?.[0]?.move) {
          try {
            const tempChess = initSafeChess(fenList[i - 1]);
            const uciMove = preEval.topMoves[0].move;
            const from = uciMove.substring(0, 2);
            const to = uciMove.substring(2, 4);
            const promotion = uciMove.length > 4 ? uciMove[4].toUpperCase() : undefined;
            const moveObj = tempChess.move({ from, to, promotion });
            bestMoveSan = moveObj ? moveObj.san : null;
          } catch (e) {
            bestMoveSan = null;
          }
        }

        let repeatedMissedTactic = false;
        let missedQueen = false;
        try {
            const tmpChess = initSafeChess(fenList[i - 1]);
            const moves = tmpChess.moves({verbose: true});
            if (moves.some(m => m.captured === 'q')) {
                missedQueen = true;
            }
        } catch(e) {}

        if (i >= 3) {
          const prevPlayerMove = tempAnalyzedMoves[i - 3];
          if (prevPlayerMove) {
             if (bestMoveSan && bestMoveSan.includes('x') && prevPlayerMove._deferredData.bestMoveSan === bestMoveSan) {
                 repeatedMissedTactic = true;
             }
             if (missedQueen && prevPlayerMove._deferredData.missedQueen) {
                 repeatedMissedTactic = true;
             }
          }
        }

        const pvStr = preEval.topMoves?.[0]?.pv ?? null;

        const classification = null; // Will fetch in batch

        const result = {
          ...mv,
          moveNumber: Math.floor(moveIdx / 2) + 1,
          fen: fenList[i], preFen: fenList[i - 1],
          preScore, postScore, whiteScore, loss, classification, isBookMove: currentIsBookMove, clock,
          engineBestMove: preEval.topMoves?.[0]?.move ?? null,
          engineTopMoves: preEval.topMoves ?? [],
          postEvalTopMoves: postEval.topMoves ?? [],
          playerMoveUCI, openingInfo: null, isBranch: false,
          hangingSquares: null,
          forkSquares: null,
          checkSquares: null,
          pinSquares: null,
          blockSquares: null,
          discoverySquares: null,
          isSacrifice: isSacrifice,
          coachExplanation: null,
          _deferredData: {
            bestMoveSan, currentIsBookMove, currentIsNovelty, currentIsLastBookMove,
            isOnlySoundMove, timeSpent, captureStreak, pvStr, evalStr, postEvalStr,
            repeatedMissedTactic, missedQueen
          },
          phase: detectGamePhase(i, totalMoves),
        };

        tempAnalyzedMoves.push(result);

        const pct = Math.round((i / totalMoves) * 100);
        setProgress({ current: i, total: totalMoves, percent: pct });
      }

      // Opening info already set earlier (right after calculation), no need to set again
      // Fetch classifications from server
      const payload = tempAnalyzedMoves.map(m => ({
        preScore: m.preScore, postScore: m.postScore, engineBestMove: m.engineBestMove,
        playerMoveUCI: m.playerMoveUCI, isBookMove: m.isBookMove, isNovelty: m._deferredData.currentIsNovelty,
        isSacrifice: m.isSacrifice ? m.isSacrifice.type !== 'unsound_sacrifice' : false, isOnlySoundMove: m._deferredData.isOnlySoundMove
      }));
      const classifications = await fetchClassifications(payload).catch(() => []);
      const streakTracker = new StreakTracker();
      let whiteBlunderStreak = 0;
      let blackBlunderStreak = 0;
      let whitePrevClass = null;
      let blackPrevClass = null;
      
      for (let i = 0; i < tempAnalyzedMoves.length; i++) {
        tempAnalyzedMoves[i].classification = classifications[i] || null;
        const clsId = tempAnalyzedMoves[i].classification?.id;
        const isWhite = tempAnalyzedMoves[i].color === 'w';

        if (isWhite) {
            tempAnalyzedMoves[i]._deferredData.prevPlayerClassification = whitePrevClass;
            whitePrevClass = clsId;
        } else {
            tempAnalyzedMoves[i]._deferredData.prevPlayerClassification = blackPrevClass;
            blackPrevClass = clsId;
        }

        const isPlayerMove = tempAnalyzedMoves[i].color === (settingsRef.current.perspective || 'w');
        const streakExplanation = streakTracker.processMove(tempAnalyzedMoves[i].color, clsId, isPlayerMove);
        if (streakExplanation) {
            tempAnalyzedMoves[i].streakExplanation = streakExplanation;
        }

        if (clsId === 'blunder') {
            if (isWhite) { whiteBlunderStreak++; tempAnalyzedMoves[i]._deferredData.blunderStreak = whiteBlunderStreak; }
            else { blackBlunderStreak++; tempAnalyzedMoves[i]._deferredData.blunderStreak = blackBlunderStreak; }
        } else {
            if (isWhite) { whiteBlunderStreak = 0; tempAnalyzedMoves[i]._deferredData.blunderStreak = 0; }
            else { blackBlunderStreak = 0; tempAnalyzedMoves[i]._deferredData.blunderStreak = 0; }
        }
      }
      } catch (err) {
        console.error('[Analysis] Evaluation loop failed:', err);
      } finally {
        // Set the final state array exactly once, eliminating O(N^2) loop re-renders
        setAnalyzedMoves(applyDiscounting(tempAnalyzedMoves));
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error("Analysis Error:", err);
      setPgnError(err.message || "An unexpected error occurred during analysis.");
      setIsAnalyzing(false);
      setGameInfo(null);
      setProgress({ current: 0, total: 0, percent: 0 });
    }

    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const SEVERITY_RANK = {
    blunder: 0, mistake: 1, inaccuracy: 2, good: 3, excellent: 4, best: 5, great: 6, brilliant: 7,
  };

  function applyDiscounting(moves) {
    // Blunder forgiveness is completely removed universally.
    // No moves are marked as discounted, forcing raw ACPL to reflect the brutal truth.
    return moves.map(m => ({ ...m, discounted: false }));
  }
  
  const analyzeBranch = useCallback(async () => {
    setIsAnalyzing(true);
    setPgnError(null);

    // Find the exact index where the unanalyzed branch moves start
    const startIndex = analyzedMoves.findIndex(m => m.classification === null);
    if (startIndex === -1) {
      setIsAnalyzing(false);
      return;
    }

    const totalMovesToAnalyze = analyzedMoves.length - startIndex;
    setProgress({ current: 0, total: totalMovesToAnalyze, percent: 0 });

    setIsFetchingBookMoves(true);
    const openingsDb = await loadOpeningsDatabase();
    setIsFetchingBookMoves(false);
    const sanArr = analyzedMoves.map(m => m.san);
    const openingResult = openingsDb.lookupByMoves(sanArr);

    const bookLimit = openingsDb.getBookDepth(sanArr);

    const streakTracker = new StreakTracker();
    streakTracker.hydrate(analyzedMoves.slice(0, startIndex));

    try {
      // 1. Evaluate the FEN exactly one move BEFORE the branch to get our baseline preScore
      let currentPreEval = await evaluatePosition(positions[startIndex]);

      // 2. Loop only through the unanalyzed moves
      for (let i = startIndex; i < analyzedMoves.length; i++) {
        const mv = analyzedMoves[i];
        const postEval = await evaluatePosition(positions[i + 1]);

        const preScore = currentPreEval.score;
        const postScore = -postEval.score;
        const whiteScore = mv.color === 'w' ? postScore : -postScore;
        const loss = Math.max(0, preScore - postScore);

        const currentIsBookMove = i < bookLimit; // Seamlessly use our universally calculated limit
        const currentIsLastBookMove = i === bookLimit - 1 && bookLimit > 0;
        const clampCP = (cp) => Math.max(-1000, Math.min(1000, typeof cp === 'number' ? cp : (cp?.value ?? 0)));
        const s1 = clampCP(pv1Score);
        const s2 = pv2Entry !== null ? clampCP(pv2Entry.score) : null;
        const spp = clampCP(i > 0 && analyzedMoves[i - 1] ? -analyzedMoves[i - 1].preScore : 0);
        const moveLoss = winPct(s1) - winPct(clampCP(postScore));
        const isOnlySoundMove = s2 !== null && (winPct(s1) - winPct(s2) > 10) && (winPct(s1) - winPct(spp) > 5) && moveLoss <= 5;
        const isSacrifice = detectSacrifice(positions[i + 1], mv, postEval, preScore, postScore);

        const [classification] = await fetchClassifications([{
          preScore, postScore, engineBestMove: currentPreEval.topMoves?.[0]?.move ?? null,
          playerMoveUCI: mv.playerMoveUCI, isBookMove: currentIsBookMove, isNovelty: false, isSacrifice: isSacrifice ? isSacrifice.type !== 'unsound_sacrifice' : false, isOnlySoundMove,
        }]).catch(() => [null]);

        const streakExplanation = streakTracker.processMove(mv.color, classification?.id);

        // Update just this specific move in the state
        setAnalyzedMoves(prev => {
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = {
              ...updated[i],
              preScore, postScore, whiteScore, loss, classification, isBookMove: currentIsBookMove,
              engineBestMove: currentPreEval.topMoves?.[0]?.move ?? null,
              engineTopMoves: currentPreEval.topMoves ?? [],
              hangingSquares: null,
          forkSquares: null,
          checkSquares: null,
          pinSquares: null,
          blockSquares: null,
          discoverySquares: null,
              isSacrifice: isSacrifice,
              streakExplanation,
              coachExplanation: null,
              _deferredData: {
                bestMoveSan: null, currentIsBookMove, currentIsNovelty: false, currentIsLastBookMove,
                isOnlySoundMove, timeSpent: null, captureStreak: 0, pvStr: currentPreEval.topMoves?.[0]?.pv ?? null, evalStr: null
              },
              phase: detectGamePhase(i + 1, analyzedMoves.length)
            };
          }
          return updated;
        });

        // The post-eval of this move becomes the pre-eval for the next move
        currentPreEval = postEval;

        // Update progress bar dynamically
        const currentProg = i - startIndex + 1;
        setProgress({
          current: currentProg,
          total: totalMovesToAnalyze,
          percent: Math.round((currentProg / totalMovesToAnalyze) * 100)
        });
      }
    } catch (err) {
      console.error('[Analysis] Branch evaluation loop failed:', err);
    } finally {
      // Re-run discounting after branch analysis to update the "forgiven" moves
      setAnalyzedMoves(prev => applyDiscounting(prev));
      setIsAnalyzing(false);
    }
  }, [analyzedMoves, positions, evaluatePosition]);
  
  const deleteMovesAfter = useCallback((index) => {
    setAnalyzedMoves(prevMoves => {
      if (index < 0 || index >= prevMoves.length) return prevMoves;

      if (!prevMoves[index]?.isBranch) {
        setPositions(prev => prev.slice(0, index + 1));
        return prevMoves.slice(0, index);
      }

      let end = index + 1;
      while (end < prevMoves.length && prevMoves[end]?.isBranch) { end++; }

      setPositions(prev => [...prev.slice(0, index + 1), ...prev.slice(end + 1)]);
      return [...prevMoves.slice(0, index), ...prevMoves.slice(end)];
    });
  }, []);

    const restoreMainLine = useCallback(() => {
      if (mainLineMoves.length > 0) {
        setAnalyzedMoves(mainLineMoves);
        setPositions(mainLinePositions);
        setMainLineMoves([]);
        setMainLinePositions([]);
        setPgnError(null);
      }
    }, [mainLineMoves, mainLinePositions]);

  const enrichMove = useCallback((index) => {
    if (index < 0) return;

    // ── Guard: skip if already enriched or in-flight (ref-based, immune to React batching) ──
    const currentMove = analyzedMovesRef.current[index];
    if (!currentMove || currentMove.coachExplanation || !currentMove._deferredData) return;
    if (enrichPendingRef.current.has(index)) return;
    enrichPendingRef.current.add(index);
    
    // Synchronous enrichment: sacrifice detection, hanging squares
    setAnalyzedMoves(prev => {
      const move = prev[index];
      if (!move || move.coachExplanation || !move._deferredData) return prev;

      const isSacrifice = detectSacrifice(move.fen, move, { topMoves: move.postEvalTopMoves }, move.preScore, move.postScore);
      const hangingSquares = findAllHangingSquares(move.fen);
      const forkSquares = findAllForks(move.fen);
      const checkSquares = findAllChecks(move.fen);
      const pinSquares = findAllPinnedPieces(move.fen);
      const blockSquares = findAllCheckBlockers(move.fen);
      const discoverySquares = findAllDiscoveries(move.fen);
      const updatedMoves = [...prev];
      updatedMoves[index] = {
        ...move,
        isSacrifice,
        hangingSquares,
        forkSquares,
        checkSquares,
        pinSquares,
        blockSquares,
        discoverySquares,
      };

      return applyDiscounting(updatedMoves);
    });

    // Re-read move from ref after synchronous updates
    const move = analyzedMovesRef.current[index];
    if (!move || !move._deferredData) {
      enrichPendingRef.current.delete(index);
      return;
    }

    // Only re-classify if classification is missing (already set during batch analysis)
    const needsClassification = !move.classification;
    const classificationPromise = needsClassification
      ? fetchClassifications([{
          preScore: move.preScore, postScore: move.postScore, engineBestMove: move.engineBestMove,
          playerMoveUCI: move.playerMoveUCI, isBookMove: move._deferredData.currentIsBookMove, isNovelty: move._deferredData.currentIsNovelty,
          isSacrifice: move.isSacrifice ? move.isSacrifice.type !== 'unsound_sacrifice' : false, isOnlySoundMove: move._deferredData.isOnlySoundMove,
        }]).then(res => res[0]).catch(() => null)
      : Promise.resolve(null);

    classificationPromise.then(classification => {
      const existing = analyzedMovesRef.current[index];
      if (!existing || existing.coachExplanation) return;
      
      const resolvedClassification = existing.classification || classification;
      
      fetchExplanation({
        move: existing,
        preFen: existing.preFen,
        fen: existing.fen,
        classification: resolvedClassification,
        forkSquares: existing.forkSquares,
        pinSquares: existing.pinSquares,
        checkSquares: existing.checkSquares,
        hangingSquares: existing.hangingSquares,
        blockSquares: existing.blockSquares,
        discoverySquares: existing.discoverySquares,
        isSacrifice: existing.isSacrifice,
        streakExplanation: existing.streakExplanation,
        bestMoveSan: existing._deferredData?.bestMoveSan,
        loss: existing.loss,
        preScore: existing.preScore,
        postScore: existing.postScore,
        whiteScore: existing.whiteScore,
        isBookMove: existing._deferredData?.currentIsBookMove,
        isNovelty: existing._deferredData?.currentIsNovelty,
        isLastBookMove: existing._deferredData?.currentIsLastBookMove,
        moveNumber: existing.moveNumber,
        openingName: gameInfoRef.current?.whiteOpeningInfo?.opening || null,
        phase: existing.phase,
        engineTopMoves: existing.engineTopMoves,
        playerMoveUCI: existing.playerMoveUCI,
        pvStr: existing._deferredData?.pvStr,
        perspectiveColor: settingsRef.current.perspective || 'w',
      }).then(coachExplanation => {
        setAnalyzedMoves(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], classification: resolvedClassification, coachExplanation };
          return updated;
        });
      }).catch(err => {
        console.error('[Coach] Failed to fetch explanation from server:', err);
        setAnalyzedMoves(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], classification: resolvedClassification, coachExplanation: { type: 'none', text: 'Explanation failed to load.' } };
          return updated;
        });
      });
    }).catch(err => {
      console.error('[Coach] Failed to generate explanation:', err);
    }).finally(() => {
      enrichPendingRef.current.delete(index);
    });
  }, []);

  const startLiveEval = useCallback(async (fen, seedScore = null) => {
    if (isAnalyzing || !workerRef.current || !engineReady) return;
    
    if (seedScore !== null) {
      setLiveScore(seedScore);
    }
    
    evalTurnRef.current = fen.split(' ')[1] || 'w';
    
    // The controller safely stops any previous search and resolves this new one
    // For live evaluation, we set a massive depth (99) so the engine runs infinitely until paused or moved
    const result = await workerRef.current.evaluatePosition(fen, 99, null, settingsRef.current.multiPV ?? 2);
    
    // Fix: Catch the final evaluated score! If the engine finishes its search faster
    // than the UI throttler, the final score was being dropped.
    if (result) {
      setLiveScore(evalTurnRef.current === 'w' ? result.score : -result.score);
    }
  }, [isAnalyzing, engineReady]);

  const stopLiveEval = useCallback(() => {
    if (workerRef.current) workerRef.current.halt();
  }, []);

  const clearExplanations = useCallback(() => {
    setAnalyzedMoves(prev => prev.map(m => ({ ...m, coachExplanation: null })));
  }, []);

  return {
    engineReady, engineError, reloadEngine, isAnalyzing, isFetchingBookMoves, progress,
    analyzedMoves, positions, gameInfo, analyzeGame, analyzeBranch, makeFreeMove, deleteMovesAfter, pgnError,
    mainLineMoves, restoreMainLine, enrichMove, clearExplanations,
    setAnalyzedMoves, setPositions, setGameInfo,
    liveScore, liveEvalData, startLiveEval, stopLiveEval,
    activeEngineName, engineLoadingStatus
  };
}