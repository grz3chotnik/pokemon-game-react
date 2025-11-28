export interface PokemonStats {
  name: string;
  type: string;
  hpBase: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  sprites: {
    back_default: string;
    front_default: string;
  };
  cries: {
    legacy: string;
  };
}

export interface GameMessage {
  id:
    | "init"
    | "hp1"
    | "hp2"
    | "turn"
    | "attackMsg"
    | "effectiveness"
    | "gameOver"
    | "assigned"
    | "error";
}
