import { motion } from 'framer-motion';

export default function Timer({ timeLeft, progress, size = 'md' }) {
  const sizes = {
    sm: { width: 60, stroke: 4, font: 'text-lg' },
    md: { width: 100, stroke: 6, font: 'text-3xl' },
    lg: { width: 140, stroke: 8, font: 'text-5xl' },
  };

  const { width, stroke, font } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const getColor = () => {
    if (progress > 0.5) return '#26890C';
    if (progress > 0.25) return '#D89E00';
    return '#E21B3C';
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width, height: width }}>
      <svg width={width} height={width} className="-rotate-90">
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transition={{ duration: 0.5 }}
        />
      </svg>
      <span className={`absolute ${font} font-black text-white`}>
        {timeLeft}
      </span>
    </div>
  );
}
