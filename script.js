(() => {
  "use strict";

  const LOGICAL_WIDTH = 1280;
  const LOGICAL_HEIGHT = 720;
  const TAU = Math.PI * 2;
  const FIELD = Object.freeze({
    x: 40,
    y: 96,
    cols: 20,
    rows: 10,
    cell: 60,
    width: 1200,
    height: 600,
  });

  const STATES = Object.freeze({
    MENU: "menu",
    PLAYING: "playing",
    PAUSED: "paused",
    LEVEL_CLEAR: "level_clear",
    GAME_OVER: "game_over",
    VICTORY: "victory",
  });

  const STORAGE_KEYS = Object.freeze({
    muted: "neonTank.muted",
    best: "neonTank.bestScore",
  });

  const DIFFICULTIES = Object.freeze({
    easy: {
      label: "简单",
      lives: 4,
      enemyScale: 0.75,
      enemySpeed: 0.85,
      enemyFireRate: 0.8,
      bossHp: 35,
      maxActive: 3,
      hint: "敌军火力较低，10 点装甲与 4 台备用机体。",
    },
    normal: {
      label: "普通",
      lives: 3,
      enemyScale: 1,
      enemySpeed: 1,
      enemyFireRate: 1,
      bossHp: 50,
      maxActive: 4,
      hint: "标准敌军节奏，10 点装甲与 3 台备用机体。",
    },
    hard: {
      label: "困难",
      lives: 2,
      enemyScale: 1.25,
      enemySpeed: 1.15,
      enemyFireRate: 1.25,
      bossHp: 65,
      maxActive: 5,
      hint: "敌军更快更密，10 点装甲与 2 台备用机体。",
    },
  });

  const ENEMY_TYPES = Object.freeze({
    scout: {
      name: "侦察兵",
      hp: 1,
      speed: 112,
      size: 42,
      score: 100,
      reload: 1.85,
      bulletSpeed: 360,
      color: "#5af5cc",
      accent: "#c1fff2",
      body: "#073d3d",
    },
    assault: {
      name: "突击兵",
      hp: 2,
      speed: 84,
      size: 46,
      score: 200,
      reload: 1.48,
      bulletSpeed: 390,
      color: "#ffb44c",
      accent: "#ffe4a8",
      body: "#4b2708",
    },
    heavy: {
      name: "重装兵",
      hp: 4,
      speed: 55,
      size: 54,
      score: 400,
      reload: 1.92,
      bulletSpeed: 320,
      color: "#ff5c7e",
      accent: "#ffd1dc",
      body: "#4d0c1c",
    },
  });

  const POWERUPS = Object.freeze({
    shield: { label: "护盾", char: "盾", color: "#5feaff", weight: 28, toast: "能量护盾启动：6 秒内免疫伤害" },
    rapid: { label: "速射", char: "速", color: "#ffd166", weight: 28, toast: "脉冲炮超频：8 秒内射速提升" },
    repair: { label: "核心修复", char: "修", color: "#77ff9a", weight: 18, toast: "核心修复完成：耐久 +1" },
    shock: { label: "震荡弹", char: "震", color: "#ff75b7", weight: 16, toast: "震荡脉冲释放：敌军受到重创" },
    life: { label: "备用机体", char: "备", color: "#c3a4ff", weight: 10, toast: "机体 +1，已接入战场" },
  });

  const PLAYER_CONFIG = Object.freeze({
    speed: 190,
    size: 46,
    maxHp: 10,
    hitInvulnerability: 0.55,
    baseReload: 0.35,
    rapidReload: 0.17,
    bulletSpeed: 580,
    respawnShield: 2.6,
  });

  const CORE_MAX_HP = 5;

  const CORE_RECT = Object.freeze({
    x: 640,
    y: FIELD.y + FIELD.height - 30,
    w: 96,
    h: 54,
  });

  const PLAYER_SPAWN = Object.freeze({
    x: FIELD.x + FIELD.cell * 4.5,
    y: FIELD.y + FIELD.height - 30,
  });

  const ENEMY_SPAWNS = Object.freeze([
    { x: FIELD.x + FIELD.cell * 2.5, y: FIELD.y + 30 },
    { x: FIELD.x + FIELD.cell * 10, y: FIELD.y + 30 },
    { x: FIELD.x + FIELD.cell * 17.5, y: FIELD.y + 30 },
  ]);

  const LEVELS = Object.freeze([
    {
      number: 1,
      name: "霓虹边境",
      subtitle: "突破外围巡逻队",
      descriptions: "巡逻队正在逼近核心。利用砖墙掩体逐个击破敌军。",
      guardBase: 8,
      boss: false,
      weights: { scout: 44, assault: 44, heavy: 12 },
      map: [
        "....................",
        ".BB..BBBB..BBBB..BB.",
        ".BB..B..B..B..B..BB.",
        "......B..B..B..B....",
        "SS..BB.......BB..SS.",
        "....BB..SS.SS..BB...",
        ".BB.....B.B.....BB..",
        ".BB..BB..B.B..BB..BB",
        "..BB....B..B....BB..",
        "........B..B........",
      ],
    },
    {
      number: 2,
      name: "磁暴工厂",
      subtitle: "穿越重装封锁线",
      descriptions: "重装单位已经进场。钢墙会阻挡炮火，寻找侧翼通路。",
      guardBase: 12,
      boss: false,
      weights: { scout: 28, assault: 42, heavy: 30 },
      map: [
        "....................",
        "..SS....BBBB....SS..",
        "..SS....B..B....SS..",
        "....BBB.B..B.BBB....",
        "BB......B..B......BB",
        "BB..SS........SS..BB",
        "....SS..BBBB..SS....",
        ".BB.....B..B.....BB.",
        ".BB..BB......BB..BB.",
        "........B..B........",
      ],
    },
    {
      number: 3,
      name: "熔核核心",
      subtitle: "击毁最终首领",
      descriptions: "突破最后守卫，迎战熔核巨像。它的火力会随损毁程度升级。",
      guardBase: 6,
      boss: true,
      bossName: "熔核巨像",
      weights: { scout: 20, assault: 44, heavy: 36 },
      map: [
        "....................",
        "..SS............SS..",
        "..SS............SS..",
        "..BB............BB..",
        "......BBBBBB........",
        "....BB..SSSS..BB....",
        "..SS............SS..",
        ".BB....BB..BB....BB.",
        ".BB....B....B....BB.",
        "........B..B........",
      ],
    },
  ]);

  const dom = {
    shell: document.getElementById("gameShell"),
    canvas: document.getElementById("gameCanvas"),
    overlay: document.getElementById("overlay"),
    startScreen: document.getElementById("startScreen"),
    pauseScreen: document.getElementById("pauseScreen"),
    levelScreen: document.getElementById("levelScreen"),
    resultScreen: document.getElementById("resultScreen"),
    rotateHint: document.getElementById("rotateHint"),
    hud: document.getElementById("hud"),
    bossHud: document.getElementById("bossHud"),
    bossFill: document.getElementById("bossFill"),
    bossValue: document.getElementById("bossValue"),
    bossTrack: document.querySelector(".boss-track"),
    notificationLayer: document.getElementById("notificationLayer"),
    touchControls: document.getElementById("touchControls"),
    lifePips: document.getElementById("lifePips"),
    corePips: document.getElementById("corePips"),
    levelValue: document.getElementById("levelValue"),
    scoreValue: document.getElementById("scoreValue"),
    livesValue: document.getElementById("livesValue"),
    coreValue: document.getElementById("coreValue"),
    enemiesValue: document.getElementById("enemiesValue"),
    bestScoreMenu: document.getElementById("bestScoreMenu"),
    difficultyHint: document.getElementById("difficultyHint"),
    startButton: document.getElementById("startButton"),
    resumeButton: document.getElementById("resumeButton"),
    restartButton: document.getElementById("restartButton"),
    pauseMenuButton: document.getElementById("pauseMenuButton"),
    levelButton: document.getElementById("levelButton"),
    levelMenuButton: document.getElementById("levelMenuButton"),
    levelScreenTitle: document.getElementById("levelScreenTitle"),
    levelScreenText: document.getElementById("levelScreenText"),
    levelScreenStats: document.getElementById("levelScreenStats"),
    resultScreenTitle: document.getElementById("resultTitle"),
    resultEyebrow: document.getElementById("resultEyebrow"),
    resultText: document.getElementById("resultText"),
    resultStats: document.getElementById("resultStats"),
    resultRestartButton: document.getElementById("resultRestartButton"),
    resultMenuButton: document.getElementById("resultMenuButton"),
    soundButton: document.getElementById("soundButton"),
    soundLabel: document.getElementById("soundLabel"),
    pauseButton: document.getElementById("pauseButton"),
    joystick: document.getElementById("joystick"),
    joystickKnob: document.getElementById("joystickKnob"),
    fireButtons: Array.from(document.querySelectorAll(".fire-button")),
    difficultyButtons: Array.from(document.querySelectorAll(".difficulty-button")),
  };

  const ctx = dom.canvas.getContext("2d", { alpha: false });

  function readStorage(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      // 隐私模式下存储可能不可用，游戏本体仍可继续。
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function distanceBetween(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y);
    if (length < 0.0001) return { x: 0, y: 0, length: 0 };
    return { x: x / length, y: y / length, length };
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(6, "0");
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const rest = String(total % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  function pickWeighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRectOverlap(cx, cy, radius, rect) {
    const nearestX = clamp(cx, rect.x, rect.x + rect.w);
    const nearestY = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= radius * radius;
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointerQuery = window.matchMedia("(any-pointer: coarse)");

  const game = {
    state: STATES.MENU,
    difficulty: "normal",
    difficultyConfig: DIFFICULTIES.normal,
    levelIndex: 0,
    levelDef: LEVELS[0],
    score: 0,
    best: Number.parseInt(readStorage(STORAGE_KEYS.best, "0"), 10) || 0,
    lives: DIFFICULTIES.normal.lives,
    coreHp: CORE_MAX_HP,
    time: 0,
    visualTime: 0,
    levelTime: 0,
    totalTime: 0,
    walls: [],
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    rings: [],
    player: null,
    playerRespawn: 0,
    coreFlash: 0,
    guardsTotal: 0,
    guardsSpawned: 0,
    guardsKilled: 0,
    spawnTimer: 0,
    introTimer: 0,
    banner: null,
    boss: null,
    bossSpawned: false,
    bossDefeated: false,
    bossWarningPlayed: false,
    victoryTimer: 0,
    shake: 0,
    flash: 0,
    flashColor: "#ffffff",
    muted: readStorage(STORAGE_KEYS.muted, "0") === "1",
    keys: new Set(),
    touchVector: { x: 0, y: 0 },
    firePointers: new Set(),
    firePointerButtons: new Map(),
    joystickPointer: null,
    joystickCenter: { x: 0, y: 0 },
    joystickRadius: 1,
    nextId: 1,
    hudTimer: 0,
    lastFrame: 0,
    orientationPaused: false,
    reducedMotion: reducedMotionQuery.matches,
  };

  function nextId() {
    const id = game.nextId;
    game.nextId += 1;
    return id;
  }

  /* ── 音效：全部由 Web Audio 实时合成 ───────────────────── */
  let audioContext = null;
  let masterGain = null;
  let noiseBuffer = null;

  function ensureAudio() {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(audioContext.destination);

      const sampleRate = audioContext.sampleRate;
      noiseBuffer = audioContext.createBuffer(1, sampleRate, sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playTone(frequency, duration, options = {}) {
    if (game.muted) return;
    const audio = ensureAudio();
    if (!audio || !masterGain) return;
    const {
      endFrequency = frequency,
      type = "square",
      volume = 0.025,
      delay = 0,
    } = options;
    const startAt = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function playNoise(duration, options = {}) {
    if (game.muted) return;
    const audio = ensureAudio();
    if (!audio || !masterGain || !noiseBuffer) return;
    const { volume = 0.05, cutoff = 900, delay = 0 } = options;
    const startAt = audio.currentTime + delay;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, startAt);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.25), startAt + duration);
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start(startAt);
    source.stop(startAt + duration + 0.02);
  }

  const sound = {
    click() {
      playTone(540, 0.06, { endFrequency: 760, type: "triangle", volume: 0.018 });
    },
    start() {
      playTone(220, 0.16, { endFrequency: 440, type: "sawtooth", volume: 0.025 });
      playTone(440, 0.2, { endFrequency: 880, type: "triangle", volume: 0.022, delay: 0.12 });
    },
    shoot() {
      playTone(650, 0.075, { endFrequency: 230, type: "square", volume: 0.017 });
    },
    enemyShoot() {
      playTone(240, 0.08, { endFrequency: 120, type: "triangle", volume: 0.011 });
    },
    hit() {
      playNoise(0.055, { volume: 0.022, cutoff: 1500 });
      playTone(180, 0.05, { endFrequency: 90, type: "square", volume: 0.012 });
    },
    brick() {
      playNoise(0.045, { volume: 0.012, cutoff: 800 });
    },
    explosion() {
      playNoise(0.28, { volume: 0.06, cutoff: 850 });
      playTone(105, 0.24, { endFrequency: 35, type: "sawtooth", volume: 0.03 });
    },
    pickup() {
      playTone(520, 0.09, { endFrequency: 780, type: "triangle", volume: 0.025 });
      playTone(780, 0.12, { endFrequency: 1040, type: "sine", volume: 0.02, delay: 0.08 });
    },
    warning() {
      playTone(150, 0.18, { endFrequency: 150, type: "square", volume: 0.03 });
      playTone(150, 0.18, { endFrequency: 150, type: "square", volume: 0.03, delay: 0.27 });
    },
    levelClear() {
      [440, 554, 659, 880].forEach((frequency, index) => {
        playTone(frequency, 0.24, { endFrequency: frequency * 1.02, type: "triangle", volume: 0.022, delay: index * 0.12 });
      });
    },
    victory() {
      [392, 523, 659, 784, 1047].forEach((frequency, index) => {
        playTone(frequency, 0.34, { endFrequency: frequency * 1.01, type: "triangle", volume: 0.024, delay: index * 0.14 });
      });
    },
    defeat() {
      [260, 210, 164, 110].forEach((frequency, index) => {
        playTone(frequency, 0.32, { endFrequency: frequency * 0.82, type: "sawtooth", volume: 0.022, delay: index * 0.16 });
      });
    },
  };

  /* ── 界面状态与覆盖层 ───────────────────────────────────── */
  const screens = [dom.startScreen, dom.pauseScreen, dom.levelScreen, dom.resultScreen];

  function showScreen(target) {
    screens.forEach((screen) => {
      screen.hidden = screen !== target;
    });
    dom.overlay.hidden = false;
  }

  function hideOverlay() {
    dom.overlay.hidden = true;
  }

  function setState(nextState) {
    game.state = nextState;
    dom.shell.dataset.state = nextState;
    dom.pauseButton.disabled = nextState !== STATES.PLAYING;
    dom.pauseButton.setAttribute("aria-label", nextState === STATES.PLAYING ? "暂停游戏" : "当前无法暂停");
    const touchHidden = nextState !== STATES.PLAYING;
    dom.touchControls.setAttribute("aria-hidden", touchHidden ? "true" : "false");
    dom.fireButtons.forEach((button) => {
      button.tabIndex = touchHidden ? -1 : 0;
    });
  }

  function showToast(message, tone = "") {
    const toast = document.createElement("div");
    toast.className = `toast${tone ? ` ${tone}` : ""}`;
    toast.textContent = message;
    dom.notificationLayer.appendChild(toast);
    while (dom.notificationLayer.children.length > 3) {
      dom.notificationLayer.firstElementChild.remove();
    }
    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => toast.remove(), 240);
    }, 2200);
  }

  function updateSoundButton() {
    dom.soundLabel.textContent = game.muted ? "音效关" : "音效开";
    dom.soundButton.setAttribute("aria-pressed", game.muted ? "true" : "false");
    dom.soundButton.setAttribute("aria-label", game.muted ? "开启音效" : "关闭音效");
  }

  function updateDifficultyUi() {
    const config = DIFFICULTIES[game.difficulty];
    dom.difficultyButtons.forEach((button) => {
      const selected = button.dataset.difficulty === game.difficulty;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    dom.difficultyHint.textContent = config.hint;
  }

  function updateBestDisplays() {
    dom.bestScoreMenu.textContent = formatScore(game.best);
  }

  function commitBestScore() {
    if (game.score > game.best) {
      game.best = game.score;
      writeStorage(STORAGE_KEYS.best, game.best);
      updateBestDisplays();
    }
  }

  function getRemainingEnemyCount() {
    const guardsLeft = Math.max(0, game.guardsTotal - game.guardsKilled);
    const bossLeft = game.levelDef && game.levelDef.boss && !game.bossDefeated ? 1 : 0;
    const bossAdds = game.enemies.filter((enemy) => !enemy.dead && enemy.isBossAdd).length;
    return guardsLeft + bossLeft + bossAdds;
  }

  function updatePipMeter(container, current, total) {
    if (!container) return;
    if (container.children.length !== total) {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < total; index += 1) {
        fragment.appendChild(document.createElement("b"));
      }
      container.replaceChildren(fragment);
    }
    Array.from(container.children).forEach((pip, index) => {
      pip.classList.toggle("is-on", index < current);
    });
  }

  function updateHud() {
    const playerHp = game.player ? game.player.hp : 0;
    const playerMaxHp = PLAYER_CONFIG.maxHp;
    dom.levelValue.textContent = game.levelDef ? `${game.levelDef.number} / 3` : "--";
    dom.scoreValue.textContent = formatScore(game.score);
    dom.livesValue.textContent = `${playerHp} / ${playerMaxHp}`;
    dom.livesValue.title = `备用机体 ${game.lives} 台`;
    dom.livesValue.setAttribute("aria-label", `生命 ${playerHp}/${playerMaxHp}，备用机体 ${game.lives} 台`);
    dom.coreValue.textContent = `${game.coreHp} / ${CORE_MAX_HP}`;
    dom.enemiesValue.textContent = String(getRemainingEnemyCount());
    dom.livesValue.classList.toggle("is-danger", playerHp > 0 && playerHp <= 3);
    dom.coreValue.classList.toggle("is-danger", game.coreHp <= 2);
    updatePipMeter(dom.lifePips, playerHp, playerMaxHp);
    updatePipMeter(dom.corePips, game.coreHp, CORE_MAX_HP);
    updateBossHud();
  }

  function updateBossHud() {
    const boss = game.boss;
    if (!boss) {
      dom.bossHud.hidden = true;
      return;
    }
    dom.bossHud.hidden = false;
    document.getElementById("bossName").textContent = game.levelDef.bossName || "熔核巨像";
    const percent = clamp((boss.hp / boss.maxHp) * 100, 0, 100);
    dom.bossFill.style.width = `${percent}%`;
    dom.bossValue.textContent = `${Math.ceil(percent)}%`;
    dom.bossTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
  }

  function populateStats(container, items) {
    container.replaceChildren();
    items.forEach(({ label, value }) => {
      const block = document.createElement("div");
      const span = document.createElement("span");
      const strong = document.createElement("strong");
      span.textContent = label;
      strong.textContent = value;
      block.append(span, strong);
      container.appendChild(block);
    });
  }

  function showStartScreen() {
    setState(STATES.MENU);
    hideTouchInputs();
    dom.bossHud.hidden = true;
    dom.resultScreen.classList.remove("is-victory", "is-defeat");
    dom.notificationLayer.replaceChildren();
    showScreen(dom.startScreen);
    updateDifficultyUi();
    updateBestDisplays();
    updateHud();
    window.setTimeout(() => dom.startButton.focus({ preventScroll: true }), 80);
  }

  function showPauseScreen() {
    showScreen(dom.pauseScreen);
    dom.resumeButton.focus({ preventScroll: true });
  }

  function showLevelScreen() {
    const def = game.levelDef;
    const nextLevel = LEVELS[game.levelIndex + 1];
    dom.levelScreenTitle.textContent = "突破成功";
    dom.levelScreenText.textContent = nextLevel
      ? `下一处战区“${nextLevel.name}”已解锁。通关奖励 +${game.lastBonus} 分，备用机体 +1，核心已修复。`
      : "全部战区已经净化。";
    populateStats(dom.levelScreenStats, [
      { label: "当前得分", value: formatScore(game.score) },
      { label: "本关用时", value: formatTime(game.levelTime) },
      { label: "核心耐久", value: `${game.coreHp} / ${CORE_MAX_HP}` },
    ]);
    const buttonLabel = dom.levelButton.querySelector("span");
    buttonLabel.textContent = nextLevel && nextLevel.boss ? "挑战最终首领" : "进入下一战区";
    showScreen(dom.levelScreen);
    window.setTimeout(() => dom.levelButton.focus({ preventScroll: true }), 80);
  }

  function showResultScreen(victory, reason) {
    commitBestScore();
    setState(victory ? STATES.VICTORY : STATES.GAME_OVER);
    hideTouchInputs();
    dom.resultScreen.classList.toggle("is-victory", victory);
    dom.resultScreen.classList.toggle("is-defeat", !victory);
    dom.resultEyebrow.innerHTML = "<span></span> 战区报告 <span></span>";
    dom.resultScreenTitle.textContent = victory ? "防线重启成功" : "核心失守";
    dom.resultText.textContent = reason;
    populateStats(dom.resultStats, [
      { label: "最终得分", value: formatScore(game.score) },
      { label: "抵达关卡", value: `第 ${game.levelDef.number} 关` },
      { label: "历史最高", value: formatScore(game.best) },
    ]);
    const restartLabel = dom.resultRestartButton.querySelector("span");
    restartLabel.textContent = victory ? "再战一局" : "再次出击";
    showScreen(dom.resultScreen);
    window.setTimeout(() => dom.resultRestartButton.focus({ preventScroll: true }), 80);
  }

  /* ── 地图、碰撞与战区初始化 ─────────────────────────────── */
  function parseMap(map) {
    const walls = [];
    const grid = Array.from({ length: FIELD.rows }, () => Array(FIELD.cols).fill(null));
    map.forEach((row, rowIndex) => {
      if (row.length !== FIELD.cols) {
        console.warn(`地图第 ${rowIndex + 1} 行长度异常：${row.length}`);
      }
      row.split("").forEach((symbol, colIndex) => {
        if (symbol !== "B" && symbol !== "S") return;
        const wall = {
          id: nextId(),
          type: symbol === "B" ? "brick" : "steel",
          col: colIndex,
          row: rowIndex,
          x: FIELD.x + colIndex * FIELD.cell,
          y: FIELD.y + rowIndex * FIELD.cell,
          w: FIELD.cell,
          h: FIELD.cell,
          hp: symbol === "B" ? 2 : Number.POSITIVE_INFINITY,
          maxHp: symbol === "B" ? 2 : Number.POSITIVE_INFINITY,
          flash: 0,
        };
        walls.push(wall);
        grid[rowIndex][colIndex] = wall;
      });
    });
    return { walls, grid };
  }

  function cellCenter(col, row) {
    return {
      x: FIELD.x + col * FIELD.cell + FIELD.cell / 2,
      y: FIELD.y + row * FIELD.cell + FIELD.cell / 2,
    };
  }

  function pointToCell(x, y) {
    return {
      col: clamp(Math.floor((x - FIELD.x) / FIELD.cell), 0, FIELD.cols - 1),
      row: clamp(Math.floor((y - FIELD.y) / FIELD.cell), 0, FIELD.rows - 1),
    };
  }

  function tankRect(tank) {
    return { x: tank.x - tank.size / 2, y: tank.y - tank.size / 2, w: tank.size, h: tank.size };
  }

  function bossRect(boss) {
    return { x: boss.x - boss.w / 2, y: boss.y - boss.h / 2, w: boss.w, h: boss.h };
  }

  function coreCellBlocked(col, row) {
    const rect = {
      x: FIELD.x + col * FIELD.cell,
      y: FIELD.y + row * FIELD.cell,
      w: FIELD.cell,
      h: FIELD.cell,
    };
    return rectsOverlap(rect, {
      x: CORE_RECT.x - CORE_RECT.w / 2,
      y: CORE_RECT.y - CORE_RECT.h / 2,
      w: CORE_RECT.w,
      h: CORE_RECT.h,
    });
  }

  function isCellWalkable(col, row) {
    if (col < 0 || row < 0 || col >= FIELD.cols || row >= FIELD.rows) return false;
    if (game.wallGrid[row][col]) return false;
    return !coreCellBlocked(col, row);
  }

  function collidingWall(rect) {
    for (const wall of game.walls) {
      if (rectsOverlap(rect, wall)) return wall;
    }
    return null;
  }

  function collidingCore(rect) {
    return rectsOverlap(rect, {
      x: CORE_RECT.x - CORE_RECT.w / 2,
      y: CORE_RECT.y - CORE_RECT.h / 2,
      w: CORE_RECT.w,
      h: CORE_RECT.h,
    });
  }

  function isInField(rect) {
    return rect.x >= FIELD.x && rect.y >= FIELD.y
      && rect.x + rect.w <= FIELD.x + FIELD.width
      && rect.y + rect.h <= FIELD.y + FIELD.height;
  }

  function tankFitsAt(tank, x, y, includePlayer = false) {
    const rect = { x: x - tank.size / 2, y: y - tank.size / 2, w: tank.size, h: tank.size };
    if (!isInField(rect) || collidingWall(rect) || collidingCore(rect)) return false;
    if (includePlayer && game.player && game.player !== tank && rectsOverlap(rect, tankRect(game.player))) return false;
    if (game.boss && rectsOverlap(rect, bossRect(game.boss))) return false;
    return true;
  }

  function moveTank(tank, dx, dy) {
    let movedX = 0;
    let movedY = 0;
    if (dx !== 0 && tankFitsAt(tank, tank.x + dx, tank.y)) {
      tank.x += dx;
      movedX = dx;
    }
    if (dy !== 0 && tankFitsAt(tank, tank.x, tank.y + dy)) {
      tank.y += dy;
      movedY = dy;
    }
    return { x: movedX, y: movedY };
  }

  function resolvePlayerTankOverlap() {
    const player = game.player;
    if (!player) return;
    const pRect = tankRect(player);
    for (const enemy of game.enemies) {
      const eRect = tankRect(enemy);
      if (!rectsOverlap(pRect, eRect)) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        player.x = enemy.x + Math.sign(dx || 1) * (player.size + enemy.size) / 2;
      } else {
        player.y = enemy.y + Math.sign(dy || 1) * (player.size + enemy.size) / 2;
      }
      player.x = clamp(player.x, FIELD.x + player.size / 2, FIELD.x + FIELD.width - player.size / 2);
      player.y = clamp(player.y, FIELD.y + player.size / 2, FIELD.y + FIELD.height - player.size / 2);
    }
  }

  function createPlayer(withShield = true) {
    game.player = {
      id: nextId(),
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      size: PLAYER_CONFIG.size,
      hp: PLAYER_CONFIG.maxHp,
      maxHp: PLAYER_CONFIG.maxHp,
      bodyAngle: -Math.PI / 2,
      turretAngle: -Math.PI / 2,
      reload: 0,
      tread: 0,
      shieldUntil: game.time + (withShield ? PLAYER_CONFIG.respawnShield : 0),
      damageCooldownUntil: 0,
      hitFlash: 0,
      alive: true,
      isPlayer: true,
    };
    game.playerRespawn = 0;
  }

  function resetWorldState() {
    game.walls = [];
    game.wallGrid = Array.from({ length: FIELD.rows }, () => Array(FIELD.cols).fill(null));
    game.bullets = [];
    game.enemyBullets = [];
    game.enemies = [];
    game.powerups = [];
    game.particles = [];
    game.rings = [];
    game.player = null;
    game.playerRespawn = 0;
    game.coreHp = CORE_MAX_HP;
    game.coreFlash = 0;
    game.guardsTotal = 0;
    game.guardsSpawned = 0;
    game.guardsKilled = 0;
    game.spawnTimer = 0;
    game.introTimer = 0;
    game.banner = null;
    game.boss = null;
    game.bossSpawned = false;
    game.bossDefeated = false;
    game.bossWarningPlayed = false;
    game.victoryTimer = 0;
    game.shake = 0;
    game.flash = 0;
    game.levelTime = 0;
    game.hudTimer = 0;
  }

  function loadLevel(index) {
    const def = LEVELS[index];
    const config = game.difficultyConfig;
    resetWorldState();
    game.levelIndex = index;
    game.levelDef = def;
    const parsed = parseMap(def.map);
    game.walls = parsed.walls;
    game.wallGrid = parsed.grid;
    game.guardsTotal = Math.max(3, Math.round(def.guardBase * config.enemyScale));
    game.guardsSpawned = 0;
    game.guardsKilled = 0;
    game.spawnTimer = 1.15;
    game.introTimer = 2.35;
    game.banner = {
      title: `第 ${def.number} 关`,
      subtitle: def.name,
      detail: def.descriptions,
      timer: 2.35,
      maxTimer: 2.35,
      tone: def.boss ? "danger" : "normal",
    };
    createPlayer(true);
    setState(STATES.PLAYING);
    hideOverlay();
    dom.bossHud.hidden = true;
    dom.notificationLayer.replaceChildren();
    updateHud();
    syncOrientation();
  }

  function beginRun() {
    game.difficultyConfig = DIFFICULTIES[game.difficulty];
    game.score = 0;
    game.lives = game.difficultyConfig.lives;
    game.time = 0;
    game.totalTime = 0;
    game.lastBonus = 0;
    loadLevel(0);
    ensureAudio();
    sound.start();
    dom.canvas.focus({ preventScroll: true });
  }

  /* ── 视觉反馈与通用战斗效果 ─────────────────────────────── */
  function addScore(amount) {
    game.score += Math.max(0, Math.round(amount));
  }

  function addShake(amount) {
    if (game.reducedMotion) return;
    game.shake = Math.max(game.shake, amount);
  }

  function flashScreen(color = "#ffffff", strength = 0.3) {
    if (game.reducedMotion) return;
    game.flashColor = color;
    game.flash = Math.max(game.flash, strength);
  }

  function spawnParticles(x, y, color, count = 10, power = 180, options = {}) {
    const actualCount = game.reducedMotion ? Math.ceil(count * 0.4) : count;
    const { size = 4, life = 0.7, gravity = 0 } = options;
    for (let index = 0; index < actualCount; index += 1) {
      const angle = Math.random() * TAU;
      const speed = randomBetween(power * 0.24, power);
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomBetween(life * 0.45, life),
        maxLife: life,
        size: randomBetween(size * 0.45, size * 1.35),
        color,
        gravity,
        drag: 0.92,
      });
    }
  }

  function addRing(x, y, color, maxRadius, duration = 0.55, width = 4) {
    game.rings.push({
      x,
      y,
      color,
      radius: 8,
      maxRadius,
      life: duration,
      maxLife: duration,
      width,
    });
  }

  function createExplosion(x, y, color = "#ffbd66", scale = 1) {
    spawnParticles(x, y, color, Math.round(20 * scale), 260 * scale, { size: 5 * scale, life: 0.85 });
    spawnParticles(x, y, "#ffffff", Math.round(7 * scale), 150 * scale, { size: 3 * scale, life: 0.4 });
    addRing(x, y, color, 58 * scale, 0.55, 3);
    addShake(3.8 * scale);
  }

  function updateParticles(dt) {
    for (const particle of game.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(particle.drag, dt * 60);
      particle.vy = particle.vy * Math.pow(particle.drag, dt * 60) + particle.gravity * dt;
    }
    game.particles = game.particles.filter((particle) => particle.life > 0);
    for (const ring of game.rings) {
      ring.life -= dt;
      const progress = 1 - clamp(ring.life / ring.maxLife, 0, 1);
      ring.radius = lerp(8, ring.maxRadius, 1 - Math.pow(1 - progress, 3));
    }
    game.rings = game.rings.filter((ring) => ring.life > 0);
  }

  function turnToward(current, target, maxDelta) {
    const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + clamp(delta, -maxDelta, maxDelta);
  }

  /* ── 炮弹 ───────────────────────────────────────────────── */
  const PLAYER_BULLET_COLOR = "#7df7ff";
  const ENEMY_BULLET_COLOR = "#ff8a5e";
  const BOSS_BULLET_COLOR = "#ff4e9f";

  function addBullet(bullet) {
    game.bullets.push({
      id: nextId(),
      x: bullet.x,
      y: bullet.y,
      vx: Math.cos(bullet.angle) * bullet.speed,
      vy: Math.sin(bullet.angle) * bullet.speed,
      radius: bullet.radius || 5,
      color: bullet.color || PLAYER_BULLET_COLOR,
      damage: bullet.damage || 1,
      life: bullet.life || 3,
      trail: [],
    });
  }

  function addEnemyBullet(bullet) {
    game.enemyBullets.push({
      id: nextId(),
      x: bullet.x,
      y: bullet.y,
      vx: Math.cos(bullet.angle) * bullet.speed,
      vy: Math.sin(bullet.angle) * bullet.speed,
      radius: bullet.radius || 6,
      color: bullet.color || ENEMY_BULLET_COLOR,
      damage: bullet.damage || 1,
      life: bullet.life || 4,
      trail: [],
    });
  }

  function firePlayer() {
    const player = game.player;
    if (!player || game.state !== STATES.PLAYING || game.introTimer > 0 || player.reload > 0) return;
    const rapid = game.time < (player.rapidUntil || 0);
    player.reload = rapid ? PLAYER_CONFIG.rapidReload : PLAYER_CONFIG.baseReload;
    const muzzleDistance = player.size * 0.55 + 12;
    const muzzleX = player.x + Math.cos(player.turretAngle) * muzzleDistance;
    const muzzleY = player.y + Math.sin(player.turretAngle) * muzzleDistance;
    addBullet({
      x: muzzleX,
      y: muzzleY,
      angle: player.turretAngle,
      speed: PLAYER_CONFIG.bulletSpeed,
      radius: 5,
      color: rapid ? "#ffe27a" : PLAYER_BULLET_COLOR,
      damage: 1,
    });
    spawnParticles(muzzleX, muzzleY, rapid ? "#ffe27a" : PLAYER_BULLET_COLOR, 5, 90, { size: 2.5, life: 0.22 });
    addShake(0.55);
    sound.shoot();
  }

  function destroyWall(wall) {
    if (wall.type !== "brick") return;
    game.walls = game.walls.filter((item) => item !== wall);
    if (game.wallGrid[wall.row] && game.wallGrid[wall.row][wall.col] === wall) {
      game.wallGrid[wall.row][wall.col] = null;
    }
  }

  function hitWallWithBullet(bullet) {
    for (const wall of game.walls) {
      if (!circleRectOverlap(bullet.x, bullet.y, bullet.radius, wall)) continue;
      wall.flash = 0.1;
      if (wall.type === "brick") {
        wall.hp -= bullet.damage;
        spawnParticles(bullet.x, bullet.y, "#ff9f66", 6, 100, { size: 2.6, life: 0.35 });
        if (wall.hp <= 0) {
          destroyWall(wall);
          spawnParticles(wall.x + wall.w / 2, wall.y + wall.h / 2, "#ff7b54", 12, 160, { size: 4, life: 0.55 });
          sound.explosion();
        } else {
          sound.brick();
        }
      } else {
        spawnParticles(bullet.x, bullet.y, "#9fefff", 5, 90, { size: 2.2, life: 0.25 });
        sound.hit();
      }
      return true;
    }
    return false;
  }

  function hasLineOfSight(x1, y1, x2, y2) {
    const total = distanceBetween(x1, y1, x2, y2);
    const steps = Math.max(2, Math.ceil(total / 18));
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);
      for (const wall of game.walls) {
        if (wall.type === "steel" && x >= wall.x && x <= wall.x + wall.w && y >= wall.y && y <= wall.y + wall.h) {
          return false;
        }
      }
    }
    return true;
  }

  function triggerPlayerShield() {
    const player = game.player;
    if (!player) return false;
    if (game.time < player.shieldUntil) {
      addRing(player.x, player.y, "#64eeff", 42, 0.35, 3);
      spawnParticles(player.x, player.y, "#8ff8ff", 8, 100, { size: 2, life: 0.3 });
      sound.hit();
      return true;
    }
    return false;
  }

  function damageCore(amount = 1) {
    if (game.state !== STATES.PLAYING || game.coreHp <= 0) return;
    game.coreHp = Math.max(0, game.coreHp - amount);
    game.coreFlash = 0.3;
    addShake(8);
    flashScreen("#ff4f70", 0.26);
    spawnParticles(CORE_RECT.x, CORE_RECT.y - 12, "#ff6f90", 20, 210, { size: 4, life: 0.7 });
    addRing(CORE_RECT.x, CORE_RECT.y - 8, "#ff476c", 90, 0.65, 5);
    sound.explosion();
    if (game.coreHp <= 0) {
      failRun("能量核心被摧毁，霓虹防线彻底失守。");
    } else {
      showToast(`核心受损！剩余耐久 ${game.coreHp}`, "is-warn");
      updateHud();
    }
  }

  function damagePlayer(amount = 1) {
    const player = game.player;
    if (!player || game.state !== STATES.PLAYING) return false;
    if (triggerPlayerShield()) return true;
    if (game.time < (player.damageCooldownUntil || 0)) return false;

    player.hp = Math.max(0, player.hp - amount);
    player.hitFlash = 0.18;
    player.damageCooldownUntil = game.time + PLAYER_CONFIG.hitInvulnerability;
    spawnParticles(player.x, player.y, player.hp <= 3 ? "#ff7f9f" : "#8ff8ff", 10, 135, { size: 2.6, life: 0.4 });
    addRing(player.x, player.y, player.hp <= 3 ? "#ff668d" : "#72f4ff", 34, 0.3, 2.5);
    addShake(3.2);
    flashScreen("#7ceeff", 0.08);
    sound.hit();
    updateHud();

    if (player.hp <= 0) {
      killPlayer();
    }
    return true;
  }

  function killPlayer() {
    const player = game.player;
    if (!player || game.state !== STATES.PLAYING) return;
    if (triggerPlayerShield()) return;
    createExplosion(player.x, player.y, "#66efff", 1.25);
    flashScreen("#7ceeff", 0.18);
    game.player = null;
    game.lives = Math.max(0, game.lives - 1);
    updateHud();
    if (game.lives <= 0) {
      failRun("全部备用坦克均已损毁，行动终止。");
      return;
    }
    game.playerRespawn = 1.35;
    showToast(`坦克损毁，剩余备用机体 ${game.lives} 台`, "is-warn");
  }

  function updateBullets(dt) {
    for (const bullet of game.bullets) {
      if (game.state !== STATES.PLAYING) break;
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      const margin = 20;
      if (bullet.life <= 0
        || bullet.x < FIELD.x - margin
        || bullet.x > FIELD.x + FIELD.width + margin
        || bullet.y < FIELD.y - margin
        || bullet.y > FIELD.y + FIELD.height + margin) {
        bullet.dead = true;
        continue;
      }
      if (hitWallWithBullet(bullet)) {
        bullet.dead = true;
        continue;
      }
      for (const enemy of game.enemies) {
        if (enemy.dead || !circleRectOverlap(bullet.x, bullet.y, bullet.radius, tankRect(enemy))) continue;
        enemy.hp -= bullet.damage;
        enemy.hitFlash = 0.12;
        bullet.dead = true;
        spawnParticles(bullet.x, bullet.y, enemy.accent, 7, 130, { size: 2.6, life: 0.35 });
        sound.hit();
        if (enemy.hp <= 0) killEnemy(enemy);
        break;
      }
      if (bullet.dead) continue;
      if (game.boss && circleRectOverlap(bullet.x, bullet.y, bullet.radius, bossRect(game.boss))) {
        bullet.dead = true;
        damageBoss(bullet.damage);
      }
    }

    for (const bullet of game.enemyBullets) {
      if (game.state !== STATES.PLAYING) break;
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      const margin = 20;
      if (bullet.life <= 0
        || bullet.x < FIELD.x - margin
        || bullet.x > FIELD.x + FIELD.width + margin
        || bullet.y < FIELD.y - margin
        || bullet.y > FIELD.y + FIELD.height + margin) {
        bullet.dead = true;
        continue;
      }
      if (hitWallWithBullet(bullet)) {
        bullet.dead = true;
        continue;
      }
      if (game.player && circleRectOverlap(bullet.x, bullet.y, bullet.radius, tankRect(game.player))) {
        bullet.dead = true;
        damagePlayer(1);
        continue;
      }
      if (circleRectOverlap(bullet.x, bullet.y, bullet.radius, {
        x: CORE_RECT.x - CORE_RECT.w / 2,
        y: CORE_RECT.y - CORE_RECT.h / 2,
        w: CORE_RECT.w,
        h: CORE_RECT.h,
      })) {
        bullet.dead = true;
        damageCore(1);
      }
    }

    game.bullets = game.bullets.filter((bullet) => !bullet.dead);
    game.enemyBullets = game.enemyBullets.filter((bullet) => !bullet.dead);
    game.enemies = game.enemies.filter((enemy) => !enemy.dead);
  }

  /* ── 敌人生成、道具与伤害 ───────────────────────────────── */
  function isSpawnPointClear(point, size) {
    const rect = { x: point.x - size / 2, y: point.y - size / 2, w: size, h: size };
    if (!isInField(rect) || collidingWall(rect)) return false;
    if (game.player && rectsOverlap(rect, tankRect(game.player))) return false;
    if (game.boss && rectsOverlap(rect, bossRect(game.boss))) return false;
    return !game.enemies.some((enemy) => rectsOverlap(rect, tankRect(enemy)));
  }

  function spawnEnemy(typeKey, isBossAdd = false) {
    const type = ENEMY_TYPES[typeKey];
    if (!type) return false;
    const available = ENEMY_SPAWNS.filter((point) => isSpawnPointClear(point, type.size));
    if (!available.length) return false;
    const point = available[Math.floor(Math.random() * available.length)];
    const config = game.difficultyConfig;
    const enemy = {
      id: nextId(),
      x: point.x,
      y: point.y,
      size: type.size,
      typeKey,
      name: type.name,
      hp: type.hp,
      maxHp: type.hp,
      speed: type.speed * config.enemySpeed,
      scoreValue: type.score,
      reloadBase: type.reload / config.enemyFireRate,
      reload: randomBetween(0.7, 1.55),
      bulletSpeed: type.bulletSpeed,
      color: type.color,
      accent: type.accent,
      body: type.body,
      bodyAngle: Math.PI / 2,
      turretAngle: Math.PI / 2,
      tread: Math.random() * 10,
      path: [],
      pathTimer: 0,
      targetKind: "core",
      stuckTime: 0,
      hitFlash: 0,
      isBossAdd,
      dead: false,
    };
    game.enemies.push(enemy);
    if (!isBossAdd) game.guardsSpawned += 1;
    addRing(point.x, point.y, type.color, 45, 0.55, 2);
    spawnParticles(point.x, point.y, type.accent, 9, 120, { size: 2.4, life: 0.5 });
    return true;
  }

  function dropPowerup(x, y) {
    if (Math.random() > 0.18) return;
    const weights = Object.fromEntries(Object.entries(POWERUPS).map(([key, item]) => [key, item.weight]));
    const type = pickWeighted(weights);
    game.powerups.push({
      id: nextId(),
      x,
      y,
      type,
      age: 0,
      ttl: 10,
      phase: Math.random() * TAU,
    });
  }

  function applyPowerup(typeKey) {
    const item = POWERUPS[typeKey];
    const player = game.player;
    if (!item) return;
    let message = item.toast;
    if (typeKey === "shield") {
      if (player) player.shieldUntil = Math.max(player.shieldUntil, game.time + 6);
    } else if (typeKey === "rapid") {
      if (player) player.rapidUntil = Math.max(player.rapidUntil || 0, game.time + 8);
    } else if (typeKey === "repair") {
      if (game.coreHp < CORE_MAX_HP) {
        game.coreHp += 1;
      } else {
        addScore(250);
        message = "核心耐久已满，转化为 250 分";
      }
    } else if (typeKey === "shock") {
      for (const bullet of game.enemyBullets) {
        spawnParticles(bullet.x, bullet.y, "#ff8bc0", 4, 70, { size: 2, life: 0.25 });
      }
      game.enemyBullets = [];
      for (const enemy of [...game.enemies]) {
        if (enemy.dead) continue;
        enemy.hp -= 2;
        if (enemy.hp <= 0) killEnemy(enemy);
      }
      if (game.boss) damageBoss(4);
      addRing(CORE_RECT.x, CORE_RECT.y - 30, "#ff75b7", 620, 0.8, 6);
      addShake(9);
      flashScreen("#ff4f9a", 0.2);
    } else if (typeKey === "life") {
      game.lives = Math.min(9, game.lives + 1);
    }
    const playerX = player ? player.x : CORE_RECT.x;
    const playerY = player ? player.y : CORE_RECT.y;
    spawnParticles(playerX, playerY, item.color, 18, 160, { size: 3, life: 0.65 });
    addRing(playerX, playerY, item.color, 52, 0.55, 3);
    showToast(`${item.label}：${message}`, "is-gold");
    sound.pickup();
    updateHud();
  }

  function updatePowerups(dt) {
    const player = game.player;
    for (const powerup of game.powerups) {
      powerup.age += dt;
      powerup.ttl -= dt;
      if (player && distanceBetween(player.x, player.y, powerup.x, powerup.y) < player.size / 2 + 22) {
        powerup.dead = true;
        applyPowerup(powerup.type);
      }
    }
    game.powerups = game.powerups.filter((powerup) => !powerup.dead && powerup.ttl > 0);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    addScore(enemy.scoreValue);
    createExplosion(enemy.x, enemy.y, enemy.color, enemy.typeKey === "heavy" ? 1.25 : 1);
    dropPowerup(enemy.x, enemy.y);
    if (!enemy.isBossAdd) game.guardsKilled += 1;
    sound.explosion();
    updateHud();
  }

  /* ── 玩家与输入 ─────────────────────────────────────────── */
  function getMoveInput() {
    let x = 0;
    let y = 0;
    const keys = game.keys;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;
    x += game.touchVector.x;
    y += game.touchVector.y;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y, length: Math.min(1, length) };
  }

  function isFireHeld() {
    return game.firePointers.size > 0
      || game.keys.has("Space")
      || game.keys.has("KeyJ")
      || game.keys.has("KeyK")
      || game.keys.has("KeyL");
  }

  function updatePlayer(dt) {
    if (!game.player) {
      if (game.lives > 0) {
        game.playerRespawn = Math.max(0, game.playerRespawn - dt);
        if (game.playerRespawn <= 0) {
          createPlayer(true);
          addRing(PLAYER_SPAWN.x, PLAYER_SPAWN.y, "#6df4ff", 52, 0.6, 3);
          showToast("备用坦克已接入，护盾启动");
        }
      }
      return;
    }
    if (game.introTimer > 0) return;
    const player = game.player;
    player.reload = Math.max(0, player.reload - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);
    const input = getMoveInput();
    const moving = input.length > 0.04;
    if (moving) {
      const moved = moveTank(player, input.x * PLAYER_CONFIG.speed * dt, input.y * PLAYER_CONFIG.speed * dt);
      const travel = Math.hypot(moved.x, moved.y);
      if (travel > 0.01) {
        player.bodyAngle = turnToward(player.bodyAngle, Math.atan2(input.y, input.x), 12 * dt);
        player.turretAngle = player.bodyAngle;
        player.tread += travel * 0.35;
      }
      resolvePlayerTankOverlap();
    }
    if (isFireHeld()) firePlayer();
  }

  function resetJoystick() {
    game.joystickPointer = null;
    game.touchVector.x = 0;
    game.touchVector.y = 0;
    dom.joystickKnob.style.transform = "translate(0px, 0px)";
    dom.joystick.classList.remove("is-active");
  }

  function hideTouchInputs() {
    game.firePointers.clear();
    game.firePointerButtons.clear();
    dom.fireButtons.forEach((button) => button.classList.remove("is-pressed"));
    resetJoystick();
  }

  function releaseFirePointer(pointerId) {
    const button = game.firePointerButtons.get(pointerId);
    game.firePointers.delete(pointerId);
    game.firePointerButtons.delete(pointerId);
    if (!button) return;
    const stillPressed = Array.from(game.firePointerButtons.values()).includes(button);
    if (!stillPressed) button.classList.remove("is-pressed");
  }

  function updateJoystickFromPointer(clientX, clientY) {
    const dx = clientX - game.joystickCenter.x;
    const dy = clientY - game.joystickCenter.y;
    const rawLength = Math.hypot(dx, dy);
    const radius = game.joystickRadius;
    const limited = Math.min(rawLength, radius);
    const angle = Math.atan2(dy, dx);
    const visualX = Math.cos(angle) * limited;
    const visualY = Math.sin(angle) * limited;
    dom.joystickKnob.style.transform = `translate(${visualX}px, ${visualY}px)`;
    if (rawLength < radius * 0.14) {
      game.touchVector.x = 0;
      game.touchVector.y = 0;
    } else {
      game.touchVector.x = Math.cos(angle) * (limited / radius);
      game.touchVector.y = Math.sin(angle) * (limited / radius);
    }
  }

  function setupInput() {
    const controlledKeys = new Set([
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyJ", "KeyK", "KeyL",
    ]);

    window.addEventListener("keydown", (event) => {
      ensureAudio();
      if (controlledKeys.has(event.code) && game.state === STATES.PLAYING) event.preventDefault();
      if (event.repeat && (event.code === "KeyP" || event.code === "Escape")) return;
      game.keys.add(event.code);
      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        if (game.state === STATES.PLAYING) pauseGame();
        else if (game.state === STATES.PAUSED) resumeGame();
      }
    });

    window.addEventListener("keyup", (event) => {
      game.keys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      game.keys.clear();
      hideTouchInputs();
      if (game.state === STATES.PLAYING) pauseGame();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.state === STATES.PLAYING) pauseGame();
    });

    document.addEventListener("contextmenu", (event) => {
      if (event.target === dom.canvas || dom.shell.contains(event.target)) event.preventDefault();
    });

    dom.joystick.addEventListener("pointerdown", (event) => {
      if (game.state !== STATES.PLAYING) return;
      event.preventDefault();
      ensureAudio();
      const rect = dom.joystick.getBoundingClientRect();
      game.joystickPointer = event.pointerId;
      game.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      game.joystickRadius = Math.max(20, rect.width * 0.29);
      dom.joystick.setPointerCapture(event.pointerId);
      dom.joystick.classList.add("is-active");
      updateJoystickFromPointer(event.clientX, event.clientY);
    });

    dom.joystick.addEventListener("pointermove", (event) => {
      if (game.joystickPointer !== event.pointerId || game.state !== STATES.PLAYING) return;
      event.preventDefault();
      updateJoystickFromPointer(event.clientX, event.clientY);
    });

    const endJoystick = (event) => {
      if (game.joystickPointer !== event.pointerId) return;
      resetJoystick();
    };
    dom.joystick.addEventListener("pointerup", endJoystick);
    dom.joystick.addEventListener("pointercancel", endJoystick);
    dom.joystick.addEventListener("lostpointercapture", () => resetJoystick());

    dom.fireButtons.forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        if (game.state !== STATES.PLAYING) return;
        event.preventDefault();
        ensureAudio();
        game.firePointers.add(event.pointerId);
        game.firePointerButtons.set(event.pointerId, button);
        button.classList.add("is-pressed");
        button.setPointerCapture(event.pointerId);
      });

      const releaseFire = (event) => releaseFirePointer(event.pointerId);
      button.addEventListener("pointerup", releaseFire);
      button.addEventListener("pointercancel", releaseFire);
      button.addEventListener("lostpointercapture", releaseFire);
    });

    document.addEventListener("pointerdown", () => {
      if (!game.muted) ensureAudio();
    }, { once: true, passive: true });
  }

  /* ── 敌人寻路与 AI ──────────────────────────────────────── */
  function findPath(startCol, startRow, targetCol, targetRow) {
    if (!isCellWalkable(targetCol, targetRow)) return null;
    if (startCol === targetCol && startRow === targetRow) return [];
    const toKey = (col, row) => row * FIELD.cols + col;
    const open = [{ col: startCol, row: startRow, g: 0, f: 0 }];
    const gScore = new Map([[toKey(startCol, startRow), 0]]);
    const cameFrom = new Map();
    const closed = new Set();
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let iterations = 0;

    while (open.length && iterations < 400) {
      iterations += 1;
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();
      const currentKey = toKey(current.col, current.row);
      if (current.col === targetCol && current.row === targetRow) {
        const path = [];
        let cursor = currentKey;
        while (cameFrom.has(cursor)) {
          const item = cameFrom.get(cursor);
          path.push({ col: item.col, row: item.row });
          cursor = toKey(item.col, item.row);
        }
        path.reverse();
        return path.slice(1);
      }
      if (closed.has(currentKey)) continue;
      closed.add(currentKey);

      for (const [dc, dr] of directions) {
        const nextCol = current.col + dc;
        const nextRow = current.row + dr;
        if (!isCellWalkable(nextCol, nextRow)) continue;
        const nextKey = toKey(nextCol, nextRow);
        if (closed.has(nextKey)) continue;
        const tentative = current.g + 1;
        if (tentative >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
        cameFrom.set(nextKey, { col: current.col, row: current.row });
        gScore.set(nextKey, tentative);
        const heuristic = Math.abs(targetCol - nextCol) + Math.abs(targetRow - nextRow);
        open.push({ col: nextCol, row: nextRow, g: tentative, f: tentative + heuristic });
      }
    }
    return null;
  }

  function getCoreApproachPath(enemy) {
    const startCell = pointToCell(enemy.x, enemy.y);
    const candidates = [
      { col: 9, row: 8 },
      { col: 10, row: 8 },
      { col: 8, row: 9 },
      { col: 11, row: 9 },
    ].filter((cell) => isCellWalkable(cell.col, cell.row));
    let bestPath = null;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const path = findPath(startCell.col, startCell.row, candidate.col, candidate.row);
      if (path === null) continue;
      const center = cellCenter(candidate.col, candidate.row);
      const cost = path.length + distanceBetween(enemy.x, enemy.y, center.x, center.y) / FIELD.cell;
      if (cost < bestCost) {
        bestCost = cost;
        bestPath = path;
      }
    }
    return bestPath || [];
  }

  function updateEnemyPath(enemy) {
    const player = game.player;
    const playerDistance = player ? distanceBetween(enemy.x, enemy.y, player.x, player.y) : Number.POSITIVE_INFINITY;
    if (enemy.targetKind === "player" && (!player || playerDistance > 520)) {
      enemy.targetKind = "core";
    } else if (enemy.targetKind === "core"
      && player
      && playerDistance < 340
      && enemy.typeKey !== "heavy"
      && Math.random() < 0.28) {
      enemy.targetKind = "player";
    }

    if (enemy.targetKind === "player" && player) {
      const start = pointToCell(enemy.x, enemy.y);
      const target = pointToCell(player.x, player.y);
      const path = findPath(start.col, start.row, target.col, target.row);
      enemy.path = path || [];
    } else {
      enemy.targetKind = "core";
      enemy.path = getCoreApproachPath(enemy);
    }
    enemy.pathTimer = randomBetween(0.82, 1.25);
  }

  function enemyAimPoint(enemy) {
    if (enemy.targetKind === "player" && game.player) {
      return { x: game.player.x, y: game.player.y };
    }
    return { x: CORE_RECT.x, y: CORE_RECT.y - 6 };
  }

  function fireEnemy(enemy) {
    const aim = enemyAimPoint(enemy);
    const baseAngle = Math.atan2(aim.y - enemy.y, aim.x - enemy.x);
    const angle = baseAngle + randomBetween(-0.035, 0.035);
    const muzzleDistance = enemy.size * 0.54 + 11;
    const x = enemy.x + Math.cos(angle) * muzzleDistance;
    const y = enemy.y + Math.sin(angle) * muzzleDistance;
    addEnemyBullet({
      x,
      y,
      angle,
      speed: enemy.bulletSpeed,
      radius: enemy.typeKey === "heavy" ? 7 : 5.5,
      color: enemy.accent,
      damage: 1,
    });
    spawnParticles(x, y, enemy.accent, 4, 75, { size: 2, life: 0.2 });
    enemy.reload = enemy.reloadBase * randomBetween(0.88, 1.15);
    if (Math.random() < 0.7) sound.enemyShoot();
  }

  function updateEnemies(dt) {
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      enemy.reload = Math.max(0, enemy.reload - dt);
      enemy.pathTimer -= dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      if (enemy.pathTimer <= 0) updateEnemyPath(enemy);

      let movedDistance = 0;
      if (enemy.path.length) {
        const node = enemy.path[0];
        const target = cellCenter(node.col, node.row);
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 4.5) {
          enemy.path.shift();
        } else {
          const step = Math.min(distance, enemy.speed * dt);
          const nx = dx / distance;
          const ny = dy / distance;
          const moved = moveTank(enemy, nx * step, ny * step);
          movedDistance = Math.hypot(moved.x, moved.y);
          if (movedDistance > 0.01) {
            enemy.bodyAngle = turnToward(enemy.bodyAngle, Math.atan2(ny, nx), 9 * dt);
            enemy.tread += movedDistance * 0.33;
          }
        }
      }

      if (movedDistance < 0.2) {
        enemy.stuckTime += dt;
      } else {
        enemy.stuckTime = Math.max(0, enemy.stuckTime - dt * 2.2);
      }
      if (enemy.stuckTime > 0.7) {
        enemy.stuckTime = 0;
        enemy.pathTimer = 0;
        enemy.reload = 0;
      }

      const aim = enemyAimPoint(enemy);
      const targetAngle = Math.atan2(aim.y - enemy.y, aim.x - enemy.x);
      enemy.turretAngle = turnToward(enemy.turretAngle, targetAngle, 3.6 * dt);
      const targetDistance = distanceBetween(enemy.x, enemy.y, aim.x, aim.y);
      if (enemy.reload <= 0
        && targetDistance < 650
        && hasLineOfSight(enemy.x, enemy.y, aim.x, aim.y)) {
        fireEnemy(enemy);
      }
    }
  }

  function updateSpawner(dt) {
    if (game.introTimer > 0 || game.boss || game.guardsSpawned >= game.guardsTotal) return;
    const activeGuards = game.enemies.filter((enemy) => !enemy.dead && !enemy.isBossAdd).length;
    if (activeGuards >= game.difficultyConfig.maxActive) return;
    game.spawnTimer -= dt;
    if (game.spawnTimer > 0) return;
    const type = pickWeighted(game.levelDef.weights);
    if (spawnEnemy(type)) {
      game.spawnTimer = randomBetween(1.65, 2.55);
    } else {
      game.spawnTimer = 0.5;
    }
  }

  /* ── 最终首领 ───────────────────────────────────────────── */
  function spawnBoss() {
    if (game.bossSpawned) return;
    game.bossSpawned = true;
    const config = game.difficultyConfig;
    const maxHp = config.bossHp;
    game.boss = {
      id: nextId(),
      x: 640,
      y: FIELD.y + 130,
      baseX: 640,
      baseY: FIELD.y + 130,
      w: 132,
      h: 102,
      hp: maxHp,
      maxHp,
      phase: 1,
      transition: 1.65,
      attackTimer: 2,
      addTimer: 7,
      turretAngle: Math.PI / 2,
      hitFlash: 0,
      hoverPhase: Math.random() * TAU,
    };
    game.banner = {
      title: "警告",
      subtitle: "熔核巨像已苏醒",
      detail: "击穿装甲核心，终结最终首领。",
      timer: 2.7,
      maxTimer: 2.7,
      tone: "danger",
    };
    addRing(game.boss.x, game.boss.y, "#ff4c9b", 240, 1.1, 7);
    flashScreen("#ff2f96", 0.22);
    addShake(10);
    sound.warning();
    showToast("最终首领出现：熔核巨像", "is-warn");
    updateHud();
  }

  function triggerBossPhase(phase) {
    const boss = game.boss;
    if (!boss || boss.phase >= phase) return;
    boss.phase = phase;
    boss.transition = 1.35;
    boss.attackTimer = 1.45;
    boss.addTimer = 5.5;
    const label = phase === 2 ? "第二阶段：磁暴弹幕" : "第三阶段：过载反击";
    showToast(`首领进入${label}`, "is-warn");
    addRing(boss.x, boss.y, phase === 2 ? "#ffb34f" : "#ff2f96", 260, 0.9, 7);
    addShake(9);
    flashScreen(phase === 2 ? "#ffb34f" : "#ff2f96", 0.2);
    sound.warning();
  }

  function damageBoss(amount) {
    const boss = game.boss;
    if (!boss || game.state !== STATES.PLAYING) return;
    if (boss.transition > 0) {
      addRing(boss.x, boss.y, "#ff8ac5", 88, 0.22, 2);
      sound.hit();
      return;
    }
    boss.hp = Math.max(0, boss.hp - amount);
    boss.hitFlash = 0.12;
    spawnParticles(boss.x + randomBetween(-42, 42), boss.y + randomBetween(-24, 24), "#ffd0e2", 6, 130, { size: 3, life: 0.4 });
    if (boss.hp <= 0) {
      destroyBoss();
      return;
    }
    const ratio = boss.hp / boss.maxHp;
    if (boss.phase === 1 && ratio <= 0.66) triggerBossPhase(2);
    else if (boss.phase === 2 && ratio <= 0.33) triggerBossPhase(3);
    updateBossHud();
  }

  function destroyBoss() {
    const boss = game.boss;
    if (!boss) return;
    const bx = boss.x;
    const by = boss.y;
    game.boss = null;
    game.bossDefeated = true;
    addScore(5000);
    for (let index = 0; index < 6; index += 1) {
      window.setTimeout(() => {
        if (game.state === STATES.PLAYING) {
          const angle = Math.random() * TAU;
          const radius = Math.random() * 62;
          createExplosion(bx + Math.cos(angle) * radius, by + Math.sin(angle) * radius, index % 2 ? "#ffd36d" : "#ff4f9f", 1.5);
          sound.explosion();
        }
      }, index * 95);
    }
    createExplosion(bx, by, "#ffffff", 2.3);
    flashScreen("#ffffff", 0.5);
    addShake(18);
    game.enemyBullets = [];
    game.enemies.forEach((enemy) => {
      enemy.dead = true;
      createExplosion(enemy.x, enemy.y, enemy.color, 0.8);
    });
    game.enemies = [];
    game.powerups = [];
    dom.bossHud.hidden = true;
    updateHud();
    sound.victory();
    game.victoryTimer = 0.95;
  }

  function fireBossSpread(count, speed, spread, radius = 7) {
    const boss = game.boss;
    if (!boss) return;
    const target = game.player || { x: CORE_RECT.x, y: CORE_RECT.y };
    const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const total = count - 1;
    for (let index = 0; index < count; index += 1) {
      const offset = total === 0 ? 0 : (index / total - 0.5) * spread;
      const angle = baseAngle + offset;
      addEnemyBullet({
        x: boss.x + Math.cos(angle) * 72,
        y: boss.y + Math.sin(angle) * 58,
        angle,
        speed,
        radius,
        color: BOSS_BULLET_COLOR,
        damage: 1,
      });
    }
    spawnParticles(boss.x, boss.y, "#ff70b4", 12, 140, { size: 3.5, life: 0.4 });
    sound.enemyShoot();
  }

  function fireBossRadial(count, speed, radius = 6.5) {
    const boss = game.boss;
    if (!boss) return;
    const offset = game.time * 0.32;
    for (let index = 0; index < count; index += 1) {
      const angle = offset + (index / count) * TAU;
      addEnemyBullet({
        x: boss.x + Math.cos(angle) * 62,
        y: boss.y + Math.sin(angle) * 48,
        angle,
        speed,
        radius,
        color: boss.phase === 3 ? "#ff3f88" : "#ff9a5a",
        damage: 1,
      });
    }
    addRing(boss.x, boss.y, "#ff4f9f", 125, 0.45, 4);
    sound.enemyShoot();
  }

  function updateBoss(dt) {
    const boss = game.boss;
    if (!boss) return;
    boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    if (boss.transition > 0) {
      boss.transition = Math.max(0, boss.transition - dt);
      boss.turretAngle += dt * 0.7;
      if (game.reducedMotion || Math.random() < 0.3) {
        spawnParticles(boss.x + randomBetween(-55, 55), boss.y + randomBetween(-35, 35), "#ff6eae", 1, 65, { size: 2, life: 0.4 });
      }
      return;
    }

    boss.x = boss.baseX + Math.sin(game.time * 0.5 + boss.hoverPhase) * 220;
    boss.y = boss.baseY + Math.sin(game.time * 0.86) * 15;
    const target = game.player || { x: CORE_RECT.x, y: CORE_RECT.y };
    const targetAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
    boss.turretAngle = turnToward(boss.turretAngle, targetAngle, 1.9 * dt);
    boss.attackTimer -= dt;
    const rate = game.difficultyConfig.enemyFireRate;
    if (boss.attackTimer <= 0) {
      if (boss.phase === 1) {
        fireBossSpread(3, 325, 0.34, 7);
        boss.attackTimer = 1.75 / rate;
      } else if (boss.phase === 2) {
        fireBossRadial(12, 275, 6.5);
        fireBossSpread(2, 330, 0.17, 7);
        boss.attackTimer = 2.05 / rate;
      } else {
        fireBossRadial(8, 310, 7);
        fireBossSpread(3, 360, 0.4, 7);
        boss.attackTimer = 1.55 / rate;
      }
    }

    if (boss.phase === 3) {
      boss.addTimer -= dt;
      if (boss.addTimer <= 0) {
        boss.addTimer = 10;
        const adds = game.enemies.filter((enemy) => !enemy.dead && enemy.isBossAdd).length;
        if (adds < 3) {
          spawnEnemy("scout", true);
          spawnEnemy("assault", true);
          showToast("首领召唤增援", "is-warn");
          addRing(boss.x, boss.y, "#ff4f9f", 150, 0.6, 4);
        }
      }
    }
  }

  /* ── 流程推进 ───────────────────────────────────────────── */
  function completeLevel() {
    if (game.state !== STATES.PLAYING) return;
    const timeBonus = Math.max(0, 1200 - Math.floor(game.levelTime) * 24);
    const bonus = 1000 + game.coreHp * 500 + timeBonus;
    game.lastBonus = bonus;
    addScore(bonus);
    game.lives = Math.min(9, game.lives + 1);
    commitBestScore();
    game.bullets = [];
    game.enemyBullets = [];
    game.powerups = [];
    game.banner = null;
    hideTouchInputs();
    setState(STATES.LEVEL_CLEAR);
    sound.levelClear();
    addRing(CORE_RECT.x, CORE_RECT.y - 12, "#7af6ff", 140, 0.8, 5);
    updateHud();
    showLevelScreen();
  }

  function nextLevel() {
    if (game.state !== STATES.LEVEL_CLEAR) return;
    const nextIndex = game.levelIndex + 1;
    if (nextIndex >= LEVELS.length) {
      winRun("全部战区已经净化。");
      return;
    }
    loadLevel(nextIndex);
    sound.start();
    dom.canvas.focus({ preventScroll: true });
  }

  function failRun(reason) {
    if (game.state === STATES.GAME_OVER || game.state === STATES.VICTORY) return;
    hideTouchInputs();
    game.keys.clear();
    if (game.boss) dom.bossHud.hidden = true;
    sound.defeat();
    showResultScreen(false, reason);
  }

  function winRun(reason) {
    if (game.state === STATES.GAME_OVER || game.state === STATES.VICTORY) return;
    hideTouchInputs();
    game.keys.clear();
    if (game.boss) dom.bossHud.hidden = true;
    showResultScreen(true, reason);
  }

  function checkLevelCompletion() {
    if (game.state !== STATES.PLAYING) return;
    const activeMainEnemies = game.enemies.filter((enemy) => !enemy.dead && !enemy.isBossAdd).length;
    if (game.guardsKilled < game.guardsTotal || game.guardsSpawned < game.guardsTotal || activeMainEnemies > 0) return;
    if (game.levelDef.boss && !game.bossSpawned) {
      spawnBoss();
      return;
    }
    if (!game.levelDef.boss) completeLevel();
  }

  function pauseGame() {
    if (game.state !== STATES.PLAYING) return;
    hideTouchInputs();
    game.keys.clear();
    setState(STATES.PAUSED);
    showPauseScreen();
    sound.click();
  }

  function resumeGame() {
    if (game.state !== STATES.PAUSED) return;
    if (isPortraitBlocked()) {
      syncOrientation();
      return;
    }
    hideOverlay();
    setState(STATES.PLAYING);
    game.keys.clear();
    dom.canvas.focus({ preventScroll: true });
    sound.click();
  }

  function restartRun() {
    hideTouchInputs();
    game.keys.clear();
    beginRun();
  }

  function returnToMenu() {
    commitBestScore();
    hideTouchInputs();
    game.keys.clear();
    resetWorldState();
    game.levelIndex = 0;
    game.levelDef = LEVELS[0];
    game.score = 0;
    game.lives = game.difficultyConfig.lives;
    game.time = 0;
    game.totalTime = 0;
    game.banner = null;
    showStartScreen();
    sound.click();
  }

  function toggleSound() {
    game.muted = !game.muted;
    writeStorage(STORAGE_KEYS.muted, game.muted ? "1" : "0");
    updateSoundButton();
    if (!game.muted) {
      ensureAudio();
      sound.click();
    }
  }

  /* ── 渲染 ───────────────────────────────────────────────── */
  const PLAYER_COLORS = Object.freeze({
    color: "#63f2ff",
    accent: "#dbffff",
    body: "#06354a",
    tread: "#07131f",
  });

  const ambientMotes = Array.from({ length: 46 }, (_, index) => ({
    x: FIELD.x + Math.random() * FIELD.width,
    y: FIELD.y + Math.random() * FIELD.height,
    speed: randomBetween(5, 18),
    size: randomBetween(0.8, 2.4),
    alpha: randomBetween(0.12, 0.45),
    color: index % 4 === 0 ? "#ff4d9b" : "#55dcff",
  }));

  function resizeCanvas() {
    const rect = dom.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (dom.canvas.width !== width || dom.canvas.height !== height) {
      dom.canvas.width = width;
      dom.canvas.height = height;
    }
  }

  function drawBackground() {
    ctx.fillStyle = "#030711";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const glow = ctx.createRadialGradient(640, 420, 30, 640, 420, 760);
    glow.addColorStop(0, "rgba(15, 77, 113, 0.2)");
    glow.addColorStop(0.44, "rgba(6, 35, 64, 0.12)");
    glow.addColorStop(1, "rgba(1, 4, 10, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.fillStyle = "rgba(4, 16, 29, 0.64)";
    ctx.fillRect(FIELD.x, FIELD.y, FIELD.width, FIELD.height);

    ctx.lineWidth = 1;
    for (let col = 0; col <= FIELD.cols; col += 1) {
      const x = FIELD.x + col * FIELD.cell;
      ctx.strokeStyle = col % 5 === 0 ? "rgba(61, 231, 255, 0.105)" : "rgba(61, 231, 255, 0.045)";
      ctx.beginPath();
      ctx.moveTo(x + 0.5, FIELD.y);
      ctx.lineTo(x + 0.5, FIELD.y + FIELD.height);
      ctx.stroke();
    }
    for (let row = 0; row <= FIELD.rows; row += 1) {
      const y = FIELD.y + row * FIELD.cell;
      ctx.strokeStyle = row % 5 === 0 ? "rgba(61, 231, 255, 0.105)" : "rgba(61, 231, 255, 0.045)";
      ctx.beginPath();
      ctx.moveTo(FIELD.x, y + 0.5);
      ctx.lineTo(FIELD.x + FIELD.width, y + 0.5);
      ctx.stroke();
    }

    const scanY = FIELD.y + ((game.visualTime * 48) % FIELD.height);
    const scan = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
    scan.addColorStop(0, "rgba(61, 231, 255, 0)");
    scan.addColorStop(0.5, "rgba(61, 231, 255, 0.055)");
    scan.addColorStop(1, "rgba(61, 231, 255, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(FIELD.x, scanY - 20, FIELD.width, 40);

    ctx.strokeStyle = "rgba(61, 231, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(FIELD.x + 0.5, FIELD.y + 0.5, FIELD.width - 1, FIELD.height - 1);

    const corners = [
      [FIELD.x - 12, FIELD.y - 12, 1, 1],
      [FIELD.x + FIELD.width + 12, FIELD.y - 12, -1, 1],
      [FIELD.x - 12, FIELD.y + FIELD.height + 12, 1, -1],
      [FIELD.x + FIELD.width + 12, FIELD.y + FIELD.height + 12, -1, -1],
    ];
    ctx.strokeStyle = "rgba(90, 235, 255, 0.54)";
    ctx.lineWidth = 2;
    corners.forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * 26);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * 26, y);
      ctx.stroke();
    });

    for (const mote of ambientMotes) {
      const y = FIELD.y + (((mote.y - FIELD.y - game.visualTime * mote.speed) % FIELD.height) + FIELD.height) % FIELD.height;
      const pulse = 0.55 + 0.45 * Math.sin(game.visualTime * 1.7 + mote.x);
      ctx.globalAlpha = mote.alpha * pulse;
      ctx.fillStyle = mote.color;
      ctx.beginPath();
      ctx.arc(mote.x, y, mote.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(133, 184, 208, 0.55)";
    ctx.font = '600 10px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("战术坐标 08 · 霓虹网格", FIELD.x, FIELD.y - 16);
    ctx.textAlign = "right";
    ctx.fillText("核心防御协议运行中", FIELD.x + FIELD.width, FIELD.y - 16);
  }

  function drawWalls() {
    for (const wall of game.walls) {
      const flashing = wall.flash > 0;
      if (wall.type === "brick") {
        ctx.fillStyle = wall.hp > 1 ? "#291326" : "#1d0d1d";
        ctx.fillRect(wall.x + 1, wall.y + 1, wall.w - 2, wall.h - 2);
        const cellSize = wall.w / 2;
        for (let row = 0; row < 2; row += 1) {
          for (let col = 0; col < 2; col += 1) {
            const bx = wall.x + col * cellSize + 3;
            const by = wall.y + row * cellSize + 3;
            const bw = cellSize - 6;
            const bh = cellSize - 6;
            const bright = (row + col) % 2 === 0;
            ctx.fillStyle = wall.hp > 1
              ? (bright ? "#4d1f3d" : "#3b1b34")
              : (bright ? "#3b172e" : "#2b1226");
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = wall.hp > 1 ? "rgba(255, 91, 144, 0.63)" : "rgba(255, 91, 144, 0.34)";
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
            ctx.fillStyle = "rgba(255, 166, 195, 0.17)";
            ctx.fillRect(bx + 3, by + 3, bw - 6, 2);
          }
        }
        if (wall.hp < wall.maxHp) {
          ctx.strokeStyle = "rgba(10, 0, 6, 0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wall.x + 16, wall.y + 8);
          ctx.lineTo(wall.x + 28, wall.y + 26);
          ctx.lineTo(wall.x + 22, wall.y + 39);
          ctx.lineTo(wall.x + 34, wall.y + 52);
          ctx.stroke();
        }
        if (flashing) {
          ctx.fillStyle = "rgba(255, 230, 240, 0.36)";
          ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        }
      } else {
        const gradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
        gradient.addColorStop(0, "#173147");
        gradient.addColorStop(0.5, "#0c1e30");
        gradient.addColorStop(1, "#1b3b52");
        ctx.fillStyle = gradient;
        ctx.fillRect(wall.x + 1, wall.y + 1, wall.w - 2, wall.h - 2);
        ctx.strokeStyle = "rgba(96, 196, 220, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wall.x + 3.5, wall.y + 3.5, wall.w - 7, wall.h - 7);
        ctx.strokeStyle = "rgba(73, 157, 192, 0.23)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wall.x + 8, wall.y + wall.h - 8);
        ctx.lineTo(wall.x + wall.w - 8, wall.y + 8);
        ctx.stroke();
        ctx.fillStyle = "rgba(168, 235, 255, 0.58)";
        const bolts = [
          [wall.x + 9, wall.y + 9],
          [wall.x + wall.w - 9, wall.y + 9],
          [wall.x + 9, wall.y + wall.h - 9],
          [wall.x + wall.w - 9, wall.y + wall.h - 9],
        ];
        bolts.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, TAU);
          ctx.fill();
        });
        if (flashing) {
          ctx.fillStyle = "rgba(183, 243, 255, 0.28)";
          ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        }
      }
    }
  }

  function drawCore() {
    const x = CORE_RECT.x;
    const y = CORE_RECT.y;
    const damageRatio = 1 - game.coreHp / CORE_MAX_HP;
    const pulse = 0.5 + Math.sin(game.visualTime * 2.3) * 0.5;
    const glowColor = game.coreHp <= 2 ? "#ff5478" : "#5cecff";

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.ellipse(0, 25, 55, 17, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = game.coreHp > 0 ? `rgba(92, 236, 255, ${0.18 + pulse * 0.18})` : "rgba(255, 75, 106, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 47 + pulse * 4, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([7, 8]);
    ctx.strokeStyle = "rgba(255, 91, 157, 0.38)";
    ctx.beginPath();
    ctx.arc(0, 0, 37, -game.visualTime * 0.7, Math.PI * 1.25 - game.visualTime * 0.7);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.rotate(Math.PI / 8);
    const coreGradient = ctx.createRadialGradient(-12, -18, 3, 0, 0, 38);
    coreGradient.addColorStop(0, game.coreHp > 0 ? "#d9ffff" : "#ffdbe3");
    coreGradient.addColorStop(0.3, glowColor);
    coreGradient.addColorStop(1, "#061a2b");
    ctx.fillStyle = coreGradient;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18 + pulse * 8;
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * TAU;
      const radius = index % 2 === 0 ? 32 : 25;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(204, 255, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = game.coreHp > 0 ? "#eaffff" : "#ffd8e0";
    ctx.font = '800 13px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(game.coreHp <= 2 ? "核心告急" : "核心", 0, 1);

    const pipWidth = 12;
    const gap = 3;
    const totalWidth = pipWidth * CORE_MAX_HP + gap * (CORE_MAX_HP - 1);
    for (let index = 0; index < CORE_MAX_HP; index += 1) {
      const px = -totalWidth / 2 + index * (pipWidth + gap);
      ctx.fillStyle = index < game.coreHp ? glowColor : "rgba(50, 78, 93, 0.6)";
      ctx.fillRect(px, 31, pipWidth, 3);
    }
    if (game.coreFlash > 0) {
      ctx.globalAlpha = clamp(game.coreFlash * 4, 0, 0.8);
      ctx.fillStyle = "#ff6b8a";
      ctx.beginPath();
      ctx.arc(0, 0, 49, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPowerups() {
    for (const powerup of game.powerups) {
      const item = POWERUPS[powerup.type];
      const bob = Math.sin(game.time * 3 + powerup.phase) * 4;
      const blink = powerup.ttl < 3 && Math.floor(powerup.ttl * 8) % 2 === 0;
      if (blink) continue;
      ctx.save();
      ctx.translate(powerup.x, powerup.y + bob);
      ctx.rotate(game.time * 0.8 + powerup.phase);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.58;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.rotate(-game.time * 0.8 - powerup.phase);

      ctx.shadowColor = item.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = "rgba(5, 18, 31, 0.94)";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(17, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-17, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = item.color;
      ctx.font = '800 16px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.char, 0, 1);
      ctx.fillStyle = "rgba(220, 250, 255, 0.8)";
      ctx.font = '600 10px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.fillText(item.label, 0, 29);
      ctx.restore();
    }
  }

  function drawBullets() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const allBullets = [
      ...game.bullets.map((bullet) => ({ ...bullet, boss: false })),
      ...game.enemyBullets.map((bullet) => ({ ...bullet, boss: true })),
    ];
    for (const bullet of allBullets) {
      const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
      const tail = bullet.boss ? 16 : 20;
      ctx.strokeStyle = bullet.color;
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = bullet.radius * 0.85;
      ctx.beginPath();
      ctx.moveTo(bullet.x - (bullet.vx / speed) * tail, bullet.y - (bullet.vy / speed) * tail);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = bullet.color;
      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = 13;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, Math.max(1.5, bullet.radius * 0.36), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTank(tank, colors, isPlayer = false) {
    const size = tank.size;
    const half = size / 2;
    const shieldActive = isPlayer && game.time < (tank.shieldUntil || 0);
    ctx.save();
    ctx.translate(tank.x, tank.y);

    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(2, 7, half * 0.94, half * 0.58, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.rotate(tank.bodyAngle);
    for (const treadY of [-0.36, 0.36]) {
      ctx.fillStyle = colors.tread;
      roundedRectPath(ctx, -half * 0.94, half * treadY - half * 0.15, half * 1.88, half * 0.3, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(144, 228, 248, 0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(116, 203, 224, 0.24)";
      const offset = tank.tread % 10;
      for (let mark = -4; mark <= 4; mark += 1) {
        const x = mark * 10 + offset;
        if (x < -half * 0.85 || x > half * 0.85) continue;
        ctx.fillRect(x, half * treadY - half * 0.12, 2, half * 0.24);
      }
    }

    const hullGradient = ctx.createLinearGradient(-half, -half * 0.4, half, half * 0.4);
    hullGradient.addColorStop(0, colors.body);
    hullGradient.addColorStop(0.55, colors.body);
    hullGradient.addColorStop(1, "rgba(3, 10, 18, 0.95)");
    ctx.fillStyle = hullGradient;
    roundedRectPath(ctx, -half * 0.73, -half * 0.5, half * 1.46, half, 7);
    ctx.fill();
    ctx.strokeStyle = colors.color;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = colors.color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(-half * 0.45, -half * 0.31, half * 0.66, 2);
    ctx.fillStyle = colors.color;
    ctx.beginPath();
    ctx.moveTo(half * 0.44, 0);
    ctx.lineTo(half * 0.2, -half * 0.18);
    ctx.lineTo(half * 0.2, half * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(tank.turretAngle);
    ctx.fillStyle = "#06131e";
    roundedRectPath(ctx, 0, -half * 0.09, half * 0.82, half * 0.18, 3);
    ctx.fill();
    ctx.strokeStyle = colors.color;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = colors.accent;
    ctx.shadowColor = colors.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.31, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.beginPath();
    ctx.arc(-half * 0.04, -half * 0.04, half * 0.055, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (isPlayer) {
      const rapid = game.time < (tank.rapidUntil || 0);
      ctx.fillStyle = rapid ? "#ffe16f" : colors.color;
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, TAU);
      ctx.fill();

      const hp = clamp(tank.hp ?? tank.maxHp, 0, tank.maxHp);
      const pipWidth = 3.4;
      const pipGap = 1.4;
      const totalWidth = tank.maxHp * pipWidth + (tank.maxHp - 1) * pipGap;
      const pipColor = hp <= 3 ? "#ff637f" : "#7af6ff";
      ctx.save();
      ctx.shadowColor = pipColor;
      ctx.shadowBlur = hp <= 3 ? 5 : 3;
      for (let index = 0; index < tank.maxHp; index += 1) {
        ctx.fillStyle = index < hp ? pipColor : "rgba(73, 108, 123, 0.42)";
        ctx.fillRect(-totalWidth / 2 + index * (pipWidth + pipGap), -half - 12, pipWidth, 2.6);
      }
      ctx.restore();
    }

    if (shieldActive) {
      const shieldPulse = 1 + Math.sin(game.visualTime * 7) * 0.04;
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "#72f4ff";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, half * 1.22 * shieldPulse, game.visualTime, Math.PI * 1.7 + game.visualTime);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#75f3ff";
      ctx.beginPath();
      ctx.arc(0, 0, half * 1.1, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (!isPlayer && tank.maxHp > 1) {
      const pipWidth = 8;
      const total = tank.maxHp * pipWidth + (tank.maxHp - 1) * 2;
      for (let index = 0; index < tank.maxHp; index += 1) {
        ctx.fillStyle = index < tank.hp ? colors.color : "rgba(60, 83, 96, 0.45)";
        ctx.fillRect(-total / 2 + index * (pipWidth + 2), -half - 9, pipWidth, 2.5);
      }
    }

    if (tank.hitFlash > 0) {
      ctx.globalAlpha = Math.min(1, tank.hitFlash * 5);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.8, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawBoss() {
    const boss = game.boss;
    if (!boss) return;
    const phaseColor = boss.phase === 3 ? "#ff3f88" : boss.phase === 2 ? "#ffae4e" : "#ff5aa7";
    const pulse = 0.5 + Math.sin(game.visualTime * 4.2) * 0.5;
    const halfW = boss.w / 2;
    const halfH = boss.h / 2;

    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.fillStyle = "rgba(0, 0, 0, 0.37)";
    ctx.beginPath();
    ctx.ellipse(0, halfH + 18, halfW * 1.02, 18, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = phaseColor;
    ctx.globalAlpha = 0.18 + pulse * 0.16;
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, halfW + 17 + pulse * 4, game.visualTime * 0.45, TAU + game.visualTime * 0.45);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.rotate(-0.08 + Math.sin(game.visualTime * 0.35) * 0.025);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * halfW * 0.72, 9);
      ctx.fillStyle = "#160b1c";
      roundedRectPath(ctx, -21, -27, 42, 54, 8);
      ctx.fill();
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = phaseColor;
      ctx.globalAlpha = 0.62;
      ctx.fillRect(-12, -5, 24, 5);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    const bodyGradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    bodyGradient.addColorStop(0, "#351124");
    bodyGradient.addColorStop(0.42, "#160b1c");
    bodyGradient.addColorStop(1, "#2b0c20");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    const bodyPoints = [
      [-halfW * 0.64, -halfH * 0.74],
      [0, -halfH],
      [halfW * 0.64, -halfH * 0.74],
      [halfW * 0.88, -halfH * 0.1],
      [halfW * 0.64, halfH * 0.74],
      [0, halfH],
      [-halfW * 0.64, halfH * 0.74],
      [-halfW * 0.88, -halfH * 0.1],
    ];
    bodyPoints.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = phaseColor;
    ctx.shadowColor = phaseColor;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 167, 204, 0.28)";
    ctx.lineWidth = 1;
    for (let index = -1; index <= 1; index += 1) {
      ctx.beginPath();
      ctx.moveTo(index * 20, -halfH * 0.64);
      ctx.lineTo(index * 25, halfH * 0.62);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(boss.turretAngle);
    for (const barrelOffset of [-11, 11]) {
      ctx.fillStyle = "#160b16";
      roundedRectPath(ctx, 19, barrelOffset - 5, 70, 10, 3);
      ctx.fill();
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = phaseColor;
      ctx.fillRect(82, barrelOffset - 2, 4, 4);
    }
    ctx.fillStyle = "#1c0d1e";
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const eyeGlow = ctx.createRadialGradient(-4, -5, 1, 0, 0, 21);
    eyeGlow.addColorStop(0, "#ffffff");
    eyeGlow.addColorStop(0.28, boss.phase === 3 ? "#ff6d9e" : "#ffd1e5");
    eyeGlow.addColorStop(0.6, phaseColor);
    eyeGlow.addColorStop(1, "rgba(48, 4, 26, 0.2)");
    ctx.fillStyle = eyeGlow;
    ctx.shadowColor = phaseColor;
    ctx.shadowBlur = 23;
    ctx.beginPath();
    ctx.arc(0, 0, 18 + pulse * 1.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.93)";
    ctx.beginPath();
    ctx.arc(-4, -5, 3.2, 0, TAU);
    ctx.fill();

    if (boss.transition > 0) {
      ctx.strokeStyle = "#fff1b9";
      ctx.globalAlpha = 0.5 + pulse * 0.3;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, halfW + 24 + pulse * 10, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (boss.attackTimer < 0.55) {
      const warning = 1 - boss.attackTimer / 0.55;
      ctx.strokeStyle = phaseColor;
      ctx.globalAlpha = 0.16 + warning * 0.52;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, halfW + 20 - warning * 14, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (boss.hitFlash > 0) {
      ctx.globalAlpha = clamp(boss.hitFlash * 6, 0, 0.7);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, halfW * 0.74, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawEffects() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ring of game.rings) {
      const alpha = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = alpha * 0.75;
      ctx.lineWidth = ring.width * alpha;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
      ctx.stroke();
    }
    for (const particle of game.particles) {
      const alpha = clamp(particle.life / (particle.maxLife * 0.72), 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, Math.max(0.5, particle.size * alpha), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBanner() {
    const banner = game.banner;
    if (!banner || banner.timer <= 0) return;
    const fadeIn = clamp((banner.maxTimer - banner.timer) / 0.2, 0, 1);
    const fadeOut = clamp(banner.timer / 0.34, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    const danger = banner.tone === "danger";
    const accent = danger ? "#ff4f9d" : "#61eeff";
    const panelWidth = 720;
    const panelHeight = 178;
    const px = 640 - panelWidth / 2;
    const py = 362 - panelHeight / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    const gradient = ctx.createLinearGradient(px, py, px + panelWidth, py + panelHeight);
    gradient.addColorStop(0, "rgba(5, 19, 34, 0.92)");
    gradient.addColorStop(0.5, danger ? "rgba(34, 6, 22, 0.92)" : "rgba(5, 22, 38, 0.92)");
    gradient.addColorStop(1, "rgba(3, 9, 18, 0.94)");
    ctx.fillStyle = gradient;
    ctx.fillRect(px, py, panelWidth, panelHeight);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, panelWidth - 1, panelHeight - 1);

    ctx.fillStyle = accent;
    ctx.fillRect(px, py, panelWidth, 2);
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillRect(px + 30, py + 20, 68, 1);
    ctx.fillRect(px + panelWidth - 98, py + 20, 68, 1);
    ctx.globalAlpha = alpha;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = accent;
    ctx.font = '700 15px "Microsoft YaHei", "PingFang SC", sans-serif';
    const overline = danger ? "危险警报 // 首领信号" : `战区 ${String(game.levelDef.number).padStart(2, "0")} // 进入战场`;
    ctx.fillText(overline, 640, py + 40);
    ctx.fillStyle = "#effdff";
    ctx.font = danger
      ? '900 45px "Microsoft YaHei", "PingFang SC", sans-serif'
      : '900 48px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    ctx.fillText(banner.subtitle, 640, py + 88);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#9ec1d1";
    ctx.font = '500 16px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(banner.detail, 640, py + 138);
    ctx.fillStyle = danger ? "rgba(255, 79, 157, 0.7)" : "rgba(97, 238, 255, 0.65)";
    ctx.font = '700 12px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(danger ? "准备迎战最终首领" : "守住能量核心", 640, py + 158);
    ctx.restore();
  }

  function drawWorld() {
    const shakeX = game.shake > 0 ? randomBetween(-game.shake, game.shake) : 0;
    const shakeY = game.shake > 0 ? randomBetween(-game.shake, game.shake) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawWalls();
    drawCore();
    drawPowerups();
    drawBoss();
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      drawTank(enemy, {
        color: enemy.color,
        accent: enemy.accent,
        body: enemy.body,
        tread: "#080c12",
      });
    }
    if (game.player) drawTank(game.player, PLAYER_COLORS, true);
    drawBullets();
    drawEffects();
    ctx.restore();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#030711";
    ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
    const scaleX = dom.canvas.width / LOGICAL_WIDTH;
    const scaleY = dom.canvas.height / LOGICAL_HEIGHT;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    drawBackground();
    if (game.state !== STATES.MENU && game.levelDef) {
      drawWorld();
      drawBanner();
    } else {
      ctx.save();
      ctx.strokeStyle = "rgba(61, 231, 255, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(640, 420, 250 + Math.sin(game.visualTime * 0.4) * 12, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 47, 150, 0.055)";
      ctx.setLineDash([16, 20]);
      ctx.beginPath();
      ctx.arc(640, 420, 330, -game.visualTime * 0.08, TAU - game.visualTime * 0.08);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (game.flash > 0) {
      ctx.globalAlpha = clamp(game.flash, 0, 0.7);
      ctx.fillStyle = game.flashColor;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.globalAlpha = 1;
    }
  }

  /* ── 更新循环 ───────────────────────────────────────────── */
  function updateGame(dt) {
    if (game.state !== STATES.PLAYING) return;
    game.shake = Math.max(0, game.shake - dt * 28);
    game.flash = Math.max(0, game.flash - dt * 2.4);
    game.coreFlash = Math.max(0, game.coreFlash - dt);
    for (const wall of game.walls) wall.flash = Math.max(0, wall.flash - dt);
    if (game.banner) {
      game.banner.timer -= dt;
      if (game.banner.timer <= 0) game.banner = null;
    }

    if (game.introTimer > 0) {
      game.introTimer = Math.max(0, game.introTimer - dt);
      updateParticles(dt);
      return;
    }

    game.time += dt;
    game.levelTime += dt;
    game.totalTime += dt;

    updatePlayer(dt);
    updateSpawner(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateBullets(dt);
    if (game.state !== STATES.PLAYING) {
      updateParticles(dt);
      return;
    }
    if (game.victoryTimer > 0) {
      game.victoryTimer = Math.max(0, game.victoryTimer - dt);
      updateParticles(dt);
      if (game.victoryTimer <= 0) {
        winRun("熔核巨像已被击毁，三处战区恢复稳定。");
      }
      return;
    }
    updatePowerups(dt);
    updateParticles(dt);
    checkLevelCompletion();
    if (game.state !== STATES.PLAYING) return;

    game.hudTimer -= dt;
    if (game.hudTimer <= 0) {
      game.hudTimer = 0.12;
      updateHud();
    }
  }

  function frame(timestamp) {
    const delta = game.lastFrame ? Math.min(0.05, Math.max(0, (timestamp - game.lastFrame) / 1000)) : 0;
    game.lastFrame = timestamp;
    game.visualTime += delta;
    updateGame(delta);
    render();
    window.requestAnimationFrame(frame);
  }

  function isPortraitBlocked() {
    return window.innerWidth < window.innerHeight && window.innerWidth <= 1000;
  }

  function syncOrientation() {
    const blocked = isPortraitBlocked();
    dom.rotateHint.hidden = !blocked;
    if (blocked && game.state === STATES.PLAYING) {
      pauseGame();
    }
  }

  function setupUi() {
    dom.difficultyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const difficulty = button.dataset.difficulty;
        if (!DIFFICULTIES[difficulty]) return;
        game.difficulty = difficulty;
        game.difficultyConfig = DIFFICULTIES[difficulty];
        updateDifficultyUi();
        ensureAudio();
        sound.click();
      });
    });

    dom.startButton.addEventListener("click", () => {
      ensureAudio();
      beginRun();
    });

    dom.soundButton.addEventListener("click", toggleSound);
    dom.pauseButton.addEventListener("click", pauseGame);
    dom.resumeButton.addEventListener("click", resumeGame);
    dom.restartButton.addEventListener("click", restartRun);
    dom.pauseMenuButton.addEventListener("click", returnToMenu);
    dom.levelButton.addEventListener("click", nextLevel);
    dom.levelMenuButton.addEventListener("click", returnToMenu);
    dom.resultRestartButton.addEventListener("click", restartRun);
    dom.resultMenuButton.addEventListener("click", returnToMenu);

    const onResize = () => {
      resizeCanvas();
      syncOrientation();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", () => window.setTimeout(onResize, 120));

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(dom.shell);
    }

    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener("change", (event) => {
        game.reducedMotion = event.matches;
      });
    }
  }

  function initialize() {
    resizeCanvas();
    setupInput();
    setupUi();
    resetWorldState();
    game.levelDef = LEVELS[0];
    game.lives = game.difficultyConfig.lives;
    updateSoundButton();
    updateDifficultyUi();
    updateBestDisplays();
    showStartScreen();
    syncOrientation();
    window.requestAnimationFrame(frame);
  }

  initialize();
})();
