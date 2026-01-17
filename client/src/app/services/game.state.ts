import { Card, ScoreBreakdown } from '../logic/cards';

export type GamePhase = 'setup' | 'dealing' | 'discarding' | 'cutting' | 'pegging' | 'counting' | 'gameover';
export type CountingStage = 'none' | 'non_dealer_hand' | 'dealer_hand' | 'crib';

export interface Player {
    id: string;
    name: string;
    isHuman: boolean;
    score: number;
    // hand: Card[]; // Removed in favor of 'cards'

    // Cards kept for pegging (subset of hand not yet played)
    // Or we just track 'hand' as cards remaining? 
    // Usually 'hand' is what you hold. When you play, it leaves your hand.
    // But for 'counting' phase, we need to know what the full hand was (minus discards).
    // So maybe we have 'hand' (current holding) and 'playedCards' (for history/display).
    // Actually, in Cribbage, you put the card on the table but you 'keep' it for the counting phase.
    // So let's have 'hand' be the full 4 cards, and 'playedIndices' or just a boolean flag on cards?
    // Or just 'peggingHand' vs 'countingHand'.
    // Let's use:
    cards: Card[]; // The 4 cards held for the round
    playedCards: Card[]; // Cards that have been placed on the board this round
    hasSaidGo?: boolean;
    isDealer: boolean;
}

export interface PeggingEntry {
    card: Card;
    playerId: string;
}

export interface GameState {
    phase: GamePhase;
    players: Player[];
    crib: Card[];
    cutCard: Card | null;

    // Pegging State
    peggingStack: PeggingEntry[]; // Cards played in current "to 31" sequence
    peggingHistory: PeggingEntry[][]; // Previous 31 sequences in this hand (for display)
    currentPeggingTotal: number;

    // Counting State
    countingStage: CountingStage;
    countingScoreBreakdown: ScoreBreakdown | null;
    countingReady?: { [playerId: string]: boolean };

    // Transient UI State
    lastPeggingScore: { points: number; description: string; playerId: string } | null;

    turnPlayerId: string;
    deck: Card[]; // Hidden state, but present for local engine
    winnerId: string | null;

    // Multiplayer State
    isMultiplayer: boolean;
    gameId?: string;
    localPlayerId?: string; // 'p1' or 'p2' (or auth ID?) -> For logic mapping
}

export const INITIAL_GAME_STATE: GameState = {
    phase: 'setup',
    players: [],
    crib: [],
    cutCard: null,
    peggingStack: [],
    peggingHistory: [],
    currentPeggingTotal: 0,
    countingStage: 'none',
    countingScoreBreakdown: null,
    lastPeggingScore: null,
    turnPlayerId: '',
    deck: [],
    winnerId: null,
    isMultiplayer: false
};
