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
4. **Фетч недоступен** → НЕ гадай и не «дособирай по памяти»: пункта 2 достаточно (пакет уже установлен).

## Где типы в каждом пакете (verified по пинам роутера)

| Библиотека | Вход (`package.json → types`) | Компонент → `.d.ts` |
|---|---|---|
| uikit | `build/cjs/index.d.ts` (esm-зеркало есть) | `build/esm/components/<Name>/<Name>.d.ts` |
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

*Provenance: пути verified 2026-07-02 npm-pack'ом по пинам роутера (uikit 7.42 / components 4.22 / navigation 6.1 /
table 1.15 / date-components 3.4 / date-utils 2.7 / dynamic-forms 5.18 / markdown-editor 15.41 / icons 2.18 /
illustrations 2.1 / page-constructor 8.13); README@tag выборочно: uikit Button, components ConfirmDialog, navigation AsideHeader.*
