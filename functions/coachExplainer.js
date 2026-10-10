import { Chess } from 'chess.js';
import { expandTemplate, pick, pickMulti, resetGrammarSession } from './grammarEngine';

const MATERIAL_VALUES = {
  'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 0
};

// Tracks how many times a specific concept has been explained in the current game
const conceptUsageCount = {};

// ─────────────────────────────────────────────────────────────────────────────
//  CONTENT POOLS
// ─────────────────────────────────────────────────────────────────────────────

// ── General chess wisdom ─────────────────────────────────────────────────────
const CHESS_QUOTES = [
  '"The pawns are the soul of chess." — Philidor',
  '"Even a poor plan is better than no plan at all." — Chigorin',
  '"The hardest game to win is a won game." — Emanuel Lasker',
  '"Tactics flow from a superior position." — Bobby Fischer',
  '"I don\'t believe in psychology. I believe in good moves." — Bobby Fischer',
  '"Chess is life in miniature." — Garry Kasparov',
  '"The winner of the game is the player who makes the next-to-last mistake." — Tartakower',
  '"Every chess master was once a beginner." — Irving Chernev',
  '"To avoid losing a piece, many a person has lost the game." — Tartakower',
  '"Chess is beautiful enough to waste your life for." — Hans Ree',
  '"When you see a good move, look for a better one." — Emanuel Lasker',
  '"A knight on the rim is dim." — Chess proverb',
  '"Rooks belong on open files." — Chess proverb',
  '"Play the opening like a book, the middlegame like a magician, and the endgame like a machine." — Spielmann',
  '"Pawns: they cannot move backwards. Handle with care." — Tartakower',
  '"The threat is stronger than the execution." — Nimzowitsch',
  '"Passed pawns must be pushed!" — Chess proverb',
  '"A bad plan is better than no plan." — Frank Marshall',
  '"Chess is not about killing the king — it\'s about dominating the board." — Anonymous',
  '"In chess, as in life, opportunity strikes but once." — Victor Korchnoi',
  '"My system: I think for a long time, then I make the best move." — José Raúl Capablanca',
  '"Chess demands total concentration." — Bobby Fischer',
  '"To win, you have to take risks." — Mikhail Tal',
  '"Chess is 99% tactics." — Richard Teichmann',
  '"The beauty of a move lies not in its appearance but in the thought behind it." — Aaron Nimzowitsch',
  '"Without error there can be no brilliancy." — Emanuel Lasker',
  '"Capture with the correct piece." — Chess proverb',
  '"Every move creates a weakness." — Chess principle',
  '"A king in the center is a target, not an asset." — Chess principle',
  '"Doubled rooks on the seventh rank are almost always decisive." — Chess principle',
  '"Chess is mental torture." — Garry Kasparov',
  '"The most important thing in chess is the next move." — Magnus Carlsen (paraphrased)',
  // ── NEW additions ──
  '"The hardest part of chess is winning a won game." — Chess proverb',
  '"Never underestimate your opponent\'s resources." — GM wisdom',
  '"A plan is necessary in chess. Without one, a player is lost." — Nimzowitsch',
  '"Chess is the art of analysis." — Mikhail Botvinnik',
  '"You must take your opponent into a deep, dark forest where 2+2=5." — Mikhail Tal',
  '"The pin is mightier than the sword." — Chess saying',
  '"Whoever controls the center controls the game." — Chess principle',
  // ── Additional quotes ──
  '"The best move is always the one you can calculate to the end." — Anonymous GM',
  '"Chess is the gymnasium of the mind." — Blaise Pascal',
  '"A good player is always lucky." — José Raúl Capablanca',
  '"Chess is a war over the board. The object is to crush the opponent\'s mind." — Bobby Fischer',
  '"In chess, the winner is the one who makes the second-to-last mistake." — Tartakower (variant)',
  '"Every pawn is a latent queen." — James Mason',
  '"To improve at chess, you should in the first instance study the endgame." — José Raúl Capablanca',
  '"Chess holds its master in its own bonds, shackling the mind and brain." — Albert Einstein',
  '"The tactician knows what to do when there is something to do; the strategist knows what to do when there is nothing to do." — Savielly Tartakower',
  '"One bad move nullifies forty good ones." — Bernhard Horwitz',
  // ── Further additions ──
  '"In chess, the most powerful weapon is to have the next move." — Viktor Korchnoi',
  '"Chess is above all a fight." — Emanuel Lasker',
  '"Methodical thinking is of more use in chess than inspiration." — Cecil Purdy',
  '"If your opponent offers you a draw, try to work out why they think they\'re worse off." — Nigel Short',
  '"You may learn much more from a game you lose than from a game you win." — José Raúl Capablanca',
  '"Chess is the art of analysis." — Mikhail Botvinnik',
  '"The pin is a prison sentence — served on the board." — Chess principle',
  '"Good players are lucky. Great players make their own luck." — Anonymous GM',
  '"You must lose hundreds of games before becoming a good player." — Chess maxim',
  '"What is the best move? The one that teaches you the most." — Anonymous',
  '"Chess is not about the pieces — it\'s about the spaces between them." — Anonymous grandmaster',
];

// ── Tactical-context quotes ───────────────────────────────────────────────────
const TACTICAL_QUOTES = {
  fork: [
    '"The fork is chess poetry — one move, two targets." — Anonymous',
    '"A fork is never subtle. It just wins." — Chess proverb',
    '"Knight forks are the original combo move." — Anonymous coach',
    'Fun fact: knight forks are so common they have their own nickname: "knightmare" — for the victim.',
    '"A fork attacks two pieces at once. The opponent can only save one." — Chess principle',
  ],
  pin: [
    '"The pin is mightier than the sword." — Chess saying',
    '"Pins restrict. Restrictions win games." — Nimzowitsch principle',
    'Fun fact: Aaron Nimzowitsch based his entire opening system around the power of the pin.',
    '"Immobilize before you strike." — Positional principle',
    '"Pins are invisible chains. Forged in one move, broken only with great cost." — Anonymous GM',
  ],
  skewer: [
    '"A skewer: the reverse pin — attack the big piece, win the small one." — Chess instructor',
    '"Bishops and rooks are skewer specialists. Watch the diagonals and files." — Anonymous',
    'Fun fact: the skewer is sometimes called a "reverse pin" — the stronger piece flees, exposing the weaker one.',
    '"Skewers punish passive or linear piece placement." — GM insight',
  ],
  discoveredAttack: [
    '"The discovered attack is the chess equivalent of a left hook setting up the right." — Anonymous coach',
    '"Moving one piece to unleash another — the art of the discovered attack." — Chess principle',
    'Fun fact: discovered checks are so powerful that in some studies, the revealing piece can move almost anywhere safely.',
    '"Double attacks from discovered checks are among the most decisive tactics in chess." — Tal',
    '"The piece you don\'t see coming wins games." — Tactical principle',
  ],
  backRank: [
    '"The back rank: where kings go to die." — Chess proverb',
    '"Luft! Always give your king a breathing square." — Nimzowitsch principle',
    'Fun fact: the first player known to consistently exploit back rank weaknesses was Paul Morphy in the 1850s.',
    '"A back rank mate is the punishment for forgetting your king." — Anonymous',
    '"Never castle and forget. The king needs air." — Positional principle',
  ],
  xray: [
    '"X-ray attacks are invisible until it\'s too late." — GM insight',
    'Fun fact: X-ray attacks occur when a piece exerts pressure through another — the attacker "sees through" the obstruction.',
    '"The X-ray is chess geometry at its most elegant." — Anonymous grandmaster',
    '"Pieces can see through each other — and that is terrifying." — Tactical maxim',
  ],
  zugzwang: [
    '"Zugzwang — where every move makes things worse. A truly cruel concept." — Chess encyclopedia',
    '"The concept of zugzwang exists only in chess and the tax office." — Tartakower',
    'Fun fact: zugzwang is a German word meaning "compulsion to move." In true zugzwang, you would rather pass.',
    '"In the endgame, not moving is often stronger than moving." — Endgame principle',
    '"When you have achieved zugzwang, the game is already decided." — Karpov principle',
  ],
  promotion: [
    '"The pawn is the hero of an epic story — knight to queen in one move." — Anonymous',
    '"Every pawn is a potential queen. Never underestimate them." — Philidor',
    'Fun fact: a single passed pawn decided the critical game in the 1997 Kasparov vs. Deep Blue match.',
    '"Promotion changes everything. The game resets when a new queen appears." — Endgame principle',
    '"A pawn that queens cannot be stopped by regret alone." — Anonymous',
  ],
  // ── NEW tactical quote categories ─────────────────────────────────────────
  doubleCheck: [
    '"A double check is the most forcing move in chess — only the king can answer." — Chess principle',
    '"Two pieces checking simultaneously. The only escape is to move the king." — Tactics encyclopedia',
    'Fun fact: a double check cannot be blocked or interposed — the king must physically move. It is the ultimate forcing move.',
    '"Double check: when one brilliant move delivers two checks at once." — Anonymous GM',
    '"The double check is the atomic bomb of chess tactics." — Anonymous coach',
  ],
  outpost: [
    '"A knight on e5 is worth two bishops." — Reshevsky',
    '"Outpost squares are permanent advantages — pieces planted there dominate forever." — Nimzowitsch',
    '"A knight in the center controls 8 squares. On the rim, just 2." — Chess proverb',
    'Fun fact: Nimzowitsch built entire games around planting knights on outpost squares where they could never be chased by enemy pawns.',
    '"The perfect outpost: deep in enemy territory, immune to pawn attack." — Positional principle',
  ],
  trappedPiece: [
    '"A piece with no safe square is already lost." — Chess principle',
    '"Material trapped is material lost — even if it hasn\'t been captured yet." — GM wisdom',
    'Fun fact: bishops trapped behind pawn chains are among the most common positional disasters at every level.',
    '"The opponent\'s piece has nowhere to go. Harvest it methodically." — Endgame principle',
  ],
  bishopPair: [
    '"The bishop pair is a permanent advantage — two bishops dominate in open positions." — Steinitz',
    '"Two bishops are worth more than knight and bishop in almost every open game." — Fischer',
    'Fun fact: the "two bishops" advantage was first systematically exploited by Wilhelm Steinitz, the first official world champion.',
    '"The bishop pair is a long-term structural asset that compounds with every pawn trade." — Positional principle',
  ],
  weakSquare: [
    '"A weak square is like a hole in the position — once the enemy piece lands there, it never leaves." — Nimzowitsch',
    '"Fix the weakness, then exploit the weakness." — Karpov principle',
    'Fun fact: Karpov built his entire career on the concept of weak squares — he would identify one and slowly maneuver a piece onto it, strangling the opponent.',
    '"A square your pawns can never recapture is a permanent home for the enemy." — Positional principle',
    '"The weak square is invisible to most players — and that\'s exactly why it decides games." — GM wisdom',
  ],
  exchangeSacrifice: [
    '"The exchange sacrifice is the mark of a positional genius — a rook for a minor piece, but the compensation is eternal." — Petrosian',
    '"A rook for a knight or bishop? In the right position, it\'s the best trade on the board." — Positional principle',
    'Fun fact: Tigran Petrosian, world champion 1963-69, became legendary for his exchange sacrifices — trading material for permanent positional advantages.',
    '"Sometimes the rook is worth less than a well-placed bishop. The board decides the price." — GM axiom',
    '"Exchange sacrifices are chess poetry — ugly on the material ledger, beautiful on the board." — Anonymous GM',
  ],
  opposition: [
    '"King opposition is the secret language of endgames. He who holds it, wins." — Endgame principle',
    '"Direct opposition: two kings face each other with one square between them. The one to move loses ground." — Endgame theory',
    'Fun fact: the concept of king opposition dates back centuries — yet many players above 1500 still mishandle king endgames because they ignore it.',
    '"Opposition is the chess equivalent of a staring contest. Blink and your king retreats." — Anonymous coach',
    '"In a king and pawn endgame, opposition is often the only thing that matters." — Capablanca principle',
  ],
  badBishop: [
    '"A bishop blocked by its own pawns is a tall pawn — not a piece." — Chess proverb',
    '"The good bishop rules the open diagonals. The bad bishop mourns behind its own pawns." — Positional principle',
    'Fun fact: one of the most instructive concepts in chess is the good bishop vs. bad bishop — many games are decided purely on this imbalance.',
    '"Place your pawns on the opposite color of your bishop. Never lock your own bishop in." — Structural principle',
    '"A bishop that cannot move is worse than a knight in closed positions." — GM wisdom',
  ],
  overloaded: [
    '"An overloaded piece is a piece fighting on too many fronts — and losing all of them." — Tactical principle',
    '"When one piece must guard two things, it guards neither." — Chess maxim',
    'Fun fact: the "overloaded piece" is one of the most overlooked tactical motifs — yet it appears in nearly every game.',
    '"Overloading is not about raw force — it\'s about understanding what the opponent\'s pieces are doing." — GM insight',
    '"Identify the overloaded defender. Then attack what it\'s protecting from two directions simultaneously." — Tactics manual',
  ],
};

// ── Famous game references ────────────────────────────────────────────────────
const FAMOUS_GAME_REFS = [
  'Fun fact: this type of sacrifice was used by Mikhail Tal in countless games. "The Magician from Riga" terrified grandmasters with it.',
  'Fun fact: Bobby Fischer used this idea repeatedly in his legendary 1972 World Championship match vs. Spassky.',
  'Fun fact: Kasparov\'s "Immortal Game" vs. Topalov (1999) featured this very concept — considered one of the greatest games ever played.',
  'Fun fact: Paul Morphy played this kind of move 170 years ago — and it\'s still beautiful today.',
  'Fun fact: this is the idea behind Capablanca\'s famous endgame technique — simplify and convert.',
  'Fun fact: Anatoly Karpov built his entire playing style around this kind of slow positional squeeze.',
  'Fun fact: Judit Polgár — the strongest female player ever — specialized in exactly these attacking ideas.',
  'Fun fact: the Evergreen Game (Anderssen 1852) features a famous piece sacrifice from exactly this type of position.',
  'Fun fact: the "Immortal Zugzwang" game (Sämisch vs. Nimzowitsch, 1923) is the textbook example of this endgame concept.',
  // ── NEW additions ──
  'Fun fact: Magnus Carlsen has converted countless positions like this through sheer endgame technique and willpower.',
  'Fun fact: Mikhail Botvinnik — the "patriarch of Soviet chess" — would have approved of this positional approach.',
  'Fun fact: Viswanathan Anand was famous for lightning-fast calculation in exactly these dynamic positions.',
];

// ── Opening facts ─────────────────────────────────────────────────────────────
const OPENING_FACTS = [
  'Fun fact: the Sicilian Defence appears in nearly 25% of all recorded games between strong players.',
  'Fun fact: Bobby Fischer called 1.e4 "best by test." Hard to argue with a world champion.',
  'Fun fact: the Ruy López opening is named after a 16th-century Spanish priest who analyzed it in 1561.',
  'Fun fact: the Queen\'s Gambit is not technically a gambit — if accepted, the pawn can always be recovered.',
  'Fun fact: there are 400 possible games after just 2 moves each. After 3 moves each, there are over 9 million.',
  'Fun fact: Magnus Carlsen has memorized over 10,000 opening variations. Preparation is half the battle.',
  'Fun fact: the King\'s Indian Defence was considered dubious until the 1940s, when Bronstein and Fischer popularized it.',
  // ── NEW additions ──
  'Fun fact: the first three opening principles are develop pieces, control the center, and castle early — and they still hold today.',
  'Fun fact: the longest named opening sequence extends to 35 moves before diverging from theory.',
  'Fun fact: computer engines have essentially "solved" many mainline openings, yet human creativity still finds novelties.',
  // ── grandmaster coaching additions ──
  'Fun fact: Garry Kasparov once said the opening is about building a position where your middlegame ideas are already embedded in the pawn structure.',
  'Fun fact: the Italian Game dates back to the 16th century and is still one of the most popular openings at every level — proven ideas never go out of style.',
  'Fun fact: the Najdorf Sicilian is the most analyzed opening in history, with theory extending past move 25 in many lines.',
  'Fun fact: hypermodern openings (e.g., Nimzo-Indian, Grünfeld) deliberately invite the opponent to build a big center, then attack it with pieces. Not every opening has to grab the center with pawns.',
  'Fun fact: the first recorded chess game was played in 1475 in Valencia, Spain. Opening theory has been evolving for over 500 years.',
  'Fun fact: Viktor Korchnoi played the French Defence throughout his entire career — proving that deep understanding of one opening beats superficial knowledge of many.',
];

// ── Scalable Blunder Trash Talk ───────────────────────────────────────────────
const MILD_GROANS = [
  "Oh no… not like this.",
  "That move will not age well.",
  "The pieces are requesting a new manager.",
  "Technically legal. Spiritually, not great.",
  "Three moves from now, this will make perfect terrible sense.",
  "A moment of silence for that piece.",
  "The position calls. The answer was not this.",
  "The board didn't deserve this. The board has done nothing wrong.",
  "A training puzzle was just born from this exact mistake.",
  "This move will live on — in someone else's blunder compilation.",
  "The position was fine. Was.",
  "Bold strategy. Absolutely terrible, but bold.",
  "Your opponent probably blinked twice before taking.",
  "Well, that's one way to play chess.",
  "The pawn structure did not like that.",
  "A questionable life choice.",
  "We call this 'optimistic' chess.",
  "Somewhere, a coach just sighed.",
  "That move requires... explanation.",
  "Technically playable. Practically, questionable.",
  "The evaluation bar just twitched in annoyance.",
  "A move played with absolute confidence, if nothing else.",
  "An interesting concept, poorly executed.",
  "Let's pretend that was a mouse slip.",
  "Not illegal, just heavily frowned upon.",
  "I mean, it's a move. It's on the board.",
  "That piece was perfectly happy where it was.",
  "A bold step in the wrong direction.",
  "The opponent is confused, but grateful.",
  "That's definitely going in the post-game review.",
  "A highly creative interpretation of the position.",
  "I hope there's a long-term plan behind that.",
  "Sometimes we play the board, sometimes we just move pieces.",
  "The ghosts of chess past are shaking their heads.",
  "Well, the clock was ticking, and a move was made.",
  "A slight miscalculation. Or a major one. Time will tell.",
  "That move has strong 'it seemed like a good idea at the time' energy.",
  "The engine just coughed politely.",
  "A fascinating decision. Not good, but fascinating.",
  "That piece is now reconsidering its career path.",
  "There were better options. Several of them, actually.",
  "A move that asks far more questions than it answers.",
  "The textbook definition of 'suboptimal'.",
  "We are in uncharted territory. Mostly because nobody goes here.",
  "That's going to need a patch in the next update.",
  "A brave move. Stupidity is often mistaken for bravery.",
  "The opponent is currently trying to figure out if it's a trap.",
  "It's not a blunder, it's a 'surprise mechanic'.",
  "A purely aesthetic move. Shame about the chess implications.",
  "Let's chalk that one up to 'board blindness'.",
  "The pieces are quietly judging that decision.",
  "A choice was made. A bad one, but a choice."
];

const DEVASTATING_ROASTS = [
  "The pieces are watching in horror.",
  "Even Magnus Carlsen winced somewhere.",
  "The engine is crying right now.",
  "Stockfish fainted.",
  "The chess gods weep.",
  "Capablanca is rolling in his grave.",
  "Tal would have laughed. Karpov would have closed the window.",
  "The engine's eval bar has left the building.",
  "Fischer would have resigned rather than play this.",
  "Every grandmaster in history just simultaneously shuddered.",
  "The eval bar just filed a restraining order.",
  "Stockfish evaluated that in 0 milliseconds. The answer was no.",
  "That's called 'helping the enemy.' Points deducted.",
  "The chat box just filled with '??'",
  "The engine is seriously considering uninstalling itself.",
  "A blunder so bad it violates the terms of service.",
  "The board just tilted off its axis.",
  "That move requires a written apology to the chess pieces.",
  "You just made a 400-rated player feel vastly better about themselves.",
  "The evaluation bar just snapped in half.",
  "That wasn't a blunder, that was a resignation in slow motion.",
  "I am legally obligated to inform you how bad that was.",
  "The opponent is genuinely wondering if your account was hacked.",
  "Stockfish just requested early retirement.",
  "That move is currently being studied by baffled scientists.",
  "An absolute catastrophe on 64 squares.",
  "The chess gods have permanently abandoned this game.",
  "A tragedy. Shakespearean, really.",
  "You could have played a random legal move and done statistically better.",
  "That piece was sacrificed to the gods of poor judgment.",
  "The opponent is definitely taking a screenshot of this.",
  "This will be featured in a YouTube thumbnail with a giant red arrow.",
  "Even a random number generator would have found a better continuation.",
  "The king is furiously drafting a surrender document.",
  "A move so terrible it caused a power outage at the server farm.",
  "You played that with the confidence of someone who knows what they're doing. Frightening.",
  "The eval bar just plummeted faster than crypto.",
  "This is the chess equivalent of an own goal from midfield.",
  "A historical disaster. They will write books about this blunder.",
  "The pieces are actively trying to flee the board.",
  "That was the worst move on the board. Congratulations on finding it.",
  "Stockfish has stopped evaluating and is now just laughing.",
  "The opponent didn't even need to think. They just accepted the gift.",
  "A masterclass in how to instantly lose a won game.",
  "The ghost of Paul Morphy just un-friended you.",
  "This move should come with a hazard warning label.",
  "That wasn't just a blunder, that was a cry for help.",
  "The position is ruined. The day is ruined. Everything is ruined.",
  "If bad moves were an art form, this would be the Mona Lisa.",
  "The engine gave this move a brand new symbol: ????",
  "You just handed the game over on a silver platter. With a little bow.",
  "A move that will be whispered about in hushed, terrified tones for years.",
  "The opponent is frantically looking for the hidden camera.",
  "I'd ask what the plan was, but I'm legitimately afraid of the answer."
];

// ── Queen-loss lines ──────────────────────────────────────────────────────────
const BLUNDER_QUEEN = [
  "The queen is lost. This is basically over.",
  "Not the queen! Losing your most powerful piece is catastrophic.",
  "A queen blunder. Hard to recover from this.",
  "There goes the most powerful piece on the board.",
  "The queen hangs freely. A decisive mistake.",
  "Losing the queen without compensation? The endgame is going to be brutal.",
  "The queen had one job. It did not do it.",
  "Somewhere, Judit Polgár just winced.",
  "The queen is gone. The king now has to do everything itself.",
  "Down a queen. Unless your opponent blunders back, this is over.",
  // ── NEW ──
  "A queen for nothing. That's the most painful trade in chess.",
  "The queen leaves the board. A ghost of an advantage remains.",
  // ── additional ──
  "Losing the queen is like losing the engine from a car. Everything seizes up.",
  "The opponent didn't need to do anything special — the queen walked into it.",
  "Queen down. The position now requires a miracle, not a plan.",
  "That queen was the backbone of the attack. And now it's gone.",
  "Down a queen with no compensation — the game is effectively decided.",
  "The queen just resigned on behalf of its owner.",
];

// ── Rook-loss lines ───────────────────────────────────────────────────────────
const BLUNDER_ROOK = [
  "Down a rook. Converting from here will be very tough.",
  "The rook disappears without compensation — a serious material deficit.",
  "Rooks belong on open files, not in the opponent's hands.",
  "A full rook deficit. The endgame is going to hurt.",
  "The rook is simply gone. No compensation, no plan.",
  "Losing a rook quietly is how games slip away unnoticed.",
  // ── NEW ──
  "That rook was the backbone of the position. And now it's gone.",
  "A rook down in an endgame is almost always fatal. Almost.",
  // ── additional ──
  "The rook was the best piece on the board. Past tense.",
  "Rook endings are technical enough at material parity. Down one, it's a grind.",
  "A free rook handed to the opponent. This will be decisive.",
  "The rook exits the board unceremoniously. The position suffers immediately.",
];

// ── King-exposure lines ───────────────────────────────────────────────────────
const BLUNDER_KING_EXPOSED = [
  "The king just became the most popular piece on the board — for the wrong reasons.",
  "Leaving the king exposed like that is an open invitation to attack.",
  "That pawn shield was load-bearing. Now the king has none.",
  "The king is suddenly very lonely out there.",
  "Without pawn cover, the king is just a big target.",
  "The opponent's pieces are now salivating.",
  "Whoever attacks the exposed king first wins this game.",
  "Structurally, the king now lives in a glass house.",
  "The king needs armor. That move removed the last piece of it.",
  "An exposed king in an open position is a ticking clock.",
  // ── NEW ──
  "The king's pawn shelter just collapsed. Time for damage control.",
  "Open king, open invitation. The opponent will find the attack.",
  "All roads now lead to the king — and the opponent knows it.",
  // ── additional ──
  "The king is a sitting duck. Diagonals, files, ranks — all lead here now.",
  "Every long-range piece is about to become the opponent's weapon.",
  "In chess, an exposed king doesn't survive the middlegame — historically.",
  "The pawn shelter is gone. The king must now defend itself.",
  "An open king in a sharp position: a combination is almost certainly coming.",
];

// ── Hanging piece lines ───────────────────────────────────────────────────────
const BLUNDER_HANGING = [
  "That piece is hanging — completely undefended.",
  "Left en prise! The opponent can take that for free.",
  "A free piece for the opponent. No strings attached.",
  "Leaving pieces undefended is the number one way games are lost at every level.",
  "Undefended and under attack. Not a good combination.",
  "Grandmasters call this 'leaving a piece en prise.' Everyone else calls it a gift.",
  "Counting attackers and defenders is a chess superpower. This move forgot to count.",
  "That piece has no backup. It will be captured.",
  "An unguarded piece is as good as gone.",
  "The piece is just… there. For the taking.",
  // ── NEW ──
  "Defender count: 0. Attacker count: at least 1. Math does not favor this piece.",
  "Hanging pieces don't last long in good chess. This one won't either.",
  // ── additional ──
  "No defenders, one attacker. The arithmetic is cruel but simple.",
  "That piece just became a free pickup for the opponent.",
  "Hanging material is how most games below grandmaster level are decided.",
  "The piece stepped into the open with nobody watching its back.",
  "Overextended and under-guarded. A recipe for material loss.",
  "The opponent needed zero calculation to spot this free piece.",
];

// ── Brilliant move praise ─────────────────────────────────────────────────────
const BRILLIANT_PRAISE = [
  "This move sees three steps deeper than the position appears to demand. The kind of calculation that wins tournaments.",
  "What makes this brilliant isn't the move itself — it's everything it sets in motion. Three threats are born from a single idea.",
  "The engine's first choice, but found through human pattern recognition. That's the hallmark of real chess understanding.",
  "A move that looks counterintuitive until you trace every consequence — then it reveals itself as the only logical choice. Beautiful.",
  "This is what deep positional understanding looks like: a move that improves everything without weakening anything. Masterful.",
  "Quiet on the surface, devastating in its implications. The best moves don't always announce themselves — they simply win.",
  "The kind of move that separates calculation from intuition. You don't just see this — you feel it. And it's correct.",
  "Every piece works together after this. Coordination, threats, restriction — all achieved in a single tempo. That's brilliance.",
  "Finding this required seeing through the noise of the position to the one idea that matters. Exceptional vision.",
  "A move so precise that any alternative — even close ones — leads to a measurably worse outcome. Narrow, deep, perfect.",
  "This move creates problems the opponent cannot solve simultaneously. That's the essence of winning chess — overwhelming their resources.",
  "The position rewarded patience and calculation equally here. Both were delivered. The engine confirms: first choice.",
  "Not the flashiest move on the board, but the most effective. Strong players understand that distinction instinctively.",
  "This is what 'engine-level accuracy' actually means — not brute force, but finding the one path that works when dozens don't.",
  "A move that controls the diagonal, restricts the knight, and threatens the pawn chain — all at once. Triple-duty chess.",
  "The calculation required here goes beyond 'what happens next' into 'what happens after the opponent's best reply to my best reply.' Deep work.",
  "The position contained a hidden geometric relationship, and this move exploits it perfectly. Geometry wins games.",
  "What makes this brilliant: it doesn't just improve your position — it degrades every aspect of your opponent's. Asymmetric perfection.",
  "A move that would be played identically by the world's top engines. Finding it at human speed is genuinely remarkable.",
  "The kind of move that makes annotators stop and write a paragraph. Every detail of the position feeds into why this works.",
  "The confidence to play this comes from seeing the full picture — not just the immediate consequences, but the structural transformation.",
  "This is the difference between playing chess and understanding chess. The move is simple. The vision behind it is extraordinary.",
  "A move born from precise calculation: every forcing line was traced, every defensive resource was accounted for, and this survives all of them.",
  "The position demanded something special — a move that works tactically AND positionally. Finding both in one tempo is rare.",
  "Quiet and lethal. The strongest moves in chess are often the ones the opponent doesn't see coming until it's too late to adjust.",
  "Perfect piece placement doesn't happen by accident. This move is the culmination of a plan that started several moves ago.",
  "The engine had this as its top line — and the reasoning is clear: this move maximizes piece activity while minimizing counterplay. Flawless logic.",
  "A move that future you will look back on and say: 'That's when the game was won.' Whether the opponent knows it yet or not.",
  "What separates brilliant from merely good: this move doesn't just solve the current problem — it prevents the next three problems from ever existing.",
  "The hallmark of a brilliant move is that it works for reasons the opponent cannot easily understand or counteract. This qualifies.",
  "Finding the engine's top choice in a complex position isn't luck — it's pattern recognition honed over thousands of games. Well earned.",
  "A move of breathtaking clarity in a murky position. While others see complications, this cuts straight to the winning idea.",
  "This is chess played with vision: seeing the consequence of every piece interaction and finding the move that harmonizes them all.",
  "The position was a puzzle, and this is the key move. Everything else leads to something worse — only this leads to something beautiful.",
  "Calculation, intuition, and courage — all three were needed to find this move. All three were delivered.",
  "Engine-approved, but more importantly: this demonstrates understanding. The right plan, the right execution, the right moment.",
  "A move that creates such a network of threats that the opponent's only option is to pick which problem to suffer from. That's dominance.",
  "Precise, purposeful, and permanently improving. These three qualities define the best moves in chess — and this move has all of them.",
  // ── grandmaster coaching praise additions ──
  "This isn't just a good move — it's the kind of move that reshapes the position permanently in the player's favor. The opponent's best reply still leaves them worse off.",
  "A move that transforms the character of the position from unclear to decisively favorable. The calculation behind it touches every piece on the board.",
  "The beauty here is the depth of understanding required: this move addresses the position's tactical, structural, AND dynamic needs simultaneously. Triple-duty brilliance.",
  "A move that Petrosian would call 'necessary and sufficient' — nothing more than what's needed, but nothing less either. Surgical precision.",
  "This move solves every problem in the position while creating an entirely new set of problems for the opponent. That's the gold standard of chess thinking.",
  "The hallmark of truly brilliant chess: the move that looks natural after you see it, but required deep vision to find before the fact.",
];

// ── Sarcastic reactions when OPPONENT plays a strong move ─────────────────────
const SARCASM_OPP_BRILLIANT = [
  "Credit where it's due — that move demonstrates real understanding. Study what it threatened and learn the pattern.",
  "The opponent found the engine's top choice here. When your opponent plays this well, the lesson is: don't give them the opportunity in the first place.",
  "A strong move from the other side. The takeaway: identify what in your previous play allowed this idea to work.",
  "The opponent is playing at a high level right now. Stay calm, avoid panic moves, and find the most resilient response.",
  "That required genuine vision. When an opponent plays well, your job shifts to damage control — minimize the advantage they gain.",
  "An accurate, well-timed move. The best response to strong opponent play is patient defense — don't try to 'punish' something that isn't a mistake.",
  "The opponent found something genuine. The lesson here: when facing strong play, prioritize king safety and piece coordination over counterattack.",
  "That's a quality move. The correct response isn't frustration — it's calculation. What's the most resilient reply?",
  "Impressive from the opponent. When the other side plays well, the priority shifts: secure the position first, then look for opportunities.",
  "A very strong idea. The refutation, if there is one, requires deep calculation. Take your time here.",
  "The opponent is in the zone right now. In these moments, rely on defensive technique rather than speculative counterplay.",
  "Top-tier precision from the other side. The silver lining: strong opponent moves force you to find equally strong responses — that's where growth happens.",
  "Beautifully played by the opponent. Use this as a learning moment — understand why this works, and prevent it next time.",
  "A move that demonstrates the power of good piece coordination. Study this pattern for your own future games.",
  "Strong and uncomfortable. The principle: when under pressure from accurate play, simplify if possible. Complications favor the side with the initiative.",
];

// ── Funny positional observations ─────────────────────────────────────────────
const FUNNY_OBSERVATIONS = [
  "The position is objectively balanced — which in practical terms means both sides have exactly enough problems to keep things interesting.",
  "Sharp and double-edged. In positions like this, the player who calculates one move deeper usually wins. Check every forcing line before committing.",
  "This is the kind of position where concrete calculation matters more than general principles. Sit down, trace the lines, and trust the result.",
  "Engines call this position 'unclear.' In human language: the next three moves will determine the outcome of the entire game.",
  "Both kings have reason to worry. In double-edged positions like this, the side that plays more forcing moves usually seizes the advantage.",
  "Welcome to the critical moment of the game. The evaluation is balanced, but the position is anything but peaceful — one tempo decides everything.",
  "When the evaluation reads ±0.0 but the position looks chaotic, that's the engine saying: 'both sides have exactly equal chances to either win or blunder.' Stay sharp.",
  "A deeply complex position. The principle here: when you can't find a clear plan, improve your worst-placed piece. That advice works in 90% of unclear positions.",
  "Both sides are walking a tightrope. The key lesson: in balanced but tense positions, avoid unnecessary pawn moves — they create permanent weaknesses.",
  "The tension is locked in and neither side wants to be the first to release it. A useful principle: maintain tension when you have better piece activity. Release it when you need to simplify.",
  "If you're confused, the opponent likely is too. In these situations, the player who follows concrete threats rather than vague plans usually comes out ahead.",
  "The position has more tension than a Candidates Tournament tiebreak. Every move matters — but especially the next one.",
  "A fascinating middlegame struggle. When everything is unclear, ask yourself: 'What is my opponent's best move?' Preventing that is often better than pursuing your own plan.",
  "This position would make a great puzzle — balanced, complex, and one accurate move separates the winner from the loser.",
  "Both sides have chances. In positions like this, the golden rule is: don't rush. The first player to overextend usually regrets it.",
  // ── grandmaster coaching humor additions ──
  "The evaluation says equal, but the position says dangerous. Chess engines and humans sometimes read different books.",
  "A position where both players think they're winning — the classic sign of a truly double-edged middlegame.",
  "Neither side can relax. In positions like this, the player who stays most alert for the next three moves usually takes control.",
  "Complex and rich. The best approach in unclear positions: pick the move that gives your opponent the most difficult decision on their reply.",
  "The tension is at maximum — like a spring ready to snap. The side that releases it at the right moment wins; the side that releases it too early suffers.",
];

// ── Chess facts ───────────────────────────────────────────────────────────────
const CHESS_FACTS = [
  "Fun fact: there are more possible chess games than atoms in the observable universe.",
  "Fun fact: the longest chess game theoretically possible is 5,949 moves.",
  "Fun fact: the word 'checkmate' comes from the Persian 'Shah Mat' — the king is dead.",
  "Fun fact: the first chess computer program was written in 1951 by Alan Turing.",
  "Fun fact: Garry Kasparov held the world #1 ranking for 255 months.",
  "Fun fact: Magnus Carlsen achieved a FIDE rating of 2882 — the highest ever recorded.",
  "Fun fact: in 1997, Deep Blue became the first computer to beat a reigning world champion in classical chess.",
  "Fun fact: the knight is the only piece that can jump over other pieces.",
  "Fun fact: castling is the only move in chess where two pieces move simultaneously.",
  "Fun fact: the shortest possible chess game ending in checkmate is 2 moves — the Fool's Mate.",
  "Fun fact: the en passant rule was added in the 15th century to stop pawns skipping past attacks.",
  "Fun fact: the queen was once the weakest piece in chess — medieval versions had it move just one square diagonally.",
  "Fun fact: Bobby Fischer learned chess from a booklet bought at a candy store. He became World Champion at 29.",
  "Fun fact: Paul Morphy retired from chess at 22 and is considered one of the greatest natural talents ever.",
  "Fun fact: the chess clock was invented in 1883. Before that, players could think as long as they wanted.",
  "Fun fact: simultaneous exhibitions are when one player faces dozens of opponents at once, walking board to board.",
  // ── NEW additions ──
  "Fun fact: the 50-move rule states that a game is drawn if no pawn moves or captures occur in 50 consecutive moves.",
  "Fun fact: computers calculate millions of positions per second; humans rely on pattern recognition honed over years of study.",
  "Fun fact: the FIDE World Chess Championship has been contested since 1886, making it one of sport's oldest world titles.",
  "Fun fact: a stalemate — where the player to move has no legal moves but isn't in check — counts as a draw, not a loss.",
  "Fun fact: the longest recorded tournament game lasted 269 moves between Nikolic and Arsovic in 1989.",
];

// ── Positional squeeze lines (new pool for domination commentary) ─────────────
const POSITIONAL_SQUEEZE = [
  "Space advantage secured — the opponent's pieces are cramped and lack coordination. The technique now: improve slowly, avoid releasing the tension, and wait for the position to crack on its own.",
  "Positional domination. Every piece is optimally placed and the opponent has no constructive plan. The principle: when you control the board, don't rush — the advantage grows with each accurate move.",
  "A long-term structural edge that only deepens with careful play. The key now: don't trade off your active pieces. Keep the pressure and let the opponent suffer.",
  "Quiet domination. In positions like this, Karpov's method applies: improve your worst piece, restrict the opponent's best piece, and wait for them to crack under the pressure.",
  "Quiet positional pressure is often more decisive than tactical fireworks. The opponent has no counterplay and every move weakens something. That's the definition of a winning position.",
  "The opponent is being squeezed off the board square by square. The technique: avoid premature breaks and let the pressure do the work.",
  "This is how positional masterclasses are built — one accurate move at a time, each one taking away an option until the opponent has no good moves left.",
  "A small edge, managed with precision, becomes insurmountable. The principle of gradual improvement: never rush when the opponent has no counterplay.",
  "The stranglehold tightens. In positions of total domination, the winning technique is patience: the opponent will eventually have to make a concession.",
  "Every piece has a purpose and every square is controlled. This is what complete positional domination looks like — the opponent's pieces have nowhere useful to go.",
  "Restriction is the weapon here. The opponent cannot improve any piece without creating a new weakness. That's the hallmark of a truly dominant position.",
];

// ── Inaccuracy commentary (minor suboptimal move, ~50-150 cp loss) ──────────
const INACCURACY_LINES = [
  "The right idea, but the wrong move order. In chess, sequence matters as much as concept — check if rearranging the moves produces a better result.",
  "A small imprecision. The engine found a continuation that gains a tempo here — look for moves that improve a piece while creating a threat simultaneously.",
  "Close, but a more precise option existed. The principle: before committing, always ask 'is there a way to achieve the same goal with an additional benefit?'",
  "A slight drift from accuracy. In tight positions, these small decisions accumulate — the player who stays precise longest usually wins.",
  "Not wrong, but not optimal. The gap between 'reasonable' and 'best' is where elo points live. A sharper continuation was available.",
  "A good-looking move that misses a subtle improvement. The technique to avoid this: check all forcing moves (checks, captures, threats) before settling on a quiet move.",
  "Reasonable chess, but the sharpest continuation was missed. Ask yourself: did you consider all the candidate moves, or did you play the first one that looked acceptable?",
  "A tempo was left on the table here. In chess, every tempo matters — especially in positions where both sides are fighting for the initiative.",
  "The idea behind this move is sound, but the execution could be sharper. A small recalibration would have maintained a clearer edge.",
  "A soft inaccuracy — the kind that doesn't lose immediately but gives the opponent breathing room they shouldn't have. Precision prevents counterplay.",
  "Good instincts, but the calculation stopped one step too early. Train yourself to look one move further — the difference between accurate and approximate play is often just one extra ply of calculation.",
  "A subtle miss. In positions like this, the engine's preferred move often involves an intermediate step you didn't consider — a check, a threat, or a zwischenzug.",
  "Principled but imprecise. The position offered a slightly more active continuation that would have maintained full control. Small edges require small accuracies.",
  "Almost right — but 'almost' in chess means the advantage shrinks. The best players distinguish themselves by finding the difference between good and best.",
  "A minor imprecision that allows the opponent to equalize more easily than necessary. The lesson: when ahead, look for moves that make the opponent's life hardest.",
  "The move is logical, but a more forcing option was available. As a general rule: forcing moves (moves that limit the opponent's choices) tend to be more accurate than quiet ones.",
];

// ── Mistake commentary (clear error, ~150-300 cp loss, not a blunder) ────────
const MISTAKE_LINES = [
  "A clear mistake — the position shifts from comfortable to difficult. The likely cause: this move focused on one aspect of the position while overlooking a more important one.",
  "This move gives away the advantage. The lesson: before playing a natural-looking move, verify that it doesn't allow a tactical response you haven't fully calculated.",
  "A significant error that the engine strongly disagrees with. The position demanded a more active continuation — passive play in dynamic positions is how advantages disappear.",
  "The edge evaporates here. The opponent can now equalize or better. Check whether the position called for a more forcing approach rather than a quiet one.",
  "A mistake that shifts the balance. The most common cause of this type of error: not checking the opponent's strongest reply before committing to the move.",
  "The game was balanced until this moment. Now it tilts in the wrong direction. The principle: when the position is critical, spend extra time and verify every candidate move.",
  "Not a blunder, but a meaningful concession. The damage can still be limited — focus on damage control rather than trying to 'win back' the advantage in one move.",
  "A step in the wrong direction. The position was better than this move suggests — look for whether a more direct approach would have maintained the pressure.",
  "This move hands the initiative to the opponent. The key learning: positional errors are often harder to recover from than tactical ones, because they don't have a single 'fix.'",
  "A real error that creates lasting pressure. In post-game analysis, trace back: was this a calculation failure or a misjudgment of the position's demands?",
  "The position demanded precision and this wasn't it. The pattern: when the evaluation drops significantly from one move, it usually means a specific opportunity was missed — not that the general approach was wrong.",
  "A strategic misstep with long-term consequences. The pawn structure or piece placement has been permanently worsened by this choice.",
  "This misses the critical idea and hands control to the opponent. The corrective habit: before each move, ask 'what is my opponent's best response?' and only play if you can handle it.",
  "Solid-looking but costly. The engine's preferred continuation was more active — remember that in chess, passivity is its own form of error.",
  "An opportunity was right here, and this move walks past it. The lesson: train pattern recognition for the specific tactical themes in this position type.",
  "The position slips away with this choice. A tighter, more forcing move was available — one that would have limited the opponent's options rather than expanding them.",
];

// ── Fianchetto commentary ─────────────────────────────────────────────────────
const FIANCHETTO_LINES = [
  "Fianchetto! The bishop takes the long diagonal — controlling the center from the flank rather than occupying it. This is hypermodern strategy in action.",
  "Fianchetto development — the bishop on the long diagonal exerts invisible pressure across the entire board. Its power grows as the position opens.",
  "The fianchetto bishop is a long-range weapon. The key to maximizing it: keep the central pawns flexible so the diagonal stays open.",
  "A hypermodern concept at work: the bishop doesn't need to be in the center to control it. From the flank, it influences more squares than any other piece.",
  "The fianchetto is complete. The principle to remember: never trade this bishop casually — without it, the dark (or light) squares become permanently weak.",
  "Fianchetto achieved! The bishop now controls the longest diagonal on the board. The opponent must think twice before placing any piece in its path.",
  "A classic fianchetto setup. The strategic idea: the bishop supports the center from a distance while being protected by the pawn shelter it sits behind.",
  "The fianchetto bishop is one of the most powerful long-term assets in chess. Its influence grows with every pawn exchange that opens the diagonal further.",
];

// ── Connected-rooks commentary ────────────────────────────────────────────────
const CONNECTED_ROOKS_LINES = [
  "Rooks connected! The back rank is cleared and both rooks can now operate as a unit. This is a fundamental development milestone — the opening is complete.",
  "The rooks are connected — a textbook achievement. The next step: look for an open or semi-open file to plant one or both rooks on.",
  "Connected rooks on the first rank form a powerful battery ready to double on any file. The principle: connected rooks are stronger than the sum of their parts.",
  "Classic opening principle achieved: castle, develop every piece, connect the rooks. From here, the middlegame plan should become clear.",
  "Both rooks in communication — they can now double on any open file instantly. The strategic principle: rooks need open files the way bishops need open diagonals.",
  "Development is complete with the rooks connected. The transition to the middlegame is the most critical phase — identify the best file or rank for your heavy pieces.",
  "Rooks connected. The next question every strong player asks: 'Where is the open file?' That's where the rooks belong.",
  "A development milestone: all pieces are active and the rooks protect each other. The position is ready for the middlegame struggle.",
];

const GOOD_MOVE_LINES = [
  "A solid, principled choice. What makes this work: it improves the position without creating any new weaknesses. That's the standard to aim for.",
  "Good chess. The idea is correct and the execution is clean — not the absolute best, but the kind of move that consistently wins games over time.",
  "A strong practical decision. The key quality here: this move serves multiple purposes simultaneously — improving activity while maintaining structural integrity.",
  "Accurate and clean. The pieces are going to the right squares, which means the plan is correct. Consistent good play beats occasional brilliance.",
  "Sound and sensible — the position improves naturally. The principle at work: when no forcing continuation exists, improve the worst-placed piece.",
  "A well-chosen move that keeps the position under control. The hallmark of strong chess: every move has a clear purpose, even the quiet ones.",
  "Excellent practical instinct. This move maintains all the positive features of the position while taking away one of the opponent's ideas.",
  "A reliable, accurate response. The game is under control because this move addresses the position's demands without overcommitting.",
  "The right piece to the right square. Textbook chess. The principle: piece activity matters more than material in almost every phase of the game.",
  "Good move — the kind of choice that wins games quietly. Not every move needs to be brilliant; consistency in quality is what separates strong players from the rest.",
  "Solid and strong. No drama, no complications — just accurate chess that slowly builds a lasting advantage.",
  "Precise. The position rewards this kind of careful play. A useful habit: when the position is good, don't look for something spectacular — just maintain and improve.",
  "This move achieves two things at once: improves piece coordination while posing a new question to the opponent. Dual-purpose moves are the backbone of strong chess.",
  "Keeping it simple and effective. When ahead, avoid unnecessary complications — simplicity is the friend of the better position.",
  "Notice the pattern: this move improves one piece while subtly restricting one of the opponent's. That's efficient chess.",
  "A patient, principled move. Chess doesn't always require brilliance — consistency and accuracy are more reliable paths to victory.",
  "This is how strong players think: improve the least active piece and create pressure simultaneously. One move, two goals.",
  "No theatrics. Just good, honest chess. The position speaks for itself — and it's saying everything is on track.",
  "A healthy move — no weaknesses created, activity maintained, and the opponent has no immediate counterplay. That's the definition of a good position.",
  "A move the engine respects because it doesn't give up anything. Maintaining a good position is a skill — this move demonstrates it.",
  "Good practical chess: the evaluation holds steady because this move improves activity without creating targets. That's clean technique.",
  "Strong players make moves like this look routine, but they require accurate assessment of piece activity, pawn structure, and king safety all at once.",
  "The principle at work: when you have a good position, small improvements compound. This move adds another drop to the bucket.",
  "A well-judged move. The key quality: it maintains flexibility while keeping all the winning options open for later.",
  "Clean and purposeful. This is the kind of move you play when you trust the position and understand its needs.",
  "Concrete and correct. The position is in good hands.",
  "A fundamentally sound decision. In chess, being consistently good is more valuable than being occasionally brilliant.",
  "The evaluation confirms what the position suggests: this is a well-chosen move that keeps the advantage growing.",
];

// ── Endgame technique lines ───────────────────────────────────────────────────
const ENDGAME_LINES = [
  "Endgame technique — the position has simplified to where every single tempo counts. The principle: improve the worst-placed piece first, even in endings.",
  "In the endgame, every tempo and every pawn matters enormously. A single wasted move can flip the result from win to draw. This move gets the priority right.",
  "Classic endgame principle at work: activate the king, centralize it, and use it as a weapon. In endings, the king transforms from a liability into a powerhouse.",
  "This is where deep study pays off — endgame conversions separate strong players from great ones. The technique here: don't rush, improve piece by piece.",
  "The endgame favors the player with better-coordinated pieces and a more active king. Right now, that advantage is clear.",
  "Technique over tactics in this phase. The endgame rewards patience, precision, and an understanding of when to push versus when to wait.",
  "Capablanca's famous advice was to study endgames first — because endgame knowledge teaches you what positions to aim for in the middlegame. This position proves his point.",
  "A model technique move. The simplest path is often the strongest in endgames — avoid unnecessary complications when the position is winning.",
  "The three pillars of endgame mastery: create a passed pawn, activate the king, execute without error. All three are relevant here.",
  "The simplest move is the best move. In endgames, elegance means efficiency — the fewest moves to the win with the least risk.",
  "The Lucena position is the foundation of rook endgame wins: rook in front of the pawn, then build a bridge to shelter the king. Every strong player must know this pattern cold.",
  "The Philidor defense is the defender's salvation: keep the rook on the third rank, then switch to flank checks once the pawn advances. Knowing this saves half-points.",
  "Triangulation — the king takes the long route to force the opponent into zugzwang. This pure geometric technique wins positions that look drawn at first glance.",
  "In rook endgames, rook activity beats an extra pawn. Keep the rook aggressive and cutting off the opponent's king — passive rooks lose even with extra material.",
  "The outside passed pawn is a strategic decoy — it forces the opponent's king to chase it while your king handles the remaining pawns. This is how outside passers win games.",
  "Rook endgames are the most common endgame type and the hardest to convert correctly. Every tempo is irreplaceable — no moves can be wasted.",
  "The principle of two weaknesses: if the opponent can defend one target, create a second one they cannot also cover. This forces them to choose which problem to solve — and lose the other.",
  "Bishop endgames with same-colored bishops favor the side with the more active bishop. With opposite-colored bishops, fortress ideas appear — the defender can blockade on the 'wrong' color.",
  "Knight versus bishop in endgames: knights thrive in closed positions with fixed pawns; bishops dominate in open positions with pawns on both flanks. The pawn structure decides which is stronger.",
  "A rook pawn (a or h file) with the wrong-colored bishop is a theoretical draw — the bishop cannot control the promotion square. Recognizing this pattern saves or costs games.",
  "The endgame is where preparation meets technique. Every decision compounds — one wasted tempo here can flip the result in ways that don't happen in the middlegame.",
  "Strong endgame play is systematic: remove the opponent's defensive resources one by one, improve piece placement, then convert. Never rush the winning plan.",
  "The two most important endgame skills are king activation and pawn promotion technique. Both require precise calculation — and both are on the agenda here.",
  "When converting an endgame advantage, the principle is patience: create maximum tension, restrict the opponent's counterplay, and strike only when the win is concrete.",
  "In winning endgames, the engine's technique always follows one principle: improve the worst-placed piece before advancing pawns. Adopt that same discipline.",
];

// ── Tempo-gaining move commentary ────────────────────────────────────────────
const TEMPO_LINES = [
  "A tempo-gaining move — the opponent is forced to react rather than advance their own plan. This is how initiative is built: one forced response at a time.",
  "Every move the opponent spends reacting is a move not spent attacking. This move earns a tempo by creating an immediate threat that must be addressed.",
  "Gaining time on the board while simultaneously improving piece placement. This is the ideal — a move that develops AND forces.",
  "The initiative swings here. Forcing moves build momentum because they dictate the flow of the game — the opponent reacts while you execute your plan.",
  "A move with a threat attached — the opponent must answer rather than choose their own path. In chess, controlling the opponent's responses is half the battle.",
  "Tempo is currency in chess. This move earns it by creating an obligation — the opponent must respond to the threat before pursuing anything else.",
  "A useful intermediate move that improves the position while forcing a concession. The best moves in chess do two things: improve your game and worsen your opponent's.",
  "Keeping the pressure on — the opponent has no choice but to respond. The principle: when you have the initiative, maintain it with forcing moves. Don't give the opponent time to regroup.",
  "This is a zwischenzug-style tempo gain: an in-between move that inserts a threat before completing the expected continuation. The opponent must deal with it first.",
  "Tempo in chess works like compound interest — each gained tempo multiplies the advantage of the ones before it. This move adds another.",
];

// ── Forced mate threat commentary ─────────────────────────────────────────────
const MATE_THREAT_LINES = [
  "A mating threat is on the board! The opponent must address this immediately or the game ends. Look for the most restrictive continuation.",
  "Checkmate is threatened — the king has nowhere safe to run. The key now: don't get distracted by other ideas. The mating attack takes absolute priority.",
  "A mating net is forming — the king is being cornered piece by piece. The technique: each move should reduce the number of safe squares the king can reach.",
  "The king is in the crosshairs. A checkmate threat demands the opponent's full attention — every other plan is secondary to survival.",
  "The mating attack begins here. Before making each move, calculate all the king's escape squares and verify that your next move closes at least one of them.",
  "A decisive mating threat — the opponent's only useful moves are those that delay checkmate. When every opponent reply is forced, the position is essentially won.",
  "The fastest and most decisive way to win is a mating attack — and one just appeared on the board. Stay on the forcing moves and the game ends.",
  "Mate looms. The king has too few squares and too many attackers. The mathematical reality of the position is clear: the defense cannot hold.",
  "The mating net tightens with every move. Calculate every possible king escape before committing — leaving one open can cost the entire attack.",
  "A forced mating sequence is available — the position is essentially decided. The only task remaining is executing the forcing line accurately.",
  "The key now is precision — a checkmate threat exists and the opponent must find the only defense. When you're the one attacking, verify that no defensive resource breaks the net.",
  "The king is being driven into a corner. Finish methodically — accuracy takes priority over speed. One careless move can allow the king to escape the net.",
  "Every piece is coordinating toward the king. This is what a real mating attack looks like: multiple pieces creating overlapping threats that cannot all be met.",
  "An immediate checkmate threat — the engine's top lines all begin with restricting the king further. Follow the same forcing logic.",
  "The mating net is tightening one square at a time. The opponent must address this or checkmate follows within moves.",
  "Checkmate is an active, immediate threat. The opponent has very few defensive resources and each one costs something. The attack is decisive.",
  "Mate threat! The king has lost its shelter and the attacking pieces are coordinated perfectly. Stay on the forcing moves — checks and restrictions first.",
  "The king is under immediate mating pressure. Calculate accurately and do not allow any defensive resource to go unaddressed — one oversight can save the opponent.",
  "The best mating attacks feel inevitable to both players — each move tightens the net until there's no escape. This one is reaching that point.",
  "Mating threats are the ultimate form of pressure: the opponent has no time for anything except survival. Use that to your advantage — every tempo spent defending is a tempo not spent counterattacking.",
  "Don't telegraph the mate by playing the obvious move too early. Keep creating new threats until checkmate becomes unavoidable — then deliver the final blow.",
  "A true mating attack follows one principle: the king has fewer defenders than attackers. When that equation holds, checkmate is a matter of technique.",
];

// ── Mate challenge / puzzle-style commentary (keyed by depth) ─────────────────
const MATE_CHALLENGE_LINES = {
  m1: [
    "Mate in 1! There is exactly one move that ends the game right now. The key: find the check where the king has no escape square and no piece can interpose.",
    "Checkmate in 1 — the king has only one fate. Scan every possible check and identify the one the king cannot survive.",
    "One move ends the game. The technique for finding mate-in-1: check every checking move systematically. One of them leaves zero legal replies.",
    "Mate in 1! Find the move that simultaneously gives check and covers every flight square. That's the definition of checkmate.",
    "The position is solved — a single move delivers checkmate. Train yourself: always check for mate-in-1 before playing any other move. The habit saves games.",
  ],
  m2: [
    "Mate in 2! A forced two-move sequence delivers checkmate. The method: find the first move that limits the king's replies to exactly the ones you want — then the finish is forced.",
    "Two moves from checkmate. The puzzle: what first move forces the king into a position where the second move is unstoppable? Think backwards from the checkmate.",
    "Mate in 2 available! The technique: identify what the final checkmate position looks like, then work backwards to find the move that forces the king into it.",
    "A forced mate in 2 exists here. The engine confirms it. The key: the first move isn't necessarily a check — sometimes a quiet move that cuts off escape routes is stronger.",
    "There is a mate in 2 on the board. The principle for solving these: consider quiet moves that restrict the king, not just checks. The mating blow comes second.",
    "Mate in 2! Find the key move and trace the forced line through to checkmate. Remember: the strongest first move is often the one that takes away the most king squares.",
  ],
  m3: [
    "Mate in 3! A three-move forced sequence delivers checkmate. The approach: find the first move that restricts the king the most, then follow the forced replies to the finish.",
    "Three precise moves from now, the king is mated. The solving technique: work backwards from the checkmate position. What must the king's position be on move 3? Then find what forces it there.",
    "A forced mate in 3 — calculate every king escape and close each one in sequence. The key: the first move is usually the hardest to find because it may not be a check.",
    "Mate in 3! The solving principle: in multi-move mating problems, quiet restricting moves are often stronger than obvious checks. Find the move that cuts off the most escape routes first.",
    "The engine confirms mate in 3. The full sequence requires seeing three moves ahead with precise responses to every king retreat. This is exactly the kind of calculation that improves with practice.",
  ],
  m4to6: [
    "A forced mate is within the horizon — the engine confirms the sequence ends in checkmate. The approach: find the most forcing move at each step and verify that the king has no escape.",
    "The engine sees forced checkmate nearby. In longer mating sequences, the principle remains the same: restrict the king's squares first, then deliver the finishing blow.",
    "A forced win — the king has no refuge. Stay on the most restrictive moves at each step. Each move should ask: 'does this reduce the king's options?' If yes, it's likely correct.",
    "Mate is forced within several moves. The technique: treat each move as a sub-puzzle. At each step, find the move that limits the king's replies the most.",
    "The engine has confirmed a forced mating sequence. Precision means victory — don't allow the king to regroup or find an unexpected defensive resource.",
  ],
};



// ── Approaching checkmate / closing in commentary ─────────────────────────────
const APPROACHING_MATE_LINES = [
  "Closing in on checkmate — the king has fewer and fewer safe squares.",
  "The mating net is tightening. Every move brings the king closer to its last stand.",
  "The king is running out of room. A forced mate is approaching on the horizon.",
  "Piece by piece the king is being cornered. Checkmate is getting closer.",
  "The attack has reached a critical mass. Checkmate is not a question of if — only when.",
  "The position is converging toward a forced finish. Calculate the king's every escape.",
  "The king's last defences are crumbling. The mating attack is nearly complete.",
  "Checkmate approaches. Every piece is coordinating toward the final blow.",
  "The noose tightens. The king has nowhere comfortable to go.",
  "One more precise move and the king will have no answer. Stay accurate.",
  "The king is in the crosshairs and the position is closing fast. No escape in sight.",
  "A mating attack in full motion. The king cannot survive much longer.",
  // ── closer-to-checkmate specific lines ──
  "Closer to checkmate with every move — the king's escape routes are being sealed one by one.",
  "Each piece joins the attack and the king edges closer to checkmate. Stay precise.",
  "The position is converging to checkmate. Follow up methodically — don't let the king slip away.",
  "The king is being hunted. Checkmate is now a matter of accurate play, not luck.",
  "Getting dangerously close to checkmate — the king has almost no safe haven.",
  "The checkmate horizon is near. Two or three precise moves should end this.",
  "The king is running out of squares. Checkmate is imminent if the attack is continued accurately.",
  "The mating net is almost complete. One or two more forcing moves and the king has no answer.",
  "Engine evaluation: checkmate is approaching. Stay on the forcing lines.",
  "The king is cornered further with every move. Checkmate is the logical conclusion of this attack.",
  // ── engine-aware and coaching-oriented closer-to-mate lines ──
  "Closer to checkmate — engine lines from here all begin with forcing moves. Follow the same principle.",
  "The position is nearly decided. Each accurate move tightens the mating net another notch.",
  "The king has no reinforcements and no shelter. Checkmate is approaching — calculate each check carefully.",
  "This is the critical phase: the king is exposed and the attack is at full force. Precision now equals checkmate.",
  "The engine sees forced lines converging on checkmate. Keep the king under pressure — do not allow it to regroup.",
  "Methodical. Accurate. Each forcing move brings the position closer to checkmate — the king has no recovery.",
  "The mating attack is past the point of no return. Every checking move tightens the cage.",
  // ── grandmaster-coach teaching lines ──
  "The king is in the open and the pieces are coordinated. This is what a winning attack looks like — maintain the pressure.",
  "In positions like this, the engine's recommended plan is to cut off the king's escape, then deliver checkmate. Follow that principle.",
  "The opponent's king is the weakest piece on the board right now. Every move should keep it under fire.",
  "Ask yourself before each move: does this tighten the net or let the king breathe? Only tighten.",
  // ── challenge / puzzle-style coaching lines ──
  "The mating sequence is within reach — can you calculate it to the end? Find every king escape and close each one.",
  "A near-forced finish — look for the move that limits the king's options the most. Then the next one. Then the last.",
  "Think of it as a puzzle: the king has a limited number of squares. Which move eliminates the most of them?",
  "The attack is mature. Now it's a calculation exercise — treat it like a puzzle and find the forced sequence.",
  "Chess truth: once the king is this exposed, the position plays itself — if you find the most forcing move each time. Look for it.",
];

// ── Stalemate trap awareness lines ───────────────────────────────────────────
const STALEMATE_AWARENESS_LINES = [
  "Caution: the opponent has very few legal moves. Don't accidentally stalemate — finish methodically.",
  "The opponent is nearly out of moves. Be precise — a stalemate would throw away the win.",
  "A nearly stalemated opponent is dangerous. Keep one escape square open until checkmate is forced.",
  "Fun fact: many winning positions have been drawn by stalemate. Stay alert and don't over-restrict.",
  "The opponent's king is nearly immobile. Ensure a legal move exists before finishing the attack.",
  // ── additions ──
  "Stalemate watch! The opponent has almost no legal moves. Don't trap the king with no check — that's a draw.",
  "The opponent is desperately looking for a stalemate trick. Don't oblige them — finish with check or ensure the king has a square.",
  "Fun fact: stalemate as a drawing device is one of the most exploited desperation tricks in practical play. Always verify the opponent has at least one legal move before the final push.",
  "Winning positions have been squandered by premature moves that stalemate. Count the king's legal moves before advancing.",
  // ── chess-accurate lines ──
  "Stalemate risk: the engine's winning line keeps one legal move for the opponent at all times. Follow the same principle.",
  "The position is winning, but the stalemate danger is real. Engine lines in this structure typically recommend leaving the opponent a safe pawn move to avoid the draw.",
  "Only two legal moves remain for the opponent. Engine best practice: keep a legal move available until the mating blow is ready.",
  "Classic stalemate trap zone. Force the king to a corner with a checking sequence rather than restricting its last squares prematurely.",
  // ── new coaching-specific lines ──
  "The opponent's king is boxed in. Before each move, confirm that a legal reply exists — stalemate draws even the most won endgames.",
  "This is exactly the type of endgame where stalemate happens. Use checking moves or zugzwang techniques — never restrict the last escape square without delivering checkmate.",
  "Engine tip for this structure: maintain at least one legal move for the opponent at all times. Push the pawn only when checkmate follows within two moves.",
  "Stalemate alert: the opponent's position is dangerously close to having zero legal moves. Verify before every push.",
  // ── grandmaster coaching lines ──
  "World-class technique in won endgames always ensures the opponent has a move before the final push. Don't over-restrict.",
  "The safest route: use checks to shepherd the king to a corner, THEN restrict with checkmate — never restrict first.",
  "Whenever the opponent has fewer than three legal moves, mentally verify: 'Does my next move give checkmate, or does it stalemate?' Only then play.",
];

// ── Stalemate occurred — fatal draw lines (rich coaching) ─────────────────────
// Each entry uses {{avoidLine}} as a placeholder replaced at runtime.
const STALEMATE_OCCURRED_LINES = [
  "Stalemate! A won game becomes a draw — the opponent has no legal moves and is not in check. The game is over, but not as it should have been.{{avoidLine}}",
  "This causes stalemate. The king was over-restricted: no legal move, no check — the rules declare a draw. One of the most heartbreaking results in chess.{{avoidLine}}",
  "Stalemate — the endgame nightmare. A winning position drawn away. The opponent's king had no legal move, so the rules hand out half a point.{{avoidLine}}",
  "Stalemate! The king was trapped without delivering check. In a winning endgame, always verify the opponent has at least one reply before the final push.{{avoidLine}}",
  "This move caused stalemate — the opponent had zero legal moves and was not in check. A decisive error that turns a full point into half a point.{{avoidLine}}",
  "Stalemate — one of chess's cruelest twists. The king was cornered without checkmate. Never restrict the last escape square unless checkmate follows immediately.{{avoidLine}}",
  "Stalemate! The winning side over-pushed — the opponent had no legal move. Always count the opponent's legal replies when their position approaches zero mobility.{{avoidLine}}",
  "A stalemate resulted. Despite a winning material advantage, the game ends as a draw. The core lesson: leave the opponent at least one legal move until the mating blow is ready.{{avoidLine}}",
  "Stalemate! The king was boxed in without a check to finish things off. A win was within reach — the stalemate trap claimed it instead.{{avoidLine}}",
  "This is how won endgames are drawn: one over-restricting move, and the opponent gets a free escape via stalemate. The position was winning — the technique let it slip.{{avoidLine}}",
];

// ── Repetition draw avoidance coaching ────────────────────────────────────────
const REPETITION_DRAW_LINES = [
  "Draw by threefold repetition — the same position appeared three times. When ahead, always look for a new plan rather than repeating moves.{{avoidLine}}",
  "Threefold repetition: the game is drawn. In winning positions, varying the move order — even with a tempo-losing detour — is always better than repeating.{{avoidLine}}",
  "A draw by repetition when a win was on the board. The engine's principle: if repeating a position, progress isn't being made. Break the loop with a new threat.{{avoidLine}}",
  "Repetition draw! When you're ahead, repetition is never the answer — it's the opponent's goal. Find a way to improve the position before repeating.{{avoidLine}}",
  "Draw by repetition from a winning position — one of the most frustrating results in chess. The key lesson: when winning, always ask if a repeated position has an improvement hiding in it. It usually does.{{avoidLine}}",
  "Threefold repetition. The game was in hand, but the position cycled back three times — enough for the rules to declare a draw. In winning positions, any plan that avoids repetition is better than none.{{avoidLine}}",
  // ── grandmaster coaching additions ──
  "Repetition is the opponent's escape route when defending a worse position. When you're winning, break the cycle by finding any improving move — even a king shuffle to a better square counts.{{avoidLine}}",
  "The position repeated because progress stalled. The coaching lesson: before playing a move that allows repetition, ask 'Can I improve any piece instead?' If yes, do that first.{{avoidLine}}",
  "A draw by repetition — the hallmark of missed opportunity. In better positions, look for pawn breaks, piece improvements, or king marches that prevent the loop from forming.{{avoidLine}}",
];

// ── 50-move rule draw lines ────────────────────────────────────────────────────
const FIFTY_MOVE_DRAW_LINES = [
  "Draw by the 50-move rule — no pawn move or capture has occurred in 50 consecutive moves. Neither side managed to make progress. The game is over.",
  "A draw under the 50-move rule. Fifty moves without a pawn advance or capture — the rules declare no progress is being made and end the game.",
  "50-move rule draw: the endgame was played for 50 moves without a decisive event. A theoretical draw is claimed — the winning technique was not found in time.",
  "Fun fact: the 50-move rule exists precisely to prevent endless maneuvering. When no pawn moves and no captures happen for 50 moves, the game is drawn automatically.",
  "A draw by the 50-move rule. In these endgames, the key is to make progress — pawn moves or captures that reset the clock — within 50 moves. The technique required wasn't found here.",
  // ── grandmaster coaching additions ──
  "The 50-move clock ran out. The coaching lesson: in long endgames, always count your pawn moves carefully — each one resets the clock and buys 50 more moves to convert.",
  "Drawn by the 50-move rule. The technique that was needed: find a way to force a pawn advance or capture before the counter hits 50. Planning those clock resets is part of endgame mastery.",
  "A 50-move draw — the position was winning in principle, but the conversion technique required more precision than was applied. Study the critical moments where pawn progress was available.",
];

// ── Overloaded piece commentary ───────────────────────────────────────────────
const OVERLOADED_PIECE_LINES = [
  "The opponent's piece is overloaded — it's defending too many things at once. Pick one to attack first.",
  "An overloaded defender! That piece cannot protect everything it's guarding. It will break.",
  "The key tactical motif here: identify the overloaded piece and strike the target it can't afford to abandon.",
  "One piece, two critical duties. That's a recipe for material loss — for the opponent.",
  "An overloaded guardian. Once you attack both targets simultaneously, something has to give.",
  "The pin and the fork have cousins — the overload. And the overload just showed up.",
  "Fun fact: 'overloading' is one of the most common tactical themes in grandmaster games. One piece simply cannot do two jobs at once.",
  "Methodical exploitation: attack the overloaded piece and watch the defense collapse.",
  // ── grandmaster coaching additions ──
  "The defender is stretched thin — guarding multiple pieces on different lines. Create a second threat and the defense crumbles.",
  "Overloaded! The technique: identify which task the defender will abandon, then strike that target first.",
  "A classic overload pattern. The coaching point: when you see a defender guarding two things, attacking either one wins because it can't split in half.",
];

// ── King opposition commentary ─────────────────────────────────────────────────
const OPPOSITION_LINES = [
  "Direct king opposition! The opponent must yield ground — the king that moves second loses this battle.",
  "King opposition achieved — the winning side of a pivotal endgame principle.",
  "Opposition is the invisible hand of king-and-pawn endgames. This move claims it.",
  "Fun fact: Capablanca could calculate king opposition paths thirty moves deep. Mastery of this concept made him nearly invincible in endings.",
  "The kings face off. Opposition means the opponent's king must retreat — and that opens the path for the pawn.",
  "Distant opposition — the kings are three or five squares apart. The same principle applies: force the opponent to yield.",
  "Seizing the opposition here is the winning idea. Everything else is just execution.",
  "Opposition is endgame geometry — simple to state, difficult to master, beautiful when executed perfectly.",
];

// ── Bad bishop commentary ─────────────────────────────────────────────────────
const BAD_BISHOP_LINES = [
  "Bad bishop alert! This bishop's own pawns sit directly on its diagonal paths, physically blocking the lines it travels. With multiple friendly pawns sealing its diagonals, it's reduced to a spectator.",
  "The bishop is now a bad bishop — friendly pawns on the same-coloured squares directly block its diagonal rays. Consider trading it off before the position closes further.",
  "Fun fact: a 'bad bishop' is defined by having multiple own pawns blocking its diagonal movement paths. The more pawns blocking those diagonals, the weaker the bishop becomes.",
  "The bishop's diagonals are obstructed by its own pawns — not enemy pieces. This is the textbook definition of a bad bishop. The fix: trade it off while it has value, or advance the blocking pawns.",
  "Notice: this bishop's diagonal lines are obstructed by friendly pawns sitting directly in front of its movement paths. A bad bishop is one of the slowest-developing positional problems — it compounds over time.",
  "A bishop trapped behind its own pawn chain — one of the most instructive structural concepts in chess. The pawns on those diagonals determine whether the bishop can function at all; right now, they're strangling it.",
];

// ── Exchange sacrifice commentary ─────────────────────────────────────────────
const EXCHANGE_SACRIFICE_LINES = [
  "An exchange sacrifice — a rook for a minor piece. Material is behind, but the positional gains are concrete and lasting.",
  "Petrosian-style exchange sacrifice! The rook goes, but the resulting piece activity and structure fully justify it.",
  "A rook for a bishop (or knight) — the exchange sacrifice is one of the most sophisticated weapons in chess.",
  "Fun fact: the exchange sacrifice was Tigran Petrosian's signature weapon. He used it to win the 1963 World Championship.",
  "Trading a rook for a minor piece sounds wrong. Here it's clearly right. The compensation is real and permanent.",
  "The exchange sacrifice is not a blunder — it's a strategic investment with a clear return.",
  // ── grandmaster coaching additions ──
  "The exchange sacrifice works when the minor piece gains permanent activity or eliminates a key defender. Here, the compensation is concrete and lasting.",
  "Petrosian's principle: give up the rook when the resulting position gives you control over key squares or eliminates the opponent's best piece. That's exactly what happened here.",
  "An exchange sacrifice that changes the character of the game — from tactical to positional. The side with the minor piece often thrives in these resulting structures.",
  "The rook is exchanged for long-term positional dominance. The coaching point: material isn't everything — piece activity, pawn structure, and king safety can outweigh a rook deficit.",
];

// ── King hunt commentary ──────────────────────────────────────────────────────
const KING_HUNT_LINES = [
  "The king hunt begins! The enemy king is being chased across the board with no shelter in sight.",
  "A king hunt — arguably the most exciting sequence in all of chess. Each move is a new check, a new escape.",
  "The king is being smoked out of its castle. Every piece joins the pursuit.",
  "Tal himself would love this — the king is out in the open and the pieces are coordinating a deadly pursuit.",
  "Fun fact: Paul Morphy's 19th-century games were filled with king hunts. His opponents' kings would march all the way from kingside to queenside under fire.",
  "The king is exposed and fleeing. Calculate every check — do not let it escape to safety.",
  "A king in the center during the middlegame is an invitation for disaster. The invitation has been accepted.",
  // ── Accurate king hunt coaching lines ──
  "The king has left its fortress and there is no going back. Every checking move adds another lock on the cage.",
  "A king hunt in progress: expose the king, cut off its escape routes, coordinate the pieces, deliver mate. This position has passed step one and two.",
  "The king is in open air with no pawn shelter and no friendly pieces nearby. Calculate every forcing move — the hunt is on.",
  "The enemy king is being chased into the open. In positions like this, the engine's lines always begin with the most forcing check. Do the same.",
  "King is out, pieces are aimed — the only task now is precision. One inaccuracy lets the king escape; accurate play ends the game.",
  "A textbook king hunt position: the king is cut off from its own pieces, exposed on an open file, and there are multiple ways to give check. Follow the forcing lines.",
  // ── Engine-aware grandmaster coaching additions ──
  "King hunts require two things: calculation and courage. Calculate every king move. The engine validates the rest.",
  "The key to finishing a king hunt: ask on every move 'does the king have a new safe square after this?' If yes, find the move that closes that square.",
  "The opponent's king is in the open — this is the moment your entire attack was building toward. Don't allow a defensive regrouping move.",
  "A practical tip: when hunting the king, prioritize checking moves that cut off ranks or files over captures. Restrict first, punish second.",
  "The king has been lured into the open. Now use your pieces as a net — not a hammer. Methodical restriction, then the kill.",
];

// ── Continuous Captures (Take, Take, Take) ────────────────────────────────────
const CONTINUOUS_CAPTURE_LINES = [
  "Take, take, take! The tension breaks in a flurry of captures.",
  "A massive liquidation on the board. The dust is finally settling.",
  "Capture after capture! The sequence forces a complete structural change.",
  "The pieces are flying off the board. A deep calculating sequence resolves here.",
  "A multi-move trading sequence reaches its end. Let's see who came out ahead.",
  "Take, take, take! When the sequence ends, counting the remaining material is all that matters.",
  // ── grandmaster coaching additions ──
  "A forced exchange sequence — both sides must calculate every recapture in advance. The player who saw further comes out ahead.",
  "The board simplifies rapidly. In sequences like this, counting material after the dust settles is the only question that matters.",
  "A flurry of exchanges reshapes the position entirely. The key lesson: always calculate the full sequence before starting it — taking one piece and then realizing the follow-up loses is a common trap.",
];

// ── Counterplay lines ─────────────────────────────────────────────────────────
const COUNTERPLAY_LINES = [
  "Creating counterplay! Rather than defending passively, this move generates threats of its own.",
  "The best defense is active counterplay. This move proves the point.",
  "Counterplay secured! Instead of being squeezed to death, fresh threats are now on the board.",
  "A fighting move — not passive, not defensive. Active counterplay is the soul of practical chess.",
  "Fun fact: the concept of 'counterplay' is what separates defensive masters from passive victims. Actively fighting back is almost always better than waiting.",
  "The position demanded more than mere defense. Counterplay was created — and now both sides have problems.",
  "Counterstrike! The best response to an attack is a counter-threat.",
  // ── additions ──
  "Instead of sitting and taking it, a problem is created for the opponent. That changes the game dynamics entirely.",
  "Active resistance! Passive defense invites a slow squeeze; counterplay forces the opponent to recalculate.",
  "A counterpunch thrown at just the right moment. The opponent must deal with their own problems now.",
  "The best defences in chess are active ones. This move embodies that principle.",
  // ── grandmaster coaching additions ──
  "The opponent expected passive defense — instead, a counter-threat forces them to recalculate entirely. Initiative regained.",
  "Active counterplay is the antidote to positional pressure. This move creates enough problems to neutralize the opponent's initiative.",
  "The coaching principle: when under pressure, the worst response is doing nothing. Find a threat — any threat — and suddenly the opponent must split their attention.",
  "Counterplay doesn't need to be objectively better — it just needs to create enough complications that the opponent can no longer convert their advantage comfortably.",
  "A fighting response! The position demanded resistance, not resignation. Counterplay keeps the game alive.",
];

// ── Rook endgame specific lines ───────────────────────────────────────────────
const ROOK_ENDGAME_LINES = [
  "Rook behind the passed pawn! Whether your own pawn or the opponent's, rooks belong behind passed pawns.",
  "The rook cuts off the king — the key defensive technique in rook endgames. Without king proximity to the pawn, the attack stalls.",
  "Fun fact: rook endgames are notoriously the hardest to convert. Even world champions have missed the win. Technique is everything.",
  "The Lucena position is the foundation of rook endgame wins. Everything builds toward that structure.",
  "The Philidor position is the defender's salvation in rook endgames. Third-rank defense, then switch to the flank.",
  "Activate the rook first, then advance the pawn. Passive rooks lose rook endgames.",
  "The seventh rank is the rook's highway. From there it dominates both pawns and king.",
];

// ── Pawn endgame specific lines ───────────────────────────────────────────────
const PAWN_ENDGAME_LINES = [
  "King and pawn endgames are decided by single tempos. Every move here is a potential game-decider.",
  "The key question in every pawn ending: who gets there first? Count the moves carefully.",
  "Opposition, triangulation, and pawn breaks — the three weapons of king-and-pawn endings. All relevant here.",
  "In pawn endings, the king is a piece. An active king is worth more than a pawn.",
  "Fun fact: some pawn endgames are decided by whether one side can get the 'opposition' — this is one of those positions.",
  "Pawn endings require precise calculation. One wasted tempo and the win evaporates.",
  "The key in many pawn endings: create a passed pawn that forces the opponent's king to chase it while your king handles the rest.",
];

// ── Prophylaxis commentary ─────────────────────────────────────────────────────
const PROPHYLAXIS_LINES = [
  "Prophylaxis! A threat was neutralized before it could materialize. That's forward-thinking chess.",
  "The opponent's plan was stopped before it started. Chess at its most preventive.",
  "A prophylactic move — not an attack, not a capture, but a quiet nullification of the opponent's best idea.",
  "Fun fact: Tigran Petrosian made prophylaxis famous. He would prevent attacks three moves before the opponent even conceived them.",
  "Preventive chess: identify the opponent's threat, then eliminate it. The best defence is often a quiet move.",
  "The danger was seen and neutralized. This is how positional players win — by denying the opponent's resources.",
  "Prophylaxis in action: the threat is stopped in its tracks. A mature, calculating move.",
  "The opponent had a plan. Now they don't. That's what prophylaxis feels like.",
];

// ── King activity (endgame) commentary ───────────────────────────────────────
const KING_ACTIVITY_LINES = [
  "The king activates! In the endgame, the king is a fighting piece — and this is it fighting.",
  "King centralization! In the endgame, an active king is worth more than a passive defender.",
  "The king marches to the center. This is how endgames are won — with an active king.",
  "Fun fact: Capablanca's king endgame technique was legendary. The key? Activate the king without hesitation.",
  "A textbook endgame principle — the king must join the attack. This move does exactly that.",
  "The king steps forward. In the endgame, passivity loses; activity wins.",
  "King activation is the hallmark of strong endgame play. The king enters the game now.",
];

// ── Zugzwang commentary (for when it's detected in the main flow) ─────────────
const ZUGZWANG_COMMENTARY_LINES = [
  "Zugzwang! Every move the opponent makes now worsens their position. The obligation to move is the punishment.",
  "A zugzwang is achieved — the opponent would rather pass, but they cannot. Each move digs the hole deeper.",
  "Pure positional mastery: the opponent is in zugzwang. Any move they make is a concession.",
  "Fun fact: zugzwang (German for 'compulsion to move') is one of the cruelest concepts in chess. The right to move becomes a burden.",
  "The opponent is caught in zugzwang — the most refined endgame weapon. Technique from here.",
  "Every legal move the opponent has makes their position worse. That is zugzwang at its most absolute.",
  "The position is won not by force but by zugzwang — the opponent's own moves deliver the decisive blow.",
];

// ── Missed forced mate coaching lines ────────────────────────────────────────
// Fires when the engine confirms a forced mate existed but the player played
// something else. Distinguishes depth and explains the missed opportunity.
const MISSED_MATE_LINES = {
  m1: [
    "There was a forced checkmate in 1 right there — can you spot it now? Look for the move that leaves the king with no legal square and no interposition.",
    "Missed a mate in 1! The king had exactly one fate this move, and it wasn't taken. Check every check you can give before moving.",
    "Checkmate was available in a single move here. Finding all forcing checks before deciding is a crucial habit — the king had no answer.",
    "The game could have ended right there — mate in 1 was on the board. Always scan for immediate checks that the king can't escape before choosing your move.",
    "A forced checkmate in one move was sitting here! The king was out of squares. That's the kind of pattern recognition that separates experienced players — next time it'll click.",
  ],
  m2: [
    "A forced mate in 2 was available here — the engine confirms it. Find the key first move and the rest becomes forced. Good training material: look for it now.",
    "Missed a mate in 2! There was a forcing sequence starting with a key move that the king couldn't answer. Two precise moves would have ended the game.",
    "The engine saw a forced checkmate in 2 moves from this position. First, find the move that limits the king's options — then the finish writes itself.",
    "A two-move forced checkmate existed right here. Puzzle challenge: what was the key move? Hint — look for the move that simultaneously cuts off the king's escapes.",
    "Mate in 2 was available! This is exactly the kind of pattern that puzzles are built from. Identify what the king's reply would be — then find the checkmate that follows.",
    "The engine confirms mate in 2 was hiding in this position. Learning to spot these forced sequences in real games is what puzzle training is for — review this one.",
  ],
  m3: [
    "A forced mate in 3 was on the board, confirmed by the engine. These three-move sequences are all about finding the first forcing move — the rest follows logically.",
    "Missed a mate in 3! The engine's line begins with a key forcing move. Work backwards: what would checkmate look like, and what move sets it up?",
    "Mate in 3 was available here. The pattern: find the first move that limits the king's escape routes the most, then trace the forced replies through to checkmate.",
    "The engine sees a three-move forced checkmate from this position. These are exactly the kinds of positions that reward tactical study — revisit it later.",
  ],
  mDeep: [
    "The engine confirms a forced mate sequence existed from this position. A precise continuation would have ended the game — but it's a deep calculation that requires seeing multiple forcing moves ahead.",
    "A forced winning sequence was available — the engine's lines all converge on checkmate. These positions reward methodical calculation: find the most forcing move, then the next, then the next.",
    "Forced mate was achievable from here, though the sequence is deep. The principle: when the opponent's king is exposed and you're winning material, look for forcing continuations before quiet moves.",
    "The engine found a forced mating line from this position. Deep forced mates like this are rare opportunities — they don't always announce themselves loudly. Pattern recognition builds over time.",
  ],
};

// ── Enhanced tactical teaching pools ─────────────────────────────────────────
// Used when specific tactics are identified, with grandmaster-level explanation.
const FORK_TEACHING = [
  "Notice the geometry: the forking piece attacks two targets simultaneously from a single square — that's the essence of every fork.",
  "The fork works because the opponent has only one move, but two problems. This is a fundamental tactical pattern worth memorising.",
  "A fork at its most efficient: one tempo, two threats, one has to fall. Study this exact configuration — it recurs constantly.",
  "Forking pieces exploit geometry. A knight forks from the centre of its 'L', a bishop along diagonals, a queen on any line. Always look for your pieces' multi-target potential.",
];

const PIN_TEACHING = [
  "The pin is one of the most instructive tactics in chess: immobilise a piece by threatening what it protects. The pinned piece does nothing while everything around it is under pressure.",
  "A pin creates an invisible chain. The pinned piece can't move legally — or dare not move positionally. Both kinds can be exploited.",
  "Notice how the pin multiplies pressure without using extra moves. The pinning piece attacks on one front, and everything the pinned piece was doing also stops. One move, double effect.",
  "Study the pin: the pinned piece becomes the weakest link. Once pinned, add pressure, attack it with less valuable pieces, and the pin either holds — or breaks with tempo-loss.",
];

const SKEWER_TEACHING = [
  "The skewer is a pin in reverse: attack the more valuable piece — it flees — and capture the less valuable piece behind it. The bigger piece pays, the smaller piece suffers.",
  "Skewers punish linear piece placement. Two pieces on the same diagonal or file, with the more valuable in front — that's a skewer waiting to happen.",
  "Think of the skewer as 'forcing the king or queen to expose a friend behind it.' The attacker is less valuable, the victim dares not stay. Perfect geometric efficiency.",
];

const DISCOVERY_TEACHING = [
  "The discovered attack is chess at its most elegant: move one piece to somewhere useful, and in doing so reveal another piece's attack. Two threats from a single tempo.",
  "A discovered attack unmasks a hidden threat that was waiting behind a blocker. The more powerful the revealed piece, the more devastating the discovery.",
  "Every piece move changes what's behind it. Discovered attacks exploit this — the moved piece creates a new threat while the revealed piece creates another. The opponent can address at most one.",
];

// ── Grandmaster coach situational commentary ──────────────────────────────────
// High-quality coaching lines for specific recurring positional situations.
const OPEN_KING_CENTER_LINES = [
  "The king remains in the center as the position opens — this is one of the most dangerous configurations in chess. Every open file and diagonal becomes a weapon aimed at the king.",
  "An uncastled king in an open position is almost always the decisive factor. Both sides must recognise this — the side attacking profits, the side defending must urgently find shelter.",
  "Central king exposure during the middlegame is a structural emergency. The only question is whether the attack arrives before the king finds safety. Right now, that race is very tight.",
  "A king stuck in the center with open files around it — this is what '± King Safety' in engine notation means. The material balance matters far less than the king's vulnerability here.",
  "Both sides understand that the uncastled king is the game's central theme now. Every move should either accelerate the attack (for the attacking side) or find a path to safety (for the defending side).",
];

const CONVERSION_LINES = [
  "The advantage is clear — now it's about technique. The golden rule of conversion: don't give the opponent counterplay. Trade when ahead, avoid complications, control the tempo.",
  "Converting a winning advantage requires a different mindset: stop looking for brilliant moves and start looking for safe, accurate ones. The win doesn't require genius — just consistency.",
  "Winning positions are won or squandered in the conversion phase. The engine's principle: improve the worst piece, tighten the vice, give the opponent nothing to fight for.",
  "The hardest part of chess is winning a won game. From here: eliminate all opponent counterplay, create passed pawns or mating threats, and don't allow a single unnecessary complication.",
  "Up material with a safer king — the technique from here is to trade down to a winning endgame while never letting the opponent generate real counterplay. Patient, accurate chess wins this.",
  // ── grandmaster coaching additions ──
  "Conversion is a discipline: trade pieces (not pawns), activate the king, and create a passed pawn. In that order, every advantage converts.",
  "The engine's approach to conversion: simplify the position by exchanging the opponent's active pieces, then push the material advantage in a clean endgame. Follow that template.",
  "When ahead, the golden rule is: every trade makes the advantage more permanent. The fewer pieces on the board, the harder it is for the opponent to generate tricks.",
  "Conversion technique: don't look for brilliance — look for safety. The position is already winning; the only enemy now is overconfidence.",
];

const INITIATIVE_LINES = [
  "The initiative belongs to the player whose opponent must react to threats. Right now, the tempo game is the decisive battle — every forcing move extends the initiative, every quiet move risks losing it.",
  "Holding the initiative in chess means your opponent is constantly solving problems rather than creating them. The key: keep creating new threats so the opponent never gets a free move.",
  "The initiative is precious — and fragile. One unnecessary quiet move can hand it back. While ahead in tempo, ask every move: 'Does this create a new problem for my opponent?'",
  "Chess at the highest level is often a battle for the initiative. The side making forcing moves controls the game; the side reacting is always slightly behind.",
  // ── grandmaster coaching additions ──
  "The initiative is chess's most volatile asset: one wasted move gives it to the opponent. Every tempo must create a new obligation.",
  "Kasparov's principle of the initiative: maintain pressure relentlessly. The moment you take a 'rest move,' the opponent seizes control.",
  "Initiative = tempo. Tempo = control. Control = winning chances. Every forcing move that creates a new threat extends this chain.",
  "The attacking side dictates the game while holding the initiative. The moment that shifts, the entire dynamic of the position reverses.",
];

// ── Blunder with missed tactic lines ─────────────────────────────────────────
// More specific coaching after errors — references what was available.
const MISSED_TACTIC_TEACHING = [
  "Before every move, it's worth asking: can I win material, give a forcing check, or create a new threat? That habit catches the moves that get missed in games.",
  "The pattern recognition required to find these moves is exactly what tactical puzzles develop. The more familiar the pattern, the faster it appears in a real game.",
  "In positions with multiple captures or checks available, always calculate the most forcing line first — checks, captures, threats — before choosing a quieter continuation.",
  "This is a teaching moment: the forcing moves were there, but the quiet move was chosen. Strong players develop the reflex to see every capture and check before settling on a plan.",
];

// ── Enhanced draw lesson lines ────────────────────────────────────────────────
const DRAW_LESSON_LINES = [
  "A draw from a winning position is one of the most instructive outcomes in chess — it reveals where the technique broke down. Review the endgame to find the precise moment the win slipped away.",
  "Half a point instead of a full point. The game was likely won at some stage — identifying when it became drawn and why is the most valuable lesson this game offers.",
  "Draws from winning positions are how endgame technique gets built. Every world champion has studied exactly these types of positions until the converting technique becomes second nature.",
  "The most important question after a drawn game from a winning position: where was the last moment a win was still achievable? Identify that position and study it until the technique is clear.",
  // ── grandmaster coaching additions ──
  "A drawn game that should have been won is the best teacher in chess. The moment the win disappeared is the most valuable position in the entire game — find it and master it.",
  "The draw is a reminder: advantage doesn't convert itself. The technique required — whether it's king activation, pawn promotion, or piece coordination — must be studied and practiced.",
  "Half a point lost. The coaching takeaway: review the endgame move by move. The moment the evaluation went from 'winning' to 'drawn' reveals the exact technique that was needed.",
  "Draws from better positions build character — and technique. The best response: analyze the critical moment, understand the required method, and file it away for next time.",
];

// ── Time-pressure coaching ────────────────────────────────────────────────────
const TIME_PRESSURE_LINES = [
  "In time pressure, the instinct is to play quickly — but the hardest-to-see moves are the most powerful ones. A few extra seconds on key moves can change the game.",
  "Time pressure narrows the calculation horizon — that's when blunders happen. Try to identify the two or three most forcing moves quickly, rather than calculating everything.",
  "Chess under time pressure rewards pattern recognition over calculation. The more patterns you know, the faster the right move appears when seconds are scarce.",
];

// ─────────────────────────────────────────────────────────────────────────────
//  PURE HELPERS

function getMaterialValue(fen) {
  if (fen === 'start') fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  let value = 0;
  for (const char of fen) {
    if (char === ' ') break;
    const piece = char.toLowerCase();
    if (MATERIAL_VALUES[piece]) {
      const multiplier = char === char.toUpperCase() ? 1 : -1;
      value += MATERIAL_VALUES[piece] * multiplier;
    }
  }
  return value;
}

function getPieceNameFromFen(piece) {
  const m = { 'p': 'pawn', 'n': 'knight', 'b': 'bishop', 'r': 'rook', 'q': 'queen', 'k': 'king' };
  return m[piece.toLowerCase()] || 'piece';
}

function colorName(color) { return color === 'w' ? 'White' : 'Black'; }

function isOpenFile(fen, square) {
  try {
    const chess = new Chess(fen);
    const file = square[0];
    for (let r = 1; r <= 8; r++) {
      const p = chess.get(`${file}${r}`);
      if (p && p.type === 'p') return false;
    }
    return true;
  } catch (e) { return false; }
}

function isSemiOpenFile(fen, square, color) {
  try {
    const chess = new Chess(fen);
    const file = square[0];
    for (let r = 1; r <= 8; r++) {
      const p = chess.get(`${file}${r}`);
      if (p && p.type === 'p' && p.color === color) return false;
    }
    return true;
  } catch (e) { return false; }
}

function isSquareDefended(fen, square, color) {
  try { return new Chess(fen).isAttacked(square, color); }
  catch (e) { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GEOMETRY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all 8 directional rays from a square as arrays of squares. */
function getRays(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  const dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  return dirs.map(([df, dr]) => {
    const ray = [];
    let f = file + df, r = rank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      ray.push(`${String.fromCharCode(97 + f)}${r + 1}`);
      f += df; r += dr;
    }
    return ray;
  }).filter(ray => ray.length > 0);
}

/** Returns squares in the "king zone" used for attack-count heuristics. */
function getKingZone(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  const zone = [];
  for (let df = -2; df <= 2; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      const f = file + df, r = rank + dr;
      if (f >= 0 && f <= 7 && r >= 0 && r <= 7 && !(df === 0 && dr === 0))
        zone.push(`${String.fromCharCode(97 + f)}${r + 1}`);
    }
  }
  return zone;
}

/**
 * Returns the two squares a pawn of the given color attacks from `square`.
 * Pawns attack diagonally forward (white: rank+1, black: rank-1).
 */
function getPawnAttackSquares(color, square) {
  const f  = square.charCodeAt(0) - 97;
  const r  = parseInt(square[1]);
  const dr = color === 'w' ? 1 : -1;
  const nr = r + dr;
  if (nr < 1 || nr > 8) return [];
  const squares = [];
  if (f > 0) squares.push(`${String.fromCharCode(97 + f - 1)}${nr}`);
  if (f < 7) squares.push(`${String.fromCharCode(97 + f + 1)}${nr}`);
  return squares;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HIGH-VALUE TARGET EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────
function extractBestMoveTargets(fen, bestMoveSan) {
  try {
    const chess = new Chess(fen);
    const move = chess.move(bestMoveSan);
    if (!move) return [];

    const targets = [];
    // Only count the piece that the best move DIRECTLY captures
    if (move.captured && move.captured.toLowerCase() !== 'k') {
      targets.push({ piece: getPieceNameFromFen(move.captured), value: MATERIAL_VALUES[move.captured.toLowerCase()] || 0, type: 'capture' });
    }

    // From the landing square, only report pieces that are genuinely HANGING
    // (attacked by us but NOT defended by the opponent) — not just any piece in range.
    const afterFen = chess.fen();
    const fenParts = afterFen.split(' ');
    fenParts[1] = move.color; // Pretend it's still the mover's turn
    fenParts[3] = '-';
    const tempChess = new Chess(fenParts.join(' '));
    const attacks = tempChess.moves({ square: move.to, verbose: true });

    for (const atk of attacks) {
      if (atk.captured && (MATERIAL_VALUES[atk.captured.toLowerCase()] || 0) >= 300) {
        if (atk.captured.toLowerCase() !== 'k') {
          // Only count this as a real target if the piece is undefended (truly hanging)
          const oppColor = move.color === 'w' ? 'b' : 'w';
          const isDefended = isSquareDefended(afterFen, atk.to, oppColor);
          if (!isDefended) {
            targets.push({ piece: getPieceNameFromFen(atk.captured), value: MATERIAL_VALUES[atk.captured.toLowerCase()], type: 'attack' });
          }
        }
      }
    }

    const uniqueTargets = [];
    const seen = new Set();
    targets.sort((a,b) => {
      if (b.value !== a.value) return b.value - a.value;
      if (a.type === 'capture' && b.type !== 'capture') return -1;
      if (b.type === 'capture' && a.type !== 'capture') return 1;
      return 0;
    }).forEach(t => {
      if (!seen.has(t.piece)) {
        seen.add(t.piece);
        uniqueTargets.push(t);
      }
    });

    // If there is only one target and it's just an attack (not a capture, not a fork),
    // it's merely a 1-move threat. Do not return it as a tactical target.
    if (uniqueTargets.length === 1 && uniqueTargets[0].type === 'attack') {
      return [];
    }

    return uniqueTargets.map(t => t.piece);
  } catch(e) { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TACTICAL DETECTORS
// ─────────────────────────────────────────────────────────────────────────────

/** Collect all opponent threats after a position is reached. */
export function detectThreats(fen) {
  try {
    const tempChess = new Chess(fen);
    const oppColor = tempChess.turn();
    const oppMoves = tempChess.moves({ verbose: true });
    const threats = [];
    for (const m of oppMoves) {
      tempChess.move(m);
      const isCheck = tempChess.isCheck();
      tempChess.undo();

      if (m.captured || isCheck) {
        const targetVal = m.captured ? (MATERIAL_VALUES[m.captured.toLowerCase()] || 0) : 0;
        const attackerVal = MATERIAL_VALUES[m.piece.toLowerCase()] || 0;
        const isDefended = isSquareDefended(fen, m.to, oppColor === 'w' ? 'b' : 'w');

        // A threat is valid if it wins material safely (target >= attacker),
        // or the target is undefended, or it's a safe check
        if (!isDefended || attackerVal <= targetVal || (isCheck && !isDefended)) {
          threats.push({
            threatMove: m.san,
            threatens: m.captured ? getPieceNameFromFen(m.captured) : 'check',
            captured: m.captured,
            val: m.captured ? targetVal : (isCheck ? 200 : 0),
            attackerVal: attackerVal,
            targetVal: targetVal,
            isDefended: isDefended
          });
        }
      }
    }
    threats.sort((a, b) => b.val - a.val);
    return threats.slice(0, 3);
  } catch (e) { return []; }
}

/** Detect if the given color's king is on a weak back rank. */
function hasBackRankWeakness(fen, color) {
  try {
    const chess = new Chess(fen);
    const backRank = color === 'w' ? '1' : '8';
    const board = chess.board().flat();
    const kingSquare = board.find(sq => sq && sq.type === 'k' && sq.color === color)?.square;
    if (!kingSquare || !kingSquare.endsWith(backRank)) return false;
    const oppColor = color === 'w' ? 'b' : 'w';
    if (!board.some(sq => sq && sq.color === oppColor && ['r', 'q'].includes(sq.type))) return false;

    const backRankPieces = board.filter(
      sq => sq && sq.square.endsWith(backRank) && sq.color === color && sq.type !== 'k'
    ).length;
    if (backRankPieces >= 3) return false;

    return chess.moves({ square: kingSquare, verbose: true }).length <= 1;
  } catch (e) { return false; }
}

/** Returns files where a color's pawn is one step from promotion. */
function detectPromotionThreats(fen, color) {
  try {
    const rows = fen.split(' ')[0].split('/');
    const rowIndex = color === 'w' ? 1 : 6;
    const row = rows[rowIndex];
    const files = [];
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) { file += parseInt(ch); }
      else {
        const isMatch = (color === 'w' && ch === 'P') || (color === 'b' && ch === 'p');
        if (isMatch) files.push(String.fromCharCode(97 + file));
        file++;
      }
    }
    return files;
  } catch (e) { return []; }
}

/** True if the piece on `square` is absolutely pinned to the king of `color`.
 *  A piece is pinned when it sits between its own king and an enemy slider
 *  (bishop/rook/queen) on the same rank, file, or diagonal, with no other
 *  piece between the king and itself. */
function isPiecePinned(fen, square, color) {
  try {
    const chess = new Chess(fen);
    const piece = chess.get(square);
    if (!piece || piece.color !== color) return false;

    const board      = chess.board().flat();
    const oppColor   = color === 'w' ? 'b' : 'w';
    const kingSquare = board.find(sq => sq && sq.type === 'k' && sq.color === color)?.square;
    if (!kingSquare) return false;

    for (const ray of getRays(kingSquare)) {
      const sqIdx = ray.indexOf(square);
      if (sqIdx === -1) continue;

      let blocked = false;
      for (let i = 0; i < sqIdx; i++) {
        if (chess.get(ray[i])) { blocked = true; break; }
      }
      if (blocked) continue;

      const dFile = ray[0].charCodeAt(0) - kingSquare.charCodeAt(0);
      const dRank = parseInt(ray[0][1])  - parseInt(kingSquare[1]);
      const isDiag     = Math.abs(dFile) === Math.abs(dRank) && dFile !== 0;
      const isStraight = dFile === 0 || dRank === 0;

      for (let i = sqIdx + 1; i < ray.length; i++) {
        const p = chess.get(ray[i]);
        if (!p) continue;
        if (p.color !== oppColor) break;
        if (isDiag     && ['b', 'q'].includes(p.type)) return true;
        if (isStraight && ['r', 'q'].includes(p.type)) return true;
        break;
      }
    }
    return false;
  } catch (e) { return false; }
}

/** Detect fork: the moved piece attacks 2+ high-value enemy pieces at once. */
function detectFork(fen, move) {
  if (!['n', 'b', 'r', 'q', 'p'].includes(move.piece)) return false;
  try {
    // ── Pawn fork: use actual diagonal attack squares (chess.js move generation
    //    doesn't work reliably when we flip the turn for pawns) ──────────────
    if (move.piece === 'p') {
      const chess    = new Chess(fen);
      const oppColor = move.color === 'w' ? 'b' : 'w';
      const attacks  = getPawnAttackSquares(move.color, move.to);
      const highVal  = attacks
        .map(sq => chess.get(sq))
        .filter(p => p && p.color === oppColor && ['q', 'r', 'b', 'n'].includes(p.type));
      const kingHit  = attacks.some(sq => {
        const p = chess.get(sq);
        return p && p.type === 'k' && p.color === oppColor;
      });
      if (highVal.length >= 2) {
        return { count: highVal.length, pieces: highVal.map(p => getPieceNameFromFen(p.type)) };
      }
      if (highVal.length >= 1 && kingHit) {
        return { count: 2, pieces: ['king', getPieceNameFromFen(highVal[0].type)], includesKing: true };
      }
      return false;
    }

    // ── Non-pawn fork: flip turn so chess.js can generate moves from move.to ──
    const fenParts = fen.split(' ');
    fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
    fenParts[3] = '-';
    const swapChess = new Chess(fenParts.join(' '));
    const attacks = swapChess.moves({ square: move.to, verbose: true });
    const highValue = attacks.filter(a => a.captured && ['q','r','b','n'].includes(a.captured.toLowerCase()));
    if (highValue.length >= 2) return { count: highValue.length, pieces: highValue.map(a => getPieceNameFromFen(a.captured)) };

    try {
      const origChess = new Chess(fen);
      if (origChess.inCheck() && highValue.length >= 1) {
        return { count: 2, pieces: ['king', getPieceNameFromFen(highValue[0].captured)], includesKing: true };
      }
    } catch (e) {}

    return false;
  } catch (e) { return false; }
}

/** Detect skewer: moved piece attacks a valuable piece with a lesser piece behind it.
 *  Also detects king skewers: attacking the king forces it to flee, exposing a valuable piece. */
function detectSkewer(fen, move) {
  if (!['b', 'r', 'q'].includes(move.piece)) return false;
  try {
    const chess    = new Chess(fen);
    const oppColor = move.color === 'w' ? 'b' : 'w';
    for (const ray of getRays(move.to)) {
      const dFile      = ray[0].charCodeAt(0) - move.to.charCodeAt(0);
      const dRank      = parseInt(ray[0][1])  - parseInt(move.to[1]);
      const isDiag     = Math.abs(dFile) === Math.abs(dRank) && dFile !== 0;
      const isStraight = dFile === 0 || dRank === 0;
      if (move.piece === 'b' && !isDiag)     continue;
      if (move.piece === 'r' && !isStraight) continue;

      const hit = [];
      for (const sq of ray) {
        const p = chess.get(sq);
        if (p) { hit.push({ ...p, square: sq }); }
        if (hit.length === 2) break;
      }
      if (hit.length === 2 && hit[0].color === oppColor && hit[1].color === oppColor) {
        // Classic skewer: front piece is more valuable than the piece behind it,
        // AND front piece is more valuable than the attacker (so it is forced to flee)
        if (MATERIAL_VALUES[hit[0].type] > MATERIAL_VALUES[hit[1].type] && MATERIAL_VALUES[hit[0].type] > MATERIAL_VALUES[move.piece]) {
          return { frontPiece: getPieceNameFromFen(hit[0].type), behindPiece: getPieceNameFromFen(hit[1].type), frontSquare: hit[0].square, isKingSkewer: false };
        }
        // King skewer: front piece is the king — it must move, exposing a valuable piece behind
        if (hit[0].type === 'k' && MATERIAL_VALUES[hit[1].type] >= 300) {
          return { frontPiece: 'king', behindPiece: getPieceNameFromFen(hit[1].type), frontSquare: hit[0].square, isKingSkewer: true };
        }
      }
    }
    return false;
  } catch (e) { return false; }
}

/** Detect discovered attack: moving from 'from' unmasks a same-side long-range piece's attack. */
function detectDiscoveredAttack(beforeFen, move) {
  try {
    const chess = new Chess(beforeFen);
    const oppColor = move.color === 'w' ? 'b' : 'w';
    const board = chess.board().flat();

    for (const sq of board) {
      if (!sq || sq.color !== move.color || !['b', 'r', 'q'].includes(sq.type)) continue;
      for (const ray of getRays(sq.square)) {
        if (ray.includes(move.to)) continue; // The piece slid along the same line; nothing was revealed!
        let passedMoveFrom = false;
        for (const raySquare of ray) {
          if (raySquare === move.from) {
            passedMoveFrom = true;
            continue;
          }
          const p = chess.get(raySquare);
          if (!p) continue;
          if (!passedMoveFrom) break;
          if (p.color === oppColor) {
            // Discovered check: revealed attacker targets the king
            if (p.type === 'k') {
              return {
                revealedPiece: getPieceNameFromFen(sq.type),
                targetPiece: 'king',
                targetSquare: raySquare,
                isCheck: true,
              };
            }
            // Normal discovered attack: target must be valuable enough
            if (MATERIAL_VALUES[p.type] >= 200) {
              return {
                revealedPiece: getPieceNameFromFen(sq.type),
                targetPiece: getPieceNameFromFen(p.type),
                targetSquare: raySquare,
                isCheck: false,
              };
            }
          }
          break;
        }
      }
    }
    return false;
  } catch (e) { return false; }
}

/** Detect zwischenzug: an in-between forcing move played instead of the expected recapture.
 *  Fires for checks OR when the intermediate move directly threatens a high-value piece (≥500 cp).
 */
function detectZwischenzug(move, previousFen) {
  try {
    const chess = new Chess(previousFen);
    // There must have been a capturable piece on move.from for a recapture to be expected
    const expectedRecapture = chess.moves({ verbose: true }).find(m => m.to === move.from && m.captured);
    if (!expectedRecapture) return false;

    // Classic zwischenzug: delivering check instead of recapturing
    if (move.san.includes('+') || move.san.includes('#')) {
      return { type: 'check' };
    }

    // Extended zwischenzug: the in-between move threatens a high-value enemy piece (rook or better)
    // without capturing on the expected recapture square
    if (move.from !== expectedRecapture.to) {
      try {
        const afterChess = new Chess(previousFen);
        afterChess.move(move);                           // apply the in-between move
        const oppColor = move.color === 'w' ? 'b' : 'w';
        // Flip turn to generate attacker's threats from the new position
        const fenParts = afterChess.fen().split(' ');
        fenParts[1] = move.color;
        fenParts[3] = '-';
        const threatChess = new Chess(fenParts.join(' '));
        const threats = threatChess.moves({ verbose: true })
          .filter(m => m.captured && (MATERIAL_VALUES[m.captured.toLowerCase()] || 0) >= 500);
        if (threats.length > 0) return { type: 'material_threat' };
      } catch (e) { /* fall through */ }
    }

    return false;
  } catch (e) { return false; }
}

/** Detect X-ray: our piece X-rays through one of our own pieces onto a high-value enemy. */
function detectXRay(fen, move) {
  if (!['b', 'r', 'q'].includes(move.piece)) return false;
  try {
    const chess = new Chess(fen);
    for (const ray of getRays(move.to)) {
      const dFile      = ray[0].charCodeAt(0) - move.to.charCodeAt(0);
      const dRank      = parseInt(ray[0][1])  - parseInt(move.to[1]);
      const isDiag     = Math.abs(dFile) === Math.abs(dRank) && dFile !== 0;
      const isStraight = dFile === 0 || dRank === 0;
      if (move.piece === 'b' && !isDiag)     continue;
      if (move.piece === 'r' && !isStraight) continue;

      const hit = [];
      for (const sq of ray) {
        const p = chess.get(sq);
        if (p) { hit.push({ ...p, square: sq }); }
        if (hit.length === 2) break;
      }
      if (hit.length === 2 && hit[0].color === move.color && hit[1].color !== move.color && MATERIAL_VALUES[hit[1].type] >= 500) {
        return { through: getPieceNameFromFen(hit[0].type), target: getPieceNameFromFen(hit[1].type), targetSquare: hit[1].square };
      }
    }
    return false;
  } catch (e) { return false; }
}

/** Detect removal of defender: a capture removes the piece defending another piece. */
function detectRemovalOfDefender(beforeFen, afterFen, move) {
  if (!move.captured) return false;
  try {
    const oppColor = move.color === 'w' ? 'b' : 'w';
    const chessAfter = new Chess(afterFen);
    const board = chessAfter.board().flat();

    for (const sq of board) {
      if (!sq || sq.color !== oppColor || sq.type === 'k') continue;
      
      // If an enemy piece is attacked by us now, but went from Defended to Undefended
      if (chessAfter.isAttacked(sq.square, move.color)) {
        const wasDefended = isSquareDefended(beforeFen, sq.square, oppColor);
        const isDefendedNow = isSquareDefended(afterFen, sq.square, oppColor);
        
        if (wasDefended && !isDefendedNow) {
          return { piece: getPieceNameFromFen(sq.type), square: sq.square };
        }
      }
    }
    return false;
  } catch (e) { return false; }
}

/** Detect hanging opponent pieces after a move has been played. */
function detectHangingPieces(fen, attackerColor) {
  try {
    const chess = new Chess(fen);
    const defenderColor = attackerColor === 'w' ? 'b' : 'w';
    const board = chess.board().flat();
    const hanging = [];
    for (const sq of board) {
      if (!sq || sq.color !== defenderColor || sq.type === 'k') continue;
      if (chess.isAttacked(sq.square, attackerColor) && !isSquareDefended(fen, sq.square, defenderColor)) {
        hanging.push({ piece: getPieceNameFromFen(sq.type), square: sq.square, value: MATERIAL_VALUES[sq.type] || 0 });
      }
    }
    return hanging.sort((a, b) => b.value - a.value);
  } catch (e) { return []; }
}

/**
 * Detect an aggressive tactical sacrifice.
 * Fires if material is sacrificed but the opponent's king exposure drastically increases.
 */
function detectAggressiveSacrifice(beforeFen, afterFen, move, materialGain) {
  if (materialGain > -200) return false; // Needs a real material sacrifice
  try {
    const oppColor = move.color === 'w' ? 'b' : 'w';
    const beforeExp = detectKingExposure(beforeFen, oppColor);
    const afterExp = detectKingExposure(afterFen, oppColor);
    
    if (beforeExp && afterExp) {
      const shieldDrop = beforeExp.pawnShield - afterExp.pawnShield;
      const attackJump = afterExp.attackCount - beforeExp.attackCount;
      if (shieldDrop >= 1 || attackJump >= 2 || (afterExp.isExposed && !beforeExp.isExposed)) {
        return true;
      }
    }
    return false;
  } catch (e) { return false; }
}

/** Detect if the mover's own king is now dangerously exposed after their move. */
function detectKingExposure(fen, color) {
  try {
    const chess = new Chess(fen);
    const board = chess.board().flat();
    const kingSquare = board.find(sq => sq && sq.type === 'k' && sq.color === color)?.square;
    if (!kingSquare) return false;
    const file = kingSquare[0];
    const rank = parseInt(kingSquare[1]);

    // Two-rank weighted pawn shield:
    //   immediate rank (rank±1) → full point per pawn
    //   far rank (rank±2)       → half point per pawn (advanced but still partial cover)
    let exactPawnCount = 0;
    const pawnShield = [-1, 0, 1].reduce((count, df) => {
      const f = String.fromCharCode(file.charCodeAt(0) + df);
      if (f < 'a' || f > 'h') return count;
      const immediateRank = color === 'w' ? rank + 1 : rank - 1;
      const farRank       = color === 'w' ? rank + 2 : rank - 2;
      const immediate = chess.get(`${f}${immediateRank}`);
      const far       = (farRank >= 1 && farRank <= 8) ? chess.get(`${f}${farRank}`) : null;
      const hasImmediate = immediate && immediate.type === 'p' && immediate.color === color;
      const hasFar       = far       && far.type       === 'p' && far.color       === color;
      if (hasImmediate || hasFar) exactPawnCount++;
      return count + (hasImmediate ? 1 : hasFar ? 0.5 : 0);
    }, 0);

    const oppColor   = color === 'w' ? 'b' : 'w';
    // Piece-weighted attack pressure: queens/rooks attacking king zone are much more dangerous
    //   than bishops/knights or pawns — each piece type gets a weight
    const ATTACK_WEIGHTS = { q: 3, r: 2, b: 1.5, n: 1.2, p: 0.8, k: 0 };
    const kingZone = getKingZone(kingSquare);
    // For each zone square that's actually attacked, find the most threatening
    // attacker type using lightweight geometric feasibility checks (piece type +
    // rank/file/diagonal alignment) rather than full move generation.
    let weightedPressure = 0;
    for (const sq of kingZone) {
      if (!chess.isAttacked(sq, oppColor)) continue;
      const sqFile = sq.charCodeAt(0) - 97;
      const sqRank = parseInt(sq[1]) - 1;
      let maxWeight = ATTACK_WEIGHTS.p; // minimum — a pawn-level threat
      for (const p of board) {
        if (!p || p.color !== oppColor) continue;
        const w = ATTACK_WEIGHTS[p.type] || 1;
        if (w <= maxWeight) continue;
        const pFile = p.square.charCodeAt(0) - 97;
        const pRank = parseInt(p.square[1]) - 1;
        const df = Math.abs(sqFile - pFile);
        const dr = Math.abs(sqRank - pRank);
        // Geometric feasibility: does this piece type plausibly attack along this vector?
        if      (p.type === 'q')                                                       maxWeight = w;
        else if (p.type === 'r' && (df === 0 || dr === 0))                            maxWeight = w;
        else if (p.type === 'b' && df === dr && df > 0)                               maxWeight = w;
        else if (p.type === 'n' && ((df === 1 && dr === 2) || (df === 2 && dr === 1))) maxWeight = w;
      }
      weightedPressure += maxWeight * 0.3;
    }
    const attackCount = kingZone.filter(sq => chess.isAttacked(sq, oppColor)).length;

    // isExposed: shield below 1.5 (accounts for advanced pawns) AND heavy attack pressure
    return { pawnShield, exactPawnCount, attackCount, weightedPressure, kingSquare,
             isExposed: pawnShield < 1.5 && (attackCount >= 3 || weightedPressure >= 2.0) };
  } catch (e) { return false; }
}

/** Detect prophylaxis: this move neutralized a serious opponent threat. */
function detectProphylaxis(beforeFen, afterFen) {
  try {
    const parts    = beforeFen.split(' ');
    const oppColor = parts[1] === 'w' ? 'b' : 'w';
    parts[1] = oppColor;
    parts[3] = '-';
    const oppTurnBefore = parts.join(' ');

    const THRESHOLD = 300;
    const before = detectThreats(oppTurnBefore).filter(
      t => (MATERIAL_VALUES[(t.captured || 'p').toLowerCase()] || 0) >= THRESHOLD
    );
    const after = detectThreats(afterFen).filter(
      t => (MATERIAL_VALUES[(t.captured || 'p').toLowerCase()] || 0) >= THRESHOLD
    );
    if (before.length > 0 && after.length === 0) return { preventedThreat: before[0].threatMove };
    return false;
  } catch (e) { return false; }
}

/** Detect if the king is actively centralizing in an endgame position. */
function detectKingActivity(fen, move) {
  if (move.piece !== 'k') return false;
  try {
    const piecesLeft = new Chess(fen).board().flat().filter(Boolean).length;
    if (piecesLeft > 14) return false;
    const rank = parseInt(move.to[1]);
    const isCenter = ['c','d','e','f'].includes(move.to[0]) && rank >= 3 && rank <= 6;
    return { isActivating: isCenter, toSquare: move.to };
  } catch (e) { return false; }
}

/** Heuristic zugzwang check: in endgames, does opponent have only self-harming moves? */
function detectZugzwang(fen) {
  try {
    const chess = new Chess(fen);
    const piecesLeft = chess.board().flat().filter(Boolean).length;
    if (piecesLeft > 12) return false;
    const oppMoves = chess.moves({ verbose: true });
    if (oppMoves.length === 0) return false;
    // Only fire zugzwang detection in king+pawn or king+minor endgames
    // (excludes positions with active rooks that can always find neutral moves)
    const hasRookOrQueen = chess.board().flat()
      .some(p => p && ['r', 'q'].includes(p.type) && piecesLeft > 4);
    if (hasRookOrQueen) return false;

    const sideToMove = chess.turn();
    const matBefore  = getMaterialValue(fen);
    let badMoves = 0;
    let neutralMoves = 0;
    // Check ALL moves for a comprehensive zugzwang assessment
    for (const m of oppMoves) {
      const temp     = new Chess(fen);
      temp.move(m);
      const matAfter = getMaterialValue(temp.fen());
      const isBad = sideToMove === 'w'
        ? matAfter < matBefore - 60    // tighter threshold: 60cp vs 80cp
        : matAfter > matBefore + 60;
      const isNeutral = Math.abs(matAfter - matBefore) <= 30;
      if (isBad) badMoves++;
      if (isNeutral) neutralMoves++;
    }
    // Zugzwang: at least 65% of moves are bad AND very few neutral ones
    const badRatio = badMoves / oppMoves.length;
    return badRatio >= 0.65 && neutralMoves <= 1;
  } catch (e) { return false; }
}

/**
 * Detect fianchetto: bishop develops to g2, b2 (White) or g7, b7 (Black),
 * with a pawn having already moved from that square to open the diagonal.
 */
function detectFianchetto(beforeFen, move) {
  if (move.piece !== 'b') return false;
  const fianchettoSquares = move.color === 'w'
    ? ['g2', 'b2']
    : ['g7', 'b7'];
  if (!fianchettoSquares.includes(move.to)) return false;
  try {
    // Verify the destination square was genuinely empty — meaning the own pawn
    // had already moved forward, clearing the square for the bishop.
    // If the destination held an enemy piece, this is a capture, NOT a fianchetto.
    const chess = new Chess(beforeFen);
    const dest = chess.get(move.to);
    if (dest !== null) return false; // something was on the square (capture) — not fianchetto

    // Also verify the pawn on that file has vacated the start square
    const startRank = move.color === 'w' ? '2' : '7';
    const pawnSq = `${move.to[0]}${startRank}`;
    const p = chess.get(pawnSq);
    // Pawn should have left its start square (moved forward to g3/b3 or g6/b6)
    if (p && p.type === 'p' && p.color === move.color) return false; // pawn never moved
    return { square: move.to };
  } catch (e) { return false; }
}

/**
 * Detect if a player's move connected their two rooks (back rank now unobstructed
 * between them). Fires when neither rook was connected before but they are after.
 */
function detectConnectedRooks(beforeFen, afterFen, move) {
  try {
    const color = move.color;
    const backRank = color === 'w' ? '1' : '8';

    function rooksConnected(fen) {
      const chess = new Chess(fen);
      const board = chess.board().flat();
      const rooks = board.filter(sq => sq && sq.color === color && sq.type === 'r' &&
        sq.square.endsWith(backRank));
      if (rooks.length < 2) return false;
      const files = rooks.map(r => r.square.charCodeAt(0)).sort((a, b) => a - b);
      // Check clear path between the two rooks on the back rank
      for (let f = files[0] + 1; f < files[1]; f++) {
        if (chess.get(`${String.fromCharCode(f)}${backRank}`)) return false;
      }
      return true;
    }

    return !rooksConnected(beforeFen) && rooksConnected(afterFen);
  } catch (e) { return false; }
}

/**
 * Detect if a pawn capture just created an isolated pawn for the mover.
 * An isolated pawn has no friendly pawn on either adjacent file.
 */
function detectIsolatedPawn(afterFen, move) {
  if (move.piece !== 'p' || !move.captured) return false;
  try {
    const chess   = new Chess(afterFen);
    const file    = move.to[0];
    const fileIdx = file.charCodeAt(0) - 97;
    const adjFiles = [fileIdx - 1, fileIdx + 1]
      .filter(f => f >= 0 && f <= 7)
      .map(f => String.fromCharCode(97 + f));

    // Check if any friendly pawn exists on adjacent files
    const board = chess.board().flat();
    const hasFriendlyAdj = adjFiles.some(af =>
      board.some(sq => sq && sq.color === move.color && sq.type === 'p' && sq.square[0] === af)
    );
    return !hasFriendlyAdj
      ? { file, square: move.to }
      : false;
  } catch (e) { return false; }
}

/**
 * Detect if a pawn capture opened a file (no pawns remain on that file for either side).
 */
function detectOpenFileCreated(beforeFen, afterFen, move) {
  if (move.piece !== 'p' || !move.captured) return false;
  try {
    const file = move.to[0]; // destination file after capture
    // Before capture: was there a pawn on this file?
    const chessBefore = new Chess(beforeFen);
    const hadPawnBefore = Array.from({ length: 8 }, (_, r) => chessBefore.get(`${file}${r + 1}`))
      .some(p => p && p.type === 'p');
    if (!hadPawnBefore) return false;
    // After capture: is the file fully open?
    return isOpenFile(afterFen, `${file}1`);
  } catch (e) { return false; }
}

// ── NEW DETECTORS ─────────────────────────────────────────────────────────────

/**
 * Detect double check: the moving piece gives check AND vacating its origin
 * reveals a discovered check simultaneously.
 * Strategy: after the move (currentFen), temporarily remove the moved piece.
 * If the opponent king is still attacked by the mover's color, a second piece
 * is also giving check → it's a double check.
 */
function detectDoubleCheck(currentFen, move) {
  if (!move.san.includes('+') && !move.san.includes('#')) return false;
  try {
    const oppColor   = move.color === 'w' ? 'b' : 'w';
    const chess      = new Chess(currentFen);
    const board      = chess.board().flat();
    const kingSquare = board.find(sq => sq && sq.type === 'k' && sq.color === oppColor)?.square;
    if (!kingSquare) return false;

    // 1. Verify the moved piece is directly attacking the king
    const df = Math.abs(move.to.charCodeAt(0) - kingSquare.charCodeAt(0));
    const dr = Math.abs(parseInt(move.to[1]) - parseInt(kingSquare[1]));
    let directCheck = false;
    
    if (move.piece === 'n' && ((df === 1 && dr === 2) || (df === 2 && dr === 1))) {
      directCheck = true;
    } else if (move.piece === 'p') {
      const forward = move.color === 'w' ? 1 : -1;
      if (parseInt(kingSquare[1]) - parseInt(move.to[1]) === forward && df === 1) {
        directCheck = true;
      }
    } else if (['b', 'r', 'q'].includes(move.piece)) {
      if (df === 0 || dr === 0) {
        if (['r', 'q'].includes(move.piece)) directCheck = true;
      } else if (df === dr) {
        if (['b', 'q'].includes(move.piece)) directCheck = true;
      }
      
      // Verify no blocking pieces
      if (directCheck) {
        const stepF = df === 0 ? 0 : (kingSquare.charCodeAt(0) - move.to.charCodeAt(0)) / df;
        const stepR = dr === 0 ? 0 : (parseInt(kingSquare[1]) - parseInt(move.to[1])) / dr;
        let f = move.to.charCodeAt(0) + stepF;
        let r = parseInt(move.to[1]) + stepR;
        while (String.fromCharCode(f) + r !== kingSquare) {
          if (chess.get(String.fromCharCode(f) + r)) {
            directCheck = false;
            break;
          }
          f += stepF;
          r += stepR;
        }
      }
    }
    
    if (!directCheck) return false;

    // 2. Remove the just-moved piece and check if the king is STILL in check (discovered check)
    chess.remove(move.to);
    if (chess.isAttacked(kingSquare, move.color)) {
      return { movingPiece: getPieceNameFromFen(move.piece) };
    }
    return false;
  } catch (e) { return false; }
}

/**
 * Detect rook (or queen) landing on the opponent's 7th rank, where it can
 * attack pawns and cramp the king. Only fires when there are opponent pieces
 * on that rank worth harassing.
 */
function detectRookOnSeventh(fen, move) {
  if (!['r', 'q'].includes(move.piece)) return false;
  const seventhRank = move.color === 'w' ? '7' : '2';
  if (!move.to.endsWith(seventhRank)) return false;
  try {
    const chess    = new Chess(fen);
    const oppColor = move.color === 'w' ? 'b' : 'w';
    let piecesOnRank = 0;
    for (let f = 0; f < 8; f++) {
      const sq = `${String.fromCharCode(97 + f)}${seventhRank}`;
      const p  = chess.get(sq);
      if (p && p.color === oppColor && sq !== move.to) piecesOnRank++;
    }
    return piecesOnRank > 0
      ? { rank: seventhRank, pieceName: getPieceNameFromFen(move.piece), piecesOnRank }
      : false;
  } catch (e) { return false; }
}

/**
 * Detect outpost: knight (or bishop) placed on an advanced central square that
 * cannot be attacked by any enemy pawn now or in the future (no enemy pawn on
 * adjacent files that could ever advance to attack the square).
 */
function detectOutpost(fen, move) {
  if (!['n', 'b'].includes(move.piece)) return false;
  try {
    const fileIdx = move.to.charCodeAt(0) - 97;
    const rank    = parseInt(move.to[1]);
    const oppColor = move.color === 'w' ? 'b' : 'w';

    // Must be in advanced territory (rank 5–7 for White, rank 2–4 for Black)
    const isAdvanced = (move.color === 'w' && rank >= 5) || (move.color === 'b' && rank <= 4);
    if (!isAdvanced) return false;

    const chess = new Chess(fen);

    // Check adjacent files for any enemy pawn that could ever attack this square.
    // An enemy pawn attacks diagonally forward; for white's piece at rank R,
    // a black pawn attacks from rank R+1 on adjacent files.
    const attackFiles = [fileIdx - 1, fileIdx + 1].filter(f => f >= 0 && f <= 7);
    const enemyPawnAttackRank = move.color === 'w' ? rank + 1 : rank - 1;

    for (const pf of attackFiles) {
      const attackSq = `${String.fromCharCode(97 + pf)}${enemyPawnAttackRank}`;
      if (attackSq[1] < '1' || attackSq[1] > '8') continue;
      const p = chess.get(attackSq);
      if (p && p.type === 'p' && p.color === oppColor) return false;
    }

    // Also check if an enemy pawn is already on the same file and can advance to attack
    for (const pf of attackFiles) {
      const fileChar = String.fromCharCode(97 + pf);
      // Look for enemy pawns that could march forward to reach the attack rank
      for (let r = 1; r <= 8; r++) {
        const p = chess.get(`${fileChar}${r}`);
        if (!p || p.type !== 'p' || p.color !== oppColor) continue;
        // Black pawn marches downward (decreasing rank), White pawn marches upward
        const canReach = oppColor === 'b'
          ? (r > enemyPawnAttackRank)   // black pawn above attack rank → can advance there
          : (r < enemyPawnAttackRank);  // white pawn below attack rank → can advance there
        if (canReach) return false;
      }
    }

    return { square: move.to, piece: getPieceNameFromFen(move.piece) };
  } catch (e) { return false; }
}

/**
 * Detect a trapped opponent piece: after the player's move, an enemy piece
 * (value ≥ 300) has zero legal moves AND is attacked, meaning it cannot escape.
 */
function detectTrappedPiece(fen, attackerColor) {
  try {
    const defenderColor = attackerColor === 'w' ? 'b' : 'w';
    
    // CRITICAL: If the defender is in check, chess.js will legally paralyze all their pieces,
    // making them all appear "trapped" (0 legal moves). We must abort to avoid hallucinations.
    if (new Chess(fen).inCheck()) return false;

    // Flip turn so chess.js generates moves for the defender
    const fenParts = fen.split(' ');
    fenParts[1] = defenderColor;
    fenParts[3] = '-';
    const defTurnFen = fenParts.join(' ');
    const chess = new Chess(defTurnFen);
    const board = chess.board().flat();

    for (const sq of board) {
      if (!sq || sq.color !== defenderColor || ['k', 'p'].includes(sq.type)) continue;
      if ((MATERIAL_VALUES[sq.type] || 0) < 300) continue;

      const moves = chess.moves({ square: sq.square, verbose: true });
      // Trapped: no escape moves AND the piece is under attack
      if (moves.length === 0 && new Chess(fen).isAttacked(sq.square, attackerColor)) {
        return { piece: getPieceNameFromFen(sq.type), square: sq.square };
      }
    }
    return false;
  } catch (e) { return false; }
}

/**
 * Detect bishop-pair advantage: the player just captured the opponent's bishop,
 * retaining their own pair while the opponent is left with one or zero bishops.
 * Returns info about the advantage if detected.
 */
function detectBishopPair(afterFen, move) {
  if (!move.captured || move.captured.toLowerCase() !== 'b') return false;
  try {
    const chess = new Chess(afterFen);
    const board = chess.board().flat();
    const playerBishops = board.filter(sq => sq && sq.color === move.color && sq.type === 'b').length;
    const oppBishops    = board.filter(sq => sq && sq.color !== move.color && sq.type === 'b').length;

    if (playerBishops >= 2 && oppBishops < 2) {
      return { playerBishops, oppBishops };
    }
    return false;
  } catch (e) { return false; }
}

/**
 * Detect if the mover has created a forced checkmate threat (mate-in-1 or mate-in-2).
 * Returns { matingSan, depth } where depth is 1 or 2.
 */
function detectMateThreats(currentFen, moverColor) {
  try {
    const parts = currentFen.split(' ');
    parts[1] = moverColor;
    parts[3] = '-';
    const moverTurnFen = parts.join(' ');
    const chess = new Chess(moverTurnFen);
    const followUps = chess.moves({ verbose: true });

    // Check for mate-in-1
    for (const m of followUps) {
      chess.move(m);
      if (chess.isCheckmate()) {
        chess.undo();
        return { matingSan: m.san, depth: 1 };
      }
      chess.undo();
    }

    // Check for mate-in-2 (mover has a move, opponent has any response, mover mates)
    // Only check forcing moves (checks) for performance; skip in complex positions
    const piecesOnBoard = new Chess(currentFen).board().flat().filter(Boolean).length;
    if (piecesOnBoard > 18) return false; // too complex to reliably search
    const forcingMoves = followUps.filter(m => m.san.includes('+') || m.san.includes('#'));
    for (const m1 of forcingMoves.slice(0, 5)) {  // limit to 5 for performance
      try {
        const chess2 = new Chess(moverTurnFen);
        chess2.move(m1);
        const oppReplies = chess2.moves({ verbose: true });
        let mateInAll = oppReplies.length > 0;
        for (const m2 of oppReplies) {
          const chess3 = new Chess(chess2.fen());
          chess3.move(m2);
          const myFollowUps = chess3.moves({ verbose: true });
          let foundMate = false;
          for (const m3 of myFollowUps) {
            const chess4 = new Chess(chess3.fen());
            chess4.move(m3);
            if (chess4.isCheckmate()) { foundMate = true; break; }
          }
          if (!foundMate) { mateInAll = false; break; }
        }
        if (mateInAll && oppReplies.length > 0) {
          return { matingSan: m1.san, depth: 2 };
        }
      } catch (e) { /* continue */ }
    }

    return false;
  } catch (e) { return false; }
}

/**
 * Detect an approaching checkmate scenario using engine evaluation context.
 * When the engine score is a forced-mate score (Mate in N), or when the position
 * has: exposed king + large material advantage + significant king attack pressure,
 * this returns { confidence: 'high'|'medium', attackCount, moverAhead }.
 * Used to select APPROACHING_MATE_LINES instead of generic positional commentary.
 * Does NOT fire if there is already a detected forced mate (handled by detectMateThreats).
 */
function detectApproachingMate(currentFen, moverColor, cpLoss) {
  try {
    const chess = new Chess(currentFen);
    const oppColor = moverColor === 'w' ? 'b' : 'w';
    const mat = getMaterialValue(currentFen);
    const moverAhead = moverColor === 'w' ? mat : -mat;
    if (moverAhead < 100) return false; // not materially ahead

    const oppKingExp = detectKingExposure(currentFen, oppColor);
    if (!oppKingExp || !oppKingExp.isExposed) return false;

    // High confidence: king has zero pawn shield AND heavy attack pressure
    if (oppKingExp.pawnShield === 0 && oppKingExp.attackCount >= 4 && moverAhead >= 200) {
      return { confidence: 'high', attackCount: oppKingExp.attackCount, moverAhead, kingSquare: oppKingExp.kingSquare };
    }
    // Medium confidence: minimal shield, multiple attacking zones, up material
    if (oppKingExp.pawnShield <= 0.5 && oppKingExp.attackCount >= 3 && moverAhead >= 300) {
      return { confidence: 'medium', attackCount: oppKingExp.attackCount, moverAhead, kingSquare: oppKingExp.kingSquare };
    }
    return false;
  } catch (e) { return false; }
}

/**
 * Detect stalemate trap: surface IMMEDIATELY when the current position IS already
 * a stalemate (fired at any piece count and any material balance — stalemate is
 * always a decisive result).  Also warns when the winning side is approaching a
 * position where they could accidentally stalemate (≤ 10 pieces, ≥ 300 cp ahead,
 * defender has ≤ 2 legal moves left).
 * Returns { isAlreadyStalemate: true } | { legalMoves: N } | false.
 */
function detectStalemateTrap(currentFen, attackerColor) {
  try {
    const defenderColor = attackerColor === 'w' ? 'b' : 'w';

    // ── Always check for an already-occurred stalemate first ─────────────────
    // Must run BEFORE piece-count / material guards — stalemate can happen at
    // any stage and any material balance and must always be surfaced.
    const staleParts = currentFen.split(' ');
    staleParts[1] = defenderColor;
    staleParts[3] = '-';
    const staleChess = new Chess(staleParts.join(' '));
    if (staleChess.isStalemate()) return { isAlreadyStalemate: true };

    // ── Future stalemate-trap WARNING: only in simplified endings ─────────────
    const chess    = new Chess(currentFen);
    const piecesLeft = chess.board().flat().filter(Boolean).length;
    if (piecesLeft > 10) return false;
    const mat = getMaterialValue(currentFen);
    const attackerWinning = attackerColor === 'w' ? mat >= 300 : mat <= -300;
    if (!attackerWinning) return false;
    const parts = currentFen.split(' ');
    parts[1] = defenderColor;
    parts[3] = '-';
    const defChess = new Chess(parts.join(' '));
    const defMoves = defChess.moves();
    return defMoves.length <= 2 ? { legalMoves: defMoves.length } : false;
  } catch (e) { return false; }
}

/**
 * Detect an overloaded defender: an opponent piece that is defending two or more
 * valuable pieces simultaneously. After this move, attacking one of those pieces
 * forces the defender to abandon the other.
 */
function detectOverloadedPiece(fen, attackerColor) {
  try {
    const defenderColor = attackerColor === 'w' ? 'b' : 'w';
    const chess = new Chess(fen);
    const board = chess.board().flat();

    // Build a map: for each opponent piece, which friendly pieces does it defend?
    const defenderMap = new Map(); // defenderSquare → [defended squares]
    // Flip turn once so chess.js can generate moves for the defender
    const fenParts = fen.split(' ');
    fenParts[1] = defenderColor;
    fenParts[3] = '-';
    const defTurnFen = fenParts.join(' ');
    for (const sq of board) {
      if (!sq || sq.color !== defenderColor) continue;
      try {
        const defChess = new Chess(defTurnFen);
        const moves = defChess.moves({ square: sq.square, verbose: true });
        for (const m of moves) {
          const target = chess.get(m.to);
          if (target && target.color === defenderColor && (MATERIAL_VALUES[target.type] || 0) >= 300) {
            if (!defenderMap.has(sq.square)) defenderMap.set(sq.square, []);
            if (!defenderMap.get(sq.square).includes(m.to))
              defenderMap.get(sq.square).push(m.to);
          }
        }
      } catch (e) { /* skip */ }
    }

    // Find a defender that guards 2+ valuable pieces
    for (const [defSq, guardedSquares] of defenderMap) {
      if (guardedSquares.length >= 2) {
        const defPiece = chess.get(defSq);
        if (!defPiece) continue;
        const guarded = guardedSquares.map(s => {
          const p = chess.get(s);
          return p ? { piece: getPieceNameFromFen(p.type), square: s, value: MATERIAL_VALUES[p.type] || 0 } : null;
        }).filter(Boolean).sort((a, b) => b.value - a.value);
        return {
          defenderPiece: getPieceNameFromFen(defPiece.type),
          defenderSquare: defSq,
          guardedPieces: guarded,
        };
      }
    }
    return false;
  } catch (e) { return false; }
}

/**
 * Detect king opposition in endgames: the mover's king now directly faces the
 * opponent's king with an odd number of squares between them on the same file/rank/diagonal.
 * Direct opposition = 1 square apart; distant opposition = 3 or 5 squares apart.
 */
function detectOpposition(fen, move) {
  if (move.piece !== 'k') return false;
  try {
    const chess = new Chess(fen);
    const piecesLeft = chess.board().flat().filter(Boolean).length;
    if (piecesLeft > 16) return false; // only in endgames
    const board = chess.board().flat();
    const oppColor = move.color === 'w' ? 'b' : 'w';
    const oppKingSq = board.find(sq => sq && sq.type === 'k' && sq.color === oppColor)?.square;
    if (!oppKingSq) return false;

    const myFile  = move.to.charCodeAt(0)  - 97;
    const myRank  = parseInt(move.to[1])   - 1;
    const oppFile = oppKingSq.charCodeAt(0) - 97;
    const oppRank = parseInt(oppKingSq[1])  - 1;
    const df = Math.abs(myFile - oppFile);
    const dr = Math.abs(myRank - oppRank);

    // Direct opposition: kings on the same FILE or RANK with exactly one square between them
    // (distance of 2 squares). Diagonal "opposition" is a conceptually distinct endgame idea
    // and is intentionally excluded here to avoid mislabelling it as direct opposition.
    if ((df === 0 && dr === 2) || (dr === 0 && df === 2)) {
      return { type: 'direct', mySquare: move.to, oppSquare: oppKingSq };
    }
    // Distant opposition: same file/rank with 3 or 5 squares between (distance 4 or 6 squares)
    if ((df === 0 && (dr === 4 || dr === 6)) || (dr === 0 && (df === 4 || df === 6))) {
      return { type: 'distant', mySquare: move.to, oppSquare: oppKingSq };
    }
    return false;
  } catch (e) { return false; }
}

/**
 * Detect bad bishop: after the move, the mover's bishop is genuinely restricted —
 * defined by FOUR conditions that must ALL hold simultaneously:
 *   1. ≥60% of the mover's pawns sit on the same colour squares as the bishop.
 *   2. At least 3 such same-colour pawns exist.
 *   3. The bishop's actual legal mobility is ≤ 4 squares, confirming it is truly
 *      locked in rather than merely sharing a colour with distant pawns.
 *   4. At least 2 same-colour pawns sit directly on the bishop's own diagonal rays
 *      (within 4 squares of the bishop) — ensuring it's pawns, not knights/rooks,
 *      that are creating the restriction. This prevents false positives when the
 *      bishop is blocked by non-pawn pieces.
 */
function detectBadBishop(fen, move) {
  if (move.piece !== 'b' && move.piece !== 'p') return false;
  try {
    const chess = new Chess(fen);
    const board = chess.board().flat();
    const color = move.color;
    const bishops = board.filter(sq => sq && sq.color === color && sq.type === 'b');
    if (bishops.length === 0) return false;

    // Flip turn so chess.js can generate moves for this side
    const fenParts = fen.split(' ');
    fenParts[1] = color;
    fenParts[3] = '-';
    const colorTurnFen = fenParts.join(' ');

    for (const bishop of bishops) {
      const bFile = bishop.square.charCodeAt(0) - 97;
      const bRank = parseInt(bishop.square[1]) - 1;
      const bishopColorSquare = (bFile + bRank) % 2; // 0=dark, 1=light

      // Condition 1 & 2: same-colour pawn ratio
      const totalPawns = board.filter(sq => sq && sq.color === color && sq.type === 'p').length;
      if (totalPawns === 0) continue;

      const sameColorPawns = board.filter(sq => {
        if (!sq || sq.color !== color || sq.type !== 'p') return false;
        const pf = sq.square.charCodeAt(0) - 97;
        const pr = parseInt(sq.square[1]) - 1;
        return (pf + pr) % 2 === bishopColorSquare;
      });

      if (sameColorPawns.length < 3) continue;
      if (sameColorPawns.length / totalPawns < 0.6) continue;

      // Condition 3: measure actual bishop mobility
      try {
        const mobilityChess = new Chess(colorTurnFen);
        const bishopMoves = mobilityChess.moves({ square: bishop.square, verbose: true });
        if (bishopMoves.length > 4) continue; // bishop is still active — NOT a bad bishop
      } catch (e) { continue; }

      // Condition 4: verify that at least 2 same-colour pawns lie directly on the bishop's
      // diagonal rays (the paths it actually travels). This distinguishes genuine bad-bishop
      // situations (pawns blocking diagonals) from cases where knights, rooks, or other
      // pieces are creating the mobility restriction.
      let pawnsOnDiagonals = 0;
      const blockingSquares = [];
      for (const ray of getRays(bishop.square)) {
        if (ray.length === 0) continue;
        const firstSq = ray[0];
        const sf = firstSq.charCodeAt(0) - 97;
        const sr = parseInt(firstSq[1]) - 1;
        // Only process diagonal rays: every square on a bishop diagonal shares the bishop's color
        if ((sf + sr) % 2 !== bishopColorSquare) continue; // skip rank/file rays
        // Walk the ray and find the first own pawn blocking it
        for (const sq of ray) {
          const p = chess.get(sq);
          if (!p) continue;
          if (p.color === color && p.type === 'p') {
            pawnsOnDiagonals++;
            blockingSquares.push(sq);
            break; // one pawn per ray
          }
          break; // any other piece blocks this ray — stop
        }
      }
      if (pawnsOnDiagonals < 2) continue; // not blocked by own pawns → false positive avoided

      return { bishopSquare: bishop.square, blockedPawns: sameColorPawns.length, blockingSquares };
    } // <--- This is the missing brace!
    return false;
  } catch (e) { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECONDARY OBSERVATION ENGINE
//  After a primary tactic or comment is chosen, this function scans for a
//  DIFFERENT important position feature and returns one extra sentence, or
//  null when nothing additional is worth noting.
//
//  Rules:
//   • Never duplicates the primaryTacticType already announced.
//   • Never fires on blunder / blunder_coach type (those are self-contained).
//   • Respects the same anti-repetition engine via pick().
// ─────────────────────────────────────────────────────────────────────────────
function getSecondaryLine(currentFen, move, primaryTacticType, mover, opp, phase, engineEval = null) {
  try {
    const oppColor   = move.color === 'w' ? 'b' : 'w';
    const candidates = [];

    // ── Engine-confirmed forced mate — top-priority secondary ────────────────
    // If engineEval says "M2" or "M3" but the primary tactic was something else
    // (e.g. capture, positional), surface a puzzle challenge as secondary.
    if (engineEval !== null && !['mateThreat', 'checkmate', 'approachingMate'].includes(primaryTacticType)) {
      const eStr = String(engineEval).trim();
      const mMatch = eStr.match(/^[+]?[Mm#](\d+)$/);
      if (mMatch) {
        const depth = parseInt(mMatch[1]);
        if (depth >= 1 && depth <= 3) {
          const challengeLines = depth === 1
            ? MATE_CHALLENGE_LINES.m1
            : depth === 2
              ? MATE_CHALLENGE_LINES.m2
              : MATE_CHALLENGE_LINES.m3;
          candidates.push(`Engine note: ${pick(challengeLines)}`);
        } else if (depth >= 4 && depth <= 6) {
          candidates.push(`Engine note: ${pick(MATE_CHALLENGE_LINES.m4to6)}`);
        }
      }
    }

    // ── Imminent mating threat (highest secondary priority) ──────────────────
    if (!['mateThreat', 'checkmate', 'approachingMate'].includes(primaryTacticType)) {
      try {
        const mateThreat = detectMateThreats(currentFen, move.color);
        if (mateThreat) {
          if (mateThreat.depth === 1) {
            candidates.push(pick([
              `And there's a checkmate threat right now — ${mateThreat.matingSan} ends the game on the spot if ignored!`,
              `Bonus: ${mateThreat.matingSan} is already a mate-in-1 threat on top of this. The opponent is in serious trouble.`,
              `The position also carries a checkmate threat: ${mateThreat.matingSan} is the immediate mating blow.`,
              `Closing threat: ${mateThreat.matingSan} delivers checkmate on the spot — the opponent must deal with both problems.`,
            ]));
          } else {
            candidates.push(pick([
              `And there's also a mate-in-2 available: ${mateThreat.matingSan} starts the forced sequence — can you find the finish?`,
              `Bonus: ${mateThreat.matingSan} threatens a forced mate in 2 on top of this. The position is winning on multiple fronts.`,
              `The position also carries a mate-in-2 threat: ${mateThreat.matingSan} begins the forced sequence if ignored.`,
              `There's a mate-in-2 here with ${mateThreat.matingSan} — can you find the full forced sequence? Two tasks at once!`,
            ]));
          }
        }
      } catch (e) { /* skip */ }
    }

    // ── Back rank weakness (high secondary priority) ──────────────────────────
    if (!['backRank'].includes(primaryTacticType)) {
      try {
        if (hasBackRankWeakness(currentFen, oppColor)) {
          candidates.push(pick([
            `Also: ${opp}'s back rank is exposed — a rook or queen can swing in for a decisive blow.`,
            `Watch the back rank too: ${opp}'s king has no luft, making a back-rank mate a real threat.`,
            `Secondary note — ${opp}'s back rank is wide open. Keep that in mind for upcoming rook moves.`,
          ]));
        }
      } catch (e) { /* skip */ }
    }

    // ── Promotion threat (medium secondary priority) ──────────────────────────
    if (!['promotionThreat', 'promotion'].includes(primaryTacticType)) {
      try {
        const promos = detectPromotionThreats(currentFen, move.color);
        if (promos.length > 0) {
          const f = promos[0];
          candidates.push(pick([
            `And the ${f}-file passed pawn is one step from queening — a second long-term threat.`,
            `Bonus threat: ${mover}'s ${f}-file pawn is a move from becoming a queen.`,
            `Don't forget — the ${f}-file passer is nearly a queen, adding another dimension to the attack.`,
          ]));
        }
      } catch (e) { /* skip */ }
    }

    // ── Additional hanging piece (fires only when something big is loose) ─────
    if (!['fork', 'removalOfDefender', 'trappedPiece', 'overloadedPiece'].includes(primaryTacticType)) {
      try {
        const hanging = detectHangingPieces(currentFen, move.color);
        if (hanging.length > 0 && hanging[0].value >= 500) {
          candidates.push(
            `And ${opp}'s ${hanging[0].piece} on ${hanging[0].square} is also undefended — a second target.`
          );
        }
      } catch (e) { /* skip */ }
    }

    // ── King safety secondary alert ───────────────────────────────────────────
    if (!['kingHunt', 'backRank'].includes(primaryTacticType)) {
      try {
        const oppKingExp = detectKingExposure(currentFen, oppColor);
        if (oppKingExp && oppKingExp.isExposed && oppKingExp.attackCount >= 4) {
          // If also winning materially, escalate to approaching-checkmate commentary
          const mat = getMaterialValue(currentFen);
          const moverIsWinning = (move.color === 'w' && mat >= 200) || (move.color === 'b' && mat <= -200);
          if (moverIsWinning) {
            candidates.push(pick([
              ...APPROACHING_MATE_LINES,
              `Closer to checkmate: ${opp}'s king on ${oppKingExp.kingSquare} is fully exposed with ${oppKingExp.attackCount} attack zones. Engine lines from here all converge on a forced finish.`,
              `The position is getting closer to checkmate — ${opp}'s king has no shelter and no reinforcements. Follow the forcing lines.`,
            ]));
          } else {
            candidates.push(pick([
              `Additionally, ${opp}'s king on ${oppKingExp.kingSquare} is severely exposed — a direct attack is very much possible.`,
              `Secondary note: ${opp}'s king has no cover and ${oppKingExp.attackCount} squares around it are under fire. The attack can be escalated.`,
              `Also worth noting: ${opp}'s king on ${oppKingExp.kingSquare} is dangerously weak. One more piece joining the attack could be decisive.`,
            ]));
          }
        }
      } catch (e) { /* skip */ }
    }

    // ── Initiative / conversion coaching (fires when clearly winning in middlegame) ──
    if (!['mateThreat','checkmate','approachingMate','zugzwang','blunder','blunder_coach'].includes(primaryTacticType)) {
      try {
        const mat2 = getMaterialValue(currentFen);
        const moverIsWinning2 = (move.color === 'w' && mat2 >= 250) || (move.color === 'b' && mat2 <= -250);
        const piecesLeft2 = new Chess(currentFen).board().flat().filter(Boolean).length;
        const isMidgame = piecesLeft2 > 14 && piecesLeft2 <= 24;
        if (moverIsWinning2 && isMidgame && Math.random() < 0.30) {
          candidates.push(pick(CONVERSION_LINES));
        }
      } catch (e) { /* skip */ }
    }

    // Return only the highest-priority candidate (first non-null)
    return candidates.length > 0 ? candidates[0] : null;
  } catch (e) { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENGINE PV FORMATTER & TACTIC DETECTOR (NEW HELPERS)
// ─────────────────────────────────────────────────────────────────────────────
function formatPV(fen, uciPV, maxPlies = 4) {
  if (!uciPV) return '';
  try {
    const chess = new Chess(fen);
    const moves = uciPV.split(' ').filter(Boolean);
    const sanMoves = [];
    for (let i = 0; i < Math.min(moves.length, maxPlies); i++) {
      const uci = moves[i];
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const prom = uci.length > 4 ? uci[4] : undefined;
      
      const moveNum = chess.moveNumber();
      const turnBefore = chess.turn();
      const m = chess.move({ from, to, promotion: prom });
      if (!m) break;
      
      if (turnBefore === 'w') {
        sanMoves.push(`${moveNum}. ${m.san}`);
      } else {
        if (i === 0) {
          sanMoves.push(`${moveNum}... ${m.san}`);
        } else {
          sanMoves.push(`${m.san}`);
        }
      }
    }
    return sanMoves.join(' ');
  } catch (e) { return ''; }
}

function analyzePVForTactics(startFen, uciPV) {
  if (!uciPV) return null;
  try {
    const chess = new Chess(startFen);
    const moves = uciPV.split(' ').filter(Boolean);
    
    // Simulate up to 3 plies (Player move, Opponent reply, Player follow-up)
    // This allows us to catch tactics that unfold as part of a forced sequence!
    for (let i = 0; i < Math.min(moves.length, 3); i++) {
      const isPlayerPly = (i % 2 === 0);
      
      const beforeFen = chess.fen();
      const uci = moves[i];
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const prom = uci.length > 4 ? uci[4] : undefined;
      
      const moveObj = chess.move({ from, to, promotion: prom });
      if (!moveObj) break;
      const afterFen = chess.fen();
      
      if (!isPlayerPly) continue; // Only evaluate the tactical impact of the player's moves

      const dblChk = detectDoubleCheck(afterFen, moveObj);
      if (dblChk) return `delivers a devastating double check`;

      const fork = detectFork(afterFen, moveObj);
      if (fork) {
        if (fork.includesKing) return `forces a royal fork against the ${fork.pieces[1]}`;
        return `sets up a fork attacking ${fork.count} pieces`;
      }

      const skewer = detectSkewer(afterFen, moveObj);
      if (skewer) {
        if (skewer.isKingSkewer) return `skewers the king to win the ${skewer.behindPiece}`;
        return `skewers the ${skewer.frontPiece} to win the ${skewer.behindPiece}`;
      }

      const disc = detectDiscoveredAttack(beforeFen, moveObj);
      if (disc) {
        if (disc.isCheck) return `unleashes a discovered check from the ${disc.revealedPiece}`;
        return `unleashes a discovered attack on the ${disc.targetPiece}`;
      }

      const trapped = detectTrappedPiece(afterFen, moveObj.color);
      if (trapped) return `traps the opponent's ${trapped.piece}`;

      const removal = detectRemovalOfDefender(beforeFen, afterFen, moveObj);
      if (removal) return `removes the defender of the ${removal.piece}`;
    }
  } catch (e) { return null; }
  return null;
}

function getEngineLineContext(fen, uciPV, engineEval) {
  if (!uciPV) return '';
  const line = formatPV(fen, uciPV, 4);
  if (!line) return '';
  
  let evalText = '';
  if (engineEval !== null) {
    const eStr = String(engineEval).trim();
    if (eStr.match(/^[+\-]?[Mm#]/) || eStr.match(/[Mm]ate/i)) {
      evalText = ` (Mate in ${eStr.replace(/[^0-9]/g, '')})`;
    } else {
      evalText = ` (${eStr > 0 ? '+' : ''}${eStr})`;
    }
  }
  
  // Feed the PV string and the starting FEN into our new simulator
  const tacticDesc = analyzePVForTactics(fen, uciPV);
  const tacticStr = tacticDesc ? `, which ${tacticDesc}` : '';

  return ` The best sequence was ${line}${tacticStr}${evalText}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COACH EXPLANATION GENERATOR
//  Priority order mirrors how chess.com surfaces the most important information.
// ─────────────────────────────────────────────────────────────────────────────
export function generateCoachExplanation(
  move, previousFen, currentFen, bestMoveSan,
  isPlayerMove, isBookMove = false, isNovelty = false,
  isOnlySoundMove = false, timeSpent = null,
  moveNumber = null, cpLoss = null, engineEval = null,
  captureStreak = 0, enginePV = null,
  clientClassification = null  // Client-provided classification id (e.g. 'best', 'blunder') to sync with badge
) {
  if (!move || !previousFen || !currentFen) return null;

  // Round timeSpent to 2 decimal places to avoid ugly floating point artifacts (e.g., 2.3999999999999986 → 2.40)
  if (timeSpent !== null) timeSpent = Math.round(timeSpent * 100) / 100;

  const explanation = { text: null, lines: null, type: null, tacticType: null };

  try {
    const materialBefore = getMaterialValue(previousFen);
    const materialAfter  = getMaterialValue(currentFen);
    const absoluteMaterialGain = materialAfter - materialBefore;
    // Fix: materialGain is now strictly relative to the mover. Positive = mover won material.
    const materialGain = move.color === 'w' ? absoluteMaterialGain : -absoluteMaterialGain;
    const capturedPiece  = move.captured ? getPieceNameFromFen(move.captured) : null;
    const normSan = s => (s || '').replace(/[+#!?]/g, '');
    const isPlayerBest   = normSan(move.san) === normSan(bestMoveSan);
    const mover          = colorName(move.color);
    const opp            = move.color === 'w' ? 'Black' : 'White';
    const pieceName      = getPieceNameFromFen(move.piece);
    const isEarlyGame    = moveNumber !== null && moveNumber <= 12;
    const isEndgame      = new Chess(currentFen).board().flat().filter(Boolean).length <= 14;

    // Derive move quality tier from cpLoss when available.
    // Tiers: brilliant (cpLoss < -30 = engine prefers this over its own top choice),
    //        best (≤0), good (0-50), inaccuracy (50-150), mistake (150-300), blunder (>300)
    let qualityTier = cpLoss === null ? null
      : cpLoss < -30  ? 'brilliant'
      : cpLoss <= 0   ? 'best'
      : cpLoss <= 50  ? 'good'
      : cpLoss <= 150 ? 'inaccuracy'
      : cpLoss <= 300 ? 'mistake'
      : 'blunder';

    // Override with client-provided classification to ensure explanation type
    // matches the badge shown in the UI (prevents mismatches from threshold edge cases)
    if (clientClassification) {
      const CLASSIFICATION_TO_TIER = {
        brilliant: 'brilliant', great: 'best', best: 'best', excellent: 'best',
        good: 'good', book: 'good',
        inaccuracy: 'inaccuracy', miss: 'inaccuracy',
        mistake: 'mistake',
        blunder: 'blunder',
      };
      const overrideTier = CLASSIFICATION_TO_TIER[clientClassification];
      if (overrideTier) qualityTier = overrideTier;
    }

    // True if the move is generally sound (prevents praising blunders that happen to contain a tactic)
    const isGoodMove = qualityTier === null || ['brilliant', 'best', 'good'].includes(qualityTier);

    // Always ensures explanation.lines is populated before returning.
    // Appends the engine PV sequence to inaccuracies/mistakes/blunders.
    const finalizeExpl = (exp) => {
      // The "best sequence was..." line appending logic has been removed as per user request.

      // ── CONCEPT FATIGUE (Anti-Repetition) ──
      // Prevent non-critical tactical/positional observations from firing more than twice.
      if (exp.tacticType) {
        const count = conceptUsageCount[exp.tacticType] || 0;
        // Never suppress critical game-ending threats or major blunders
        const isCritical = ['checkmate', 'mateThreat', 'approachingMate', 'blunder', 'missedMate'].includes(exp.tacticType) || ['blunder', 'mistake'].includes(exp.type);
        
        if (count >= 2 && !isCritical) {
          // Concept fatigue! Pivot to a true observation about the current board instead of random quotes.
          const summary = getPositionSummary(currentFen);
          if (summary) {
            exp.text = `Let's look at the bigger picture: ${summary}`;
          } else {
            let fallback;
            if (exp.type === 'inaccuracy') fallback = pick(INACCURACY_LINES);
            else if (qualityTier === 'good') fallback = pick(GOOD_MOVE_LINES);
            else fallback = pick(BRILLIANT_PRAISE);
            exp.text = fallback;
          }
          // Note: We do NOT increment the counter for generic fallbacks
        } else {
          conceptUsageCount[exp.tacticType] = count + 1;
        }
      }

      if (exp && exp.text && !exp.lines) exp.lines = [exp.text];
      return exp;
    };

    // Helper: attach secondary line to explanation (mutates in place).
    // primaryType guards prevent double-mentioning the same concept.
    // Defined here so it closes over mover, opp, move, currentFen, phase.
    const withSecondary = (exp) => {
      if (!exp.text) return finalizeExpl(exp);
      // Checkmate ends the game — never append secondary position lines.
      if (move.san.includes('#')) return finalizeExpl(exp);
      if (['blunder', 'blunder_coach', 'inaccuracy', 'mistake'].includes(exp.type)) {
        return finalizeExpl(exp);
      }
      const phase = isEndgame ? 'endgame' : isEarlyGame ? 'opening' : 'middlegame';
      const sec = getSecondaryLine(currentFen, move, exp.tacticType, mover, opp, phase, engineEval);
      if (sec) {
        // Natural transition logic
        const transition = ['great', 'best', 'brilliant'].includes(exp.type)
          ? pick(["Furthermore, ", "Even better, ", "On top of that, ", "Additionally, "])
          : pick(["Also, ", "Additionally, ", "Worth noting: "]);
          
        // Clean out hardcoded prefixes from getSecondaryLine so our transitions fit perfectly
        const cleanedSec = sec.replace(/^(Also:|Bonus:|Secondary note —|Secondary note:|Additionally,|Don't forget —|And)\s*/i, '');
        
        const formattedSec = sec.startsWith('Engine note:') 
          ? sec 
          : transition + cleanedSec.charAt(0).toLowerCase() + cleanedSec.slice(1);

        exp.lines = [exp.text, formattedSec];
        exp.text  = `${exp.text} ${formattedSec}`;
      } else {
        exp.lines = [exp.text];
      }
      return exp;
    };

    // Parse engineEval for forced-mate depth.
    // Accepts: "M5", "m5", "#5", "+M5", "Mate in 5", "-M5" / "#-5" (opponent mates).
    // mateDepth > 0 means the mover is delivering forced mate in N moves.
    // mateDepth < 0 means the mover is being mated in N moves.
    const mateDepth = (() => {
      if (engineEval === null || engineEval === undefined) return null;
      const s = String(engineEval).trim();
      // Numeric-only mate strings: "M5", "#5", "+M5", "-M5", "#-5"
      const m1 = s.match(/^[+\-]?[Mm#]([+-]?\d+)$/);
      if (m1) {
        const n = parseInt(m1[1]);
        // If original string starts with '-', negate (opponent is mating us)
        return isNaN(n) ? null : (s.startsWith('-') && n > 0 ? -n : n);
      }
      // Word form: "Mate in 5", "mate in -3"
      const m2 = s.match(/[Mm]ate\s+in\s+([+-]?\d+)/i);
      if (m2) {
        const n = parseInt(m2[1]);
        return isNaN(n) ? null : n;
      }
      return null;
    })();
    // engineSeesForcesMate: the engine has confirmed a forced mate sequence for the mover
    const engineSeesForcesMate = mateDepth !== null && mateDepth > 0 && mateDepth <= 20;

    // Time-aware prefix builder (used in select sections)
    const timePrefix = () => {
      if (timeSpent === null) return '';
      if (timeSpent < 1)    return `Instant — `;
      if (timeSpent < 3)    return `Blink of an eye — `;
      if (timeSpent < 6)    return `Played quickly — `;
      if (timeSpent < 12)   return `Fast decision — `;
      if (timeSpent < 20)   return `Quick calculation — `;
      if (timeSpent < 35)   return `Thought it through — `;
      if (timeSpent < 60)   return `After careful consideration — `;
      if (timeSpent < 90)   return `A long think — `;
      if (timeSpent < 150)  return `After deep calculation — `;
      return `After extended deliberation — `;
    };

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION A — SPECIAL MOVE TYPES (highest priority)
    // ─────────────────────────────────────────────────────────────────────────

    // [A0] Engine-beating 'brilliant' move (cpLoss < -30 — better than engine first choice)
    //  Only fire this banner when it's the player's move AND the position doesn't
    //  have a more specific tactic to highlight (tactics are handled later and may
    //  override, but we set the text here as a baseline the later stages can replace).
    if (isPlayerMove && qualityTier === 'brilliant' && !move.san.includes('#')) {
      const prefix = timePrefix();
      const praise = pick([
        `Brilliant! The engine's top choice — and something even stronger was found.`,
        `A computer-approved brilliancy. That move improves on the engine's suggestion.`,
        `Stunning! The engine rates this above its own first choice. Exceptional play.`,
        `${prefix}That's a brilliant move — precise, deep, and engine-approved.`,
        `Engine first-choice? This goes one better. Remarkable calculation.`,
        `A true brilliancy — the engine smiles on this one.`,
      ]);
      // Don't return yet — let specific tactics override with richer context
      explanation.text = prefix && !praise.startsWith(prefix)
        ? `${prefix}${praise.charAt(0).toLowerCase()}${praise.slice(1)}`
        : praise;
      explanation.type = 'brilliant';
    }

    // [A3] Checkmate — MUST be the first specific check after the brilliant banner.
    //  Returns ONLY decisive checkmate lines. No position analysis, no secondary
    //  lines, no brilliant-praise overlay — the game is over, full stop.
    //  Priority: beats book-move, novelty, material, and ALL other handlers.
    if (move.san.includes('#')) {
      if (isPlayerMove) {
        explanation.text = pick([
          // ── Clean, decisive finishes ──
          "Checkmate! The king has no escape — a clean, decisive finish.",
          "Checkmate! Good finish — the game ends with the final blow.",
          "That's the game! A perfectly executed checkmate.",
          `${mover} delivers checkmate. The king is cornered with no way out.`,
          "Stunning finale — checkmate. The mating net was woven perfectly.",
          "The curtain drops. Checkmate! A fitting end to a well-played attack.",
          "The king has no moves, no allies, no hope. Checkmate.",
          "Checkmate! The attack was carried through to its logical conclusion.",
          "The final blow lands. Checkmate — the game is over.",
          "Checkmate! Every piece played its part — a model attacking finish.",
          "The mating net closes completely. Checkmate — the king cannot escape.",
          "Decisive! Checkmate delivered — no defence, no escape, no hope.",
          "Checkmate! The king walked into the storm and could never find shelter.",
          "Game over — checkmate. A clean, accurate finish that the position demanded.",
          "Checkmate! The king is trapped with no legal move.",
          "The final piece falls into place. Checkmate — well played!",
          "Checkmate! Not a single escape square remains. Flawlessly executed.",
          "The mating blow lands. Checkmate — the king never found shelter.",
          `Checkmate! ${mover} delivers the knockout punch. A deserved finish.`,
          "The king is surrounded. Checkmate — no move, no hope, no escape.",
          "That's all she wrote — checkmate! A textbook finish.",
          "Checkmate! Clean, clinical, and completely decisive.",
          "The last move has been played. Checkmate — a well-earned victory.",
          "Checkmate! The mating net tightened one square at a time.",
          // ── Attacking flow lines ──
          "Checkmate! The king ran out of squares to hide. Precision to the end.",
          "A model finish — checkmate. Every attacking piece found its role.",
          "The king is out of moves and out of luck. Checkmate!",
          "Checkmate — a perfect conclusion. No more squares, no more hope.",
          `${mover} forces checkmate. The king had no answer — brilliant execution.`,
          "Checkmate! The mating attack was relentless. Nowhere to hide.",
          "The game ends here. Checkmate — delivered with the precision of a master.",
          "Checkmate! The position demanded it — and it was delivered.",
          "The final move. Checkmate — a well-deserved full point.",
          "Checkmate! The king was hunted, cornered, and finished. Perfect.",
          // ── Grandmaster-coach style ──
          "Checkmate! Every piece coordinated toward this exact moment — a model attacking finish.",
          "The king had no pawn shelter, no defenders, no squares. Checkmate was inevitable.",
          `Checkmate! ${mover} built the attack piece by piece and delivered the final blow without error.`,
          "Checkmate! The game's theme — king safety — was decided long before this move. The final blow simply confirmed it.",
          "That's the game. Checkmate — methodical, accurate, and completely deserved.",
          "Checkmate! The mating net was built slowly and then snapped shut in an instant.",
          `${mover} delivers the final blow — checkmate! A game of quality from start to finish.`,
          "Checkmate — and a fitting end. The attack was conducted with the patience and precision of a master.",
          "The king had no reinforcements and no escape. Checkmate — exactly as the attack promised.",
          "A beautiful finish. Checkmate! Every move in the attack had a purpose — and the purpose was this.",
        ]);
        explanation.type = 'best';
      } else {
        // Opponent delivers checkmate — coaching-after-loss framing
        explanation.text = pick([
          "Checkmate — the position allowed a forced finish. Game over.",
          "That's it — the king is mated. A painful conclusion.",
          "Checkmate. The attack could not be stopped — the game ends here.",
          `${mover} delivers checkmate. The game is over.`,
          "The mating net closed. Nothing could prevent it in the end.",
          "Checkmate — the king is caught with no escape square.",
          "The final blow. Checkmate — this is why king safety matters above all else.",
          "Checkmate. The attack was relentless and nothing could stop it.",
          "Checkmate! A precision finish — the king had no refuge.",
          "The king is mated. Checkmate — defence became impossible.",
          // ── coaching-after-loss lines ──
          "Checkmate — the attack found its way through every defensive attempt.",
          "The king is trapped. Checkmate — there was no saving resource.",
          "Checkmate. A reminder: an exposed king rarely survives the middlegame intact.",
          `${mover} finds the mating blow. Checkmate — a clinical, precise finish.`,
          "No escape, no defence, no hope. Checkmate.",
          "Checkmate — and a coaching moment. The king's safety must always come first. Review what opened the king — that's where the game was decided, not here.",
          "Checkmate. The lesson: once the king loses its pawn shelter, every tempo counts against the defending side.",
          "Checkmate delivered. Study how the mating net was built — and learn to stop it earlier next time.",
          "The king is mated. This is why piece coordination matters: the opponent's pieces worked together toward this exact finish from moves ago.",
          "Checkmate — game over. The real turning point was not this move, but the moment the king became exposed. Find that moment and you'll find what to fix.",
        ]);
        explanation.type = 'blunder_coach';
      }
      // Set tacticType so getSecondaryLine's exclusion list works correctly.
      explanation.tacticType = 'checkmate';
      // finalizeExpl ONLY — never withSecondary. The game is finished.
      // No secondary lines, no position analysis, no other content after checkmate.
      return finalizeExpl(explanation);
    }

    // [A3_stale] Stalemate by this move — MUST run before ALL other handlers
    // (promotion, material gain, etc. can all accidentally cause stalemate).
    // currentFen already has the opponent to move; chess.js isStalemate() checks
    // whether that side has zero legal moves and is not in check.
    try {
      const staleMoveChess = new Chess(currentFen);
      if (staleMoveChess.isStalemate()) {
        const avoidLine = bestMoveSan
          ? ` The engine's best move was ${bestMoveSan} — that continuation kept at least one legal reply for the opponent while maintaining the winning advantage.`
          : ` Always ensure the opponent retains at least one legal move until you can deliver checkmate immediately.`;
        const rawLine = pick(STALEMATE_OCCURRED_LINES);
        explanation.text = rawLine.replace('{{avoidLine}}', avoidLine);
        explanation.type = 'observation';
        explanation.tacticType = 'stalemate';
        return finalizeExpl(explanation);
      }
    } catch (e) { /* skip */ }

    // [A3b] Draw by insufficient material
    try {
      const drawChess = new Chess(currentFen);
      if (drawChess.isInsufficientMaterial()) {
        explanation.text = pick([
          "Draw by insufficient material — neither side has enough pieces to force checkmate. The game ends here.",
          "Insufficient material! The position is a theoretical draw — no mating sequence is possible with the remaining pieces.",
          "A draw by insufficient material. With only kings (and perhaps a bishop or knight) remaining, checkmate is impossible.",
          "Fun fact: insufficient material draws occur when neither side can force checkmate regardless of how badly the opponent plays. It's a rule, not a choice.",
          "The position is a dead draw — insufficient mating material remains on the board. The game is over.",
        ]);
        explanation.type = 'observation';
        explanation.tacticType = 'draw';
        return finalizeExpl(explanation);
      }
    } catch (e) { /* skip */ }

    // [A3c] Draw by threefold repetition
    try {
      const drawChess2 = new Chess(currentFen);
      if (drawChess2.isThreefoldRepetition()) {
        const avoidLine = bestMoveSan
          ? ` The engine's preferred continuation was ${bestMoveSan} — that path broke the repetition and kept winning chances alive.`
          : '';
        const rawLine = pick(REPETITION_DRAW_LINES);
        explanation.text = rawLine.replace('{{avoidLine}}', avoidLine);
        explanation.type = 'observation';
        explanation.tacticType = 'draw';
        return finalizeExpl(explanation);
      }
    } catch (e) { /* skip */ }

    // [A3d] Draw by 50-move rule
    try {
      const drawChess3 = new Chess(currentFen);
      if (drawChess3.isDraw() && !drawChess3.isInsufficientMaterial() && !drawChess3.isThreefoldRepetition() && !drawChess3.isStalemate()) {
        explanation.text = pick(FIFTY_MOVE_DRAW_LINES);
        explanation.type = 'observation';
        explanation.tacticType = 'draw';
        return finalizeExpl(explanation);
      }
    } catch (e) { /* skip */ }

    // [A0b] Missed forced mate — player had a forced mate but played something else.
    // Fires when: (a) engineEval shows forced mate in ≤5 for the PLAYER but they
    // didn't take it (isPlayerBest = false), or (b) engine-detected forced mate
    // is available but the player is not the one to move this analysis is post-move.
    // Only surface when the move played was not a checkmate itself (already handled)
    // and the player is the one who moved.
    if (isPlayerMove && !isPlayerBest && !move.san.includes('#') && !explanation.text) {
      // Check if this position BEFORE the move had a forced mate for the player
      if (mateDepth !== null && mateDepth > 0 && mateDepth <= 5) {
        // The engine showed a forced mate was available — player missed it
        let missedPool;
        if (mateDepth === 1)          missedPool = MISSED_MATE_LINES.m1;
        else if (mateDepth === 2)     missedPool = MISSED_MATE_LINES.m2;
        else if (mateDepth === 3)     missedPool = MISSED_MATE_LINES.m3;
        else                           missedPool = MISSED_MATE_LINES.mDeep;

        const bestRef = bestMoveSan
          ? ` The engine's winning sequence begins with ${bestMoveSan}.`
          : '';
        explanation.text = pick(missedPool) + bestRef;
        explanation.type = qualityTier === 'blunder' ? 'blunder' : 'missed';
        explanation.tacticType = 'missedMate';
        return finalizeExpl(explanation);
      }
    }

    // [A1] Opening book move
    if (isBookMove) {
      const openingFact = isEarlyGame ? pick(OPENING_FACTS) : null;
      explanation.text = openingFact || pick([
        "Straight from the book — theory is being followed.",
        "A well-known opening move. Both players are in familiar territory.",
        "This has been played thousands of times at the top level.",
        "Classic opening theory. The real chess starts when this runs out.",
        "Book move. No surprises yet — both sides know the script.",
        "Theoretical territory. Preparation is being tested.",
        "A main-line move. Solid, principled, and theory-backed.",
      ]);
      explanation.type = 'best';
      return finalizeExpl(explanation);
    }

    // [A2] Novelty
    if (isNovelty) {
      explanation.text = pick([
        "A Novelty! We're out of theory — original chess begins right here.",
        "The game leaves known territory. Anything can happen from here!",
        "First time this position has been reached. Welcome to the unknown.",
        "Over-the-board novelty — the opening book is closed. Think for yourself.",
        "Uncharted waters. The real test begins.",
        "A new idea! This may start a whole new branch of theory.",
      ]);
      explanation.type = 'best';
      return finalizeExpl(explanation);
    }

    // [A3a] Mate-in-1 or mate-in-2 threat (player's move creates an unstoppable mating blow)
    if (isPlayerMove && !move.san.includes('+') && !move.san.includes('#') && !explanation.text) {
      const mateThreat = detectMateThreats(currentFen, move.color);
      if (mateThreat) {
        if (mateThreat.depth === 2) {
          explanation.text = pick([
            ...MATE_CHALLENGE_LINES.m2.map(l => l.replace('?', `? ${mateThreat.matingSan} starts the forced sequence.`)),
            `Mate in 2! ${mateThreat.matingSan} begins the forced sequence — can you see the follow-up that ends the game?`,
            `A forced mate in 2 begins with ${mateThreat.matingSan}. Checkmate is inevitable — the opponent's only moves delay the end.`,
            `Closing in on checkmate — a forced mate in 2 starts with ${mateThreat.matingSan}. Calculate cleanly and finish it.`,
            `The mating net is woven. ${mateThreat.matingSan} triggers a forced mate in 2 — nothing can stop it now.`,
            `Mate in 2 available: ${mateThreat.matingSan} is the key move. The king is in the crosshairs — can you find the finish?`,
            `A forced mate in 2 lurks here — ${mateThreat.matingSan} opens the sequence. Trace it through to the end.`,
            `Mate in 2! The engine confirms ${mateThreat.matingSan} leads to forced checkmate — find the follow-up and finish the game.`,
            `Can you find the mate in 2? ${mateThreat.matingSan} is the first move — and every reply the king has leads to checkmate.`,
            `The position screams for ${mateThreat.matingSan}. A forced mate in 2 follows from here — the king cannot escape.`,
          ]);
        } else {
          // Mate-in-1 threat: definitive — opponent must find the only defence.
          explanation.text = pick([
            ...MATE_CHALLENGE_LINES.m1.map(l => l.replace('?', `? It's ${mateThreat.matingSan}.`).replace('!', `! ${mateThreat.matingSan} ends the game.`)),
            `Checkmate is threatened on the very next move with ${mateThreat.matingSan}! The opponent must find the only defence or the game ends immediately.`,
            `${mover} sets a deadly mating trap — ${mateThreat.matingSan} delivers checkmate immediately. One careless response and it's over.`,
            `A mating threat! ${mateThreat.matingSan} ends the game on the spot — the opponent must address this or it's checkmate.`,
            `Checkmate threatened: ${mateThreat.matingSan} is the immediate mating blow. The opponent has only one task — find the defence.`,
            `The king is in a mating net — ${mateThreat.matingSan} is an immediate checkmate threat. The opponent must find the only reply.`,
            `${mover} threatens checkmate with ${mateThreat.matingSan}! One careless response and the game ends right here.`,
            `Immediate mating threat — ${mateThreat.matingSan} delivers checkmate if ignored. The opponent must solve this NOW.`,
            `A check or threat just became a mating threat: ${mateThreat.matingSan} ends the game immediately. Only one defence exists.`,
            ...MATE_THREAT_LINES,
          ]);
        }
        explanation.type = 'great';
        explanation.tacticType = 'mateThreat';
        return finalizeExpl(explanation);
      }
    }

    // [A4] Pawn promotion
    if (move.san.includes('=')) {
      const promotedTo = move.san.includes('=Q') ? 'queen'
        : move.san.includes('=R') ? 'rook'
        : move.san.includes('=B') ? 'bishop' : 'knight';
      if (promotedTo === 'queen') {
        explanation.text = pick([
          `Promotion! ${mover}'s pawn becomes a queen — the whole game changes in one move.`,
          `The little pawn that could — now it's a queen! Devastating for ${opp}.`,
          `Pawn promotes to queen! What a journey for that little piece.`,
          `A new queen enters the board. Game-changing moment!`,
          `Queening! The endgame investment pays off spectacularly.`,
          `${pick(TACTICAL_QUOTES.promotion)} The pawn just became royalty.`,
          `Eight ranks, one goal. The pawn completes its journey — it's a queen now.`,
        ]);
      } else if (promotedTo === 'knight') {
        explanation.text = pick([
          `Underpromotion to a knight! Not a blunder — there's a fork or checkmate coming.`,
          `Promotes to a knight! The knight covers squares the queen cannot. Precise choice.`,
          `Smart underpromotion! Sometimes a knight is exactly what the position demands.`,
          `Fun fact: knight underpromotions are rare but powerful — they can deliver forks queens cannot.`,
        ]);
      } else {
        explanation.text = pick([
          `Underpromotion to ${promotedTo}! A deliberate, calculated choice.`,
          `${mover} promotes to a ${promotedTo} — the ${promotedTo} serves a role the queen wouldn't here.`,
        ]);
      }
      explanation.type = 'best';
      explanation.tacticType = 'promotion';
      return finalizeExpl(explanation);
    }

    // [A5] En passant
    if (move.flags && move.flags.includes('e')) {
      explanation.text = pick([
        "En passant! One of chess's most surprising and rare captures.",
        "The phantom capture — en passant! Philidor would approve.",
        `${mover} strikes with en passant — the pawn vanishes from a square it seemed safe on.`,
        "Fun fact: en passant was added to chess rules in the 15th century to stop pawns skipping past attacks. Used perfectly here!",
        "En passant — the only capture where the captured piece doesn't sit on the square you land on.",
        "Tactically alert! En passant is easy to overlook. It wasn't here.",
      ]);
      explanation.type = 'tactical';
      explanation.tacticType = 'enPassant';
      return finalizeExpl(explanation);
    }

    // [A6] Castling
    if (isPlayerMove && (move.san === 'O-O' || move.san === 'O-O-O')) {
      const isLong = move.san === 'O-O-O';
      if (isLong) {
        explanation.text = pick([
          `Castles queenside! Long castling signals attacking intent — and the rook immediately enters the center.`,
          `Queenside castling — king safety AND rook activation on the d-file in one move.`,
          `Long castle! Aggressive-style king tucking. The rook comes to life instantly.`,
          `${mover} castles long — the king tucks away as the rook eyes the center. Two moves for one.`,
        ]);
      } else {
        explanation.text = pick([
          `Castles kingside — king to safety, rooks connected. Textbook fundamentals.`,
          `${mover} tucks the king away. Good instincts.`,
          `King safety secured! Castling kingside was the right call.`,
          `Classic opening principle: castle early, connect the rooks.`,
          `Fun fact: castling is the only move in chess where two pieces move at once. Used well here.`,
          `Kingside castle. The king finds shelter and the rook joins the game.`,
        ]);
      }
      // If the engine confirms a forced mate exists, append the challenge as a secondary line.
      // This is the highest-value information after castling — always surface it.
      if (engineSeesForcesMate && mateDepth !== null && mateDepth <= 6) {
        let mateChallenge;
        if (mateDepth === 1)      mateChallenge = pick(MATE_CHALLENGE_LINES.m1);
        else if (mateDepth === 2) mateChallenge = pick(MATE_CHALLENGE_LINES.m2);
        else if (mateDepth === 3) mateChallenge = pick(MATE_CHALLENGE_LINES.m3);
        else                       mateChallenge = pick(MATE_CHALLENGE_LINES.m4to6);
        explanation.lines = [explanation.text, mateChallenge];
        explanation.text  = `${explanation.text} ${mateChallenge}`;
        explanation.type  = 'great';
        explanation.tacticType = 'approachingMate';
      } else {
        explanation.type = 'best';
      }
      return finalizeExpl(explanation);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION B — MATERIAL OUTCOMES
    // ─────────────────────────────────────────────────────────────────────────

    // [B1] Player wins material
    if (isPlayerMove && materialGain > 100) {
      if (materialGain >= 900) {
        explanation.text = pick([
          `Wins the queen! ${opp} loses their most powerful piece — likely decisive.`,
          `The queen falls! That's essentially game over at this material imbalance.`,
          `${mover} nets the enemy queen. The hardest part now: don't let the advantage slip.`,
          `A queen down is a death sentence in most positions. ${pick(CONVERSION_LINES.slice(0, 2))}`,
          `${mover} wins the queen! ${pick(CONVERSION_LINES)}`,
          `The queen is captured — a decisive material gain. From here, avoid complications, trade down, convert.`,
        ]);
      } else if (materialGain >= 500) {
        explanation.text = pick([
          `Wins a rook! A full rook advantage is winning in most endgames.`,
          `The rook falls — a decisive material gain. Convert carefully now.`,
          `Excellent! ${mover} snatches a rook. Now it's about technique.`,
          `A rook ahead. Clean play from here should seal the deal.`,
          `Full rook advantage secured. ${pick(CONVERSION_LINES)}`,
          `The rook is won — from here, trade towards a winning endgame and stay calm.`,
        ]);
      } else if (materialGain >= 300) {
        explanation.text = pick([
          `Wins a minor piece — a clear and exploitable advantage.`,
          `A ${capturedPiece} is captured. ${mover} is up material.`,
          `${mover} picks off the ${capturedPiece} — a solid material gain.`,
          `Minor piece advantage secured. Real in the endgame.`,
          `A ${capturedPiece} won! The material advantage is small but concrete — trade down when possible and convert.`,
          `Wins the ${capturedPiece}. A minor piece advantage favors the winning side especially as pawns come off.`,
        ]);
      } else {
        explanation.text = pick([
          `Wins a pawn! Every pawn counts — especially in the endgame.`,
          `Picks up a free pawn. Small gains add up over time.`,
          `A pawn up — not dramatic, but Capablanca would take it every time.`,
          `A free pawn. Small now, potentially decisive in 20 moves.`,
          `A pawn captured! In equal positions, a single pawn advantage is enough to win with accurate play.`,
          `One pawn ahead — the advantage is small, but in a technical endgame it can be everything.`,
        ]);
      }
      explanation.type = 'tactical';
      return finalizeExpl(explanation);
    }

    // [B2] Player loses material (handles mistakes/blunders, ignores sacrifices marked as 'good')
    if (isPlayerMove && materialGain < -100 && !isPlayerBest) {
      if (!isGoodMove) {
        // Inaccuracy tier: cpLoss-driven (50-150 cp) — gentle tone
        if (qualityTier === 'inaccuracy' && cpLoss !== null) {
          explanation.text = pick(INACCURACY_LINES);
          explanation.type = 'inaccuracy';
          return finalizeExpl(explanation);
        }
        // Mistake tier: cpLoss-driven (150-300 cp) — firmer tone
        if (qualityTier === 'mistake' && cpLoss !== null && materialGain > -300) {
          explanation.text = pick(MISTAKE_LINES);
          explanation.type = 'mistake';
          return finalizeExpl(explanation);
        }
        if (materialGain <= -800) {
          explanation.text = pick([
            `The queen is lost! ${pick(BLUNDER_QUEEN)}`,
            `Oh no — the queen hangs here. This is likely decisive against ${mover}.`,
            `A queen blunder. ${pick(DEVASTATING_ROASTS)}`,
            `${pick(BLUNDER_QUEEN)} ${pick(DEVASTATING_ROASTS)}`,
          ]);
        } else if (materialGain <= -500) {
          explanation.text = pick([
            `A rook is lost for no real compensation. ${pick(DEVASTATING_ROASTS)}`,
            `The rook falls — a serious material deficit. ${pick(MILD_GROANS)}`,
            `${pick(BLUNDER_ROOK)}`,
          ]);
        } else if (materialGain <= -300) {
          explanation.text = pick([
            `Loses a ${capturedPiece}. ${pick(MILD_GROANS)}`,
            `A ${capturedPiece} is left hanging — a costly mistake.`,
            `The ${capturedPiece} is gone. ${pick(MILD_GROANS)}`,
            `${mover} drops the ${capturedPiece} without compensation.`,
          ]);
        } else {
          explanation.text = pick([
            `Drops a pawn for free. In the endgame, every pawn matters enormously.`,
            `A free pawn given away. ${pick(MILD_GROANS)}`,
            `Small loss now, could be decisive later.`,
            `${pick(INACCURACY_LINES)} A pawn drifts off the board.`,
          ]);
        }
        explanation.type = qualityTier === 'mistake' ? 'mistake' : materialGain <= -300 ? 'blunder' : 'inaccuracy';
        return finalizeExpl(explanation);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION C — TACTICAL PATTERNS
    // ─────────────────────────────────────────────────────────────────────────

    // [C1] King dangerously exposed after player's move
    if (isPlayerMove && !isGoodMove) {
      const exposure = detectKingExposure(currentFen, move.color);
      if (exposure && exposure.isExposed) {
        const shieldDesc = exposure.exactPawnCount === 0 ? 'zero pawn cover'
          : exposure.exactPawnCount === 1 ? 'only 1 pawn for protection'
          : `only ${exposure.exactPawnCount} pawns for protection`;
        const attackDesc = exposure.attackCount >= 5 ? 'and facing a storm of attackers'
          : exposure.attackCount >= 3 ? `with ${exposure.attackCount} squares around it under fire`
          : '';
        explanation.text = pick(BLUNDER_KING_EXPOSED)
          + ` The king on ${exposure.kingSquare} has ${shieldDesc}${attackDesc ? ' ' + attackDesc : ''}.`;
        explanation.type = qualityTier === 'mistake' ? 'mistake' : 'blunder';
        return finalizeExpl(explanation);
      }
    }

    // [C1a] — Opponent's king is severely exposed (king hunt potential / approaching mate)
    if (isPlayerMove && !explanation.text) {
      const oppExposure = detectKingExposure(currentFen, move.color === 'w' ? 'b' : 'w');
      if (oppExposure && oppExposure.isExposed && oppExposure.pawnShield === 0 && oppExposure.attackCount >= 4) {
        // Distinguish between a king in the center (never castled / king march) and a
        // kingside-castled king whose shelter was blown open — the commentary differs.
        const oppKingFile = oppExposure.kingSquare[0];
        const isKingInCenter = ['c','d','e','f'].includes(oppKingFile);
        const chess = new Chess(currentFen);
        const mat = getMaterialValue(currentFen);
        const moverIsWinning = (move.color === 'w' && mat >= 150) || (move.color === 'b' && mat <= -150);

        if (isKingInCenter) {
          explanation.text = pick([
            ...KING_HUNT_LINES,
            `${opp}'s king is still in the center — exposed on ${oppExposure.kingSquare} with ${oppExposure.attackCount} squares around it under fire. The engine's lines all lead to a king hunt from here.`,
            `The enemy king never found safety and is now paying the price — ${oppExposure.attackCount} attacking zones, no pawn cover. Checkmate is approaching.`,
            `A king stuck in the center during the middlegame is a structural death sentence. ${opp}'s king on ${oppExposure.kingSquare} has no shelter and the attack is reaching critical mass.`,
          ]);
        } else if (moverIsWinning) {
          explanation.text = pick([
            ...APPROACHING_MATE_LINES,
            ...KING_HUNT_LINES,
            `${opp}'s king on ${oppExposure.kingSquare} has no pawn cover and ${oppExposure.attackCount} attack zones are under fire. Closer to checkmate with every accurate move.`,
            `The enemy king is critically exposed on ${oppExposure.kingSquare} — no shelter, no escape. Engine lines converge on checkmate. Follow up aggressively.`,
          ]);
        } else {
          explanation.text = pick([
            ...KING_HUNT_LINES,
            `${opp}'s king on ${oppExposure.kingSquare} has no pawn cover and is under attack from ${oppExposure.attackCount} zones. A king hunt is on — close in with precision.`,
            `The enemy king is exposed on ${oppExposure.kingSquare} with no shelter. Follow up aggressively and don't let it escape.`,
          ]);
        }
        explanation.type = 'great';
        explanation.tacticType = 'kingHunt';
        return finalizeExpl(explanation);
      }
    }

    // [C1b] — Approaching checkmate signal (engine-aware positional squeeze)
    // Fires when opponent's king is exposed AND we are clearly winning, but no forced
    // mate sequence has been detected yet. Provides "closer to checkmate" commentary.
    // Upgraded: also uses engineEval (mateDepth) when the engine confirms a forced mate.
    // IMPORTANT: when engineSeesForcesMate is true, this overrides the [A0] brilliant
    // banner (which set explanation.text but didn't return) because forced-mate context
    // is always the highest-priority coaching insight.
    if (isPlayerMove && (!explanation.text || engineSeesForcesMate)) {
      // Engine-confirmed forced mate — highest quality "approaching checkmate" commentary.
      // M1: immediate puzzle; M2-M3: challenge style; M4-M6: precision-focus; M7+: general.
      if (engineSeesForcesMate && mateDepth !== null) {
        let matePool;
        if (mateDepth === 1) {
          matePool = [
            ...MATE_CHALLENGE_LINES.m1,
            `Mate in 1! The engine confirms — one precise move ends the game here. Find it before the moment passes.`,
            `The engine sees forced checkmate in 1. Find the move and finish it — the king has no answer.`,
            `Mate in 1 is on the board right now. Can you see the move that leaves the king with no escape and no interposition?`,
            `One move ends the game. Find the checkmate — the king has run out of squares and options.`,
            `The game is decided in a single move. Mate in 1 — deliver it now and don't let the moment go.`,
          ];
        } else if (mateDepth === 2) {
          matePool = [
            ...MATE_CHALLENGE_LINES.m2,
            `Mate in 2 — the engine confirms a forced two-move sequence. Can you find it? Start with the most forcing move available.`,
            `The engine sees forced checkmate in 2. Calculate the forcing line and deliver it — every reply the king has is accounted for.`,
            `Mate in 2 confirmed. Treat it as a puzzle: find the key move, and what follows is forced — then checkmate.`,
            `Can you find the mate in 2? The engine confirms one exists. Find the first move that makes all of the king's replies lead to checkmate.`,
            `Two moves from the end. The engine sees forced checkmate — can you find the first move of the sequence?`,
            `Mate in 2! One forcing move starts the sequence and the king has no escape from what follows. Find it.`,
            `The engine confirms mate in 2 from this position. This is a classic puzzle moment — calculate every king response to your first move. They all lead to checkmate.`,
          ];
        } else if (mateDepth === 3) {
          matePool = [
            ...MATE_CHALLENGE_LINES.m3,
            `Mate in 3! Engine-confirmed forced sequence. Can you trace all three moves? Start with the most restricting check or threat.`,
            `The engine sees checkmate in 3. Work out the forcing line — every king escape counts, and every one of them leads to mate.`,
            `Mate in 3 is available. Find the first forcing move, and the rest follows logically. This is exactly the kind of position that training puzzles are built from.`,
            `Three moves from checkmate — and the engine confirms it's forced. Find the key first move and the rest unravels: the king can't escape.`,
            `Mate in 3! The sequence is forced — every defence the king has leads to the same result. Find the first move and calculate through to the end.`,
          ];
        } else if (mateDepth <= 6) {
          matePool = [
            ...MATE_CHALLENGE_LINES.m4to6,
            `Forced mate in ${mateDepth} — the engine confirms it! Stay on the most forcing moves at all times and do not allow a defensive resource.`,
            `Mate in ${mateDepth} is on the board. Every move must be forcing — the king has no escape if the attack is accurate.`,
            `The engine sees checkmate in ${mateDepth}. Calculate each checking or restricting sequence carefully and the game is yours.`,
            `Mate in ${mateDepth} confirmed. The king is trapped — follow the forcing lines precisely and do not let it regroup.`,
            `Closing in: forced mate in ${mateDepth}. Identify every king escape square before each move — the win is there if the attack stays accurate.`,
            `Engine: forced mate in ${mateDepth}. In positions like this, the principle is simple — play the most forcing move at every turn and the king cannot survive.`,
            ...APPROACHING_MATE_LINES.slice(0, 5),
          ];
        } else {
          matePool = [
            `Closer to checkmate — the engine confirms a forced mate in ${mateDepth}. Follow every forcing line precisely and do not let the king slip away.`,
            `Engine evaluation: forced checkmate in ${mateDepth}. The position is decided — stay accurate and execute the mating sequence.`,
            `The engine sees forced checkmate in ${mateDepth} moves. The mating net is in place — precision is the only remaining task.`,
            `Forced mate in ${mateDepth}. Calculate every king move before proceeding — the win is there, do not let it go.`,
            ...APPROACHING_MATE_LINES,
          ];
        }
        explanation.text = pick(matePool);
        explanation.type = 'great';
        explanation.tacticType = 'approachingMate';
        return finalizeExpl(explanation);
      }

      const approachMate = !explanation.text ? detectApproachingMate(currentFen, move.color, cpLoss) : null;
      if (approachMate) {
        if (approachMate.confidence === 'high') {
          explanation.text = pick([
            ...APPROACHING_MATE_LINES,
            `The position is converging on checkmate — ${opp}'s king on ${approachMate.kingSquare} is critically exposed with no shelter. Engine lines lead to a forced finish from here.`,
            `Closer to checkmate: the king on ${approachMate.kingSquare} has zero pawn cover and ${approachMate.attackCount} zones under fire. Stay on the forcing moves.`,
            `Closing in — ${opp}'s king on ${approachMate.kingSquare} is fully exposed. The engine's lines from here all converge on checkmate. Follow the most forcing continuation.`,
          ]);
        } else {
          explanation.text = pick([
            ...APPROACHING_MATE_LINES.slice(0, 10),
            `Getting dangerously close to checkmate — ${opp}'s king on ${approachMate.kingSquare} is under heavy pressure. Continue with forcing moves and the position should decide itself.`,
            `Closer to checkmate: ${opp}'s king on ${approachMate.kingSquare} is exposed with ${approachMate.attackCount} zones under fire. Keep up the pressure.`,
          ]);
        }
        explanation.type = 'great';
        explanation.tacticType = 'approachingMate';
        return finalizeExpl(explanation);
      }
    }

    // [C2] Own piece now hanging after player's move (walked into a capture)
    if (isPlayerMove && !isGoodMove) {
      try {
        const chess = new Chess(currentFen);
        const movedPiece = chess.get(move.to);
        if (movedPiece && MATERIAL_VALUES[move.piece] >= 300) {
          const isAttackedByOpp = chess.isAttacked(move.to, move.color === 'w' ? 'b' : 'w');
          const isDefendedByUs  = isSquareDefended(currentFen, move.to, move.color);
          if (isAttackedByOpp && !isDefendedByUs) {
            explanation.text = pick([
              ...BLUNDER_HANGING,
              `The ${pieceName} just walked to ${move.to} undefended — it can be captured immediately.`,
              `${mover}'s ${pieceName} has no backup and is under attack. ${pick(qualityTier === 'blunder' ? DEVASTATING_ROASTS : MILD_GROANS)}`,
            ]);
            explanation.type = qualityTier === 'mistake' ? 'mistake' : 'blunder';
            return finalizeExpl(explanation);
          }
        }
      } catch (e) { }
    }

    // [C2a] Continuous Captures (Take, Take, Take)
    if (isPlayerMove && captureStreak >= 3 && !explanation.text) {
      explanation.text = pick(CONTINUOUS_CAPTURE_LINES);
      explanation.type = 'tactical';
      explanation.tacticType = 'continuousCapture';
      return withSecondary(explanation);
    }

    // [C3] Equal trade — note it, but allow tactic overrides below
    if (isPlayerMove && capturedPiece && Math.abs(materialGain) <= 100) {
      explanation.text = pick([
        `An equal exchange — ${pieceName} for ${capturedPiece}. The material balance holds.`,
        `${mover} trades ${pieceName} for ${capturedPiece}. The position simplifies.`,
        `A fair swap. The resulting pawn structure and piece activity will decide.`,
        `Balanced exchange. Piece count stays even — but the resulting position matters.`,
      ]);
      explanation.type = 'best';
      // DO NOT return — let tactic detection below override if something better exists
    }

    // [C4] Missed best move with explanation
    if (isPlayerMove && !isPlayerBest && bestMoveSan) {
      const chess = new Chess(previousFen);
      const allMoves = chess.moves({ verbose: true });
      const bestMove = allMoves.find(m => normSan(m.san) === normSan(bestMoveSan));
      const safeBestSan = bestMove ? bestMoveSan : null;

      if (isOnlySoundMove) {
        explanation.text = safeBestSan
          ? (timeSpent !== null && timeSpent < 3
            ? `Blitzed in ${timeSpent}s — but ${safeBestSan} was the ONLY safe square in a minefield position.`
            : pick([
              `Stepped into a trap. ${safeBestSan} was the only move to stay alive here.`,
              `A critical moment — ${safeBestSan} was the sole way to hold.`,
              `This falls right into ${opp}'s hands. Only ${safeBestSan} survives.`,
              `The position was a minefield — the wrong path was taken. ${safeBestSan} was the escape.`,
              `Only one move saves the position here. ${safeBestSan} was it.`,
            ]))
          : pick([
            `Stepped into a trap. There was only one move to stay alive here.`,
            `A critical moment — the sole way to hold was missed.`,
            `The position was a minefield and the wrong path was taken.`,
            `Only one move saves the position here.`,
          ]);
        explanation.type = 'blunder';
        return finalizeExpl(explanation);
      }

      // High-Value Target Extraction for natural grammar response
      const targets = extractBestMoveTargets(previousFen, bestMoveSan);
      const target1 = targets.length > 0 ? targets[0] : null;
      const target2 = targets.length > 1 ? targets[1] : null;

      let timeContext = "";
      if (timeSpent !== null && timeSpent < 3) timeContext = "#time_rush#";
      else if (timeSpent !== null && timeSpent > 30) timeContext = "#time_long#";

      if (targets.length >= 2) {
        explanation.text = expandTemplate(`${timeContext}#missed_fork_targets# #advice_aggressive#`, { target1, target2, timeSpent });
        explanation.type = 'missed';
        return finalizeExpl(explanation);
      } else if (targets.length === 1) {
        explanation.text = expandTemplate(`${timeContext}#missed_tactic_targets# #advice_aggressive#`, { target1, timeSpent });
        explanation.type = 'missed';
        return finalizeExpl(explanation);
      } else if (bestMove && bestMove.captured) {
        // Fallback if target extraction missed something unusual
        const bestCaptured = getPieceNameFromFen(bestMove.captured);
        explanation.text = pick([
          `Misses a free ${bestCaptured}! ${bestMoveSan} wins material immediately.`,
          `${bestMoveSan} was right there — capturing a hanging ${bestCaptured}. Opportunity missed.`,
          `A ${bestCaptured} was up for grabs with ${bestMoveSan}. This move walks right past it.`,
          `That ${bestCaptured} wasn't going anywhere! ${bestMoveSan} picks it up for free.`,
          `${pick(MISSED_TACTIC_TEACHING)} In this case: ${bestMoveSan} wins the ${bestCaptured} for free.`,
        ]);
        explanation.type = 'missed';
        return finalizeExpl(explanation);
      }

      const threats = detectThreats(currentFen);
      if (threats.length > 0) {
        const topThreat = threats[0];

        let threatVerb;
        if (topThreat.threatens === 'check') {
          threatVerb = pick([
            'gives check', 
            'delivers a forcing check', 
            'comes with check', 
            'initiates a checking sequence',
            'forces the king to move'
          ]);
        } else if (topThreat.isDefended && topThreat.attackerVal === topThreat.targetVal) {
          const piecePlural = topThreat.threatens === 'piece' ? 'pieces' : `${topThreat.threatens}s`;
          threatVerb = pick([
            `forces a trade of ${piecePlural}`,
            `initiates an equal exchange of ${piecePlural}`,
            `triggers a sequence of trades`,
            `leads to a structural swap`,
            `forces a simplification involving the ${piecePlural}`
          ]);
        } else {
          threatVerb = pick([
            `wins the ${topThreat.threatens}`,
            `safely removes the ${topThreat.threatens}`,
            `picks up the ${topThreat.threatens} for free`,
            `grabs the hanging ${topThreat.threatens}`,
            `nets the ${topThreat.threatens}`
          ]);
        }

        explanation.text = safeBestSan
          ? pick([
            `This allows ${opp} to play ${topThreat.threatMove}, which ${threatVerb}. Playing ${safeBestSan} was the tighter way to handle the tension.`,
            `Careful! You've allowed ${topThreat.threatMove}, which ${threatVerb}. ${safeBestSan} would have kept the position tightly controlled.`,
            `You've left the door open for ${topThreat.threatMove}, which ${threatVerb}. The engine preferred ${safeBestSan} to prevent this sequence.`,
            `This gives ${opp} the tactical chance for ${topThreat.threatMove}, which ${threatVerb}. ${safeBestSan} avoids this entirely.`,
            `A slight slip — ${opp} can now respond with ${topThreat.threatMove} (${threatVerb}). ${safeBestSan} was the most principled continuation.`
          ])
          : pick([
            `This gives ${opp} the chance to play ${topThreat.threatMove}, which ${threatVerb}. A safer, more solid option was required here.`,
            `Watch out! ${opp} now has ${topThreat.threatMove} (${threatVerb}). It was better to play something more structurally sound.`,
            `That allows ${topThreat.threatMove}, which ${threatVerb}. Preventing that resource should have been the priority.`,
            `This opens the position up to ${topThreat.threatMove}, which ${threatVerb}. A much more controlled move was needed.`
          ]);
        explanation.type = 'threat';
        return finalizeExpl(explanation);
      }
    }

    // [C5] Minefield navigation — only sound move, correctly found
    if (isPlayerMove && isPlayerBest && isOnlySoundMove && !explanation.text) {
      const prefix = timePrefix();
      explanation.text = (timeSpent !== null && timeSpent < 3)
        ? `${prefix}Only one move holds here — found in an instant. Brilliant nerves.`
        : pick([
          "Navigated the minefield! Only one move survives here — and it was found.",
          `Only one move holds the position — and ${mover} found it. Precise under pressure.`,
          "The position screamed for precision. Delivered.",
          "One correct path in a maze of traps. Found perfectly.",
          `${timeSpent !== null && timeSpent > 60 ? 'The long think paid off — ' : ''}Only one move saves the position and it was played.`,
        ]);
      explanation.type = 'great';
      return finalizeExpl(explanation);
    }

    // [C6] Zwischenzug (in-between move)
    if (isPlayerMove && isGoodMove && !explanation.text) {
      const zwischenzug = detectZwischenzug(move, previousFen);
      if (zwischenzug) {
        if (zwischenzug.type === 'material_threat') {
          explanation.text = pick([
            `An in-between move! Instead of the expected recapture, a high-value threat is created first — forcing the opponent to react.`,
            `Intermezzo! A material threat is played before the obvious recapture — the opponent must deal with it first.`,
            `Surprising zwischenzug — threatening material instead of recapturing. The opponent's plans are disrupted.`,
            `An intermediate threat before the recapture! The opponent cannot ignore this — something falls.`,
            `The zwischenzug strikes again: a tactical intermediate move creates a problem that must be solved immediately.`,
          ]);
        } else {
          explanation.text = pick([
            `Zwischenzug! Instead of recapturing, an in-between check is played first — gaining tempo.`,
            `A beautiful in-between move! Recapture can wait — this check forces the opponent's hand first.`,
            `The "intermezzo" — a forcing intermediate move before the expected recapture. Tactical precision!`,
            `Surprising! ${mover} plays an in-between move instead of the obvious recapture. Devastating.`,
            `A classic zwischenzug — forcing ${opp} to deal with an unexpected threat before anything else.`,
          ]);
        }
        explanation.type = 'great';
        explanation.tacticType = 'zwischenzug';
        return withSecondary(explanation);
      }
    }

    // [C7] Fork
    if (isPlayerMove && isGoodMove && !explanation.text) {
      const fork = detectFork(currentFen, move);
      if (fork) {
        if (fork.includesKing) {
          explanation.text = pick([
            `Check AND a fork! The king is in check while another piece is threatened — something falls.`,
            `A royal fork — the king is in check and a ${fork.pieces[1]} is attacked simultaneously. The king must move, then the ${fork.pieces[1]} is taken.`,
            `Check with a fork! ${opp} removes the check, but loses the ${fork.pieces[1]}. One move attacks two targets.`,
            `A fork with check — the most forcing kind. The king must react, and the ${fork.pieces[1]} pays the price.`,
            `King in check AND a piece attacked — the opponent can address only one problem. One of them is about to be lost.`,
          ]);
        } else if (pieceName === 'knight') {
          explanation.text = pick([
            `A knight fork! The ${pieceName} attacks ${fork.count} pieces at once — one must fall.`,
            `Devastating knight fork. ${opp} can only save one of the ${fork.count} attacked pieces.`,
            `Knight forks are chess magic — two pieces attacked simultaneously from an L-shaped jump. Impossible to defend both!`,
            `Fun fact: knight forks are so common they have their own nickname — "knightmare" for the victim.`,
            `${pick(TACTICAL_QUOTES.fork)}`,
            // ── Teaching lines ──
            `${pick(FORK_TEACHING)}`,
            `The knight's L-shaped movement makes it the ultimate forking piece — it attacks squares that straight-line pieces can't cover. This fork is a perfect example.`,
            `A classic knight fork: the ${pieceName} lands on a square where it simultaneously attacks two enemy pieces. The geometry is the weapon.`,
          ]);
        } else {
          explanation.text = pick([
            `A fork! The ${pieceName} attacks ${fork.count} pieces at once — one must fall.`,
            `Devastating ${pieceName} fork. ${opp} can only save one piece.`,
            `Two targets, one move. Something has to give.`,
            `The ${pieceName} strikes in two directions simultaneously. Pure tactical vision.`,
            `${pick(TACTICAL_QUOTES.fork)}`,
            // ── Teaching lines ──
            `${pick(FORK_TEACHING)}`,
            `A fork! Notice how the ${pieceName} attacks two targets from one square — the opponent must choose which to save. One of them is lost.`,
            `The ${pieceName} attacks ${fork.count} pieces simultaneously — a fork that the opponent cannot fully answer.`,
          ]);
        }
        explanation.type = 'great';
        explanation.tacticType = 'fork';
        return withSecondary(explanation);
      }
    }

    // [C8] Pin
    if (isPlayerMove && isGoodMove && !explanation.text && ['b','r','q'].includes(move.piece)) {
      try {
        const oppColor = move.color === 'w' ? 'b' : 'w';
        const fenParts = currentFen.split(' ');
        fenParts[1] = oppColor;
        const oppTurnFen = fenParts.join(' ');

        // Build the BEFORE version with opponent's turn to check pre-existing pins
        const prevFenParts = previousFen.split(' ');
        prevFenParts[1] = oppColor;
        prevFenParts[3] = '-';
        const prevOppTurnFen = prevFenParts.join(' ');

        const board = new Chess(oppTurnFen).board().flat();
        for (const sq of board) {
          if (!sq || sq.color !== oppColor || sq.type === 'k') continue;
          if (isPiecePinned(oppTurnFen, sq.square, oppColor)) {
            // Only announce the pin if it was NOT already present before this move.
            try {
              if (isPiecePinned(prevOppTurnFen, sq.square, oppColor)) continue;
            } catch (e) { /* if check fails, allow announcement */ }

            const pinnedName = getPieceNameFromFen(sq.type);
            explanation.text = pick([
              `A pin! ${opp}'s ${pinnedName} is frozen — it can't move without exposing the king.`,
              `The ${pieceName} pins ${opp}'s ${pinnedName} to the king. Immobilized.`,
              `Excellent pin! ${opp}'s ${pinnedName} is paralyzed — moving it exposes the king to attack.`,
              `"The pin is mightier than the sword." — and ${mover} just proved it.`,
              `Fun fact: an absolute pin means the piece literally cannot move legally. That's what just happened to ${opp}'s ${pinnedName}.`,
              `${pick(TACTICAL_QUOTES.pin)}`,
              `${opp}'s ${pinnedName} is glued to the board — pinned to the king. A classic restraining weapon.`,
              `A powerful absolute pin — ${opp}'s ${pinnedName} is nailed down. Moving it would expose the king to immediate capture.`,
              // ── Teaching lines ──
              `${pick(PIN_TEACHING)}`,
              `The pin is established — ${opp}'s ${pinnedName} cannot legally move without putting the king in check. Now is the time to pile pressure on the pinned piece.`,
              `A fresh pin on the ${pinnedName}! The best follow-up: attack it again with a less valuable piece and force material gain.`,
            ]);
            explanation.type = 'great';
            explanation.tacticType = 'pin';
            return withSecondary(explanation);
          }
        }
      } catch (e) { }
    }

    // [C9] Skewer
    if (isPlayerMove && isGoodMove && !explanation.text && ['b','r','q'].includes(move.piece)) {
      const skewer = detectSkewer(currentFen, move);
      if (skewer) {
        if (skewer.isKingSkewer) {
          explanation.text = pick([
            `King skewer! The king must flee — and the ${skewer.behindPiece} behind it is lost.`,
            `A king skewer — attack the king, win the ${skewer.behindPiece} hiding behind it. Devastating.`,
            `Brilliant geometry! The king takes the pressure, and the ${skewer.behindPiece} pays the price.`,
            `Fun fact: a king skewer is a reverse pin where the king itself is the front piece — it has to move, exposing the ${skewer.behindPiece}.`,
            `The king is forced to step away — revealing the ${skewer.behindPiece} to be captured. A textbook skewer.`,
            `${pick(SKEWER_TEACHING)}`,
            `A king skewer — the king is more valuable than anything, so it must move. The ${skewer.behindPiece} hiding behind it has nowhere to go.`,
          ]);
        } else {
          explanation.text = pick([
            `A skewer! The ${skewer.frontPiece} is attacked — when it flees, the ${skewer.behindPiece} falls.`,
            `Reverse pin! The ${skewer.frontPiece} must move, exposing the ${skewer.behindPiece} behind it.`,
            `A classic skewer — the more valuable piece takes the hit, the lesser piece pays the price.`,
            `${pick(TACTICAL_QUOTES.skewer)}`,
            `Beautiful geometry — ${pieceName} skewers through the ${skewer.frontPiece} to win the ${skewer.behindPiece}.`,
            `${pick(SKEWER_TEACHING)}`,
            `Skewer! The ${skewer.frontPiece} is under attack — it retreats — and the ${skewer.behindPiece} behind it is taken for free. Linear piece placement punished.`,
          ]);
        }
        explanation.type = 'great';
        explanation.tacticType = 'skewer';
        return withSecondary(explanation);
      }
    }

    // [C9a] — NEW: Double check (must check BEFORE regular discovered attack for priority)
    if (isPlayerMove && isGoodMove && !explanation.text) {
      const dblChk = detectDoubleCheck(currentFen, move);
      if (dblChk) {
        explanation.text = pick([
          `Double check! Both the ${pieceName} AND a revealed piece are checking the king simultaneously — the only answer is to move the king.`,
          `A double check — the most forcing move in chess! ${opp}'s king has nowhere to hide and can't block or capture both attackers.`,
          `${pick(TACTICAL_QUOTES.doubleCheck)} And it just happened right here.`,
          `Devastating double check! The king is attacked from two directions — no interposition, no capture. Only flight.`,
          `The ultimate forcing move — a double check by the ${pieceName}. The king must move no matter what.`,
        ]);
        explanation.type = 'great';
        explanation.tacticType = 'doubleCheck';
        return finalizeExpl(explanation);
      }
    }

    // [C10] Discovered attack
    if (isPlayerMove && isGoodMove && !explanation.text) {
      const discovery = detectDiscoveredAttack(previousFen, move);
      if (discovery) {
        if (discovery.isCheck) {
          explanation.text = pick([
            `Discovered check! Moving the ${pieceName} unmasks a check from the ${discovery.revealedPiece} — the king must respond immediately.`,
            `A discovered check — one of the most powerful moves in chess. The ${pieceName} moves freely while the ${discovery.revealedPiece} delivers check.`,
            `The ${discovery.revealedPiece} delivers a discovered check! The king is suddenly in the line of fire.`,
            `${pick(TACTICAL_QUOTES.discoveredAttack)} A discovered check — the king is forced to react.`,
            `Fun fact: discovered checks are so devastating because the moving piece is free to go anywhere — the king must address the revealed check first.`,
            `${pick(DISCOVERY_TEACHING)}`,
            `A discovered check! The ${pieceName} moves with a new threat while the ${discovery.revealedPiece} emerges to give check. Two attacks, one move — the opponent can only address the check.`,
            `Discovered check by the ${discovery.revealedPiece} — the most powerful version of a discovery. The moving piece goes wherever it likes while the king scrambles.`,
          ]);
        } else {
          explanation.text = pick([
            `Discovered attack! Moving the ${pieceName} reveals a hidden attack on the ${discovery.targetPiece}.`,
            `A discovered attack — the ${pieceName} steps aside to unmask a blow on the ${discovery.targetPiece} on ${discovery.targetSquare}.`,
            `Double threats from a single move! The moved piece threatens; the piece behind it strikes the ${discovery.targetPiece}.`,
            `${pick(TACTICAL_QUOTES.discoveredAttack)}`,
            `The piece moves to reveal the cannon behind it. A discovered attack on the ${discovery.targetPiece}!`,
            `Brilliant! Moving away creates a discovered attack — two threats for the price of one move.`,
            `${pick(DISCOVERY_TEACHING)}`,
            `The ${discovery.revealedPiece} was hiding behind the ${pieceName} all along — now it's revealed and the ${discovery.targetPiece} on ${discovery.targetSquare} is under fire.`,
            `A discovered attack: the ${pieceName} moves with its own purpose, and in doing so, uncovers the ${discovery.revealedPiece}'s line of attack on the ${discovery.targetPiece}. Two threats in one move.`,
          ]);
        }
        explanation.type = 'great';
        explanation.tacticType = 'discoveredAttack';
        return withSecondary(explanation);
      }
    }

    // [C11] X-ray attack
    if (isPlayerMove && isGoodMove && !explanation.text && ['b','r','q'].includes(move.piece)) {
      const xray = detectXRay(currentFen, move);
      if (xray) {
        explanation.text = pick([
          `An X-ray attack! The ${pieceName} sees through the ${xray.through} to pressure the ${xray.target}.`,
          `X-ray pressure — even through its own piece, the ${pieceName} exerts force on the ${xray.target}.`,
          `${pick(TACTICAL_QUOTES.xray)}`,
          `A subtle X-ray: the ${pieceName} aims through the ${xray.through}, keeping tension on the ${xray.target}.`,
        ]);
        explanation.type = 'great';
        explanation.tacticType = 'xray';
        return finalizeExpl(explanation);
      }
    }

    // [C12] Removal of defender
    if (isPlayerMove && isGoodMove && !explanation.text && move.captured) {
      const removal = detectRemovalOfDefender(previousFen, currentFen, move);
      if (removal) {
        explanation.text = pick([
          `Removal of the defender! Capturing the ${capturedPiece} leaves the ${removal.piece} on ${removal.square} unprotected.`,
          `A classic "remove the guard" tactic — the ${capturedPiece} was protecting the ${removal.piece}. Now it's free.`,
          `The ${capturedPiece} was the bodyguard. Now it's gone — and the ${removal.piece} has no protection.`,
          `Undermining the defense! The captured ${capturedPiece} was the only guard for the ${removal.piece}.`,
        ]);
        explanation.type = 'great';
        explanation.tacticType = 'removalOfDefender';
        return withSecondary(explanation);
      }
    }

    // [C13] Opponent piece is now hanging (good for us)
    if (isPlayerMove && isGoodMove && !explanation.text) {
      const hanging = detectHangingPieces(currentFen, move.color);
      if (hanging.length > 0 && hanging[0].value >= 300) {
        const h = hanging[0];
        explanation.text = pick([
          `${opp}'s ${h.piece} on ${h.square} is now completely undefended — it can be taken for free.`,
          `After this move, the ${h.piece} on ${h.square} is hanging. Take it next!`,
          `Pressure pays off — the ${h.piece} on ${h.square} has no guards. A free piece awaits.`,
          `A free ${h.piece}! ${opp} left it on ${h.square} without protection.`,
        ]);
        explanation.type = 'great';
        return withSecondary(explanation);
      }
    }

    // [C13a] — NEW: Trapped opponent piece
    if (isPlayerMove && !explanation.text) {
      const trapped = detectTrappedPiece(currentFen, move.color);
      if (trapped) {
        explanation.text = pick([
          `${opp}'s ${trapped.piece} on ${trapped.square} is completely trapped — it has no legal escape squares!`,
          `The ${trapped.piece} on ${trapped.square} is going nowhere. It's trapped and under attack.`,
          `A trapped ${trapped.piece}! ${opp} will lose it without a move being played. A powerful positional net.`,
          `${pick(TACTICAL_QUOTES.trappedPiece)} The ${trapped.piece} on ${trapped.square} is caught.`,
          `Brilliant! The ${trapped.piece} on ${trapped.square} is imprisoned — no safe squares remain.`,
        ]);
        explanation.type = 'great';
        explanation.tacticType = 'trappedPiece';
        return withSecondary(explanation);
      }
    }

    // [C13b] — NEW: Overloaded defender (opponent piece defending 2+ valuable pieces)
    if (isPlayerMove && !explanation.text) {
      const overloaded = detectOverloadedPiece(currentFen, move.color);
      if (overloaded && overloaded.guardedPieces.length >= 2) {
        const target1 = overloaded.guardedPieces[0];
        const target2 = overloaded.guardedPieces[1];
        explanation.text = pick([
          ...OVERLOADED_PIECE_LINES,
          `${opp}'s ${overloaded.defenderPiece} on ${overloaded.defenderSquare} is overloaded — it's guarding both the ${target1.piece} and the ${target2.piece}. Attack one, win the other.`,
          `The ${overloaded.defenderPiece} can't protect everything. It's defending the ${target1.piece} on ${target1.square} AND the ${target2.piece} on ${target2.square} — too much for one piece.`,
          `Overload detected! The ${overloaded.defenderPiece} on ${overloaded.defenderSquare} has two critical duties. One of those duties is about to be exploited.`,
        ]);
        explanation.type = 'great';
        explanation.tacticType = 'overloadedPiece';
        return withSecondary(explanation);
      }
    }

    // [C14] Back rank weakness created (player just opened opponent's back rank)
    if (isPlayerMove && !explanation.text) {
      const oppColorCode = move.color === 'w' ? 'b' : 'w';
      if (hasBackRankWeakness(currentFen, oppColorCode) && isPlayerMove) {
        
        // If it was a high-quality move, use the CFG engine with accurate non-mate vocabulary
        if (qualityTier === 'brilliant' || qualityTier === 'great' || qualityTier === 'best') {
          explanation.text = expandTemplate("#tactical_intro# #action_good#", {
            tactic_desc: "a fatal back-rank weakness"
          });
        } else {
          // Otherwise fallback to standard observations
          explanation.text = pick([
            `${opp}'s back rank is dangerously weak! A back rank mate could end this.`,
            `Watch the back rank — ${opp}'s king is trapped with no escape!`,
            `Back rank weakness exposed. One rook or queen swing could be decisive.`,
            `${opp} has a back rank problem — the king is boxed in by its own pieces.`,
            `Classic back rank weakness! One of the most common mating patterns in chess.`,
            `${pick(TACTICAL_QUOTES.backRank)}`,
            `Luft! ${opp} needs an escape square. Without it, the back rank is a death trap.`,
          ]);
        }
        
        explanation.type = 'tactical';
        explanation.tacticType = 'backRank';
        return finalizeExpl(explanation);
      }
    }

    // [C15] Prophylaxis — good move that prevents opponent's threat
    if (isPlayerMove && !explanation.text && isPlayerBest) {
      const prophylaxis = detectProphylaxis(previousFen, currentFen);
      if (prophylaxis) {
        explanation.text = pick([
          `Prophylaxis! This move prevents ${opp}'s threat of ${prophylaxis.preventedThreat} before it materializes.`,
          `A preventive move — stopping ${prophylaxis.preventedThreat} in its tracks.`,
          `${mover} sees ${opp}'s plan and stops it cold. Classic prophylactic thinking.`,
          `The sign of an experienced player — preventing the opponent's idea rather than reacting to it.`,
          `Nimzowitsch would approve! This move stops ${opp}'s plan of ${prophylaxis.preventedThreat}.`,
          `Thinking ahead — ${opp} wanted to play ${prophylaxis.preventedThreat}. That plan is now dead.`,
        ]);
        explanation.type = 'great';
        explanation.tacticType = 'prophylaxis';
        return finalizeExpl(explanation);
      }
    }

    // [C16] Pawn promotion threat (one step from queening)
    if (!explanation.text) {
      const nearPromotion = detectPromotionThreats(currentFen, move.color);
      if (nearPromotion.length > 0) {
        const fileStr = nearPromotion.length === 1
          ? `${nearPromotion[0]}-file`
          : nearPromotion.slice(0, -1).join(', ') + ' and ' + nearPromotion[nearPromotion.length - 1] + '-files';
        explanation.text = pick([
          `Promotion alert — the ${fileStr} pawn is one step from becoming royalty!`,
          `${mover}'s pawn on the ${fileStr} is one step from queening!`,
          `The ${fileStr} pawn is knocking on the door. If it queens, this could be over.`,
          `${mover} has a promotion threat! This demands ${opp}'s immediate attention.`,
          `"Passed pawns must be pushed!" — and this one is one square from a queen.`,
          `${pick(TACTICAL_QUOTES.promotion)} The ${fileStr} pawn is about to promote.`,
        ]);
        explanation.type = 'tactical';
        explanation.tacticType = 'promotionThreat';
        return finalizeExpl(explanation);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION D — ENDGAME CONCEPTS
    // ─────────────────────────────────────────────────────────────────────────

    // [D1] Zugzwang
    if (isPlayerMove && !explanation.text && isPlayerBest && isEndgame) {
      if (detectZugzwang(currentFen)) {
        explanation.text = pick([
          `Zugzwang! ${opp} is in a position where every move makes things worse.`,
          `A zugzwang! ${opp} would rather pass their turn — but in chess, you must move.`,
          `${pick(TACTICAL_QUOTES.zugzwang)}`,
          `Endgame mastery — ${mover} creates a position where ${opp} cannot improve without self-destructing.`,
          `Zugzwang achieved! Every move ${opp} makes loses ground. A beautiful technical concept.`,
        ]);
        explanation.type = 'great';
        explanation.tacticType = 'zugzwang';
        return finalizeExpl(explanation);
      }
    }

    // [D2] King activity in endgame — only fires for the current player's king move
    if (isPlayerMove && !explanation.text && isEndgame) {
      const kingAct = detectKingActivity(currentFen, move);
      if (kingAct && kingAct.isActivating) {
        explanation.text = pick([
          `King activation! In the endgame, the king becomes a powerful attacking piece.`,
          `The king marches forward! A centralized king is a weapon, not a liability, in endgames.`,
          `Endgame principle: activate the king. It belongs in the center now, not hiding on the back rank.`,
          `${mover}'s king enters the fight. This is textbook — the king must be active in the endgame.`,
          `Classic endgame technique — the king joins the action. Passive kings lose endgames.`,
        ]);
        explanation.type = 'best';
        explanation.tacticType = 'kingActivity';
        return finalizeExpl(explanation);
      }
    }

    // [D3] Stalemate trap awareness — winning side must not accidentally draw
    // NOTE: isAlreadyStalemate here is a belt-and-suspenders fallback; the primary
    // stalemate-by-current-move check is [A3_stale] which fires much earlier in the flow.
    if (isPlayerMove && !explanation.text) {
      const stalemateRisk = detectStalemateTrap(currentFen, move.color);
      if (stalemateRisk) {
        if (stalemateRisk.isAlreadyStalemate) {
          const avoidLine = bestMoveSan
            ? ` The engine's best move was ${bestMoveSan} — that line kept at least one legal reply for the opponent while maintaining the winning advantage.`
            : ` Always ensure the opponent retains at least one legal move until you can deliver checkmate immediately.`;
          const rawLine = pick(STALEMATE_OCCURRED_LINES);
          explanation.text = rawLine.replace('{{avoidLine}}', avoidLine);
        } else {
          explanation.text = pick(STALEMATE_AWARENESS_LINES);
        }
        explanation.type = 'observation';
        explanation.tacticType = 'stalemateWarning';
        return finalizeExpl(explanation);
      }
    }

    // [D5] — NEW: Pawn endgame specific commentary (king+pawn endings)
    if (isPlayerMove && !explanation.text && isEndgame && move.piece === 'p') {
      const piecesLeft = new Chess(currentFen).board().flat().filter(Boolean).length;
      if (piecesLeft <= 6) {
        explanation.text = pick(PAWN_ENDGAME_LINES);
        explanation.type = 'best';
        return finalizeExpl(explanation);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION E — POSITIONAL / STRUCTURAL
    // ─────────────────────────────────────────────────────────────────────────

    // [E1] Endorsed sacrifice (engine agrees: material given for attack)
    if (isPlayerMove && !explanation.text && materialGain < -100 && isGoodMove) {
      // Distinguish exchange sacrifice (rook for minor) from speculative vs full sacrifice
      const isExchangeSac = move.captured && ['b','n'].includes(move.captured.toLowerCase())
        && move.piece === 'r' && materialGain >= -250 && materialGain <= -150;
      const isFullSac = materialGain <= -400;

      const isAggressiveSac = detectAggressiveSacrifice(previousFen, currentFen, move, materialGain);

      if (isAggressiveSac) {
        explanation.text = expandTemplate("A tactical sacrifice! #action_good# #material_gain#", {
          tactic_desc: "a devastating attack on the king's shelter"
        });
        explanation.type = 'tactical';
      } else if (isExchangeSac) {
        explanation.text = pick([
          ...EXCHANGE_SACRIFICE_LINES,
          `${mover} sacrifices the exchange! Rook for ${capturedPiece} — the engine endorses it. The positional return is real.`,
          `An exchange sacrifice, Petrosian-style! The rook goes, but the compensation in piece activity is undeniable.`,
        ]);
      } else if (isFullSac) {
        explanation.text = pick([
          `A piece sacrifice! Material is given up for a deeper purpose — attack or positional dominance.`,
          `${mover} sacrifices material! The engine endorses this — there's a concrete plan behind it.`,
          `Tal-style! A bold material sacrifice with real compensation.`,
          `Giving up material deliberately — a calculated sacrifice with genuine power behind it.`,
          `${pick(FAMOUS_GAME_REFS)}`,
          `"When in doubt, sac the piece." — Mikhail Tal. This sacrifice, however, has clear justification.`,
        ]);
      } else {
        explanation.text = pick([
          `A sacrifice! Material is given up for a deeper purpose — attack or positional dominance.`,
          `${mover} sacrifices material! The engine endorses this — there's a concrete plan behind it.`,
          `Tal-style! A bold material sacrifice with real compensation.`,
          `Giving up material deliberately — a calculated sacrifice with genuine power behind it.`,
          `${pick(FAMOUS_GAME_REFS)}`,
        ]);
      }
      explanation.type = 'great';
      return finalizeExpl(explanation);
    }

    // [E2] Piece development
    if (isPlayerMove && !explanation.text && ['n','b'].includes(move.piece)) {
      const startRank = move.color === 'w' ? '1' : '8';
      if (move.from.includes(startRank) && !move.to.includes(startRank)) {
        explanation.text = pick([
          `Good development — the ${pieceName} joins the fight.`,
          `Develops the ${pieceName} to an active square. Solid fundamentals.`,
          `Classic opening principle: get pieces off the back rank.`,
          `A well-placed ${pieceName}. Development is on track.`,
          pieceName === 'knight'
            ? "The knight develops toward the center. Remember: a knight on the rim is dim!"
            : "The bishop finds a good diagonal. Bishops love open lines.",
          pieceName === 'knight'
            ? "Knights belong near the center — controlling key squares from there."
            : "The bishop eyes the enemy position from afar. Long-range piece activated.",
        ]);
        explanation.type = 'best';
        return finalizeExpl(explanation);
      }
    }

    // [E2a] — Bad bishop warning: own pawn move has locked the bishop's diagonals
    if (isPlayerMove && !explanation.text && move.piece === 'p') {
      const badBishop = detectBadBishop(currentFen, move);
      if (badBishop) {
        const sqStr = badBishop.blockingSquares.join(' and ');
        explanation.text = pick([
          `Structural warning: the bishop on ${badBishop.bishopSquare} is severely restricted. Your pawns on ${sqStr} directly block its active diagonals.`,
          `The bishop on ${badBishop.bishopSquare} is now a bad bishop! It is physically walled in by your own pawns on ${sqStr}.`,
          `Caution: moving this pawn traps your bishop on ${badBishop.bishopSquare} behind the pawns on ${sqStr}. Consider trading the bishop if it can't be activated.`,
          ...BAD_BISHOP_LINES.map(line => line + ` (Blocked by pawns on ${sqStr})`),
        ]);
        explanation.type = 'observation';
        explanation.tacticType = 'badBishop';
        return finalizeExpl(explanation);
      }
    }

    // [E3] Pawn structure
    if (isPlayerMove && !explanation.text && move.piece === 'p') {
      const file = move.to[0];
      const rank = parseInt(move.to[1]);

      if (move.captured) {
        try {
          const tempChess = new Chess(currentFen);
          let pawnsOnFile = 0;
          for (let r = 1; r <= 8; r++) {
            const p = tempChess.get(`${file}${r}`);
            if (p && p.type === 'p' && p.color === move.color) pawnsOnFile++;
          }
          if (pawnsOnFile > 1 && materialGain <= 0) {
            explanation.text = pick([
              "This creates doubled pawns — a structural weakness that's hard to fix.",
              "Doubled pawns result here. A long-term liability in the pawn structure.",
              `Capturing here doubles pawns on the ${file}-file. Philidor would not approve.`,
              "Doubled pawns can't defend each other — a persistent structural problem.",
            ]);
            explanation.type = 'inaccuracy';
            return finalizeExpl(explanation);
          }

          // Isolated pawn check
          const isoPawn = detectIsolatedPawn(currentFen, move);
          if (isoPawn && pawnsOnFile <= 1) {
            explanation.text = pick([
              `This creates an isolated pawn on the ${isoPawn.file}-file — no neighboring pawns to support it.`,
              `An isolated pawn appears on ${isoPawn.file}. A long-term structural liability.`,
              `Fun fact: isolated pawns are one of the most common positional weaknesses studied in endgame theory. One just appeared here.`,
              `The ${isoPawn.file}-file pawn is now isolated — it can only be defended by pieces, never by another pawn.`,
            ]);
            explanation.type = 'inaccuracy';
            return finalizeExpl(explanation);
          }

          // Open file created by capture
          const openFile = detectOpenFileCreated(previousFen, currentFen, move);
          if (openFile) {
            explanation.text = pick([
              `This capture opens the ${move.to[0]}-file — a highway for rooks. Excellent structural thinking.`,
              `The ${move.to[0]}-file is now open! Rooks will dominate it immediately.`,
              `Opening a file with this capture creates lasting pressure. A powerful structural idea.`,
              `Fun fact: opening files with pawn captures is one of the key strategic motifs at every level — and it just happened here.`,
            ]);
            explanation.type = 'best';
            return finalizeExpl(explanation);
          }
        } catch (e) { }
      }

      if ((move.color === 'w' && rank >= 6) || (move.color === 'b' && rank <= 3)) {
        explanation.text = pick([
          "A passed pawn marches forward! Very dangerous now.",
          "The passed pawn advances deep into enemy territory. Hard to stop.",
          `${mover}'s passer is charging. ${opp} must deal with this immediately.`,
          `"Passed pawns must be pushed!" — and this one is doing exactly that.`,
          `${pick(TACTICAL_QUOTES.promotion)} The passed pawn advances.`,
        ]);
        explanation.type = 'excellent';
        return finalizeExpl(explanation);
      }

      if (['d','e'].includes(file) && rank >= 3 && rank <= 6) {
        explanation.text = pick([
          "Central pawn push — fighting for the heart of the board.",
          "Controls the center. Space is power in chess.",
          `"Control the center and you control the game." Solid pawn play.`,
          "Central pawns restrict the opponent's pieces.",
          "Space-gaining pawn push. The center belongs to whoever occupies it.",
        ]);
        explanation.type = 'best';
        return finalizeExpl(explanation);
      }
    }

    // [E4] Check
    if (isPlayerMove && !explanation.text && move.san.includes('+')) {
      const prefix = timePrefix();
      const base = pick([
        `Check! The king must respond — tempo is gained.`,
        `${opp}'s king is in check. Forced to react.`,
        `A forcing check — ${mover} takes control of the pace.`,
        `Check given. The king can't ignore this.`,
        `Forcing moves like this keep the initiative firmly with ${mover}.`,
        `A tempo-gaining check. The opponent must react while ${mover} dictates terms.`,
      ]);
      explanation.text = prefix ? `${prefix}${base.charAt(0).toLowerCase()}${base.slice(1)}` : base;
      explanation.type = 'tactical';
      return finalizeExpl(explanation);
    }

    // [E4a] Tempo-gaining non-check move (attacks a valuable piece forcing a response)
    if (isPlayerMove && !explanation.text && !move.captured) {
      try {
        const chess = new Chess(currentFen);
        const oppColor = move.color === 'w' ? 'b' : 'w';
        const attackerVal = MATERIAL_VALUES[move.piece.toLowerCase()] || 0;
        
        // Check if the moved piece directly attacks an enemy piece worth ≥300
        const fenParts = currentFen.split(' ');
        fenParts[1] = move.color;
        fenParts[3] = '-';
        const moverTurnFen = fenParts.join(' ');
        const tempChess = new Chess(moverTurnFen);
        const myAttacks = tempChess.moves({ square: move.to, verbose: true });
        
        const gainsTempo = myAttacks.some(a => {
          if (!a.captured) return false;
          const targetVal = MATERIAL_VALUES[a.captured.toLowerCase()] || 0;
          if (targetVal < 300) return false;
          
          const targetPiece = chess.get(a.to);
          if (targetPiece?.color !== oppColor) return false;

          // CRITICAL: A threat is only a true tempo if the target is undefended
          // or if the attacker is worth less than or equal to the target.
          // (e.g. Queen attacking a defended Knight is not a tempo).
          const isDefended = isSquareDefended(currentFen, a.to, oppColor);
          return !isDefended || attackerVal <= targetVal;
        });
        
        if (gainsTempo) {
          explanation.text = pick(TEMPO_LINES);
          explanation.type = 'tactical';
          return finalizeExpl(explanation);
        }
      } catch (e) { }
    }

    // [E5] Rook / Queen on open or semi-open file
    if (isPlayerMove && !explanation.text && ['r','q'].includes(move.piece)) {
      if (isOpenFile(currentFen, move.to)) {
        explanation.text = pick([
          `The ${pieceName} finds an open file — maximum activity!`,
          `${pieceName} to an open file. Textbook rook activation.`,
          `"Rooks belong on open files." ${mover} puts theory into practice.`,
          `The ${pieceName} dominates the open file — pressure from top to bottom.`,
          `Textbook! Rooks activate best on open files — and this one just found the best available.`,
        ]);
        explanation.type = 'best';
        return finalizeExpl(explanation);
      } else if (isSemiOpenFile(currentFen, move.to, move.color)) {
        explanation.text = pick([
          `The ${pieceName} occupies a semi-open file — good positional instincts.`,
          `Semi-open file claimed! The ${pieceName} targets the enemy pawn down the line.`,
          `A strong semi-open file for the ${pieceName}. Positional pressure is building.`,
        ]);
        explanation.type = 'best';
        return finalizeExpl(explanation);
      }
    }

    // [E6] — NEW: Rook (or queen) on the 7th rank
    if (isPlayerMove && !explanation.text) {
      const rookSeventh = detectRookOnSeventh(currentFen, move);
      if (rookSeventh) {
        explanation.text = pick([
          `The ${rookSeventh.pieceName} invades the ${rookSeventh.rank === '7' ? '7th' : '2nd'} rank! Attacking ${rookSeventh.piecesOnRank} enemy piece(s) — a classic power move.`,
          `"Doubled rooks on the seventh rank are almost always decisive." One rook is already there — a tremendous start.`,
          `${mover}'s ${rookSeventh.pieceName} reaches the ${rookSeventh.rank === '7' ? '7th' : '2nd'} rank — cutting off the king and harassing pawns simultaneously.`,
          `Fun fact: a rook on the 7th rank simultaneously cramps the king and devours pawns. One of the most potent endgame positions in chess.`,
          `The ${rookSeventh.pieceName} penetrates deep. The ${rookSeventh.rank === '7' ? '7th' : '2nd'} rank belongs to ${mover} now.`,
          `${pick(POSITIONAL_SQUEEZE)} The ${pieceName} on the ${rookSeventh.rank === '7' ? '7th' : '2nd'} rank epitomises the squeeze.`,
          `The ${rookSeventh.pieceName} dominates the ${rookSeventh.rank === '7' ? '7th' : '2nd'} rank — ${rookSeventh.piecesOnRank} enemy piece(s) already under pressure. This is how rook endgames are won.`,
        ]);
        explanation.type = 'best';
        explanation.tacticType = 'rookOnSeventh';
        return finalizeExpl(explanation);
      }
    }

    // [E6a] — NEW: Rook endgame activation — only fires when the rook
    //  is doing something structurally meaningful (open file, 7th rank,
    //  or behind a passer) rather than any rook move in an endgame.
    if (isPlayerMove && !explanation.text && isEndgame && move.piece === 'r') {
      const onOpenFile   = isOpenFile(currentFen, move.to);
      const onSeventh    = move.to.endsWith(move.color === 'w' ? '7' : '2');
      const onSemiOpen   = isSemiOpenFile(currentFen, move.to, move.color);
      if (onOpenFile || onSeventh || onSemiOpen) {
        // Filter pool to avoid Lucena/Philidor mentions unless it's a pure king+rook endgame
        const chess        = new Chess(currentFen);
        const boardPieces  = chess.board().flat().filter(Boolean);
        const pureRookEnd  = boardPieces.every(p => ['k','r','p'].includes(p.type));
        const pool         = pureRookEnd
          ? ROOK_ENDGAME_LINES
          : ROOK_ENDGAME_LINES.filter(l => !l.includes('Lucena') && !l.includes('Philidor'));
        explanation.text   = pick(pool.length > 0 ? pool : ROOK_ENDGAME_LINES);
        explanation.type   = 'best';
        explanation.tacticType = 'rookEndgame';
        return finalizeExpl(explanation);
      }
    }

    // [E7] — NEW: Knight or bishop on an outpost square
    if (isPlayerMove && !explanation.text) {
      const outpost = detectOutpost(currentFen, move);
      if (outpost) {
        explanation.text = pick([
          `Outpost! The ${outpost.piece} lands on ${outpost.square} — an advanced square no enemy pawn can ever attack. It's there to stay.`,
          `A perfect outpost on ${outpost.square}! The ${outpost.piece} is planted deep in enemy territory, immune to pawn attacks.`,
          `${pick(TACTICAL_QUOTES.outpost)} The ${outpost.piece} just found its ideal home on ${outpost.square}.`,
          `The ${outpost.piece} on ${outpost.square} is an outpost piece — a permanent thorn in ${opp}'s position.`,
          `Positional excellence — the ${outpost.piece} occupies ${outpost.square} where it cannot be chased by any enemy pawn.`,
        ]);
        explanation.type = 'best';
        explanation.tacticType = 'outpost';
        return withSecondary(explanation);
      }
    }

    // [E8] — NEW: Bishop pair advantage secured
    if (isPlayerMove && !explanation.text) {
      const bpair = detectBishopPair(currentFen, move);
      if (bpair) {
        explanation.text = pick([
          `Bishop pair advantage! ${mover} keeps both bishops while ${opp} is left with one. A long-term structural edge in open positions.`,
          `${pick(TACTICAL_QUOTES.bishopPair)} ${mover} now holds the two bishops.`,
          `The bishop pair is now ${mover}'s — a permanent positional advantage that grows as the board opens up.`,
          `Capturing that bishop gives ${mover} the bishop pair. In open and semi-open positions, this is a real edge.`,
          `Two bishops vs. one — a subtle but important structural advantage secured right here.`,
        ]);
        explanation.type = 'best';
        explanation.tacticType = 'bishopPair';
        return finalizeExpl(explanation);
      }
    }

    // [E9] Fianchetto development
    if (isPlayerMove && !explanation.text) {
      const fianchetto = detectFianchetto(previousFen, move);
      if (fianchetto) {
        explanation.text = pick(FIANCHETTO_LINES);
        explanation.type = 'best';
        explanation.tacticType = 'fianchetto';
        return finalizeExpl(explanation);
      }
    }

    // [E10] Connected rooks milestone
    if (isPlayerMove && !explanation.text) {
      const connected = detectConnectedRooks(previousFen, currentFen, move);
      if (connected) {
        explanation.text = pick(CONNECTED_ROOKS_LINES);
        explanation.type = 'best';
        explanation.tacticType = 'connectedRooks';
        return finalizeExpl(explanation);
      }
    }

    // [E11] — Prophylaxis: move neutralised a serious opponent threat
    if (isPlayerMove && !explanation.text) {
      try {
        const prophylaxis = detectProphylaxis(previousFen, currentFen);
        if (prophylaxis) {
          explanation.text = pick([
            ...PROPHYLAXIS_LINES,
            `A prophylactic move — ${opp}'s plan of ${prophylaxis.preventedThreat} has been neutralized before it could cause damage.`,
          ]);
          explanation.type = 'best';
          explanation.tacticType = 'prophylaxis';
          return finalizeExpl(explanation);
        }
      } catch (e) { }
    }

    // [E13] — King opposition (endgame)
    if (isPlayerMove && !explanation.text && isEndgame) {
      try {
        const opposition = detectOpposition(currentFen, move);
        if (opposition) {
          const oppType = opposition.type === 'direct' ? 'Direct' : 'Distant';
          explanation.text = pick([
            ...OPPOSITION_LINES,
            `${oppType} king opposition! The kings stand face-to-face — ${opp}'s king must yield ground.`,
          ]);
          explanation.type = 'best';
          explanation.tacticType = 'opposition';
          return finalizeExpl(explanation);
        }
      } catch (e) { }
    }

    // [E14] — Zugzwang (endgame)
    if (isPlayerMove && !explanation.text && isEndgame) {
      try {
        const zug = detectZugzwang(currentFen);
        if (zug) {
          explanation.text = pick([
            ...ZUGZWANG_COMMENTARY_LINES,
            ...TACTICAL_QUOTES.zugzwang,
          ]);
          explanation.type = 'great';
          explanation.tacticType = 'zugzwang';
          return finalizeExpl(explanation);
        }
      } catch (e) { }
    }

    // [E16] Positional Inaccuracies/Mistakes/Blunders (no immediate material loss)
    // If a move was bad but didn't drop material (so it safely skipped [B2]), catch it here.
    if (isPlayerMove && !isGoodMove && !explanation.text) {
      if (qualityTier === 'blunder') {
        explanation.text = pick(DEVASTATING_ROASTS);
        explanation.type = 'blunder';
      } else if (qualityTier === 'mistake') {
        explanation.text = pick(MISTAKE_LINES);
        explanation.type = 'mistake';
      } else if (qualityTier === 'inaccuracy') {
        explanation.text = pick(INACCURACY_LINES);
        explanation.type = 'inaccuracy';
      }
      if (explanation.text) return finalizeExpl(explanation);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION F — OPPONENT MOVES & FALLBACKS
    // ─────────────────────────────────────────────────────────────────────────

    // [F1] Opponent notable move commentary
    if (!isPlayerMove && !explanation.text) {

      // Opponent delivers checkmate — belt-and-suspenders; primary handler is [A3]
      if (move.san.includes('#')) {
        explanation.text = pick([
          "Checkmate — the game is over. The attack was decisive.",
          `${mover} delivers checkmate. The game ends here — a clean finish.`,
          "The king is cornered with no escape. Checkmate — game over.",
          "Checkmate. The mating net was built methodically and there was no defence.",
          "The final blow lands — checkmate. Nothing could stop it.",
          "Checkmate — no escape, no defence, no hope. The game ends here.",
          `${mover} forces checkmate. A precise and decisive finish.`,
          "The king has nowhere to go. Checkmate — the game is decided.",
          "Checkmate. The attack was relentless — a well-earned result for the other side.",
          "The mating blow lands. Checkmate — the position allowed no defence.",
          // ── coaching-after-loss lines ──
          "Checkmate — and a coaching moment. The king's safety must always come first. An exposed king rarely survives the middlegame.",
          "Checkmate. Review what opened the king — that's where the game was decided, not here.",
          "The king is mated. This is why piece coordination matters: the opponent's pieces worked together toward this exact finish.",
          "Checkmate — game over. The lesson: once the king loses its pawn shelter, every tempo counts against the defending side.",
          "Checkmate delivered. The attack was methodical — study how the net was built and learn to stop it earlier next time.",
        ]);
        explanation.type = 'blunder_coach';
        explanation.tacticType = 'checkmate';
        return finalizeExpl(explanation);
      }

      // Opponent wins a queen
      if (materialGain >= 900) {
        explanation.text = pick([
          `${mover} wins the queen! A decisive material gain for the opponent.`,
          `The queen is lost. This is very difficult to recover from.`,
          `${pick(BLUNDER_QUEEN)} ${mover} capitalizes.`,
          `${mover} nets the queen. Hard to come back from here.`,
        ]);
        explanation.type = 'blunder_coach';
        return finalizeExpl(explanation);
      }

      // Opponent wins significant material (rook+)
      if (materialGain > 300) {
        explanation.text = pick([
          `${mover} just won material — a free piece is on the board.`,
          `${pick(MILD_GROANS)} ${mover} snags a free piece.`,
          `A gift! ${mover} capitalizes on the error.`,
          `${mover} wins material here. A serious error was made.`,
          `${pick(BLUNDER_ROOK)} The opponent takes full advantage.`,
        ]);
        explanation.type = 'blunder_coach';
        return finalizeExpl(explanation);
      }

      // Opponent plays a fork
      const oppFork = detectFork(currentFen, move);
      if (oppFork) {
        explanation.text = pick([
          `${mover} plays a fork! Two pieces attacked at once — something must fall.`,
          `${mover} finds a fork. Both attacked pieces can't be saved.`,
          `Ouch — ${mover} forks ${oppFork.count} pieces simultaneously. Damage control needed.`,
          `A ${move.piece === 'n' ? 'knight ' : ''}fork from ${mover}. The next move will hurt.`,
          `${pick(SARCASM_OPP_BRILLIANT)} A fork is the calling card.`,
        ]);
        explanation.type = 'tactical';
        explanation.tacticType = 'fork';
        return finalizeExpl(explanation);
      }

      // Opponent creates a pin
      if (['b', 'r', 'q'].includes(move.piece)) {
        try {
          const oppColor = move.color;
          const playerColor = oppColor === 'w' ? 'b' : 'w';
          const fenParts = currentFen.split(' ');
          fenParts[1] = playerColor;
          const playerTurnFen = fenParts.join(' ');

          // Build prev-position check to see if pin already existed
          const prevFenParts = previousFen.split(' ');
          prevFenParts[1] = playerColor;
          prevFenParts[3] = '-';
          const prevPlayerTurnFen = prevFenParts.join(' ');

          const board = new Chess(playerTurnFen).board().flat();
          for (const sq of board) {
            if (!sq || sq.color !== playerColor || sq.type === 'k') continue;
            if (isPiecePinned(playerTurnFen, sq.square, playerColor)) {
              // Only announce if this pin was just created (not pre-existing)
              try {
                if (isPiecePinned(prevPlayerTurnFen, sq.square, playerColor)) continue;
              } catch (e) { /* allow announcement */ }
              const pinnedName = getPieceNameFromFen(sq.type);
              explanation.text = pick([
                `${mover} creates a pin! Your ${pinnedName} is now frozen — it can't move without exposing the king.`,
                `A powerful pin from ${mover}. Your ${pinnedName} is immobilized.`,
                `${pick(SARCASM_OPP_BRILLIANT)} A pin on your ${pinnedName} is the result.`,
                `Your ${pinnedName} is pinned to the king. Breaking it will cost tempo.`,
                `${mover} pins your ${pinnedName} — it cannot legally move without exposing your king. A classic restraining weapon.`,
              ]);
              explanation.type = 'tactical';
              explanation.tacticType = 'pin';
              return finalizeExpl(explanation);
            }
          }
        } catch (e) { }
      }

      // Opponent delivers a discovered attack
      const oppDiscovery = detectDiscoveredAttack(previousFen, move);
      if (oppDiscovery) {
        explanation.text = pick([
          `${mover} plays a discovered attack! The ${oppDiscovery.targetPiece} is now under hidden fire.`,
          `A discovered attack from ${mover} — two threats spring from one move.`,
          `${pick(SARCASM_OPP_BRILLIANT)} A discovered attack on your ${oppDiscovery.targetPiece}.`,
          `The ${oppDiscovery.revealedPiece} was lurking — now it attacks your ${oppDiscovery.targetPiece}.`,
        ]);
        explanation.type = 'tactical';
        explanation.tacticType = 'discoveredAttack';
        return finalizeExpl(explanation);
      }

      // Opponent plays a skewer
      if (['b', 'r', 'q'].includes(move.piece)) {
        const oppSkewer = detectSkewer(currentFen, move);
        if (oppSkewer) {
          explanation.text = pick([
            `${mover} plays a skewer! Your ${oppSkewer.frontPiece} must move — and the ${oppSkewer.behindPiece} behind it falls.`,
            `A skewer from ${mover}. Step the ${oppSkewer.frontPiece} away and lose the ${oppSkewer.behindPiece}.`,
            `${pick(SARCASM_OPP_BRILLIANT)} A skewer: the ${oppSkewer.frontPiece} is the target, the ${oppSkewer.behindPiece} is the victim.`,
          ]);
          explanation.type = 'tactical';
          explanation.tacticType = 'skewer';
          return finalizeExpl(explanation);
        }
      }

      // Opponent creates an X-ray threat
      if (['b', 'r', 'q'].includes(move.piece)) {
        const oppXray = detectXRay(currentFen, move);
        if (oppXray) {
          explanation.text = pick([
            `${mover} plays an X-ray! The ${move.piece === 'b' ? 'bishop' : move.piece === 'r' ? 'rook' : 'queen'} sees through your ${oppXray.through} to threaten the ${oppXray.target}.`,
            `An X-ray threat from ${mover} — pressure through your own piece on your ${oppXray.target}. Watch the line.`,
            `${pick(SARCASM_OPP_BRILLIANT)} The X-ray on your ${oppXray.target} is the real danger.`,
          ]);
          explanation.type = 'tactical';
          explanation.tacticType = 'xray';
          return finalizeExpl(explanation);
        }
      }

      // Opponent creates a mate-in-1 or mate-in-2 threat
      const oppMateThreat = detectMateThreats(currentFen, move.color);
      if (oppMateThreat) {
        if (oppMateThreat.depth === 2) {
          explanation.text = pick([
            `${mover} threatens a forced mate in 2! The sequence starts with ${oppMateThreat.matingSan} — find the only defensive resource immediately.`,
            `Mate in 2 threat from ${mover}: ${oppMateThreat.matingSan} starts the forced sequence. Defence is now the only priority.`,
            `Danger! ${mover} has a forced mate in 2 beginning with ${oppMateThreat.matingSan}. Calculate carefully — there may be only one way to stop it.`,
            `${pick(SARCASM_OPP_BRILLIANT)} — and with a mate-in-2 threat. ${oppMateThreat.matingSan} must be addressed immediately.`,
          ]);
        } else {
          explanation.text = pick([
            `${mover} threatens checkmate with ${oppMateThreat.matingSan}! You must find a defence immediately or the game is over.`,
            `Mate is threatened! ${mover} can play ${oppMateThreat.matingSan} next move for checkmate. Find the only defence.`,
            `A mating threat from ${mover}: ${oppMateThreat.matingSan} ends the game. The only priority now is king safety.`,
            `${pick(SARCASM_OPP_BRILLIANT)} — and with a checkmate threat. ${oppMateThreat.matingSan} must be stopped.`,
          ]);
        }
        explanation.type = 'blunder_coach';
        explanation.tacticType = 'mateThreat';
        return finalizeExpl(explanation);
      }

      // Opponent creates a back rank threat
      const playerColor = move.color === 'w' ? 'b' : 'w';
      if (hasBackRankWeakness(currentFen, playerColor)) {
        explanation.text = pick([
          `${mover} is eyeing your back rank! Make sure the king has an escape square.`,
          `Back rank warning — ${mover} can potentially deliver a back rank mate.`,
          `Your king is in danger on the back rank. Luft might be needed urgently.`,
          `${pick(TACTICAL_QUOTES.backRank)} ${mover} is ready to exploit it.`,
        ]);
        explanation.type = 'tactical';
        explanation.tacticType = 'backRank';
        return finalizeExpl(explanation);
      }

      // Opponent gives check
      if (move.san.includes('+')) {
        explanation.text = pick([
          `${mover} gives check — a forcing move that demands a response.`,
          `Check from ${mover}! Your king must deal with this now.`,
          `${mover} forces the pace with a check. Stay alert.`,
          `A check! Your king has to move or block — ${mover} gains tempo.`,
          `${mover} keeps the initiative with a check. Calculate carefully.`,
        ]);
        explanation.type = 'tactical';
        return finalizeExpl(explanation);
      }

      // Opponent plays engine-approved brilliant (very negative material for player)
      if (materialGain < -200) {
        explanation.text = pick(SARCASM_OPP_BRILLIANT);
        explanation.type = 'tactical';
        return finalizeExpl(explanation);
      }

      // Opponent plays promotion threat
      const oppPromoter = detectPromotionThreats(currentFen, move.color);
      if (oppPromoter.length > 0) {
        const fileStr = oppPromoter[0] + '-file';
        explanation.text = pick([
          `${mover}'s pawn on the ${fileStr} is one step from queening — deal with it now!`,
          `Promotion threat from ${mover}! The ${fileStr} pawn must be stopped.`,
          `Watch out — ${mover} has a promotion threat. Immediate action required.`,
        ]);
        explanation.type = 'tactical';
        return finalizeExpl(explanation);
      }

      // Generic opponent strong move — rich coaching commentary
      explanation.text = pick([
        `${mover} plays a solid move. Stay focused and find the best response.`,
        `${mover} continues. Assess the new threats carefully before responding.`,
        `A reasonable move from ${mover}. What is the best reply here?`,
        `${mover} makes a move. Take a moment — calculate before reacting.`,
        `${mover} plays on. Don't rush the response; find the most active continuation.`,
        // ── Initiative coaching ──
        `${mover} continues. Before responding, ask: what does this move threaten? Answering that question first prevents most tactical surprises.`,
        `${mover} plays. A good habit: identify the best three candidate moves before deciding. The first instinct isn't always the strongest.`,
        `A move from ${mover}. The strongest response is usually the one that creates a NEW threat rather than simply reacting to this one.`,
        `${mover} makes a move. Stop for a second — check for any hanging pieces, any new checks, and any long-term threats before playing.`,
        `${mover} continues. In positions like this, the question to ask is: "What is my plan?" Not just "How do I react to this?"`,
      ]);
      explanation.type = 'observation';
      return finalizeExpl(explanation);
    }

    // [F2] Brilliant move praise (best/brilliant move found — cpLoss confirms OR random 30% chance)
    if (isPlayerMove && isPlayerBest && !explanation.text &&
        (qualityTier === 'best' || qualityTier === 'brilliant' || qualityTier === 'good' || Math.random() < 0.30)) {
      const prefix = timePrefix();
      let praise;
      if (qualityTier === 'brilliant') {
        // Already set in [A0], but could have been overridden by tactic — use brilliant pool
        praise = pick([
          ...BRILLIANT_PRAISE,
          "Engine first-choice and then some. A brilliant move.",
          "The computer approved — and this goes one step further. Stunning.",
        ]);
      } else if (qualityTier === 'good') {
        praise = pick(GOOD_MOVE_LINES);
      } else {
        praise = pick(BRILLIANT_PRAISE);
      }
      explanation.text = prefix ? `${prefix}${praise.charAt(0).toLowerCase()}${praise.slice(1)}` : praise;
      explanation.type = qualityTier === 'brilliant' ? 'brilliant' : 'best';
      return finalizeExpl(explanation);
    }

    // [F2a] Good-move quiet praise — qualityTier 'good' but not the engine best
    if (isPlayerMove && !isPlayerBest && !explanation.text && qualityTier === 'good') {
      const prefix = timePrefix();
      const praise = pick(GOOD_MOVE_LINES);
      explanation.text = prefix ? `${prefix}${praise.charAt(0).toLowerCase()}${praise.slice(1)}` : praise;
      explanation.type = 'good';
      return finalizeExpl(explanation);
    }

    // [F3] Contextual commentary for best move in quiet positions.
    //  Pool is built entirely from position-relevant content:
    //  phase, pawn structure, king safety, piece activity.
    //  Generic CHESS_QUOTES are a last-resort filler kept at low weight.
    if (isPlayerMove && isPlayerBest && !explanation.text) {
      const pool = [];

      // Always add a small set of phase-matched general wisdom
      if (isEarlyGame) {
        pool.push(...OPENING_FACTS);
        pool.push(
          'A principled developing move — follow the golden opening rules: develop, control the center, castle.',
          'The foundation of the opening is laid move by move. This contributes to that foundation.',
          'Opening principle in action: get pieces to active squares before launching any attack.',
          'Sound opening play: develop first, attack second. The pieces need to be ready before the middlegame begins.',
          'Every opening move should serve at least one of three purposes: develop a piece, control the center, or ensure king safety.',
        );
      }

      if (isEndgame) {
        pool.push(...ENDGAME_LINES, ...ROOK_ENDGAME_LINES, ...PAWN_ENDGAME_LINES);
        pool.push(...TACTICAL_QUOTES.zugzwang, ...TACTICAL_QUOTES.promotion, ...TACTICAL_QUOTES.opposition);
        pool.push(
          'Endgame precision — every tempo counts and every pawn is a potential queen.',
          'The endgame is where preparation pays off. Technique now, creativity later.',
          ...CONVERSION_LINES.slice(0, 2),
        );
      }

      if (!isEarlyGame && !isEndgame) {
        // Middlegame: draw from positional and structural pools
        pool.push(...POSITIONAL_SQUEEZE, ...COUNTERPLAY_LINES, ...INITIATIVE_LINES);
        pool.push(
          'In the middlegame, piece coordination and king safety are the two pillars of any plan.',
          'A solid middlegame move — maintaining harmony between offense and structure.',
          'Middlegame mastery: improve the worst-placed piece while creating a new threat.',
          'The best middlegame moves do two things at once: improve a piece AND create a problem for the opponent.',
        );
      }

      // Position-feature specific additions
      try {
        const ctx = getBoardContext(currentFen);
        if (ctx) {
          if (ctx.openFiles.length > 0)        pool.push(...CONNECTED_ROOKS_LINES.slice(0, 2));
          if (ctx.whitePassedPawns.length || ctx.blackPassedPawns.length)
                                                pool.push(...TACTICAL_QUOTES.promotion.slice(0, 2));
          if (ctx.whiteBishopPair || ctx.blackBishopPair)
                                                pool.push(...TACTICAL_QUOTES.bishopPair.slice(0, 2));
          if (ctx.kingSafetyWhite <= 2 || ctx.kingSafetyBlack <= 2)
                                                pool.push(...APPROACHING_MATE_LINES.slice(0, 3), ...KING_HUNT_LINES.slice(0, 2));
          // Add open-king-in-center line if relevant
          const oppColor = move.color === 'w' ? 'b' : 'w';
          const chess3 = new Chess(currentFen);
          const board3 = chess3.board().flat();
          const oppKingSq = board3.find(sq => sq && sq.type === 'k' && sq.color === oppColor)?.square;
          if (oppKingSq && ['c','d','e','f'].includes(oppKingSq[0]) && !isEndgame) {
            pool.push(...OPEN_KING_CENTER_LINES.slice(0, 2));
          }
        }
      } catch (e) { /* skip context enrichment */ }

      // Famous game references occasionally (30% chance, only in middlegame/endgame)
      if (!isEarlyGame && Math.random() < 0.30) pool.push(...FAMOUS_GAME_REFS);

      // Generic chess wisdom as last-resort filler when pool is thin
      if (pool.length < 4) pool.push(...CHESS_QUOTES.slice(0, 15));

      explanation.text = pick(pool);
      explanation.type = 'best';
      return finalizeExpl(explanation);
    }

    // [F4] Funny observation fallback — only fires when the position is
    //  genuinely complex / double-edged (both kings have chances, eval is near 0).
    //  Guards against generic comedy in clearly one-sided positions.
    if (!explanation.text && Math.random() < 0.25) {
      try {
        const mat = getMaterialValue(currentFen);
        const chess2 = new Chess(currentFen);
        const movesAvail = chess2.moves().length;
        const positionIsComplex = Math.abs(mat) <= 200 && movesAvail >= 20;
        if (positionIsComplex) {
          explanation.text = pick(FUNNY_OBSERVATIONS);
          explanation.type = 'observation';
          return finalizeExpl(explanation);
        }
      } catch (e) { /* skip */ }
    }

    // [F5] — Phase-aware positional tip as final fallback.
    //  Each phase gets its own curated pool — no generic wisdom from other phases.
    if (isPlayerMove && !explanation.text) {
      let tipPool;
      if (isEndgame) {
        tipPool = [...ENDGAME_LINES, ...ROOK_ENDGAME_LINES, ...PAWN_ENDGAME_LINES,
                   ...OPPOSITION_LINES, ...ZUGZWANG_COMMENTARY_LINES];
      } else if (isEarlyGame) {
        tipPool = [...OPENING_FACTS, ...CONNECTED_ROOKS_LINES, ...FIANCHETTO_LINES];
      } else {
        // Middlegame
        tipPool = [...POSITIONAL_SQUEEZE, ...COUNTERPLAY_LINES, ...PROPHYLAXIS_LINES,
                   ...EXCHANGE_SACRIFICE_LINES.slice(0, 3)];
      }
      if (tipPool.length === 0) tipPool = [...CHESS_QUOTES.slice(0, 20)];
      explanation.text = pick(tipPool);
      explanation.type = 'observation';
      return finalizeExpl(explanation);
    }

    if (explanation.text && !explanation.lines) explanation.lines = [explanation.text];
    return explanation.text ? finalizeExpl(explanation) : null;

  } catch (error) {
    console.error('Error generating coach explanation:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOARD CONTEXT SNAPSHOT
//  Useful for UI overlays — quick read of material, phase, king safety.
// ─────────────────────────────────────────────────────────────────────────────
export function getBoardContext(fen) {
  try {
    const chess    = new Chess(fen);
    const pieces   = chess.board().flat().filter(Boolean);
    const count    = pieces.length;

    // Bishop pair detection
    const whiteBishops = pieces.filter(p => p.color === 'w' && p.type === 'b').length;
    const blackBishops = pieces.filter(p => p.color === 'b' && p.type === 'b').length;

    // Passed pawn detection (pawn with no enemy pawn in front on same or adjacent files)
    function getPassedPawnFiles(color) {
      const oppColor = color === 'w' ? 'b' : 'w';
      const files = [];
      for (let f = 0; f < 8; f++) {
        const fileChar = String.fromCharCode(97 + f);
        for (let r = 1; r <= 8; r++) {
          const p = chess.get(`${fileChar}${r}`);
          if (!p || p.type !== 'p' || p.color !== color) continue;
          // Check same file and adjacent files for enemy pawns ahead
          let blocked = false;
          const adjFiles = [f - 1, f, f + 1].filter(af => af >= 0 && af <= 7);
          for (const af of adjFiles) {
            const afc = String.fromCharCode(97 + af);
            const startRank = color === 'w' ? r + 1 : 1;
            const endRank   = color === 'w' ? 8 : r - 1;
            for (let er = startRank; er <= endRank; er++) {
              const ep = chess.get(`${afc}${er}`);
              if (ep && ep.type === 'p' && ep.color === oppColor) { blocked = true; break; }
            }
            if (blocked) break;
          }
          if (!blocked) files.push(fileChar);
        }
      }
      return [...new Set(files)];
    }

    // Game phase heuristic
    const phase = count > 28 ? 'opening' : count > 14 ? 'middlegame' : 'endgame';

    // Open and semi-open file detection
    function getOpenFiles() {
      const open = [], semiW = [], semiB = [];
      for (let f = 0; f < 8; f++) {
        const fc = String.fromCharCode(97 + f);
        let hasW = false, hasB = false;
        for (let r = 1; r <= 8; r++) {
          const p = chess.get(`${fc}${r}`);
          if (p && p.type === 'p') {
            if (p.color === 'w') hasW = true;
            else hasB = true;
          }
        }
        if (!hasW && !hasB) open.push(fc);
        else if (!hasW) semiW.push(fc);
        else if (!hasB) semiB.push(fc);
      }
      return { open, semiW, semiB };
    }

    // Connected rooks detection (back-rank, no pieces between them)
    function hasConnectedRooks(color) {
      const backRank = color === 'w' ? '1' : '8';
      const rooks = pieces.filter(p => p.color === color && p.type === 'r' &&
        p.square.endsWith(backRank));
      if (rooks.length < 2) return false;
      const files = rooks.map(r => r.square.charCodeAt(0)).sort((a, b) => a - b);
      for (let f = files[0] + 1; f < files[1]; f++) {
        if (chess.get(`${String.fromCharCode(f)}${backRank}`)) return false;
      }
      return true;
    }

    // King safety score: higher = safer (0-10 scale heuristic)
    function kingSafetyScore(color) {
      const info = detectKingExposure(fen, color);
      if (!info) return 5;
      const shieldBonus = Math.min(info.pawnShield * 2, 6);
      const attackPenalty = Math.min(info.attackCount, 4);
      return Math.max(0, shieldBonus - attackPenalty + 4);
    }

    const fileInfo = getOpenFiles();

    return {
      materialBalance:   getMaterialValue(fen),
      piecesLeft:        count,
      phase,
      isEndgame:         count <= 14,
      whiteKingExposed:  detectKingExposure(fen, 'w')?.isExposed || false,
      blackKingExposed:  detectKingExposure(fen, 'b')?.isExposed || false,
      whiteHasPromoter:  detectPromotionThreats(fen, 'w').length > 0,
      blackHasPromoter:  detectPromotionThreats(fen, 'b').length > 0,
      whiteBishopPair:   whiteBishops >= 2,
      blackBishopPair:   blackBishops >= 2,
      whitePassedPawns:  getPassedPawnFiles('w'),
      blackPassedPawns:  getPassedPawnFiles('b'),
      // NEW fields
      openFiles:         fileInfo.open,
      semiOpenFilesWhite: fileInfo.semiW,
      semiOpenFilesBlack: fileInfo.semiB,
      whiteConnectedRooks: hasConnectedRooks('w'),
      blackConnectedRooks: hasConnectedRooks('b'),
      kingSafetyWhite:   kingSafetyScore('w'),
      kingSafetyBlack:   kingSafetyScore('b'),
      topThreats:        detectThreats(fen),
    };
  } catch (e) { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POSITION SUMMARY
//  Returns a concise human-readable summary of the current position
//  suitable for UI tooltips, accessibility labels, or coach overlays.
//  Includes material balance, phase, king safety, structural features,
//  top threats, and a qualitative verdict.
// ─────────────────────────────────────────────────────────────────────────────
export function getPositionSummary(fen) {
  try {
    const ctx = getBoardContext(fen);
    if (!ctx) return null;

    const parts = [];

    // ── Material balance — leading statement ─────────────────────────────────
    const mat = ctx.materialBalance;
    const matAbs = Math.abs(mat);
    const matSide = mat > 0 ? 'White' : 'Black';
    if (matAbs >= 900)      parts.push(`${matSide} is up a queen (${mat > 0 ? '+' : ''}${mat} cp)`);
    else if (matAbs >= 500) parts.push(`${matSide} is up a rook (${mat > 0 ? '+' : ''}${mat} cp)`);
    else if (matAbs >= 300) parts.push(`${matSide} is up a minor piece (${mat > 0 ? '+' : ''}${mat} cp)`);
    else if (matAbs >= 100) parts.push(`${matSide} is up a pawn`);
    else                    parts.push('Material is equal');

    // ── Game phase ────────────────────────────────────────────────────────────
    const phaseLabel = ctx.phase === 'opening'    ? 'in the opening'
                     : ctx.phase === 'middlegame' ? 'in the middlegame'
                     :                             'in the endgame';
    parts.push(phaseLabel);

    // ── King safety — critical warnings first ─────────────────────────────────
    if (ctx.kingSafetyWhite <= 1)      parts.push('white king is critically exposed — attack imminent');
    else if (ctx.kingSafetyWhite <= 2) parts.push('white king is dangerously exposed');
    else if (ctx.whiteKingExposed)     parts.push('white king is under pressure');

    if (ctx.kingSafetyBlack <= 1)      parts.push('black king is critically exposed — attack imminent');
    else if (ctx.kingSafetyBlack <= 2) parts.push('black king is dangerously exposed');
    else if (ctx.blackKingExposed)     parts.push('black king is under pressure');

    // ── Promotion threats ────────────────────────────────────────────────────
    if (ctx.whiteHasPromoter && ctx.blackHasPromoter) parts.push('both sides have promotion threats');
    else if (ctx.whiteHasPromoter) parts.push('white threatens to promote');
    else if (ctx.blackHasPromoter) parts.push('black threatens to promote');

    // ── Bishop pair advantage ────────────────────────────────────────────────
    if (ctx.whiteBishopPair && !ctx.blackBishopPair) parts.push('white holds the bishop pair');
    else if (ctx.blackBishopPair && !ctx.whiteBishopPair) parts.push('black holds the bishop pair');

    // ── Passed pawns ─────────────────────────────────────────────────────────
    if (ctx.whitePassedPawns.length && ctx.blackPassedPawns.length) {
      parts.push('both sides have passed pawns');
    } else {
      if (ctx.whitePassedPawns.length) {
        const fileStr = ctx.whitePassedPawns.join('/');
        parts.push(`white has a passed pawn on the ${fileStr}-file${ctx.whitePassedPawns.length > 1 ? 's' : ''}`);
      }
      if (ctx.blackPassedPawns.length) {
        const fileStr = ctx.blackPassedPawns.join('/');
        parts.push(`black has a passed pawn on the ${fileStr}-file${ctx.blackPassedPawns.length > 1 ? 's' : ''}`);
      }
    }

    // ── Open files ────────────────────────────────────────────────────────────
    if (ctx.openFiles.length === 1)    parts.push(`the ${ctx.openFiles[0]}-file is open`);
    else if (ctx.openFiles.length > 1) parts.push(`open files: ${ctx.openFiles.join(', ')}`);

    // ── Semi-open file asymmetry (only note if one side has more than the other) ─
    const wSemi = ctx.semiOpenFilesWhite.length;
    const bSemi = ctx.semiOpenFilesBlack.length;
    if (wSemi > bSemi && wSemi >= 2) parts.push(`white dominates semi-open files (${ctx.semiOpenFilesWhite.join(', ')})`);
    else if (bSemi > wSemi && bSemi >= 2) parts.push(`black dominates semi-open files (${ctx.semiOpenFilesBlack.join(', ')})`);

    // ── Connected rooks ───────────────────────────────────────────────────────
    if (ctx.whiteConnectedRooks && ctx.blackConnectedRooks) parts.push('both sides have connected rooks');
    else if (ctx.whiteConnectedRooks) parts.push('white has connected rooks');
    else if (ctx.blackConnectedRooks) parts.push('black has connected rooks');

    // ── Well-sheltered king (positive note, only in non-endgame) ─────────────
    if (ctx.phase !== 'endgame') {
      if (ctx.kingSafetyWhite >= 8 && !ctx.whiteKingExposed) parts.push('white king is well sheltered');
      if (ctx.kingSafetyBlack >= 8 && !ctx.blackKingExposed) parts.push('black king is well sheltered');
    }

    // ── Overloaded piece check ─────────────────────────────────────────────────
    // detectOverloadedPiece(fen, attackerColor) returns the DEFENDER's overloaded piece.
    // When attackerColor='w', the overloaded piece belongs to BLACK (defending against white).
    // When attackerColor='b', the overloaded piece belongs to WHITE (defending against black).
    try {
      const overloadedW = detectOverloadedPiece(fen, 'w'); // black piece overloaded defending vs white
      const overloadedB = detectOverloadedPiece(fen, 'b'); // white piece overloaded defending vs black
      if (overloadedW) parts.push(`black has an overloaded ${overloadedW.defenderPiece} on ${overloadedW.defenderSquare} — a target for white`);
      else if (overloadedB) parts.push(`white has an overloaded ${overloadedB.defenderPiece} on ${overloadedB.defenderSquare} — a target for black`);
    } catch (e) { /* skip */ }

    // ── Top immediate threats (up to 1 noted, only high-value) ───────────────
    if (ctx.topThreats && ctx.topThreats.length > 0) {
      const top = ctx.topThreats[0];
      const threatVal = top.captured ? (MATERIAL_VALUES[top.captured.toLowerCase()] || 0) : 0;
      if (top.threatens === 'check') {
        parts.push(`immediate check threat: ${top.threatMove}`);
      } else if (threatVal >= 500) {
        parts.push(`threat of ${top.threatMove} winning the ${top.threatens}`);
      }
    }

    // ── Assemble prose ────────────────────────────────────────────────────────
    if (parts.length === 0) return 'Position is balanced with no immediate imbalances.';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + '.';

    const [first, second, ...rest] = parts;
    const opening = `${first.charAt(0).toUpperCase() + first.slice(1)}, ${second}`;
    return rest.length > 0
      ? `${opening} · ${rest.join(' · ')}.`
      : `${opening}.`;
  } catch (e) { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SESSION RESET
//  Call between games to clear the anti-repetition history buffer.
// ─────────────────────────────────────────────────────────────────────────────
export function resetCoachSession() {
  resetGrammarSession();
  Object.keys(conceptUsageCount).forEach(k => delete conceptUsageCount[k]);
}


