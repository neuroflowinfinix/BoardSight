/**
 * Tracks the consecutive streaks of move classifications (e.g., brilliant, great, blunder)
 * for each player, and returns a rich explanation object when notable thresholds are hit.
 */
export class StreakTracker {
    constructor() {
        this.streaks = {
            w: { type: null, count: 0, topCount: 0 },
            b: { type: null, count: 0, topCount: 0 }
        };
    }

    /**
     * Fast-forward the tracker state using an array of past moves.
     * @param {Array} pastMoves - Array of analyzed move objects.
     */
    hydrate(pastMoves) {
        if (!pastMoves || !pastMoves.length) return;
        for (const mv of pastMoves) {
            if (mv.classification?.id) {
                this._updateState(mv.color, mv.classification.id);
            } else {
                this.streaks[mv.color] = { type: null, count: 0, topCount: 0 };
            }
        }
    }

    _updateState(color, classificationId) {
        if (!classificationId) {
            this.streaks[color] = { type: null, count: 0, topCount: 0 };
            return null;
        }

        const currentStreak = this.streaks[color];

        // Track exact classification streak
        if (currentStreak.type === classificationId) {
            currentStreak.count++;
        } else {
            currentStreak.type = classificationId;
            currentStreak.count = 1;
        }

        // Track combined top move streak (best, excellent, great, brilliant)
        if (['best', 'excellent', 'great', 'brilliant'].includes(classificationId)) {
            currentStreak.topCount++;
        } else {
            currentStreak.topCount = 0;
        }

        return currentStreak;
    }

    /**
     * Updates streak state and returns formatted streak explanation only at milestone thresholds.
     * @param {string} color - 'w' or 'b'
     * @param {string|null} classificationId
     * @param {boolean} isPlayer - Perspective flag
     * @returns {object|null}
     */
    processMove(color, classificationId, isPlayer = true) {
        const currentStreak = this._updateState(color, classificationId);
        if (!currentStreak) return null;

        const count = currentStreak.count;
        const topCount = currentStreak.topCount;
        const type = currentStreak.type;

        // Milestones only: fire once when reaching 2, 3, 5, 8, 12...

        // 1. Brilliant Streak (count === 2 or 4)
        if (type === 'brilliant' && (count === 2 || count === 4)) {
            const text = isPlayer
                ? (count === 2 ? "Back-to-back brilliant moves! Incredible tactical vision!" : `${count} brilliant moves in a row! Unbelievable chess!`)
                : `Your opponent just played ${count} brilliant moves in a row!`;
            return { type: 'streak', text };
        }

        // 2. Great Streak (count === 2 or 4)
        if (type === 'great' && (count === 2 || count === 4)) {
            const text = isPlayer
                ? (count === 2 ? "Two great moves in a row — you're dominating the position!" : `${count} great moves in a row! Flawless play!`)
                : `Your opponent has played ${count} great moves in a row.`;
            return { type: 'streak', text };
        }

        // 3. Best Move Streak (milestones: 5, 10, 15, 20)
        if (type === 'best' && (count === 5 || count === 10 || count === 15 || count === 20)) {
            const text = isPlayer
                ? (count === 5 ? "5 best moves in a row — you're in the zone!" : `${count} consecutive best moves! Pure engine precision!`)
                : `Your opponent is locked in — ${count} best moves in a row.`;
            return { type: 'streak', text };
        }

        // 4. Combined Top Move Streak (milestones: 5, 10, 15, 20 when exact best streak didn't fire)
        if (topCount >= 5 && count < 5 && (topCount === 5 || topCount === 10 || topCount === 15 || topCount === 20)) {
            const text = isPlayer
                ? (topCount === 5 ? "5 consecutive top-tier moves keeping the pressure high!" : `${topCount} top-tier moves in a row! Total board control!`)
                : `Your opponent is on a roll — ${topCount} top moves in a row.`;
            return { type: 'streak', text };
        }

        // 5. Blunder Streak (count === 2 or 3)
        if (type === 'blunder' && (count === 2 || count === 3)) {
            const text = isPlayer
                ? (count === 2 ? "That's back-to-back blunders. Take a moment to reset!" : `${count} blunders in a row — tough stretch, stay focused!`)
                : `Back-to-back blunders from your opponent! Opportunities are opening up!`;
            return { type: 'streak', text };
        }

        // 6. Mistake Streak (count === 2 or 3)
        if (type === 'mistake' && (count === 2 || count === 3)) {
            const text = isPlayer
                ? (count === 2 ? "Two mistakes in a row — the pressure is building!" : `${count} consecutive mistakes — time to regroup.`)
                : `Two mistakes in a row from your opponent.`;
            return { type: 'streak', text };
        }

        // 7. Inaccuracy Streak (count === 3 or 5)
        if (type === 'inaccuracy' && (count === 3 || count === 5)) {
            const text = isPlayer
                ? `${count} inaccuracies in a row — watch out for small concessions.`
                : `${count} inaccuracies in a row from your opponent.`;
            return { type: 'streak', text };
        }

        return null;
    }
}
