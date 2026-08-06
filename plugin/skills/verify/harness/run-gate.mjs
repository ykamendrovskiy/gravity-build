// run-gate.mjs — headless gate runner.
//   node run-gate.mjs <url> <projectDir> [outDir] [--fail-on=any|high]   — полный гейт (нужен playwright)
//   node run-gate.mjs --static-only <projectDir> [outDir] [--fail-on=…]  — только static-линия (чистый Node)
// --fail-on: exit 1 при находках (any — любая; high — только высокой уверенности:
//   invisible-контраст [обе темы] / битые img / [object Object] / icon-leak / console / static-high /
//   недостижимые сценарии). Без флага exit 0 — вердикт интерпретирует читающий (моделью/человеком).
// Тёмная тема: на ДЕФОЛТ-сценарии контраст меряется дважды (light и .g-root_theme_dark свапом класса);
//   нет .g-root → dark_pass='skipped_no_g_root' (честный пропуск, не fake-clean).
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

const argvAll = process.argv.slice(2);
const flags = argvAll.filter((a) => a.startsWith('--'));
const pos = argvAll.filter((a) => !a.startsWith('--'));
const staticOnlyFlag = flags.includes('--static-only');
const failOn = (flags.find((a) => a.startsWith('--fail-on')) || '').split('=')[1] || null;
const url = staticOnlyFlag ? null : pos[0];
const projectDir = staticOnlyFlag ? pos[0] : pos[1];
const outDir = (staticOnlyFlag ? pos[1] : pos[2]) || '.';
if (!url && !staticOnlyFlag) { console.error('usage: node run-gate.mjs <url|--static-only> <projectDir> [outDir] [--fail-on=any|high]'); process.exit(2); }
if (failOn && !['any', 'high'].includes(failOn)) { console.error('--fail-on принимает any | high'); process.exit(2); }

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
  const shigh = staticF.filter((f) => f.sev === 'high').length;
  if ((failOn === 'any' && staticF.length) || (failOn === 'high' && shigh)) {
    console.error(`--fail-on=${failOn}: static-находки есть → exit 1 (вердикт при этом ЧАСТИЧНЫЙ)`);
    process.exit(1);
  }
  process.exit(0);
}

const REF_W = 1280;
// page-constructor breakpoints (577/769/1081/1185/1400) straddled ±1, plus anchors
const SWEEP = [1440, 1400, 1399, 1280, 1185, 1184, 1081, 1080, 769, 768, 577, 576, 375];

// --- scenarios.manifest.json (absent → single anonymous scenario = legacy behavior) ---
function readManifest(dir) {
  const none = { param: null, def: null, ids: [null], declared: null, error: null, minWidth: null, frame: { declared: false, minHeight: null } };
  if (!dir) return none;
  const p = path.join(dir, 'scenarios.manifest.json');
  if (!fs.existsSync(p)) return none;
  try {
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(m.scenarios) || !m.scenarios.length) throw new Error('scenarios[] пуст');
    const param = m.param || 'scenario';
    const def = m.default && m.scenarios.includes(m.default) ? m.default : m.scenarios[0];
    // intendedMinWidth (floor из figma-mapping): ниже него overflow — объявленная политика, не дефект
    const minWidth = Number.isFinite(m.intendedMinWidth) && m.intendedMinWidth > 0 ? m.intendedMinWidth : null;
    // frame (app-рамка = вьюпорт-замок, scaffold-app-shell): {"viewport": true, "minHeight": 560} —
    // в пределах рамки документ скроллиться не должен (frame_leak); ниже minHeight — политика.
    const fr = m.frame && typeof m.frame === 'object' && m.frame.viewport === true
      ? { declared: true, minHeight: Number.isFinite(m.frame.minHeight) && m.frame.minHeight > 0 ? m.frame.minHeight : null }
      : { declared: false, minHeight: null };
    return { param, def, ids: [def, ...m.scenarios.filter((s) => s !== def)], declared: m.scenarios, error: null, minWidth, frame: fr };
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
async function auditScenario(id, withDark) {
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
  // тёмный проход (контраст-only, дефолт-сценарий): тема Гравити = класс на .g-root, токены
  // сменяются чистым CSS — свап класса, замер APCA, возврат. Нет .g-root → честный пропуск.
  let dark = null;
  if (withDark) {
    const swapped = await page.evaluate(() => {
      const r = document.querySelector('.g-root');
      if (!r) return false;
      r.classList.remove('g-root_theme_light'); r.classList.add('g-root_theme_dark');
      return true;
    });
    if (!swapped) { dark = { skipped: 'no_g_root' }; }
    else {
      await page.waitForTimeout(150);
      const d = await page.evaluate(gateDom);
      dark = { contrast: d.contrast, contrastChecked: d.contrastChecked };
      await page.evaluate(() => {
        const r = document.querySelector('.g-root');
        r.classList.remove('g-root_theme_dark'); r.classList.add('g-root_theme_light');
      });
      await page.waitForTimeout(100);
    }
  }
  // body signature → noop detection (declared scenario that changes nothing).
  // Прото-панель вырезается из подписи: её Select показывает ИМЯ текущего сценария → без выреза
  // любые два сценария различались бы только лейблом панели и noop-детектор ослеп бы (S4).
  const bodySig = await page.evaluate(() => {
    const root = document.body ? document.body.cloneNode(true) : null;
    if (root) root.querySelectorAll('[data-proto-panel]').forEach((n) => n.remove());
    const s = root ? root.innerHTML : '';
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16) + ':' + s.length;
  });
  const shot = id ? `${outDir}/full-${id}.png` : `${outDir}/full.png`;
  await page.screenshot({ path: shot, fullPage: true });
  // dead server / blank document → the audit is VOID, not "clean" (silent fake-green is the enemy)
  const unreachable = gotoFailed || parseInt(bodySig.split(':')[1], 10) === 0;
  return { id, dom, dark, bodySig, unreachable, consoleErrors: consoleErrors.slice(), screenshot: shot };
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
for (let i = 0; i < manifest.ids.length; i++) audits.push(await auditScenario(manifest.ids[i], i === 0));
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

// --- рамка-пачка (frame_leak / pinned_drift / chrome_squeeze) — per scenario, height-dependent ---
// Механика одна: resize + scroll + remeasure. Классы owner-находок 2026-08-06: «документ скроллится
// в app-рамке» (топбар уезжает), «sticky объявлен, но не работает», «фикс-хром сжимается по
// вертикали» (ActionBar 40→28 во флекс-колонке без flex-shrink:0).
// Правила доверия: frame_leak и дрейф static-хрома (known-chrome) меряются ТОЛЬКО при объявленной
// рамке (manifest.frame); дрейф fixed/sticky/data-pinned и стабильность высот — всегда.
// Sticky меряется только уже-пришпиленный (в потоке до точки прилипания уезжает легитимно — не FP).
const FRAME_BASE_H = 800;
function frameLadder(minH) {
  const hs = [FRAME_BASE_H, Math.max(620, minH || 0)];
  return [...new Set(hs)].filter((h) => !minH || h >= minH);
}

async function frameProbe(id) {
  const target = urlFor(url, manifest.param, id);
  try { await page.goto(target, { waitUntil: 'networkidle', timeout: 20000 }); } catch { return null; }
  await page.waitForTimeout(200);
  // пин/хром-набор помечается стабильными ключами (скриншоты уже сняты — мутация DOM безопасна):
  // data-pinned (контракт сборки) ∪ fixed ∪ sticky-по-вертикали ∪ известный DS-хром.
  await page.evaluate(() => {
    let i = 0;
    const KNOWN_CHROME = /(^|\s|_{2})gn-action-bar|g-actions-panel/;
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[data-proto-panel]') || el.closest('[class*="g-toaster"]')) continue;
      const cls = (el.getAttribute && el.getAttribute('class')) || '';
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const stickyY = cs.position === 'sticky' && (cs.top !== 'auto' || cs.bottom !== 'auto');
      const kind = el.hasAttribute('data-pinned') ? 'marked'
        : cs.position === 'fixed' ? 'fixed'
        : stickyY ? 'sticky'
        : KNOWN_CHROME.test(cls) ? 'chrome' : null;
      if (!kind) continue;
      if (el.closest('[data-gate-pin]')) continue; // вложенные не дублируем (панель внутри панели)
      const tv = cs.top !== 'auto' ? Math.round(parseFloat(cs.top)) : '';
      const bv = cs.bottom !== 'auto' ? Math.round(parseFloat(cs.bottom)) : '';
      el.setAttribute('data-gate-pin', `${++i}:${kind}:${(cls.split(/\s+/)[0] || el.tagName).slice(0, 44)}:${tv}:${bv}`);
    }
  });
  const measure = () => page.evaluate(() => {
    const de = document.documentElement;
    return {
      doc: de.scrollHeight - de.clientHeight,
      docX: de.scrollWidth - de.clientWidth,
      pins: [...document.querySelectorAll('[data-gate-pin]')].map((el) => {
        const r = el.getBoundingClientRect();
        return { key: el.getAttribute('data-gate-pin'), top: Math.round(r.top), left: Math.round(r.left),
          bottom: Math.round(r.bottom), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 };
      }),
    };
  });
  // лестница высот в пределах рамки: doc-замок (при объявленной рамке) + стабильность высот хрома
  const frameLeak = []; const heightsByKey = new Map();
  for (const h of frameLadder(manifest.frame.minHeight)) {
    await page.setViewportSize({ width: REF_W, height: h });
    await page.waitForTimeout(140);
    const m = await measure();
    if (manifest.frame.declared) {
      if (m.doc > 2) frameLeak.push({ h, axis: 'y', px: m.doc });
      if (m.docX > 2) frameLeak.push({ h, axis: 'x', px: m.docX });
    }
    for (const p of m.pins) {
      if (!p.vis) continue;
      if (!heightsByKey.has(p.key)) heightsByKey.set(p.key, []);
      heightsByKey.get(p.key).push({ vh: h, h: p.h });
    }
  }
  // squeeze = высота меняется, но НЕ трекает вьюпорт: full-height хром (рельса AsideHeader,
  // height:100vh-панели) легитимно растёт/сжимается вместе с окном — закалка FP первой канарейки.
  const chromeSqueeze = [...heightsByKey.entries()]
    .filter(([, arr]) => {
      if (arr.length < 2) return false;
      const hs = arr.map((a) => a.h), vhs = arr.map((a) => a.vh);
      const dh = Math.max(...hs) - Math.min(...hs);
      const dvh = Math.max(...vhs) - Math.min(...vhs);
      return dh > 1 && Math.abs(dh - dvh) > 4;
    })
    .map(([key, arr]) => ({ key, heights: arr.map((a) => `${a.h}@${a.vh}`) }));
  // дрейф-проба на базовой высоте: скролл документа + крупных контейнеров → пины держат позицию
  await page.setViewportSize({ width: REF_W, height: FRAME_BASE_H });
  await page.waitForTimeout(140);
  const before = await measure();
  await page.evaluate(() => {
    window.scrollTo(0, 300);
    [...document.querySelectorAll('body *')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight - el.clientHeight > 40;
      })
      .slice(0, 5)
      .forEach((el) => { el.scrollTop = 300; });
  });
  await page.waitForTimeout(280);
  const after = await measure();
  const afterMap = new Map(after.pins.map((p) => [p.key, p]));
  const pinnedDrift = [];
  for (const b of before.pins) {
    if (!b.vis) continue;
    const [, kind, , tv, bv] = b.key.split(':');
    if (kind === 'chrome' && !manifest.frame.declared) continue; // static-хром обязан стоять только в заявленной рамке
    if (kind === 'sticky') {
      const pinnedNow = (tv !== '' && Math.abs(b.top - Number(tv)) <= 4) ||
        (bv !== '' && Math.abs((FRAME_BASE_H - b.bottom) - Number(bv)) <= 4);
      if (!pinnedNow) continue; // не дошёл до точки прилипания — уедет легитимно
    }
    const a = afterMap.get(b.key);
    if (!a || !a.vis) { pinnedDrift.push({ key: b.key, gone: true }); continue; }
    const dTop = a.top - b.top, dLeft = a.left - b.left;
    if (Math.abs(dTop) > 2 || Math.abs(dLeft) > 2) pinnedDrift.push({ key: b.key, dTop, dLeft });
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    [...document.querySelectorAll('body *')].forEach((el) => { if (el.scrollTop) el.scrollTop = 0; });
  });
  // ниже объявленного minHeight рамки doc-скролл — ожидаемая политика (репорт, не находка)
  let belowFloorLeakPx = 0;
  if (manifest.frame.declared && manifest.frame.minHeight) {
    await page.setViewportSize({ width: REF_W, height: Math.max(320, manifest.frame.minHeight - 110) });
    await page.waitForTimeout(140);
    const m = await measure();
    belowFloorLeakPx = m.doc > 2 ? m.doc : 0;
  }
  return { id: id ?? 'default', frameLeak, chromeSqueeze, pinnedDrift, belowFloorLeakPx };
}

const frameProbes = [];
for (const id of manifest.ids) {
  const r = await frameProbe(id);
  if (r) frameProbes.push(r);
}
await browser.close();

const staticF = projectDir ? runStatic(projectDir) : [];
// overflow ниже объявленного floor'а (manifest.intendedMinWidth) — ожидаемая политика адаптива,
// репортится отдельной строкой и НЕ считается находкой fail-on (figma-mapping «floor»)
const allOverflow = sweep.filter((s) => s.overflowPx > 1).map((s) => s.width);
const overflowWidths = manifest.minWidth ? allOverflow.filter((w) => w >= manifest.minWidth) : allOverflow;
const overflowBelowFloor = manifest.minWidth ? allOverflow.filter((w) => w < manifest.minWidth) : [];

const frameLeakN = frameProbes.reduce((n, p) => n + p.frameLeak.length, 0);
const pinnedDriftN = frameProbes.reduce((n, p) => n + p.pinnedDrift.length, 0);
const chromeSqueezeN = frameProbes.reduce((n, p) => n + p.chromeSqueeze.length, 0);
const frameBelowFloorN = frameProbes.filter((p) => p.belowFloorLeakPx > 0).length;

const verdict = {
  url, ref_width: REF_W, generated: 'run-gate.mjs',
  manifest: manifest.declared ? { param: manifest.param, default: manifest.def, declared: manifest.declared, intendedMinWidth: manifest.minWidth, frame: manifest.frame.declared ? manifest.frame : null } : null,
  manifest_error: manifest.error,
  summary: {
    ...summaryOf(def.dom, def.consoleErrors),
    contrast_dark_invisible: def.dark && def.dark.contrast ? def.dark.contrast.filter((c) => c.severity === 'invisible').length : 0,
    contrast_dark_poor: def.dark && def.dark.contrast ? def.dark.contrast.filter((c) => c.severity === 'poor').length : 0,
    dark_pass: def.dark ? (def.dark.skipped ? 'skipped_no_g_root' : 'done') : 'off',
    static_findings: staticF.length,
    overflow_widths: overflowWidths.length,
    overflow_below_floor: overflowBelowFloor.length,
    scenarios_audited: audits.length,
    scenario_noop: scenarioNoop,
    scenario_unreachable: unreachableScenarios,
    frame_pass: manifest.frame.declared ? 'declared' : 'off',
    frame_leak: frameLeakN,
    pinned_drift: pinnedDriftN,
    chrome_squeeze: chromeSqueezeN,
    frame_leak_below_floor: frameBelowFloorN,
  },
  frame_probes: frameProbes,
  // top-level dom/consoleErrors/screenshot = default scenario (backward-compatible shape)
  dom: def.dom, darkContrast: def.dark, sweep, overflowWidths, static: staticF, consoleErrors: def.consoleErrors, screenshot: def.screenshot,
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
if (def.dark && def.dark.contrast && def.dark.contrast.length) console.log('  dark invisible/poor:', def.dark.contrast.slice(0, 6).map((c) => `${c.text}[Lc${c.Lc}]`).join(' | '));
if (def.dark && def.dark.skipped) console.log('  ⚠ тёмный проход пропущен: .g-root не найден (контраст в тёмной теме НЕ проверялся)');
if (def.dom.brokenImages.length) console.log('  broken-img:', def.dom.brokenImages.map((b) => b.src).join(', '));
if (staticF.length) console.log('  static:', staticF.map((f) => `${f.id}@${f.file}:${f.line}`).join(', '));
console.log('  overflow at:', overflowWidths.join(',') || 'none');
if (overflowBelowFloor.length) console.log(`  overflow ниже floor ${manifest.minWidth} (объявленная политика, не находка):`, overflowBelowFloor.join(','));
for (const p of frameProbes) {
  const bits = [];
  if (p.frameLeak.length) bits.push('frame_leak:' + p.frameLeak.map((f) => `${f.axis}${f.px}@${f.h}`).join('/'));
  if (p.pinnedDrift.length) bits.push('pinned_drift:' + p.pinnedDrift.map((d) => `${d.key.split(':')[2]}${d.gone ? '·gone' : `·Δ${d.dTop},${d.dLeft}`}`).join('/'));
  if (p.chromeSqueeze.length) bits.push('chrome_squeeze:' + p.chromeSqueeze.map((c) => `${c.key.split(':')[2]}·${c.heights.join('→')}`).join('/'));
  if (bits.length) console.log(`  frame ${p.id}: ${bits.join(' · ')}`);
}
if (frameBelowFloorN) console.log(`  frame: doc-скролл ниже minHeight ${manifest.frame.minHeight} на ${frameBelowFloorN} сценариях (объявленная политика, не находка)`);
console.log('verdict →', `${outDir}/verdict.json`, '· shots →', audits.map((a) => path.basename(a.screenshot)).join(', '));
if (failOn) {
  const s = verdict.summary;
  const staticHigh = staticF.filter((f) => f.sev === 'high').length;
  const high = s.contrast_invisible + s.contrast_dark_invisible + s.broken_images + s.object_object +
    s.button_icon_leak + s.console_errors + staticHigh + s.scenario_unreachable.length;
  const any = high + s.contrast_poor + s.contrast_dark_poor + s.control_row_mismatch + s.zero_fill_svg +
    s.empty_slots + s.table_underfill + (staticF.length - staticHigh) + s.overflow_widths + s.scenario_noop.length +
    s.frame_leak + s.pinned_drift + s.chrome_squeeze; // рамка-линии: any-класс до закалки на живых прогонах
  if ((failOn === 'any' && any > 0) || (failOn === 'high' && high > 0)) {
    console.error(`--fail-on=${failOn}: находки есть (any=${any}, high=${high}) → exit 1`);
    process.exit(1);
  }
}
