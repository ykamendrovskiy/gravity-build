#!/usr/bin/env node
// Бутстрап каталога решений: извлекает кандидатов из репо (Next.js pages-router + src/{components,blocks,content,api})
// и пишет черновик catalog.md (формат — catalog-format.md рядом). Ничего не квалифицирует: фразы «что это» —
// заготовки по имени/маршруту, их уточняет скилл catalog по коду. Другие фреймворки — пока вручную по формату.
// usage: node extract-catalog.mjs <repoRoot> [--out <catalog.md>] [--json <candidates.json>]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
// --lint <catalog.md>: проверка формы строк (длина, число граблей на единицу); ничего не пишет
if (args[0] === '--lint') {
  const file = args[1]; const text = fs.readFileSync(file, 'utf8').split('\n');
  let unit = null, gotchas = 0, warns = 0;
  const flushUnit = () => { if (unit && gotchas > 3) { console.log(`WARN ${unit}: граблей ${gotchas} (> 3) — сверни в одну с ссылкой на AUDIT`); warns++; } };
  text.forEach((line, i) => {
    const m = line.match(/^- \*\*([^*]+)\*\*/);
    if (m) { flushUnit(); unit = m[1]; gotchas = 0; }
    if (/^\s+- грабли:/.test(line)) gotchas += line.split(' · ').length;
    const textLen = line.replace(/ · код: `[^`]*`/, '').length; // путь к коду длине не вредит — меряем текст
    if (textLen > 200 && !/^# |^Одна строка|^> /.test(line)) { console.log(`WARN строка ${i + 1} (${textLen} зн. текста): ${line.slice(0, 90)}… — сократи до факта + указателя`); warns++; }
  });
  flushUnit();
  console.log(warns ? `${warns} предупреждений` : 'OK — каталог в форме');
  process.exit(0);
}
const repoRoot = path.resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const outPath = opt('--out') ?? path.join(repoRoot, 'catalog.md');
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

// ── Запись каталога ───────────────────────────────────────────────────────────────────────
const SECTION = {archetype: '## Страницы (по устройству)', wrapper: '## Каркас', block: '## Блоки', component: '## Компоненты', 'content-model': '## Модели контента и данные', 'data-source': '## Источники данных', convention: '## Как принято в репо'};
const ORDER = ['archetype', 'wrapper', 'block', 'component', 'content-model', 'data-source', 'convention'];
const prio = new Set(priority);
const line = (c) => {
  const route = c.route ? `\`${c.route}\` · ` : '';
  const phrase = c.kind === 'convention' ? (c.rule ?? c.title) : `${c.title}${c.usedBy?.length ? ` (используется: ${c.usedBy.length})` : ''} — уточнить: что это / для какой задачи`;
  const code = (c.code ?? []).slice(0, 3).join(', ');
  return `- **${c.id}** — ${route}${phrase} · код: \`${code}\``;
};
const md = [];
md.push(`# Каталог решений — ${pkg.name ?? path.basename(repoRoot)} (черновик бутстрапа, ${new Date().toISOString().slice(0, 10)})`, '');
md.push('Одна строка на единицу: где код · что это · грабли (если наступали). Перед новой страницей сверься с каталогом: что уже есть и как устроено; не изобретай новое без необходимости, а если существующее не подходит — скажи почему. Что построил, что взял отсюда и почему не подошло существующее, на что наступил — допиши сюда.', '');
md.push('> Черновик скрипта: фразы «уточнить…» заполняются по коду (скилл catalog); разделы «Остальное» — кандидаты, которые можно не индексировать.', '');
for (const k of ORDER) {
  const top = candidates.filter((c) => c.kind === k && prio.has(c.id));
  const rest = candidates.filter((c) => c.kind === k && !prio.has(c.id) && !c.signals?.redirectOnly && !c.signals?.infra);
  if (!top.length && !rest.length) continue;
  md.push(SECTION[k], '');
  for (const c of top) md.push(line(c));
  if (rest.length) { md.push('', `<details><summary>Остальное (${rest.length})</summary>`, ''); for (const c of rest) md.push(line(c)); md.push('', '</details>'); }
  md.push('');
}
md.push('## Вне каталога, но существует', '');
for (const c of candidates.filter((c) => c.signals?.redirectOnly || c.signals?.infra)) md.push(`- **${c.id}** — \`${c.route}\` · ${c.signals?.redirectOnly ? 'страница-редирект (client-side replace)' : 'служебный маршрут'} · код: \`${c.code.join(', ')}\``);
md.push('');
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, md.join('\n'));
if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify({candidates, priority}, null, 2) + '\n');
const byKind = {}; for (const c of candidates) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
console.log(`кандидатов: ${candidates.length} ${JSON.stringify(byKind)}; в основной список: ${priority.length}; → ${outPath}`);
