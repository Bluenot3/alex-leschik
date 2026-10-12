import { GLSL_HEADER, GLSL_MAIN, LIBRARY, WGSL_ENTRY, WGSL_HEADER, postCode } from "./library";
import { GLSL_BRIDGE, wgslToGlsl } from "./translate";
import type { Program } from "./types";

const GLSL_PRELUDE = "#version 300 es\nprecision highp float;\nprecision highp int;\n" + GLSL_BRIDGE + GLSL_HEADER;

/* Two constants tell a scene which theme it is compiled for, so image
   scenes can print positive on paper as well as on the dark plate. */
function themeConsts(program: Program) {
  return `const THEME_PAPER: f32 = ${program.post === "paper" ? "1.0" : "0.0"};\nconst THEME_CLEAR: f32 = ${program.post === "clear" ? "1.0" : "0.0"};\n`;
}

const newlines = (s: string) => s.split("\n").length - 1;
/* Lines before the scene's own code in each assembled source (incl. the two theme constants). */
const WGSL_BEFORE = newlines(WGSL_HEADER + LIBRARY) + 2;
const GLSL_BEFORE = newlines(GLSL_PRELUDE + LIBRARY) + 2;

/** Full WGSL module for a program (header, library, scene, post, entry points). */
export function wgslModule(program: Program) {
  return WGSL_HEADER + LIBRARY + themeConsts(program) + program.scene.code + postCode(program.post) + WGSL_ENTRY;
}

/** GLSL ES 3.00 fragment source: the same portable WGSL, translated. */
export function glslFragment(program: Program) {
  return GLSL_PRELUDE + wgslToGlsl(LIBRARY + themeConsts(program) + program.scene.code + postCode(program.post)) + GLSL_MAIN;
}

/** Maps an assembled-source line to "scene line N" when it falls in the scene's code. */
export function describeLine(kind: "wgsl" | "glsl", line: number, program: Program) {
  const before = kind === "wgsl" ? WGSL_BEFORE : GLSL_BEFORE;
  const n = line - before;
  const sceneLines = newlines(program.scene.code) + 1;
  if (n >= 1 && n <= sceneLines) return `scene line ${n}`;
  if (n < 1) return `library line ${line}`;
  return `post line ${n - sceneLines + 1}`;
}

/** Rewrites a GLSL info log so its line numbers point into the scene. */
export function readableGlslLog(log: string, program: Program) {
  return log.replace(/(ERROR|WARNING):\s*\d+:(\d+):/g, (_m, level: string, line: string) => `${level}: ${describeLine("glsl", Number(line), program)}:`);
}
