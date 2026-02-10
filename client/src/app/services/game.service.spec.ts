import { TestBed, fakeAsync, tick, flush, discardPeriodicTasks } from '@angular/core/testing';
import { GameService } from './game.service';
import { GameState } from './game.state';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { SupabaseService } from './supabase.service';
import { TranslateService } from '@ngx-translate/core';

class MockSupabaseService {
    currentUserSnapshot = { id: 'test-user', user_metadata: { full_name: 'Test User' } };
    currentUserId = null; // Disable cloud save timers
    subscribeToGame() { return of({}); }
    updateGameState() { return Promise.resolve(); }
    getGameState() { return Promise.resolve(null); }
    saveSoloGame() { return Promise.resolve(); }
}

class MockApiService {
    analyze() { return of({ results: [] }); }
    getPeggingCard() { return of({ card: null }); }
}

class MockTranslateService {
    instant(key: string, params?: any) {
        if (params) return `${key} params: ${JSON.stringify(params)}`;
        return key;
    }
}

describe('GameService', () => {
    let service: GameService;

    /**
     * Helper: Force game state directly, bypassing all async logic.
     * This avoids the cascade of timers from initGame/cut/deal.
     */
    function forceState(partial: Partial<GameState>) {
        (service as any)._state.next({
            ...service.snapshot,
            ...partial
        });
    }

    /**
     * Helper: Create a minimal player object.
     */
    function makePlayer(id: string, name: string, isHuman: boolean, isDealer: boolean, cards: any[] = [], score = 0): any {
        return {
            id, name, isHuman, isDealer, score,
            cards,
            playedCards: [],
            hasSaidGo: false,
            cutCard: null
        };
    }

    /**
     * Helper: Cleanup all pending timers. Call at the end of every fakeAsync test.
     */
    function cleanup() {
        service.ngOnDestroy();
    }

    // Helper to bypass cut_for_deal
    function initAndStartGame() {
        // Control Random for Shuffle AND Cuts
        let randomnessPhase = 'shuffle';
        spyOn(Math, 'random').and.callFake(() => {
            if (randomnessPhase === 'shuffle') return 0.5;
            if (randomnessPhase === 'p1') return 0.1;
            if (randomnessPhase === 'p2') return 0.9;
            return 0.5;
        });

        service.initGame();

        randomnessPhase = 'p1';
        service.performCutForDeal('p1');

        randomnessPhase = 'p2';
        service.performCutForDeal('p2');

        // resolveCutForDeal (2000ms) + dealRound -> checkAutoPlay (1000ms) + save debounce (500ms)
        tick(4000);
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                GameService,
                { provide: SupabaseService, useClass: MockSupabaseService },
                { provide: ApiService, useClass: MockApiService },
                { provide: TranslateService, useClass: MockTranslateService }
            ]
        });
        service = TestBed.inject(GameService);
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    // ─── GAME INITIALIZATION ─────────────────────────────────────────────

    describe('Game Initialization', () => {
        it('should initialize a standard 2-player game', fakeAsync(() => {
            service.initGame();
            tick(100); // Brief tick for sync init

            const state = service.snapshot;
            expect(state.players.length).toBe(2);
            expect(state.players[0].name).toBe('Test User');
            expect(state.players[0].isHuman).toBeTrue();
            expect(state.players[1].name).toBe('CPU');
            expect(state.players[1].isHuman).toBeFalse();
            expect(state.phase).toBe('cut_for_deal');

            cleanup();
        }));

        it('should alternate dealer correctly', fakeAsync(() => {
            initAndStartGame();
            const firstDealer = service.snapshot.players.find(p => p.isDealer)?.id;

            service.nextRound();
            tick(4000);

            const secondDealer = service.snapshot.players.find(p => p.isDealer)?.id;
            expect(firstDealer).not.toBe(secondDealer);

            service.nextRound();
            tick(4000);

            const thirdDealer = service.snapshot.players.find(p => p.isDealer)?.id;
            expect(thirdDealer).toBe(firstDealer);

            cleanup();
        }));
    });

    // ─── DISCARD PHASE ───────────────────────────────────────────────────

    describe('Discard Phase', () => {
        beforeEach(fakeAsync(() => {
            initAndStartGame();
        }));

        it('should allow player to discard 2 cards', fakeAsync(() => {
            const p1 = service.snapshot.players[0];
            const initialHandSize = p1.cards.length;

            service.discard(p1.id, [0, 1]);
            tick(2000);

            const state = service.snapshot;
            expect(state.players[0].cards.length).toBe(initialHandSize - 2);
            expect(state.crib.length).toBe(4); // P2 (Auto) + P1

            cleanup();
        }));

        it('should NOT transition to pegging if only one player has discarded', fakeAsync(() => {
            expect(service.snapshot.phase).toBe('discarding');
            expect(service.snapshot.crib.length).toBe(2); // Only P2 discarded

            cleanup();
        }));

        it('should transition to pegging after all players discard', fakeAsync(() => {
            service.discard('p1', [0, 1]);
            tick(2000);

            expect(service.snapshot.phase).toBe('pegging');
            expect(service.snapshot.crib.length).toBe(4);
            expect(service.snapshot.cutCard).not.toBeNull();

            cleanup();
        }));

        it('should handle CPU auto-discard correctly', fakeAsync(() => {
            const state = service.snapshot;
            expect(state.players[1].cards.length).toBe(4);
            expect(state.crib.length).toBe(2);

            cleanup();
        }));
    });

    // ─── SCORING: HIS HEELS ─────────────────────────────────────────────

    describe('Scoring Logic (His Heels)', () => {
        it('should give dealer 2 points if cut card is a Jack', fakeAsync(() => {
            initAndStartGame();

            const state = service.snapshot;
            const jack: any = { rank: 'J', suit: 'H', value: 10, order: 11 };
            state.deck.push(jack);

            if (state.players[1].cards.length === 6) {
                service.discard('p2', [0, 1]);
            }

            service.discard('p1', [0, 1]);
            tick(2000);

            const dealer = service.snapshot.players.find(p => p.isDealer)!;
            expect(dealer.score).toBe(2);
            expect(service.snapshot.cutCard?.rank).toBe('J');

            cleanup();
        }));
    });

    // ─── PEGGING PHASE ──────────────────────────────────────────────────

    describe('Pegging Phase', () => {
        it('should allow player to play a card', fakeAsync(() => {
            const ten = { rank: '10', suit: 'H', value: 10, order: 10 } as any;
            const queen = { rank: 'Q', suit: 'D', value: 10, order: 12 } as any;
            const five = { rank: '5', suit: 'S', value: 5, order: 5 } as any;

            forceState({
                players: [
                    makePlayer('p1', 'P1', true, true, [ten, queen]),
                    makePlayer('p2', 'P2', true, false, [five, five]) // isHuman=true to prevent autoplay
                ],
                phase: 'pegging',
                turnPlayerId: 'p2',
                peggingStack: [],
                currentPeggingTotal: 0
            });

            service.playCard('p2', 0);
            tick(1000);

            const state = service.snapshot;
            expect(state.players[1].cards.length).toBe(1);
            expect(state.peggingStack.length).toBe(1);
            expect(state.peggingStack[0].card).toEqual(five);
            expect(state.currentPeggingTotal).toBe(5);
            expect(state.turnPlayerId).toBe('p1');

            cleanup();
        }));

        it('should score 15 correctly', fakeAsync(() => {
            const ten = { rank: '10', suit: 'H', value: 10, order: 10 } as any;
            const five = { rank: '5', suit: 'D', value: 5, order: 5 } as any;
            const ace = { rank: 'A', suit: 'S', value: 1, order: 1 } as any;
            const two = { rank: '2', suit: 'C', value: 2, order: 2 } as any;

            forceState({
                players: [
                    makePlayer('p1', 'P1', true, true, [ten, ace]),
                    makePlayer('p2', 'P2', true, false, [five, two])
                ],
                phase: 'pegging',
                turnPlayerId: 'p1',
                peggingStack: [],
                currentPeggingTotal: 0
            });

            // P1 plays 10
            service.playCard('p1', 0);
            tick(500);

            // P2 plays 5 => 15!
            const scoreBefore = service.snapshot.players[1].score;
            service.playCard('p2', 0);
            tick(500);

            const state = service.snapshot;
            expect(state.currentPeggingTotal).toBe(15);
            expect(state.players[1].score).toBe(scoreBefore + 2);

            cleanup();
        }));

        it('should score runs correctly', fakeAsync(() => {
            const three = { rank: '3', suit: 'H', value: 3, order: 3 } as any;
            const four = { rank: '4', suit: 'S', value: 4, order: 4 } as any;
            const five = { rank: '5', suit: 'D', value: 5, order: 5 } as any;
            const six = { rank: '6', suit: 'C', value: 6, order: 6 } as any;

            forceState({
                players: [
                    makePlayer('p1', 'P1', true, true, [four, six]),
                    makePlayer('p2', 'P2', true, false, [three, three])
                ],
                phase: 'pegging',
                turnPlayerId: 'p1',
                peggingStack: [
                    { card: three, playerId: 'p1' },
                    { card: five, playerId: 'p2' }
                ],
                currentPeggingTotal: 8
            });

            // Play 4 => Stack: 3,5,4 => Run of 3
            service.playCard('p1', 0);
            tick(500);

            expect(service.snapshot.players[0].score).toBe(3);

            // Force turn back to P1 for next play
            forceState({ turnPlayerId: 'p1' });
            const scoreBefore = service.snapshot.players[0].score;

            // Play 6 => Stack: 3,5,4,6 => Run of 4
            service.playCard('p1', 0);
            tick(500);

            expect(service.snapshot.players[0].score).toBe(scoreBefore + 4);

            cleanup();
        }));

        it('should score 31 correctly and reset stack', fakeAsync(() => {
            const ace = { rank: 'A', suit: 'S', value: 1, order: 1 } as any;
            const king = { rank: 'K', suit: 'H', value: 10, order: 13 } as any;

            forceState({
                players: [
                    makePlayer('p1', 'P1', true, true, [ace]),
                    makePlayer('p2', 'P2', true, false, [])
                ],
                phase: 'pegging',
                turnPlayerId: 'p1',
                peggingStack: [{ card: king, playerId: 'p2' }],
                currentPeggingTotal: 30
            });

            const scoreBefore = service.snapshot.players[0].score;
            service.playCard('p1', 0);

            // Immediate: score updated, total 31
            let state = service.snapshot;
            expect(state.players[0].score).toBe(scoreBefore + 2);
            expect(state.currentPeggingTotal).toBe(31);

            // Wait for pegging reset (1500ms) + buffer
            tick(2000);

            state = service.snapshot;
            expect(state.currentPeggingTotal).toBe(0);
            expect(state.peggingStack.length).toBe(0);

            cleanup();
        }));
    });

    // ─── COUNTING PHASE ─────────────────────────────────────────────────

    describe('Counting Phase', () => {
        beforeEach(fakeAsync(() => {
            initAndStartGame();

            const state = service.snapshot;
            state.cutCard = { rank: 'J', suit: 'H', value: 10, order: 11 } as any;
            state.players[0].isDealer = true;
            state.players[1].isDealer = false;

            const fiveD = { rank: '5', suit: 'D', value: 5, order: 5 } as any;
            const fiveH = { rank: '5', suit: 'H', value: 5, order: 5 } as any;
            const fiveS = { rank: '5', suit: 'S', value: 5, order: 5 } as any;
            const fiveC = { rank: '5', suit: 'C', value: 5, order: 5 } as any;

            // Non-Dealer (P2): 4 Fives => 28 points with J cut
            state.players[1].playedCards = [fiveD, fiveH, fiveS, fiveC];

            // Dealer (P1): Just Ace => 0 points
            state.players[0].playedCards = [{ rank: 'A', suit: 'S', value: 1, order: 1 } as any];

            // Crib: Just a 5 => 5+J=15 => 2 points
            state.crib = [{ rank: '5', suit: 'S', value: 5, order: 5 } as any];

            state.phase = 'pegging';
            state.players.forEach(p => p.cards = []);
            service['checkForPeggingFinished']();
            tick(500);
        }));

        it('should calculate all scores correctly in counting phase', fakeAsync(() => {
            let state = service.snapshot;
            expect(state.phase).toBe('counting');
            expect(state.countingResults).toBeDefined();

            // Non-Dealer (P2): 4 Fives + J cut = 28
            expect(state.countingResults?.nonDealer.total).toBe(28);
            expect(state.players[1].score).toBe(28);

            // Dealer (P1): Ace + J = 0
            expect(state.countingResults?.dealer.total).toBe(0);

            // Crib: 5 + J = 15 => 2
            expect(state.countingResults?.crib.total).toBe(2);

            // Dealer gets hand (0) + crib (2) = 2
            expect(state.players[0].score).toBe(2);

            // Acknowledge counting => next round
            service.playerFinishedCounting(state.players[0].id);
            tick(2000);

            state = service.snapshot;
            expect(state.phase).toBe('discarding');

            cleanup();
        }));
    });

    // ─── GO LOGIC ────────────────────────────────────────────────────────

    it('should handle "Go" correctly', fakeAsync(() => {
        const five = { rank: '5', suit: 'C', value: 5, order: 5 } as any;

        forceState({
            players: [
                makePlayer('p1', 'P1', true, true, [five]),
                makePlayer('p2', 'CPU', false, false, [])
            ],
            phase: 'pegging',
            currentPeggingTotal: 30,
            peggingStack: [],
            turnPlayerId: 'p1'
        });
        (service as any)._isPeggingResetting = false;

        const scoreBefore = service.snapshot.players[1].score;

        service.sayGo('p1');

        // Immediate: opponent gets 1 point
        expect(service.snapshot.players[1].score).toBe(scoreBefore + 1);

        // Wait for pegging reset (1500ms)
        tick(2000);

        const state = service.snapshot;
        expect(state.currentPeggingTotal).toBe(0);
        expect(state.peggingStack.length).toBe(0);

        cleanup();
    }));

    // ─── GAME OVER ──────────────────────────────────────────────────────

    describe('Game Over Logic', () => {
        it('should trigger Game Over when player reaches 121 points', fakeAsync(() => {
            const ace = { rank: 'A', suit: 'S', value: 1, order: 1 } as any;
            const king = { rank: 'K', suit: 'H', value: 10, order: 13 } as any;

            forceState({
                players: [
                    makePlayer('p1', 'P1', true, true, [ace], 120),
                    makePlayer('p2', 'CPU', true, false, [])
                ],
                phase: 'pegging',
                turnPlayerId: 'p1',
                currentPeggingTotal: 30,
                peggingStack: [{ card: king, playerId: 'p2' }]
            });

            service.playCard('p1', 0);
            tick(1000);

            const state = service.snapshot;
            expect(state.players[0].score).toBe(122); // 120 + 2 (31)
            expect(state.phase).toBe('gameover');
            expect(state.winnerId).toBe('p1');

            cleanup();
        }));
    });
});
