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
    numPlayers: number
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
            // Simulation: Sample 100 random opponent discards (2 cards)
            // This is a trade-off for performance.
            cribStats = simulateCrib2Player(discarded, possibleCutCards, 50);
        } else {
            // For 3/4 players, simplified metric (just value of discarded card?)
            // Or assume random completions.
            // Let's do a very small sample sim.
            cribStats = simulateCribMultiPlayer(discarded, possibleCutCards, numPlayers, 20);
        }

        // 3. Pegging Heuristic
        const peggingScore = kept.reduce((sum, c) => sum + (PEGGING_VALUES[c.rank] || 0.4), 0);

        // 4. Total EV
        // If Dealer: Hand + Crib + Pegging
        // If Not Dealer: Hand - Crib + Pegging (We want to minimize Crib)
        // Wait, "Total EV" usually means "My Points".
        // So If Not Dealer, Crib EV doesn't add to MY score (it adds to Opp).
        // The user wants "Points I'm expecting to get".
        // So if Not Dealer, Crib points = 0 (for me).
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

function simulateCrib2Player(discarded: Card[], possibleCuts: Card[], samples: number): StatResult {
    // discarded is 2 cards.
    // Need 2 random others + cut.
    // We can't iterate all pairs of "others" (46*45/2 ~ 1000) * 44 cuts = 44,000 checks.
    // Actually, that's fine. It's fast enough. 44,000 basic calcs is roughly 50ms in V8.
    // Let's do full iteration if samples is high, or just random if we want super speed.
    // Let's try sampling to be safe.

    let total = 0;
    const accum: ScoreBreakdown = { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0, total: 0 };
    let min = 999, max = 0;

    // We iterate 'samples' times.
    // In each sample:
    // 1. Pick a Cut Card.
    // 2. Pick 2 "Opponent" Cards from remaining.
    // 3. Score.

    for (let i = 0; i < samples; i++) {
        // Pick Cut
        const cutIdx = Math.floor(Math.random() * possibleCuts.length);
        const cut = possibleCuts[cutIdx];

        // Remaining deck for opponent
        const remaining = possibleCuts.filter((_, idx) => idx !== cutIdx);

        // Pick 2 Opponents
        // Optimization: Just pick 2 random indices
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
