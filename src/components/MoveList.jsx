import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import EvalBadge from './EvalBadge';

function formatScore(cp, mate) {
  if (mate) return mate > 0 ? `+M${mate}` : `-M${Math.abs(mate)}`;
  const val = (cp / 100).toFixed(2);
  return cp > 0 ? `+${val}` : val;
}

function formatPV(fen, uciStr, maxMoves = 6) {
  if (!uciStr) return '';
  try {
    const chess = new Chess(fen);
    const tokens = uciStr.trim().split(' ');
    let sans = [];
    let moveNum = chess.moveNumber();
    let turn = chess.turn();

    for (let i = 0; i < Math.min(tokens.length, maxMoves * 2); i++) {
      const uci = tokens[i];
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const mv = chess.move({ from, to, promotion });
      if (!mv) break;

      if (turn === 'w') {
        sans.push(`${moveNum}. ${mv.san}`);
      } else {
        if (i === 0) sans.push(`${moveNum}... ${mv.san}`);
        else sans.push(mv.san);
        moveNum++;
      }
      turn = turn === 'w' ? 'b' : 'w';
    }
    return sans.join(' ');
  } catch(e) {
    return uciStr; // fallback to raw UCI if parsing fails
  }
}

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

function formatClock(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const MoveChip = React.memo(function MoveChip({ move, index, isActive, onClick, onDelete }) {
  const [hovered,    setHovered]    = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const longPressRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(longPressRef.current);
  }, []);

  if (!move) return <div className="h-9" />;

  const cid    = move.classification?.id;
  const color  = ICON_COLOR[cid] || (move.isBranch ? '#94a3b8' : '#888');
  const clock  = formatClock(move.clock);
  const isBranch = !!move.isBranch;

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => setShowDelete(true), 600);
  };
  const handleTouchEnd = () => { clearTimeout(longPressRef.current); setShowDelete(false); };
  const handleMouseLeave = () => { setHovered(false); setShowDelete(false); };

  return (
    <div className="relative flex flex-col w-full">
      <button
        onClick={() => onClick(index)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-1.5
          transition-all ${isActive
            ? 'bg-[#4a7c59] text-white shadow-sm font-bold'
            : isBranch
              ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium border border-dashed border-blue-200 dark:border-blue-800'
              : 'hover:bg-gray-50 dark:hover:bg-slate-800 font-medium'
          }`}
        style={{ minHeight: 36 }}
      >
        {/* Branch indicator */}
        {isBranch && !isActive && (
          <span className="text-[9px] font-bold text-blue-400 shrink-0 leading-none">…</span>
        )}

        {cid ? (
          <div className="w-4 h-4 shrink-0 flex items-center justify-center">
            <EvalBadge type={cid} />
          </div>
        ) : isBranch ? (
          <svg className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-300'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ) : null}

        <span
          className={`flex-1 truncate text-sm leading-none font-semibold
            ${isBranch && !isActive ? 'italic' : ''}`}
          style={{ color: isActive ? 'white' : color }}
        >
          {move.san}
        </span>

        {move.fromCloud && (
          <span
            title="Evaluated by Lichess Cloud"
            className={`text-[10px] shrink-0 leading-none
              ${isActive ? 'text-white/60' : 'text-sky-400'}`}
          >
            ☁
          </span>
        )}
        {clock && (
          <span className={`text-[11px] font-mono shrink-0
            ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
            {clock}
          </span>
        )}
      </button>

      {(hovered || showDelete) && onDelete && (
        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center
            w-7 bg-red-500 hover:bg-red-600 text-white rounded-r-lg z-10 transition-all opacity-50 hover:opacity-80"
          title="Delete this move and all after?"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
});

const ENGINE_DISPLAY_NAMES = {
  stockfish: 'Stockfish 18',
  berserk: 'Berserk v4.3.0',
};

const MoveRow = React.memo(({ w, b, num, wi, bi, isMainLineActive, currentMoveIndex, handleMainLineClick, onDeleteFrom, mainLineMovesLen, isDivergencePoint, branchPairs, firstBranchIndex, onMoveClick, activeRef }) => {
  return (
    <React.Fragment>
      <div
        ref={isMainLineActive ? activeRef : null}
        className="grid grid-cols-[24px_1fr_1fr] gap-0.5 items-center mb-0.5 opacity-100"
      >
        <span className="text-xs font-bold text-gray-400 dark:text-slate-500 text-right pr-1 select-none">
          {num}.
        </span>
        <MoveChip
          move={w} index={wi}
          isActive={isMainLineActive && currentMoveIndex === wi}
          onClick={handleMainLineClick}
          onDelete={mainLineMovesLen > 0 ? null : onDeleteFrom}
        />
        <MoveChip
          move={b} index={bi}
          isActive={isMainLineActive && currentMoveIndex === bi}
          onClick={handleMainLineClick}
          onDelete={mainLineMovesLen > 0 ? null : onDeleteFrom}
        />
      </div>

      {/* Inject Active Branch Here */}
      {isDivergencePoint && branchPairs.length > 0 && (
        <div className="ml-7 mt-1 mb-2 pl-2 border-l-2 border-blue-300/50 flex flex-col gap-0.5 bg-blue-50/30 rounded-r-lg pb-1">
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-0.5 mt-1 ml-1">
            Active Variation
          </span>
          {branchPairs.map((bp) => (
            <div key={`branch-${bp.num}`} ref={currentMoveIndex === bp.wi || currentMoveIndex === bp.bi ? activeRef : null} className="grid grid-cols-[24px_1fr_1fr] gap-0.5 items-center">
              <span className="text-xs font-bold text-blue-300/80 text-right pr-1 select-none">
                {bp.num}.
              </span>
              {bp.w ? (
                <MoveChip
                  move={bp.w} index={bp.wi}
                  isActive={currentMoveIndex === bp.wi}
                  onClick={onMoveClick}
                  onDelete={onDeleteFrom}
                />
              ) : <div />}
              {bp.b ? (
                <MoveChip
                  move={bp.b} index={bi}
                  isActive={currentMoveIndex === bp.bi}
                  onClick={onMoveClick}
                  onDelete={onDeleteFrom}
                />
              ) : <div />}
            </div>
          ))}
        </div>
      )}
    </React.Fragment>
  );
});

export default function MoveList({ moves = [], mainLineMoves = [], currentMoveIndex, onMoveClick, onMainLineClick, onDeleteFrom, playback = null, currentMove = null, onEngineLineClick = null, liveEvalData = null, baseFen = 'start', isAnalyzing = false, analysisComplete = false, showEngineLines = true, enginePaused = false, setEnginePaused = null, onCloseEngineLines = null, onNewEngineLinePlay = null, engineName = 'stockfish' }) {
  const activeRef = useRef(null);
  const containerRef = useRef(null);
  const [expandedLineIndex, setExpandedLineIndex] = useState(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const el = activeRef.current;
      const container = containerRef.current;
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      const cTop = container.scrollTop;
      const cBottom = cTop + container.clientHeight;

      if (elTop < cTop || elBottom > cBottom) {
        container.scrollTop = elTop - container.clientHeight / 2 + el.offsetHeight / 2;
      }
    }
  }, [currentMoveIndex]);

  const handleMainLineClick = useCallback((index) => {
    if (onMainLineClick) onMainLineClick(index);
    else onMoveClick(index);
  }, [onMainLineClick, onMoveClick]);

  const firstBranchIndex = moves.findIndex(m => m.isBranch);

  // Use stored main line if we are in a branch, otherwise use active moves
  const baseLine = mainLineMoves.length > 0 ? mainLineMoves : moves;
  const branchMoves = firstBranchIndex >= 0 ? moves.slice(firstBranchIndex) : [];

  const pairs = [];
  for (let i = 0; i < baseLine.length; i += 2) {
    pairs.push({
      w: baseLine[i],
      b: baseLine[i + 1] || null,
      num: Math.floor(i / 2) + 1,
      wi: i,
      bi: i + 1,
    });
  }

  // Helper to format branch moves into pairs
  const branchPairs = [];
  if (branchMoves.length > 0) {
    let offset = branchMoves[0].color === 'b' ? 1 : 0;
    let bIdx = 0;
    if (offset === 1) {
      branchPairs.push({ w: null, b: branchMoves[0], num: branchMoves[0].moveNumber, wi: -1, bi: firstBranchIndex });
      bIdx = 1;
    }
    for (let i = bIdx; i < branchMoves.length; i += 2) {
      branchPairs.push({
        w: branchMoves[i],
        b: branchMoves[i + 1] || null,
        num: branchMoves[i].moveNumber,
        wi: firstBranchIndex + i,
        bi: firstBranchIndex + i + 1,
      });
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden
      flex flex-col min-h-0 h-full">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800 shrink-0 flex items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Moves</p>
        {firstBranchIndex >= 0 && (
          <span className="text-[10px] font-semibold text-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800
            px-1.5 py-0.5 rounded-full border border-blue-100">
            branch from {Math.floor(firstBranchIndex / 2) + 1}
          </span>
        )}
      </div>

      {/* En Croissant Style Engine Line Display (Fixed at top, max 50% height) */}
      {analysisComplete && showEngineLines && liveEvalData?.topMoves?.length > 0 && (
        <div className="flex flex-col border-b-2 border-gray-200 dark:border-slate-700 max-h-[40%] min-h-0 flex-shrink-0 bg-white dark:bg-slate-850 z-10 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 6h16M4 12h8m-8 6h16" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-bold text-gray-900 dark:text-slate-100 text-[15px]">{ENGINE_DISPLAY_NAMES[engineName] || engineName}</span>
            </div>
            <div className="flex items-center gap-5 text-gray-800 dark:text-slate-200 pr-2">
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[10px] font-bold text-gray-500 tracking-widest">EVAL</span>
                <span className="text-sm font-black">
                  {(() => {
                        if (!liveEvalData?.topMoves?.[0]) return '-';
                        const fenToUse = liveEvalData.fen || baseFen;
                        const isBlack = fenToUse.split(' ')[1] === 'b';
                        const cp = isBlack ? -liveEvalData.topMoves[0].score : liveEvalData.topMoves[0].score;
                        const mate = isBlack ? (liveEvalData.topMoves[0].mate ? -liveEvalData.topMoves[0].mate : null) : liveEvalData.topMoves[0].mate;
                        return formatScore(cp, mate);
                      })()}
                </span>
              </div>
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[10px] font-bold text-gray-500 tracking-widest">DEPTH</span>
                <span className="text-sm font-black">{liveEvalData.depth}</span>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-1.5 ml-3 border-l border-gray-200 dark:border-slate-700 pl-3">
                <button 
                  onClick={() => setEnginePaused && setEnginePaused(!enginePaused)} 
                  className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${enginePaused ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'}`}
                  title={enginePaused ? "Resume Engine" : "Pause Engine"}
                >
                  {enginePaused ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
                  )}
                </button>
                <button 
                  onClick={() => onCloseEngineLines && onCloseEngineLines()} 
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 text-gray-400 dark:text-slate-500 transition-colors"
                  title="Close Engine Lines"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* PV Rows */}
          <div className="flex flex-col bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar min-h-0">
            {liveEvalData.topMoves.map((moveData, i) => {
                  if (!moveData.pv) return null;
                  const fenToUse = liveEvalData.fen || baseFen;
                  const formattedSan = formatPV(fenToUse, moveData.pv, 6);
                  const isExpanded = expandedLineIndex === i;
                  const turn = fenToUse.split(' ')[1];
              const isBlack = turn === 'b';
              const displayCp = isBlack ? -moveData.score : moveData.score;
              const displayMate = isBlack ? (moveData.mate ? -moveData.mate : null) : moveData.mate;
              
              return (
                <div key={i} className={`border-b border-gray-100 dark:border-slate-800 last:border-0 shrink-0 ${isExpanded ? 'bg-gray-50 dark:bg-slate-800/50' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'} transition-colors`}>
                  <div 
                    className="flex items-center gap-3 p-2.5 cursor-pointer"
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedLineIndex(null);
                      } else {
                        setExpandedLineIndex(i);
                        if (onNewEngineLinePlay) onNewEngineLinePlay(moveData.pv);
                      }
                    }}
                  >
                    <div className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 min-w-[3.5rem] text-center shadow-sm">
                      <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                        {formatScore(displayCp, displayMate)}
                      </span>
                    </div>
                    <div className="flex-1 truncate text-[13px] text-gray-700 dark:text-gray-300 font-medium">
                      {formattedSan}
                    </div>
                    <div className="text-gray-400 shrink-0 pr-1">
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Expanded Step-by-Step Playback List */}
                  {isExpanded && playback?.sans && playback.sans.length > 0 && (
                    <div className="pl-14 pr-4 pb-3 pt-1">
                      <div className="flex flex-wrap gap-x-1.5 gap-y-1 text-[13.5px] leading-relaxed">
                        {(() => {
                          const pbStartFen = playback.fens[0] || baseFen;
                          const pbTurn = pbStartFen.split(' ')[1];
                          let startIdx = 0;
                          let chessNum;
                          try { chessNum = new Chess(pbStartFen).moveNumber(); } 
                          catch(e) { chessNum = currentMove ? currentMove.moveNumber : 1; }
                          
                          let moveNum = chessNum;
                          const elements = [];

                          if (pbTurn === 'b') {
                            elements.push(<span key={`num-${moveNum}`} className="font-bold text-gray-500 dark:text-slate-400">{moveNum}...</span>);
                            elements.push(
                              <span
                                key={`move-1`}
                                onClick={(e) => { e.stopPropagation(); onEngineLineClick && onEngineLineClick(1); }}
                                className={`cursor-pointer px-1 rounded transition-colors ${
                                  playback.index === 1 
                                    ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold' 
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {playback.sans[0]}
                              </span>
                            );
                            startIdx = 1;
                            moveNum++;
                          }

                          for (let j = startIdx; j < playback.sans.length; j += 2) {
                            elements.push(<span key={`num-${moveNum}`} className="font-bold text-gray-500 dark:text-slate-400 ml-0.5">{moveNum}.</span>);
                            
                            elements.push(
                              <span
                                key={`move-${j + 1}`}
                                onClick={(e) => { e.stopPropagation(); onEngineLineClick && onEngineLineClick(j + 1); }}
                                className={`cursor-pointer px-1 rounded transition-colors ${
                                  playback.index === (j + 1) 
                                    ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold' 
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {playback.sans[j]}
                              </span>
                            );

                            if (playback.sans[j + 1]) {
                              elements.push(
                                <span
                                  key={`move-${j + 2}`}
                                  onClick={(e) => { e.stopPropagation(); onEngineLineClick && onEngineLineClick(j + 2); }}
                                  className={`cursor-pointer px-1 rounded transition-colors ${
                                    playback.index === (j + 2) 
                                      ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold' 
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {playback.sans[j + 1]}
                                </span>
                              );
                            }
                            moveNum++;
                          }
                          return elements;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div ref={containerRef} className="overflow-y-auto flex-1 p-1.5 overscroll-contain">

        {pairs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No moves yet</p>
        ) : (
          <>
            {firstBranchIndex === 0 && branchPairs.length > 0 && (
              <div className="ml-7 mt-1 mb-2 pl-2 border-l-2 border-blue-300/50 flex flex-col gap-0.5 bg-blue-50/30 rounded-r-lg pb-1">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-0.5 mt-1 ml-1">
                  Active Variation
                </span>
                {branchPairs.map((bp) => (
                  <div key={`branch-${bp.num}`} ref={currentMoveIndex === bp.wi || currentMoveIndex === bp.bi ? activeRef : null} className="grid grid-cols-[24px_1fr_1fr] gap-0.5 items-center">
                    <span className="text-xs font-bold text-blue-300/80 text-right pr-1 select-none">
                      {bp.num}.
                    </span>
                    {bp.w ? (
                      <MoveChip
                        move={bp.w} index={bp.wi}
                        isActive={currentMoveIndex === bp.wi}
                        onClick={onMoveClick}
                        onDelete={onDeleteFrom}
                      />
                    ) : <div />}
                    {bp.b ? (
                      <MoveChip
                        move={bp.b} index={bp.bi}
                        isActive={currentMoveIndex === bp.bi}
                        onClick={onMoveClick}
                        onDelete={onDeleteFrom}
                      />
                    ) : <div />}
                  </div>
                ))}
              </div>
            )}
            {pairs.map(({ w, b, num, wi, bi }) => {
              const isDivergencePoint = firstBranchIndex >= 0 && (wi === firstBranchIndex - 1 || bi === firstBranchIndex - 1);
              const isMainLineActive = mainLineMoves.length === 0
                ? (currentMoveIndex === wi || currentMoveIndex === bi)
                : (currentMoveIndex < firstBranchIndex && (currentMoveIndex === wi || currentMoveIndex === bi));

              return (
                <MoveRow
                  key={`main-${num}`}
                  w={w} b={b} num={num} wi={wi} bi={bi}
                  isMainLineActive={isMainLineActive}
                  currentMoveIndex={currentMoveIndex}
                  handleMainLineClick={handleMainLineClick}
                  onDeleteFrom={onDeleteFrom}
                  mainLineMovesLen={mainLineMoves.length}
                  isDivergencePoint={isDivergencePoint}
                  branchPairs={branchPairs}
                  firstBranchIndex={firstBranchIndex}
                  onMoveClick={onMoveClick}
                  activeRef={activeRef}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
