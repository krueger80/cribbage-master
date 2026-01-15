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
        if ((this.snapshot.phase as any) === 'gameover') return;

        const deck = this.snapshot.deck;
        const cutCard = deck.pop()!; // Simply take top for now

        let phase: GamePhase = 'pegging';
        // Check for "His Heels" (Jack as cut card = 2 points for dealer)
        if (cutCard.rank === 'J') {
            const dealer = this.snapshot.players.find(p => p.isDealer);
            if (dealer) {
                this.addPoints(dealer.id, 2);
            }
        }

        // Check again if game over after His Heels
        if ((this.snapshot.phase as any) === 'gameover') return;

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
        if ((state.phase as any) === 'gameover') return 'GAME_OVER';
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
        const scoreResult = this.calculatePeggingScore(newStack, newTotal);
        if (scoreResult.points > 0) {
            this.addPoints(playerId, scoreResult.points);
        }

        // 5. Update State
        // If game over, stop here (addPoints handles phase change)
        if ((this.snapshot.phase as any) === 'gameover') return 'GAME_OVER';

        this.updateState({
            players: [...state.players], // addPoints mutates object, we just emit new array reference
            currentPeggingTotal: newTotal === 31 ? 0 : newTotal, // Reset if 31
            peggingStack: newTotal === 31 ? [] : newStack, // Clear stack if 31
            turnPlayerId: this.getNextPlayerId(playerId),
            lastPeggingScore: scoreResult.points > 0 ? {
                points: scoreResult.points,
                description: scoreResult.breakdown.join(', '),
                playerId
            } : null
        });

        // Clear the score message after a delay
        if (scoreResult.points > 0) {
            setTimeout(() => {
                // ... (existing logic)
            }, 2000);
        }

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
        if ((this.snapshot.phase as any) === 'gameover') return;
        this.updateState({
            phase: 'counting',
            countingStage: 'non_dealer_hand'
        });

        // Start with Non-Dealer Hand
        this.processCurrentCountingStage();
    }

    private processCurrentCountingStage() {
        // If game is over, do nothing
        if ((this.snapshot.phase as any) === 'gameover') return;

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
            if (scoreBreakdown.total > 0) {
                this.addPoints(playerToScore.id, scoreBreakdown.total);
            }

            // Check win condition again before updating UI to show breakdown
            if ((this.snapshot.phase as any) === 'gameover') return;

            this.updateState({
                countingScoreBreakdown: scoreBreakdown,
                players: [...state.players]
            });
        }

        this.checkAutoCount();
    }

    advanceCountingStage() {
        if ((this.snapshot.phase as any) === 'gameover') return;

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
        return;
    }

    sayGo(playerId: string) {
        if ((this.snapshot.phase as any) === 'gameover') return;

        // Opponent gets 1 point
        const state = this.snapshot;
        const opponentId = this.getNextPlayerId(playerId);
        const opponent = state.players.find(p => p.id === opponentId);

        if (opponent) {
            this.addPoints(opponent.id, 1);
        }

        if ((this.snapshot.phase as any) === 'gameover') return;

        this.updateState({
            players: [...state.players],
            currentPeggingTotal: 0,
            peggingStack: [],
            turnPlayerId: playerId, // Player who said Go leads next round
            lastPeggingScore: opponent ? {
                points: 1,
                description: 'Go for 1',
                playerId: opponent.id
            } : null
        });

        this.checkAutoPlay();
        this.checkForPeggingFinished();
    }

    private calculatePeggingScore(stack: any[], total: number): { points: number, breakdown: string[] } {
        let points = 0;
        const breakdown: string[] = [];

        if (total === 15) {
            points += 2;
            breakdown.push('15 for 2');
        }
        if (total === 31) {
            points += 2;
            breakdown.push('31 for 2');
        }

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
                const pairPoints = n * (n - 1);
                points += pairPoints;
                const labels = ['', 'Pair', 'Pair Royal', 'Double Pair Royal'];
                breakdown.push(`${labels[matches] || 'Pairs'} for ${pairPoints}`);
            }
        }

        // Runs
        for (let k = stack.length; k >= 3; k--) {
            const lastK = stack.slice(stack.length - k).map(item => item.card);
            if (isRun(lastK)) {
                points += k;
                breakdown.push(`Run of ${k} for ${k}`);
                break;
            }
        }
        return { points, breakdown };
    }

    private addPoints(playerId: string, points: number) {
        if (points <= 0) return;

        const state = this.snapshot;
        // Do not add points if game is already over
        if (state.phase === 'gameover') return;

        const player = state.players.find(p => p.id === playerId);
        if (!player) return;

        player.score += points;

        // Win Condition
        if (player.score >= 121) {
            this.updateState({
                phase: 'gameover',
                winnerId: playerId,
                players: [...state.players] // Trigger update
            });
        }

        // Note: We don't call updateState here for just score unless we want to trigger discrete partial updates,
        // but usually the caller calls updateState. However, since 'players' is an array of objects, mutating 'player.score'
        // mutates the object inside the array. 
        // We should ensure callers call updateState to emit the new state.
        // Or we can call it here. Let's rely on callers for now to bundle updates, except for gameover.
    }

    restartGame() {
        this.initGame(['Player 1', 'CPU']);
    }

    private getNextPlayerId(currentId: string): string {
        const players = this.snapshot.players;
        const idx = players.findIndex(p => p.id === currentId);
        return players[(idx + 1) % players.length].id;
    }
}
