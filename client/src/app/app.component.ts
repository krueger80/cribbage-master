import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardPickerComponent } from './components/card-picker/card-picker.component';
import { AnalysisViewComponent } from './components/analysis-view/analysis-view.component';
import { HistoryViewComponent } from './components/history-view/history-view.component';
import { ToastComponent } from './components/toast/toast.component';
import { ApiService, AnalysisResult } from './services/api.service';
import { SupabaseService } from './services/supabase.service';
import { ToastService } from './services/toast.service';
import { HandHistory } from './services/supabase.service';

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
    ToastComponent
  ],
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

    <div class="container animate-fade-in pt-8">
      <header class="mb-12 text-center">
        <h1 class="text-5xl mb-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500"
            style="color: transparent; -webkit-background-clip: text; background-image: linear-gradient(to right, #34d399, #22d3ee);">
            Cribbage Master
        </h1>
        <p class="text-slate-400">Advanced Discard Optimization Engine</p>
      </header>

      <div class="flex flex-col gap-6">
        
        <!-- MAIN CONTENT GRID -->
        <div class="grid lg:grid-cols-[1fr_3fr] gap-6">
            
            <!-- SIDEBAR -->
            <div class="flex flex-col gap-4">
                 
                 <!-- Auth -->
                 <div class="card p-4">
                    <div *ngIf="currentUser; else loginForm" class="flex flex-col gap-2">
                        <div class="flex items-center gap-2 text-emerald-400 font-bold truncate">
                            <span>👤</span> <span class="text-xs">{{ currentUser.email }}</span>
                        </div>
                        <button class="btn btn-sm btn-ghost border-slate-700 w-full" (click)="signOut()">Sign Out</button>
                    </div>
                    <ng-template #loginForm>
                        <div class="flex flex-col gap-2">
                             <input type="email" [(ngModel)]="email" placeholder="Email" class="p-2 rounded bg-slate-800 border border-slate-700 text-sm w-full">
                             <input type="password" [(ngModel)]="password" placeholder="Password" class="p-2 rounded bg-slate-800 border border-slate-700 text-sm w-full">
                             <div class="flex gap-2">
                                 <button class="btn btn-sm btn-primary flex-1" (click)="signIn()">Login</button>
                                 <button class="btn btn-sm btn-secondary flex-1" (click)="signUp()">Join</button>
                             </div>
                             <p *ngIf="authError" class="text-xs text-red-400">{{ authError }}</p>
                        </div>
                    </ng-template>
                 </div>

                 <!-- Game Setup (Analyze Mode) -->
                 <div *ngIf="viewMode === 'analyze'" class="card p-4 animate-fade-in">
                    <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>⚙️</span> {{ 'APP.SETUP' | translate }}
                    </h2>

                    <!-- Players -->
                    <div class="mb-4">
                        <label class="text-xs text-gray-400 uppercase tracking-wider mb-2 block">{{ 'APP.PLAYERS' | translate }}</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button *ngFor="let n of [2, 3, 4]" 
                                    class="py-2 rounded-lg border border-slate-700 text-sm font-bold transition-all"
                                    [class.bg-emerald-600]="numPlayers === n"
                                    [class.border-emerald-500]="numPlayers === n"
                                    [class.text-white]="numPlayers === n"
                                    [class.bg-slate-800]="numPlayers !== n"
                                    [class.text-gray-400]="numPlayers !== n"
                                    [class.hover:bg-slate-700]="numPlayers !== n"
                                    (click)="setPlayers(n)">
                                {{n}}
                            </button>
                        </div>
                    </div>

                    <!-- Dealer -->
                    <div class="mb-6">
                         <label class="text-xs text-gray-400 uppercase tracking-wider mb-2 block">{{ 'APP.ROLE' | translate }}</label>
                         <div (click)="isDealer = !isDealer" 
                              class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all"
                              [class.bg-emerald-900]="isDealer"
                              [class.border-emerald-600]="isDealer"
                              [class.bg-slate-800]="!isDealer"
                              [class.border-slate-700]="!isDealer">
                             <div class="flex items-center gap-3">
                                 <span class="text-2xl">{{ isDealer ? '👑' : '👤' }}</span>
                                 <div class="flex flex-col">
                                     <span class="text-sm font-bold text-white">{{ isDealer ? 'Dealer' : 'Non-Dealer' }}</span>
                                 </div>
                             </div>
                             <div class="w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center">
                                 <div *ngIf="isDealer" class="w-3 h-3 bg-emerald-400 rounded-full"></div>
                             </div>
                         </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex flex-col gap-2">
                         <button class="btn btn-primary w-full py-3 text-lg shadow-lg shadow-emerald-900/50" 
                                 [disabled]="cards.length < requiredCards || isLoading"
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
            </div>

            <!-- RIGHT COLUMN -->
            <div class="flex flex-col gap-6">
                 
                <!-- CARD PICKER (If Analyze) -->
                <app-card-picker *ngIf="viewMode === 'analyze'" 
                                 [selectedCards]="cards" 
                                 (cardsChange)="onCardsChange($event)" />

                 <!-- Analyze View -->
                 <ng-container *ngIf="viewMode === 'analyze'">
                     <div *ngIf="analysisResults.length > 0" class="animate-fade-in">
                        <app-analysis-view [results]="analysisResults" [isDealer]="isDealer" />
                     </div>
                     <div *ngIf="analysisResults.length === 0 && !isLoading" class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-700 rounded-xl text-gray-500 bg-slate-800/20">
                        <span class="text-4xl mb-2 opacity-50">🃏</span>
                        <p>{{ 'APP.EMPTY_STATE' | translate }}</p>
                     </div>
                 </ng-container>

                 <!-- History View -->
                 <ng-container *ngIf="viewMode === 'history'">
                    <div *ngIf="currentUser; else loginBlocked">
                        <app-history-view />
                    </div>
                    <ng-template #loginBlocked>
                        <div class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-700 rounded-xl text-gray-500 bg-slate-800/20">
                            <span class="text-4xl mb-2">🔒</span>
                            <h3 class="text-lg font-bold text-slate-300">Login Required</h3>
                            <p>Please sign in to view your history.</p>
                        </div>
                    </ng-template>
                 </ng-container>

            </div>
        </div>
      </div>
    </div>
    <app-toast />
  `
})
export class AppComponent implements OnInit, OnDestroy {
  viewMode: 'analyze' | 'history' = 'analyze';
  numPlayers = 2;
  isDealer = false;
  cards: string[] = [];

  analysisResults: AnalysisResult[] = [];
  isLoading = false;

  // Supabase Auth
  currentUser: any = null;
  email = '';
  password = '';
  authError = '';

  // Theme & Lang
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
    this.translate.use('en');

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto';
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('auto');
    }
  }

  ngOnInit() {
    // Auth Subscription
    this.supabase.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    this.darkQuery.removeEventListener('change', this.handleThemeChange);
  }

  // --- AUTH METHODS ---

  async signIn() {
    try {
      const { error } = await this.supabase.signIn(this.email, this.password);
      if (error) throw error;
      this.authError = '';
      this.toast.success('Logged in successfully');
    } catch (e: any) {
      this.authError = e.message;
      this.toast.error(e.message);
    }
  }

  async signUp() {
    try {
      const { error } = await this.supabase.signUp(this.email, this.password);
      if (error) throw error;
      this.authError = 'Check email for confirmation link!';
      this.toast.success('Check email for confirmation link!');
    } catch (e: any) {
      this.authError = e.message;
      this.toast.error(e.message);
    }
  }

  async signOut() {
    await this.supabase.signOut();
    this.viewMode = 'analyze'; // Reset view
    this.toast.info('Logged out');
  }

  // --- THEME METHODS ---

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

  // --- APP LOGIC ---

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

  get requiredCards(): number {
    return this.numPlayers === 2 ? 6 : 5;
  }

  analyze(saveToHistory: boolean = true) {
    if (this.cards.length !== this.requiredCards) {
      // Basic fallback if translation missing
      const msg = this.translate.instant('APP.ERROR_SELECT_CARDS') || `Select ${this.requiredCards} cards`;
      this.toast.error(msg);
      return;
    }

    this.isLoading = true;
    this.api.analyze(this.cards, this.isDealer, this.numPlayers).subscribe({
      next: (res) => {
        this.analysisResults = res.results;
        this.isLoading = false;

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
    // Use original_hand (from DB)
    this.cards = [...item.original_hand];
    this.numPlayers = item.num_players;
    this.isDealer = item.is_dealer;

    this.viewMode = 'analyze';
    // Analyze without saving a duplicate
    setTimeout(() => this.analyze(false), 0);
    window.scrollTo(0, 0);
  }
}
