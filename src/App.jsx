import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import LottieAvatar, { preloadLottieAvatars } from './components/LottieAvatar';

// Eagerly preload all coach Lottie files so they're cached before first use
preloadLottieAvatars();
import { useGameAnalysis } from './hooks/useGameAnalysis';
import { parsePGN } from './utils/pgnParser';
import { fetchGameMetrics } from './utils/apiClient';
import { shareGame, loadSharedGame } from './utils/apiClient';
import { loadOpeningsDatabase } from './utils/openingsDatabase';
import { getWelcomeMessage } from './utils/coachMessages';
import { Chess } from 'chess.js';
import MoreModal from './components/MoreModal';
import { fetchStudyPgn, extractStudyInfo } from './study/studyFetcher';
import { parseStudyPgn } from './study/studyParser';
import StudyBar from './study/StudyBar';

import BoardPanel       from './components/BoardPanel';
import PGNInput         from './components/PGNInput';
import AnalysisProgress from './components/AnalysisProgress';
import MoveList         from './components/MoveList';
import SummaryPanel     from './components/SummaryPanel';
import SettingsModal    from './components/SettingsModal';
import GameGraph        from './components/GameGraph';
import OpeningBox       from './components/OpeningBox';
import PlayerHeader     from './components/PlayerHeader';
import EvalBadge        from './components/EvalBadge';
import PlayButton       from './components/PlayButton';
import WhatsNew from './components/WhatsNew';
import ThanksModal from './components/ThanksModal';
import BugFixesModal from './components/BugFixesModal';
import WelcomeMessage from './components/welcomeModal';
import GameImportModal from './components/GameImportModal';
import PerspectiveSelectionModal from './components/PerspectiveSelectionModal';
import ContactModal from './components/ContactModal';
import DevNoteModal from './components/DevNoteModal';
import AboutModal from './components/AboutModal';
import FAQModal from './components/FAQModal';
import AnalysisInfoModal from './components/AnalysisInfoModal';
import CustomExplanationWarningModal from './components/CustomExplanationWarningModal';
import VersionInfoModal from './components/VersionInfoModal';
import SpecialThanksToast from './components/SpecialThanksToast';
import YouTubeBanner from './components/YT/YouTubeBanner';

// ── Theme Initialization (Prevents dark mode flashing on initial load) ──
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    if (!savedTheme) {
      localStorage.setItem('theme', 'light'); // Default to light mode on very first visit
    }
  }
}

// ── Chess960 Generator ─────────────────────────────────────────────────────
const generate960Fen = () => {
  const p = Array(8).fill('');
  p[Math.floor(Math.random() * 4) * 2] = 'b'; // Dark square bishop
  p[Math.floor(Math.random() * 4) * 2 + 1] = 'b'; // Light square bishop
  let e = p.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  p[e[Math.floor(Math.random() * e.length)]] = 'q'; // Queen
  e = p.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  p[e[Math.floor(Math.random() * e.length)]] = 'n'; // Knight 1
  e = p.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  p[e[Math.floor(Math.random() * e.length)]] = 'n'; // Knight 2
  e = p.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  p[e[0]] = 'r'; p[e[1]] = 'k'; p[e[2]] = 'r'; // King between Rooks
  const row = p.join('');
  return `${row.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${row.toUpperCase()} w - - 0 1`;
};

function generatePlaybackLine(preFen, uciPvStr) {
  if (!uciPvStr) return null;
  try {
    const chess = new Chess(preFen);
    const fens = [preFen];
    const sans = [];
    const pvMoves = []; // We will capture the actual move squares here!
    const uciTokens = uciPvStr.trim().split(' ');
    for (const uci of uciTokens) {
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const mv = chess.move({ from, to, promotion });
      if (!mv) break;
      sans.push(mv.san);
      fens.push(chess.fen());
      pvMoves.push({ from: mv.from, to: mv.to });
    }
    return { fens, sans, moves: pvMoves };
  } catch (e) { return null; }
}

function DeleteConfirm({ moveIdx, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onCancel}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 w-72 mx-4 border border-gray-100 dark:border-slate-800"
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold text-gray-800 dark:text-slate-100 mb-1">
          Delete from move {Math.floor(moveIdx / 2) + 1}?
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Removes move {Math.floor(moveIdx / 2) + 1} and all subsequent moves from the review.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800
              hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onConfirm(moveIdx)}
            className="flex-1 py-2 text-sm font-semibold text-white bg-red-500
              hover:bg-red-600 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

function getTacticLabel(tacticType) {
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
  }[tacticType] || null;
}

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={index} className="font-black text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    const italicParts = part.split(/(\*.*?\*)/g);
    return italicParts.map((iPart, iIndex) => {
      if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
        return <em key={`${index}-${iIndex}`} className="italic opacity-90">{iPart.slice(1, -1)}</em>;
      }
      return iPart;
    });
  });
}

function AnimatedTypewriterText({ text }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chars = container.querySelectorAll('.tw-char');
    const totalChars = chars.length;
    let currentVisible = 0;
    
    // Ensure all start hidden initially
    chars.forEach(c => c.style.opacity = 0);

    // Use a fixed medium pace (6ms per character) for a natural typing feel
    const speed = 6;

    const interval = setInterval(() => {
      if (currentVisible < totalChars) {
        if (chars[currentVisible]) chars[currentVisible].style.opacity = 1;
        currentVisible++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text]);

  const parsedNodes = renderFormattedText(text);
  let charIndex = 0;

  const processNode = (node) => {
    if (typeof node === 'string') {
      return node.split('').map((char) => {
        const currentIdx = charIndex++;
        return (
          <span 
            key={currentIdx} 
            className="tw-char"
            style={{ '--char-index': currentIdx }}
          >
            {char}
          </span>
        );
      });
    }

    if (Array.isArray(node)) {
      return node.map((n, i) => <React.Fragment key={i}>{processNode(n)}</React.Fragment>);
    }

    if (React.isValidElement(node)) {
      const children = React.Children.map(node.props.children, processNode);
      return React.cloneElement(node, {}, children);
    }

    return node;
  };

  return (
    <span ref={containerRef} className="typewriter-text-tw block">
      <style>{`
        .tw-char {
          opacity: 0;
          transition: opacity 0.05s ease-out;
        }
      `}</style>
      {Array.isArray(parsedNodes) 
        ? parsedNodes.map((n, i) => <React.Fragment key={i}>{processNode(n)}</React.Fragment>) 
        : processNode(parsedNodes)}
    </span>
  );
}

// ── Default Settings ────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  coachAvatar: 'male.json',
  depth: 12,
  movetime: 1000,
  multiPV: 3,
  engine: 'stockfish',
  enableSound: true,
  showEngineLines: false,
  showCoachGlow: true,
  collapseFooter: false,
  boardTheme: 'green',
  perspective: 'w',
  autoFlipByPerspective: true,
  threads: typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? Math.max(1, Math.floor(navigator.hardwareConcurrency * 0.75)) : 4,
  playInterval: 2,
};

function EditableExplanation({ currentResult, currentMoveIndex, analyzedMoves, setAnalyzedMoves }) {
  const [text, setText] = useState(currentResult?.coachExplanation?.text || '');
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    setText(currentResult?.coachExplanation?.text || '');
    setIsSaved(false);
  }, [currentMoveIndex]);

  const handleSave = () => {
    if (currentMoveIndex < 0) return;
    const oldExpl = analyzedMoves[currentMoveIndex]?.coachExplanation;
    const newMoves = [...analyzedMoves];
    newMoves[currentMoveIndex] = {
      ...newMoves[currentMoveIndex],
      coachExplanation: oldExpl ? { ...oldExpl, text, isCustom: true } : { type: 'custom', text, isCustom: true }
    };
    setAnalyzedMoves(newMoves);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-3 shadow-sm flex-1 flex flex-col min-h-[110px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">Explanation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all duration-300 shadow-sm ${isSaved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[10px] uppercase tracking-wider font-black">Saved</span>
          </div>
          
          <button 
            onClick={handleSave} 
            className="px-3 py-1.5 bg-[#4a7c59] hover:bg-[#3d6b4a] text-white text-[11px] uppercase tracking-wider font-black rounded-lg transition-colors shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
      <textarea
        className="flex-1 w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-lg p-3 text-[13px] text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a7c59]/50 resize-none custom-scrollbar"
        placeholder="Type or paste a custom explanation for this move..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        onPaste={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function generatePGNFromMoves(moves, startFen, is960) {
  let pgn = "";
  if (is960 || (startFen && startFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')) {
    if (is960) pgn += `[Variant "Chess960"]\n`;
    pgn += `[FEN "${startFen}"]\n\n`;
  }
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      pgn += `${Math.floor(i / 2) + 1}. `;
    }
    pgn += moves[i].san + " ";
  }
  return pgn.trim();
}

export default function App() {
  // Load settings synchronously to prevent UI flicker
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('chessSettings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  // ── URL path for initial modal auto-open (computed once) ──────────────────
  const [_initPath] = useState(() => window.location.pathname.replace(/\/+$/, '').toLowerCase());

  const [settingsOpen, setSettingsOpen] = useState(_initPath === '/settings');
  const [whatsNewOpen, setWhatsNewOpen] = useState(_initPath === '/more/whats-new');
  const [thanksOpen, setThanksOpen] = useState(_initPath === '/more/thanks');
  const [bugFixesOpen, setBugFixesOpen] = useState(_initPath === '/more/bug-fixes');
  const [importOpen, setImportOpen] = useState(_initPath === '/import');
  const [perspectiveSelectionOpen, setPerspectiveSelectionOpen] = useState(_initPath === '/perspectiveselection');
  const hasPromptedPerspectiveRef = useRef(false);
  const [moreOpen, setMoreOpen] = useState(_initPath === '/more');
  const [contactOpen, setContactOpen] = useState(_initPath === '/more/contact');
  const [devNoteOpen, setDevNoteOpen] = useState(_initPath === '/more/dev-note');
  const [aboutOpen, setAboutOpen] = useState(_initPath === '/more/about');
  const [faqOpen, setFaqOpen] = useState(_initPath === '/more/faq');
  const [analysisInfoOpen, setAnalysisInfoOpen] = useState(_initPath === '/more/analysis-info');
  const [shareUiOpen, setShareUiOpen] = useState(_initPath === '/share_ui');
  const [versionInfoOpen, setVersionInfoOpen] = useState(_initPath === '/more/version-info');
  const [annotationDropdownOpen, setAnnotationDropdownOpen] = useState(false);
  const [customExplanationWarningOpen, setCustomExplanationWarningOpen] = useState(false);

  const [shareThemeAndPieces, setShareThemeAndPieces] = useState(false);
  const [shareFromThisMove, setShareFromThisMove] = useState(false);
  const [sharePerspective, setSharePerspective] = useState('white');
  const [sharedTheme, setSharedTheme] = useState(null);
  const [sharedPieceSet, setSharedPieceSet] = useState(null);
  const [sharedMetrics, setSharedMetrics] = useState(null);

  const [gameInfoUiOpen, setGameInfoUiOpen] = useState(false);
  const [gameInfoSaved, setGameInfoSaved] = useState(false);
  const [hasCustomGameInfo, setHasCustomGameInfo] = useState(false);
  
  const [customWhiteName, setCustomWhiteName] = useState('');
  const [customBlackName, setCustomBlackName] = useState('');
  const [customWAcc, setCustomWAcc] = useState(100);
  const [customBAcc, setCustomBAcc] = useState(100);
  const [customWOp, setCustomWOp] = useState(100);
  const [customWMg, setCustomWMg] = useState(100);
  const [customWEg, setCustomWEg] = useState(100);
  const [customBOp, setCustomBOp] = useState(100);
  const [customBMg, setCustomBMg] = useState(100);
  const [customBEg, setCustomBEg] = useState(100);

  const [learnModalOpen, setLearnModalOpen] = useState(_initPath === '/learn');

  // ── Lichess Study Mode State ───────────────────────────────
  const [studyMode, setStudyMode] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/learn');
  });
  const [studyData, setStudyData] = useState(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isStudyLoading, setIsStudyLoading] = useState(false);
  const [studyError, setStudyError] = useState(null);

  // ── URL ↔ Modal Sync (all routable modals) ───────────────────────────────
  // Map: URL path → [isOpen, setter]
  const MODAL_ROUTE_MAP = useRef({
    '/settings':      { set: setSettingsOpen },
    '/more/whats-new':     { set: setWhatsNewOpen },
    '/more/thanks':        { set: setThanksOpen },
    '/more/bug-fixes':     { set: setBugFixesOpen },
    '/import':        { set: setImportOpen },
    '/perspectiveselection': { set: setPerspectiveSelectionOpen },
    '/more/contact':       { set: setContactOpen },
    '/more/dev-note':      { set: setDevNoteOpen },
    '/more/about':         { set: setAboutOpen },
    '/more/faq':           { set: setFaqOpen },
    '/more/analysis-info': { set: setAnalysisInfoOpen },
    '/share_ui':      { set: setShareUiOpen },
    '/more/version-info':  { set: setVersionInfoOpen },
    '/more':          { set: setMoreOpen },
  }).current;

  // Ordered list for sync effect — same paths as above
  const modalRouteStates = [
    { path: '/settings',      open: settingsOpen },
    { path: '/more/whats-new',     open: whatsNewOpen },
    { path: '/more/thanks',        open: thanksOpen },
    { path: '/more/bug-fixes',     open: bugFixesOpen },
    { path: '/import',        open: importOpen },
    { path: '/perspectiveselection', open: perspectiveSelectionOpen },
    { path: '/more/contact',       open: contactOpen },
    { path: '/more/dev-note',      open: devNoteOpen },
    { path: '/more/about',         open: aboutOpen },
    { path: '/more/faq',           open: faqOpen },
    { path: '/more/analysis-info', open: analysisInfoOpen },
    { path: '/share_ui',      open: shareUiOpen },
    { path: '/more/version-info',  open: versionInfoOpen },
    { path: '/more',          open: moreOpen },
  ];

  // Push URL when a modal opens or closes
  useEffect(() => {
    const currentPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();
    const activeRoute = modalRouteStates.find(r => r.open);

    if (activeRoute && currentPath !== activeRoute.path) {
      window.history.pushState({ modal: activeRoute.path }, '', activeRoute.path + '/');
    } else if (!activeRoute && Object.keys(MODAL_ROUTE_MAP).includes(currentPath)) {
      // Don't push to root if we're in a /learn route (study mode)
      if (!currentPath.startsWith('/learn/')) {
        // A routable modal was just closed — go back to root
        window.history.pushState({}, '', '/');
      }
    }
  }, [settingsOpen, whatsNewOpen, thanksOpen, bugFixesOpen, importOpen, perspectiveSelectionOpen, contactOpen, devNoteOpen, aboutOpen, faqOpen, analysisInfoOpen, shareUiOpen, versionInfoOpen, moreOpen]);

  // Handle browser back/forward button
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
      // Close all routable modals, then open the one matching the URL (if any)
      Object.values(MODAL_ROUTE_MAP).forEach(r => r.set(false));
      if (MODAL_ROUTE_MAP[path]) {
        MODAL_ROUTE_MAP[path].set(true);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load piece set synchronously
  const [pieceSet, setPieceSet] = useState(() => {
    return localStorage.getItem('chessPieceSet') || 'Staunty';
  });
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [rawPgn, setRawPgn] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isChess960, setIsChess960] = useState(false);
  const [chess960Fen, setChess960Fen] = useState(null);
  const [showSettingsHint, setShowSettingsHint] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [enginePaused, setEnginePaused] = useState(true);
  // Audio references for board sounds
  const audioRefs = useRef({
    move: new Audio('/sounds/move.mp3'),
    capture: new Audio('/sounds/capture.mp3'),
    check: new Audio('/sounds/check.mp3'),
    castle: new Audio('/sounds/castle.mp3'),
  });

  // Interactive Engine Playback
  const [playback, setPlayback] = useState(null);
  useEffect(() => setPlayback(null), [currentMoveIndex]);

  // Game moves auto-play
  const [isPlayingMoves, setIsPlayingMoves] = useState(false);

  // Autoplay engine lines
  useEffect(() => {
    if (!playback?.isActive || !playback?.isPlaying) {
      return; // Early exit if not playing
    }

    const timer = setTimeout(() => {
      setPlayback(p => {
        if (p.index >= p.fens.length - 1) {
          return { ...p, isPlaying: false };
        }
        return { ...p, index: p.index + 1 };
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [playback]);

  // Auto-save settings to localStorage whenever they change
  useEffect(() => {
    const { perspective, ...saveableSettings } = settings;
    localStorage.setItem('chessSettings', JSON.stringify(saveableSettings));
  }, [settings]);

  // Auto-save piece set to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chessPieceSet', pieceSet);
  }, [pieceSet]);
  
  // Track openings database readiness for loading status UI
  const [dbReady, setDbReady] = useState(false);

  // Preload openings database in background after page is interactive
  useEffect(() => {
    const doLoad = () => {
      console.log('[Preload] Loading openings in background...');
      import('./utils/ecoParser').then(({ loadECO }) => loadECO())
        .then(() => setDbReady(true))
        .catch(() => setDbReady(true)); // Mark ready even on error so UI isn't stuck
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(doLoad);
    } else {
      // Fallback: wait 2 seconds then start loading
      setTimeout(doLoad, 2000);
    }
  }, []); // Run once on mount
  
  useEffect(() => {
    // 3-second hover + 1 second CSS fade transition
    const timer = setTimeout(() => setShowSettingsHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize useGameAnalysis FIRST so analyzedMoves & playback can be used in useEffect hooks below
  const handleEngineNameChange = (engineName) => {
    const statusEl = document.getElementById('engine-status');
    if (statusEl) statusEl.textContent = engineName + ' Ready';
  };

  const {
    engineReady, engineError, reloadEngine, isAnalyzing, isFetchingBookMoves, progress,
    analyzedMoves, positions, gameInfo, analyzeGame, analyzeBranch, makeFreeMove, deleteMovesAfter, pgnError,
    mainLineMoves, restoreMainLine, enrichMove, clearExplanations,
    setAnalyzedMoves, setPositions, setGameInfo,
    liveScore, liveEvalData, startLiveEval, stopLiveEval,
    activeEngineName, engineLoadingStatus
  } = useGameAnalysis(settings, handleEngineNameChange);

  const [welcomeMessage, setWelcomeMessage] = useState("-");

  useEffect(() => {
    if (studyMode) return; // Study Mode sets its own welcome messages in loadChapter
    if (!gameInfo || analyzedMoves.length === 0) {
      setWelcomeMessage("-");
      return;
    }
    const isWhite = settings.perspective !== 'b';
    setWelcomeMessage(getWelcomeMessage(gameInfo, isWhite));
  }, [gameInfo, analyzedMoves.length > 0, settings.perspective, studyMode]);

  // ── Analysis completion logic to ensure UI resets ──
  useEffect(() => {
    if (isAnalyzing) {
      setShareUiOpen(false);
      setGameInfoUiOpen(false);
    }
  }, [isAnalyzing]);

  // ── Study Chapter Loader Logic ─────────────────────────────
  const loadChapter = useCallback((chapter, studyTitleName = '') => {
    if (!chapter) return;
    const is960 = chapter.isChess960 || false;
    const startFen = chapter.startingFen && chapter.startingFen !== 'start' 
      ? chapter.startingFen 
      : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    setIsChess960(is960);
    setChess960Fen(is960 ? startFen : null);
    
    if (chapter.orientation === 'black') {
      setFlipped(true);
    } else {
      setFlipped(false);
    }

    try {
      const chess = new Chess(startFen);
      const positionsList = [chess.fen()];
      const moveResults = [];

      for (let idx = 0; idx < chapter.moves.length; idx++) {
        const m = chapter.moves[idx];
        const moveObj = chess.move(m.san);
        if (!moveObj) break;

        const currentFenPos = chess.fen();

        const explanationText = m.comment || (m.nag ? `Annotation: ${m.nag}` : `Study Move: ${m.san}`);

        moveResults.push({
          san: moveObj.san,
          fen: currentFenPos,
          color: moveObj.color,
          annotation: m.nag || null,
          coachExplanation: {
            text: explanationText,
            isStudy: true,
            isCustom: false,
          },
          whiteScore: null,
          blackScore: null,
          engineTopMoves: [],
          arrows: m.arrows || [],
          circles: m.circles || [],
          autoPlay: !m.comment && !m.nag,
        });
        positionsList.push(currentFenPos);
      }

      loadOpeningsDatabase().then(openingsDb => {
        const sanArr = moveResults.map(m => m.san);
        const bookLimit = openingsDb.getBookDepth(sanArr);
        
        for (let i = 0; i < moveResults.length; i++) {
          if (i < bookLimit) {
            moveResults[i].isBookMove = true;
            moveResults[i].classification = { id: 'book', label: 'Book Move' };
          } else {
            moveResults[i].isBookMove = false;
            moveResults[i].classification = null;
          }
        }
        
        let whiteOpeningInfo = null;
        let blackOpeningInfo = null;
        const deepestOpening = openingsDb.lookupByMoves(sanArr);
        if (deepestOpening) {
          whiteOpeningInfo = { eco: deepestOpening.eco, opening: deepestOpening.name, bookDepth: deepestOpening.bookDepth || bookLimit };
          blackOpeningInfo = { eco: deepestOpening.eco, opening: deepestOpening.name, bookDepth: deepestOpening.bookDepth || bookLimit };
        } else if (bookLimit > 0) {
          const whiteDepth = bookLimit % 2 === 1 ? bookLimit : Math.max(0, bookLimit - 1);
          const blackDepth = bookLimit % 2 === 0 ? bookLimit : Math.max(0, bookLimit - 1);
          
          if (whiteDepth > 0) {
            const whiteOpening = openingsDb.lookupByMoves(sanArr.slice(0, whiteDepth));
            if (whiteOpening) whiteOpeningInfo = { eco: whiteOpening.eco, opening: whiteOpening.name, bookDepth: whiteDepth };
          }
          if (blackDepth > 0) {
            const blackOpening = openingsDb.lookupByMoves(sanArr.slice(0, blackDepth));
            if (blackOpening) blackOpeningInfo = { eco: blackOpening.eco, opening: blackOpening.name, bookDepth: blackDepth };
          }
        }
        
        restoreMainLine();
        setPositions(positionsList);
        setAnalyzedMoves(moveResults);
        
        const chapterTitleName = chapter.title || 'Chapter';
        const studyTitleHeader = studyTitleName || chapter.event || 'Lichess Study';

        const getHeader = (key, fallback) => {
          const val = chapter.headers?.[key];
          return val && val !== '?' ? val : fallback;
        };

        setGameInfo({
          white: getHeader('White', 'White'),
          black: getHeader('Black', 'Black'),
          whiteElo: getHeader('WhiteElo', null),
          blackElo: getHeader('BlackElo', null),
          event: studyTitleHeader,
          date: getHeader('Date', ''),
          result: getHeader('Result', '*'),
          whiteOpeningInfo,
          blackOpeningInfo
        });

        if (chapter.introComment) {
          setWelcomeMessage(chapter.introComment);
        } else {
          setWelcomeMessage(`Loaded Study Chapter: ${chapterTitleName}`);
        }

        setCurrentMoveIndex(-1);
      }).catch(err => {
        console.error('[Study] Error with opening classification during chapter load:', err);
        // Fallback
        restoreMainLine();
        setPositions(positionsList);
        setAnalyzedMoves(moveResults);
        setWelcomeMessage(chapter?.introComment || `Loaded Study Chapter: ${chapterTitleName || ''}`);
        setCurrentMoveIndex(-1);
      });
    } catch (err) {
      console.error('[Study] Error loading chapter:', err);
    }
  }, [setPositions, setAnalyzedMoves, setGameInfo, setWelcomeMessage, restoreMainLine]);

  const loadStudyById = useCallback(async (studyId, targetChapterId = null) => {
    if (!studyId) return;
    setIsStudyLoading(true);
    setStudyError(null);
    setStudyMode(true);

    try {
      const rawPgn = await fetchStudyPgn(studyId);
      const parsed = parseStudyPgn(rawPgn);
      setStudyData({ ...parsed, id: studyId });

      let chapterIdx = 0;
      if (targetChapterId && parsed.chapters) {
        const foundIdx = parsed.chapters.findIndex(c => c.chapterId === targetChapterId);
        if (foundIdx >= 0) chapterIdx = foundIdx;
      }

      setCurrentChapterIndex(chapterIdx);
      if (parsed.chapters && parsed.chapters[chapterIdx]) {
        loadChapter(parsed.chapters[chapterIdx], parsed.title);
      }
    } catch (err) {
      console.error('[Study] Error fetching study:', err);
      setStudyError(err.message || 'Failed to load study.');
    } finally {
      setIsStudyLoading(false);
    }
  }, [loadChapter]);

  const handleSelectChapter = (chapterIdx) => {
    if (!studyData || !studyData.chapters[chapterIdx]) return;
    setCurrentChapterIndex(chapterIdx);
    const chapter = studyData.chapters[chapterIdx];
    
    // Update route to include chapterId if available
    const studyId = studyData.id;
    if (studyId && chapter.chapterId) {
      const newPath = `/learn/${studyId}/${chapter.chapterId}`;
      if (window.location.pathname.toLowerCase() !== newPath.toLowerCase()) {
        window.history.pushState({ modal: newPath }, '', newPath);
      }
    }

    // Clear any active branch/main-line state first to prevent stale restoreMainLine
    // from overwriting the new chapter's moves during loadChapter
    restoreMainLine();
    setCurrentMoveIndex(-1);
    
    loadChapter(chapter, studyData.title);
  };

  const resetToCleanSlate = useCallback(() => {
    setStudyMode(false);
    setStudyData(null);
    setStudyError(null);
    setAnalyzedMoves([]);
    setPositions([]);
    setGameInfo(null);
    setCurrentMoveIndex(-1);
    setRawPgn('');
    setFlipped(false);
    setIsChess960(false);
    setChess960Fen(null);
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }, [setAnalyzedMoves, setPositions, setGameInfo]);

  const handleExitStudy = useCallback(() => {
    resetToCleanSlate();
  }, [resetToCleanSlate]);

  // Handle /learn URL routing
  useEffect(() => {
    const handleRouteCheck = () => {
      const path = window.location.pathname.replace(/\/+$/, '');
      const match = path.match(/^\/learn\/([^\/]+)(?:\/([^\/]+))?/i);
      
      if (match) {
        setStudyMode(true);
        const studyId = match[1];
        const chapterId = match[2] || null;

        if (studyId && (!studyData || studyData.id !== studyId)) {
          loadStudyById(studyId, chapterId);
        }
      } else if (path.toLowerCase().startsWith('/learn')) {
        setStudyMode(true);
        setLearnModalOpen(true);
      }
    };

    handleRouteCheck();
    window.addEventListener('popstate', handleRouteCheck);
    return () => window.removeEventListener('popstate', handleRouteCheck);
  }, [loadStudyById, studyData]);

  // Idle state trigger: Enrich the currently focused move after 300ms of inactivity (bypassed during Study Mode & fast auto-play < 5s)
  useEffect(() => {
    if (studyMode) return; // Bypasses coach explainer generation for study moves
    if (isPlayingMoves && (Number(settings.playInterval) || 2) < 5) return; // Disabled during fast auto-play (< 5s)

    if (currentMoveIndex >= 0 && !isAnalyzing && gameInfo) {
      const timer = setTimeout(() => {
        enrichMove(currentMoveIndex);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentMoveIndex, isAnalyzing, enrichMove, gameInfo, studyMode, isPlayingMoves, settings.playInterval]);

  const lastBoardSoundRef = useRef(null);
  const lastPlaybackSoundRef = useRef(null);

  // Board Sound Trigger (Handles Navigation & Free Play)
  useEffect(() => {
    if (!settings.enableSound || currentMoveIndex < 0) return;

    const move = analyzedMoves[currentMoveIndex];
    if (!move) return;

    const sig = `${currentMoveIndex}-${move.san}`;
    if (lastBoardSoundRef.current === sig) return;
    lastBoardSoundRef.current = sig;

    const san = move.san || '';
    let soundKey = 'move';

    if (san.includes('+') || san.includes('#')) {
      soundKey = 'check';
    } else if (san.includes('O-O')) {
      soundKey = 'castle';
    } else if (san.includes('x')) {
      soundKey = 'capture';
    }

    const audio = audioRefs.current[soundKey];
    if (audio) {
      const audioClone = audio.cloneNode();
      audioClone.play().catch(() => { }); // Silence browser auto-play block errors
    }
  }, [currentMoveIndex, settings.enableSound, analyzedMoves]);

  // Sound Trigger for Engine Playback Line
  useEffect(() => {
    if (!settings.enableSound || !playback?.isActive || playback.index === 0) return;

    const sig = `${playback.index}-${playback.sans[playback.index - 1]}`;
    if (lastPlaybackSoundRef.current === sig) return;
    lastPlaybackSoundRef.current = sig;

    const san = playback.sans[playback.index - 1] || '';
    let soundKey = 'move';

    if (san.includes('+') || san.includes('#')) soundKey = 'check';
    else if (san.includes('O-O')) soundKey = 'castle';
    else if (san.includes('x')) soundKey = 'capture';

    const audio = audioRefs.current[soundKey];
    if (audio) {
      const audioClone = audio.cloneNode();
      audioClone.play().catch(() => { });
    }
  }, [playback?.index, settings.enableSound, playback?.isActive, playback?.sans]);

  // ── READ SHARED LINK ON MOUNT ────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    loadSharedGame(hash)
      .then(decoded => {
        // Hydrate the state with the shared data
        setAnalyzedMoves(decoded.results);
        setPositions(decoded.positions);
        setGameInfo({
          white: decoded.white || 'Shared',
          black: decoded.black || 'Game',
          whiteElo: null, blackElo: null,
          event: 'Review via Link', date: '', result: '*'
        });

        if (decoded.pgnVariant === 'chess960') {
          setIsChess960(true);
          setChess960Fen(decoded.startingFen);
        }

        if (decoded.theme) {
          setSharedTheme(decoded.theme);
        }
        if (decoded.pieceSet) {
          setSharedPieceSet(decoded.pieceSet);
        }
        if (decoded.metrics) {
          setSharedMetrics(decoded.metrics);
        }

        // Jump to the shared move index or the end of the game
        setCurrentMoveIndex(decoded.fromMoveIndex !== undefined && decoded.fromMoveIndex !== null ? decoded.fromMoveIndex : decoded.results.length - 1);
        if (decoded.perspective === 'black') {
          setFlipped(true);
        } else {
          setFlipped(false);
        }

        // Lazily fetch the Opening Info since it's not stored in the URL hash
        const sanArr = decoded.results.map(m => m.san);
        loadOpeningsDatabase().then(openingsDb => {
          const openingResult = openingsDb.lookupByMoves(sanArr);
          const bookLimit = openingsDb.getBookDepth(sanArr);
          let whiteOpeningInfo = null;
          let blackOpeningInfo = null;

          if (openingResult && decoded.pgnVariant !== 'chess960') {
            const whiteDepth = bookLimit % 2 === 1 ? bookLimit : Math.max(0, bookLimit - 1);
            const blackDepth = bookLimit % 2 === 0 ? bookLimit : Math.max(0, bookLimit - 1);
            
            if (whiteDepth > 0) {
              const whiteOpening = openingsDb.lookupByMoves(sanArr.slice(0, whiteDepth));
              if (whiteOpening) whiteOpeningInfo = { eco: whiteOpening.eco, opening: whiteOpening.name, bookDepth: whiteDepth };
            }
            if (blackDepth > 0) {
              const blackOpening = openingsDb.lookupByMoves(sanArr.slice(0, blackDepth));
              if (blackOpening) blackOpeningInfo = { eco: blackOpening.eco, opening: blackOpening.name, bookDepth: blackDepth };
            }
          }
          // Merge opening info seamlessly into the existing gameInfo state
          setGameInfo(prev => prev ? { ...prev, whiteOpeningInfo, blackOpeningInfo } : prev);
        }).catch(() => {});

        // Clean up the URL bar so it looks nice
        window.history.replaceState(null, '', window.location.pathname);
      })
      .catch(err => {
        console.error("Failed to load shared link:", err);
        alert("This shared link appears to be invalid or corrupted.");
      });
  }, []); // Empty dependency array means this runs ONCE when the app loads
  
  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlayingMoves(false);
        setCurrentMoveIndex(prev => {
          setNavDirection(-1);
          return Math.max(-1, prev - 1);
        });
      }

      if (e.key === 'ArrowRight' || (e.key === ' ' && tag !== 'BUTTON')) {
        e.preventDefault();
        setIsPlayingMoves(false);
        if (studyMode && currentMoveIndex >= analyzedMoves.length - 1 && studyData?.chapters && currentChapterIndex < studyData.chapters.length - 1) {
          handleSelectChapter(currentChapterIndex + 1);
        } else {
          setCurrentMoveIndex(prev => {
            setNavDirection(1);
            return Math.min(analyzedMoves.length - 1, prev + 1);
          });
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [analyzedMoves.length, studyMode, currentMoveIndex, studyData, currentChapterIndex, handleSelectChapter]);

  const handleAnalyze = (pgn) => {
    setIsPlayingMoves(false);
    setRawPgn(pgn);
    setCurrentMoveIndex(-1);
    // Pass the generated 960 FEN into the engine so it knows the start position!
    analyzeGame(pgn, isChess960, isChess960 ? chess960Fen : null);
  };

  const hasAutoJumpedRef = useRef(false);

  useEffect(() => {
    // Avoid auto-jumping to keep board steady on user's current move
    if (!isAnalyzing && analyzedMoves.length > 0 && !hasAutoJumpedRef.current) {
      hasAutoJumpedRef.current = true;
    }
  }, [isAnalyzing, analyzedMoves.length]);

  // Reset the flag when a new analysis starts
  useEffect(() => {
    if (isAnalyzing) {
      hasAutoJumpedRef.current = false;
    }
  }, [isAnalyzing]);

  const [navDirection, setNavDirection] = useState(1);

  const goTo = useCallback((idx) => {
    if (studyMode && idx >= analyzedMoves.length && studyData?.chapters && currentChapterIndex < studyData.chapters.length - 1) {
      handleSelectChapter(currentChapterIndex + 1);
      return;
    }
    setCurrentMoveIndex((prev) => {
      setNavDirection(idx > prev ? 1 : idx < prev ? -1 : 0);
      return Math.max(-1, Math.min(analyzedMoves.length - 1, idx));
    });
  }, [analyzedMoves.length, studyMode, studyData, currentChapterIndex, handleSelectChapter]);

  useEffect(() => {
    if (studyMode && currentMoveIndex >= 0 && currentMoveIndex < analyzedMoves.length - 1) {
      if (navDirection === 1) {
        const move = analyzedMoves[currentMoveIndex];
        if (move.autoPlay) {
          const timer = setTimeout(() => {
            goTo(currentMoveIndex + 1);
          }, 600);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [studyMode, currentMoveIndex, analyzedMoves, navDirection, goTo]);

  // Stop move auto-play if game analysis starts or moves are cleared
  useEffect(() => {
    if (isAnalyzing || analyzedMoves.length === 0) {
      setIsPlayingMoves(false);
    }
  }, [isAnalyzing, analyzedMoves.length]);

  // Main moves auto-play effect — advances move list based on settings.playInterval
  useEffect(() => {
    if (!isPlayingMoves) return;

    if (analyzedMoves.length === 0) {
      setIsPlayingMoves(false);
      return;
    }

    if (currentMoveIndex >= analyzedMoves.length - 1) {
      setIsPlayingMoves(false);
      return;
    }

    const intervalSec = Math.max(1, Number(settings.playInterval) || 2);
    const timer = setTimeout(() => {
      goTo(currentMoveIndex + 1);
    }, intervalSec * 1000);

    return () => clearTimeout(timer);
  }, [isPlayingMoves, currentMoveIndex, analyzedMoves.length, settings.playInterval, goTo]);

  const togglePlayMoves = useCallback(() => {
    if (analyzedMoves.length === 0) return;
    if (isPlayingMoves) {
      setIsPlayingMoves(false);
    } else {
      if (playback?.isActive) {
        setPlayback(null);
      }
      if (currentMoveIndex >= analyzedMoves.length - 1) {
        goTo(-1);
      }
      setIsPlayingMoves(true);
    }
  }, [analyzedMoves.length, isPlayingMoves, currentMoveIndex, goTo, playback]);

  const generateShareLink = async (skipWarning = false) => {
    if (analyzedMoves.length === 0) return;

    if (!skipWarning) {
      const hasCustom = analyzedMoves.some(m => m.coachExplanation?.isCustom || m.coachExplanation?.type === 'custom');
      if (hasCustom) {
        setCustomExplanationWarningOpen(true);
        return;
      }
    }

    // Safely determine if the game is 960 based on the manual toggle OR the parsed PGN headers
    const is960Game = isChess960 || (pgnHeaders?.Variant?.toLowerCase().includes('960')) || !!pgnHeaders?.FEN;
    const pgnVariant = is960Game ? 'chess960' : 'standard';

    // Always grab the true starting FEN directly from the parsed positions array!
    const startingFen = is960Game && positions.length > 0 ? positions[0] : undefined;

    try {
      const shareGameInfo = hasCustomGameInfo ? {
        white: customWhiteName || gameInfo?.white || 'White',
        black: customBlackName || gameInfo?.black || 'Black'
      } : gameInfo;
      const shareMetrics = hasCustomGameInfo ? {
        wAcc: customWAcc, bAcc: customBAcc,
        wOp: customWOp, wMg: customWMg, wEg: customWEg,
        bOp: customBOp, bMg: customBMg, bEg: customBEg,
      } : null;

      const { hash } = await shareGame({ 
        analysisResults: analyzedMoves, 
        pgnVariant, 
        startingFen, 
        gameInfo: shareGameInfo,
        theme: shareThemeAndPieces ? settings.boardTheme : null,
        pieceSet: shareThemeAndPieces ? pieceSet : null,
        metrics: shareMetrics,
        fromMoveIndex: shareFromThisMove ? currentMoveIndex : null,
        perspective: sharePerspective
      });
      // Base path without /share_ui
      const basePath = window.location.pathname.replace(/\/share_ui\/?$/i, '/');
      const shareUrl = `${window.location.origin}${basePath}#${hash}`;
      navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard! Anyone can open this to instantly view your analysis.");
    } catch (err) {
      console.error('[Share] Failed to encode:', err);
      alert("Failed to generate share link. Please try again.");
    }
  };

  const handleExportGame = () => {
    if (analyzedMoves.length === 0) return;

    const is960Game = isChess960 || (pgnHeaders?.Variant?.toLowerCase().includes('960')) || !!pgnHeaders?.FEN;
    const pgnVariant = is960Game ? 'chess960' : 'standard';
    const startingFen = is960Game && positions.length > 0 ? positions[0] : undefined;

    const shareGameInfo = hasCustomGameInfo ? {
      white: customWhiteName || gameInfo?.white || 'White',
      black: customBlackName || gameInfo?.black || 'Black'
    } : gameInfo;
    const shareMetrics = hasCustomGameInfo ? {
      wAcc: customWAcc, bAcc: customBAcc,
      wOp: customWOp, wMg: customWMg, wEg: customWEg,
      bOp: customBOp, bMg: customBMg, bEg: customBEg,
    } : null;

    const exportData = {
      format: 'cge',
      version: 1,
      analysisResults: analyzedMoves,
      positions,
      pgnVariant,
      startingFen,
      gameInfo: shareGameInfo,
      theme: shareThemeAndPieces ? settings.boardTheme : null,
      pieceSet: shareThemeAndPieces ? pieceSet : null,
      metrics: shareMetrics,
      fromMoveIndex: shareFromThisMove ? currentMoveIndex : null,
      perspective: sharePerspective
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shareGameInfo?.white || 'White'}_vs_${shareGameInfo?.black || 'Black'}.cge`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadCge = (data) => {
    try {
      if (data.format !== 'cge') throw new Error("Invalid format");
      
      setAnalyzedMoves(data.analysisResults || []);
      if (data.positions) setPositions(data.positions);
      
      const importedGameInfo = data.gameInfo || {
        white: 'Imported',
        black: 'Game',
        whiteElo: null, blackElo: null,
        event: 'Review via CGE', date: '', result: '*'
      };
      setGameInfo(importedGameInfo);

      if (data.pgnVariant === 'chess960') {
        setIsChess960(true);
        setChess960Fen(data.startingFen);
      } else {
        setIsChess960(false);
        setChess960Fen(null);
      }

      if (data.theme) setSharedTheme(data.theme);
      if (data.pieceSet) setSharedPieceSet(data.pieceSet);
      if (data.metrics) setSharedMetrics(data.metrics);

      setCurrentMoveIndex(data.fromMoveIndex !== undefined && data.fromMoveIndex !== null ? data.fromMoveIndex : (data.analysisResults?.length || 1) - 1);
      
      if (data.perspective === 'black') {
        setFlipped(true);
      } else {
        setFlipped(false);
      }

      if (data.analysisResults?.length > 0) {
        const sanArr = data.analysisResults.map(m => m.san);
        loadOpeningsDatabase().then(openingsDb => {
          const bookLimit = openingsDb.getBookDepth(sanArr);
          let whiteOpeningInfo = null;
          let blackOpeningInfo = null;

          if (data.pgnVariant !== 'chess960') {
            const whiteDepth = bookLimit % 2 === 1 ? bookLimit : Math.max(0, bookLimit - 1);
            const blackDepth = bookLimit % 2 === 0 ? bookLimit : Math.max(0, bookLimit - 1);
            
            if (whiteDepth > 0) {
              const whiteOpening = openingsDb.lookupByMoves(sanArr.slice(0, whiteDepth));
              if (whiteOpening) whiteOpeningInfo = { eco: whiteOpening.eco, opening: whiteOpening.name, bookDepth: whiteDepth };
            }
            if (blackDepth > 0) {
              const blackOpening = openingsDb.lookupByMoves(sanArr.slice(0, blackDepth));
              if (blackOpening) blackOpeningInfo = { eco: blackOpening.eco, opening: blackOpening.name, bookDepth: blackDepth };
            }
          }
          setGameInfo(prev => prev ? { ...prev, whiteOpeningInfo, blackOpeningInfo } : prev);
        }).catch(() => {});
      }
      
      setImportOpen(false);
      
    } catch (err) {
      console.error("Failed to load CGE:", err);
      alert("Invalid or corrupted .cge file.");
    }
  };

  const handleShare = () => {
    if (analyzedMoves.length === 0) return;
    setSharePerspective(flipped ? 'black' : 'white');
    setShareUiOpen(true);
  };

  const handleDeleteFrom = useCallback((idx) => setDeleteConfirm(idx), []);

  const confirmDelete = useCallback((idx) => {
    setDeleteConfirm(null);
    deleteMovesAfter(idx);
    setCurrentMoveIndex(Math.min(currentMoveIndex, idx - 1));
  }, [currentMoveIndex, deleteMovesAfter]);

  // ── Derived state ──
  const baseFen = positions.length > 0
    ? (positions[currentMoveIndex + 1] ?? positions[0])
    : (isChess960 && chess960Fen ? chess960Fen : 'start');

  const currentFen = playback?.isActive ? playback.fens[playback.index] : baseFen;
  const evalFen = playback?.isActive ? playback.fens[0] : baseFen; // Anchors evaluation to the root playback position

  // ── Free-play / branch moves ─────────────────────────────────────────────
  const handleMove = useCallback((from, to, promotion) => {
    setIsPlayingMoves(false);
    const positionIndex = currentMoveIndex + 1;
    const ok = makeFreeMove(currentFen, positionIndex, from, to, promotion);
    if (ok) {
      setNavDirection(1);
      setCurrentMoveIndex(positionIndex);
    }
    return ok;
  }, [currentMoveIndex, makeFreeMove, currentFen]);

  const currentResult = analyzedMoves[currentMoveIndex] ?? null;

  // Trigger true live evaluation whenever the eval fen changes!
  useEffect(() => {
    if (!isAnalyzing && engineReady && startLiveEval && stopLiveEval) {
      if (enginePaused || !gameInfo) {
        stopLiveEval(); // Instantly kill the engine to ensure 0% CPU usage
        return;
      }
      
      const timer = setTimeout(() => {
        // Pass the pre-calculated score as a seed to prevent visual flashing while the engine boots up
        let seedScore = null;
        if (!playback?.isActive && currentResult?.whiteScore != null) {
          seedScore = currentResult.whiteScore;
        }
        startLiveEval(evalFen, seedScore); // Anchor the engine to evalFen to stop drift during playback
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [evalFen, isAnalyzing, engineReady, startLiveEval, stopLiveEval, currentResult, playback?.isActive, enginePaused, gameInfo]);

  // When paused, surface the cached engine top moves from analysis for the current board position
  const activeEvalData = useMemo(() => {
    // Only use live engine data if it actually matches the current board position
    const liveMatchesCurrent = liveEvalData?.fen && liveEvalData.fen === evalFen;

    if (!enginePaused && liveMatchesCurrent && liveEvalData?.topMoves?.length > 0) return liveEvalData;
    
    // Primary: use the current move's post-eval data (eval of position AFTER the move was played)
    // This directly represents the engine's analysis of the current board position
    if (currentMoveIndex >= 0) {
      const currentMove = analyzedMoves[currentMoveIndex];
      if (currentMove?.postEvalTopMoves?.length > 0) {
        return { fen: evalFen, depth: !enginePaused ? 0 : (settings.depth || 18), topMoves: currentMove.postEvalTopMoves };
      }
    }

    // Fallback: use the next move's pre-eval data (equivalent, but unavailable for the last move)
    const nextMove = analyzedMoves[currentMoveIndex + 1];
    if (nextMove?.engineTopMoves?.length > 0) {
      return { fen: evalFen, depth: !enginePaused ? 0 : (settings.depth || 18), topMoves: nextMove.engineTopMoves };
    }
    return liveMatchesCurrent ? liveEvalData : null;
  }, [enginePaused, liveEvalData, analyzedMoves, currentMoveIndex, evalFen, settings.depth]);

  // The eval bar now breathes and updates in true real-time from the engine
  let currentScore = liveScore;
  if (enginePaused && activeEvalData?.topMoves?.[0]) {
     const isBlack = (activeEvalData.fen || evalFen).split(' ')[1] === 'b';
     currentScore = isBlack ? -activeEvalData.topMoves[0].score : activeEvalData.topMoves[0].score;
  }

  const isWhiteTurn = playback?.isActive
    ? playback.fens[playback.index].split(' ')[1] === 'w'
    : currentFen !== 'start'
      ? currentFen.split(' ')[1] === 'w'
      : true;

  // Freeze player header highlighting to the start of the engine line during playback,
  // so it neither alternates nor flips to the wrong player.
  const headerIsWhiteTurn = playback?.isActive
    ? playback.fens[0].split(' ')[1] === 'w'
    : baseFen !== 'start'
      ? baseFen.split(' ')[1] === 'w'
      : true;

  // Ensure the board highlights the playback moves, not the player's blunder!
  let displayMove = currentResult;
  if (playback?.isActive) {
    if (playback.index > 0 && playback.moves?.[playback.index - 1]) {
      displayMove = {
        from: playback.moves[playback.index - 1].from,
        to: playback.moves[playback.index - 1].to,
        classification: null // Removes the blunder badge during playback
      };
    } else {
      displayMove = null; // At index 0, show no highlights
    }
  }

  const whiteClock = useMemo(() => {
    for (let i = currentMoveIndex; i >= 0; i--) {
      if (analyzedMoves[i]?.color === 'w' && analyzedMoves[i]?.clock != null)
        return analyzedMoves[i].clock;
    } return null;
  }, [analyzedMoves, currentMoveIndex]);

  const blackClock = useMemo(() => {
    for (let i = currentMoveIndex; i >= 0; i--) {
      if (analyzedMoves[i]?.color === 'b' && analyzedMoves[i]?.clock != null)
        return analyzedMoves[i].clock;
    } return null;
  }, [analyzedMoves, currentMoveIndex]);

  // ── Captured pieces (up to currentMoveIndex, inclusive) ──────────────────
  const { whiteCaptured, blackCaptured, whiteMaterial, blackMaterial } = useMemo(() => {
    const wCap = { q: 0, r: 0, b: 0, n: 0, p: 0 }; // captured BY white
    const bCap = { q: 0, r: 0, b: 0, n: 0, p: 0 }; // captured BY black
    const VALS = { q: 9, r: 5, b: 3, n: 3, p: 1 };
    for (let i = 0; i <= currentMoveIndex; i++) {
      const mv = analyzedMoves[i];
      if (!mv || !mv.captured || mv.captured === 'k') continue;
      if (mv.color === 'w') wCap[mv.captured] = (wCap[mv.captured] || 0) + 1;
      else                  bCap[mv.captured] = (bCap[mv.captured] || 0) + 1;
    }
    const wScore = Object.entries(wCap).reduce((s, [t, n]) => s + (VALS[t] || 0) * n, 0);
    const bScore = Object.entries(bCap).reduce((s, [t, n]) => s + (VALS[t] || 0) * n, 0);
    return {
      whiteCaptured: wCap,
      blackCaptured: bCap,
      whiteMaterial: Math.max(0, wScore - bScore), // white's net advantage
      blackMaterial: Math.max(0, bScore - wScore), // black's net advantage
    };
  }, [analyzedMoves, currentMoveIndex]);

  const pgnHeaders = useMemo(() => {
    if (!rawPgn) return {};
    return parsePGN(rawPgn).headers;
  }, [rawPgn]);

  // ── Server-fetched Game Metrics ───────────────────────────────────────────
  const [serverMetrics, setServerMetrics] = useState(null);
  const lastMetricsPayloadKeyRef = useRef('');

  useEffect(() => {
    if (!isAnalyzing && analyzedMoves.length > 0) {
      if (sharedMetrics) {
        setServerMetrics({
          gameAccuracy: { white: sharedMetrics.wAcc, black: sharedMetrics.bAcc },
          phases: {
            opening: { white: { accuracy: sharedMetrics.wOp }, black: { accuracy: sharedMetrics.bOp } },
            middlegame: { white: { accuracy: sharedMetrics.wMg }, black: { accuracy: sharedMetrics.bMg } },
            endgame: { white: { accuracy: sharedMetrics.wEg }, black: { accuracy: sharedMetrics.bEg } },
          }
        });
        return;
      }
      const wElo = parseInt(gameInfo?.whiteElo, 10) || 0;
      const bElo = parseInt(gameInfo?.blackElo, 10) || 0;
      
      // Deduplicate: only fetch if metrics-relevant fields changed (prevents refetching when coachExplanation is added)
      const payloadKey = `${analyzedMoves.length}-${wElo}-${bElo}-` + analyzedMoves.map(m => `${m.loss}-${m.classification?.id}`).join('|');
      if (lastMetricsPayloadKeyRef.current === payloadKey) return;
      lastMetricsPayloadKeyRef.current = payloadKey;

      // Create a lightweight payload since we only need certain fields for metrics
      const payload = analyzedMoves.map(m => ({
        color: m.color, isBookMove: m.isBookMove, phase: m.phase, loss: m.loss,
        preScore: m.preScore, postScore: m.postScore, classification: m.classification,
        playerMoveUCI: m.playerMoveUCI, engineBestMove: m.engineBestMove
      }));
      fetchGameMetrics(payload, wElo, bElo)
        .then(data => setServerMetrics(data))
        .catch(err => console.error('[Metrics] Failed to fetch:', err));
    } else if (analyzedMoves.length === 0) {
      lastMetricsPayloadKeyRef.current = '';
      setServerMetrics(null);
    }
  }, [isAnalyzing, analyzedMoves, sharedMetrics, gameInfo]);

  const gameAccuracies = serverMetrics?.gameAccuracy || { white: 100, black: 100 };

  // Compute both estimates independently using server metrics
  const [whiteEstElo, blackEstElo] = useMemo(() => {
    return [
      serverMetrics?.whiteElo ?? null,
      serverMetrics?.blackElo ?? null
    ];
  }, [serverMetrics]);

  const showReview       = analyzedMoves.length > 0;
  const showInput        = !showReview || isAnalyzing;
  const analysisComplete = showReview && !isAnalyzing;

  useEffect(() => {
    if (analysisComplete && gameInfo && !hasPromptedPerspectiveRef.current && !perspectiveSelectionOpen && !studyMode) {
      hasPromptedPerspectiveRef.current = true;
      setPerspectiveSelectionOpen(true);
    }
    if (!analysisComplete || !gameInfo) {
      hasPromptedPerspectiveRef.current = false;
    }
  }, [analysisComplete, perspectiveSelectionOpen, gameInfo, studyMode]);

  // Orient board side as per selected perspective after analysis
  useEffect(() => {
    if (analysisComplete && !studyMode) {
      if (settings.autoFlipByPerspective !== false) {
        const isBlack = settings.perspective === 'b' || settings.perspective === 'black';
        setFlipped(isBlack);
      } else {
        setFlipped(false);
      }
    }
  }, [analysisComplete, settings.perspective, settings.autoFlipByPerspective, studyMode]);

  const CHIP_COLOR = {
    brilliant:  { bg: '#e6f7f7', text: '#1BACA6' },
    great:      { bg: '#e8f0f8', text: '#5C8BB0' },
    best:       { bg: '#f0f7e6', text: '#7A9E2A' },
    excellent:  { bg: '#f0f7e6', text: '#7A9E2A' },
    good:       { bg: '#f5f9ee', text: '#5A8A1A' },
    inaccuracy: { bg: '#fef9e6', text: '#C8960A' },
    miss:       { bg: '#fef3e6', text: '#C07810' },
    mistake:    { bg: '#fdeee6', text: '#B85018' },
    blunder:    { bg: '#fce8e8', text: '#C93832' },
    book:       { bg: '#f5eefa', text: '#7D3C98' },
  };
  const chipStyle = currentResult?.classification?.id
    ? CHIP_COLOR[currentResult.classification.id] || { bg: '#f3f4f6', text: '#6b7280' }
    : null;

  // ── Shared UI constants — single source of truth, close over App state ──

  const VAPOR_STYLE = `
    @keyframes vp1 {
      0%   { transform: translate(0px,0px)      rotate(0deg)   scale(1);    border-radius:42% 58% 61% 39%/45% 52% 48% 55%; opacity:.55 }
      18%  { transform: translate(-14px,-9px)   rotate(65deg)  scale(1.18); border-radius:68% 32% 44% 56%/60% 38% 62% 40%; opacity:.28 }
      37%  { transform: translate(10px,-16px)   rotate(130deg) scale(0.88); border-radius:30% 70% 55% 45%/52% 67% 33% 48%; opacity:.62 }
      55%  { transform: translate(16px,7px)     rotate(200deg) scale(1.12); border-radius:58% 42% 38% 62%/42% 55% 45% 58%; opacity:.34 }
      74%  { transform: translate(-8px,14px)    rotate(275deg) scale(0.82); border-radius:48% 52% 68% 32%/65% 30% 70% 35%; opacity:.68 }
      100% { transform: translate(0px,0px)      rotate(360deg) scale(1);    border-radius:42% 58% 61% 39%/45% 52% 48% 55%; opacity:.55 }
    }
    @keyframes vp2 {
      0%   { transform: translate(0px,0px)      rotate(0deg)   scale(1);    border-radius:60% 40% 35% 65%/50% 60% 40% 50%; opacity:.45 }
      22%  { transform: translate(12px,-11px)   rotate(-80deg) scale(1.22); border-radius:35% 65% 62% 38%/68% 35% 65% 32%; opacity:.65 }
      44%  { transform: translate(-15px,-6px)   rotate(-155deg)scale(0.85); border-radius:55% 45% 48% 52%/38% 62% 38% 62%; opacity:.30 }
      66%  { transform: translate(-9px,15px)    rotate(-230deg)scale(1.08); border-radius:42% 58% 70% 30%/55% 42% 58% 45%; opacity:.58 }
      88%  { transform: translate(11px,8px)     rotate(-310deg)scale(0.92); border-radius:65% 35% 42% 58%/32% 68% 32% 68%; opacity:.38 }
      100% { transform: translate(0px,0px)      rotate(-360deg)scale(1);    border-radius:60% 40% 35% 65%/50% 60% 40% 50%; opacity:.45 }
    }
    @keyframes vp3 {
      0%   { transform: translate(0px,0px)      rotate(0deg)   scale(1);    border-radius:50% 50% 40% 60%/60% 38% 62% 40%; opacity:.38 }
      28%  { transform: translate(6px,16px)     rotate(100deg) scale(1.15); border-radius:32% 68% 58% 42%/45% 55% 45% 55%; opacity:.60 }
      52%  { transform: translate(-16px,5px)    rotate(195deg) scale(0.80); border-radius:65% 35% 30% 70%/58% 42% 68% 32%; opacity:.25 }
      76%  { transform: translate(4px,-14px)    rotate(285deg) scale(1.10); border-radius:38% 62% 65% 35%/35% 65% 38% 62%; opacity:.55 }
      100% { transform: translate(0px,0px)      rotate(360deg) scale(1);    border-radius:50% 50% 40% 60%/60% 38% 62% 40%; opacity:.38 }
    }
    @keyframes vp4 {
      0%   { transform: translate(0px,0px)      rotate(0deg)   scale(1);    border-radius:55% 45% 62% 38%/40% 62% 38% 60%; opacity:.50 }
      15%  { transform: translate(-10px,12px)   rotate(-55deg) scale(0.90); border-radius:40% 60% 45% 55%/65% 35% 60% 40%; opacity:.70 }
      42%  { transform: translate(14px,9px)     rotate(-120deg)scale(1.20); border-radius:68% 32% 38% 62%/48% 52% 42% 58%; opacity:.32 }
      68%  { transform: translate(-5px,-16px)   rotate(-200deg)scale(0.85); border-radius:35% 65% 60% 40%/60% 40% 55% 45%; opacity:.60 }
      85%  { transform: translate(12px,-4px)    rotate(-290deg)scale(1.05); border-radius:52% 48% 32% 68%/38% 68% 32% 62%; opacity:.42 }
      100% { transform: translate(0px,0px)      rotate(-360deg)scale(1);    border-radius:55% 45% 62% 38%/40% 62% 38% 60%; opacity:.50 }
    }
    @keyframes vp5 {
      0%   { transform: translate(0px,0px)      rotate(0deg)   scale(1);    border-radius:38% 62% 50% 50%/55% 45% 55% 45%; opacity:.35 }
      30%  { transform: translate(-13px,-13px)  rotate(110deg) scale(1.25); border-radius:62% 38% 35% 65%/42% 58% 48% 52%; opacity:.58 }
      60%  { transform: translate(15px,-3px)    rotate(220deg) scale(0.78); border-radius:45% 55% 68% 32%/62% 38% 35% 65%; opacity:.28 }
      80%  { transform: translate(3px,15px)     rotate(310deg) scale(1.08); border-radius:58% 42% 42% 58%/35% 65% 62% 38%; opacity:.52 }
      100% { transform: translate(0px,0px)      rotate(360deg) scale(1);    border-radius:38% 62% 50% 50%/55% 45% 55% 45%; opacity:.35 }
    }
  `;

  // ── Move eval display helper ───────────────────────────────────────────────
  const formatMoveEval = (move) => {
    if (!move || move.whiteScore == null) return null;
    const ws = move.whiteScore;
    const isWhiteMove = move.color === 'w';
    if (ws >= 9000) {
      const m = 10000 - ws;
      return isWhiteMove ? `+M${m}` : `-M${m}`;
    }
    if (ws <= -9000) {
      const m = 10000 + ws;
      return isWhiteMove ? `-M${m}` : `+M${m}`;
    }
    const sided = isWhiteMove ? ws : -ws;
    return sided >= 0 ? `+${(sided / 100).toFixed(2)}` : (sided / 100).toFixed(2);
  };

  const NavBar = (
    <div className="flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-0.5 sm:gap-1">
      <button onClick={() => { setIsPlayingMoves(false); goTo(-1); }} disabled={currentMoveIndex === -1}
        className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-gray-600 dark:text-slate-400 shrink-0"
        title="First move">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
      <button onClick={() => { setIsPlayingMoves(false); goTo(currentMoveIndex - 1); }} disabled={currentMoveIndex === -1}
        className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-gray-600 dark:text-slate-400 shrink-0"
        title="Previous move">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 px-1 sm:px-2">
        <PlayButton
          isPlaying={isPlayingMoves}
          onToggle={togglePlayMoves}
          disabled={analyzedMoves.length === 0 || isAnalyzing}
        />
        {currentResult ? (
          <>
            {currentResult.classification?.id && (
              <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                <EvalBadge type={currentResult.classification.id} />
              </div>
            )}
            {currentResult.isBranch && !currentResult.classification && (
              <svg className="w-5 h-5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            )}
            <span className="text-[14px] sm:text-[15px] font-bold text-gray-800 dark:text-slate-200 shrink-0">
              {currentResult.moveNumber}
              {currentResult.color === 'b' ? '… ' : '. '}
              {currentResult.san}
            </span>
            {/* Move evaluation — side-relevant, supports mate lines */}
            {formatMoveEval(currentResult) && (
              <span className={`text-[10px] sm:text-[11px] font-black tabular-nums shrink-0 px-1.5 py-0.5 rounded-md ${
                (() => {
                  const v = formatMoveEval(currentResult);
                  if (v && v.includes('M')) return v.startsWith('+') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400';
                  if (v && v.startsWith('+')) return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300';
                  return 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400';
                })()
              }`}>
                {formatMoveEval(currentResult)}
              </span>
            )}
            {chipStyle ? (
              <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap shrink truncate max-w-[65px] min-[400px]:max-w-[100px] sm:max-w-none"
                style={{ background: chipStyle.bg, color: chipStyle.text }}>
                {currentResult.classification.label}
              </span>
            ) : currentResult.isBranch ? (
              <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                Branch
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-xs sm:text-sm text-gray-400 dark:text-slate-500 shrink truncate">Starting Position</span>
        )}
      </div>
      <button onClick={() => { setIsPlayingMoves(false); goTo(currentMoveIndex + 1); }}
        disabled={currentMoveIndex >= analyzedMoves.length - 1}
        className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-gray-600 dark:text-slate-400 shrink-0"
        title="Next move">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button onClick={() => { setIsPlayingMoves(false); goTo(analyzedMoves.length - 1); }}
        disabled={currentMoveIndex >= analyzedMoves.length - 1}
        className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-all text-gray-600 dark:text-slate-400 shrink-0"
        title="Last move">
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  // Coach explanation bar
  // Coach explanations are disabled during auto-play when move interval is < 5 seconds
  const isFastAutoPlaying = isPlayingMoves && (Number(settings.playInterval) || 2) < 5;
  const coachExpl = currentMoveIndex >= 0 ? analyzedMoves[currentMoveIndex]?.coachExplanation : null;
  const moveAnnotationId = currentResult?.classification?.id || (currentResult?.isBookMove ? 'book' : null);
  const coachColorClass = (() => {
    if (moveAnnotationId) {
      if (['blunder', 'mistake', 'miss'].includes(moveAnnotationId)) return 'text-red-600 dark:text-red-400';
      if (moveAnnotationId === 'inaccuracy') return 'text-amber-600 dark:text-amber-400';
      if (['brilliant', 'great', 'best', 'excellent', 'good'].includes(moveAnnotationId)) return 'text-green-600 dark:text-green-400';
      return 'text-blue-600 dark:text-blue-400';
    }
    return coachExpl?.type === 'tactical' ? 'text-green-600 dark:text-green-400' :
      coachExpl?.type === 'blunder' ? 'text-red-600 dark:text-red-400' :
      coachExpl?.type === 'threat'  ? 'text-orange-600 dark:text-orange-400' :
      coachExpl?.type === 'missed'  ? 'text-amber-600 dark:text-amber-400'  : 'text-blue-600 dark:text-blue-400';
  })();
  const coachBadgeType = moveAnnotationId || (
    coachExpl?.type === 'tactical' ? 'tactical' :
    coachExpl?.type === 'blunder' ? 'blunder_coach' :
    coachExpl?.type === 'threat'  ? 'inaccuracy' :
    coachExpl?.type === 'missed'  ? 'missed_coach' : 'best'
  );

  const [currentAvatar, setCurrentAvatar] = useState('book_male.json');

  useEffect(() => {
    if (isFastAutoPlaying) {
      setCurrentAvatar('neutral_male.json');
      return;
    }
    const badgeType = coachBadgeType;
    const moveIdx = currentMoveIndex;
    
    let avatar = 'neutral_male.json';
    if (!gameInfo || moveIdx < 0) {
      avatar = 'book_male.json';
    } else if (['blunder', 'mistake', 'blunder_coach'].includes(badgeType)) {
      avatar = 'blunder_male.json';
    } else if (['brilliant', 'great'].includes(badgeType)) {
      avatar = 'brilliant_male.json';
    } else if (['best', 'excellent', 'good', 'tactical'].includes(badgeType)) {
      avatar = 'male_best.json';
    } else if (['book'].includes(badgeType)) {
      avatar = 'book_male.json';
    }
    
    setCurrentAvatar(avatar);
  }, [coachBadgeType, currentMoveIndex, gameInfo, isFastAutoPlaying]);

  const showHowBtn = false; // Disabled as per request, can be re-enabled later: coachExpl && analyzedMoves[currentMoveIndex]?.engineTopMoves?.[0]?.pv && ['tactical','blunder','blunder_coach','threat','missed','missed_coach'].includes(coachExpl.type);
  const CoachBar = (
    <div className="relative flex-shrink-0 min-h-[110px] lg:min-h-[80px] py-3 flex items-center gap-3 px-2">
      {/* Avatar Container - Left Side */}
      <div className="relative flex-shrink-0 w-[110px] h-[110px] flex items-center justify-center ml-1">
        {/* Persistent Vapor Glow Behind Coach */}
        {settings.showCoachGlow !== false && (
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
            <div className="w-[100px] h-[100px] bg-gradient-to-tr from-blue-500/15 via-purple-500/15 to-pink-500/15 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute w-[60px] h-[60px] bg-gradient-to-br from-cyan-400/15 to-blue-600/15 rounded-full blur-lg animate-bounce" style={{ animationDuration: '3s' }}></div>
          </div>
        )}

        {/* Lottie Avatar */}
        <div className="relative z-10 w-full h-full scale-[1.75] drop-shadow-md">
          <LottieAvatar 
            src={`/lottie/${currentAvatar}`} 
            loop={currentAvatar === 'neutral_male.json' || currentAvatar === 'book_male.json'}
            onComplete={() => setCurrentAvatar('neutral_male.json')}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        </div>
      </div>

      {/* Speech Bubble / Content */}
      <div className="relative flex-1 bg-[#e9ecef] dark:bg-slate-700 rounded-2xl p-4 shadow-sm min-h-[76px] flex flex-col justify-center ml-2">
        {/* Curved SVG Tail — concave curves matching reference */}
        <svg className="absolute -left-[12px] top-1/2 -translate-y-1/2 w-[13px] h-[22px] text-[#e9ecef] dark:text-slate-700" viewBox="0 0 13 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 0 C13 8 1 7 0 11 C1 15 13 14 13 22" fill="currentColor"/>
        </svg>

        {coachExpl && !isFastAutoPlaying ? (
          <div className={`flex items-center gap-2.5 w-full relative z-10 ${coachColorClass}`}>
            {/* Left: badge + optional How? button */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-[18px] h-[18px]">
                <EvalBadge type={coachBadgeType} />
              </div>
              {showHowBtn && (
                <button
                  onClick={() => {
                    if (playback?.isActive) {
                      setPlayback(null);
                    } else {
                      const pv = analyzedMoves[currentMoveIndex].engineTopMoves[0].pv;
                      const preFen = analyzedMoves[currentMoveIndex].preFen;
                      const line = generatePlaybackLine(preFen, pv);
                      if (line && line.fens.length > 1) {
                        setPlayback({ ...line, index: 0, isActive: true, isPlaying: true });
                      }
                    }
                  }}
                  className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-full border shadow-sm transition-all text-[10px] font-bold uppercase tracking-wider ${
                    playback?.isActive
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      : 'bg-white text-[#4a7c59] border-[#4a7c59]/30 hover:bg-[#4a7c59] hover:text-white'
                  }`}
                >
                  {playback?.isActive ? (
                    <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>Close</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>How?</>
                  )}
                </button>
              )}
            </div>
            {/* Right: tactic label + explanation text */}
            <div className="flex flex-col justify-center flex-1 min-w-0">
              {coachExpl.tacticType && (
                <span className="text-xs font-black uppercase tracking-widest opacity-80 mb-0.5">
                  {getTacticLabel(coachExpl.tacticType)}
                </span>
              )}
              {/* Scrollable explanation box for long lines */}
              <div className="overflow-y-auto max-h-[140px] lg:max-h-[100px] pr-2 custom-scrollbar">
                <style>{`
                  @keyframes coachFadeUp {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                  }
                  .animate-coach-fade-up {
                    animation: coachFadeUp 0.4s ease-out forwards;
                  }
                `}</style>
                <span 
                  key={coachExpl.text}
                  className="text-[14.5px] leading-relaxed font-medium block text-gray-800 dark:text-slate-200 opacity-0 animate-coach-fade-up whitespace-pre-wrap"
                >
                  <AnimatedTypewriterText text={coachExpl.text} />
                </span>
              </div>
            </div>
          </div>
        ) : isFastAutoPlaying ? (
          <div className="flex items-center gap-2.5 w-full relative z-10 text-gray-600 dark:text-slate-300">
            <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[#4a7c59]">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-xs sm:text-[13.5px] font-medium text-gray-500 dark:text-slate-400 italic">
              Auto-playing moves (coach explanations are disabled for play interval &lt; 5s)
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-start w-full relative z-10 text-gray-700 dark:text-slate-300 font-medium">
            {(!showReview || isAnalyzing) ? (
              <WelcomeMessage />
            ) : currentMoveIndex < 0 ? (
              <span key={welcomeMessage} className="text-[14.5px] leading-relaxed font-medium block whitespace-pre-wrap">
                {welcomeMessage !== "-" ? welcomeMessage : ""}
              </span>
            ) : (
              <span className="text-xl font-medium leading-none">-</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Playback controls — rendered as its own bar BELOW CoachBar, only when active
  const PlaybackControls = playback?.isActive ? (
    <div className="flex-shrink-0 flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-sm flex-wrap">
      {/* Play / Pause */}
      <button onClick={() => setPlayback(p => ({ ...p, isPlaying: !p.isPlaying }))}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shadow-sm flex-shrink-0 ${
          playback.isPlaying
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-[#4a7c59] text-white border border-[#3d6b4a] hover:bg-[#3d6b4a]'
        }`}>
        {playback.isPlaying
          ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
          : <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        }
      </button>
      {/* Jump to start */}
      <button onClick={() => setPlayback(p => ({ ...p, index: 0, isPlaying: false }))}
        disabled={playback.index === 0}
        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors shadow-sm flex-shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
      </button>
      {/* Step back */}
      <button onClick={() => setPlayback(p => ({ ...p, index: Math.max(0, p.index - 1), isPlaying: false }))}
        disabled={playback.index === 0}
        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors shadow-sm flex-shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
      </button>
      {/* Move label */}
      <span className="text-[13px] font-mono font-bold text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm min-w-[52px] text-center flex-shrink-0">
        {playback.index === 0 ? 'Start' : playback.sans[playback.index - 1]}
      </span>
      {/* Step forward */}
      <button onClick={() => setPlayback(p => ({ ...p, index: Math.min(p.fens.length - 1, p.index + 1), isPlaying: false }))}
        disabled={playback.index === playback.fens.length - 1}
        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors shadow-sm flex-shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
      </button>
      <button onClick={() => setPlayback(p => ({ ...p, index: p.fens.length - 1, isPlaying: false }))}
        disabled={playback.index === playback.fens.length - 1}
        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors shadow-sm flex-shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7m-8-14l7 7-7 7" /></svg>
      </button>
      {/* Counter */}
      <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 ml-auto flex-shrink-0">
        Engine line {playback.index}/{playback.fens.length - 1}
      </span>
    </div>
  ) : null;

  // Keyboard hint
  const HintText = (
    <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center select-none">
      ← → keys · click or drag pieces · click graph to jump
    </p>
  );

  const currentBadgeType = currentResult?.classification?.id || (currentResult ? 'book' : null);
  const currentBadgeLabel = currentResult?.classification?.label || (currentResult ? 'Book Move' : 'Starting Position');
  const currentBadgeStyle = currentResult?.classification?.id
    ? CHIP_COLOR[currentResult.classification.id] || { bg: '#f3f4f6', text: '#6b7280' }
    : CHIP_COLOR['book'];

  const MoveListElement = (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 shadow-sm">
      <div className="overflow-y-auto flex-1 min-h-0">
        <MoveList
            moves={analyzedMoves}
            mainLineMoves={mainLineMoves}
            currentMoveIndex={currentMoveIndex}
            onMoveClick={(idx) => { setIsPlayingMoves(false); goTo(idx); }}
            onMainLineClick={(idx) => {
              setIsPlayingMoves(false);
              if (mainLineMoves.length > 0) restoreMainLine();
              setCurrentMoveIndex(idx);
            }}
            onDeleteFrom={handleDeleteFrom}
            playback={playback}
            currentMove={analyzedMoves[currentMoveIndex] || null}
            liveEvalData={activeEvalData}
            baseFen={evalFen}
            isAnalyzing={isAnalyzing}
            analysisComplete={analysisComplete}
            showEngineLines={settings.showEngineLines !== false}
            enginePaused={enginePaused}
            setEnginePaused={setEnginePaused}
            onCloseEngineLines={() => setSettings(s => ({ ...s, showEngineLines: false }))}
            onEngineLineClick={(index) => setPlayback(p => ({ ...p, index, isPlaying: false }))}
            onNewEngineLinePlay={(uciPvStr) => {
              const line = generatePlaybackLine(evalFen, uciPvStr);
              if (line && line.fens.length > 1) {
                setPlayback({ ...line, index: 0, isActive: true, isPlaying: false });
              }
            }}
            engineName={activeEngineName}
          />
      </div>
    </div>
  );

  const handleOpenGameInfoUi = () => {
    setCustomWhiteName(gameInfo?.white || pgnHeaders?.White || 'White');
    setCustomBlackName(gameInfo?.black || pgnHeaders?.Black || 'Black');
    
    const wAcc = serverMetrics?.gameAccuracy?.white;
    const bAcc = serverMetrics?.gameAccuracy?.black;
    setCustomWAcc(studyMode ? '-' : (typeof wAcc === 'object' ? (wAcc?.accuracy ?? 100) : (wAcc ?? 100)));
    setCustomBAcc(studyMode ? '-' : (typeof bAcc === 'object' ? (bAcc?.accuracy ?? 100) : (bAcc ?? 100)));
    
    setCustomWOp(studyMode ? '-' : (serverMetrics?.phases?.opening?.white?.accuracy ?? 100));
    setCustomWMg(studyMode ? '-' : (serverMetrics?.phases?.middlegame?.white?.accuracy ?? 100));
    setCustomWEg(studyMode ? '-' : (serverMetrics?.phases?.endgame?.white?.accuracy ?? 100));
    
    setCustomBOp(studyMode ? '-' : (serverMetrics?.phases?.opening?.black?.accuracy ?? 100));
    setCustomBMg(studyMode ? '-' : (serverMetrics?.phases?.middlegame?.black?.accuracy ?? 100));
    setCustomBEg(studyMode ? '-' : (serverMetrics?.phases?.endgame?.black?.accuracy ?? 100));
    
    setGameInfoUiOpen(true);
    window.history.pushState({ modal: '/share_ui/game_info' }, '', '/share_ui/game_info');
  };

  const handleSaveGameInfo = () => {
    setGameInfoSaved(true);
    setHasCustomGameInfo(true);
    
    // Immediately apply edited metrics so the UI reflects them
    setSharedMetrics({
      wAcc: customWAcc, bAcc: customBAcc,
      wOp: customWOp, wMg: customWMg, wEg: customWEg,
      bOp: customBOp, bMg: customBMg, bEg: customBEg,
    });

    setTimeout(() => {
      setGameInfoSaved(false);
      setGameInfoUiOpen(false);
      const basePath = window.location.pathname.replace(/\/share_ui\/game_info\/?$/i, '/share_ui');
      window.history.pushState({ modal: basePath }, '', basePath);
    }, 1500);
  };

  const displayGameInfo = hasCustomGameInfo ? {
    ...gameInfo,
    white: customWhiteName || gameInfo?.white || 'White',
    black: customBlackName || gameInfo?.black || 'Black'
  } : gameInfo;

  const ShareUIPlaceholder = (
    <div className="flex-1 flex flex-col gap-4 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-gray-800 dark:text-slate-200">Share Game</h2>
          {!gameInfoUiOpen && (
            <button onClick={handleOpenGameInfoUi} className="px-3 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-sm font-bold text-gray-700 dark:text-slate-200 transition-colors">
              Edit Game Info
            </button>
          )}
        </div>
        <button onClick={() => {
          if (gameInfoUiOpen) {
            setGameInfoUiOpen(false);
            const basePath = window.location.pathname.replace(/\/share_ui\/game_info\/?$/i, '/share_ui');
            window.history.pushState({ modal: basePath }, '', basePath);
          } else {
            setShareUiOpen(false);
          }
        }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-2 custom-scrollbar">
        {gameInfoUiOpen ? (
          <div className="flex flex-col gap-5 relative h-full">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">Edit Game Info</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700 dark:text-slate-300">White Player</label>
                <input type="text" value={customWhiteName} onChange={(e) => setCustomWhiteName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200" />
                <label className="text-xs font-bold text-gray-500 mt-2">Accuracy</label>
                <input type="text" value={customWAcc} onChange={(e) => setCustomWAcc(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200" />
                <label className="text-xs font-bold text-gray-500 mt-2">Opening / Middle / End</label>
                <div className="flex gap-2">
                  <input type="text" value={customWOp} onChange={(e) => setCustomWOp(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs" />
                  <input type="text" value={customWMg} onChange={(e) => setCustomWMg(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs" />
                  <input type="text" value={customWEg} onChange={(e) => setCustomWEg(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Black Player</label>
                <input type="text" value={customBlackName} onChange={(e) => setCustomBlackName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200" />
                <label className="text-xs font-bold text-gray-500 mt-2">Accuracy</label>
                <input type="text" value={customBAcc} onChange={(e) => setCustomBAcc(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-800 dark:text-slate-200" />
                <label className="text-xs font-bold text-gray-500 mt-2">Opening / Middle / End</label>
                <div className="flex gap-2">
                  <input type="text" value={customBOp} onChange={(e) => setCustomBOp(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs" />
                  <input type="text" value={customBMg} onChange={(e) => setCustomBMg(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs" />
                  <input type="text" value={customBEg} onChange={(e) => setCustomBEg(e.target.value)} className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-xs" />
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 flex justify-end relative">
              {/* Save Notification Overlay */}
              <div
                className={`absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                  gameInfoSaved ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div
                  className={`flex items-center gap-2 px-6 py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl shadow-sm border border-green-200 dark:border-green-800/50 transform transition-transform duration-300 ${
                    gameInfoSaved ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-bold tracking-tight">Saved !</span>
                </div>
              </div>
              <button 
                onClick={handleSaveGameInfo}
                className="px-5 py-2.5 bg-[#4a7c59] text-white rounded-lg font-bold hover:bg-[#3d6649] transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Annotation Box Utilities */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentBadgeType && (
                <div className="w-8 h-8">
                  <EvalBadge type={currentBadgeType} />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Annotation</span>
                <span className="font-black text-lg leading-none mt-0.5" style={{ color: currentBadgeStyle?.text || '#6b7280' }}>
                  {currentBadgeLabel}
                </span>
              </div>
            </div>
            {currentResult && (
              <div className="relative">
                <button 
                  onClick={() => setAnnotationDropdownOpen(!annotationDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm text-xs font-bold text-gray-700 dark:text-slate-300">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
                
                {annotationDropdownOpen && (
                  <>
                    {/* Invisible backdrop to close dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setAnnotationDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 py-1.5 overflow-hidden">
                      {[
                        { id: 'brilliant', label: 'Brilliant' },
                        { id: 'great', label: 'Great Find' },
                        { id: 'best', label: 'Best Move' },
                        { id: 'excellent', label: 'Excellent' },
                        { id: 'good', label: 'Good' },
                        { id: 'inaccuracy', label: 'Inaccuracy' },
                        { id: 'miss', label: 'Miss' },
                        { id: 'mistake', label: 'Mistake' },
                        { id: 'blunder', label: 'Blunder' },
                        { id: 'book', label: 'Book Move' }
                      ].map(annot => (
                        <button
                          key={annot.id}
                          onClick={() => {
                            const newMoves = [...analyzedMoves];
                            newMoves[currentMoveIndex] = {
                              ...newMoves[currentMoveIndex],
                              classification: { id: annot.id, label: annot.label }
                            };
                            setAnalyzedMoves(newMoves);
                            setAnnotationDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                        >
                          <div className="w-4 h-4 shrink-0"><EvalBadge type={annot.id} /></div>
                          <span style={{ color: CHIP_COLOR[annot.id]?.text || '#6b7280' }} className="font-bold text-[13px]">{annot.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editable Explanation Box */}
        <EditableExplanation 
          currentResult={currentResult} 
          currentMoveIndex={currentMoveIndex} 
          analyzedMoves={analyzedMoves} 
          setAnalyzedMoves={setAnalyzedMoves} 
        />
        
        {/* Custom Theme and Piece Set Toggle */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4 shadow-sm flex-shrink-0 flex items-center justify-between cursor-pointer" onClick={() => setShareThemeAndPieces(!shareThemeAndPieces)}>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Include custom theme and pieces</span>
            <span className="text-[11px] text-gray-500 dark:text-slate-400">The receiver will see your exact board theme and pieces just for this game.</span>
          </div>
          <div className={`w-11 h-6 rounded-full p-1 transition-colors ${shareThemeAndPieces ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shareThemeAndPieces ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Share from this move Toggle */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4 shadow-sm flex-shrink-0 flex items-center justify-between cursor-pointer" onClick={() => setShareFromThisMove(!shareFromThisMove)}>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Load this position of game on opening shared link</span>
            <span className="text-[11px] text-gray-500 dark:text-slate-400">The receiver will see the board at this position when the link is opened.</span>
          </div>
          <div className={`w-11 h-6 rounded-full p-1 transition-colors ${shareFromThisMove ? 'bg-[#4a7c59]' : 'bg-gray-300 dark:bg-slate-600'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shareFromThisMove ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Perspective Dropdown */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-4 shadow-sm flex-shrink-0 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Perspective</span>
            <span className="text-[11px] text-gray-500 dark:text-slate-400">Choose which side the board is flipped to.</span>
          </div>
          <select 
            value={sharePerspective}
            onChange={(e) => setSharePerspective(e.target.value)}
            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-sm font-bold text-gray-800 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4a7c59] cursor-pointer"
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
        </>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-slate-700 mt-auto flex-shrink-0 flex gap-2">
        <button onClick={() => generateShareLink()}
          title="Generate a shareable link for this game review"
          className="flex-1 flex items-center justify-center gap-2 bg-[#4a7c59] hover:bg-[#3d6b4a] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
        <button onClick={() => handleExportGame()}
          title="Download a .cge file containing the full game state"
          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );

  // Derive best move SAN + display eval from activeEvalData
  const bestMoveInfo = useMemo(() => {
    const topMove = activeEvalData?.topMoves?.[0];
    if (!topMove?.move) return null;

    // Convert UCI move (e.g. "e2e4") to SAN (e.g. "e4") using the current board FEN
    const fen = activeEvalData?.fen || evalFen;
    if (!fen || fen === 'start') return null;

    let san = topMove.move; // fallback to UCI if conversion fails
    try {
      const tempChess = new Chess(fen);
      const uci = topMove.move;
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const moveObj = tempChess.move({ from, to, promotion });
      if (moveObj) san = moveObj.san;
    } catch (_) { /* keep UCI fallback */ }

    // Score: engine reports from side-to-move's perspective
    // Show as white-relative: positive = good for white
    const sideToMove = fen.split(' ')[1] || 'w';
    const rawScore = topMove.score;
    const whiteRelativeScore = sideToMove === 'w' ? rawScore : -rawScore;

    // Format eval string
    let evalStr;
    if (topMove.mate != null) {
      const mateIn = topMove.mate;
      const whiteMate = sideToMove === 'w' ? mateIn : -mateIn;
      evalStr = whiteMate > 0 ? `+M${Math.abs(whiteMate)}` : `-M${Math.abs(whiteMate)}`;
    } else {
      const val = whiteRelativeScore / 100;
      evalStr = val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
    }

    return { san, evalStr, whiteRelativeScore, sideToMove };
  }, [activeEvalData, evalFen]);

  const StudyBarUI = studyMode ? (
    <div className="flex-1 min-h-0 flex flex-col mb-2">
      <StudyBar
        studyTitle={studyData?.title || (isStudyLoading ? 'Loading study from Lichess...' : 'Lichess Study')}
        chapters={studyData?.chapters || []}
        currentChapterIndex={currentChapterIndex}
        currentMoveIndex={currentMoveIndex}
        totalMoves={analyzedMoves.length}
        onSelectChapter={handleSelectChapter}
        onExitStudy={handleExitStudy}
      />
    </div>
  ) : null;

  const BestEngineMoveUI = (displayGameInfo || studyMode) && showReview && !isAnalyzing ? (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3 flex items-center justify-between transition-all mt-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400">
            {currentResult ? 'Best Move Was' : 'Best Move'}
          </span>
          {activeEvalData?.depth > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              Depth {activeEvalData.depth}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-1 min-h-[20px]">
          {bestMoveInfo ? (
            <>
              <span className="text-lg font-black text-gray-800 dark:text-slate-100 leading-none">
                {currentResult?._deferredData?.bestMoveSan || bestMoveInfo.san}
              </span>
              <span className={`text-[13px] font-bold tabular-nums ${
                bestMoveInfo.whiteRelativeScore > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : bestMoveInfo.whiteRelativeScore < 0
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-500 dark:text-slate-400'
              }`}>
                {bestMoveInfo.evalStr}
              </span>
            </>
          ) : (
            <span className="text-sm font-bold text-gray-400 dark:text-slate-500 italic">
              {enginePaused ? 'Engine paused' : 'Calculating...'}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => setEnginePaused(p => !p)}
        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm flex-shrink-0 ${
          !enginePaused
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-[#4a7c59] text-white border border-[#3d6b4a] hover:bg-[#3d6b4a]'
        }`}
        title={!enginePaused ? "Pause Engine" : "Resume Engine"}
      >
        {!enginePaused
          ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
          : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        }
      </button>
    </div>
  ) : null;

  return (
    <>
      <SettingsModal
        isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}
        settings={settings} onSave={setSettings}
        pieceSet={pieceSet} onPieceSetChange={setPieceSet}
        activeEngineName={activeEngineName}
      />
      {whatsNewOpen && <WhatsNew onClose={() => { setWhatsNewOpen(false); setMoreOpen(true); }} />}
      <PerspectiveSelectionModal
        isOpen={perspectiveSelectionOpen}
        gameInfo={displayGameInfo}
        onSelect={(color) => {
          setSettings(s => ({ ...s, perspective: color }));
          if (settings.autoFlipByPerspective !== false) {
            setFlipped(color === 'b' || color === 'black');
          } else {
            setFlipped(false);
          }
          clearExplanations();
          setPerspectiveSelectionOpen(false);
        }}
      />
      {thanksOpen && <ThanksModal isOpen={thanksOpen} onClose={() => { setThanksOpen(false); setMoreOpen(true); }} />}
      <BugFixesModal isOpen={bugFixesOpen} onClose={() => { setBugFixesOpen(false); setMoreOpen(true); }} />
      <ContactModal isOpen={contactOpen} onClose={() => { setContactOpen(false); setMoreOpen(true); }} />
      <DevNoteModal isOpen={devNoteOpen} onClose={() => { setDevNoteOpen(false); setMoreOpen(true); }} />
      <AboutModal isOpen={aboutOpen} onClose={() => { setAboutOpen(false); setMoreOpen(true); }} />
      <FAQModal isOpen={faqOpen} onClose={() => { setFaqOpen(false); setMoreOpen(true); }} />
      <AnalysisInfoModal isOpen={analysisInfoOpen} onClose={() => { setAnalysisInfoOpen(false); setMoreOpen(true); }} />
      <VersionInfoModal isOpen={versionInfoOpen} onClose={() => { setVersionInfoOpen(false); setMoreOpen(true); }} />
      <GameImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onAnalyze={(pgn) => {
          setImportOpen(false);
          handleAnalyze(pgn);
        }}
      />
      <MoreModal 
        isOpen={moreOpen} 
        onClose={() => setMoreOpen(false)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
        onOpenBugFixes={() => setBugFixesOpen(true)}
        onOpenThanks={() => setThanksOpen(true)}
        onOpenContact={() => setContactOpen(true)}
        onOpenDevNote={() => setDevNoteOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenFAQ={() => setFaqOpen(true)}
        onOpenAnalysis={() => setAnalysisInfoOpen(true)}
        onOpenVersionInfo={() => setVersionInfoOpen(true)}
      />

      {deleteConfirm !== null && (
        <DeleteConfirm
          moveIdx={deleteConfirm}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#f7f7f5] dark:bg-slate-900 flex flex-col">

        {/* ── Header ── */}
        <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm z-10">
          <div className="max-w-full px-3 sm:px-4 py-2 sm:py-0 sm:h-12 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-0">

            {/* Logo area */}
            <div className="flex items-center gap-2 w-full sm:w-auto min-w-0 flex-1">
              <img 
                src="/channel_icon.svg" 
                alt="BoardSight Icon" 
                className="w-7 h-7 rounded-lg flex-shrink-0 object-contain" 
              />
              <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
                <span className="font-black text-gray-800 dark:text-slate-300 text-lg sm:text-xl tracking-tight shrink-0">BoardSight</span>
                <span className="text-xs sm:text-sm font-bold text-[#4a7c59] dark:text-[#65a377] bg-[#4a7c59]/10 dark:bg-[#4a7c59]/20 border border-[#4a7c59]/20 dark:border-[#4a7c59]/30 px-2.5 py-1 rounded-md shadow-sm whitespace-nowrap truncate ml-auto sm:ml-4">
                  Updated 03/10/2026
                </span>
              </div>
            </div>

            {/* Buttons Area */}
            <div className="flex items-center justify-between gap-1 sm:gap-2 w-full sm:w-auto pb-1 sm:pb-0">

              <a
                href="https://discord.gg/EDZMXXDvJN"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] px-1 sm:px-3 py-1.5 rounded-lg transition-all shadow-sm min-w-0"
                title="Join our Discord Community"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="currentColor" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z" />
                </svg>
                <span className="truncate sm:hidden">Discord</span>
                <span className="truncate hidden sm:inline">Join Discord!</span>
              </a>

              {showReview && (
                <button onClick={handleShare}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-bold text-white
                    bg-[#4a7c59] hover:bg-[#3d6b4a] border border-[#4a7c59]
                    px-2 sm:px-3 py-1.5 rounded-lg transition-all shadow-sm min-w-0">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="truncate">Share</span>
                </button>
              )}

              <button onClick={resetToCleanSlate}
                className="flex-1 sm:flex-none flex items-center justify-center text-[11px] sm:text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-[#4a7c59] dark:hover:text-slate-200
                  border border-gray-200 dark:border-slate-700 hover:border-[#4a7c59]/30 dark:hover:border-slate-600 bg-gray-50 dark:bg-slate-800 hover:bg-[#4a7c59]/5 dark:hover:bg-slate-750
                  px-1 sm:px-3 py-1.5 rounded-lg transition-all min-w-0">
                <span className="truncate">New Review</span>
              </button>

              <button onClick={() => setMoreOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[11px] sm:text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100
                  bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600
                  px-1 sm:px-3 py-1.5 rounded-lg transition-all shadow-sm min-w-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="truncate">More</span>
              </button>

              <div className="flex-1 sm:flex-none flex relative">
                <button onClick={() => { setSettingsOpen(true); setShowSettingsHint(false); }}
                  className="w-full flex items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-semibold text-gray-500 dark:text-slate-400
                    hover:text-[#4a7c59] dark:hover:text-slate-200 border border-gray-200 dark:border-slate-700 hover:border-[#4a7c59]/30 dark:hover:border-slate-600
                    bg-gray-50 dark:bg-slate-800 hover:bg-[#4a7c59]/5 dark:hover:bg-slate-750 px-1 sm:px-3 py-1.5 rounded-lg transition-all min-w-0">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">Settings</span>
                </button>

                <div className={`absolute top-full right-0 mt-2 pointer-events-none flex flex-col items-end transition-opacity duration-1000 z-50 ${showSettingsHint ? 'opacity-100' : 'opacity-0'}`}>
                  <svg className="w-8 h-8 text-orange-500 animate-bounce -mb-1 mr-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M50,90 Q30,50 50,15" strokeDasharray="8 8" />
                    <polyline points="30,35 50,10 70,35" strokeDasharray="none" />
                  </svg>
                  <span className="text-[11px] sm:text-xs font-bold text-orange-600 whitespace-nowrap bg-orange-50/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-md border border-orange-200 italic mr-2">
                    configure your analysis
                  </span>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 px-2 sm:px-3 py-2 lg:min-h-0 lg:overflow-hidden flex justify-center">
          <div className="w-full flex flex-col lg:flex-row justify-center gap-4 lg:gap-6 xl:gap-8 lg:h-full max-w-[1600px]">

            {/* ══════════════════════════════════════════
                LEFT COLUMN — board + compact player rows
            ══════════════════════════════════════════ */}
            <div className="w-full lg:w-[calc(100vh-170px)] lg:max-w-[750px] flex flex-col gap-1.5 min-h-0 lg:h-full lg:min-w-0 flex-shrink-0">

              <div className="flex-shrink-0">
                {flipped ? (
                  <PlayerHeader
                    name={displayGameInfo?.white || pgnHeaders.White || 'White'}
                    rating={displayGameInfo?.whiteElo || pgnHeaders.WhiteElo}
                    clock={whiteClock}
                    isActive={headerIsWhiteTurn && showReview}
                    side="white"
                    estElo={whiteEstElo}
                    capturedPieces={showReview ? whiteCaptured : null}
                    materialScore={showReview ? whiteMaterial : 0}
                  />
                ) : (
                  <PlayerHeader
                    name={displayGameInfo?.black || pgnHeaders.Black || 'Black'}
                    rating={displayGameInfo?.blackElo || pgnHeaders.BlackElo}
                    clock={blackClock}
                    isActive={!headerIsWhiteTurn && showReview}
                    side="black"
                    estElo={blackEstElo}
                    capturedPieces={showReview ? blackCaptured : null}
                    materialScore={showReview ? blackMaterial : 0}
                  />
                )}
              </div>

              <div className="w-full lg:flex-1 lg:min-h-0 flex items-center justify-center">
                <div className="w-full h-auto lg:w-auto lg:h-full max-w-full max-h-full aspect-square relative mx-auto shrink-0">
                  <div className="absolute inset-0">
                    <BoardPanel
                      fen={currentFen || 'start'}
                      score={analysisComplete ? currentScore : 0}
                      isWhiteTurn={isWhiteTurn}
                      pieceSet={sharedPieceSet || pieceSet}
                      boardTheme={sharedTheme || settings.boardTheme}
                      currentMove={displayMove}
                      showArrow={!!currentResult}
                      onMove={handleMove}
                      flipped={flipped}
                      studyArrows={currentMoveIndex < 0 ? (gameInfo?.introArrows || []) : (displayMove?.arrows || [])}
                      studyCircles={currentMoveIndex < 0 ? (gameInfo?.introCircles || []) : (displayMove?.circles || [])}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                {flipped ? (
                  <PlayerHeader
                    name={displayGameInfo?.black || pgnHeaders.Black || 'Black'}
                    rating={displayGameInfo?.blackElo || pgnHeaders.BlackElo}
                    clock={blackClock}
                    isActive={!headerIsWhiteTurn && showReview}
                    side="black"
                    estElo={blackEstElo}
                    capturedPieces={showReview ? blackCaptured : null}
                    materialScore={showReview ? blackMaterial : 0}
                  />
                ) : (
                  <PlayerHeader
                    name={displayGameInfo?.white || pgnHeaders.White || 'White'}
                    rating={displayGameInfo?.whiteElo || pgnHeaders.WhiteElo}
                    clock={whiteClock}
                    isActive={headerIsWhiteTurn && showReview}
                    side="white"
                    estElo={whiteEstElo}
                    capturedPieces={showReview ? whiteCaptured : null}
                    materialScore={showReview ? whiteMaterial : 0}
                  />
                )}
              </div>

              <div className="lg:hidden flex flex-col gap-1.5 flex-shrink-0">
                {!shareUiOpen && (
                  <>
                    {CoachBar}
                    {PlaybackControls}
                    {NavBar}
                    {HintText}
                  </>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════
                RIGHT COLUMN — PC/tablet only layout
            ══════════════════════════════════════════ */}
            <div className="w-full lg:flex-1 flex flex-col gap-2 min-h-0 lg:h-full lg:overflow-hidden transition-all duration-300">

              {/* CoachBar at the very top of the right column on Desktop */}
              {!isAnalyzing && (
                <div className="hidden lg:block flex-shrink-0">
                  {CoachBar}
                </div>
              )}

              {!isAnalyzing && !displayGameInfo && analyzedMoves.length === 0 && (
                <div className="flex-1 flex flex-col gap-2 min-h-0 pb-2">
                  <PGNInput
                    onAnalyze={handleAnalyze}
                    disabled={isAnalyzing}
                    engineReady={engineReady}
                    engineError={engineError}
                    onRetryEngine={reloadEngine}
                    onOpenSettings={() => setSettingsOpen(true)}
                    pgnError={pgnError}
                    isChess960={isChess960}
                    onToggle960={() => {
                      const next = !isChess960;
                      setIsChess960(next);
                      setChess960Fen(next ? generate960Fen() : null);
                    }}
                    onOpenImport={() => setImportOpen(true)}
                    engineName={activeEngineName}
                    dbReady={dbReady}
                    engineLoadingStatus={engineLoadingStatus}
                    onLoadCge={handleLoadCge}
                    onOpenStudy={loadStudyById}
                    showStudyModal={learnModalOpen}
                    setShowStudyModal={setLearnModalOpen}
                  />
                </div>
              )}

              {isAnalyzing && (
                <div className="flex-shrink-0">
                  <AnalysisProgress current={progress.current} total={progress.total} isFetchingBookMoves={isFetchingBookMoves} />
                </div>
              )}

              {/* ── DESKTOP / TABLET (SPLIT LAYOUT - AFTER ANALYSIS) ── */}
              {analysisComplete && (
                <div className="hidden lg:flex flex-row gap-4 flex-1 min-h-0 overflow-hidden">
                  
                  {/* Left Column: Graph + Opening (Stacked) */}
                  <div className="w-[45%] xl:w-[40%] flex flex-col gap-2 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-1">
                    {!displayGameInfo && analyzedMoves.length > 0 && !studyMode && (
                      <div className="flex-shrink-0 flex flex-col gap-2 mb-1">
                        <button
                          onClick={() => {
                            const pgn = generatePGNFromMoves(analyzedMoves, isChess960 && chess960Fen ? chess960Fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', isChess960);
                            handleAnalyze(pgn, isChess960);
                          }}
                          className="w-full bg-[#4a7c59] hover:bg-[#3a6346] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors"
                        >
                          Start Full Analysis
                        </button>
                      </div>
                    )}
                    {gameInfo && !studyMode && (
                      <div className="flex-shrink-0">
                        <GameGraph
                          moves={analyzedMoves}
                          currentMoveIndex={currentMoveIndex}
                          onDotClick={(idx) => { setIsPlayingMoves(false); goTo(idx); }}
                          totalMoves={progress.total}
                          gameInfo={displayGameInfo}
                          whiteEstElo={whiteEstElo}
                          whiteLabel={displayGameInfo?.white || pgnHeaders.White || 'White'}
                          blackLabel={displayGameInfo?.black || pgnHeaders.Black || 'Black'}
                        />
                      </div>
                    )}

                    {analyzedMoves.some(m => m.isBranch) && (
                      <div className="flex-shrink-0 flex flex-col gap-2 mt-1">
                        <button
                          onClick={() => analyzeBranch()}
                          className="w-full bg-[#4a7c59] hover:bg-[#3a6346] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors"
                        >
                          Analyze Played Moves
                        </button>
                        <button
                          onClick={() => {
                            const branchPoint = analyzedMoves.findIndex(m => m.isBranch);
                            restoreMainLine();
                            if (branchPoint !== -1) setCurrentMoveIndex(branchPoint - 1);
                          }}
                          className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 shadow-sm"
                        >
                          Return to Main Line
                        </button>
                      </div>
                    )}

                    <div className="flex-1 flex flex-col gap-2 mt-1 min-h-0">
                      <div className="flex-shrink-0">
                        <OpeningBox
                          gameInfo={displayGameInfo}
                          analyzedMoves={analyzedMoves}
                          whiteLabel={displayGameInfo?.white || pgnHeaders.White || 'White'}
                          blackLabel={displayGameInfo?.black || pgnHeaders.Black || 'Black'}
                          isCollapsible={shareUiOpen}
                          startCollapsed={shareUiOpen}
                        />
                      </div>
                      <div className="flex-1 min-h-0 flex flex-col">
                        {StudyBarUI}
                      </div>
                      <div className="mt-auto">
                        {BestEngineMoveUI}
                      </div>
                    </div>

                    {shareUiOpen && (
                      <div className="flex-1 flex flex-col min-h-0 mt-1">
                        {MoveListElement}
                      </div>
                    )}
                  </div>

                  {/* Right Column: MoveList + Coach + Controls */}
                  <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                    {shareUiOpen ? (
                      ShareUIPlaceholder
                    ) : (
                      <>
                        {MoveListElement}

                        {PlaybackControls && (
                          <div className="flex-shrink-0">{PlaybackControls}</div>
                        )}

                        <div className="flex-shrink-0">{NavBar}</div>

                        <div className="flex-shrink-0">{HintText}</div>

                        <div className="flex-shrink-0 w-full flex items-center gap-2">
                          <button
                            onClick={() => setFlipped(f => !f)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold py-2.5 px-2 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 shadow-sm text-[13px] truncate"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                            Flip Board ↺
                          </button>

                          {!studyMode && (
                            <button
                              onClick={() => setSummaryOpen(true)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-[#549466] hover:bg-[#467c55] text-white font-bold py-2.5 px-2 rounded-xl transition-colors shadow-sm text-[13px] truncate"
                            >
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              Game Report
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── MOBILE / FALLBACK LAYOUT (DURING ANALYSIS OR ON MOBILE) ── */}
              {(showReview || gameInfo) && (
                <div className={`${analysisComplete ? 'lg:hidden' : 'flex'} flex-col gap-2 flex-1 min-h-0 overflow-hidden`}>
                
                {!displayGameInfo && analyzedMoves.length > 0 && !isAnalyzing && !studyMode && (
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const pgn = generatePGNFromMoves(analyzedMoves, isChess960 && chess960Fen ? chess960Fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', isChess960);
                        handleAnalyze(pgn, isChess960);
                      }}
                      className="w-full bg-[#4a7c59] hover:bg-[#3a6346] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors"
                    >
                      Start Full Analysis
                    </button>
                  </div>
                )}

                {showReview && gameInfo && !studyMode && (
                  <div className="flex-shrink-0">
                    <GameGraph
                      moves={analyzedMoves}
                      currentMoveIndex={currentMoveIndex}
                      onDotClick={(idx) => { setIsPlayingMoves(false); goTo(idx); }}
                      totalMoves={progress.total}
                    />
                  </div>
                )}

                {showReview && analyzedMoves.some(m => m.isBranch) && !isAnalyzing && (
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => analyzeBranch()}
                      className="w-full bg-[#4a7c59] hover:bg-[#3a6346] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors"
                    >
                      Analyze Played Moves
                    </button>
                    <button
                      onClick={() => {
                        const branchPoint = analyzedMoves.findIndex(m => m.isBranch);
                        restoreMainLine();
                        if (branchPoint !== -1) setCurrentMoveIndex(branchPoint - 1);
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl transition-colors border border-gray-200 shadow-sm"
                    >
                      Return to Main Line
                    </button>
                  </div>
                )}

                {/* Only show Opening Box here if we are NOT on desktop complete layout */}
                {gameInfo && (
                  <div className="flex-shrink-0 mt-1">
                    <OpeningBox
                      gameInfo={gameInfo}
                      analyzedMoves={analyzedMoves}
                      whiteLabel={gameInfo?.white || pgnHeaders.White || 'White'}
                      blackLabel={gameInfo?.black || pgnHeaders.Black || 'Black'}
                      isCollapsible={shareUiOpen}
                      startCollapsed={shareUiOpen}
                    />
                    {StudyBarUI}
                    {BestEngineMoveUI}
                  </div>
                )}

                {/* Mobile / Fallback Move List */}
                {showReview && (
                  shareUiOpen ? (
                    <>
                      <div className="h-[350px] sm:h-80 flex-shrink-0 flex flex-col min-h-0 mb-2">
                        {MoveListElement}
                      </div>
                      <div className="flex-1 flex flex-col min-h-0">
                        {ShareUIPlaceholder}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-shrink-0 lg:hidden flex mb-2">
                        <button
                          onClick={() => setFlipped(f => !f)}
                          className="w-full flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold py-2.5 px-2 rounded-xl transition-colors border border-gray-200 dark:border-slate-700 shadow-sm text-[13px] truncate"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          Flip Board ↺
                        </button>
                      </div>
                      <div className={analysisComplete ? "h-[500px] sm:h-80 flex-shrink-0 flex flex-col min-h-0" : "flex-1 min-h-0 flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 shadow-sm"}>
                        {MoveListElement}
                      </div>
                      {analysisComplete && (
                        <div className="lg:hidden mt-2">
                          {serverMetrics ? (
                            <SummaryPanel
                              moves={analyzedMoves}
                              gameInfo={displayGameInfo}
                              whiteEstElo={whiteEstElo}
                              blackEstElo={blackEstElo}
                              serverMetrics={serverMetrics}
                            />
                          ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 flex items-center justify-center">
                              <span className="text-gray-400">Loading metrics...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                )}
                </div>
              )}

            </div>
          </div>
        </main>

        {/* ══ SUMMARY PANEL MODAL — desktop/tablet only, centered, blur-white, 65% screen ══ */}
        {summaryOpen && (
          <div
            className="fixed inset-0 z-50 hidden lg:flex items-center justify-center backdrop-blur-sm bg-white/40"
            onClick={() => setSummaryOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col"
              style={{ width: '85vw', height: '90vh', maxWidth: '1400px', maxHeight: '95vh' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
                <h2 className="text-base font-bold text-gray-800 dark:text-slate-200 uppercase tracking-widest">Game Summary</h2>
                <button
                  onClick={() => setSummaryOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0">
                {serverMetrics ? (
                  <SummaryPanel
                    moves={analyzedMoves}
                    gameInfo={displayGameInfo}
                    whiteEstElo={whiteEstElo}
                    blackEstElo={blackEstElo}
                    isDesktopModal={true}
                    serverMetrics={serverMetrics}
                  />
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 flex items-center justify-center h-full">
                    <span className="text-gray-400">Loading metrics...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Signature ── */}
        <div className={`flex-shrink-0 flex flex-col lg:flex-row items-center justify-between px-4 py-1.5 lg:py-2 mt-1 border-t border-gray-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/50 gap-2 lg:gap-4 ${settings.collapseFooter ? 'md:hidden' : ''}`}>
          <div className="w-full lg:w-auto flex items-center justify-center lg:justify-start">
            <SpecialThanksToast />
          </div>

          <div className="w-full lg:w-auto flex justify-center lg:justify-end mt-1 lg:mt-0">
            <YouTubeBanner />
          </div>
        </div>
      </div>
      <CustomExplanationWarningModal 
        isOpen={customExplanationWarningOpen}
        onClose={() => setCustomExplanationWarningOpen(false)}
        onConfirm={() => {
          setCustomExplanationWarningOpen(false);
          generateShareLink(true);
        }}
      />
    </>
  );
}