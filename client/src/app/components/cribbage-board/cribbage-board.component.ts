import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cribbage-board',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  `],
  template: `
    <div class="relative w-full h-full rounded-xl overflow-hidden shadow-2xl transition-all duration-500 flex items-center justify-center bg-[#3e2723]">
        
        <!-- Board Wrapper: Constrain Aspect Ratio to match Image (1:3.5 approx) to ensure pins align -->
        <!-- Using max-w/max-h ensures it fits the container without overflowing or stretching -->
        <!-- Board Wrapper: Adapts aspect ratio based on orientation (1:3.5 vs 3.5:1) -->
        <div class="relative"
             [ngClass]="vertical ? 'inline-block h-full w-auto max-w-full' : 'h-full aspect-[700/200] mx-auto'">
            
            <!-- Board Image -->
            <img src="assets/cribbage-board.png" 
                 class="pointer-events-none select-none transition-transform duration-500 origin-center block"
                 [ngStyle]="vertical ? 
                    {'height': '100%', 'width': 'auto', 'max-width': 'none'} : 
                    {'position': 'absolute', 'top': '50%', 'left': '50%', 'width': '28.57%', 'height': '350%', 'transform': 'translate(-50%, -50%) rotate(90deg)', 'object-fit': 'fill'}" />
            
            <!-- Pins Overlay: Matches the dimensions of the wrapper -->
            <div class="absolute inset-0 w-full h-full z-10">
                 
                 <!-- P1 (Host) - Red Pin -->
                 <div class="absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.9)] border border-white/40 transition-all duration-700 ease-in-out"
                      [style.background-color]="'#ff3333'"
                      [ngStyle]="getPinStyle(p1Score, 0)">
                      <div class="absolute top-[25%] left-[25%] w-[30%] h-[30%] bg-white rounded-full opacity-70 blur-[0.5px]"></div>
                 </div>

                 <!-- P2 (Guest) - Blue Pin -->
                 <div class="absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.9)] border border-white/40 transition-all duration-700 ease-in-out"
                      [style.background-color]="'#3366ff'"
                      [ngStyle]="getPinStyle(p2Score, 1)">
                      <div class="absolute top-[25%] left-[25%] w-[30%] h-[30%] bg-white rounded-full opacity-70 blur-[0.5px]"></div>
                 </div>
            </div>
        </div>

    </div>
  `,

})
export class CribbageBoardComponent {
  @Input() p1Score: number = 0; // Host (Left Side)
  @Input() p2Score: number = 0; // Guest (Right Side)
  @Input() p1Color: string = '#ef4444';
  @Input() p2Color: string = '#3b82f6';
  @Input() vertical: boolean = true;

  // Path Definitions (Percentage 0-100) based on Vertical Image Layout
  // Standard 120-hole board with 3 lanes per player (Up-Down-Up).
  // 40 holes per lane.

  // Player 1 (Left Track):
  // Lane 1 (Outer): 1-40 (Up)
  // Lane 2 (Middle): 41-80 (Down)
  // Lane 3 (Inner): 81-120 (Up)

  private p1Path = [
    { s: 0, x: 10.5, y: 85 },
    { s: 1, x: 10.5, y: 80.13 },
    { s: 2, x: 10.5, y: 78.32 },
    { s: 3, x: 10.5, y: 76.82 },
    { s: 4, x: 10.5, y: 74.87 },
    { s: 5, x: 10.5, y: 73.51 },
    { s: 6, x: 10.5, y: 70.81 },
    { s: 7, x: 10.5, y: 69.15 },
    { s: 8, x: 10.5, y: 67.65 },
    { s: 9, x: 10.5, y: 66.3 },
    { s: 10, x: 10.5, y: 64.49 },
    { s: 11, x: 10.5, y: 61.19 },
    { s: 12, x: 10.5, y: 59.98 },
    { s: 13, x: 10.5, y: 58.18 },
    { s: 14, x: 10.5, y: 56.68 },
    { s: 15, x: 10.5, y: 55.32 },
    { s: 16, x: 10.5, y: 52.02 },
    { s: 17, x: 10.5, y: 50.51 },
    { s: 18, x: 10.5, y: 49.16 },
    { s: 19, x: 10.5, y: 47.66 },
    { s: 20, x: 10.5, y: 45.4 },
    { s: 21, x: 10.5, y: 42.7 },
    { s: 22, x: 10.5, y: 41.04 },
    { s: 23, x: 10.5, y: 39.39 },
    { s: 24, x: 10.5, y: 38.19 },
    { s: 25, x: 10.5, y: 36.68 },
    { s: 26, x: 10.5, y: 33.23 },
    { s: 27, x: 10.5, y: 31.27 },
    { s: 28, x: 10.5, y: 29.92 },
    { s: 29, x: 10.5, y: 28.87 },
    { s: 30, x: 10.5, y: 27.36 },
    { s: 31, x: 10.5, y: 23.76 },
    { s: 32, x: 10.5, y: 22.25 },
    { s: 33, x: 10.5, y: 20.75 },
    { s: 34, x: 10.5, y: 19.55 },
    { s: 35, x: 10.5, y: 17.59 },
    { s: 36, x: 10.5, y: 13.98 },
    { s: 37, x: 13.85, y: 10.38 },
    { s: 38, x: 21.03, y: 7.82 },
    { s: 39, x: 29.32, y: 5.57 },
    { s: 40, x: 41.49, y: 4.06 },
    { s: 41, x: 60.28, y: 4.21 },
    { s: 42, x: 71.33, y: 5.57 },
    { s: 43, x: 80.18, y: 7.82 },
    { s: 44, x: 85.71, y: 10.53 },
    { s: 45, x: 89.4, y: 14.43 },
    { s: 46, x: 89.4, y: 17.59 },
    { s: 47, x: 89.4, y: 18.79 },
    { s: 48, x: 89.4, y: 20.75 },
    { s: 49, x: 89.4, y: 22.25 },
    { s: 50, x: 89.4, y: 24.36 },
    { s: 51, x: 89.4, y: 26.91 },
    { s: 52, x: 89.4, y: 28.57 },
    { s: 53, x: 89.4, y: 30.07 },
    { s: 54, x: 89.4, y: 31.12 },
    { s: 55, x: 89.4, y: 33.08 },
    { s: 56, x: 89.4, y: 36.53 },
    { s: 57, x: 89.4, y: 37.89 },
    { s: 58, x: 89.4, y: 39.39 },
    { s: 59, x: 89.4, y: 40.29 },
    { s: 60, x: 89.4, y: 42.4 },
    { s: 61, x: 89.4, y: 45.7 },
    { s: 62, x: 89.4, y: 47.51 },
    { s: 63, x: 89.4, y: 48.86 },
    { s: 64, x: 89.4, y: 49.91 },
    { s: 65, x: 89.4, y: 51.57 },
    { s: 66, x: 89.4, y: 55.32 },
    { s: 67, x: 89.4, y: 56.83 },
    { s: 68, x: 89.4, y: 58.18 },
    { s: 69, x: 89.4, y: 59.08 },
    { s: 70, x: 89.4, y: 60.44 },
    { s: 71, x: 89.4, y: 65.1 },
    { s: 72, x: 89.4, y: 66.9 },
    { s: 73, x: 89.4, y: 67.95 },
    { s: 74, x: 89.4, y: 68.7 },
    { s: 75, x: 89.4, y: 70.66 },
    { s: 76, x: 89.4, y: 73.51 },
    { s: 77, x: 89.4, y: 75.17 },
    { s: 78, x: 89.4, y: 76.97 },
    { s: 79, x: 89.4, y: 78.63 },
    { s: 80, x: 89.4, y: 79.98 },
    { s: 81, x: 89.4, y: 83.59 },
    { s: 82, x: 82.39, y: 87.64 },
    { s: 83, x: 65.81, y: 89.6 },
    { s: 84, x: 49.78, y: 87.8 },
    { s: 85, x: 41.5, y: 83.13 },
    { s: 86, x: 41.5, y: 79.68 },
    { s: 87, x: 41.5, y: 78.17 },
    { s: 88, x: 41.5, y: 76.82 },
    { s: 89, x: 41.5, y: 75.32 },
    { s: 90, x: 41.5, y: 73.66 },
    { s: 91, x: 41.5, y: 70.66 },
    { s: 92, x: 41.5, y: 69.15 },
    { s: 93, x: 41.5, y: 67.8 },
    { s: 94, x: 41.5, y: 66.45 },
    { s: 95, x: 41.5, y: 64.49 },
    { s: 96, x: 41.5, y: 61.04 },
    { s: 97, x: 41.5, y: 59.98 },
    { s: 98, x: 41.5, y: 58.33 },
    { s: 99, x: 41.5, y: 56.98 },
    { s: 100, x: 41.5, y: 55.17 },
    { s: 101, x: 41.5, y: 52.02 },
    { s: 102, x: 41.5, y: 50.36 },
    { s: 103, x: 41.5, y: 48.86 },
    { s: 104, x: 41.5, y: 47.36 },
    { s: 105, x: 41.5, y: 45.7 },
    { s: 106, x: 41.5, y: 42.55 },
    { s: 107, x: 41.5, y: 41.34 },
    { s: 108, x: 41.5, y: 39.39 },
    { s: 109, x: 41.5, y: 37.89 },
    { s: 110, x: 41.5, y: 36.38 },
    { s: 111, x: 41.5, y: 32.77 },
    { s: 112, x: 41.5, y: 31.72 },
    { s: 113, x: 41.5, y: 30.07 },
    { s: 114, x: 41.5, y: 28.87 },
    { s: 115, x: 41.5, y: 26.91 },
    { s: 116, x: 41.5, y: 23.6 },
    { s: 117, x: 41.5, y: 22.1 },
    { s: 118, x: 41.5, y: 20.45 },
    { s: 119, x: 41.5, y: 18.94 },
    { s: 120, x: 41.5, y: 17.89 },
    { s: 121, x: 49.78, y: 12.33 }
  ];

  // Player 2 (Right Track):
  // Symmetric to P1.
  private p2Path = [
    { s: 0, x: 25, y: 85 },
    { s: 1, x: 25, y: 80.13 },
    { s: 2, x: 25, y: 78.32 },
    { s: 3, x: 25, y: 76.82 },
    { s: 4, x: 25, y: 74.87 },
    { s: 5, x: 25, y: 73.51 },
    { s: 6, x: 25, y: 70.81 },
    { s: 7, x: 25, y: 69.15 },
    { s: 8, x: 25, y: 67.65 },
    { s: 9, x: 25, y: 66.3 },
    { s: 10, x: 25, y: 64.49 },
    { s: 11, x: 25, y: 61.19 },
    { s: 12, x: 25, y: 59.98 },
    { s: 13, x: 25, y: 58.18 },
    { s: 14, x: 25, y: 56.68 },
    { s: 15, x: 25, y: 55.32 },
    { s: 16, x: 25, y: 52.02 },
    { s: 17, x: 25, y: 50.51 },
    { s: 18, x: 25, y: 49.16 },
    { s: 19, x: 25, y: 47.66 },
    { s: 20, x: 25, y: 45.4 },
    { s: 21, x: 25, y: 42.7 },
    { s: 22, x: 25, y: 41.04 },
    { s: 23, x: 25, y: 39.39 },
    { s: 24, x: 25, y: 38.19 },
    { s: 25, x: 25, y: 36.68 },
    { s: 26, x: 25, y: 33.23 },
    { s: 27, x: 25, y: 31.27 },
    { s: 28, x: 25, y: 29.92 },
    { s: 29, x: 25, y: 28.87 },
    { s: 30, x: 25, y: 27.36 },
    { s: 31, x: 25, y: 23.76 },
    { s: 32, x: 25, y: 22.25 },
    { s: 33, x: 25, y: 20.75 },
    { s: 34, x: 25, y: 19.55 },
    { s: 35, x: 25, y: 17.59 },
    { s: 36, x: 25, y: 13.98 },
    { s: 37, x: 27.65, y: 12.18 },
    { s: 38, x: 31.5, y: 10.25 },
    { s: 39, x: 37.0, y: 8.87 },
    { s: 40, x: 44.25, y: 8.25 },
    { s: 41, x: 55.3, y: 8.4 },
    { s: 42, x: 63, y: 9.17 },
    { s: 43, x: 68, y: 10.08 },
    { s: 44, x: 71.9, y: 12.18 },
    { s: 45, x: 74.65, y: 14.59 },
    { s: 46, x: 74.65, y: 17.89 },
    { s: 47, x: 74.65, y: 18.79 },
    { s: 48, x: 74.65, y: 20.75 },
    { s: 49, x: 74.65, y: 22.25 },
    { s: 50, x: 74.65, y: 24.36 },
    { s: 51, x: 74.65, y: 26.91 },
    { s: 52, x: 74.65, y: 28.57 },
    { s: 53, x: 74.65, y: 30.07 },
    { s: 54, x: 74.65, y: 31.12 },
    { s: 55, x: 74.65, y: 33.08 },
    { s: 56, x: 74.65, y: 36.53 },
    { s: 57, x: 74.65, y: 37.89 },
    { s: 58, x: 74.65, y: 39.39 },
    { s: 59, x: 74.65, y: 40.29 },
    { s: 60, x: 74.65, y: 42.4 },
    { s: 61, x: 74.65, y: 45.7 },
    { s: 62, x: 74.65, y: 47.51 },
    { s: 63, x: 74.65, y: 48.86 },
    { s: 64, x: 74.65, y: 49.91 },
    { s: 65, x: 74.65, y: 51.57 },
    { s: 66, x: 74.65, y: 55.32 },
    { s: 67, x: 74.65, y: 56.83 },
    { s: 68, x: 74.65, y: 58.18 },
    { s: 69, x: 74.65, y: 59.08 },
    { s: 70, x: 74.65, y: 60.44 },
    { s: 71, x: 74.65, y: 65.1 },
    { s: 72, x: 74.65, y: 66.9 },
    { s: 73, x: 74.65, y: 67.95 },
    { s: 74, x: 74.65, y: 68.7 },
    { s: 75, x: 74.65, y: 70.66 },
    { s: 76, x: 74.65, y: 73.51 },
    { s: 77, x: 74.65, y: 75.17 },
    { s: 78, x: 74.65, y: 76.97 },
    { s: 79, x: 74.65, y: 78.63 },
    { s: 80, x: 74.65, y: 79.98 },
    { s: 81, x: 73.0, y: 83.13 },
    { s: 82, x: 72.44, y: 85.0 },
    { s: 83, x: 64.70, y: 85.25 },
    { s: 84, x: 60.28, y: 84.79 },
    { s: 85, x: 56.41, y: 83.13 },
    { s: 86, x: 57.0, y: 79.68 },
    { s: 87, x: 57.0, y: 78.17 },
    { s: 88, x: 57.0, y: 76.82 },
    { s: 89, x: 57.0, y: 75.32 },
    { s: 90, x: 57.0, y: 73.66 },
    { s: 91, x: 57.0, y: 70.66 },
    { s: 92, x: 57.0, y: 69.15 },
    { s: 93, x: 57.0, y: 67.8 },
    { s: 94, x: 57.0, y: 66.45 },
    { s: 95, x: 57.0, y: 64.49 },
    { s: 96, x: 57.0, y: 61.04 },
    { s: 97, x: 57.0, y: 59.98 },
    { s: 98, x: 57.0, y: 58.33 },
    { s: 99, x: 57.0, y: 56.98 },
    { s: 100, x: 57.0, y: 55.17 },
    { s: 101, x: 57.0, y: 52.02 },
    { s: 102, x: 57.0, y: 50.36 },
    { s: 103, x: 57.0, y: 48.86 },
    { s: 104, x: 57.0, y: 47.36 },
    { s: 105, x: 57.0, y: 45.7 },
    { s: 106, x: 57.0, y: 42.55 },
    { s: 107, x: 57.0, y: 41.34 },
    { s: 108, x: 57.0, y: 39.39 },
    { s: 109, x: 57.0, y: 37.89 },
    { s: 110, x: 57.0, y: 36.38 },
    { s: 111, x: 57.0, y: 32.77 },
    { s: 112, x: 57.0, y: 31.72 },
    { s: 113, x: 57.0, y: 30.07 },
    { s: 114, x: 57.0, y: 28.87 },
    { s: 115, x: 57.0, y: 26.91 },
    { s: 116, x: 57.0, y: 23.6 },
    { s: 117, x: 57.0, y: 22.1 },
    { s: 118, x: 57.0, y: 20.45 },
    { s: 119, x: 57.0, y: 18.94 },
    { s: 120, x: 57.0, y: 17.89 },
    { s: 121, x: 57.08, y: 12.33 }
  ];

  getInterpolatedPos(score: number, playerIdx: number): { x: number, y: number } {
    const path = playerIdx === 0 ? this.p1Path : this.p2Path;
    const s = Math.min(Math.max(score, 0), 121);

    // 1. Exact Match Check (User provided precise points)
    const exact = path.find(p => p.s === s);
    if (exact) {
      return { x: exact.x, y: exact.y };
    }

    // 2. Segment Interpolation
    for (let i = 0; i < path.length - 1; i++) {
      const pA = path[i];
      const pB = path[i + 1];
      if (s >= pA.s && s <= pB.s) {
        // Interpolate
        const range = pB.s - pA.s;
        if (range === 0) return { x: pA.x, y: pA.y };

        const ratio = (s - pA.s) / range;
        const x = pA.x + (pB.x - pA.x) * ratio;
        const y = pA.y + (pB.y - pA.y) * ratio;
        return { x, y };
      }
    }
    return { x: path[path.length - 1].x, y: path[path.length - 1].y };
  }

  getPinStyle(score: number, playerIdx: number): any {
    const { x, y } = this.getInterpolatedPos(score, playerIdx);

    if (this.vertical) {
      return {
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)'
      };
    } else {
      // Horizontal Mode -> Rotate Visually
      const horizLeft = 100 - y;
      const horizTop = x;

      return {
        left: `${horizLeft}%`,
        top: `${horizTop}%`,
        transform: 'translate(-50%, -50%)' // Pins don't rotate, only pos
      };
    }
  }
}
