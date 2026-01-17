import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { GameService } from '../../services/game.service';
import { GameState } from '../../services/game.state';
import { Observable } from 'rxjs';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './game-table.component.html',
  styleUrl: './game-table.component.css'
})
export class GameTableComponent implements OnInit {
  state$: Observable<GameState>;

  selectedCardIndices: Set<number> = new Set();


  constructor(private gameService: GameService, private translate: TranslateService) {
    this.state$ = this.gameService.state$;
  }

  ngOnInit() {
    // Game initialization is handled by Lobby/GameService now.
    // If not multiplayer, we could init default.
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer && state.players.length === 0) {
      this.gameService.initGame();
    }
  }

  // Helper to get the correct player object for "MY" hand (bottom screen)
  get bottomPlayer() {
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer) return state.players[0]; // Single player: P1 is human

    // Multiplayer: match localPlayerId
    return state.players.find(p => p.id === state.localPlayerId) || state.players[0];
  }

  // Helper to get opponent (top screen)
  get topPlayer() {
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer) return state.players[1]; // Single player: P2 is CPU

    // Multiplayer: whoever is NOT me
    return state.players.find(p => p.id !== state.localPlayerId) || state.players[1];
  }

  onCardClick(playerId: string, cardIndex: number, phase: string) {
    // Safety check: ensure we are clicking our own cards
    if (playerId !== this.bottomPlayer.id) return;

    if (phase === 'discarding') {
      // If we already discarded (have 4 cards), stop selection
      if (this.bottomPlayer.cards.length <= 4) return;

      this.toggleSelection(cardIndex);
    } else if (phase === 'pegging') {
      const state = this.gameService.snapshot;
      // Only allow play if it's player's turn (simplified check, service has robust check)
      if (state.turnPlayerId === playerId) {
        this.gameService.playCard(playerId, cardIndex);
      }
    }
  }

  sayGo(playerId: string) {
    this.gameService.sayGo(playerId);
  }

  canPlay(hand: any[], currentTotal: number): boolean {
    if (!hand || !Array.isArray(hand)) return false;
    return hand.some(c => currentTotal + c.value <= 31);
  }

  get isMyTurn(): boolean {
    const state = this.gameService.snapshot;
    return state.phase === 'pegging' && state.turnPlayerId === this.bottomPlayer.id;
  }

  get showSayGo(): boolean {
    if (!this.isMyTurn) return false;
    const state = this.gameService.snapshot;
    const player = this.bottomPlayer;
    // You can't "Say Go" if you have no cards (you're just out)
    if (!player.cards || player.cards.length === 0) return false;

    return !this.canPlay(player.cards, state.currentPeggingTotal);
  }

  toggleSelection(index: number) {
    const newSet = new Set(this.selectedCardIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      if (newSet.size < 2) {
        newSet.add(index);
      }
    }
    this.selectedCardIndices = newSet;
  }

  confirmDiscard(playerId: string) {
    // Double check we are confirming for ourself
    const me = this.bottomPlayer;
    if (playerId !== me.id) return;

    if (this.selectedCardIndices.size === 2) {
      this.gameService.discard(playerId, Array.from(this.selectedCardIndices));
      this.selectedCardIndices.clear();
    }
  }
  getCardClasses(card: any, index: number): any {
    const isSelected = this.selectedCardIndices.has(index);
    return {
      'red': card.suit === 'H' || card.suit === 'D',
      'black': card.suit === 'C' || card.suit === 'S',
      'selected': isSelected,
      'hover:-translate-y-2': !isSelected
    };
  }

  getSuitSymbol(suit: string): string {
    const map: any = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    return map[suit] || '?';
  }

  // Counting Phase Helpers
  getCountingCards(state: GameState): any[] {
    if (state.countingStage === 'non_dealer_hand') {
      const dealerIndex = state.players.findIndex(p => p.isDealer);
      const nonDealerIndex = (dealerIndex + 1) % state.players.length;
      return state.players[nonDealerIndex].playedCards;
    } else if (state.countingStage === 'dealer_hand') {
      const dealer = state.players.find(p => p.isDealer);
      return dealer ? dealer.playedCards : [];
    } else if (state.countingStage === 'crib') {
      return state.crib;
    }
    return [];
  }

  getPlayerNameKey(name: string): string {
    if (name === 'Host') return 'GAME.HOST';
    if (name === 'Guest') return 'GAME.GUEST';
    return name;
  }

  getCountingTitle(state: GameState): { key: string, params?: any } {
    if (state.countingStage === 'non_dealer_hand') {
      const dealerIndex = state.players.findIndex(p => p.isDealer);
      const nonDealerIndex = (dealerIndex + 1) % state.players.length;
      const pName = state.players[nonDealerIndex].name;
      const nameKey = this.getPlayerNameKey(pName);
      const translatedName = this.translate.instant(nameKey);

      return { key: 'GAME.PLAYER_HAND', params: { name: translatedName } };
    } else if (state.countingStage === 'dealer_hand') {
      return { key: 'GAME.DEALER_HAND' };
    } else if (state.countingStage === 'crib') {
      return { key: 'GAME.DEALER_CRIB' };
    }
    return { key: '' };
  }

  advanceCounting() {
    this.gameService.advanceCountingStage();
  }

  restartGame() {
    this.gameService.restartGame();
  }
}
