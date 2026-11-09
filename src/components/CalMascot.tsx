import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type CalMood = "happy" | "wink" | "excited" | "sleepy";

interface CalMascotProps {
  mood?: CalMood;
  size?: number;
  animate?: boolean;
  className?: string;
}

const EYE_STROKE = {
  fill: "none",
  stroke: "#fff",
  strokeWidth: 3.2,
  strokeLinecap: "round" as const,
};

function CalFace({ mood }: { mood: CalMood }) {
  switch (mood) {
    case "wink":
      return (
        <>
          <path d="M35.5 51.5Q40 46.5 44.5 51.5" {...EYE_STROKE} />
          <circle cx="60" cy="51" r="5" fill="#fff" />
          <circle cx="61" cy="50" r="2.3" fill="#1F1640" />
          <path
            d="M41 62Q50 72 59 62"
            fill="none"
            stroke="#fff"
            strokeWidth={3.6}
            strokeLinecap="round"
          />
        </>
      );
    case "excited":
      return (
        <>
          <path d="M35.5 52Q40 46 44.5 52" {...EYE_STROKE} />
          <path d="M55.5 52Q60 46 64.5 52" {...EYE_STROKE} />
          <path d="M41 61Q50 75 59 61Z" fill="#fff" />
          <path
            d="M14 24l1.4 3.8 3.8 1.4-3.8 1.4-1.4 3.8-1.4-3.8-3.8-1.4 3.8-1.4z"
            fill="#FFC234"
          />
          <path
            d="M87 18l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z"
            fill="#FFC234"
          />
        </>
      );
    case "sleepy":
      return (
        <>
          <path d="M35.5 50Q40 54.5 44.5 50" {...EYE_STROKE} />
          <path d="M55.5 50Q60 54.5 64.5 50" {...EYE_STROKE} />
          <circle cx="50" cy="64" r="2.6" fill="#fff" />
          <path
            d="M78 14h6l-6 7h6"
            fill="none"
            stroke="#6B45F5"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "happy":
    default:
      return (
        <>
          <circle cx="40" cy="51" r="5" fill="#fff" />
          <circle cx="60" cy="51" r="5" fill="#fff" />
          <circle cx="41" cy="50" r="2.3" fill="#1F1640" />
          <circle cx="61" cy="50" r="2.3" fill="#1F1640" />
          <path
            d="M42 63Q50 71 58 63"
            fill="none"
            stroke="#fff"
            strokeWidth={3.6}
            strokeLinecap="round"
          />
        </>
      );
  }
}

export function CalMascot({
  mood = "happy",
  size = 120,
  animate = false,
  className,
}: CalMascotProps) {
  const gid = useId();
  const reduceMotion = useReducedMotion();
  const shouldFloat = animate && !reduceMotion;

  const svg = (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Cal ${mood}`}
      className={className}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7C5BFF" />
          <stop offset="1" stopColor="#5B34E8" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="85" rx="23" ry="3.5" fill="#3B2488" opacity="0.15" />
      <rect x="22" y="27" width="56" height="52" rx="15" fill={`url(#${gid})`} />
      <rect x="27" y="30" width="46" height="6" rx="3" fill="#FFFFFF" opacity="0.18" />
      <rect x="33" y="19" width="7" height="15" rx="3.5" fill="#6FEBA0" />
      <rect x="60" y="19" width="7" height="15" rx="3.5" fill="#6FEBA0" />
      <circle cx="33" cy="61" r="3.2" fill="#FFC234" opacity={mood === "sleepy" ? 0.6 : 0.9} />
      <circle cx="67" cy="61" r="3.2" fill="#FFC234" opacity={mood === "sleepy" ? 0.6 : 0.9} />
      <CalFace mood={mood} />
    </svg>
  );

  if (!shouldFloat) return svg;

  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ display: "inline-block", width: size, height: size }}
    >
      {svg}
    </motion.div>
  );
}

export default CalMascot;
