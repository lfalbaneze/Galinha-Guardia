"use strict";
const Player = {
    sprintMultiplier: 1.32,
    sprintSeconds: 3,
    directionFor(previous, x, y) {
        if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 0.01)
            return previous;
        // Keep the current axis around diagonals; tiny steering corrections must not
        // flicker between two drawings. A clear turn or reversal still responds now.
        const horizontal = previous === 'left' || previous === 'right';
        const useHorizontal = horizontal ? Math.abs(x) * 1.2 >= Math.abs(y) : Math.abs(x) > Math.abs(y) * 1.2;
        return useHorizontal ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
    },
    face(entity, x, y) {
        if (Math.hypot(x, y) < 0.01)
            return;
        if (x !== 0)
            entity.facing = Math.sign(x);
        entity.direction = Player.directionFor(entity.direction, x, y);
    },
    move(entity, dx, dy) {
        if (!Number.isFinite(dx) || !Number.isFinite(dy))
            return;
        // Resolve short steps so fast movement cannot jump across narrow obstacles.
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
        for (let i = 0; i < steps; i++) {
            const beforeX = entity.x, beforeY = entity.y;
            entity.x += dx / steps;
            entity.y += dy / steps;
            // A gap narrower than the body can push it between opposing contacts.
            // Keep the last valid step instead of letting a wall eject it through another.
            if (!resolveEnvironment(entity)) {
                entity.x = beforeX;
                entity.y = beforeY;
                break;
            }
        }
    },
    moveVector() {
        const x = Number(input.has("arrowright") || input.has("d")) - Number(input.has("arrowleft") || input.has("a"));
        const y = Number(input.has("arrowdown") || input.has("s")) - Number(input.has("arrowup") || input.has("w"));
        const length = Math.hypot(x, y) || 1;
        const keyboard = { x: x / length, y: y / length };
        return typeof GameInput === 'undefined' ? keyboard : GameInput.vector(keyboard);
    },
    update(game, dt) {
        if (game.phase !== "playing" || !Number.isFinite(dt) || dt < 0)
            return;
        const chicken = game.entities.chicken, move = Player.moveVector(), power = SkinSystem.power(chicken);
        const moving = move.x !== 0 || move.y !== 0;
        if (moving) {
            chicken.hidden = false;
            chicken.hidingSpotId = null;
        }
        const shift = typeof GameInput === 'undefined' ? input.has('shift') : GameInput.held('shift');
        if (!shift && chicken.stamina >= 0.25)
            chicken.exhausted = false;
        chicken.sneaking = (typeof GameInput === 'undefined' ? input.has('c') : GameInput.held('c')) && !chicken.hidden;
        const wantsSprint = moving && shift && !chicken.sneaking && !chicken.exhausted && chicken.stamina > 0;
        const sprintSeconds = Player.sprintSeconds * power.sprintDuration;
        const sprintPart = wantsSprint && dt > 0 ? Math.min(1, chicken.stamina * sprintSeconds / dt) : 0;
        const landSpeed = SwimmingSystem.profile(game).depth > 0 ? 1 : power.landSpeed;
        const speed = chicken.speed * landSpeed * EnvironmentSystem.movementScale(game) *
            (chicken.sneaking ? power.sneakSpeed : 1 + (Player.sprintMultiplier - 1) * sprintPart);
        const oldX = chicken.x, oldY = chicken.y;
        Player.move(chicken, move.x * speed * dt, move.y * speed * dt);
        const traveled = Math.hypot(chicken.x - oldX, chicken.y - oldY);
        chicken.moving = dt > 0 && traveled > 0.02;
        chicken.sprinting = wantsSprint && chicken.moving;
        chicken.vx = dt > 0 ? (chicken.x - oldX) / dt : 0;
        chicken.vy = dt > 0 ? (chicken.y - oldY) / dt : 0;
        if (chicken.sprinting) {
            chicken.stamina = Math.max(0, chicken.stamina - dt / sprintSeconds);
            chicken.staminaDelay = 0.65;
            if (chicken.stamina < 0.0001) {
                chicken.stamina = 0;
                chicken.exhausted = true;
            }
        }
        else {
            const recovering = Math.max(0, dt - chicken.staminaDelay);
            chicken.staminaDelay = Math.max(0, chicken.staminaDelay - dt);
            chicken.stamina = Math.min(1, chicken.stamina + recovering * (chicken.hidden ? 0.65 : 0.28));
        }
        chicken.state = chicken.moving ? "walk" : "idle";
        chicken.anim = CharacterArt.advance(chicken.anim, 'chicken', traveled, { skin: chicken.skin, speed: dt > 0 ? traveled / dt : 0 });
        chicken.invulnerable = Math.max(0, chicken.invulnerable - dt);
        if (moving)
            Player.face(chicken, move.x, move.y);
        HidingSpots.update(game, dt);
        EnvironmentSystem.update(game, dt, { x: oldX, y: oldY });
    },
    checkCatch(game) {
        const chicken = game.entities.chicken, wolf = game.entities.wolf;
        if (game.lake?.active || ThorSystem.active(game) || game.phase !== "playing" || !SunflowerSystem.canCatch(game) || (chicken.hidden && !WolfAI.canCatchHidden(game)) || chicken.invulnerable > 0 ||
            wolf.mode === 'frightened' || wolf.pauseTimer > 0 || wolf.huntUnlockTimer > 0 || !circleVsCircle(chicken, wolf) ||
            !DetectionSystem.hasLineOfSight(getHitbox(wolf), getHitbox(chicken)))
            return false;
        const caughtInCover = chicken.hidden;
        chicken.hidden = false;
        chicken.hidingSpotId = null;
        chicken.hideBlend = 0;
        wolf.exposedCover = null;
        if (wolf.mode === "inspect")
            wolf.mode = "chase";
        game.lives -= 1;
        AudioSystem.playPlayerHurt(game);
        game.score = Math.max(0, game.score - SCORE_PENALTY_LOSS);
        chicken.invulnerable = 3;
        wolf.pauseTimer = 1.5;
        const dx = chicken.x - wolf.x, dy = chicken.y - wolf.y, len = Math.hypot(dx, dy);
        Player.move(chicken, (len > 0 ? dx / len : 1) * 65, (len > 0 ? dy / len : 0) * 65);
        spawnBurst(chicken.x, chicken.y, "#ffdfaa", 18);
        setStatus(caughtInCover ? `Ele viu seu esconderijo! Restam ${game.lives} vidas. Fuja e quebre a visão antes de se esconder.` :
            `Esse lobo não sabe brincar! Restam ${game.lives} vidas. Saia da vista dele e procure cobertura.`);
        refreshHud();
        if (game.lives <= 0) {
            finishLose('O lobo levou essa. Tentar novamente começa do zero: resgates, pintinhos e pontos desta tentativa são zerados.');
            GameManager.save(game);
        }
        else
            GameManager.save(game);
        return true;
    },
};
