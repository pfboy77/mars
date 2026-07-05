export interface Resource {
    id: string;
    name: string;
    amount: number;
    production: number;
    isMegaCredit?: boolean;
    isEnergy?: boolean;
    isHeat?: boolean;
  }
  
  export interface GameState {
    resources: Resource[];
    tr: number;
  }
  