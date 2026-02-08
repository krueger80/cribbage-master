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

  analyze(cards: string[], isDealer: boolean, numPlayers: number, mode: 'quick' | 'precise' = 'precise'): Observable<{ results: AnalysisResult[] }> {
    return this.http.post<{ results: AnalysisResult[] }>(`${this.apiUrl}/analyze`, { cards, isDealer, numPlayers, simulationMode: mode });
  }

  // Streaming version
  analyzeStream(cards: string[], isDealer: boolean, numPlayers: number, mode: 'quick' | 'precise' = 'precise'): Observable<AnalysisResult> {
    return new Observable(observer => {
      const controller = new AbortController();
      const signal = controller.signal;

      fetch(`${this.apiUrl}/analyze?stream=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards, isDealer, numPlayers, simulationMode: mode }),
        signal
      }).then(async response => {
        if (!response.ok) {
          const error = await response.json();
          observer.error(error);
          return;
        }

        const activeReader = response.body?.getReader();
        if (!activeReader) {
          observer.error('No response body');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await activeReader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            // Use all lines except the last one (which might be incomplete)
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const result = JSON.parse(line) as AnalysisResult;
                  observer.next(result);
                } catch (e) {
                  console.error('Error parsing JSON line', e);
                }
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const result = JSON.parse(buffer) as AnalysisResult;
              observer.next(result);
            } catch (e) {
              console.error('Error parsing final JSON line', e);
            }
          }

          observer.complete();

        } catch (err) {
          observer.error(err);
        }
      }).catch(err => {
        observer.error(err);
      });

      return () => controller.abort();
    });
  }

  getPeggingCard(hand: string[], stack: string[], total: number): Observable<{ card: Card | null, score: number, debug?: string }> {
    return this.http.post<{ card: Card | null, score: number, debug?: string }>(`${this.apiUrl}/pegging`, { hand, stack, total });
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
