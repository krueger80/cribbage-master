import { Routes } from '@angular/router';
import { GameTableComponent } from './components/game-table/game-table.component';

export const routes: Routes = [
    { path: 'game', component: GameTableComponent },
    // Redirect empty path to game for now to test easily, or keep existing home?
    // Let's keep empty as is (probably home) and add explicit game route.
];
