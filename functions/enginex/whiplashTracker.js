/**
 * Convert centipawns to win probability (0–100%).
 * Lichess formula, also used by en-croissant.
 * Handles extreme values (±30 000 cp mate scores) gracefully.
 *
 * @param {number} cp – centipawns from the given player's perspective
 * @returns {number} win probability 0–100
 */
export function cpToWinPct(cp) {
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/**
 * Detect a "whiplash" or significant shift in the evaluation.
 * 
 * @param {number} preCp - Evaluation before the move (in absolute centipawns, + is white winning)
 * @param {number} postCp - Evaluation after the move (in absolute centipawns)
 * @returns {object|null} - { type, text } for the explanation box, or null if no threshold met.
 */
export function detectWhiplash(preCp, postCp) {
    try {
        if (typeof preCp !== 'number' || typeof postCp !== 'number') return null;

        // Convert absolute CP to White's win probability (0-100%)
        const preW = cpToWinPct(preCp);
        const postW = cpToWinPct(postCp);
        const shift = Math.abs(preW - postW);

        // --- WHITE RULES (White is winning when % is high) ---
        
        // 1a) White winning to losing
        if (preW >= 80 && postW < 50) {
            return { type: 'whiplash', text: 'winning to losing' };
        }
        // 1b) White losing to winning (vice versa of winning to losing)
        if (preW < 50 && postW >= 80) {
            return { type: 'whiplash', text: 'losing to winning' };
        }
        // 2a) White winning but advantage lost (shift of at least 25%)
        if (preW >= 80 && postW > 50 && (preW - postW) >= 25) {
            return { type: 'whiplash', text: 'winning but advantage lost' };
        }
        // 2b) White winning and advantage secured (vice versa of advantage lost)
        if (postW >= 80 && preW > 50 && (postW - preW) >= 25) {
            return { type: 'whiplash', text: 'winning and advantage secured' };
        }

        // --- BLACK RULES (Black is winning when White's % is low, i.e., <= 20) ---
        
        // 3a) Black winning to losing (White's % goes from <= 20 to > 50)
        if (preW <= 20 && postW >= 50) {
            return { type: 'whiplash', text: 'winning to losing' };
        }
        // 3b) Black losing to winning (White's % goes from >= 50 to <= 20)
        if (preW >= 50 && postW <= 20) {
            return { type: 'whiplash', text: 'losing to winning' };
        }
        // 4a) Black winning but advantage lost (White's % was <= 20, rose to < 50, shift >= 25)
        if (preW <= 20 && postW < 50 && (postW - preW) >= 25) {
            return { type: 'whiplash', text: 'winning but advantage lost' };
        }
        // 4b) Black winning and advantage secured (White's % was < 50, fell to <= 20, shift >= 25)
        if (postW <= 20 && preW < 50 && (preW - postW) >= 25) {
            return { type: 'whiplash', text: 'winning and advantage secured' };
        }

        return null;
    } catch {
        return null;
    }
}
