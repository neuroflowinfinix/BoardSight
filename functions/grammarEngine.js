// ─────────────────────────────────────────────────────────────────────────────
//  ANTI-REPETITION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const _usedLines   = [];
const _usedLineSet = new Set();
const _HISTORY_SIZE = 40;
let   _lastPicked  = null;

export function pick(arr) {
  if (!arr || arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  const noRepeat = arr.filter(item => item !== _lastPicked);
  const pool0    = noRepeat.length > 0 ? noRepeat : arr;
  const fresh = pool0.filter(item => !_usedLineSet.has(item));
  let pool;
  if (fresh.length > 0) {
    pool = (Math.random() < 0.90) ? fresh : pool0;
  } else {
    const weights = pool0.map(item => {
      const idx = _usedLines.indexOf(item);
      if (idx === -1) return _HISTORY_SIZE + 1;
      return (_HISTORY_SIZE - idx);
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    let rand = Math.random() * totalWeight;
    let chosen = pool0[pool0.length - 1];
    for (let i = 0; i < pool0.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { chosen = pool0[i]; break; }
    }
    pool = [chosen];
  }
  const candidate = pool[Math.floor(Math.random() * pool.length)];
  _lastPicked = candidate;
  _usedLineSet.add(candidate);
  _usedLines.push(candidate);
  if (_usedLines.length > _HISTORY_SIZE) {
    _usedLineSet.delete(_usedLines.shift());
  }
  return candidate;
}

export function pickMulti(arr, n = 2) {
  if (!arr || arr.length === 0) return [];
  const results = [];
  const used    = new Set();
  for (let i = 0; i < Math.min(n, arr.length); i++) {
    const pool   = arr.filter(x => !used.has(x));
    if (pool.length === 0) break;
    const chosen = pick(pool);
    if (!chosen) break;
    results.push(chosen);
    used.add(chosen);
  }
  return results;
}

export function resetGrammarSession() {
  _usedLines.length = 0;
  _usedLineSet.clear();
  _lastPicked = null;
}

// The Grammar Dictionary
// Tags wrapped in # will be recursively expanded.
const GRAMMAR = {
  // ---------------------------------------------------------------------------
  // DEEP GRAMMAR: TIME & TARGETS
  // ---------------------------------------------------------------------------
  time_rush: [
    "You played that in just #timeSpent# seconds. ",
    "Speed is the enemy of accuracy here. Played in #timeSpent# seconds, ",
    "With only #timeSpent# seconds used, the depth was missed. ",
    "Fast, but inaccurate. #timeSpent# seconds wasn't enough. "
  ],
  time_long: [
    "Even after #timeSpent# seconds of thought, the mark was missed. ",
    "A long #timeSpent# second think, but the calculation went astray. ",
    "Time pressure looms after spending #timeSpent# seconds here. "
  ],
  advice_aggressive: [
    "In sharp positions, you have to look for forcing moves.",
    "When the board is open, you cannot afford passive moves.",
    "Look for checks, captures, and threats. Always.",
    "Aggressive chess requires calculating every capture."
  ],
  missed_tactic_targets: [
    "You missed taking the #target1#.",
    "The #target1# was hanging and you walked right past it.",
    "A golden opportunity to win the #target1# was ignored.",
    "This overlooks a forcing sequence winning the #target1#.",
    "The engine screams here — the #target1# was yours for the taking."
  ],
  missed_fork_targets: [
    "You missed a fork that attacks the #target1# and the #target2#.",
    "The geometry allowed attacking both the #target1# and #target2# simultaneously.",
    "A beautiful double attack on the #target1# and #target2# was available.",
    "You overlooked a tactic targeting both the #target1# and the #target2#.",
    "A dual threat on the #target1# and #target2# was completely missed."
  ],

  // ---------------------------------------------------------------------------
  // INTROS — Blunder
  // ---------------------------------------------------------------------------
  blunder_intro: [
    "Ouch. #action_blunder#",
    "A critical misstep. #action_blunder#",
    "This is where the advantage slips. #action_blunder#",
    "A painful moment. #action_blunder#",
    "And just like that, the game turns. #action_blunder#",
    "This is the move that loses. #action_blunder#",
    "A devastating oversight. #action_blunder#",
    "The position was holding — until now. #action_blunder#",
    "There it is, the fatal error. #action_blunder#",
    "This blunder will cost everything. #action_blunder#",
    "The engine screams here. #action_blunder#",
    "One careless move changes everything. #action_blunder#",
    "A lapse in concentration, and it's over. #action_blunder#",
    "The position demanded accuracy — it didn't get it. #action_blunder#",
    "This is the moment the game was lost. #action_blunder#",
    "A move played without looking ahead. #action_blunder#",
    "The clock pressure shows itself here. #action_blunder#",
    "It looked natural, but it's a blunder. #action_blunder#",
    "A tragic miscalculation. #action_blunder#",
    "The position was defensible until this. #action_blunder#",
    "Missed it completely. #action_blunder#",
    "Hard to watch. #action_blunder#",
    "An instructive mistake. #action_blunder#",
    "Overlooking a key resource. #action_blunder#",
    "The opponent had been waiting for exactly this. #action_blunder#",
    "A move that looked safe but wasn't. #action_blunder#",
    "One step too far. #action_blunder#",
    "The worst possible moment for an error. #action_blunder#",
    "A game-deciding oversight on move #action_blunder#",
    "Confidence becomes overconfidence here. #action_blunder#",
    "The calculation stopped one move too early. #action_blunder#",
    "This is why you check every candidate move. #action_blunder#",
    "Tunnel vision sets in at the worst time. #action_blunder#",
    "The defensive task was manageable — until now. #action_blunder#",
    "An error that will haunt this game in every post-mortem. #action_blunder#",
    "The pressure finally breaks the position here. #action_blunder#",
    "A move that completely ignores the opponent's threat. #action_blunder#",
    "This is the kind of blunder that ends rating streaks. #action_blunder#",
    "The winning position evaporates in an instant. #action_blunder#",
    "Playing on autopilot when maximum attention was needed. #action_blunder#",
    "A hallmark of fatigue — missing what is right in front of you. #action_blunder#",
    "The silicon verdict is merciless: this loses. #action_blunder#",
    "An unfortunate recapture that walks into disaster. #action_blunder#",
    "The wrong piece, the wrong square, the wrong moment. #action_blunder#",
    "A natural developing move that turns out to be losing. #action_blunder#",
  ],

  // ---------------------------------------------------------------------------
  // INTROS — Good Move / Tactical
  // ---------------------------------------------------------------------------
  tactical_intro: [
    "A brilliant sequence. #action_good#",
    "Excellent tactical awareness. #action_good#",
    "Sharp calculation! #action_good#",
    "Precise and decisive. #action_good#",
    "This is what winning looks like. #action_good#",
    "The move that decides the game. #action_good#",
    "Cool-headed precision under pressure. #action_good#",
    "A move that demands respect. #action_good#",
    "Ruthless technique on display. #action_good#",
    "Calculated and clinical. #action_good#",
    "The engine's top choice — and it's not even close. #action_good#",
    "Exactly the kind of move champions find. #action_good#",
    "There's the knockout blow. #action_good#",
    "A stunning resource, hiding in plain sight. #action_good#",
    "The position rewards sharp eyes here. #action_good#",
    "Mastery of the position. #action_good#",
    "A move that makes the annotator smile. #action_good#",
    "Concrete and effective. #action_good#",
    "No hesitation, no second-guessing. #action_good#",
    "The simplest path to victory, found immediately. #action_good#",
    "Visually striking and objectively best. #action_good#",
    "Tactical fireworks. #action_good#",
    "The kind of move you'd put in a puzzle book. #action_good#",
    "A move that ends all debate. #action_good#",
    "This wins on the spot. #action_good#",
    "Uncompromising and perfect. #action_good#",
    "The most forcing move in the position. #action_good#",
    "An absolutely ruthless continuation. #action_good#",
    "No defense, no hope. #action_good#",
    "The geometry of the board comes alive here. #action_good#",
    "An idea that requires genuine imagination. #action_good#",
    "Beauty and precision combined. #action_good#",
    "The kind of move that gets played over and over in analysis rooms. #action_good#",
    "A move that would make Tal proud. #action_good#",
    "A tactical solution to a strategic problem. #action_good#",
    "The board geometry demands this move. #action_good#",
    "Calculating deeper than the opponent — and it shows. #action_good#",
    "A move of startling clarity. #action_good#",
    "The double threat is simply too much. #action_good#",
    "As accurate as it gets. #action_good#",
    "The best move in a sea of good moves. #action_good#",
    "A strike at the heart of the opponent's position. #action_good#",
    "Brilliant in its simplicity. #action_good#",
    "A move found under the clock — even more impressive. #action_good#",
    "The position demanded tactics, and tactics were delivered. #action_good#",
  ],

  // ---------------------------------------------------------------------------
  // INTROS — Positional / Strategic
  // ---------------------------------------------------------------------------
  positional_intro: [
    "A subtle but powerful move. #action_positional#",
    "Strategic mastery at its finest. #action_positional#",
    "Long-term thinking pays off here. #action_positional#",
    "The quiet move that reshapes the game. #action_positional#",
    "Not flashy, but deeply effective. #action_positional#",
    "Chess at its most refined. #action_positional#",
    "A prophylactic masterpiece. #action_positional#",
    "The engine approves, and so does common sense. #action_positional#",
    "Methodical and patient. #action_positional#",
    "A move Petrosian would have loved. #action_positional#",
    "Squeezing the position like a vice. #action_positional#",
    "Maneuvering with purpose. #action_positional#",
    "The accumulation of small advantages begins here. #action_positional#",
    "A move that improves every piece at once. #action_positional#",
    "Restraint is the weapon of choice. #action_positional#",
    "Elegant simplicity — the best square for the best piece. #action_positional#",
    "A move that Karpov would nod at. #action_positional#",
    "Structure over chaos. #action_positional#",
    "The slow grind begins in earnest. #action_positional#",
    "A textbook demonstration of outpost play. #action_positional#",
    "No fireworks needed — just precision. #action_positional#",
    "A game won in the planning phase, not the playing phase. #action_positional#",
    "The positional logic here is airtight. #action_positional#",
    "A move that defines the character of the entire game. #action_positional#",
    "Steinitz would have approved completely. #action_positional#",
    "Patience over impatience, every time. #action_positional#",
    "The positional pressure is already unbearable. #action_positional#",
    "A move that prepares a deadly plan three moves ahead. #action_positional#",
    "Converting a slight edge into a decisive one, step by step. #action_positional#",
    "The most principled move in the position. #action_positional#",
    "A demonstration of why good structure always wins out. #action_positional#",
    "The strategic threads come together beautifully here. #action_positional#",
    "Outplaying the opponent not with tactics, but with understanding. #action_positional#",
    "An improvement that seems invisible, but shifts the evaluation dramatically. #action_positional#",
    "Classical chess principles applied with modern precision. #action_positional#",
  ],

  // ---------------------------------------------------------------------------
  // INTROS — Endgame
  // ---------------------------------------------------------------------------
  endgame_intro: [
    "The endgame is where technique separates players. #action_endgame#",
    "Converting this position requires precision. #action_endgame#",
    "Every pawn matters from this point forward. #action_endgame#",
    "A move only an endgame specialist would find. #action_endgame#",
    "King activity becomes the decisive factor. #action_endgame#",
    "The tempo count is everything here. #action_endgame#",
    "An endgame that demands deep calculation. #action_endgame#",
    "The simplest wins, and simple is not always easy. #action_endgame#",
    "Technique over drama — this is the endgame. #action_endgame#",
    "Rook endings are drawn — unless you play like this. #action_endgame#",
    "A pawn endgame that is won by one tempo. #action_endgame#",
    "The kind of endgame that fills textbooks. #action_endgame#",
    "Mastery of the Lucena position is rewarded here. #action_endgame#",
    "The opposition is the key concept to understand. #action_endgame#",
    "A knight ending that is actually winning — if you know how. #action_endgame#",
    "The Philidor position saves the game from the brink. #action_endgame#",
    "Zugzwang in the endgame — the cruelest weapon. #action_endgame#",
    "The technique here is immaculate. #action_endgame#",
    "Grinding down the opponent with perfect endgame play. #action_endgame#",
    "All the pawns are on one side — winning is far from guaranteed. #action_endgame#",
  ],

  // ---------------------------------------------------------------------------
  // ACTIONS — Blunder
  // ---------------------------------------------------------------------------
  action_blunder: [
    "You walked right into #tactic_desc#,",
    "This move carelessly allows #tactic_desc#,",
    "You failed to spot #tactic_desc#,",
    "Completely missing #tactic_desc#,",
    "Overlooking the crushing #tactic_desc#,",
    "This hands the opponent #tactic_desc# on a silver platter,",
    "The position collapses after #tactic_desc#,",
    "Giving away the initiative with #tactic_desc#,",
    "This invites #tactic_desc# without compensation,",
    "Walking into #tactic_desc# with no way out,",
    "A move that simply loses to #tactic_desc#,",
    "Ignoring the latent threat of #tactic_desc#,",
    "The defensive structure breaks after #tactic_desc#,",
    "This passive move allows #tactic_desc# to land,",
    "Leaving the king exposed to #tactic_desc#,",
    "Greed over caution leads directly into #tactic_desc#,",
    "Forgetting entirely about #tactic_desc#,",
    "The tempo loss here invites #tactic_desc#,",
    "A natural-looking move that blunders into #tactic_desc#,",
    "The combination of #tactic_desc# was simply not calculated,",
    "Underestimating the ferocity of #tactic_desc#,",
    "The recapture was forced, but it allows #tactic_desc#,",
    "The entire plan unravels because of #tactic_desc#,",
    "This retreat is a mistake — it gifts the opponent #tactic_desc#,",
    "Trading into a losing endgame by missing #tactic_desc#,",
    "Releasing the tension at the wrong moment walks into #tactic_desc#,",
    "The overconfident pawn grab opens the door to #tactic_desc#,",
    "No calculation was done here — and it shows with #tactic_desc#,",
    "A move made purely on instinct that blunders into #tactic_desc#,",
    "The position cried out for a defensive resource, but instead allowed #tactic_desc#,",
    "An impulsive capture that runs headlong into #tactic_desc#,",
    "The failure to anticipate #tactic_desc# is the root of this loss,",
    "Chasing a ghost while walking into #tactic_desc#,",
    "The correct plan was clear, but this move allows #tactic_desc#,",
    "Abandoning the key defensive role and permitting #tactic_desc#,",
    "One defensive piece moved away — and that is all it takes for #tactic_desc#,",
    "This exchange desperately needed to be declined to avoid #tactic_desc#,",
    "An automatic recapture that misses #tactic_desc# entirely,",
    "The wrong diagonal, the wrong moment, and a full piece lost to #tactic_desc#,",
    "Playing for the wrong plan when the threat of #tactic_desc# was already on the board,",
  ],

  // ---------------------------------------------------------------------------
  // ACTIONS — Good Move
  // ---------------------------------------------------------------------------
  action_good: [
    "You found #tactic_desc#,",
    "Executing #tactic_desc# here is crushing,",
    "Spotting #tactic_desc# wins on the spot,",
    "Unleashing #tactic_desc# with perfect timing,",
    "Capitalizing on #tactic_desc# immediately,",
    "Seeing deep into #tactic_desc# before the opponent could react,",
    "The move #tactic_desc# forces resignation shortly,",
    "Exploiting #tactic_desc# with clinical precision,",
    "Threading the needle with #tactic_desc#,",
    "Calculating #tactic_desc# all the way to the end,",
    "Setting up and landing #tactic_desc# flawlessly,",
    "Triggering #tactic_desc# at exactly the right moment,",
    "The patience to wait for #tactic_desc# pays off,",
    "Forcing #tactic_desc# through a beautiful series of moves,",
    "Recognizing and exploiting #tactic_desc# immediately,",
    "A move that makes #tactic_desc# inevitable,",
    "The only move — and it's #tactic_desc#,",
    "Maximizing the position with #tactic_desc#,",
    "Converting the positional advantage via #tactic_desc#,",
    "Sacrificing material to enable #tactic_desc#,",
    "Demonstrating #tactic_desc# like a textbook example,",
    "Cutting through the complexity by finding #tactic_desc#,",
    "A beautiful idea: #tactic_desc# solves everything,",
    "No defense survives #tactic_desc#,",
    "The cleanest solution is #tactic_desc#, and it was found immediately,",
    "Winning the tactical battle by seeing #tactic_desc# first,",
    "A precise move order that sets up #tactic_desc# perfectly,",
    "The opponent had no answer prepared for #tactic_desc#,",
    "Geometry and calculation combine to produce #tactic_desc#,",
    "The engine confirms: #tactic_desc# is the only winning continuation,",
    "A strike from an unexpected angle, landing #tactic_desc#,",
    "The sacrificial idea of #tactic_desc# was hiding behind an obvious recapture,",
    "Courage and calculation together produce #tactic_desc#,",
    "The move that breaks the game open: #tactic_desc#,",
    "Accurate prophylaxis followed by the decisive #tactic_desc#,",
    "A stunning queen retreat that sets up #tactic_desc#,",
    "The quiet move that prepares #tactic_desc# one move later,",
    "Looking beyond the obvious to find #tactic_desc#,",
    "The opponent's king had nowhere to hide once #tactic_desc# was on the board,",
    "A zwischenzug changes the evaluation entirely by enabling #tactic_desc#,",
  ],

  // ---------------------------------------------------------------------------
  // ACTIONS — Missed
  // ---------------------------------------------------------------------------
  action_miss: [
    "You failed to spot #tactic_desc#,",
    "You overlooked #tactic_desc#,",
    "Missing #tactic_desc# here lets them off the hook,",
    "You hesitated instead of playing #tactic_desc#,",
  ],

  // ---------------------------------------------------------------------------
  // ACTIONS — Positional
  // ---------------------------------------------------------------------------
  action_positional: [
    "restricting the opponent's piece activity with #positional_concept#,",
    "seizing the initiative through #positional_concept#,",
    "establishing lasting pressure via #positional_concept#,",
    "gradually improving the position using #positional_concept#,",
    "neutralizing the opponent's counterplay with #positional_concept#,",
    "converting a structural edge through #positional_concept#,",
    "exploiting the weak squares with #positional_concept#,",
    "creating a dominant piece configuration via #positional_concept#,",
    "utilizing #positional_concept# to build an unstoppable plan,",
    "locking in the advantage with #positional_concept#,",
    "the patient use of #positional_concept# begins to tell,",
    "tightening the vice grip through #positional_concept#,",
    "improving the worst piece by leveraging #positional_concept#,",
    "denying the opponent any active play with #positional_concept#,",
    "the prophylactic idea of #positional_concept# keeps all threats at bay,",
    "building the decisive advantage by exploiting #positional_concept#,",
    "methodically advancing the plan via #positional_concept#,",
    "dominating the key strategic area with #positional_concept#,",
    "a Karpov-like squeeze achieved through #positional_concept#,",
    "the long-term investment in #positional_concept# pays off completely,",
    "creating an imbalance in your favor via #positional_concept#,",
    "the endgame becomes trivially winning thanks to #positional_concept#,",
    "outmaneuvering the opponent with the concept of #positional_concept#,",
    "solving the position's strategic demands through #positional_concept#,",
    "securing the structural advantage with #positional_concept#,",
  ],

  // ---------------------------------------------------------------------------
  // ACTIONS — Endgame
  // ---------------------------------------------------------------------------
  action_endgame: [
    "activating the king to support the passed pawn,",
    "using triangulation to gain the opposition,",
    "the Lucena method converts the rook ending precisely,",
    "the Philidor defensive technique holds the draw against all odds,",
    "advancing the passed pawn with perfect timing,",
    "cutting off the enemy king with a rook check,",
    "creating a second weakness that stretches the defense to breaking point,",
    "the bridge-building technique escorts the pawn home,",
    "forcing a queen endgame that is easily won,",
    "converting the pawn majority with optimal king placement,",
    "zugzwang is forced in just a few precise moves,",
    "a rook sacrifice forces a won king-and-pawn ending,",
    "the opposition decides the game in this pawn ending,",
    "bishop versus knight, and the bishop proves superior in this open position,",
    "the outside passed pawn becomes the decisive factor,",
    "a tempo move creates zugzwang from which there is no escape,",
    "the rook is activated to its maximum potential square,",
    "simplifying into a king and pawn ending that is precisely calculated,",
    "the back-rank infiltration technique secures the point,",
    "promoting a passed pawn through accurate rook support,",
  ],

  // ---------------------------------------------------------------------------
  // TACTIC DESCRIPTIONS
  // ---------------------------------------------------------------------------
  tactic_desc: [
    "a devastating fork",
    "a fatal back-rank weakness",
    "a discovered check",
    "a skewer on the king and queen",
    "a pin that paralyzes the defense",
    "a zwischenzug that upends the calculation",
    "a double attack on the rook and bishop",
    "a mating net closing in from all sides",
    "a deflection that removes the key defender",
    "a decoy sacrifice",
    "a piece overload on the key square",
    "a winning pawn promotion",
    "a bishop sacrifice that rips open the king",
    "a rook infiltration on the seventh rank",
    "a queen sacrifice that forces checkmate",
    "a knight outpost that dominates the board",
    "a lethal cross-pin",
    "a staircase mate pattern",
    "an in-between move that changes everything",
    "a quiet move that creates zugzwang",
    "a killer tempo move that wins material",
    "a passed pawn that cannot be stopped",
    "a discovered attack on the unprotected queen",
    "a long diagonal bishop sacrifice",
    "a rook lift that delivers the decisive blow",
    "a pawn break that shatters the structure",
    "a knight fork on king and rook",
    "a back-rank weakness that is terminal",
    "a clearance sacrifice to open the g-file",
    "a devastating windmill combination",
    "a double check from which there is no escape",
    "an Arabian mate in the corner",
    "a Boden's Mate pattern on the diagonals",
    "a bishop pair slicing through the open position",
    "a hook mate in the corner",
    "a smothered mate by the knight",
    "a queen invasion on the seventh rank",
    "a rook sacrifice to deflect the king",
    "an overloaded piece that cannot defend two threats",
    "a tempo-gaining attack on the undefended rook",
    "a pawn storm crashing through the kingside",
    "a trapped piece with no escape square",
    "a mating attack that ignores material",
    "a piece sacrifice to seize the open file",
    "a knight maneuver that wins a full piece",
    "an X-ray attack through the queen",
    "a breakthrough sacrifice in the endgame",
    "a fortress-breaking pawn advance",
    "a clearance move that opens the mating diagonal",
    "a pin that transforms into a skewer",
    "a rook endgame zugzwang",
    "a bishop-and-queen battery on the long diagonal",
    "a counter-sacrifice that seizes the initiative",
    "a queen sacrifice leading to a forced pawn promotion",
    "a piece sacrifice to open the opponent's king",
    "a quiet pawn move that creates an unstoppable threat",
    "a rook sacrifice on h7 to expose the king",
    "a classic Greek Gift sacrifice",
    "a Maróczy bind that crushes all counterplay",
    "a triangulation technique to gain the opposition",
    "a discovered attack that wins the queen",
    "a back-rank trick that the opponent missed entirely",
    "a rook swap into a winning king-and-pawn ending",
    "a knight hop to an outpost that dominates all play",
    "a bishop retreat that unleashes a hidden battery",
    "a pawn sacrifice that permanently weakens the king",
    "a decisive queen centralization with tempo",
    "a rook doubling on the open file",
    "a mating attack launched by a piece sacrifice on h6",
    "a pawn race won by a single tempo",
    "a defensive piece overloaded beyond its capacity",
    "a Morphy-style piece sacrifice for rapid development",
    "a fork on f7 that wins decisive material",
    "a queen maneuver to a dominating central square",
    "an endgame technique that converts a single pawn advantage",
    "a piece trade that dramatically simplifies into a won pawn endgame",
    "a long forced sequence that wins the exchange",
    "a king march through the center that decides the endgame",
    "a rook behind the passed pawn that becomes unstoppable",
    "a knight outpost on d5 that cannot be dislodged",
    "a classic bishop sacrifice on f7 disrupting king safety",
    "a rook sac that deflects the only defender",
    "an endgame zugzwang in just three precise moves",
    "a queen-and-knight mating battery on the h-file",
    "a tempo-theft move that flips the initiative entirely",
    "a decisive pawn lever that opens the center at the perfect moment",
    "a dominating square seizure that slowly strangles the position",
  ],

  // ---------------------------------------------------------------------------
  // POSITIONAL CONCEPTS
  // ---------------------------------------------------------------------------
  positional_concept: [
    "a dominant knight on an outpost",
    "the bishop pair in an open position",
    "a strong passed pawn on the sixth rank",
    "control of the only open file",
    "a permanent weakness on d6",
    "superior king activity in the endgame",
    "space advantage in the center",
    "a crushing queenside pawn majority",
    "a blockade on the key square",
    "rook coordination on the seventh rank",
    "a bind that restricts all piece movement",
    "the minority attack creating a structural weakness",
    "an outpost that cannot be challenged",
    "a dominant bishop versus a bad knight",
    "a zugzwang position in the endgame",
    "piece activity versus passive defense",
    "control over the dark squares",
    "a rook behind the passed pawn",
    "an isolated queen's pawn under lasting pressure",
    "a strong knight versus a bad bishop",
    "pawn structure superiority in the endgame",
    "the exchange sacrifice to seize the seventh rank",
    "a space advantage that leaves the opponent cramped",
    "a positional pawn sacrifice for long-term compensation",
    "a Capablanca-style piece simplification into a winning endgame",
    "a superior pawn chain pointing at the enemy king",
    "the principle of two weaknesses applied perfectly",
    "a rook invasion that paralyzes the queenside",
    "a knight-versus-bishop imbalance clearly favoring the knight",
    "prophylaxis that prevents all counterplay",
    "a locked center that makes flank play decisive",
    "a protected passed pawn on the fifth rank",
    "a dominating bishop on the long diagonal",
    "pawn majority activation in the late endgame",
    "a queenside expansion that creates new fronts",
    "the creation and exploitation of a pawn island weakness",
    "a superior minor piece in a closed position",
    "piece harmony that outweighs the opponent's scattered forces",
    "a file-control advantage that gradually converts to material",
    "a back-rank weakness that demands permanent defensive attention",
    "a rook on the seventh rank anchored by an active king",
    "a kingside pawn majority that becomes a passed pawn",
    "an endgame where every pawn is a potential winner",
    "the superior bishop that controls the key promotion square",
    "a centralized king in the endgame that outflanks the opponent",
  ],

  // ---------------------------------------------------------------------------
  // CONSEQUENCES — Material Loss
  // ---------------------------------------------------------------------------
  material_loss: [
    "and the material loss is unavoidable.",
    "dropping a significant amount of material.",
    "costing you the game.",
    "leaving you a full piece down with no compensation.",
    "and the position is now resignable.",
    "the rook is simply lost.",
    "and no amount of activity can compensate for the material deficit.",
    "and the opponent converts with ease from here.",
    "surrendering a decisive amount of material.",
    "and any practical winning chances evaporate immediately.",
    "with no counterplay in sight.",
    "the exchange is lost for nothing.",
    "and the endgame is simply hopeless.",
    "leaving a structural and material disadvantage impossible to overcome.",
    "and resistance only prolongs the inevitable.",
    "there is no way to fight on from this position.",
    "the game is effectively over from this point forward.",
    "and the opponent needs only technique to finish things off.",
    "a full queen down — there is nothing to be done.",
    "the pawn structure is broken and material is lost.",
    "dropping the exchange with no positional justification.",
    "and the rating points follow shortly after.",
    "the game slips away with one terrible move.",
    "a material deficit from which there is no recovery.",
    "and the clock only adds insult to injury.",
    "the engine assigns a score beyond -5 — the game is over.",
    "a piece for nothing and the endgame is hopeless.",
    "and even maximum resistance cannot save the point.",
    "the queenside collapses along with the material count.",
    "and the opponent's technique closes it out efficiently.",
    "a rook and a hope — but the position allows neither.",
    "and the pawn deficit in the endgame is completely decisive.",
    "converting the material advantage requires only minimal accuracy.",
    "a knight down in the endgame is a death sentence here.",
    "the evaluation bar swings to the opponent immediately.",
    "and the game is reduced to a technical exercise for the winner.",
    "and accurate play easily converts the extra material.",
    "down the exchange with a worse position — hopeless.",
    "the long diagonal is opened and the material count falls.",
    "and the once-winning position has become a lost cause.",
    "the damage to the structure adds to the material damage.",
  ],

  // ---------------------------------------------------------------------------
  // CONSEQUENCES — Material Gain
  // ---------------------------------------------------------------------------
  material_gain: [
    "winning decisive material.",
    "securing a massive advantage.",
    "and the opponent's position collapses.",
    "and the resulting endgame is trivially winning.",
    "with a technically winning position from here.",
    "and no defensive resource exists.",
    "converting a full piece advantage smoothly.",
    "and the resignation came shortly after.",
    "the extra material makes the rest a formality.",
    "forcing the win of the exchange at minimum.",
    "and the endgame is completely hopeless for the opponent.",
    "with accurate technique, the point is secured.",
    "and the opponent's counterplay is entirely neutralized.",
    "a material and positional advantage that is overwhelming.",
    "the game effectively ends here.",
    "and the resulting position is a computer-level win.",
    "and only the formalities remain.",
    "dominating every aspect of the position.",
    "and resistance is futile.",
    "cashing in on the positional investment immediately.",
    "the initiative converts directly into material.",
    "the position speaks for itself — it's over.",
    "forcing material gain with no counterplay for the opponent.",
    "and the clock pressure seals it.",
    "precision is rewarded with a decisive advantage.",
    "a piece up with a better structure — conversion is routine.",
    "and the remaining moves are a masterclass in technique.",
    "the queen comes in and the game is decided immediately.",
    "and the endgame is a straightforward technical exercise.",
    "material and initiative — the opponent has nothing.",
    "and no amount of practical resistance changes the outcome.",
    "a rook and a pawn ahead: simplify, simplify, simplify.",
    "and perfect technique converts the point without drama.",
    "the pawn promotes, and the opponent's king cannot stop it.",
    "and the tactical sequence nets a full rook.",
    "the queen is trapped, and so is any hope of a draw.",
    "a passed pawn, an extra piece, and a clear road to victory.",
    "and the rating gain is already locked in.",
    "the computer confirms: this is winning by force.",
    "and the winning technique is straightforward from here.",
    "a winning king-and-pawn ending reached by force.",
  ],

  // ---------------------------------------------------------------------------
  // CONSEQUENCES — Positional
  // ---------------------------------------------------------------------------
  positional_outcome: [
    "and the positional grip tightens with every move.",
    "creating a long-term advantage that will be impossible to neutralize.",
    "the opponent is sentenced to passive defense for the rest of the game.",
    "and the position converts slowly but surely.",
    "a technical masterclass begins from this point.",
    "and the endgame conversion is a matter of technique.",
    "the squeeze continues relentlessly.",
    "leaving the opponent without a single constructive plan.",
    "and the strategic superiority becomes material advantage soon enough.",
    "the position is objectively winning, though patience is required.",
    "a suffocating bind from which there is no escape.",
    "and the opponent's pieces are reduced to observers.",
    "structural dominance converts into a winning endgame.",
    "the pawn endgame is simply won.",
    "a slow but inevitable march to victory.",
    "and every trade makes the advantage clearer.",
    "the opponent's only hope is a mistake from the winning side.",
    "and the clock becomes the most important piece on the board.",
    "technical precision from here seals the game.",
    "and another move order study will be required before the rematch.",
    "and the queenside pawns become an unstoppable wave.",
    "a dominating structure that leaves no counterplay.",
    "and the position is evaluated at over +2 with perfect play — it converts.",
    "the endgame technique that follows is clinical and instructive.",
    "and every simplification favors the stronger side.",
    "the structural damage is permanent and decisive.",
    "a strategic masterpiece that will age very well in annotation.",
    "and the extra space alone guarantees winning chances.",
    "piece by piece, the position is improved to its maximum.",
    "the opponent's lack of space becomes increasingly suffocating.",
    "and the pawn majority rolls forward like a steamroller.",
    "the second weakness created here proves to be the decisive one.",
    "and technique is all that remains — technique delivered perfectly.",
    "the king march that follows decides the game in ten moves.",
    "converting the endgame with the precision of a machine.",
    "and the structural advantage becomes a material one soon enough.",
    "the knight finds its ideal outpost and never moves again.",
    "passive defense is the only option left, and it will eventually crack.",
    "and the patient grind reveals its reward in the final act.",
    "an endgame conversion so clean it belongs in a training manual.",
  ],

  // ---------------------------------------------------------------------------
  // CONSEQUENCES — Endgame
  // ---------------------------------------------------------------------------
  endgame_outcome: [
    "and the pawn endgame is calculated to a forced win.",
    "the rook ending converts with the Lucena technique.",
    "a won king-and-pawn ending reached by force.",
    "and precise technique wraps up the full point.",
    "the opposition is secured, and the pawn promotes.",
    "and the passed pawn cannot be stopped.",
    "the king march decides the game within ten moves.",
    "and a technique only an endgame specialist would find.",
    "zugzwang is delivered, and the position collapses.",
    "and the outside passed pawn proves to be the decisive factor.",
    "the draw is held thanks to the Philidor defensive method.",
    "and accurate rook placement secures the half-point.",
    "the stalemate resource saves the game from the brink.",
    "and the fortress is established — a draw is the result.",
    "the pawn endgame is lost by one agonizing tempo.",
    "and the triangulation maneuver decides the king-and-pawn ending.",
    "a rook swap into a won pawn ending — exactly as planned.",
    "and the technique from here is instructive and precise.",
    "the extra pawn promotes despite best resistance.",
    "and the endgame is won with only three moves remaining.",
  ],

  // ---------------------------------------------------------------------------
  // INTROS — Missed Defense
  // ---------------------------------------------------------------------------
  missed_defense_intro: [
    "The defense was there — it just wasn't found. #action_blunder#",
    "A defensive resource was available and ignored. #action_blunder#",
    "The position could have been saved. #action_blunder#",
    "One precise defensive move changes everything — but it wasn't played. #action_blunder#",
    "The counterplay was right there. #action_blunder#",
    "A drawing resource existed. It was missed. #action_blunder#",
    "The only move was the one move not considered. #action_blunder#",
    "An underestimated defensive idea would have held the game. #action_blunder#",
    "The saving move was difficult to find, and it wasn't found. #action_blunder#",
    "A fortress was available — the door was left open instead. #action_blunder#",
    "The position screamed for a defensive resource and got none. #action_blunder#",
    "Even a draw was achievable here with the right idea. #action_blunder#",
    "The opponent's attack could have been neutralized. #action_blunder#",
    "There was a way to fight on — it just required seeing further. #action_blunder#",
    "One defensive finesse holds everything together — but it takes too long to find. #action_blunder#",
  ],

  // ---------------------------------------------------------------------------
  // INTROS — Missed Win
  // ---------------------------------------------------------------------------
  missed_win_intro: [
    "The win was right there — and it slipped away. #action_miss#",
    "A winning move was available and not played. #action_miss#",
    "One precise continuation ends the game. It wasn't chosen. #action_miss#",
    "The clearest path to victory was overlooked. #action_miss#",
    "This was the moment to strike — the moment passed. #action_miss#",
    "The knockout was sitting on the board, invisible. #action_miss#",
    "Converting this required only one precise idea. #action_miss#",
    "The winning continuation was concrete and forcing — almost impossible to miss. #action_miss#",
    "A two-move sequence decides the game. It was not seen. #action_miss#",
    "The position was won — the technique to prove it was the question. #action_miss#",
    "An opportunity like this does not come twice. #action_miss#",
    "A missed chance that the post-mortem will circle in red. #action_miss#",
    "The engine's first line converts immediately — it was not found over the board. #action_miss#",
    "Winning was easy here. Seeing it was the hard part. #action_miss#",
    "A precise forcing sequence seals the game — but the window was missed. #action_miss#",
  ],


};

/**
 * Recursively expands a template string using the grammar dictionary.
 * Example: expandTemplate("#blunder_intro# #material_loss#", { tactic_desc: "fork" })
 */
export function expandTemplate(template, context = {}) {
  let text = template;
  
  const tagRegex = /#([a-zA-Z0-9_]+)#/g;
  let match;
  let iterations = 0;

  while ((match = tagRegex.exec(text)) !== null && iterations < 50) {
    const tag = match[1];
    
    if (context[tag] !== undefined) {
      text = text.replace(match[0], context[tag]);
    } else if (GRAMMAR[tag]) {
      const replacement = pick(GRAMMAR[tag]);
      text = text.replace(match[0], replacement);
    } else {
      text = text.replace(match[0], '');
    }
    tagRegex.lastIndex = 0;
    iterations++;
  }

  // Fallback: Strip any remaining unmapped tags (including those with spaces)
  text = text.replace(/#[^#]+#/g, '');

  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
