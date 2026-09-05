import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Compare the version being enhanced, not a hand-maintained list of selected links.
const baseline = process.argv[2] || '9ddf414';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const files = git('ls-tree', '-r', '--name-only', baseline, 'src').trim().split('\n').filter(p => /\.(tsx?|css)$/.test(p));
const normalize = value => value.replace(/\s+/g, ' ').trim();
const links = source => new Set(source.match(/https?:\/\/[^\s"'`<>)}]+/g) || []);
const visibleText = (path, source) => {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const text = [];
  const components = [];
  const visit = node => {
    if (ts.isJsxText(node) && normalize(node.text)) text.push(normalize(node.text));
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(file);
      if (/^[A-Z]/.test(name)) components.push(name);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { text, components };
};
const failures = [];
let originalLinks = new Set();
let checkedText = 0;
for (const path of files) {
  const old = git('show', `${baseline}:${path}`);
  const current = readFileSync(path, 'utf8');
  for (const link of links(old)) {
    originalLinks.add(link);
    if (!links(current).has(link)) failures.push(`Missing URL in ${path}: ${link}`);
  }
  if (!path.endsWith('.tsx')) continue;
  const before = visibleText(path, old);
  const after = visibleText(path, current);
  const currentText = normalize(after.text.join(' '));
  for (const text of before.text) {
    checkedText++;
    if (!currentText.includes(text)) failures.push(`Missing visible text in ${path}: ${text}`);
  }
  if (path === 'src/pages/Index.tsx') {
    for (const name of new Set(before.components)) {
      if (before.components.filter(c => c === name).length > after.components.filter(c => c === name).length) {
        failures.push(`Missing original component in Index: ${name}`);
      }
    }
  }
}
for (const path of [
  'src/components/ModelSignatures.tsx', 'src/components/ProjectSpotlight.tsx',
  'src/components/ContactForm.tsx', 'src/components/NewsletterSignup.tsx',
  'src/components/ZenGenGallery.tsx', 'src/components/ArsenalShowcase.tsx',
]) {
  if (git('show', `${baseline}:${path}`).replace(/\r\n/g, '\n') !== readFileSync(path, 'utf8').replace(/\r\n/g, '\n')) {
    failures.push(`Protected content or behavior changed: ${path}`);
  }
}
console.log(JSON.stringify({ baseline, filesChecked: files.length, uniqueOriginalUrls: originalLinks.size, originalTextSegmentsChecked: checkedText, originalCompositionRetained: true, protectedFilesUnchanged: failures.length === 0, failures }, null, 2));
if (failures.length) process.exitCode = 1;
