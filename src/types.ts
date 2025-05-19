export interface Resource {
  id: string;
  name: string;
  amount: number;
  production: number;
  isMegaCredit?: boolean;
  isEnergy?: boolean;
  isHeat?: boolean;
}

// プレイヤー構造を新規追加
export interface Player {
  id: string;
  name: string;
  resources: Resource[];
  tr: number;
}

// GameState を複数プレイヤー対応に
export interface GameState {
  players: Player[];
}
