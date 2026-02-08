import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AnalysisResult, ApiService } from '../../services/api.service';

@Component({
    selector: 'app-analysis-view',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
    <div class="flex flex-col gap-4 animate-fade-in">
        
        <!-- Sorting Controls -->
        <div class="flex justify-end items-center">
            <div class="bg-gray-100 dark:bg-white/10 p-1 rounded-lg flex gap-1">
                <button (click)="setSort('total')" 
                        class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200"
                        [ngClass]="sortMethod === 'total' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'">
                    {{ 'ANALYSIS_VIEW.TOTAL' | translate }} (Total)
                </button>
                <button (click)="setSort('peg')" 
                        class="px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200"
                        [ngClass]="sortMethod === 'peg' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'">
                    {{ 'ANALYSIS_VIEW.PEG_POINTS' | translate }} (Pegging)
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div *ngFor="let res of sortedResults; let i = index; trackBy: trackByResult" 
                 class="card relative p-2 border border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
                 [class.border-l-4]="i===0" 
                 [class.border-primary]="i===0"
                 [class.bg-white]="i!==0"
                 [class.dark:bg-slate-800]="i!==0"
                 [class.bg-emerald-50]="i===0"
                 [class.dark:bg-slate-900]="i===0"
                 [style.view-transition-name]="getTransitionName(res)"
                 style="min-width: 250px">
                 
                <!-- Badge for Best Choice -->
                <div *ngIf="i===0 && sortMethod==='total'" class="absolute -top-px -right-px bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl rounded-tr-md z-10 shadow-sm">
                    {{ 'ANALYSIS_VIEW.BEST' | translate }}
                </div>
                <!-- Badge for Best Pegging -->
                <div *ngIf="i===0 && sortMethod==='peg'" class="absolute -top-px -right-px bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl rounded-tr-md z-10 shadow-sm">
                    {{ 'ANALYSIS_VIEW.BEST_PEGGING' | translate }}
                </div>

                <!-- Range (Moved to Top Right, underneath badge space or just top right if no badge) -->
                <!-- Range (Moved to Top Right) - REMOVED -->
                <div class="absolute top-1.5 right-2 text-[10px] text-gray-400 font-bold hidden" [class.mt-4]="i===0">
                    <!-- Placeholder to avoid breaking layout if something relies on it, or just remove content -->
                </div>

                <!-- Cards Row (Prominent at Top) -->
                <div class="flex justify-center items-center gap-3 mt-4 mb-3">
                    <!-- Keep Section -->
                    <div class="flex gap-1 flex-nowrap">
                            <div *ngFor="let c of res.kept" 
                                class="playing-card-micro shadow-lg shrink-0" 
                                [ngClass]="getCardColor(c.suit)">
                            <span class="text-xs font-bold">{{c.rank}}</span>
                            <span class="text-[10px]">{{getSuitSymbol(c.suit)}}</span>
                        </div>
                    </div>

                    <!-- Arrow -->
                    <div class="text-gray-400 text-xl mx-2">→</div>

                    <!-- Discard Section -->
                    <div class="flex gap-1 flex-nowrap">
                        <div *ngFor="let c of res.discarded" 
                                class="playing-card-micro opacity-80 shrink-0" 
                                [ngClass]="getCardColor(c.suit)">
                            <span class="text-xs font-bold">{{c.rank}}</span>
                            <span class="text-[10px]">{{getSuitSymbol(c.suit)}}</span>
                        </div>
                    </div>
                </div>

                <!-- Stats Accordion / Table -->
                <div (click)="toggleDetails(i)" 
                     class="rounded border border-gray-200 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors select-none overflow-hidden">
                    
                    <!-- Collapsed View (Summary Row) -->
                    <!-- Cols: Icon | Peg | Hand | Crib | Total -->
                    <div class="grid grid-cols-5 p-1.5 text-center items-stretch">
                        <!-- Icon -->
                        <div class="flex flex-col justify-center items-center text-gray-400 text-[10px]">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" 
                                 class="w-4 h-4 text-gray-400 transition-transform duration-200"
                                 [class.rotate-180]="isExpanded(i)">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </div>

                        <!-- Peg -->
                        <div class="flex flex-col border-l border-gray-100 dark:border-white/5">
                            <span class="text-[9px] uppercase text-gray-500 font-bold tracking-wider">{{ 'ANALYSIS_VIEW.PEG' | translate }}</span>
                            <span class="font-bold text-sm leading-none mt-0.5" [ngClass]="pegColorClass">{{ res.peggingScore | number:'1.1-1' }}</span>
                        </div>

                        <!-- Hand -->
                        <div class="flex flex-col border-l border-gray-100 dark:border-white/5">
                            <span class="text-[9px] uppercase text-gray-500 font-bold tracking-wider">{{ 'ANALYSIS_VIEW.HAND' | translate }}</span>
                             <span class="font-bold text-sm leading-none mt-0.5" [ngClass]="handColorClass">{{ res.handStats.avg | number:'1.1-1' }}</span>
                             <span class="text-[9px] text-gray-400 font-medium leading-none block -mt-0.5">{{res.handStats.min}}-{{res.handStats.max}}</span>
                        </div>

                        <!-- Crib -->
                        <div class="flex flex-col border-l border-gray-100 dark:border-white/5">
                            <span class="text-[9px] uppercase text-gray-500 font-bold tracking-wider">{{ 'ANALYSIS_VIEW.CRIB' | translate }}</span>
                            <span class="font-bold text-sm leading-none mt-0.5" [ngClass]="cribColorClass">{{ res.cribStats.avg | number:'1.1-1' }}</span>
                            <span class="text-[9px] text-gray-400 font-medium leading-none block -mt-0.5">{{res.cribStats.min}}-{{res.cribStats.max}}</span>
                        </div>

                        <!-- Total -->
                        <div class="flex flex-col border-l border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 -my-1.5 py-1.5">
                            <span class="text-[9px] uppercase text-gray-900 dark:text-gray-100 font-extrabold tracking-wider">TOTAL</span>
                            <span class="font-black text-sm leading-none mt-0.5 text-gray-900 dark:text-white">{{ res.totalExpectedValue | number:'1.1-1' }}</span>
                        </div>
                    </div>

                    <!-- Expanded View (Breakdown) -->
                    <div *ngIf="isExpanded(i)" class="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-2 text-[10px] animate-fade-in">
                        <!-- Grid Layout -->
                        <div class="grid grid-cols-5 gap-y-1 gap-x-2 items-center">
                            
                            <!-- Headers for clarity in expanded view? Optional, but good for alignment -->
                            <!-- Row 1: 15s -->
                            <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.FIFTEENS' | translate }}</div>
                            <div class="text-center text-gray-300">-</div> <!-- Peg -->
                            <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.fifteens | number:'1.0-1'}}</div>
                            <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.fifteens | number:'1.0-1'}}</div>
                            <div class="text-center font-bold text-gray-400">{{ (res.handStats.breakdown.fifteens + res.cribStats.breakdown.fifteens) | number:'1.0-1' }}</div>

                            <!-- Pairs -->
                            <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.PAIRS' | translate }}</div>
                            <div class="text-center text-gray-300">-</div>
                            <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.pairs | number:'1.0-1'}}</div>
                            <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.pairs | number:'1.0-1'}}</div>
                            <div class="text-center font-bold text-gray-400">{{ (res.handStats.breakdown.pairs + res.cribStats.breakdown.pairs) | number:'1.0-1' }}</div>

                            <!-- Runs -->
                            <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.RUNS' | translate }}</div>
                            <div class="text-center text-gray-300">-</div>
                            <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.runs | number:'1.0-1'}}</div>
                            <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.runs | number:'1.0-1'}}</div>
                            <div class="text-center font-bold text-gray-400">{{ (res.handStats.breakdown.runs + res.cribStats.breakdown.runs) | number:'1.0-1' }}</div>

                            <!-- Flush -->
                            <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.FLUSH' | translate }}</div>
                            <div class="text-center text-gray-300">-</div>
                            <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.flush | number:'1.0-1'}}</div>
                            <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.flush | number:'1.0-1'}}</div>
                            <div class="text-center font-bold text-gray-400">{{ (res.handStats.breakdown.flush + res.cribStats.breakdown.flush) | number:'1.0-1' }}</div>

                            <!-- Nobs -->
                            <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.NOBS' | translate }}</div>
                            <div class="text-center text-gray-300">-</div>
                            <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.nobs | number:'1.0-1'}}</div>
                            <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.nobs | number:'1.0-1'}}</div>
                            <div class="text-center font-bold text-gray-400">{{ (res.handStats.breakdown.nobs + res.cribStats.breakdown.nobs) | number:'1.0-1' }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `,
    styles: [`
    .playing-card-micro {
        width: 32px;
        height: 48px;
        background-color: white;
        border-radius: 3px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px solid #999;
        position: relative;
        z-index: 1;
    }
    .playing-card-micro:hover {
        z-index: 10;
        transform: translateY(-5px);
    }
    .playing-card-micro.red { color: #e11d48; }
    .playing-card-micro.black { color: #0f172a; }
    
    /* Smooth reordering animation placeholder */
    /* Note: Angular's *ngFor reordering without animations module is instant. */
    /* To make it "nice", we rely on View Transitions (if supported) or CSS transforms. */
    /* Since we use view-transition-name, modern browsers will animate automatically. */
    `]
})
export class AnalysisViewComponent {
    @Input() set results(value: AnalysisResult[]) {
        this._results = value;
        // Reset sort to total when new results arrive, or keep? 
        // Let's keep specific user preference if they set it? 
        // Actually, usually safer to just re-sort.
    }
    get results(): AnalysisResult[] {
        return this._results;
    }
    private _results: AnalysisResult[] = [];

    @Input() isDealer: boolean = false;

    constructor(private cdr: ChangeDetectorRef) { }

    expandedIndices: Set<number> = new Set();
    sortMethod: 'total' | 'peg' = 'total';

    get sortedResults(): AnalysisResult[] {
        if (!this.results) return [];

        return [...this.results].sort((a, b) => {
            if (this.sortMethod === 'total') {
                return b.totalExpectedValue - a.totalExpectedValue;
            } else {
                return b.peggingScore - a.peggingScore;
            }
        });
    }

    setSort(method: 'total' | 'peg') {
        const doc = document as any;
        if (doc.startViewTransition) {
            doc.startViewTransition(() => {
                this.sortMethod = method;
                this.cdr.detectChanges(); // Force DOM update during transition capture
            });
        } else {
            this.sortMethod = method;
        }
    }

    getTransitionName(res: AnalysisResult): string {
        // Unique ID for View Transitions: Card ranks/suits + dealer status (redundant but safe)
        // Sanitizing just in case
        const keptId = res.kept.map(c => c.rank + c.suit).join('');
        return "card-" + keptId;
    }

    trackByResult = (index: number, res: AnalysisResult): string => {
        return this.getTransitionName(res);
    }

    toggleDetails(index: number) {
        if (this.expandedIndices.has(index)) {
            this.expandedIndices.delete(index);
        } else {
            this.expandedIndices.add(index);
        }
    }

    isExpanded(index: number): boolean {
        return this.expandedIndices.has(index);
    }

    getCardColor(suit: string): string {
        return (suit === 'H' || suit === 'D') ? 'red' : 'black';
    }

    getSuitSymbol(suit: string): string {
        const map: any = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
        return map[suit] || '?';
    }

    get handColorClass(): string {
        return 'text-emerald-500 dark:text-emerald-400';
    }

    get pegColorClass(): string {
        return 'text-emerald-500 dark:text-emerald-400';
    }

    get cribColorClass(): string {
        return this.isDealer
            ? 'text-emerald-500 dark:text-emerald-400'
            : 'text-rose-500 dark:text-rose-400';
    }

    get handBreakdownColorClass(): string {
        return 'text-emerald-900 dark:text-emerald-100';
    }

    get cribBreakdownColorClass(): string {
        return this.isDealer
            ? 'text-emerald-900 dark:text-emerald-100'
            : 'text-rose-900 dark:text-rose-100';
    }

    getTotalMin(res: AnalysisResult): number {
        if (this.isDealer) {
            return res.handStats.min + res.cribStats.min + res.peggingScore;
        }
        return res.handStats.min - res.cribStats.max + res.peggingScore;
    }

    getTotalMax(res: AnalysisResult): number {
        if (this.isDealer) {
            return res.handStats.max + res.cribStats.max + res.peggingScore;
        }
        return res.handStats.max - res.cribStats.min + res.peggingScore;
    }
}
