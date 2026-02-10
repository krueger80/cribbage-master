import { Card, isRun } from './logic';

export interface PeggingScore {
    points: number;
    breakdown: string[];
}

export function calculatePeggingScore(stack: Card[], total: number): PeggingScore {
    let points = 0;
    const breakdown: string[] = [];

    // 15
    if (total === 15) {
        points += 2;
        breakdown.push('15 for 2');
    }
    // 31
    if (total === 31) {
        points += 2;
        breakdown.push('31 for 2');
    }

    // Pairs
    // Check backwards from end of stack
    if (stack.length > 1) {
        let matches = 0;
        const targetRank = stack[stack.length - 1].rank;
        for (let i = stack.length - 2; i >= 0; i--) {
            if (stack[i].rank === targetRank) {
                matches++;
            } else {
                break;
            }
        }
        if (matches > 0) {
            const n = matches + 1;
            const pairPoints = n * (n - 1);
            points += pairPoints;
            const labels = ['', 'Pair', 'Pair Royal', 'Double Pair Royal'];
            breakdown.push(`${labels[matches] || 'Pairs'} for ${pairPoints}`);
        }
    }

    // Runs
    // Check for runs of length k, starting from 3 up to stack length
    // The run MUST include the last card played.
    for (let k = Math.min(stack.length, 7); k >= 3; k--) {
        const lastK = stack.slice(stack.length - k);
        if (isRun(lastK)) {
            points += k;
            breakdown.push(`Run of ${k} for ${k}`);
            break; // Only score the longest run
        }
    }

    return { points, breakdown };
}

export function determinePeggingCard(
    hand: Card[],
    stack: Card[],
    currentTotal: number
): { card: Card | null, score: number, debug?: string } {

    // Find playable cards
    const playable = hand.filter(c => currentTotal + c.value <= 31);

    if (playable.length === 0) {
        return { card: null, score: 0 };
    }

    let bestCard = playable[0];
    let maxScore = -999;
    let actualPoints = 0;
    let bestDebug = "";

    for (const card of playable) {
        // Parse card values appropriately: JQK=10, A=1
        // (Assuming card.value is already correct)

        let pointValue = typeof card.value === 'string' ? parseInt(card.value) : card.value;
        if (isNaN(pointValue)) pointValue = 10; // Fallback for face cards if logic fails, but parser should exist

        // Actually card.value should be number from parseCard
        const val = card.value;

        const newTotal = currentTotal + val;
        // Construct new stack for scoring (card is last)
        const newStack: Card[] = [...stack, card];

        // Immediate Points
        // We need to implement scorePeggingStack basically
        // But we have calculatePeggingScore exported above?
        // Wait, the previous code called calculatePeggingScore(newStack, newTotal)
        // I should just use that.

        // Re-implementing logic safely
        const result = calculatePeggingScore(newStack, newTotal);
        let heuristic = result.points;

        // Strategic Adjustments

        // 1. Avoid giving opponent a 15
        if (newTotal === 5) heuristic -= 2;
        if (newTotal === 21) heuristic -= 2;

        // 3. Leading (Stack empty)
        if (stack.length === 0) {
            // Avoid leading with 5 or 10?
            if (val === 5) heuristic -= 2;
            // Leading a 4 is good (4+10=14, safe-ish).
            if (card.rank === '4') heuristic += 1;
        }

        // 4. Parity / Traps (Advanced)
        // If I have another X, I can play X for Pair (2).
        const pairCount = hand.filter(c => c.rank === card.rank).length;
        if (pairCount >= 2) {
            heuristic += 0.5; // Encouragement to break pairs if profitable
        }

        // 5. Saving low cards for Go/Endgame
        if (val <= 3 && currentTotal < 20) {
            // Maybe save it?
            // heuristic -= 0.5;
        }

        const debugStr = `Card: ${card.rank}${card.suit}, Imm: ${result.points}, Heur: ${heuristic}`;

        if (heuristic > maxScore) {
            maxScore = heuristic;
            bestCard = card;
            actualPoints = result.points;
            bestDebug = debugStr;
        }
    }

    return { card: bestCard, score: maxScore, actualPoints: actualPoints, debug: bestDebug };
}
