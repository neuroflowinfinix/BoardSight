import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import EvalBar from './EvalBar';
import EvalBadge from './EvalBadge';
import { BotvinnikController } from '../utils/botvinnikController';
import { StockfishDepth7Analyzer } from '../utils/stockfishDepth7';
import { loadOpeningsDatabase } from '../utils/openingsDatabase';
import { generateMoveExplanation } from '../../functions/enginex/moveExplainer.js';

const BOARD_THEMES = {
  green: { dark: '#769656', light: '#eeeed2' },
  wood: { dark: '#b58863', light: '#f0d9b5' },
};

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];
const PROMO_LABELS = { q: '♛', r: '♜', b: '♝', n: '♞' };

const ICON_COLOR = {
  brilliant:  '#1BACA6',
  great:      '#5C8BB0',
  best:       '#96BC4B',
  excellent:  '#96BC4B',
  good:       '#96BC4B',
  inaccuracy: '#F0C45D',
  miss:       '#E8706A',
  mistake:    '#E07832',
  blunder:    '#C93832',
  book:       '#9B59B6',
};

const ARROW_COLORS_RGBA = {
  brilliant:  'rgba(27,172,166,0.85)',
  great:      'rgba(92,139,176,0.85)',
  best:       'rgba(150,188,75,0.85)',
  excellent:  'rgba(150,188,75,0.78)',
  good:       'rgba(150,188,75,0.68)',
  inaccuracy: 'rgba(240,196,93,0.88)',
  miss:       'rgba(232,112,106,0.88)',
  mistake:    'rgba(224,120,50,0.90)',
  blunder:    'rgba(201,56,50,0.90)',
  book:       'rgba(155,89,182,0.78)',
};

function getTacticLabel(tacticType) {
  if (!tacticType) return null;
  return {
    fork: 'Fork',
    pin: 'Pin',
    skewer: 'Skewer',
    discoveredAttack: 'Discovered Attack',
    zwischenzug: 'Zwischenzug',
    xray: 'X-Ray Attack',
    removalOfDefender: 'Remove the Guard',
    backRank: 'Back Rank',
    promotion: 'Promotion',
    promotionThreat: 'Promotion Threat',
    zugzwang: 'Zugzwang',
    prophylaxis: 'Prophylaxis',
    kingActivity: 'King Activity',
    enPassant: 'En Passant',
    firstMove: 'First move',
    lastBookMove: 'Last book move',
    bookMove: 'Book move',
    novelty: 'Novelty',
  }[tacticType] || (typeof tacticType === 'string' ? tacticType.charAt(0).toUpperCase() + tacticType.slice(1) : null);
}

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-black text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const italicParts = part.split(/(\*.*?\*)/g);
    return italicParts.map((iPart, iIndex) => {
      if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
        return (
          <em key={`${index}-${iIndex}`} className="italic opacity-90">
            {iPart.slice(1, -1)}
          </em>
        );
      }
      return iPart;
    });
  });
}

function squareToXY(sq, flipped = false) {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1], 10) - 1;
  const x = flipped ? (7 - file + 0.5) * 100 : (file + 0.5) * 100;
  const y = flipped ? (rank + 0.5) * 100 : (7 - rank + 0.5) * 100;
  return { x, y };
}

function knightCorner(fromSq, toSq) {
  const fc = fromSq.charCodeAt(0) - 97;
  const fr = parseInt(fromSq[1], 10) - 1;
  const tc = toSq.charCodeAt(0) - 97;
  const tr = parseInt(toSq[1], 10) - 1;
  const dc = Math.abs(tc - fc);
  const dr = Math.abs(tr - fr);
  if (dc >= dr) return String.fromCharCode(97 + tc) + (fr + 1);
  return String.fromCharCode(97 + fc) + (tr + 1);
}

function isKnightMove(fromSq, toSq) {
  if (!fromSq || !toSq || fromSq.length < 2 || toSq.length < 2) return false;
  const fileDiff = Math.abs(fromSq.charCodeAt(0) - toSq.charCodeAt(0));
  const rankDiff = Math.abs(parseInt(fromSq[1], 10) - parseInt(toSq[1], 10));
  return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
}

function BoardArrow({ fromSq, toSq, color, flipped = false }) {
  const A = squareToXY(fromSq, flipped);
  const B = squareToXY(toSq, flipped);

  const isKnight = isKnightMove(fromSq, toSq);
  const markerId = `arrow-${fromSq}-${toSq}-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  const strokeW = 800 / 36;
  const l = 800 / 32;

  let pathD = '';

  if (isKnight) {
    const corner = knightCorner(fromSq, toSq);
    const M = squareToXY(corner, flipped);
    const mdx = B.x - M.x;
    const mdy = B.y - M.y;
    const mlen = Math.sqrt(mdx * mdx + mdy * mdy);
    if (mlen > 0) {
      const endX = M.x + (mdx * (mlen - l)) / mlen;
      const endY = M.y + (mdy * (mlen - l)) / mlen;
      pathD = `M ${A.x} ${A.y} L ${M.x} ${M.y} L ${endX} ${endY}`;
    }
  } else {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const endX = A.x + (dx * (len - l)) / len;
      const endY = A.y + (dy * (len - l)) / len;
      pathD = `M ${A.x} ${A.y} L ${endX} ${endY}`;
    }
  }

  if (!pathD) return null;

  return (
    <svg
      viewBox="0 0 800 800"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="2"
          markerHeight="2.5"
          refX="1.25"
          refY="1.25"
          orient="auto"
        >
          <polygon points="0.3 0, 2 1.25, 0.3 2.5" fill={color} />
        </marker>
      </defs>
      <g opacity="0.85">
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          markerEnd={`url(#${markerId})`}
        />
      </g>
    </svg>
  );
}

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

  // Hints state
  const [showHints, setShowHints] = useState(false);
  const [coachExpl, setCoachExpl] = useState({
    text: 'Welcome! Choose your side to challenge 6th World Champion Mikhail Botvinnik. I will analyze your moves live with Stockfish Depth 7.',
    tacticType: null,
    classificationId: 'book',
    label: 'GM Mikhail Botvinnik',
    badgeType: 'book',
  });

  // Engine live analysis state
  const [liveScore, setLiveScore] = useState(0);
  const [liveEvalStr, setLiveEvalStr] = useState('0.00');
  const [depth7BestMove, setDepth7BestMove] = useState(null);
  const [botvinnikBookNotice, setBotvinnikBookNotice] = useState(null);

  // Board UI state
  const [flipped, setFlipped] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // Engine refs
  const botvinnikRef = useRef(null);
  const stockfishRef = useRef(null);
  const openingsDbRef = useRef(null);

  // Tracks the evaluation of the board position BEFORE the next move is made:
  // score: from the perspective of the player to move (in cp)
  // bestMoveUci: Stockfish 19's top recommended move in this position
  // bestMoveSan: SAN representation of top move
  // whiteRelativeScore: eval for EvalBar (+ = White, - = Black)
  // evalStr: display string e.g. "+0.25", "-M1"
  // topMoves: MultiPV 2 top moves from Stockfish depth 7
  // fen: FEN before the move
  const currentPositionEvalRef = useRef({
    score: 0,
    bestMoveUci: null,
    bestMoveSan: null,
    whiteRelativeScore: 0,
    evalStr: '0.00',
    topMoves: [],
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  });

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
    loadOpeningsDatabase()
      .then((db) => {
        openingsDbRef.current = db;
      })
      .catch((err) => {
        console.warn('[PlayBotvinnik] Openings DB load warning:', err);
      });

    botvinnikRef.current = new BotvinnikController((ready, err) => {
      if (ready) {
        console.log('[PlayBotvinnik] GM Botvinnik Engine v1.0 ready');
      } else {
        console.warn('[PlayBotvinnik] GM Botvinnik initialization warning:', err);
      }
    });

    stockfishRef.current = new StockfishDepth7Analyzer(async (ready) => {
      if (ready) {
        console.log('[PlayBotvinnik] Stockfish 19 Depth 7 Analyzer ready');
        // Initial evaluation of standard start position
        try {
          const initEval = await stockfishRef.current.analyze({
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            turn: 'w',
          });

          let bestSan = initEval.bestMoveUci;
          try {
            const temp = new Chess();
            if (initEval.bestMoveUci) {
              const m = temp.move({
                from: initEval.bestMoveUci.slice(0, 2),
                to: initEval.bestMoveUci.slice(2, 4),
                promotion: initEval.bestMoveUci[4],
              });
              if (m) bestSan = m.san;
            }
          } catch (_) {}

          currentPositionEvalRef.current = {
            score: initEval.scoreCp,
            bestMoveUci: initEval.bestMoveUci,
            bestMoveSan: bestSan,
            whiteRelativeScore: initEval.whiteRelativeScore,
            evalStr: initEval.evalStr,
            topMoves: initEval.topMoves || [],
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          };
          setLiveScore(initEval.whiteRelativeScore);
          setLiveEvalStr(initEval.evalStr);
          setDepth7BestMove(bestSan);
        } catch (_) {}
      }
    });

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
    setBotvinnikBookNotice('Thinking...');

    const history = chess.history({ verbose: true });
    const uciMoves = history.map((m) => m.from + m.to + (m.promotion || ''));

    try {
      // 1. Botvinnik Engine calculates move based on historical Botvinnik games + positional search
      const result = await botvinnikRef.current.getMove(uciMoves, 5, 800);

      if (!result.uci) {
        setIsBotThinking(false);
        return;
      }

      if (result.isBook) {
        setBotvinnikBookNotice(
          result.bookGames
            ? `Book move (${result.bookGames} Botvinnik games)`
            : 'Book move from Botvinnik Repertoire'
        );
      } else {
        setBotvinnikBookNotice(null);
      }

      // 2. Pre-move evaluation from Botvinnik's perspective
      const mover = chess.turn();
      const preScore = currentPositionEvalRef.current.score;
      const engineBestMove = currentPositionEvalRef.current.bestMoveUci;
      const engineBestSan = currentPositionEvalRef.current.bestMoveSan;
      const playedUci = result.uci;

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

      // 3. Stockfish 19 evaluates position AFTER Botvinnik's move at Depth 7:
      setIsSfAnalyzing(true);
      let postPositionEval = {
        scoreCp: 0,
        mateIn: null,
        whiteRelativeScore: 0,
        evalStr: '0.00',
        bestMoveUci: null,
      };

      if (stockfishRef.current) {
        postPositionEval = await stockfishRef.current.analyze({
          fen: newFen,
          turn: chess.turn(), // in newFen, turn belongs to player
        });
      }

      // Convert player's best continuation to SAN
      let nextBestMoveSan = postPositionEval.bestMoveUci;
      try {
        const temp = new Chess(newFen);
        if (postPositionEval.bestMoveUci) {
          const m = temp.move({
            from: postPositionEval.bestMoveUci.slice(0, 2),
            to: postPositionEval.bestMoveUci.slice(2, 4),
            promotion: postPositionEval.bestMoveUci[4],
          });
          if (m) nextBestMoveSan = m.san;
        }
      } catch (_) {}

      // In newFen, postPositionEval.scoreCp is from opponent's (player's) POV.
      // So from Botvinnik's POV:
      const postScore = -postPositionEval.scoreCp;

      // 4. Classify Botvinnik's move strictly using BoardSight's original moveClassifier
      const classification = stockfishRef.current?.classify({
        preScore,
        postScore,
        engineBestMove,
        playerMoveUCI: playedUci,
        isBookMove: result.isBook,
        san: botMoveObj.san,
        isBotvinnik: true,
        bookGames: result.bookGames,
        evalStr: postPositionEval.evalStr,
        bestMoveSan: engineBestSan,
      }) || { id: result.isBook ? 'book' : 'good', label: result.isBook ? 'Book Move' : 'Good', symbol: '', commentary: `GM Botvinnik plays ${botMoveObj.san}.` };

      // 5. Update position evaluation for Player's upcoming move
      currentPositionEvalRef.current = {
        score: postPositionEval.scoreCp,
        bestMoveUci: postPositionEval.bestMoveUci,
        bestMoveSan: nextBestMoveSan,
        whiteRelativeScore: postPositionEval.whiteRelativeScore,
        evalStr: postPositionEval.evalStr,
        topMoves: postPositionEval.topMoves || [],
        fen: newFen,
      };

      setLiveScore(postPositionEval.whiteRelativeScore);
      setLiveEvalStr(postPositionEval.evalStr);
      setDepth7BestMove(nextBestMoveSan);

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
            evalStr: postPositionEval.evalStr,
            whiteScore: postPositionEval.whiteRelativeScore,
            classification,
            bestMoveSan: engineBestSan,
            engineBestMove,
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
    if (chess.turn() !== playerSide || gameResult || isBotThinking) return false;

    // 1. Capture the moving side's evaluation BEFORE the move is executed:
    const mover = chess.turn();
    const preScore = currentPositionEvalRef.current.score;
    const engineBestMove = currentPositionEvalRef.current.bestMoveUci;
    const engineBestSan = currentPositionEvalRef.current.bestMoveSan;
    const preFen = currentPositionEvalRef.current.fen || chess.fen();
    const playedUci = from + to + (promotion ? promotion.toLowerCase() : '');

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

    // Check if player's move is in the master openings database
    let isBook = false;
    if (openingsDbRef.current) {
      const currentSanHistory = chess.history();
      const match = openingsDbRef.current.lookupByMoves(currentSanHistory);
      if (match && currentSanHistory.length <= match.bookDepth) {
        isBook = true;
      }
    }

    // 2. Evaluate position AFTER the move with Stockfish 19 at Depth 7:
    setIsSfAnalyzing(true);
    let postPositionEval = {
      scoreCp: 0,
      mateIn: null,
      whiteRelativeScore: 0,
      evalStr: '0.00',
      bestMoveUci: null,
      topMoves: [],
    };

    if (stockfishRef.current) {
      postPositionEval = await stockfishRef.current.analyze({
        fen: newFen,
        turn: chess.turn(), // in newFen, turn belongs to opponent
      });
    }

    // Convert opponent's best response to SAN
    let nextBestMoveSan = postPositionEval.bestMoveUci;
    try {
      const temp = new Chess(newFen);
      if (postPositionEval.bestMoveUci) {
        const m = temp.move({
          from: postPositionEval.bestMoveUci.slice(0, 2),
          to: postPositionEval.bestMoveUci.slice(2, 4),
          promotion: postPositionEval.bestMoveUci[4],
        });
        if (m) nextBestMoveSan = m.san;
      }
    } catch (_) {}

    // In newFen, postPositionEval.scoreCp is from opponent's POV.
    // So from the moving player's POV:
    const postScore = -postPositionEval.scoreCp;

    // 3. Classify strictly using BoardSight's original moveClassifier:
    const classification = stockfishRef.current?.classify({
      preScore,
      postScore,
      engineBestMove,
      playerMoveUCI: playedUci,
      isBookMove: isBook,
      san: moveObj.san,
      isBotvinnik: false,
      evalStr: postPositionEval.evalStr,
      bestMoveSan: engineBestSan, // What Stockfish recommended instead of the played move
    }) || { id: 'good', label: 'Good', symbol: '', commentary: `You played ${moveObj.san}.` };

    // Generate fresh authentic Game Review Coach Explanation for User's Move
    let freshCoachExpl = null;
    try {
      freshCoachExpl = generateMoveExplanation({
        move: {
          san: moveObj.san,
          from,
          to,
          color: playerSide,
          piece: moveObj.piece,
          captured: moveObj.captured,
        },
        preFen,
        fen: newFen,
        classification,
        bestMoveSan: engineBestSan,
        loss: classification.winDrop,
        preScore,
        postScore,
        whiteScore: postPositionEval.whiteRelativeScore,
        isBookMove: isBook,
        moveNumber: Math.ceil(chess.history().length / 2),
        engineTopMoves: [
          {
            uci: postPositionEval.bestMoveUci,
            san: nextBestMoveSan,
            scoreCp: postPositionEval.scoreCp,
            pv: postPositionEval.pv || [],
          },
        ],
        playerMoveUCI: playedUci,
        perspectiveColor: playerSide,
        history: chess.history({ verbose: true }),
      });
    } catch (err) {
      console.warn('[PlayBotvinnik] Coach explanation generation error:', err);
    }

    const userCoachObj = {
      text: freshCoachExpl?.text || classification.commentary,
      tacticType: freshCoachExpl?.tacticType || null,
      classificationId: classification.id,
      label: classification.label,
      badgeType: classification.id,
    };
    setCoachExpl(userCoachObj);

    // 4. Update current position eval for opponent's upcoming move:
    currentPositionEvalRef.current = {
      score: postPositionEval.scoreCp,
      bestMoveUci: postPositionEval.bestMoveUci,
      bestMoveSan: nextBestMoveSan,
      whiteRelativeScore: postPositionEval.whiteRelativeScore,
      evalStr: postPositionEval.evalStr,
      topMoves: postPositionEval.topMoves || [],
      fen: newFen,
    };

    setLiveScore(postPositionEval.whiteRelativeScore);
    setLiveEvalStr(postPositionEval.evalStr);
    setDepth7BestMove(nextBestMoveSan);

    setMoves((prev) => {
      const updated = [
        ...prev,
        {
          ply: prev.length + 1,
          san: moveObj.san,
          uci: playedUci,
          from,
          to,
          color: moveObj.color,
          fen: newFen,
          evalStr: postPositionEval.evalStr,
          whiteScore: postPositionEval.whiteRelativeScore,
          classification,
          bestMoveSan: engineBestSan,
          engineBestMove,
          isBook,
          coachExplanation: userCoachObj,
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
  }, [chess, playerSide, gameResult, isBotThinking, playSound, checkGameOver, triggerBotvinnikMove]);

  // Start New Match
  const startNewMatch = useCallback(async (selectedSide) => {
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

    if (botvinnikRef.current) {
      botvinnikRef.current.newGame();
    }

    // Evaluate initial starting position with Stockfish 19 Depth 7
    if (stockfishRef.current) {
      try {
        const initEval = await stockfishRef.current.analyze({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          turn: 'w',
        });
        let bestSan = initEval.bestMoveUci;
        try {
          const temp = new Chess();
          if (initEval.bestMoveUci) {
            const m = temp.move({
              from: initEval.bestMoveUci.slice(0, 2),
              to: initEval.bestMoveUci.slice(2, 4),
              promotion: initEval.bestMoveUci[4],
            });
            if (m) bestSan = m.san;
          }
        } catch (_) {}

        currentPositionEvalRef.current = {
          score: initEval.scoreCp,
          bestMoveUci: initEval.bestMoveUci,
          bestMoveSan: bestSan,
          whiteRelativeScore: initEval.whiteRelativeScore,
          evalStr: initEval.evalStr,
          topMoves: initEval.topMoves || [],
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        };
        setLiveScore(initEval.whiteRelativeScore);
        setLiveEvalStr(initEval.evalStr);
        setDepth7BestMove(bestSan);
      } catch (_) {}
    }

    setCoachExpl({
      text:
        side === 'w'
          ? "You are playing as White. Make your first move to challenge 6th World Champion Mikhail Botvinnik!"
          : "You are playing as Black. GM Mikhail Botvinnik will open the game. Calculate sharply!",
      tacticType: null,
      classificationId: 'book',
      label: 'GM Mikhail Botvinnik',
      badgeType: 'book',
    });

    // If player is Black, Botvinnik makes the opening move!
    if (side === 'b') {
      setTimeout(() => {
        triggerBotvinnikMove();
      }, 500);
    }
  }, [chess, triggerBotvinnikMove]);

  // Takeback (Undo 2 moves if player's turn, or 1 move)
  const handleTakeback = useCallback(async () => {
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

    // Re-evaluate the restored position with Stockfish 19 Depth 7:
    if (stockfishRef.current) {
      try {
        const restoredEval = await stockfishRef.current.analyze({
          fen: newFen,
          turn: chess.turn(),
        });

        let bestSan = restoredEval.bestMoveUci;
        try {
          const temp = new Chess(newFen);
          if (restoredEval.bestMoveUci) {
            const m = temp.move({
              from: restoredEval.bestMoveUci.slice(0, 2),
              to: restoredEval.bestMoveUci.slice(2, 4),
              promotion: restoredEval.bestMoveUci[4],
            });
            if (m) bestSan = m.san;
          }
        } catch (_) {}

        currentPositionEvalRef.current = {
          score: restoredEval.scoreCp,
          bestMoveUci: restoredEval.bestMoveUci,
          bestMoveSan: bestSan,
          whiteRelativeScore: restoredEval.whiteRelativeScore,
          evalStr: restoredEval.evalStr,
          topMoves: restoredEval.topMoves || [],
          fen: newFen,
        };

        setLiveScore(restoredEval.whiteRelativeScore);
        setLiveEvalStr(restoredEval.evalStr);
        setDepth7BestMove(bestSan);
      } catch (_) {}
    }

    setCoachExpl({
      text: 'Move taken back. It is your turn to play.',
      tacticType: null,
      classificationId: 'book',
      label: 'Coach Botvinnik',
      badgeType: 'book',
    });
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

  // Active Coach Explanation (focused strictly on player's moves, no explanations generated for Botvinnik moves)
  const activeCoachExpl = useMemo(() => {
    if (currentIdx === -1) {
      return {
        text:
          playerSide === 'w'
            ? 'You are playing as White. Make your first move to challenge 6th World Champion Mikhail Botvinnik!'
            : 'You are playing as Black. GM Mikhail Botvinnik will open the game. Calculate sharply!',
        tacticType: null,
        classificationId: 'book',
        label: 'GM Mikhail Botvinnik',
        badgeType: 'book',
      };
    }

    const activeMove = moves[currentIdx];
    if (!activeMove) return coachExpl;

    // If this move was made by player and has a coach explanation:
    if (activeMove.color === playerSide && activeMove.coachExplanation) {
      return activeMove.coachExplanation;
    }

    // If this move was made by Botvinnik, show the player's preceding move explanation
    if (currentIdx > 0 && moves[currentIdx - 1]?.color === playerSide && moves[currentIdx - 1]?.coachExplanation) {
      return moves[currentIdx - 1].coachExplanation;
    }

    return coachExpl;
  }, [currentIdx, moves, playerSide, coachExpl]);

  // Hint Arrows (Live Depth 7 MultiPV 2 in Orange)
  const hintArrows = useMemo(() => {
    if (!showHints) return [];
    const currentTop = currentPositionEvalRef.current?.topMoves || [];
    const ORANGE_COLORS = [
      'rgba(224, 120, 50, 0.95)', // Line 1: primary orange
      'rgba(240, 160, 75, 0.85)', // Line 2: secondary lighter orange
    ];
    const result = [];
    for (let i = 0; i < Math.min(currentTop.length, 2); i++) {
      const moveInfo = currentTop[i];
      if (!moveInfo?.bestMoveUci || moveInfo.bestMoveUci === '(none)') continue;
      const from = moveInfo.bestMoveUci.slice(0, 2);
      const to = moveInfo.bestMoveUci.slice(2, 4);
      const isKnight = isKnightMove(from, to);
      result.push({
        from,
        to,
        colorRgba: ORANGE_COLORS[i],
        colorHex: i === 0 ? '#E07832' : '#F0A04B',
        isKnight,
        rank: i + 1,
      });
    }
    return result;
  }, [showHints, fen, moves.length]);

  const customArrows = useMemo(() => {
    // 1. If hints are ON, draw live MultiPV 2 best move straight arrows in orange
    if (showHints && hintArrows.length > 0) {
      const arrows = [];
      hintArrows.forEach((h) => {
        if (!h.isKnight) {
          arrows.push([h.from, h.to, h.colorRgba]);
        }
      });
      return arrows;
    }

    // 2. Otherwise (hints OFF), Game Review move arrows
    if (!activeDisplayMove) return [];
    const cid = activeDisplayMove.classification?.id;
    const badMoveClasses = ['inaccuracy', 'mistake', 'miss', 'blunder'];

    // If a blunder / mistake / miss / inaccuracy was played, show arrow for the engine's suggested best move
    if (badMoveClasses.includes(cid) && activeDisplayMove.engineBestMove) {
      const eFrom = activeDisplayMove.engineBestMove.slice(0, 2);
      const eTo = activeDisplayMove.engineBestMove.slice(2, 4);
      if (!isKnightMove(eFrom, eTo) && (eFrom !== activeDisplayMove.from || eTo !== activeDisplayMove.to)) {
        const rgba = ARROW_COLORS_RGBA[cid] || 'rgba(201,56,50,0.85)';
        return [[eFrom, eTo, rgba]];
      }
    }

    // If brilliant / great / best / excellent move, show arrow for the move played in its classification color
    if (['brilliant', 'great', 'best', 'excellent'].includes(cid) && activeDisplayMove.from && activeDisplayMove.to) {
      if (!isKnightMove(activeDisplayMove.from, activeDisplayMove.to)) {
        const rgba = ARROW_COLORS_RGBA[cid] || 'rgba(150,188,75,0.85)';
        return [[activeDisplayMove.from, activeDisplayMove.to, rgba]];
      }
    }

    return [];
  }, [showHints, hintArrows, activeDisplayMove]);

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
                  customArrows={customArrows}
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

                {/* Hint Knight Arrows (when hints ON: vivid orange L-shaped arrows for Depth 7 MultiPV 2) */}
                {showHints && !pendingPromotion && hintArrows.filter((h) => h.isKnight).map((h, idx) => (
                  <BoardArrow
                    key={`hint-knight-${h.from}-${h.to}-${idx}`}
                    fromSq={h.from}
                    toSq={h.to}
                    color={h.colorHex}
                    flipped={flipped}
                  />
                ))}

                {/* Game Review Knight Arrow (when hints OFF: L-shaped arrow for blunders/mistakes pointing to best move, or good moves) */}
                {!showHints && activeDisplayMove && !pendingPromotion && (() => {
                  const cid = activeDisplayMove.classification?.id;
                  const badMoveClasses = ['inaccuracy', 'mistake', 'miss', 'blunder'];
                  if (badMoveClasses.includes(cid) && activeDisplayMove.engineBestMove) {
                    const eFrom = activeDisplayMove.engineBestMove.slice(0, 2);
                    const eTo = activeDisplayMove.engineBestMove.slice(2, 4);
                    if (isKnightMove(eFrom, eTo) && (eFrom !== activeDisplayMove.from || eTo !== activeDisplayMove.to)) {
                      const hex = ICON_COLOR[cid] || '#c93832';
                      return <BoardArrow key={`rev-knight-${eFrom}-${eTo}`} fromSq={eFrom} toSq={eTo} color={hex} flipped={flipped} />;
                    }
                  }
                  if (['brilliant', 'great', 'best', 'excellent'].includes(cid) && activeDisplayMove.from && activeDisplayMove.to) {
                    if (isKnightMove(activeDisplayMove.from, activeDisplayMove.to)) {
                      const hex = ICON_COLOR[cid] || '#96bc4b';
                      return <BoardArrow key={`rev-knight-${activeDisplayMove.from}-${activeDisplayMove.to}`} fromSq={activeDisplayMove.from} toSq={activeDisplayMove.to} color={hex} flipped={flipped} />;
                    }
                  }
                  return null;
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
                onClick={() => setShowHints(!showHints)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                  showHints
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/20 font-black'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200'
                }`}
                title="Toggle live Stockfish Depth 7 MultiPV 2 hint arrows"
              >
                <span>💡</span>
                <span>Hints {showHints ? 'ON' : 'OFF'}</span>
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
              RIGHT: Live Stockfish Depth 7 Coach + Moves + Review
          ══════════════════════════════════════════ */}
          <div className="w-full lg:flex-1 max-w-[550px] flex flex-col gap-3">

            {/* 1. Coach Bar: Authentic Game Review Coach Bar with Botvinnik Avatar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎓</span>
                  <span className="font-black text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200">
                    Grandmaster Analysis &amp; Coach
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Stockfish 19 Depth 7
                  </span>
                </div>
              </div>

              {/* Coach Bar Container */}
              <div className="relative flex-shrink-0 py-1 flex items-center gap-3">
                {/* Avatar Container - Left Side */}
                <div className="relative flex-shrink-0 w-[90px] h-[90px] sm:w-[105px] sm:h-[105px] flex items-center justify-center">
                  {/* Persistent Vapor Glow Behind Coach */}
                  <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
                    <div className="w-[85px] h-[85px] sm:w-[95px] sm:h-[95px] bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute w-[50px] h-[50px] bg-gradient-to-br from-amber-400/20 to-emerald-600/20 rounded-full blur-lg animate-bounce" style={{ animationDuration: '3s' }}></div>
                  </div>

                  {/* Coach Avatar (Botvinnik Portrait) */}
                  <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg border-2 border-white dark:border-slate-700 ring-2 ring-amber-500/30 bg-slate-200 dark:bg-slate-700">
                    <img
                      src="/botvinnik.jpg"
                      alt="GM Mikhail Botvinnik"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.target.src = '/botvinnik/botvinnik.jpg';
                      }}
                    />
                  </div>
                </div>

                {/* Speech Bubble / Content */}
                <div className="relative flex-1 bg-[#e9ecef] dark:bg-slate-700 rounded-2xl p-3.5 shadow-sm min-h-[85px] flex flex-col justify-center ml-2 border border-gray-200/60 dark:border-slate-600/60">
                  {/* Curved SVG Tail — concave curves matching reference */}
                  <svg className="absolute -left-[12px] top-1/2 -translate-y-1/2 w-[13px] h-[22px] text-[#e9ecef] dark:text-slate-700" viewBox="0 0 13 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 0 C13 8 1 7 0 11 C1 15 13 14 13 22" fill="currentColor" />
                  </svg>

                  <div className="flex items-start gap-2.5 w-full relative z-10">
                    {/* Left: badge */}
                    {activeCoachExpl?.badgeType && (
                      <div className="w-[18px] h-[18px] shrink-0 mt-0.5">
                        <EvalBadge type={activeCoachExpl.badgeType} />
                      </div>
                    )}

                    {/* Right: tactic label + explanation text */}
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      {(activeCoachExpl?.tacticType || activeCoachExpl?.label) && (
                        <span
                          className="text-[11px] font-black uppercase tracking-wider mb-0.5"
                          style={{ color: ICON_COLOR[activeCoachExpl?.badgeType] || '#4a7c59' }}
                        >
                          {getTacticLabel(activeCoachExpl?.tacticType) || activeCoachExpl?.label}
                        </span>
                      )}
                      {/* Scrollable explanation box */}
                      <div className="overflow-y-auto max-h-[140px] pr-2 custom-scrollbar">
                        <p className="text-[13.5px] sm:text-[14px] leading-relaxed font-medium text-gray-800 dark:text-slate-100 whitespace-pre-wrap">
                          {renderFormattedText(activeCoachExpl?.text || 'Make your move to challenge 6th World Champion Mikhail Botvinnik!')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                          <button
                            type="button"
                            onClick={() => setCurrentIdx(movePairIdx * 2)}
                            className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                              whiteActive
                                ? 'bg-[#4a7c59] text-white shadow-sm font-bold'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-700/60 font-medium'
                            }`}
                          >
                            <span className={`text-xs ${whiteActive ? 'text-white/70' : 'text-gray-400'} w-5 shrink-0`}>
                              {movePairIdx + 1}.
                            </span>
                            {whiteMove?.classification?.id ? (
                              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                <EvalBadge type={whiteMove.classification.id} />
                              </div>
                            ) : null}
                            <span
                              className="flex-1 truncate text-xs font-semibold leading-none"
                              style={{ color: whiteActive ? 'white' : (ICON_COLOR[whiteMove?.classification?.id] || 'inherit') }}
                            >
                              {whiteMove?.san}
                            </span>
                          </button>

                          {/* Black Move */}
                          {blackMove ? (
                            <button
                              type="button"
                              onClick={() => setCurrentIdx(movePairIdx * 2 + 1)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                blackActive
                                  ? 'bg-[#4a7c59] text-white shadow-sm font-bold'
                                  : 'hover:bg-gray-100 dark:hover:bg-slate-700/60 font-medium'
                              }`}
                            >
                              <span className={`text-xs ${blackActive ? 'text-white/70' : 'text-gray-400'} w-4 shrink-0`}>
                                ...
                              </span>
                              {blackMove.classification?.id ? (
                                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                                  <EvalBadge type={blackMove.classification.id} />
                                </div>
                              ) : null}
                              <span
                                className="flex-1 truncate text-xs font-semibold leading-none"
                                style={{ color: blackActive ? 'white' : (ICON_COLOR[blackMove.classification?.id] || 'inherit') }}
                              >
                                {blackMove.san}
                              </span>
                            </button>
                          ) : (
                            <div className="w-full" />
                          )}
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
