export const WORD_SETS: string[][] = [
  ["ALEXANDER", "LESCHIK"],
  ["DESIGNER"],
  ["DEVELOPER"],
  ["VISIONARY"],
  ["AZ1"],
];

export interface ParticleTemplate {
  homeX: Float32Array;
  homeY: Float32Array;
  type: Uint8Array;       // 0 = base fill, 1 = grid accent node, 2 = shimmer star
  count: number;
  pointSize: number;      // base particle diameter in CSS px
  gridPointSize: number;  // accent node diameter in CSS px
  shimmerSize: number;    // shimmer star core diameter in CSS px
  introSpread: number;
  isHero: boolean;
}

interface WordStyle {
  widthFill: number;
  heightFill: number;
  letterSpacing: number;
  lineHeight: number;
  minFontSize: number;
  maxFontSize: number;
  step: number;           // fixed sampling step in px (2 = ultra-fine)
  maxParticles: number;
  pointSize: number;
  gridPointSize: number;
  shimmerSize: number;    // shimmer star core diameter in CSS px
  gridSpacing: number;    // accent grid spacing in canvas px
  shimmerSpacing: number; // shimmer star grid spacing (sparser)
  introSpread: number;
  verticalBias: number;
}

const HERO_STYLE: WordStyle = {
  widthFill: 0.93,
  heightFill: 0.88,
  letterSpacing: 0.55,
  lineHeight: 1.04,
  minFontSize: 48,
  maxFontSize: 220,
  step: 2,            // 2px grid — ultra-fine, crisp sampling
  maxParticles: 22000, // more particles = darker, denser letterforms
  pointSize: 1.3,     // slightly thicker base — more solid, prominent name
  gridPointSize: 2.5, // larger accent nodes — more visible sub-pattern
  shimmerSize: 4.5,   // shimmer star core
  gridSpacing: 8,     // accent node every 8 canvas px
  shimmerSpacing: 24, // shimmer star every 24 canvas px
  introSpread: 24,
  verticalBias: -0.04,
};

const DEFAULT_STYLE: WordStyle = {
  widthFill: 0.9,
  heightFill: 0.76,
  letterSpacing: 0.62,
  lineHeight: 1.08,
  minFontSize: 62,
  maxFontSize: 148,
  step: 4,
  maxParticles: 2400,
  pointSize: 1.8,
  gridPointSize: 0,
  shimmerSize: 0,
  gridSpacing: 0,
  shimmerSpacing: 0,
  introSpread: 82,
  verticalBias: 0,
};

const glyphCache = new Map<string, { x: number; y: number }[]>();
const layoutCache = new Map<string, ParticleTemplate>();

function sampleGlyph(char: string, fontSize: number, step: number): { x: number; y: number }[] {
  if (char === " ") return [];

  const roundedSize = Math.round(fontSize);
  const key = `${char}_${roundedSize}_${step}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return [];

  context.font = `900 ${roundedSize}px "Bebas Neue", Impact, sans-serif`;

  const width = Math.ceil(
    Math.max(roundedSize * 1.22, context.measureText(char).width + roundedSize * 0.35)
  );
  const height = Math.ceil(roundedSize * 1.36);

  canvas.width = width;
  canvas.height = height;

  context.font = `900 ${roundedSize}px "Bebas Neue", Impact, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#000";
  context.fillText(char, width / 2, height / 2 + roundedSize * 0.035);

  const imageData = context.getImageData(0, 0, width, height);
  const points: { x: number; y: number }[] = [];

  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      if (imageData.data[(py * width + px) * 4 + 3] > 40) {
        points.push({ x: px - width / 2, y: py - height / 2 });
      }
    }
  }

  glyphCache.set(key, points);
  return points;
}

function getWordStyle(index: number) {
  return index === 0 ? HERO_STYLE : DEFAULT_STYLE;
}

export function getParticleTemplate(index: number, width: number, height: number): ParticleTemplate {
  const roundedWidth = Math.max(1, Math.round(width));
  const roundedHeight = Math.max(1, Math.round(height));
  const cacheKey = `${index}_${roundedWidth}_${roundedHeight}`;
  const cached = layoutCache.get(cacheKey);
  if (cached) return cached;

  const words = WORD_SETS[index];
  const style = getWordStyle(index);
  const widestLine = Math.max(...words.map((line) => line.length));

  const widthFont = (roundedWidth * style.widthFill) / Math.max(widestLine * style.letterSpacing, 1);
  const heightFont =
    (roundedHeight * style.heightFill) /
    Math.max(1 + (words.length - 1) * style.lineHeight, 1);

  const fontSize = Math.round(
    Math.max(style.minFontSize, Math.min(widthFont, heightFont, style.maxFontSize))
  );
  const letterSpacing = fontSize * style.letterSpacing;
  const lineGap = fontSize * style.lineHeight;
  const totalTextHeight = fontSize + (words.length - 1) * lineGap;
  const startY =
    (roundedHeight - totalTextHeight) / 2 +
    fontSize * 0.56 +
    roundedHeight * style.verticalBias;

  const rawPoints: { hx: number; hy: number }[] = [];

  words.forEach((line, lineIndex) => {
    const chars = line.split("");
    const totalWidth = chars.length * letterSpacing;
    const startX = (roundedWidth - totalWidth) / 2;
    const lineY = startY + lineIndex * lineGap;

    chars.forEach((char, charIndex) => {
      const centerX = startX + charIndex * letterSpacing + letterSpacing * 0.5;
      const glyphPoints = sampleGlyph(char, fontSize, style.step);

      for (let pi = 0; pi < glyphPoints.length; pi++) {
        rawPoints.push({
          hx: centerX + glyphPoints[pi].x,
          hy: lineY + glyphPoints[pi].y,
        });
      }
    });
  });

  // Downsample if over the cap
  let selected = rawPoints;
  if (selected.length > style.maxParticles) {
    const stride = Math.ceil(selected.length / style.maxParticles);
    selected = selected.filter((_, i) => i % stride === 0);
  }

  const count = selected.length;
  const homeX = new Float32Array(count);
  const homeY = new Float32Array(count);
  const type = new Uint8Array(count);

  const gs  = style.gridSpacing;
  const gs2 = style.shimmerSpacing;

  for (let i = 0; i < count; i++) {
    homeX[i] = selected[i].hx;
    homeY[i] = selected[i].hy;

    // Mark particles near a gs×gs grid intersection as accent nodes (type=1)
    if (gs > 0) {
      const rx = ((Math.round(selected[i].hx) % gs) + gs) % gs;
      const ry = ((Math.round(selected[i].hy) % gs) + gs) % gs;
      type[i] = (rx < 2 && ry < 2) ? 1 : 0;
    }

    // Upgrade to type=2 shimmer star at sparser gs2 grid intersections
    // These override type=0 and type=1 — they're the rarest, brightest particles
    if (gs2 > 0) {
      const rx2 = ((Math.round(selected[i].hx) % gs2) + gs2) % gs2;
      const ry2 = ((Math.round(selected[i].hy) % gs2) + gs2) % gs2;
      if (rx2 < 2 && ry2 < 2) type[i] = 2;
    }
  }

  const template: ParticleTemplate = {
    homeX,
    homeY,
    type,
    count,
    pointSize: style.pointSize,
    gridPointSize: style.gridPointSize,
    shimmerSize: style.shimmerSize,
    introSpread: style.introSpread,
    isHero: index === 0,
  };

  layoutCache.set(cacheKey, template);
  return template;
}

export function prewarmParticleTemplates(width: number, height: number) {
  for (let index = 1; index < WORD_SETS.length; index += 1) {
    getParticleTemplate(index, width, height);
  }
}

export function clearParticleCaches() {
  glyphCache.clear();
  layoutCache.clear();
}
