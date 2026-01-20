import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cribbage-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full bg-amber-900/40 rounded-xl overflow-hidden shadow-inner border border-white/10 flex flex-col items-center justify-center">
      
      <!-- Track SVG -->
      <svg class="w-full h-full absolute inset-0 pointer-events-none">
         <ng-container *ngIf="vertical">
             <!-- Vertical Tracks (Bottom to Top) -->
             <line x1="35%" y1="95%" x2="35%" y2="5%" stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-dasharray="4 8" stroke-linecap="round" />
             <line x1="65%" y1="95%" x2="65%" y2="5%" stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-dasharray="4 8" stroke-linecap="round" />
         </ng-container>
         <ng-container *ngIf="!vertical">
             <!-- Horizontal Tracks (Left to Right) -->
             <line x1="5%" y1="35%" x2="95%" y2="35%" stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-dasharray="4 8" stroke-linecap="round" />
             <line x1="5%" y1="65%" x2="95%" y2="65%" stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-dasharray="4 8" stroke-linecap="round" />
         </ng-container>
      </svg>
      
      <!-- Pins -->
      <div class="absolute inset-0 w-full h-full">
         
         <!-- P1 (Host) -->
         <div class="absolute w-3 h-3 md:w-4 md:h-4 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-white/20 transition-all duration-700 ease-in-out z-10"
              [style.background-color]="p1Color"
              [style.left.%]="vertical ? 35 : getPct(p1Score)"
              [style.bottom.%]="vertical ? getPct(p1Score) : 'auto'"
              [style.top.%]="!vertical ? 35 : 'auto'"
              [style.transform]="'translate(-50%, -50%)'">
              <div class="absolute inset-0 bg-white/30 rounded-full scale-50 opacity-50"></div>
         </div>

         <!-- P2 (Guest) -->
         <div class="absolute w-3 h-3 md:w-4 md:h-4 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-white/20 transition-all duration-700 ease-in-out z-10"
              [style.background-color]="p2Color"
              [style.left.%]="vertical ? 65 : getPct(p2Score)"
              [style.bottom.%]="vertical ? getPct(p2Score) : 'auto'"
              [style.top.%]="!vertical ? 65 : 'auto'"
              [style.transform]="'translate(-50%, -50%)'">
              <div class="absolute inset-0 bg-white/30 rounded-full scale-50 opacity-50"></div>
         </div>

      </div>

      <!-- Labels -->
      <div *ngIf="vertical" class="absolute bottom-1 text-[8px] text-white/30 font-mono tracking-widest">START</div>
      <div *ngIf="vertical" class="absolute top-1 text-[8px] text-white/30 font-mono tracking-widest">FINISH</div>
      
      <div *ngIf="!vertical" class="absolute left-1 text-[8px] text-white/30 font-mono tracking-widest writing-mode-vertical" style="writing-mode: vertical-rl; transform: rotate(180deg);">START</div>
      <div *ngIf="!vertical" class="absolute right-1 text-[8px] text-white/30 font-mono tracking-widest writing-mode-vertical" style="writing-mode: vertical-rl; transform: rotate(180deg);">FINISH</div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class CribbageBoardComponent {
  @Input() p1Score: number = 0;
  @Input() p2Score: number = 0;
  @Input() p1Color: string = '#ef4444';
  @Input() p2Color: string = '#3b82f6';
  @Input() vertical: boolean = true;

  getPct(score: number): number {
    const clamped = Math.min(Math.max(score, 0), 121);
    // 5% to 95%
    return (clamped / 121) * 90 + 5;
  }
}
