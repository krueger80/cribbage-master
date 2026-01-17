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
    let bestDebug = "";

    for (const card of playable) {
        const newTotal = currentTotal + card.value;
        const newStack = [...stack, card];

        // Immediate Points
        const result = calculatePeggingScore(newStack, newTotal);
        let heuristic = result.points;

        // Strategic Adjustments

        // 1. Avoid giving opponent a 15
        // If I make it 5, opponent can play 10 for 15.
        // If I make it X, can opponent make 15? (15 - X).
        // Common cards: 10, 5, A, etc.
        if (newTotal === 5) heuristic -= 2;
        if (newTotal === 21) heuristic -= 2; // Opponent plays 10 for 31

        // 2. Try to land on 15 or 31 (Already in points)

        // 3. Leading (Stack empty)
        if (stack.length === 0) {
            // Avoid leading with 5 or 10?
            if (card.value === 5) heuristic -= 2;
            // Leading a 4 is good (4+10=14, safe-ish).
            if (card.rank === '4') heuristic += 1;
        }

        // 4. Parity / Traps (Advanced)
        // If I play X, and opponent plays X (pair), they get 2.
        // If I have another X, I can play X for Pair Royal (6).
        // So playing a card I have a pair of is good.
        const pairCount = hand.filter(c => c.rank === card.rank).length;
        if (pairCount >= 2) {
            heuristic += 1; // Encouragement to break pairs if profitable
        }

        // 5. Saving low cards for Go/Endgame
        // If total is high (>20), low cards are valuable to squeeze in a play or hit 31.
        // If total is low, maybe save low cards?
        if (card.value <= 3 && currentTotal < 20) {
             // Maybe save it?
             // heuristic -= 0.5;
        }

        const debugStr = `Card: ${card.rank}${card.suit}, Imm: ${result.points}, Heur: ${heuristic}`;

        if (heuristic > maxScore) {
            maxScore = heuristic;
            bestCard = card;
            bestDebug = debugStr;
        }
    }

    return { card: bestCard, score: maxScore, debug: bestDebug };
}
