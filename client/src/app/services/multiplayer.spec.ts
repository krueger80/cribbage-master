import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { GameService } from './game.service';
import { SupabaseService } from './supabase.service';
import { GameState, INITIAL_GAME_STATE } from './game.state';
import { of, BehaviorSubject } from 'rxjs';

class MockTranslateService {
    instant(key: string, params?: any) {
        if (params) return `${key} params: ${JSON.stringify(params)}`;
        return key;
    }
}

// Mock SupabaseService
class MockSupabaseService {
    private _state = new BehaviorSubject<GameState | null>(null);

    get currentUser$() {
        return of({ id: 'test-user' });
    }

    get currentUserId() {
        return 'test-user';
    }

    async signInAnonymously() { return { user: { id: 'anon' } }; }
    async createGame() { return 'game-123'; }
    async joinGame() { }
    async getWaitingGames() { return []; }
    async saveSoloGame() { } // Mock this
    async getSoloGame() { return null; } // Mock this

    // Realtime mocks
    subscribeToGame(gameId: string) {
        return this._state.asObservable(); // Use Subject as observable for realtime updates
    }

    async updateGameState(gameId: string, state: GameState) {
        this._state.next(state);
    }

    async getGameState(gameId: string) {
        return this._state.value;
    }

    // Helper to simulate remote update
    simulateRemoteUpdate(state: GameState) {
        this._state.next(state);
    }
}

class MockApiService {
    analyze() { return of({ results: [] }); }
    getPeggingCard() { return of({ card: null }); }
}

describe('Multiplayer Flow Integration', () => {
    let hostService: GameService;
    let guestService: GameService;
    let mockSupabase: MockSupabaseService;
    let mockApi: MockApiService;
    let mockTranslate: MockTranslateService;

    beforeEach(() => {
        mockSupabase = new MockSupabaseService();
        mockApi = new MockApiService();
        mockTranslate = new MockTranslateService();

        // Host Service Instance
        hostService = new GameService(mockSupabase as any, mockApi as any, mockTranslate as any);

        // Guest Service Instance
        guestService = new GameService(mockSupabase as any, mockApi as any, mockTranslate as any);
    });

    it('should sync state between host and guest', fakeAsync(() => {
        // Control Random for Shuffle AND Cuts
        let randomnessPhase = 'shuffle';
        spyOn(Math, 'random').and.callFake(() => {
            if (randomnessPhase === 'shuffle') return 0.5; // No-op shuffle
            if (randomnessPhase === 'p1') return 0.1; // Index ~5 (2)
            if (randomnessPhase === 'p2') return 0.9; // Index ~46 (Q)
            return 0.5;
        });

        // 1. Host creates game
        hostService.initGame(['Host', 'Guest']); // Local init

        // Advance Cut Phase
        randomnessPhase = 'p1';
        hostService.performCutForDeal('p1');

        randomnessPhase = 'p2';
        hostService.performCutForDeal('p2');

        tick(3500); // 2000 (Resolve) + 1000 (Autoplay) = 3000+. 3500 safe.

        const hostState = hostService.snapshot;

        // Host initializes multiplayer
        hostService.initMultiplayerGame('game-123', true);
        tick(); // Flush promises

        // Verify Host State
        expect(hostService.snapshot.isMultiplayer).toBeTrue();
        expect(hostService.snapshot.localPlayerId).toBe('p1');
        expect(hostService.snapshot.players[0].cards.length).toBeGreaterThan(0); // Should have cards now

        // 2. Guest Joins
        // Mock the DB state being set by Host (happened via sync in initMultiplayerGame > updateState)
        // With our improved mock, calling updateGameState updates the stream.
        // But guest needs to Subscribe first.

        // Guest inits
        guestService.initMultiplayerGame('game-123', false);
        tick(); // Flush guest fetch of game state

        // Verify Guest State syncs with Host
        expect(guestService.snapshot.gameId).toBe('game-123');
        expect(guestService.snapshot.phase).toBe(hostService.snapshot.phase);
        expect(guestService.snapshot.players.length).toBe(2);

        // Verify Guest has cards (synced from Host)
        // Note: P2 (Guest) on Host side was CPU and auto-discarded 2 cards.
        expect(guestService.snapshot.players[1].cards.length).toBe(4);
        expect(guestService.snapshot.players[1].cards).toEqual(hostService.snapshot.players[1].cards);

        // Cleanup timers
        flush();
    }));

    // Removed the empty/incomplete test
});
