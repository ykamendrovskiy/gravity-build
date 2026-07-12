# Каталог: markdown-editor — обвязка встраивания и грабли (hard-parts)

> Тонкий guide (ADR-0005): только выверенная обвязка + грабли, которых README не говорит. Полный API —
> upstream-дока по маршруту роутера (`libraries[]`). Ставь **весь bundle** из `registry.json` (editor тянет
> components + ~12 peer-deps, npm сам их не поставит).

## Минимальная вкрутка (verified живой сборкой)

```tsx
import {useMarkdownEditor, MarkdownEditorView} from '@gravity-ui/markdown-editor';

const editor = useMarkdownEditor({initial: {markup: value}}); // WYSIWYG — дефолт; создаётся ОДИН раз
editor.on('change', () => onValueChange(editor.getValue()));  // синк наружу — событием, не пропом

<MarkdownEditorView editor={editor} stickyToolbar={false} />
```

## Грабли (все verified)

- **`ToasterProvider` обязателен** — без него runtime-throw из `useToaster` (README молчит). Setup
  Toaster'а — `scaffold-app-shell`.
- **`stickyToolbar` — required-проп** `MarkdownEditorView` (не опустить).
- **CSS руками НЕ импортировать** — стили приезжают side-effect-импортами из JS редактора (Vite подхватывает).
- **Высоту ограничивай снаружи**: обёртка `height + min-width:0`; корень редактора берёт `height:100%`,
  тулбар flex-none, контент — `overflow-y:auto`. Иначе редактор распирает колонку.
- **Прикрепление файлов** (скрепка) не появится без `handlers.uploadFile`.
- **Build-варнинги не-фейлящие** (не чинить): externalized node-builtins, `eval` в @diplodoc/cut+tabs,
  chunks>500kB.
- **Цена бандла**: полный preset тянет ProseMirror+CodeMirror+diplodoc (≈+3.3 MB JS, gzip ≈+1 MB) — для
  прототипа приемлемо; прод — вопрос preset/code-split.
- **Docs-first @ пин**: git-теги репозитория отстают от npm-релизов (README@tag может дать 404 при живом
  пине) → `npm view @gravity-ui/markdown-editor@<пин> readme` (общий маршрут — `reference-props`).

## See also

- `scaffold-app-shell` — Toaster-обвязка. `reference-props` — README@пин fallback через npm view.
- `figma-mapping` «Reply/редактор-зоны» — когда макет рисует компакт-композер.

*Provenance: вкрутка S2 (2026-07-05) в живую сборку-почтовик (перенос Figma-макета): bundle встал чисто
поверх uikit@7 first-pass, tsc/build 0, гейт чист, markdown-сериализация верифицирована интерактивом.*
