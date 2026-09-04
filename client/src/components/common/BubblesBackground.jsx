import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

const MIN_SIZE = 85;
const MAX_SIZE = 155;
const MIN_DURATION = 22;
const MAX_DURATION = 42;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function makeBubble(id, images) {
  const size = random(MIN_SIZE, MAX_SIZE);
  const img = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : null;
  return {
    id,
    img,
    size,
    left: random(2, 92),
    delay: random(0, 18),
    duration: random(MIN_DURATION, MAX_DURATION),
    wobbleAmp: random(20, 60),
    wobbleDuration: random(4, 8),
    opacity: random(0.45, 0.75),
    startScale: random(0.7, 0.9),
    endScale: random(0.95, 1.1),
  };
}

export default function BubblesBackground() {
  const { settings } = useSettings();
  const { bubblesEnabled, bubbleImages, bubbleCount = 18 } = settings;
  const { pathname } = useLocation();

  const isAdmin = pathname.startsWith('/admin');
  const count = Math.max(1, Math.min(50, bubbleCount));

  const bubbles = useMemo(() => {
    if (!bubblesEnabled || !bubbleImages?.length || isAdmin) return [];
    return Array.from({ length: count }, (_, i) => makeBubble(i, bubbleImages));
  }, [bubblesEnabled, bubbleImages, count, isAdmin]);

  if (!bubbles.length) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes bbl-float {
          0% {
            transform: translateY(0) scale(var(--bbl-start-scale));
            opacity: 0;
          }
          4% {
            opacity: var(--bbl-opacity);
          }
          90% {
            opacity: var(--bbl-opacity);
          }
          100% {
            transform: translateY(calc(-100vh - 200px)) scale(var(--bbl-end-scale));
            opacity: 0;
          }
        }

        @keyframes bbl-sway {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(calc(var(--bbl-wobble) * 0.6)); }
          50% { transform: translateX(var(--bbl-wobble)); }
          75% { transform: translateX(calc(var(--bbl-wobble) * 0.3)); }
        }

        @keyframes bbl-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .bbl-wrap {
          position: absolute;
          bottom: -180px;
          animation: bbl-float var(--bbl-dur) ease-in-out var(--bbl-delay) infinite;
          will-change: transform, opacity;
        }

        .bbl-sway {
          animation: bbl-sway var(--bbl-sway-dur) ease-in-out var(--bbl-delay) infinite;
          will-change: transform;
        }

        .bbl-sphere {
          position: relative;
          width: var(--bbl-size);
          height: var(--bbl-size);
          border-radius: 50%;
          background: radial-gradient(
            ellipse at 30% 25%,
            rgba(255,255,255,0.35) 0%,
            rgba(255,255,255,0.14) 35%,
            rgba(255,255,255,0.05) 70%,
            transparent 100%
          );
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow:
            inset 0 -10px 24px rgba(255,255,255,0.12),
            inset 6px 6px 20px rgba(255,255,255,0.15),
            0 6px 30px rgba(0,0,0,0.12),
            0 0 20px rgba(130,80,220,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .bbl-sphere img {
          width: 62%;
          height: 62%;
          object-fit: contain;
          border-radius: 50%;
          opacity: 0.92;
          animation: bbl-rotate 30s linear infinite;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2));
        }

        .bbl-shine {
          position: absolute;
          top: 10%;
          left: 15%;
          width: 35%;
          height: 22%;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255,255,255,0.5), transparent 70%);
          transform: rotate(-30deg);
          pointer-events: none;
        }
      `}</style>

      {bubbles.map((b) => (
        <div
          key={b.id}
          className="bbl-wrap"
          style={{
            left: `${b.left}%`,
            '--bbl-dur': `${b.duration}s`,
            '--bbl-delay': `${b.delay}s`,
            '--bbl-opacity': b.opacity,
            '--bbl-start-scale': b.startScale,
            '--bbl-end-scale': b.endScale,
          }}
        >
          <div
            className="bbl-sway"
            style={{
              '--bbl-wobble': `${b.wobbleAmp}px`,
              '--bbl-sway-dur': `${b.wobbleDuration}s`,
            }}
          >
            <div
              className="bbl-sphere"
              style={{ '--bbl-size': `${b.size}px` }}
            >
              <div className="bbl-shine" />
              {b.img && <img src={b.img} alt="" draggable="false" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
