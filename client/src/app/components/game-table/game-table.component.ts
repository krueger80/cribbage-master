import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { GameService } from '../../services/game.service';
import { GameState } from '../../services/game.state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-game-table',
  standalone: true,
  imports: [CommonModule], // Add CommonModule
  templateUrl: './game-table.component.html',
  styleUrl: './game-table.component.css'
})
export class GameTableComponent implements OnInit {
  state$: Observable<GameState>;

  constructor(private gameService: GameService) {
    this.state$ = this.gameService.state$;
  }

  ngOnInit() {
    this.gameService.initGame();
  }

  onDiscard(playerId: string, cardIndex: number) {
    // For now, let's just trigger discards one by one or create a selection UI later.
    // This is temporary binding.
    console.log('Discarding', playerId, cardIndex);
  }
}
