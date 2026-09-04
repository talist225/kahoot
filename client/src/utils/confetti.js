import confetti from 'canvas-confetti';
import { CONFETTI_COLORS } from './constants';

export function celebrate(durationMs = 3000) {
  const end = Date.now() + durationMs;
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: CONFETTI_COLORS });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: CONFETTI_COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function burst() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
}
