import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" 
         class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in-scale transition-all min-w-[300px] justify-between"
         [class.bg-red-500]="message.type === 'error'"
         [class.bg-emerald-500]="message.type === 'success'"
         [class.bg-blue-500]="message.type === 'info'"
         [class.text-white]="true">
      
      <span class="text-xl">
        {{ message.type === 'error' ? '⚠️' : (message.type === 'success' ? '✅' : 'ℹ️') }}
      </span>
      <span class="font-bold">{{ message.text }}</span>
      
      <button (click)="close()" class="ml-4 opacity-70 hover:opacity-100 font-bold">✕</button>
    </div>
  `,
  styles: [`
    @keyframes fadeInScale {
      from { opacity: 0; transform: translate(-50%, -40%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    .animate-fade-in-scale {
      animation: fadeInScale 0.2s ease-out forwards;
    }
  `]
})
export class ToastComponent implements OnDestroy {
  message: ToastMessage | null = null;
  private subscription: Subscription;
  private timeoutId: any;

  constructor(private toastService: ToastService) {
    this.subscription = this.toastService.toast$.subscribe(msg => {
      this.message = msg;

      if (this.timeoutId) clearTimeout(this.timeoutId);

      this.timeoutId = setTimeout(() => {
        this.message = null;
      }, msg.duration || 3000);
    });
  }

  close() {
    this.message = null;
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
