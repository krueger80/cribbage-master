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

            <!-- Mini Stats Row -->
            <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-black/20 p-2 rounded">
                 <div class="flex flex-col items-center">
                    <span>{{ 'ANALYSIS_VIEW.HAND' | translate }}</span>
                    <span class="font-bold text-blue-400">{{ res.handStats.avg | number:'1.1-1' }}</span>
                 </div>
                 <div class="flex flex-col items-center">
                    <span>{{ 'ANALYSIS_VIEW.CRIB' | translate }}</span>
                    <span class="font-bold text-purple-400">{{ res.cribStats.avg | number:'1.1-1' }}</span>
                 </div>
                 <div class="flex flex-col items-center">
                    <span>{{ 'ANALYSIS_VIEW.PEG' | translate }}</span>
                    <span class="font-bold text-orange-400">{{ res.peggingScore | number:'1.1-1' }}</span>
                 </div>
            </div>

            <!-- Breakdown Toggle -->
             <!-- Breakdown Toggle -->
             <div class="mt-2 text-[10px] text-gray-500 cursor-pointer">
                <div (click)="toggleDetails()" class="hover:text-gray-300 flex items-center gap-1 select-none">
                    <span>{{ areDetailsOpen ? '▼' : '▶' }}</span> {{ 'ANALYSIS_VIEW.MORE_DETAILS' | translate }}
                </div>
                <div *ngIf="areDetailsOpen" class="mt-2 grid grid-cols-2 gap-2 bg-gray-100 dark:bg-black/40 p-2 rounded animate-fade-in">
                    <div>
                        <h6 class="font-bold text-gray-700 dark:text-gray-300 mb-1">{{ 'ANALYSIS_VIEW.HAND' | translate }}</h6>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.FIFTEENS' | translate }}</span> <span>{{res.handStats.breakdown.fifteens | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.PAIRS' | translate }}</span> <span>{{res.handStats.breakdown.pairs | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.RUNS' | translate }}</span> <span>{{res.handStats.breakdown.runs | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.FLUSH' | translate }}</span> <span>{{res.handStats.breakdown.flush | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.NOBS' | translate }}</span> <span>{{res.handStats.breakdown.nobs | number:'1.0-1'}}</span></div>
                    </div>
                    <div>
                        <h6 class="font-bold text-gray-700 dark:text-gray-300 mb-1">{{ 'ANALYSIS_VIEW.CRIB' | translate }}</h6>
                         <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.FIFTEENS' | translate }}</span> <span>{{res.cribStats.breakdown.fifteens | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.PAIRS' | translate }}</span> <span>{{res.cribStats.breakdown.pairs | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.RUNS' | translate }}</span> <span>{{res.cribStats.breakdown.runs | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.FLUSH' | translate }}</span> <span>{{res.cribStats.breakdown.flush | number:'1.0-1'}}</span></div>
                        <div class="flex justify-between"><span>{{ 'ANALYSIS_VIEW.NOBS' | translate }}</span> <span>{{res.cribStats.breakdown.nobs | number:'1.0-1'}}</span></div>
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

    areDetailsOpen: boolean = false;

    toggleDetails() {
        this.areDetailsOpen = !this.areDetailsOpen;
    }

    getCardColor(suit: string): string {
        return (suit === 'H' || suit === 'D') ? 'red' : 'black';
    }

    getSuitSymbol(suit: string): string {
        const map: any = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
        return map[suit] || '?';
    }
}
