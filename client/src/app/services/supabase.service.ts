import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Placeholder - Replace with your actual Supabase keys from the dashboard
export const SUPABASE_URL = 'https://ymlzucwvdwnhndooctmb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_JKEaZCcP81MOe-VpLnOUYA_RF1eFq2k';

export interface HandHistory {
    id?: number;
    user_id?: string;
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
    private _currentUser = new BehaviorSubject<User | null>(null);

    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Check initial session
        this.supabase.auth.getSession().then(({ data: { session } }) => {
            this._currentUser.next(session?.user ?? null);
        });

        // Listen for auth changes
        this.supabase.auth.onAuthStateChange((_event, session) => {
            this._currentUser.next(session?.user ?? null);
        });
    }

    get currentUser$() {
        return this._currentUser.asObservable();
    }

    get user() {
        return this._currentUser.value;
    }

    // Auth Methods
    async signUp(email: string, password: string): Promise<any> {
        return this.supabase.auth.signUp({ email, password });
    }

    async signIn(email: string, password: string) {
        return this.supabase.auth.signInWithPassword({ email, password });
    }

    async signInWithGoogle() {
        return this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
    }

    async signOut() {
        return this.supabase.auth.signOut();
    }

    // Database Methods
    getHistory(): Observable<HandHistory[]> {
        const promise = this.supabase
            .from('hand_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        return from(promise).pipe(map((res: any) => res.data || []));
    }

    async saveHistory(entry: HandHistory): Promise<any> {
        if (!this.user) return null; // Only save if logged in

        const dbEntry = {
            ...entry,
            user_id: this.user.id
        };

        return this.supabase.from('hand_history').insert(dbEntry);
    }
}
