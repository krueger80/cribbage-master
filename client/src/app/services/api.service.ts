import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface HandHistory {
  id: number;
  originalHand: string[];
  discarded: string[];
  expectedValue: number;
  isDealer: boolean;
  numPlayers: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  analyze(cards: string[], isDealer: boolean, numPlayers: number): Observable<{ results: AnalysisResult[] }> {
    return this.http.post<{ results: AnalysisResult[] }>(`${this.apiUrl}/analyze`, { cards, isDealer, numPlayers });
  }

  saveHistory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/history`, data);
  }

  getHistory(): Observable<HandHistory[]> {
    return this.http.get<HandHistory[]>(`${this.apiUrl}/history`);
  }
}
