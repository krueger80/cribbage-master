import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameState, INITIAL_GAME_STATE, Player, GamePhase } from './game.state';
import { Card, getAllCards, createCard, calculateScore } from '../logic/cards';

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
    }

    discard(playerId: string, cardIndices: number[]) {
        const players = this.snapshot.players;
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        // Move cards to crib
        // Indices are 0-based index in player.cards
        // We sort descending to remove from back first to avoid index shift issues? 
        // Or just filter.
        const discards = cardIndices.map(i => player.cards[i]);
        player.cards = player.cards.filter((_, i) => !cardIndices.includes(i));

        const currentCrib = this.snapshot.crib;
        this.updateState({
            crib: [...currentCrib, ...discards],
            players: [...players] // trigger update
        });

        // Check if all players have discarded
        // For 2 players, each should discard 2 cards, remaining 4
        const allReady = players.every(p => p.cards.length === 4);
        if (allReady) {
            this.cutDeck();
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
    }

    // Utility
    private shuffle(cards: Card[]): Card[] {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return cards;
    }

    private getNextPlayerId(currentId: string): string {
        const players = this.snapshot.players;
        const idx = players.findIndex(p => p.id === currentId);
        return players[(idx + 1) % players.length].id;
    }
}
