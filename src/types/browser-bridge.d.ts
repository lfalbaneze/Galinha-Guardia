/** Contracts supplied by game.js and the visual/audio systems during gradual migration.
 * These declarations emit no code. Keep them aligned with the corresponding JavaScript APIs.
 */
declare const WORLD: Farm.World;
declare const ThorArtData: {
  src:string; width:number; height:number; columns:number;
  frames:readonly {x:number;y:number;w:number;h:number}[];
};
  declare const PremiumWildlifeData: Record<string, {
    src:string; width:number; height:number; columns:number; scale?:number;
    frames:readonly WildlifeSpriteFrame[];
}>;
declare const FoxSideArtData: {
  src:string; width:number; height:number; frames:readonly WildlifeSpriteFrame[];
  bowAnchors:readonly Farm.Point[];
};
declare const STRUCTURES: Farm.Structures;
declare let OBSTACLES: Farm.Obstacle[];
declare const DIFFICULTIES: Record<Farm.Difficulty, Farm.DifficultySettings>;
declare const input: Set<string>;
declare const GameInput: {
  clear(): void;
  held(key: string): boolean;
  vector(keyboard: Farm.Point): Farm.Point;
  label(action: 'interact' | 'sneak' | 'run' | 'hide' | 'exit' | 'lake'): string;
};
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
declare function resolveEnvironment(entity: Farm.Body): boolean;
declare function getAreaAt(x: number, y: number): Farm.Area;
declare function worldX(x: number): number;
declare function worldY(y: number): number;
declare function worldToScreen(point: Farm.Point): Farm.Point;
declare function buildObstacles(game?: Farm.GameState | null): void;
declare function spawnAnimals(settings: Farm.DifficultySettings, wolf: Farm.Wolf): Farm.Animal[];
declare function spawnChicks(settings: Farm.DifficultySettings): Farm.Animal[];
declare function refreshHud(): void;
declare function setStatus(message: string, kind?: string): void;
declare function spawnBurst(x: number, y: number, color: string, count: number): void;
declare function startWinCutscene(): void;
declare function finishLose(message: string, cause?: 'caught' | 'timeout'): void;
declare const WorldGenerator: { generate(seed: number, version?: number): Farm.Layout; };
declare const GameUI: { update(game: Farm.GameState): void; };
declare const WolfDialogue: {
  witnessLine(game: Farm.GameState): string;
  refugeLine(game: Farm.GameState): string;
};
declare const SkinSystem: {
  initialize(game: Farm.GameState): void;
  record(game: Farm.GameState, notify?: boolean): void;
  unlockLake(game: Farm.GameState, notify?: boolean): void;
  power(chicken: Pick<Farm.Chicken, 'skin'>): Readonly<Farm.SkinPower>;
};
declare const AudioSystem: {
  play(name: string, options?: { volume?: number }): void;
  playAnimal(species: Farm.Species, options?: { volume?: number; ambient?: boolean }): void;
  playPlayerHurt(game: Farm.GameState): boolean;
};
declare const FarmRefuge: {
  readonly bounds: Readonly<Farm.Rect>;
  gooseHome(): Farm.Point;
  home(index: number, chick?: boolean): Farm.Point;
  contains(point: Farm.Point | Farm.Body, padding?: number): boolean;
  ensureClear(entity: Farm.Body): void;
  drawGround(context: CanvasRenderingContext2D, camera: Farm.Camera): void;
};
declare const FarmArt: {
  playableBounds(layout: Pick<Farm.World, 'width' | 'height'>): Farm.Rect;
  boundaryObstacles(layout: Pick<Farm.World, 'width' | 'height'>): Farm.Obstacle[];
  getProps(layout: Farm.Layout): (Farm.Rect & {type:string})[];
  drawCoverForeground(context: CanvasRenderingContext2D, spot: Farm.Cover,
    camera: Farm.Camera, alpha: number, chicken: Farm.Chicken, game?: Farm.GameState): void;
};
declare const FarmDetails: {
  shape(prop:Farm.Rect & {type:string}):Farm.Rect;
  drawSign(context:CanvasRenderingContext2D,prop:Farm.Rect & {name:string}):void;
  drawRows(context:CanvasRenderingContext2D,plot:Farm.Rect,first?:number,spacing?:number,end?:number):void;
};
declare const InterfaceMotion: { readonly reduced: boolean; };
declare const SpriteStyle: {
  tile(image:CanvasImageSource,rect:readonly number[],width:number,height:number):HTMLCanvasElement|null;
};
declare const Sunlight: {
  ground(c:CanvasRenderingContext2D,paint:(out:CanvasRenderingContext2D)=>void):boolean;
  readonly active:boolean;
  cast(c:CanvasRenderingContext2D,image:CanvasImageSource,x:number,y:number,w:number,h:number,ground:number,rect?:number[]):boolean;
  native(c:CanvasRenderingContext2D,key:string,box:Farm.Rect,ground:number,paint:(c:CanvasRenderingContext2D)=>void):void;
};

/** Read-only rendering API used by the live HUD portraits. */
declare const CharacterArt: {
  directionFor(previous: Farm.ArtDirection, x:number, y:number): Farm.ArtDirection;
  heading(entity: {direction: Farm.Direction;vx:number;vy:number}): Farm.ArtDirection;
    advance(anim: number, name: string, traveled: number, options?: {skin?: string;speed?:number}): number;
  readonly ready: boolean;
  readonly appearances: Readonly<Record<string, {name:string;species:string;sprite?:string;description?:string}>>;
  drawFloat(context: CanvasRenderingContext2D, x: number, y: number, width: number, front: boolean): boolean;
  frameFor(name: string, options?: { direction?: Farm.ArtDirection; skin?: string }): {
    pose: { width: number; top: number; bottom: number }; scale: number; definition?: {provider?:string};
  } | null;
  draw(context: CanvasRenderingContext2D, name: string, x: number, y: number,
    options?: { direction?: Farm.ArtDirection; scale?: number; skin?: string; moving?: boolean; anim?: number; shadow?: boolean; sprinting?:boolean; mood?:string }): boolean;
};
