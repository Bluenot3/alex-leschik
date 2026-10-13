#!/usr/bin/env node
/**
 * Pins every CDN URL in the skill to one pushed commit, so agents copying
 * from any doc, template or the manifest load the same, existing build:
 *
 *   node scripts/pin.mjs <commit>     then: node scripts/gen-docs.mjs
 *
 * Writes release.json and rewrites ".../alex-leschik@<anything>/skills/zen-foil/dist/"
 * in SKILL.md, README.md, AGENTS.md and reference/ and templates/. It warns
 * when the commit's dist/zen-foil.js differs from this tree's build or the
 * commit isn't on a remote branch yet (jsDelivr would 404 until it is).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...a) => execFileSync("git", a, { cwd: root, maxBuffer: 1 << 26 });
const ref = process.argv[2];
if (!ref) {
  console.error("usage: node scripts/pin.mjs <commit>");
  process.exit(2);
}
const sha = git("rev-parse", `${ref}^{commit}`).toString().trim();
const release = JSON.parse(readFileSync(join(root, "release.json"), "utf8"));
const top = git("rev-parse", "--show-toplevel").toString().trim();
const rel = relative(top, join(root, "dist", "zen-foil.js")).split(sep).join("/");
try {
  if (!git("show", `${sha}:${rel}`).equals(readFileSync(join(root, "dist", "zen-foil.js"))))
    console.warn(`warning: dist/zen-foil.js at ${sha.slice(0, 7)} differs from this tree's build. Commit the build first, then pin that commit.`);
} catch {
  console.warn(`warning: ${sha.slice(0, 7)} has no ${rel}.`);
}
try {
  if (!git("branch", "-r", "--contains", sha).toString().trim()) console.warn(`warning: ${sha.slice(0, 7)} isn't on a remote branch yet. Push it before anyone loads the CDN URL.`);
} catch {
  /* no remotes */
}
const base = `https://cdn.jsdelivr.net/gh/${release.repo}@${sha}/skills/zen-foil/dist/`;
writeFileSync(join(root, "release.json"), JSON.stringify({ ...release, commit: sha, cdn: `${base}zen-foil.js`, showcase: `${base}zen-foil-showcase.js` }, null, 2) + "\n");

const files = ["SKILL.md", "README.md", "AGENTS.md"];
const walk = (d) => readdirSync(join(root, d)).flatMap((n) => (statSync(join(root, d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
files.push(...walk("reference"), ...walk("templates"));
const re = /cdn\.jsdelivr\.net\/gh\/[\w.-]+\/[\w.-]+@[^/\s"'`]+\/skills\/zen-foil\/dist\//g;
let changed = 0;
for (const f of files) {
  const p = join(root, f);
  const s = readFileSync(p, "utf8");
  const t = s.replace(re, base.replace("https://", ""));
  if (t !== s) {
    writeFileSync(p, t);
    changed++;
  }
}
console.log(`pinned to ${sha.slice(0, 7)}: release.json + ${changed} file${changed === 1 ? "" : "s"}. Now run node scripts/gen-docs.mjs.`);
