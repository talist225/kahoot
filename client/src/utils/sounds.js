const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available
  }
}

export function playCorrect() {
  playTone(523, 0.15, 'sine', 0.3);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 100);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 200);
}

export function playWrong() {
  playTone(200, 0.3, 'sawtooth', 0.2);
  setTimeout(() => playTone(150, 0.4, 'sawtooth', 0.2), 200);
}

export function playCountdown() {
  playTone(440, 0.1, 'square', 0.15);
}

export function playGameStart() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'sine', 0.25), i * 120);
  });
}

export function playPlayerJoin() {
  playTone(880, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.15), 80);
}

export function playTick() {
  playTone(800, 0.05, 'sine', 0.1);
}
