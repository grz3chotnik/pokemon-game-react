export interface Move {
  name: string;
  power: number;
  type: string;
}

export interface GameState {
  isPlayerTurn: boolean;
  winnerPokemonName: string;
  player: {
    name: string;
    pokemonBackImageURL: string;
    pokemonHp: number;
    pokemonMaxHp: number;
    pokemonMoves: Move[];
    pokemonType: string;
  };
  opponent?: {
    name: string;
    pokemonImageURL: string;
    pokemonHp: number;
    pokemonMaxHp: number;
    pokemonType: string;
  };
}
