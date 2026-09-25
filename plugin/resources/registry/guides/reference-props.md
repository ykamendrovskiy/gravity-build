# reference-props — где самому читать пропы/типы компонента (route на источники)

> Тип: route-guide. Guides кодифицируют **курированное** (правильные имена, гочи, идиомы), но НЕ дублируют
> полный API. Нужен точный проп / полная форма типа / компонент, которого в guide нет → читай источники САМ
> по этому маршруту. **НЕ подставляй пропы по памяти** — ни при доступном фетче, ни при недоступном.

## Порядок источников (приоритет)

1. **Guide библиотеки** — сперва: там правильные имена и известные ловушки (`library-uikit` «Грабли пропов» и т.п.).
2. **Типы установленного пакета** — истина для `tsc`, работает офлайн, не протухает (версия = та, что стоит):
   вход — `node_modules/@gravity-ui/<пакет>/package.json`, поле `types`; точечно — co-located `.d.ts` по таблице ниже.
   Быстрый поиск пропа: `grep -r "<PropName>" node_modules/@gravity-ui/<пакет>/build/esm/components/<Name>/`.
3. **README компонента в репо @ тег пина** — семантика поверх типов (примеры, deprecated-ноты, таблица пропов):
   `https://raw.githubusercontent.com/gravity-ui/<repo>/v<версия-пина>/src/components/<Name>/README.md`
   — `<repo>` = имя пакета без `@gravity-ui/`; версию бери из `registry.json` (`libraries[].version`), тег = `v` +
   версия без `^` (пин `^7.42.0` → тег `v7.42.0`). У navigation рядом лежит и `README-ru.md`.
   **Исключение ровно одно** (сверено по всем 11 репозиториям на пинах 2026-09-21: у десяти плоский `v<версия>`
   отдаёт 200) — 404 на теге ≠ «доки нет». Кейс **markdown-editor**: репо монорепный, тег =
   `markdown-editor-v<версия>` (`v15.47.0` → 404, `markdown-editor-v15.47.0` → 200); покомпонентных README там
   нет — на теге лежат корневой `README.md` и `AGENTS.md`. Если и префиксная форма 404 → корневой README ровно
   опубликованной версии: `npm view <пакет>@<версия> readme`.
4. **Фетч недоступен** → НЕ гадай и не «дособирай по памяти»: пункта 2 достаточно (пакет уже установлен).

## Где типы в каждом пакете (verified по пинам роутера)

| Библиотека | Вход (`package.json → types`) | Компонент → `.d.ts` |
|---|---|---|
| uikit | `build/cjs/index.d.ts` (esm-зеркало есть) | `build/esm/components/<Name>/<Name>.d.ts` · **плюс `components/lab/<Name>/`** (экспорт через `build/esm/unstable.d.ts` c префиксом `unstable_` — FileDropZone/ColorPicker/Virtualizer/TreeSelect…): листинг ТОЛЬКО верхнего `components/` пропускает lab-компоненты (класс промаха, пойман дважды) |
| components | `build/cjs/index.d.ts` | `build/esm/components/<Name>/<Name>.d.ts` |
| navigation | `build/esm/index.d.ts` | `build/esm/components/<Name>/<Name>.d.ts` (у сложных — вложенная `components/`) |
| table | `build/esm/index.d.ts` | `build/esm/components/Table/Table.d.ts` · хуки: `build/esm/hooks/useTable.d.ts` |
| date-components | `dist/cjs/index.d.ts` **(⚠️ `dist`, не `build`)** | `dist/esm/components/<Name>/…` |
| date-utils | `build/index.d.ts` | — (value-слой, без компонентов) |
| dynamic-forms | `build/esm/index.d.ts` | глубже: `build/esm/lib/core/components/Form/DynamicField.d.ts` |
| markdown-editor | `build/esm/index.d.ts` | готовый редактор: `build/esm/bundle/Editor.d.ts` |
| icons · illustrations | `index.d.ts` **в корне пакета** | `<Name>.d.ts` плоско в корне |
| page-constructor | `build/cjs/index.d.ts` | спец-маршрут (шаблоны JSON + models) → `library-page-constructor` «Где брать конфигурацию блока» |

Route-only либы из `routing[]` (charts / dashkit / aikit / graph / timeline / dialog-fields) — тот же маршрут:
`types` установленного пакета + README/AGENTS.md их репозитория @ установленная версия.

## Чего НЕ делать (anti-patterns)

- **НЕ читать `main`/`master`** — только тег пина: README на main может описывать API новее установленного пакета.
- **НЕ искать per-component README внутри npm-пакета** — в пакеты кладут только корневой README; поштучные — в репо (п.3).
- **Регистр имени файла точный** — raw-URL case-sensitive: `README.md` (не `Readme.md` — будет 404, это не «доки нет»).
- **НЕ принимать `.d.ts` за идиому** — типы говорят «что компилируется», guide/README — «как принято»
  (пример: `column.align` принимает и физические `left`/`right`, но они deprecated — это знает guide, не тип).
- **НЕ хардкодить версии из этой таблицы** — версии живут только в `registry.json`.

## See also

- `reference-interfaces` — эталоны КОМПОЗИЦИИ целых интерфейсов (не пропов).
- `library-page-constructor` «Где брать конфигурацию блока» — спец-маршрут PC (шаблоны + `.d.ts` моделей).
- `library-icons` — офлайн-сабсет имён иконок (имя иконки ≠ проп: сверяй там).
- `AGENTS.md` (companion) — общий fallback при заблокированном фетче.

*Provenance: пути verified npm-pack'ом по пинам роутера (uikit 7.50.1 / navigation 7.0 / page-constructor 8.23.4 / dynamic-forms 5.36 — пересверены
2026-09-25; markdown-editor 15.47 — 2026-09-21; date-utils 2.7.2 — 2026-09-15; table 1.21 / date-components 4.1 —
2026-09-14; остальные 2026-09-01: components 4.24 / icons 2.22 / illustrations 2.1) — поле `types`
и покомпонентные пути сверены у всех 11 пакетов, расхождений нет (date-components 4.1 держит
`types`=`dist/cjs/index.d.ts` и компоненты в `dist/esm/components/`, плюс с v4 везёт AI-доки в `dist/docs/` —
маршрут в `library-dates`; page-constructor 8.23.4 держит `types`=`build/cjs/index.d.ts`; navigation 7.0 везёт AI-доки в `build/docs/` —
маршрут в `library-navigation`); README@tag выборочно:
uikit Button (200 @ v7.50.1), page-constructor (200 @ v8.23.4), navigation AsideHeader (200 @ v7.0.0),
date-components DateField (200 @ v4.1.0), dynamic-forms корневой (200 @ v5.36.0), date-utils корневой
(200 @ v2.7.2), markdown-editor корневой + `AGENTS.md` (200 @ markdown-editor-v15.47.0; плоский `v15.47.0` — 404,
см. п.3). **У table покомпонентных README
в репо нет вовсе** (404 и на 1.20.2, и на 1.21.1 — не «тег отстал»): для него п.3 = корневой README @ тег.*
