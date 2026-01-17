import { determinePeggingCard, calculatePeggingScore } from './api/_utils/pegging';
import { parseCard, Card } from './api/_utils/logic';

console.log("=== Testing Pegging Logic ===");

function testScore(stackStr: string[], total: number, expectedPoints: number) {
    const stack = stackStr.map(c => parseCard(c));
    const score = calculatePeggingScore(stack, total);
    if (score.points === expectedPoints) {
        console.log(`PASS: Score for ${stackStr.join(',')} (Tot: ${total}) = ${score.points}`);
    } else {
        console.error(`FAIL: Score for ${stackStr.join(',')} (Tot: ${total}). Expected ${expectedPoints}, got ${score.points}`);
    }
}

function testBestCard(handStr: string[], stackStr: string[], total: number, expectedCardStr: string | null) {
    const hand = handStr.map(c => parseCard(c));
    const stack = stackStr.map(c => parseCard(c));

    const result = determinePeggingCard(hand, stack, total);

    const expected = expectedCardStr ? parseCard(expectedCardStr) : null;

    if (result.card === null && expected === null) {
        console.log(`PASS: Best card for ${handStr} | Stack: ${stackStr} is NULL (Go)`);
        return;
    }

    if (result.card && expected && result.card.rank === expected.rank && result.card.suit === expected.suit) {
        console.log(`PASS: Best card for ${handStr} | Stack: ${stackStr} is ${result.card.rank}${result.card.suit} (Score: ${result.score})`);
    } else {
        console.warn(`WARN/FAIL: Best card for ${handStr} | Stack: ${stackStr} is ${result.card?.rank}${result.card?.suit}, Expected ${expected?.rank}${expected?.suit}. Debug: ${result.debug}`);
    }
}

// 1. Scoring Tests
testScore(['5H', '10C'], 15, 2); // 15
testScore(['5H', '5D'], 10, 2); // Pair
testScore(['5H', '5D', '5S'], 15, 8); // Pair Royal (6) + 15 (2) = 8
testScore(['AH', '2D', '3C'], 6, 3); // Run of 3
testScore(['AH', '3D', '2C'], 6, 3); // Run of 3 (Mixed order)

// 2. Strategy Tests

// Scenario 1: Immediate 15
// Hand: 5H, 9C. Stack: 10D (Total 10). Should play 5H for 15 (2pts).
testBestCard(['5H', '9C'], ['10D'], 10, '5H');

// Scenario 2: Immediate 31
// Hand: AH, 2C. Stack: 10D, 10C, 10S (Total 30). Should play AH for 31 (2pts).
testBestCard(['AH', '2C'], ['10D', '10C', '10S'], 30, 'AH');

// Scenario 3: Pair
// Hand: 6C, 9C. Stack: 6D (Total 6). Should play 6C for Pair (2pts).
testBestCard(['6C', '9C'], ['6D'], 6, '6C');

// Scenario 4: Avoid 21?
// Hand: 10H, AC. Stack: 10C (Total 10).
// Play 10H -> 20 (Pair = 2pts). Heuristic += 2.
// Play AC -> 11. Heuristic ~ 0.
// Pair is definitely better.
testBestCard(['10H', 'AC'], ['10C'], 10, '10H');

// Scenario 5: Avoid 5 (Setup for 15)
// Hand: 2H, 8C. Stack: 3D (Total 3).
// Play 2H -> Total 5. Heuristic -= 2.
// Play 8C -> Total 11. Heuristic = 0.
// Should play 8C.
testBestCard(['2H', '8C'], ['3D'], 3, '8C');

// Scenario 6: Avoid 21 (Setup for 31)
// Hand: 10H, 9C. Stack: J (10), A (1) -> Total 11.
// Play 10H -> Total 21. Opponent drops 10 -> 31 (2pts). Bad.
// Play 9C -> Total 20. Safer.
testBestCard(['10H', '9C'], ['JD', 'AC'], 11, '9C');

// Scenario 7: Lead Pair Candidate
// Hand: 7H, 7D, 8C. Stack: Empty.
// Playing 7 is better than 8 because if opponent pairs 7, I can pair royal.
// 8 is single.
testBestCard(['7H', '7D', '8C'], [], 0, '7H'); // Or 7D


console.log("=== Tests Completed ===");
