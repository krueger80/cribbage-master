import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
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
export class HistoryViewComponent implements OnInit, AfterViewInit, OnDestroy {
  history: HandHistory[] = [];
  isLoading = true;
  isLoadingMore = false;

  offset = 0;
  limit = 20;
  hasMore = true;

  @ViewChild('sentinel') sentinel!: ElementRef<HTMLElement>;
  private observer: IntersectionObserver | undefined;

  @Output() restore = new EventEmitter<HandHistory>();

  onRestore(item: HandHistory) {
    this.restore.emit(item);
  }

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadHistory(true);
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  setupObserver() {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.isLoading && !this.isLoadingMore && this.hasMore) {
        this.loadHistory();
      }
    }, options);

    if (this.sentinel) {
      this.observer.observe(this.sentinel.nativeElement);
    }
  }

  loadHistory(reset: boolean = false) {
    if (reset) {
      this.offset = 0;
      this.hasMore = true;
      this.isLoading = true;
      this.history = [];
    } else {
      this.isLoadingMore = true;
    }

    this.api.getHistory(this.limit, this.offset).subscribe({
      next: (data) => {
        if (data.length < this.limit) {
          this.hasMore = false;
        }

        if (reset) {
          this.history = data;
        } else {
          this.history = [...this.history, ...data];
        }

        this.offset += this.limit;
        this.isLoading = false;
        this.isLoadingMore = false;

        // Re-attach observer if needed (sometimes needed if element was hidden)
        setTimeout(() => {
          if (this.sentinel && this.observer) {
            this.observer.unobserve(this.sentinel.nativeElement);
            this.observer.observe(this.sentinel.nativeElement);
          }
        }, 100);
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.isLoadingMore = false;
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
