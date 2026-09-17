/** The goose is a territorial obstacle, never a rescue target. */
declare namespace Farm {
  type GooseMode = 'patrol' | 'warning' | 'charge' | 'recover' | 'return';
  interface Goose extends Entity {
    type: 'goose'; mode: GooseMode; home: Point; anchor: Point; target: Point;
    timer: number; cooldown: number; grace: number; honkCooldown: number;
    patrolIndex: number; notice: number;
  }
  interface GooseSnapshot extends Point {
    anchor: Point; patrolIndex: number; cooldown: number;
  }
  interface GooseConfig {
    territory: number; alertRange: number; warning: number;
    chargeSpeed: number; chargeSeconds: number; cooldown: number;
  }
}
