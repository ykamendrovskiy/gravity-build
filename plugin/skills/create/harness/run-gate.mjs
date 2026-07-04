// run-gate.mjs — headless gate runner.
//   node run-gate.mjs <url> <projectDir> [outDir]          — полный гейт (нужен playwright)
//   node run-gate.mjs --static-only <projectDir> [outDir]  — только static-линия (чистый Node)
// Lanes: static (source grep) + eval (DOM invariants, width-independent) +
//        layout sweep (per breakpoint ±1) + full-height screenshot (vision/owner).
// Scenario walk: if <projectDir>/scenarios.manifest.json exists (self-describing build,
// see registry scaffold-app-shell «Сценарии состояний»), the eval lane + capture run PER
// scenario (?<param>=<id>); layout sweep + static run once (default scenario / source).
// NB: the served build must have the scenario switch alive — `VITE_SCENARIOS=1 npm run build`
// (plain build tree-shakes the dev-gated switch → every scenario would be a noop).
// Graceful degradation: playwright недоступен → автоматический static-only (честный partial-вердикт
// с mode='static-only', НЕ фейк-грин: browser-линии помечены как пропущенные).
// Emits <outDir>/verdict.json and a console summary.
import { runStatic } from './static-checks.mjs';
import { gateDom, gateLayout } from './gate.mjs';
import fs from 'fs';
import path from 'path';

const staticOnlyFlag = process.argv[2] === '--static-only';
const url = staticOnlyFlag ? null : process.argv[2];
const projectDir = staticOnlyFlag ? process.argv[3] : process.argv[3];
const outDir = (staticOnlyFlag ? process.argv[4] : process.argv[4]) || '.';
if (!url && !staticOnlyFlag) { console.error('usage: node run-gate.mjs <url|--static-only> <projectDir> [outDir]'); process.exit(2); }

let chromium = null;
if (!staticOnlyFlag) {
  // резолвим playwright СНАЧАЛА от проверяемого проекта (харнес может лежать в плагине без своих node_modules)
  try {
    const { createRequire } = await import('module');
    const req = createRequire(path.join(path.resolve(projectDir || '.'), 'package.json'));
    ({ chromium } = req('playwright'));
  } catch {}
  if (!chromium) { try { ({ chromium } = await import('playwright')); } catch {} }
  if (!chromium) console.error('⚠ playwright недоступен → деградация в static-only (полная проверка: npm i -D playwright && npx playwright install chromium)');
}

// --- static-only режим (без браузера): static-линия + санити манифеста, честный partial-вердикт ---
if (staticOnlyFlag || !chromium) {
  if (!projectDir) { console.error('static-only: нужен <projectDir>'); process.exit(2); }
  fs.mkdirSync(outDir, { recursive: true });
  const staticF = runStatic(projectDir);
  let declared = null, manifestError = null;
  const mp = path.join(projectDir, 'scenarios.manifest.json');
  if (fs.existsSync(mp)) {
    try { const m = JSON.parse(fs.readFileSync(mp, 'utf8')); declared = m.scenarios || null; }
    catch (e) { manifestError = String(e && e.message || e); }
  }
  const verdict = {
    generated: 'run-gate.mjs', mode: 'static-only',
    reason: staticOnlyFlag ? 'флаг --static-only' : 'playwright недоступен',
    browser_lanes: 'SKIPPED (contrast/broken-img/overflow/сценарии НЕ проверены — это не «чисто», это «не смотрели»)',
    summary: { static_findings: staticF.length, manifest_declared: declared ? declared.length : 0 },
    static: staticF, manifest: declared ? { declared } : null, manifest_error: manifestError,
  };
  fs.writeFileSync(`${outDir}/verdict.json`, JSON.stringify(verdict, null, 2));
  console.log('SUMMARY(static-only)', JSON.stringify(verdict.summary));
  if (staticF.length) console.log('  static:', staticF.map((f) => `${f.id}@${f.file}:${f.line}`).join(', '));
  if (manifestError) console.log('  ⚠ manifest:', manifestError);
  console.log('  ⚠ browser-линии пропущены — вердикт ЧАСТИЧНЫЙ.');
  console.log('verdict →', `${outDir}/verdict.json`);
  process.exit(0);
}

const REF_W = 1280;
// page-constructor breakpoints (577/769/1081/1185/1400) straddled ±1, plus anchors
const SWEEP = [1440, 1400, 1399, 1280, 1185, 1184, 1081, 1080, 769, 768, 577, 576, 375];

// --- scenarios.manifest.json (absent → single anonymous scenario = legacy behavior) ---
function readManifest(dir) {
  const none = { param: null, def: null, ids: [null], declared: null, error: null };
  if (!dir) return none;
  const p = path.join(dir, 'scenarios.manifest.json');
  if (!fs.existsSync(p)) return none;
  try {
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(m.scenarios) || !m.scenarios.length) throw new Error('scenarios[] пуст');
    const param = m.param || 'scenario';
    const def = m.default && m.scenarios.includes(m.default) ? m.default : m.scenarios[0];
    return { param, def, ids: [def, ...m.scenarios.filter((s) => s !== def)], declared: m.scenarios, error: null };
  } catch (e) {
    // malformed manifest = finding, not a silent skip (silent truncation reads as "covered")
    return { ...none, error: 'scenarios.manifest.json: ' + String(e && e.message || e) };
  }
}

function urlFor(base, param, id) {
  if (!id || !param) return base;
  const u = new URL(base);
  u.searchParams.set(param, id);
  return u.toString();
}

const manifest = readManifest(projectDir);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 160)));

// width-independent DOM checks at a TALL viewport so every element is in-viewport →
// elementsFromPoint (contrast bg-resolver) works for below-fold content too.
async function auditScenario(id) {
  const target = urlFor(url, manifest.param, id);
  consoleErrors.length = 0;
  let gotoFailed = false;
  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: 20000 });
  } catch {
    // hung request (e.g. frozen loading scenario over real fetch) — settle for DOM + grace
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch { gotoFailed = true; }
    await page.waitForTimeout(800);
  }
  await page.setViewportSize({ width: REF_W, height: 900 });
  await page.waitForTimeout(150);
  // reveal-pass: page-constructor/framer запускают reveal-анимации на входе блока в вьюпорт.
  // Пройди страницу как живой пользователь (wheel сверху вниз), дай анимациям отработать —
  // иначе аудит/захват застают блоки на opacity≈0..0.5: призраки в скриншоте, а visible()-фильтр
  // ИСКЛЮЧАЕТ их из контраст-проверки (немой fake-clean). Обход дешёвый (~0.5с/страница).
  const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < scrollH; y += 600) { await page.mouse.wheel(0, 600); await page.waitForTimeout(80); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(450);
  const domH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: REF_W, height: Math.min(Math.max(domH, 900), 8000) });
  await page.waitForTimeout(200);
  const dom = await page.evaluate(gateDom);
  // body signature → noop detection (declared scenario that changes nothing)
  const bodySig = await page.evaluate(() => {
    const s = document.body ? document.body.innerHTML : '';
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16) + ':' + s.length;
  });
  const shot = id ? `${outDir}/full-${id}.png` : `${outDir}/full.png`;
  await page.screenshot({ path: shot, fullPage: true });
  // dead server / blank document → the audit is VOID, not "clean" (silent fake-green is the enemy)
  const unreachable = gotoFailed || parseInt(bodySig.split(':')[1], 10) === 0;
  return { id, dom, bodySig, unreachable, consoleErrors: consoleErrors.slice(), screenshot: shot };
}

function summaryOf(dom, errs) {
  return {
    contrast_invisible: dom.contrast.filter((c) => c.severity === 'invisible').length,
    contrast_poor: dom.contrast.filter((c) => c.severity === 'poor').length,
    broken_images: dom.brokenImages.length,
    control_row_mismatch: dom.controlRowMismatch.length,
    object_object: dom.objectObject.length,
    button_icon_leak: dom.buttonIconLeak.length,
    zero_fill_svg: dom.zeroFillSvg.length,
    empty_slots: dom.emptySlot.length,
    table_underfill: (dom.tableUnderfill || []).length,
    console_errors: errs.length,
  };
}

// прогрев: первый рендер на свежеподнятом сервере бывает mid-render → ложный noop/двойной DOM
// (флейк пойман selfcheck-01: bodySig ~19k вместо ~9.9k сразу после старта preview). Один
// прогревочный заход + settle до всех аудитов.
try { await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }); await page.waitForTimeout(400); } catch {}

// eval lane + capture per scenario (default first — it anchors noop detection + layout sweep)
const audits = [];
for (const id of manifest.ids) audits.push(await auditScenario(id));
const def = audits[0];

// FATAL: default scenario unreachable/blank → no valid verdict at all. Exit loudly (code 3),
// never emit an all-zero "clean" verdict for a dead page.
if (def.unreachable) {
  await browser.close();
  fs.writeFileSync(`${outDir}/verdict.json`, JSON.stringify({ url, fatal: 'page_unreachable_or_blank', bodySig: def.bodySig }, null, 2));
  console.error(`FATAL: ${url} недостижим или отдал пустой документ (bodySig ${def.bodySig}) — вердикт НЕ валиден. Проверь сервер.`);
  process.exit(3);
}
const unreachableScenarios = audits.slice(1).filter((a) => a.unreachable).map((a) => a.id);

const scenarioNoop = audits.slice(1).filter((a) => a.bodySig === def.bodySig).map((a) => a.id);

// layout sweep across breakpoints — width-dependent lane, default scenario only
await page.goto(urlFor(url, manifest.param, def.id), { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
const sweep = [];
for (const w of SWEEP) {
  await page.setViewportSize({ width: w, height: 3400 });
  await page.waitForTimeout(60);
  sweep.push(await page.evaluate(gateLayout));
}
await browser.close();

const staticF = projectDir ? runStatic(projectDir) : [];
const overflowWidths = sweep.filter((s) => s.overflowPx > 1).map((s) => s.width);
const minPriceW = Math.min(...sweep.map((s) => (s.price ? s.price.minW : Infinity)));

const verdict = {
  url, ref_width: REF_W, generated: 'run-gate.mjs',
  manifest: manifest.declared ? { param: manifest.param, default: manifest.def, declared: manifest.declared } : null,
  manifest_error: manifest.error,
  summary: {
    ...summaryOf(def.dom, def.consoleErrors),
    static_findings: staticF.length,
    overflow_widths: overflowWidths.length,
    min_price_card_px: Number.isFinite(minPriceW) ? minPriceW : null,
    scenarios_audited: audits.length,
    scenario_noop: scenarioNoop,
    scenario_unreachable: unreachableScenarios,
  },
  // top-level dom/consoleErrors/screenshot = default scenario (backward-compatible shape)
  dom: def.dom, sweep, overflowWidths, static: staticF, consoleErrors: def.consoleErrors, screenshot: def.screenshot,
  scenarios: Object.fromEntries(audits.map((a) => [a.id ?? 'default', {
    summary: summaryOf(a.dom, a.consoleErrors), bodySig: a.bodySig,
    dom: a.dom, consoleErrors: a.consoleErrors, screenshot: a.screenshot,
  }])),
};
fs.writeFileSync(`${outDir}/verdict.json`, JSON.stringify(verdict, null, 2));

console.log('SUMMARY', JSON.stringify(verdict.summary));
for (const a of audits) {
  const s = summaryOf(a.dom, a.consoleErrors);
  const hot = Object.entries(s).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(' ') || 'clean';
  console.log(`  scenario ${a.id ?? '(default)'}: ${hot}`);
}
if (manifest.error) console.log('  ⚠ manifest:', manifest.error);
if (scenarioNoop.length) console.log('  ⚠ noop scenarios (declared but DOM identical to default):', scenarioNoop.join(', '));
if (unreachableScenarios.length) console.log('  ⚠ unreachable/blank scenarios (аудит НЕ валиден):', unreachableScenarios.join(', '));
if (def.dom.contrast.length) console.log('  invisible/poor:', def.dom.contrast.slice(0, 6).map((c) => `${c.text}[Lc${c.Lc}]`).join(' | '));
if (def.dom.brokenImages.length) console.log('  broken-img:', def.dom.brokenImages.map((b) => b.src).join(', '));
if (staticF.length) console.log('  static:', staticF.map((f) => `${f.id}@${f.file}:${f.line}`).join(', '));
console.log('  overflow at:', overflowWidths.join(',') || 'none');
console.log('verdict →', `${outDir}/verdict.json`, '· shots →', audits.map((a) => path.basename(a.screenshot)).join(', '));
