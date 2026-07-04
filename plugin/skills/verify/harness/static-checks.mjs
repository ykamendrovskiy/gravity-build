// static-checks.mjs — source-pattern lane (pre-render). Catches logic/idiom/API classes
// that no DOM snapshot sees. High-precision by design: patterns are narrow, deps-gated.
import fs from 'fs';
import path from 'path';

const PATTERNS = [
  { id: 'R15', sev: 'high', re: /view=\{[^}]*\bi\s*<\s*step\b/,
    msg: 'Stepper: completion tied to current step index (i<step) — track completion in state, add id/onUpdate.' },
  { id: 'R13', sev: 'medium', re: /image=\{[\s\S]{0,120}?<Icon\b[\s\S]{0,120}?size=\{\s*(6[4-9]|[7-9]\d|\d{3,})\s*\}/,
    msg: 'Large <Icon> used as PlaceholderContainer image — use an @gravity-ui/illustrations illustration.' },
  { id: 'R12', sev: 'high', re: /\balert\(|window\.confirm\(/,
    msg: 'Raw alert()/confirm() — destructive confirm = ConfirmDialog, action feedback = toast.' },
  { id: 'R5', sev: 'high', re: /getActionsColumn<[^>]*>\s*\(\s*\{/,
    msg: 'getActionsColumn signature is (columnId, {getRowActions}) — two args.' },
  { id: 'R7', sev: 'high', dep: '@gravity-ui/table', re: /<Table\b[^>]*\b(width|stickyHeader)=/,
    msg: '@gravity-ui/table Table has no width/stickyHeader prop (that is uikit DataTable) — use attributes/style.' },
];

function walk(dir) {
  let out = [], ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.') || e.name.startsWith('_')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

export function runStatic(projectDir) {
  let deps = {};
  try { const pj = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')); deps = { ...pj.dependencies, ...pj.devDependencies }; } catch {}
  const findings = [];
  for (const f of walk(projectDir)) {
    if (!/\.(tsx?|jsx?)$/.test(f)) continue;
    const txt = fs.readFileSync(f, 'utf8');
    const rel = path.relative(projectDir, f);
    for (const p of PATTERNS) {
      if (p.dep && !deps[p.dep]) continue;
      const m = txt.match(p.re);
      if (m) {
        const line = txt.slice(0, m.index).split('\n').length;
        findings.push({ id: p.id, sev: p.sev, file: rel, line, msg: p.msg, snippet: m[0].replace(/\s+/g, ' ').slice(0, 70) });
      }
    }
    // page-constructor `quote` is image-first — used without `image:` reserves an empty image column
    // (big white gap + cramped text). Layout-critical though not a required TS prop, so tsc stays green.
    if (deps['@gravity-ui/page-constructor']) {
      const re = /type:\s*['"]quote['"]/g;
      let qm;
      while ((qm = re.exec(txt))) {
        const after = txt.slice(qm.index, qm.index + 800);
        const nt = after.slice(20).search(/type:\s*['"]/);
        const block = nt >= 0 ? after.slice(0, nt + 20) : after;
        if (!/\bimage\s*:/.test(block)) {
          const line = txt.slice(0, qm.index).split('\n').length;
          findings.push({ id: 'QUOTE-SLOT', sev: 'medium', file: rel, line, msg: 'page-constructor quote is image-first — provide image (avatar) + logo, or use a text-first sub-block for imageless testimonials.', snippet: "type:'quote' without image" });
        }
      }
    }
  }
  return findings;
}
