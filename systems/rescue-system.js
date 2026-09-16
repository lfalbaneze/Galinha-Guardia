const RescueSystem = {
  names: { sheep: "Ovelha", pig: "Porquinho", goat: "Cabra", cow: "Vaquinha", duck: "Pato",
    rabbit: "Coelho", dog: "Cachorrinho", cat: "Gatinho", donkey: "Burrinho", lamb: "Cordeirinho", chick: "Pintinho" },
  all(game) { return [...game.entities.animals, ...(game.entities.chicks || [])]; },
  safePosition(index) {
    return { x: 140 + (index % 5) * 45, y: 370 + Math.floor(index / 5) * 48 };
  },
  chickPosition(index) { return { x: 135 + index * 37, y: 280 }; },
  update(game, dt) {
    const chicken = game.entities.chicken;
    if (game.rescueNotice) game.rescueNotice.time = Math.max(0, game.rescueNotice.time - dt);
    if (game.skinNotice) game.skinNotice.time = Math.max(0, game.skinNotice.time - dt);
    for (const animal of RescueSystem.all(game)) {
      const chick = animal.type === "chick";
      const index = chick ? game.entities.chicks.indexOf(animal) : game.entities.animals.indexOf(animal);
      const safePosition = chick ? RescueSystem.chickPosition : RescueSystem.safePosition;
      const oldX = animal.x, oldY = animal.y;
      animal.moving = false;
      if (!animal.rescued) {
        const home = (chick ? WORLD.layout.chickSpawns : WORLD.layout.animalSpawns)[index];
        const area = WORLD.areas.find(a => a.id === home.areaId);
        animal.areaId = area.id;
        const dx = animal.targetX - animal.x, dy = animal.targetY - animal.y;
        const len = Math.hypot(dx, dy);
        if (len > 5) {
          const step = Math.min(len, (chick ? 27 : 35) * dt);
          Player.move(animal, dx / len * step, dy / len * step);
        }
        if (Math.random() < dt * 0.22) {
          animal.targetX = clamp(home.x + (chick ? rand(-18, 18) : rand(-48, 48)), area.x + 55, area.x + area.w - 55);
          animal.targetY = clamp(home.y + (chick ? rand(-14, 14) : rand(-40, 40)), area.y + 55, area.y + area.h - 55);
        }
        resolveEnvironment(animal);
        animal.moving = dt > 0 && Math.hypot(animal.x - oldX, animal.y - oldY) > 0.02;
        if (animal.moving) Player.face(animal, animal.x - oldX, animal.y - oldY);
        else if (!chicken.hidden && distance(chicken, animal) < 150) Player.face(animal, chicken.x - animal.x, chicken.y - animal.y);
        if (len > 5 && !animal.moving && dt > 0) {
          animal.targetX = animal.x; animal.targetY = animal.y;
        }
        if (circleVsCircle(chicken, animal) &&
          DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(animal)) && GameManager.rescue(game, animal)) {
          spawnBurst(animal.x, animal.y, "#fff5a6", 22);
          AudioSystem.playAnimal(animal.species);
          const count = chick ? game.rescuedChicks : game.rescuedCount;
          const total = chick ? WORLD.targetChicks : WORLD.targetRescues;
          setStatus(`${RescueSystem.names[animal.species]} a salvo! ${count} de ${total} ${chick ? "pintinhos" : "amigos"}.`, "win");
          game.rescueNotice = { name: RescueSystem.names[animal.species], count, total, chick, time: 2.6 };
          const safe = safePosition(index);
          animal.x = safe.x; animal.y = safe.y;
          animal.targetX = safe.x; animal.targetY = safe.y;
          animal.moving = false; animal.direction = "down";
          GameManager.save(game);
          refreshHud();
        }
      } else {
        const safe = safePosition(index);
        animal.x = safe.x + Math.sin(animal.anim * 0.35 + index) * 4;
        animal.y = safe.y + Math.cos(animal.anim * 0.35 + index) * 3;
      }
      animal.anim += dt * (animal.moving ? 7 : 2.2);
    }
    GameManager.win(game);
  },
};
