import { pick } from './moveExplainer.js';


const SPECIFIC_OPENING_MOVES = {
    'a3': [
        "Anderssen's Opening. A waiting move that essentially passes the turn, allowing White to play a reversed defense with an extra tempo.",
        "Adolf Anderssen famously used 1.a3 three times in his 1858 match against the legendary Paul Morphy!",
        "1.a3 doesn't control the center directly, but it prepares b4 or secures the b4 square. Very flexible, if passive.",
        "While not objectively the strongest, 1.a3 takes the other side out of standard opening book theory immediately.",
        "By waiting, White can often transpose into a reversed French Defense or Sicilian setup depending on Black's response.",
        "Modern engines evaluate this as slightly sub-optimal, as White gives up their first-move advantage.",
        "Interestingly, Magnus Carlsen has used 1.a3 in blitz games to prove that early positional understanding trumps memorization."
    ],
    'a4': [
        "The Ware Opening. Grabbing queenside space early, but completely ignoring the center.",
        "Preston Ware played this in the 1880s, but today it is considered irregular and suboptimal.",
        "1.a4 brings the rook into play quickly but leaves the center entirely to Black.",
        "This move often aims for an early Ra3, a maneuver sometimes seen in offbeat amateur games.",
        "Black can respond classically with 1...e5 or 1...d5 to dominate the central squares.",
        "Because a4 does nothing for kingside development, White's castling may be delayed.",
        "It's a pure flank opening that tests Black's ability to capitalize on classical principles."
    ],
    'b3': [
        "The Nimzowitsch-Larsen Attack. White prepares to fianchetto the bishop to b2 to eye the central dark squares.",
        "A hypermodern opening that fights for the center from a distance rather than occupying it with pawns.",
        "Bent Larsen used this opening with immense success in the 1960s and 70s to avoid deep opening theory.",
        "It perfectly complements hypermodern setups like the Réti and can transpose into the English.",
        "Bobby Fischer notably lost a famous game to Larsen when facing this exact opening!",
        "By delaying central commitment, White retains maximum flexibility in pawn structure.",
        "Black must be careful not to overextend in the center, as the b2 bishop is a long-range sniper."
    ],
    'b4': [
        "The Sokolsky or Polish Opening. White stakes an immediate claim for queenside space.",
        "An aggressive flank opening that plans to fianchetto the bishop to b2 and disrupt Black's queenside development.",
        "Captain Alexey Sokolsky championed this move, proving it contains deep positional venom.",
        "Also known as the Orangutan Opening, allegedly named after a primate at the Bronx Zoo by Tartakower.",
        "1.b4 fights for the c5 square and prepares to pressure Black's queenside immediately.",
        "While uncommon at the elite level, it requires Black to play precisely to prove equality.",
        "Black can challenge the b4 pawn directly with 1...e5 or 1...c6."
    ],
    'c3': [
        "The Saragossa Opening. A modest move that prepares d4 or supports a queenside expansion.",
        "1.c3 is highly flexible and often transposes into other openings like the Caro-Kann in reverse.",
        "This opening had a dedicated theme tournament in Saragossa, Spain in 1922.",
        "It's a solid but unambitious start, allowing Black to equalize easily with 1...e5, 1...d5, or 1...c5.",
        "White keeps the tension and waits for Black to reveal their setup before committing centrally.",
        "The c3 pawn supports d4, preparing a strong pawn center if Black plays passively.",
        "Often used by players who prefer slow, maneuvering games over sharp theoretical battles."
    ],
    'c4': [
        "The English Opening. A top-tier choice that fights for the d5 square without committing a central pawn.",
        "A highly flexible, strategic opening favored by positional players and World Champions.",
        "Howard Staunton popularized this opening during his 1843 match against Saint-Amant in London.",
        "1.c4 often transposes into complex systems like the Reti or 1.d4 structures if White plays d4 later.",
        "It's a hypermodern approach that controls the center from the flank, keeping the e and d pawns flexible.",
        "Garry Kasparov famously used the English Opening during his 1987 World Championship match.",
        "Black has many responses, including 1...e5 (Reversed Sicilian) or 1...c5 (Symmetrical English)."
    ],
    'd3': [
        "The Mieses Opening. A solid but passive move that opens the c1-h6 diagonal and prepares a flexible setup.",
        "Often transposes into a King's Indian Attack or other hypermodern systems.",
        "Garry Kasparov surprisingly played 1.d3 against Deep Blue in 1997 to take the computer out of its opening book.",
        "While very solid, it gives Black an easy route to equality by playing 1...e5 or 1...d5.",
        "It prepares to control the e4 square but voluntarily gives up the first-move initiative.",
        "Players who choose 1.d3 usually aim for a closed, strategic middlegame.",
        "Historically, Jacques Mieses used this to maneuver into comfortable, familiar pawn structures."
    ],
    'd4': [
        "A solid queen's pawn opening!",
        "Is this deep preparation, or just a random move?",
        "1.d4 secures central space and immediately opens lines for the queenside bishop.",
        "Unlike 1.e4, the pawn on d4 is protected by the queen, often leading to slower, more strategic battles.",
        "It forms the foundation of legendary openings like the Queen's Gambit and the Indian Defenses.",
        "World Champions like Anatoly Karpov and Vladimir Kramnik built their careers on this classical first move.",
        "Black's most common replies are 1...d5 (classical) and 1...Nf6 (hypermodern)."
    ],
    'e3': [
        "The Van't Kruijs Opening. A modest pawn step that prepares to develop the kingside bishop.",
        "Often transposes into a reversed French Defense or Stonewall setup.",
        "Named after a 19th-century Dutch player who won a major tournament in Amsterdam in 1878 using it.",
        "It limits the scope of the c1 bishop temporarily, which is a minor drawback.",
        "White plays a waiting game, allowing Black to dictate the initial central structure.",
        "Often used to bypass heavy theory, steering the game into original, less-explored territory.",
        "While passive, 1.e3 is perfectly playable and contains no direct refutation."
    ],
    'e4': [
        "e4? A classic choice, fighting for the center immediately!",
        "Best by test! Bobby Fischer's favorite opening move.",
        "1.e4 immediately opens lines for both the queen and the kingside bishop, leading to open, tactical games.",
        "This move challenges Black to respond dynamically, leading to the Ruy Lopez, Sicilian, or French.",
        "It has been the most popular opening move throughout chess history for its aggressive nature.",
        "Provides excellent control over the d5 and f5 squares, securing a strong central presence.",
        "A great choice for players who enjoy sharp calculation and attacking chess."
    ],
    'f3': [
        "The Barnes Opening. An irregular move that defends e4 but takes the best square away from the kingside knight.",
        "Considered objectively weak as it exposes the king along the e1-h4 diagonal.",
        "Thomas Barnes famously defeated Paul Morphy with this opening in 1858!",
        "It voluntarily weakens the kingside structure right from move one.",
        "Sometimes used purely for its shock value, daring the other side to punish the inaccuracy.",
        "Black can respond with 1...d5 or 1...e5 to seize the initiative immediately.",
        "If White follows up with 2.g4?, it leads to Fool's Mate after 2...Qh4#!"
    ],
    'f4': [
        "Bird's Opening. White fights for control of the e5 square right out of the gate.",
        "A flank opening that often leads to a reversed Dutch Defense structure.",
        "Named after Henry Bird, a 19th-century English master who passionately advocated for its strategic depth.",
        "It slightly weakens the kingside but aggressively clamps down on the dark central squares.",
        "Black often responds with 1...d5 or the sharp From's Gambit (1...e5).",
        "A favorite among creative players who want an asymmetrical, fighting game from move one.",
        "Bent Larsen played this occasionally with great success at the highest levels."
    ],
    'g3': [
        "The Hungarian Opening. White prepares to develop the bishop to g2.",
        "A hypermodern choice that delays central pawn advances in favor of controlling the long diagonal.",
        "Pal Benko famously used 1.g3 to defeat Bobby Fischer and Mikhail Tal in the 1962 Candidates Tournament.",
        "Also known as the King's Fianchetto, it often transposes into the Reti or English Opening.",
        "It keeps White's setup incredibly flexible, hiding intentions until Black commits their pawns.",
        "The g2 bishop becomes a powerful piece, exerting pressure across the board.",
        "A solid, positional choice that avoids early tactical skirmishes in favor of slow maneuvering."
    ],
    'g4': [
        "Grob's Attack. An extremely aggressive and highly dubious thrust on the kingside.",
        "White tries to seize space and quickly fianchetto the bishop, but severely weakens the kingside structure.",
        "Henri Grob, a Swiss master, played this opening extensively and even won many postal chess games with it.",
        "Often called the Spike, it is considered the worst possible opening move by strong engines.",
        "Black can immediately strike back in the center with 1...d5, aiming at the weakened g4 pawn.",
        "While objectively poor, it contains tricky traps and can fluster an unprepared player.",
        "Playing 1.g4 is a psychological declaration of all-out, chaotic war on the board."
    ],
    'h3': [
        "The Clemenz Opening. A slow, prophylactic move that prevents Black from using the g4 square.",
        "Usually considered a wasted tempo for White on move 1, as it does nothing for central control.",
        "It can transpose into a reversed setup where White waits to see Black's intentions before committing.",
        "Named after Hermann Clemenz, a 19th-century Estonian player.",
        "While passive, it doesn't create any permanent weaknesses like 1.f3 or 1.g4.",
        "It's a pure waiting move, essentially asking Black to play White's role in the opening.",
        "Often used in casual games when White wants to avoid heavy theoretical preparation."
    ],
    'h4': [
        "The Kádas Opening. A direct thrust aiming to grab kingside space and activate the rook.",
        "While dubious, it creates immediate imbalances and takes the game out of known theory.",
        "Magnus Carlsen has jokingly used 1.h4 in online blitz to show that the first move doesn't always matter.",
        "Named after Hungarian player Gábor Kádas, it severely weakens the kingside structure.",
        "It does nothing to control the center, allowing Black to comfortably claim d5 and e5.",
        "White occasionally follows up with Rh3, an incredibly unorthodox rook lift.",
        "Often employed purely for psychological effect or in bullet chess to create confusion.",
    ],
    'Na3': [
        "The Sodium Attack. White develops the knight to the rim, violating classical principles.",
        "A knight on the rim is dim! This move prepares c4 but places the knight on a passive square.",
        "Robert Durkin promoted this opening, and it's called the 'Sodium Attack' because 'Na' is the chemical symbol for Sodium.",
        "The knight on a3 is poorly placed, but it supports a quick strike with c4.",
        "Objectively, it gives away the opening advantage, but it avoids mainstream theory entirely.",
        "Black can seize the center freely with 1...d5 or 1...e5 while White repositions the knight.",
        "An eccentric choice for players who thrive in bizarre, unbalanced middlegame positions."
    ],
    'Nc3': [
        "The Van Geet Opening. Developing a piece and controlling the center simultaneously.",
        "A solid, flexible move that can easily transpose into standard openings like the Vienna or the Four Knights.",
        "It blocks the c-pawn, which is a slight drawback compared to standard Queen's Pawn games.",
        "Named after Dick van Geet, a Dutch international master and correspondence chess grandmaster.",
        "It pressures the d5 and e4 squares immediately without committing a pawn structure.",
        "Also known as the Dunst Opening, it's a perfectly sound move favored by independent thinkers.",
        "Black has numerous good replies, including 1...c5, 1...d5, or 1...Nf6."
    ],
    'Nf3': [
        "The Zukertort Opening. A highly flexible and principled developing move.",
        "White controls d4 and e5 while keeping all central pawn options open.",
        "Richard Réti used 1.Nf3 to defeat José Raúl Capablanca in 1924, ending Capablanca's 8-year undefeated streak!",
        "It avoids the sharpest lines of the Nimzo-Indian and Grünfeld defenses.",
        "Often transposes into the King's Indian Attack, Queen's Gambit, or Reti Opening.",
        "A favorite of hypermodern players who like to keep the pawn center fluid.",
        "Provides maximum flexibility; White can decide their pawn structure based on Black's response."
    ],
    'Nh3': [
        "The Amar Opening. An eccentric development that prepares to fianchetto or route the knight to f4.",
        "Generally frowned upon because 'a knight on the rim is dim' and it doesn't control the center directly.",
        "This opening is named after Charles Amar, a Parisian amateur who played it in the 1930s.",
        "Also known as the Paris Opening, it is considered highly irregular.",
        "The knight on h3 is awkwardly placed and can become a target for Black's queenside bishop.",
        "White usually follows up with g3 and Bg2, castling kingside quickly.",
        "A rare, offbeat weapon usually reserved for blitz or bullet games to shock the other side."
    ]
};

// Helper to check if a move lands in the 16-square extended center (c3-f6)
export const isInExtendedCenter = (san) => {
    if (!san) return false;
    const match = san.match(/([a-h])([1-8])([^a-z0-9]*)$/i);
    if (!match) return false;
    const file = match[1].toLowerCase();
    const rank = parseInt(match[2], 10);
    return ['c', 'd', 'e', 'f'].includes(file) && rank >= 3 && rank <= 6;
};

export function getOpeningExplanation(
    move, bestMoveSan, isBookMove, isNovelty, moveNumber, openingName, isLastBookMove,
    classification, loss, isPlayer = true
) {
    if (!move) return null;

    let explanation = {
        text: "",
        lines: [],
        type: "observation",
        tacticType: null
    };

    if (moveNumber === 1 && move.color === 'w' && SPECIFIC_OPENING_MOVES[move.san]) {
        explanation.text = pick(SPECIFIC_OPENING_MOVES[move.san]);
        explanation.lines = [explanation.text];
        explanation.type = "opening";
        explanation.tacticType = "firstMove";
        return explanation;
    }

    // 1.5 LAST BOOK MOVE
    if (isLastBookMove) {
        if (openingName) {
            explanation.text = pick([
                `This is the last book move for the ${openingName}. From here, you're on your own.`,
                `The ${openingName} ends here. The real battle begins now.`,
                `Final book move of the ${openingName}. Original chess starts next move.`,
                `That wraps up the ${openingName}. Time to think independently.`,
                `The ${openingName} is complete. No more theory to lean on!`,
                `Last known move in the ${openingName}. Welcome to uncharted territory.`,
                `End of the line for the ${openingName}. Every move from here is your own.`,
                `The ${openingName} has been fully played out. Let intuition guide you!`,
                `With this move, the ${openingName} is sealed. Now it's pure chess.`,
                `The book closes on the ${openingName}. Trust your instincts from here.`,
                `That's the final page of the ${openingName}. The rest is up to you.`,
                `The ${openingName} reaches its conclusion. Creativity takes over now.`,
            ]);
        } else {
            explanation.text = pick([
                `This is the last book move.`,
                `End of theory! From here, every move is original.`,
                `The opening book closes here. Time to navigate on your own.`,
                `Last known move in the database.`,
                `That's the final theoretical move. You're in uncharted waters.`,
                `No more book moves after this. Think for yourself!`,
                `The theory ends here. Trust your understanding of the position.`,
                `With this, the known theory is exhausted. Make your own path.`,
                `Last move the books cover. Everything from here is a fresh fight.`,
                `The preparation phase ends here. Now it's pure calculation and feel.`,
            ]);
        }
        explanation.lines = [explanation.text];
        explanation.type = "opening";
        explanation.tacticType = "lastBookMove";
        return explanation;
    }

    // 1.8 INTERMEDIATE BOOK MOVES
    if (isBookMove && !isLastBookMove) {
        const playerInCenter = isInExtendedCenter(move.san);
        const engineInCenter = isInExtendedCenter(bestMoveSan);
        const matchedEngine = bestMoveSan && move.san.replace(/[+#]/g, '') === bestMoveSan.replace(/[+#]/g, '');

        const YOU = isPlayer ? 'You' : 'They';
        const YOU_RE = isPlayer ? "You're" : "They're";
        const YOUR = isPlayer ? "your" : "their";

        if (playerInCenter && engineInCenter && matchedEngine) {
            explanation.text = pick([
                `${YOU} go ${move.san}! Developing, centralizing, and taking control. Nice!`,
                `${move.san} is exactly what the engine ordered. A great find!`,
                `Spot on! ${move.san} grabs the center just like a pro.`,
                `Boom! ${move.san} is the top choice for fighting in the middle.`,
                `Nailed it! ${move.san} is the engine's pick for the center.`,
                `Perfect timing! ${move.san} seizes the center with authority.`,
                `${move.san} — textbook centralization. That's how it's done!`,
            ]);
        } else if (playerInCenter && engineInCenter && !matchedEngine) {
            explanation.text = pick([
                `Not a bad idea at all — fighting for the center is always good!`,
                `A solid central try with ${move.san}. Keep up the pressure.`,
                `Good instincts aiming for the middle of the board!`,
                `${YOU_RE} focusing on the center, which is exactly where the action is.`,
                `Right idea! ${move.san} contests the center.`,
                `Central play is always principled.`,
                `Heading to the center with ${move.san}. A reasonable plan!`,
                `${move.san} fights for the middle — can't fault that logic!`,
            ]);
        } else if (!playerInCenter && engineInCenter) {
            // Player moved away from centre, engine wanted a centre move
            const hasEvalLoss = typeof loss === 'number' && loss > 15;
            const isBadCls = classification && ['blunder', 'mistake', 'inaccuracy', 'miss'].includes(classification.id);
            if ((hasEvalLoss || isBadCls) && bestMoveSan) {
                explanation.text = pick([
                    `${YOU} drifted away from the center... The engine preferred ${bestMoveSan} to keep the fight going.`,
                    `Hmm, moving to the edge? ${bestMoveSan} was a much stronger central option.`,
                    `The center is where the magic happens! ${bestMoveSan} was the engine's pick.`,
                    `A bit passive — the engine wanted ${bestMoveSan} to keep the initiative in the center.`,
                    `Stepping away from the action. ${bestMoveSan} would have kept the central pressure on.`,
                    `The center called, but ${move.san} didn't answer. ${bestMoveSan} was the way to go.`,
                ]);
            } else {
                explanation.text = pick([
                    `A solid sideline choice! The engine had ${bestMoveSan || 'a central move'} in mind, but this is fine.`,
                    `A reasonable approach. The engine slightly preferred ${bestMoveSan || 'playing more centrally'}.`,
                    `Playing on the flank — not the engine's first choice, but perfectly playable.`,
                    `The engine had ${bestMoveSan || 'a central idea'} lined up, but ${move.san} works too.`,
                    `An independent choice! The engine leaned toward ${bestMoveSan || 'the center'}, but no harm done.`,
                    `${move.san} steps away from the center. The engine had ${bestMoveSan || 'other plans'}, but this is fine.`,
                ]);
            }
        } else if (playerInCenter && !engineInCenter) {
            // Player went to centre, engine wanted something else
            explanation.text = pick([
                `Good instincts heading to the center! The engine had a slightly different idea though.`,
                `Nice central play with ${move.san}. The engine had ${bestMoveSan || 'another option'} in mind.`,
                `${move.san} fights for the center — always a sound strategy! The engine saw a different path.`,
                `Centralizing with ${move.san}. Can't go wrong with that philosophy! The engine preferred ${bestMoveSan || 'something else'}.`,
                `Classical thinking! ${move.san} aims straight for the center. The engine had ${bestMoveSan || 'a sideline'} in mind.`,
                `Principled play with ${move.san}. The engine went a different direction, but this is solid.`,
                `${move.san} grabs central space! The engine had ${bestMoveSan || 'an alternative'}, but the center never lies.`,
                `Occupying the center with ${move.san}. The engine had a nuance, but this is totally fine.`,
            ]);
        } else if (!playerInCenter && !engineInCenter && matchedEngine) {
            explanation.text = `${move.san}? A perfectly fine opening choice!`;
        } else {
            explanation.text = pick([
                `A solid developing move. Keep getting those pieces out!`,
                `Developing nicely. The opening phase is all about getting ready for the middlegame.`,
                `Steady development with ${move.san}. Building a strong foundation.`,
                `${move.san} keeps the development rolling. Nothing flashy, but solid.`,
                `Good housekeeping! ${move.san} tidies up the position.`,
                `Quiet preparation with ${move.san}. Setting up for the middlegame ahead.`,
            ]);
        }



        explanation.lines = [explanation.text];
        explanation.type = "observation";
        explanation.tacticType = "bookMove";
        return explanation;
    }

    // 1.9 NOVELTY
    if (isNovelty) {
        explanation.text = pick([
            "A Novelty! We're out of theory - original chess begins right here.",
            "The game leaves known territory. Anything can happen from here!",
            "Novelty... Welcome to the unknown.",
            "The opening book is closed. Think for yourself.",
            "Uncharted waters. The real test begins.",
            "Leaving established theory with a dangerous new idea!"
        ]);
        

        
        explanation.lines = [explanation.text];
        explanation.type = "best"; // As per backup
        explanation.tacticType = "novelty";
        return explanation;
    }

    return null;
}
