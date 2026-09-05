// run-gate.mjs — headless gate runner (verdict schema_version 2, см. verdict.schema.json).
//   node run-gate.mjs <url> <projectDir> [outDir] [--fail-on=any|high] [--strict]   — полный гейт (нужен playwright)
//   node run-gate.mjs --static-only <projectDir> [outDir] [--fail-on=…] [--strict]  — только static-линия (чистый Node)
// Три независимых признака вердикта: valid (запуск состоялся) · complete (все запрошенные и применимые
//   проверки выполнены; coverage — матрица сценарий×проверка) · находки (summary — АГРЕГАТ по всем
//   проверенным сценариям; default_summary — только дефолтный).
// Exit-коды: 0 чисто/ниже порога · 1 находки достигли --fail-on (any — любая; high — invisible-контраст
//   [обе темы] / битые img / [object Object] / icon-leak / console / static-high / недостижимые сценарии) ·
//   2 ошибка вызова · 3 НЕВАЛИДНЫЙ запуск (битый манифест, нет проекта, пустая/недостижимая страница) —
//   независимо от --fail-on · 4 покрытие неполное при --strict. Без флагов — 0/3 (вердикт читает модель/человек).
// Тёмная тема: на ДЕФОЛТ-сценарии контраст меряется дважды (исходная тема и свап класса .g-root на _dark);
//   исходные классы .g-root сохраняются и восстанавливаются (coverage.theme_restore). Исходно тёмная
//   страница → второй замер не делается (dark_pass='same_as_initial'; светлая тема out_of_scope).
//   Нет .g-root → dark_pass='skipped_no_g_root' (честный пропуск → complete=false, не fake-clean).
// Lanes: static (source grep) + eval (DOM invariants, width-independent) +
//        layout sweep (per breakpoint ±1, ПО КАЖДОМУ сценарию) + full-height screenshot (vision/owner).
// Scenario walk: if <projectDir>/scenarios.manifest.json exists (self-describing build,
// see registry scaffold-app-shell «Сценарии состояний»), eval lane + sweep + capture run PER
// scenario (?<param>=<id>). Опциональный `ready` (селектор) в манифесте — явный контракт готовности.
// NB: the served build must have the scenario switch alive — `VITE_SCENARIOS=1 npm run build`
// (plain build tree-shakes the dev-gated switch → every scenario would be a noop).
// Playwright: проект → GRAVITY_GATE_PLAYWRIGHT → рядом с харнесом → глобальные пакеты npm (одна установка
//   на машину закрывает все временные проекты). Graceful degradation: playwright недоступен → автоматический
//   static-only (complete=false, браузерные ячейки coverage = skipped; с --strict → exit 4).
// Emits <outDir>/verdict.json and a console summary.
import { runStatic } from './static-checks.mjs';
import { gateDom, gateLayout } from './gate.mjs';
import fs from 'fs';
import path from 'path';

const EXIT = { FINDINGS: 1, USAGE: 2, INVALID: 3, INCOMPLETE: 4 };
const argvAll = process.argv.slice(2);
const flags = argvAll.filter((a) => a.startsWith('--'));
const pos = argvAll.filter((a) => !a.startsWith('--'));
const staticOnlyFlag = flags.includes('--static-only');
const strict = flags.includes('--strict');
const failOn = (flags.find((a) => a.startsWith('--fail-on')) || '').split('=')[1] || null;
const url = staticOnlyFlag ? null : pos[0];
const projectDir = staticOnlyFlag ? pos[0] : pos[1];
const outDir = (staticOnlyFlag ? pos[1] : pos[2]) || '.';
if ((!url && !staticOnlyFlag) || !projectDir) {
  console.error('usage: node run-gate.mjs <url|--static-only> <projectDir> [outDir] [--fail-on=any|high] [--strict]');
  process.exit(EXIT.USAGE);
}
if (failOn && !['any', 'high'].includes(failOn)) { console.error('--fail-on принимает any | high'); process.exit(EXIT.USAGE); }

// --- общие помощники вердикта -------------------------------------------------------------
const cellSkipped = (c) => c && typeof c === 'object' && 'skipped' in c;
function completeness(coverage) {
  const reasons = [];
  for (const [sid, cells] of Object.entries(coverage.scenarios)) {
    for (const [k, c] of Object.entries(cells)) if (cellSkipped(c)) reasons.push(`${sid}.${k}: ${c.skipped}`);
  }
  if (cellSkipped(coverage.static)) reasons.push(`static: ${coverage.static.skipped}`);
  return { complete: reasons.length === 0, incomplete_reasons: reasons };
}
function writeVerdict(v) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(`${outDir}/verdict.json`, JSON.stringify(v, null, 2));
  console.log('verdict →', `${outDir}/verdict.json`);
}
function invalidExit(reason, extra = {}) {
  const v = {
    schema_version: 2, generated: 'run-gate.mjs', mode: staticOnlyFlag || !chromium ? 'static-only' : 'full',
    url, valid: false, invalid_reason: reason, fatal: reason, // fatal — обратная совместимость (aggregate.mjs)
    complete: false, incomplete_reasons: ['run_invalid: ' + reason],
    coverage: { scenarios: {}, widths: [], themes_observed: [], theme_restore: 'n/a', static: { skipped: 'run_invalid' } },
    summary: {}, static: { files_scanned: 0, skipped_reason: null, findings: [] }, ...extra,
  };
  writeVerdict(v);
  console.error(`НЕВАЛИДНЫЙ запуск (${reason}): проверка не состоялась — это не «чисто». exit ${EXIT.INVALID}`);
  process.exit(EXIT.INVALID);
}
function finish(v, high, any) {
  writeVerdict(v);
  if (failOn && ((failOn === 'any' && any > 0) || (failOn === 'high' && high > 0))) {
    console.error(`--fail-on=${failOn}: находки есть (any=${any}, high=${high})${v.complete ? '' : ' · покрытие НЕПОЛНОЕ'} → exit ${EXIT.FINDINGS}`);
    process.exit(EXIT.FINDINGS);
  }
  if (!v.complete) {
    console.log(`  ⚠ покрытие неполное: ${v.incomplete_reasons.join('; ')}`);
    if (strict) { console.error(`--strict: покрытие неполное → exit ${EXIT.INCOMPLETE}`); process.exit(EXIT.INCOMPLETE); }
  }
  process.exit(0);
}

// --- вход: проект и манифест — до любых проверок ------------------------------------------
let chromium = null;
const projectAbs = path.resolve(projectDir);
if (!fs.existsSync(projectAbs) || !fs.statSync(projectAbs).isDirectory()) invalidExit('project_dir_missing');

// scenarios.manifest.json (absent → single anonymous scenario = legacy behavior)
function readManifest(dir) {
  const none = { param: null, def: null, ids: [null], declared: null, error: null, minWidth: null, ready: null, frame: { declared: false, minHeight: null } };
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
    // ready: селектор готовности приложения (явный контракт вместо эвристики «видимое содержимое»)
    const ready = typeof m.ready === 'string' && m.ready.trim() ? m.ready.trim() : null;
    return { param, def, ids: [def, ...m.scenarios.filter((s) => s !== def)], declared: m.scenarios, error: null, minWidth, ready, frame: fr };
  } catch (e) {
    return { ...none, error: 'scenarios.manifest.json: ' + String(e && e.message || e) };
  }
}
const manifest = readManifest(projectAbs);
// битый манифест = обещанное покрытие сценариев потеряно → запуск невалиден (не «один анонимный экран»)
if (manifest.error) invalidExit('manifest_error', { manifest_error: manifest.error });

if (!staticOnlyFlag) {
  // Playwright ищем цепочкой: проверяемый проект → GRAVITY_GATE_PLAYWRIGHT (папка проекта / node_modules /
  // сам пакет) → рядом с харнесом → глобальные пакеты npm (npm_config_prefix, затем `npm root -g`).
  // Одна установка на машину (`npm i -g playwright && playwright install chromium`) закрывает все
  // временные проекты тестера; проектная установка по-прежнему в приоритете.
  const { createRequire } = await import('module');
  const tryFrom = (dir) => { try { return createRequire(path.join(dir, 'package.json'))('playwright'); } catch { return null; } };
  const globalRoots = async () => {
    const roots = [];
    const prefix = process.env.npm_config_prefix;
    if (prefix) roots.push(process.platform === 'win32' ? path.join(prefix, 'node_modules') : path.join(prefix, 'lib', 'node_modules'));
    try {
      const { execSync } = await import('child_process');
      roots.push(execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim());
    } catch {}
    return roots.filter(Boolean);
  };
  const candidates = [
    ['project', () => tryFrom(projectAbs)],
    ['GRAVITY_GATE_PLAYWRIGHT', () => (process.env.GRAVITY_GATE_PLAYWRIGHT ? tryFrom(path.resolve(process.env.GRAVITY_GATE_PLAYWRIGHT)) : null)],
    ['harness', async () => { try { return await import('playwright'); } catch { return null; } }],
    ['global npm', async () => { for (const r of await globalRoots()) { const m = tryFrom(r); if (m) return m; } return null; }],
  ];
  for (const [source, get] of candidates) {
    const mod = await get();
    if (mod && mod.chromium) { ({ chromium } = mod); if (source !== 'project') console.error(`· playwright: ${source}`); break; }
  }
  if (!chromium) console.error('⚠ playwright недоступен → деградация в static-only. Полная проверка: один раз на машину `npm i -g playwright && playwright install chromium` (гейт найдёт сам), либо в проект `npm i -D playwright && npx playwright install chromium`, либо путь к установке в GRAVITY_GATE_PLAYWRIGHT');
}

const st = runStatic(projectAbs);
const staticF = st.findings;
const staticBlock = { files_scanned: st.files_scanned, skipped_reason: st.files_scanned ? null : 'no_sources', findings: staticF };
const staticCell = st.files_scanned ? 'done' : { out_of_scope: 'no_sources' }; // нет исходников — статика неприменима, не «пропущена»
const staticHigh = staticF.filter((f) => f.sev === 'high').length;

// --- static-only режим (без браузера): static-линия, честный неполный вердикт --------------
if (staticOnlyFlag || !chromium) {
  const reason = staticOnlyFlag ? 'флаг --static-only' : 'playwright недоступен';
  const skipped = { skipped: 'browser_lanes_skipped: ' + reason };
  const ids = manifest.declared ? manifest.declared : ['default'];
  const coverage = {
    scenarios: Object.fromEntries(ids.map((id) => [id, { dom: skipped, console: skipped, contrast: skipped, contrast_dark: skipped, widths: skipped, frame: skipped, screenshot: skipped }])),
    widths: [], themes_observed: [], theme_restore: 'n/a', static: staticCell,
  };
  const verdict = {
    schema_version: 2, generated: 'run-gate.mjs', mode: 'static-only', reason, url: null,
    valid: true, invalid_reason: null, ...completeness(coverage), coverage,
    browser_lanes: 'SKIPPED (contrast/broken-img/overflow/сценарии НЕ проверены — это не «чисто», это «не смотрели»)',
    summary: { static_findings: staticF.length, manifest_declared: manifest.declared ? manifest.declared.length : 0 },
    static: staticBlock, manifest: manifest.declared ? { declared: manifest.declared } : null, manifest_error: null,
  };
  console.log('SUMMARY(static-only)', JSON.stringify(verdict.summary), `· исходников просмотрено: ${st.files_scanned}${st.files_scanned ? '' : ' (статика неприменима: нет .ts/.tsx/.js/.jsx)'}`);
  if (staticF.length) console.log('  static:', staticF.map((f) => `${f.id}@${f.file}:${f.line}`).join(', '));
  console.log('  ⚠ browser-линии пропущены — вердикт НЕПОЛНЫЙ.');
  finish(verdict, staticHigh, staticF.length);
}

const REF_W = 1280;
// page-constructor breakpoints (577/769/1081/1185/1400) straddled ±1, plus anchors
const SWEEP = [1440, 1400, 1399, 1280, 1185, 1184, 1081, 1080, 769, 768, 577, 576, 375];

function urlFor(base, param, id) {
  if (!id || !param) return base;
  const u = new URL(base);
  u.searchParams.set(param, id);
  return u.toString();
}

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
  // явный контракт готовности (manifest.ready) — ждём селектор; не дождались → сценарий недостижим
  let readyFailed = false;
  if (!gotoFailed && manifest.ready) {
    try { await page.waitForSelector(manifest.ready, { timeout: 10000, state: 'visible' }); } catch { readyFailed = true; }
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
  // тема как наблюдается: класс на .g-root (light / dark / light-hc / dark-hc); исходные классы сохраняем
  const themeInfo = await page.evaluate(() => {
    const r = document.querySelector('.g-root');
    if (!r) return null;
    const m = (r.className.match(/g-root_theme_([\w-]+)/) || [])[1] || null;
    return { className: r.className, theme: m };
  });
  // тёмный проход (контраст-only, дефолт-сценарий): токены Гравити сменяются чистым CSS — свап класса,
  // замер APCA, ВОССТАНОВЛЕНИЕ исходных классов. Исходно тёмная страница → второй замер не делается
  // (это был бы тот же замер); нет .g-root → честный пропуск.
  let dark = null, restored = null;
  if (withDark) {
    if (!themeInfo) dark = { skipped: 'no_g_root' };
    else if (themeInfo.theme && themeInfo.theme.startsWith('dark')) dark = { same_as_initial: true };
    else {
      await page.evaluate((orig) => {
        const r = document.querySelector('.g-root');
        r.className = /g-root_theme_[\w-]+/.test(orig) ? orig.replace(/g-root_theme_[\w-]+/, 'g-root_theme_dark') : orig + ' g-root_theme_dark';
      }, themeInfo.className);
      await page.waitForTimeout(150);
      const d = await page.evaluate(gateDom);
      dark = { contrast: d.contrast, contrastChecked: d.contrastChecked };
      restored = await page.evaluate((orig) => {
        const r = document.querySelector('.g-root');
        r.className = orig;
        return r.className === orig;
      }, themeInfo.className);
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
  // видимое содержимое: хоть один элемент с ненулевым боксом И вычисленной видимостью вне прото-панели
  // (canvas/svg считаются; display:none даёт нулевой бокс, visibility:hidden наследуется в computed —
  // проверки самого элемента достаточно; ревью Codex v0.6.1). Эвристика, не доказательство готовности:
  // пустая обёртка с высотой или вечный спиннер её проходят — явный контракт = manifest.ready.
  const visibleCount = await page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[data-proto-panel]')) continue;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'TEMPLATE') continue;
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.visibility === 'collapse' || cs.display === 'none') continue;
      n++;
    }
    // текст ПРЯМО в body без обёртки (простые страницы, страницы ошибок) — тоже содержимое; текст
    // потомков сюда не входит (скрытые поддеревья не должны считаться видимыми)
    if (n === 0 && document.body) {
      for (const node of document.body.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0) { n = 1; break; }
      }
    }
    return n;
  });
  const shot = id ? `${outDir}/full-${id}.png` : `${outDir}/full.png`;
  await page.screenshot({ path: shot, fullPage: true });
  // dead server / blank document / пустой контейнер → the audit is VOID, not "clean" (silent fake-green is the enemy)
  const unreachableReason = gotoFailed ? 'page_unreachable'
    : parseInt(bodySig.split(':')[1], 10) === 0 ? 'blank_document'
    : readyFailed ? 'ready_selector_not_found'
    : visibleCount === 0 ? 'no_visible_content' : null;
  return { id, dom, dark, restored, themeInfo, visibleCount, bodySig, unreachable: !!unreachableReason, unreachableReason, consoleErrors: consoleErrors.slice(), screenshot: shot };
}

function summaryOf(dom, errs) {
  return {
    contrast_invisible: dom.contrast.filter((c) => c.severity === 'invisible').length,
    contrast_poor: dom.contrast.filter((c) => c.severity === 'poor').length,
    broken_images: dom.brokenImages.length,
    control_row_mismatch: dom.controlRowMismatch.length,
    object_object: dom.objectObject.length,
    button_icon_leak: dom.buttonIconLeak.length,
    input_icon_inset: (dom.inputIconInset || []).length,
    zero_fill_svg: dom.zeroFillSvg.length,
    empty_slots: dom.emptySlot.length,
    table_underfill: (dom.tableUnderfill || []).length,
    console_errors: errs.length,
  };
}
function sumSummaries(list) {
  const out = {};
  for (const s of list) for (const [k, v] of Object.entries(s)) out[k] = (out[k] || 0) + v;
  return out;
}

// прогрев: первый рендер на свежеподнятом сервере бывает mid-render → ложный noop/двойной DOM
// (флейк пойман selfcheck-01: bodySig ~19k вместо ~9.9k сразу после старта preview). Один
// прогревочный заход + settle до всех аудитов.
try { await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }); await page.waitForTimeout(400); } catch {}

// eval lane + capture per scenario (default first — it anchors noop detection)
const audits = [];
for (let i = 0; i < manifest.ids.length; i++) audits.push(await auditScenario(manifest.ids[i], i === 0));
const def = audits[0];
const sid = (a) => a.id ?? 'default';

// НЕВАЛИДНО: дефолтный сценарий недостижим/пуст → никакого вердикта «по нулям» для мёртвой страницы
if (def.unreachable) {
  await browser.close();
  console.error(`FATAL: ${url} — ${def.unreachableReason} (bodySig ${def.bodySig}, видимых элементов ${def.visibleCount}). Проверь сервер/сборку.`);
  invalidExit(def.unreachableReason, { bodySig: def.bodySig, visible_count: def.visibleCount, mode: 'full' });
}
const reachable = audits.filter((a) => !a.unreachable);
const unreachableScenarios = audits.slice(1).filter((a) => a.unreachable).map((a) => a.id);
const scenarioNoop = audits.slice(1).filter((a) => !a.unreachable && a.bodySig === def.bodySig).map((a) => a.id);

// layout sweep across breakpoints — width-dependent lane, ПО КАЖДОМУ достижимому сценарию
// (дефект только в не-дефолтном состоянии раньше проходил чисто: +14px@375 у пустого состояния, TODO :132)
const sweepBy = {};
for (const a of reachable) {
  const ok = await page.goto(urlFor(url, manifest.param, a.id), { waitUntil: 'networkidle', timeout: 20000 }).then(() => true).catch(() => false);
  if (!ok) continue;
  const sweep = [];
  for (const w of SWEEP) {
    await page.setViewportSize({ width: w, height: 3400 });
    await page.waitForTimeout(60);
    sweep.push(await page.evaluate(gateLayout));
  }
  sweepBy[sid(a)] = sweep;
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
const frameBy = {};
for (const a of reachable) {
  const r = await frameProbe(a.id);
  if (r) { frameProbes.push(r); frameBy[sid(a)] = r; }
}
await browser.close();

// overflow ниже объявленного floor'а (manifest.intendedMinWidth) — ожидаемая политика адаптива,
// репортится отдельной строкой и НЕ считается находкой fail-on (figma-mapping «floor»)
const overflowWidths = {}, overflowBelowFloor = {};
let overflowN = 0, belowFloorN = 0;
for (const [id, sweep] of Object.entries(sweepBy)) {
  const all = sweep.filter((s) => s.overflowPx > 1).map((s) => s.width);
  const above = manifest.minWidth ? all.filter((w) => w >= manifest.minWidth) : all;
  const below = manifest.minWidth ? all.filter((w) => w < manifest.minWidth) : [];
  if (above.length) { overflowWidths[id] = above; overflowN += above.length; }
  if (below.length) { overflowBelowFloor[id] = below; belowFloorN += below.length; }
}

const frameLeakN = frameProbes.reduce((n, p) => n + p.frameLeak.length, 0);
const pinnedDriftN = frameProbes.reduce((n, p) => n + p.pinnedDrift.length, 0);
const chromeSqueezeN = frameProbes.reduce((n, p) => n + p.chromeSqueeze.length, 0);
const frameBelowFloorN = frameProbes.filter((p) => p.belowFloorLeakPx > 0).length;

const darkBlock = {
  contrast_dark_invisible: def.dark && def.dark.contrast ? def.dark.contrast.filter((c) => c.severity === 'invisible').length : 0,
  contrast_dark_poor: def.dark && def.dark.contrast ? def.dark.contrast.filter((c) => c.severity === 'poor').length : 0,
  dark_pass: !def.dark ? 'off' : def.dark.skipped ? 'skipped_no_g_root' : def.dark.same_as_initial ? 'same_as_initial' : 'done',
};
const tail = {
  static_findings: staticF.length,
  overflow_widths: overflowN,
  overflow_below_floor: belowFloorN,
  scenarios_audited: reachable.length,
  scenario_noop: scenarioNoop,
  scenario_unreachable: unreachableScenarios,
  frame_pass: manifest.frame.declared ? 'declared' : 'off',
  frame_leak: frameLeakN,
  pinned_drift: pinnedDriftN,
  chrome_squeeze: chromeSqueezeN,
  frame_leak_below_floor: frameBelowFloorN,
};
// summary = АГРЕГАТ по всем достижимым сценариям (T1: находка во втором сценарии раньше не влияла на итог)
const summary = { ...sumSummaries(reachable.map((a) => summaryOf(a.dom, a.consoleErrors))), ...darkBlock, ...tail };
const defaultSummary = { ...summaryOf(def.dom, def.consoleErrors), ...darkBlock, overflow_widths: (overflowWidths[sid(def)] || []).length };

// coverage — матрица сценарий × проверка (что реально сделано, а не что подразумевается)
const darkCell = (a, i) => i !== 0 ? 'out_of_scope' // тёмный проход только на дефолте (известное ограничение)
  : !a.dark ? 'out_of_scope' : a.dark.skipped ? { skipped: 'no_g_root' } : a.dark.same_as_initial ? { out_of_scope: 'initial_theme_dark' } : 'done';
const coverage = {
  scenarios: Object.fromEntries(audits.map((a, i) => [sid(a), a.unreachable
    ? { dom: { skipped: 'unreachable: ' + a.unreachableReason }, console: { skipped: 'unreachable' }, contrast: { skipped: 'unreachable' }, contrast_dark: i === 0 ? { skipped: 'unreachable' } : 'out_of_scope', widths: { skipped: 'unreachable' }, frame: { skipped: 'unreachable' }, screenshot: 'done' }
    : { dom: 'done', console: 'done', contrast: 'done', contrast_dark: darkCell(a, i), widths: sweepBy[sid(a)] ? 'done' : { skipped: 'goto_failed' }, frame: frameBy[sid(a)] ? 'done' : { skipped: 'goto_failed' }, screenshot: 'done' }])),
  widths: SWEEP,
  themes_observed: [...new Set(audits.map((a) => (a.themeInfo && a.themeInfo.theme) || 'unknown'))],
  theme_restore: def.restored === null || def.restored === undefined ? 'n/a' : def.restored ? 'ok' : 'mismatch',
  static: staticCell,
};

const verdict = {
  schema_version: 2, generated: 'run-gate.mjs', mode: 'full', url, ref_width: REF_W,
  valid: true, invalid_reason: null, ...completeness(coverage), coverage,
  manifest: manifest.declared ? { param: manifest.param, default: manifest.def, declared: manifest.declared, intendedMinWidth: manifest.minWidth, ready: manifest.ready, frame: manifest.frame.declared ? manifest.frame : null } : null,
  manifest_error: null,
  summary, default_summary: defaultSummary,
  static: staticBlock,
  overflowWidths, overflowBelowFloor,
  frame_probes: frameProbes,
  // top-level dom/consoleErrors/screenshot = default scenario (backward-compatible shape)
  dom: def.dom, darkContrast: def.dark, sweep: sweepBy[sid(def)] || [], consoleErrors: def.consoleErrors, screenshot: def.screenshot,
  scenarios: Object.fromEntries(audits.map((a) => [sid(a), {
    summary: summaryOf(a.dom, a.consoleErrors), bodySig: a.bodySig, unreachable: a.unreachable, unreachable_reason: a.unreachableReason,
    theme: (a.themeInfo && a.themeInfo.theme) || null, visible_count: a.visibleCount,
    dom: a.dom, consoleErrors: a.consoleErrors, screenshot: a.screenshot, sweep: sweepBy[sid(a)] || null, overflowWidths: overflowWidths[sid(a)] || [],
  }])),
};

console.log('SUMMARY', JSON.stringify(verdict.summary));
for (const a of audits) {
  if (a.unreachable) { console.log(`  scenario ${sid(a)}: ⚠ недостижим (${a.unreachableReason})`); continue; }
  const s = summaryOf(a.dom, a.consoleErrors);
  const hot = Object.entries(s).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(' ') || 'clean';
  const ov = overflowWidths[sid(a)] ? ` overflow@${overflowWidths[sid(a)].join(',')}` : '';
  console.log(`  scenario ${sid(a)}: ${hot}${ov}`);
}
if (scenarioNoop.length) console.log('  ⚠ noop scenarios (declared but DOM identical to default):', scenarioNoop.join(', '));
if (unreachableScenarios.length) console.log('  ⚠ unreachable/blank scenarios (аудит этих состояний НЕ валиден):', unreachableScenarios.join(', '));
if (def.dom.contrast.length) console.log('  invisible/poor:', def.dom.contrast.slice(0, 6).map((c) => `${c.text}[Lc${c.Lc}]`).join(' | '));
if (def.dark && def.dark.contrast && def.dark.contrast.length) console.log('  dark invisible/poor:', def.dark.contrast.slice(0, 6).map((c) => `${c.text}[Lc${c.Lc}]`).join(' | '));
if (def.dark && def.dark.skipped) console.log('  ⚠ тёмный проход пропущен: .g-root не найден (контраст в тёмной теме НЕ проверялся)');
if (def.dark && def.dark.same_as_initial) console.log('  ℹ исходная тема тёмная — второй замер той же темы не делался; светлая тема не проверялась (out_of_scope)');
if (coverage.theme_restore === 'mismatch') console.log('  ⚠ классы .g-root после тёмного прохода НЕ совпали с исходными');
if (def.dom.brokenImages.length) console.log('  broken-img:', def.dom.brokenImages.map((b) => b.src).join(', '));
if (staticF.length) console.log('  static:', staticF.map((f) => `${f.id}@${f.file}:${f.line}`).join(', '));
if (!st.files_scanned) console.log('  ℹ статика: исходников (.ts/.tsx/.js/.jsx) в проекте нет — линия неприменима');
console.log('  overflow at:', Object.entries(overflowWidths).map(([id, ws]) => `${id}@${ws.join(',')}`).join(' ') || 'none');
if (belowFloorN) console.log(`  overflow ниже floor ${manifest.minWidth} (объявленная политика, не находка):`, Object.entries(overflowBelowFloor).map(([id, ws]) => `${id}@${ws.join(',')}`).join(' '));
for (const p of frameProbes) {
  const bits = [];
  if (p.frameLeak.length) bits.push('frame_leak:' + p.frameLeak.map((f) => `${f.axis}${f.px}@${f.h}`).join('/'));
  if (p.pinnedDrift.length) bits.push('pinned_drift:' + p.pinnedDrift.map((d) => `${d.key.split(':')[2]}${d.gone ? '·gone' : `·Δ${d.dTop},${d.dLeft}`}`).join('/'));
  if (p.chromeSqueeze.length) bits.push('chrome_squeeze:' + p.chromeSqueeze.map((c) => `${c.key.split(':')[2]}·${c.heights.join('→')}`).join('/'));
  if (bits.length) console.log(`  frame ${p.id}: ${bits.join(' · ')}`);
}
if (frameBelowFloorN) console.log(`  frame: doc-скролл ниже minHeight ${manifest.frame.minHeight} на ${frameBelowFloorN} сценариях (объявленная политика, не находка)`);
console.log('  shots →', audits.map((a) => path.basename(a.screenshot)).join(', '));

const s = verdict.summary;
const high = s.contrast_invisible + s.contrast_dark_invisible + s.broken_images + s.object_object +
  s.button_icon_leak + s.console_errors + staticHigh + s.scenario_unreachable.length;
const any = high + s.contrast_poor + s.contrast_dark_poor + s.control_row_mismatch + s.input_icon_inset + s.zero_fill_svg +
  s.empty_slots + s.table_underfill + (staticF.length - staticHigh) + s.overflow_widths + s.scenario_noop.length +
  s.frame_leak + s.pinned_drift + s.chrome_squeeze; // рамка-линии: any-класс до закалки на живых прогонах
finish(verdict, high, any);
