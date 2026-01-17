import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

import { GameService } from '../../services/game.service';
import { ToastService } from '../../services/toast.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, take } from 'rxjs';

@Component({
    selector: 'app-lobby',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './lobby.component.html',
    styleUrls: ['./lobby.component.css']
})
export class LobbyComponent implements OnInit, OnDestroy {
    @Output() gameJoined = new EventEmitter<void>();
    waitingGames: any[] = [];
    loading = false;
    userId: string | undefined;
    private lobbySub: Subscription | null = null;

    constructor(
        private supabase: SupabaseService,
        private gameService: GameService,
        private toast: ToastService
    ) { }

    async ngOnInit() {
        this.userId = this.supabase.currentUserId;
        if (!this.userId) {
            // Auto login anon
            await this.supabase.signInAnonymously();
        }
        this.refreshGames();

        // Subscribe to auth changes to update UserID UI
        this.supabase.currentUser$.subscribe(user => {
            this.userId = user?.id;
        });

        // Realtime subscription for Lobby updates
        this.lobbySub = this.supabase.subscribeToWaitingGames().subscribe(() => {
            this.refreshGames();
        });
    }

    ngOnDestroy() {
        if (this.lobbySub) {
            this.lobbySub.unsubscribe();
        }
    }

    async createGame() {
        if (!this.userId) {
            console.log('Waiting for login...');
            return;
        }

        this.loading = true;
        try {
            // 1. Initialize local state first to get a clean slate
            this.gameService.initGame(['Host', 'Guest']);

            // 2. Create game in DB with this clean state
            const gameId = await this.supabase.createGame(this.gameService.snapshot);

            // 3. Initialize multiplayer logic (subscriptions etc)
            await this.gameService.initMultiplayerGame(gameId, true);

            this.gameJoined.emit();
        } catch (error: any) {
            console.error('Failed to create game', error);
            this.toast.error('Failed to create game: ' + (error.message || 'Unknown error'));
        } finally {
            this.loading = false;
        }
    }

    async joinGame(gameId: string) {
        if (!gameId) return;
        this.loading = true;
        try {
            await this.supabase.joinGame(gameId);
            await this.gameService.initMultiplayerGame(gameId, false);
            this.gameJoined.emit();
        } catch (error: any) {
            console.error('Failed to join game', error);
            this.toast.error('Failed to join game: ' + (error.message || 'Unknown error'));
        } finally {
            this.loading = false;
        }
    }

    async refreshGames() {
        this.loading = true;
        try {
            this.waitingGames = await this.supabase.getWaitingGames() || [];
        } catch (error) {
            console.error('Error fetching games', error);
        } finally {
            this.loading = false;
        }
    }
}
