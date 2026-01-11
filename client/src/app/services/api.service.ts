import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { SupabaseService, HandHistory } from './supabase.service';

export interface Card {
  rank: string;
  suit: string;
  value: number;
  order: number;
}

export interface ScoreBreakdown {
  fifteens: number;
  pairs: number;
  runs: number;
  flush: number;
  nobs: number;
  total: number;
}

export interface StatResult {
  min: number;
  max: number;
  avg: number;
  breakdown: ScoreBreakdown;
}

export interface AnalysisResult {
  kept: Card[];
  discarded: Card[];
  handStats: StatResult;
  cribStats: StatResult;
  peggingScore: number;
  totalExpectedValue: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Point to Vercel API (relative path works if served same domain, or absolute)
  // For local dev with 'vercel dev', /api/analyze is standard.
  private apiUrl = '/api';

  constructor(private http: HttpClient, private supabase: SupabaseService) { }

  analyze(cards: string[], isDealer: boolean, numPlayers: number): Observable<{ results: AnalysisResult[] }> {
    return this.http.post<{ results: AnalysisResult[] }>(`${this.apiUrl}/analyze`, { cards, isDealer, numPlayers });
  }

  saveHistory(data: any): Observable<any> {
    // Delegate to Supabase
    return from(this.supabase.saveHistory(data));
  }

  getHistory(): Observable<HandHistory[]> {
    // Delegate to Supabase
    return this.supabase.getHistory();
  }
}
