export type Suit = 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
    rank: Rank;
    suit: Suit;
    value: number; // 1-10 (For 15s)
    order: number; // 1-13 (For runs)
}

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];

export function createCard(rank: Rank, suit: Suit): Card {
    const order = RANKS.indexOf(rank) + 1;
    let value = order;
    if (order > 10) value = 10;
    return { rank, suit, value, order };
}

export function parseCard(input: string): Card {
    // Input e.g. "5H", "10D", "QC"
    const suit = input.slice(-1) as Suit;
    const rank = input.slice(0, -1) as Rank;
    if (!SUITS.includes(suit) || !RANKS.includes(rank)) {
        throw new Error(`Invalid card code: ${input}`);
    }
    return createCard(rank, suit);
}

export function getAllCards(): Card[] {
    const deck: Card[] = [];
    for (const s of SUITS) {
        for (const r of RANKS) {
            deck.push(createCard(r, s));
        }
    }
    return deck;
}

// Scoring Logic
export interface ScoreBreakdown {
    fifteens: number;
    pairs: number;
    runs: number;
    flush: number;
    nobs: number;
    total: number;
}

function combinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];
    const [first, ...rest] = arr;
    const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
    const withoutFirst = combinations(rest, k);
    return [...withFirst, ...withoutFirst];
}

export function calculateScore(hand: Card[], cutCard: Card | null = null, isCrib: boolean = false): ScoreBreakdown {
    const fullHand = cutCard ? [...hand, cutCard] : [...hand];
    const score: ScoreBreakdown = { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0, total: 0 };

    // 15s
    // Check all combinations of 2, 3, 4, 5 cards
    for (let k = 2; k <= 5; k++) {
        for (const combo of combinations(fullHand, k)) {
            if (combo.reduce((sum, c) => sum + c.value, 0) === 15) {
                score.fifteens += 2;
            }
        }
    }

    // Pairs
    for (const combo of combinations(fullHand, 2)) {
        if (combo[0].order === combo[1].order) {
            score.pairs += 2;
        }
    }

    // Runs
    // Sort by order
    const sorted = [...fullHand].sort((a, b) => a.order - b.order);
    let maxMultiplier = 1;
    let currentRunLength = 1; // Length of CONSISTENT run (e.g. 3,4,5 is 3)
    // We need to find the longest run, and allow for multipliers.
    // Instead of complex logic, just check for runs of length 5, then 4, then 3.
    // Optimization: If a run of 5 exists, we add 5. If not, check 4s, etc.
    let runFound = false;

    // Check for runs, starting from the full hand size down to 3
    for (let k = fullHand.length; k >= 3; k--) {
        const runs = combinations(fullHand, k).filter(isRun);
        if (runs.length > 0) {
            score.runs += k * runs.length;
            break; // Found max length runs, stop.
        }
    }

    // Flush
    // Hand: 4 cards of same suit -> 4 points. If cut card matches -> 5 points.
    // Crib: Must be 5 cards (hand + cut) of same suit -> 5 points.
    let flushPoints = 0;
    const handSuits = hand.map(c => c.suit);
    const allSameSuit = hand.length >= 4 && handSuits.every(s => s === handSuits[0]);

    if (!isCrib && allSameSuit) {
        flushPoints = 4;
        if (cutCard && cutCard.suit === handSuits[0]) {
            flushPoints = 5;
        }
    }
    if (isCrib && allSameSuit && cutCard && cutCard.suit === handSuits[0]) {
        flushPoints = 5;
    }
    score.flush = flushPoints;

    // Nobs
    if (cutCard) {
        const jacks = hand.filter(c => c.rank === 'J' && c.suit === cutCard.suit);
        if (jacks.length > 0) {
            score.nobs += 1;
        }
    }

    score.total = score.fifteens + score.pairs + score.runs + score.flush + score.nobs;
    return score;
}

export function isRun(cards: Card[]): boolean {
    if (cards.length < 3) return false;
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1].order !== sorted[i].order + 1) {
            return false;
        }
    }
    return true;
}
