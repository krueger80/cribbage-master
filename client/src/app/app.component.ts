import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardPickerComponent } from './components/card-picker/card-picker.component';
import { AnalysisViewComponent } from './components/analysis-view/analysis-view.component';
import { HistoryViewComponent } from './components/history-view/history-view.component';
import { ApiService, AnalysisResult, HandHistory } from './services/api.service';
import { ToastComponent } from './components/toast/toast.component';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule, TranslateModule, CardPickerComponent, AnalysisViewComponent, HistoryViewComponent, ToastComponent],
  template: `
    <div class="relative min-h-screen">
        
      <!-- BACKDROP -->
      <div *ngIf="isMenuOpen" (click)="isMenuOpen = false" class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"></div>

      <!-- HAMBURGER MENU BUTTON -->
      <button (click)="isMenuOpen = !isMenuOpen" class="fixed top-4 left-4 z-50 text-2xl p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition shadow-lg" [attr.aria-label]="isMenuOpen ? 'Close Menu' : 'Open Menu'">
            {{ isMenuOpen ? '✕' : '☰' }}
      </button>

      <!-- MENU OVERLAY -->
      <div *ngIf="isMenuOpen" class="fixed top-16 left-4 z-50 flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl animate-fade-in min-w-[200px]">
             
            <!-- Navigation -->
            <div class="flex flex-col gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
                <span class="text-xs text-gray-500 uppercase tracking-wider font-bold px-2">{{ 'APP.NAVIGATION' | translate }}</span>
                <button class="btn btn-sm justify-start w-full" [class.btn-primary]="viewMode === 'analyze'" [class.btn-ghost]="viewMode !== 'analyze'" (click)="setView('analyze'); isMenuOpen = false">
                    🃏 {{ 'APP.ANALYZER' | translate }}
                </button>
                <button class="btn btn-sm justify-start w-full" [class.btn-primary]="viewMode === 'history'" [class.btn-ghost]="viewMode !== 'history'" (click)="setView('history'); isMenuOpen = false">
                    📜 {{ 'APP.HISTORY' | translate }}
                </button>
            </div>

            <!-- Language -->
            <div class="flex flex-col gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
                <span class="text-xs text-gray-500 uppercase tracking-wider font-bold px-2">{{ 'APP.LANGUAGE' | translate }}</span>
                <div class="flex gap-1">
                    <button (click)="switchLanguage('en')" class="flex-1 btn btn-xs" [class.btn-primary]="currentLang === 'en'" [class.btn-ghost]="currentLang !== 'en'">EN</button>
                    <button (click)="switchLanguage('fr')" class="flex-1 btn btn-xs" [class.btn-primary]="currentLang === 'fr'" [class.btn-ghost]="currentLang !== 'fr'">FR</button>
                </div>
            </div>

            <!-- Theme -->
            <div class="flex flex-col gap-2">
                <span class="text-xs text-gray-500 uppercase tracking-wider font-bold px-2">{{ 'APP.THEME' | translate }}</span>
                <div class="grid grid-cols-3 gap-1">
                    <button (click)="setTheme('light')" class="btn btn-xs flex items-center justify-center text-lg" [class.btn-primary]="theme === 'light'" [class.btn-ghost]="theme !== 'light'" title="Light">☀️</button>
                    <button (click)="setTheme('dark')" class="btn btn-xs flex items-center justify-center text-lg" [class.btn-primary]="theme === 'dark'" [class.btn-ghost]="theme !== 'dark'" title="Dark">🌙</button>
                    <button (click)="setTheme('auto')" class="btn btn-xs flex items-center justify-center text-lg" [class.btn-primary]="theme === 'auto'" [class.btn-ghost]="theme !== 'auto'" title="Auto">⚙️</button>
                </div>
            </div>
            
      </div>

      <div class="container animate-fade-in relative">


      <header class="mb-12 text-center mt-8">
        <h1 class="text-5xl mb-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 pb-2"
            style="color: transparent; -webkit-background-clip: text; background-image: linear-gradient(to right, #34d399, #22d3ee);">
            {{ 'APP.TITLE' | translate }}
        </h1>
        <p class="text-slate-400">{{ 'APP.SUBTITLE' | translate }}</p>
      </header>
      
      <div class="flex flex-col gap-6">

        <!-- UNIFIED GAME SETUP CONTAINER -->
        <div *ngIf="viewMode === 'analyze'" class="w-full bg-white/90 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row gap-6 items-center justify-between animate-fade-in shadow-lg">
            
            <!-- SECTION 1: CONFIG (Players & Role) -->
            <div class="flex flex-col gap-4 w-full lg:w-auto shrink-0">
                <!-- Players -->
                <div>
                     <label class="text-xs text-gray-500 uppercase tracking-wider mb-1 block">{{ 'APP.PLAYERS' | translate }}</label>
                     <div class="flex gap-1">
                        <button *ngFor="let n of [2, 3, 4]" 
                                class="px-4 py-2 rounded-lg border border-slate-700 text-sm font-bold transition-all"
                                [class.bg-emerald-600]="numPlayers === n"
                                [class.border-emerald-500]="numPlayers === n"
                                [class.text-white]="numPlayers === n"
                                [class.bg-emerald-600]="numPlayers === n"
                                [class.border-emerald-500]="numPlayers === n"
                                [class.text-white]="numPlayers === n"
                                [class.bg-white]="numPlayers !== n"
                                [class.dark:bg-slate-800]="numPlayers !== n"
                                [class.text-gray-500]="numPlayers !== n"
                                [class.dark:text-gray-400]="numPlayers !== n"
                                [class.hover:bg-gray-50]="numPlayers !== n"
                                [class.dark:hover:bg-slate-700]="numPlayers !== n"
                                (click)="setPlayers(n)">
                            {{n}}
                        </button>
                    </div>
                </div>

                 <!-- Role -->
                 <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wider mb-1 block">{{ 'APP.ROLE' | translate }}</label>
                    <div (click)="isDealer = !isDealer" 
                         class="cursor-pointer flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                         [class.border-emerald-500]="isDealer"
                         [class.bg-emerald-50]="isDealer && theme !== 'dark'"
                         [class.bg-emerald-900]="isDealer && theme === 'dark'">
                        <span class="text-xl">{{ isDealer ? '👑' : '👤' }}</span>
                        <div class="flex flex-col leading-none">
                            <span class="text-sm font-bold text-gray-900 dark:text-white">{{ (isDealer ? 'APP.DEALER' : 'APP.NON_DEALER') | translate }}</span>
                        </div>
                    </div>
                 </div>
            </div>

            <!-- SECTION 2: HAND SELECTION -->
            <div class="w-full lg:flex-1 min-w-0">
                 <app-card-picker 
                    [selectedCards]="cards" 
                    [numPlayers]="numPlayers"
                    (cardsChange)="onCardsChange($event)" />
            </div>

            <!-- SECTION 3: ACTIONS -->
            <div class="flex flex-col gap-2 w-full lg:w-48 shrink-0">
                 <button class="btn btn-primary w-full py-4 text-lg shadow-lg shadow-emerald-900/50" 
                         [disabled]="isLoading"
                         (click)="analyze()">
                    <span *ngIf="!isLoading">🚀 {{ 'APP.ANALYZE_HAND' | translate }}</span>
                    <span *ngIf="isLoading" class="flex items-center gap-2 justify-center">
                        <span class="animate-spin">↻</span>
                    </span>
                </button>
                <button class="btn btn-secondary w-full" (click)="reset()">
                    {{ 'APP.RESET' | translate }}
                </button>
            </div>
        </div>


        <!-- Results Area -->
        <div class="w-full">
             <ng-container *ngIf="viewMode === 'analyze'">
                 <div *ngIf="analysisResults.length > 0" class="animate-fade-in">
                    <app-analysis-view [results]="analysisResults" [isDealer]="isDealer" />
                 </div>
                 <div *ngIf="analysisResults.length === 0 && !isLoading" class="mt-8 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl text-gray-500 dark:text-gray-600 bg-gray-50 dark:bg-slate-800/20">
                    <span class="text-4xl mb-2 opacity-30">🃏</span>
                    <p>{{ 'APP.EMPTY_STATE' | translate }}</p>
                 </div>
             </ng-container>

             <ng-container *ngIf="viewMode === 'history'">
                <app-history-view (restore)="onRestoreHistory($event)" />
             </ng-container>
        </div>

      </div>
      </div>
      <app-toast />
    </div>
  `
})
export class AppComponent {
  viewMode: 'analyze' | 'history' = 'analyze';
  numPlayers = 2;
  isDealer = false;
  cards: string[] = [];
  currentLang = 'en';
  isMenuOpen = false;

  get requiredCards(): number {
    return this.numPlayers === 2 ? 6 : 5;
  }

  analysisResults: AnalysisResult[] = [];
  isLoading = false;

  theme: 'light' | 'dark' | 'auto' = 'auto';

  constructor(private api: ApiService, private translate: TranslateService, private toast: ToastService) {
    this.translate.addLangs(['en', 'fr']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto';
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('auto');
    }
  }

  private darkQuery: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

  setTheme(mode: 'light' | 'dark' | 'auto') {
    this.theme = mode;
    localStorage.setItem('theme', mode);

    // Remove existing listener to prevent leaks or duplicate firing
    this.darkQuery.removeEventListener('change', this.handleThemeChange);

    if (mode === 'auto') {
      // Apply current preference
      this.applyAutoTheme();
      // Add listener for future changes
      this.darkQuery.addEventListener('change', this.handleThemeChange);
    } else {
      // Manual mode
      this.applyManualTheme(mode);
    }
  }

  private handleThemeChange = (e: MediaQueryListEvent) => {
    if (this.theme === 'auto') {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  private applyAutoTheme() {
    if (this.darkQuery.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private applyManualTheme(mode: 'light' | 'dark') {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  switchLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
  }

  setView(mode: 'analyze' | 'history') {
    this.viewMode = mode;
  }

  setPlayers(n: number) {
    this.numPlayers = n;
    this.analysisResults = []; // clear results on config change
  }

  onCardsChange(newCards: string[]) {
    this.cards = newCards;
  }

  reset() {
    this.cards = [];
    this.analysisResults = [];
  }

  analyze(saveToHistory: boolean = true) {
    if (this.cards.length !== this.requiredCards) {
      const msg = this.translate.instant('APP.ERROR_SELECT_CARDS', { count: this.requiredCards });
      this.toast.error(msg);
      return;
    }

    this.isLoading = true;
    this.api.analyze(this.cards, this.isDealer, this.numPlayers).subscribe({
      next: (res) => {
        this.analysisResults = res.results;
        this.isLoading = false;

        // Save best result to history if requested
        if (saveToHistory && this.analysisResults.length > 0) {
          const best = this.analysisResults[0]; // Assuming sorted by EV
          this.saveToHistory(best);
        }
      },
      error: (err) => {
        const msg = this.translate.instant('APP.ERROR_CALCULATING');
        this.toast.error(msg + err.message);
        this.isLoading = false;
      }
    });
  }

  private saveToHistory(result: AnalysisResult) {
    // Map discarded cards back to string codes
    const discardedCodes = result.discarded.map(c => c.rank + c.suit);

    const historyEntry = {
      originalHand: this.cards,
      discarded: discardedCodes,
      expectedValue: result.totalExpectedValue,
      isDealer: this.isDealer,
      numPlayers: this.numPlayers
    };

    this.api.saveHistory(historyEntry).subscribe({
      next: () => console.log('History saved'),
      error: (e) => console.error('Failed to save history', e)
    });
  }
  onRestoreHistory(item: HandHistory) {
    this.cards = [...item.originalHand];
    this.numPlayers = item.numPlayers;
    this.isDealer = item.isDealer;

    // Switch view and trigger analysis
    this.viewMode = 'analyze';

    // We wait a tick to ensure view switches and components init if needed, 
    // though since it's same component instance just hidden/shown via ngIf, it should be fine.
    // Call analyze with saveToHistory = false to prevent duplicates
    this.analyze(false);

    // Scroll to top to see results
    window.scrollTo(0, 0);
  }
}
