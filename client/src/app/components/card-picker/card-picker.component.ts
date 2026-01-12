import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-card-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="w-full flex flex-col gap-2">
      <!-- Grid of all cards -->
      <label class="text-xs text-gray-500 uppercase tracking-wider mb-0 block flex justify-between">
        <span>{{ 'CARD_PICKER.SELECT_HAND' | translate }} <span class="text-xs text-emerald-500 font-bold ml-2">({{selectedCards.length}}/{{maxCards}})</span></span>
        <button class="text-xs text-red-400 hover:text-red-300 uppercase font-bold tracking-wide" (click)="clear()">{{ 'CARD_PICKER.CLEAR_ALL' | translate }}</button>
      </label>
      
      <!-- Grid of all cards -->
      <div class="flex flex-col gap-2 overflow-x-auto pb-4 pt-2">
        <div *ngFor="let suit of suits" class="flex gap-2 min-w-max">

            
            <!-- Cards Row -->
            <div *ngFor="let rank of ranks" 
                 class="playing-card-mini"
                 [class.selected]="isSelected(rank, suit.code)"
                 [class.red]="suit.color === 'red'"
                 [class.black]="suit.color === 'black'"
                 (click)="toggleCard(rank, suit.code)">
                 <span class="text-xs font-bold">{{rank}}</span>
                 <span class="text-base leading-none pb-1">{{suit.symbol}}</span>
            </div>
        </div>
      </div>
      </div>

  `,
  styles: [`
    .playing-card-mini {
      width: 32px;
      height: 48px; /* Rectangular aspect ratio */
      background-color: var(--card-bg);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: 1px solid #ccc;
      transition: all 0.1s;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    .playing-card-mini:hover { transform: translateY(-2px); border-color: var(--primary-color); }
    .playing-card-mini.red { color: #e11d48; }
    .playing-card-mini.black { color: #0f172a; }
    
    .playing-card-mini.selected {
      background-color: var(--primary-color);
      color: white !important;
      border-color: var(--primary-color);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
      transform: scale(1.1);
    }
  `]
})
export class CardPickerComponent {
  @Input() selectedCards: string[] = []; // ["5H", "KS"]
  @Input() numPlayers: number = 2;
  @Output() cardsChange = new EventEmitter<string[]>();

  get maxCards(): number {
    return this.numPlayers === 2 ? 6 : 5;
  }

  ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  suits = [
    { code: 'H', symbol: '♥', color: 'red' },
    { code: 'D', symbol: '♦', color: 'red' },
    { code: 'C', symbol: '♣', color: 'black' },
    { code: 'S', symbol: '♠', color: 'black' }
  ];

  isSelected(rank: string, suitCode: string): boolean {
    return this.selectedCards.includes(rank + suitCode);
  }

  toggleCard(rank: string, suitCode: string) {
    const code = rank + suitCode;
    const index = this.selectedCards.indexOf(code);

    if (index >= 0) {
      // Remove
      this.selectedCards.splice(index, 1);
      this.cardsChange.emit(this.selectedCards);
    } else {
      // Add (if limit not reached)
      if (this.selectedCards.length < this.maxCards) {
        this.selectedCards.push(code);
        this.cardsChange.emit(this.selectedCards);
      }
    }
  }

  clear() {
    this.selectedCards = [];
    this.cardsChange.emit([]);
  }
}
