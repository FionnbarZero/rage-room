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
    $('#music-label').classList.remove('hidden');
    const melody = [330, 392, 440, 523, 440, 392, 330, 294, 330, 440, 494, 392, 330, 262, 294, 330];
    tacoMusicTimer = window.setInterval(() => {
      const note = melody[tacoNote % melody.length];
      tone(note, .13, tacoNote % 4 === 0 ? 'square' : 'triangle', .024, 18);
      if (tacoNote % 4 === 0) tone(note / 2, .1, 'square', .012, -5);
      tacoNote += 1;
    }, 180);
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
      const flashWords = choices.map(() => Math.random() > .5 ? 'HELL' : 'DEMON');
      if (!flashWords.includes('HELL')) flashWords[Math.floor(Math.random() * flashWords.length)] = 'HELL';
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
    if (game.level < 10) game.advanceLevel(game.level + 1);
    else game.win();
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
    { x: 770, y: 325, w: 78, h: 18, type: 'solid' },
    { x: 920, y: 400, w: 62, h: 18, type: 'solid' },
    { x: 1060, y: 350, w: 65, h: 18, type: 'crumble' },
    { x: 1195, y: 440, w: 185, h: 70, type: 'solid' },
    { x: 1440, y: 390, w: 85, h: 18, type: 'moving', axis: 'y', range: 120, speed: 1.5 },
    { x: 1610, y: 300, w: 80, h: 18, type: 'solid' },
    { x: 1760, y: 385, w: 105, h: 18, type: 'fake' },
    { x: 1920, y: 425, w: 70, h: 18, type: 'solid' },
    { x: 2055, y: 360, w: 65, h: 18, type: 'crumble' },
    { x: 2190, y: 295, w: 65, h: 18, type: 'crumble' },
    { x: 2330, y: 380, w: 72, h: 18, type: 'solid' },
    { x: 2480, y: 440, w: 250, h: 70, type: 'solid' },
    { x: 2790, y: 385, w: 85, h: 18, type: 'moving', axis: 'x', range: 120, speed: 1.2 },
    { x: 3010, y: 325, w: 75, h: 18, type: 'solid' },
    { x: 3150, y: 420, w: 54, h: 18, type: 'solid' },
    { x: 3280, y: 345, w: 54, h: 18, type: 'crumble' },
    { x: 3410, y: 275, w: 54, h: 18, type: 'solid' },
    { x: 3535, y: 355, w: 58, h: 18, type: 'fake' },
    { x: 3655, y: 420, w: 58, h: 18, type: 'solid' },
    { x: 3785, y: 350, w: 65, h: 18, type: 'moving', axis: 'y', range: 135, speed: 1.7 },
    { x: 3925, y: 265, w: 62, h: 18, type: 'crumble' },
    { x: 4055, y: 365, w: 70, h: 18, type: 'solid' },
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
    { x: 900, text: 'Some platforms have commitment issues.' },
    { x: 1720, text: 'That one looks trustworthy.' },
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
    { x: 760, y: 350, w: 95, h: 18, type: 'solid' },
    { x: 1420, y: 330, w: 90, h: 18, type: 'crumble' },
    { x: 2070, y: 345, w: 90, h: 18, type: 'moving', axis: 'y', range: 80, speed: 1.5 },
    { x: 2740, y: 325, w: 90, h: 18, type: 'crumble' },
    { x: 3380, y: 350, w: 90, h: 18, type: 'solid' },
  ];

  const levelThreeCheckpoints = [
    { x: 1900, y: 410, reached: false, respawnX: 1840, respawnY: 410 },
    { x: 3190, y: 410, reached: false, respawnX: 3180, respawnY: 410 },
  ];

  const levelThreeMessages = [
    { x: 250, text: 'RUN. THE WALL IS HUNGRY.' },
    { x: 820, text: 'The first alcove was telling the truth.' },
    { x: 1050, text: 'Here comes another one. Surely the trick is the same.' },
    { x: 1750, text: 'Now dodge the tacos.' },
    { x: 2600, text: 'The rain is building the maze around you.' },
    { x: 3450, text: 'Please remain calm. The tacos can smell panic.' },
  ];

  const tacoMazeColumns = [
    { x: 570, height: 1 }, { x: 700, height: 2 }, { x: 910, height: 1 },
    { x: 1260, height: 2 }, { x: 1390, height: 1 }, { x: 1600, height: 2 },
    { x: 1940, height: 1 }, { x: 2210, height: 2 }, { x: 2330, height: 1 },
    { x: 2600, height: 2 }, { x: 2880, height: 1 }, { x: 3020, height: 2 },
    { x: 3270, height: 1 }, { x: 3510, height: 2 }, { x: 3630, height: 1 },
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
    { x: 560, y: 345, w: 100, h: 18, type: 'solid' },
    { x: 1370, y: 405, w: 105, h: 18, type: 'solid' },
    { x: 1540, y: 345, w: 95, h: 18, type: 'solid' },
    { x: 1710, y: 405, w: 95, h: 18, type: 'solid' },
    { x: 1880, y: 345, w: 95, h: 18, type: 'solid' },
    { x: 2050, y: 405, w: 110, h: 18, type: 'solid' },
  ];

  const levelFourMessages = [
    { x: 210, text: 'Your reflection is two seconds behind.' },
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
    { x: 2740, y: 300, w: 85, h: 18, type: 'crumble' },
    { x: 2910, y: 380, w: 80, h: 18, type: 'fake' },
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
    { x: 2310, y: 350, w: 95, h: 18, type: 'moving', axis: 'x', range: 60, speed: 2.5 },
    { x: 2470, y: 260, w: 90, h: 18, type: 'fake' },
    { x: 2630, y: 360, w: 95, h: 18, type: 'shifting', range: 52, speed: 2.8 },
    { x: 2790, y: 430, w: 300, h: 80, type: 'solid' },
    { x: 3140, y: 340, w: 95, h: 18, type: 'moving', axis: 'y', range: 70, speed: 2.7 },
    { x: 3300, y: 245, w: 90, h: 18, type: 'shifting', range: 58, speed: 3 },
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
    { x: 1900, text: 'There is a safe route. It is also moving.' },
    { x: 3050, text: 'Final chaos. Probably.' },
  ];

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
    { x: 475, y: 410, w: 125, h: 20, type: 'word', label: 'LISTEN', stage: 0 },
    { x: 645, y: 345, w: 72, h: 20, type: 'word', label: 'TO', stage: 0, axis: 'y', range: 18, speed: 1.25 },
    { x: 765, y: 285, w: 82, h: 20, type: 'word', label: 'ME', stage: 0, endpoint: true },
    { x: 920, y: 385, w: 105, h: 20, type: 'word', label: 'MAKE', stage: 1 },
    { x: 1070, y: 315, w: 82, h: 20, type: 'word', label: 'ME', stage: 1, axis: 'x', range: 20, speed: 1.5 },
    { x: 1200, y: 245, w: 125, h: 20, type: 'word', label: 'SPEAK', stage: 1, endpoint: true },
    { x: 1390, y: 365, w: 112, h: 20, type: 'word', label: "DON'T", stage: 2, axis: 'y', range: 22, speed: 1.65 },
    { x: 1550, y: 290, w: 105, h: 20, type: 'word', label: 'FALL', stage: 2 },
    { x: 1710, y: 385, w: 100, h: 20, type: 'word', label: 'NOW', stage: 2, endpoint: true },
    { x: 1880, y: 315, w: 90, h: 20, type: 'word', label: 'THE', stage: 3 },
    { x: 2015, y: 245, w: 105, h: 20, type: 'word', label: 'EXIT', stage: 3, axis: 'x', range: 25, speed: 1.8 },
    { x: 2170, y: 340, w: 70, h: 20, type: 'word', label: 'IS', stage: 3 },
    { x: 2280, y: 270, w: 145, h: 20, type: 'word', label: 'BEHIND', stage: 3, axis: 'y', range: 26, speed: 1.95 },
    { x: 2480, y: 385, w: 95, h: 20, type: 'word', label: 'YOU', stage: 3, endpoint: true },
    { x: 2610, y: 470, w: 490, h: 40, type: 'solid' },
  ];

  const levelTenMessages = [];

  const levels = {
    1: { platforms: basePlatforms, spikes, checkpoints, messages, width: 4680, goalX: 4438 },
    2: { platforms: levelThreePlatforms, spikes: [], checkpoints: levelThreeCheckpoints, messages: levelThreeMessages, width: 3900, goalX: 3730, doorX: 3735, tacoStorm: true, wallRoom: true },
    3: { platforms: levelThreeClimbPlatforms, spikes: [], checkpoints: [], messages: levelThreeClimbMessages, width: 1500, goalX: 1280, goalY: -1140, doorX: 1335, doorY: -1315, lavaClimb: true, verticalCamera: true, allPlatformsMove: true },
    4: { platforms: levelFourPlatforms, spikes: [], checkpoints: [], messages: levelFourMessages, width: 2500, goalX: 2310, mirrorRoom: true },
    5: { platforms: levelFivePlatforms, spikes: [], checkpoints: [], messages: levelFiveMessages, width: 2800, goalX: 2670, redLightRoom: true },
    6: { platforms: levelSixPlatforms, spikes: [], checkpoints: [], messages: levelSixMessages, width: 1500, goalX: 99999, elevatorRoom: true },
    7: { platforms: levelSevenPlatforms, spikes: [], checkpoints: [], messages: levelSevenMessages, width: 4100, goalX: 3850, doorX: 3890, darkMonsterRoom: true, doubleJump: true },
    8: { platforms: levelEightPlatforms, spikes: [], checkpoints: [], messages: levelEightMessages, width: 4250, goalX: 4030, doorX: 4070, chaosRoom: true, doubleJump: true, allPlatformsMove: true, oneWayPlatforms: true },
    9: { platforms: levelNinePlatforms, spikes: [], checkpoints: [], messages: levelNineMessages, width: 4550, goalX: 99999, quizRoom: true },
    10: { platforms: levelTenPlatforms, spikes: [], checkpoints: [], messages: levelTenMessages, width: 3100, goalX: 99999, narratorRoom: true, doubleJump: true },
  };

  const game = {
    running: false,
    lastTime: 0,
    cameraX: 0,
    cameraY: 0,
    deaths: 0,
    checkpoint: 0,
    keys: { left: false, right: false, jump: false },
    jumpPressed: false,
    platforms: [],
    seenMessages: new Set(),
    particles: [],
    shake: 0,
    animationStarted: false,
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
    mirrorTime: 0,
    mirrorHistory: [],
    shadow: { x: 70, y: 420, w: 25, h: 34, visible: false },
    mirrorSolved: false,
    controlsReversed: false,
    fakeExitTriggered: false,
    realExitVisible: false,
    redLightClock: 0,
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
    monster: { x: 900, y: 315, w: 105, h: 155, active: false, minX: 900, maxX: 1060, direction: 1, speed: 115 },
    monsterScare: 0,
    chaosClock: 0,
    chaosEvent: 'reverse',
    chaosEventIndex: -1,
    chaosOrbs: [],
    chaosLaserY: 450,
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
    motionTime: 0,
    player: { x: 70, y: 420, w: 25, h: 34, vx: 0, vy: 0, grounded: false, ridingPlatformId: null, coyote: 0, jumpBuffer: 0, dead: false },

    start() {
      this.running = true;
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
      this.lastTime = performance.now();
      if (!this.animationStarted) {
        this.animationStarted = true;
        requestAnimationFrame((time) => this.loop(time));
      }
      this.toast('Welcome to the tutorial.');
    },

    resetPlatforms() {
      this.platforms = this.levelConfig.platforms.map((platform, index) => ({ ...platform, id: index, baseX: platform.x, baseY: platform.y, broken: false, crumbleAt: 0 }));
      this.motionTime = 0;
    },

    loadLevel(number) {
      stopTacoMusic();
      this.level = number;
      this.levelConfig = levels[number];
      this.activeSpikes = this.levelConfig.spikes.map((spike) => ({ ...spike }));
      this.activeCheckpoints = this.levelConfig.checkpoints.map((checkpoint) => ({ ...checkpoint, reached: false }));
      this.activeMessages = this.levelConfig.messages;
      WORLD.width = this.levelConfig.width;
      this.checkpoint = 0;
      this.seenMessages.clear();
      this.resetPlatforms();
      if (this.levelConfig.tacoStorm) {
        this.prepareTacoMaze();
        if (!this.levelConfig.wallRoom) startTacoMusic();
      } else {
        this.tacos = [];
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
      $('#level-count').textContent = String(number);
      $('#checkpoint-count').textContent = `0/${this.activeCheckpoints.length}`;
    },

    prepareTacoMaze() {
      let order = 0;
      this.tacos = tacoMazeColumns.filter((column) => column.x > 1750).flatMap((column) => Array.from({ length: column.height }, (_, row) => ({
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
      this.monster = { x: 900, y: 315, w: 105, h: 155, active: false, minX: 900, maxX: 1060, direction: 1, speed: 115 };
      this.monsterScare = 0;
    },

    prepareChaosRoom() {
      this.chaosClock = .8;
      this.chaosEvent = 'calm';
      this.chaosEventIndex = -1;
      this.chaosOrbs = [];
      this.chaosLaserY = 450;
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
      $('#narrator-box').classList.remove('hidden', 'lie');
      $('#narrator-line').textContent = 'Use my words. Jump on: LISTEN TO ME.';
    },

    respawn(first = false) {
      const player = this.player;
      const cp = this.checkpoint ? this.activeCheckpoints[this.checkpoint - 1] : null;
      player.x = cp?.respawnX ?? 70;
      player.y = cp?.respawnY ?? 420;
      player.vx = 0;
      player.vy = 0;
      player.airJumps = 1;
      player.dead = false;
      player.ridingPlatformId = null;
      this.secretFallArmed = false;
      this.cameraX = Math.max(0, player.x - canvas.width * .25);
      this.cameraY = 0;
      this.platforms.forEach((platform) => { platform.broken = false; platform.crumbleAt = 0; });
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
      if (!first) this.toast(['Again.', 'That looked expensive.', 'The spikes remain undefeated.', 'Maybe jump later. Or earlier.', 'Excellent falling.'][this.deaths % 5]);
    },

    die(reason = 'gravity') {
      if (this.player.dead || !this.running) return;
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
      const p = this.player;
      if (!p.dead) {
        let jumpedThisFrame = false;
        let carriedPlatform = null;
        const jumpJustPressed = this.keys.jump && !this.jumpWasDown;
        this.jumpWasDown = this.keys.jump;
        const rawDirection = this.quizActive ? 0 : Number(this.keys.right) - Number(this.keys.left);
        const controlsInverted = (this.levelConfig.mirrorRoom && this.controlsReversed)
          || (this.levelConfig.elevatorRoom && this.elevatorControlsReversed)
          || (this.levelConfig.chaosRoom && this.chaosEvent === 'reverse');
        const direction = controlsInverted ? -rawDirection : rawDirection;
        const target = direction * 275;
        p.vx += (target - p.vx) * Math.min(1, dt * (p.grounded ? 14 : 5.5));
        if (!direction && p.grounded) p.vx *= Math.pow(.001, dt);

        if (jumpJustPressed) p.jumpBuffer = .12;
        else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
        p.coyote = p.grounded ? .09 : Math.max(0, p.coyote - dt);
        if (p.jumpBuffer > 0 && p.coyote > 0) {
          p.vy = this.levelConfig.chaosRoom && this.chaosEvent === 'super' ? -820 : -610;
          p.grounded = false;
          p.ridingPlatformId = null;
          jumpedThisFrame = true;
          p.coyote = 0;
          p.jumpBuffer = 0;
          tone(260, .07, 'square', .025, 80);
        } else if (jumpJustPressed && this.levelConfig.doubleJump && p.airJumps > 0) {
          p.vy = this.levelConfig.chaosRoom && this.chaosEvent === 'super' ? -760 : -570;
          p.airJumps -= 1;
          p.jumpBuffer = 0;
          jumpedThisFrame = true;
          tone(390, .09, 'square', .035, 120);
        }
        if (!this.keys.jump && p.vy < -220) p.vy += 1300 * dt;

        const gravityScale = this.levelConfig.chaosRoom && this.chaosEvent === 'moon' ? .34 : 1;
        p.vy += 1700 * gravityScale * dt;
        p.vy = Math.min(p.vy, 900);

        this.motionTime += dt;
        this.platforms.forEach((platform) => {
          const oldX = platform.x;
          const oldY = platform.y;
          const designedMover = platform.type === 'moving' || platform.type === 'shifting'
            || (platform.type === 'word' && platform.range);
          const autoMover = this.levelConfig.allPlatformsMove
            && platform.h <= 30
            && (!this.levelConfig.lavaClimb || this.lavaActive);
          if (designedMover || autoMover) {
            const phase = this.motionTime * (platform.speed ?? 1);
            if (platform.type === 'shifting') {
              platform.x = platform.baseX + Math.sin(phase) * platform.range;
              platform.y = platform.baseY + Math.cos(phase * .73) * 18;
            } else if (platform.type === 'moving' && platform.axis === 'x') {
              platform.x = platform.baseX + Math.sin(phase) * platform.range;
            } else if (platform.type === 'moving') {
              platform.y = platform.baseY + Math.sin(phase) * platform.range;
            } else if (platform.type === 'word' && platform.axis === 'x') {
              platform.x = platform.baseX + Math.sin(phase) * platform.range;
            } else if (platform.type === 'word') {
              platform.y = platform.baseY + Math.sin(phase) * platform.range;
            } else {
              const autoPhase = this.motionTime * (1.05 + (platform.id % 5) * .13) + platform.id * 1.7;
              platform.x = platform.baseX + Math.sin(autoPhase) * (10 + (platform.id % 3) * 4);
              platform.y = platform.baseY + Math.cos(autoPhase * .77) * (6 + (platform.id % 2) * 3);
            }
            if (!jumpedThisFrame && p.grounded && p.ridingPlatformId === platform.id) {
              p.x += platform.x - oldX;
              p.y += platform.y - oldY;
              carriedPlatform = platform;
            }
          }
          if (platform.type === 'crumble' && platform.crumbleAt && now - platform.crumbleAt > 480) platform.broken = true;
          if (platform.type === 'fake' && platform.crumbleAt && now - platform.crumbleAt > 110) platform.broken = true;
        });

        if (this.levelConfig.wallRoom) this.updateWallRoom(dt);
        if (this.levelConfig.tacoStorm && (!this.levelConfig.wallRoom || this.wallPhase === 4)) this.updateTacoRain(dt);
        if (this.levelConfig.lavaClimb) this.updateLavaClimb(dt);

        p.x += p.vx * dt;
        this.collide('x', now);
        const previousBottom = p.y + p.h;
        p.y += p.vy * dt;
        p.grounded = false;
        p.ridingPlatformId = null;
        this.collide('y', now, previousBottom);
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

        if (this.level === 1 && this.trapTriggered && p.x < 450 && p.y > WORLD.floor - 20) this.secretFallArmed = true;
        if (p.y > WORLD.height + 90) {
          if (this.level === 1 && this.secretFallArmed) this.advanceLevel();
          else this.die('fall');
        }
        for (const spike of this.activeSpikes) {
          if (rectsOverlap(p, { x: spike.x + 5, y: spike.y + 5, w: spike.w - 10, h: spike.h - 5 })) this.die('spike');
        }

        this.activeCheckpoints.forEach((cp, index) => {
          if (!cp.reached && p.x > cp.x) {
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
          else if (!this.fakeExitTriggered) this.triggerFakeMirrorExit();
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

    collide(axis, now, previousBottom = null) {
      const p = this.player;
      const solids = this.levelConfig.tacoStorm
        ? this.platforms.concat(this.tacos.filter((taco) => taco.state === 'landed'))
        : this.platforms;
      for (const platform of solids) {
        if (platform.type === 'debris' && !this.elevatorDropped) continue;
        if (platform.type === 'word' && platform.stage > this.narratorWordStage) continue;
        if (platform.broken || !rectsOverlap(p, platform)) continue;
        const oneWay = ((this.levelConfig.lavaClimb || this.levelConfig.oneWayPlatforms) && platform.id !== undefined)
          || platform.type === 'word';
        if (axis === 'x') {
          if (oneWay || platform.type === 'moving' || platform.type === 'shifting') continue;
          if (p.vx > 0) p.x = platform.x - p.w;
          else if (p.vx < 0) p.x = platform.x + platform.w;
          p.vx = 0;
        } else if (p.vy > 0) {
          if (oneWay && previousBottom > platform.y + 5) continue;
          p.y = platform.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.airJumps = 1;
          p.ridingPlatformId = (oneWay || platform.type === 'moving' || platform.type === 'shifting' || platform.type === 'word') ? platform.id : null;
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
      if (this.tacoRainClock <= 0 && p.x > 1750 && p.x < this.levelConfig.goalX - 250) {
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
        this.chasingWall.x += this.chasingWall.speed * dt;
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
        this.chasingWall.x += this.chasingWall.speed * dt;
        if (inSecondAlcove) {
          this.toast('Wrong. This alcove is the trap.');
          this.die('alcove');
        }
        if (this.chasingWall.x > 1550) {
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
        const targetTime = this.mirrorTime - 2;
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
      this.redLightCanMove = Math.floor(this.redLightClock / 1.45) % 2 === 0;

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
        p.x = Math.max(70, p.x - 360);
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
        this.monster.x += this.monster.direction * this.monster.speed * dt;
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
          p.airJumps = 1;
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
      const events = ['reverse', 'moon', 'rain', 'super', 'laser', 'quake'];
      const labels = {
        reverse: 'WHAT THE HELL: CONTROLS REVERSED',
        moon: 'WHAT THE HELL: MOON GRAVITY',
        rain: 'WHAT THE HELL: FIREBALL WEATHER',
        super: 'WHAT THE HELL: SUPER JUMPS',
        laser: 'WHAT THE HELL: LASER SWEEP',
        quake: 'WHAT THE HELL: EARTHQUAKE',
      };

      this.chaosClock -= dt;
      if (this.chaosClock <= 0) {
        this.chaosEventIndex = (this.chaosEventIndex + 1) % events.length;
        this.chaosEvent = events[this.chaosEventIndex];
        this.chaosClock = 3.4;
        this.chaosSpawnClock = 0;
        this.toast(labels[this.chaosEvent]);
        tone(120 + this.chaosEventIndex * 55, .18, 'sawtooth', .035, 70);
      }

      if (this.chaosEvent === 'quake') this.shake = Math.max(this.shake, 5.5);

      if (this.chaosEvent === 'laser') {
        const progress = 1 - this.chaosClock / 3.4;
        this.chaosLaserY = 520 - progress * 560;
        if (p.y < this.chaosLaserY + 7 && p.y + p.h > this.chaosLaserY - 7) this.die('laser');
      }

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
          this.chaosSpawnClock = .28;
        }
      }

      for (const orb of this.chaosOrbs) {
        orb.y += orb.vy * dt;
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

    updateNarratorRoom(interactPressed) {
      const p = this.player;
      const lines = [
        'Use my words. Jump on: LISTEN TO ME.',
        'You made me speak. Now jump on: MAKE ME SPEAK.',
        'Again! This time: DON\'T FALL NOW.',
        'My final sentence is: THE EXIT IS BEHIND YOU.',
        'I told you where it is. Double-jump all the way back.',
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

      if (word?.endpoint && word.stage === this.narratorWordStage) {
        this.narratorWordStage += 1;
        if (this.narratorWordStage === 4) this.narratorRealExit = true;
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
      if (atRealExit && interactPressed) this.win();
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

      this.lavaElapsed += dt;
      const lavaSpeed = Math.min(30, 13 + this.lavaElapsed * .12);
      this.lavaY -= lavaSpeed * dt;
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
      this.keys.left = this.keys.right = this.keys.jump = false;
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
      this.player.dead = true;
      $('#level-banner h2').textContent = `LEVEL ${number}`;
      const levelNames = { 2: 'Taco Storm', 3: 'WHAT?', 4: 'The Mirror Room', 5: 'Red Light, Wrong Light', 6: 'The Elevator', 7: 'The Dark Walkway', 8: 'WHAT THE HELL?', 9: 'YES OR NO?', 10: 'The Narrator' };
      $('#level-banner small').textContent = levelNames[number];
      $('#level-banner').classList.remove('hidden');
      tone(330, .25, 'sine', .05, 220);
      window.setTimeout(() => {
        this.loadLevel(number);
        this.respawn(true);
        $('#level-banner').classList.add('hidden');
        const introductions = {
          2: 'Level 2: Dodge the raining tacos.',
          3: 'Level 3: A normal walking room.',
          4: 'Level 4: Your reflection remembers everything.',
          5: 'Level 5: The reflection shows the real signal.',
          6: 'Level 6: Please select a floor.',
          7: 'Level 7: A completely normal dark walkway.',
          8: 'Level 8: The room changes the rules constantly.',
          9: 'Level 9: Just answer some easy questions.',
          10: 'Level 10: The Narrator is here to help. Allegedly.',
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
      gradient.addColorStop(0, this.levelConfig.chaosRoom ? `hsl(${chaosHue} 58% 18%)` : (this.levelConfig.tacoStorm ? '#3a1838' : '#111725'));
      gradient.addColorStop(.62, this.levelConfig.chaosRoom ? `hsl(${(chaosHue + 90) % 360} 62% 22%)` : (this.levelConfig.tacoStorm ? '#8d382d' : '#17121d'));
      gradient.addColorStop(1, this.levelConfig.chaosRoom ? `hsl(${(chaosHue + 180) % 360} 70% 24%)` : (this.levelConfig.tacoStorm ? '#d27a32' : '#280e16'));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, viewW, WORLD.height);

      this.drawBackground(viewW);
      ctx.save();
      ctx.translate(-this.cameraX, -this.cameraY);

      const lavaSurface = this.levelConfig.lavaClimb
        ? (this.lavaActive ? Math.min(WORLD.floor, this.lavaY) : WORLD.height)
        : WORLD.floor;
      ctx.fillStyle = '#7c1120';
      ctx.fillRect(0, lavaSurface, WORLD.width, WORLD.height - lavaSurface);
      ctx.fillStyle = '#e33443';
      for (let x = 0; x < WORLD.width; x += 38) {
        const wave = Math.sin(x * .05 + performance.now() * .004) * 5;
        ctx.beginPath();
        ctx.arc(x, lavaSurface + wave, 23, Math.PI, 0);
        ctx.fill();
      }

      this.platforms.forEach((platform) => this.drawPlatform(platform));
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
    },

    drawPlatform(platform) {
      if (platform.type === 'debris' && !this.elevatorDropped) return;
      if (platform.type === 'word' && platform.stage > this.narratorWordStage) return;
      if (platform.broken) return;
      let color = '#34394a';
      if (platform.type === 'crumble') color = '#68464d';
      if (platform.type === 'fake') color = '#34394a';
      if (platform.type === 'moving') color = '#374b57';
      if (platform.type === 'shifting') color = '#563b70';
      if (platform.type === 'word') color = platform.wordPulse > 0 ? '#f0d270' : '#514b3c';
      if (this.levelConfig.lavaClimb && platform.x > 520) {
        const hue = (platform.id * 47 + performance.now() * .035) % 360;
        color = `hsl(${hue} 42% 35%)`;
      }
      if (this.levelConfig.chaosRoom && platform.h <= 30) {
        const hue = (platform.id * 71 + performance.now() * .08) % 360;
        color = `hsl(${hue} 72% 42%)`;
      }
      ctx.fillStyle = '#10121a';
      ctx.fillRect(platform.x + 5, platform.y + 7, platform.w, platform.h);
      ctx.fillStyle = color;
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      ctx.fillStyle = platform.type === 'crumble' ? '#cf6c73' : (platform.type === 'word' ? '#d7b95d' : '#7a8198');
      ctx.fillRect(platform.x, platform.y, platform.w, 4);
      if (platform.type === 'word') {
        ctx.fillStyle = platform.wordPulse > 0 ? '#17130a' : '#fff2c9';
        ctx.font = '900 13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(platform.label, platform.x + platform.w / 2, platform.y + 16);
        ctx.textAlign = 'left';
      }
      if (platform.type === 'crumble' && platform.crumbleAt) {
        ctx.strokeStyle = '#201116';
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.w * .3, platform.y);
        ctx.lineTo(platform.x + platform.w * .5, platform.y + platform.h);
        ctx.moveTo(platform.x + platform.w * .7, platform.y);
        ctx.lineTo(platform.x + platform.w * .56, platform.y + platform.h);
        ctx.stroke();
      }
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
      if (this.levelConfig.mirrorRoom || this.levelConfig.redLightRoom || this.levelConfig.elevatorRoom || this.levelConfig.quizRoom || this.levelConfig.narratorRoom) return;
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

      ctx.fillStyle = '#202531';
      ctx.fillRect(1160, 330, 120, 140);
      ctx.fillStyle = '#a6adbb';
      ctx.beginPath(); ctx.arc(1220, 300, 65, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#11141b';
      ctx.fillRect(1195, 285, 12, 12);
      ctx.fillRect(1234, 285, 12, 12);
      ctx.fillRect(1200, 320, 40, 8);

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

      if (this.chaosEvent === 'laser') {
        ctx.strokeStyle = '#ff2447';
        ctx.shadowColor = '#ff2447';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.moveTo(0, this.chaosLaserY);
        ctx.lineTo(WORLD.width, this.chaosLaserY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

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
        if (platform.type !== 'word' || !platform.endpoint || platform.stage !== this.narratorWordStage) continue;
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

    drawPlayer() {
      const p = this.player;
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
    if (['arrowup', 'w', ' '].includes(key)) game.keys.jump = down;
    if (key === 'r' && down && !screens.game.classList.contains('hidden')) game.die('restart');
    if (['arrowleft', 'arrowright', 'arrowup', ' '].includes(key)) event.preventDefault();
  }

  window.addEventListener('keydown', (event) => setKey(event, true));
  window.addEventListener('keyup', (event) => setKey(event, false));
  window.addEventListener('blur', () => { game.keys.left = game.keys.right = game.keys.jump = false; });
  window.addEventListener('resize', () => { if (!screens.game.classList.contains('hidden')) game.resize(); });

  function bindTouch(id, key) {
    const button = $(id);
    const press = (event) => { event.preventDefault(); game.keys[key] = true; };
    const release = (event) => { event.preventDefault(); game.keys[key] = false; };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  }
  bindTouch('#touch-left', 'left');
  bindTouch('#touch-right', 'right');
  bindTouch('#touch-jump', 'jump');

  $('#play-again').addEventListener('click', () => {
    $('#win-panel').classList.add('hidden');
    game.start();
  });

  scheduleFlicker($('#question-one'));
})();
