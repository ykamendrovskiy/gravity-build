# recipe-landing — Гравити-сборка лендинга (page-constructor)

> Тип: `recipe`. Реализует `pattern-landing` на `@gravity-ui/page-constructor`. Каталог блоков + где брать
> конфиги — `library-page-constructor`. Сначала — `scaffold-app-shell` (Theme + стили). Версии — из `libraries[]`.

## Хочу → бери / не бери

| Хочу | Бери | НЕ бери |
|---|---|---|
| Страницу из блоков | `<PageConstructor content={...}/>` в `<PageConstructorProvider>` | uikit Card+Button+Box руками |
| Hero | `header-block` / `hero-block` | сборку из Box+Background+Button |
| Фичи | `extended-features-block` | uikit Card × N |
| Отзывы | `slider-block` (если не влезают) / `card-layout-block` (если влезают) + sub `Quote` | Card вручную |
| Тарифы | `card-layout-block` + `PriceCard` (выделение плана — `theme`, не `backgroundColor`; детали — `library-page-constructor`) | Card с цифрами руками |
| FAQ | `questions-block` | accordion из Disclosure |
| Финальный CTA | `banner-block` | Card + Button |
| Блока нет в наборе | `custom`-проп PageConstructor | смешение свободного JSX с блоками |

## Setup (обязательно)

```tsx
// src/main.tsx — порядок стилей важен; page-constructor через .scss (нужен sass в devDeps)
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import '@gravity-ui/page-constructor/styles/styles.scss';
// <ThemeProvider theme="light"><App/></ThemeProvider>
```
```tsx
// src/App.tsx
import {PageConstructor, PageConstructorProvider} from '@gravity-ui/page-constructor';
const content = { blocks: [ /* header-block, extended-features-block, slider-block(Quote),
                              card-layout-block(PriceCard), questions-block, banner-block */ ] };
export function App(){ return <PageConstructorProvider><PageConstructor content={content}/></PageConstructorProvider>; }
```
⚠️ `PageConstructorProvider` **обязателен** (без него блоки = `null` / runtime-throw про missing context).
⚠️ Конфиги блоков — из `library-page-constructor` (шаблоны установленного пакета), **не угадывай** (`tsc` кривой конфиг не ловит).

### ⚠️ Vite-конфиг — 2 обязательных фикса (иначе `vite build` падает)

```ts
// vite.config.ts   (npm i -D sass vite-plugin-node-polyfills)
import {nodePolyfills} from 'vite-plugin-node-polyfills';
export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: { alias: [{find: /^~(.*)$/, replacement: '$1'}] },  // PC scss импортит '~@gravity-ui/...'
});
```
1. **`~`-alias** — иначе `ENOENT '~@gravity-ui/uikit/styles/styles.css'` (postcss не резолвит `~` в PC scss).
2. **`nodePolyfills`** — иначе `"parse" is not exported by "__vite-browser-external"` (PC импортит Node-билтин `url`).

(DEV: `slider-block` может встать вертикальным столбиком — добавь `import 'swiper/css'` в entry; **dev-only**, build ок.)

⚠️ **Грид требует `*{box-sizing:border-box}`** в глобальном reset (см. `scaffold-app-shell`). Без него `container-fluid`/колонки считаются в `content-box` (uikit ставит border-box только на `html`) → **горизонтальный оверфлоу на десктопе + карточки 2-в-ряд вместо 3** (`tsc` молчит; ловится только браузером). verified 2026-06-30.

## Чего НЕ делать

Hero руками из Box+Button; своя сетка Card×N вместо `extended-features-block`; `<section>` поверх
`PageConstructor` (он сам layout-движок); забыть `PageConstructorProvider`; `.css` вместо `.scss`.

## See also
`library-page-constructor` (блоки + где брать конфиги) · `pattern-landing` (композиция) · `scaffold-app-shell`
· upstream `AGENTS.md` page-constructor (авторитетно; при расхождении — следовать upstream).
