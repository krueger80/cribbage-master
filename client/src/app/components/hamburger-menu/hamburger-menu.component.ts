import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-hamburger-menu',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    template: `
    <!-- BACKDROP -->
    <div *ngIf="isOpen" (click)="close()" class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"></div>

    <!-- MENU CONTENT -->
    <div *ngIf="isOpen" class="fixed top-0 left-0 h-full w-80 max-w-[90vw] z-50 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 shadow-2xl animate-slide-in flex flex-col p-6 overflow-y-auto font-sans transition-colors duration-200">
        
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-600 dark:from-emerald-400 dark:to-cyan-500">{{ 'APP.TITLE' | translate }}</h2>
            <button (click)="close()" class="btn btn-sm btn-ghost text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-slate-800 transition-colors">✕</button>
        </div>

        <!-- AUTH SECTION -->
        <div class="mb-8 border-b border-gray-200 dark:border-slate-700 pb-8">
            <h3 class="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <span>👤</span> {{ 'APP.ACCOUNT' | translate }}
            </h3>
            
            <div *ngIf="currentUser; else loginForm" class="flex flex-col gap-4 animate-fade-in">
                <div class="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
                        {{ currentUser.email?.[0]?.toUpperCase() }}
                    </div>
                    <div class="flex flex-col overflow-hidden">
                        <span class="text-xs text-slate-500 dark:text-slate-400">{{ 'APP.SIGNED_IN_AS' | translate }}</span>
                        <span class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ currentUser.email }}</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-ghost border-gray-200 dark:border-slate-700 w-full text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-900/10 dark:hover:text-red-400 dark:hover:border-red-500/50 transition-all font-semibold" (click)="signOut()">
                    {{ 'APP.SIGN_OUT' | translate }}
                </button>
            </div>

            <ng-template #loginForm>
                <div class="flex flex-col gap-3 animate-fade-in">
                    <button class="btn btn-outline border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white relative flex items-center justify-center gap-2 py-2.5" (click)="signInWithGoogle()" [disabled]="loading">
                        <svg class="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>{{ 'APP.SIGN_IN_GOOGLE' | translate }}</span>
                    </button>
                    
                    <div class="relative flex py-2 items-center">
                        <div class="flex-grow border-t border-gray-300 dark:border-slate-700"></div>
                        <span class="flex-shrink-0 mx-4 text-gray-400 text-xs">{{ 'APP.OR' | translate }}</span>
                        <div class="flex-grow border-t border-gray-300 dark:border-slate-700"></div>
                    </div>

                    <input type="email" [(ngModel)]="email" [placeholder]="'APP.EMAIL' | translate" class="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400">
                    <input type="password" [(ngModel)]="password" [placeholder]="'APP.PASSWORD' | translate" class="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400">
                    <div class="flex gap-2 mt-1">
                        <button class="btn btn-primary flex-1 py-2 font-bold shadow-lg shadow-emerald-500/20 text-white" (click)="signIn()" [disabled]="loading">
                            {{ loading ? ('APP.PROCESSING' | translate) : ('APP.LOGIN' | translate) }}
                        </button>
                        <button class="btn btn-ghost border-gray-200 dark:border-slate-700 flex-1 py-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-white hover:border-emerald-200 dark:hover:border-slate-500" (click)="signUp()" [disabled]="loading">
                            {{ 'APP.JOIN' | translate }}
                        </button>
                    </div>
                    <p *ngIf="authError" class="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-900/50 mt-2">{{ authError }}</p>
                </div>
            </ng-template>
        </div>

        <!-- NAVIGATION -->
        <div class="mb-8 border-b border-gray-200 dark:border-slate-700 pb-8">
            <h3 class="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <span>🧭</span> {{ 'APP.NAVIGATION' | translate }}
            </h3>
            <div class="flex flex-col gap-2">
                <button class="flex items-center justify-start w-full text-left pl-4 gap-3 h-12 text-sm font-medium transition-all rounded-lg select-none" 
                        [class.bg-emerald-100]="viewMode === 'analyze'" 
                        [class.dark:bg-slate-800]="viewMode === 'analyze'" 
                        [class.text-emerald-800]="viewMode === 'analyze'" 
                        [class.dark:text-white]="viewMode === 'analyze'" 
                        [class.border-emerald-200]="viewMode === 'analyze'"
                        [class.dark:border-slate-700]="viewMode === 'analyze'"
                        [class.border-transparent]="viewMode !== 'analyze'"
                        [class.bg-transparent]="viewMode !== 'analyze'"
                        [class.text-slate-600]="viewMode !== 'analyze'"
                        [class.dark:text-slate-400]="viewMode !== 'analyze'"
                        [class.hover:bg-gray-100]="viewMode !== 'analyze'"
                        [class.dark:hover:bg-slate-800]="viewMode !== 'analyze'"
                        (click)="setView('analyze')">
                    <span class="text-xl">🃏</span> {{ 'APP.ANALYZER' | translate }}
                </button>
                <button class="flex items-center justify-start w-full text-left pl-4 gap-3 h-12 text-sm font-medium transition-all rounded-lg select-none" 
                        [class.bg-emerald-100]="viewMode === 'history'" 
                        [class.dark:bg-slate-800]="viewMode === 'history'" 
                        [class.text-emerald-800]="viewMode === 'history'" 
                        [class.dark:text-white]="viewMode === 'history'" 
                        [class.border-emerald-200]="viewMode === 'history'"
                        [class.dark:border-slate-700]="viewMode === 'history'"
                        [class.border-transparent]="viewMode !== 'history'"
                        [class.bg-transparent]="viewMode !== 'history'"
                        [class.text-slate-600]="viewMode !== 'history'"
                        [class.dark:text-slate-400]="viewMode !== 'history'"
                        [class.hover:bg-gray-100]="viewMode !== 'history'"
                        [class.dark:hover:bg-slate-800]="viewMode !== 'history'"
                        (click)="setView('history')">
                    <span class="text-xl">📜</span> {{ 'APP.HISTORY' | translate }}
                </button>
                <button class="flex items-center justify-start w-full text-left pl-4 gap-3 h-12 text-sm font-medium transition-all rounded-lg select-none" 
                        [class.bg-emerald-100]="viewMode === 'game'" 
                        [class.dark:bg-slate-800]="viewMode === 'game'" 
                        [class.text-emerald-800]="viewMode === 'game'" 
                        [class.dark:text-white]="viewMode === 'game'" 
                        [class.border-emerald-200]="viewMode === 'game'"
                        [class.dark:border-slate-700]="viewMode === 'game'"
                        [class.border-transparent]="viewMode !== 'game'"
                        [class.bg-transparent]="viewMode !== 'game'"
                        [class.text-slate-600]="viewMode !== 'game'"
                        [class.dark:text-slate-400]="viewMode !== 'game'"
                        [class.hover:bg-gray-100]="viewMode !== 'game'"
                        [class.dark:hover:bg-slate-800]="viewMode !== 'game'"
                        (click)="setView('game')">
                    <span class="text-xl">🎮</span> {{ 'APP.GAME' | translate }}
                </button>

                <button class="flex items-center justify-start w-full text-left pl-4 gap-3 h-12 text-sm font-medium transition-all rounded-lg select-none" 
                        [class.bg-emerald-100]="viewMode === 'lobby'" 
                        [class.dark:bg-slate-800]="viewMode === 'lobby'" 
                        [class.text-emerald-800]="viewMode === 'lobby'" 
                        [class.dark:text-white]="viewMode === 'lobby'" 
                        [class.border-emerald-200]="viewMode === 'lobby'"
                        [class.dark:border-slate-700]="viewMode === 'lobby'"
                        [class.border-transparent]="viewMode !== 'lobby'"
                        [class.bg-transparent]="viewMode !== 'lobby'"
                        [class.text-slate-600]="viewMode !== 'lobby'"
                        [class.dark:text-slate-400]="viewMode !== 'lobby'"
                        [class.hover:bg-gray-100]="viewMode !== 'lobby'"
                        [class.dark:hover:bg-slate-800]="viewMode !== 'lobby'"
                        (click)="setView('lobby')">
                    <span class="text-xl">👥</span> {{ 'APP.LOBBY' | translate }}
                </button>
            </div>
        </div>

        <!-- SETTINGS -->
        <div class="flex flex-col gap-8">
            
            <!-- Language -->
            <div>
                <h3 class="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                    <span>🌐</span> {{ 'APP.LANGUAGE' | translate }}
                </h3>
                <div class="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                    <button (click)="switchLanguage('en')" class="flex-1 py-2 text-xs font-bold rounded transition-all select-none" 
                        [class.bg-white]="currentLang === 'en'" [class.dark:bg-slate-700]="currentLang === 'en'" 
                        [class.shadow-sm]="currentLang === 'en'"
                        [class.text-slate-900]="currentLang === 'en'" [class.dark:text-white]="currentLang === 'en'" 
                        [class.text-slate-500]="currentLang !== 'en'">English</button>
                    <button (click)="switchLanguage('fr')" class="flex-1 py-2 text-xs font-bold rounded transition-all select-none" 
                        [class.bg-white]="currentLang === 'fr'" [class.dark:bg-slate-700]="currentLang === 'fr'" 
                        [class.shadow-sm]="currentLang === 'fr'"
                        [class.text-slate-900]="currentLang === 'fr'" [class.dark:text-white]="currentLang === 'fr'" 
                        [class.text-slate-500]="currentLang !== 'fr'">Français</button>
                </div>
            </div>

            <!-- Theme -->
            <div>
                <h3 class="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                    <span>🎨</span> {{ 'APP.THEME' | translate }}
                </h3>
                <div class="grid grid-cols-3 gap-3">
                    <button (click)="setTheme('light')" 
                            class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all select-none"
                            [class.bg-emerald-100]="theme === 'light'"
                            [class.dark:bg-slate-800]="theme === 'light'"
                            [class.border-emerald-200]="theme === 'light'"
                            [class.dark:border-slate-700]="theme === 'light'"
                            [class.text-emerald-800]="theme === 'light'"
                            [class.dark:text-white]="theme === 'light'"
                            [class.bg-gray-50]="theme !== 'light'"
                            [class.dark:bg-slate-800]="theme !== 'light'"
                            [class.border-gray-200]="theme !== 'light'"
                            [class.dark:border-slate-700]="theme !== 'light'"
                            [class.text-slate-500]="theme !== 'light'">
                        <span class="text-xl">☀️</span> 
                        <span class="text-[10px] font-bold uppercase">Light</span>
                    </button>
                    <button (click)="setTheme('dark')" 
                            class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all select-none"
                            [class.bg-slate-800]="theme === 'dark'"
                            [class.border-slate-700]="theme === 'dark'"
                            [class.text-white]="theme === 'dark'"
                            [class.bg-gray-50]="theme !== 'dark'"
                            [class.dark:bg-slate-800]="theme !== 'dark'"
                            [class.border-gray-200]="theme !== 'dark'"
                            [class.dark:border-slate-700]="theme !== 'dark'"
                            [class.text-slate-500]="theme !== 'dark'">
                        <span class="text-xl">🌙</span> 
                        <span class="text-[10px] font-bold uppercase">Dark</span>
                    </button>
                    <button (click)="setTheme('auto')" 
                            class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all select-none"
                            [class.bg-emerald-100]="theme === 'auto'"
                            [class.dark:!bg-slate-800]="theme === 'auto'"
                            [class.border-emerald-200]="theme === 'auto'"
                            [class.dark:!border-slate-700]="theme === 'auto'"
                            [class.text-emerald-800]="theme === 'auto'"
                            [class.dark:text-white]="theme === 'auto'"
                            [class.bg-gray-50]="theme !== 'auto'"
                            [class.dark:bg-slate-800]="theme !== 'auto'"
                            [class.border-gray-200]="theme !== 'auto'"
                            [class.dark:border-slate-700]="theme !== 'auto'"
                            [class.text-slate-500]="theme !== 'auto'">
                        <span class="text-xl">⚙️</span> 
                        <span class="text-[10px] font-bold uppercase">Auto</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="mt-12 pt-6 border-t border-gray-200 dark:border-slate-800 text-center">
             <p class="text-xs text-slate-400 dark:text-slate-600 font-mono">v1.2.0 • {{ 'APP.TITLE' | translate }}</p>
        </div>
    </div>
  `,
    styles: [`
    .animate-slide-in {
        animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class HamburgerMenuComponent {
    @Input() isOpen = false;
    @Input() viewMode: 'analyze' | 'history' | 'game' | 'lobby' = 'analyze';
    @Input() currentLang = 'en';
    @Input() theme: 'light' | 'dark' | 'auto' = 'auto';

    @Output() closeMenu = new EventEmitter<void>();
    @Output() viewModeChange = new EventEmitter<'analyze' | 'history' | 'game' | 'lobby'>();
    @Output() langChange = new EventEmitter<string>();
    @Output() themeChange = new EventEmitter<'light' | 'dark' | 'auto'>();

    // Auth State
    currentUser: any = null;
    email = '';
    password = '';
    authError = '';
    loading = false;

    constructor(
        private supabase: SupabaseService,
        private toast: ToastService,
        private translate: TranslateService
    ) {
        this.supabase.currentUser$.subscribe(u => this.currentUser = u);
    }

    close() {
        this.closeMenu.emit();
    }

    setView(mode: 'analyze' | 'history' | 'game' | 'lobby') {
        this.viewModeChange.emit(mode);
        this.close();
    }

    switchLanguage(lang: string) {
        this.langChange.emit(lang);
    }

    setTheme(t: 'light' | 'dark' | 'auto') {
        this.themeChange.emit(t);
    }

    // --- Auth Logic moved here ---
    async signIn() {
        if (!this.email || !this.password) return;
        this.loading = true;
        try {
            const { error } = await this.supabase.signIn(this.email, this.password);
            if (error) throw error;
            this.authError = '';
            this.toast.success('Welcome back!');
        } catch (e: any) {
            this.authError = e.message;
            this.toast.error('Login failed');
        } finally {
            this.loading = false;
        }
    }

    async signInWithGoogle() {
        this.loading = true;
        try {
            const { error } = await this.supabase.signInWithGoogle();
            if (error) throw error;
        } catch (e: any) {
            this.authError = e.message;
            this.toast.error('Google Sign-in failed');
        } finally {
            this.loading = false;
        }
    }

    async signUp() {
        if (!this.email || !this.password) return;
        this.loading = true;
        try {
            const { error } = await this.supabase.signUp(this.email, this.password);
            if (error) throw error;
            this.authError = 'Check email for confirmation!';
            this.toast.success('Check email for confirmation!');
        } catch (e: any) {
            this.authError = e.message;
        } finally {
            this.loading = false;
        }
    }

    async signOut() {
        await this.supabase.signOut();
        this.toast.info('Signed out');
        this.setView('analyze'); // Go back to public view
    }
}
