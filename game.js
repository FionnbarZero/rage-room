(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const screens = {
    setup: $('#setup'),
    death: $('#death-screen'),
    crack: $('#crack-screen'),
    game: $('#game-screen'),
  };

  const state = {
    identity: null,
    home: null,
    flickerTimer: 0,
    flickerEndTimer: 0,
    currentCorruption: null,
    introDeaths: 0,
  };

  let audioContext = null;
  let muted = false;
  let tacoMusicTimer = 0;
  let tacoNote = 0;

  function tone(frequency, duration = 0.08, type = 'square', volume = 0.035, slide = 0) {
    if (muted) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.linearRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (_) { /* Sound is optional. */ }
  }

  function startTacoMusic() {
    window.clearInterval(tacoMusicTimer);
    tacoNote = 0;
    $('#music-label').textContent = '♪ Taco Storm — original chiptune';
    $('#music-label').classList.remove('hidden');
    const melody = [330, 392, 440, 523, 440, 392, 330, 294, 330, 440, 494, 392, 330, 262, 294, 330];
    tacoMusicTimer = window.setInterval(() => {
      const note = melody[tacoNote % melody.length];
      tone(note, .13, tacoNote % 4 === 0 ? 'square' : 'triangle', .024, 18);
      if (tacoNote % 4 === 0) tone(note / 2, .1, 'square', .012, -5);
      tacoNote += 1;
    }, 180);
  }

  function startPlanetMusic() {
    window.clearInterval(tacoMusicTimer);
    tacoNote = 0;
    $('#music-label').textContent = '♪ Planet Party — orbit, launch, climb';
    $('#music-label').classList.remove('hidden');
    const bass = [110, 110, 147, 165, 110, 196, 165, 147];
    const lead = [440, 554, 659, 554, 494, 659, 740, 659];
    tacoMusicTimer = window.setInterval(() => {
      const index = tacoNote % bass.length;
      tone(bass[index], .15, 'square', .018, 8);
      tone(lead[index], .11, index % 2 ? 'triangle' : 'sine', .02, 24);
      tacoNote += 1;
    }, 220);
  }

  function stopTacoMusic() {
    window.clearInterval(tacoMusicTimer);
    tacoMusicTimer = 0;
    $('#music-label').classList.add('hidden');
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, element]) => element.classList.toggle('hidden', key !== name));
  }

  function clearFlicker() {
    window.clearTimeout(state.flickerTimer);
    window.clearTimeout(state.flickerEndTimer);
    if (state.currentCorruption) {
      state.currentCorruption.forEach(({ button, old }) => {
        button.classList.remove('corrupted');
        button.querySelector('span:not(.choice-icon)').textContent = old.label;
        button.querySelector('.choice-icon').textContent = old.icon;
        button.querySelector('small').textContent = old.small;
      });
    }
    state.currentCorruption = null;
  }

  function scheduleFlicker(panel) {
    clearFlicker();
    const delay = 900 + Math.random() * 1700;
    state.flickerTimer = window.setTimeout(() => {
      const choices = $$('.rpg-choice', panel);
      const flashWord = panel.id === 'question-one' ? 'DEMON' : 'HELL';
      const flashWords = choices.map(() => flashWord);
      state.currentCorruption = choices.map((button, index) => {
        const label = button.querySelector('span:not(.choice-icon)');
        const icon = button.querySelector('.choice-icon');
        const small = button.querySelector('small');
        const old = { label: label.textContent, icon: icon.textContent, small: small.textContent };
        const word = flashWords[index];
        button.classList.add('corrupted');
        label.textContent = word;
        icon.textContent = word === 'DEMON' ? '♆' : '♨';
        small.textContent = index % 2 ? 'DO NOT BLINK' : 'CHOOSE ME';
        return { button, word, old };
      });
      tone(72, .13, 'sawtooth', .06, -22);

      state.flickerEndTimer = window.setTimeout(() => {
        clearFlicker();
        scheduleFlicker(panel);
      }, 230 + Math.random() * 150);
    }, delay);
  }

  function introDeath(reason) {
    clearFlicker();
    state.introDeaths += 1;
    $('#death-reason').textContent = reason;
    showScreen('death');
    tone(110, .55, 'sawtooth', .08, -90);
  }

  function resetIntro() {
    state.identity = null;
    state.home = null;
    $('#question-one').classList.add('active');
    $('#question-one').setAttribute('aria-hidden', 'false');
    $('#question-two').classList.remove('active');
    $('#question-two').setAttribute('aria-hidden', 'true');
    $('#whisper').textContent = state.introDeaths ? 'That was almost convincing. Try again.' : 'Choose carefully. The world is listening.';
    showScreen('setup');
    scheduleFlicker($('#question-one'));
  }

  function enterSecondQuestion() {
    clearFlicker();
    $('#question-one').classList.remove('active');
    $('#question-one').setAttribute('aria-hidden', 'true');
    $('#question-two').classList.add('active');
    $('#question-two').setAttribute('aria-hidden', 'false');
    $('#whisper').textContent = `A ${state.identity.toLowerCase()} of impeccable judgment. So far.`;
    window.setTimeout(() => scheduleFlicker($('#question-two')), 420);
  }

  function crackOpen(home) {
    clearFlicker();
    state.home = home;
    showScreen('crack');
    tone(55, .75, 'sawtooth', .1, -30);
    window.setTimeout(() => {
      showScreen('game');
      game.start();
    }, 1550);
  }

  $$('.rpg-choice').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = button.closest('.question-panel');
      const corruptedChoice = state.currentCorruption?.find((choice) => choice.button === button);
      if (corruptedChoice) {
        if (panel.id === 'question-one') {
          introDeath(`You chose ${corruptedChoice.word}. It chose violence.`);
        } else if (corruptedChoice.word === 'HELL') {
          crackOpen('Hell');
        } else {
          introDeath('You pressed DEMON. HELL was the answer.');
        }
        return;
      }

      if (panel.id === 'question-one') {
        state.identity = button.dataset.value;
        tone(390, .06, 'sine', .035, 80);
        enterSecondQuestion();
        return;
      }

      $('#whisper').textContent = 'No. Wait for HELL.';
      button.classList.remove('denied');
      void button.offsetWidth;
      button.classList.add('denied');
      tone(145, .09, 'square', .035, -45);
    });
  });

  $('#try-again').addEventListener('click', resetIntro);
  $('#mute-button').addEventListener('click', (event) => {
    muted = !muted;
    event.currentTarget.textContent = muted ? '×' : '♪';
    event.currentTarget.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  });

  $('#skip-level').addEventListener('click', () => {
    if (!game.running || game.player.dead) return;
    game.openLevelSelect();
  });
  $('#shop-button').addEventListener('click', () => {
    if (!game.running || game.player.dead) return;
    game.openShop();
  });

  $$('.level-select-grid button').forEach((button) => {
    button.addEventListener('click', () => game.chooseLevel(Number(button.dataset.level)));
  });
  $('#close-level-select').addEventListener('click', () => game.closeLevelSelect());
  $$('.shop-grid button').forEach((button) => {
    button.addEventListener('click', () => game.buyShopItem(button.dataset.shopItem));
  });
  $('#close-shop').addEventListener('click', () => game.closeShop());
  $('#overlay-target').addEventListener('click', () => game.clickLoadingTarget());
  $('#overlay-continue').addEventListener('click', () => game.clickVictoryButton());
  $('#loading-puzzle-board').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-loading-action]');
    if (button) game.clickLoadingPuzzle(button);
  });
  $('#narrator-word-bank').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-word]');
    if (button) game.chooseNarratorWord(button.dataset.word);
  });

  $$('#floor-buttons button').forEach((button) => {
    button.addEventListener('click', () => game.selectElevatorFloor(Number(button.dataset.floor)));
  });

  $$('.quiz-answers button').forEach((button) => {
    button.addEventListener('click', () => game.answerQuiz(button.dataset.answer));
  });

  const canvas = $('#game-canvas');
  const ctx = canvas.getContext('2d');
  const WORLD = { width: 4680, height: 540, floor: 510 };

  const basePlatforms = [
    { x: 0, y: 470, w: 360, h: 40, type: 'solid' },
    { x: 430, y: 430, w: 115, h: 20, type: 'solid' },
    { x: 615, y: 375, w: 92, h: 18, type: 'crumble' },
    { x: 770, y: 325, w: 78, h: 18, type: 'solid', ghost: true },
    { x: 920, y: 400, w: 62, h: 18, type: 'solid', shrinking: true },
    { x: 1060, y: 350, w: 65, h: 18, type: 'crumble' },
    { x: 1195, y: 440, w: 185, h: 70, type: 'solid' },
    { x: 1440, y: 390, w: 85, h: 18, type: 'moving', axis: 'y', range: 120, speed: 1.5 },
    { x: 1610, y: 300, w: 80, h: 18, type: 'solid' },
    { x: 1760, y: 385, w: 105, h: 18, type: 'fake' },
    { x: 1920, y: 425, w: 70, h: 18, type: 'solid' },
    { x: 2055, y: 360, w: 65, h: 18, type: 'crumble' },
    { x: 2190, y: 295, w: 65, h: 18, type: 'crumble' },
    { x: 2330, y: 380, w: 72, h: 18, type: 'solid', conveyor: 460 },
    { x: 2480, y: 440, w: 250, h: 70, type: 'solid' },
    { x: 2790, y: 385, w: 85, h: 18, type: 'moving', axis: 'x', range: 120, speed: 1.2 },
    { x: 3010, y: 325, w: 75, h: 18, type: 'solid', ghost: true },
    { x: 3150, y: 420, w: 54, h: 18, type: 'solid', shrinking: true },
    { x: 3280, y: 345, w: 54, h: 18, type: 'crumble' },
    { x: 3410, y: 275, w: 54, h: 18, type: 'solid' },
    { x: 3535, y: 355, w: 58, h: 18, type: 'fake' },
    { x: 3655, y: 420, w: 58, h: 18, type: 'solid' },
    { x: 3785, y: 350, w: 65, h: 18, type: 'moving', axis: 'y', range: 135, speed: 1.7 },
    { x: 3925, y: 265, w: 62, h: 18, type: 'crumble' },
    { x: 4055, y: 365, w: 70, h: 18, type: 'solid', conveyor: -520 },
    { x: 4200, y: 445, w: 400, h: 65, type: 'solid' },
  ];

  const spikes = [
    { x: 275, y: 446, w: 54, h: 24 },
    { x: 1225, y: 416, w: 40, h: 24 },
    { x: 1300, y: 416, w: 40, h: 24 },
  ];

  const checkpoints = [
    { x: 1270, y: 390, reached: false, respawnX: 1205, respawnY: 380 },
    { x: 2570, y: 390, reached: false, respawnX: 2485, respawnY: 380 },
  ];

  const messages = [
    { x: 380, text: 'Jump. It is literally the only mechanic.' },
    { x: 720, text: 'Ghost platforms disappear after you see them. Remember the route.' },
    { x: 900, text: 'Shrinking platforms dislike visitors.' },
    { x: 1720, text: 'That one looks trustworthy.' },
    { x: 2210, text: 'Conveyors choose your direction for you.' },
    { x: 2700, text: 'Halfway. This is usually where confidence becomes dangerous.' },
    { x: 3500, text: 'The finish is close. Try not to think about it.' },
    { x: 4130, text: 'Surely the final platform is safe.' },
  ];

  const levelTwoPlatforms = [
    { x: 0, y: 470, w: 330, h: 40, type: 'solid' },
    { x: 405, y: 390, w: 70, h: 18, type: 'crumble' },
    { x: 540, y: 315, w: 65, h: 18, type: 'moving', axis: 'y', range: 125, speed: 1.8 },
    { x: 680, y: 245, w: 58, h: 18, type: 'solid' },
    { x: 800, y: 330, w: 58, h: 18, type: 'fake' },
    { x: 920, y: 410, w: 62, h: 18, type: 'solid' },
    { x: 1050, y: 345, w: 58, h: 18, type: 'crumble' },
    { x: 1170, y: 280, w: 58, h: 18, type: 'crumble' },
    { x: 1290, y: 430, w: 210, h: 80, type: 'solid' },
    { x: 1560, y: 360, w: 65, h: 18, type: 'moving', axis: 'x', range: 125, speed: 1.7 },
    { x: 1780, y: 280, w: 58, h: 18, type: 'solid' },
    { x: 1900, y: 365, w: 54, h: 18, type: 'fake' },
    { x: 2015, y: 435, w: 54, h: 18, type: 'solid' },
    { x: 2135, y: 350, w: 54, h: 18, type: 'crumble' },
    { x: 2255, y: 265, w: 54, h: 18, type: 'moving', axis: 'y', range: 105, speed: 2.1 },
    { x: 2390, y: 405, w: 210, h: 105, type: 'solid' },
    { x: 2660, y: 315, w: 62, h: 18, type: 'crumble' },
    { x: 2790, y: 230, w: 60, h: 18, type: 'solid' },
    { x: 2920, y: 330, w: 60, h: 18, type: 'fake' },
    { x: 3050, y: 420, w: 58, h: 18, type: 'solid' },
    { x: 3175, y: 335, w: 58, h: 18, type: 'moving', axis: 'x', range: 110, speed: 1.9 },
    { x: 3375, y: 255, w: 58, h: 18, type: 'crumble' },
    { x: 3500, y: 345, w: 52, h: 18, type: 'solid' },
    { x: 3615, y: 430, w: 54, h: 18, type: 'crumble' },
    { x: 3735, y: 345, w: 54, h: 18, type: 'crumble' },
    { x: 3855, y: 260, w: 54, h: 18, type: 'solid' },
    { x: 3980, y: 350, w: 58, h: 18, type: 'moving', axis: 'y', range: 120, speed: 2.2 },
    { x: 4120, y: 430, w: 58, h: 18, type: 'solid' },
    { x: 4250, y: 445, w: 400, h: 65, type: 'solid' },
  ];

  const levelTwoSpikes = [
    { x: 210, y: 446, w: 52, h: 24 },
    { x: 1325, y: 406, w: 45, h: 24 },
    { x: 1405, y: 406, w: 45, h: 24 },
  ];

  const levelTwoCheckpoints = [
    { x: 1460, y: 380, reached: false, respawnX: 1445, respawnY: 360 },
    { x: 2560, y: 350, reached: false, respawnX: 2555, respawnY: 340 },
  ];

  const levelTwoMessages = [
    { x: 350, text: 'You found the wrong way. Naturally, it was correct.' },
    { x: 1250, text: 'Level 3 has learned from your mistakes.' },
    { x: 2350, text: 'These platforms are even less emotionally available.' },
    { x: 3550, text: 'This exit is real. Probably.' },
  ];

  const levelThreePlatforms = [
    { x: 0, y: 470, w: 420, h: 40, type: 'solid' },
    { x: 480, y: 470, w: 620, h: 40, type: 'solid' },
    { x: 1160, y: 470, w: 610, h: 40, type: 'solid' },
    { x: 1830, y: 470, w: 610, h: 40, type: 'solid' },
    { x: 2500, y: 470, w: 610, h: 40, type: 'solid' },
    { x: 3170, y: 470, w: 650, h: 40, type: 'solid' },
    { x: 760, y: 350, w: 95, h: 18, type: 'solid', musical: 0 },
    { x: 1420, y: 330, w: 90, h: 18, type: 'crumble', musical: 1 },
    { x: 2070, y: 345, w: 90, h: 18, type: 'moving', axis: 'y', range: 80, speed: 1.5, musical: 2 },
    { x: 2740, y: 325, w: 90, h: 18, type: 'crumble', musical: 0 },
    { x: 3380, y: 350, w: 90, h: 18, type: 'solid', musical: 1 },
    { x: 3880, y: 410, w: 175, h: 100, type: 'solid', conveyor: 250 },
    { x: 4120, y: 325, w: 88, h: 18, type: 'moving', axis: 'y', range: 66, speed: 2.35, musical: 2 },
    { x: 4285, y: 245, w: 82, h: 18, type: 'orbit', rangeX: 62, rangeY: 46, speed: 2.65 },
    { x: 4460, y: 365, w: 84, h: 18, type: 'crumble', musical: 0 },
    { x: 4630, y: 285, w: 82, h: 18, type: 'solid', shrinking: true },
    { x: 4800, y: 395, w: 86, h: 18, type: 'moving', axis: 'x', range: 72, speed: 2.9, musical: 1 },
    { x: 4960, y: 470, w: 300, h: 40, type: 'solid' },
  ];

  const levelThreeCheckpoints = [
    { x: 1900, y: 410, reached: false, respawnX: 1840, respawnY: 410 },
    { x: 3190, y: 410, reached: false, respawnX: 3180, respawnY: 410 },
    { x: 3910, y: 360, reached: false, respawnX: 3900, respawnY: 360 },
  ];

  const levelThreeMessages = [
    { x: 250, text: 'RUN. THE WALL IS HUNGRY.' },
    { x: 650, text: 'Musical platforms are solid only on their own beat.' },
    { x: 820, text: 'The first alcove was telling the truth.' },
    { x: 1050, text: 'Here comes another one. Surely the trick is the same.' },
    { x: 1750, text: 'The harmless wall is still chasing you. Keep running.' },
    { x: 2110, text: 'Now dodge the tacos.' },
    { x: 2600, text: 'The rain is building the maze around you.' },
    { x: 3450, text: 'Please remain calm. The tacos can smell panic.' },
    { x: 3870, text: 'Factory extension: the tacos have learned machinery.' },
    { x: 4550, text: 'The conveyor is not helping. Neither is the shrinking platform.' },
  ];

  const tacoMazeColumns = [
    { x: 570, height: 1 }, { x: 700, height: 2 }, { x: 910, height: 1 },
    { x: 1260, height: 2 }, { x: 1390, height: 1 }, { x: 1600, height: 2 },
    { x: 1940, height: 1 }, { x: 2210, height: 2 }, { x: 2330, height: 1 },
    { x: 2600, height: 2 }, { x: 2880, height: 1 }, { x: 3020, height: 2 },
    { x: 3270, height: 1 }, { x: 3510, height: 2 }, { x: 3630, height: 1 },
    { x: 3940, height: 2 }, { x: 4140, height: 1 }, { x: 4350, height: 2 },
    { x: 4570, height: 1 }, { x: 4760, height: 2 }, { x: 4910, height: 1 },
  ];

  const levelThreeClimbPlatforms = [
    { x: 0, y: 470, w: 520, h: 40, type: 'solid' },
    { x: 570, y: 420, w: 100, h: 20, type: 'solid' },
    { x: 730, y: 350, w: 90, h: 18, type: 'moving', axis: 'x', range: 42, speed: 1.8 },
    { x: 560, y: 280, w: 90, h: 18, type: 'crumble' },
    { x: 760, y: 210, w: 80, h: 18, type: 'shifting', range: 48, speed: 1.7 },
    { x: 950, y: 140, w: 82, h: 18, type: 'moving', axis: 'y', range: 38, speed: 1.65 },
    { x: 780, y: 60, w: 82, h: 18, type: 'fake' },
    { x: 600, y: -20, w: 82, h: 18, type: 'shifting', range: 45, speed: 2.1 },
    { x: 820, y: -100, w: 82, h: 18, type: 'moving', axis: 'x', range: 45, speed: 2.2 },
    { x: 1040, y: -180, w: 78, h: 18, type: 'crumble' },
    { x: 850, y: -260, w: 78, h: 18, type: 'shifting', range: 50, speed: 1.9 },
    { x: 630, y: -340, w: 78, h: 18, type: 'moving', axis: 'y', range: 42, speed: 2.3 },
    { x: 430, y: -420, w: 78, h: 18, type: 'fake' },
    { x: 650, y: -500, w: 76, h: 18, type: 'shifting', range: 48, speed: 2.35 },
    { x: 880, y: -580, w: 76, h: 18, type: 'moving', axis: 'x', range: 52, speed: 2.45 },
    { x: 1090, y: -660, w: 74, h: 18, type: 'crumble' },
    { x: 900, y: -740, w: 74, h: 18, type: 'shifting', range: 55, speed: 2.5 },
    { x: 680, y: -820, w: 74, h: 18, type: 'moving', axis: 'y', range: 44, speed: 2.55 },
    { x: 470, y: -900, w: 74, h: 18, type: 'crumble' },
    { x: 700, y: -980, w: 72, h: 18, type: 'shifting', range: 58, speed: 2.6 },
    { x: 930, y: -1060, w: 72, h: 18, type: 'moving', axis: 'x', range: 56, speed: 2.7 },
    { x: 1150, y: -1140, w: 76, h: 18, type: 'fake' },
    // A parallel safety route provides a second reachable block at every tier.
    { x: 440, y: 385, w: 78, h: 16, type: 'solid' },
    { x: 660, y: 315, w: 76, h: 16, type: 'solid' },
    { x: 850, y: 245, w: 74, h: 16, type: 'solid' },
    { x: 660, y: 175, w: 74, h: 16, type: 'solid' },
    { x: 865, y: 105, w: 72, h: 16, type: 'solid' },
    { x: 690, y: 25, w: 72, h: 16, type: 'solid' },
    { x: 710, y: -55, w: 70, h: 16, type: 'solid' },
    { x: 930, y: -135, w: 70, h: 16, type: 'solid' },
    { x: 750, y: -215, w: 70, h: 16, type: 'solid' },
    { x: 720, y: -295, w: 68, h: 16, type: 'solid' },
    { x: 520, y: -375, w: 68, h: 16, type: 'solid' },
    { x: 540, y: -455, w: 68, h: 16, type: 'solid' },
    { x: 760, y: -535, w: 68, h: 16, type: 'solid' },
    { x: 980, y: -615, w: 66, h: 16, type: 'solid' },
    { x: 800, y: -695, w: 66, h: 16, type: 'solid' },
    { x: 600, y: -775, w: 66, h: 16, type: 'solid' },
    { x: 610, y: -855, w: 64, h: 16, type: 'solid' },
    { x: 820, y: -935, w: 64, h: 16, type: 'solid' },
    { x: 1020, y: -1015, w: 64, h: 16, type: 'solid' },
    { x: 1030, y: -1095, w: 70, h: 16, type: 'solid' },
    { x: 1120, y: -1160, w: 82, h: 16, type: 'solid' },
    // Extra randomized branches make each climb offer several possible jumps.
    { x: 505, y: 330, w: 62, h: 15, type: 'shifting', range: 34, speed: 2.25 },
    { x: 985, y: 185, w: 64, h: 15, type: 'orbit', rangeX: 48, rangeY: 30, speed: 2.15 },
    { x: 505, y: 85, w: 62, h: 15, type: 'moving', axis: 'y', range: 32, speed: 2.5 },
    { x: 1035, y: -70, w: 62, h: 15, type: 'shifting', range: 40, speed: 2.4 },
    { x: 505, y: -235, w: 60, h: 15, type: 'moving', axis: 'x', range: 42, speed: 2.7 },
    { x: 1080, y: -390, w: 60, h: 15, type: 'orbit', rangeX: 58, rangeY: 34, speed: 2.55 },
    { x: 470, y: -550, w: 58, h: 15, type: 'moving', axis: 'y', range: 38, speed: 2.8 },
    { x: 1050, y: -710, w: 58, h: 15, type: 'shifting', range: 48, speed: 2.75 },
    { x: 465, y: -870, w: 56, h: 15, type: 'moving', axis: 'x', range: 44, speed: 2.95 },
    { x: 1165, y: -1015, w: 58, h: 15, type: 'orbit', rangeX: 62, rangeY: 38, speed: 3.05 },
    { x: 1100, y: -1220, w: 350, h: 30, type: 'solid' },
  ];

  const levelThreeClimbMessages = [
    { x: 160, text: 'A perfectly normal walking room.' },
    { x: 380, text: 'WHAT?' },
    { x: 540, text: 'CLIMB. THE FLOOR IS NO LONGER YOUR FRIEND.' },
    { x: 820, text: 'The lava is eating every block below you.' },
    { x: 1080, text: 'The blocks have started changing their minds.' },
  ];

  const levelFourPlatforms = [
    { x: 0, y: 470, w: 1320, h: 40, type: 'solid' },
    { x: 1320, y: 470, w: 1180, h: 40, type: 'solid' },
    { x: 380, y: 405, w: 110, h: 18, type: 'solid' },
    { x: 560, y: 345, w: 100, h: 18, type: 'copycat', range: 85 },
    { x: 1370, y: 405, w: 105, h: 18, type: 'solid' },
    { x: 1540, y: 345, w: 95, h: 18, type: 'solid' },
    { x: 1710, y: 405, w: 95, h: 18, type: 'solid' },
    { x: 1880, y: 345, w: 95, h: 18, type: 'copycat', range: 95 },
    { x: 2050, y: 405, w: 110, h: 18, type: 'solid' },
  ];

  const levelFourMessages = [
    { x: 210, text: 'Your reflection is two seconds behind.' },
    { x: 500, text: 'The copycat platforms repeat your movement a moment later.' },
    { x: 690, text: 'Stand on both buttons. Somehow.' },
    { x: 1320, text: 'The mirror agrees to let you pass.' },
    { x: 1510, text: 'LEFT IS RIGHT. RIGHT IS LEFT.' },
    { x: 2180, text: 'That exit looks extremely legitimate.' },
  ];

  const levelFivePlatforms = [
    { x: 0, y: 470, w: 2800, h: 40, type: 'solid' },
    { x: 420, y: 405, w: 100, h: 18, type: 'solid' },
    { x: 620, y: 350, w: 95, h: 18, type: 'solid' },
    { x: 1320, y: 405, w: 100, h: 18, type: 'solid' },
    { x: 1580, y: 345, w: 95, h: 18, type: 'solid' },
    { x: 1880, y: 405, w: 100, h: 18, type: 'solid' },
    { x: 2130, y: 350, w: 100, h: 18, type: 'solid' },
    { x: 790, y: 430, w: 75, h: 40, type: 'solid' },
    { x: 1690, y: 420, w: 82, h: 50, type: 'solid' },
    { x: 2310, y: 435, w: 70, h: 35, type: 'solid' },
    { x: 1020, y: 380, w: 85, h: 16, type: 'moving', axis: 'y', range: 30, speed: 1.9 },
    { x: 1990, y: 320, w: 82, h: 16, type: 'moving', axis: 'x', range: 38, speed: 2.1 },
  ];

  const levelFiveMessages = [
    { x: 180, text: 'GREEN MEANS GO. RED MEANS STOP.' },
    { x: 1180, text: 'The reflection never lies.' },
    { x: 1510, text: 'Did the rules just change?' },
    { x: 2240, text: 'Final test: jump without moving sideways.' },
  ];

  const levelSixPlatforms = [
    { x: 0, y: 470, w: 300, h: 40, type: 'solid' },
    { x: 450, y: 430, w: 500, h: 40, type: 'elevator' },
    { x: 1000, y: 470, w: 500, h: 40, type: 'solid' },
    { x: 900, y: 420, w: 100, h: 18, type: 'debris' },
    { x: 750, y: 350, w: 95, h: 18, type: 'debris' },
    { x: 600, y: 420, w: 95, h: 18, type: 'debris' },
    { x: 450, y: 340, w: 95, h: 18, type: 'debris' },
    { x: 300, y: 410, w: 100, h: 18, type: 'debris' },
  ];

  const levelSixMessages = [
    { x: 120, text: 'Please select a floor.' },
    { x: 1030, text: 'The emergency exit is back underneath the elevator.' },
  ];

  const levelSevenPlatforms = [
    { x: 0, y: 470, w: 1500, h: 40, type: 'solid' },
    { x: 1500, y: 470, w: 320, h: 40, type: 'fake' },
    { x: 1820, y: 470, w: 520, h: 40, type: 'solid' },
    { x: 2400, y: 430, w: 100, h: 18, type: 'solid' },
    { x: 2570, y: 365, w: 90, h: 18, type: 'moving', axis: 'x', range: 45, speed: 1.7 },
    { x: 2740, y: 300, w: 85, h: 18, type: 'crumble', shrinking: true },
    { x: 2910, y: 380, w: 80, h: 18, type: 'fake', ghost: true },
    { x: 3070, y: 315, w: 80, h: 18, type: 'moving', axis: 'y', range: 55, speed: 1.9 },
    { x: 3240, y: 245, w: 80, h: 18, type: 'crumble' },
    { x: 3410, y: 335, w: 85, h: 18, type: 'moving', axis: 'x', range: 50, speed: 2.1 },
    { x: 3580, y: 410, w: 100, h: 18, type: 'solid' },
    { x: 3740, y: 445, w: 300, h: 65, type: 'solid' },
  ];

  const levelSevenMessages = [
    { x: 160, text: 'It is just a normal dark hallway.' },
    { x: 430, text: 'Did something move?' },
    { x: 720, text: 'DOUBLE JUMP. LAND ON ITS HEAD.' },
    { x: 1360, text: 'The floor feels suspiciously hollow.' },
    { x: 2000, text: 'Safe now. Probably. Parkour ahead.' },
  ];

  const levelEightPlatforms = [
    { x: 0, y: 470, w: 480, h: 40, type: 'solid' },
    { x: 530, y: 420, w: 110, h: 18, type: 'shifting', range: 34, speed: 1.7 },
    { x: 690, y: 345, w: 100, h: 18, type: 'moving', axis: 'x', range: 45, speed: 2.1 },
    { x: 850, y: 425, w: 100, h: 18, type: 'solid' },
    { x: 1010, y: 300, w: 95, h: 18, type: 'shifting', range: 42, speed: 2.4 },
    { x: 1170, y: 400, w: 260, h: 110, type: 'solid' },
    { x: 1480, y: 330, w: 95, h: 18, type: 'moving', axis: 'y', range: 65, speed: 2.2 },
    { x: 1640, y: 245, w: 90, h: 18, type: 'shifting', range: 48, speed: 2.55 },
    { x: 1790, y: 370, w: 100, h: 18, type: 'crumble' },
    { x: 1950, y: 440, w: 310, h: 70, type: 'solid' },
    { x: 1980, y: 55, w: 105, h: 18, type: 'solid', ceiling: true },
    { x: 2125, y: 105, w: 105, h: 18, type: 'solid', ceiling: true },
    { x: 2235, y: 45, w: 70, h: 18, type: 'solid', ceiling: true },
    { x: 2310, y: 350, w: 95, h: 18, type: 'moving', axis: 'x', range: 60, speed: 2.5 },
    { x: 2470, y: 260, w: 90, h: 18, type: 'fake' },
    { x: 2630, y: 360, w: 95, h: 18, type: 'shifting', range: 52, speed: 2.8 },
    { x: 2790, y: 430, w: 300, h: 80, type: 'solid' },
    { x: 3140, y: 340, w: 95, h: 18, type: 'moving', axis: 'y', range: 70, speed: 2.7 },
    { x: 3300, y: 245, w: 90, h: 18, type: 'orbit', rangeX: 62, rangeY: 42, speed: 3 },
    { x: 3460, y: 350, w: 95, h: 18, type: 'crumble' },
    { x: 3620, y: 420, w: 110, h: 18, type: 'moving', axis: 'x', range: 55, speed: 3.1 },
    { x: 3780, y: 445, w: 400, h: 65, type: 'solid' },
    // Lower safety route keeps every random event survivable.
    { x: 500, y: 470, w: 130, h: 14, type: 'solid' },
    { x: 650, y: 450, w: 135, h: 14, type: 'solid' },
    { x: 805, y: 465, w: 135, h: 14, type: 'solid' },
    { x: 1445, y: 455, w: 150, h: 14, type: 'solid' },
    { x: 1610, y: 430, w: 145, h: 14, type: 'solid' },
    { x: 2280, y: 455, w: 145, h: 14, type: 'solid' },
    { x: 2440, y: 425, w: 145, h: 14, type: 'solid' },
    { x: 3110, y: 455, w: 145, h: 14, type: 'solid' },
    { x: 3270, y: 425, w: 145, h: 14, type: 'solid' },
    { x: 3430, y: 455, w: 145, h: 14, type: 'solid' },
  ];

  const levelEightMessages = [
    { x: 140, text: 'WELCOME TO: WHAT THE HELL?' },
    { x: 900, text: 'The room changes its mind every three seconds.' },
    { x: 1900, text: 'The ceiling is the floor until the purple zone ends.' },
    { x: 2750, text: 'Portals preserve enough momentum to cause regret.' },
    { x: 3050, text: 'Final chaos. Probably.' },
  ];

  const levelPortals = {
    8: [
      { x: 1125, y: 330, w: 34, h: 140, targetX: 1510, targetY: 245, color: '#65d9ff', label: 'A' },
      { x: 1510, y: 220, w: 34, h: 150, targetX: 1170, targetY: 350, color: '#ff70d5', label: 'B' },
      { x: 2860, y: 275, w: 36, h: 155, targetX: 3180, targetY: 270, color: '#8dff72', label: 'C' },
      { x: 3180, y: 245, w: 36, h: 150, targetX: 2900, targetY: 330, color: '#ffb45f', label: 'D' },
    ],
    13: [
      { x: 3270, y: -330, w: 38, h: 115, targetX: 2945, targetY: -35, color: '#ff714f', label: 'BACK I' },
      { x: 3375, y: -720, w: 38, h: 120, targetX: 3070, targetY: -430, color: '#ff4f86', label: 'BACK II' },
      { x: 4435, y: 235, w: 38, h: 145, targetX: 4940, targetY: 235, color: '#6beaff', label: 'PAIN' },
      { x: 4940, y: 205, w: 38, h: 150, targetX: 4485, targetY: 280, color: '#ff5fcf', label: 'BACK' },
      { x: 3865, y: 55, w: 42, h: 120, targetX: 5925, targetY: 350, color: '#f7dd6c', label: 'SECRET', secret: true },
    ],
    20: [
      { x: 1560, y: 235, w: 38, h: 145, targetX: 2250, targetY: 350, color: '#68efff', label: 'FORWARD' },
      { x: 2290, y: 305, w: 38, h: 145, targetX: 1250, targetY: 270, color: '#ff6ca8', label: 'REFUND' },
      { x: 3890, y: 300, w: 38, h: 145, targetX: 4300, targetY: 270, color: '#80ff8e', label: 'GEAR' },
    ],
  };

  const levelGravityZones = {
    8: [{ x: 1950, y: 0, w: 330, h: 510 }],
  };

  const levelLavaZones = {
    13: [
      { x: 3300, y: 485, w: 3250, h: 70 },
      { x: 4110, y: 425, w: 265, h: 85 },
      { x: 5300, y: 440, w: 405, h: 70 },
    ],
    19: [{ x: 380, y: 485, w: 5630, h: 70 }],
    20: [{ x: 420, y: 490, w: 5630, h: 65 }],
    21: [{ x: 450, y: 492, w: 5560, h: 63 }],
  };

  const levelNinePlatforms = [
    { x: 0, y: 470, w: 4550, h: 40, type: 'solid' },
    { x: 520, y: 400, w: 160, h: 14, type: 'solid' },
    { x: 1120, y: 400, w: 160, h: 14, type: 'solid' },
    { x: 1720, y: 400, w: 160, h: 14, type: 'solid' },
    { x: 2320, y: 400, w: 160, h: 14, type: 'solid' },
    { x: 2920, y: 400, w: 160, h: 14, type: 'solid' },
    { x: 3820, y: 400, w: 220, h: 14, type: 'solid' },
  ];

  const levelNineMessages = [
    { x: 120, text: 'Answer YES or NO. This should be easy.' },
    { x: 3500, text: 'One last question. Surely nothing can go wrong.' },
  ];

  const levelTenPlatforms = [
    { x: 0, y: 470, w: 440, h: 40, type: 'solid' },
    { x: 475, y: 410, w: 125, h: 20, type: 'word', label: 'LISTEN', stage: 0, order: 0 },
    { x: 645, y: 345, w: 72, h: 20, type: 'word', label: 'TO', stage: 0, order: 1, axis: 'y', range: 18, speed: 1.25 },
    { x: 765, y: 285, w: 82, h: 20, type: 'word', label: 'ME', stage: 0, order: 2, endpoint: true },
    { x: 920, y: 385, w: 105, h: 20, type: 'word', label: 'MAKE', stage: 1, order: 0 },
    { x: 1070, y: 315, w: 82, h: 20, type: 'word', label: 'ME', stage: 1, order: 1, axis: 'x', range: 20, speed: 1.5 },
    { x: 1200, y: 245, w: 125, h: 20, type: 'word', label: 'SPEAK', stage: 1, order: 2, endpoint: true },
    { x: 1390, y: 365, w: 112, h: 20, type: 'word', label: "DON'T", stage: 2, order: 0, axis: 'y', range: 22, speed: 1.65 },
    { x: 1550, y: 290, w: 105, h: 20, type: 'word', label: 'FALL', stage: 2, order: 1 },
    { x: 1710, y: 385, w: 100, h: 20, type: 'word', label: 'NOW', stage: 2, order: 2, endpoint: true },
    { x: 1880, y: 315, w: 90, h: 20, type: 'word', label: 'THE', stage: 3, order: 0 },
    { x: 2015, y: 245, w: 105, h: 20, type: 'word', label: 'EXIT', stage: 3, order: 1, axis: 'x', range: 25, speed: 1.8 },
    { x: 2170, y: 340, w: 70, h: 20, type: 'word', label: 'IS', stage: 3, order: 2 },
    { x: 2280, y: 270, w: 145, h: 20, type: 'word', label: 'BEHIND', stage: 3, order: 3, axis: 'y', range: 26, speed: 1.95 },
    { x: 2480, y: 385, w: 95, h: 20, type: 'word', label: 'YOU', stage: 3, order: 4, endpoint: true },
    { x: 2610, y: 470, w: 490, h: 40, type: 'solid' },
  ];

  const levelTenMessages = [];

  const levelElevenPlatforms = [
    { x: 0, y: 470, w: 380, h: 40, type: 'solid' },
    { x: 430, y: 415, w: 270, h: 22, type: 'delayed', delay: 1.2 },
    { x: 760, y: 455, w: 100, h: 55, type: 'solid' },
    { x: 920, y: 385, w: 250, h: 22, type: 'delayed', delay: 1.05 },
    { x: 1230, y: 440, w: 100, h: 70, type: 'solid' },
    { x: 1390, y: 350, w: 220, h: 22, type: 'delayed', delay: .9 },
    { x: 1670, y: 425, w: 100, h: 85, type: 'solid' },
    { x: 1830, y: 390, w: 220, h: 22, type: 'delayed', delay: .75 },
    { x: 2110, y: 445, w: 100, h: 65, type: 'solid' },
    { x: 2270, y: 335, w: 230, h: 22, type: 'delayed', delay: .62 },
    { x: 2560, y: 470, w: 590, h: 40, type: 'solid' },
  ];
  const levelElevenMessages = [
    { x: 130, text: 'A patient platform waits until you trust it.' },
    { x: 900, text: 'That was only the first patient platform.' },
    { x: 1810, text: 'They are becoming less patient.' },
  ];

  const levelTwelvePlatforms = [{ x: 0, y: 470, w: 4200, h: 40, type: 'solid' }];
  const levelTwelveMessages = [
    { x: 120, text: 'Catch three checkpoints. They run away when chased.' },
    { x: 1800, text: 'Two more runaway checkpoints. Approach without moving.' },
  ];

  const reverseDoors = [
    { x: 800, y: 300, w: 75, h: 170 },
    { x: 1700, y: 250, w: 75, h: 220 },
    { x: 2600, y: 175, w: 75, h: 295 },
    { x: 3310, y: -1050, w: 75, h: 130 },
  ];

  const levelThirteenPlatforms = [
    { x: 0, y: 470, w: 3300, h: 40, type: 'solid' },
    { x: 675, y: 325, w: 300, h: 18, type: 'solid' },
    { x: 600, y: 390, w: 100, h: 16, type: 'moving', axis: 'x', range: 105, speed: 2.4, doorway: true },
    { x: 1575, y: 290, w: 300, h: 18, type: 'moving', axis: 'y', range: 28, speed: 1.5 },
    { x: 1500, y: 390, w: 100, h: 16, type: 'moving', axis: 'x', range: 105, speed: 2.7, doorway: true },
    { x: 2475, y: 335, w: 300, h: 18, type: 'solid' },
    { x: 2400, y: 390, w: 100, h: 16, type: 'moving', axis: 'x', range: 105, speed: 3, doorway: true },
    // Door 4 is at the top of a vertical obby with backward portal traps.
    { x: 2920, y: 380, w: 105, h: 18, type: 'moving', axis: 'x', range: 70, speed: 2.5 },
    { x: 3100, y: 300, w: 92, h: 18, type: 'crumble' },
    { x: 2870, y: 210, w: 88, h: 18, type: 'moving', axis: 'y', range: 52, speed: 2.7 },
    { x: 3200, y: 120, w: 86, h: 18, type: 'orbit', rangeX: 58, rangeY: 38, speed: 2.85 },
    { x: 2940, y: 25, w: 84, h: 18, type: 'solid', ghost: true },
    { x: 3240, y: -70, w: 82, h: 18, type: 'moving', axis: 'x', range: 72, speed: 3 },
    { x: 3000, y: -165, w: 82, h: 18, type: 'solid', shrinking: true },
    { x: 3300, y: -260, w: 80, h: 18, type: 'moving', axis: 'y', range: 62, speed: 3.15 },
    { x: 3060, y: -355, w: 80, h: 18, type: 'orbit', rangeX: 68, rangeY: 44, speed: 3.25 },
    { x: 3350, y: -450, w: 78, h: 18, type: 'crumble' },
    { x: 3100, y: -545, w: 78, h: 18, type: 'moving', axis: 'x', range: 76, speed: 3.35 },
    { x: 3380, y: -640, w: 76, h: 18, type: 'solid', ghost: true },
    { x: 3140, y: -735, w: 76, h: 18, type: 'orbit', rangeX: 72, rangeY: 48, speed: 3.45 },
    { x: 3400, y: -830, w: 76, h: 18, type: 'moving', axis: 'y', range: 68, speed: 3.55 },
    { x: 3150, y: -920, w: 420, h: 30, type: 'solid', conveyor: -260 },
    // The deliberately excessive route unlocked by the fourth reverse door.
    { x: 3160, y: 410, w: 170, h: 100, type: 'solid' },
    { x: 3400, y: 335, w: 96, h: 18, type: 'moving', axis: 'x', range: 82, speed: 2.7 },
    { x: 3580, y: 250, w: 90, h: 18, type: 'crumble' },
    { x: 3750, y: 410, w: 190, h: 100, type: 'solid', conveyor: 440 },
    { x: 4020, y: 300, w: 86, h: 18, type: 'orbit', rangeX: 72, rangeY: 58, speed: 2.9 },
    { x: 4210, y: 205, w: 84, h: 18, type: 'moving', axis: 'y', range: 78, speed: 3.05 },
    { x: 4390, y: 380, w: 160, h: 130, type: 'solid' },
    { x: 4620, y: 285, w: 82, h: 18, type: 'solid', ghost: true },
    { x: 4790, y: 195, w: 78, h: 18, type: 'solid', shrinking: true },
    { x: 4960, y: 330, w: 82, h: 18, type: 'moving', axis: 'y', range: 88, speed: 3.2 },
    { x: 5130, y: 430, w: 155, h: 80, type: 'solid' },
    { x: 5360, y: 320, w: 82, h: 18, type: 'moving', axis: 'x', range: 94, speed: 3.35 },
    { x: 5540, y: 225, w: 80, h: 18, type: 'orbit', rangeX: 82, rangeY: 64, speed: 3.5 },
    { x: 5730, y: 355, w: 82, h: 18, type: 'moving', axis: 'y', range: 76, speed: 3.6 },
    { x: 5910, y: 420, w: 150, h: 90, type: 'solid', conveyor: -480 },
    { x: 6130, y: 300, w: 88, h: 18, type: 'moving', axis: 'x', range: 86, speed: 3.7 },
    { x: 6290, y: 470, w: 260, h: 40, type: 'solid' },
  ];
  const levelThirteenSpikes = [
    { x: 3210, y: 386, w: 54, h: 24 },
    { x: 4430, y: 356, w: 45, h: 24 },
    { x: 4475, y: 356, w: 45, h: 24 },
    { x: 5165, y: 406, w: 42, h: 24 },
    { x: 5970, y: 396, w: 48, h: 24 },
    { x: 3120, y: 276, w: 42, h: 24 },
    { x: 3362, y: -474, w: 42, h: 24 },
    { x: 3180, y: -944, w: 48, h: 24 },
  ];
  const levelThirteenMessages = [
    { x: 120, text: 'The door only respects a dramatic entrance.' },
    { x: 500, text: 'Ride a doorway platform through, then enter each door backward.' },
    { x: 650, text: 'Jump over every door, then enter it from behind.' },
    { x: 1450, text: 'The next door also demands a dramatic entrance.' },
    { x: 2350, text: 'Door 3 is taller now. Enter it backward from any height.' },
    { x: 2800, text: 'THREE DOORS SOLVED. DOOR 4 IS AT THE TOP OF THE TOWER.' },
    { x: 3050, text: 'THE PORTALS IN THIS TOWER SEND YOU BACKWARD.' },
    { x: 3500, text: 'Lava below. Portals ahead. Regret everywhere.' },
    { x: 4550, text: 'The ghost platform remembers where it used to be.' },
    { x: 5250, text: 'This is the last impossible chain. Probably.' },
    { x: 6150, text: 'You really did all of that parkour.' },
  ];

  const levelFourteenPlatforms = [{ x: 0, y: 470, w: 1900, h: 40, type: 'solid' }];
  const levelFourteenMessages = [{ x: 120, text: 'The next room may take a moment to load.' }];

  const levelFifteenPlatforms = [
    { x: 0, y: 470, w: 1800, h: 40, type: 'solid' },
    { x: 1320, y: 405, w: 105, h: 18, type: 'solid' },
    { x: 1480, y: 350, w: 105, h: 18, type: 'solid' },
    { x: 1840, y: 405, w: 105, h: 18, type: 'moving', axis: 'y', range: 48, speed: 2.3 },
    { x: 2010, y: 325, w: 95, h: 18, type: 'crumble' },
    { x: 2170, y: 420, w: 175, h: 90, type: 'solid', conveyor: 280 },
    { x: 2410, y: 335, w: 92, h: 18, type: 'moving', axis: 'x', range: 68, speed: 2.65 },
    { x: 2580, y: 250, w: 86, h: 18, type: 'orbit', rangeX: 55, rangeY: 42, speed: 2.8 },
    { x: 2750, y: 385, w: 88, h: 18, type: 'solid', ghost: true },
    { x: 2915, y: 455, w: 170, h: 55, type: 'solid' },
    { x: 3150, y: 365, w: 88, h: 18, type: 'solid', shrinking: true },
    { x: 3320, y: 275, w: 84, h: 18, type: 'moving', axis: 'y', range: 70, speed: 3.05 },
    { x: 3490, y: 390, w: 88, h: 18, type: 'crumble' },
    { x: 3660, y: 310, w: 84, h: 18, type: 'moving', axis: 'x', range: 72, speed: 3.2 },
    { x: 3835, y: 430, w: 390, h: 80, type: 'solid', conveyor: -190 },
  ];
  const levelFifteenMessages = [
    { x: 120, text: 'Please obey all button safety instructions.' },
    { x: 1280, text: 'You pressed the devil button. The factory has noticed.' },
    { x: 1820, text: 'RUN. The wall accelerates every second.' },
    { x: 2750, text: 'Ghost platform. Keep moving even when it disappears.' },
    { x: 3450, text: 'Final assembly line. The wall is still behind you.' },
  ];

  const levelSixteenPlatforms = [
    { x: 0, y: 470, w: 420, h: 40, type: 'solid' },
    { x: 475, y: 410, w: 120, h: 18, type: 'moving', axis: 'y', range: 52, speed: 1.7 },
    { x: 650, y: 330, w: 105, h: 18, type: 'moving', axis: 'x', range: 55, speed: 1.95 },
    { x: 815, y: 430, w: 175, h: 80, type: 'solid' },
    { x: 1040, y: 350, w: 100, h: 18, type: 'moving', axis: 'y', range: 72, speed: 2.05, traffic: true },
    { x: 1195, y: 270, w: 92, h: 18, type: 'moving', axis: 'x', range: 62, speed: 2.2, traffic: true },
    { x: 1350, y: 390, w: 165, h: 120, type: 'solid' },
    { x: 1570, y: 315, w: 92, h: 18, type: 'moving', axis: 'x', range: 70, speed: 2.35 },
    { x: 1735, y: 235, w: 88, h: 18, type: 'moving', axis: 'y', range: 78, speed: 2.45 },
    { x: 1885, y: 410, w: 180, h: 100, type: 'solid' },
    { x: 2130, y: 340, w: 88, h: 18, type: 'moving', axis: 'y', range: 82, speed: 2.55, traffic: true },
    { x: 2285, y: 255, w: 84, h: 18, type: 'moving', axis: 'x', range: 72, speed: 2.65, traffic: true },
    { x: 2435, y: 365, w: 82, h: 18, type: 'moving', axis: 'y', range: 66, speed: 2.8, traffic: true },
    { x: 2585, y: 450, w: 165, h: 60, type: 'solid' },
    { x: 2810, y: 365, w: 90, h: 18, type: 'moving', axis: 'x', range: 78, speed: 2.9 },
    { x: 2980, y: 285, w: 88, h: 18, type: 'moving', axis: 'y', range: 62, speed: 3.05 },
    { x: 3150, y: 470, w: 230, h: 40, type: 'solid' },
    // The fake win screen waits until this entire second parkour course is complete.
    { x: 3440, y: 395, w: 92, h: 18, type: 'moving', axis: 'x', range: 82, speed: 2.75 },
    { x: 3620, y: 305, w: 88, h: 18, type: 'moving', axis: 'y', range: 76, speed: 2.9 },
    { x: 3795, y: 215, w: 84, h: 18, type: 'moving', axis: 'x', range: 88, speed: 3.05 },
    { x: 3965, y: 365, w: 180, h: 145, type: 'solid' },
    { x: 4210, y: 280, w: 86, h: 18, type: 'moving', axis: 'y', range: 84, speed: 3.15 },
    { x: 4380, y: 190, w: 82, h: 18, type: 'moving', axis: 'x', range: 92, speed: 3.25 },
    { x: 4545, y: 315, w: 86, h: 18, type: 'moving', axis: 'y', range: 88, speed: 3.35 },
    { x: 4720, y: 440, w: 180, h: 70, type: 'solid', conveyor: 540 },
    { x: 4960, y: 360, w: 88, h: 18, type: 'moving', axis: 'x', range: 96, speed: 3.4, assembly: true },
    { x: 5135, y: 265, w: 84, h: 18, type: 'moving', axis: 'y', range: 80, speed: 3.5, assembly: true },
    { x: 5305, y: 380, w: 90, h: 18, type: 'moving', axis: 'x', range: 86, speed: 3.6, assembly: true },
    { x: 5470, y: 470, w: 250, h: 40, type: 'solid' },
  ];
  const levelSixteenMessages = [
    { x: 120, text: 'One final, completely genuine moving-platform obby.' },
    { x: 920, text: 'Jump upward through the moving platforms.' },
    { x: 1800, text: 'The ladder is safer. That is suspicious.' },
    { x: 2600, text: 'Three jumps. No excuses.' },
    { x: 3250, text: 'That was only the first half.' },
    { x: 4050, text: 'Climb, jump through, then change direction in midair.' },
    { x: 4750, text: 'The fake victory screen is after the parkour. Keep going.' },
    { x: 5350, text: 'Now you have actually reached the fake ending.' },
  ];

  const levelSeventeenPlatforms = [
    { cx: 250, cy: 430, radius: 155, x: 95, y: 275, w: 310, h: 310, type: 'solid', planet: true, planetHue: 188, planetGravity: .72, gravityLabel: 'START' },
    { cx: 650, cy: 115, radius: 112, x: 538, y: 3, w: 224, h: 224, type: 'solid', planet: true, planetHue: 318, planetGravity: .84, gravityLabel: 'PINK' },
    { cx: 1040, cy: -210, radius: 138, x: 902, y: -348, w: 276, h: 276, type: 'solid', planet: true, planetHue: 42, planetGravity: 1.05, gravityLabel: 'HEAVY' },
    { cx: 600, cy: -545, radius: 98, x: 502, y: -643, w: 196, h: 196, type: 'solid', planet: true, planetHue: 268, planetGravity: .62, gravityLabel: 'TINY' },
    { cx: 225, cy: -865, radius: 126, x: 99, y: -991, w: 252, h: 252, type: 'solid', planet: true, planetHue: 142, planetGravity: .78, gravityLabel: 'GREEN' },
    { cx: 735, cy: -1195, radius: 112, x: 623, y: -1307, w: 224, h: 224, type: 'solid', planet: true, planetHue: 14, planetGravity: 1.12, gravityLabel: 'CRUSHING' },
    { cx: 1170, cy: -1540, radius: 145, x: 1025, y: -1685, w: 290, h: 290, type: 'solid', planet: true, planetHue: 205, planetGravity: .68, gravityLabel: 'ICE' },
    { cx: 700, cy: -1905, radius: 102, x: 598, y: -2007, w: 204, h: 204, type: 'solid', planet: true, planetHue: 286, planetGravity: .58, gravityLabel: 'MOON' },
    { cx: 285, cy: -2240, radius: 132, x: 153, y: -2372, w: 264, h: 264, type: 'solid', planet: true, planetHue: 58, planetGravity: .92, gravityLabel: 'GOLD' },
    { cx: 820, cy: -2585, radius: 116, x: 704, y: -2701, w: 232, h: 232, type: 'solid', planet: true, planetHue: 340, planetGravity: 1.18, gravityLabel: 'RAGE' },
    { cx: 1190, cy: -2925, radius: 165, x: 1025, y: -3090, w: 330, h: 330, type: 'solid', planet: true, planetHue: 165, planetGravity: .75, gravityLabel: 'EXIT', exitPlanet: true },
  ];
  const levelSeventeenCheckpoints = [
    { planetIndex: 3, reached: false, respawnX: 600, respawnY: -680 },
    { planetIndex: 6, reached: false, respawnX: 1170, respawnY: -1720 },
    { planetIndex: 8, reached: false, respawnX: 285, respawnY: -2410 },
  ];
  const levelSeventeenMessages = [
    { planetIndex: 0, text: 'PLANET PARTY: WALK AROUND THE WHOLE PLANET. YES, EVEN UNDER IT.' },
    { planetIndex: 2, text: 'Each world has its own gravity and shrinks while you stand on it.' },
    { planetIndex: 4, text: 'Launch from the planet’s upper edge. You still have midair jumps.' },
    { planetIndex: 7, text: 'The small planets shrink fastest. Do not throw a party forever.' },
    { planetIndex: 9, text: 'One last jump to the EXIT PLANET.' },
  ];

  const levelEighteenPlatforms = [
    { x: 0, y: 470, w: 5800, h: 40, type: 'solid', conveyor: 62 },
    { x: 520, y: 405, w: 115, h: 18, type: 'solid' },
    { x: 1510, y: 405, w: 115, h: 18, type: 'solid' },
    { x: 2500, y: 405, w: 115, h: 18, type: 'solid' },
    { x: 3490, y: 405, w: 115, h: 18, type: 'solid' },
    { x: 4480, y: 405, w: 115, h: 18, type: 'solid' },
  ];
  const levelEighteenMessages = [
    { x: 110, text: 'ASSEMBLY LINE: WATCH EACH MACHINE, THEN COPY ITS MOVEMENTS.' },
    { x: 1250, text: 'Wrong movement means the machine demonstrates again.' },
    { x: 3200, text: 'The last robot has a five-move inspection sequence.' },
    { x: 4300, text: 'Bonus inspection: six moves, less time, no union representative.' },
  ];

  const assemblyStations = [
    { x: 650, gateX: 1120, sequence: ['JUMP', 'RIGHT', 'LEFT'] },
    { x: 1640, gateX: 2110, sequence: ['LEFT', 'JUMP', 'RIGHT', 'JUMP'] },
    { x: 2630, gateX: 3100, sequence: ['RIGHT', 'LEFT', 'RIGHT', 'JUMP'] },
    { x: 3620, gateX: 4180, sequence: ['JUMP', 'LEFT', 'RIGHT', 'LEFT', 'JUMP'] },
    { x: 4610, gateX: 5220, sequence: ['RIGHT', 'JUMP', 'LEFT', 'RIGHT', 'LEFT', 'JUMP'] },
  ];

  const levelNineteenPlatforms = [
    { x: 0, y: 470, w: 380, h: 40, type: 'solid' },
    { x: 450, y: 390, w: 105, h: 18, type: 'moving', axis: 'y', range: 55, speed: 2.25 },
    { x: 620, y: 300, w: 92, h: 18, type: 'crumble' },
    { x: 785, y: 410, w: 150, h: 100, type: 'solid' },
    { x: 1000, y: 320, w: 88, h: 18, type: 'orbit', rangeX: 62, rangeY: 46, speed: 2.65 },
    { x: 1170, y: 235, w: 84, h: 18, type: 'moving', axis: 'x', range: 65, speed: 2.75 },
    { x: 1340, y: 390, w: 155, h: 120, type: 'solid' },
    { x: 1560, y: 305, w: 86, h: 18, type: 'solid', ghost: true },
    { x: 1730, y: 220, w: 82, h: 18, type: 'moving', axis: 'y', range: 72, speed: 2.95 },
    { x: 1900, y: 365, w: 84, h: 18, type: 'crumble' },
    { x: 2070, y: 450, w: 175, h: 60, type: 'solid', conveyor: 350 },
    { x: 2310, y: 350, w: 84, h: 18, type: 'orbit', rangeX: 70, rangeY: 55, speed: 3.15 },
    { x: 2490, y: 260, w: 80, h: 18, type: 'solid', shrinking: true },
    { x: 2660, y: 390, w: 82, h: 18, type: 'moving', axis: 'x', range: 78, speed: 3.25 },
    { x: 2840, y: 430, w: 170, h: 80, type: 'solid' },
    { x: 3070, y: 335, w: 82, h: 18, type: 'moving', axis: 'y', range: 82, speed: 3.35 },
    { x: 3250, y: 245, w: 78, h: 18, type: 'crumble' },
    { x: 3430, y: 375, w: 80, h: 18, type: 'solid', ghost: true },
    { x: 3610, y: 285, w: 80, h: 18, type: 'orbit', rangeX: 75, rangeY: 58, speed: 3.5 },
    { x: 3790, y: 440, w: 180, h: 70, type: 'solid', conveyor: -380 },
    { x: 4040, y: 340, w: 80, h: 18, type: 'moving', axis: 'x', range: 84, speed: 3.6 },
    { x: 4220, y: 250, w: 78, h: 18, type: 'solid', shrinking: true },
    { x: 4400, y: 365, w: 80, h: 18, type: 'crumble' },
    { x: 4580, y: 470, w: 420, h: 40, type: 'solid' },
    { x: 5060, y: 385, w: 82, h: 18, type: 'moving', axis: 'y', range: 86, speed: 3.75 },
    { x: 5240, y: 285, w: 78, h: 18, type: 'orbit', rangeX: 82, rangeY: 64, speed: 3.9 },
    { x: 5425, y: 430, w: 165, h: 80, type: 'solid', conveyor: 410 },
    { x: 5660, y: 330, w: 76, h: 18, type: 'solid', ghost: true },
    { x: 5835, y: 235, w: 74, h: 18, type: 'moving', axis: 'x', range: 88, speed: 4.05 },
    { x: 6010, y: 470, w: 310, h: 40, type: 'solid' },
  ];
  const levelNineteenMessages = [
    { x: 110, text: 'FACTORY FLOOR 2: THE FURNACE WALK.' },
    { x: 950, text: 'Steam vents alternate. Watch before jumping.' },
    { x: 2250, text: 'The floor is lava because the budget said so.' },
    { x: 3800, text: 'The furnace gets faster near the end.' },
    { x: 5000, text: 'BONUS FURNACE: tighter steam cycles and a hotter conveyor.' },
  ];

  const levelTwentyPlatforms = [
    { x: 0, y: 470, w: 420, h: 40, type: 'solid' },
    { x: 500, y: 385, w: 92, h: 18, type: 'orbit', rangeX: 65, rangeY: 48, speed: 2.2 },
    { x: 690, y: 290, w: 86, h: 18, type: 'orbit', rangeX: 72, rangeY: 55, speed: 2.45 },
    { x: 880, y: 400, w: 155, h: 110, type: 'solid' },
    { x: 1100, y: 305, w: 84, h: 18, type: 'orbit', rangeX: 78, rangeY: 60, speed: 2.7 },
    { x: 1300, y: 215, w: 80, h: 18, type: 'orbit', rangeX: 82, rangeY: 62, speed: 2.9 },
    { x: 1500, y: 380, w: 150, h: 130, type: 'solid', conveyor: 300 },
    { x: 1715, y: 290, w: 82, h: 18, type: 'moving', axis: 'y', range: 68, speed: 3 },
    { x: 1890, y: 205, w: 78, h: 18, type: 'solid', ghost: true },
    { x: 2065, y: 365, w: 82, h: 18, type: 'orbit', rangeX: 88, rangeY: 66, speed: 3.1 },
    { x: 2250, y: 450, w: 175, h: 60, type: 'solid' },
    { x: 2490, y: 340, w: 80, h: 18, type: 'orbit', rangeX: 92, rangeY: 68, speed: 3.2 },
    { x: 2680, y: 245, w: 76, h: 18, type: 'crumble' },
    { x: 2860, y: 375, w: 78, h: 18, type: 'orbit', rangeX: 95, rangeY: 72, speed: 3.35 },
    { x: 3050, y: 420, w: 170, h: 90, type: 'solid', conveyor: -330 },
    { x: 3290, y: 320, w: 78, h: 18, type: 'solid', shrinking: true },
    { x: 3470, y: 230, w: 76, h: 18, type: 'orbit', rangeX: 98, rangeY: 74, speed: 3.5 },
    { x: 3660, y: 365, w: 76, h: 18, type: 'moving', axis: 'x', range: 90, speed: 3.6 },
    { x: 3850, y: 445, w: 180, h: 65, type: 'solid' },
    { x: 4090, y: 340, w: 76, h: 18, type: 'orbit', rangeX: 100, rangeY: 76, speed: 3.7 },
    { x: 4290, y: 245, w: 74, h: 18, type: 'solid', ghost: true },
    { x: 4480, y: 365, w: 76, h: 18, type: 'orbit', rangeX: 102, rangeY: 78, speed: 3.8 },
    { x: 4690, y: 470, w: 500, h: 40, type: 'solid' },
    { x: 5260, y: 365, w: 74, h: 18, type: 'orbit', rangeX: 104, rangeY: 80, speed: 3.95 },
    { x: 5450, y: 265, w: 72, h: 18, type: 'orbit', rangeX: 108, rangeY: 82, speed: 4.1 },
    { x: 5640, y: 405, w: 155, h: 105, type: 'solid', conveyor: 360 },
    { x: 5860, y: 300, w: 70, h: 18, type: 'solid', ghost: true },
    { x: 6050, y: 470, w: 330, h: 40, type: 'solid' },
  ];
  const levelTwentyMessages = [
    { x: 110, text: 'FACTORY FLOOR 3: GEARBOX. EVERY PLATFORM ORBITS.' },
    { x: 1450, text: 'The blue portal advances. The pink one refunds progress.' },
    { x: 3000, text: 'These gears are moving faster now.' },
    { x: 4400, text: 'One last invisible gear. Trust its outline.' },
    { x: 5200, text: 'OVERCLOCKED GEARBOX: the last gears have no patience.' },
  ];

  const levelTwentyOnePlatforms = [
    { x: 0, y: 470, w: 450, h: 40, type: 'solid' },
    { x: 520, y: 390, w: 100, h: 18, type: 'moving', axis: 'y', range: 62, speed: 2.35 },
    { x: 690, y: 300, w: 92, h: 18, type: 'solid', conveyor: 280 },
    { x: 860, y: 210, w: 86, h: 18, type: 'crumble' },
    { x: 1030, y: 380, w: 165, h: 130, type: 'solid' },
    { x: 1260, y: 285, w: 88, h: 18, type: 'moving', axis: 'x', range: 72, speed: 2.75 },
    { x: 1435, y: 195, w: 82, h: 18, type: 'orbit', rangeX: 65, rangeY: 50, speed: 2.9 },
    { x: 1610, y: 355, w: 88, h: 18, type: 'solid', ghost: true },
    { x: 1790, y: 440, w: 180, h: 70, type: 'solid' },
    { x: 2030, y: 340, w: 86, h: 18, type: 'moving', axis: 'y', range: 78, speed: 3.05 },
    { x: 2210, y: 245, w: 82, h: 18, type: 'solid', shrinking: true },
    { x: 2390, y: 380, w: 84, h: 18, type: 'crumble' },
    { x: 2570, y: 285, w: 82, h: 18, type: 'moving', axis: 'x', range: 82, speed: 3.2 },
    { x: 2750, y: 430, w: 180, h: 80, type: 'solid', conveyor: -340 },
    { x: 2990, y: 330, w: 82, h: 18, type: 'orbit', rangeX: 76, rangeY: 58, speed: 3.35 },
    { x: 3170, y: 235, w: 78, h: 18, type: 'moving', axis: 'y', range: 82, speed: 3.45 },
    { x: 3350, y: 370, w: 80, h: 18, type: 'solid', ghost: true },
    { x: 3530, y: 450, w: 175, h: 60, type: 'solid' },
    { x: 3770, y: 350, w: 80, h: 18, type: 'moving', axis: 'x', range: 88, speed: 3.55 },
    { x: 3950, y: 255, w: 76, h: 18, type: 'crumble' },
    { x: 4130, y: 380, w: 78, h: 18, type: 'solid', shrinking: true },
    { x: 4310, y: 290, w: 78, h: 18, type: 'orbit', rangeX: 82, rangeY: 62, speed: 3.7 },
    { x: 4500, y: 470, w: 500, h: 40, type: 'solid' },
    { x: 5070, y: 365, w: 78, h: 18, type: 'moving', axis: 'y', range: 88, speed: 3.85 },
    { x: 5240, y: 270, w: 74, h: 18, type: 'orbit', rangeX: 86, rangeY: 64, speed: 4 },
    { x: 5420, y: 420, w: 165, h: 90, type: 'solid', conveyor: -390 },
    { x: 5650, y: 320, w: 72, h: 18, type: 'crumble' },
    { x: 5830, y: 235, w: 70, h: 18, type: 'moving', axis: 'x', range: 92, speed: 4.15 },
    { x: 6010, y: 470, w: 300, h: 40, type: 'solid' },
  ];
  const levelTwentyOneMessages = [
    { x: 110, text: 'FACTORY FLOOR 4: STEAMWORKS.' },
    { x: 900, text: 'Hold E on the yellow ladders. Do not inhale the steam.' },
    { x: 2350, text: 'The vents fire in a repeating rhythm.' },
    { x: 3900, text: 'Pipe pressure critical. Conveniently, so are you.' },
    { x: 5000, text: 'MASTER PRESSURE LINE: find Valve D before the exit unlocks.' },
  ];

  const levelTwentyTwoPlatforms = [
    { x: 0, y: 470, w: 520, h: 40, type: 'solid' },
    { x: 570, y: 390, w: 100, h: 18, type: 'moving', axis: 'x', range: 55, speed: 2.4, assembly: true },
    { x: 760, y: 305, w: 92, h: 18, type: 'crumble' },
    { x: 950, y: 220, w: 88, h: 18, type: 'orbit', rangeX: 62, rangeY: 45, speed: 2.7 },
    { x: 740, y: 125, w: 86, h: 18, type: 'moving', axis: 'y', range: 48, speed: 2.85 },
    { x: 520, y: 30, w: 84, h: 18, type: 'solid', ghost: true },
    { x: 750, y: -65, w: 82, h: 18, type: 'moving', axis: 'x', range: 72, speed: 3 },
    { x: 980, y: -160, w: 80, h: 18, type: 'solid', shrinking: true },
    { x: 760, y: -255, w: 80, h: 18, type: 'orbit', rangeX: 68, rangeY: 48, speed: 3.15 },
    { x: 530, y: -350, w: 78, h: 18, type: 'crumble' },
    { x: 760, y: -445, w: 78, h: 18, type: 'moving', axis: 'y', range: 58, speed: 3.3 },
    { x: 1000, y: -540, w: 76, h: 18, type: 'solid', ghost: true },
    { x: 780, y: -635, w: 76, h: 18, type: 'orbit', rangeX: 74, rangeY: 52, speed: 3.45 },
    { x: 550, y: -730, w: 74, h: 18, type: 'moving', axis: 'x', range: 78, speed: 3.55 },
    { x: 790, y: -825, w: 74, h: 18, type: 'crumble' },
    { x: 1030, y: -920, w: 72, h: 18, type: 'moving', axis: 'y', range: 62, speed: 3.7 },
    { x: 810, y: -1015, w: 72, h: 18, type: 'solid', shrinking: true },
    { x: 590, y: -1110, w: 72, h: 18, type: 'orbit', rangeX: 82, rangeY: 58, speed: 3.85 },
    { x: 800, y: -1210, w: 420, h: 30, type: 'solid', conveyor: -220 },
    // A difficult backup route keeps the tower possible if a crumble block breaks.
    { x: 450, y: 345, w: 70, h: 15, type: 'moving', axis: 'y', range: 28, speed: 2.8 },
    { x: 590, y: 175, w: 68, h: 15, type: 'solid' },
    { x: 630, y: -15, w: 66, h: 15, type: 'moving', axis: 'x', range: 38, speed: 3.1 },
    { x: 850, y: -205, w: 64, h: 15, type: 'solid' },
    { x: 640, y: -395, w: 62, h: 15, type: 'moving', axis: 'y', range: 34, speed: 3.35 },
    { x: 870, y: -585, w: 60, h: 15, type: 'solid' },
    { x: 650, y: -775, w: 60, h: 15, type: 'moving', axis: 'x', range: 44, speed: 3.6 },
    { x: 880, y: -965, w: 58, h: 15, type: 'solid' },
    { x: 690, y: -1150, w: 70, h: 15, type: 'moving', axis: 'y', range: 36, speed: 3.8 },
    { x: 1040, y: -1305, w: 70, h: 18, type: 'moving', axis: 'x', range: 82, speed: 3.95 },
    { x: 820, y: -1400, w: 68, h: 18, type: 'orbit', rangeX: 86, rangeY: 58, speed: 4.05 },
    { x: 590, y: -1495, w: 66, h: 18, type: 'solid', ghost: true },
    { x: 820, y: -1595, w: 430, h: 30, type: 'solid', conveyor: 250 },
    { x: 720, y: -1345, w: 60, h: 15, type: 'solid' },
    { x: 930, y: -1535, w: 58, h: 15, type: 'moving', axis: 'y', range: 40, speed: 4.1 },
  ];
  const levelTwentyTwoMessages = [
    { x: 110, text: 'FACTORY FLOOR 5: THE NIGHT-SHIFT TOWER.' },
    { x: 500, text: 'Climb before the machinery finishes its cycle.' },
    { x: 850, text: 'Every broken platform has a harder backup route.' },
    { x: 1050, text: 'TOP FLOOR: CLOCK OUT THROUGH THE GOLD DOOR.' },
    { x: 1180, text: 'Management added another floor while you were climbing.' },
  ];

  const levelTwentyThreePlatforms = [];
  const levelTwentyThreeMessages = [
    { x: 120, text: 'STARSHIP SHIFT: TAP SPACE, UP, OR JUMP TO FLAP. THE SHIP FLIES FORWARD.' },
    { x: 1750, text: 'The asteroid field moves. The warning lights do not.' },
    { x: 3700, text: 'Halfway through space. The factory forgot to install brakes.' },
    { x: 5550, text: 'Final docking tunnel. Do not scratch the company spaceship.' },
    { x: 6500, text: 'EXTENDED DOCKING RUN: collect a boost ring or fly very carefully.' },
  ];

  const spaceshipObstacleLayout = [
    { type: 'gate', x: 720, w: 90, gapY: 115, gapH: 190 },
    { type: 'ring', x: 980, y: 205, radius: 34 },
    { type: 'asteroid', x: 1180, y: 320, radius: 48, drift: 65, speed: 1.5, phase: .4 },
    { type: 'gate', x: 1580, w: 100, gapY: 245, gapH: 175 },
    { type: 'asteroid', x: 2020, y: 165, radius: 54, drift: 82, speed: 1.8, phase: 2.1 },
    { type: 'gate', x: 2440, w: 105, gapY: 85, gapH: 170 },
    { type: 'asteroid', x: 2860, y: 330, radius: 58, drift: 72, speed: 2.1, phase: 4.3 },
    { type: 'ring', x: 3090, y: 165, radius: 34 },
    { type: 'gate', x: 3290, w: 110, gapY: 220, gapH: 155 },
    { type: 'asteroid', x: 3710, y: 175, radius: 60, drift: 95, speed: 2.25, phase: 1.2 },
    { type: 'gate', x: 4150, w: 115, gapY: 105, gapH: 150 },
    { type: 'asteroid', x: 4590, y: 310, radius: 62, drift: 92, speed: 2.5, phase: 3.4 },
    { type: 'gate', x: 5050, w: 120, gapY: 235, gapH: 145 },
    { type: 'asteroid', x: 5480, y: 170, radius: 66, drift: 105, speed: 2.7, phase: 5.1 },
    { type: 'gate', x: 5880, w: 125, gapY: 145, gapH: 155 },
    { type: 'asteroid', x: 6280, y: 325, radius: 68, drift: 112, speed: 2.85, phase: .8 },
    { type: 'ring', x: 6510, y: 205, radius: 32 },
    { type: 'gate', x: 6760, w: 130, gapY: 250, gapH: 150 },
    { type: 'asteroid', x: 7120, y: 150, radius: 70, drift: 118, speed: 3, phase: 2.7 },
    { type: 'gate', x: 7420, w: 135, gapY: 105, gapH: 150 },
  ];

  const levelFactoryHazards = {
    19: [
      { type: 'steam', x: 900, y: 250, w: 60, h: 220, speed: 1.8, phase: 0 },
      { type: 'steam', x: 1810, y: 230, w: 62, h: 240, speed: 2, phase: 2.1 },
      { type: 'steam', x: 2760, y: 235, w: 62, h: 235, speed: 2.2, phase: 4.2 },
      { type: 'steam', x: 3960, y: 220, w: 66, h: 250, speed: 2.35, phase: 1.1 },
      { type: 'steam', x: 5190, y: 210, w: 66, h: 260, speed: 2.55, phase: 3 },
      { type: 'steam', x: 5750, y: 205, w: 68, h: 265, speed: 2.7, phase: 5 },
    ],
    21: [
      { type: 'steam', x: 1110, y: 215, w: 64, h: 255, speed: 1.8, phase: .5 },
      { type: 'steam', x: 1880, y: 220, w: 62, h: 250, speed: 2, phase: 2.4 },
      { type: 'steam', x: 2810, y: 200, w: 66, h: 270, speed: 2.2, phase: 4.4 },
      { type: 'steam', x: 3600, y: 220, w: 62, h: 250, speed: 2.4, phase: 1.5 },
      { type: 'steam', x: 4410, y: 205, w: 68, h: 265, speed: 2.55, phase: 3.5 },
      { type: 'steam', x: 5140, y: 200, w: 68, h: 270, speed: 2.7, phase: .9 },
      { type: 'steam', x: 5740, y: 195, w: 70, h: 275, speed: 2.85, phase: 4.8 },
    ],
    22: [
      { type: 'steam', x: 870, y: 215, w: 62, h: 255, speed: 2.1, phase: .5 },
      { type: 'steam', x: 610, y: -390, w: 62, h: 230, speed: 2.35, phase: 2.7 },
      { type: 'steam', x: 930, y: -970, w: 62, h: 240, speed: 2.6, phase: 4.6 },
    ],
  };

  // Extra routes thicken every existing parkour section without bypassing its core puzzle.
  const levelBonusPlatforms = {
    1: [
      { x: 1120, y: 205, w: 68, h: 15, type: 'orbit', rangeX: 48, rangeY: 34, speed: 2.45 },
      { x: 2470, y: 210, w: 64, h: 15, type: 'moving', axis: 'x', range: 62, speed: 2.8 },
      { x: 3710, y: 190, w: 62, h: 15, type: 'solid', ghost: true },
    ],
    2: [
      { x: 2320, y: 250, w: 72, h: 15, type: 'moving', axis: 'x', range: 56, speed: 2.55, musical: 2 },
      { x: 3050, y: 235, w: 68, h: 15, type: 'orbit', rangeX: 50, rangeY: 36, speed: 2.8 },
    ],
    3: [
      { x: 1200, y: -300, w: 58, h: 15, type: 'orbit', rangeX: 54, rangeY: 36, speed: 3 },
      { x: 400, y: -690, w: 56, h: 15, type: 'moving', axis: 'y', range: 42, speed: 3.15 },
      { x: 1220, y: -1085, w: 54, h: 15, type: 'solid', ghost: true },
    ],
    4: [
      { x: 910, y: 285, w: 72, h: 16, type: 'copycat', range: 72 },
      { x: 2240, y: 265, w: 68, h: 16, type: 'moving', axis: 'y', range: 48, speed: 2.65 },
    ],
    5: [
      { x: 1140, y: 285, w: 70, h: 16, type: 'moving', axis: 'x', range: 52, speed: 2.5 },
      { x: 2400, y: 260, w: 66, h: 16, type: 'solid', shrinking: true },
    ],
    6: [
      { x: 1050, y: 285, w: 68, h: 15, type: 'debris' },
      { x: 1180, y: 215, w: 64, h: 15, type: 'debris' },
    ],
    7: [
      { x: 2490, y: 245, w: 70, h: 15, type: 'orbit', rangeX: 52, rangeY: 38, speed: 2.8 },
      { x: 2980, y: 210, w: 66, h: 15, type: 'moving', axis: 'x', range: 58, speed: 3 },
      { x: 3500, y: 220, w: 64, h: 15, type: 'solid', ghost: true },
    ],
    8: [
      { x: 1320, y: 190, w: 66, h: 15, type: 'orbit', rangeX: 54, rangeY: 42, speed: 3.1 },
      { x: 2570, y: 180, w: 62, h: 15, type: 'moving', axis: 'y', range: 54, speed: 3.3 },
      { x: 3560, y: 205, w: 60, h: 15, type: 'solid', shrinking: true },
    ],
    11: [
      { x: 660, y: 300, w: 66, h: 15, type: 'moving', axis: 'y', range: 40, speed: 2.65 },
      { x: 1600, y: 250, w: 62, h: 15, type: 'orbit', rangeX: 48, rangeY: 34, speed: 2.9 },
      { x: 2490, y: 235, w: 60, h: 15, type: 'crumble' },
    ],
    13: [
      { x: 2860, y: -70, w: 62, h: 15, type: 'moving', axis: 'x', range: 58, speed: 3.3 },
      { x: 3480, y: -555, w: 58, h: 15, type: 'orbit', rangeX: 54, rangeY: 38, speed: 3.65 },
      { x: 5220, y: 205, w: 60, h: 15, type: 'solid', ghost: true },
    ],
    16: [
      { x: 1450, y: 210, w: 64, h: 15, type: 'moving', axis: 'x', range: 62, speed: 3.05, traffic: true },
      { x: 2710, y: 220, w: 60, h: 15, type: 'orbit', rangeX: 58, rangeY: 42, speed: 3.35 },
      { x: 4140, y: 135, w: 58, h: 15, type: 'moving', axis: 'y', range: 58, speed: 3.55, assembly: true },
      { x: 5200, y: 155, w: 56, h: 15, type: 'solid', ghost: true },
    ],
  };

  const levelLadders = {
    3: [
      { x: 610, y: 245, w: 42, h: 225 },
      { x: 885, y: -540, w: 42, h: 235 },
      { x: 690, y: -1015, w: 42, h: 230 },
    ],
    7: [
      { x: 2450, y: 300, w: 42, h: 170 },
      { x: 3200, y: 180, w: 42, h: 290 },
    ],
    8: [
      { x: 1230, y: 245, w: 42, h: 225 },
      { x: 2825, y: 245, w: 42, h: 225 },
    ],
    11: [
      { x: 790, y: 315, w: 42, h: 155 },
      { x: 2140, y: 300, w: 42, h: 170 },
    ],
    13: [
      { x: 730, y: 270, w: 42, h: 200 },
      { x: 1630, y: 230, w: 42, h: 240 },
      { x: 2530, y: 275, w: 42, h: 195 },
      { x: 3865, y: 95, w: 42, h: 375, secret: true },
    ],
    16: [
      { x: 870, y: 275, w: 42, h: 195 },
      { x: 1945, y: 235, w: 42, h: 235 },
      { x: 2635, y: 285, w: 42, h: 185 },
      { x: 4028, y: 160, w: 42, h: 310 },
      { x: 4778, y: 245, w: 42, h: 225 },
    ],
    18: [
      { x: 1085, y: 250, w: 42, h: 220 },
      { x: 3745, y: 250, w: 42, h: 220 },
    ],
    21: [
      { x: 1100, y: 230, w: 42, h: 240 },
      { x: 2795, y: 220, w: 42, h: 250 },
      { x: 4560, y: 220, w: 42, h: 250 },
    ],
    22: [
      { x: 480, y: 225, w: 42, h: 245 },
      { x: 720, y: -215, w: 42, h: 240 },
      { x: 965, y: -670, w: 42, h: 250 },
      { x: 760, y: -1165, w: 42, h: 250 },
    ],
  };

  const levels = {
    1: { platforms: basePlatforms, spikes, checkpoints, messages, width: 4680, goalX: 4438 },
    2: { platforms: levelThreePlatforms, spikes: [], checkpoints: levelThreeCheckpoints, messages: levelThreeMessages, width: 5260, goalX: 5070, doorX: 5110, tacoStartX: 2100, tacoStorm: true, wallRoom: true },
    3: { platforms: levelThreeClimbPlatforms, spikes: [], checkpoints: [], messages: levelThreeClimbMessages, width: 1500, goalX: 1280, goalY: -1140, doorX: 1335, doorY: -1315, lavaClimb: true, verticalCamera: true, allPlatformsMove: true },
    4: { platforms: levelFourPlatforms, spikes: [], checkpoints: [], messages: levelFourMessages, width: 2500, goalX: 2310, mirrorRoom: true },
    5: { platforms: levelFivePlatforms, spikes: [], checkpoints: [], messages: levelFiveMessages, width: 2800, goalX: 2670, redLightRoom: true },
    6: { platforms: levelSixPlatforms, spikes: [], checkpoints: [], messages: levelSixMessages, width: 1500, goalX: 99999, elevatorRoom: true },
    7: { platforms: levelSevenPlatforms, spikes: [], checkpoints: [], messages: levelSevenMessages, width: 4100, goalX: 3850, doorX: 3890, darkMonsterRoom: true, doubleJump: true },
    8: { platforms: levelEightPlatforms, spikes: [], checkpoints: [], messages: levelEightMessages, width: 4250, goalX: 4030, doorX: 4070, chaosRoom: true, doubleJump: true, allPlatformsMove: true, oneWayPlatforms: true },
    9: { platforms: levelNinePlatforms, spikes: [], checkpoints: [], messages: levelNineMessages, width: 4550, goalX: 99999, quizRoom: true },
    10: { platforms: levelTenPlatforms, spikes: [], checkpoints: [], messages: levelTenMessages, width: 3100, goalX: 99999, narratorRoom: true, doubleJump: true, extraAirJumps: 2 },
    11: { platforms: levelElevenPlatforms, spikes: [], checkpoints: [], messages: levelElevenMessages, width: 3150, goalX: 2980, doorX: 3020, delayedPlatformRoom: true, focusedRoom: true },
    12: { platforms: levelTwelvePlatforms, spikes: [], checkpoints: [], messages: levelTwelveMessages, width: 4200, goalX: 99999, movingFinishRoom: true, focusedRoom: true },
    13: { platforms: levelThirteenPlatforms, spikes: levelThirteenSpikes, checkpoints: [], messages: levelThirteenMessages, width: 6550, goalX: 99999, reverseDoorRoom: true, movingPlatformsOneWay: true, verticalCamera: true, focusedRoom: true },
    14: { platforms: levelFourteenPlatforms, spikes: [], checkpoints: [], messages: levelFourteenMessages, width: 1900, goalX: 99999, loadingRoom: true, focusedRoom: true },
    15: { platforms: levelFifteenPlatforms, spikes: [], checkpoints: [], messages: levelFifteenMessages, width: 4230, goalX: 99999, doublePressRoom: true, doubleJump: true, movingPlatformsOneWay: true },
    16: { platforms: levelSixteenPlatforms, spikes: [], checkpoints: [], messages: levelSixteenMessages, width: 5720, goalX: 99999, fakeVictoryRoom: true, movingPlatformsOneWay: true, victoryX: 5500 },
    17: { platforms: levelSeventeenPlatforms, spikes: [], checkpoints: levelSeventeenCheckpoints, messages: levelSeventeenMessages, width: 1500, goalX: 99999, planetRoom: true, planetParty: true, verticalCamera: true, focusedRoom: true, nextLevel: 18 },
    18: { platforms: levelEighteenPlatforms, spikes: [], checkpoints: [], messages: levelEighteenMessages, width: 5800, goalX: 5580, doorX: 5620, factoryRoom: true, assemblyRoom: true, focusedRoom: true, nextLevel: 19 },
    19: { platforms: levelNineteenPlatforms, spikes: [], checkpoints: [{ x: 2090, y: 400, respawnX: 2080, respawnY: 400 }, { x: 3810, y: 390, respawnX: 3800, respawnY: 390 }, { x: 5440, y: 380, respawnX: 5435, respawnY: 380 }], messages: levelNineteenMessages, width: 6320, goalX: 6140, doorX: 6180, factoryRoom: true, movingPlatformsOneWay: true, focusedRoom: true, nextLevel: 20 },
    20: { platforms: levelTwentyPlatforms, spikes: [], checkpoints: [{ x: 2270, y: 400, respawnX: 2260, respawnY: 400 }, { x: 3870, y: 395, respawnX: 3860, respawnY: 395 }, { x: 5660, y: 360, respawnX: 5650, respawnY: 360 }], messages: levelTwentyMessages, width: 6380, goalX: 6200, doorX: 6240, factoryRoom: true, movingPlatformsOneWay: true, focusedRoom: true, nextLevel: 21 },
    21: { platforms: levelTwentyOnePlatforms, spikes: [], checkpoints: [{ x: 1810, y: 390, respawnX: 1800, respawnY: 390 }, { x: 3550, y: 400, respawnX: 3540, respawnY: 400 }, { x: 5440, y: 370, respawnX: 5430, respawnY: 370 }], messages: levelTwentyOneMessages, width: 6310, goalX: 6130, doorX: 6170, factoryRoom: true, pipeValveRoom: true, movingPlatformsOneWay: true, focusedRoom: true, nextLevel: 22 },
    22: { platforms: levelTwentyTwoPlatforms, spikes: [], checkpoints: [{ x: 1040, y: -540, reachY: -500, respawnX: 1010, respawnY: -585 }, { x: 830, y: -1210, reachY: -1170, respawnX: 840, respawnY: -1250 }], messages: levelTwentyTwoMessages, width: 1500, goalX: 1060, goalY: -1560, doorX: 1090, doorY: -1690, factoryRoom: true, verticalCamera: true, movingPlatformsOneWay: true, focusedRoom: true, nextLevel: 23 },
    23: { platforms: levelTwentyThreePlatforms, spikes: [], checkpoints: [{ x: 2200, y: 180, respawnX: 2180, respawnY: 180 }, { x: 4300, y: 185, respawnX: 4280, respawnY: 185 }, { x: 6350, y: 210, respawnX: 6320, respawnY: 210 }], messages: levelTwentyThreeMessages, width: 7800, goalX: 99999, spaceshipRoom: true, spaceshipDockX: 7660, focusedRoom: true, nextLevel: 16 },
  };

  const game = {
    running: false,
    levelSelectOpen: false,
    shopOpen: false,
    lastTime: 0,
    cameraX: 0,
    cameraY: 0,
    deaths: 0,
    checkpoint: 0,
    keys: { left: false, right: false, jump: false, climb: false },
    jumpPressed: false,
    spaceshipFlapQueued: false,
    platforms: [],
    seenMessages: new Set(),
    particles: [],
    shake: 0,
    animationStarted: false,
    levelTransitionTimer: 0,
    level: 1,
    trapTriggered: false,
    secretFallArmed: false,
    tacos: [],
    tacoRainClock: 0,
    tacoRainIndex: 0,
    wallPhase: 0,
    chasingWall: null,
    lavaActive: false,
    lavaY: 540,
    lavaElapsed: 0,
    whatMode: 'DRIFT',
    whatModeClock: 0,
    mirrorTime: 0,
    mirrorHistory: [],
    shadow: { x: 70, y: 420, w: 25, h: 34, visible: false },
    mirrorSolved: false,
    controlsReversed: false,
    fakeExitTriggered: false,
    realExitVisible: false,
    redLightClock: 0,
    redLightTimeLeft: 1,
    redLightSwitches: 0,
    redLightDecoys: [],
    redLightCanMove: true,
    redLightReversed: false,
    redLightPenalty: 0,
    redLightFinal: false,
    redLightFinalSolved: false,
    elevatorDropped: false,
    elevatorVisited: new Set(),
    elevatorTrapTimer: 0,
    elevatorControlsReversed: false,
    jumpWasDown: false,
    monsterEncounter: 0,
    monster: { x: 900, y: 315, w: 105, h: 155, active: false, minX: 900, maxX: 1060, direction: 1, speed: 135 },
    monsterScare: 0,
    chaosClock: 0,
    chaosEvent: 'reverse',
    chaosEventIndex: -1,
    chaosOrbs: [],
    chaosSpawnClock: 0,
    quizIndex: 0,
    quizActive: false,
    quizDoorUnlocked: false,
    quizWrongFlash: 0,
    quizGibberish: '',
    quizHasUnknownButton: false,
    narratorPhase: -1,
    narratorRealExit: false,
    narratorWordStage: 0,
    narratorVisitedWords: new Set(),
    narratorPlacedWords: new Set(),
    narratorNextWordIndex: 0,
    narratorStageReady: false,
    delayedPlatformTimer: 0,
    movingFinishX: 2200,
    movingFinishStage: 0,
    reverseDoorCooldown: 0,
    reverseDoorStage: 0,
    reverseParkourUnlocked: false,
    reverseEndReached: false,
    loadingTriggered: false,
    loadingTime: 0,
    loadingClicks: 0,
    loadingStage: 0,
    loadingSubstep: 0,
    doublePressCount: 0,
    buttonChaseWall: null,
    fakeVictoryTriggered: false,
    fakeVictoryTime: 0,
    fakeVictoryClicks: 0,
    rageShards: [],
    rageShardsCollected: 0,
    shardBank: 0,
    shopAirRune: false,
    shopBoots: false,
    shopMagnet: false,
    shopSlowCharm: false,
    shieldCharges: 0,
    shieldGrace: 0,
    extraBouncePads: [],
    extraMysteryBoxes: [],
    extraWindZones: [],
    extraBounceCooldown: 0,
    portals: [],
    gravityZones: [],
    lavaZones: [],
    factoryHazards: [],
    portalCooldown: 0,
    gravitySign: 1,
    gravityWasFlipped: false,
    planetGravityScale: .55,
    planetGravityLabel: 'LOW',
    planetAttached: null,
    planetAngle: Math.PI,
    planetDetachCooldown: 0,
    planetExitTimer: 0,
    playerRotation: 0,
    planetVisited: new Set(),
    assemblyStage: 0,
    assemblyPhase: 'idle',
    assemblyClock: 0,
    assemblyInputIndex: 0,
    assemblyDirectionWas: 0,
    pipeValves: [],
    pipeValveCooldown: 0,
    spaceshipObstacles: [],
    spaceshipShield: 0,
    spaceshipGrace: 0,
    spaceshipBoost: 0,
    copycatHistory: [],
    motionTime: 0,
    player: { x: 70, y: 420, w: 25, h: 34, vx: 0, vy: 0, grounded: false, climbing: false, ridingPlatformId: null, coyote: 0, jumpBuffer: 0, dead: false },

    start() {
      this.running = true;
      this.levelSelectOpen = false;
      this.shopOpen = false;
      this.shardBank = 0;
      this.shopAirRune = false;
      this.shopBoots = false;
      this.shopMagnet = false;
      this.shopSlowCharm = false;
      this.shieldCharges = 0;
      this.shieldGrace = 0;
      this.deaths = 0;
      this.level = 1;
      this.trapTriggered = false;
      this.secretFallArmed = false;
      this.checkpoint = 0;
      this.seenMessages.clear();
      this.loadLevel(1);
      this.respawn(true);
      this.resize();
      $('#level-count').textContent = '1';
      $('#death-count').textContent = '0';
      $('#checkpoint-count').textContent = '0/2';
      $('#win-panel').classList.add('hidden');
      $('#level-select').classList.add('hidden');
      $('#shop-panel').classList.add('hidden');
      $('#shard-bank').textContent = '0';
      this.updateShopUI();
      this.lastTime = performance.now();
      if (!this.animationStarted) {
        this.animationStarted = true;
        requestAnimationFrame((time) => this.loop(time));
      }
      this.toast('Welcome to the tutorial.');
    },

    resetPlatforms() {
      this.platforms = this.levelConfig.platforms.concat(levelBonusPlatforms[this.level] || []).map((platform, index) => ({
        ...platform,
        id: index,
        baseX: platform.x,
        baseY: platform.y,
        baseW: platform.w,
        baseRadius: platform.radius,
        currentRadius: platform.radius,
        broken: false,
        crumbleAt: 0,
        ghostSeen: false,
        ghostAlpha: 1,
        musicalActive: true,
        copycatOffset: 0,
        randomPhase: this.levelConfig.lavaClimb ? Math.random() * Math.PI * 2 : 0,
        randomSpeed: this.levelConfig.lavaClimb ? .78 + Math.random() * .58 : 1,
        randomRange: this.levelConfig.lavaClimb ? .78 + Math.random() * .5 : 1,
      }));
      this.motionTime = 0;
    },

    loadLevel(number) {
      stopTacoMusic();
      this.level = number;
      this.levelConfig = levels[number];
      this.player.w = this.levelConfig.spaceshipRoom ? 52 : 25;
      this.player.h = this.levelConfig.spaceshipRoom ? 30 : 34;
      this.activeSpikes = this.levelConfig.spikes.map((spike) => ({ ...spike }));
      this.activeCheckpoints = this.levelConfig.checkpoints.map((checkpoint) => ({ ...checkpoint, reached: false }));
      this.activeMessages = this.levelConfig.messages;
      WORLD.width = this.levelConfig.width;
      this.checkpoint = 0;
      this.seenMessages.clear();
      this.resetPlatforms();
      this.ladders = (levelLadders[number] || []).map((ladder) => ({ ...ladder }));
      this.portals = (levelPortals[number] || []).map((portal) => ({ ...portal }));
      this.gravityZones = (levelGravityZones[number] || []).map((zone) => ({ ...zone }));
      this.lavaZones = (levelLavaZones[number] || []).map((zone) => ({ ...zone }));
      this.factoryHazards = (levelFactoryHazards[number] || []).map((hazard) => ({ ...hazard, baseY: hazard.y, currentY: hazard.y, active: false }));
      this.spaceshipObstacles = this.levelConfig.spaceshipRoom
        ? spaceshipObstacleLayout.map((obstacle) => ({ ...obstacle, baseY: obstacle.y, currentY: obstacle.y, collected: false }))
        : [];
      this.spaceshipShield = 0;
      this.spaceshipGrace = 0;
      this.spaceshipBoost = 0;
      this.spaceshipFlapQueued = false;
      this.portalCooldown = 0;
      this.gravitySign = 1;
      this.gravityWasFlipped = false;
      this.planetGravityScale = .55;
      this.planetGravityLabel = 'LOW';
      this.copycatHistory = [];
      if (number === 1) {
        this.trapTriggered = false;
        this.secretFallArmed = false;
      }
      if (this.levelConfig.tacoStorm) {
        this.prepareTacoMaze();
        if (!this.levelConfig.wallRoom) startTacoMusic();
      } else {
        this.tacos = [];
        if (this.levelConfig.planetRoom) startPlanetMusic();
      }
      if (this.levelConfig.wallRoom) this.prepareWallRoom();
      if (this.levelConfig.lavaClimb) this.prepareLavaClimb();
      else $('#danger-timer').classList.add('hidden');
      if (this.levelConfig.mirrorRoom) this.prepareMirrorRoom();
      if (this.levelConfig.redLightRoom) this.prepareRedLightRoom();
      if (this.levelConfig.elevatorRoom) this.prepareElevatorRoom();
      else $('#elevator-panel').classList.add('hidden');
      if (this.levelConfig.darkMonsterRoom) this.prepareDarkMonsterRoom();
      if (this.levelConfig.chaosRoom) this.prepareChaosRoom();
      if (this.levelConfig.quizRoom) this.prepareQuizRoom();
      else $('#quiz-panel').classList.add('hidden');
      if (this.levelConfig.narratorRoom) this.prepareNarratorRoom();
      else $('#narrator-box').classList.add('hidden');
      $('#troll-overlay').classList.add('hidden');
      $('#overlay-target').classList.add('hidden');
      $('#overlay-continue').classList.add('hidden');
      $('#loading-puzzle').classList.add('hidden');
      if (this.levelConfig.delayedPlatformRoom) this.prepareDelayedPlatformRoom();
      if (this.levelConfig.movingFinishRoom) {
        this.movingFinishStage = 0;
        this.movingFinishX = 1450;
      }
      if (this.levelConfig.reverseDoorRoom) {
        this.reverseDoorCooldown = 0;
        this.reverseDoorStage = 0;
        this.reverseParkourUnlocked = false;
        this.reverseEndReached = false;
      }
      if (this.levelConfig.loadingRoom) {
        this.loadingTriggered = false;
        this.loadingTime = 0;
        this.loadingClicks = 0;
        this.loadingStage = 0;
        this.loadingSubstep = 0;
      }
      if (this.levelConfig.doublePressRoom) {
        this.doublePressCount = 0;
        this.buttonChaseWall = null;
      }
      if (this.levelConfig.assemblyRoom) this.prepareAssemblyRoom();
      if (this.levelConfig.pipeValveRoom) this.preparePipeValveRoom();
      if (this.levelConfig.fakeVictoryRoom) {
        this.fakeVictoryTriggered = false;
        this.fakeVictoryTime = 0;
        this.fakeVictoryClicks = 0;
      }
      this.prepareRageShards();
      this.prepareLevelExtras();
      $('#level-count').textContent = String(number);
      $('#checkpoint-count').textContent = `0/${this.activeCheckpoints.length}`;
    },

    prepareTacoMaze() {
      const tacoStartX = this.levelConfig.tacoStartX ?? 1750;
      let order = 0;
      this.tacos = tacoMazeColumns.filter((column) => column.x > tacoStartX).flatMap((column) => Array.from({ length: column.height }, (_, row) => ({
        x: column.x,
        y: -70 - row * 45,
        w: 46,
        h: 30,
        targetY: 440 - row * 30,
        triggerX: column.x - 620 + row * 25,
        state: 'dormant',
        warning: .7 + row * .2,
        persistent: true,
        order: order++,
      })));
      this.tacoRainClock = .8;
      this.tacoRainIndex = 0;
    },

    prepareWallRoom() {
      this.wallPhase = 0;
      this.chasingWall = { x: -110, y: 95, w: 82, h: 375, speed: 350, ghost: false };
    },

    prepareLavaClimb() {
      this.lavaActive = false;
      this.lavaY = 540;
      this.lavaElapsed = 0;
      this.whatMode = 'CALM';
      this.whatModeClock = 2.5;
      $('#danger-timer').classList.remove('hidden');
      $('#danger-time').textContent = 'WAIT';
    },

    prepareMirrorRoom() {
      this.mirrorTime = 0;
      this.mirrorHistory = [];
      this.shadow = { x: 70, y: 420, w: 25, h: 34, visible: false };
      this.mirrorSolved = false;
      this.controlsReversed = false;
      this.fakeExitTriggered = false;
      this.realExitVisible = false;
    },

    prepareRedLightRoom() {
      this.redLightClock = 0;
      this.redLightCanMove = true;
      this.redLightTimeLeft = .75 + Math.random() * 1.25;
      this.redLightSwitches = 0;
      this.redLightDecoys = [540, 1080, 1780, 2320].map((x, index) => ({
        x: x + (Math.random() - .5) * 90,
        green: index % 2 === 0,
        time: .4 + Math.random() * 1.8,
      }));
      this.redLightReversed = false;
      this.redLightPenalty = 0;
      this.redLightFinal = false;
      this.redLightFinalSolved = false;
    },

    prepareElevatorRoom() {
      this.elevatorDropped = false;
      this.elevatorVisited = new Set();
      this.elevatorTrapTimer = 0;
      this.elevatorControlsReversed = false;
      $('#elevator-panel').classList.remove('hidden');
      $('#elevator-readout').textContent = 'LOBBY';
      $$('#floor-buttons button').forEach((button, index) => {
        button.classList.remove('visited');
        button.style.order = String(index);
      });
    },

    prepareDarkMonsterRoom() {
      this.monsterEncounter = 0;
      this.monster = { x: 900, y: 315, w: 105, h: 155, active: false, minX: 900, maxX: 1060, direction: 1, speed: 135 };
      this.monsterScare = 0;
    },

    prepareChaosRoom() {
      this.chaosClock = .8;
      this.chaosEvent = 'calm';
      this.chaosEventIndex = -1;
      this.chaosOrbs = [];
      this.chaosSpawnClock = 0;
    },

    prepareQuizRoom() {
      this.quizIndex = 0;
      this.quizActive = false;
      this.quizDoorUnlocked = false;
      this.quizWrongFlash = 0;
      this.quizHasUnknownButton = false;
      const noises = ['BLORP', 'SNIZZLE', 'WOMP', 'GRAX', 'FLIB', 'ZONK', 'NURGLE', 'PLINK', 'SKRUM', 'YORP'];
      const pick = () => noises[Math.floor(Math.random() * noises.length)];
      this.quizGibberish = `${pick()} ${pick()} ${Math.floor(Math.random() * 900 + 100)} ${pick()}?`;
      $('#quiz-panel').classList.add('hidden');
      $('#quiz-panel').classList.remove('impossible');
    },

    prepareNarratorRoom() {
      this.narratorPhase = -1;
      this.narratorRealExit = false;
      this.narratorWordStage = 0;
      this.narratorVisitedWords = new Set();
      this.narratorPlacedWords = new Set();
      this.narratorNextWordIndex = 0;
      this.narratorStageReady = false;
      $('#narrator-box').classList.remove('hidden', 'lie');
      $('#narrator-line').textContent = 'Click my words in order, then jump across them: LISTEN TO ME.';
      this.setupNarratorWordBank();
    },

    prepareDelayedPlatformRoom() {
      this.delayedPlatformTimer = 0;
      for (const platform of this.platforms) {
        if (platform.type !== 'delayed') continue;
        platform.falling = false;
        platform.fallTimer = 0;
        platform.fallSpeed = 0;
      }
    },

    prepareAssemblyRoom() {
      this.assemblyStage = 0;
      this.assemblyPhase = 'idle';
      this.assemblyClock = 0;
      this.assemblyInputIndex = 0;
      this.assemblyDirectionWas = 0;
    },

    preparePipeValveRoom() {
      this.pipeValves = [
        { x: 1125, y: 375, opened: false, label: 'A' },
        { x: 2865, y: 355, opened: false, label: 'B' },
        { x: 4210, y: 335, opened: false, label: 'C' },
        { x: 5500, y: 370, opened: false, label: 'D' },
      ];
      this.pipeValveCooldown = 0;
    },

    prepareRageShards() {
      if (this.levelConfig.focusedRoom) {
        this.rageShardsCollected = 0;
        this.rageShards = [];
        $('#shard-count').textContent = '0/0';
        return;
      }
      const safe = this.platforms.filter((platform) => !['fake', 'crumble', 'debris', 'word', 'delayed', 'elevator'].includes(platform.type));
      this.rageShardsCollected = 0;
      this.rageShards = [];
      if (safe.length === 1 && safe[0].w > 600) {
        for (let index = 1; index <= 5; index += 1) {
          this.rageShards.push({
            x: safe[0].x + safe[0].w * index / 6,
            y: safe[0].y - 34,
            collected: false,
            phase: Math.random() * Math.PI * 2,
          });
        }
      } else if (safe.length) {
        for (let index = 0; index < 5; index += 1) {
          const platform = safe[Math.min(safe.length - 1, Math.floor(index * (safe.length - 1) / 4))];
          this.rageShards.push({
            x: platform.x + platform.w * (.3 + Math.random() * .4),
            y: platform.y - 34,
            collected: false,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      $('#shard-count').textContent = `0/${this.rageShards.length}`;
    },

    prepareLevelExtras() {
      if (this.levelConfig.focusedRoom) {
        this.extraBouncePads = [];
        this.extraMysteryBoxes = [];
        this.extraWindZones = [];
        return;
      }
      const supports = this.platforms.filter((platform) => platform.w >= 70 && !['fake', 'crumble', 'debris', 'word', 'delayed', 'elevator'].includes(platform.type));
      const pointAt = (fraction) => {
        if (!supports.length) return { x: WORLD.width * fraction, y: 470 };
        if (supports.length === 1) return { x: supports[0].x + supports[0].w * fraction, y: supports[0].y };
        const platform = supports[Math.min(supports.length - 1, Math.floor(fraction * supports.length))];
        return { x: platform.x + platform.w * .5, y: platform.y };
      };
      const bounceA = pointAt(.24);
      const bounceB = pointAt(.72);
      const boxA = pointAt(.4);
      const boxB = pointAt(.86);
      const windA = pointAt(.16);
      const windB = pointAt(.61);
      this.extraBouncePads = [bounceA, bounceB].map((point, index) => ({ ...point, w: 54, cooldown: 0, strength: index ? 760 : 700 }));
      this.extraMysteryBoxes = [boxA, boxB].map((point, index) => ({ x: point.x - 16, y: point.y - 32, w: 32, h: 32, opened: false, index }));
      this.extraWindZones = [windA, windB].map((point, index) => ({ x: point.x - 55, y: point.y - 145, w: 110, h: 145, direction: index ? -1 : 1 }));
      this.extraBounceCooldown = 0;
    },

    respawn(first = false) {
      const player = this.player;
      const cp = this.checkpoint ? this.activeCheckpoints[this.checkpoint - 1] : null;
      player.x = cp?.respawnX ?? (this.levelConfig.spaceshipRoom ? 170 : 70);
      player.y = cp?.respawnY ?? (this.levelConfig.spaceshipRoom ? 235 : 420);
      player.vx = 0;
      player.vy = 0;
      player.airJumps = this.maxAirJumps();
      player.dead = false;
      player.climbing = false;
      this.gravitySign = 1;
      this.gravityWasFlipped = false;
      this.planetGravityScale = .55;
      this.planetGravityLabel = 'LOW';
      this.portalCooldown = 0;
      player.ridingPlatformId = null;
      this.secretFallArmed = false;
      this.cameraX = Math.max(0, player.x - canvas.width * .25);
      this.cameraY = 0;
      this.platforms.forEach((platform) => { platform.broken = false; platform.crumbleAt = 0; });
      if (this.levelConfig.planetParty) {
        this.platforms.forEach((platform) => { platform.currentRadius = platform.baseRadius; });
        this.planetAttached = cp?.planetIndex ?? 0;
        this.planetAngle = -Math.PI / 2;
        this.planetDetachCooldown = 0;
        this.planetExitTimer = 0;
        this.planetVisited = new Set([this.planetAttached]);
        this.placePlayerOnPlanet();
        this.cameraX = Math.max(0, Math.min(WORLD.width - this.logicalWidth, player.x - this.logicalWidth * .32));
        this.cameraY = Math.min(0, player.y - 245);
      }
      if (!first && this.levelConfig.wallRoom && this.checkpoint === 0) {
        stopTacoMusic();
        this.prepareWallRoom();
        this.prepareTacoMaze();
      }
      if (!first && this.levelConfig.lavaClimb) {
        this.resetPlatforms();
        this.prepareLavaClimb();
      }
      if (!first && this.levelConfig.mirrorRoom) this.prepareMirrorRoom();
      if (!first && this.levelConfig.redLightRoom) this.prepareRedLightRoom();
      if (!first && this.levelConfig.elevatorRoom) {
        if (this.elevatorDropped) {
          player.x = 1100;
          player.y = 420;
          const elevator = this.platforms.find((platform) => platform.type === 'elevator');
          if (elevator) elevator.broken = true;
        } else {
          this.prepareElevatorRoom();
        }
      }
      if (!first && this.levelConfig.darkMonsterRoom) {
        this.resetPlatforms();
        this.prepareDarkMonsterRoom();
      }
      if (!first && this.levelConfig.chaosRoom) {
        this.resetPlatforms();
        this.prepareChaosRoom();
      }
      if (!first && this.levelConfig.delayedPlatformRoom) {
        this.resetPlatforms();
        this.prepareDelayedPlatformRoom();
      }
      if (!first && this.levelConfig.doublePressRoom) {
        this.doublePressCount = 0;
        this.buttonChaseWall = null;
      }
      if (!first && this.levelConfig.assemblyRoom) this.prepareAssemblyRoom();
      if (!first) this.toast(['Again.', 'That looked expensive.', 'The spikes remain undefeated.', 'Maybe jump later. Or earlier.', 'Excellent falling.'][this.deaths % 5]);
    },

    die(reason = 'gravity') {
      if (this.player.dead || !this.running) return;
      if (this.shieldGrace > 0) return;
      if (this.shieldCharges > 0) {
        this.shieldCharges -= 1;
        this.shieldGrace = 1;
        this.player.dead = true;
        this.shake = 8;
        this.toast(`SPITE SHIELD BROKE. ${this.shieldCharges} REMAIN.`);
        tone(760, .22, 'triangle', .055, -280);
        this.updateShopUI();
        window.setTimeout(() => this.respawn(), 360);
        return;
      }
      this.player.dead = true;
      this.deaths += 1;
      this.shake = 14;
      $('#death-count').textContent = String(this.deaths);
      tone(reason === 'spike' ? 95 : 70, .3, 'sawtooth', .06, -55);
      for (let i = 0; i < 18; i += 1) {
        this.particles.push({ x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2, vx: (Math.random() - .5) * 320, vy: (Math.random() - .8) * 260, life: .65 + Math.random() * .4 });
      }
      window.setTimeout(() => this.respawn(), 520);
    },

    toast(text) {
      const toast = $('#toast');
      toast.textContent = text;
      toast.classList.add('show');
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2300);
    },

    openLevelSelect() {
      this.closeShop();
      this.levelSelectOpen = true;
      this.keys.left = this.keys.right = this.keys.jump = this.keys.climb = false;
      $('#level-select').classList.remove('hidden');
    },

    closeLevelSelect() {
      this.levelSelectOpen = false;
      $('#level-select').classList.add('hidden');
    },

    chooseLevel(number) {
      if (!levels[number]) return;
      window.clearTimeout(this.levelTransitionTimer);
      this.levelTransitionTimer = 0;
      this.closeLevelSelect();
      this.closeShop();
      this.player.dead = true;
      this.loadLevel(number);
      this.respawn(true);
      $('#level-banner').classList.add('hidden');
      const selectedNames = { 1: 'The First Obby', 2: 'Taco Storm', 3: 'WHAT?', 4: 'The Mirror Room', 5: 'Red Light, Wrong Light', 6: 'The Elevator', 7: 'The Dark Walkway', 8: 'WHAT THE HELL?', 9: 'YES OR NO?', 10: 'The Narrator', 11: 'Delayed Platform', 12: 'Runaway Checkpoints', 13: 'Impossible Reverse Doors', 14: 'Loading...', 15: 'Devil Button Chase', 16: 'Victory?', 17: 'Planet Party', 18: 'Copycat Assembly Line', 19: 'Furnace Walk', 20: 'Gearbox', 21: 'Steam Valve Works', 22: 'Night-Shift Tower', 23: 'Starship Shift' };
      this.toast(`LEVEL ${number}: ${selectedNames[number]}`);
    },

    openShop() {
      this.closeLevelSelect();
      this.shopOpen = true;
      this.keys.left = this.keys.right = this.keys.jump = this.keys.climb = false;
      this.updateShopUI();
      $('#shop-message').textContent = 'Spend carefully. The shopkeeper does not issue refunds.';
      $('#shop-panel').classList.remove('hidden');
    },

    closeShop() {
      this.shopOpen = false;
      $('#shop-panel').classList.add('hidden');
    },

    updateShopUI() {
      $('#shard-bank').textContent = String(this.shardBank);
      $('#shop-balance').textContent = String(this.shardBank);
      const costs = { air: 8, boots: 7, magnet: 6, slow: 10 };
      const owned = { air: this.shopAirRune, boots: this.shopBoots, magnet: this.shopMagnet, slow: this.shopSlowCharm };
      for (const [item, value] of Object.entries(owned)) {
        const button = $(`.shop-grid button[data-shop-item="${item}"]`);
        if (button) {
          button.disabled = value;
          button.querySelector('b').textContent = value ? 'OWNED' : String(costs[item]);
        }
      }
      const shieldButton = $('.shop-grid button[data-shop-item="shield"]');
      if (shieldButton) {
        shieldButton.querySelector('b').textContent = '5';
        shieldButton.querySelector('small').textContent = `Blocks one death · ${this.shieldCharges} stored`;
      }
    },

    buyShopItem(item) {
      const costs = { air: 8, boots: 7, magnet: 6, slow: 10, shield: 5 };
      const cost = costs[item];
      if (!cost) return;
      const alreadyOwned = (item === 'air' && this.shopAirRune)
        || (item === 'boots' && this.shopBoots)
        || (item === 'magnet' && this.shopMagnet)
        || (item === 'slow' && this.shopSlowCharm);
      if (alreadyOwned) return;
      if (this.shardBank < cost) {
        $('#shop-message').textContent = `Not enough shards. You need ${cost - this.shardBank} more.`;
        tone(95, .13, 'square', .035, -30);
        return;
      }
      this.shardBank -= cost;
      if (item === 'air') this.shopAirRune = true;
      if (item === 'boots') this.shopBoots = true;
      if (item === 'magnet') this.shopMagnet = true;
      if (item === 'slow') this.shopSlowCharm = true;
      if (item === 'shield') this.shieldCharges += 1;
      $('#shop-message').textContent = item === 'shield' ? 'One spite shield added.' : 'Purchased. It probably works.';
      tone(520, .16, 'sine', .04, 180);
      this.updateShopUI();
      this.player.airJumps = this.maxAirJumps();
    },

    maxAirJumps() {
      return 2 + (this.shopAirRune ? 1 : 0);
    },

    resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.pixelRatio = ratio;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      this.viewWidth = rect.width;
      this.viewHeight = rect.height;
      this.scale = rect.height / WORLD.height;
      this.logicalWidth = rect.width / this.scale;
    },

    update(dt, now) {
      if (this.levelSelectOpen || this.shopOpen) return;
      this.shieldGrace = Math.max(0, this.shieldGrace - dt);
      const p = this.player;
      if (!p.dead) {
        if (this.levelConfig.spaceshipRoom) {
          const flapJustPressed = this.spaceshipFlapQueued || (this.keys.jump && !this.jumpWasDown);
          this.spaceshipFlapQueued = false;
          this.jumpWasDown = this.keys.jump;
          this.updateSpaceshipRoom(dt, flapJustPressed);
        } else if (this.levelConfig.planetParty) {
          const jumpJustPressed = this.keys.jump && !this.jumpWasDown;
          this.jumpWasDown = this.keys.jump;
          this.updatePlanetParty(dt, jumpJustPressed);
        } else {
        let jumpedThisFrame = false;
        let carriedPlatform = null;
        const jumpJustPressed = this.keys.jump && !this.jumpWasDown;
        this.jumpWasDown = this.keys.jump;
        const gravityFlipped = this.gravityZones.some((zone) => rectsOverlap(p, zone));
        this.gravitySign = gravityFlipped ? -1 : 1;
        if (gravityFlipped !== this.gravityWasFlipped) {
          this.gravityWasFlipped = gravityFlipped;
          this.toast(gravityFlipped ? 'CEILING PARKOUR: GRAVITY FLIPPED.' : 'GRAVITY RESTORED. FALL CAREFULLY.');
          tone(gravityFlipped ? 190 : 420, .18, 'sine', .035, gravityFlipped ? -80 : 120);
        }
        const nearbyLadder = this.ladders.find((ladder) => rectsOverlap(
          { x: p.x - 9, y: p.y - 4, w: p.w + 18, h: p.h + 8 },
          ladder,
        ));
        p.climbing = Boolean(this.keys.climb && nearbyLadder);
        const rawDirection = this.quizActive ? 0 : Number(this.keys.right) - Number(this.keys.left);
        const controlsInverted = (this.levelConfig.mirrorRoom && this.controlsReversed)
          || (this.levelConfig.elevatorRoom && this.elevatorControlsReversed)
          || (this.levelConfig.chaosRoom && this.chaosEvent === 'reverse');
        const direction = controlsInverted ? -rawDirection : rawDirection;
        const target = direction * (this.shopBoots ? 314 : 275);
        p.vx += (target - p.vx) * Math.min(1, dt * (p.grounded ? 14 : 5.5));
        if (!direction && p.grounded) p.vx *= Math.pow(.001, dt);

        if (jumpJustPressed) p.jumpBuffer = .12;
        else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
        p.coyote = p.grounded ? .075 : Math.max(0, p.coyote - dt);
        if (p.jumpBuffer > 0 && p.coyote > 0) {
          p.vy = (this.levelConfig.chaosRoom && this.chaosEvent === 'super' ? -820 : -610) * this.gravitySign;
          p.grounded = false;
          p.ridingPlatformId = null;
          jumpedThisFrame = true;
          p.coyote = 0;
          p.jumpBuffer = 0;
          tone(260, .07, 'square', .025, 80);
        } else if (jumpJustPressed && p.airJumps > 0) {
          p.vy = (this.levelConfig.chaosRoom && this.chaosEvent === 'super' ? -760 : -570) * this.gravitySign;
          p.airJumps -= 1;
          p.jumpBuffer = 0;
          jumpedThisFrame = true;
          tone(390, .09, 'square', .035, 120);
        }
        if (!this.keys.jump && p.vy * this.gravitySign < -220) p.vy += 1300 * this.gravitySign * dt;

        if (p.climbing && nearbyLadder) {
          const ladderCenter = nearbyLadder.x + nearbyLadder.w / 2 - p.w / 2;
          p.x += (ladderCenter - p.x) * Math.min(1, dt * 12);
          p.vx = 0;
          p.vy = -195;
          p.grounded = false;
          p.ridingPlatformId = null;
          p.airJumps = this.maxAirJumps();
        } else {
          let gravityScale = this.levelConfig.chaosRoom && this.chaosEvent === 'moon' ? .34 : 1;
          if (this.levelConfig.planetRoom) gravityScale *= this.planetGravityScale;
          p.vy += 1700 * gravityScale * this.gravitySign * dt;
          p.vy = Math.max(-900, Math.min(p.vy, 900));
        }

        this.motionTime += dt;
        this.copycatHistory.push({ time: this.motionTime, vx: p.vx });
        while (this.copycatHistory.length > 2 && this.copycatHistory[0].time < this.motionTime - 1.5) this.copycatHistory.shift();
        this.platforms.forEach((platform) => {
          const oldX = platform.x;
          const oldY = platform.y;
          const designedMover = platform.type === 'moving' || platform.type === 'shifting'
            || platform.type === 'orbit' || platform.type === 'copycat'
            || (platform.type === 'word' && platform.range);
          const autoMover = this.levelConfig.allPlatformsMove
            && platform.h <= 30
            && (!this.levelConfig.lavaClimb || this.lavaActive);
          if (designedMover || autoMover) {
            const whatSpeed = this.levelConfig.lavaClimb && this.whatMode === 'FRENZY' ? 1.55 : 1;
            const difficultySpeed = this.levelConfig.factoryRoom ? 1.12 : 1.05;
            const phase = this.motionTime * (platform.speed ?? 1) * 1.12 * difficultySpeed * platform.randomSpeed * whatSpeed * (this.shopSlowCharm ? .85 : 1) + platform.randomPhase;
            const motionRange = (platform.range ?? 0) * platform.randomRange;
            if (platform.type === 'shifting') {
              platform.x = platform.baseX + Math.sin(phase) * motionRange;
              platform.y = platform.baseY + Math.cos(phase * .73) * 18;
            } else if (platform.type === 'orbit') {
              platform.x = platform.baseX + Math.cos(phase) * platform.rangeX * platform.randomRange;
              platform.y = platform.baseY + Math.sin(phase) * platform.rangeY * platform.randomRange;
            } else if (platform.type === 'copycat') {
              const delayed = this.copycatHistory.find((entry) => entry.time >= this.motionTime - .72) || this.copycatHistory[0];
              platform.copycatOffset += (delayed?.vx || 0) * dt * .38;
              platform.copycatOffset = Math.max(-platform.range, Math.min(platform.range, platform.copycatOffset));
              platform.x = platform.baseX + platform.copycatOffset;
            } else if (platform.type === 'moving' && platform.axis === 'x') {
              platform.x = platform.baseX + Math.sin(phase) * motionRange;
            } else if (platform.type === 'moving') {
              platform.y = platform.baseY + Math.sin(phase) * motionRange;
            } else if (platform.type === 'word' && platform.axis === 'x') {
              platform.x = platform.baseX + Math.sin(phase) * motionRange;
            } else if (platform.type === 'word') {
              platform.y = platform.baseY + Math.sin(phase) * motionRange;
            } else {
              const autoPhase = this.motionTime * (1.05 + (platform.id % 5) * .13) * platform.randomSpeed * whatSpeed + platform.randomPhase + platform.id * 1.7;
              platform.x = platform.baseX + Math.sin(autoPhase) * (10 + (platform.id % 3) * 4) * platform.randomRange;
              platform.y = platform.baseY + Math.cos(autoPhase * .77) * (6 + (platform.id % 2) * 3) * platform.randomRange;
            }
            if (!jumpedThisFrame && p.grounded && p.ridingPlatformId === platform.id) {
              p.x += platform.x - oldX;
              p.y += platform.y - oldY;
              carriedPlatform = platform;
            }
          }
          if (platform.type === 'crumble' && platform.crumbleAt && now - platform.crumbleAt > 650) platform.broken = true;
          if (platform.type === 'fake' && platform.crumbleAt && now - platform.crumbleAt > 350) platform.broken = true;
          if (platform.ghost && !platform.ghostSeen && Math.abs((platform.x + platform.w / 2) - (p.x + p.w / 2)) < 250) platform.ghostSeen = true;
          if (platform.ghostSeen) platform.ghostAlpha = Math.max(0, platform.ghostAlpha - dt * 1.45);
          if (platform.musical != null) platform.musicalActive = Math.floor(this.motionTime * 2.25) % 3 === platform.musical;
          if (platform.shrinking) {
            const targetW = p.ridingPlatformId === platform.id ? Math.max(30, platform.baseW * .42) : platform.baseW;
            const change = Math.sign(targetW - platform.w) * Math.min(Math.abs(targetW - platform.w), dt * 42);
            platform.w += change;
            platform.x = platform.baseX + (platform.baseW - platform.w) / 2;
          }
          if (platform.planet) {
            const occupied = p.ridingPlatformId === platform.id;
            const targetW = occupied ? platform.baseW * .45 : platform.baseW;
            const speed = occupied ? 38 : 19;
            const change = Math.sign(targetW - platform.w) * Math.min(Math.abs(targetW - platform.w), dt * speed);
            platform.w += change;
            platform.x = platform.baseX + (platform.baseW - platform.w) / 2;
          }
        });

        if (this.levelConfig.wallRoom) this.updateWallRoom(dt);
        if (this.levelConfig.tacoStorm && (!this.levelConfig.wallRoom || this.wallPhase === 4)) this.updateTacoRain(dt);
        if (this.levelConfig.lavaClimb) this.updateLavaClimb(dt);
        if (this.levelConfig.delayedPlatformRoom) this.updateDelayedPlatform(dt);

        p.x += p.vx * dt;
        this.collide('x', now);
        const previousBottom = p.y + p.h;
        const previousTop = p.y;
        p.y += p.vy * dt;
        p.grounded = false;
        p.ridingPlatformId = null;
        this.collide('y', now, previousBottom, previousTop);
        if (!p.grounded && carriedPlatform && !jumpedThisFrame && p.vy >= 0) {
          const feetDistance = Math.abs((p.y + p.h) - carriedPlatform.y);
          const horizontallyOnPlatform = p.x + p.w > carriedPlatform.x + 2 && p.x < carriedPlatform.x + carriedPlatform.w - 2;
          if (feetDistance < 10 && horizontallyOnPlatform) {
            p.y = carriedPlatform.y - p.h;
            p.vy = 0;
            p.grounded = true;
            p.ridingPlatformId = carriedPlatform.id;
          }
        }
        p.x = Math.max(0, p.x);
        if (this.levelConfig.mirrorRoom) this.updateMirrorRoom(dt);
        if (this.levelConfig.redLightRoom) this.updateRedLightRoom(dt);
        if (this.levelConfig.elevatorRoom) this.updateElevatorRoom(dt);
        if (this.levelConfig.darkMonsterRoom) this.updateDarkMonsterRoom(dt);
        if (this.levelConfig.chaosRoom) this.updateChaosRoom(dt);
        if (this.levelConfig.quizRoom) this.updateQuizRoom(dt, jumpJustPressed);
        if (this.levelConfig.narratorRoom) this.updateNarratorRoom(jumpJustPressed);
        if (this.levelConfig.movingFinishRoom) this.updateMovingFinish(dt);
        if (this.levelConfig.reverseDoorRoom) this.updateReverseDoor();
        if (this.levelConfig.loadingRoom) this.updateLoadingRoom(dt);
        if (this.levelConfig.doublePressRoom) this.updateDoublePressRoom(dt, jumpJustPressed);
        if (this.levelConfig.fakeVictoryRoom) this.updateFakeVictoryRoom(dt);
        if (this.levelConfig.assemblyRoom) this.updateAssemblyRoom(dt, jumpJustPressed);
        if (this.levelConfig.pipeValveRoom) this.updatePipeValveRoom(dt);
        this.updateParkourSystems(dt);
        this.updateFactoryHazards();
        this.updateLevelExtras(dt);

        if (this.level === 1 && this.trapTriggered && p.x < 450 && p.y > WORLD.floor - 20) this.secretFallArmed = true;
        if (p.y > WORLD.height + 90) {
          if (this.level === 1 && this.secretFallArmed) this.advanceLevel();
          else this.die('fall');
        }
        if (p.y < -180 && !this.levelConfig.verticalCamera) this.die('ceiling');
        for (const spike of this.activeSpikes) {
          if (rectsOverlap(p, { x: spike.x + 5, y: spike.y + 5, w: spike.w - 10, h: spike.h - 5 })) this.die('spike');
        }
        for (const lava of this.lavaZones) {
          if (rectsOverlap(p, lava)) this.die('lava');
        }

        this.activeCheckpoints.forEach((cp, index) => {
          const checkpointReached = cp.reachY != null ? p.y < cp.reachY : p.x > cp.x;
          if (!cp.reached && checkpointReached) {
            cp.reached = true;
            this.checkpoint = index + 1;
            $('#checkpoint-count').textContent = `${this.checkpoint}/${this.activeCheckpoints.length}`;
            this.toast('Checkpoint. We are occasionally merciful.');
            tone(520, .2, 'sine', .04, 220);
          }
        });

        for (const message of this.activeMessages) {
          if (p.x > message.x && !this.seenMessages.has(message.x)) {
            this.seenMessages.add(message.x);
            this.toast(message.text);
          }
        }

        for (const shard of this.rageShards) {
          const reach = this.shopMagnet ? 58 : 12;
          if (shard.collected || !rectsOverlap(p, { x: shard.x - reach, y: shard.y - reach, w: reach * 2, h: reach * 2 })) continue;
          shard.collected = true;
          this.rageShardsCollected += 1;
          this.shardBank += 1;
          $('#shard-count').textContent = `${this.rageShardsCollected}/${this.rageShards.length}`;
          this.updateShopUI();
          tone(620 + this.rageShardsCollected * 45, .1, 'triangle', .035, 120);
          for (let index = 0; index < 10; index += 1) {
            this.particles.push({ x: shard.x, y: shard.y, vx: (Math.random() - .5) * 150, vy: -40 - Math.random() * 100, life: .4 + Math.random() * .3 });
          }
          if (this.rageShardsCollected === this.rageShards.length) this.toast('ALL SHARDS COLLECTED. REWARD: EMOTIONAL DAMAGE.');
        }

        const reachedGoal = this.levelConfig.goalY == null
          ? p.x > this.levelConfig.goalX
          : p.x > this.levelConfig.goalX && p.y < this.levelConfig.goalY;
        if (reachedGoal) {
          if (this.level === 1) this.pressTrollButton();
          else if (this.level === 2) this.advanceLevel(3);
          else if (this.level === 3) this.advanceLevel(4);
          else if (this.level === 5) this.advanceLevel(6);
          else if (this.level === 7) this.advanceLevel(8);
          else if (this.level === 8) this.advanceLevel(9);
          else if (this.level === 11) this.advanceLevel(12);
          else if (this.levelConfig.nextLevel) this.advanceLevel(this.levelConfig.nextLevel);
          else if (!this.fakeExitTriggered) this.triggerFakeMirrorExit();
        }
        }
      }

      this.particles.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 800 * dt;
        particle.life -= dt;
      });
      this.particles = this.particles.filter((particle) => particle.life > 0);
      this.shake *= Math.pow(.01, dt);

      const targetCamera = Math.max(0, Math.min(WORLD.width - this.logicalWidth, p.x - this.logicalWidth * .32));
      this.cameraX += (targetCamera - this.cameraX) * Math.min(1, dt * 5);
      const targetCameraY = this.levelConfig.verticalCamera ? Math.min(0, p.y - 245) : 0;
      this.cameraY += (targetCameraY - this.cameraY) * Math.min(1, dt * 6);
    },

    placePlayerOnPlanet() {
      if (this.planetAttached == null) return;
      const planet = this.platforms[this.planetAttached];
      if (!planet?.planet) return;
      const p = this.player;
      const distance = planet.currentRadius + p.h * .47;
      const centerX = planet.cx + Math.cos(this.planetAngle) * distance;
      const centerY = planet.cy + Math.sin(this.planetAngle) * distance;
      p.x = centerX - p.w / 2;
      p.y = centerY - p.h / 2;
      p.vx = 0;
      p.vy = 0;
      p.grounded = true;
      p.airJumps = this.maxAirJumps();
      this.playerRotation = this.planetAngle + Math.PI / 2;
      this.planetGravityScale = planet.planetGravity;
      this.planetGravityLabel = planet.gravityLabel;
    },

    updateAssemblyRoom(dt, jumpJustPressed) {
      const p = this.player;
      if (this.assemblyStage >= assemblyStations.length) return;
      const station = assemblyStations[this.assemblyStage];
      p.x = Math.min(p.x, station.gateX - p.w - 8);
      const direction = Number(this.keys.right) - Number(this.keys.left);

      if (this.assemblyPhase === 'idle' && p.x > station.x - 220) {
        this.assemblyPhase = 'demo';
        this.assemblyClock = 0;
        this.assemblyInputIndex = 0;
        this.toast('WATCH THE ROBOT. THEN COPY IT EXACTLY.');
        tone(260, .12, 'square', .035, 80);
      }

      if (this.assemblyPhase === 'demo') {
        this.assemblyClock += dt;
        const demoDuration = station.sequence.length * .72 + .55;
        if (this.assemblyClock >= demoDuration) {
          this.assemblyPhase = 'input';
          this.assemblyClock = 7;
          this.assemblyInputIndex = 0;
          this.assemblyDirectionWas = direction;
          this.toast('YOUR TURN. COPY THE MACHINE.');
        }
        return;
      }

      if (this.assemblyPhase === 'input') {
        this.assemblyClock -= dt;
        let action = null;
        if (jumpJustPressed) action = 'JUMP';
        else if (direction !== 0 && this.assemblyDirectionWas === 0) action = direction < 0 ? 'LEFT' : 'RIGHT';
        this.assemblyDirectionWas = direction;

        if (action) {
          const expected = station.sequence[this.assemblyInputIndex];
          if (action === expected) {
            this.assemblyInputIndex += 1;
            tone(430 + this.assemblyInputIndex * 55, .08, 'sine', .03, 90);
            if (this.assemblyInputIndex >= station.sequence.length) {
              this.assemblyStage += 1;
              this.assemblyPhase = 'idle';
              this.assemblyClock = 0;
              this.toast(`MACHINE ${this.assemblyStage}/${assemblyStations.length} COPIED. GATE OPEN.`);
              tone(620, .2, 'triangle', .05, 220);
            }
          } else {
            this.assemblyPhase = 'demo';
            this.assemblyClock = 0;
            this.assemblyInputIndex = 0;
            p.x = station.x - 225;
            p.vx = 0;
            this.shake = 7;
            this.toast(`WRONG. EXPECTED ${expected}. WATCH AGAIN.`);
            tone(95, .25, 'sawtooth', .05, -40);
          }
        } else if (this.assemblyClock <= 0) {
          this.assemblyPhase = 'demo';
          this.assemblyClock = 0;
          this.assemblyInputIndex = 0;
          this.toast('TOO SLOW. THE ROBOT WILL DEMONSTRATE AGAIN.');
        }
      }
    },

    updatePipeValveRoom(dt) {
      this.pipeValveCooldown = Math.max(0, this.pipeValveCooldown - dt);
      const p = this.player;
      if (this.keys.climb && this.pipeValveCooldown <= 0) {
        const valveIndex = this.pipeValves.findIndex((valve) => !valve.opened
          && Math.hypot((p.x + p.w / 2) - valve.x, (p.y + p.h / 2) - valve.y) < 105);
        if (valveIndex >= 0) {
          const valve = this.pipeValves[valveIndex];
          valve.opened = true;
          this.pipeValveCooldown = .65;
          this.factoryHazards.forEach((hazard, index) => {
            if (index % this.pipeValves.length === valveIndex) hazard.disabled = true;
          });
          const opened = this.pipeValves.filter((candidate) => candidate.opened).length;
          this.toast(`VALVE ${valve.label} CLOSED. ${opened}/${this.pipeValves.length} STEAM LINES SAFE.`);
          tone(260 + opened * 120, .2, 'triangle', .045, 160);
        }
      }
      if (this.pipeValves.some((valve) => !valve.opened) && p.x > 5980) {
        p.x = 5980;
        p.vx = 0;
        this.toast(`THE EXIT PIPE NEEDS ALL ${this.pipeValves.length} VALVES. HOLD E NEAR EACH WHEEL.`);
      }
    },

    updateSpaceshipRoom(dt, flapJustPressed) {
      const p = this.player;
      this.motionTime += dt;
      this.spaceshipGrace = Math.max(0, this.spaceshipGrace - dt);
      this.spaceshipBoost = Math.max(0, this.spaceshipBoost - dt);
      const cruise = this.spaceshipBoost > 0 ? 315 : 245;
      p.vx = cruise;
      p.vy += 900 * dt;
      if (flapJustPressed) {
        p.vy = -350;
        tone(420, .07, 'square', .018, 90);
      }
      p.vy = Math.max(-380, Math.min(430, p.vy));
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.playerRotation = Math.max(-.5, Math.min(.5, p.vy / 520));

      for (const obstacle of this.spaceshipObstacles) {
        if (obstacle.type === 'gate') {
          const top = { x: obstacle.x, y: 0, w: obstacle.w, h: obstacle.gapY };
          const bottomY = obstacle.gapY + obstacle.gapH;
          const bottom = { x: obstacle.x, y: bottomY, w: obstacle.w, h: WORLD.height - bottomY };
          if (rectsOverlap(p, top) || rectsOverlap(p, bottom)) this.hitSpaceship('gate');
        } else if (obstacle.type === 'asteroid') {
          obstacle.currentY = obstacle.baseY + Math.sin(this.motionTime * obstacle.speed + obstacle.phase) * obstacle.drift;
          const shipX = p.x + p.w / 2;
          const shipY = p.y + p.h / 2;
          if (Math.hypot(shipX - obstacle.x, shipY - obstacle.currentY) < obstacle.radius + 15) this.hitSpaceship('asteroid');
        } else if (!obstacle.collected) {
          const shipX = p.x + p.w / 2;
          const shipY = p.y + p.h / 2;
          if (Math.hypot(shipX - obstacle.x, shipY - obstacle.y) < obstacle.radius + 18) {
            obstacle.collected = true;
            this.spaceshipShield += 1;
            this.spaceshipBoost = 3.5;
            this.toast('BOOST RING: SPEED UP + ONE IMPACT SHIELD.');
            tone(720, .22, 'triangle', .05, 260);
          }
        }
      }

      if (p.y < 8 || p.y + p.h > WORLD.height - 8) this.die('space');
      this.activeCheckpoints.forEach((cp, index) => {
        if (!cp.reached && p.x > cp.x) {
          cp.reached = true;
          this.checkpoint = index + 1;
          $('#checkpoint-count').textContent = `${this.checkpoint}/${this.activeCheckpoints.length}`;
          this.toast(`FLIGHT CHECKPOINT ${this.checkpoint}/${this.activeCheckpoints.length}.`);
          tone(560, .16, 'sine', .04, 200);
        }
      });
      for (const message of this.activeMessages) {
        if (p.x > message.x && !this.seenMessages.has(message.x)) {
          this.seenMessages.add(message.x);
          this.toast(message.text);
        }
      }
      if (p.x > this.levelConfig.spaceshipDockX - 70) this.advanceLevel(this.levelConfig.nextLevel);
    },

    hitSpaceship(reason) {
      if (this.spaceshipGrace > 0 || this.player.dead) return;
      if (this.spaceshipShield > 0) {
        this.spaceshipShield -= 1;
        this.spaceshipGrace = 1.15;
        this.player.vy *= -.55;
        this.shake = 9;
        this.toast('IMPACT SHIELD BROKE. KEEP FLYING.');
        tone(160, .22, 'sawtooth', .055, -80);
        return;
      }
      this.die(reason);
    },

    updatePlanetParty(dt, jumpJustPressed) {
      const p = this.player;
      const direction = Number(this.keys.right) - Number(this.keys.left);
      this.motionTime += dt;
      this.planetDetachCooldown = Math.max(0, this.planetDetachCooldown - dt);

      for (let index = 0; index < this.platforms.length; index += 1) {
        const planet = this.platforms[index];
        if (!planet.planet) continue;
        const occupied = this.planetAttached === index;
        const minimum = planet.baseRadius * (planet.exitPlanet ? .72 : .62);
        const target = occupied ? minimum : planet.baseRadius;
        const speed = occupied ? 10 + planet.baseRadius * .065 : 8;
        planet.currentRadius += Math.sign(target - planet.currentRadius) * Math.min(Math.abs(target - planet.currentRadius), speed * dt);
      }

      if (this.planetAttached != null) {
        const planet = this.platforms[this.planetAttached];
        const angularSpeed = (this.shopBoots ? 285 : 245) / Math.max(72, planet.currentRadius);
        this.planetAngle += direction * angularSpeed * dt;
        this.placePlayerOnPlanet();

        if (jumpJustPressed) {
          const outwardX = Math.cos(this.planetAngle);
          const outwardY = Math.sin(this.planetAngle);
          const tangentX = -Math.sin(this.planetAngle);
          const tangentY = Math.cos(this.planetAngle);
          const launch = planet.planetGravity > 1 ? 575 : 535;
          p.vx = outwardX * launch + tangentX * direction * 155;
          p.vy = outwardY * launch + tangentY * direction * 155;
          p.grounded = false;
          p.airJumps = this.maxAirJumps();
          this.planetAttached = null;
          this.planetDetachCooldown = .24;
          this.planetExitTimer = 0;
          tone(310, .1, 'square', .035, 160);
        } else if (planet.exitPlanet) {
          this.planetExitTimer += dt;
          if (this.planetExitTimer > .75) this.advanceLevel(this.levelConfig.nextLevel);
        }
      } else {
        let nearest = null;
        let nearestDistance = Infinity;
        const centerX = p.x + p.w / 2;
        const centerY = p.y + p.h / 2;
        for (let index = 0; index < this.platforms.length; index += 1) {
          const planet = this.platforms[index];
          if (!planet.planet) continue;
          const dx = planet.cx - centerX;
          const dy = planet.cy - centerY;
          const distance = Math.hypot(dx, dy);
          const surfaceDistance = distance - planet.currentRadius;
          if (surfaceDistance < nearestDistance) {
            nearestDistance = surfaceDistance;
            nearest = { planet, index, dx, dy, distance };
          }
        }

        if (nearest) {
          const nx = nearest.dx / Math.max(1, nearest.distance);
          const ny = nearest.dy / Math.max(1, nearest.distance);
          const gravity = 610 * nearest.planet.planetGravity;
          p.vx += nx * gravity * dt;
          p.vy += ny * gravity * dt;
          p.vx += direction * 235 * dt;
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 760) {
            p.vx = p.vx / speed * 760;
            p.vy = p.vy / speed * 760;
          }

          if (jumpJustPressed && p.airJumps > 0) {
            p.vy -= 430;
            p.vx += direction * 170;
            p.airJumps -= 1;
            tone(420, .09, 'square', .035, 120);
          }

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          this.playerRotation = Math.atan2(nearest.dy, nearest.dx) - Math.PI / 2;

          const newCenterX = p.x + p.w / 2;
          const newCenterY = p.y + p.h / 2;
          for (let index = 0; index < this.platforms.length; index += 1) {
            const planet = this.platforms[index];
            if (!planet.planet) continue;
            const dx = newCenterX - planet.cx;
            const dy = newCenterY - planet.cy;
            const distance = Math.hypot(dx, dy);
            if (this.planetDetachCooldown <= 0 && distance <= planet.currentRadius + p.h * .52) {
              this.planetAttached = index;
              this.planetAngle = Math.atan2(dy, dx);
              this.planetVisited.add(index);
              this.placePlayerOnPlanet();
              this.toast(`${planet.gravityLabel} PLANET: GRAVITY LOCKED.`);
              tone(210 + index * 24, .16, 'sine', .04, 180);

              this.activeCheckpoints.forEach((cp, checkpointIndex) => {
                if (!cp.reached && index >= cp.planetIndex) {
                  cp.reached = true;
                  this.checkpoint = checkpointIndex + 1;
                  $('#checkpoint-count').textContent = `${this.checkpoint}/${this.activeCheckpoints.length}`;
                  this.toast(`PLANET CHECKPOINT ${this.checkpoint}/${this.activeCheckpoints.length}.`);
                }
              });
              for (const message of this.activeMessages) {
                const key = `planet-${message.planetIndex}`;
                if (index >= message.planetIndex && !this.seenMessages.has(key)) {
                  this.seenMessages.add(key);
                  this.toast(message.text);
                }
              }
              break;
            }
          }
        }
      }

      if (p.y > 720 || p.y < -3380 || p.x < -280 || p.x > WORLD.width + 280) this.die('space');
    },

    collide(axis, now, previousBottom = null, previousTop = null) {
      const p = this.player;
      if (p.climbing) return;
      const solids = this.levelConfig.tacoStorm
        ? this.platforms.concat(this.tacos.filter((taco) => taco.state === 'landed'))
        : this.platforms;
      for (const platform of solids) {
        if (platform.type === 'debris' && !this.elevatorDropped) continue;
        if (platform.type === 'word' && !this.narratorPlacedWords.has(`${platform.stage}-${platform.order}`)) continue;
        if (platform.musical != null && !platform.musicalActive) continue;
        if (platform.broken || !rectsOverlap(p, platform)) continue;
        const oneWay = ((this.levelConfig.lavaClimb || this.levelConfig.oneWayPlatforms) && platform.id !== undefined && !platform.ceiling)
          || platform.type === 'word'
          || (this.levelConfig.movingPlatformsOneWay && platform.type === 'moving');
        if (axis === 'x') {
          if (oneWay || platform.type === 'moving' || platform.type === 'shifting') continue;
          if (p.vx > 0) p.x = platform.x - p.w;
          else if (p.vx < 0) p.x = platform.x + platform.w;
          p.vx = 0;
        } else if (this.gravitySign < 0) {
          if (oneWay) continue;
          if (p.vy < 0 && previousTop >= platform.y + platform.h - 6) {
            p.y = platform.y + platform.h;
            p.vy = 0;
            p.grounded = true;
            p.airJumps = this.maxAirJumps();
            p.ridingPlatformId = platform.id;
          } else if (p.vy > 0 && previousBottom <= platform.y + 6) {
            p.y = platform.y - p.h;
            p.vy = -20;
          }
        } else if (p.vy > 0) {
          if (oneWay && previousBottom > platform.y + 5) continue;
          p.y = platform.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.airJumps = this.maxAirJumps();
          p.ridingPlatformId = (oneWay || platform.type === 'moving' || platform.type === 'shifting' || platform.type === 'orbit' || platform.type === 'copycat' || platform.type === 'word' || platform.type === 'delayed' || platform.conveyor || platform.shrinking || platform.ghost || platform.planet) ? platform.id : null;
          if ((platform.type === 'crumble' || platform.type === 'fake') && !platform.crumbleAt) {
            platform.crumbleAt = now;
            if (platform.type === 'fake') tone(170, .12, 'square', .03, -80);
          }
        } else if (p.vy < 0) {
          if (oneWay) continue;
          p.y = platform.y + platform.h;
          p.vy = 20;
        }
      }
    },

    updateParkourSystems(dt) {
      const p = this.player;
      this.portalCooldown = Math.max(0, this.portalCooldown - dt);

      const ridden = this.platforms.find((platform) => platform.id === p.ridingPlatformId);
      if (ridden?.conveyor && !p.climbing) {
        p.vx += ridden.conveyor * dt;
      }
      if (ridden?.planet && ridden.planetGravity !== this.planetGravityScale) {
        this.planetGravityScale = ridden.planetGravity;
        this.planetGravityLabel = ridden.gravityLabel;
        this.toast(`${ridden.gravityLabel} GRAVITY. THIS PLANET IS NOW SHRINKING.`);
        tone(180 + ridden.planetGravity * 220, .16, 'sine', .04, ridden.planetGravity < .6 ? 180 : -70);
      }

      if (this.portalCooldown <= 0) {
        const portal = this.portals.find((candidate) => rectsOverlap(p, candidate));
        if (portal) {
          p.x = portal.targetX;
          p.y = portal.targetY;
          p.vx *= .65;
          p.vy = -180 * this.gravitySign;
          p.grounded = false;
          p.ridingPlatformId = null;
          p.airJumps = this.maxAirJumps();
          this.portalCooldown = .85;
          this.shake = 5;
          this.toast(`PORTAL ${portal.label}: MOMENTUM MOSTLY PRESERVED.`);
          tone(240, .18, 'sine', .04, 520);
        }
      }
    },

    updateFactoryHazards() {
      const p = this.player;
      for (const hazard of this.factoryHazards) {
        if (hazard.disabled) {
          hazard.active = false;
          continue;
        }
        if (hazard.type === 'crusher') {
          const wave = (Math.sin(this.motionTime * hazard.speed + hazard.phase) + 1) / 2;
          hazard.currentY = hazard.baseY + hazard.travel * Math.pow(wave, 3.2);
          hazard.active = wave > .28;
          if (rectsOverlap(p, { x: hazard.x + 7, y: hazard.currentY + 6, w: hazard.w - 14, h: hazard.h - 8 })) this.die('crusher');
        } else if (hazard.type === 'steam') {
          hazard.active = Math.sin(this.motionTime * hazard.speed + hazard.phase) > .34;
          if (hazard.active && rectsOverlap(p, { x: hazard.x + 8, y: hazard.y, w: hazard.w - 16, h: hazard.h })) this.die('steam');
        }
      }
    },

    updateLevelExtras(dt) {
      const p = this.player;
      this.extraBounceCooldown = Math.max(0, this.extraBounceCooldown - dt);
      for (const zone of this.extraWindZones) {
        if (rectsOverlap(p, zone)) p.vx += zone.direction * 260 * dt;
      }
      if (this.extraBounceCooldown <= 0 && p.grounded) {
        for (const pad of this.extraBouncePads) {
          const onPad = p.x + p.w > pad.x - pad.w / 2 && p.x < pad.x + pad.w / 2
            && Math.abs((p.y + p.h) - pad.y) < 10;
          if (!onPad) continue;
          p.vy = -pad.strength;
          p.grounded = false;
          p.ridingPlatformId = null;
          p.airJumps = this.maxAirJumps();
          this.extraBounceCooldown = .55;
          this.toast('RAGE PAD: UNNECESSARY HEIGHT!');
          tone(260, .12, 'square', .035, 220);
          break;
        }
      }
      for (const box of this.extraMysteryBoxes) {
        if (box.opened || !rectsOverlap(p, box)) continue;
        box.opened = true;
        const effect = Math.floor(Math.random() * 4);
        if (effect === 0) {
          this.shardBank += 2;
          this.toast('MYSTERY BOX: +2 SHOP SHARDS.');
          this.updateShopUI();
        } else if (effect === 1) {
          p.vy = -840;
          p.grounded = false;
          this.toast('MYSTERY BOX: SURPRISE LAUNCH.');
        } else if (effect === 2) {
          p.x = Math.max(20, p.x - 190);
          this.toast('MYSTERY BOX: PROGRESS REFUND.');
        } else {
          this.shieldCharges += 1;
          this.toast('MYSTERY BOX: FREE SPITE SHIELD.');
          this.updateShopUI();
        }
        tone(190 + effect * 120, .18, 'triangle', .04, 100);
      }
    },

    updateTacoRain(dt) {
      const p = this.player;
      for (const taco of this.tacos) {
        if (taco.state === 'dormant' && p.x > taco.triggerX) taco.state = 'warning';
        if (taco.state === 'warning') {
          taco.warning -= dt;
          if (taco.warning <= 0) taco.state = 'falling';
        } else if (taco.state === 'falling') {
          taco.y += 565 * dt;
          if (rectsOverlap(p, taco)) this.die('taco');
          if (taco.y >= taco.targetY) {
            taco.y = taco.targetY;
            taco.state = 'landed';
            taco.life = taco.persistent ? Infinity : 3.2;
            tone(105, .08, 'square', .025, -35);
          }
        } else if (taco.state === 'landed' && !taco.persistent) {
          taco.life -= dt;
          if (rectsOverlap(p, taco) && taco.life > 2.9) this.die('taco');
        }
      }
      this.tacos = this.tacos.filter((taco) => taco.persistent || taco.life > 0 || taco.state !== 'landed');

      this.tacoRainClock -= dt;
      if (this.tacoRainClock <= 0 && p.x > (this.levelConfig.tacoStartX ?? 1750) && p.x < this.levelConfig.goalX - 250) {
        const offsets = [460, 230, 570, 340, 650, 180, 510, 290];
        const x = Math.min(this.levelConfig.goalX - 90, Math.round((p.x + offsets[this.tacoRainIndex % offsets.length]) / 55) * 55);
        this.tacos.push({
          x, y: -55, w: 46, h: 30, targetY: 440, triggerX: -Infinity,
          state: 'warning', warning: .72, persistent: false, life: Infinity,
        });
        this.tacoRainIndex += 1;
        this.tacoRainClock = .66;
      }
    },

    updateWallRoom(dt) {
      const p = this.player;
      const center = p.x + p.w / 2;
      const inFirstAlcove = center > 545 && center < 700 && p.y > 340;
      const inSecondAlcove = center > 1260 && center < 1425 && p.y > 340;

      if (this.wallPhase === 0 && p.x > 160) {
        this.wallPhase = 1;
        this.chasingWall = { x: -110, y: 95, w: 82, h: 375, speed: 350, ghost: false };
        this.toast('GET TO THE ALCOVE!');
      }

      if (this.wallPhase === 1) {
        this.chasingWall.x += this.chasingWall.speed * dt * (this.shopSlowCharm ? .85 : 1);
        if (this.chasingWall.x + this.chasingWall.w > p.x + 5 && !inFirstAlcove) this.die('wall');
        if (this.chasingWall.x > 760) {
          this.wallPhase = 2;
          this.toast('Correct. The alcove saved you.');
        }
      } else if (this.wallPhase === 2 && p.x > 920) {
        this.wallPhase = 3;
        this.chasingWall = { x: 780, y: 95, w: 82, h: 375, speed: 420, ghost: true };
        this.toast('AGAIN! GET TO THE NEXT ALCOVE!');
      } else if (this.wallPhase === 3) {
        this.chasingWall.x += this.chasingWall.speed * dt * (this.shopSlowCharm ? .85 : 1);
        if (inSecondAlcove) {
          this.toast('Wrong. This alcove is the trap.');
          this.die('alcove');
        }
        if (this.chasingWall.x > 2050) {
          this.wallPhase = 4;
          startTacoMusic();
          this.toast('It passed through you. Now: tacos.');
        }
      }
    },

    updateMirrorRoom(dt) {
      const p = this.player;
      this.mirrorTime += dt;

      if (p.x > 170 || this.mirrorHistory.length) {
        this.mirrorHistory.push({ time: this.mirrorTime, x: p.x, y: p.y });
        const targetTime = this.mirrorTime - 1.75;
        while (this.mirrorHistory.length > 2 && this.mirrorHistory[1].time <= targetTime) this.mirrorHistory.shift();
        if (this.mirrorHistory[0]?.time <= targetTime) {
          const before = this.mirrorHistory[0];
          const after = this.mirrorHistory[1] || before;
          const span = Math.max(.001, after.time - before.time);
          const amount = Math.max(0, Math.min(1, (targetTime - before.time) / span));
          this.shadow.x = before.x + (after.x - before.x) * amount;
          this.shadow.y = before.y + (after.y - before.y) * amount;
          this.shadow.visible = true;
        }
      }

      const onPad = (entity, x, width) => entity.x + entity.w / 2 > x
        && entity.x + entity.w / 2 < x + width
        && entity.y + entity.h > 425;
      const playerOnA = onPad(p, 760, 90);
      const playerOnB = onPad(p, 1040, 90);
      const shadowOnA = this.shadow.visible && onPad(this.shadow, 760, 90);
      const shadowOnB = this.shadow.visible && onPad(this.shadow, 1040, 90);

      if (!this.mirrorSolved && ((playerOnA && shadowOnB) || (playerOnB && shadowOnA))) {
        this.mirrorSolved = true;
        this.toast('BOTH BUTTONS. THE MIRROR GATE IS OPEN.');
        tone(480, .2, 'sine', .045, 280);
      }

      if (!this.mirrorSolved && p.x > 1250) {
        p.x = 1250;
        p.vx = 0;
      }

      if (this.mirrorSolved && !this.controlsReversed && p.x > 1500 && !this.fakeExitTriggered) {
        this.controlsReversed = true;
        this.toast('CONTROLS REFLECTED. LEFT IS RIGHT.');
        tone(210, .18, 'square', .04, -80);
      }

      if (this.shadow.visible && this.mirrorTime > 3 && rectsOverlap(
        { x: p.x + 4, y: p.y + 3, w: p.w - 8, h: p.h - 6 },
        { x: this.shadow.x + 4, y: this.shadow.y + 3, w: this.shadow.w - 8, h: this.shadow.h - 6 },
      )) this.die('shadow');

      if (this.realExitVisible && p.x < 45) this.advanceLevel(5);
    },

    triggerFakeMirrorExit() {
      if (this.fakeExitTriggered || this.player.dead) return;
      this.fakeExitTriggered = true;
      this.player.dead = true;
      this.controlsReversed = false;
      $('#level-banner h2').textContent = 'FAKE EXIT';
      $('#level-banner small').textContent = 'Look behind you';
      $('#level-banner').classList.remove('hidden');
      tone(120, .45, 'sawtooth', .07, -80);
      window.setTimeout(() => {
        const p = this.player;
        p.x = 280;
        p.y = 420;
        p.vx = 0;
        p.vy = 0;
        p.dead = false;
        this.realExitVisible = true;
        this.mirrorTime = 0;
        this.mirrorHistory = [];
        this.shadow.visible = false;
        this.cameraX = 0;
        $('#level-banner').classList.add('hidden');
        this.toast('The real exit was behind the beginning.');
      }, 1250);
    },

    updateRedLightRoom(dt) {
      const p = this.player;
      this.redLightClock += dt;
      this.redLightPenalty = Math.max(0, this.redLightPenalty - dt);
      this.redLightTimeLeft -= dt;
      if (this.redLightTimeLeft <= 0) {
        this.redLightCanMove = !this.redLightCanMove;
        this.redLightSwitches += 1;
        this.redLightTimeLeft = this.redLightCanMove
          ? .65 + Math.random() * 1.55
          : .5 + Math.random() * 1.25;
        tone(this.redLightCanMove ? 520 : 125, .1, this.redLightCanMove ? 'sine' : 'square', .025, this.redLightCanMove ? 100 : -35);
      }
      for (const decoy of this.redLightDecoys) {
        decoy.time -= dt;
        if (decoy.time <= 0) {
          decoy.green = Math.random() > .5;
          decoy.time = .3 + Math.random() * 1.65;
        }
      }

      if (!this.redLightReversed && p.x > 1400) {
        this.redLightReversed = true;
        this.toast('THE SIGN LIES NOW. WATCH THE REFLECTION.');
      }

      if (!this.redLightFinal && p.x > 2230) {
        this.redLightFinal = true;
        this.toast('BOTH LIGHTS! JUMP WITHOUT MOVING SIDEWAYS.');
      }

      const horizontalInput = this.keys.left || this.keys.right;
      const anyMovementInput = horizontalInput || this.keys.jump;
      if (!this.redLightFinal && !this.redLightCanMove && anyMovementInput && this.redLightPenalty <= 0) {
        p.x = Math.max(70, p.x - (260 + Math.random() * 260));
        p.vx = 0;
        p.vy = 0;
        this.redLightPenalty = .7;
        this.toast('THE STATUE SAW YOU MOVE.');
        tone(90, .2, 'sawtooth', .05, -40);
      }

      if (this.redLightFinal && !this.redLightFinalSolved && this.keys.jump && !horizontalInput) {
        this.redLightFinalSolved = true;
        this.toast('PERFECTLY STILL JUMP. FINAL GATE OPEN.');
        tone(520, .2, 'sine', .045, 260);
      }
      if (!this.redLightFinalSolved && p.x > 2470) {
        p.x = 2470;
        p.vx = 0;
      }
    },

    selectElevatorFloor(floor) {
      if (!this.levelConfig?.elevatorRoom || this.elevatorDropped || this.player.dead) return;
      this.elevatorVisited.add(floor);
      const button = $(`#floor-buttons button[data-floor="${floor}"]`);
      button?.classList.add('visited');
      $('#elevator-readout').textContent = floor === 10 ? 'TOP FLOOR' : `FLOOR ${floor}`;

      const traps = {
        1: 'Floor 1: The doors close on your confidence.',
        2: 'Floor 2: Wrong floor. Obviously.',
        3: 'Floor 3: The elevator jumps before you do.',
        4: 'Floor 4: The lights are pretending to work.',
        5: 'Floor 5: Controls reversed for three seconds.',
        6: 'Floor 6: This floor is just Floor 4 wearing a hat.',
        7: 'Floor 7: Sudden sideways inspection.',
        8: 'Floor 8: Maximum elevator music. Minimum elevator.',
        9: 'Floor 9: One floor away from a terrible decision.',
      };

      if (floor === 10) {
        this.triggerElevatorDrop();
        return;
      }
      this.toast(traps[floor]);
      this.shake = Math.max(this.shake, 3 + floor * .35);
      tone(180 + floor * 34, .12, 'square', .025, floor % 2 ? 40 : -40);
      if (floor === 3) this.player.vy = -360;
      if (floor === 5) {
        this.elevatorControlsReversed = true;
        this.elevatorTrapTimer = 3;
      }
      if (floor === 7) this.player.vx = this.player.x < 700 ? 520 : -520;

      $$('#floor-buttons button').forEach((floorButton) => {
        floorButton.style.order = String(Math.floor(Math.random() * 30));
      });
    },

    triggerElevatorDrop() {
      if (this.elevatorDropped || this.player.dead) return;
      this.player.dead = true;
      $('#elevator-panel').classList.add('hidden');
      $('#level-banner h2').textContent = 'CABLE SNAPPED';
      $('#level-banner small').textContent = 'Top floor selected';
      $('#level-banner').classList.remove('hidden');
      tone(75, .8, 'sawtooth', .08, -45);
      window.setTimeout(() => {
        this.elevatorDropped = true;
        const elevator = this.platforms.find((platform) => platform.type === 'elevator');
        if (elevator) elevator.broken = true;
        this.player.x = 1110;
        this.player.y = 420;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.dead = false;
        this.cameraX = 700;
        $('#level-banner').classList.add('hidden');
        this.toast('Use the debris. Find the emergency button underneath.');
      }, 1350);
    },

    updateElevatorRoom(dt) {
      if (this.elevatorTrapTimer > 0) {
        this.elevatorTrapTimer -= dt;
        if (this.elevatorTrapTimer <= 0) this.elevatorControlsReversed = false;
      }
      if (this.elevatorDropped && this.player.x < 85) this.advanceLevel(7);
    },

    updateDarkMonsterRoom(dt) {
      const p = this.player;
      this.monsterScare = Math.max(0, this.monsterScare - dt);

      if (this.monsterEncounter === 0 && p.x > 520) {
        this.monsterEncounter = 1;
        this.monster = { x: 840, y: 315, w: 105, h: 155, active: true, minX: 840, maxX: 1030, direction: 1, speed: 125 };
        this.monsterScare = .75;
        this.shake = 10;
        this.toast('MONSTER! DOUBLE JUMP ON ITS HEAD!');
        tone(58, .65, 'sawtooth', .08, 35);
      }

      if (this.monsterEncounter === 2 && p.x > 1430) {
        this.monsterEncounter = 3;
        this.monster = { x: 1580, y: 315, w: 105, h: 155, active: true, minX: 1580, maxX: 1745, direction: 1, speed: 140 };
        this.monsterScare = .7;
        const trapFloor = this.platforms.find((platform) => platform.type === 'fake' && platform.h === 40);
        if (trapFloor) trapFloor.crumbleAt = performance.now();
        this.toast('THE FLOOR IS GOING—AND IT CAME BACK!');
        tone(62, .65, 'sawtooth', .08, 45);
      }

      if (this.monster.active) {
        this.monster.x += this.monster.direction * this.monster.speed * dt * (this.shopSlowCharm ? .85 : 1);
        if (this.monster.x >= this.monster.maxX) {
          this.monster.x = this.monster.maxX;
          this.monster.direction = -1;
        } else if (this.monster.x <= this.monster.minX) {
          this.monster.x = this.monster.minX;
          this.monster.direction = 1;
        }
      }

      if (this.monster.active && rectsOverlap(p, this.monster)) {
        const stomped = p.vy > 0 && p.y + p.h < this.monster.y + 38;
        if (stomped) {
          p.y = this.monster.y - p.h;
          p.vy = -510;
          p.airJumps = this.maxAirJumps();
          this.monster.active = false;
          this.monsterEncounter = this.monsterEncounter === 1 ? 2 : 4;
          this.toast(this.monsterEncounter === 4 ? 'LIGHTS ON. PARKOUR TIME.' : 'STOMPED. KEEP GOING.');
          tone(145, .16, 'square', .055, -75);
        } else {
          this.die('monster');
        }
      }

      if (this.monsterEncounter === 1 && p.x > 1080) {
        p.x = 1080;
        p.vx = 0;
      }
      if (this.monsterEncounter === 3 && p.x > 1810) {
        p.x = 1810;
        p.vx = 0;
      }
    },

    updateChaosRoom(dt) {
      const p = this.player;
      const events = ['reverse', 'moon', 'rain', 'super', 'quake'];
      const labels = {
        reverse: 'WHAT THE HELL: CONTROLS REVERSED',
        moon: 'WHAT THE HELL: MOON GRAVITY',
        rain: 'WHAT THE HELL: FIREBALL WEATHER',
        super: 'WHAT THE HELL: SUPER JUMPS',
        quake: 'WHAT THE HELL: EARTHQUAKE',
      };

      this.chaosClock -= dt * (this.shopSlowCharm ? .85 : 1);
      if (this.chaosClock <= 0) {
        this.chaosEventIndex = (this.chaosEventIndex + 1) % events.length;
        this.chaosEvent = events[this.chaosEventIndex];
        this.chaosClock = 3.1;
        this.chaosSpawnClock = 0;
        this.toast(labels[this.chaosEvent]);
        tone(120 + this.chaosEventIndex * 55, .18, 'sawtooth', .035, 70);
      }

      if (this.chaosEvent === 'quake') this.shake = Math.max(this.shake, 5.5);

      if (this.chaosEvent === 'rain') {
        this.chaosSpawnClock -= dt;
        if (this.chaosSpawnClock <= 0) {
          this.chaosOrbs.push({
            x: Math.max(0, Math.min(WORLD.width - 30, p.x - 240 + Math.random() * 820)),
            y: -55,
            w: 28,
            h: 28,
            vy: 230 + Math.random() * 150,
          });
          this.chaosSpawnClock = .24;
        }
      }

      for (const orb of this.chaosOrbs) {
        orb.y += orb.vy * dt * (this.shopSlowCharm ? .85 : 1);
        orb.vy += 320 * dt;
        if (rectsOverlap(p, orb)) this.die('fireball');
      }
      this.chaosOrbs = this.chaosOrbs.filter((orb) => orb.y < WORLD.height + 60);
    },

    updateQuizRoom(dt, interactPressed) {
      const triggers = [620, 1220, 1820, 2420, 3020, 3920];
      this.quizWrongFlash = Math.max(0, this.quizWrongFlash - dt);
      if (!this.quizActive && this.quizIndex < triggers.length && this.player.x >= triggers[this.quizIndex]) {
        this.showQuizQuestion();
      }
      const atSecretDoor = this.player.x > 520 && this.player.x < 665;
      if (this.quizDoorUnlocked && !this.quizHasUnknownButton && atSecretDoor && interactPressed) {
        this.quizHasUnknownButton = true;
        this.toast('YOU TOOK THE “I DON’T KNOW” BUTTON.');
        tone(580, .22, 'sine', .05, 220);
      }
      const atFinalSlot = this.player.x > 4140 && this.player.x < 4490;
      if (this.quizHasUnknownButton && atFinalSlot && interactPressed) {
        this.quizHasUnknownButton = false;
        this.toast('I DON’T KNOW: ACCEPTED.');
        this.advanceLevel(10);
      }
    },

    showQuizQuestion() {
      const questions = [
        'Does 2 + 2 equal 4?',
        'Is ice cold?',
        'Is the sun made of cheese?',
        'Can a fish breathe underwater?',
        'Is 10 smaller than 3?',
        this.quizGibberish,
      ];
      this.quizActive = true;
      this.player.vx = 0;
      $('#quiz-number').textContent = `QUESTION ${this.quizIndex + 1} OF 6`;
      $('#quiz-question').textContent = questions[this.quizIndex];
      $('#quiz-result').textContent = this.quizIndex === 5 ? 'YES or NO. One of them must mean something.' : 'Choose carefully.';
      $('#quiz-panel').classList.toggle('impossible', this.quizIndex === 5);
      $('#quiz-panel').classList.remove('hidden');
      tone(this.quizIndex === 5 ? 85 : 410, .15, this.quizIndex === 5 ? 'sawtooth' : 'sine', .04, 40);
    },

    answerQuiz(answer) {
      if (!this.levelConfig?.quizRoom || !this.quizActive) return;
      const correctAnswers = ['yes', 'yes', 'no', 'yes', 'no'];
      if (this.quizIndex < 5 && answer === correctAnswers[this.quizIndex]) {
        this.quizIndex += 1;
        this.quizActive = false;
        $('#quiz-panel').classList.add('hidden');
        $('#quiz-panel').classList.remove('impossible');
        this.toast('CORRECT. That was suspiciously easy.');
        tone(540, .12, 'sine', .035, 160);
        return;
      }

      if (this.quizIndex < 5) {
        $('#quiz-result').textContent = 'WRONG. Try the obvious answer.';
        this.quizWrongFlash = .4;
        tone(110, .18, 'square', .05, -45);
        return;
      }

      $('#quiz-result').textContent = `${answer.toUpperCase()} IS WRONG. BOTH BUTTONS ARE WRONG.`;
      this.quizDoorUnlocked = true;
      this.quizIndex = 6;
      tone(72, .5, 'sawtooth', .075, -35);
      window.setTimeout(() => {
        if (!this.levelConfig?.quizRoom) return;
        this.quizActive = false;
        $('#quiz-panel').classList.add('hidden');
        $('#quiz-panel').classList.remove('impossible');
        this.toast('EVERY ANSWER WAS WRONG. RETURN TO QUESTION 1.');
      }, 1100);
    },

    narratorPhrases() {
      return [
        ['LISTEN', 'TO', 'ME'],
        ['MAKE', 'ME', 'SPEAK'],
        ["DON'T", 'FALL', 'NOW'],
        ['THE', 'EXIT', 'IS', 'BEHIND', 'YOU'],
      ];
    },

    setupNarratorWordBank() {
      const bank = $('#narrator-word-bank');
      bank.replaceChildren();
      const phrases = this.narratorPhrases();
      if (this.narratorWordStage >= phrases.length) {
        $('#narrator-word-status').textContent = 'ALL BRIDGES BUILT · TRIPLE-JUMP BACK';
        return;
      }
      const phrase = phrases[this.narratorWordStage];
      if (this.narratorStageReady) {
        $('#narrator-word-status').textContent = 'BRIDGE COMPLETE · PARKOUR TO THE GLOWING WORD';
        return;
      }
      const selected = new Set(phrase.slice(0, this.narratorNextWordIndex));
      const decoys = [['RUN', 'IGNORE'], ['DON’T', 'STOP'], ['JUMP', 'PLEASE'], ['AHEAD', 'TRUST', 'ME']][this.narratorWordStage];
      const choices = phrase.filter((word) => !selected.has(word)).concat(decoys).sort(() => Math.random() - .5);
      for (const word of choices) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.word = word;
        button.textContent = word;
        bank.append(button);
      }
      $('#narrator-word-status').textContent = `${this.narratorNextWordIndex}/${phrase.length} WORDS PLACED · CLICK IN ORDER`;
    },

    chooseNarratorWord(word) {
      if (!this.levelConfig?.narratorRoom || this.narratorWordStage >= 4 || this.narratorStageReady) return;
      const phrase = this.narratorPhrases()[this.narratorWordStage];
      const expected = phrase[this.narratorNextWordIndex];
      if (word !== expected) {
        for (let index = 0; index < phrase.length; index += 1) {
          this.narratorPlacedWords.delete(`${this.narratorWordStage}-${index}`);
        }
        this.narratorNextWordIndex = 0;
        this.shake = 5;
        this.toast(`WRONG WORD. “${word}” BROKE THE BRIDGE.`);
        tone(95, .22, 'square', .05, -55);
        this.setupNarratorWordBank();
        return;
      }
      this.narratorPlacedWords.add(`${this.narratorWordStage}-${this.narratorNextWordIndex}`);
      this.narratorNextWordIndex += 1;
      this.narratorStageReady = this.narratorNextWordIndex === phrase.length;
      tone(420 + this.narratorNextWordIndex * 75, .1, 'sine', .035, 80);
      this.setupNarratorWordBank();
    },

    updateNarratorRoom(interactPressed) {
      const p = this.player;
      const lines = [
        'Click my words in order, then jump across them: LISTEN TO ME.',
        'Build the next bridge: MAKE ME SPEAK.',
        'Choose carefully: DON\'T FALL NOW.',
        'Build the longest bridge: THE EXIT IS BEHIND YOU.',
        'I told you where it is. Triple-jump all the way back.',
      ];

      const word = this.platforms.find((platform) => platform.id === p.ridingPlatformId && platform.type === 'word');
      if (word && !this.narratorVisitedWords.has(word.id)) {
        this.narratorVisitedWords.add(word.id);
        word.wordPulse = .45;
        this.toast(`THE NARRATOR SAYS: ${word.label}`);
        tone(300 + (word.id % 5) * 65, .1, 'square', .035, 80);
        for (let i = 0; i < 8; i += 1) {
          this.particles.push({
            x: word.x + Math.random() * word.w,
            y: word.y,
            vx: (Math.random() - .5) * 100,
            vy: -50 - Math.random() * 90,
            life: .35 + Math.random() * .25,
          });
        }
      }

      if (word?.endpoint && word.stage === this.narratorWordStage && this.narratorStageReady) {
        this.narratorWordStage += 1;
        if (this.narratorWordStage === 4) this.narratorRealExit = true;
        this.narratorNextWordIndex = 0;
        this.narratorStageReady = false;
        this.setupNarratorWordBank();
        this.shake = 5;
      }

      for (const platform of this.platforms) {
        if (platform.wordPulse > 0) platform.wordPulse = Math.max(0, platform.wordPulse - .016);
      }

      if (this.narratorWordStage !== this.narratorPhase) {
        this.narratorPhase = this.narratorWordStage;
        $('#narrator-line').textContent = lines[this.narratorWordStage];
        $('#narrator-box').classList.toggle('lie', this.narratorWordStage >= 3);
        tone(220 + this.narratorWordStage * 70, .18, 'sine', .035, 90);
      }

      const atRealExit = this.narratorRealExit && p.x < 115;
      if (atRealExit && interactPressed) this.advanceLevel(11);
    },

    updateDelayedPlatform(dt) {
      for (const platform of this.platforms) {
        if (platform.type !== 'delayed') continue;
        if (this.player.ridingPlatformId === platform.id && !platform.falling) {
          platform.fallTimer += dt;
          if (platform.fallTimer > platform.delay) {
            platform.falling = true;
            platform.fallSpeed = 35;
            this.toast('THIS ONE RAN OUT OF PATIENCE.');
            tone(105, .24, 'sawtooth', .05, -50);
          }
        }
        if (platform.falling) {
          const oldY = platform.y;
          platform.fallSpeed += 440 * dt;
          platform.y += platform.fallSpeed * dt;
          if (this.player.ridingPlatformId === platform.id) this.player.y += platform.y - oldY;
        }
      }
    },

    updateMovingFinish(dt) {
      const p = this.player;
      const distance = this.movingFinishX - (p.x + p.w);
      const maximums = [1800, 3100, 4140];
      if (distance < 520 && distance > 0 && Math.abs(p.vx) > 25) {
        this.movingFinishX = Math.min(maximums[this.movingFinishStage], this.movingFinishX + (260 + this.movingFinishStage * 30) * dt);
      } else if (distance < 560 && Math.abs(p.vx) < 12 && p.grounded) {
        this.movingFinishX = Math.max(p.x + 18, this.movingFinishX - 165 * dt);
      }
      if (Math.abs(this.movingFinishX - (p.x + p.w)) < 25 && Math.abs(p.vx) < 18) {
        if (this.movingFinishStage >= 2) {
          this.advanceLevel(13);
        } else {
          this.movingFinishStage += 1;
          this.movingFinishX = [1450, 2750, 3950][this.movingFinishStage];
          this.toast(`CHECKPOINT ${this.movingFinishStage}/3 CAUGHT. HERE COMES ANOTHER.`);
          tone(480, .18, 'sine', .04, 180);
        }
      }
    },

    updateReverseDoor() {
      const p = this.player;
      if (this.reverseDoorStage < 3 && p.x > 3040) {
        p.x = 3040;
        p.vx = 0;
      }
      if (this.reverseDoorStage === 3 && p.x > 3520) {
        p.x = 3520;
        p.vx = 0;
      }
      if (this.reverseDoorStage >= reverseDoors.length) {
        if (!this.reverseEndReached && p.x > 6380) {
          this.reverseEndReached = true;
          p.vx = 0;
          this.keys.left = this.keys.right = this.keys.jump = this.keys.climb = false;
          this.toast('BRO, WHY DID YOU DO ALL THAT PARKOUR? THE SECRET E LADDER WAS IN THE CENTER.');
          tone(95, .55, 'sawtooth', .065, -45);
          window.setTimeout(() => {
            if (this.level === 13 && this.reverseEndReached) this.advanceLevel(14);
          }, 2600);
        }
        return;
      }
      const door = reverseDoors[this.reverseDoorStage];
      const touchingDoor = rectsOverlap(p, door);
      if (!touchingDoor) return;
      if (p.vx < -20) {
        this.reverseDoorStage += 1;
        if (this.reverseDoorStage >= reverseDoors.length) {
          this.reverseParkourUnlocked = true;
          p.x = 3175;
          p.y = 365;
          p.vx = 0;
          p.vy = 0;
          this.cameraY = 0;
          this.toast('DOOR 4 SOLVED. THE IMPOSSIBLE HORIZONTAL ROUTE IS UNLOCKED.');
          tone(620, .24, 'square', .05, 220);
        } else {
          p.x = door.x + 95;
          p.vx = 0;
          this.toast(`BACKWARD DOOR ${this.reverseDoorStage}/4 SOLVED.`);
          tone(520, .16, 'sine', .04, 160);
        }
      } else if (p.vx > 20) {
        const retries = [
          { x: 150, y: 420 },
          { x: 1050, y: 420 },
          { x: 1950, y: 420 },
          { x: 3150, y: -970 },
        ];
        p.x = retries[this.reverseDoorStage].x;
        p.y = retries[this.reverseDoorStage].y;
        p.vx = 0;
        p.vy = 0;
        this.shake = 8;
        this.toast('WRONG DIRECTION. ENTER BACKWARDS.');
        tone(90, .3, 'square', .055, -45);
      }
    },

    updateLoadingRoom(dt) {
      if (!this.loadingTriggered && this.player.x > 500) {
        this.loadingTriggered = true;
        this.loadingTime = 0;
        this.loadingClicks = 0;
        this.loadingStage = 0;
        this.loadingSubstep = 0;
        this.player.vx = 0;
        this.keys.left = this.keys.right = this.keys.jump = this.keys.climb = false;
        $('#troll-overlay').classList.remove('hidden', 'victory');
        $('#troll-overlay-kicker').textContent = 'LOADING NEXT ROOM';
        $('#troll-overlay-title').textContent = '73%';
        $('#troll-progress-bar').style.width = '73%';
        $('#troll-overlay-hint').textContent = 'Automatic loading failed. Manual pointer repair required.';
        $('#overlay-continue').classList.add('hidden');
        $('#overlay-target').classList.add('hidden');
        $('#loading-puzzle').classList.remove('hidden');
        this.renderLoadingPuzzle();
      }
      if (this.loadingTriggered) {
        this.loadingTime += dt;
        this.player.vx = 0;
        if (this.loadingTime > 5 && this.loadingStage === 0 && this.loadingClicks === 0) {
          $('#loading-puzzle-status').textContent = 'Hint: one × is hiding among the + symbols.';
        }
      }
    },

    setLoadingProgress(label, width = label) {
      $('#troll-overlay-title').textContent = label;
      $('#troll-progress-bar').style.width = width;
    },

    renderLoadingPuzzle(message = '') {
      const board = $('#loading-puzzle-board');
      const task = $('#loading-puzzle-task');
      const status = $('#loading-puzzle-status');
      $('#loading-puzzle-count').textContent = `REPAIR ${this.loadingStage + 1} / 6`;
      status.classList.remove('error');
      board.className = 'loading-puzzle-board';

      if (this.loadingStage === 0) {
        task.textContent = 'Find the single broken pixel.';
        board.innerHTML = Array.from({ length: 24 }, (_, index) =>
          `<button class="${index === 17 ? 'pixel-fault' : ''}" data-loading-action="pixel" data-correct="${index === 17}">${index === 17 ? '×' : '+'}</button>`
        ).join('');
        status.textContent = message || 'The diagnostics insist every pixel is identical.';
      } else if (this.loadingStage === 1) {
        task.textContent = 'Reconnect nodes 1 → 5 in order.';
        const numbers = [4, 1, 6, 3, 5, 2];
        board.innerHTML = numbers.map((number) =>
          `<button class="number-node ${number < this.loadingSubstep + 1 && number <= 5 ? 'done' : ''}" data-loading-action="number" data-value="${number}">${number}</button>`
        ).join('');
        status.textContent = message || `Next required node: ${this.loadingSubstep + 1}. Node 6 is not part of the circuit.`;
      } else if (this.loadingStage === 2) {
        task.textContent = 'Patch wires: CYAN → RED → GOLD.';
        const colors = ['gold', 'green', 'red', 'purple', 'cyan'];
        board.innerHTML = colors.map((color) =>
          `<button class="wire-node" data-loading-action="wire" data-color="${color}">${color.toUpperCase()}</button>`
        ).join('');
        status.textContent = message || `Connected ${this.loadingSubstep} / 3. Decoy wires reset the patch.`;
      } else if (this.loadingStage === 3) {
        task.textContent = 'Calibrate the pointer. Catch four targets.';
        const points = [[12, 18], [77, 60], [43, 72], [68, 15]];
        const [left, top] = points[this.loadingSubstep];
        board.classList.add('point-board');
        board.innerHTML = `<button class="calibration-point" style="left:${left}%;top:${top}%" data-loading-action="point" aria-label="Calibration point">+</button>`;
        status.textContent = message || `Pointer hits: ${this.loadingSubstep} / 4.`;
      } else if (this.loadingStage === 4) {
        task.textContent = 'Delete the corrupted checksum symbol.';
        board.innerHTML = Array.from({ length: 24 }, (_, index) =>
          `<button class="symbol-cell" data-loading-action="symbol" data-correct="${index === 8}">${index === 8 ? '◇' : '◆'}</button>`
        ).join('');
        status.textContent = message || 'One symbol is hollow. The rest are innocent.';
      } else {
        task.textContent = 'To continue loading, obey the error log.';
        board.innerHTML = '<button class="final-command continue" data-loading-action="finish" data-value="continue">CONTINUE</button><button class="final-command abort" data-loading-action="finish" data-value="abort">ABORT LOADING</button>';
        status.textContent = message || 'ERROR LOG: CONTINUE is corrupted. ABORT will safely continue.';
      }
    },

    failLoadingPuzzle(message) {
      this.loadingSubstep = 0;
      this.shake = 5;
      tone(105, .16, 'square', .045, -45);
      this.renderLoadingPuzzle(message);
      $('#loading-puzzle-status').classList.add('error');
    },

    completeLoadingStage() {
      this.loadingClicks += 1;
      this.loadingStage += 1;
      this.loadingSubstep = 0;
      const percentages = ['78%', '83%', '89%', '94%', '99%', '100%'];
      this.setLoadingProgress(percentages[this.loadingStage - 1]);
      tone(390 + this.loadingStage * 55, .11, 'square', .035, 90);
      if (this.loadingStage >= 6) {
        $('#loading-puzzle').classList.add('hidden');
        $('#troll-overlay-hint').textContent = 'Manual loading complete. Somehow.';
        window.setTimeout(() => {
          if (this.level === 14 && this.loadingTriggered) this.advanceLevel(15);
        }, 500);
        return;
      }
      this.renderLoadingPuzzle('Repair accepted. The next error has appeared.');
    },

    clickLoadingPuzzle(button) {
      if (!this.levelConfig?.loadingRoom || !this.loadingTriggered || this.player.dead) return;
      const action = button.dataset.loadingAction;
      if (this.loadingStage === 0 && action === 'pixel') {
        if (button.dataset.correct === 'true') this.completeLoadingStage();
        else this.failLoadingPuzzle('That pixel was fine. The diagnostic grid rebooted.');
      } else if (this.loadingStage === 1 && action === 'number') {
        const number = Number(button.dataset.value);
        if (number === this.loadingSubstep + 1) {
          this.loadingSubstep += 1;
          if (this.loadingSubstep === 5) this.completeLoadingStage();
          else {
            tone(310 + this.loadingSubstep * 45, .06, 'square', .025, 30);
            this.renderLoadingPuzzle();
          }
        } else this.failLoadingPuzzle('Wrong node. The numbered circuit disconnected.');
      } else if (this.loadingStage === 2 && action === 'wire') {
        const order = ['cyan', 'red', 'gold'];
        if (button.dataset.color === order[this.loadingSubstep]) {
          this.loadingSubstep += 1;
          if (this.loadingSubstep === order.length) this.completeLoadingStage();
          else this.renderLoadingPuzzle();
        } else this.failLoadingPuzzle('Wrong wire. Patch sequence reset to CYAN.');
      } else if (this.loadingStage === 3 && action === 'point') {
        this.loadingSubstep += 1;
        if (this.loadingSubstep === 4) this.completeLoadingStage();
        else {
          tone(540 + this.loadingSubstep * 65, .055, 'sine', .025, 80);
          this.renderLoadingPuzzle();
        }
      } else if (this.loadingStage === 4 && action === 'symbol') {
        if (button.dataset.correct === 'true') this.completeLoadingStage();
        else this.failLoadingPuzzle('Solid checksum verified. Find the hollow one.');
      } else if (this.loadingStage === 5 && action === 'finish') {
        if (button.dataset.value === 'abort') this.completeLoadingStage();
        else this.failLoadingPuzzle('CONTINUE was corrupted, exactly as the error log warned.');
      }
    },

    clickLoadingTarget() {
      // Kept for old cached markup; Level 14 now uses the full diagnostic board.
      if (this.levelConfig?.loadingRoom && this.loadingTriggered) this.renderLoadingPuzzle();
    },

    updateDoublePressRoom(dt, interactPressed) {
      const p = this.player;
      const atButton = p.x > 1080 && p.x < 1280;
      if (atButton && interactPressed && this.doublePressCount < 2) {
        this.doublePressCount += 1;
        if (this.doublePressCount === 1) {
          this.toast('DO NOT PRESS THAT BUTTON TWICE.');
          tone(180, .14, 'square', .04, -40);
        } else {
          this.buttonChaseWall = { x: Math.max(-90, p.x - 900), y: 55, w: 95, h: 415, speed: 275, elapsed: 0 };
          this.toast('YOU PRESSED IT TWICE. RUN.');
          tone(72, .45, 'sawtooth', .07, -35);
        }
      }
      if (this.buttonChaseWall) {
        this.buttonChaseWall.elapsed += dt;
        this.buttonChaseWall.speed = Math.min(365, 275 + this.buttonChaseWall.elapsed * 8.5);
        this.buttonChaseWall.x += this.buttonChaseWall.speed * dt * (this.shopSlowCharm ? .85 : 1);
        if (rectsOverlap(p, this.buttonChaseWall)) this.die('wall');
        if (p.x > 4090) this.advanceLevel(17);
      }
    },

    updateFakeVictoryRoom(dt) {
      if (!this.fakeVictoryTriggered && this.player.x > this.levelConfig.victoryX) {
        this.fakeVictoryTriggered = true;
        this.fakeVictoryTime = 0;
        this.fakeVictoryClicks = 0;
        this.player.vx = 0;
        this.keys.left = this.keys.right = this.keys.jump = this.keys.climb = false;
        $('#troll-overlay').classList.add('victory');
        $('#troll-overlay').classList.remove('hidden');
        $('#troll-overlay-kicker').textContent = 'CONGRATULATIONS';
        $('#troll-overlay-title').textContent = 'YOU WIN!';
        $('#troll-progress-bar').style.width = '100%';
        $('#troll-overlay-hint').textContent = 'The obby is complete. Claim your completely real victory.';
        $('#overlay-target').classList.add('hidden');
        $('#overlay-continue').classList.remove('hidden');
        $('#overlay-continue').textContent = 'CLAIM VICTORY';
      }
      if (this.fakeVictoryTriggered) {
        this.fakeVictoryTime += dt;
        this.player.vx = 0;
      }
    },

    clickVictoryButton() {
      if (!this.levelConfig?.fakeVictoryRoom || !this.fakeVictoryTriggered || this.player.dead) return;
      if (this.fakeVictoryClicks === 0) {
        this.fakeVictoryClicks = 1;
        $('#troll-overlay').classList.remove('victory');
        $('#troll-overlay-kicker').textContent = 'HA HA';
        $('#troll-overlay-title').textContent = 'FAKE VICTORY';
        $('#troll-overlay-hint').textContent = 'There is no hidden parkour. Press once more to actually escape.';
        $('#overlay-continue').textContent = 'ESCAPE ANYWAY';
        tone(85, .4, 'sawtooth', .065, -40);
      } else {
        $('#overlay-continue').classList.add('hidden');
        this.win();
      }
    },

    updateLavaClimb(dt) {
      const p = this.player;
      if (!this.lavaActive && p.x > 335) {
        this.lavaActive = true;
        this.lavaY = 540;
        this.toast('WHAT? CLIMB!');
        tone(82, .5, 'sawtooth', .07, -30);
      }
      if (!this.lavaActive) return;

      this.whatModeClock -= dt;
      if (this.whatModeClock <= 0) {
        const modes = ['LEFT WIND', 'RIGHT WIND', 'LOW GRAVITY', 'FRENZY', 'CALM'];
        let nextMode = modes[Math.floor(Math.random() * modes.length)];
        if (nextMode === this.whatMode) nextMode = modes[(modes.indexOf(nextMode) + 1) % modes.length];
        this.whatMode = nextMode;
        this.whatModeClock = 3.2 + Math.random() * 2.4;
        this.toast(`WHAT MODE: ${this.whatMode}`);
        tone(150 + Math.random() * 260, .16, 'square', .03, 80);
      }
      if (this.whatMode === 'LEFT WIND') p.vx -= 230 * dt;
      if (this.whatMode === 'RIGHT WIND') p.vx += 230 * dt;
      if (this.whatMode === 'LOW GRAVITY' && !p.grounded) p.vy -= 520 * dt;

      this.lavaElapsed += dt;
      const lavaSpeed = Math.min(34, 15 + this.lavaElapsed * .14);
      this.lavaY -= lavaSpeed * dt * (this.shopSlowCharm ? .85 : 1);
      const targetY = this.levelConfig.doorY + 95;
      const distance = Math.max(0, this.lavaY - targetY);
      const acceleration = .12;
      const secondsLeft = (Math.sqrt(lavaSpeed * lavaSpeed + 2 * acceleration * distance) - lavaSpeed) / acceleration;
      $('#danger-time').textContent = secondsLeft.toFixed(1);

      for (const platform of this.platforms) {
        if (!platform.broken && this.lavaY <= platform.y + platform.h - 3) {
          platform.broken = true;
          for (let i = 0; i < 5; i += 1) {
            this.particles.push({
              x: platform.x + Math.random() * platform.w,
              y: platform.y,
              vx: (Math.random() - .5) * 100,
              vy: -40 - Math.random() * 100,
              life: .35 + Math.random() * .35,
            });
          }
        }
      }

      if (p.y + p.h > this.lavaY) this.die('lava');
      const lavaGap = this.lavaY - (p.y + p.h);
      if (lavaGap < 180) this.shake = Math.max(this.shake, Math.max(0, (180 - lavaGap) * .025));
    },

    win() {
      if (!this.running) return;
      this.running = false;
      stopTacoMusic();
      $('#elevator-panel').classList.add('hidden');
      $('#quiz-panel').classList.add('hidden');
      $('#narrator-box').classList.add('hidden');
      $('#troll-overlay').classList.add('hidden');
      $('#level-select').classList.add('hidden');
      $('#shop-panel').classList.add('hidden');
      this.levelSelectOpen = false;
      this.shopOpen = false;
      this.keys.left = this.keys.right = this.keys.jump = this.keys.climb = false;
      $('#win-stats').textContent = `${this.deaths} ${this.deaths === 1 ? 'death' : 'deaths'}. ${this.deaths < 5 ? 'Suspiciously competent.' : 'Every one built character.'}`;
      $('#win-panel').classList.remove('hidden');
      tone(440, .18, 'sine', .04, 300);
      window.setTimeout(() => tone(660, .28, 'sine', .04, 260), 160);
    },

    pressTrollButton() {
      if (this.player.dead) return;
      this.player.dead = true;
      this.trapTriggered = true;
      this.checkpoint = 0;
      this.activeCheckpoints.forEach((checkpoint) => { checkpoint.reached = false; });
      $('#checkpoint-count').textContent = `0/${this.activeCheckpoints.length}`;
      $('#troll-panel').classList.remove('hidden');
      tone(150, .18, 'square', .08, -90);
      window.setTimeout(() => tone(95, .38, 'sawtooth', .08, -60), 180);
      window.setTimeout(() => {
        $('#troll-panel').classList.add('hidden');
        this.respawn(true);
        this.toast('Maybe the beginning is more useful than the end.');
      }, 1450);
    },

    advanceLevel(number = 2) {
      if (this.player.dead) return;
      window.clearTimeout(this.levelTransitionTimer);
      this.closeLevelSelect();
      this.closeShop();
      this.player.dead = true;
      $('#level-banner h2').textContent = `LEVEL ${number}`;
      const levelNames = { 1: 'The First Obby', 2: 'Taco Storm', 3: 'WHAT?', 4: 'The Mirror Room', 5: 'Red Light, Wrong Light', 6: 'The Elevator', 7: 'The Dark Walkway', 8: 'WHAT THE HELL?', 9: 'YES OR NO?', 10: 'The Narrator', 11: 'Delayed Platform', 12: 'Runaway Checkpoints', 13: 'Impossible Reverse Doors', 14: 'Loading...', 15: 'Devil Button Chase', 16: 'Victory?', 17: 'Planet Party', 18: 'Copycat Assembly Line', 19: 'Furnace Walk', 20: 'Gearbox', 21: 'Steam Valve Works', 22: 'Night-Shift Tower', 23: 'Starship Shift' };
      $('#level-banner small').textContent = levelNames[number];
      $('#level-banner').classList.remove('hidden');
      tone(330, .25, 'sine', .05, 220);
      this.levelTransitionTimer = window.setTimeout(() => {
        this.levelTransitionTimer = 0;
        this.loadLevel(number);
        this.respawn(true);
        $('#level-banner').classList.add('hidden');
        const introductions = {
          1: 'Level 1: Welcome back to the beginning.',
          2: 'Level 2: Dodge the raining tacos.',
          3: 'Level 3: A normal walking room.',
          4: 'Level 4: Your reflection remembers everything.',
          5: 'Level 5: The reflection shows the real signal.',
          6: 'Level 6: Please select a floor.',
          7: 'Level 7: A completely normal dark walkway.',
          8: 'Level 8: The room changes the rules constantly.',
          9: 'Level 9: Just answer some easy questions.',
          10: 'Level 10: Click the words, build bridges, and triple-jump.',
          11: 'Level 11: Five platforms. Less patience each time.',
          12: 'Level 12: Catch three runaway checkpoints by standing still.',
          13: 'Level 13: Solve four tall backward doors, climb Door 4’s tower, then survive the impossible route—or notice the hidden E.',
          14: 'Level 14: Repair the fake loading screen by clicking around it.',
          15: 'Level 15: Do not press it twice.',
          16: 'Level 16: Complete the obby before the fake victory screen.',
          17: 'Level 17: Climb upward by walking around shrinking planets—even upside down—and launching between them.',
          18: 'Level 18: Watch each assembly robot and copy its movement sequence.',
          19: 'Level 19: Cross the furnace while the steam vents cycle.',
          20: 'Level 20: Jump between spinning gears and misleading portals.',
          21: 'Level 21: Find and close all three valves to disable the steam system.',
          22: 'Level 22: Scale the night-shift factory tower.',
          23: 'Level 23: Pilot a spaceship through gates and moving asteroids.',
        };
        this.toast(introductions[number]);
      }, 1450);
    },

    draw() {
      const viewW = this.logicalWidth || 960;
      const shakeX = (Math.random() - .5) * this.shake;
      const shakeY = (Math.random() - .5) * this.shake;
      const ratio = this.pixelRatio || 1;
      ctx.save();
      ctx.setTransform(this.scale * ratio, 0, 0, this.scale * ratio, shakeX * ratio, shakeY * ratio);

      const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
      const chaosHue = (performance.now() * .04) % 360;
      gradient.addColorStop(0, (this.levelConfig.planetRoom || this.levelConfig.spaceshipRoom) ? '#020519' : (this.levelConfig.factoryRoom ? '#11171a' : (this.levelConfig.chaosRoom ? `hsl(${chaosHue} 58% 18%)` : (this.levelConfig.tacoStorm ? '#3a1838' : '#111725'))));
      gradient.addColorStop(.62, (this.levelConfig.planetRoom || this.levelConfig.spaceshipRoom) ? '#10082b' : (this.levelConfig.factoryRoom ? '#20252a' : (this.levelConfig.chaosRoom ? `hsl(${(chaosHue + 90) % 360} 62% 22%)` : (this.levelConfig.tacoStorm ? '#8d382d' : '#17121d'))));
      gradient.addColorStop(1, (this.levelConfig.planetRoom || this.levelConfig.spaceshipRoom) ? '#251044' : (this.levelConfig.factoryRoom ? '#301713' : (this.levelConfig.chaosRoom ? `hsl(${(chaosHue + 180) % 360} 70% 24%)` : (this.levelConfig.tacoStorm ? '#d27a32' : '#280e16'))));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, viewW, WORLD.height);

      this.drawBackground(viewW);
      ctx.save();
      ctx.translate(-this.cameraX, -this.cameraY);

      const lavaSurface = this.levelConfig.lavaClimb
        ? (this.lavaActive ? Math.min(WORLD.floor, this.lavaY) : WORLD.height)
        : ((this.levelConfig.planetParty || this.levelConfig.spaceshipRoom) ? WORLD.height : WORLD.floor);
      ctx.fillStyle = '#7c1120';
      ctx.fillRect(0, lavaSurface, WORLD.width, WORLD.height - lavaSurface);
      ctx.fillStyle = '#e33443';
      for (let x = 0; x < WORLD.width; x += 38) {
        const wave = Math.sin(x * .05 + performance.now() * .004) * 5;
        ctx.beginPath();
        ctx.arc(x, lavaSurface + wave, 23, Math.PI, 0);
        ctx.fill();
      }

      if (this.levelConfig.planetRoom) this.drawPlanetRoom();
      if (this.levelConfig.spaceshipRoom) this.drawSpaceshipRoom();
      if (this.levelConfig.factoryRoom) this.drawFactoryRoom();
      this.platforms.forEach((platform) => this.drawPlatform(platform));
      this.drawLadders();
      this.drawParkourSystems();
      this.drawFactoryHazards();
      this.activeSpikes.forEach((spike) => this.drawSpikes(spike));
      this.activeCheckpoints.forEach((cp, index) => this.drawCheckpoint(cp, index));
      this.drawGoal();
      if (this.levelConfig.tacoStorm) this.drawTacoRain();
      if (this.levelConfig.wallRoom && this.wallPhase < 4) this.drawWallRoom();
      if (this.levelConfig.lavaClimb) this.drawWhatRoom();
      if (this.levelConfig.mirrorRoom) this.drawMirrorRoom();
      if (this.levelConfig.redLightRoom) this.drawRedLightRoom();
      if (this.levelConfig.elevatorRoom) this.drawElevatorRoom();
      if (this.levelConfig.darkMonsterRoom) this.drawDarkMonsterRoom();
      if (this.levelConfig.chaosRoom) this.drawChaosRoom();
      if (this.levelConfig.quizRoom) this.drawQuizRoom();
      if (this.levelConfig.narratorRoom) this.drawNarratorRoom();
      if (this.levelConfig.delayedPlatformRoom) this.drawDelayedPlatformRoom();
      if (this.levelConfig.movingFinishRoom) this.drawMovingFinishRoom();
      if (this.levelConfig.reverseDoorRoom) this.drawReverseDoorRoom();
      if (this.levelConfig.loadingRoom) this.drawLoadingRoom();
      if (this.levelConfig.doublePressRoom) this.drawDoublePressRoom();
      if (this.levelConfig.fakeVictoryRoom) this.drawFakeVictoryRoom();
      if (this.levelConfig.assemblyRoom) this.drawAssemblyRoom();
      if (this.levelConfig.pipeValveRoom) this.drawPipeValveRoom();
      this.drawLevelExtras();
      this.drawRageShards();

      this.particles.forEach((particle) => {
        ctx.globalAlpha = Math.min(1, particle.life * 2);
        ctx.fillStyle = '#ff3a49';
        ctx.fillRect(particle.x, particle.y, 5, 5);
      });
      ctx.globalAlpha = 1;

      if (this.levelConfig.mirrorRoom && this.shadow.visible) this.drawShadow();
      if (!this.player.dead) this.drawPlayer();
      ctx.restore();
      if (this.levelConfig.darkMonsterRoom && this.monsterEncounter < 4) this.drawDarkness(viewW);
      ctx.restore();
    },

    drawBackground(viewW) {
      if (this.levelConfig.planetRoom || this.levelConfig.spaceshipRoom) return;
      ctx.fillStyle = 'rgba(121, 133, 166, .05)';
      const farOffset = -(this.cameraX * .15) % 240;
      for (let x = farOffset - 240; x < viewW + 240; x += 240) {
        ctx.beginPath();
        ctx.moveTo(x, 470);
        ctx.lineTo(x + 120, 170);
        ctx.lineTo(x + 260, 470);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, .025)';
      ctx.lineWidth = 1;
      for (let x = -(this.cameraX * .3) % 80; x < viewW; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); ctx.stroke();
      }
      for (let y = 70; y < WORLD.height; y += 70) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(viewW, y); ctx.stroke();
      }
      // Pipes and riveted panels make the entire disguised RPG feel like one giant factory.
      ctx.strokeStyle = 'rgba(124, 91, 66, .22)';
      ctx.lineWidth = 13;
      for (let x = -(this.cameraX * .18) % 310 - 40; x < viewW + 80; x += 310) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 92);
        ctx.quadraticCurveTo(x, 118, x + 26, 118);
        ctx.lineTo(x + 88, 118);
        ctx.stroke();
        ctx.fillStyle = 'rgba(201, 128, 69, .18)';
        ctx.beginPath(); ctx.arc(x + 88, 118, 20, 0, Math.PI * 2); ctx.fill();
      }
    },

    drawFactoryRoom() {
      ctx.save();
      for (let x = 80; x < WORLD.width; x += 430) {
        ctx.fillStyle = 'rgba(7, 10, 12, .62)';
        ctx.fillRect(x, -1900, 270, 2370);
        ctx.strokeStyle = 'rgba(151, 102, 66, .32)';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, -1900, 270, 2370);
        for (let y = -1860; y < 470; y += 130) {
          ctx.fillStyle = 'rgba(214, 139, 72, .26)';
          ctx.beginPath(); ctx.arc(x + 18, y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + 252, y, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (let x = 300; x < WORLD.width; x += 760) {
        const rotation = this.motionTime * (x % 2 ? 1.2 : -.9);
        ctx.save();
        ctx.translate(x, 135);
        ctx.rotate(rotation);
        ctx.strokeStyle = 'rgba(197, 116, 54, .30)';
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.stroke();
        for (let tooth = 0; tooth < 8; tooth += 1) {
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = 'rgba(197, 116, 54, .30)';
          ctx.fillRect(52, -8, 28, 16);
        }
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255, 142, 62, .72)';
      ctx.font = '900 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`RAGE INDUSTRIES // FLOOR ${this.level}`, Math.min(WORLD.width - 180, 420), 48);
      ctx.textAlign = 'left';
      ctx.restore();
    },

    drawAssemblyRoom() {
      ctx.save();
      for (let index = 0; index < assemblyStations.length; index += 1) {
        const station = assemblyStations[index];
        const completed = index < this.assemblyStage;
        const active = index === this.assemblyStage;
        const robotX = station.x;
        const robotY = 300;
        let shownAction = 'WAIT';
        if (active && this.assemblyPhase === 'demo') {
          const demoIndex = Math.min(station.sequence.length - 1, Math.floor(this.assemblyClock / .72));
          shownAction = station.sequence[demoIndex];
        } else if (active && this.assemblyPhase === 'input') {
          shownAction = station.sequence[this.assemblyInputIndex] || 'DONE';
        } else if (completed) shownAction = 'PASSED';

        ctx.fillStyle = '#171c20';
        ctx.fillRect(robotX - 65, robotY - 75, 130, 150);
        ctx.strokeStyle = completed ? '#5ce0ad' : (active ? '#ffcf62' : '#687078');
        ctx.lineWidth = 4;
        ctx.strokeRect(robotX - 65, robotY - 75, 130, 150);
        ctx.fillStyle = completed ? '#5ce0ad' : '#d6dce0';
        ctx.fillRect(robotX - 34, robotY - 45, 68, 48);
        ctx.fillStyle = '#11151a';
        ctx.fillRect(robotX - 20, robotY - 29, 8, 8);
        ctx.fillRect(robotX + 12, robotY - 29, 8, 8);
        const armOffset = shownAction === 'JUMP' ? -38 : 0;
        const leftArm = shownAction === 'LEFT' ? -42 : -18;
        const rightArm = shownAction === 'RIGHT' ? 42 : 18;
        ctx.strokeStyle = completed ? '#5ce0ad' : '#f0a75b';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(robotX - 34, robotY - 3);
        ctx.lineTo(robotX + leftArm, robotY + 34 + armOffset);
        ctx.moveTo(robotX + 34, robotY - 3);
        ctx.lineTo(robotX + rightArm, robotY + 34 + armOffset);
        ctx.stroke();

        ctx.fillStyle = '#080b0f';
        ctx.fillRect(robotX - 90, 105, 180, 70);
        ctx.strokeStyle = active ? '#ffcf62' : '#4f5861';
        ctx.strokeRect(robotX - 90, 105, 180, 70);
        ctx.fillStyle = completed ? '#5ce0ad' : (active ? '#ffcf62' : '#87909a');
        ctx.font = '900 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(completed ? 'PASSED' : shownAction, robotX, 135);
        ctx.font = '900 9px Inter';
        const sequenceText = station.sequence.map((action, actionIndex) => {
          if (active && this.assemblyPhase === 'input' && actionIndex < this.assemblyInputIndex) return '✓';
          return action[0];
        }).join('  ');
        ctx.fillText(sequenceText, robotX, 158);

        const gateOpen = completed;
        if (!gateOpen) {
          ctx.fillStyle = '#4c161c';
          ctx.fillRect(station.gateX, 115, 38, 355);
          ctx.strokeStyle = '#ff5362';
          ctx.strokeRect(station.gateX, 115, 38, 355);
          for (let y = 130; y < 460; y += 36) {
            ctx.fillStyle = '#ff5362';
            ctx.fillRect(station.gateX + 6, y, 26, 7);
          }
        }
      }
      ctx.fillStyle = '#ffd365';
      ctx.font = '900 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`MACHINES COPIED: ${this.assemblyStage}/${assemblyStations.length}`, 420, 80);
      ctx.textAlign = 'left';
      ctx.restore();
    },

    drawPipeValveRoom() {
      ctx.save();
      for (const valve of this.pipeValves) {
        ctx.strokeStyle = valve.opened ? '#5ce0ad' : '#efb85b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(valve.x, valve.y, 24, 0, Math.PI * 2);
        ctx.stroke();
        for (let spoke = 0; spoke < 6; spoke += 1) {
          const angle = spoke * Math.PI / 3 + (valve.opened ? Math.PI / 6 : 0);
          ctx.beginPath();
          ctx.moveTo(valve.x, valve.y);
          ctx.lineTo(valve.x + Math.cos(angle) * 31, valve.y + Math.sin(angle) * 31);
          ctx.stroke();
        }
        ctx.fillStyle = valve.opened ? '#5ce0ad' : '#ffe09a';
        ctx.font = '900 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(valve.opened ? `VALVE ${valve.label} CLOSED` : `HOLD E: VALVE ${valve.label}`, valve.x, valve.y - 42);
      }
      ctx.fillStyle = '#dfffee';
      ctx.font = '900 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`STEAM LINES CLOSED ${this.pipeValves.filter((valve) => valve.opened).length}/${this.pipeValves.length}`, 5350, 80);
      ctx.restore();
    },

    drawSpaceshipRoom() {
      ctx.save();
      for (let x = 40; x < WORLD.width; x += 113) {
        const y = 25 + ((x * 47) % 440);
        ctx.globalAlpha = .35 + (x % 4) * .15;
        ctx.fillStyle = x % 3 ? '#dff8ff' : '#ffdbf7';
        ctx.fillRect(x, y, x % 5 === 0 ? 4 : 2, x % 5 === 0 ? 4 : 2);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(6, 10, 28, .88)';
      ctx.fillRect(90, 55, 410, 84);
      ctx.strokeStyle = '#68e8ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(90, 55, 410, 84);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('STARSHIP SHIFT', 295, 84);
      ctx.fillStyle = '#aeefff';
      ctx.font = '900 9px Inter';
      ctx.fillText('TAP SPACE / UP / CLICK / JUMP TO FLAP', 295, 111);
      ctx.fillText('AUTO-FLY ON • PASS THROUGH EVERY OPENING', 295, 128);

      for (const obstacle of this.spaceshipObstacles) {
        if (obstacle.type === 'gate') {
          const bottomY = obstacle.gapY + obstacle.gapH;
          const metal = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.w, 0);
          metal.addColorStop(0, '#303947');
          metal.addColorStop(.5, '#778190');
          metal.addColorStop(1, '#252d38');
          ctx.fillStyle = metal;
          ctx.fillRect(obstacle.x, 0, obstacle.w, obstacle.gapY);
          ctx.fillRect(obstacle.x, bottomY, obstacle.w, WORLD.height - bottomY);
          ctx.fillStyle = '#ff5a66';
          ctx.fillRect(obstacle.x, obstacle.gapY - 8, obstacle.w, 8);
          ctx.fillRect(obstacle.x, bottomY, obstacle.w, 8);
          ctx.fillStyle = '#ffe069';
          ctx.font = '900 9px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('FLIGHT GATE', obstacle.x + obstacle.w / 2, obstacle.gapY + obstacle.gapH / 2);
        } else if (obstacle.type === 'asteroid') {
          const y = obstacle.currentY;
          const rock = ctx.createRadialGradient(obstacle.x - 15, y - 16, 5, obstacle.x, y, obstacle.radius);
          rock.addColorStop(0, '#9e7b70');
          rock.addColorStop(.55, '#5b4848');
          rock.addColorStop(1, '#251e29');
          ctx.fillStyle = rock;
          ctx.beginPath(); ctx.arc(obstacle.x, y, obstacle.radius, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(18, 14, 21, .55)';
          ctx.beginPath(); ctx.arc(obstacle.x - 18, y + 8, obstacle.radius * .22, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(obstacle.x + 20, y - 17, obstacle.radius * .16, 0, Math.PI * 2); ctx.fill();
        } else if (!obstacle.collected) {
          const pulse = 1 + Math.sin(this.motionTime * 5 + obstacle.x) * .12;
          ctx.save();
          ctx.translate(obstacle.x, obstacle.y);
          ctx.scale(pulse, pulse);
          ctx.shadowColor = '#68efff';
          ctx.shadowBlur = 22;
          ctx.strokeStyle = '#68efff';
          ctx.lineWidth = 7;
          ctx.beginPath(); ctx.arc(0, 0, obstacle.radius, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#ffe56b';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, obstacle.radius - 10, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 9px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('BOOST', 0, 4);
          ctx.restore();
        }
      }

      const dockX = this.levelConfig.spaceshipDockX;
      ctx.strokeStyle = '#67e8ff';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(dockX, 255, 105, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ff79df';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(dockX, 255, 78 + Math.sin(this.motionTime * 4) * 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#dcfbff';
      ctx.font = '900 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('DOCKING PORT', dockX, 260);
      ctx.restore();
    },

    drawPlanetRoom() {
      ctx.save();
      for (let y = -3250; y < 560; y += 115) {
        for (let x = 45 + (Math.abs(y) % 170); x < WORLD.width; x += 211) {
          ctx.globalAlpha = .25 + ((x + Math.abs(y)) % 5) * .12;
          ctx.fillStyle = (x + y) % 3 ? '#dff7ff' : '#ffd4fa';
          const size = (x + Math.abs(y)) % 4 === 0 ? 3 : 2;
          ctx.fillRect(x, y, size, size);
        }
      }
      ctx.globalAlpha = 1;

      for (let index = 0; index < this.platforms.length; index += 1) {
        const platform = this.platforms[index];
        if (!platform.planet) continue;
        const radius = Number.isFinite(platform.currentRadius) ? platform.currentRadius : (platform.baseRadius || platform.radius || 80);
        const centerX = platform.cx;
        const centerY = platform.cy;
        if (platform.exitPlanet) {
          ctx.save();
          ctx.globalAlpha = .25 + Math.sin(this.motionTime * 4) * .1;
          ctx.fillStyle = '#83ffd1';
          ctx.beginPath(); ctx.arc(centerX, centerY, radius + 34, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        const planet = ctx.createRadialGradient(centerX - radius * .32, centerY - radius * .36, radius * .08, centerX, centerY, radius);
        planet.addColorStop(0, `hsl(${platform.planetHue} 88% 72%)`);
        planet.addColorStop(.52, `hsl(${platform.planetHue} 72% 46%)`);
        planet.addColorStop(1, `hsl(${platform.planetHue} 70% 18%)`);
        ctx.fillStyle = planet;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.shadowColor = `hsl(${platform.planetHue} 95% 68%)`;
        ctx.shadowBlur = this.planetAttached === index ? 30 : 14;
        ctx.strokeStyle = `hsla(${platform.planetHue} 100% 86% / .9)`;
        ctx.lineWidth = this.planetAttached === index ? 7 : 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = `hsla(${platform.planetHue} 95% 82% / .48)`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius * 1.32, radius * .32, -.18, 0, Math.PI * 2);
        ctx.stroke();
        const sizePercent = Math.round(radius / platform.baseRadius * 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(platform.exitPlanet ? 'EXIT PLANET' : `${platform.gravityLabel} GRAVITY`, centerX, centerY + 8);
        ctx.fillStyle = sizePercent < 70 ? '#ff8b96' : '#d9f8ff';
        ctx.font = '900 9px Inter';
        ctx.fillText(`SIZE ${sizePercent}%`, centerX, centerY + 26);
        if (this.planetAttached === index) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 7]);
          ctx.beginPath(); ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          if (index === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('YOU ARE HERE — WALK, THEN JUMP UP', centerX, centerY - radius - 52);
          }
        }
      }

      const signs = [
        { x: 440, y: 400, title: 'PLANET PARTY', line: 'WALK AROUND • JUMP OUTWARD' },
        { x: 840, y: -1120, title: 'UPSIDE DOWN?', line: 'KEEP WALKING UNDER THE PLANET' },
        { x: 760, y: -2320, title: 'FINAL CLIMB', line: 'TWO AIR JUMPS REMAIN' },
      ];
      for (const sign of signs) {
        ctx.fillStyle = 'rgba(8, 9, 28, .88)';
        ctx.fillRect(sign.x, sign.y, 320, 68);
        ctx.strokeStyle = '#66e8ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(sign.x, sign.y, 320, 68);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(sign.title, sign.x + 160, sign.y + 25);
        ctx.fillStyle = '#aeeeff';
        ctx.font = '900 9px Inter';
        ctx.fillText(sign.line, sign.x + 160, sign.y + 48);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    },

    drawPlatform(platform) {
      if (this.levelConfig.planetParty && platform.planet) return;
      if (platform.type === 'debris' && !this.elevatorDropped) return;
      if (platform.type === 'word' && !this.narratorPlacedWords.has(`${platform.stage}-${platform.order}`)) return;
      if (platform.broken) return;
      ctx.save();
      if (platform.ghost) ctx.globalAlpha = Math.max(.035, platform.ghostAlpha);
      if (platform.musical != null && !platform.musicalActive) ctx.globalAlpha *= .14;
      if (platform.type === 'delayed') {
        const tiltProgress = platform.falling ? 1 : Math.min(1, platform.fallTimer / platform.delay);
        ctx.save();
        ctx.translate(platform.x + platform.w / 2, platform.y + platform.h / 2);
        ctx.rotate(tiltProgress * .16);
        ctx.fillStyle = '#10121a';
        ctx.fillRect(-platform.w / 2 + 5, -platform.h / 2 + 7, platform.w, platform.h);
        ctx.fillStyle = '#951f2e';
        ctx.fillRect(-platform.w / 2, -platform.h / 2, platform.w, platform.h);
        ctx.fillStyle = '#ff4b5e';
        ctx.fillRect(-platform.w / 2, -platform.h / 2, platform.w, 4);
        ctx.restore();
        ctx.restore();
        return;
      }
      const breakable = platform.type === 'crumble' || platform.type === 'fake' || platform.type === 'delayed';
      let color = '#34394a';
      if (platform.type === 'moving') color = '#374b57';
      if (platform.type === 'shifting') color = '#563b70';
      if (platform.type === 'orbit') color = '#236b70';
      if (platform.type === 'copycat') color = '#70502e';
      if (platform.type === 'word') color = platform.wordPulse > 0 ? '#f0d270' : '#514b3c';
      if (platform.ceiling) color = '#493c78';
      if (platform.planet) color = `hsl(${platform.planetHue} 62% 34%)`;
      if (platform.conveyor) color = '#60471f';
      if (platform.shrinking) color = '#6a2d50';
      if (platform.ghost) color = '#4f596e';
      if (platform.musical != null) color = ['#277b8d', '#803047', '#927629'][platform.musical];
      if (this.levelConfig.factoryRoom && platform.type === 'solid' && !platform.ghost && !platform.shrinking && !platform.conveyor) color = '#4c5557';
      if (this.levelConfig.lavaClimb && platform.x > 520 && !breakable) {
        const hue = 155 + ((platform.id * 47 + performance.now() * .035) % 135);
        color = `hsl(${hue} 42% 35%)`;
      }
      if (this.levelConfig.chaosRoom && platform.h <= 30 && !breakable) {
        const hue = 155 + ((platform.id * 71 + performance.now() * .08) % 135);
        color = `hsl(${hue} 72% 42%)`;
      }
      if (breakable) color = '#951f2e';
      if (platform.planet) {
        ctx.fillStyle = 'rgba(4, 7, 20, .65)';
        ctx.fillRect(platform.x + 4, platform.y + 7, platform.w, 12);
        ctx.fillStyle = color;
        ctx.fillRect(platform.x, platform.y, platform.w, 12);
        ctx.fillStyle = `hsl(${platform.planetHue} 92% 78%)`;
        ctx.fillRect(platform.x, platform.y, platform.w, 4);
        ctx.restore();
        return;
      }
      ctx.fillStyle = '#10121a';
      ctx.fillRect(platform.x + 5, platform.y + 7, platform.w, platform.h);
      ctx.fillStyle = color;
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      ctx.fillStyle = breakable ? '#ff4b5e' : (platform.type === 'word' ? '#d7b95d' : '#7a8198');
      ctx.fillRect(platform.x, platform.y, platform.w, 4);
      if (this.levelConfig.factoryRoom) {
        ctx.fillStyle = 'rgba(255,255,255,.09)';
        ctx.fillRect(platform.x + 3, platform.y + 6, Math.max(0, platform.w - 6), 2);
        ctx.fillStyle = '#171b20';
        for (let rivetX = platform.x + 10; rivetX < platform.x + platform.w - 6; rivetX += 32) {
          ctx.beginPath();
          ctx.arc(rivetX, platform.y + Math.min(platform.h - 5, 11), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (platform.conveyor && platform.h >= 30) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(platform.x, platform.y, platform.w, platform.h);
          ctx.clip();
          ctx.globalAlpha = .18;
          ctx.strokeStyle = '#ffcf5d';
          ctx.lineWidth = 9;
          for (let stripeX = platform.x - platform.h; stripeX < platform.x + platform.w + platform.h; stripeX += 28) {
            ctx.beginPath();
            ctx.moveTo(stripeX, platform.y + platform.h);
            ctx.lineTo(stripeX + platform.h, platform.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (platform.type === 'moving' || platform.type === 'orbit') {
        ctx.strokeStyle = platform.type === 'orbit' ? 'rgba(79,235,238,.34)' : 'rgba(118,205,235,.28)';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x + 1, platform.y + 1, Math.max(0, platform.w - 2), Math.max(0, platform.h - 2));
      }
      if (platform.type === 'word') {
        ctx.fillStyle = platform.wordPulse > 0 ? '#17130a' : '#fff2c9';
        ctx.font = '900 13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(platform.label, platform.x + platform.w / 2, platform.y + 16);
        ctx.textAlign = 'left';
      }
      if (platform.conveyor || platform.shrinking || platform.ghost || platform.musical != null || platform.type === 'copycat' || platform.type === 'orbit' || platform.assembly || platform.traffic || platform.doorway) {
        ctx.fillStyle = '#fff4c7';
        ctx.font = '900 9px Inter';
        ctx.textAlign = 'center';
        let label = '';
        if (platform.conveyor) label = platform.conveyor > 0 ? '▶ ▶' : '◀ ◀';
        else if (platform.shrinking) label = 'SHRINK';
        else if (platform.ghost) label = 'GHOST';
        else if (platform.musical != null) label = ['♪', '♫', '♬'][platform.musical];
        else if (platform.type === 'copycat') label = 'COPY';
        else if (platform.type === 'orbit') label = '◎';
        else if (platform.assembly) label = '⚙';
        else if (platform.traffic) label = '⇄';
        else if (platform.doorway) label = 'DOOR';
        ctx.fillText(label, platform.x + platform.w / 2, platform.y + 14);
        ctx.textAlign = 'left';
      }
      if (breakable && platform.crumbleAt) {
        ctx.strokeStyle = '#201116';
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.w * .3, platform.y);
        ctx.lineTo(platform.x + platform.w * .5, platform.y + platform.h);
        ctx.moveTo(platform.x + platform.w * .7, platform.y);
        ctx.lineTo(platform.x + platform.w * .56, platform.y + platform.h);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawLadders() {
      const p = this.player;
      for (const ladder of this.ladders) {
        const near = rectsOverlap({ x: p.x - 45, y: p.y - 25, w: p.w + 90, h: p.h + 50 }, ladder);
        ctx.save();
        if (ladder.secret) ctx.globalAlpha = near ? .16 : .025;
        ctx.strokeStyle = p.climbing && near ? '#fff0a2' : '#c6a854';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ladder.x + 7, ladder.y);
        ctx.lineTo(ladder.x + 7, ladder.y + ladder.h);
        ctx.moveTo(ladder.x + ladder.w - 7, ladder.y);
        ctx.lineTo(ladder.x + ladder.w - 7, ladder.y + ladder.h);
        for (let y = ladder.y + 10; y < ladder.y + ladder.h; y += 22) {
          ctx.moveTo(ladder.x + 7, y);
          ctx.lineTo(ladder.x + ladder.w - 7, y);
        }
        ctx.stroke();
        if (near) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = p.climbing ? '#fff0a2' : '#ffe078';
          ctx.font = ladder.secret ? '900 18px Inter' : '900 10px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(p.climbing ? 'CLIMBING' : (ladder.secret ? 'E' : 'HOLD E TO CLIMB'), ladder.x + ladder.w / 2, ladder.secret ? Math.min(ladder.y + ladder.h - 45, this.player.y - 10) : ladder.y - 12);
          ctx.textAlign = 'left';
        }
        ctx.restore();
      }
    },

    drawParkourSystems() {
      const pulse = .55 + Math.sin(performance.now() * .006) * .25;
      for (const lava of this.lavaZones) {
        ctx.fillStyle = '#a81724';
        ctx.fillRect(lava.x, lava.y, lava.w, lava.h);
        ctx.fillStyle = '#ff4938';
        for (let x = lava.x; x < lava.x + lava.w; x += 32) {
          ctx.beginPath();
          ctx.arc(x, lava.y + Math.sin(x * .08 + performance.now() * .006) * 4, 18, Math.PI, 0);
          ctx.fill();
        }
      }
      for (const zone of this.gravityZones) {
        ctx.save();
        ctx.fillStyle = 'rgba(123, 91, 214, .10)';
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.strokeStyle = `rgba(190, 161, 255, ${pulse})`;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#d9c9ff';
        ctx.font = '900 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('↑ CEILING GRAVITY ↑', zone.x + zone.w / 2, 28);
        ctx.restore();
      }

      for (const portal of this.portals) {
        ctx.save();
        ctx.shadowColor = portal.color;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 5;
        ctx.strokeRect(portal.x, portal.y, portal.w, portal.h);
        ctx.globalAlpha = .22 + pulse * .25;
        ctx.fillStyle = portal.color;
        ctx.fillRect(portal.x + 6, portal.y + 6, portal.w - 12, portal.h - 12);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`PORTAL ${portal.label}`, portal.x + portal.w / 2, portal.y - 10);
        ctx.restore();
      }
      ctx.textAlign = 'left';
    },

    drawFactoryHazards() {
      for (const hazard of this.factoryHazards) {
        if (hazard.disabled) continue;
        ctx.save();
        if (hazard.type === 'crusher') {
          const centerX = hazard.x + hazard.w / 2;
          ctx.strokeStyle = '#76533b';
          ctx.lineWidth = 15;
          ctx.beginPath();
          ctx.moveTo(centerX, -120);
          ctx.lineTo(centerX, hazard.currentY + 8);
          ctx.stroke();
          ctx.fillStyle = '#56242a';
          ctx.fillRect(hazard.x, hazard.currentY, hazard.w, hazard.h);
          ctx.fillStyle = '#d66a43';
          ctx.fillRect(hazard.x, hazard.currentY + hazard.h - 13, hazard.w, 13);
          ctx.fillStyle = '#f0b068';
          ctx.font = '900 9px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('PRESS', centerX, hazard.currentY + 24);
        } else if (hazard.type === 'steam') {
          ctx.fillStyle = '#4e5558';
          ctx.fillRect(hazard.x - 8, hazard.y + hazard.h - 18, hazard.w + 16, 18);
          ctx.fillStyle = hazard.active ? 'rgba(226, 244, 239, .54)' : 'rgba(133, 158, 157, .12)';
          for (let y = hazard.y + hazard.h - 25; y > hazard.y; y -= 28) {
            const wobble = Math.sin(y * .08 + this.motionTime * 5) * 9;
            ctx.beginPath();
            ctx.arc(hazard.x + hazard.w / 2 + wobble, y, hazard.active ? 20 : 9, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = hazard.active ? '#ffb15f' : '#75a39e';
          ctx.font = '900 9px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(hazard.active ? 'VENTING' : 'WAIT', hazard.x + hazard.w / 2, hazard.y + hazard.h + 16);
        }
        ctx.restore();
      }
      ctx.textAlign = 'left';
    },

    drawSpikes(spike) {
      const count = Math.max(1, Math.floor(spike.w / 18));
      const width = spike.w / count;
      ctx.fillStyle = '#d8d7db';
      for (let i = 0; i < count; i += 1) {
        ctx.beginPath();
        ctx.moveTo(spike.x + i * width, spike.y + spike.h);
        ctx.lineTo(spike.x + (i + .5) * width, spike.y);
        ctx.lineTo(spike.x + (i + 1) * width, spike.y + spike.h);
        ctx.fill();
      }
    },

    drawCheckpoint(cp, index) {
      if (this.levelConfig.spaceshipRoom) {
        ctx.save();
        ctx.strokeStyle = cp.reached ? '#55e2ac' : '#68e8ff';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cp.x, cp.y, 38, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = cp.reached ? '#55e2ac' : '#dffbff';
        ctx.font = '900 9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`BEACON ${index + 1}`, cp.x, cp.y + 4);
        ctx.restore();
        return;
      }
      if (this.levelConfig.planetParty && cp.planetIndex != null) {
        const planet = this.platforms[cp.planetIndex];
        if (!planet) return;
        ctx.save();
        ctx.strokeStyle = cp.reached ? '#55e2ac' : '#f2d363';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.arc(planet.cx, planet.cy, planet.currentRadius + 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = cp.reached ? '#55e2ac' : '#f2d363';
        ctx.font = '900 9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`CHECKPOINT ${index + 1}`, planet.cx, planet.cy - planet.currentRadius - 38);
        ctx.restore();
        return;
      }
      ctx.strokeStyle = cp.reached ? '#55e2ac' : '#6b7183';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cp.x, cp.y + 50); ctx.lineTo(cp.x, cp.y - 10); ctx.stroke();
      ctx.fillStyle = cp.reached ? '#55e2ac' : '#7f8494';
      ctx.beginPath(); ctx.moveTo(cp.x, cp.y - 10); ctx.lineTo(cp.x + 32, cp.y); ctx.lineTo(cp.x, cp.y + 12); ctx.fill();
      ctx.fillStyle = '#989daa';
      ctx.font = '10px Inter';
      ctx.fillText(`CHECKPOINT ${index + 1}`, cp.x - 24, cp.y + 67);
    },

    drawGoal() {
      if (this.levelConfig.spaceshipRoom || this.levelConfig.planetParty || this.levelConfig.mirrorRoom || this.levelConfig.redLightRoom || this.levelConfig.elevatorRoom || this.levelConfig.quizRoom || this.levelConfig.narratorRoom || this.levelConfig.movingFinishRoom || this.levelConfig.reverseDoorRoom || this.levelConfig.loadingRoom || this.levelConfig.doublePressRoom || this.levelConfig.fakeVictoryRoom) return;
      if (this.level === 1) {
        ctx.fillStyle = '#252a36';
        ctx.fillRect(4450, 425, 115, 20);
        ctx.fillStyle = this.trapTriggered ? '#6c131b' : '#ff3045';
        ctx.fillRect(4472, 411, 70, 14);
        ctx.fillStyle = '#ff7b86';
        ctx.fillRect(4480, 411, 54, 4);
        ctx.fillStyle = '#b8bbc5';
        ctx.font = '800 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS ME', 4507, 395);
        ctx.textAlign = 'left';
        return;
      }
      const doorX = this.levelConfig.doorX;
      const doorY = this.levelConfig.doorY ?? 350;
      ctx.fillStyle = '#0c0e13';
      ctx.fillRect(doorX, doorY, 76, 95);
      ctx.strokeStyle = '#e4bd5d';
      ctx.lineWidth = 4;
      ctx.strokeRect(doorX, doorY, 76, 95);
      ctx.fillStyle = '#e4bd5d';
      ctx.beginPath(); ctx.arc(doorX + 58, doorY + 50, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = '800 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(this.levelConfig.tacoStorm ? 'NO MORE TACOS' : 'EXIT', doorX + 38, doorY - 15);
      ctx.textAlign = 'left';
    },

    drawTacoRain() {
      const pulse = .55 + Math.sin(performance.now() * .012) * .2;
      for (const taco of this.tacos) {
        if (taco.state === 'warning') {
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = '#ff263d';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(taco.x + taco.w / 2, taco.targetY + taco.h + 2, 29, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(taco.x + 8, taco.targetY + taco.h - 8);
          ctx.lineTo(taco.x + taco.w - 8, taco.targetY + taco.h + 11);
          ctx.moveTo(taco.x + taco.w - 8, taco.targetY + taco.h - 8);
          ctx.lineTo(taco.x + 8, taco.targetY + taco.h + 11);
          ctx.stroke();
          ctx.restore();
        }
        if (taco.state === 'falling' || taco.state === 'landed') this.drawTaco(taco);
      }
    },

    drawTaco(taco) {
      ctx.save();
      ctx.translate(taco.x + taco.w / 2, taco.y + taco.h / 2);
      if (taco.state === 'falling') ctx.rotate(Math.sin(taco.y * .08) * .18);
      ctx.fillStyle = '#efb83f';
      ctx.strokeStyle = '#713618';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 8, 21, Math.PI, 0);
      ctx.lineTo(21, 11);
      ctx.lineTo(-21, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#43a94b';
      ctx.fillRect(-16, -1, 32, 5);
      ctx.fillStyle = '#dc3140';
      ctx.fillRect(-11, -5, 7, 6);
      ctx.fillRect(5, -6, 8, 7);
      ctx.fillStyle = '#754020';
      ctx.fillRect(-15, 4, 30, 5);
      ctx.restore();
    },

    drawWallRoom() {
      const alcoves = [
        { x: 545, w: 155, label: 'ALCOVE 1' },
        { x: 1260, w: 165, label: 'ALCOVE 2' },
      ];
      for (const alcove of alcoves) {
        const isSecondTrap = alcove.x > 1000 && this.wallPhase === 3;
        ctx.fillStyle = '#090b10';
        ctx.fillRect(alcove.x, 335, alcove.w, 135);
        ctx.strokeStyle = isSecondTrap ? '#da2638' : '#51c796';
        ctx.lineWidth = 4;
        ctx.strokeRect(alcove.x, 335, alcove.w, 135);
        ctx.fillStyle = isSecondTrap ? '#da2638' : '#8b91a2';
        ctx.font = '800 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(alcove.label, alcove.x + alcove.w / 2, 322);
        if (isSecondTrap) {
          ctx.fillStyle = '#cfd1d7';
          for (let x = alcove.x + 8; x < alcove.x + alcove.w - 8; x += 18) {
            ctx.beginPath();
            ctx.moveTo(x, 470);
            ctx.lineTo(x + 8, 445);
            ctx.lineTo(x + 16, 470);
            ctx.fill();
          }
        }
      }
      ctx.textAlign = 'left';

      if (this.chasingWall && this.wallPhase > 0) {
        const wall = this.chasingWall;
        ctx.save();
        ctx.globalAlpha = wall.ghost ? .38 : 1;
        ctx.fillStyle = wall.ghost ? '#a56cff' : '#d42c3e';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = wall.ghost ? '#d7c3ff' : '#5c101a';
        for (let y = wall.y + 18; y < wall.y + wall.h; y += 36) ctx.fillRect(wall.x + 10, y, wall.w - 20, 7);
        ctx.fillStyle = '#f5e7d8';
        ctx.fillRect(wall.x + 18, wall.y + 36, 13, 13);
        ctx.fillRect(wall.x + 51, wall.y + 36, 13, 13);
        ctx.fillStyle = '#171923';
        ctx.fillRect(wall.x + 22, wall.y + 40, 5, 5);
        ctx.fillRect(wall.x + 55, wall.y + 40, 5, 5);
        ctx.restore();
      }
    },

    drawWhatRoom() {
      ctx.save();
      ctx.fillStyle = 'rgba(7, 8, 13, .88)';
      ctx.fillRect(105, 355, 285, 82);
      ctx.strokeStyle = this.lavaActive ? '#ff4254' : '#777d8d';
      ctx.lineWidth = 3;
      ctx.strokeRect(105, 355, 285, 82);
      ctx.fillStyle = '#8c91a0';
      ctx.font = '800 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('ROOM 03', 247, 378);
      ctx.fillStyle = this.lavaActive ? '#ff4254' : '#f0ede4';
      ctx.font = '900 34px Inter';
      ctx.fillText('WHAT?', 247, 416);
      ctx.fillStyle = '#ffbd55';
      ctx.font = '900 9px Inter';
      ctx.fillText(`MODE: ${this.whatMode}`, 247, 432);
      ctx.textAlign = 'left';
      ctx.restore();
    },

    drawMirrorRoom() {
      ctx.save();
      ctx.globalAlpha = .2;
      for (const platform of this.platforms) {
        ctx.fillStyle = '#8be8ff';
        ctx.fillRect(platform.x, WORLD.height - platform.y - platform.h, platform.w, platform.h);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(139, 232, 255, .35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 12]);
      ctx.beginPath();
      ctx.moveTo(0, WORLD.height / 2);
      ctx.lineTo(WORLD.width, WORLD.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const drawPad = (x, label, active) => {
        ctx.fillStyle = active ? '#5df0c1' : '#263547';
        ctx.fillRect(x, 458, 90, 12);
        ctx.strokeStyle = active ? '#b6ffe8' : '#6a7890';
        ctx.strokeRect(x, 458, 90, 12);
        ctx.fillStyle = active ? '#5df0c1' : '#9098a7';
        ctx.font = '800 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + 45, 447);
      };
      const onPad = (entity, x) => entity.x + entity.w / 2 > x
        && entity.x + entity.w / 2 < x + 90
        && entity.y + entity.h > 425;
      drawPad(760, 'MIRROR A', onPad(this.player, 760) || (this.shadow.visible && onPad(this.shadow, 760)));
      drawPad(1040, 'MIRROR B', onPad(this.player, 1040) || (this.shadow.visible && onPad(this.shadow, 1040)));

      if (!this.mirrorSolved) {
        ctx.fillStyle = 'rgba(104, 223, 255, .38)';
        ctx.fillRect(1270, 80, 24, 390);
        ctx.strokeStyle = '#8be8ff';
        ctx.lineWidth = 3;
        for (let y = 85; y < 470; y += 28) {
          ctx.beginPath(); ctx.moveTo(1270, y); ctx.lineTo(1294, y + 18); ctx.stroke();
        }
      }

      ctx.fillStyle = '#0d1018';
      ctx.fillRect(2325, 365, 86, 105);
      ctx.strokeStyle = '#f0cf6b';
      ctx.lineWidth = 4;
      ctx.strokeRect(2325, 365, 86, 105);
      ctx.fillStyle = '#f0cf6b';
      ctx.font = '900 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', 2368, 350);

      if (this.realExitVisible) {
        ctx.fillStyle = '#071411';
        ctx.fillRect(5, 365, 65, 105);
        ctx.strokeStyle = '#5df0c1';
        ctx.strokeRect(5, 365, 65, 105);
        ctx.fillStyle = '#5df0c1';
        ctx.fillText('REAL', 37, 350);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    },

    drawShadow() {
      const shadow = this.shadow;
      ctx.save();
      ctx.globalAlpha = .58;
      ctx.shadowColor = '#75e9ff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#75e9ff';
      ctx.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
      ctx.fillStyle = '#10212b';
      ctx.fillRect(shadow.x + 6, shadow.y + 14, 4, 4);
      ctx.fillRect(shadow.x + 16, shadow.y + 14, 4, 4);
      ctx.restore();
    },

    drawRedLightRoom() {
      const visibleGo = this.redLightReversed ? !this.redLightCanMove : this.redLightCanMove;
      const final = this.redLightFinal && !this.redLightFinalSolved;
      const drawSignal = (x) => {
        ctx.fillStyle = '#151820';
        ctx.fillRect(x, 95, 64, 130);
        ctx.strokeStyle = '#555c6c';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, 95, 64, 130);
        ctx.fillStyle = (final || !visibleGo) ? '#ef394a' : '#35151c';
        ctx.beginPath(); ctx.arc(x + 32, 133, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (final || visibleGo) ? '#4ce39e' : '#163a2d';
        ctx.beginPath(); ctx.arc(x + 32, 187, 18, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = .34;
        ctx.fillStyle = this.redLightCanMove ? '#4ce39e' : '#ef394a';
        ctx.beginPath(); ctx.ellipse(x + 32, 491, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      };
      [280, 900, 1500, 2100].forEach(drawSignal);

      for (const decoy of this.redLightDecoys) {
        ctx.fillStyle = '#20232c';
        ctx.fillRect(decoy.x, 245, 34, 65);
        ctx.strokeStyle = '#696f7d';
        ctx.strokeRect(decoy.x, 245, 34, 65);
        ctx.fillStyle = decoy.green ? '#263329' : '#ef394a';
        ctx.beginPath(); ctx.arc(decoy.x + 17, 263, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = decoy.green ? '#4ce39e' : '#35151c';
        ctx.beginPath(); ctx.arc(decoy.x + 17, 291, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#777d8b';
        ctx.font = '900 7px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('MAYBE', decoy.x + 17, 237);
      }

      ctx.fillStyle = '#202531';
      ctx.fillRect(1160, 330, 120, 140);
      ctx.fillStyle = '#a6adbb';
      ctx.beginPath(); ctx.arc(1220, 300, 65, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.redLightCanMove ? '#184834' : '#ff3b4d';
      ctx.fillRect(1195, 285, 12, 12);
      ctx.fillRect(1234, 285, 12, 12);
      ctx.fillRect(1200, 320, 40, 8);

      if (!this.redLightCanMove && !final) {
        ctx.fillStyle = 'rgba(239, 57, 74, .1)';
        ctx.beginPath();
        ctx.moveTo(1220, 330);
        ctx.lineTo(this.player.x - 170, 470);
        ctx.lineTo(this.player.x + 210, 470);
        ctx.closePath();
        ctx.fill();
      }

      if (!this.redLightFinalSolved) {
        ctx.fillStyle = 'rgba(239, 57, 74, .42)';
        ctx.fillRect(2490, 90, 22, 380);
      }
      ctx.fillStyle = '#0d1118';
      ctx.fillRect(2680, 365, 80, 105);
      ctx.strokeStyle = '#4ce39e';
      ctx.strokeRect(2680, 365, 80, 105);
      ctx.fillStyle = '#4ce39e';
      ctx.font = '900 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('CLEAR', 2720, 350);
      ctx.textAlign = 'left';
    },

    drawElevatorRoom() {
      if (!this.elevatorDropped) {
        ctx.fillStyle = '#353940';
        ctx.fillRect(430, 165, 540, 265);
        ctx.strokeStyle = '#8e929a';
        ctx.lineWidth = 6;
        ctx.strokeRect(430, 165, 540, 265);
        ctx.fillStyle = '#17191e';
        ctx.fillRect(485, 210, 205, 220);
        ctx.fillRect(710, 210, 205, 220);
        ctx.fillStyle = '#ef4757';
        ctx.font = '900 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText($('#elevator-readout').textContent, 700, 195);
      } else {
        ctx.strokeStyle = '#777d88';
        ctx.lineWidth = 5;
        for (let x = 320; x < 1000; x += 95) {
          ctx.beginPath();
          ctx.moveTo(x, 455);
          ctx.lineTo(x + 50, 410 - (x % 3) * 18);
          ctx.stroke();
        }
        ctx.fillStyle = '#f1b548';
        ctx.fillRect(35, 450, 90, 20);
        ctx.fillStyle = '#17130b';
        ctx.font = '900 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('EMERGENCY', 80, 441);
      }
      ctx.textAlign = 'left';
    },

    drawDarkMonsterRoom() {
      ctx.fillStyle = '#151821';
      ctx.fillRect(75, 375, 360, 62);
      ctx.strokeStyle = '#3a3e49';
      ctx.strokeRect(75, 375, 360, 62);
      ctx.fillStyle = '#747986';
      ctx.font = '800 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('A COMPLETELY NORMAL WALKWAY', 255, 411);

      if (this.monster.active) {
        const monster = this.monster;
        ctx.fillStyle = '#09070d';
        ctx.strokeStyle = '#842b42';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(monster.x, monster.y, monster.w, monster.h, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ff304f';
        ctx.fillRect(monster.x + 18, monster.y + 34, 19, 12);
        ctx.fillRect(monster.x + 68, monster.y + 34, 19, 12);
        ctx.fillStyle = '#f4e7d9';
        for (let x = monster.x + 15; x < monster.x + monster.w - 12; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, monster.y + 88);
          ctx.lineTo(x + 7, monster.y + 107);
          ctx.lineTo(x + 14, monster.y + 88);
          ctx.fill();
        }
      }
      ctx.textAlign = 'left';
    },

    drawDarkness(viewW) {
      const screenX = this.player.x - this.cameraX + this.player.w / 2;
      const screenY = this.player.y - this.cameraY + this.player.h / 2;
      const darkness = ctx.createRadialGradient(screenX, screenY, 35, screenX, screenY, 175);
      darkness.addColorStop(0, 'rgba(0, 0, 0, 0)');
      darkness.addColorStop(.5, 'rgba(0, 0, 0, .42)');
      darkness.addColorStop(1, 'rgba(0, 0, 0, .985)');
      ctx.fillStyle = darkness;
      ctx.fillRect(0, 0, viewW, WORLD.height);

      if (this.monsterScare > 0) {
        ctx.globalAlpha = Math.min(1, this.monsterScare * 2.4);
        ctx.fillStyle = '#ff2447';
        ctx.fillRect(viewW / 2 - 95, 170, 48, 25);
        ctx.fillRect(viewW / 2 + 47, 170, 48, 25);
        ctx.fillStyle = '#fff2df';
        ctx.beginPath();
        ctx.moveTo(viewW / 2 - 100, 250);
        ctx.lineTo(viewW / 2, 330);
        ctx.lineTo(viewW / 2 + 100, 250);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },

    drawChaosRoom() {
      ctx.save();
      ctx.translate(145, 355);
      ctx.rotate(Math.sin(performance.now() * .002) * .05);
      ctx.fillStyle = 'rgba(8, 8, 14, .9)';
      ctx.fillRect(-20, -20, 400, 105);
      ctx.strokeStyle = `hsl(${(performance.now() * .12) % 360} 90% 62%)`;
      ctx.lineWidth = 5;
      ctx.strokeRect(-20, -20, 400, 105);
      ctx.fillStyle = '#fff4df';
      ctx.font = '900 39px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('WHAT THE HELL?', 180, 43);
      ctx.restore();

      for (const orb of this.chaosOrbs) {
        const glow = ctx.createRadialGradient(orb.x + 14, orb.y + 14, 2, orb.x + 14, orb.y + 14, 22);
        glow.addColorStop(0, '#fff3a4');
        glow.addColorStop(.35, '#ff702e');
        glow.addColorStop(1, 'rgba(255, 20, 40, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(orb.x + 14, orb.y + 14, 23, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff3c2d';
        ctx.beginPath();
        ctx.arc(orb.x + 14, orb.y + 14, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = 'left';
    },

    drawQuizRoom() {
      const stations = [620, 1220, 1820, 2420, 3020, 3920];
      ctx.save();
      for (let index = 0; index < stations.length; index += 1) {
        const x = stations[index];
        const failedFinal = index === 5 && this.quizDoorUnlocked;
        const cleared = index < this.quizIndex && !failedFinal;
        ctx.fillStyle = '#11141d';
        ctx.fillRect(x - 40, 255, 105, 145);
        ctx.strokeStyle = failedFinal ? '#d33646' : (cleared ? '#4fbd94' : '#687083');
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 40, 255, 105, 145);
        ctx.fillStyle = cleared ? '#4fbd94' : '#c5c8d0';
        ctx.font = '900 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`QUESTION ${index + 1}`, x + 12, 285);
        ctx.font = '900 25px Inter';
        ctx.fillStyle = failedFinal ? '#d33646' : (cleared ? '#4fbd94' : '#f0eee8');
        ctx.fillText(failedFinal ? '×' : (cleared ? '✓' : '?'), x + 12, 345);
      }

      ctx.fillStyle = '#080a0f';
      ctx.fillRect(4210, 270, 240, 130);
      ctx.strokeStyle = '#a22836';
      ctx.strokeRect(4210, 270, 240, 130);
      ctx.fillStyle = '#d14350';
      ctx.font = '900 13px Inter';
      ctx.fillText(this.quizHasUnknownButton ? 'EMPTY ANSWER SLOT' : (this.quizDoorUnlocked ? 'BUTTON REQUIRED' : 'FINAL ANSWER'), 4330, 320);
      ctx.fillStyle = '#727786';
      ctx.font = '800 10px Inter';
      ctx.fillText(this.quizHasUnknownButton ? 'PRESS ↑ / SPACE TO INSERT' : (this.quizDoorUnlocked ? 'RETURN TO QUESTION 1' : 'KEEP WALKING'), 4330, 350);
      ctx.strokeStyle = this.quizHasUnknownButton ? '#9ce6cb' : '#3e4350';
      ctx.strokeRect(4280, 365, 100, 20);

      if (this.quizDoorUnlocked) {
        const nearDoor = this.player.x > 500 && this.player.x < 700;
        ctx.globalAlpha = nearDoor ? 1 : .42;
        ctx.fillStyle = '#05080b';
        ctx.fillRect(545, 350, 70, 120);
        ctx.strokeStyle = '#9ce6cb';
        ctx.lineWidth = 3;
        ctx.strokeRect(545, 350, 70, 120);
        ctx.fillStyle = '#9ce6cb';
        ctx.beginPath();
        ctx.arc(600, 412, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '900 10px Inter';
        ctx.fillText('NEW DOOR', 580, 338);
        ctx.fillStyle = this.quizHasUnknownButton ? '#49505d' : '#9ce6cb';
        ctx.fillRect(553, 380, 54, 32);
        ctx.fillStyle = '#07100d';
        ctx.font = '900 7px Inter';
        ctx.fillText(this.quizHasUnknownButton ? 'EMPTY' : "I DON'T KNOW", 580, 399);
        if (nearDoor) {
          ctx.fillStyle = '#e9fff7';
          ctx.fillText(this.quizHasUnknownButton ? 'BUTTON TAKEN' : 'PRESS ↑ / SPACE TO TAKE', 580, 325);
        }
        ctx.globalAlpha = 1;
      }
      if (this.quizHasUnknownButton) {
        ctx.fillStyle = '#9ce6cb';
        ctx.fillRect(this.player.x - 24, this.player.y - 25, 76, 17);
        ctx.fillStyle = '#07100d';
        ctx.font = '900 7px Inter';
        ctx.fillText("I DON'T KNOW", this.player.x + this.player.w / 2, this.player.y - 13);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    },

    drawNarratorRoom() {
      ctx.save();
      ctx.fillStyle = '#171a23';
      ctx.fillRect(75, 330, 335, 90);
      ctx.strokeStyle = '#88784e';
      ctx.strokeRect(75, 330, 335, 90);
      ctx.fillStyle = '#c9ad68';
      ctx.font = '900 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('THE WORDS ARE THE PATH', 242, 370);
      ctx.fillStyle = '#8d91a0';
      ctx.font = 'italic 13px Georgia';
      ctx.fillText('Land on the last word to make him speak.', 242, 395);

      for (const platform of this.platforms) {
        if (platform.type !== 'word' || !platform.endpoint || platform.stage !== this.narratorWordStage || !this.narratorStageReady || !this.narratorPlacedWords.has(`${platform.stage}-${platform.order}`)) continue;
        ctx.strokeStyle = `rgba(240, 210, 112, ${.55 + Math.sin(performance.now() * .008) * .25})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(platform.x - 5, platform.y - 5, platform.w + 10, platform.h + 10);
        ctx.fillStyle = '#f0d270';
        ctx.font = '900 9px Inter';
        ctx.fillText('LAND HERE TO SPEAK', platform.x + platform.w / 2, platform.y - 13);
      }

      ctx.fillStyle = '#11141b';
      ctx.fillRect(2680, 350, 300, 120);
      ctx.strokeStyle = '#6b6148';
      ctx.lineWidth = 3;
      ctx.strokeRect(2680, 350, 300, 120);
      ctx.fillStyle = '#c9ad68';
      ctx.font = '900 17px Inter';
      ctx.fillText(this.narratorRealExit ? 'THE SENTENCE LIED.' : 'FINISH THE SENTENCE.', 2830, 405);
      ctx.fillStyle = '#858a98';
      ctx.font = '900 10px Inter';
      ctx.fillText(`WORDS UNLOCKED: ${Math.min(4, this.narratorWordStage + 1)} / 4`, 2830, 430);

      if (this.narratorRealExit) {
        ctx.fillStyle = '#070d0b';
        ctx.fillRect(15, 350, 72, 120);
        ctx.strokeStyle = '#61dfb0';
        ctx.lineWidth = 3;
        ctx.strokeRect(15, 350, 72, 120);
        ctx.fillStyle = '#61dfb0';
        ctx.font = '900 10px Inter';
        ctx.fillText('REAL EXIT', 51, 338);
        if (this.player.x < 130) {
          ctx.fillStyle = '#eafff7';
          ctx.fillText('PRESS ↑ / SPACE', 85, 320);
        }
      }
      ctx.textAlign = 'left';
      ctx.restore();
    },

    drawDelayedPlatformRoom() {
      for (const platform of this.platforms) {
        if (platform.type !== 'delayed' || platform.falling) continue;
        const progress = Math.min(1, platform.fallTimer / platform.delay);
        ctx.fillStyle = '#171923';
        ctx.fillRect(platform.x, platform.y - 18, platform.w, 7);
        ctx.fillStyle = '#ff4b5e';
        ctx.fillRect(platform.x, platform.y - 18, platform.w * progress, 7);
        ctx.fillStyle = '#ff8a95';
        ctx.font = '900 9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(progress > .55 ? 'LEAVING SOON' : `${platform.delay.toFixed(2)} SECONDS`, platform.x + platform.w / 2, platform.y - 25);
      }
      ctx.textAlign = 'left';
    },

    drawMovingFinishRoom() {
      const x = this.movingFinishX;
      ctx.fillStyle = '#f1d05e';
      ctx.fillRect(x, 330, 12, 140);
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(x + 12, 330, 90, 42);
      ctx.fillStyle = '#171923';
      ctx.font = '900 13px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`CHECKPOINT ${this.movingFinishStage + 1}/3`, x + 57, 356);
      ctx.fillStyle = '#8a8f9c';
      ctx.font = '900 10px Inter';
      ctx.fillText('STOP MOVING', x + 54, 310);
      ctx.textAlign = 'left';
    },

    drawReverseDoorRoom() {
      ctx.textAlign = 'center';
      for (let index = 0; index < reverseDoors.length; index += 1) {
        const door = reverseDoors[index];
        const cleared = index < this.reverseDoorStage;
        ctx.fillStyle = cleared ? '#10221b' : '#0b0d13';
        ctx.fillRect(door.x, door.y, door.w, door.h);
        ctx.strokeStyle = cleared ? '#52d8a3' : '#d0b65f';
        ctx.lineWidth = 4;
        ctx.strokeRect(door.x, door.y, door.w, door.h);
        ctx.fillStyle = cleared ? '#52d8a3' : '#d0b65f';
        ctx.font = '900 11px Inter';
        ctx.fillText(cleared ? 'OPEN' : `DOOR ${index + 1}`, door.x + door.w / 2, door.y - 15);
        if (!cleared) ctx.fillText('← ENTER BACKWARD', door.x + 145, door.y + door.h / 2);
      }
      if (this.reverseDoorStage < 3) {
        ctx.fillStyle = '#3a1018';
        ctx.fillRect(3060, 120, 55, 350);
        ctx.strokeStyle = '#ff4f60';
        ctx.lineWidth = 4;
        ctx.strokeRect(3060, 120, 55, 350);
        ctx.fillStyle = '#ff7b88';
        ctx.font = '900 10px Inter';
        ctx.fillText('SOLVE DOORS 1–3', 3087, 100);
      } else if (!this.reverseParkourUnlocked) {
        ctx.fillStyle = '#3a1018';
        ctx.fillRect(3530, -880, 45, 1350);
        ctx.strokeStyle = '#ff4f60';
        ctx.lineWidth = 4;
        ctx.strokeRect(3530, -880, 45, 1350);
        ctx.fillStyle = '#ff7b88';
        ctx.font = '900 10px Inter';
        ctx.fillText('DOOR 4 IS ABOVE', 3220, 445);
      } else {
        ctx.fillStyle = '#ff5565';
        ctx.font = '900 13px Inter';
        ctx.fillText('THE IMPOSSIBLE ROUTE', 3260, 300);
      }

      ctx.fillStyle = '#17131a';
      ctx.fillRect(6265, 245, 250, 155);
      ctx.strokeStyle = '#f0c95f';
      ctx.lineWidth = 4;
      ctx.strokeRect(6265, 245, 250, 155);
      ctx.fillStyle = '#ffe99b';
      ctx.font = '900 13px Inter';
      ctx.fillText('BRO, WHY DID YOU DO', 6390, 280);
      ctx.fillText('ALL THAT PARKOUR?', 6390, 305);
      ctx.fillStyle = '#f37b88';
      ctx.font = '900 10px Inter';
      ctx.fillText('THE HIDDEN E LADDER', 6390, 338);
      ctx.fillText('WAS IN THE CENTER.', 6390, 358);
      ctx.fillStyle = '#858b99';
      ctx.fillText('YOU COULD HAVE SKIPPED IT.', 6390, 382);
      ctx.fillStyle = '#7e8492';
      ctx.font = '900 9px Inter';
      ctx.fillText('THE DOORS ARE TALL NOW. CROSS TO THE RIGHT, THEN ENTER LEFT.', 1650, 225);
      ctx.textAlign = 'left';
    },

    drawLoadingRoom() {
      ctx.fillStyle = '#171a23';
      ctx.fillRect(500, 365, 120, 105);
      ctx.strokeStyle = '#d5b85f';
      ctx.strokeRect(500, 365, 120, 105);
      ctx.fillStyle = '#d5b85f';
      ctx.font = '900 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('START LOADING', 560, 350);
      ctx.fillText('CLICK PUZZLE', 560, 420);
      ctx.textAlign = 'left';
    },

    drawDoublePressRoom() {
      ctx.fillStyle = '#2a1117';
      ctx.fillRect(1110, 425, 145, 45);
      ctx.fillStyle = this.doublePressCount ? '#701823' : '#e33447';
      ctx.fillRect(1140, 410, 85, 18);
      ctx.fillStyle = '#ff7c88';
      ctx.fillRect(1150, 410, 65, 5);
      ctx.fillStyle = '#e7e3da';
      ctx.font = '900 10px Inter';
      ctx.textAlign = 'center';
        ctx.fillText(this.doublePressCount === 0 ? 'DEVIL BUTTON' : (this.doublePressCount === 1 ? 'DO NOT PRESS AGAIN' : 'RUN'), 1182, 395);
      if (this.doublePressCount >= 2) {
        ctx.fillStyle = '#0b1612';
        ctx.fillRect(4090, 365, 75, 105);
        ctx.strokeStyle = '#5bddaa';
        ctx.strokeRect(4090, 365, 75, 105);
        ctx.fillStyle = '#5bddaa';
        ctx.fillText('ESCAPE', 4127, 350);
      }
      if (this.buttonChaseWall) {
        const wall = this.buttonChaseWall;
        ctx.fillStyle = '#b82031';
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = '#541019';
        for (let y = wall.y + 18; y < wall.y + wall.h; y += 35) ctx.fillRect(wall.x + 9, y, wall.w - 18, 6);
      }
      ctx.textAlign = 'left';
    },

    drawFakeVictoryRoom() {
      const endX = this.levelConfig.victoryX + 30;
      ctx.fillStyle = '#0b1612';
      ctx.fillRect(endX, 365, 82, 105);
      ctx.strokeStyle = '#5bddaa';
      ctx.lineWidth = 3;
      ctx.strokeRect(endX, 365, 82, 105);
      ctx.fillStyle = '#5bddaa';
      ctx.font = '900 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('ACTUAL END', endX + 41, 350);
      ctx.textAlign = 'left';
    },

    drawRageShards() {
      const time = performance.now() * .004;
      for (const shard of this.rageShards) {
        if (shard.collected) continue;
        const bob = Math.sin(time + shard.phase) * 6;
        ctx.save();
        ctx.translate(shard.x, shard.y + bob);
        ctx.rotate(time * .55 + shard.phase);
        ctx.shadowColor = '#ff4bca';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff65d4';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(9, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff2fc';
        ctx.fillRect(-2, -7, 4, 8);
        ctx.restore();
      }
    },

    drawLevelExtras() {
      const pulse = .45 + Math.sin(performance.now() * .008) * .15;
      for (const zone of this.extraWindZones) {
        ctx.fillStyle = `rgba(91, 203, 255, ${pulse * .13})`;
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.strokeStyle = 'rgba(119, 218, 255, .38)';
        ctx.setLineDash([5, 8]);
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(151, 229, 255, .7)';
        ctx.font = '900 18px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(zone.direction > 0 ? '→ →' : '← ←', zone.x + zone.w / 2, zone.y + 45);
      }
      for (const pad of this.extraBouncePads) {
        ctx.fillStyle = '#332a0e';
        ctx.fillRect(pad.x - pad.w / 2, pad.y - 9, pad.w, 9);
        ctx.fillStyle = '#ffd84d';
        ctx.fillRect(pad.x - pad.w / 2 + 4, pad.y - 8, pad.w - 8, 4);
      }
      for (const box of this.extraMysteryBoxes) {
        ctx.fillStyle = box.opened ? '#343640' : '#6a3b82';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeStyle = box.opened ? '#5a5d68' : '#d78cff';
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = box.opened ? '#777b86' : '#f5d8ff';
        ctx.font = '900 18px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(box.opened ? '×' : '?', box.x + box.w / 2, box.y + 23);
      }
      ctx.textAlign = 'left';
    },

    drawPlayer() {
      const p = this.player;
      if (this.levelConfig.spaceshipRoom) {
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(this.playerRotation || 0);
        ctx.scale(1.22, 1.22);
        ctx.shadowColor = '#62efff';
        ctx.shadowBlur = 18;
        ctx.fillStyle = `rgba(76, 231, 255, ${.13 + Math.sin(this.motionTime * 6) * .035})`;
        ctx.strokeStyle = '#79f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 43, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (this.spaceshipShield > 0 || this.spaceshipGrace > 0) {
          ctx.fillStyle = `rgba(100, 235, 255, ${this.spaceshipGrace > 0 ? .16 : .09})`;
          ctx.strokeStyle = this.spaceshipGrace > 0 ? '#ffffff' : '#68efff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, 0, 39, 27, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = this.keys.jump ? '#fff6ae' : '#ff824f';
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-38 - Math.random() * 8, -7);
        ctx.lineTo(-34 - Math.random() * 10, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#132030';
        ctx.beginPath();
        ctx.moveTo(28, 0);
        ctx.lineTo(-16, -17);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-16, 17);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#f4fbff';
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(-14, -14);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-14, 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#58d9f2';
        ctx.beginPath(); ctx.ellipse(5, -4, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef5364';
        ctx.fillRect(-15, -17, 13, 6);
        ctx.fillRect(-15, 11, 13, 6);
        ctx.restore();
        return;
      }
      if (this.levelConfig.planetRoom) {
        const centerX = p.x + p.w / 2;
        const centerY = p.y + p.h / 2;
        const facing = this.keys.left ? -1 : 1;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.playerRotation || 0);
        ctx.strokeStyle = '#f4fbff';
        ctx.fillStyle = '#f4fbff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -11, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 7);
        ctx.moveTo(0, -2);
        ctx.lineTo(9 * facing, 2);
        ctx.moveTo(0, -2);
        ctx.lineTo(-7 * facing, 3);
        ctx.moveTo(0, 7);
        ctx.lineTo(-8, 16);
        ctx.moveTo(0, 7);
        ctx.lineTo(8, 16);
        ctx.stroke();
        ctx.fillStyle = '#171923';
        ctx.beginPath();
        ctx.arc(2 * facing, -12, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#71ebff';
        ctx.fillRect(-5, 16, 10, 3);
        ctx.restore();
        return;
      }
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.fillRect(p.x + 4, p.y + p.h + 3, p.w, 5);
      ctx.fillStyle = '#ef4050';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#ff7b84';
      ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, 7);
      const facing = p.vx < -5 ? 5 : 15;
      ctx.fillStyle = '#171923';
      ctx.fillRect(p.x + facing, p.y + 15, 4, 4);
      ctx.fillStyle = '#f5e7d8';
      ctx.fillRect(p.x + facing + 1, p.y + 15, 2, 2);
    },

    loop(time) {
      if (!screens.game.classList.contains('hidden')) {
        const dt = Math.min(.033, Math.max(0, (time - this.lastTime) / 1000));
        this.lastTime = time;
        if (this.running) this.update(dt, time);
        this.draw();
        requestAnimationFrame((next) => this.loop(next));
      }
    },
  };

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function setKey(event, down) {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'a'].includes(key)) game.keys.left = down;
    if (['arrowright', 'd'].includes(key)) game.keys.right = down;
    if (['arrowup', 'w', ' '].includes(key)) {
      if (down && !game.keys.jump && game.levelConfig?.spaceshipRoom) game.spaceshipFlapQueued = true;
      game.keys.jump = down;
    }
    if (key === 'e') game.keys.climb = down;
    if (key === 'r' && down && !screens.game.classList.contains('hidden')) game.die('restart');
    if (['arrowleft', 'arrowright', 'arrowup', ' '].includes(key)) event.preventDefault();
  }

  window.addEventListener('keydown', (event) => setKey(event, true));
  window.addEventListener('keyup', (event) => setKey(event, false));
  window.addEventListener('blur', () => { game.keys.left = game.keys.right = game.keys.jump = game.keys.climb = false; });
  window.addEventListener('resize', () => { if (!screens.game.classList.contains('hidden')) game.resize(); });

  function bindTouch(id, key) {
    const button = $(id);
    const press = (event) => {
      event.preventDefault();
      if (key === 'jump' && game.levelConfig?.spaceshipRoom) game.spaceshipFlapQueued = true;
      game.keys[key] = true;
    };
    const release = (event) => { event.preventDefault(); game.keys[key] = false; };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  }
  bindTouch('#touch-left', 'left');
  bindTouch('#touch-right', 'right');
  bindTouch('#touch-climb', 'climb');
  bindTouch('#touch-jump', 'jump');

  canvas.addEventListener('pointerdown', (event) => {
    if (!game.running || !game.levelConfig?.spaceshipRoom || game.player.dead) return;
    event.preventDefault();
    game.spaceshipFlapQueued = true;
  });

  $('#play-again').addEventListener('click', () => {
    $('#win-panel').classList.add('hidden');
    game.start();
  });

  scheduleFlicker($('#question-one'));
})();
