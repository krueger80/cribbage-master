import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
    text: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toastSubject = new Subject<ToastMessage>();
    toast$ = this.toastSubject.asObservable();

    show(text: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) {
        this.toastSubject.next({ text, type, duration });
    }

    error(text: string, duration: number = 3000) {
        this.show(text, 'error', duration);
    }

    success(text: string, duration: number = 3000) {
        this.show(text, 'success', duration);
    }

    info(text: string, duration: number = 3000) {
        this.show(text, 'info', duration);
    }
}
