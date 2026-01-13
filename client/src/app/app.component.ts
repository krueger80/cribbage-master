import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardPickerComponent } from './components/card-picker/card-picker.component';
import { AnalysisViewComponent } from './components/analysis-view/analysis-view.component';
import { HistoryViewComponent } from './components/history-view/history-view.component';
import { ToastComponent } from './components/toast/toast.component';
import { HamburgerMenuComponent } from './components/hamburger-menu/hamburger-menu.component';
import { ApiService, AnalysisResult } from './services/api.service';
import { SupabaseService, HandHistory } from './services/supabase.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FormsModule,
    TranslateModule,
    CardPickerComponent,
    AnalysisViewComponent,
    HistoryViewComponent,
    ToastComponent,
    HamburgerMenuComponent
  ],
  template: `
    <div class="relative min-h-screen pb-12 transition-colors duration-200">
        
      <!-- HAMBURGER MENU COMPONENT -->
      <app-hamburger-menu 
          [isOpen]="isMenuOpen" 
          [viewMode]="viewMode"
          [currentLang]="currentLang"
          [theme]="theme"
          (closeMenu)="isMenuOpen = false"
          (viewModeChange)="setView($event)"
          (langChange)="switchLanguage($event)"
          (themeChange)="setTheme($event)" />

      <!-- MENU TOGGLE -->
      <button (click)="isMenuOpen = !isMenuOpen" class="fixed top-4 left-4 z-30 text-2xl p-2 rounded-lg bg-white/80 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-white transition backdrop-blur-md shadow-lg">
            {{ isMenuOpen ? '✕' : '☰' }}
      </button>

      <div class="container animate-fade-in pt-8 max-w-7xl mx-auto px-4">
        
        <!-- HEADER -->
        <header class="mb-8 text-center pt-8 md:pt-0">
            <h1 class="text-4xl md:text-5xl mb-2 pb-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-600 dark:from-emerald-400 dark:to-cyan-500">
                {{ 'APP.TITLE' | translate }}
            </h1>
            <p class="text-slate-500 dark:text-slate-400">{{ 'APP.SUBTITLE' | translate }}</p>
        </header>
  
        <!-- CONTENT -->
        <div class="flex flex-col gap-6">
          
          <!-- SETUP SECTION (Only in Analyze Mode) -->
          <div *ngIf="viewMode === 'analyze'" class="card p-6 animate-fade-in border-gray-200 dark:border-slate-700/50 shadow-xl bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm transition-colors duration-200">
              
              <!-- Setup Flow: Conf -> Cards -> Actions -->
              <div class="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                  
                  <!-- 1. CONFIGURATION + DESKTOP ACTION -->
                  <div class="flex flex-col gap-6 w-full lg:w-auto min-w-[200px]">
                      
                      <!-- Players & Role Container -->
                      <div class="flex flex-row lg:flex-col gap-4 lg:gap-6 w-full justify-between lg:justify-start">
                          <!-- Players -->
                          <div class="flex-1 lg:flex-none">
                              <label class="text-xs text-slate-500 uppercase tracking-wider mb-2 block font-bold">{{ 'APP.PLAYERS' | translate }}</label>
                              <div class="flex gap-2">
                                  <button *ngFor="let n of [2, 3, 4]" 
                                          class="flex-1 py-2 px-4 rounded border text-sm font-bold transition-all select-none"
                                          [class.bg-emerald-600]="numPlayers === n"
                                          [class.border-emerald-500]="numPlayers === n"
                                          [class.text-white]="numPlayers === n"
                                          [class.bg-gray-100]="numPlayers !== n"
                                          [class.dark:bg-slate-800]="numPlayers !== n"
                                          [class.border-gray-200]="numPlayers !== n"
                                          [class.dark:border-slate-700]="numPlayers !== n"
                                          [class.text-slate-600]="numPlayers !== n"
                                          [class.dark:text-slate-400]="numPlayers !== n"
                                          [class.hover:bg-gray-200]="numPlayers !== n"
                                          [class.dark:hover:bg-slate-700]="numPlayers !== n"
                                          (click)="setPlayers(n)">
                                      {{n}}
                                  </button>
                              </div>
                          </div>

                          <!-- Role -->
                          <div class="flex-1 lg:flex-none">
                               <label class="text-xs text-slate-500 uppercase tracking-wider mb-2 block font-bold">{{ 'APP.ROLE' | translate }}</label>
                                <div (click)="isDealer = !isDealer" 
                                     class="flex items-center justify-between p-3 rounded border cursor-pointer transition-all group hover:border-emerald-500/50 select-none"
                                     [ngClass]="{
                                        'bg-emerald-100 border-emerald-500 dark:bg-emerald-900/40 dark:border-emerald-600': isDealer,
                                        'bg-gray-100 border-gray-200 dark:bg-slate-800 dark:border-slate-700': !isDealer
                                     }">
                                    <div class="flex items-center gap-3">
                                        <span class="text-2xl group-hover:scale-110 transition">{{ isDealer ? '👑' : '👤' }}</span>
                                        <div class="flex flex-col">
                                            <span class="text-sm font-bold text-slate-900 dark:text-white">{{ isDealer ? ('APP.DEALER' | translate) : ('APP.NON_DEALER' | translate) }}</span>
                                        </div>
                                    </div>
                                    <div class="w-4 h-4 rounded-full border border-gray-400 dark:border-slate-600 flex items-center justify-center">
                                        <div *ngIf="isDealer" class="w-2.5 h-2.5 bg-emerald-500 dark:bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    </div>
                               </div>
                          </div>
                      </div>

                      <!-- DESKTOP ANALYZE BUTTON (Hidden on mobile) -->
                      <div class="hidden lg:block w-full">
                           <button class="btn btn-primary w-full py-3 px-4 text-base shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform active:scale-95 text-white select-none whitespace-normal h-auto text-center justify-center" 
                                   [disabled]="isLoading"
                                   (click)="analyze()">
                              <span *ngIf="!isLoading">{{ 'APP.ANALYZE_HAND' | translate }} 🚀</span>
                              <span *ngIf="isLoading" class="flex items-center gap-2 justify-center">
                                  <span class="animate-spin">↻</span>
                              </span>
                          </button>
                      </div>
                  </div>

                  <!-- 2. HAND SELECTION (Center) -->
                  <div class="w-full lg:flex-1 lg:px-8 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-slate-700/50 pt-6 lg:pt-0">
                      <app-card-picker 
                          [selectedCards]="cards" 
                          [numPlayers]="numPlayers"
                          (cardsChange)="onCardsChange($event)" />
                  </div>

                  <!-- 3. MOBILE ANALYZE BUTTON (Hidden on desktop) -->
                  <div class="lg:hidden w-full flex justify-center pt-6 border-t border-gray-200 dark:border-slate-700/50">
                       <button class="btn btn-primary py-3 px-8 text-base shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform active:scale-95 text-white select-none whitespace-normal h-auto text-center" 
                               [disabled]="isLoading"
                               (click)="analyze()">
                          <span *ngIf="!isLoading">{{ 'APP.ANALYZE_HAND' | translate }} 🚀</span>
                          <span *ngIf="isLoading" class="flex items-center gap-2 justify-center">
                              <span class="animate-spin">↻</span>
                          </span>
                      </button>
                  </div>

              </div>
          </div>

          <!-- RESULTS SECTION -->
          <div class="flex flex-col gap-6">
               <!-- Analyze View -->
               <ng-container *ngIf="viewMode === 'analyze'">
                   <div id="results-anchor" *ngIf="analysisResults.length > 0" class="animate-fade-in">
                      <app-analysis-view [results]="analysisResults" [isDealer]="isDealer" />
                   </div>
                   <!-- Clean Empty State via Opacity -->
                   <div *ngIf="analysisResults.length === 0 && !isLoading" class="text-center py-12 opacity-60 pointer-events-none transition-opacity duration-500">
                      <div class="text-6xl mb-4 grayscale opacity-50">🃏</div>
                      <p class="text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400 font-semibold">{{ 'APP.EMPTY_STATE' | translate }}</p>
                   </div>
               </ng-container>

               <!-- History View -->
               <ng-container *ngIf="viewMode === 'history'">
                  <div *ngIf="currentUser; else loginBlocked">
                      <app-history-view (restore)="onRestoreHistory($event)" />
                  </div>
                  <ng-template #loginBlocked>
                      <div class="flex flex-col items-center justify-center p-12 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-gray-500 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/20">
                          <span class="text-4xl mb-2">🔒</span>
                          <h3 class="text-lg font-bold text-slate-600 dark:text-slate-300">Login Required</h3>
                          <p>Please open the menu (☰) and sign in to access history.</p>
                      </div>
                  </ng-template>
               </ng-container>
          </div>

        </div>
      </div>
      <app-toast />
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  viewMode: 'analyze' | 'history' = 'analyze';
  numPlayers = 2;
  isDealer = false;
  cards: string[] = [];
  analysisResults: AnalysisResult[] = [];
  isLoading = false;
  currentUser: any = null;
  currentLang = 'en';
  isMenuOpen = false;
  theme: 'light' | 'dark' | 'auto' = 'auto';
  private darkQuery: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

  constructor(
    private api: ApiService,
    private translate: TranslateService,
    private toast: ToastService,
    private supabase: SupabaseService
  ) {
    this.translate.addLangs(['en', 'fr']);
    this.translate.setDefaultLang('en');

    // Auto-detect language
    const browserLang = this.translate.getBrowserLang();
    const useLang = browserLang && ['en', 'fr'].includes(browserLang) ? browserLang : 'en';

    this.translate.use(useLang);
    this.currentLang = useLang;

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto';
    this.setTheme(savedTheme || 'auto');
  }

  ngOnInit() {
    this.supabase.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    this.darkQuery.removeEventListener('change', this.handleThemeChange);
  }

  // Delegates
  get requiredCards(): number {
    return this.numPlayers === 2 ? 6 : 5;
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
    this.analysisResults = [];
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
      const msg = this.translate.instant('APP.ERROR_SELECT_CARDS', { count: this.requiredCards }) || `Select ${this.requiredCards} cards`;
      this.toast.error(msg);
      return;
    }

    this.isLoading = true;
    this.api.analyze(this.cards, this.isDealer, this.numPlayers).subscribe({
      next: (res) => {
        this.analysisResults = res.results;
        this.isLoading = false;

        setTimeout(() => {
          const el = document.getElementById('results-anchor');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);

        if (saveToHistory && this.analysisResults.length > 0) {
          const best = this.analysisResults[0];
          this.saveToHistory(best);
        }
      },
      error: (err) => {
        const msg = this.translate.instant('APP.ERROR_CALCULATING') || 'Error: ';
        this.toast.error(msg + err.message);
        this.isLoading = false;
      }
    });
  }

  private saveToHistory(result: AnalysisResult) {
    if (!this.currentUser) return;
    const discardedCodes = result.discarded.map(c => c.rank + c.suit);
    const historyEntry = {
      original_hand: this.cards,
      discarded: discardedCodes,
      expected_value: result.totalExpectedValue,
      is_dealer: this.isDealer,
      num_players: this.numPlayers
    };
    this.api.saveHistory(historyEntry).subscribe({
      next: () => console.log('History saved'),
      error: (e) => console.error('Failed to save history', e)
    });
  }

  onRestoreHistory(item: HandHistory) {
    this.cards = [...item.original_hand];
    this.numPlayers = item.num_players;
    this.isDealer = item.is_dealer;
    this.viewMode = 'analyze';
    setTimeout(() => this.analyze(false), 0);
    window.scrollTo(0, 0);
  }

  // --- THEME ---
  setTheme(mode: 'light' | 'dark' | 'auto') {
    this.theme = mode;
    localStorage.setItem('theme', mode);
    this.darkQuery.removeEventListener('change', this.handleThemeChange);
    if (mode === 'auto') {
      this.applyAutoTheme();
      this.darkQuery.addEventListener('change', this.handleThemeChange);
    } else {
      this.applyManualTheme(mode);
    }
  }

  private handleThemeChange = (e: MediaQueryListEvent) => {
    if (this.theme === 'auto') {
      if (e.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  };

  private applyAutoTheme() {
    if (this.darkQuery.matches) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }

  private applyManualTheme(mode: 'light' | 'dark') {
    if (mode === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
}
