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
  count: number;
  pointSize: number;
  accentStride: number;
  accentScale: number;
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
  minStep: number;
  maxStep: number;
  stepDivisor: number;
  maxParticles: number;
  pointSize: number;
  accentStride: number;
  accentScale: number;
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
  minStep: 3,
  maxStep: 5,
  stepDivisor: 34,
  maxParticles: 9000,
  pointSize: 3.5,
  accentStride: 7,
  accentScale: 1.6,
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
  minStep: 4,
  maxStep: 6,
  stepDivisor: 24,
  maxParticles: 2400,
  pointSize: 1.9,
  accentStride: 0,
  accentScale: 1,
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
      if (imageData.data[(py * width + px) * 4 + 3] > 48) {
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
  const step = Math.min(
    style.maxStep,
    Math.max(style.minStep, Math.floor(fontSize / style.stepDivisor))
  );

  const rawPoints: { hx: number; hy: number }[] = [];

  words.forEach((line, lineIndex) => {
    const chars = line.split("");
    const totalWidth = chars.length * letterSpacing;
    const startX = (roundedWidth - totalWidth) / 2;
    const lineY = startY + lineIndex * lineGap;

    chars.forEach((char, charIndex) => {
      const centerX = startX + charIndex * letterSpacing + letterSpacing * 0.5;
      const glyphPoints = sampleGlyph(char, fontSize, step);

      for (let pointIndex = 0; pointIndex < glyphPoints.length; pointIndex += 1) {
        rawPoints.push({
          hx: centerX + glyphPoints[pointIndex].x,
          hy: lineY + glyphPoints[pointIndex].y,
        });
      }
    });
  });

  let selected = rawPoints;
  if (selected.length > style.maxParticles) {
    const stride = Math.ceil(selected.length / style.maxParticles);
    selected = selected.filter((_, pointIndex) => pointIndex % stride === 0);
  }

  const count = selected.length;
  const homeX = new Float32Array(count);
  const homeY = new Float32Array(count);

  for (let pointIndex = 0; pointIndex < count; pointIndex += 1) {
    homeX[pointIndex] = selected[pointIndex].hx;
    homeY[pointIndex] = selected[pointIndex].hy;
  }

  const template: ParticleTemplate = {
    homeX,
    homeY,
    count,
    pointSize: style.pointSize,
    accentStride: style.accentStride,
    accentScale: style.accentScale,
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