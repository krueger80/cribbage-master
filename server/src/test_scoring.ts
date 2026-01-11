import { calculateScore, parseCard, Card } from './logic';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

function testScoring() {
    console.log("Testing Scoring Logic...");

    // Test 1: Simple Pair
    // 5H, 5D, 6C, 7S
    let hand = [parseCard('5H'), parseCard('5D'), parseCard('6C'), parseCard('7S')];
    let score = calculateScore(hand, null, false);
    // Pair: 2pts (5,5)
    // 15s: 0
    // Runs: 0? No, 5,6,7 is run of 3.
    // 5+5+6+7 = 23.
    assert(score.pairs === 2, "Simple Pair check");
    assert(score.runs === 6, `Double run check (Expected 6, Got ${score.runs})`);
    // 5H, 6C, 7S = Run (3)
    // 5D, 6C, 7S = Run (3)
    // Total Runs = 6. Correct.
    assert(score.fifteens === 0, "No 15s check");

    // Test 2: Double Double Run
    // 4, 5, 5, 6, 6
    hand = [parseCard('4H'), parseCard('5D'), parseCard('5S'), parseCard('6C')];
    let cut = parseCard('6D');
    score = calculateScore(hand, cut, false);
    // 15s: 
    // 4+5+6 = 15. How many combos?
    // 4 + 5D + 6C = 15
    // 4 + 5D + 6D = 15
    // 4 + 5S + 6C = 15
    // 4 + 5S + 6D = 15
    // Total 15s = 8 pts.
    assert(score.fifteens === 8, "Double Double Run 15s");

    // Pairs:
    // 5,5 = 2
    // 6,6 = 2
    // Total Pairs = 4 pts.
    assert(score.pairs === 4, "Double Double Run Pairs");

    // Runs:
    // 4,5D,6C
    // 4,5D,6D
    // 4,5S,6C
    // 4,5S,6D
    // 4 runs of 3 = 12 pts.
    assert(score.runs === 12, "Double Double Run Runs");

    // Total should be 8 + 4 + 12 = 24.
    assert(score.total === 24, "Double Double Run Total");

    // Test 3: Flush
    // Hand: 2H, 4H, 6H, 8H. Cut: 10H.
    // Score: 5.
    hand = [parseCard('2H'), parseCard('4H'), parseCard('6H'), parseCard('8H')];
    cut = parseCard('10H');
    score = calculateScore(hand, cut, false);
    assert(score.flush === 5, "Flush (5) check");

    // Hand Flush (Cut diff suit)
    cut = parseCard('10S');
    score = calculateScore(hand, cut, false);
    assert(score.flush === 4, "Flush (4) check");

    // Crib Flush (Hand 4 suit, Cut diff) -> 0
    score = calculateScore(hand, cut, true);
    assert(score.flush === 0, "Crib Flush (0) check");

    // Test 4: Nobs
    // Hand: J(H). Cut 5(H).
    hand = [parseCard('JH'), parseCard('10S'), parseCard('10C'), parseCard('10D')];
    cut = parseCard('5H');
    score = calculateScore(hand, cut, false);
    assert(score.nobs === 1, "Nobs check");

    // 15s: J+5 = 15 (2pts).
    // Pairs: 10,10,10 -> 3 pairs (6pts).
    // Total = 2 + 6 + 1 = 9.
    assert(score.total === 15, "Nobs Hand Total");

    console.log("All Scoring Tests Passed!");
}

testScoring();
