import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { GameService } from '../../services/game.service';
import { GameState } from '../../services/game.state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule], // Add CommonModule
  templateUrl: './game-table.component.html',
  styleUrl: './game-table.component.css'
})
export class GameTableComponent implements OnInit {
  state$: Observable<GameState>;

  selectedCardIndices: Set<number> = new Set();

  constructor(private gameService: GameService) {
    this.state$ = this.gameService.state$;
  }

  ngOnInit() {
    this.gameService.initGame();
  }

  onCardClick(playerId: string, cardIndex: number, phase: string) {
    if (phase === 'discarding') {
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
    return hand.some(c => currentTotal + c.value <= 31);
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

  getCountingTitle(state: GameState): string {
    if (state.countingStage === 'non_dealer_hand') {
      const dealerIndex = state.players.findIndex(p => p.isDealer);
      const nonDealerIndex = (dealerIndex + 1) % state.players.length;
      return `${state.players[nonDealerIndex].name}'s Hand`;
    } else if (state.countingStage === 'dealer_hand') {
      return "Dealer's Hand";
    } else if (state.countingStage === 'crib') {
      return "Dealer's Crib";
    }
    return '';
  }

  advanceCounting() {
    this.gameService.advanceCountingStage();
  }
}
