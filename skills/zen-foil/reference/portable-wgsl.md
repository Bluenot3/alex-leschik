# Portable WGSL

Scenes are written once, in a small subset of WGSL. WebGPU compiles that WGSL natively. For WebGL2, a mechanical translator (`translate.ts`) rewrites it to GLSL ES 3.00. The rules below keep both paths identical. `scripts/check.mjs` and `lintWgsl()` enforce most of them, and `scripts/preview.mjs --validate` compiles on both backends for the rest.

## The rules

| Rule | Write | Not |
|---|---|---|
| Type every declaration | `let r: f32 = length(d);` | `let r = length(d);` |
| Float literals have a dot | `x * 2.0`, `vec3f(1.0, 0.5, 0.0)` | `x * 2`, `let k: f32 = 1;` |
| One-line `fn` signatures | `fn ring(p: vec2f, r: f32) -> f32 {` | parameters split over lines |
| Declare before use | helper fns above `scene()` | calling a fn defined later |
| No ternary | `select(falseValue, trueValue, cond)` | `cond ? a : b` |
| No `smoothstep` | `sstep(a, b, x)` (defined for `a > b`) | `smoothstep(…)` |
| No float `%` | `modF(x, y)` (ints may use `%`) | `x % 2.0` |
| No reserved names | `tone`, `edge0`, `dist` | `filter`, `input`, `output`, `active`, `target`, `sample`, `flat`, `smooth`, `texture`, `u` |
| No redeclared library names | `fn myRing(…)` | `fn rosette(…)` |
| Derivatives in uniform control flow | `let e: f32 = engrave(c, s, t);` then `select(…)` | `if (inside) { e = engrave(…); }` |
| No `discard` | return black or transparent | `discard;` |

Typed `var x: T;` without an initializer is fine. Loops look like `for (var i: i32 = 0; i < 8; i++)`. For a dynamic count, keep the bound constant and put `if (i < n)` inside.

## Why each rule exists

- **The translator is regex-based.** It maps `fn name(a: T) -> R {` to `R name(T a) {`, and `let x: T =` to `T x =`. That only works when signatures are on one line and every declaration names its type.
- **GLSL ES has no implicit int→float conversion.** `2` where a float is expected fails on WebGL2 but passes on WebGPU. That is the most common one-backend bug.
- **`smoothstep(a, b, x)` with `a > b` is undefined in GLSL and Metal.** Some GPUs return garbage. `sstep` is defined both ways, so `sstep(front + 0.05, front - 0.05, x)` is a safe falling edge.
- **`%` on negative floats differs between WGSL** (truncated) **and GLSL `mod`** (floored).
- **WGSL rejects a second `fn` with an existing name.** GLSL silently overloads it, so a clash compiles on WebGL2 and fails on WebGPU.
- **`fwidth`, `dpdx` and `dpdy` (and anything that calls them, like `engrave`) need uniform control flow.** Inside a branch that varies per pixel they are undefined on some drivers.

## Bridged spellings

The GLSL prelude `#define`s the following, so write the WGSL form:
- `f32`, `i32`, `u32`;
- `vec2f`, `vec3f`, `vec4f`, `vec2i`, `vec3i`, `vec2u`;
- `mat2x2f`, `mat3x3f`;
- `atan2(y, x)`, `inverseSqrt`, `saturate`, `select`, `textureSampleLevel`, `dpdx`, `dpdy`.

Also:
- Integer bit ops (`>>`, `&`, `^`) and `u` suffixes (`3u`) work on both backends.
- Arrays of structs are not bridged. Use the data block (`u.d`, `dPt`, `dF`) instead.
- Bool logic with `&&` and `||` is fine. Wrap comparisons in parentheses when you mix them.

## Reading compile errors

Errors print with the scene's own line numbers:

```
[zen-foil] scene "my-scene" failed to compile
WebGPU: scene line 42:17 unresolved value 'tone2'
WebGL2: ERROR: scene line 42: 'tone2' : undeclared identifier
```

| Message | Usual cause |
|---|---|
| `Untyped declaration near "let x ="` | Add `: f32` (or the right type). |
| `Unrecognised fn signature` | The signature spans lines, or a parameter has no type. |
| `cannot convert value of type 'abstract-int' to 'f32'` / `'*' : wrong operand types` | An integer literal in float math. Add `.0`. |
| `redeclaration of 'x'` (WebGPU only) | Your fn or const clashes with a library name. Rename it. |
| `unresolved call target` / `no matching overloaded function found` | A helper is defined after its use, or a parameter type mismatches (`i32` vs `f32`). Cast with `f32(i)` / `i32(x)`. |
| A blank or black plate with no error | NaN from `sqrt` or `log` of a negative, or division by zero. Clamp with `max(x, 1e-5)`. |
