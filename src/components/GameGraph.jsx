import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import EvalBadge from './EvalBadge';

const GRAPH_HEIGHT = 120;
const PAD = { top: 12, bottom: 12, left: 8, right: 8 };

// Classifications that get a coloured dot on the graph
const DOT_COLORS = {
  brilliant: '#1BACA6',
  great:     '#5C8BB0',
  blunder:   '#C93832',
  mistake:   '#E07832',
  miss:      '#F0A030',
};

function evalToY(cp, H) {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  const frac = (clamped + 1000) / 2000; // 0=black winning → bottom, 1=white winning → top
  const inner = H - PAD.top - PAD.bottom;
  return PAD.top + (1 - frac) * inner;
}

export default function GameGraph({ moves, currentMoveIndex, onDotClick, totalMoves }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // index 0 = start position, indices 1..n = after each move
  const points = useMemo(() => {
    const pts = [{ score: 0, moveIdx: -1 }];
    moves.forEach((m, i) => pts.push({ score: m.whiteScore ?? 0, moveIdx: i }));
    return pts;
  }, [moves]);

  const draw = useCallback((W) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const H   = GRAPH_HEIGHT;
    const dpr = window.devicePixelRatio || 1;
    canvas.width        = Math.round(W * dpr);
    canvas.height       = Math.round(H * dpr);
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const isDark = document.documentElement.classList.contains('dark');

    // Background
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, W, H);

    if (points.length < 2) return;

    const n      = points.length;
    const expectedTotal = Math.max(n, (totalMoves ? totalMoves + 1 : n));
    const innerW = W - PAD.left - PAD.right;
    const xStep  = innerW / Math.max(1, expectedTotal - 1);
    const xAt    = (i) => PAD.left + i * xStep;
    const yAt    = (score) => evalToY(score, H);
    const zeroY  = yAt(0);

    // Current-position marker (Subtle full-height band behind graph)
    const ci = currentMoveIndex + 1;
    if (ci >= 0 && ci < n) {
      ctx.beginPath();
      ctx.moveTo(xAt(ci), 0);
      ctx.lineTo(xAt(ci), H);
      // Changed to dark color (0,0,0) in dark mode
      ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)';
      ctx.lineWidth   = 3;
      ctx.stroke();
    }

    // Fill area strictly between the mean (zero) line and the evaluation curve
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xAt(0), zeroY);
    for (let i = 0; i < n; i++) {
      ctx.lineTo(xAt(i), yAt(points[i].score));
    }
    ctx.lineTo(xAt(n - 1), zeroY);
    ctx.closePath();
    
    // Solid white in dark mode, cream in light mode
    ctx.fillStyle = isDark ? '#ffffff' : 'rgba(240,230,210,0.82)';
    ctx.fill();
    ctx.restore();

    // Zero line
    ctx.beginPath();
    ctx.moveTo(PAD.left, zeroY);
    ctx.lineTo(W - PAD.right, zeroY);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Phase transitions: calculate positions only ────────────────────────
    const phaseTransitions = [];
    const isAnalysisComplete = totalMoves > 0 && moves.length >= totalMoves;
    if (isAnalysisComplete && moves.length > 0) {
      const firstPhase = moves[0].phase || 'opening';
      phaseTransitions.push({ label: firstPhase.charAt(0).toUpperCase() + firstPhase.slice(1), pointIdx: 0 });

      const middlegameStart = moves.findIndex(m => m.phase === 'middlegame');
      const endgameStart = moves.findIndex(m => m.phase === 'endgame');
      
      if (middlegameStart > 0 && firstPhase !== 'middlegame') {
        phaseTransitions.push({ label: 'Middlegame', pointIdx: middlegameStart });
      }
      if (endgameStart > 0 && firstPhase !== 'endgame') {
        phaseTransitions.push({ label: 'Endgame', pointIdx: endgameStart });
      }
    }
    const phaseXs = phaseTransitions.map(p => xAt(p.pointIdx));

    // ── Dashed vertical dividers (drawn before curve, behind everything) ──
    phaseTransitions.forEach((phase, idx) => {
      if (phase.pointIdx === 0) return; // don't draw a divider at the very start
      const x = phaseXs[idx];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isDark ? '#ffffff' : 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    });

    // ── Eval curve ────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(xAt(0), yAt(points[0].score));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(xAt(i), yAt(points[i].score));
    }
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── Coloured dots ─────────────────────────────────────────────────────
    for (let i = 1; i < n; i++) {
      const m = moves[points[i].moveIdx];
      if (!m) continue;
      const dotColor = DOT_COLORS[m.classification?.id];
      if (!dotColor) continue;
      ctx.beginPath();
      ctx.arc(xAt(i), yAt(points[i].score), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0f172a' : 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Phase label pills (drawn last — always on top) ────────────────────
    phaseTransitions.forEach((phase, idx) => {
      const x = phaseXs[idx];
      const regionEnd = idx + 1 < phaseXs.length ? phaseXs[idx + 1] : W - PAD.right;
      const labelX = x + (regionEnd - x) / 2;

      ctx.font = 'bold 12px system-ui, sans-serif';
      const textW = ctx.measureText(phase.label).width;
      const pillW = textW + 12;
      const pillH = 18;
      // Clamp pill so it never bleeds past canvas edges
      const pillX = Math.max(PAD.left, Math.min(W - PAD.right - pillW, labelX - pillW / 2));
      const prevLabelX = idx > 0 ? phaseXs[idx - 1] + (phaseXs[idx] - phaseXs[idx - 1]) / 2 : -999;
      const pillY = idx > 0 && Math.abs(labelX - prevLabelX) < pillW + 8 ? 22 : 4;

      // Pill background
      ctx.save();
      ctx.fillStyle = isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255, 255, 255, 0.65)';
      ctx.shadowColor = 'rgba(0,0,0,0.10)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // Label text
      ctx.fillStyle = isDark ? 'rgba(226,232,240,0.9)' : 'rgba(50,50,50,0.9)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(phase.label, pillX + pillW / 2, pillY + pillH / 2);
    });
  }, [points, currentMoveIndex, moves, totalMoves]);

  // Store the latest draw function in a ref so observers can call it without needing to rebind
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // Redraw whenever the draw function changes (i.e. when moves or currentMoveIndex changes)
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const W = Math.round(container.getBoundingClientRect().width) || 400;
      draw(W);
    }
  }, [draw]);

  // Setup ResizeObserver and MutationObserver exactly ONCE
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId;
    const ro = new ResizeObserver((entries) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const W = Math.round(entries[0].contentRect.width) || 400;
        if (!canvasRef.current) return;
        drawRef.current(W);
      });
    });

    ro.observe(container);
    
    // Theme mutation observer (Redraws graph instantly when Dark Mode is toggled)
    const mo = new MutationObserver(() => {
      const currentW = Math.round(container.getBoundingClientRect().width) || 400;
      drawRef.current(currentW);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      ro.disconnect();
      mo.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const getNearestPointIndex = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (clientX - rect.left) * scaleX;

    const n = points.length;
    const expectedTotal = Math.max(n, (totalMoves ? totalMoves + 1 : n));
    const innerW = canvas.width - PAD.left - PAD.right;
    const xStep = innerW / Math.max(1, expectedTotal - 1);

    let best = 0, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x - (PAD.left + i * xStep));
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return { best, bestDist, xStep };
  };

  const handleClick = (e) => {
    const match = getNearestPointIndex(e.clientX);
    if (match) onDotClick?.(points[match.best].moveIdx);
  };

  const handleMouseMove = (e) => {
    const match = getNearestPointIndex(e.clientX);
    if (match && match.bestDist < match.xStep * 1.5) {
      setHoveredIdx(match.best);
    } else {
      setHoveredIdx(null);
    }
  };

  const handleMouseLeave = () => setHoveredIdx(null);

  const renderTooltip = () => {
    if (hoveredIdx === null || hoveredIdx === 0) return null;
    const point = points[hoveredIdx];
    if (!point) return null;
    const move = moves[point.moveIdx];
    if (!move) return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    // Get exact screen coordinates of the graph
    const rect = canvas.getBoundingClientRect();
    const n = points.length;
    const expectedTotal = Math.max(n, (totalMoves ? totalMoves + 1 : n));
    const innerW = rect.width - PAD.left - PAD.right;
    const xStep = innerW / Math.max(1, expectedTotal - 1);
    
    // Calculate relative X/Y
    const xPos = PAD.left + hoveredIdx * xStep;
    const yPos = evalToY(point.score, GRAPH_HEIGHT);

    // Convert local canvas coordinates to absolute viewport coordinates
    const viewportX = rect.left + xPos;
    const viewportY = rect.top + yPos;

    // Viewport Clamping: Keep it from bleeding off the physical monitor screen horizontally
    const safeX = Math.max(80, Math.min(window.innerWidth - 80, viewportX));
    
    // Smart flip vertically based on position
    const isNearTop = yPos < 65; 
    const safeY = isNearTop ? viewportY + 15 : viewportY - 15;

    let evalText = '0.00';
    if (move.mate) {
      evalText = (move.mate > 0 ? '+M' : '-M') + Math.abs(move.mate);
    } else if (move.whiteScore !== undefined && move.whiteScore !== null) {
      evalText = (move.whiteScore > 0 ? '+' : '') + (move.whiteScore / 100).toFixed(2);
    }

    // Render as a fixed portal directly on the body, breaking out of all parent overflows
    const tooltipContent = (
      <div
        className={`fixed pointer-events-none z-[999999] bg-white dark:bg-slate-800 border border-gray-200 dark:border-white shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3 transform -translate-x-1/2 transition-opacity duration-150 min-w-[120px] ${
          isNearTop ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ left: safeX, top: safeY }}
      >
        {move.classification?.id && (
          <div className="w-7 h-7 flex-shrink-0">
            <EvalBadge type={move.classification.id} />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-base font-black text-gray-800 dark:text-slate-200 whitespace-nowrap leading-none mb-1.5">
            {move.moveNumber}{move.color === 'b' ? '... ' : '. '}{move.san}
          </span>
          <span className="text-sm font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap leading-none">
            Eval: <span className={evalText.includes('+') ? 'text-green-600' : evalText.includes('-') ? 'text-red-600' : 'text-gray-600 dark:text-slate-400'}>{evalText}</span>
          </span>
        </div>
      </div>
    );

    // The Magic: Renders the tooltip as a direct child of the <body> tag
    return createPortal(tooltipContent, document.body);
  };

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      style={{ height: GRAPH_HEIGHT }}
    >
      <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm" style={{ background: 'transparent' }}>
        <canvas
          ref={canvasRef}
          height={GRAPH_HEIGHT}
          style={{ display: 'block', width: '100%', cursor: 'pointer' }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      {renderTooltip()}
    </div>
  );
}