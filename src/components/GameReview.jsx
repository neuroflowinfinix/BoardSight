import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { fetchClassifications, shareGame, loadSharedGame } from '../utils/apiClient';

function normalizeFenCastling(fen) {
  const parts = fen.split(' ');
  if (parts.length < 3) return fen;
  const castling = parts[2];
  if (castling === '-' || /^[KQkq]+$/.test(castling)) return fen;
  const rows = parts[0].split('/');
  let whiteKingFile = -1, blackKingFile = -1;
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of rows[r]) {
      if (ch === 'K') whiteKingFile = file;
      else if (ch === 'k') blackKingFile = file;
      if (/[1-8]/.test(ch)) file += parseInt(ch) - 1;
      file++;
    }
  }
  let newCastling = '';
  for (const ch of castling) {
    if (ch === '-') continue;
    const fileIndex = ch.toLowerCase().charCodeAt(0) - 97;
    if (ch === ch.toUpperCase()) newCastling += fileIndex > whiteKingFile ? 'K' : 'Q';
    else newCastling += fileIndex > blackKingFile ? 'k' : 'q';
  }
  parts[2] = newCastling || '-';
  return parts.join(' ');
}

function normalizePgnFen(pgn) {
  return pgn.replace(/\[FEN\s+"([^"]+)"\]/i, (_, fen) => `[FEN "${normalizeFenCastling(fen)}"]`);
}

export default function GameReview() {
  const [engineReady, setEngineReady] = useState(false);
  const [pgnInput, setPgnInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [analysisResults, setAnalysisResults] = useState([]);
  const [currentFen, setCurrentFen] = useState('start');
  const [pgnVariant, setPgnVariant] = useState(null);
  const [variantError, setVariantError] = useState(null);
  const [manualVariant, setManualVariant] = useState('standard');
  
  const workerRef = useRef(null);
  const resolversRef = useRef({});

  const darkSquareStyle = React.useMemo(() => ({ backgroundColor: '#769656' }), []);
  const lightSquareStyle = React.useMemo(() => ({ backgroundColor: '#eeeed2' }), []);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker('/stockfish-v18/stockfish.js');
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'READY') {
        setEngineReady(true);
      } else if (e.data.type === 'EVAL_RESULT') {
        const { id, score, bestMove } = e.data;
        if (resolversRef.current[id]) {
          resolversRef.current[id]({ score, bestMove });
          delete resolversRef.current[id];
        }
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const evaluatePosition = (fen, depth = 18) => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substr(2, 9);
      resolversRef.current[id] = resolve;
      workerRef.current.postMessage({ type: 'EVALUATE', fen, depth, id });
    });
  };

  // Read Shared Links on Mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const loadData = async () => {
        try {
          const decoded = await loadSharedGame(hash);
          setAnalysisResults(decoded.results);
          setCurrentFen(decoded.finalFen);
          setPgnVariant(decoded.pgnVariant);
          if (decoded.pgnVariant === 'chess960') {
            setManualVariant('chess960');
          }

          // Remove the hash from the URL so it looks clean after loading
          window.history.replaceState(null, '', window.location.pathname);
        } catch (err) {
          console.error("Failed to parse shared game link", err);
          alert("The shared link appears to be invalid or corrupted.");
        }
      };
      loadData();
    }
  }, []);

  const detectPgnVariant = (pgn) => {
    if (!pgn.trim()) {
      setPgnVariant(null);
      setVariantError(null);
      return;
    }

    // Extract variant tag
    const variantMatch = pgn.match(/\[Variant\s+"([^"]+)"\]/i);
    const variantTag = variantMatch ? variantMatch[1].toLowerCase() : manualVariant;

    // Check for unsupported variants first
    const unsupported = [
      'crazyhouse', 'atomic', 'antichess', 'kingofthehill', 'king of the hill',
      'threecheck', 'three-check', 'horde', 'racingkings', 'racing kings',
      'losers', 'suicide', 'giveaway'
    ];
    if (unsupported.includes(variantTag)) {
      setPgnVariant('unsupported');
      setVariantError(`"${variantMatch[1]}" variant is not yet supported`);
      return;
    }

    // Check for incomplete PGN (starts mid-game via FEN tag)
    const fenMatch = pgn.match(/\[FEN\s+"([^"]+)"\]/i);
    const standardStart = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (fenMatch) {
      const fen = fenMatch[1];
      const isChess960Start = variantTag === 'chess960' || variantTag === 'fischerandom';
      const isStandardStart = fen.trim() === standardStart;
      if (!isChess960Start && !isStandardStart) {
        setPgnVariant('incomplete');
        setVariantError('Incomplete PGN detected — please paste from move 1');
        return;
      }
    }

    // Chess960
    if (variantTag === 'chess960' || variantTag === 'fischerandom') {
      setPgnVariant('chess960');
      setVariantError(null);
      return;
    }

    // Standard
    setPgnVariant('standard');
    setVariantError(null);
  };
  
  const handleShare = async () => {
    if (analysisResults.length === 0) return;

    // Get the starting FEN for Chess960, if applicable
    const fenMatch = pgnInput.match(/\[FEN\s+"([^"]+)"\]/i);
    const startingFen = pgnVariant === 'chess960' && fenMatch ? fenMatch[1] : undefined;

    try {
      const { hash } = await shareGame({ analysisResults, pgnVariant, startingFen });
      const shareUrl = `${window.location.origin}${window.location.pathname}#${hash}`;

      navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard! Anyone can open this to instantly view your analysis.");
    } catch (err) {
      alert("Failed to create share link: " + err.message);
    }
  };

  const handleAnalyze = async () => {
    if (!pgnInput) return;
    setIsAnalyzing(true);
    setAnalysisResults([]);

    const effectiveVariant = pgnInput.trim() ? pgnVariant : manualVariant;
    const isChess960 = effectiveVariant === 'chess960';

    // Inform Stockfish of variant before analysis
    workerRef.current.postMessage({ type: 'SET_CHESS960', value: isChess960 });

    const chess = new Chess(undefined, isChess960 ? { chess960: true } : {});
    try {
      chess.loadPgn(normalizePgnFen(pgnInput));
    } catch (err) {
      alert("Invalid PGN");
      setIsAnalyzing(false);
      return;
    }

    const moves = chess.history({ verbose: true });
    setProgress({ current: 0, total: moves.length });

    // For Chess960, use the shuffled starting FEN from PGN header
    const fenMatch = pgnInput.match(/\[FEN\s+"([^"]+)"\]/i);
    const startingFen = isChess960 && fenMatch ? fenMatch[1] : undefined;
    const replayGame = startingFen
      ? new Chess(startingFen, isChess960 ? { chess960: true } : {})
      : isChess960
        ? new Chess(undefined, { chess960: true })
        : new Chess();
    const results = [];
    let previousScore = 0; // Starting position is roughly 0.00

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      replayGame.move(move);
      const fen = replayGame.fen();
      
      const { score, bestMove } = await evaluatePosition(fen, 18);
      
      // Calculate loss based on perspective (White vs Black)
      const isWhiteMove = move.color === 'w';
      const adjustedScore = isWhiteMove ? score : -score; 
      const adjustedPrevScore = isWhiteMove ? previousScore : -previousScore;
      
      results.push({
        moveNumber: Math.floor(i / 2) + 1,
        san: move.san,
        color: move.color,
        score: adjustedScore / 100,   // Pawns (for display)
        scoreCP: adjustedScore,        // CP (for accuracy calc)
        prevScoreCP: adjustedPrevScore, // CP before move (for accuracy calc)
        classification: null,
      });

      previousScore = adjustedScore;
      setProgress({ current: i + 1, total: moves.length });
      
      // Force React render for progress update
      setAnalysisResults([...results]);
    }

    try {
      // Fetch classifications from API
      const movesData = results.map(r => ({ preScore: r.prevScoreCP, postScore: r.scoreCP }));
      const classifications = await fetchClassifications(movesData);
      
      // Attach classifications to results
      results.forEach((r, idx) => {
        r.classification = classifications[idx];
      });
      setAnalysisResults([...results]);
    } catch (err) {
      console.error("Failed to fetch classifications:", err);
    }

    setIsAnalyzing(false);
    setCurrentFen(replayGame.fen());
  };

  // Staunty pieces from Lichess mapping
  const customPieces = React.useMemo(() => {
    const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
    const customPiecesObj = {};
    pieces.forEach((piece) => {
      customPiecesObj[piece] = ({ squareWidth }) => (
        <div
          style={{
            width: squareWidth,
            height: squareWidth,
            backgroundImage: `url(https://lichess1.org/assets/piece/staunty/${piece}.svg)`,
            backgroundSize: '100%',
          }}
        />
      );
    });
    return customPiecesObj;
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4 md:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen text-gray-800">
      
      {/* Left Column: Board */}
      <div className="w-full md:w-1/2 lg:w-2/3">
        <div className="aspect-square w-full max-w-2xl shadow-xl rounded-sm overflow-hidden">
          <Chessboard 
            position={currentFen} 
            customPieces={customPieces}
            customDarkSquareStyle={darkSquareStyle}
            customLightSquareStyle={lightSquareStyle}
          />
        </div>
      </div>

      {/* Right Column: Controls & Analysis */}
      <div className="w-full md:w-1/2 lg:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-6 shadow-md rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Game Review</h2>
          
          {!engineReady ? (
            <div className="flex items-center gap-3 text-orange-600 font-semibold mb-4">
              <div className="animate-spin w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full"></div>
              Engine Warming Up... (Loading WASM)
            </div>
          ) : (
            <div className="text-green-600 font-semibold mb-2">✓ Stockfish 18 Ready</div>
          )}

          {pgnVariant === 'standard' && (
            <div className="text-blue-600 text-sm font-semibold mb-3">♟ Standard Chess</div>
          )}
          {pgnVariant === 'chess960' && (
            <div className="text-teal-600 text-sm font-semibold mb-3">⚄ Chess 960 Detected</div>
          )}
          {(pgnVariant === 'unsupported' || pgnVariant === 'incomplete') && (
            <div className="text-red-500 text-sm font-semibold mb-3">⚠ {variantError}</div>
          )}

          {/* Manual variant toggle — active when no PGN is pasted */}
          <div className={`flex rounded-lg overflow-hidden border border-gray-200 mb-4 text-sm font-semibold transition-opacity duration-200 ${pgnInput.trim() ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <button
              type="button"
              onClick={() => setManualVariant('standard')}
              className={`flex-1 py-2 transition-colors duration-150 ${manualVariant === 'standard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              ♟ Standard
            </button>
            <button
              type="button"
              onClick={() => setManualVariant('chess960')}
              className={`flex-1 py-2 transition-colors duration-150 ${manualVariant === 'chess960' ? 'bg-teal-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              ⚄ Chess 960
            </button>
          </div>

          <textarea
            className="w-full h-32 p-3 border rounded-md mb-4 font-mono text-[16px] sm:text-sm"
            placeholder="Paste PGN here..."
            value={pgnInput}
            onChange={(e) => { setPgnInput(e.target.value); detectPgnVariant(e.target.value); }}
            disabled={isAnalyzing}
          />
          
          <div className="flex gap-2 w-full">
            <button
              onClick={handleAnalyze}
              disabled={!engineReady || isAnalyzing || !pgnInput || pgnVariant === 'unsupported' || pgnVariant === 'incomplete'}
              className="flex-1 min-w-0 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-3 rounded transition disabled:opacity-50 flex items-center justify-center"
            >
              <span className="truncate text-sm sm:text-base">
                {isAnalyzing ? `Analyzing ${progress.current}/${progress.total}` : 'Start Review'}
              </span>
            </button>

            <button
              onClick={handleShare}
              disabled={analysisResults.length === 0 || isAnalyzing}
              title="Copy Share Link"
              className="shrink-0 w-14 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition disabled:opacity-50 flex items-center justify-center"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

        {/* Results Log */}
        <div className="bg-white p-4 shadow-md rounded-lg flex-grow overflow-y-auto max-h-[50vh]">
          <h3 className="font-bold border-b pb-2 mb-2">Move Analysis</h3>
          <div className="flex flex-col gap-1">
            {analysisResults.map((res, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 border-b">
                <span className="font-mono text-gray-500 w-12">
                  {res.color === 'w' ? `${res.moveNumber}.` : '...'}
                </span>
                <span className="font-bold w-16">{res.san}</span>
                <span className={`font-semibold flex-1 text-right`} style={res.classification ? { color: res.classification.color } : {}}>
                  {res.classification ? `${res.classification.label} ${res.classification.symbol}` : '...'}
                </span>
                <span className="w-16 text-right text-gray-600">
                  {res.score > 0 ? '+' : ''}{res.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}