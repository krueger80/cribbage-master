
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
    selector: 'app-score-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './score-popup.component.html',
    styleUrls: ['./score-popup.component.css'],
    animations: [
        trigger('popIn', [
            transition(':enter', [
                style({ transform: 'scale(0.8)', opacity: 0 }),
                animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ transform: 'scale(0.8)', opacity: 0 }))
            ])
        ])
    ]
})
export class ScorePopupComponent implements OnChanges {
    @Input() points: number = 0;
    @Input() breakdown: string[] = [];
    @Input() type: 'pegging' | 'counting' = 'pegging';
    @Input() visible: boolean = false;
    @Input() title: string = '';

    // For counting phase, we wait for user formatting
    @Output() continue = new EventEmitter<void>();

    ngOnChanges(changes: SimpleChanges) {
        // Logic for auto-hide handling could go here or be managed by parent
        // The parent (GameTable) already has auto-hide logic for pegging (lastPeggingScore clears after 2s).
        // So we primarily rely on Input updates.
    }

    onContinue() {
        this.continue.emit();
    }
}
