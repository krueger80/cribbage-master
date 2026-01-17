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

  localCountingStage: 'non_dealer_hand' | 'dealer_hand' | 'crib' | 'finished' = 'non_dealer_hand';

  ngOnInit() {
    // Game initialization is handled by Lobby/GameService now.
    // If not multiplayer, we could init default.
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer && state.players.length === 0) {
      this.gameService.initGame();
    }

    // Subscribe to state to reset local counting stage on new round
    this.gameService.state$.subscribe(s => {
      // console.log('[GameTable] State update. Phase:', s.phase, 'LocalStage:', this.localCountingStage);
      if (s.phase !== 'counting') {
        if (this.localCountingStage !== 'non_dealer_hand') {
          console.log('[GameTable] Resetting local counting stage to non_dealer_hand');
          this.localCountingStage = 'non_dealer_hand';
        }
      }
    });
  }

  // Helper to get the correct player object for "MY" hand (bottom screen)
  get bottomPlayer() {
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer) return state.players[0]; // Single player: P1 is human

    // Multiplayer: match localPlayerId
    const p = state.players.find(p => p.id === state.localPlayerId) || state.players[0];
    if (!p) console.warn('[GameTable] bottomPlayer not found!', state.localPlayerId, state.players);
    return p;
  }

  // Helper to get opponent (top screen)
  get topPlayer() {
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer) return state.players[1]; // Single player: P2 is CPU

    // Multiplayer: whoever is NOT me
    const p = state.players.find(p => p.id !== state.localPlayerId) || state.players[1];
    if (!p) console.warn('[GameTable] topPlayer not found!', state.localPlayerId, state.players);
    return p;
  }

  // Actions
  onCardClick(index: number) {
    if (this.gameService.snapshot.phase === 'discarding') {
      const id = this.bottomPlayer.id;
      if (this.selectedCardIndices.has(index)) {
        this.selectedCardIndices.delete(index);
      } else {
        if (this.selectedCardIndices.size < 2) {
          this.selectedCardIndices.add(index);
        }
      }
    } else if (this.gameService.snapshot.phase === 'pegging') {
      this.gameService.playCard(this.bottomPlayer.id, index);
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

  discard() {
    if (this.selectedCardIndices.size === 2) {
      this.gameService.discard(this.bottomPlayer.id, Array.from(this.selectedCardIndices));
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
  // Counting Phase Helpers
  getCountingCards(state: GameState): any[] {
    // If not multiplayer, just show everything?
    // But we want the slide-show effect.
    // Use localCountingStage.

    if (this.localCountingStage === 'non_dealer_hand') {
      // Show Non-Dealer Hand
      // Find Non-Dealer
      const dealerIndex = state.players.findIndex(p => p.isDealer);
      const nonDealerIndex = (dealerIndex + 1) % state.players.length;
      return state.players[nonDealerIndex].playedCards; // These are the cards they pegged with (their hand)
    } else if (this.localCountingStage === 'dealer_hand') {
      const dealer = state.players.find(p => p.isDealer);
      return dealer ? dealer.playedCards : [];
    } else if (this.localCountingStage === 'crib') {
      return state.crib;
    }
    return [];
  }

  getCountingScore(state: GameState): any {
    if (!state.countingResults) return null;

    if (this.localCountingStage === 'non_dealer_hand') {
      return state.countingResults.nonDealer;
    } else if (this.localCountingStage === 'dealer_hand') {
      return state.countingResults.dealer;
    } else if (this.localCountingStage === 'crib') {
      return state.countingResults.crib;
    }
    return null;
  }

  getPlayerNameKey(name: string): string {
    if (name === 'Host') return 'GAME.HOST';
    if (name === 'Guest') return 'GAME.GUEST';
    return name;
  }

  getCountingTitle(state: GameState): { key: string, params?: any } {
    if (this.localCountingStage === 'non_dealer_hand') {
      const dealerIndex = state.players.findIndex(p => p.isDealer);
      const nonDealerIndex = (dealerIndex + 1) % state.players.length;
      const pName = state.players[nonDealerIndex].name;
      const nameKey = this.getPlayerNameKey(pName);
      const translatedName = this.translate.instant(nameKey);

      return { key: 'GAME.PLAYER_HAND', params: { name: translatedName } };
    } else if (this.localCountingStage === 'dealer_hand') {
      return { key: 'GAME.DEALER_HAND' };
    } else if (this.localCountingStage === 'crib') {
      return { key: 'GAME.DEALER_CRIB' };
    }
    return { key: '' };
  }

  advanceCounting() {
    console.log('[GameTable] advanceCounting clicked. Current:', this.localCountingStage);
    if (this.localCountingStage === 'non_dealer_hand') {
      this.localCountingStage = 'dealer_hand';
    } else if (this.localCountingStage === 'dealer_hand') {
      this.localCountingStage = 'crib';
    } else if (this.localCountingStage === 'crib') {
      this.localCountingStage = 'finished';
      console.log('[GameTable] Finishing counting. Calling playerFinishedCounting.');
      this.finishCounting();
    }
    console.log('[GameTable] New Stage:', this.localCountingStage);
  }

  finishCounting() {
    // Notify server we are done
    this.gameService.playerFinishedCounting(this.bottomPlayer.id);
  }

  restartGame() {
    this.gameService.restartGame();
  }
}
