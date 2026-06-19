# Recipe: Landing

Маркетинговая / продуктовая / промо-страница из готовых блоков.

## Хочу → бери / не бери

| Хочу | Бери | НЕ бери | Почему |
|---|---|---|---|
| Страницу из блоков | `@gravity-ui/page-constructor` через `<PageConstructor content={...}/>` внутри `<PageConstructorProvider>` | `@gravity-ui/uikit` Card + Button + Box руками | config-driven библиотека блоков под лендинги |
| Hero (фон, заголовок, CTA) | `type: 'header-block'` или `'hero-block'` | сборку из Box + Background + Button | header-block даёт фон / тёмную тему / раскладки из коробки |
| Секцию «фичи» | `type: 'extended-features-block'` / `'promo-features-block'` | uikit `Card` × N | уже даёт grid + icon + title + body |
| Отзывы | `card-layout-block` / `slider-block` с sub-блоком `Quote` | uikit Card вручную | Quote — реальный sub-block |
| Тарифы | `card-layout-block` с `PriceCard` / `PriceDetailed` | uikit Card с цифрами руками | спец. sub-блоки под тарифы |
| FAQ | `type: 'questions-block'` | accordion из Disclosure руками | FAQ-аккордеон из коробки |
| Финальный CTA | `type: 'banner-block'` | Card + Button руками | промо-баннер с CTA |
| Логотипы клиентов | `type: 'companies-block'` | сетку image вручную | готовый grid логотипов |
| Блок, которого нет в наборе | свой React-компонент через `custom`-проп `PageConstructor` | смешение свободного JSX с блоками | штатная extension-точка |
| Обвязку (Theme, стили) | см. Setup ниже | — | без неё ничего не отрендерится |

## Setup

```tsx
// src/main.tsx
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import '@gravity-ui/page-constructor/styles/styles.scss';   // ⚠️ обязательно для блоков

import {App} from './App';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme="light">
    <App />
  </ThemeProvider>,
);
```

```tsx
// src/App.tsx
import {PageConstructor, PageConstructorProvider} from '@gravity-ui/page-constructor';

const content = {
  blocks: [
    {
      type: 'header-block',
      title: 'Nimbus — деплой приложений без боли',
      description: 'Залейте код — соберём, развернём и масштабируем. Превью-окружение на каждый pull request, откат в один клик.',
      width: 'l',
      buttons: [
        {text: 'Развернуть проект', theme: 'action',   url: '#start'},
        {text: 'Документация',      theme: 'outlined',  url: '#docs'},
      ],
    },
    {
      type: 'extended-features-block',
      title: 'Возможности',
      items: [
        {title: 'Автомасштабирование', text: 'Трафик растёт — инстансы добавляются сами.', icon: 'https://…'},
        {title: 'Preview-окружения',   text: 'Изолированный стенд на каждый PR.',          icon: 'https://…'},
        {title: 'Логи и метрики',      text: 'Наблюдаемость из коробки, без настройки.',    icon: 'https://…'},
        {title: 'Откаты в один клик',  text: 'Любой деплой откатывается мгновенно.',         icon: 'https://…'},
      ],
    },
    // ...slider-block с Quote sub-блоками (отзывы инженеров)
    // ...card-layout-block с PriceCard sub-блоками (тарифы Hobby / Pro / Enterprise)
    // ...questions-block (FAQ про лимиты, регионы, билинг)
    // ...banner-block (финальный CTA «Развернуть первый проект»)
  ],
};

export function App() {
  return (
    <PageConstructorProvider>
      <PageConstructor content={content} />
    </PageConstructorProvider>
  );
}
```

⚠️ **`PageConstructorProvider` обязателен** — без него блоки не рендерятся (контексты темы, мобильности, локали там).

⚠️ **SCSS-стили** — page-constructor использует `.scss` (не `.css`), нужен `sass` в devDependencies. Если Vite не настроен на sass — `npm i -D sass`.

### ⚠️ Vite-конфиг для page-constructor (два обязательных фикса)

page-constructor@8 не собирается под Vite «из коробки» — нужны две настройки, иначе production-build падает:

```ts
// vite.config.ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {nodePolyfills} from 'vite-plugin-node-polyfills'; // npm i -D vite-plugin-node-polyfills

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  resolve: {
    // .scss page-constructor импортит стили через webpack-style `~`:
    // `@import '~@gravity-ui/uikit/...'`. Vite не резолвит `~` без alias.
    alias: [{find: /^~(.*)$/, replacement: '$1'}],
  },
});
```

1. **`~`-alias** — иначе `vite build` падает: `ENOENT ... '~@gravity-ui/uikit/styles/styles.css'` (postcss не резолвит `~`-импорт внутри `page-constructor/styles/styles.scss`).
2. **`vite-plugin-node-polyfills`** — иначе падает: `"parse" is not exported by "__vite-browser-external"` — скомпилированный ESM page-constructor импортит Node-билтин `url` (`build/esm/utils/url.js: import {format, parse} from 'url'`), который Vite экстернализует для браузера.

В `devDependencies` добавь `sass` и `vite-plugin-node-polyfills`.

## ⚠️ Конфигурацию блоков бери из upstream, НЕ угадывай

`type:`-строки ниже — это только список «что есть». **Точную форму пропов каждого блока и sub-блока бери из собственных AI-доков page-constructor**, иначе блок отрендерится частично/криво (а `tsc` это не поймает — тип `PageContent` пермиссивный):

- Корневой `AGENTS.md`: <https://github.com/gravity-ui/page-constructor/blob/main/AGENTS.md>
- Поштучные usage-доки: `memory-bank/usage/<block>.md` — напр. [`priceCard.md`](https://github.com/gravity-ui/page-constructor/blob/main/memory-bank/usage/priceCard.md), `priceDetailed.md`, `quote.md`, `headerBlock.md`.
- Маршрут — `r/library-docs.json` (page-constructor → route на upstream).

**Частые промахи угадывания (проверь по usage-доку):**
- `theme` у карточек — только `default` / `light` / `dark` (НЕ `'normal'` — это view кнопки uikit).
- **Тарифы:** `PriceCard` кладёт фичи в `list`, у `PriceDetailed` — в `details` (+ `items` для строк цены); не сваливай цену в `items` из 1 элемента и не теряй `title`/`details`.
- **`slider-block`** обычно требует `slidesToShow` — без него карточки не складываются в карусель, а встают вертикально.
- **Иконки фич** — не внешние CDN (`iconify`/случайные URL): флакают и не грузятся. Бери из набора page-constructor / Gravity или надёжный self-hosted ассет.

## Block type reference

Самые востребованные для лендинга `type:`-строки. Полный список (~22 блока) — в репозитории `gravity-ui/page-constructor` под `src/blocks/`.

| `type` | Назначение |
|---|---|
| `header-block` | Заголовок секции с title + description + CTA-кнопками |
| `hero-block` | Full-bleed hero с фоном |
| `extended-features-block` | Список фич с иконками + текстом |
| `promo-features-block` | Компактные промо-фичи |
| `card-layout-block` | Сетка карточек (под Quote / PriceCard / etc.) |
| `slider-block` | Слайдер с card-style контентом |
| `companies-block` | Сетка логотипов клиентов |
| `questions-block` | FAQ-аккордеон |
| `banner-block` | Финальный CTA-баннер |
| `media-block` | Видео или картинка |
| `content-layout-block` | Текст + media (две колонки) |

Sub-блоки внутри `card-layout-block` / `slider-block`: `BasicCard`, `Quote`, `PriceCard`, `PriceDetailed`, `MediaCard`, `ImageCard`, `BackgroundCard`.

## Чего НЕ делать (anti-patterns)

- Не собирать Hero руками из `<Box>` + `<Button>`, копируя дизайн с сайта. Используй `header-block`.
- Не делать «свою» сетку фич из `<Card>` × N. Используй `extended-features-block`.
- Не оборачивать каждую секцию в `<section>` поверх `PageConstructor` — он сам layout-движок.
- Не забывать `PageConstructorProvider` — без него блоки рендерятся в `null` или кидают runtime-throw про missing context.
- Не использовать `.css` импорт стилей page-constructor — у них `.scss` (`styles/styles.scss`).

## See also

- **Upstream `AGENTS.md`** page-constructor: <https://github.com/gravity-ui/page-constructor/blob/main/AGENTS.md> — авторитетный гид от команды библиотеки. Если recipe расходится с ним — следовать upstream.
- **Memory bank**: <https://github.com/gravity-ui/page-constructor/tree/main/memory-bank> — детальные usage-доки на блоки.
- `recipes/app-shell.md` — обвязка (Theme + стили). Для лендинга `ToasterProvider` обычно не нужен.
- `r/version-index.json` — версии пакетов.
