import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { GameTableComponent } from './game-table.component';
import { GameService } from '../../services/game.service';
import { ApiService, AnalysisResult } from '../../services/api.service';
import { TranslateModule } from '@ngx-translate/core';
import { of, BehaviorSubject } from 'rxjs';
import { GameState } from '../../services/game.state';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('GameTableComponent', () => {
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
            // Result 0: Best Total EV
            kept: [],
            discarded: [{ rank: '9', suit: 'H', value: 9, order: 9 }, { rank: '10', suit: 'D', value: 10, order: 10 }],
            handStats: { min: 4, max: 12, avg: 10, breakdown: {} as any },
            cribStats: { min: 2, max: 6, avg: 3, breakdown: {} as any },
            peggingScore: 2.0,
            totalExpectedValue: 15.0
        },
        {
            // Result 1: Best Pegging
            kept: [],
            discarded: [{ rank: '5', suit: 'H', value: 5, order: 5 }, { rank: '6', suit: 'D', value: 6, order: 6 }],
            handStats: { min: 2, max: 8, avg: 8, breakdown: {} as any },
            cribStats: { min: 2, max: 6, avg: 3, breakdown: {} as any },
            peggingScore: 6.0,
            totalExpectedValue: 14.0
        },
        {
            // Result 2: Guaranteed Win (High Min)
            kept: [],
            discarded: [{ rank: '7', suit: 'S', value: 7, order: 7 }, { rank: '8', suit: 'C', value: 8, order: 8 }],
            handStats: { min: 10, max: 10, avg: 10, breakdown: {} as any },
            cribStats: { min: 0, max: 0, avg: 0, breakdown: {} as any },
            peggingScore: 1.0,
            totalExpectedValue: 11.0
        }
    ];

    const verifySelection = (expectedResultIndex: number) => {
        const selected = Array.from(component.selectedCardIndices).sort();
        let expectedIndices: number[] = [];
        if (expectedResultIndex === 0) expectedIndices = [4, 5]; // 9H, 10D (at indices 4,5 in set hand)
        else if (expectedResultIndex === 1) expectedIndices = [0, 1]; // 5H, 6D (at indices 0,1)
        else if (expectedResultIndex === 2) expectedIndices = [2, 3]; // 7S, 8C (at indices 2,3)

        expect(selected).toEqual(expectedIndices, `Expected result index ${expectedResultIndex} (Indices ${expectedIndices}) but got ${selected}`);
    };

    beforeEach(waitForAsync(() => {
        stateSubject = new BehaviorSubject<GameState>(JSON.parse(JSON.stringify(initialState)));

        const gameSpy = jasmine.createSpyObj('GameService', ['discard', 'setLastAnalysis', 'acknowledgePeggingScore']);
        Object.defineProperty(gameSpy, 'snapshot', { get: () => stateSubject.value });
        Object.defineProperty(gameSpy, 'state$', { get: () => stateSubject.asObservable() });

        const apiSpy = jasmine.createSpyObj('ApiService', ['analyze', 'saveHistory']);
        apiSpy.analyze.and.returnValue(of({ results: mockResults }));
        apiSpy.saveHistory.and.returnValue(of({}));

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

        // Mock getCardClasses to avoid errors if viewed in test
        spyOn(component, 'getCardClasses').and.returnValue({});

        // Manually trigger onInit or just rely on autoSelect calling dependencies directly
        // component.ngOnInit(); 

        // Ensure bottomPlayer resolves to P1
        Object.defineProperty(component, 'bottomPlayer', { get: () => p1 });
    }));

    it('Scenario 1: Standard Play (Score 0) -> Pick Highest Total EV', () => {
        stateSubject.value.players[0].score = 0;
        component.autoSelect();
        verifySelection(0); // Expect Result 0
    });

    it('Scenario 2: Endgame Pegging (Need <= 5) -> Pick Highest Pegging', () => {
        // Need 4 pts (121 - 117 = 4)
        stateSubject.value.players[0].score = 117;
        component.autoSelect();
        verifySelection(1); // Expect Result 1 (Pegging 6.0)
    });

    it('Scenario 3: Guaranteed Win (Need <= 20) -> Pick Safe Min Hand', () => {
        // Need 10 pts (121 - 111 = 10)
        stateSubject.value.players[0].score = 111;
        stateSubject.value.players[0].isDealer = false;

        // Result 2 has Min 10. Result 0 has Min 4.
        component.autoSelect();
        verifySelection(2); // Expect Result 2 (Min 10)
    });

    it('Scenario 4: Desperate Offense (Opponent Threatening)', () => {
        // Player needs 15 (Score 106). Not Dealer.
        stateSubject.value.players[0].score = 106;
        stateSubject.value.players[0].isDealer = false;

        // Opponent (CPU) is threatening (Score 116 >= 115)
        stateSubject.value.players[1].score = 116;

        // Result 0: Hand Avg 10 + Peg 2 = 12
        // Result 1: Hand Avg 8 + Peg 6 = 14 (Best)
        // Result 2: Hand Avg 10 + Peg 1 = 11

        component.autoSelect();
        verifySelection(1); // Expect Result 1
    });

    it('Scenario 5: Opponent Threatening but Player is Dealer -> Standard Play (or Defensive)', () => {
        // If Player is Dealer, they count last (crib), so "Desperate Offense" logic (Hand+Peg only) shouldn't trigger
        // because crib matters. 
        // The implementation falls back to Standard EV or Guaranteed Win if applicable.
        // Let's test standard fallback logic here if needed < 15 but Dealer.

        stateSubject.value.players[0].score = 106;
        stateSubject.value.players[0].isDealer = true;
        stateSubject.value.players[1].score = 116;

        // Should pick Result 0 (Best Total EV 15.0) which includes Crib
        component.autoSelect();
        verifySelection(0);
    });

});
