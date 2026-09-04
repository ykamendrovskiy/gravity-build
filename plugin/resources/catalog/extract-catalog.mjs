#!/usr/bin/env node
// Бутстрап каталога решений: извлекает кандидатов из репо (Next.js pages-router + src/{components,blocks,content,api})
// и пишет папку catalog/ (index.md + карточки; формат — catalog-format.md рядом). Ничего не квалифицирует: фразы «что это» —
// заготовки по имени/маршруту, их уточняет скилл catalog по коду. Другие фреймворки — пока вручную по формату.
// usage:
//   node extract-catalog.mjs <repoRoot> [--out-dir <repoRoot>/catalog] [--json <candidates.json>]   бутстрап: index.md + карточки
//   node extract-catalog.mjs --index <catalog/>     пересобрать index.md из карточек (после удаления/правки файлов)
//   node extract-catalog.mjs --lint <catalog/>      проверить форму: длина строк, код в дереве
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const CARD_RE = /^- \*\*([^*]+)\*\*/;
const readCards = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !['index.md', 'README.md'].includes(f)).map((f) => ({file: f, text: fs.readFileSync(path.join(dir, f), 'utf8')}));
const cardLine = (text) => (text.split('\n').find((l) => CARD_RE.test(l)) || '').trim();
const cardSection = (text) => ((text.match(/^раздел:\s*(.+)$/m) || [])[1] || 'Прочее').trim();
const SECTIONS = ['Страницы', 'Каркас', 'Блоки', 'Компоненты', 'Модели контента', 'Источники данных', 'Как принято', 'Вне каталога', 'Прочее'];
const TITLES = {'Страницы': '## Страницы (по устройству)', 'Каркас': '## Каркас', 'Блоки': '## Блоки', 'Компоненты': '## Компоненты', 'Модели контента': '## Модели контента и данные', 'Источники данных': '## Источники данных', 'Как принято': '## Как принято в репо', 'Вне каталога': '## Вне каталога, но существует', 'Прочее': '## Прочее'};
const buildIndex = (dir) => {
  const cards = readCards(dir); const by = {};
  for (const c of cards) { const sec = cardSection(c.text); (by[sec] = by[sec] || []).push(cardLine(c.text) || `- **${c.file.replace(/\.md$/, '')}** — (строка индекса не найдена в карточке)`); }
  const out = ['# Каталог решений — индекс (генерируется из карточек; правь карточки, не индекс)', '', 'Что уже есть и из чего собрано. Перед новой страницей сверься: не изобретай новое без необходимости, а если существующее не подходит — скажи почему. Построил новое — добавь карточку.', ''];
  for (const sec of SECTIONS) if (by[sec]) { out.push(TITLES[sec], ''); for (const l of by[sec]) out.push(l); out.push(''); }
  return out.join('\n');
};
// --index <catalog/>
if (args[0] === '--index') { const dir = path.resolve(args[1]); fs.writeFileSync(path.join(dir, 'index.md'), buildIndex(dir)); console.log(`index.md пересобран: ${readCards(dir).length} карточек`); process.exit(0); }
// --lint <catalog/> (или один .md — старый одиночный формат)
if (args[0] === '--lint') {
  const target = path.resolve(args[1]); let warns = 0; const warn = (m) => { console.log('WARN ' + m); warns++; };
  const lintLine = (line, where) => { const textLen = line.replace(/ · код: `[^`]*`/, '').length; if (textLen > 200 && !/^# |^Что уже|^> |^Одна строка/.test(line)) warn(`${where}: строка ${textLen} зн. текста — сократи до факта + указателя: ${line.slice(0, 80)}…`); };
  if (fs.statSync(target).isDirectory()) {
    const repo = path.dirname(target);
    for (const c of readCards(target)) {
      const id = c.file.replace(/\.md$/, '');
      lintLine(cardLine(c.text), id);
      const code = (c.text.match(/^код:[ \t]*(.+)$/m) || [])[1];
      if (code) for (const f of code.split(',').map((x) => x.trim().split(' ')[0].replace(/\/\*$/, '')).filter((x) => /[\/.]/.test(x) && !/[<>\[\]*()]/.test(x))) { if (!fs.existsSync(path.join(repo, f))) warn(`${id}: код не найден в дереве: ${f}`); }
    }
    const idx = path.join(target, 'index.md'); if (fs.existsSync(idx)) fs.readFileSync(idx, 'utf8').split('\n').forEach((l, i) => lintLine(l, `index.md:${i + 1}`));
  } else {
    fs.readFileSync(target, 'utf8').split('\n').forEach((line, i) => lintLine(line, `строка ${i + 1}`));
  }
  console.log(warns ? `${warns} предупреждений` : 'OK — каталог в форме'); process.exit(0);
}
const repoRoot = path.resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const outDir = opt('--out-dir') ?? path.join(repoRoot, 'catalog');
const jsonPath = opt('--json');

const exists = (p) => fs.existsSync(path.join(repoRoot, p));
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8');
const walk = (d) => { const abs = path.join(repoRoot, d); if (!fs.existsSync(abs)) return []; return fs.readdirSync(abs, {withFileTypes: true}).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); };
const rel = (p) => p.split(path.sep).join('/');
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '');

const candidates = [];
const add = (c) => { if (!candidates.some((x) => x.id === c.id)) candidates.push(c); };

// ── 1. Страницы → архетипы (группировка по главному компоненту страницы) ──────────────────────
const pages = walk('src/pages').filter((f) => /\.tsx$/.test(f) && !/\/_(app|document)\.tsx$|\/api\//.test(f));
const pageInfo = [];
for (const f of pages) {
  const src = read(f);
  const route = '/' + rel(f).replace(/^src\/pages\//, '').replace(/\/index\.tsx$|\.tsx$/, '');
  const imports = [...src.matchAll(/import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+'([^']+)'/g)]
    .map((m) => ({names: (m[1] ?? m[2]).split(',').map((s) => s.trim().split(' as ').pop()).filter(Boolean), from: m[3]}));
  const localComps = imports.filter((i) => /components|blocks/.test(i.from)).flatMap((i) => i.names.map((n) => ({n, from: i.from})));
  const jsxTags = new Set([...src.matchAll(/<([A-Z][A-Za-z0-9.]*)/g)].map((m) => m[1].split('.')[0]));
  const main = localComps.filter((c) => jsxTags.has(c.n) && !/^(Layout|Link|Head)$/.test(c.n)).map((c) => c.n);
  const ssr = /getServerSideProps|getStaticProps/.test(src);
  const redirectOnly = /router\.replace\(/.test(src) && main.length === 0;
  pageInfo.push({file: rel(f), route, main, ssr, redirectOnly});
}
const groups = new Map();
for (const p of pageInfo) {
  if (p.redirectOnly) continue;
  p.infra = /^\/(404|health|sitemap\.xml|__stand)$/.test(p.route);
  const key = p.main.length ? p.main.slice().sort().join('+') : `page:${p.route}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(p);
}
for (const [key, ps] of groups) {
  const name = key.startsWith('page:') ? path.basename(ps[0].route || 'home') || 'home' : key.split('+')[0];
  const compFiles = key.startsWith('page:') ? [] : key.split('+').map((n) => walk('src/components').concat(walk('src/blocks')).find((f) => new RegExp(`/${n}/${n}\\.tsx$|/${n}\\.tsx$`).test(f))).filter(Boolean).map(rel);
  add({id: `archetype-${kebab(name)}`, kind: 'archetype', title: `страницы одной механики (главный компонент: ${key.startsWith('page:') ? 'inline' : key})`, route: ps.map((p) => p.route).join(', '), code: [...ps.map((p) => p.file), ...compFiles], signals: {pages: ps.length, ssr: ps.every((p) => p.ssr), redirectOnly: false, infra: ps.every((p) => p.infra)}});
}
for (const p of pageInfo.filter((p) => p.redirectOnly)) add({id: `redirect-${kebab(p.route || 'root')}`, kind: 'archetype', title: `Редирект-страница ${p.route} (client-side replace)`, route: p.route, code: [p.file], signals: {pages: 1, ssr: p.ssr, redirectOnly: true}});

// ── 2. Кастомные блоки page-constructor ─────────────────────────────────────────────────────
const blocksDirs = fs.existsSync(path.join(repoRoot, 'src/blocks')) ? fs.readdirSync(path.join(repoRoot, 'src/blocks'), {withFileTypes: true}).filter((e) => e.isDirectory()).map((e) => e.name) : [];
const propsOf = (file) => { try { const s = read(file); const m = s.match(/(?:type|interface)\s+\w*Props\w*\s*=?\s*(?:\w+\s*&\s*)?\{([\s\S]*?)\n\};?/); if (!m) return {}; const o = {}; for (const l of m[1].split('\n')) { const mm = l.match(/^\s*(\w+)\??:\s*(.+?);?\s*$/); if (mm) o[mm[1]] = mm[2].slice(0, 60); } return o; } catch { return {}; } };
for (const b of blocksDirs) {
  const main = walk(`src/blocks/${b}`).find((f) => /\.tsx$/.test(f) && !/Wrapper|types/.test(f));
  if (!main) continue;
  add({id: `block-${kebab(b)}`, kind: 'block', title: `PC-блок ${b}`, code: [`src/blocks/${b}/`], props: propsOf(rel(main)), signals: {customBlock: true}});
}

// ── 3. Компоненты и обёртки ────────────────────────────────────────────────────────────────
const compDirs = fs.existsSync(path.join(repoRoot, 'src/components')) ? fs.readdirSync(path.join(repoRoot, 'src/components'), {withFileTypes: true}).filter((e) => e.isDirectory()).map((e) => e.name) : [];
for (const c of compDirs) {
  const main = walk(`src/components/${c}`).find((f) => new RegExp(`/${c}\\.tsx$`).test(f)) ?? walk(`src/components/${c}`).find((f) => /\.tsx$/.test(f));
  if (!main) continue;
  const kind = /Layout|Provider|Wrap|Scrollbar/.test(c) ? 'wrapper' : 'component';
  add({id: `${kind}-${kebab(c)}`, kind, title: `${kind === 'wrapper' ? 'Обёртка' : 'Компонент'} ${c}`, code: [`src/components/${c}/`], props: propsOf(rel(main)), signals: {}});
}

// ── 4. Модели контента ─────────────────────────────────────────────────────────────────────
// Модель = верхний уровень src/content (папка с index/types или отдельный файл/yaml); вложенные конфиги (uikit/Button/…) — экземпляры, не модели
const contentTop = fs.existsSync(path.join(repoRoot, 'src/content')) ? fs.readdirSync(path.join(repoRoot, 'src/content'), {withFileTypes: true}) : [];
for (const e of contentTop) {
  const p = `src/content/${e.name}`;
  if (e.isDirectory()) { const files = walk(p); const idx = files.find((f) => /\/(index|types)\.ts$/.test(f)); add({id: `data-${kebab(e.name)}`, kind: 'content-model', title: `Модель контента ${e.name} (${files.length} файлов)`, code: [p + '/'], signals: {files: files.length, hasTypes: files.some((f) => /\/types\.ts$/.test(f))}}); }
  else if (/\.(ts|ya?ml)$/.test(e.name) && !/^types\.ts$/.test(e.name)) { const name = e.name.replace(/\.(ts|ya?ml)$/, '').replace(/-(en|ru|es|zh|fr|de|ko|pt|ja)$/, ''); add({id: `data-${kebab(name)}`, kind: 'content-model', title: `Контент ${name}`, code: [p], signals: {yaml: /\.ya?ml$/.test(e.name)}}); }
}

for (const f of ['src/libs.ts', 'src/libs.mjs', ...walk('src/data')].filter((f) => exists(f) && /\.(ts|mjs|json)$/.test(f))) add({id: `data-${kebab(path.basename(f).replace(/\.(ts|mjs|json)$/, ''))}`, kind: 'content-model', title: `Данные ${rel(f)}`, code: [rel(f)], signals: {dataFile: true}});

// ── 5. Источники данных (серверные методы) ──────────────────────────────────────────────────
for (const f of walk('src/api').filter((f) => /\.ts$/.test(f))) {
  const src = read(f);
  for (const m of src.matchAll(/async\s+(fetch\w+|get\w+)\s*\(/g)) add({id: `data-source-${kebab(m[1])}`, kind: 'data-source', title: `Серверный метод ${m[1]}`, code: [rel(f)], source: {what: m[1], path: `${rel(f)} ${m[1]}`}, signals: {external: /github|npm|octokit|fetch\(/i.test(src)}});
}
for (const f of walk('src/pages/api')) add({id: `data-source-api-${kebab(path.basename(f, path.extname(f)))}`, kind: 'data-source', title: `API-роут ${rel(f)}`, code: [rel(f)], source: {what: 'api route', path: rel(f)}, signals: {external: true}});

// ── 6. Конвенции (эвристики по признакам репо) ──────────────────────────────────────────────
const pkg = exists('package.json') ? JSON.parse(read('package.json')) : {scripts: {}};
if (exists('.husky') || pkg.scripts?.lint) add({id: 'conv-lint-gates', kind: 'convention', title: 'Проверки репо (lint/typecheck/husky)', code: ['package.json'], rule: `Скрипты: ${Object.keys(pkg.scripts ?? {}).filter((s) => /lint|typecheck|test/.test(s)).join(', ')}${exists('.husky') ? '; husky pre-commit' : ''}`, where: ['package.json', '.husky/'], signals: {}});
if (exists('public/locales')) add({id: 'conv-i18n', kind: 'convention', title: 'Локали и i18n-ключи', code: ['public/locales/'], rule: `Локали: ${fs.readdirSync(path.join(repoRoot, 'public/locales')).join(', ')}; namespaces: ${[...new Set(walk('public/locales').map((f) => path.basename(f, '.json')))].slice(0, 12).join(', ')}`, where: ['public/locales/**'], signals: {}});
if (walk('src/components').some((f) => f.endsWith('.scss'))) add({id: 'conv-styles', kind: 'convention', title: 'Стили компонентов (.scss рядом, BEM-хелпер block())', code: ['src/components/', exists('src/mixins.scss') ? 'src/mixins.scss' : ''].filter(Boolean), rule: 'Каждый компонент — свой .scss; классы через block(); миксины/брейкпоинты — src/mixins.scss', where: ['src/components/**/*.scss'], signals: {}});
const exampleDirs = walk('src/content').filter((f) => /examples\/components\/.*\.tsx$/.test(f));
if (exampleDirs.length) add({id: 'conv-live-examples', kind: 'convention', title: 'Живые примеры для документации', code: [rel(path.dirname(exampleDirs[0])) + '/'], rule: `Примеры — файлы *Example.tsx в ${rel(path.dirname(exampleDirs[0]))} (${exampleDirs.length} шт.)`, where: ['src/content/**/examples/components/**'], signals: {}});
const nextCfg = exists('next.config.js') ? read('next.config.js') : '';
add({id: 'conv-routing', kind: 'convention', title: 'Маршрутизация и переезды адресов', code: ['next.config.js', exists('src/middleware.ts') ? 'src/middleware.ts' : ''].filter(Boolean), rule: `redirects() в next.config.js: ${/redirects\s*\(/.test(nextCfg) ? 'есть' : 'нет'}; middleware: ${exists('src/middleware.ts') ? 'есть' : 'нет'}`, where: ['next.config.js'], signals: {}});

// ── 7. usedBy по импортам (упрощённая версия validate-kit) + приоритет ──────────────────────
const srcFiles = walk('src').filter((f) => /\.(tsx?|mdx?)$/.test(f));
const importsOf = new Map();
for (const f of srcFiles) { const txt = read(f); importsOf.set(rel(f), [...txt.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]).filter((s) => s.startsWith('.') || s.startsWith('src/')).map((i) => rel(i.startsWith('src/') ? i : path.join(path.dirname(f), i)))); }
const HUB = /(^|\/)(utils|api|hooks)\/|(^|\/)libs\.(ts|mjs)$|\/types\.ts$|\/constants\.ts$/;
const resolveDeep = (f, seen = new Set()) => { if (seen.has(f)) return seen; seen.add(f); for (const i of importsOf.get(f) ?? []) { const cand = [i, i + '.ts', i + '.tsx', i + '/index.ts', i + '/index.tsx'].find((c) => importsOf.has(c)); if (cand) resolveDeep(cand, seen); } return seen; };
const pageFiles = pageInfo.map((p) => p.file);
for (const c of candidates) {
  if (c.kind === 'archetype') { c.usedBy = c.code.filter((x) => x.startsWith('src/pages/')); continue; }
  const codeFiles = c.code.filter((x) => !HUB.test(x));
  c.usedBy = codeFiles.length ? pageFiles.filter((p) => [...resolveDeep(p)].some((d) => codeFiles.some((x) => d === x || d.startsWith(x)))) : [];
}
// Приоритет: архетипы с реальными страницами · кастомные блоки · конвенции · компоненты/обёртки с usedBy ≥ 3 · внешние источники, которые кто-то использует
const priority = candidates.filter((c) =>
  (c.kind === 'archetype' && !c.signals?.redirectOnly && !c.signals?.infra) ||
  c.signals?.customBlock ||
  c.kind === 'convention' ||
  ((c.kind === 'component' || c.kind === 'wrapper' || c.kind === 'content-model') && (c.usedBy?.length ?? 0) >= 3) ||
  (c.kind === 'data-source' && c.signals?.external && (c.usedBy?.length ?? 0) >= 1)
).map((c) => c.id);

// ── Запись каталога: папка с карточками + index.md ─────────────────────────────────────────
const SEC_OF = {archetype: 'Страницы', wrapper: 'Каркас', block: 'Блоки', component: 'Компоненты', 'content-model': 'Модели контента', 'data-source': 'Источники данных', convention: 'Как принято'};
const prio = new Set(priority);
const line = (c) => {
  const route = c.route ? `\`${c.route}\` · ` : '';
  const phrase = c.kind === 'convention' ? (c.rule ?? c.title) : `${c.title} — уточнить`;
  return `- **${c.id}** — ${route}${phrase} · код: \`${(c.code ?? []).slice(0, 3).join(', ')}\``;
};
fs.mkdirSync(outDir, {recursive: true});
let written = 0;
for (const c of candidates) {
  if (c.signals?.redirectOnly || c.signals?.infra) continue;
  if (!prio.has(c.id)) continue; // «Остальное» в карточки не пишем — только в json (кандидаты на квалификацию)
  const card = [`# ${c.id}`, line(c), `код: ${(c.code ?? []).join(', ')}`, `раздел: ${SEC_OF[c.kind] ?? 'Прочее'}`, 'ссылки:', ''].join('\n');
  const file = path.join(outDir, `${c.id}.md`); if (!fs.existsSync(file)) { fs.writeFileSync(file, card); written++; }
}
const rest = candidates.filter((c) => !prio.has(c.id) && !c.signals?.redirectOnly && !c.signals?.infra);
fs.writeFileSync(path.join(outDir, 'index.md'), buildIndex(outDir));
if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify({candidates, priority}, null, 2) + '\n');
const byKind = {}; for (const c of candidates) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
console.log(`кандидатов: ${candidates.length} ${JSON.stringify(byKind)}; карточек создано: ${written}; вне основного списка (в --json): ${rest.length}; → ${outDir}`);
