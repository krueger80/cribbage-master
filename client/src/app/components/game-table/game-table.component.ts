import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { GameService } from '../../services/game.service';
import { GameState } from '../../services/game.state';
import { ScorePopupComponent } from '../score-popup/score-popup.component'; // Import Popup
import { CribbageBoardComponent } from '../cribbage-board/cribbage-board.component';
import { formatScoreBreakdown, ScoreBreakdown } from '../../logic/cards'; // Import Helper
import { Observable } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule, TranslateModule, ScorePopupComponent, CribbageBoardComponent],
  templateUrl: './game-table.component.html',
  styleUrl: './game-table.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('cardPlay', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(100px) scale(0.8)' }),
        animate('400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ]),
    trigger('cardDeal', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(-100px)' }),
          stagger('100ms', [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'none' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.3)' }),
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class GameTableComponent implements OnInit {
  state$: Observable<GameState>;
  isLandscape: boolean = false;

  selectedCardIndices: Set<number> = new Set();


  constructor(private gameService: GameService, private translate: TranslateService, private ngZone: NgZone) {
    this.state$ = this.gameService.state$;

    const mq = window.matchMedia('(orientation: landscape)');
    this.isLandscape = mq.matches;
    mq.onchange = (e) => {
      this.ngZone.run(() => {
        this.isLandscape = e.matches;
      });
    };
  }

  localCountingStage: 'non_dealer_hand' | 'dealer_hand' | 'crib' | 'finished' = 'non_dealer_hand';

  displayedScores: { [id: string]: number } = { 'p1': 0, 'p2': 0 };
  private scoreAnimationIntervals: { [id: string]: any } = {};

  get bottomPlayer() {
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer) return state.players[0];

    const p = state.players.find(p => p.id === state.localPlayerId) || state.players[0];
    if (!p) console.warn('[GameTable] bottomPlayer not found!', state.localPlayerId, state.players);
    return p;
  }

  // Helper to get opponent (top screen)
  get topPlayer() {
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer) return state.players[1];

    const p = state.players.find(p => p.id !== state.localPlayerId) || state.players[1];
    if (!p) console.warn('[GameTable] topPlayer not found!', state.localPlayerId, state.players);
    return p;
  }

  ngOnInit() {
    const state = this.gameService.snapshot;
    if (!state.isMultiplayer && state.players.length === 0) {
      this.gameService.initGame();
    }

    // Initialize displayed scores immediately to avoid jump from 0
    if (state.players.length > 0) {
      state.players.forEach(p => this.displayedScores[p.id] = p.score);
    }

    this.gameService.state$.subscribe(s => {
      // Check counting stage reset
      if (s.phase !== 'counting') {
        if (this.localCountingStage !== 'non_dealer_hand') {
          this.localCountingStage = 'non_dealer_hand';
        }
      }

      // Check for score updates and animate
      s.players.forEach(p => {
        const currentDisplayed = this.displayedScores[p.id] || 0;
        if (p.score !== currentDisplayed) {
          this.animateScore(p.id, currentDisplayed, p.score);
        }
      });
    });
  }

  private animateScore(playerId: string, start: number, end: number) {
    if (this.scoreAnimationIntervals[playerId]) {
      clearInterval(this.scoreAnimationIntervals[playerId]);
    }

    const diff = end - start;
    if (diff === 0) return;

    // Pin animation is usually around 700ms-1000ms
    const duration = 1000;
    const steps = Math.abs(diff);
    // If it's a huge jump (reset?), do it instantly
    if (steps > 60) {
      this.displayedScores[playerId] = end;
      return;
    }

    const stepTime = Math.max(50, Math.min(200, duration / steps));
    let current = start;
    const increment = diff > 0 ? 1 : -1;

    this.scoreAnimationIntervals[playerId] = setInterval(() => {
      current += increment;
      this.displayedScores[playerId] = current;

      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        this.displayedScores[playerId] = end;
        clearInterval(this.scoreAnimationIntervals[playerId]);
        delete this.scoreAnimationIntervals[playerId];
      }
    }, stepTime);
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
        } else {
          // Already have 2, remove the LAST one (LIFO) and add the new one
          const last = Array.from(this.selectedCardIndices).pop();
          if (last !== undefined) {
            this.selectedCardIndices.delete(last);
          }
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

  trackPeggingItem(index: number, item: any) {
    return index;
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
  getCardClasses(card: any, index: number, playerId?: string): any {
    const isSelected = this.selectedCardIndices.has(index);
    // Optional: Use playerId to distinctive styling if needed (e.g., border color)
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

  getPopupData() {
    const state = this.gameService.snapshot;

    // Priority 1: Pegging Score (Transient)
    if (state.lastPeggingScore) {
      return {
        visible: true,
        points: state.lastPeggingScore.points,
        breakdown: state.lastPeggingScore.description ? state.lastPeggingScore.description.split(', ') : [],
        type: 'pegging' as const,
        title: 'Pegging Score',
        playerId: state.lastPeggingScore.playerId
      };
    }

    // Priority 2: Counting Phase (Persistent)
    if (state.phase === 'counting') {
      const score = this.getCountingScore(state);
      let title = 'Hand Score';
      let playerId = '';

      if (this.localCountingStage === 'crib') {
        title = 'Crib Score';
        const dealer = state.players.find(p => p.isDealer);
        playerId = dealer ? dealer.id : '';
      } else if (this.localCountingStage === 'dealer_hand') {
        const dealer = state.players.find(p => p.isDealer);
        title = dealer ? `${dealer.name} Score` : 'Dealer Score';
        playerId = dealer ? dealer.id : '';
      } else if (this.localCountingStage === 'non_dealer_hand') {
        const nonDealer = state.players.find(p => !p.isDealer);
        title = nonDealer ? `${nonDealer.name} Score` : 'Player Score';
        playerId = nonDealer ? nonDealer.id : '';
      }

      const upperTitle = title.toUpperCase(); // Ensure title is computed
      // Note: title was computed above, I will pass it directly.

      if (score && score.total >= 0) { // Handle 0 points too
        return {
          visible: true,
          points: score.total,
          breakdown: score.total > 0 ? formatScoreBreakdown(score) : ['No points'],
          type: 'counting' as const,
          title: upperTitle,
          playerId: playerId
        };
      }
    }

    return { visible: false, points: 0, breakdown: [], type: 'pegging' as const, title: '', playerId: '' };
  }

  getScoreDisplay(score: number): number {
    return Math.min(score, 121);
  }

  getVisualScore(playerIndex: number): number {
    const state = this.gameService.snapshot;
    if (!state.players[playerIndex]) return 0;

    const player = state.players[playerIndex];
    let score = player.score;

    // 1. Deduction from Pegging Popup (if active for this player)
    if (state.lastPeggingScore && state.lastPeggingScore.playerId === player.id) {
      score -= state.lastPeggingScore.points;
    }

    // 2. Deduction from Counting Phase (if phases not yet "visually" completed)
    if (state.phase === 'counting' && state.countingResults) {
      const res = state.countingResults;
      const isDealer = player.isDealer;

      if (this.localCountingStage === 'non_dealer_hand') {
        if (isDealer) {
          // Dealer hasn't been counted yet -> Deduct everything
          score -= (res.dealer.total + res.crib.total);
        } else {
          // Non-Dealer is being counted (Popup Visible) -> Deduct so we see "before" score
          score -= res.nonDealer.total;
        }
      } else if (this.localCountingStage === 'dealer_hand') {
        if (isDealer) {
          // Dealer is being counted -> Deduct Hand + Crib (Crib is next)
          score -= (res.dealer.total + res.crib.total);
        } else {
          // Non-Dealer Finished -> No deduction (Score displayed)
        }
      } else if (this.localCountingStage === 'crib') {
        if (isDealer) {
          // Crib being counted -> Deduct Crib
          score -= res.crib.total;
        }
        // Dealer Hand Finished -> Don't deduct
      }
    }

    return Math.max(0, score);
  }
}
