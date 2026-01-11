import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../services/api.service';
import { HandHistory } from '../../services/supabase.service';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './history-view.component.html',
  styleUrl: './history-view.component.css'
})
export class HistoryViewComponent implements OnInit {
  history: HandHistory[] = [];
  isLoading = true;

  @Output() restore = new EventEmitter<HandHistory>();

  onRestore(item: HandHistory) {
    this.restore.emit(item);
  }

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.api.getHistory().subscribe({
      next: (data) => {
        this.history = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  getCardDetails(code: string) {
    if (!code) return { rank: '', suit: '', color: '' };
    const rank = code.slice(0, -1);
    const suitCode = code.slice(-1);
    let symbol = '';
    let color = '';

    switch (suitCode) {
      case 'H': symbol = '♥'; color = 'red'; break;
      case 'D': symbol = '♦'; color = 'red'; break;
      case 'C': symbol = '♣'; color = 'black'; break;
      case 'S': symbol = '♠'; color = 'black'; break;
    }

    return { rank, symbol, color };
  }
  getKeptCards(original: string[], discarded: string[]): string[] {
    // Filter out discarded cards from original hand
    // Since cards are unique strings in Cribbage (1 deck), simpler filter works
    return original.filter(c => !discarded.includes(c));
  }
}
