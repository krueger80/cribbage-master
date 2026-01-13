import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AnalysisResult, ApiService } from '../../services/api.service';

@Component({
    selector: 'app-analysis-view',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
        <div *ngFor="let res of results; let i = index" 
             class="card relative p-2 border border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 transition-colors"
             [class.border-l-4]="i===0" 
             [class.border-primary]="i===0"
             [class.bg-white]="i!==0"
             [class.dark:bg-slate-800]="i!==0"
             [class.bg-emerald-50]="i===0"
             [class.dark:bg-slate-900]="i===0"
             style="min-width: 250px">
             
            <!-- Badge for Best Choice -->
            <div *ngIf="i===0" class="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl rounded-tr-xl">
                {{ 'ANALYSIS_VIEW.BEST' | translate }}
            </div>

            <!-- Header Stats -->
            <div class="flex justify-between items-end mb-3 border-b border-gray-200 dark:border-white/5 pb-2">
                 <div class="flex flex-col">
                    <span class="text-[10px] uppercase text-gray-500 font-bold tracking-wider leading-none mb-0">{{ 'ANALYSIS_VIEW.EXPECTED' | translate }}</span>
                    <span class="text-3xl font-bold text-gray-900 dark:text-white leading-none">
                        {{ res.totalExpectedValue | number:'1.1-1' }}
                    </span>
                 </div>
                 <div class="text-right">
                    <span class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">{{ 'ANALYSIS_VIEW.RANGE' | translate }}</span>
                    <div class="text-sm text-gray-400">
                        {{res.handStats.min + (isDealer ? res.cribStats.min : 0) }}-{{res.handStats.max + (isDealer ? res.cribStats.max : 0)}}
                    </div>
                 </div>
            </div>

            <!-- Cards Row -->
            <div class="flex justify-center items-center gap-3 mb-3">
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

            <!-- Stats Accordion -->
            <div (click)="toggleDetails(i)" 
                 class="mt-1 rounded border border-gray-200 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors select-none overflow-hidden">
                
                <!-- Collapsed / Header View -->
                <div class="grid grid-cols-4 p-1.5 text-center items-center">
                    <!-- Spacer for alignment with labels / Icon -->
                    <div class="flex flex-col justify-center items-center text-gray-400 text-[10px]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" 
                             class="w-4 h-4 text-gray-400 transition-transform duration-200"
                             [class.rotate-180]="isExpanded(i)">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>

                    <!-- Hand -->
                    <div class="flex flex-col border-l border-gray-100 dark:border-white/5">
                        <span class="text-[9px] uppercase text-gray-500 font-bold tracking-wider">{{ 'ANALYSIS_VIEW.HAND' | translate }}</span>
                         <span [class.invisible]="isExpanded(i)" class="font-bold text-sm leading-none mt-0.5" [ngClass]="handColorClass">{{ res.handStats.avg | number:'1.1-1' }}</span>
                    </div>
                    <!-- Crib -->
                    <div class="flex flex-col border-l border-gray-100 dark:border-white/5">
                        <span class="text-[9px] uppercase text-gray-500 font-bold tracking-wider">{{ 'ANALYSIS_VIEW.CRIB' | translate }}</span>
                        <span [class.invisible]="isExpanded(i)" class="font-bold text-sm leading-none mt-0.5" [ngClass]="cribColorClass">{{ res.cribStats.avg | number:'1.1-1' }}</span>
                    </div>
                    <!-- Peg -->
                    <div class="flex flex-col border-l border-gray-100 dark:border-white/5">
                        <span class="text-[9px] uppercase text-gray-500 font-bold tracking-wider">{{ 'ANALYSIS_VIEW.PEG' | translate }}</span>
                        <span [class.invisible]="isExpanded(i)" class="font-bold text-sm leading-none mt-0.5" [ngClass]="pegColorClass">{{ res.peggingScore | number:'1.1-1' }}</span>
                    </div>
                </div>

                <!-- Expanded View -->
                <div *ngIf="isExpanded(i)" class="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-2 text-[10px] animate-fade-in">
                    <!-- Grid Layout -->
                    <div class="grid grid-cols-4 gap-y-1 gap-x-2 items-center">
                        <!-- 15s -->
                        <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.FIFTEENS' | translate }}</div>
                        <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.fifteens | number:'1.0-1'}}</div>
                        <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.fifteens | number:'1.0-1'}}</div>
                        <div class="text-center text-gray-300">-</div>

                        <!-- Pairs -->
                        <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.PAIRS' | translate }}</div>
                        <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.pairs | number:'1.0-1'}}</div>
                        <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.pairs | number:'1.0-1'}}</div>
                        <div class="text-center text-gray-300">-</div>

                        <!-- Runs -->
                        <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.RUNS' | translate }}</div>
                        <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.runs | number:'1.0-1'}}</div>
                        <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.runs | number:'1.0-1'}}</div>
                        <div class="text-center text-gray-300">-</div>

                        <!-- Flush -->
                        <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.FLUSH' | translate }}</div>
                        <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.flush | number:'1.0-1'}}</div>
                        <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.flush | number:'1.0-1'}}</div>
                        <div class="text-center text-gray-300">-</div>

                        <!-- Nobs -->
                        <div class="text-left text-gray-500 font-medium whitespace-nowrap">{{ 'ANALYSIS_VIEW.NOBS' | translate }}</div>
                        <div class="text-center" [ngClass]="handBreakdownColorClass">{{res.handStats.breakdown.nobs | number:'1.0-1'}}</div>
                        <div class="text-center" [ngClass]="cribBreakdownColorClass">{{res.cribStats.breakdown.nobs | number:'1.0-1'}}</div>
                        <div class="text-center text-gray-300">-</div>

                        <!-- Divider -->
                        <div class="col-span-4 border-t border-gray-200 dark:border-white/10 my-1"></div>

                        <!-- Totals -->
                        <div class="text-left font-bold text-gray-800 dark:text-white">Total</div>
                        <div class="font-bold text-center text-xs" [ngClass]="handColorClass">{{ res.handStats.avg | number:'1.1-1' }}</div>
                        <div class="font-bold text-center text-xs" [ngClass]="cribColorClass">{{ res.cribStats.avg | number:'1.1-1' }}</div>
                        <div class="font-bold text-center text-xs" [ngClass]="pegColorClass">{{ res.peggingScore | number:'1.1-1' }}</div>
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
  `]
})
export class AnalysisViewComponent {
    @Input() results: AnalysisResult[] = [];
    @Input() isDealer: boolean = false;

    expandedIndices: Set<number> = new Set();

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
        return 'text-emerald-900 dark:text-emerald-100';
    }

    get pegColorClass(): string {
        return 'text-emerald-900 dark:text-emerald-100';
    }

    get cribColorClass(): string {
        return this.isDealer
            ? 'text-emerald-900 dark:text-emerald-100'
            : 'text-rose-900 dark:text-rose-100';
    }

    get handBreakdownColorClass(): string {
        return 'text-emerald-900 dark:text-emerald-100';
    }

    get cribBreakdownColorClass(): string {
        return this.isDealer
            ? 'text-emerald-900 dark:text-emerald-100'
            : 'text-rose-900 dark:text-rose-100';
    }
}
