import React, { useMemo, useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import EvalBar from './EvalBar';
import EvalBadge from './EvalBadge'; 

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
const ARROW_COLORS_HEX = {
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

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];
const PROMO_LABELS = { q: '♛', r: '♜', b: '♝', n: '♞' };

function pieceAtSquare(fen, square) {
  if (!fen || !square || fen === 'start') return '';
  try {
    const chess = new Chess(fen);
    const p = chess.get(square);
    return p ? p.type : '';
  } catch { return ''; }
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

function BoardArrow({ fromSq, toSq, color, flipped = false }) {
  const A  = squareToXY(fromSq, flipped);
  const B  = squareToXY(toSq, flipped);
  
  const fileDiff = Math.abs(fromSq.charCodeAt(0) - toSq.charCodeAt(0));
  const rankDiff = Math.abs(parseInt(fromSq[1], 10) - parseInt(toSq[1], 10));
  const isKnight = (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);

  const markerId = `arrow-${fromSq}-${toSq}-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Match react-chessboard exactly (s = 800)
  const strokeW = 800 / 36; // ~22.22
  const l = 800 / 32; // 25
  
  let pathD = '';

  if (isKnight) {
    const corner = knightCorner(fromSq, toSq);
    const M = squareToXY(corner, flipped);
    const mdx = B.x - M.x;
    const mdy = B.y - M.y;
    const mlen = Math.sqrt(mdx * mdx + mdy * mdy);
    if (mlen > 0) {
      const endX = M.x + mdx * (mlen - l) / mlen;
      const endY = M.y + mdy * (mlen - l) / mlen;
      pathD = `M ${A.x} ${A.y} L ${M.x} ${M.y} L ${endX} ${endY}`;
    }
  } else {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const endX = A.x + dx * (len - l) / len;
      const endY = A.y + dy * (len - l) / len;
      pathD = `M ${A.x} ${A.y} L ${endX} ${endY}`;
    }
  }

  if (!pathD) return null;

  return (
    <svg viewBox="0 0 800 800"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}>
      <defs>
        <marker id={markerId} markerWidth="2" markerHeight="2.5"
          refX="1.25" refY="1.25" orient="auto">
          <polygon points="0.3 0, 2 1.25, 0.3 2.5" fill={color} />
        </marker>
      </defs>
      <g opacity="0.65">
        <path d={pathD}
          fill="none" stroke={color} strokeWidth={strokeW}
          markerEnd={`url(#${markerId})`} />
      </g>
    </svg>
  );
}

/** Small inline promotion picker */
function PromotionModal({ color, onChoose, onCancel }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
      onClick={onCancel}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-3 border border-transparent dark:border-slate-700 flex flex-col gap-2"
        onClick={e => e.stopPropagation()}>
        <p className="text-xs font-bold text-gray-600 dark:text-slate-400 text-center mb-1">Promote to</p>
        <div className="flex gap-2">
          {PROMOTION_PIECES.map(p => (
            <button key={p} onClick={() => onChoose(p)}
              className="w-12 h-12 text-3xl rounded-xl hover:bg-[#4a7c59]/10 dark:hover:bg-[#4a7c59]/20
                border-2 border-gray-200 dark:border-slate-700 hover:border-[#4a7c59] dark:hover:border-[#4a7c59] transition-all flex
                items-center justify-center text-gray-800 dark:text-slate-200">
              {PROMO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const BOARD_THEMES = {
  green: { dark: '#769656', light: '#eeeed2' },
  wood: { dark: '#b58863', light: '#f0d9b5' },
};

export default function BoardPanel({
  fen,
  score,
  isWhiteTurn,
  pieceSet = 'Staunty',
  boardTheme = 'green',
  currentMove,
  showArrow = true,
  onMove,
  gameInfo,
  flipped = false,
  studyArrows = [],
  studyCircles = [],
}) {
  const theme = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.green;
  const ext = 'svg';

  const darkSquareStyle = useMemo(() => ({ backgroundColor: theme.dark }), [theme.dark]);
  const lightSquareStyle = useMemo(() => ({ backgroundColor: theme.light }), [theme.light]);
  const chessboardStyle = useMemo(() => ({ borderRadius: '4px' }), []);

  // Click-to-move state
  const [selectedSquare, setSelectedSquare]     = useState(null);
  const [legalTargets, setLegalTargets]         = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }

  // Custom User Drawing State
  const [userArrows, setUserArrows] = useState([]);
  const [userHighlights, setUserHighlights] = useState({});

  const handleArrowsChange = useCallback((arrows) => {
    setUserArrows(arrows);
  }, []);

  const handleSquareRightClick = useCallback((square) => {
    setUserHighlights(prev => {
      const current = prev[square] || 0;
      return { ...prev, [square]: current + 1 };
    });
  }, []);

  const customPieces = useMemo(() => {
    const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
    const map = {};

    // Configurable scales to prevent piece SVGs from overflowing or looking tiny
    // You can tweak Maya-4 and Trinity-4 here if they look too big/small
    const PIECE_SCALES = {
      'Infinix': '80%',
      'Maya-4': '100%',
      'Trinity-4': '100%',
      'default': '100%'
    };

    pieces.forEach((piece) => {
      map[piece] = ({ squareWidth }) => (
        <div style={{
          width: squareWidth,
          height: squareWidth,
          backgroundImage: `url(/pieces/${pieceSet}/${piece}.${ext})`,
          backgroundSize: PIECE_SCALES[pieceSet] || PIECE_SCALES.default,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          willChange: 'transform',
          transform: 'translateZ(0)', // Force GPU layer for silky smooth mobile animations
        }} />
      );
    });
    return map;
  }, [pieceSet, ext]);

  // Get legal moves from a square
  const getLegalTargets = useCallback((square) => {
    if (!fen || fen === 'start') return [];
    try {
      const chess = new Chess(fen);
      return chess.moves({ square, verbose: true }).map(m => m.to);
    } catch { return []; }
  }, [fen]);

  // Check if a move requires promotion
  const isPromotion = useCallback((from, to) => {
    if (!fen || fen === 'start') return false;
    try {
      const chess = new Chess(fen);
      const piece = chess.get(from);
      return (
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') ||
         (piece.color === 'b' && to[1] === '1'))
      );
    } catch { return false; }
  }, [fen]);

  // Attempt a move: handles selection, deselection, and promotion
  const attemptMove = useCallback((from, to) => {
    if (!onMove) return;
    if (isPromotion(from, to)) {
      setPendingPromotion({ from, to });
      return;
    }
    const ok = onMove(from, to, '');
    if (!ok) {
      // Maybe clicking a new own piece — re-select
      const targets = getLegalTargets(to);
      if (targets.length > 0) {
        setSelectedSquare(to);
        setLegalTargets(targets);
      } else {
        setSelectedSquare(null);
        setLegalTargets([]);
      }
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  }, [onMove, isPromotion, getLegalTargets]);

  // Square click handler
  const handleSquareClick = useCallback((square) => {
    setUserHighlights({});
    setUserArrows([]);
    if (!onMove) return;

    if (selectedSquare) {
      if (square === selectedSquare) {
        // Deselect
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }
      if (legalTargets.includes(square)) {
        attemptMove(selectedSquare, square);
        return;
      }
      // Clicked a different square — try to select it instead
      const targets = getLegalTargets(square);
      if (targets.length > 0) {
        setSelectedSquare(square);
        setLegalTargets(targets);
      } else {
        setSelectedSquare(null);
        setLegalTargets([]);
      }
    } else {
      const targets = getLegalTargets(square);
      if (targets.length > 0) {
        setSelectedSquare(square);
        setLegalTargets(targets);
      }
    }
  }, [selectedSquare, legalTargets, onMove, getLegalTargets, attemptMove]);

  // Drag-and-drop handler
  const handlePieceDrop = useCallback((from, to) => {
    setUserHighlights({});
    setUserArrows([]);
    if (!onMove) return false;
    if (isPromotion(from, to)) {
      setPendingPromotion({ from, to });
      setSelectedSquare(null);
      setLegalTargets([]);
      return true; // accept drag visually; actual move fires after promotion choice
    }
    const ok = onMove(from, to, '');
    setSelectedSquare(null);
    setLegalTargets([]);
    return ok;
  }, [onMove, isPromotion]);

  // Promotion chosen
  const handlePromotion = useCallback((piece) => {
    if (!pendingPromotion) return;
    onMove?.(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalTargets([]);
  }, [pendingPromotion, onMove]);

  // Arrow info
  const arrowInfo = useMemo(() => {
    if (!showArrow || !currentMove) return null;
    const cid  = currentMove.classification?.id;
    const rgba = ARROW_COLORS_RGBA[cid];
    const hex  = ARROW_COLORS_HEX[cid];

    // ONLY show arrows for these specific negative classifications
    const badMoveClasses = ['inaccuracy', 'mistake', 'miss', 'blunder'];
    if (!badMoveClasses.includes(cid)) return null;

    if (currentMove.engineBestMove && currentMove.preFen) {
      const eFrom  = currentMove.engineBestMove.slice(0, 2);
      const eTo    = currentMove.engineBestMove.slice(2, 4);

      // Don't show if the engine move matches the played move (failsafe)
      if (eFrom === currentMove.from && eTo === currentMove.to) return null;

      const ePiece = pieceAtSquare(currentMove.preFen, eFrom);
      return { isKnight: ePiece === 'n', from: eFrom, to: eTo, rgba, hex };
    }
    return null; // Fallback: don't show the played move as an arrow if not bad
  }, [currentMove, showArrow]);

  const customArrows = useMemo(() => {
    const arrs = [];
    if (arrowInfo && !arrowInfo.isKnight) {
      arrs.push([arrowInfo.from, arrowInfo.to, arrowInfo.rgba]);
    }
    
    // Parse Lichess study arrows (e.g., "Gf3e5")
    const colorMap = {
      'G': 'rgba(21, 120, 27, 0.8)',
      'R': 'rgba(136, 32, 32, 0.8)',
      'Y': 'rgba(230, 143, 0, 0.8)',
      'B': 'rgba(0, 48, 136, 0.8)',
    };
    studyArrows.forEach(a => {
      const colorChar = a[0];
      const from = a.substring(1, 3);
      const to = a.substring(3, 5);
      const rgba = colorMap[colorChar] || colorMap['G'];
      arrs.push([from, to, rgba]);
    });
    
    return arrs;
  }, [arrowInfo, studyArrows]);

  // Square styles: move highlights + selection + legal targets
  const squareStyles = useMemo(() => {
    const styles = {};
    // Previous move highlight
    if (currentMove?.from && currentMove?.to && !pendingPromotion) {
      styles[currentMove.from] = { background: 'rgba(246,246,105,0.55)' };
      styles[currentMove.to]   = { background: 'rgba(246,246,105,0.55)' };
    }
    // Selected square
    if (selectedSquare) {
      styles[selectedSquare] = { background: 'rgba(74,124,89,0.55)' };
    }
    // Legal target dots
    legalTargets.forEach(sq => {
      styles[sq] = {
        background: styles[sq]
          ? 'rgba(74,124,89,0.45)'
          : 'radial-gradient(circle, rgba(74,124,89,0.45) 30%, transparent 30%)',
      };
    });
    // User right-click highlights
    Object.entries(userHighlights).forEach(([sq, count]) => {
      if (count > 0) {
        const op = Math.min(count * 0.35, 0.9);
        styles[sq] = {
          ...styles[sq],
          backgroundColor: `rgba(135, 206, 250, ${op})`,
        };
      }
    });
    // Study circles (e.g., "Gf3")
    const colorMap = {
      'G': 'rgba(21, 120, 27, 0.8)',
      'R': 'rgba(136, 32, 32, 0.8)',
      'Y': 'rgba(230, 143, 0, 0.8)',
      'B': 'rgba(0, 48, 136, 0.8)',
    };
    studyCircles.forEach(c => {
      const colorChar = c[0];
      const sq = c.substring(1, 3);
      const rgba = colorMap[colorChar] || colorMap['G'];
      styles[sq] = {
        ...styles[sq],
        border: `4px solid ${rgba}`,
        borderRadius: '50%', // Make it circular inside the square
        boxSizing: 'border-box',
        transform: 'scale(0.95)' // Decrease size slightly
      };
    });
    return styles;
  }, [currentMove, selectedSquare, legalTargets, pendingPromotion, userHighlights, studyCircles]);

  // Color of moving player for promotion dialog
  const movingColor = fen && fen !== 'start'
    ? fen.split(' ')[1] === 'w' ? 'w' : 'b'
    : 'w';

  return (
    <div className="flex gap-1.5 h-full w-full">
      <EvalBar score={score} isWhiteTurn={isWhiteTurn} />
      <div className="flex-1 rounded-lg overflow-hidden shadow-xl h-full flex flex-col bg-white dark:bg-slate-900">

        {/* Top Player Info Bar */}
        {gameInfo && (
          <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-100 bg-gray-50">
            {flipped ? (
              <>
                {gameInfo.whiteUrl && <img src={gameInfo.whiteUrl} alt="White" className="w-6 h-6 rounded-sm object-cover shrink-0 shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />}
                {gameInfo.whiteTitle && <span className="text-xs font-black text-red-700 dark:text-red-400">{gameInfo.whiteTitle}</span>}
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-300 truncate">{gameInfo.white || 'White'}</span>
                  {gameInfo.whiteElo && <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">({gameInfo.whiteElo})</span>}
                </>
              ) : (
                <>
                  {gameInfo.blackUrl && <img src={gameInfo.blackUrl} alt="Black" className="w-6 h-6 rounded-sm object-cover shrink-0 shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />}
                  {gameInfo.blackTitle && <span className="text-xs font-black text-red-700 dark:text-red-400">{gameInfo.blackTitle}</span>}
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-300 truncate">{gameInfo.black || 'Black'}</span>
                  {gameInfo.blackElo && <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">({gameInfo.blackElo})</span>}
              </>
            )}
          </div>
        )}

        <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          <Chessboard
          position={fen === 'start' ? 'start' : fen}
          customPieces={customPieces}
          customDarkSquareStyle={darkSquareStyle}
          customLightSquareStyle={lightSquareStyle}
          customSquareStyles={squareStyles}
          customArrows={customArrows}
          animationDuration={150}
          boardStyle={chessboardStyle}
          arePiecesDraggable={!!onMove}
          onPieceDrop={handlePieceDrop}
          onSquareClick={handleSquareClick}
          onSquareRightClick={handleSquareRightClick}
          onArrowsChange={handleArrowsChange}
          customArrowColor="rgba(0,0,0,0)"
          boardOrientation={flipped ? 'black' : 'white'}
          showBoardNotation={true}
        />
        {currentMove?.to && currentMove?.classification?.id && !pendingPromotion && (() => {
          const file = currentMove.to.charCodeAt(0) - 97;
          const rank = parseInt(currentMove.to[1], 10) - 1;
          const col  = flipped ? 7 - file : file;
          const row  = flipped ? rank : 7 - rank;
          const sp   = 100 / 8; // 12.5% per square
          return (
            <div
              key={currentMove.to}
              style={{
                position: 'absolute',
                left:   `${col * sp + sp * 0.64}%`,
                top:    `${row * sp + sp * 0.02}%`,
                width:  `${sp * 0.36}%`,
                height: `${sp * 0.36}%`,
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
                <EvalBadge type={currentMove.classification.id} />
              </div>
            );
          })()}

          {/* ── Tracker Badges ── */}
          {(() => {
              if (pendingPromotion || !currentMove) return null;
              
              const badges = {};
              
              if (currentMove.hangingSquares) {
                  currentMove.hangingSquares.forEach(sq => {
                      if (!badges[sq]) badges[sq] = [];
                      badges[sq].push('hanging');
                  });
              }
              if (currentMove.forkSquares) {
                  currentMove.forkSquares.forEach(sq => {
                      if (!badges[sq]) badges[sq] = [];
                      badges[sq].push('fork');
                  });
              }
              if (currentMove.checkSquares) {
                  currentMove.checkSquares.forEach(sq => {
                      if (!badges[sq]) badges[sq] = [];
                      badges[sq].push('check');
                  });
              }
              if (currentMove.pinSquares) {
                  currentMove.pinSquares.forEach(sq => {
                      if (!badges[sq]) badges[sq] = [];
                      badges[sq].push('pin');
                  });
              }
              if (currentMove.blockSquares) {
                  currentMove.blockSquares.forEach(sq => {
                      if (!badges[sq]) badges[sq] = [];
                      badges[sq].push('block');
                  });
              }
              if (currentMove.discoverySquares) {
                  currentMove.discoverySquares.forEach(sq => {
                      if (!badges[sq]) badges[sq] = [];
                      badges[sq].push('discovery');
                  });
              }
              
              return Object.entries(badges).map(([sq, types]) => {
                  let typeStr = '';
                  if (types.includes('hanging')) typeStr += '$';
                  if (types.includes('fork')) typeStr += 'F';
                  if (types.includes('check')) typeStr += 'C';
                  if (types.includes('pin')) typeStr += 'P';
                  if (types.includes('block')) typeStr += 'D';
                  if (types.includes('discovery')) typeStr += 'A';
                  
                  const file = sq.charCodeAt(0) - 97;
                  const rank = parseInt(sq[1], 10) - 1;
                  const col = flipped ? 7 - file : file;
                  const row = flipped ? rank : 7 - rank;
                  const sp = 100 / 8; // 12.5% per square
                  return (
                    <div
                      key={`tracker-${sq}`}
                      style={{
                        position: 'absolute',
                        left: `${col * sp + sp * 0.02}%`,
                        top: `${row * sp + sp * 0.02}%`,
                        width: `${sp * 0.24}%`,
                        height: `${sp * 0.24}%`,
                        zIndex: 20,
                        pointerEvents: 'none',
                      }}
                    >
                      <EvalBadge type="tracker" text={typeStr} />
                    </div>
                  );
              });
          })()}

          {arrowInfo?.isKnight && !pendingPromotion && (
            <BoardArrow fromSq={arrowInfo.from} toSq={arrowInfo.to} color={arrowInfo.hex} flipped={flipped} />
          )}
          
          {userArrows.map((arrow, idx) => (
            <BoardArrow key={`uarrow-${idx}`} fromSq={arrow[0]} toSq={arrow[1]} color="rgb(255, 170, 0)" flipped={flipped} />
          ))}
        {pendingPromotion && (
          <PromotionModal
            color={movingColor}
            onChoose={handlePromotion}
            onCancel={() => { setPendingPromotion(null); setSelectedSquare(null); setLegalTargets([]); }}
          />
          )}
        </div>

        {/* Bottom Player Info Bar */}
        {gameInfo && (
          <div className="px-3 py-2 flex items-center border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            {
              flipped ? (
                <>
                  {gameInfo.blackUrl && <img src={gameInfo.blackUrl} alt="Black" className="w-6 h-6 rounded-sm object-cover shrink-0 shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />}
                  {gameInfo.blackTitle && <span className="text-xs font-black text-red-700 dark:text-red-400 shrink-0">{gameInfo.blackTitle}</span>}
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-300 truncate">{gameInfo.black || 'Black'}</span>
                  {gameInfo.blackElo && <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold shrink-0">({gameInfo.blackElo})</span>}
                </>
              ) : (
                <>
                  {gameInfo.whiteUrl && <img src={gameInfo.whiteUrl} alt="White" className="w-6 h-6 rounded-sm object-cover shrink-0 shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />}
                  {gameInfo.whiteTitle && <span className="text-xs font-black text-red-700 dark:text-red-400 shrink-0">{gameInfo.whiteTitle}</span>}
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-300 truncate">{gameInfo.white || 'White'}</span>
                  {gameInfo.whiteElo && <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold shrink-0">({gameInfo.whiteElo})</span>}
                </>
              )
            }
          </div>
        </div>
        )}

      </div>
    </div>
  );
}