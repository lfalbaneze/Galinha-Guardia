"use strict";
/* Cover has an entrance animation, a foreground layer and an in-world status. */
const HidingSpots = (() => {
    let spots = [];
    function initialize(layout = WORLD.layout) {
        spots = STRUCTURES.hayBales.map((b, i) => ({ id: `hay-${i}`, type: "hay",
            x: b.x - 34, y: b.y - 34, w: b.w + 68, h: b.h + 68, bale: b }));
        for (const [index, spot] of (layout?.vegetation || []).entries()) {
            spots.push({ ...spot, id: spot.id || `green-${index}` });
        }
    }
    function contains(spot, chicken) {
        return chicken.x >= spot.x + 8 && chicken.x <= spot.x + spot.w - 8 &&
            chicken.y >= spot.y + 8 && chicken.y <= spot.y + spot.h - 8;
    }
    function candidate(chicken) {
        return spots.find(s => s.id === chicken.hidingSpotId && contains(s, chicken)) ||
            spots.find(s => contains(s, chicken)) || null;
    }
    function hasBonusClue(chicken, chick) {
        const spot = spots.find(s => s.id === chick.coverId);
        if (!spot || distance(chicken, chick) >= 280)
            return false;
        // The chick can be heard through its own cover, but never through a building or fence.
        const cover = spot.bale || spot.blockingRect;
        const walls = cover ? OBSTACLES.filter(o => o.x !== cover.x || o.y !== cover.y || o.w !== cover.w || o.h !== cover.h) : OBSTACLES;
        return DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(chick), walls);
    }
    function bonusInReach(chicken, chick) {
        const spot = spots.find(s => s.id === chick.coverId);
        if (!spot || !hasBonusClue(chicken, chick))
            return false;
        // Call from any nearby edge instead of requiring a precise step inside the foliage.
        return Math.hypot(chicken.x - clamp(chicken.x, spot.x, spot.x + spot.w), chicken.y - clamp(chicken.y, spot.y, spot.y + spot.h)) <= 40;
    }
    function bonusHomes(layout = WORLD.layout) {
        // A separate deterministic selection keeps saved buildings and cover IDs intact.
        const rank = (id) => {
            let hash = (layout.seed ^ 0x76a92ed1) >>> 0;
            for (const letter of id)
                hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
            hash ^= hash >>> 16;
            hash = Math.imul(hash, 0x7feb352d) >>> 0;
            return (hash ^ hash >>> 15) >>> 0;
        };
        const options = spots.flatMap(spot => {
            const points = [
                { x: spot.x + spot.w / 2, y: spot.y + spot.h - 18 },
                { x: spot.x + 18, y: spot.y + spot.h / 2 },
                { x: spot.x + spot.w - 18, y: spot.y + spot.h / 2 }
            ];
            const point = points.find(p => contains(spot, p) && candidate(p)?.id === spot.id && OBSTACLES.every(o => {
                const x = p.x - clamp(p.x, o.x, o.x + o.w);
                const y = p.y + 8 - clamp(p.y + 8, o.y, o.y + o.h);
                return Math.hypot(x, y) > 19;
            }));
            if (!point || distance(point, layout.start) < 200 || layout.animalSpawns.some(a => distance(point, a) < 78))
                return [];
            const area = layout.areas.find(a => point.x >= a.x && point.x <= a.x + a.w && point.y >= a.y && point.y <= a.y + a.h);
            return [{ ...point, areaId: area?.id, coverId: spot.id, rank: rank(spot.id) }];
        }).sort((a, b) => a.rank - b.rank || a.coverId.localeCompare(b.coverId));
        const chosen = new Set();
        return layout.chickSpawns.map(oldHome => {
            const available = options.filter(p => !chosen.has(p.coverId));
            const home = available.find(p => p.areaId === oldHome.areaId) || available[0];
            if (!home)
                throw new Error('A fazenda precisa de seis esconderijos acessíveis para os bônus.');
            chosen.add(home.coverId);
            return { x: home.x, y: home.y, areaId: home.areaId || oldHome.areaId, coverId: home.coverId };
        });
    }
    function toggle(game) {
        if (game.phase !== "playing")
            return;
        const chicken = game.entities.chicken;
        if (chicken.hidden) {
            chicken.hidden = false;
            chicken.hidingSpotId = null;
            setStatus("De volta à lida. Olho no lobo!");
            GameUI.update(game);
            GameManager.save(game);
            return;
        }
        const spot = candidate(chicken);
        if (!spot) {
            chicken.hideHintTimer = 2.5;
            setStatus("Chegue perto de uma moita ou do feno. Quando aparecer E, você pode se esconder.");
            return;
        }
        WolfAI.witnessHide(game, spot);
        chicken.hidden = true;
        chicken.hidingSpotId = spot.id;
        chicken.hidingCandidate = spot.id;
        AudioSystem.play("pop", { volume: 0.35 });
        chicken.vx = 0;
        chicken.vy = 0;
        chicken.moving = false;
        chicken.sprinting = false;
        chicken.state = "idle";
        // A fresh directional press deliberately leaves cover; a key held before E does not.
        input.clear();
        setStatus(WolfAI.isExposed(game) ? "O lobo viu você entrar! Saia daí e encontre outro abrigo." :
            "Ufa, ele não viu! Espere a ronda passar.");
        spawnBurst(chicken.x, chicken.y, spot.type === "hay" ? "#ebc774" : "#94ba71", 9);
        GameUI.update(game);
        GameManager.save(game);
    }
    function update(game, dt = 0) {
        const chicken = game.entities.chicken, spot = candidate(chicken);
        chicken.hidingCandidate = spot ? spot.id : null;
        if (!spot || spot.id !== chicken.hidingSpotId) {
            chicken.hidden = false;
            chicken.hidingSpotId = null;
        }
        chicken.hideBlend = lerp(chicken.hideBlend || 0, chicken.hidden ? 1 : 0, Math.min(1, dt * 12));
        chicken.hideHintTimer = Math.max(0, (chicken.hideHintTimer || 0) - dt);
    }
    function restore(game, saved) {
        const chicken = game.entities.chicken, spot = spots.find(s => s.id === saved.hidingSpotId);
        chicken.hidden = saved.hidden === true && !!spot && contains(spot, chicken);
        chicken.hidingSpotId = chicken.hidden ? spot.id : null;
        chicken.hideBlend = chicken.hidden ? 1 : 0;
        update(game);
    }
    function drawForeground(game) {
        const chicken = game.entities.chicken;
        if (!chicken.hidden && (chicken.hideBlend || 0) < 0.02)
            return;
        const spot = spots.find(s => s.id === chicken.hidingSpotId) || candidate(chicken);
        if (spot)
            FarmArt.drawCoverForeground(ctx, spot, camera, Math.max(0.35, chicken.hideBlend || 0), chicken);
    }
    function pill(x, y, width, title, exposed = false) {
        x = clamp(x, width / 2 + 12, canvas.width - width / 2 - 12);
        y = clamp(y, 66, canvas.height - 48);
        if (x + width / 2 > canvas.width - 174 && y < 144)
            y = 149;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = exposed ? '#8b392d' : 'rgba(39,58,35,.95)';
        ctx.strokeStyle = exposed ? '#f6b08a' : '#c8d89a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-width / 2, 0, width, 30, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff4cf';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Trebuchet MS, sans-serif';
        ctx.fillText(title, 0, 20, width - 16);
        ctx.restore();
    }
    function drawIndicators(game) {
        if (game.phase !== "playing")
            return;
        const chicken = game.entities.chicken, p = worldToScreen(chicken), spot = candidate(chicken);
        const exposed = WolfAI.isExposed(game);
        const hint = RescueSystem.secretHint(game);
        const bonus = RescueSystem.callTarget(game);
        const celebrating = game.secretNotice?.bonus && game.secretNotice.time > 0;
        if (hint && !bonus && !chicken.hidden) {
            const cover = spots.find(s => s.id === hint.coverId);
            const bob = InterfaceMotion.reduced ? 0 : Math.sin((game.elapsed || 0) * 3) * 2;
            pill(worldX(cover ? cover.x + cover.w / 2 : hint.x), worldY(cover ? cover.y : hint.y) - 45 + bob, 112, 'Piu-piu…');
        }
        if (spot) {
            ctx.save();
            ctx.strokeStyle = exposed ? "#ff956c" : chicken.hidden ? "#e6f6be" : "#fff6bf";
            ctx.lineWidth = 1.5;
            ctx.setLineDash(chicken.hidden ? [] : [3, 4]);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + 14, 29, 11, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        if (bonus) {
            pill(p.x, p.y - 73, 180, 'E · chamar pintinho');
        }
        else if (chicken.hidden) {
            if (!celebrating || exposed)
                pill(p.x, p.y - 73, 185, exposed ? "Ele viu você! Saia daí!" : "Escondida · E para sair", exposed);
        }
        else if (spot) {
            if (!celebrating)
                pill(p.x, p.y - 73, 130, 'E · esconder');
        }
        else if (chicken.hideHintTimer > 0) {
            pill(p.x, p.y - 73, 180, 'Procure uma moita ou feno');
        }
    }
    return { initialize, candidate, hasBonusClue, bonusInReach, bonusHomes, toggle, update, restore, drawForeground, drawIndicators,
        getSpots: () => spots, obstacles: () => spots.filter(s => s.blockingRect).map(s => s.blockingRect) };
})();
