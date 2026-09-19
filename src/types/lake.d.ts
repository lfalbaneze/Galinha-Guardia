/** Challenge progress belongs to the current farm; the cosmetic belongs to the wardrobe. */
declare namespace Farm {
  interface LakeProgress {
    version: 1; active: boolean; completed: boolean; misses: number; gooseRescued?: boolean;
    attempts: number; notice: number; interrupted?: boolean;
    counterWindow?: number; counterDuration?: number;
    feedback?: 'dodge' | 'hit' | 'blocked' | 'counter' | 'expired' | 'failed' | 'combo';
  }
  interface LakeSnapshot { version: 1; completed: boolean; misses: number; active: boolean; gooseRescued?: boolean; }
  interface GameState { lake?: LakeProgress; }
  interface SaveData { lake?: unknown; }
}
