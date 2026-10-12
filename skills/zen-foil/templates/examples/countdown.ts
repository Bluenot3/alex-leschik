/**
 * Worked example from reference/authoring.md: a behavior writes the time
 * left into u.p0 every frame; the shader engraves the digits.
 *   <zen-foil scene="countdown" target="2027-01-01T00:00:00Z" label="LAUNCH IN"></zen-foil>
 */
import { defineScene } from "zen-foil";

export default defineScene({
  id: "countdown",
  title: "Countdown",
  description: "Days, hours and minutes to a date, engraved, with a seal that ticks every second.",
  aspect: 2.4,
  accent: "#fbbf24",
  still: 3,
  params: {
    target: { type: "url", default: "2027-01-01T00:00:00Z", description: "ISO date to count down to." },
    label: { type: "text", slot: 0, default: "AI PIONEER PROGRAM · YEAR 4 BEGINS IN", description: "Line above the digits." },
    mark: { type: "mark", num: 0, default: "zen", description: "Seal mark." },
  },
  behavior(ctx) {
    return {
      frame(u) {
        const ms = Math.max(0, Date.parse(ctx.params().target) - Date.now());
        u[20] = Math.floor(ms / 86400000);
        u[21] = Math.floor(ms / 3600000) % 24;
        u[22] = Math.floor(ms / 60000) % 60;
        u[23] = Math.floor(ms / 1000) % 60;
      },
    };
  },
  code: /* wgsl */ `
fn scene(uv: vec2f, p: vec2f) -> vec3f {
  let A: f32 = aspect();
  let size: f32 = min(0.3, A / 14.0);
  let x0: f32 = -size * 0.6 * 5.5;
  var digits: f32 = 0.0;
  digits += numberCov(p, vec2f(x0, size * 0.5), size, i32(u.p0.x), 3, 0.3);
  digits += numberCov(p, vec2f(x0 + size * 0.6 * 4.0, size * 0.5), size, i32(u.p0.y), 2, 0.3);
  digits += numberCov(p, vec2f(x0 + size * 0.6 * 7.0, size * 0.5), size, i32(u.p0.z), 2, 0.3);
  let tick: f32 = exp(-fract(tnow()) * 5.0);
  let label: f32 = textCenterP(p, vec2f(0.0, size * 0.5 + 0.07), 0.024, 0, 0.0);
  let seal: vec2f = brandSeal(p, vec2f(A * 0.5 - 0.2, 0.0), 0.12, i32(numParam(0)));
  let ring: f32 = lineCov(abs(length(p - vec2f(A * 0.5 - 0.2, 0.0)) - 0.12 - tick * 0.05) / pxs(), 0.6) * tick;
  let ink: vec3f = inkCol(p, 1.4);
  return mix(silver(), holo(foilPhase(p, 1.5)), 0.35) * digits + silver() * label * 0.8
       + mix(silver(), ink, 0.5) * seal.x + u.accent.rgb * (seal.y + ring * 0.6)
       + ink * engrave(p.y + 0.01 * sin(p.x * 9.0), 0.01, 0.08) * 0.15;
}
`,
});
