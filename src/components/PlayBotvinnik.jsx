import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import EvalBar from './EvalBar';
import EvalBadge from './EvalBadge';
import { BotvinnikController } from '../utils/botvinnikController';
import { StockfishDepth7Analyzer } from '../utils/stockfishDepth7';

const BOARD_THEMES = {
  green: { dark: '#769656', light: '#eeeed2' },
  wood: { dark: '#b58863', light: '#f0d9b5' },
};

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];
const PROMO_LABELS = { q: '♛', r: '♜', b: '♝', n: '♞' };

export default function PlayBotvinnik({
  onExit,
  onAnalyzeGame,
  initialSettings = {},
  initialPieceSet = 'Staunty',
}) {
  const [boardTheme, setBoardTheme] = useState(initialSettings.boardTheme || 'green');
  const [pieceSet, setPieceSet] = useState(initialPieceSet || 'Staunty');
  const [soundEnabled, setSoundEnabled] = useState(initialSettings.enableSound !== false);

  // Game state
  const [playerSide, setPlayerSide] = useState('w'); // 'w' or 'b'
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState('start');
  const [moves, setMoves] = useState([]); // array of move objects
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isSfAnalyzing, setIsSfAnalyzing] = useState(false);
  const [gameResult, setGameResult] = useState(null); // { title, subtitle, winner }
  const [showSideModal, setShowSideModal] = useState(true);

  // Engine live analysis state
  const [liveScore, setLiveScore] = useState(0);
  const [liveEvalStr, setLiveEvalStr] = useState('0.00');
  const [depth7BestMove, setDepth7BestMove] = useState(null);
  const [latestCommentary, setLatestCommentary] = useState(
    'Welcome! Choose your side to begin your match against 6th World Champion Mikhail Botvinnik.'
  );
  const [botvinnikBookNotice, setBotvinnikBookNotice] = useState(null);

  // Board UI state
  const [flipped, setFlipped] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // Engine refs
  const botvinnikRef = useRef(null);
  const stockfishRef = useRef(null);
  const lastScoreMovingPovRef = useRef(0);

  // Audio refs
  const audioRefs = useRef({
    move: new Audio('/sounds/move.mp3'),
    capture: new Audio('/sounds/capture.mp3'),
    check: new Audio('/sounds/check.mp3'),
    castle: new Audio('/sounds/castle.mp3'),
  });

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const audio = audioRefs.current[type] || audioRefs.current.move;
      const clone = audio.cloneNode();
      clone.volume = 0.8;
      clone.play().catch(() => {});
    } catch (_) {}
  }, [soundEnabled]);

  // Initialize Engines on Mount
  useEffect(() => {
    botvinnikRef.current = new BotvinnikController(
      (ready, err) => {
        if (ready) {
          console.log('[PlayBotvinnik] GM Botvinnik Engine v1.0 ready');
        } else {
          console.warn('[PlayBotvinnik] GM Botvinnik initialization warning:', err);
        }
      }
    );

    stockfishRef.current = new StockfishDepth7Analyzer(
      (ready) => {
        if (ready) {
          console.log('[PlayBotvinnik] Stockfish Depth 7 Analyzer ready');
        }
      }
    );

    return () => {
      if (botvinnikRef.current) botvinnikRef.current.terminate();
      if (stockfishRef.current) stockfishRef.current.terminate();
    };
  }, []);

  // Check Game End Conditions
  const checkGameOver = useCallback(() => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      const isPlayerWinner = (winner === 'White' && playerSide === 'w') || (winner === 'Black' && playerSide === 'b');
      setGameResult({
        title: isPlayerWinner ? 'Victory! 🎉' : 'Checkmate',
        subtitle: isPlayerWinner
          ? 'You defeated World Champion Mikhail Botvinnik!'
          : 'GM Mikhail Botvinnik delivers checkmate.',
        winner: isPlayerWinner ? 'player' : 'botvinnik',
      });
      return true;
    }
    if (chess.isDraw()) {
      let reason = 'Draw';
      if (chess.isStalemate()) reason = 'Draw by Stalemate';
      else if (chess.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
      else if (chess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
      setGameResult({
        title: 'Draw Handshake 🤝',
        subtitle: reason,
        winner: 'draw',
      });
      return true;
    }
    return false;
  }, [chess, playerSide]);

  // Request Botvinnik's Move
  const triggerBotvinnikMove = useCallback(async () => {
    if (!botvinnikRef.current || checkGameOver()) return;

    setIsBotThinking(true);
    setBotvinnikBookNotice(null);

    const history = chess.history({ verbose: true });
    const uciMoves = history.map((m) => m.from + m.to + (m.promotion || ''));

    try {
      // Botvinnik searches depth 5, optimal for master book lookup + trained WASM positional weights
      const result = await botvinnikRef.current.getMove(uciMoves, 5, 800);

      if (!result.uci) {
        setIsBotThinking(false);
        return;
      }

      if (result.isBook) {
        setBotvinnikBookNotice(
          result.bookGames
            ? `Book move (${result.bookGames} Botvinnik career games)`
            : 'Book move from Botvinnik Repertoire'
        );
      }

      // Record pre-move score for Botvinnik's move evaluation
      const preScoreMovingPov = lastScoreMovingPovRef.current;

      const botMoveObj = chess.move({
        from: result.from,
        to: result.to,
        promotion: result.promotion || 'q',
      });

      if (!botMoveObj) {
        setIsBotThinking(false);
        return;
      }

      // Play Sound
      if (chess.inCheck()) playSound('check');
      else if (botMoveObj.san.includes('O-O')) playSound('castle');
      else if (botMoveObj.captured) playSound('capture');
      else playSound('move');

      const newFen = chess.fen();
      setFen(newFen);

      // Perform Stockfish Depth 7 Analysis on Botvinnik's move
      setIsSfAnalyzing(true);
      const postHistory = chess.history({ verbose: true });
      const postUciMoves = postHistory.map((m) => m.from + m.to + (m.promotion || ''));

      let depth7Result = {
        whiteRelativeScore: 0,
        evalStr: '0.00',
        bestMoveUci: null,
      };

      if (stockfishRef.current) {
        depth7Result = await stockfishRef.current.analyze(postUciMoves, chess.turn());
      }

      setLiveScore(depth7Result.whiteRelativeScore);
      setLiveEvalStr(depth7Result.evalStr);

      // Convert best move UCI to SAN if possible
      let bestMoveSan = depth7Result.bestMoveUci;
      try {
        const temp = new Chess(newFen);
        if (depth7Result.bestMoveUci) {
          const m = temp.move({
            from: depth7Result.bestMoveUci.slice(0, 2),
            to: depth7Result.bestMoveUci.slice(2, 4),
            promotion: depth7Result.bestMoveUci[4],
          });
          if (m) bestMoveSan = m.san;
        }
      } catch (_) {}
      setDepth7BestMove(bestMoveSan);

      // Botvinnik post score from Botvinnik POV (negated opponent score)
      const postScoreMovingPov = -(depth7Result.sideRelativeScore ?? 0);
      lastScoreMovingPovRef.current = depth7Result.sideRelativeScore ?? 0;

      const classification = stockfishRef.current?.classifyMove({
        preScoreMovingPov,
        postScoreMovingPov,
        isBookMove: result.isBook,
        isEngineBest: result.uci === depth7Result.bestMoveUci,
        san: botMoveObj.san,
        isBotvinnik: true,
        bookGames: result.bookGames,
        evalStr: depth7Result.evalStr,
        bestMoveSan,
      }) || { id: result.isBook ? 'book' : 'good', label: result.isBook ? 'Book Move' : 'Good', symbol: '', commentary: `GM Botvinnik plays ${botMoveObj.san}.` };

      setLatestCommentary(classification.commentary);

      setMoves((prev) => {
        const updated = [
          ...prev,
          {
            ply: prev.length + 1,
            san: botMoveObj.san,
            uci: result.uci,
            from: result.from,
            to: result.to,
            color: botMoveObj.color,
            fen: newFen,
            evalStr: depth7Result.evalStr,
            whiteScore: depth7Result.whiteRelativeScore,
            classification,
            bestMoveSan,
            isBook: result.isBook,
            bookGames: result.bookGames,
          },
        ];
        setCurrentIdx(updated.length - 1);
        return updated;
      });

      checkGameOver();
    } catch (err) {
      console.error('[PlayBotvinnik] Bot move error:', err);
    } finally {
      setIsBotThinking(false);
      setIsSfAnalyzing(false);
    }
  }, [chess, checkGameOver, playSound]);

  // Handle Player's Move
  const handlePlayerMove = useCallback(async (from, to, promotion = '') => {
    // If not player's turn or game over, ignore
    if (chess.turn() !== playerSide || gameResult || isBotThinking) return false;

    const preScoreMovingPov = lastScoreMovingPovRef.current;

    let moveObj = null;
    try {
      moveObj = chess.move({ from, to, promotion: promotion || 'q' });
    } catch (e) {
      return false;
    }

    if (!moveObj) return false;

    // Play sound
    if (chess.inCheck()) playSound('check');
    else if (moveObj.san.includes('O-O')) playSound('castle');
    else if (moveObj.captured) playSound('capture');
    else playSound('move');

    const newFen = chess.fen();
    setFen(newFen);

    // Run Stockfish Depth 7 on Player's Move
    setIsSfAnalyzing(true);
    const history = chess.history({ verbose: true });
    const uciMoves = history.map((m) => m.from + m.to + (m.promotion || ''));

    let depth7Result = {
      whiteRelativeScore: 0,
      evalStr: '0.00',
      bestMoveUci: null,
    };

    if (stockfishRef.current) {
      depth7Result = await stockfishRef.current.analyze(uciMoves, chess.turn());
    }

    setLiveScore(depth7Result.whiteRelativeScore);
    setLiveEvalStr(depth7Result.evalStr);

    let bestMoveSan = depth7Result.bestMoveUci;
    try {
      const temp = new Chess(newFen);
      if (depth7Result.bestMoveUci) {
        const m = temp.move({
          from: depth7Result.bestMoveUci.slice(0, 2),
          to: depth7Result.bestMoveUci.slice(2, 4),
          promotion: depth7Result.bestMoveUci[4],
        });
        if (m) bestMoveSan = m.san;
      }
    } catch (_) {}
    setDepth7BestMove(bestMoveSan);

    const postScoreMovingPov = -(depth7Result.sideRelativeScore ?? 0);
    lastScoreMovingPovRef.current = depth7Result.sideRelativeScore ?? 0;

    const classification = stockfishRef.current?.classifyMove({
      preScoreMovingPov,
      postScoreMovingPov,
      isBookMove: moves.length < 4, // early moves can be book
      isEngineBest: (from + to + (promotion || '')) === depth7Result.bestMoveUci,
      san: moveObj.san,
      isBotvinnik: false,
      evalStr: depth7Result.evalStr,
      bestMoveSan,
    }) || { id: 'good', label: 'Good', symbol: '', commentary: `You played ${moveObj.san}.` };

    setLatestCommentary(classification.commentary);

    setMoves((prev) => {
      const updated = [
        ...prev,
        {
          ply: prev.length + 1,
          san: moveObj.san,
          uci: from + to + (promotion || ''),
          from,
          to,
          color: moveObj.color,
          fen: newFen,
          evalStr: depth7Result.evalStr,
          whiteScore: depth7Result.whiteRelativeScore,
          classification,
          bestMoveSan,
          isBook: false,
        },
      ];
      setCurrentIdx(updated.length - 1);
      return updated;
    });

    setIsSfAnalyzing(false);

    // If game ended, stop; otherwise Botvinnik replies!
    if (!checkGameOver()) {
      setTimeout(() => {
        triggerBotvinnikMove();
      }, 350);
    }

    return true;
  }, [chess, playerSide, gameResult, isBotThinking, playSound, moves.length, checkGameOver, triggerBotvinnikMove]);

  // Start New Match
  const startNewMatch = useCallback((selectedSide) => {
    let side = selectedSide;
    if (side === 'random') {
      side = Math.random() < 0.5 ? 'w' : 'b';
    }

    chess.reset();
    setPlayerSide(side);
    setFlipped(side === 'b');
    setFen('start');
    setMoves([]);
    setCurrentIdx(-1);
    setGameResult(null);
    setLiveScore(0);
    setLiveEvalStr('0.00');
    setDepth7BestMove(null);
    setBotvinnikBookNotice(null);
    setShowSideModal(false);
    lastScoreMovingPovRef.current = 0;

    if (botvinnikRef.current) {
      botvinnikRef.current.newGame();
    }

    setLatestCommentary(
      side === 'w'
        ? "You are playing as White. Make your first move to challenge GM Mikhail Botvinnik!"
        : "You are playing as Black. GM Mikhail Botvinnik will open the game!"
    );

    // If player is Black, Botvinnik makes the opening move!
    if (side === 'b') {
      setTimeout(() => {
        triggerBotvinnikMove();
      }, 500);
    }
  }, [chess, triggerBotvinnikMove]);

  // Takeback (Undo 2 moves if player's turn, or 1 move)
  const handleTakeback = useCallback(() => {
    if (isBotThinking || moves.length === 0 || gameResult) return;

    let undoCount = 0;
    if (chess.turn() === playerSide) {
      // Undo both Botvinnik's move and player's previous move
      chess.undo();
      undoCount++;
      if (moves.length >= 2) {
        chess.undo();
        undoCount++;
      }
    } else {
      chess.undo();
      undoCount++;
    }

    const remainingMoves = moves.slice(0, moves.length - undoCount);
    const newFen = chess.fen();
    setFen(newFen);
    setMoves(remainingMoves);
    setCurrentIdx(remainingMoves.length - 1);
    setLatestCommentary('Move taken back. It is your turn to play.');
  }, [chess, playerSide, moves, isBotThinking, gameResult]);

  // Resign
  const handleResign = useCallback(() => {
    if (gameResult) return;
    setGameResult({
      title: 'Game Over',
      subtitle: 'You resigned. GM Mikhail Botvinnik wins.',
      winner: 'botvinnik',
    });
  }, [gameResult]);

  // Generate PGN for BoardSight Review
  const generatePgnString = useCallback(() => {
    const pgnHeader = [
      '[Event "BoardSight vs GM Mikhail Botvinnik"]',
      '[Site "BoardSight"]',
      `[Date "${new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]`,
      `[White "${playerSide === 'w' ? 'You' : 'GM Mikhail Botvinnik'}"]`,
      `[Black "${playerSide === 'b' ? 'You' : 'GM Mikhail Botvinnik'}"]`,
      `[Result "${gameResult?.winner === 'player' ? (playerSide === 'w' ? '1-0' : '0-1') : (gameResult?.winner === 'botvinnik' ? (playerSide === 'w' ? '0-1' : '1-0') : '1/2-1/2')}"]`,
      '',
    ].join('\n');

    let pgnBody = '';
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        pgnBody += `${Math.floor(i / 2) + 1}. `;
      }
      pgnBody += `${moves[i].san} `;
    }

    return `${pgnHeader}\n${pgnBody.trim()}`;
  }, [playerSide, gameResult, moves]);

  // Transfer game to BoardSight main analysis
  const handleAnalyzeInBoardSight = useCallback(() => {
    const pgn = generatePgnString();
    if (onAnalyzeGame) {
      onAnalyzeGame(pgn);
    }
  }, [generatePgnString, onAnalyzeGame]);

  // Material & Captured pieces
  const { whiteCaptured, blackCaptured, whiteMaterialAdv, blackMaterialAdv } = useMemo(() => {
    const wCap = { q: 0, r: 0, b: 0, n: 0, p: 0 };
    const bCap = { q: 0, r: 0, b: 0, n: 0, p: 0 };
    const VALS = { q: 9, r: 5, b: 3, n: 3, p: 1 };

    for (let i = 0; i <= currentIdx; i++) {
      const m = moves[i];
      if (!m) continue;
      // Extract capture from SAN
      if (m.san.includes('x')) {
        // piece captured
        const capColor = m.color === 'w' ? 'b' : 'w';
        if (capColor === 'b') wCap.p = (wCap.p || 0) + 1; // approximation
        else bCap.p = (bCap.p || 0) + 1;
      }
    }

    return {
      whiteCaptured: wCap,
      blackCaptured: bCap,
      whiteMaterialAdv: 0,
      blackMaterialAdv: 0,
    };
  }, [moves, currentIdx]);

  // Display Move Badge on board
  const activeDisplayMove = moves[currentIdx] || null;

  // Board square click / drag mechanics
  const isPromotionSquare = useCallback((from, to) => {
    try {
      const piece = chess.get(from);
      return (
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))
      );
    } catch {
      return false;
    }
  }, [chess]);

  const onSquareClick = useCallback((square) => {
    if (chess.turn() !== playerSide || gameResult || isBotThinking) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }
      if (isPromotionSquare(selectedSquare, square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      const ok = handlePlayerMove(selectedSquare, square);
      setSelectedSquare(null);
      setLegalTargets([]);
      if (!ok) {
        // click on another piece of own color
        const piece = chess.get(square);
        if (piece && piece.color === playerSide) {
          setSelectedSquare(square);
          const targets = chess.moves({ square, verbose: true }).map((m) => m.to);
          setLegalTargets(targets);
        }
      }
    } else {
      const piece = chess.get(square);
      if (piece && piece.color === playerSide) {
        setSelectedSquare(square);
        const targets = chess.moves({ square, verbose: true }).map((m) => m.to);
        setLegalTargets(targets);
      }
    }
  }, [chess, playerSide, gameResult, isBotThinking, selectedSquare, isPromotionSquare, handlePlayerMove]);

  const onPieceDrop = useCallback((from, to) => {
    if (chess.turn() !== playerSide || gameResult || isBotThinking) return false;
    if (isPromotionSquare(from, to)) {
      setPendingPromotion({ from, to });
      setSelectedSquare(null);
      setLegalTargets([]);
      return true;
    }
    const ok = handlePlayerMove(from, to);
    setSelectedSquare(null);
    setLegalTargets([]);
    return ok;
  }, [chess, playerSide, gameResult, isBotThinking, isPromotionSquare, handlePlayerMove]);

  const handlePromotionChoose = useCallback((piece) => {
    if (!pendingPromotion) return;
    handlePlayerMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalTargets([]);
  }, [pendingPromotion, handlePlayerMove]);

  // Piece sets & styles
  const theme = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.green;
  const darkSquareStyle = useMemo(() => ({ backgroundColor: theme.dark }), [theme.dark]);
  const lightSquareStyle = useMemo(() => ({ backgroundColor: theme.light }), [theme.light]);

  const customPieces = useMemo(() => {
    const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
    const map = {};
    pieces.forEach((piece) => {
      map[piece] = ({ squareWidth }) => (
        <div
          style={{
            width: squareWidth,
            height: squareWidth,
            backgroundImage: `url(/pieces/${pieceSet}/${piece}.svg)`,
            backgroundSize: '100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      );
    });
    return map;
  }, [pieceSet]);

  const squareStyles = useMemo(() => {
    const styles = {};
    if (activeDisplayMove?.from && activeDisplayMove?.to) {
      styles[activeDisplayMove.from] = { background: 'rgba(246,246,105,0.55)' };
      styles[activeDisplayMove.to] = { background: 'rgba(246,246,105,0.55)' };
    }
    if (selectedSquare) {
      styles[selectedSquare] = { background: 'rgba(74,124,89,0.55)' };
    }
    legalTargets.forEach((sq) => {
      styles[sq] = {
        background: styles[sq]
          ? 'rgba(74,124,89,0.45)'
          : 'radial-gradient(circle, rgba(74,124,89,0.45) 30%, transparent 30%)',
      };
    });
    return styles;
  }, [activeDisplayMove, selectedSquare, legalTargets]);

  const currentMoveForBoard = activeDisplayMove?.fen ? activeDisplayMove.fen : fen;

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-slate-900 flex flex-col text-gray-800 dark:text-slate-100 select-none">
      {/* ── Top Header Navigation ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-gray-700 dark:text-slate-200 transition-colors shadow-sm"
            title="Return to BoardSight Home & Review"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Exit to Review</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <span className="font-black text-base sm:text-lg tracking-tight">Play v/s GM Botvinnik</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Stockfish Depth 7 Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 transition-colors"
            title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
          >
            {soundEnabled ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* New Match Button */}
          <button
            onClick={() => setShowSideModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4a7c59] hover:bg-[#3d6b4a] text-white text-xs sm:text-sm font-bold transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>New Match</span>
          </button>
        </div>
      </header>

      {/* ── Main Gameplay Body ── */}
      <main className="flex-1 p-2 sm:p-4 flex justify-center items-center overflow-y-auto">
        <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-4 lg:gap-6 items-center lg:items-start justify-center">

          {/* ══════════════════════════════════════════
              LEFT: Chessboard + Botvinnik & Player Headers
          ══════════════════════════════════════════ */}
          <div className="w-full max-w-[620px] flex flex-col gap-2 shrink-0">

            {/* Top Player (GM Botvinnik if player is White, or Player if flipped) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl shadow-inner border border-gray-300 dark:border-slate-600">
                    {flipped ? '👤' : '👴'}
                  </div>
                  {isBotThinking && !flipped && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm sm:text-base leading-tight">
                      {flipped ? 'You' : 'GM Mikhail Botvinnik'}
                    </span>
                    {!flipped && (
                      <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        GM 2720
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                    {flipped
                      ? (playerSide === 'w' ? 'Playing as White' : 'Playing as Black')
                      : (isBotThinking ? 'Thinking...' : (botvinnikBookNotice || '6th World Champion'))}
                  </span>
                </div>
              </div>

              {/* Botvinnik Status Pill */}
              {!flipped && (
                <div className="flex items-center gap-1.5">
                  {isBotThinking ? (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 animate-pulse">
                      Calculating...
                    </span>
                  ) : botvinnikBookNotice ? (
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                      📖 Book
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Chessboard Container with Eval Bar */}
            <div className="w-full aspect-square relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-2 flex gap-2">
              {/* Dynamic Live Eval Bar */}
              <div className="h-full w-5 shrink-0">
                <EvalBar score={liveScore} isWhiteTurn={chess.turn() === 'w'} />
              </div>

              {/* Board */}
              <div className="flex-1 relative aspect-square">
                <Chessboard
                  position={currentMoveForBoard}
                  customPieces={customPieces}
                  customDarkSquareStyle={darkSquareStyle}
                  customLightSquareStyle={lightSquareStyle}
                  customSquareStyles={squareStyles}
                  animationDuration={150}
                  boardOrientation={flipped ? 'black' : 'white'}
                  arePiecesDraggable={chess.turn() === playerSide && !gameResult && !isBotThinking}
                  onPieceDrop={onPieceDrop}
                  onSquareClick={onSquareClick}
                />

                {/* Move Annotation Badge on Moved Piece Square */}
                {activeDisplayMove?.to && activeDisplayMove?.classification?.id && !pendingPromotion && (() => {
                  const file = activeDisplayMove.to.charCodeAt(0) - 97;
                  const rank = parseInt(activeDisplayMove.to[1], 10) - 1;
                  const col = flipped ? 7 - file : file;
                  const row = flipped ? rank : 7 - rank;
                  const sp = 100 / 8;
                  return (
                    <div
                      key={activeDisplayMove.to}
                      style={{
                        position: 'absolute',
                        left: `${col * sp + sp * 0.64}%`,
                        top: `${row * sp + sp * 0.02}%`,
                        width: `${sp * 0.36}%`,
                        height: `${sp * 0.36}%`,
                        zIndex: 20,
                        pointerEvents: 'none',
                      }}
                    >
                      <EvalBadge type={activeDisplayMove.classification.id} />
                    </div>
                  );
                })()}

                {/* Inline Promotion Picker */}
                {pendingPromotion && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-xs rounded-xl">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-slate-700 flex flex-col gap-2">
                      <p className="text-xs font-bold text-gray-700 dark:text-slate-300 text-center uppercase tracking-wider">
                        Promote Pawn
                      </p>
                      <div className="flex gap-2">
                        {PROMOTION_PIECES.map((p) => (
                          <button
                            key={p}
                            onClick={() => handlePromotionChoose(p)}
                            className="w-12 h-12 text-3xl rounded-xl hover:bg-[#4a7c59]/20 border border-gray-200 dark:border-slate-700 hover:border-[#4a7c59] transition-all flex items-center justify-center"
                          >
                            {PROMO_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Player (You if player is White, or GM Botvinnik if flipped) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl shadow-inner border border-gray-300 dark:border-slate-600">
                    {flipped ? '👴' : '👤'}
                  </div>
                  {isBotThinking && flipped && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm sm:text-base leading-tight">
                      {flipped ? 'GM Mikhail Botvinnik' : 'You'}
                    </span>
                    {flipped && (
                      <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        GM 2720
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                    {flipped
                      ? (isBotThinking ? 'Thinking...' : (botvinnikBookNotice || '6th World Champion'))
                      : (playerSide === 'w' ? 'Playing as White' : 'Playing as Black')}
                  </span>
                </div>
              </div>

              {/* Turn Indicator */}
              <div className="flex items-center gap-1.5">
                {chess.turn() === playerSide && !gameResult && (
                  <span className="text-xs font-black text-[#4a7c59] bg-[#4a7c59]/10 px-2.5 py-1 rounded-lg border border-[#4a7c59]/30 animate-pulse">
                    Your Turn
                  </span>
                )}
              </div>
            </div>

            {/* In-game action bar */}
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                onClick={() => setFlipped(!flipped)}
                className="flex-1 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                🔄 Flip Board
              </button>
              <button
                onClick={handleTakeback}
                disabled={isBotThinking || moves.length === 0 || !!gameResult}
                className="flex-1 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                ↩️ Takeback
              </button>
              <button
                onClick={handleResign}
                disabled={!!gameResult}
                className="flex-1 py-2 text-xs font-bold rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 disabled:opacity-40 transition-colors shadow-sm"
              >
                🏳️ Resign
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              RIGHT: Live Stockfish Depth 7 Analysis + Commentary + Moves
          ══════════════════════════════════════════ */}
          <div className="w-full lg:flex-1 max-w-[550px] flex flex-col gap-3">

            {/* 1. Live Depth 7 Analysis Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span className="font-black text-sm uppercase tracking-wider text-gray-700 dark:text-slate-200">
                    Stockfish 19 Live Analysis
                  </span>
                </div>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Depth 7
                </span>
              </div>

              {/* Score & Best Move Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-slate-900/70 rounded-xl p-3 border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Position Eval</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black tabular-nums tracking-tight text-gray-900 dark:text-slate-100">
                      {liveEvalStr}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {parseFloat(liveEvalStr) > 0 ? '(White)' : parseFloat(liveEvalStr) < 0 ? '(Black)' : '(Even)'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900/70 rounded-xl p-3 border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Best Continuation</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                    {depth7BestMove ? depth7BestMove : 'Calculating...'}
                  </span>
                </div>
              </div>

              {/* Latest Move Classification Pill */}
              {activeDisplayMove && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-500">Last Move:</span>
                  <span className="font-black text-sm">{activeDisplayMove.san}</span>
                  {activeDisplayMove.classification && (
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs ${
                        ['blunder', 'mistake'].includes(activeDisplayMove.classification.id)
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200'
                          : activeDisplayMove.classification.id === 'inaccuracy'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200'
                          : activeDisplayMove.classification.id === 'book'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                      }`}
                    >
                      <EvalBadge type={activeDisplayMove.classification.id} />
                      <span>{activeDisplayMove.classification.label}</span>
                      {activeDisplayMove.classification.symbol && (
                        <span>{activeDisplayMove.classification.symbol}</span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Coach / Depth 7 Commentary Box */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-200 dark:border-slate-700 text-xs sm:text-[13px] leading-relaxed text-gray-700 dark:text-slate-300 flex items-start gap-2.5">
                <span className="text-lg shrink-0 mt-0.5">💬</span>
                <p className="flex-1 font-medium">{latestCommentary}</p>
              </div>
            </div>

            {/* 2. Move History List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col h-[260px]">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-2 mb-2 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Move History ({moves.length} moves)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentIdx(-1)}
                    disabled={currentIdx === -1}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    title="Start of game"
                  >
                    ⏮️
                  </button>
                  <button
                    onClick={() => setCurrentIdx(Math.max(-1, currentIdx - 1))}
                    disabled={currentIdx === -1}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    title="Previous move"
                  >
                    ◀️
                  </button>
                  <button
                    onClick={() => setCurrentIdx(Math.min(moves.length - 1, currentIdx + 1))}
                    disabled={currentIdx === moves.length - 1}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    title="Next move"
                  >
                    ▶️
                  </button>
                  <button
                    onClick={() => setCurrentIdx(moves.length - 1)}
                    disabled={currentIdx === moves.length - 1}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
                    title="Current move"
                  >
                    ⏭️
                  </button>
                </div>
              </div>

              {/* Scrollable Move Table */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {moves.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                    Game will record moves here...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, movePairIdx) => {
                      const whiteMove = moves[movePairIdx * 2];
                      const blackMove = moves[movePairIdx * 2 + 1];
                      const whiteActive = currentIdx === movePairIdx * 2;
                      const blackActive = currentIdx === movePairIdx * 2 + 1;

                      return (
                        <React.Fragment key={movePairIdx}>
                          {/* White Move */}
                          <div
                            onClick={() => setCurrentIdx(movePairIdx * 2)}
                            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                              whiteActive
                                ? 'bg-amber-100 dark:bg-amber-900/40 font-black'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 font-medium'
                            }`}
                          >
                            <span className="text-gray-400 w-6">{movePairIdx + 1}.</span>
                            <span className="font-bold">{whiteMove?.san}</span>
                            {whiteMove?.classification && (
                              <span className="text-[10px] text-gray-400 font-bold ml-1">
                                {whiteMove.classification.symbol || '✓'}
                              </span>
                            )}
                          </div>

                          {/* Black Move */}
                          <div
                            onClick={() => blackMove && setCurrentIdx(movePairIdx * 2 + 1)}
                            className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                              blackMove ? 'cursor-pointer' : ''
                            } ${
                              blackActive
                                ? 'bg-amber-100 dark:bg-amber-900/40 font-black'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 font-medium'
                            }`}
                          >
                            <span className="font-bold">{blackMove ? blackMove.san : ''}</span>
                            {blackMove?.classification && (
                              <span className="text-[10px] text-gray-400 font-bold ml-1">
                                {blackMove.classification.symbol || '✓'}
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Game Completion & Review in BoardSight */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col gap-2">
              <button
                onClick={handleAnalyzeInBoardSight}
                disabled={moves.length === 0}
                className="w-full bg-[#4a7c59] hover:bg-[#3d6b4a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Review Game in BoardSight</span>
              </button>

              <button
                onClick={() => {
                  const pgn = generatePgnString();
                  navigator.clipboard.writeText(pgn);
                  alert('PGN copied to clipboard!');
                }}
                disabled={moves.length === 0}
                className="w-full py-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                📋 Copy PGN
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Choose Side Modal (New Match Dialog) ── */}
      {showSideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-800 p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Botvinnik Profile */}
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-slate-800 border-2 border-amber-300 dark:border-slate-700 flex items-center justify-center text-3xl shadow-sm shrink-0">
                👴
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Engine Challenge
                </span>
                <h2 className="text-xl font-black text-gray-900 dark:text-slate-100 leading-tight">
                  GM Mikhail Botvinnik
                </h2>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Trained on 919 Games & 32,617 Positions
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-gray-600 dark:text-slate-300">
              Mikhail Botvinnik was the 6th World Chess Champion and founder of the Soviet Chess School. Test your skills against his methodical, iron positional style with live Stockfish depth 7 annotations!
            </p>

            {/* Choose Side Buttons */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">Choose Your Side</span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => startNewMatch('w')}
                  className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-[#4a7c59] hover:bg-[#4a7c59]/5 transition-all shadow-sm group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">♔</span>
                  <span className="text-xs font-black text-gray-800 dark:text-slate-200">White</span>
                  <span className="text-[10px] text-gray-400 leading-none">Move 1st</span>
                </button>

                <button
                  onClick={() => startNewMatch('b')}
                  className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-[#4a7c59] hover:bg-[#4a7c59]/5 transition-all shadow-sm group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">♚</span>
                  <span className="text-xs font-black text-gray-800 dark:text-slate-200">Black</span>
                  <span className="text-[10px] text-gray-400 leading-none">Botvinnik 1st</span>
                </button>

                <button
                  onClick={() => startNewMatch('random')}
                  className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-[#4a7c59] hover:bg-[#4a7c59]/5 transition-all shadow-sm group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">🎲</span>
                  <span className="text-xs font-black text-gray-800 dark:text-slate-200">Random</span>
                  <span className="text-[10px] text-gray-400 leading-none">Surprise</span>
                </button>
              </div>
            </div>

            {/* Cancel / Exit */}
            <button
              onClick={() => {
                if (moves.length === 0) {
                  onExit();
                } else {
                  setShowSideModal(false);
                }
              }}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Game Over Announcement Modal ── */}
      {gameResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-slate-800 p-6 flex flex-col items-center text-center gap-4">
            <span className="text-5xl">{gameResult.winner === 'player' ? '🏆' : (gameResult.winner === 'botvinnik' ? '♟️' : '🤝')}</span>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100">{gameResult.title}</h2>
              <p className="text-xs text-gray-600 dark:text-slate-400">{gameResult.subtitle}</p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={handleAnalyzeInBoardSight}
                className="w-full bg-[#4a7c59] hover:bg-[#3d6b4a] text-white font-black py-3 rounded-xl shadow-sm transition-all"
              >
                Analyze Game in BoardSight
              </button>
              <button
                onClick={() => setShowSideModal(true)}
                className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Play Rematch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
