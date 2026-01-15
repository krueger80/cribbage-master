import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameService } from './game.service';
import { GameState } from './game.state';

describe('GameService', () => {
    let service: GameService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Game Initialization', () => {
        it('should initialize a standard 2-player game', () => {
            service.initGame();
            const state = service.snapshot;

            expect(state.players.length).toBe(2);
            expect(state.players[0].name).toBe('Player 1');
            expect(state.players[0].isHuman).toBeTrue();
            expect(state.players[1].name).toBe('CPU');
            expect(state.players[1].isHuman).toBeFalse();
            expect(state.phase).toBe('discarding'); // Dealing happens immediately in initGame currently
            expect(state.deck.length).toBe(52 - 12); // 52 - (6 * 2)
        });

        it('should alternate dealer correctly', fakeAsync(() => {
            service.initGame();
            const firstDealer = service.snapshot.players.find(p => p.isDealer)?.id;

            // Advance round
            service.nextRound();
            tick(1000); // clear any auto-play timers from dealing

            const secondDealer = service.snapshot.players.find(p => p.isDealer)?.id;
            expect(firstDealer).not.toBe(secondDealer);

            // Advance again (back to p1 for 2 players)
            service.nextRound();
            tick(1000);

            const thirdDealer = service.snapshot.players.find(p => p.isDealer)?.id;
            expect(thirdDealer).toBe(firstDealer);
        }));
    });

    describe('Discard Phase', () => {
        beforeEach(() => {
            // Re-init for discard tests
            service.initGame();
        });

        it('should allow player to discard 2 cards', () => {
            const p1 = service.snapshot.players[0];
            const initialHandSize = p1.cards.length;

            // discard first 2 cards
            service.discard(p1.id, [0, 1]);

            const state = service.snapshot;
            expect(state.players[0].cards.length).toBe(initialHandSize - 2);
            expect(state.crib.length).toBe(2);
        });

        it('should NOT transition to pegging if only one player has discarded', () => {
            const p1 = service.snapshot.players[0];
            service.discard(p1.id, [0, 1]);

            expect(service.snapshot.phase).toBe('discarding');
        });

        it('should transition to pegging after all players discard', fakeAsync(() => {
            // Player 1 discards
            service.discard('p1', [0, 1]);

            // Simulate CPU discard
            service.discard('p2', [0, 1]);

            expect(service.snapshot.phase).toBe('pegging');
            expect(service.snapshot.crib.length).toBe(4);
            expect(service.snapshot.cutCard).not.toBeNull();

            // Flush pending timers
            tick(2000);
        }));

        it('should handle CPU auto-discard correctly', fakeAsync(() => {
            // Setup game where CPU needs to discard checking checkAutoPlay logic
            // Reset service to fresh state
            service.initGame();

            // Advance time for the setTimeout in checkAutoPlay
            tick(1000);

            const state = service.snapshot;
            // CPU should have discarded by now
            expect(state.players[1].cards.length).toBe(4);
            expect(state.crib.length).toBe(2);
        }));
    });

    describe('Scoring Logic (His Heels)', () => {
        it('should give dealer 2 points if cut card is a Jack', fakeAsync(() => {
            service.initGame();
            tick(1000); // CPU auto-discards here. P2 is ready.

            // Mock the deck in state before P1 (last player) discard triggers cut
            const state = service.snapshot;
            const jack: any = { rank: 'J', suit: 'H', value: 10, order: 11 };
            // Ensure deck has specific card at end (pop() takes from end)
            state.deck.push(jack);

            // Trigger discard for P1 (Human)
            service.discard('p1', [0, 1]); // This should trigger cutDeck

            // No need to discard for P2 again


            const dealer = service.snapshot.players.find(p => p.isDealer)!;
            expect(dealer.score).toBe(2);
            expect(service.snapshot.cutCard?.rank).toBe('J');

            tick(1000);
        }));
    });

    describe('Pegging Phase', () => {
        beforeEach(fakeAsync(() => {
            service.initGame();
            tick(1000); // Allow CPU to discard
            service.discard('p1', [0, 1]); // P1 discards, game transitions to pegging
            tick(1000); // Flush any CPU pegging timer
        }));

        it('should allow player to play a card', fakeAsync(() => {
            const state = service.snapshot;
            state.phase = 'pegging'; // Force phase

            // Reset dirty state
            state.peggingStack = [];
            state.currentPeggingTotal = 0;
            state.players[1].isHuman = true; // Disable AutoPlay
            state.players[1].cards = [
                { rank: 'Q', suit: 'D', value: 10, order: 12 } as any,
                { rank: 'K', suit: 'S', value: 10, order: 13 } as any,
                { rank: '5', suit: 'H', value: 5, order: 5 } as any,
                { rank: 'A', suit: 'C', value: 1, order: 1 } as any
            ];

            const p2 = state.players[1];
            const cardIndex = 0;
            const cardToPlay = p2.cards[cardIndex];

            // P1 is dealer, so P2 starts.
            state.phase = 'pegging';
            state.turnPlayerId = state.players[1].id;

            service.playCard(p2.id, cardIndex);

            const updatedState = service.snapshot;
            // Card should be removed from hand
            expect(updatedState.players[1].cards.length).toBe(3);

            // Added to pegging stack
            expect(updatedState.peggingStack.length).toBe(1);
            expect(updatedState.peggingStack[0].card).toEqual(cardToPlay);
            expect(updatedState.currentPeggingTotal).toBe(cardToPlay.value);

            // Turn should rotate to P1
            expect(updatedState.turnPlayerId).toBe(state.players[0].id);
            tick(1000); // Flush checkAutoPlay
        }));

        it('should score 15 correctly', fakeAsync(() => {
            // Force state for testing specific scenario
            // P1 has a 10, P2 plays a 5
            const ten = { rank: '10', suit: 'H', value: 10, order: 10 } as any;
            const five = { rank: '5', suit: 'D', value: 5, order: 5 } as any;

            // Reset to a clean slate or force verify
            // We need to inject cards into hands to be deterministic
            const state = service.snapshot;
            state.players[1].isHuman = true; // Disable AutoPlay
            // Give players MORE cards so "Pegging Finished" logic doesn't trigger immediately
            state.players[0].cards = [ten, ten];
            state.players[1].cards = [five, five];
            state.turnPlayerId = state.players[0].id; // Ensure P1 starts
            state.peggingStack = [];
            state.currentPeggingTotal = 0;

            service.playCard(state.players[0].id, 0); // Play 10. Total 10.
            tick(1000); // Flush checkAutoPlay

            // State outdated after playCard, refresh it
            let currentState = service.snapshot;
            const scoreBefore = currentState.players[1].score;

            service.playCard(currentState.players[1].id, 0); // Play 5. Total 15.
            tick(3000); // Flush checkAutoPlay and score highlight

            currentState = service.snapshot;
            expect(currentState.players[1].score).toBe(scoreBefore + 2);
            expect(currentState.currentPeggingTotal).toBe(15);
        }));

        it('should score runs correctly', fakeAsync(() => {
            // Sequence: 3, 5, 4 (Run of 3)
            const three = { rank: '3', suit: 'H', value: 3, order: 3 } as any;
            const five = { rank: '5', suit: 'D', value: 5, order: 5 } as any;
            const four = { rank: '4', suit: 'S', value: 4, order: 4 } as any;
            const six = { rank: '6', suit: 'C', value: 6, order: 6 } as any;

            const state = service.snapshot;
            state.peggingStack = [
                { card: three, playerId: 'p1' },
                { card: five, playerId: 'p2' }
            ];
            state.currentPeggingTotal = 8;
            state.players[0].cards = [four, six];
            state.players[1].cards = [three, three]; // dummy cards
            state.turnPlayerId = state.players[0].id;
            state.players[1].isHuman = true; // disable auto

            // Play 4. Stack: 3, 5, 4. Run of 3.
            const scoreBefore = state.players[0].score;
            service.playCard(state.players[0].id, 0);
            tick(1000);

            const updatedState = service.snapshot;
            expect(updatedState.peggingStack.length).toBe(3);
            expect(updatedState.players[0].score).toBe(scoreBefore + 3);
            tick(3000); // Flush timeout for score highlight

            // Continue: Play 6. Stack: 3, 5, 4, 6. Run of 4.
            // But check turn rotation first. P0 played, so P1 turn.
            // Force P0 again for simplicity of setup or just checking logic?
            // Let's assume P1 is passing or we force turn.
            // Actually, 3+5+4 = 12. +6 = 18.
            updatedState.turnPlayerId = updatedState.players[0].id; // Force P0 to play 6
            const scoreBefore2 = updatedState.players[0].score;
            service.playCard(updatedState.players[0].id, 0); // Play 6
            tick(3000); // Flush timeout for score highlight

            const finalState = service.snapshot;
            expect(finalState.players[0].score).toBe(scoreBefore2 + 4);
            tick(3000);
        }));

        it('should score 31 correctly and reset stack', fakeAsync(() => {
            const state = service.snapshot;
            state.currentPeggingTotal = 30;
            state.peggingStack = []; // Reset stack to avoid accidental pairs/runs from beforeEach
            state.players[1].isHuman = true; // Disable AutoPlay

            const ace = { rank: 'A', suit: 'S', value: 1, order: 1 } as any;

            // Cleanup
            state.players[0].cards = [ace];
            state.turnPlayerId = state.players[0].id;

            const scoreBefore = state.players[0].score;
            service.playCard(state.players[0].id, 0);

            const currentState = service.snapshot;
            expect(currentState.currentPeggingTotal).toBe(0); // Should reset
            expect(currentState.peggingStack.length).toBe(0); // Should clear
            expect(currentState.players[0].score).toBe(scoreBefore + 2); // 2 pts for 31
            tick(3000); // Flush checkAutoPlay (1s) and score highlight (2s)
        }));
    });

    describe('Counting Phase', () => {
        beforeEach(() => {
            service.initGame();
            const state = service.snapshot;
            // Setup for counting: Cut card J, P1 Dealer
            state.cutCard = { rank: 'J', suit: 'H', value: 10, order: 11 } as any;
            state.players[0].isDealer = true;
            state.players[1].isDealer = false;

            // P1 Hand (Dealer): 5, 5, 5, K (15-2 x 3? No, 5+5+5=15. 5+K=15. Pairs.)
            // Let's use simple: 5, 10, K, Q. 
            // 5+10(+J)=20. 5+K(+J)=20. 5+Q(+J)=20. No 15s.
            // Let's use 5H, 5D, 5S, 5C. + Cut J. -> 29? No, J is cut. so 5,5,5,5 + J.
            // 5s = 12 (pairs) + 8 (15s if J=10? 5+J=15 x 4 = 8). 12+8+1(nobs? No J is cut). = 20? 
            // Actually, let's keep it simple.
            // P2 (Non-Dealer): A, 2, 3, 4. + J cut. 
            // run of 4? No, A,2,3,4 is run of 4 (4 pts). 
            // 15s: 1+4+10=15 (2), 2+3+10=15 (2), 1+2+3+4+???
            // Let's manually set playedCards.

            const jack = { rank: 'J', suit: 'H', value: 10, order: 11 } as any;
            // 4 Fives of diff suits
            const fiveD = { rank: '5', suit: 'D', value: 5, order: 5 } as any;
            const fiveH = { rank: '5', suit: 'H', value: 5, order: 5 } as any;
            const fiveS = { rank: '5', suit: 'S', value: 5, order: 5 } as any;
            const fiveC = { rank: '5', suit: 'C', value: 5, order: 5 } as any;

            // Non-Dealer (P2)
            state.players[1].playedCards = [fiveD, fiveH, fiveS, fiveC];
            // 15s: 5+10(J) = 15. 4 combinations. 8 pts.
            // 5+5+5 = 15. 4 combinations. 8 pts.
            // Pairs: 4C2 = 6. 12 pts.
            // Total: 28 pts. (Double Pairs Royal + 15s)

            // Dealer (P1)
            state.players[0].playedCards = [{ rank: 'A', suit: 'S', value: 1, order: 1 } as any]; // Just Ace
            // Score: 1+10(J) = 11. No points.

            // Crib
            state.crib = [{ rank: '5', suit: 'S', value: 5, order: 5 } as any]; // Just 5
            // Score: 5+10 = 15 (2 pts).

            // Force phase transition
            state.phase = 'pegging';
            state.players.forEach(p => p.cards = []); // Empty hands
            service['checkForPeggingFinished'](); // Trigger transition
        });

        it('should step through counting stages correctly', fakeAsync(() => {
            let state = service.snapshot;
            expect(state.phase).toBe('counting');
            expect(state.countingStage).toBe('non_dealer_hand');

            // Verify Non-Dealer (P2) Score
            // 4 Fives + Jack Cut.
            // Pairs 6 (12). 15s (16). Total 28.
            expect(state.players[1].score).toBe(28);
            expect(state.players[0].score).toBe(0); // Dealer 0 yet.

            // Advance to Dealer
            service.advanceCountingStage();
            state = service.snapshot;
            expect(state.countingStage).toBe('dealer_hand');

            // Verify Dealer (P1) Score. Ace + J. 0.
            expect(state.players[0].score).toBe(0);

            // Advance to Crib
            service.advanceCountingStage();
            state = service.snapshot;
            expect(state.countingStage).toBe('crib');

            // Verify Crib Score. 5 + J = 15 (2).
            // Dealer gets crib points.
            expect(state.players[0].score).toBe(2);

            // Advance to Finish
            service.advanceCountingStage();
            state = service.snapshot;
            // nextRound calls dealRound immediately, which sets phase to discarding
            expect(state.phase).toBe('discarding');
            tick(4000); // Flush timers
        }));
    });


    it('should handle "Go" correctly', fakeAsync(() => {
        service.initGame(); // Initialize game state 
        const state = service.snapshot;
        state.currentPeggingTotal = 30;
        // P0 has a 5 (cannot play).
        state.players[0].cards = [{ rank: '5', suit: 'C', value: 5, order: 5 } as any];
        state.turnPlayerId = state.players[0].id;

        // P1 is the one who will get the point because P0 says Go
        const scoreBefore = state.players[1].score;

        service.sayGo(state.players[0].id);

        const updatedState = service.snapshot;
        expect(updatedState.players[1].score).toBe(scoreBefore + 1);
        expect(updatedState.currentPeggingTotal).toBe(0); // Should reset
        // User said Go (conceding point to P1), so User should lead new round
        expect(updatedState.turnPlayerId).toBe(state.players[0].id);
        tick(1000); // Flush checkAutoPlay
        expect(updatedState.turnPlayerId).toBe(state.players[0].id);
        tick(1000); // Flush checkAutoPlay
    }));

    describe('Game Over Logic', () => {
        it('should trigger Game Over when player reaches 121 points', () => {
            service.initGame();
            const state = service.snapshot;
            state.phase = 'pegging'; // Force phase

            // Set Player 1 score to 120
            state.players[0].score = 120;
            state.players[0].cards = [{ rank: 'A', suit: 'S', value: 1, order: 1 } as any];
            state.turnPlayerId = state.players[0].id;

            // Play A (1 point? No, just plays card. Need to score.)
            // Let's create a scenario where they score.
            // Stack has 30. Play A. Total 31 (2 points). 
            state.currentPeggingTotal = 30;
            state.peggingStack = [{ card: { rank: 'K', suit: 'H', value: 10, order: 13 } as any, playerId: 'p2' }]; // Dummy stack

            service.playCard(state.players[0].id, 0);

            const finalState = service.snapshot;
            expect(finalState.players[0].score).toBe(122); // 120 + 2
            expect(finalState.phase).toBe('gameover');
            expect(finalState.winnerId).toBe(state.players[0].id);
        });
    });
});
