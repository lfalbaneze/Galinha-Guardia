const RescueSystem = {
  names: { sheep: "Ovelha", pig: "Porquinho", goat: "Cabra", cow: "Vaquinha", duck: "Pato",
    rabbit: "Coelho", dog: "Cachorrinho", cat: "Gatinho", donkey: "Burrinho", lamb: "Cordeirinho", chick: "Pintinho" },
  all(game) { return [...game.entities.animals, ...(game.entities.chicks || [])]; },
  safePosition(index) {
    return { x: 140 + (index % 5) * 45, y: 370 + Math.floor(index / 5) * 48 };
  },
  chickPosition(index) { return { x: 135 + index * 37, y: 280 }; },
  knowsSecret(game) {
    return game.rescuedChicks > 0 || game.entities.chicks.some(c => c.discovered);
  },
  isSecret(animal) { return animal.type === "chick" && !animal.rescued && !animal.discovered; },
  secretHint(game) {
    if (game.phase !== "playing") return null;
    const chicken = game.entities.chicken;
    return game.entities.chicks.filter(c => RescueSystem.isSecret(c) && distance(chicken, c) < 190 &&
      DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(c)))
      .sort((a,b) => distance(chicken,a) - distance(chicken,b))[0] || null;
  },
  discover(game, chick, dt) {
    const chicken = game.entities.chicken;
    const quiet = input.has("c") && !chicken.sprinting && !chicken.hidden;
    const close = distance(chicken,chick) <= 48 &&
      DetectionSystem.hasLineOfSight(getHitbox(chicken),getHitbox(chick));
    chick.discoveryTime = quiet && close ? (chick.discoveryTime || 0) + dt : 0;
    if (chick.discoveryTime < .85) return false;
    chick.discovered = true; chick.discoveryTime = 0;
    chick.lastSeen = { x: chick.x, y: chick.y };
    game.secretNotice = { time: 4 };
    setStatus("Segredo encontrado: um pintinho! Será que tem mais pela fazenda?", "win");
    spawnBurst(chick.x,chick.y,"#ffe496",12);
    GameManager.save(game); GameUI.update(game);
    return true;
  },
  taunts: {
    sheep: ["Sai pra lá, esquisita!", "Mééé! Me deixa pastar!"],
    pig: ["Não tem lobo aqui!", "Meu barro, minhas regras!"],
    goat: ["Duvido me alcançar!", "Sai do meu capim!"],
    cow: ["Muuu! Que afobação!", "Eu nem terminei o almoço!"],
    duck: ["Quá! Pega se puder!", "Lobo? Conversa de galinha!"],
    rabbit: ["Olha eu aqui! Opa, ali!", "Sai pra lá, esquisita!"],
    dog: ["Au! Eu sei o caminho!", "Não preciso de babá!"],
    cat: ["Eu vou se EU quiser.", "Tira essa asa de mim!"],
    donkey: ["Daqui eu não... opa!", "Não tem lobo aqui, não!"],
    lamb: ["Minha mãe deixou!", "Mééé! Você que é o lobo!"],
    chick: ["Piu! Não sou ovo, não!", "Você não manda em mim!", "Nem vem, dona galinha!"]
  },
  visible(game, animal) {
    return !RescueSystem.isSecret(animal) && distance(game.entities.chicken, animal) < 300 &&
      DetectionSystem.hasLineOfSight(getHitbox(game.entities.chicken), getHitbox(animal));
  },
  talk(game, animal, tired = false) {
    if (game.animalSpeechCooldown > 0 || animal.speechTime > 0) return;
    const lines = RescueSystem.taunts[animal.species] || RescueSystem.taunts.chick;
    animal.speech = tired ? "Tá bom... só uma respirada!" : lines[Math.floor(Math.random() * lines.length)];
    animal.speechTime = 2.4;
    game.animalSpeechCooldown = 2.8;
  },
  flee(game, animal, home, area, dt) {
    const chicken = game.entities.chicken;
    const dx = animal.x - chicken.x, dy = animal.y - chicken.y;
    const angle = Math.atan2(dy || .001, dx || .001);
    const speed = chicken.speed * (game.difficultyKey === "easy" ? .97 : game.difficultyKey === "hard" ? 1.15 : 1.08) * (animal.type === "chick" ? 1.04 : 1);
    let best = null, score = -Infinity;
    // Look ahead around fences and tree trunks, then take a collision-safe small step.
    for (const turn of [0, .45, -.45, .9, -.9, 1.4, -1.4, 2.1, -2.1]) {
      const ax = Math.cos(angle + turn), ay = Math.sin(angle + turn);
      const probe = { ...animal, x: animal.x, y: animal.y };
      Player.move(probe, ax * 65, ay * 65);
      if (probe.x < area.x + 32 || probe.x > area.x + area.w - 32 || probe.y < area.y + 32 || probe.y > area.y + area.h - 32) continue;
      const travel = distance(probe, animal);
      if (travel < 15) continue;
      const value = distance(probe, chicken) + travel * .8 - Math.max(0, distance(probe, home) - 230) * 1.8 - Math.abs(turn) * 8;
      if (value > score) { score = value; best = { x: ax, y: ay }; }
    }
    if (best) Player.move(animal, best.x * speed * dt, best.y * speed * dt);
    animal.targetX = animal.x; animal.targetY = animal.y;
  },
  update(game, dt) {
    if (game.phase !== "playing") return;
    const chicken = game.entities.chicken;
    game.animalSpeechCooldown = Math.max(0, (game.animalSpeechCooldown || 0) - dt);
    game.secretSoundCooldown = Math.max(0, (game.secretSoundCooldown || 0) - dt);
    if (dt > 0 && game.secretSoundCooldown <= 0 && RescueSystem.secretHint(game)) {
      AudioSystem.play("chick", { volume: .14 });
      game.secretSoundCooldown = 4.5;
    }
    if (game.rescueNotice) game.rescueNotice.time = Math.max(0, game.rescueNotice.time - dt);
    if (game.skinNotice) game.skinNotice.time = Math.max(0, game.skinNotice.time - dt);
    if (game.secretNotice) game.secretNotice.time = Math.max(0, game.secretNotice.time - dt);
    for (const animal of RescueSystem.all(game)) {
      const chick = animal.type === "chick";
      const index = chick ? game.entities.chicks.indexOf(animal) : game.entities.animals.indexOf(animal);
      const safePosition = chick ? RescueSystem.chickPosition : RescueSystem.safePosition;
      const oldX = animal.x, oldY = animal.y;
      animal.speechTime = Math.max(0, (animal.speechTime || 0) - dt);
      animal.moving = false;
      if (RescueSystem.isSecret(animal)) {
        animal.speechTime = 0; animal.temper = "secret";
        RescueSystem.discover(game, animal, dt);
        // Finding the hiding place and catching its occupant are separate moments.
        continue;
      }
      if (!animal.rescued) {
        const touchedBeforeMove = circleVsCircle(chicken, animal) &&
          DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(animal));
        const home = (chick ? WORLD.layout.chickSpawns : WORLD.layout.animalSpawns)[index];
        const area = WORLD.areas.find(a => a.id === home.areaId);
        animal.areaId = area.id;
        const visible = RescueSystem.visible(game, animal);
        if (visible) { animal.discovered = true; animal.lastSeen = { x: animal.x, y: animal.y }; }
        const facing = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] }[animal.direction] || [0,1];
        const toward = (chicken.x - animal.x) * facing[0] + (chicken.y - animal.y) * facing[1];
        const alertRange = chicken.sneaking ? 22 : chicken.sprinting ? 240 : toward > 0 ? 170 : 105;
        const threat = !chicken.hidden && visible && distance(chicken, animal) < alertRange;
        animal.restTime = Math.max(0, (animal.restTime || 0) - dt);
        animal.fleeTime = threat ? .9 : Math.max(0, (animal.fleeTime || 0) - dt);
        const fleeing = animal.fleeTime > 0 && animal.restTime <= 0;
        animal.temper = animal.restTime > 0 ? "tired" : fleeing ? "fleeing" : "idle";
        const dx = animal.targetX - animal.x, dy = animal.targetY - animal.y;
        const len = Math.hypot(dx, dy);
        if (fleeing) {
          RescueSystem.flee(game, animal, home, area, dt);
          animal.fatigue = (animal.fatigue || 0) + dt;
          RescueSystem.talk(game, animal);
          const endurance = game.difficultyKey === "easy" ? 2.8 : game.difficultyKey === "hard" ? 6 : 4.4;
          if (animal.fatigue >= endurance) {
            animal.restTime = 3.1; animal.fatigue = 0; animal.temper = "tired";
            animal.speechTime = 0; RescueSystem.talk(game, animal, true);
          }
        } else if (animal.restTime <= 0 && len > 5) {
          const step = Math.min(len, (chick ? 27 : 35) * dt);
          Player.move(animal, dx / len * step, dy / len * step);
        }
        if (!fleeing) animal.fatigue = Math.max(0, (animal.fatigue || 0) - dt * .25);
        if (!fleeing && animal.restTime <= 0 && Math.random() < dt * 0.22) {
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
        if ((touchedBeforeMove || (circleVsCircle(chicken, animal) &&
          DetectionSystem.hasLineOfSight(getHitbox(chicken), getHitbox(animal)))) && GameManager.rescue(game, animal)) {
          spawnBurst(animal.x, animal.y, "#fff5a6", 22);
          AudioSystem.playAnimal(animal.species);
          const count = chick ? game.rescuedChicks : game.rescuedCount;
          const total = chick ? WORLD.targetChicks : WORLD.targetRescues;
          setStatus(`${RescueSystem.names[animal.species]} a salvo! ${count} de ${total} ${chick ? "pintinhos" : "amigos"}. O lobo apertou o cerco!`, "win");
          game.rescueNotice = { name: RescueSystem.names[animal.species], count, total, chick, time: 2.6 };
          const safe = safePosition(index);
          animal.x = safe.x; animal.y = safe.y;
          animal.targetX = safe.x; animal.targetY = safe.y;
          animal.moving = false; animal.direction = "down";
          animal.temper = "safe"; animal.speechTime = 0;
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
