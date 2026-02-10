import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { GameTableComponent } from './game-table.component';
import { GameService } from '../../services/game.service';
import { ApiService, AnalysisResult } from '../../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, BehaviorSubject } from 'rxjs';
import { GameState } from '../../services/game.state';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('GameTableComponent - Hint Feature', () => {
    let component: GameTableComponent;
    let fixture: ComponentFixture<GameTableComponent>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let apiServiceSpy: jasmine.SpyObj<ApiService>;
    let stateSubject: BehaviorSubject<GameState>;

    const initialState: GameState = {
        phase: 'discarding',
        players: [
            { id: 'p1', name: 'Player 1', cards: [], score: 0, isDealer: false, playedCards: [], hasSaidGo: false, isHuman: true },
            { id: 'cpu', name: 'CPU', cards: [], score: 0, isDealer: true, playedCards: [], hasSaidGo: false, isHuman: false }
        ],
        deck: [],
        crib: [],
        turnPlayerId: 'p1',
        peggingStack: [],
        peggingHistory: [],
        currentPeggingTotal: 0,
        localPlayerId: 'p1',
        isMultiplayer: false,
        gameId: 'test-game',
        lastPeggingScore: null,
        winnerId: null,
        cutCard: null
    };

    const mockResults: AnalysisResult[] = [
        {
            kept: [
                { rank: '5', suit: 'H', value: 5, order: 5 },
                { rank: '6', suit: 'D', value: 6, order: 6 },
                { rank: '7', suit: 'S', value: 7, order: 7 },
                { rank: '8', suit: 'C', value: 8, order: 8 }
            ],
            discarded: [{ rank: '9', suit: 'H', value: 9, order: 9 }, { rank: '10', suit: 'D', value: 10, order: 10 }],
            handStats: { min: 4, max: 12, avg: 10, breakdown: {} as any },
            cribStats: { min: 2, max: 6, avg: 3, breakdown: {} as any },
            peggingScore: 2.0,
            totalExpectedValue: 15.0
        },
        {
            kept: [
                { rank: '9', suit: 'H', value: 9, order: 9 },
                { rank: '10', suit: 'D', value: 10, order: 10 },
                { rank: '7', suit: 'S', value: 7, order: 7 },
                { rank: '8', suit: 'C', value: 8, order: 8 }
            ],
            discarded: [{ rank: '5', suit: 'H', value: 5, order: 5 }, { rank: '6', suit: 'D', value: 6, order: 6 }],
            handStats: { min: 2, max: 8, avg: 8, breakdown: {} as any },
            cribStats: { min: 2, max: 6, avg: 3, breakdown: {} as any },
            peggingScore: 6.0,
            totalExpectedValue: 14.0
        },
        {
            kept: [
                { rank: '5', suit: 'H', value: 5, order: 5 },
                { rank: '6', suit: 'D', value: 6, order: 6 },
                { rank: '9', suit: 'H', value: 9, order: 9 },
                { rank: '10', suit: 'D', value: 10, order: 10 }
            ],
            discarded: [{ rank: '7', suit: 'S', value: 7, order: 7 }, { rank: '8', suit: 'C', value: 8, order: 8 }],
            handStats: { min: 10, max: 10, avg: 10, breakdown: {} as any },
            cribStats: { min: 0, max: 0, avg: 0, breakdown: {} as any },
            peggingScore: 1.0,
            totalExpectedValue: 11.0
        }
    ];

    beforeEach(waitForAsync(() => {
        stateSubject = new BehaviorSubject<GameState>(JSON.parse(JSON.stringify(initialState)));

        const gameSpy = jasmine.createSpyObj('GameService', ['discard', 'setLastAnalysis', 'acknowledgePeggingScore', 'playCard', 'sayGo']);
        Object.defineProperty(gameSpy, 'snapshot', { get: () => stateSubject.value });
        Object.defineProperty(gameSpy, 'state$', { get: () => stateSubject.asObservable() });

        const apiSpy = jasmine.createSpyObj('ApiService', ['analyze', 'saveHistory', 'getPeggingCard']);
        apiSpy.analyze.and.returnValue(of({ results: mockResults }));
        apiSpy.saveHistory.and.returnValue(of({}));
        apiSpy.getPeggingCard.and.returnValue(of({ card: { rank: 'A', suit: 'S' }, score: 0 }));

        TestBed.configureTestingModule({
            imports: [GameTableComponent, TranslateModule.forRoot()],
            providers: [
                { provide: GameService, useValue: gameSpy },
                { provide: ApiService, useValue: apiSpy }
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA]
        }).compileComponents();

        fixture = TestBed.createComponent(GameTableComponent);
        component = fixture.componentInstance;
        gameServiceSpy = TestBed.inject(GameService) as jasmine.SpyObj<GameService>;
        apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;

        const p1 = stateSubject.value.players[0];
        p1.cards = [
            { rank: '5', suit: 'H', value: 5, order: 5 },
            { rank: '6', suit: 'D', value: 6, order: 6 },
            { rank: '7', suit: 'S', value: 7, order: 7 },
            { rank: '8', suit: 'C', value: 8, order: 8 },
            { rank: '9', suit: 'H', value: 9, order: 9 },
            { rank: '10', suit: 'D', value: 10, order: 10 }
        ];

        // Mock getCardClasses to avoid errors
        spyOn(component, 'getCardClasses').and.returnValue({});

        // Ensure bottomPlayer resolves to P1
        Object.defineProperty(component, 'bottomPlayer', { get: () => p1 });
    }));

    // ─── DISCARD HINTS ──────────────────────────────────────────────────

    it('should show discard hint with kept cards and EV', fakeAsync(() => {
        stateSubject.value.players[0].score = 0;
        component.showHint();
        tick(100);

        expect(component.hintText).toBeTruthy();
        expect(component.hintText).toContain('HINT_DISCARD');
        // Default reason (Best long term value)
        expect(component.hintReason).toBe('GAME.REASON_DEFAULT');
        expect(component.isAnalyzing).toBeFalse();
        // Hint now pre-selects the discard cards
        expect(component.selectedCardIndices.size).toBe(2);

        component['clearHint']();
    }));

    it('should pick best pegging option when close to winning (need <= 5)', fakeAsync(() => {
        stateSubject.value.players[0].score = 117;
        component.showHint();
        tick(100);

        expect(component.hintText).toBeTruthy();
        expect(component.hintText).toContain('HINT_DISCARD');
        // Reason should be Endgame Pegging
        expect(component.hintReason).toBe('GAME.REASON_ENDGAME_PEGGING');
        expect(component.isAnalyzing).toBeFalse();

        component['clearHint']();
    }));

    it('should dismiss hint on second click', fakeAsync(() => {
        component.showHint();
        tick(100);
        expect(component.hintText).toBeTruthy();

        // Second click should dismiss
        component.showHint();
        expect(component.hintText).toBeNull();
    }));

    it('should auto-dismiss hint after timeout', fakeAsync(() => {
        component.showHint();
        tick(100);
        expect(component.hintText).toBeTruthy();

        tick(8000);
        expect(component.hintText).toBeNull();
    }));

    // ─── PEGGING HINTS ──────────────────────────────────────────────────

    it('should show pegging hint with suggested card', fakeAsync(() => {
        // Switch to pegging phase
        stateSubject.next({
            ...stateSubject.value,
            phase: 'pegging',
            turnPlayerId: 'p1',
            currentPeggingTotal: 10,
            peggingStack: []
        });

        component.showHint();
        tick(100);

        expect(component.hintText).toBeTruthy();
        expect(component.hintText).toContain('A');
        // REASON_PEGGING_STRATEGY because mocked score is 0
        expect(component.hintReason).toBe('GAME.REASON_PEGGING_STRATEGY');
        expect(component.isAnalyzing).toBeFalse();

        component['clearHint']();
    }));

    it('should show "say Go" hint when no card available', fakeAsync(() => {
        apiServiceSpy.getPeggingCard.and.returnValue(of({ card: null, score: 0 }));

        stateSubject.next({
            ...stateSubject.value,
            phase: 'pegging',
            turnPlayerId: 'p1',
            currentPeggingTotal: 28,
            peggingStack: []
        });

        component.showHint();
        tick(100);

        expect(component.hintText).toBeTruthy();
        // Should contain the "say Go" translation key content
        expect(component.isAnalyzing).toBeFalse();

        component['clearHint']();
    }));

    it('should clear hint when playing a card', fakeAsync(() => {
        stateSubject.next({
            ...stateSubject.value,
            phase: 'pegging',
            turnPlayerId: 'p1'
        });

        component.showHint();
        tick(100);
        expect(component.hintText).toBeTruthy();

        component.onCardClick(0);
        expect(component.hintText).toBeNull();

        component['clearHint']();
    }));
});
