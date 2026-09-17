/** Challenge progress belongs to the current farm; the cosmetic belongs to the wardrobe. */
declare namespace Farm {
  interface LakeProgress {
    version: 1; active: boolean; completed: boolean; misses: number;
    attempts: number; notice: number; interrupted?: boolean;
  }
  interface LakeSnapshot { version: 1; completed: boolean; misses: number; active: boolean; }
  interface GameState { lake?: LakeProgress; }
  interface SaveData { lake?: unknown; }
}
