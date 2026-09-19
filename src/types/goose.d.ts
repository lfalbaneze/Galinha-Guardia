/** The goose is a territorial obstacle, never a rescue target. */
declare namespace Farm {
  type GooseMode = 'patrol' | 'approach' | 'circle' | 'notice' | 'reposition' | 'warning' | 'feint' | 'charge' | 'stunned' | 'recover' | 'return' | 'defeated';
  interface Goose extends Entity {
    rescued?: boolean;
    type: 'goose'; mode: GooseMode; home: Point; anchor: Point; target: Point;
    timer: number; cooldown: number; grace: number; honkCooldown: number;
    patrolIndex: number; notice: number;
    returnPath?: Point[];
    activity?: 'watch' | 'preen' | 'forage';
    lastObserved?: Point | null; observedVelocity?: Point; observationAge?: number;
    dodgeSide?: number; earlyDodge?: boolean; tactic?: 'direct'|'flank'|'bluff'|'double'|'rush';
    comboRemaining?: number; comboFollowup?: boolean; challengeFeinted?: boolean; warningDuration?: number;
    chargeHit?: boolean; chargeCounted?: boolean; attempts?: number; noticedPoint?: Point | null; stuck?: number;
  }
  interface GooseSnapshot extends Point {
    anchor: Point; patrolIndex: number; cooldown: number;
  }
  interface GooseConfig {
    territory: number; alertRange: number; warning: number;
    chargeSpeed: number; chargeSeconds: number; cooldown: number;
  }
}
