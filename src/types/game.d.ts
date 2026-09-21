/** Shared contracts for the gameplay systems. Coordinates are world pixels; timers are seconds. */
declare namespace Farm {
  type Direction = 'up' | 'down' | 'left' | 'right';
  type ArtDirection = Direction | 'upright' | 'upleft' | 'downright' | 'downleft';
  type Difficulty = 'easy' | 'normal' | 'hard' | 'hardcore';
  type Phase = 'menu' | 'playing' | 'win_cutscene' | 'won' | 'lose';
  type WolfMode = 'patrol' | 'alert' | 'investigate' | 'chase' | 'search' | 'inspect' | 'frightened';
  type Species = 'sheep' | 'pig' | 'goat' | 'cow' | 'duck' | 'rabbit' | 'dog' | 'cat' | 'donkey' | 'lamb' | 'chick' | 'horse' | 'turkey';
  interface Point { x: number; y: number; }
  interface Rect extends Point { w: number; h: number; }
  interface Hitbox { ox: number; oy: number; r: number; }
  interface Circle extends Point { r: number; }
  interface Obstacle extends Rect { type?: string; blocking?: boolean; opaque?: boolean; }
  interface Area extends Rect { id: string; name: string; hub?: Point; }
  interface Spawn extends Point { areaId: string; }
  interface Cover extends Rect { id: string; type: string; bale?: Rect; blockingRect?: Obstacle; art?: string; material?: number; }
  interface Structures { coops: Rect[]; silos: Rect[]; hayBales: Rect[]; pond: Rect; barn: Rect; stables?: Rect[]; troughs?: Rect[]; paddockFences?: Rect[]; }
  interface Layout {
    decorations?: (Point & {type:string;variant?:number;scale?:number})[];
    habitats?: (Point & {id:string;kind:'meadow'|'flowers'|'mud'|'water';r:number;water?:Point})[];
    seed: number;
    start: Point;
    wolfStart?: Point;
    areas: Area[];
    paths: Rect[];
    lanes?: Rect[];
    clearings?: Rect[];
    plots?: (Rect & {kind:string;areaId:string})[];
    entrances?: (Point & {id: string})[];
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
    id: string; type: 'chicken' | 'wolf' | 'animal' | 'chick' | 'goose' | 'fox' | 'owl' | 'thor';
    vx: number; vy: number; facing: number; direction: Direction;
    moving: boolean; anim: number; areaId: string; state: string;
  }
  interface Chicken extends Entity {
    type: 'chicken'; speed: number; skin?: string;
    hidden: boolean; hidingSpotId: string | null; hidingCandidate?: string | null;
    hideBlend: number; hideHintTimer?: number;
    stamina: number; staminaDelay: number; exhausted: boolean;
    sneaking: boolean; sprinting: boolean; invulnerable: number;
  }
  interface SkinPower {
    name: string; description: string; badge: string;
    landSpeed: number; swimSpeed: number; sneakSpeed: number; noiseScale: number;
    sprintDuration: number; friendSpecies: Species | null;
  }
  interface CoverMemory extends Point { spotId: string; remaining: number; inspectTime: number; revealIn?: number; }
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
    fearTime?: number; fearFrom?: Point | null; escapeTarget?: Point | null;
    speech?: string; speechTime?: number; speechCooldown?: number; speechMode?: WolfMode;
    speechPriority?: number; foxScoldCooldown?: number; speechSkin?: string;
  }
  interface Threat extends Point { kind: 'player' | 'wolf'; }
  interface ObservedThreat extends Threat { urgency: number; }
  interface Personality { pace: number; nerve: number; endurance: number; }
  interface Animal extends Entity {
    type: 'animal' | 'chick'; species: Species;
    rescued: boolean; discovered: boolean; lost: boolean;
    coverId?: string | null; lastSeen: Point | null;
    fatigue: number; restTime: number; fleeTime: number;
    fleeFrom: Threat | null; fleeHeading: number | null;
    sharedAlarm?: boolean;
    stuckTime: number; wanderTime: number;
    targetX: number; targetY: number; homeX?: number; homeY?: number;
    speech?: string; speechTime: number;
    temper: 'secret' | 'tired' | 'fleeing' | 'calm' | 'idle' | 'safe';
  }
  interface Fox extends Entity {
    name: 'Lorenzo' | 'Amanda';
    speech: string; speechTime: number; speechCooldown: number;
    speechCounts: Partial<Record<'idle'|'warning'|'miss'|'hit'|'move'|'scared',number>>;
    type: 'fox'; mode: 'hidden' | 'warning' | 'dash' | 'rest' | 'return' | 'flee' | 'relocate';
    home: Point; anchor: Point; target: Point; bushId: string | null;
    timer: number; cooldown: number; grace: number; notice: number; attempts: number; hit: boolean; route: Point[];
    scaredTime?: number;
    relocateIn: number;
  }
  interface Owl extends Entity {
    type: 'owl'; mode: 'watch' | 'alert' | 'cooldown' | 'relocate';
    perch: Point; treeId: string; heading: number;
    range: number; fov: number; alertTime: number; alertProgress: number; cooldown: number; grace: number;
    callTime?: number; callHeading?: number;
    movePending?: boolean; relocateRetry?: number; relocations?: number; previousTreeId?: string;
    flight?: { from: Point; to: Point; treeId: string; progress: number; duration: number } | null;
    target: Point | null;
  }

  interface FoxSnapshot extends Point { id: string; cooldown: number; bushId?: string | null; relocateIn?: number; }
  interface OwlSnapshot { id: string; cooldown: number; treeId?: string; previousTreeId?: string; relocations?: number; movePending?: boolean; }
  interface Thor extends Entity {
    type: 'thor'; mode: 'enter' | 'greet' | 'leave'; timer: number;
    exit: Point; route: Point[]; routeTimer: number; age: number;
  }
  interface ThorSnapshot {
    version?: 2 | 3; boneIds?: string[]; cycle?: number; easyUsed?: boolean; rescue?: ThorRescue;
    nextIn: number; visits: number;
    visitor: (Point & { mode: Thor['mode']; timer: number; exit: Point; age: number; direction: Direction }) | null;
  }
  interface ThorRescue { time: number; before: number; healed: boolean; }
  interface DifficultySettings {
    timeLimit?: number; timeScore?: number; friendTime?: number; chickTime?: number; rescueScore?: number;
    bonusChicks?: number; chickCombo?: boolean; friendTimeEvery?: number; timeScorePerChick?: number;
    chickenSpeed: number; wolfMaxSpeed: number; wolfSprintCap?: number;
    label: string; wolfAccel: number; wolfPauseAfterCatch: number;
    huntDelay: number; spawnPlan: string[]; minSpawnWolfDistance: number;
  }
  interface TimedNotice { time: number; }
  interface ChickCombo { count: number; remaining: number; }
  interface SecretNotice extends TimedNotice { name?: string; bonus?: boolean; x?: number; y?: number; targetX?: number; targetY?: number; }
  interface RescueNotice extends TimedNotice { name: string; count: number; total: number; chick: boolean; }
  interface Crow extends Point {
    z:number; from:Point & {z:number}; target:Point & {z:number};
    delay:number; duration:number; progress:number; flying:boolean; left:boolean; opacity:number; startOpacity:number;
  }
  interface Scarecrow extends Point {
    mode:'perched'|'fleeing'|'away'|'returning'; clock:number; quiet:number; flights:number; birds:Crow[];
  }
  interface GameState {
    scarecrow?: Scarecrow;
    phase: Phase; resumePhase?: Phase; difficultyKey: Difficulty; settings: DifficultySettings;
    entities: { chicken: Chicken; wolf: Wolf; animals: Animal[]; chicks: Animal[]; goose?: Goose; foxes?: Fox[]; owls?: Owl[]; thor?: Thor | null; };
    thorVisit?: { nextIn: number; visits: number; boneIds: string[]; cycle: number; easyUsed: boolean };
    thorRescue?: ThorRescue;
    thorBoneNotice?: TimedNotice & { count: number };
    thorNotice?: TimedNotice & { healed: boolean; arriving?: boolean; amount?: number };
    worldSeed: number; worldVersion: number;
    rescuedIds: Set<string>; rescuedChickIds: Set<string>;
    rescuedCount: number; rescuedChicks: number; wolfLevel: number; wolfHunger: number;
    lives: number; score: number; elapsed: number; winBonusApplied: boolean;
    timeRemaining: number | null; timeBonus: number; defeatReason?: 'caught' | 'timeout';
    timeRewardNotice?: TimedNotice & { seconds: number };
    chickCombo: ChickCombo; timeBonusRate: number; legacyTimer: boolean;
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
    hunger: number;
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
    'seenVelocity' | 'investigateReturnMode' | 'fearTime' | 'fearFrom'>>;
  interface SaveData {
    /** Legacy defeat marker, read only to migrate older saves to a loss. */
    needsRecovery?: boolean;
    version: 1 | 2 | 3 | 4 | 5; worldSeed: number; worldVersion?: number; difficulty: Difficulty; phase: Phase;
    rescuedIds: string[]; rescuedChickIds: string[]; lives: number; score: number;
    winBonusApplied?: boolean; elapsed?: number; wolfHunger?: number;
    timeRemaining?: number | null; timeBonus?: number; defeatReason?: 'caught' | 'timeout';
    timerMode?: 'arcade';
    chickCombo?: ChickCombo; timeBonusRate?: number; legacyTimer?: boolean;
    chicken: ChickenSnapshot; wolf: WolfSnapshot; animals: AnimalSnapshot[]; chicks: AnimalSnapshot[];
    goose?: GooseSnapshot;
    foxes?: FoxSnapshot[]; owls?: OwlSnapshot[];
    thor?: ThorSnapshot;
  }
}
