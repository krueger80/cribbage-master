import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameState, INITIAL_GAME_STATE, Player, GamePhase } from './game.state';
import { Card, getAllCards, createCard, calculateScore, isRun } from '../logic/cards';

@Injectable({
    providedIn: 'root'
})
export class GameService {

    private _state = new BehaviorSubject<GameState>(JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));

    constructor() { }

    get state$(): Observable<GameState> {
        return this._state.asObservable();
    }

    get snapshot(): GameState {
        return this._state.value;
    }

    // Actions
    initGame(playerNames: string[] = ['Player 1', 'CPU']) {
        const players: Player[] = playerNames.map((name, idx) => ({
            id: `p${idx + 1}`,
            name,
            isHuman: idx === 0, // Assumption for now
            score: 0,
            cards: [],
            playedCards: [],
            isDealer: idx === 0
        }));

        this.updateState({
            ...INITIAL_GAME_STATE,
            players,
            phase: 'dealing'
        });

        this.dealRound();
    }

    private updateState(newState: Partial<GameState>) {
        this._state.next({ ...this._state.value, ...newState });
    }

    private dealRound() {
        const deck = this.shuffle(getAllCards());
        const players = this.snapshot.players;

        // reset hands
        players.forEach(p => {
            p.cards = [];
            p.playedCards = [];
        });

        // Deal 6 cards each (for 2 players)
        // TODO: Dynamic dealing for 3-4 players
        for (let i = 0; i < 6; i++) {
            players.forEach(p => {
                if (deck.length > 0) p.cards.push(deck.pop()!);
            });
        }

        this.updateState({
            deck,
            players,
            phase: 'discarding',
            crib: [],
            cutCard: null,
            peggingStack: [],
            peggingHistory: [],
            currentPeggingTotal: 0
        });

        this.checkAutoPlay();
    }

    nextRound() {
        const state = this.snapshot;
        const currentDealerIndex = state.players.findIndex(p => p.isDealer);
        const nextDealerIndex = (currentDealerIndex + 1) % state.players.length;

        const players = state.players.map((p, idx) => ({
            ...p,
            isDealer: idx === nextDealerIndex,
            cards: [],
            playedCards: []
        }));

        this.updateState({
            players,
            phase: 'dealing',
            crib: [],
            cutCard: null,
            peggingStack: [],
            peggingHistory: [],
            currentPeggingTotal: 0
        });

        this.dealRound();
    }

    discard(playerId: string, cardIndices: number[]) {
        const players = this.snapshot.players;
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        // Move cards to crib
        // Indices are 0-based index in player.cards
        // We sort descending to ensure we remove correct cards if we were removing them one by one?
        // But here we filter based on index inclusion.
        const discards = cardIndices.map(i => player.cards[i]);
        player.cards = player.cards.filter((_, i) => !cardIndices.includes(i));

        const currentCrib = this.snapshot.crib;
        this.updateState({
            crib: [...currentCrib, ...discards],
            players: [...players] // trigger update
        });

        // Check if all players have discarded
        const allReady = players.every(p => p.cards.length === 4);
        if (allReady) {
            this.cutDeck();
        } else {
            this.checkAutoPlay();
        }
    }

    private checkAutoPlay() {
        const state = this.snapshot;
        if (state.phase === 'discarding') {
            const cpu = state.players.find(p => !p.isHuman);
            if (cpu && cpu.cards.length > 4) {
                // CPU hasn't discarded yet.
                // Simple strategy: Discard first 2 cards.
                setTimeout(() => {
                    const s = this.snapshot;
                    // Check if still discarding and CPU still has cards
                    const c = s.players.find(p => p.id === cpu.id);
                    if (s.phase === 'discarding' && c && c.cards.length > 4) {
                        this.discard(c.id, [0, 1]);
                    }
                }, 1000); // 1s delay for realism
            }
        } else if (state.phase === 'pegging') {
            const turnPlayer = state.players.find(p => p.id === state.turnPlayerId);
            if (turnPlayer && !turnPlayer.isHuman) {
                // CPU Turn to Peg
                setTimeout(() => {
                    // Refresh state in case it changed
                    const s = this.snapshot;
                    if (s.phase !== 'pegging') return;

                    const cpu = s.players.find(p => p.id === s.turnPlayerId);
                    if (!cpu || cpu.isHuman) return;

                    // Find valid card
                    // Simple strategy: Play highest possible card <= 31 limit?
                    // Or lowest? Let's just play FIRST valid card for now.
                    let validCardIndex = -1;
                    for (let i = 0; i < cpu.cards.length; i++) {
                        if (s.currentPeggingTotal + cpu.cards[i].value <= 31) {
                            validCardIndex = i;
                            break;
                        }
                    }

                    if (validCardIndex !== -1) {
                        this.playCard(cpu.id, validCardIndex);
                    } else {
                        // Cannot play
                        this.sayGo(cpu.id);
                    }
                }, 1000);
            }
        }
    }


    private cutDeck() {
        const deck = this.snapshot.deck;
        const cutCard = deck.pop()!; // Simply take top for now

        let phase: GamePhase = 'pegging';
        // Check for "His Heels" (Jack as cut card = 2 points for dealer)
        if (cutCard.rank === 'J') {
            const dealer = this.snapshot.players.find(p => p.isDealer);
            if (dealer) {
                dealer.score += 2;
            }
        }

        this.updateState({
            cutCard,
            phase,
            deck: deck, // updated deck
            turnPlayerId: this.getNextPlayerId(this.snapshot.players.find(p => p.isDealer)!.id)
        });

        this.checkAutoPlay();
    }

    // Utility
    private shuffle(cards: Card[]): Card[] {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return cards;
    }

    playCard(playerId: string, cardIndex: number): string {
        const state = this.snapshot;
        if (state.phase !== 'pegging') return 'INVALID_PHASE';
        if (state.turnPlayerId !== playerId) return 'NOT_YOUR_TURN';

        const player = state.players.find(p => p.id === playerId);
        if (!player) return 'PLAYER_NOT_FOUND';

        const card = player.cards[cardIndex];
        if (!card) return 'CARD_NOT_FOUND';

        // Check if move is valid (total <= 31)
        if (state.currentPeggingTotal + card.value > 31) {
            return 'TOTAL_OVER_31';
        }

        // Execute Play
        // 1. Remove from hand
        const newHand = player.cards.filter((_, i) => i !== cardIndex);

        // 2. Add to played cards
        const newPlayedReceived = [...player.playedCards, card];
        state.players = state.players.map(p => p.id === playerId ? { ...p, cards: newHand, playedCards: newPlayedReceived } : p);

        // 3. Update Stack
        const newStackItem = { card, playerId };
        const newStack = [...state.peggingStack, newStackItem];
        const newTotal = state.currentPeggingTotal + card.value;

        // 4. Score
        const points = this.calculatePeggingScore(newStack, newTotal);
        if (points > 0) {
            const p = state.players.find(p => p.id === playerId);
            if (p) p.score += points;
        }

        // 5. Update State
        this.updateState({
            players: [...state.players],
            currentPeggingTotal: newTotal === 31 ? 0 : newTotal, // Reset if 31
            peggingStack: newTotal === 31 ? [] : newStack, // Clear stack if 31
            turnPlayerId: this.getNextPlayerId(playerId)
        });

        this.checkAutoPlay();
        this.checkForPeggingFinished();
        return 'SUCCESS';
    }

    private checkForPeggingFinished() {
        const state = this.snapshot;
        if (state.phase !== 'pegging') return;

        // Check if ALL players are out of cards
        const allDone = state.players.every(p => p.cards.length === 0);
        if (allDone) {
            console.log('Pegging Finished. Starting Counting Phase.');
            this.countHands();
        }
    }

    private countHands() {
        this.updateState({
            phase: 'counting',
            countingStage: 'non_dealer_hand'
        });

        // Start with Non-Dealer Hand
        this.processCurrentCountingStage();
    }

    private processCurrentCountingStage() {
        const state = this.snapshot;
        const dealerIndex = state.players.findIndex(p => p.isDealer);
        const nonDealerIndex = (dealerIndex + 1) % state.players.length;
        const cutCard = state.cutCard;

        let scoreBreakdown = null;
        let points = 0;
        let playerToScore: Player | null = null;
        let nextStage: 'dealer_hand' | 'crib' | 'none' = 'none';

        if (state.countingStage === 'non_dealer_hand') {
            const nonDealer = state.players[nonDealerIndex];
            // Use playedCards because those are the cards they had (cards is empty after pegging usually? 
            // wait, playCard logic removed them from 'cards' and moved to 'playedCards'. Yes.)
            scoreBreakdown = calculateScore(nonDealer.playedCards, cutCard, false);
            points = scoreBreakdown.total;
            playerToScore = nonDealer;
            console.log(`${nonDealer.name} Hand Score: ${points}`);

        } else if (state.countingStage === 'dealer_hand') {
            const dealer = state.players[dealerIndex];
            scoreBreakdown = calculateScore(dealer.playedCards, cutCard, false);
            points = scoreBreakdown.total;
            playerToScore = dealer;
            console.log(`${dealer.name} Hand Score: ${points}`);

        } else if (state.countingStage === 'crib') {
            const dealer = state.players[dealerIndex];
            scoreBreakdown = calculateScore(state.crib, cutCard, true);
            points = scoreBreakdown.total;
            playerToScore = dealer;
            console.log(`${dealer.name} Crib Score: ${points}`);
        }

        if (playerToScore && scoreBreakdown) {
            // Apply score IMMEDIATELY (so user sees "Oh I got points!")
            // But UI will show Breakdown
            if (scoreBreakdown.total > 0) {
                playerToScore.score += scoreBreakdown.total;
            }

            this.updateState({
                countingScoreBreakdown: scoreBreakdown,
                players: [...state.players]
            });
        }

        this.checkAutoCount();
    }

    advanceCountingStage() {
        const state = this.snapshot;
        let nextStage: any = 'none';

        if (state.countingStage === 'non_dealer_hand') {
            nextStage = 'dealer_hand';
        } else if (state.countingStage === 'dealer_hand') {
            nextStage = 'crib';
        } else if (state.countingStage === 'crib') {
            // End of round
            this.nextRound();
            return;
        }

        this.updateState({
            countingStage: nextStage,
            countingScoreBreakdown: null
        });
        this.processCurrentCountingStage();
    }

    private checkAutoCount() {
        // Disable auto-advance for now. User must click Next.
        // This allows user to review CPU hands and scores at their own pace.
        return;

        /* 
        const state = this.snapshot;
        if (state.phase !== 'counting') return;

        // Determine whose show it is
        const dealerIndex = state.players.findIndex(p => p.isDealer);
        const nonDealerIndex = (dealerIndex + 1) % state.players.length;

        let isCpuShow = false;

        if (state.countingStage === 'non_dealer_hand') {
            isCpuShow = !state.players[nonDealerIndex].isHuman;
        } else if (state.countingStage === 'dealer_hand' || state.countingStage === 'crib') {
            isCpuShow = !state.players[dealerIndex].isHuman;
        }

        // Strategy:
        // If it's CPU's show, we wait a bit then auto-advance (player just watches).
        // If it's Human's show, we wait for Human to click "Next".
        // BUT, Human might want to read CPU's breakdown too.
        // So let's NOT auto-advance even for CPU, 
        // OR make the delay long enough (e.g. 4s) but allow user to click Next to skip.
        // Let's go with Long Delay + Auto-Advance for CPU.

        if (isCpuShow) {
            setTimeout(() => {
                // Ensure we are still in same stage (user didn't click next already)
                const currentStage = this.snapshot.countingStage;
                // Assuming we check 'currentStage' matched what we started with... 
                // But simplified: just call advance if phase is counting.
                if (this.snapshot.phase === 'counting' && this.snapshot.countingStage === state.countingStage) {
                    this.advanceCountingStage();
                }
            }, 3000);
        }
        */
    }

    sayGo(playerId: string) {
        // Opponent gets 1 point
        const state = this.snapshot;
        const opponentId = this.getNextPlayerId(playerId);
        const opponent = state.players.find(p => p.id === opponentId);

        if (opponent) {
            opponent.score += 1;
        }

        // Reset count and stack for new run (simplified GO logic specific for 2 player passing)
        // In real cribbage, if P1 says Go, P2 keeps playing if they can.
        // If neither can play, reset.
        // For MVP/Test, we'll assume a "Go" forces a reset after point award if we stick to strict 2-player simple flow,
        // but let's just implement the scoring for now.
        // NOTE: We MUST rotate the turn or reset the round to avoid hanging state where user says Go but it's still their turn.
        // Reset count to 0. The player who said Go starts the new count (because opponent got the Point)
        // Correct logic: Opponent scored 1 point for "last card" (implied by Go).
        // Therefore, the *other* player (the one who said Go) starts the new sequence.

        this.updateState({
            players: [...state.players],
            currentPeggingTotal: 0,
            peggingStack: [],
            turnPlayerId: playerId // Player who said Go leads next round
        });

        this.checkAutoPlay();
        this.checkForPeggingFinished();
    }

    private calculatePeggingScore(stack: any[], total: number): number {
        let points = 0;
        if (total === 15) points += 2;
        if (total === 31) points += 2;

        // Pairs
        if (stack.length > 1) {
            let matches = 0;
            const targetRank = stack[stack.length - 1].card.rank;
            for (let i = stack.length - 2; i >= 0; i--) {
                if (stack[i].card.rank === targetRank) {
                    matches++;
                } else {
                    break;
                }
            }
            if (matches > 0) {
                const n = matches + 1; // Total cards in tuple
                points += n * (n - 1);
            }
        }

        // Runs
        for (let k = stack.length; k >= 3; k--) {
            const lastK = stack.slice(stack.length - k).map(item => item.card);
            if (isRun(lastK)) {
                points += k;
                break;
            }
        }
        return points;
    }

    private getNextPlayerId(currentId: string): string {
        const players = this.snapshot.players;
        const idx = players.findIndex(p => p.id === currentId);
        return players[(idx + 1) % players.length].id;
    }
}
