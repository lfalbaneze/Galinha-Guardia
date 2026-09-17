/** Contracts supplied by game.js and the visual/audio systems during gradual migration.
 * These declarations emit no code. Keep them aligned with the corresponding JavaScript APIs.
 */
declare const WORLD: Farm.World;
declare const STRUCTURES: Farm.Structures;
declare let OBSTACLES: Farm.Obstacle[];
declare const DIFFICULTIES: Record<Farm.Difficulty, Farm.DifficultySettings>;
declare const input: Set<string>;
declare const canvas: HTMLCanvasElement;
declare const ctx: CanvasRenderingContext2D;
declare let camera: Farm.Camera;
declare const areaTextEl: HTMLElement;
declare const MAX_LIVES: number;
declare const SCORE_PER_RESCUE: number;
declare const SCORE_PENALTY_LOSS: number;
declare const SCORE_BONUS_PER_LIFE: number;
declare function clamp(value: number, min: number, max: number): number;
declare function rand(min: number, max: number): number;
declare function lerp(a: number, b: number, t: number): number;
declare function distance(a: Farm.Point, b: Farm.Point): number;
declare function getHitbox(entity: Farm.Body): Farm.Circle;
declare function circleVsCircle(a: Farm.Body, b: Farm.Body): boolean;
declare function resolveEnvironment(entity: Farm.Body): void;
declare function getAreaAt(x: number, y: number): Farm.Area;
declare function worldX(x: number): number;
declare function worldY(y: number): number;
declare function worldToScreen(point: Farm.Point): Farm.Point;
declare function buildObstacles(): void;
declare function refreshHud(): void;
declare function setStatus(message: string, kind?: string): void;
declare function spawnBurst(x: number, y: number, color: string, count: number): void;
declare function startWinCutscene(): void;
declare function finishLose(message: string): void;
declare const WorldGenerator: { generate(seed: number, version?: number): Farm.Layout; };
declare const GameUI: { update(game: Farm.GameState): void; };
declare const SkinSystem: { initialize(game: Farm.GameState): void; record(game: Farm.GameState, notify?: boolean): void; };
declare const AudioSystem: {
  play(name: string, options?: { volume?: number }): void;
  playAnimal(species: Farm.Species, options?: { volume?: number }): void;
};
declare const FarmRefuge: {
  home(index: number, chick?: boolean): Farm.Point;
  ensureClear(entity: Farm.Body): void;
  drawGround(context: CanvasRenderingContext2D, camera: Farm.Camera): void;
};
declare const FarmArt: {
  drawCoverForeground(context: CanvasRenderingContext2D, spot: Farm.Cover,
    camera: Farm.Camera, alpha: number, chicken: Farm.Chicken): void;
};
declare const InterfaceMotion: { readonly reduced: boolean; };

/** Read-only rendering API used by the live HUD portraits. */
declare const CharacterArt: {
  readonly ready: boolean;
  frameFor(name: string, options?: { direction?: Farm.Direction; skin?: string }): {
    pose: { width: number; top: number; bottom: number }; scale: number;
  } | null;
  draw(context: CanvasRenderingContext2D, name: string, x: number, y: number,
    options?: { direction?: Farm.Direction; scale?: number; skin?: string; moving?: boolean }): boolean;
};
