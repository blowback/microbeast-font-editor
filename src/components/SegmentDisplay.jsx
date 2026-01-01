import { useMemo } from 'react';

// Segment bit values
export const SEGMENTS = {
  a: 1,
  b: 2,
  c: 4,
  d: 8,
  e: 16,
  f: 32,
  g1: 64,
  g2: 128,
  h: 256,
  j: 512,
  k: 1024,
  l: 2048,
  m: 4096,
  n: 8192,
  dp: 16384,
};

export const SEGMENT_NAMES = Object.keys(SEGMENTS);

export default function SegmentDisplay({ value = 0, onSegmentClick, size = 200, interactive = true }) {
  const width = size;
  const height = size * 1.54;
  const dpSize = size * 0.1;

  // Calculate dimensions
  const segmentThickness = size * 0.08;
  const padding = size * 0.05;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2 - dpSize;

  const centerX = width / 2;
  const centerY = padding + innerHeight / 2;

  const halfWidth = innerWidth / 2 - segmentThickness;
  const halfHeight = innerHeight / 2 - segmentThickness;

  const handleClick = (segment) => {
    if (interactive && onSegmentClick) {
      onSegmentClick(segment);
    }
  };

  const isLit = (segment) => (value & SEGMENTS[segment]) !== 0;

  const getSegmentColor = (segment) => {
    return isLit(segment) ? '#ffffff' : '#333333';
  };

  const segmentStyle = (segment) => ({
    fill: getSegmentColor(segment),
    cursor: interactive ? 'pointer' : 'default',
    transition: 'fill 0.1s ease',
  });

  // Segment path definitions
  const segments = useMemo(() => {
    const t = segmentThickness;
    const ht = t / 2;

    // Horizontal segment (full width)
    const hSegment = (x, y, w) => {
      return `M ${x + ht} ${y} L ${x + w - ht} ${y} L ${x + w} ${y + ht} L ${x + w - ht} ${y + t} L ${x + ht} ${y + t} L ${x} ${y + ht} Z`;
    };

    // Horizontal segment (half width)
    const hHalfSegment = (x, y, w, isLeft) => {
      if (isLeft) {
        return `M ${x + ht} ${y} L ${x + w} ${y} L ${x + w} ${y + t} L ${x + ht} ${y + t} L ${x} ${y + ht} Z`;
      } else {
        return `M ${x} ${y} L ${x + w - ht} ${y} L ${x + w} ${y + ht} L ${x + w - ht} ${y + t} L ${x} ${y + t} Z`;
      }
    };

    // Vertical segment
    const vSegment = (x, y, h) => {
      return `M ${x + ht} ${y} L ${x + t} ${y + ht} L ${x + t} ${y + h - ht} L ${x + ht} ${y + h} L ${x} ${y + h - ht} L ${x} ${y + ht} Z`;
    };

    // Diagonal segment (for h, k, n, l)
    const diagonalSegment = (x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len * (t * 0.4);
      const ny = dx / len * (t * 0.4);

      return `M ${x1 + nx} ${y1 + ny} L ${x2 + nx} ${y2 + ny} L ${x2 - nx} ${y2 - ny} L ${x1 - nx} ${y1 - ny} Z`;
    };

    const left = padding;
    const right = width - padding - t;
    const top = padding;
    const bottom = height - padding - dpSize - t;
    const mid = centerY - ht;

    const innerLeft = left + t + ht;
    const innerRight = right - ht;
    const innerTop = top + t + ht;
    const innerBottom = bottom - ht;
    const innerMidTop = mid - ht;
    const innerMidBottom = mid + t + ht;

    return {
      a: { d: hSegment(left + t, top, innerWidth - t * 2), name: 'a' },
      b: { d: vSegment(right, top + t, halfHeight), name: 'b' },
      c: { d: vSegment(right, centerY + ht, halfHeight), name: 'c' },
      d: { d: hSegment(left + t, bottom, innerWidth - t * 2), name: 'd' },
      e: { d: vSegment(left, centerY + ht, halfHeight), name: 'e' },
      f: { d: vSegment(left, top + t, halfHeight), name: 'f' },
      g1: { d: hHalfSegment(left + t, mid, halfWidth - t, true), name: 'g1' },
      g2: { d: hHalfSegment(centerX + ht, mid, halfWidth - t, false), name: 'g2' },
      h: { d: diagonalSegment(innerLeft, innerTop, centerX - ht, innerMidTop), name: 'h' },
      j: { d: vSegment(centerX - ht, top + t, halfHeight - t), name: 'j' },
      k: { d: diagonalSegment(innerRight, innerTop, centerX + ht, innerMidTop), name: 'k' },
      l: { d: diagonalSegment(centerX + ht, innerMidBottom, innerRight, innerBottom), name: 'l' },
      m: { d: vSegment(centerX - ht, centerY + ht, halfHeight - t), name: 'm' },
      n: { d: diagonalSegment(innerLeft, innerBottom, centerX - ht, innerMidBottom), name: 'n' },
    };
  }, [size, width, height, padding, innerWidth, innerHeight, centerX, centerY, halfWidth, halfHeight, segmentThickness]);

  // Decimal point
  const dpX = width - padding + dpSize * 0.5;
  const dpY = height - padding - dpSize / 2;

  return (
    <svg width={width + dpSize * 2} height={height} className="select-none">
      <rect x="0" y="0" width={width + dpSize * 2} height={height} fill="#1a1a1a" rx="4" />

      {/* Main segments */}
      {Object.entries(segments).map(([key, seg]) => (
        <path
          key={key}
          d={seg.d}
          style={segmentStyle(key)}
          onClick={() => handleClick(key)}
        >
          <title>{key}</title>
        </path>
      ))}

      {/* Decimal point */}
      <circle
        cx={dpX}
        cy={dpY}
        r={dpSize / 2}
        style={segmentStyle('dp')}
        onClick={() => handleClick('dp')}
      >
        <title>dp</title>
      </circle>
    </svg>
  );
}
