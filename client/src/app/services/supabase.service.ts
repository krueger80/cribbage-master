import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { GameState } from './game.state';

export interface HandHistory {
    original_hand: string[];
    discarded: string[];
    expected_value: number;
    is_dealer: boolean;
    num_players: number;
    created_at?: string;
}


@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;
    private _currentUser = new BehaviorSubject<any>(null);
    private gameSubscription: RealtimeChannel | null = null;

    constructor() {
        this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
            auth: {
                storage: sessionStorage,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });

        // Check initial session
        this.supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                this._currentUser.next(session.user);
            }
        });

        // Listen for auth changes
        this.supabase.auth.onAuthStateChange((_event, session) => {
            this._currentUser.next(session?.user || null);
        });
    }

    get currentUser$() {
        return this._currentUser.asObservable();
    }

    get currentUserSnapshot() {
        return this._currentUser.value;
    }

    get currentUserId() {
        return this._currentUser.value?.id;
    }

    async signInAnonymously() {
        const { data, error } = await this.supabase.auth.signInAnonymously();
        if (error) throw error;
        return data;
    }

    async signIn(email: string, password: string) {
        return this.supabase.auth.signInWithPassword({ email, password });
    }

    async signUp(email: string, password: string) {
        return this.supabase.auth.signUp({ email, password });
    }

    async signInWithGoogle() {
        return this.supabase.auth.signInWithOAuth({ provider: 'google' });
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
        this._currentUser.next(null);
    }

    async createGame(initialState: GameState): Promise<string> {
        const userId = this.currentUserId;
        if (!userId) throw new Error('Must be logged in to create game');

        const { data, error } = await this.supabase
            .from('games')
            .insert({
                state: initialState,
                host_id: userId,
                status: 'waiting'
            })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    }

    async getWaitingGames() {
        const { data, error } = await this.supabase
            .from('games')
            .select('*')
            .eq('status', 'waiting')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async joinGame(gameId: string): Promise<void> {
        const userId = this.currentUserId;
        if (!userId) throw new Error('Must be logged in to join game');

        // Optimistic: We assume we can join.
        // Real logic needs to check if game is full etc, but RLS/constraints can handle that or simple logic here
        const { error } = await this.supabase
            .from('games')
            .update({
                guest_id: userId,
                status: 'active'
            })
            .eq('id', gameId);

        if (error) throw error;
    }

    async leaveGame(gameId: string) {
        if (this.gameSubscription) {
            await this.gameSubscription.unsubscribe();
            this.gameSubscription = null;
        }
        // Optional: Update DB to say user left?
    }

    subscribeToGame(gameId: string): Observable<any> {
        return new Observable(observer => {
            let channel: RealtimeChannel | null = null;
            let retryTimer: any = null;

            const setupChannel = () => {
                if (channel) {
                    this.supabase.removeChannel(channel);
                }

                channel = this.supabase
                    .channel(`game:${gameId}`)
                    .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
                        (payload) => {
                            observer.next(payload.new);
                        }
                    )
                    .subscribe((status) => {
                        console.log(`[Supabase] Game Channel Status: ${status}`);

                        if (status === 'SUBSCRIBED') {
                            console.log('[Supabase] Successfully subscribed to game updates.');
                        }

                        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                            console.error(`[Supabase] Channel error (${status}). Retrying in 2s...`);
                            if (retryTimer) clearTimeout(retryTimer);
                            retryTimer = setTimeout(() => {
                                console.log('[Supabase] Attempting reconnection...');
                                setupChannel();
                            }, 2000);
                        }
                    });
            };

            setupChannel();

            // Return teardown logic
            return () => {
                if (retryTimer) clearTimeout(retryTimer);
                if (channel) {
                    this.supabase.removeChannel(channel);
                    channel = null;
                }
            };
        });
    }

    subscribeToWaitingGames(): Observable<void> {
        return new Observable(observer => {
            const channel = this.supabase
                .channel('lobby_updates')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'games' },
                    () => {
                        // Any change to games table (insert, update status, etc) should trigger refresh
                        observer.next();
                    }
                )
                .subscribe();

            return () => {
                this.supabase.removeChannel(channel);
            };
        });
    }

    async updateGameState(gameId: string, state: GameState, retries = 3) {
        let attempt = 0;
        while (attempt < retries) {
            const { error } = await this.supabase
                .from('games')
                .update({ state })
                .eq('id', gameId);

            if (!error) return;

            console.error(`[Supabase] Error syncing state (Attempt ${attempt + 1}/${retries}):`, error);
            attempt++;
            if (attempt < retries) await new Promise(r => setTimeout(r, 500 * attempt));
        }
        console.error('[Supabase] CRITICAL: Failed to sync game state after retries.');
    }

    async getGameState(gameId: string): Promise<GameState | null> {
        const { data, error } = await this.supabase
            .from('games')
            .select('state')
            .eq('id', gameId)
            .single();

        if (error) {
            console.error('Error fetching game state', error);
            return null;
        }
        return data?.state;
    }

    async saveHistory(entry: any) {
        const userId = this.currentUserId;
        if (!userId) throw new Error('User not logged in');

        const { error } = await this.supabase
            .from('hand_history')
            .insert({ ...entry, user_id: userId });

        if (error) throw error;
    }

    getHistory(): Observable<HandHistory[]> {
        return from(
            this.supabase
                .from('hand_history')
                .select('*')
                .order('created_at', { ascending: false })
                .then(({ data, error }) => {
                    if (error) throw error;
                    return data as HandHistory[];
                })
        );
    }
}
