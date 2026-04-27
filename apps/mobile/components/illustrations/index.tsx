import Svg, { Circle, G, Line, Path, Polyline, Rect } from 'react-native-svg';
import { COLORS } from '@/lib/theme/tokens';

const VIOLET = COLORS.bp[400];
const AMBER  = COLORS.amber[400];
const TRACK  = COLORS.surface[3];

const SIZE = 160;

type Props = { size?: number };

/**
 * Ilustraciones inline SVG, estilo trazo simple violet con acento amber.
 * Pensadas para EmptyState. Sin ficheros externos para evitar bundling.
 */

export function EmptyRoutine({ size = SIZE }: Props = {}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Cuaderno */}
      <Rect x="36" y="28" width="92" height="108" rx="8" stroke={VIOLET} strokeWidth="3" />
      <Line x1="56" y1="28" x2="56" y2="136" stroke={VIOLET} strokeWidth="2" />
      {/* Líneas */}
      <Line x1="68" y1="56"  x2="116" y2="56"  stroke={TRACK} strokeWidth="3" strokeLinecap="round" />
      <Line x1="68" y1="76"  x2="108" y2="76"  stroke={TRACK} strokeWidth="3" strokeLinecap="round" />
      <Line x1="68" y1="96"  x2="120" y2="96"  stroke={TRACK} strokeWidth="3" strokeLinecap="round" />
      {/* Lápiz */}
      <G transform="rotate(40 116 116)">
        <Rect x="100" y="108" width="40" height="10" rx="2" stroke={AMBER} strokeWidth="3" />
        <Path d="M140 108 L148 113 L140 118 Z" stroke={AMBER} strokeWidth="3" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}

export function EmptyFeed({ size = SIZE }: Props = {}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Tres siluetas en círculo */}
      <G stroke={VIOLET} strokeWidth="3" strokeLinecap="round">
        <Circle cx="50"  cy="58"  r="14" />
        <Circle cx="110" cy="58"  r="14" />
        <Circle cx="80"  cy="116" r="14" />
        <Path d="M28 92 Q50 78 72 92" />
        <Path d="M88 92 Q110 78 132 92" />
        <Path d="M58 142 Q80 132 102 142" />
      </G>
      {/* Punto amber en el centro */}
      <Circle cx="80" cy="80" r="4" fill={AMBER} />
    </Svg>
  );
}

export function EmptyMessages({ size = SIZE }: Props = {}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Burbuja trasera */}
      <Path
        d="M44 38 H100 A16 16 0 0 1 116 54 V86 A16 16 0 0 1 100 102 H68 L52 116 V102 H44 A16 16 0 0 1 28 86 V54 A16 16 0 0 1 44 38 Z"
        stroke={TRACK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Burbuja delantera */}
      <Path
        d="M62 60 H120 A16 16 0 0 1 136 76 V108 A16 16 0 0 1 120 124 H92 L78 138 V124 H62 A16 16 0 0 1 46 108 V76 A16 16 0 0 1 62 60 Z"
        stroke={VIOLET}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Circle cx="78"  cy="92" r="3" fill={AMBER} />
      <Circle cx="92"  cy="92" r="3" fill={AMBER} />
      <Circle cx="106" cy="92" r="3" fill={AMBER} />
    </Svg>
  );
}

export function EmptyGroups({ size = SIZE }: Props = {}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Tres siluetas */}
      <G stroke={VIOLET} strokeWidth="3" strokeLinecap="round">
        <Circle cx="56"  cy="62" r="14" />
        <Path d="M34 96 Q56 80 78 96 V108 H34 Z" />
        <Circle cx="104" cy="62" r="14" />
        <Path d="M82 96 Q104 80 126 96 V108 H82 Z" />
      </G>
      {/* "+" amber abajo */}
      <Circle cx="80" cy="128" r="14" stroke={AMBER} strokeWidth="3" />
      <Line x1="80" y1="120" x2="80" y2="136" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
      <Line x1="72" y1="128" x2="88" y2="128" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function EmptyHistory({ size = SIZE }: Props = {}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      {/* Eje */}
      <Line x1="28" y1="120" x2="132" y2="120" stroke={TRACK} strokeWidth="2" strokeLinecap="round" />
      <Line x1="28" y1="120" x2="28"  y2="36"  stroke={TRACK} strokeWidth="2" strokeLinecap="round" />
      {/* Línea plana */}
      <Polyline
        points="36,108 52,108 68,108 84,108 100,108 116,108"
        stroke={VIOLET}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Punto único amber */}
      <Circle cx="80" cy="108" r="6" fill={AMBER} />
    </Svg>
  );
}

export function ErrorBoundaryArt({ size = SIZE }: Props = {}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <Circle cx="80" cy="80" r="56" stroke={VIOLET} strokeWidth="3" />
      <Path d="M64 56 L96 104 M96 56 L64 104" stroke={AMBER} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}
