import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameState, INITIAL_GAME_STATE, Player, GamePhase } from './game.state';
import { Card, getAllCards, createCard, calculateScore, isRun } from '../logic/cards';
import { SupabaseService } from './supabase.service';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class GameService {

    private _state = new BehaviorSubject<GameState>(JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));
    private _lastProcessedScoreId = 0;
    private _cpuCutTimeout: any;

    constructor(private supabase: SupabaseService, private api: ApiService) { }

    get state$(): Observable<GameState> {
        return this._state.asObservable();
    }

    get snapshot(): GameState {
        return this._state.value;
    }

    // Actions
    initGame(playerNames: string[] = ['Player 1', 'CPU']) {
        const user = this.supabase.currentUserSnapshot;
        const p1Name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || playerNames[0];

        const players: Player[] = [
            {
                id: 'p1',
                name: p1Name,
                isHuman: true,
                score: 0,
                cards: [],
                playedCards: [],
                isDealer: false // Determined by cut
            },
            {
                id: 'p2',
                name: playerNames[1], // CPU
                isHuman: false,
                score: 0,
                cards: [],
                playedCards: [],
                isDealer: false // Determined by cut
            }
        ];

        // Draw a fresh deck for the cut
        const deck = getAllCards();
        // Shuffle deck
        deck.sort(() => Math.random() - 0.5);

        this.updateState({
            ...INITIAL_GAME_STATE,
            players,
            deck,
            phase: 'cut_for_deal',
            cutForDealCards: {}, // Initialize empty
            isMultiplayer: false
        });

        // In this phase, anyone can cut.
        // Trigger CPU cut after delay if Single Player
        if (!this.snapshot.isMultiplayer) {
            this._cpuCutTimeout = setTimeout(() => this.performCutForDeal('p2'), 1500);
        }
    }

    performCutForDeal(playerId: string) {
        const state = this.snapshot;
        if (state.phase !== 'cut_for_deal') return;
        if (state.cutForDealCards && state.cutForDealCards[playerId]) return; // Already cut

        const deck = [...state.deck];
        const randomIndex = Math.floor(Math.random() * deck.length);
        const card = deck.splice(randomIndex, 1)[0];

        const newCutCards = { ...state.cutForDealCards, [playerId]: card };

        this.updateState({
            ...state,
            deck,
            cutForDealCards: newCutCards
        });

        // Check completion
        if (Object.keys(newCutCards).length === state.players.length) {
            setTimeout(() => this.resolveCutForDeal(), 2000);
        }
    }

    private resolveCutForDeal() {
        const state = this.snapshot;
        const cuts = state.cutForDealCards || {};
        const p1Card = cuts['p1'];
        const p2Card = cuts['p2'];

        // Rank Value: A=1, 2=2 ... K=13. 
        // Need helper for rank value? 
        // Card.value is 10 for Face cards. We need Rank ORDER.
        // "A" "2" "3" "4" "5" "6" "7" "8" "9" "10" "J" "Q" "K"
        const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const getRankVal = (c: Card) => rankOrder.indexOf(c.rank);

        const v1 = getRankVal(p1Card);
        const v2 = getRankVal(p2Card);

        if (v1 === v2) {
            // Tie - Redraw
            // Reset cuts but keep current state message?
            // Maybe clear and restart
            // Need to notify UI about Tie?
            // For now, just reset cutForDealCards to {} and refill deck? 
            // Or keep deck depleted? Usually depleted is fine unless empty.

            // To be simple: Reset
            console.log('Tie for Deal! Redrawing...');

            // Re-trigger CPU
            if (!state.isMultiplayer) {
                setTimeout(() => this.performCutForDeal('p2'), 1500);
            }

            this.updateState({
                ...state,
                cutForDealCards: {} // Clear cuts
            });
            return;
        }

        const winnerId = v1 < v2 ? 'p1' : 'p2';

        // Update Dealer
        const players = state.players.map(p => ({
            ...p,
            isDealer: p.id === winnerId
        }));

        this.updateState({
            ...state,
            players,
            // Phase transition handled in dealRound? No, dealRound sets 'dealing'.
            // But we want to show the result for a moment.
            // Let's transition to dealing.
        });

        this.dealRound();
    }

    initMultiplayerGame(gameId: string, isHost: boolean) {
        // Reset state
        // Subscribe to game updates
        clearTimeout(this._cpuCutTimeout); // Cancel any pending CPU cut

        this.supabase.subscribeToGame(gameId).subscribe(newState => {
            if (newState && newState.state) {
                console.log('Received Remote State:', newState.state);
                this.setRemoteState(newState.state);
            }
        });

        if (isHost) {
            // Host initializes the actual game logic state
            // Host init

            // If the state is already setup (cards dealt etc), we might not want to reset it?
            // In createGame(), we called initGame() then createGame() then initMultiplayerGame(true).
            // initGame already dealt cards.

            // So if we are host, we just need to ensure the players array has the correct IDs and flags
            const currentPlayers = this.snapshot.players;

            // Ensure IDs match our convention if they don't already
            // P1 is me (Host), P2 is Guest.

            // When initGame ran, it set players as p1, p2 etc.
            // But it set isHuman based on idx.

            const players = currentPlayers.map((p, idx) => ({
                ...p,
                isHuman: true, // Force all human for now in multiplayer
                id: idx === 0 ? 'p1' : 'p2',
                // Keep existing name if set, otherwise fallback
                name: p.name
            }));

            const initialState: GameState = {
                ...this.snapshot,
                players,
                isMultiplayer: true,
                gameId,
                localPlayerId: 'p1'
            };

            this.updateState(initialState);
            // We do NOT call dealRound() again here because initGame() already did it.
            // If we do, we might overwrite the state we just saved to DB or cause sync issues.
            // Actually, in LobbyComponent we called createGame with the snapshot. THEN we call this.
            // So the DB has the state from BEFORE we added gameId/isMultiplayer flags.
            // We need to update the DB with these new flags.
            this.supabase.updateGameState(gameId, initialState);
        } else {
            // Guest init
            // Guest init - DO NOT push state yet.
            // Just set local ID and wait for first sync or fetch.
            this._state.next({
                ...INITIAL_GAME_STATE,
                isMultiplayer: true,
                gameId,
                localPlayerId: 'p2'
            });
            // Fetch current state immediately to sync up
            this.supabase.getGameState(gameId).then(state => {
                if (state) this.setRemoteState(state);
            });
        }
    }

    // Receive state from Supabase
    setRemoteState(remoteState: GameState) {
        const localId = this._state.value.localPlayerId; // Keep our ID
        const newState = { ...remoteState, localPlayerId: localId };

        // Reset local counting finish flag if we are no longer in counting phase
        // This ensures that for the NEXT round, we don't auto-ready ourselves
        if (newState.phase !== 'counting') {
            this._localCountingFinished = false;
        }

        // --- ROBUST SCORING NOTIFICATION ---
        // If the new state has a score we haven't seen yet, show it locally.
        if (newState.lastPeggingScore && newState.lastPeggingScore.id > this._lastProcessedScoreId) {
            this._lastProcessedScoreId = newState.lastPeggingScore.id;
            console.log('[Game] New score received:', newState.lastPeggingScore);

            // It will be shown because we apply 'newState' below.
            // But we must schedule a LOCAL hiding of it.
            setTimeout(() => {
                // Check if the current visible score is still the one we just showed (id check)
                // If the user played fast, they might have shown a NEW score already.
                const current = this._state.value.lastPeggingScore;
                if (current && current.id === newState.lastPeggingScore?.id) {
                    this.updateState({ lastPeggingScore: null }, false); // False = Local only
                }
            }, 2500);
        }

        // --- TURN ROBUSTNESS (Auto-Correction) ---
        // If it's pegging, check if the player whose turn it is CAN actually play.
        // If not, and I am that player (or maybe anyone?), we should probably correct it?
        // Ideally, the HOST detects this mismatch and pushes a fix.
        if (newState.phase === 'pegging' && newState.players) {
            const turnPlayer = newState.players.find(p => p.id === newState.turnPlayerId);
            const currentTotal = newState.currentPeggingTotal;

            // Simple check: Does turnPlayer have cards < 31-total?
            // If they have NO cards, or all cards > limit, they can't play.
            if (turnPlayer) {
                const canPlay = turnPlayer.cards.some(c => c.value + currentTotal <= 31);

                // If they CANNOT play, but it says it's their turn...
                // This usually means the "Go" logic failed or sync lag.
                // We won't auto-fix immediately to avoid fighting latency, but we could log it.
                // console.log(`[Game] Turn Check: Player ${turnPlayer.id} Turn? Yes. Can play? ${canPlay}`);
            }
        }


        // Handle specific actions if needed
        // ... previous logic
        // If I am Host, and I receive a state where Guest discarded (remote state), 
        // I need to check if we should proceed.


        // Check triggers for Host
        if (localId === 'p1') {
            if (newState.phase === 'discarding') {
                const allReady = newState.players.every(p => p.cards.length === 4);
                if (allReady) {
                    // Trigger cut locally, which will then push new state
                    // We need to apply the newState first so we have the cards
                    this._state.next(newState);
                    this.cutDeck();
                    return;
                }
            }
        }

        // CONFLICT RES: If I am finished counting locally, ensure I stay finished in the state
        if (localId && newState.phase === 'counting' && this._localCountingFinished) {
            // If remote state says I'm false/undefined, fix it.
            if (!newState.countingReady || !newState.countingReady[localId]) {
                console.log('[Game] Remote state overwrote my ready flag. Re-applying.', newState.countingReady);
                newState.countingReady = { ...(newState.countingReady || {}), [localId]: true };

                // CRITICAL: We changed state locally based on private knowledge.
                // We should broadcast this fix back to the server so P1 sees it.
                // But be careful of infinite loops. We only send if we changed it.
                // This `updateState` below updates local subject.
                // We might want to trigger `supabase.sendGameUpdate` specifically.
                setTimeout(() => {
                    // Async to avoid blocking this update
                    this.updateState({ countingReady: newState.countingReady });
                }, 0);
            }
        }

        // Apply state
        this._state.next(newState);

        // Host checks for Counting Ready ON EVERY UPDATE
        if (localId === 'p1' && newState.phase === 'counting') {
            this.checkIfAllReady(newState.countingReady || {});
        }

        // After applying state, Host checks for Pegging Finish
        if (localId === 'p1' && newState.phase === 'pegging') {
            this.checkForPeggingFinished();
        }
    }

    private updateState(newState: Partial<GameState>, syncRemote = true) {
        const mergedState = { ...this._state.value, ...newState };
        this._state.next(mergedState);

        // Sync if multiplayer
        if (syncRemote && mergedState.isMultiplayer && mergedState.gameId) {
            this.supabase.updateGameState(mergedState.gameId, mergedState);
        }
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

        const players = state.players.map((p, idx) => {
            console.log(`[Game] nextRound processing ${p.id}. Current Score: ${p.score}`);
            return {
                ...p,
                isDealer: idx === nextDealerIndex,
                cards: [],
                playedCards: []
            };
        });

        this.updateState({
            players,
            phase: 'dealing',
            crib: [],
            cutCard: null,
            peggingStack: [],
            peggingHistory: [],
            currentPeggingTotal: 0
        }, false); // Local only, wait for dealRound to sync final state

        // In multiplayer, only HOST triggers the deal
        if (state.isMultiplayer) {
            if (state.localPlayerId === 'p1') {
                this.dealRound();
            }
            // Guest does nothing, waits for update
        } else {
            this.dealRound();
        }
    }

    discard(playerId: string, cardIndices: number[]) {
        const state = this.snapshot;

        // Multiplayer Check
        if (state.isMultiplayer && state.localPlayerId && state.localPlayerId !== playerId) {
            console.warn('Cannot discard for other player in multiplayer');
            return;
        }

        const player = state.players.find(p => p.id === playerId);
        if (!player || state.phase !== 'discarding') return;

        // Move cards to crib
        // Indices are 0-based index in player.cards
        const discards = cardIndices.map(i => player.cards[i]);
        player.cards = player.cards.filter((_, i) => !cardIndices.includes(i));

        const currentCrib = this.snapshot.crib;
        this.updateState({
            crib: [...currentCrib, ...discards],
            players: [...state.players] // trigger update
        });

        // Check if all players have discarded
        const allReady = state.players.every(p => p.cards.length === 4);
        if (allReady) {
            // In multiplayer, ONLY HOST triggers the cut/transition
            if (state.isMultiplayer) {
                if (state.localPlayerId === 'p1') { // I am Host
                    this.cutDeck();
                } else {
                    // Guest does nothing? Wait for host sync?
                    // But Guest updated local state. Guest sees Phase = Discarding. Host sees Phase = Cutting/Pegging.
                    // Guest needs to receive the new phase from Host.
                    // BUT: Guest calling 'updateState' above pushed the 'players' (discarded) state to Supabase.
                    // So Host will receive it.
                    // Host needs to detect "Oh, everyone is ready" when receiving remote state too?
                    // OR: Guest keeps local update, waits for Host to push "Phase: Pegging + CutCard".
                }
            } else {
                this.cutDeck();
            }
        } else {
            this.checkAutoPlay();
        }
    }

    private checkAutoPlay() {
        const state = this.snapshot;
        // DISABLE AUTO PLAY IF MULTIPLAYER
        if (state.isMultiplayer) return;

        if (state.phase === 'discarding') {
            const cpu = state.players.find(p => !p.isHuman);
            if (cpu && cpu.cards.length > 4) {
                setTimeout(() => {
                    const s = this.snapshot;
                    const c = s.players.find(p => p.id === cpu.id);
                    if (s.phase === 'discarding' && c && c.cards.length > 4) {
                        // Use API for analysis
                        const handStrings = c.cards.map(card => card.rank + card.suit);
                        this.api.analyze(handStrings, c.isDealer, s.players.length).subscribe({
                            next: (res) => {
                                if (res.results && res.results.length > 0) {
                                    const best = res.results[0];
                                    const discardIndices: number[] = [];

                                    // Match discarded cards to hand indices
                                    best.discarded.forEach(d => {
                                        const idx = c.cards.findIndex(h => h.rank === d.rank && h.suit === d.suit);
                                        if (idx !== -1 && !discardIndices.includes(idx)) {
                                            discardIndices.push(idx);
                                        }
                                    });

                                    // Fallback if matching failed (shouldn't happen with valid deck)
                                    const numToDiscard = s.players.length === 2 ? 2 : 1;
                                    if (discardIndices.length === numToDiscard) {
                                        this.discard(c.id, discardIndices);
                                    } else {
                                        console.warn('CPU Analysis returned mismatching cards. Fallback to [0,1]');
                                        this.discard(c.id, [0, 1]);
                                    }
                                } else {
                                    this.discard(c.id, [0, 1]);
                                }
                            },
                            error: (err) => {
                                console.error('CPU Discard API Error', err);
                                this.discard(c.id, [0, 1]);
                            }
                        });
                    }
                }, 1000);
            }
        } else if (state.phase === 'pegging') {
            const turnPlayer = state.players.find(p => p.id === state.turnPlayerId);
            if (turnPlayer && !turnPlayer.isHuman) {
                setTimeout(() => {
                    const s = this.snapshot;
                    if (s.phase !== 'pegging') return;

                    const cpu = s.players.find(p => p.id === s.turnPlayerId);
                    if (!cpu || cpu.isHuman) return;

                    // API Call for Pegging
                    const handStrs = cpu.cards.map(c => c.rank + c.suit);
                    const stackStrs = s.peggingStack.map(item => item.card.rank + item.card.suit);

                    this.api.getPeggingCard(handStrs, stackStrs, s.currentPeggingTotal).subscribe({
                        next: (res) => {
                            if (res.card) {
                                const idx = cpu.cards.findIndex(c => c.rank === res.card!.rank && c.suit === res.card!.suit);
                                if (idx !== -1) {
                                    this.playCard(cpu.id, idx);
                                } else {
                                    this.sayGo(cpu.id);
                                }
                            } else {
                                // API says no card (or null), which implies Go
                                this.sayGo(cpu.id);
                            }
                        },
                        error: (err) => {
                            console.error('CPU Pegging API Error', err);
                            // Fallback logic
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
                                this.sayGo(cpu.id);
                            }
                        }
                    });
                }, 1000);
            }
        }
    }


    private cutDeck() {
        if ((this.snapshot.phase as any) === 'gameover') return;

        const deck = this.snapshot.deck;
        const cutCard = deck.pop()!;

        let phase: GamePhase = 'pegging';
        // Check for "His Heels"
        if (cutCard.rank === 'J') {
            const dealer = this.snapshot.players.find(p => p.isDealer);
            if (dealer) {
                this.addPoints(dealer.id, 2);
            }
        }

        if ((this.snapshot.phase as any) === 'gameover') return;

        this.updateState({
            cutCard,
            phase,
            deck: deck,
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

        // Multiplayer Check
        if (state.isMultiplayer && state.localPlayerId && state.localPlayerId !== playerId) {
            console.warn('Cannot play for other player in multiplayer');
            return 'NOT_YOUR_TURN'; // Or a specific multiplayer error code
        }

        if ((state.phase as any) === 'gameover') return 'GAME_OVER';
        if (state.phase !== 'pegging') return 'INVALID_PHASE';
        if (state.turnPlayerId !== playerId) return 'NOT_YOUR_TURN';

        const player = state.players.find(p => p.id === playerId);
        if (!player) return 'PLAYER_NOT_FOUND';

        const card = player.cards[cardIndex];
        if (!card) return 'CARD_NOT_FOUND';

        if (state.currentPeggingTotal + card.value > 31) {
            return 'TOTAL_OVER_31';
        }

        // Execute Play
        const newHand = player.cards.filter((_, i) => i !== cardIndex);
        const newPlayedReceived = [...player.playedCards, card];
        state.players = state.players.map(p => p.id === playerId ? { ...p, cards: newHand, playedCards: newPlayedReceived } : p);

        const newStackItem = { card, playerId };
        const newStack = [...state.peggingStack, newStackItem];
        const newTotal = state.currentPeggingTotal + card.value;

        // Score
        const scoreResult = this.calculatePeggingScore(newStack, newTotal);
        if (scoreResult.points > 0) {
            this.addPoints(playerId, scoreResult.points);
        }

        if ((this.snapshot.phase as any) === 'gameover') return 'GAME_OVER';

        if (newTotal === 31) {
            // Special handling for 31.
            // Reset must happen. Turn passes.
            setTimeout(() => {
                const resetPlayers = this.snapshot.players.map(p => ({ ...p, hasSaidGo: false }));
                const nextId = this.getNextPlayerId(playerId);
                const actualNextId = this.getNextPlayablePlayerId(nextId, resetPlayers);

                this.updateState({
                    players: resetPlayers,
                    currentPeggingTotal: 0,
                    peggingStack: [],
                    turnPlayerId: actualNextId
                });
                this.checkAutoPlay();
            }, 1500); // Wait for score animation

            this.updateState({
                players: [...state.players],
                currentPeggingTotal: newTotal,
                peggingStack: newStack,
                turnPlayerId: playerId, // Keep turn on player momentarily so they see the 31
                lastPeggingScore: scoreResult.points > 0 ? {
                    points: scoreResult.points,
                    description: scoreResult.breakdown.join(', '),
                    playerId,
                    id: Date.now()
                } : null
            });
        } else {
            // Determine who goes next based on playability
            const nextPlayerId = this.getNextPlayerId(playerId);
            const nextPlayer = state.players.find(p => p.id === nextPlayerId);

            // Check if Next Player can play
            const canNextPlay = nextPlayer?.cards.some(c => newTotal + c.value <= 31) && nextPlayer.cards.length > 0;
            const nextHasSaidGo = nextPlayer?.hasSaidGo;

            let nextTurnId = nextPlayerId;

            if (canNextPlay) {
                // Normal flow, they can play
                nextTurnId = nextPlayerId;
            } else {
                // Next player CANNOT play.

                // CASE 1: They have not said Go yet, AND they have cards.
                // We MUST pass turn to them so they are forced to "Say Go".
                if (!nextHasSaidGo && nextPlayer && nextPlayer.cards.length > 0) {
                    nextTurnId = nextPlayerId;
                } else {
                    // CASE 2: They (Already said Go OR Have No Cards).
                    // We check if *I* can play again.
                    // I just played, my cards are in 'newHand'.
                    // Need to check updated state if present or rely on 'player.cards'.
                    // 'state.players' was updated with new cards above.
                    const me = state.players.find(p => p.id === playerId);
                    const canIPlay = me?.cards.some(c => newTotal + c.value <= 31) && me.cards.length > 0;

                    if (canIPlay) {
                        // I keep the turn
                        nextTurnId = playerId;
                    } else {
                        // Neither can play. Round Over.
                        // Award 1 point for Go/Last Card to ME (since I played last).
                        this.addPoints(playerId, 1);

                        // Reset Stack
                        // Turn passes to Next Player (Rule: Left of last player starts new round)
                        setTimeout(() => {
                            const currentSnapshot = this.snapshot;
                            const resetPlayers = currentSnapshot.players.map(p => ({ ...p, hasSaidGo: false }));
                            const nextId = nextPlayerId;
                            const actualNextId = this.getNextPlayablePlayerId(nextId, resetPlayers);

                            this.updateState({
                                players: resetPlayers,
                                currentPeggingTotal: 0,
                                peggingStack: [],
                                turnPlayerId: actualNextId
                            });
                            this.checkAutoPlay();
                        }, 1500);

                        nextTurnId = playerId; // Momentarily keep my ID to show the score

                        // Update score visually
                        this.updateState({
                            lastPeggingScore: {
                                points: 1,
                                description: 'Go for 1',
                                playerId,
                                id: Date.now()
                            }
                        });
                    }
                }
            }

            this.updateState({
                players: [...state.players],
                currentPeggingTotal: newTotal,
                peggingStack: newStack,
                turnPlayerId: nextTurnId,
                lastPeggingScore: scoreResult.points > 0 ? {
                    points: scoreResult.points,
                    description: scoreResult.breakdown.join(', '),
                    playerId,
                    id: Date.now()
                } : (this.snapshot.lastPeggingScore || null) // Preserve existing score if Go for 1 happened
            });
        }

        // Logic to clear score REMOVED from DB write.
        // We will schedule a Local-only clear, but only if we generated it.
        const currentScore = this.snapshot.lastPeggingScore;
        if (currentScore && currentScore.playerId === playerId) {
            this._lastProcessedScoreId = currentScore.id;
            setTimeout(() => {
                // Local clear only
                const s = this._state.value.lastPeggingScore;
                if (s && s.id === currentScore.id) {
                    this.updateState({ lastPeggingScore: null }, false);
                }
            }, 2500);
        }

        // Check if pegging is finished BEFORE the multiplayer guard
        // This ensures both Host and Guest can trigger the transition
        this.checkForPeggingFinished();

        // In multiplayer, Guest doesn't run additional triggering logic
        if (this.snapshot.isMultiplayer && this.snapshot.localPlayerId !== 'p1') {
            return 'SUCCESS';
        }

        // Removed manual Last Card check block as the logic above handles it (Neither can play -> Point + Reset)

        this.checkAutoPlay();
        return 'SUCCESS';
    }

    private checkForPeggingFinished() {
        const state = this.snapshot;
        if (state.phase !== 'pegging') return;

        const allDone = state.players.every(p => p.cards.length === 0);

        if (allDone) {
            console.log('Pegging Finished. Starting Counting Phase.');

            // In multiplayer, ONLY Host triggers the transition
            if (state.isMultiplayer) {
                if (state.localPlayerId === 'p1') {
                    this.countHands();
                }
                // Guest does nothing, waits for Host to push the new phase
            } else {
                this.countHands();
            }
        }
    }

    private _localCountingFinished = false; // Track local readiness to survive remote overwrites

    private countHands() {
        if ((this.snapshot.phase as any) === 'gameover') return;

        // Reset local finish flag for new round
        this._localCountingFinished = false;

        const state = this.snapshot;
        const dealerIndex = state.players.findIndex(p => p.isDealer);
        const nonDealerIndex = (dealerIndex + 1) % state.players.length;
        const cutCard = state.cutCard;
        const nonDealer = state.players[nonDealerIndex];
        const dealer = state.players[dealerIndex];

        // Calculate ALL scores
        const nonDealerScore = calculateScore(nonDealer.playedCards, cutCard, false);
        const dealerScore = calculateScore(dealer.playedCards, cutCard, false);
        const cribScore = calculateScore(state.crib, cutCard, true);

        console.log('[Game] countHands results:', { nonDealerScore, dealerScore, cribScore });

        // Explicitly update players to ensure state immutability triggers updates
        let winnerId: string | null = null;
        let nextPhase: GamePhase = 'counting';

        const newPlayers = state.players.map(p => {
            let additional = 0;
            if (p.id === nonDealer.id) additional += nonDealerScore.total;
            if (p.id === dealer.id) {
                additional += dealerScore.total;
                additional += cribScore.total;
            }

            if (additional > 0) {
                const newScore = p.score + additional;
                if (newScore >= 121 && !winnerId) {
                    winnerId = p.id;
                    nextPhase = 'gameover';
                }
                return { ...p, score: newScore };
            }
            return p;
        });

        this.updateState({
            phase: nextPhase,
            winnerId,
            countingResults: {
                nonDealer: nonDealerScore,
                dealer: dealerScore,
                crib: cribScore
            },
            countingReady: {}, // Reset ready flags
            players: newPlayers
        });
    }

    // Called by UI when user clicks "Next" on the last slide (Crib)
    playerFinishedCounting(playerId: string) {
        this._localCountingFinished = true;

        const state = this.snapshot;
        const currentReady = state.countingReady || {};
        const newReady = { ...currentReady, [playerId]: true };

        console.log(`[Game] playerFinishedCounting: ${playerId}. New Ready State:`, newReady);

        // Update local state (and sync)
        this.updateState({ countingReady: newReady });

        // Host checks immediately (for single player or instant sync)
        this.checkIfAllReady(newReady);
    }

    private checkIfAllReady(readyMap: { [id: string]: boolean }) {
        const state = this.snapshot;
        if (state.isMultiplayer) {
            if (state.localPlayerId === 'p1') {
                const pendingPlayers = state.players.filter(p => !readyMap[p.id]);
                const allReady = pendingPlayers.length === 0;

                console.log(`[Game] Host checking completion. AllReady: ${allReady}.`,
                    {
                        totalPlayers: state.players.length,
                        readyMap,
                        pending: pendingPlayers.map(p => p.id)
                    }
                );

                if (allReady && state.phase === 'counting') {
                    console.log('[Game] All players ready. Advancing to next round.');
                    this.nextRound();
                } else {
                    console.log('[Game] Waiting for:', pendingPlayers.map(p => p.name));
                }
            }
        } else {
            this.nextRound();
        }
    }

    // Old methods removed


    private checkAutoCount() {
        return;
    }

    sayGo(playerId: string) {
        if ((this.snapshot.phase as any) === 'gameover') return;

        const state = this.snapshot;
        const opponentId = this.getNextPlayerId(playerId);
        const opponent = state.players.find(p => p.id === opponentId);
        if (!opponent) return;

        // Validation: Can the player REALLY not play?
        const player = state.players.find(p => p.id === playerId);
        const playerCanPlay = player?.cards.some(c => state.currentPeggingTotal + c.value <= 31);

        if (playerCanPlay) {
            console.warn('Player saying Go but has playable cards. Allowing action as per user override.');
            // Allow it to proceed
        }

        // Check if Opponent can play?
        const opponentCanPlay = opponent.cards.some(c => state.currentPeggingTotal + c.value <= 31);

        if (opponentCanPlay) {
            // Player says Go, but opponent CAN play.
            // Opponent continues playing until they also cannot play or hit 31.

            // Mark Current Player as having said Go
            const players = state.players.map(p => p.id === playerId ? { ...p, hasSaidGo: true } : p);

            // Pass turn to Opponent.
            this.updateState({
                players,
                turnPlayerId: opponentId
            });
            this.checkAutoPlay();
            return;
        }

        // If Opponent ALSO cannot play (or I said Go confirming I can't play and we know opp can't play?)
        // In our UI, we only show "Say Go" if I can't play.
        // If Opponent also can't play (checked above false), THEN the round is over (for 31 count).
        // The last person to play gets 1 point.
        // Who played last? The Opponent.
        // So User says Go -> Opponent Checks -> Opponent can't play -> Opponent gets 1 point.

        // Wait, did User play any cards?
        // If pegging stack is empty, and I can't play? (Can't happen unless all cards > 31? Start of round total is 0).

        // Award point to Opponent (last player)
        this.addPoints(opponentId, 1);

        if ((this.snapshot.phase as any) === 'gameover') return;

        // Reset Stack
        // Reset Go Flags
        const resetPlayers = state.players.map(p => ({ ...p, hasSaidGo: false }));

        this.updateState({
            players: resetPlayers,
            currentPeggingTotal: 0,
            peggingStack: [],
            turnPlayerId: this.getNextPlayablePlayerId(playerId, resetPlayers), // Leader of new round with validation
            lastPeggingScore: {
                points: 1,
                description: 'Go for 1',
                playerId: opponent.id,
                id: Date.now()
            }
        });

        this.checkAutoPlay();
        this.checkForPeggingFinished();
    }

    private getNextPlayablePlayerId(defaultNextId: string, players: any[]): string {
        const nextInfo = players.find(p => p.id === defaultNextId);
        // If the intended next player has cards, they go next.
        if (nextInfo && nextInfo.cards && nextInfo.cards.length > 0) return defaultNextId;

        // Otherwise, find anyone who has cards.
        // In 2-player, check the other one.
        const other = players.find(p => p.id !== defaultNextId);
        if (other && other.cards && other.cards.length > 0) return other.id;

        // If nobody has cards, return default (will be caught by 'PeggingFinished' check)
        return defaultNextId;
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
                const n = matches + 1;
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
        if (state.phase === 'gameover') return;

        const player = state.players.find(p => p.id === playerId);
        if (!player) return;

        player.score += points;

        if (player.score >= 121) {
            this.updateState({
                phase: 'gameover',
                winnerId: playerId,
                players: [...state.players]
            });
        }
    }

    restartGame() {
        const state = this.snapshot;
        if (state.isMultiplayer) {
            if (state.localPlayerId === 'p1') {
                // Host resets logic
                // Re-use logic from initMultiplayer but we need clean state
                this.initMultiplayerGame(state.gameId!, true);
            }
        } else {
            this.initGame(['Player 1', 'CPU']);
        }
    }

    private getNextPlayerId(currentId: string): string {
        const players = this.snapshot.players;
        const idx = players.findIndex(p => p.id === currentId);
        return players[(idx + 1) % players.length].id;
    }
}
