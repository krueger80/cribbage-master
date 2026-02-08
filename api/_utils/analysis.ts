import { Card, calculateScore, getAllCards, ScoreBreakdown, parseCard } from './logic';

export interface AnalysisResult {
    kept: Card[];
    discarded: Card[];
    handStats: StatResult;
    cribStats: StatResult; // For dealer (positive) or opponent (negative implications)
    peggingScore: number; // Heuristic
    totalExpectedValue: number;
}

export interface StatResult {
    min: number;
    max: number;
    avg: number;
    breakdown: ScoreBreakdown; // Average breakdown
}

// Pegging Heuristics (Approximate average points fetched by this card)
// Source: Aggregated online cribbage stats
const PEGGING_VALUES: Record<string, number> = {
    'A': 0.6, '2': 0.7, '3': 0.8, '4': 0.9, '5': 0.9,
    '6': 0.6, '7': 0.5, '8': 0.5, '9': 0.4, '10': 0.3,
    'J': 0.3, 'Q': 0.3, 'K': 0.3
};

function getCombinations<T>(arr: T[], k: number): [T[], T[]][] {
    // Returns [ [kept, discarded], ... ]
    if (k === 0) return [[arr, []]];
    if (arr.length === k) return [[[], arr]];
    if (arr.length === 0) return []; // Should not happen

    const [first, ...rest] = arr;

    // Case 1: Discard first
    const discardFirst = getCombinations(rest, k - 1).map(([kep, disc]) => [kep, [first, ...disc]] as [T[], T[]]);

    // Case 2: Keep first
    const keepFirst = getCombinations(rest, k).map(([kep, disc]) => [[first, ...kep], disc] as [T[], T[]]);

    return [...discardFirst, ...keepFirst];
}

export function analyzeHand(
    hand: Card[],
    isDealer: boolean,
    numPlayers: number,
    simulationMode: 'quick' | 'precise' = 'precise'
): AnalysisResult[] {
    const numToDiscard = (numPlayers === 2) ? 2 : 1;
    const allCards = getAllCards();

    // Identify possible cut cards (Deck - Hand)
    // Note: We don't know opponent's hand, so we assume all other cards are possible cuts.
    // In reality, opponent holds some, but uniform probability applies from our perspective.
    const possibleCutCards = allCards.filter(c =>
        !hand.some(h => h.rank === c.rank && h.suit === c.suit)
    );

    const options = getCombinations(hand, numToDiscard);
    const results: AnalysisResult[] = [];

    for (const [kept, discarded] of options) {
        // 1. Calculate Hand Stats
        const handStats = calculateStats(kept, possibleCutCards, false);

        // 2. Calculate Crib Stats
        // This is complex. 
        // If 2 players: Crib = 2 discarded + 2 opponent + Cut.
        // If 3 players: Crib = 1 discarded + 1 opp1 + 1 opp2 + 1 deck + Cut.
        // If 4 players: Crib = 1 discarded + 1 opp1 + 1 opp2 + 1 opp3 + Cut.

        let cribStats: StatResult = { min: 0, max: 0, avg: 0, breakdown: { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0, total: 0 } };

        if (numPlayers === 2) {
            if (simulationMode === 'quick') {
                // Quick Mode: Simulation with limited samples (e.g. 2000)
                cribStats = simulateCrib2Player(discarded, possibleCutCards, 2000);
            } else {
                // Precise Mode: Exact calculation (~45k iterations)
                cribStats = calculateExactCribEV(discarded, possibleCutCards);
            }
        } else {
            // For 3/4 players
            cribStats = simulateCribMultiPlayer(discarded, possibleCutCards, numPlayers, 500);
        }

        // 3. Pegging Heuristic
        const peggingScore = kept.reduce((sum, c) => sum + (PEGGING_VALUES[c.rank] || 0.4), 0);

        // 4. Total EV
        // If Dealer: Hand + Crib + Pegging
        // If Not Dealer: Hand - Crib + Pegging (We want to minimize Crib)
        // Wait, "Total EV" usually means "My Points".
        // So If Not Dealer, Crib points = 0 (for me).
        // BUT, the strategy should penalize giving points.
        // I will return the raw Crib points, but the sorting logic (strategy) will handle the diff.

        let totalEV = handStats.avg + peggingScore;
        if (isDealer) {
            totalEV += cribStats.avg;
        } else {
            totalEV -= cribStats.avg;
        }

        results.push({
            kept,
            discarded,
            handStats,
            cribStats,
            peggingScore,
            totalExpectedValue: totalEV // This is purely display? No, let's make it the key metric.
            // Actually, for non-dealer, minimizing opponent crib is key.
            // A discard that gives me 10 hand points but gives opponent 20 crib points is BAD.
            // Versus a discard of 8 hand points giving opponent 2 crib points.
            // Net: -10 vs +6. 
            // So I should calculate Net Expected Benefit.
        });
    }

    // Sort by Net Benefit
    results.sort((a, b) => {
        const netA = getNetValue(a, isDealer);
        const netB = getNetValue(b, isDealer);
        return netB - netA; // Descending
    });

    return results;
}

function getNetValue(res: AnalysisResult, isDealer: boolean): number {
    if (isDealer) {
        return res.handStats.avg + res.cribStats.avg + res.peggingScore;
    } else {
        return res.handStats.avg - res.cribStats.avg + res.peggingScore;
    }
}

function calculateStats(hand: Card[], possibleCuts: Card[], isCrib: boolean): StatResult {
    let total = 0;
    let min = 999;
    let max = 0;
    const accum: ScoreBreakdown = { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0, total: 0 };

    for (const cut of possibleCuts) {
        const score = calculateScore(hand, cut, isCrib);
        total += score.total;
        if (score.total < min) min = score.total;
        if (score.total > max) max = score.total;

        accum.fifteens += score.fifteens;
        accum.pairs += score.pairs;
        accum.runs += score.runs;
        accum.flush += score.flush;
        accum.nobs += score.nobs;
    }

    const count = possibleCuts.length;
    return {
        min,
        max,
        avg: total / count,
        breakdown: {
            fifteens: accum.fifteens / count,
            pairs: accum.pairs / count,
            runs: accum.runs / count,
            flush: accum.flush / count,
            nobs: accum.nobs / count,
            total: total / count
        }
    };
}

function calculateExactCribEV(discarded: Card[], possibleCuts: Card[]): StatResult {
    let total = 0;
    const accum: ScoreBreakdown = { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0, total: 0 };
    let min = 999;
    let max = 0;
    let count = 0;

    // Iterate all Cut Cards
    for (let c = 0; c < possibleCuts.length; c++) {
        const cut = possibleCuts[c];

        // For opponent discards, we iterate all pairs from the *other* cards
        // To avoid creating arrays inside loops, we iterate indices.
        for (let i = 0; i < possibleCuts.length; i++) {
            if (i === c) continue;
            for (let j = i + 1; j < possibleCuts.length; j++) {
                if (j === c) continue;

                const opp1 = possibleCuts[i];
                const opp2 = possibleCuts[j];

                // Construct Crib Hand: 2 My Discards + 2 Opponent Discards
                const cribHand = [discarded[0], discarded[1], opp1, opp2];

                // Score it
                const score = calculateScore(cribHand, cut, true);

                total += score.total;
                if (score.total < min) min = score.total;
                if (score.total > max) max = score.total;

                accum.fifteens += score.fifteens;
                accum.pairs += score.pairs;
                accum.runs += score.runs;
                accum.flush += score.flush;
                accum.nobs += score.nobs;
                count++;
            }
        }
    }

    return {
        min, max, avg: total / count,
        breakdown: {
            fifteens: accum.fifteens / count,
            pairs: accum.pairs / count,
            runs: accum.runs / count,
            flush: accum.flush / count,
            nobs: accum.nobs / count,
            total: total / count
        }
    };
}

function simulateCrib2Player(discarded: Card[], possibleCuts: Card[], samples: number): StatResult {
    let total = 0;
    const accum: ScoreBreakdown = { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0, total: 0 };
    let min = 999, max = 0;

    for (let i = 0; i < samples; i++) {
        // Pick Cut
        const cutIdx = Math.floor(Math.random() * possibleCuts.length);
        const cut = possibleCuts[cutIdx];

        // Remaining deck for opponent
        const remaining = possibleCuts.filter((_, idx) => idx !== cutIdx);

        // Pick 2 Opponents
        const idx1 = Math.floor(Math.random() * remaining.length);
        let idx2 = Math.floor(Math.random() * remaining.length);
        while (idx2 === idx1) idx2 = Math.floor(Math.random() * remaining.length);

        const cribHand = [...discarded, remaining[idx1], remaining[idx2]];
        const score = calculateScore(cribHand, cut, true);

        total += score.total;
        if (score.total < min) min = score.total;
        if (score.total > max) max = score.total;

        accum.fifteens += score.fifteens;
        accum.pairs += score.pairs;
        accum.runs += score.runs;
        accum.flush += score.flush;
        accum.nobs += score.nobs;
    }

    return {
        min, max, avg: total / samples,
        breakdown: {
            fifteens: accum.fifteens / samples,
            pairs: accum.pairs / samples,
            runs: accum.runs / samples,
            flush: accum.flush / samples,
            nobs: accum.nobs / samples,
            total: total / samples
        }
    };
}

function simulateCribMultiPlayer(discarded: Card[], possibleCuts: Card[], numPlayers: number, samples: number): StatResult {
    // discarded is 1 card.
    // Need (4 - 1 = 3) random others.
    // (If 3 players: 1 disc + 1 opp1 + 1 opp2 + 1 deck? No, usually 1 from each play + 1 from deck).
    // Standard 3-player: Deal 5 cards each (15 total). 1 card to crib from each. 1 card from deck to crib. 
    // Crib = 3 discards + 1 deck + cut. = 5 cards.
    // Standard 4-player: Deal 5 cards each. 1 to crib from each.
    // Crib = 4 discards + cut. = 5 cards.

    // My logic assumes 5 cards in crib for calculation.
    let cardsNeeded = 4 - discarded.length; // usually 3

    let total = 0;
    const accum: ScoreBreakdown = { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0, total: 0 };
    let min = 999, max = 0;

    for (let i = 0; i < samples; i++) {
        const cutIdx = Math.floor(Math.random() * possibleCuts.length);
        const cut = possibleCuts[cutIdx];
        const remaining = possibleCuts.filter((_, idx) => idx !== cutIdx);

        const cribHand = [...discarded];
        // Pick 'cardsNeeded' random cards
        // Shuffle remaining? or just pick
        // Simple random pick without replacement
        const usedIndices = new Set<number>();
        while (cribHand.length < 4) {
            const idx = Math.floor(Math.random() * remaining.length);
            if (!usedIndices.has(idx)) {
                usedIndices.add(idx);
                cribHand.push(remaining[idx]);
            }
        }

        const score = calculateScore(cribHand, cut, true);
        total += score.total;
        if (score.total < min) min = score.total;
        if (score.total > max) max = score.total;

        accum.fifteens += score.fifteens;
        accum.pairs += score.pairs;
        accum.runs += score.runs;
        accum.flush += score.flush;
        accum.nobs += score.nobs;
    }
    return {
        min, max, avg: total / samples,
        breakdown: {
            fifteens: accum.fifteens / samples,
            pairs: accum.pairs / samples,
            runs: accum.runs / samples,
            flush: accum.flush / samples,
            nobs: accum.nobs / samples,
            total: total / samples
        }
    };
}
