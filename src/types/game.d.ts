/** Shared contracts for the gameplay systems. Coordinates are world pixels; timers are seconds. */
declare namespace Farm {
  type Direction = 'up' | 'down' | 'left' | 'right';
  type Difficulty = 'easy' | 'normal' | 'hard';
  type Phase = 'menu' | 'playing' | 'win_cutscene' | 'won' | 'lose';
  type WolfMode = 'patrol' | 'alert' | 'investigate' | 'chase' | 'search' | 'inspect';
  type Species = 'sheep' | 'pig' | 'goat' | 'cow' | 'duck' | 'rabbit' | 'dog' | 'cat' | 'donkey' | 'lamb' | 'chick';
  interface Point { x: number; y: number; }
  interface Rect extends Point { w: number; h: number; }
  interface Hitbox { ox: number; oy: number; r: number; }
  interface Circle extends Point { r: number; }
  interface Obstacle extends Rect { type?: string; blocking?: boolean; opaque?: boolean; }
  interface Area extends Rect { id: string; name: string; hub?: Point; }
  interface Spawn extends Point { areaId: string; }
  interface Cover extends Rect { id: string; type: string; bale?: Rect; blockingRect?: Obstacle; }
  interface Structures { coops: Rect[]; silos: Rect[]; hayBales: Rect[]; pond: Rect; barn: Rect; }
  interface Layout {
    seed: number;
    start: Point;
    areas: Area[];
    paths: Rect[];
    structures: Structures;
    animalSpawns: Spawn[];
    chickSpawns: Spawn[];
    vegetation: Cover[];
  }
  interface World {
    width: number; height: number;
    targetRescues: number; targetChicks: number;
    safeZone: Circle;
    layout: Layout; areas: Area[]; paths: Rect[];
  }
  interface Camera extends Point { shakeX: number; shakeY: number; }
  interface Body extends Point { radius: number; hitbox: Hitbox; }
  interface Entity extends Body {
    id: string; type: 'chicken' | 'wolf' | 'animal' | 'chick' | 'goose';
    vx: number; vy: number; facing: number; direction: Direction;
    moving: boolean; anim: number; areaId: string; state: string;
  }
  interface Chicken extends Entity {
    type: 'chicken'; speed: number;
    hidden: boolean; hidingSpotId: string | null; hidingCandidate?: string | null;
    hideBlend: number; hideHintTimer?: number;
    stamina: number; staminaDelay: number; exhausted: boolean;
    sneaking: boolean; sprinting: boolean; invulnerable: number;
  }
  interface CoverMemory extends Point { spotId: string; remaining: number; inspectTime: number; }
  interface Wolf extends Entity {
    type: 'wolf'; accel: number; mode: WolfMode; heading: number;
    huntUnlockTimer: number; pauseTimer: number;
    lastKnown: Point | null; searchTime: number; searchPoints: Point[];
    searchIndex: number; searchOrigin: Point | null; searchApproached: boolean; scanTime: number;
    route: Point[]; routeTarget: Point | null; routeTimer: number; routeMode: WolfMode | null;
    moveSpeed: number; patrolIndex: number; detected: boolean; awareness: number;
    heardPoint: Point | null; hearingCooldown: number; investigateTime: number;
    alertReturnMode: WolfMode; patrolPause: number; patrolScanHeading: number;
    exposedCover: CoverMemory | null; seenVelocity: Point; lastSight: Point | null; sightAge: number;
    investigateReturnMode: 'patrol' | 'search';
    speech?: string; speechTime?: number; speechCooldown?: number; speechMode?: WolfMode;
  }
  interface Threat extends Point { kind: 'player' | 'wolf'; }
  interface ObservedThreat extends Threat { urgency: number; }
  interface Personality { pace: number; nerve: number; endurance: number; }
  interface Animal extends Entity {
    type: 'animal' | 'chick'; species: Species;
    rescued: boolean; discovered: boolean; lost: boolean;
    discoveryTime: number; coverId?: string | null; lastSeen: Point | null;
    fatigue: number; restTime: number; fleeTime: number;
    fleeFrom: Threat | null; fleeHeading: number | null;
    stuckTime: number; wanderTime: number;
    targetX: number; targetY: number; homeX?: number; homeY?: number;
    speech?: string; speechTime: number;
    temper: 'secret' | 'tired' | 'fleeing' | 'idle' | 'safe';
  }
  interface DifficultySettings {
    chickenSpeed: number; wolfMaxSpeed: number; wolfSprintCap?: number;
    label: string; wolfAccel: number; wolfPauseAfterCatch: number;
    huntDelay: number; spawnPlan: string[]; minSpawnWolfDistance: number;
  }
  interface TimedNotice { time: number; }
  interface SecretNotice extends TimedNotice { bonus?: boolean; x?: number; y?: number; }
  interface RescueNotice extends TimedNotice { name: string; count: number; total: number; chick: boolean; }
  interface GameState {
    phase: Phase; resumePhase?: Phase; difficultyKey: Difficulty; settings: DifficultySettings;
    entities: { chicken: Chicken; wolf: Wolf; animals: Animal[]; chicks: Animal[]; goose?: Goose; };
    worldSeed: number; worldVersion: number;
    rescuedIds: Set<string>; rescuedChickIds: Set<string>;
    rescuedCount: number; rescuedChicks: number; wolfLevel: number;
    lives: number; score: number; elapsed: number; winBonusApplied: boolean;
    currentMap: string; visitedMaps: Set<string>; mapTransition: TimedNotice & { name: string; };
    animalSpeechCooldown: number; secretSoundCooldown: number;
    rescueNotice?: RescueNotice | null; secretNotice?: SecretNotice | null; skinNotice?: TimedNotice | null;
  }
  interface DetectionConfig { range: number; fov: number; closeRange: number; contactRange: number; noiseRange: number; }
  type Perception = {
    visible: true; seenPoint: Point; distance: number; contact: boolean; heardPoint: Point | null;
  } | {
    visible: false; seenPoint: null; distance: number; contact: boolean; heardPoint: Point | null;
  };
  interface WolfTier {
    speedScale: number; range: number; fov: number; closeRange: number; noiseRange: number;
    awarenessTime: number; searchDuration: number; searchRadius: number; searchPoints: number;
  }
  interface WolfConfig extends WolfTier, DetectionConfig {
    level: number; rescuedFriends: number; rescuedChicks: number; chickMultiplier: number;
    nominalSpeed: number; sprintCap: number; speed: number; pressure: number;
    hideWitnessRange: number; hideMemoryDuration: number; patrolSpeed: number;
    awarenessDecay: number; soundInterval: number; investigateDuration: number;
  }
  interface NavigationEdge { index: number; length: number; }
  interface Navigation {
    source: Obstacle[]; count: number; radius: number; padding: number; rects: Rect[];
    width: number; height: number; nodes: Point[] | null; edges: NavigationEdge[][] | null;
  }
  /** Optional fields keep older saves and newly generated spawn points readable. */
  interface FriendSnapshot extends Point {
    discovered?: boolean; coverId?: string | null; lastSeen?: Point | null;
    fatigue?: number; restTime?: number; fleeTime?: number;
    fleeFrom?: Threat | null; fleeHeading?: number | null;
  }
  interface AnimalSnapshot extends FriendSnapshot { id: string; }
  interface BonusHome extends FriendSnapshot { coverId: string; areaId: string; }
  type ChickenSnapshot = Point & Partial<Pick<Chicken,
    'hidden' | 'hidingSpotId' | 'direction' | 'stamina' | 'staminaDelay' | 'exhausted'>>;
  type WolfSnapshot = Point & Partial<Pick<Wolf,
    'mode' | 'lastKnown' | 'searchTime' | 'patrolIndex' | 'heading' | 'huntUnlockTimer' | 'awareness' |
    'heardPoint' | 'hearingCooldown' | 'investigateTime' | 'alertReturnMode' | 'patrolPause' |
    'patrolScanHeading' | 'searchApproached' | 'searchIndex' | 'scanTime' | 'exposedCover' |
    'seenVelocity' | 'investigateReturnMode'>>;
  interface SaveData {
    version: 1 | 2 | 3 | 4; worldSeed: number; worldVersion?: number; difficulty: Difficulty; phase: Phase;
    rescuedIds: string[]; rescuedChickIds: string[]; lives: number; score: number;
    winBonusApplied?: boolean; elapsed?: number;
    chicken: ChickenSnapshot; wolf: WolfSnapshot; animals: AnimalSnapshot[]; chicks: AnimalSnapshot[];
    goose?: GooseSnapshot;
  }
}
