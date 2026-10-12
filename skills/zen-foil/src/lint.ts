import { GLSL_HEADER, LIBRARY, POST_ALPHA, POST_CLEAR, POST_PAPER, POST_PLATE, POST_RAW, WGSL_ENTRY, WGSL_HEADER } from "./library";
import { lintWgsl as lintSyntax, stripComments } from "./translate";

/* Every name the engine already declares around a scene: library functions
   and constants, post passes, bindings, entry points, theme constants. */
const TAKEN = (() => {
  const src = stripComments([WGSL_HEADER, GLSL_HEADER, LIBRARY, POST_PLATE, POST_PAPER, POST_CLEAR, POST_RAW, POST_ALPHA, WGSL_ENTRY].join("\n"));
  const names = new Set<string>(["THEME_PAPER", "THEME_CLEAR", "u", "atlasTex", "atlasSmp", "imgTex", "imgSmp"]);
  for (const m of src.matchAll(/\bfn\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/\bconst\s+(\w+)\s*:/g)) names.add(m[1]);
  names.delete("scene");
  return names;
})();

/**
 * Static checks for a scene's WGSL: translator compatibility, reserved and
 * builtin names, float %, ternaries, smoothstep — and any function or
 * module constant that would redeclare a library name (WGSL rejects that
 * even where GLSL would quietly overload it).
 */
export function lintWgsl(code: string, label = "scene"): string[] {
  const problems = lintSyntax(code, label);
  const body = stripComments(code);
  const clashes = new Set<string>();
  for (const m of body.matchAll(/\bfn\s+(\w+)\s*\(/g)) if (TAKEN.has(m[1])) clashes.add(m[1]);
  // Module-scope consts only (function-local lets may shadow freely).
  for (const m of body.matchAll(/^const\s+(\w+)\s*:/gm)) if (TAKEN.has(m[1])) clashes.add(m[1]);
  if (clashes.size) problems.push(`${label}: redeclares library names: ${[...clashes].join(", ")} — rename yours`);
  return problems;
}

/** Names a scene must not redeclare. */
export function libraryNames() {
  return [...TAKEN].sort();
}
