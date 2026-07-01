# Pattern: App-shell (обязательная обвязка приложения)

Любая страница на Гравити начинается с обвязки: провайдер темы + стили. Без неё нет темы и часть компонентов падает в runtime. Тостам нужен отдельный слой. Это первый слой, который кладётся **до** контента — на него ссылаются `recipe-dashboard`, `recipe-landing`, `recipe-settings-form`.

## Скаффолд проекта (tsconfig / Vite) — бери официальный, не сочиняй

Прежде чем писать код — настрой конфиги проекта (`tsconfig.json`, `vite.config.ts`, build-скрипт). Бери их из официального шаблона **`gravity-ui-vite-example`** (github.com/gravity-ui/gravity-ui-vite-example; route — `registry.json` → `scaffold[].docs.upstream`) — у него сборка корректна. **Не сочиняй `tsconfig` руками.**

⚠️ **Грабли `TS6310`** (`error TS6310: Referenced project '…/tsconfig.node.json' may not disable emit`): возникают, когда корневой `tsconfig.json` ставит `"references"` на `tsconfig.node.json`, у которого одновременно `composite: true` и `noEmit: true` (типичный самописный Vite-React-TS scaffold). Это generic-промах, не про Гравити, но он **валит as-emitted сборку** (`tsc && vite build`).

Если апстрим недоступен — используй этот known-good минимум (offline-fallback), он собирается как есть. **Один** `tsconfig.json`, без `references` на composite-проект:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

```ts
// vite.config.ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({plugins: [react()]});
```

Build-скрипт в `package.json`: `"build": "tsc && vite build"`. (Если нужен type-check `vite.config.ts` — добавь его в `include`, **не** заводи отдельный composite node-конфиг с `noEmit`.)

**`src/vite-env.d.ts`** — нужен, если используешь `import.meta.env.*` (напр. dev-gating состояний `import.meta.env.DEV`): одна строка `/// <reference types="vite/client" />`. Без него `import.meta.env` → `tsc` **TS2339** (`Property 'env' does not exist on type 'ImportMeta'`). Официальный `gravity-ui-vite-example` его включает.

**`index.html` в корне проекта** (Vite-конвенция): Vite берёт entry из корневого `index.html`, не из
`vite.config`. Без него — пустая страница / `Could not resolve entry`. Минимум:

```html
<!doctype html>
<html><head><meta charset="UTF-8" /><title>App</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```
> Это **Vite**-scaffold. Next.js / Remix / CRA — другие точки входа (нет корневого `index.html`) + SSR-обвязка
> (`'use client'`, гидратация `ThemeProvider`, стили в layout) — здесь не покрыты (scaffold ориентирован на Vite).

## Минимум: тема + стили

Нужно всегда. Без `ThemeProvider` и импорта `styles.css` компоненты Гравити рендерятся без темы (часть — с ошибками).

```tsx
// src/main.tsx
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

import {App} from './App';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme="light">
    <App />
  </ThemeProvider>,
);
```

- `theme` — `'light'` | `'dark'` | `'light-hc'` | `'dark-hc'`. Для переключателя темы держи значение в state и прокидывай в `ThemeProvider`.
- Порядок импортов стилей: сначала `fonts.css`, потом `styles.css`.
- Кастомная тема / бренд — отдельный слой поверх этого: см. `gravity-foundations/theming` (импорт `.theme.css` **после** `styles.css`; не переопределяй 2-4 токена руками).

## Базовый layout (reset) — чтобы шелл прилегал к краям

Стили uikit **не** обнуляют отступ `body`, не растягивают корень на всю высоту и **не задают `box-sizing: border-box` глобально** (uikit ставит его только на `html`, дальше по дереву — браузерный `content-box`). Без reset: (1) `body { margin: 8px }` оставляет зазор, `AsideHeader` не прилегает к краям; (2) `content-box` ломает грид-раскладки, которые ждут border-box — напр. сетка `@gravity-ui/page-constructor`: паддинги колонок прибавляются к ширине → **горизонтальный оверфлоу + карточки сваливаются 2-в-ряд вместо 3** (verified browser). Добавь глобальный reset:

```css
/* src/index.css */
*, *::before, *::after { box-sizing: border-box; }  /* грид-раскладки (page-constructor) ждут border-box */
html, body, #root {
  height: 100%;
  margin: 0;
}
```

И подключи его в точке входа **после** стилей uikit:

```tsx
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import './index.css';
```

Обязательно для приложений с `AsideHeader` / полноэкранным шеллом (`recipe-dashboard`); для узкой формы по центру — желательно (иначе зазор по краям).

## Тосты (Toaster) — когда есть «Сохранено» / уведомления

Частая ошибка — **`ToasterProvider` без обязательного пропа `toaster`** (без него сборка падает). Полный setup:

```tsx
// src/main.tsx
import {createRoot} from 'react-dom/client';
import {ThemeProvider, Toaster, ToasterProvider, ToasterComponent} from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

import {App} from './App';

const toaster = new Toaster();   // ⚠️ создать экземпляр на верхнем уровне модуля

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme="light">
    <ToasterProvider toaster={toaster}>      {/* ⚠️ обязательный проп toaster */}
      <App />
      <ToasterComponent />                   {/* ⚠️ рендер контейнера тостов */}
    </ToasterProvider>
  </ThemeProvider>,
);
```

Три критичные детали (без любой из них build / runtime падает):

1. `const toaster = new Toaster()` — Toaster это **класс**, а не компонент. Экземпляр создаётся один раз на модуль (не внутри компонента — иначе сбросит state при ререндере).
2. `<ToasterProvider toaster={toaster}>` — проп `toaster` **required**. Без него `tsc`: `Property 'toaster' is missing`.
3. `<ToasterComponent />` внутри Provider — контейнер, в который рендерятся тосты. Без него `useToaster().add(...)` ничего не покажет.

Вызов из компонента:

```tsx
import {useToaster} from '@gravity-ui/uikit';

const {add: addToast} = useToaster();

addToast({name: 'profile-saved', title: 'Сохранено', theme: 'success', autoHiding: 3000});
```

> Не заменяй тост на `console.log` + спиннер ради прохождения сборки — пользователь не увидит подтверждения. Если задача просит confirmation — он должен быть видимым.

## Мобильность (MobileProvider) — когда нужна адаптивность

Часть компонентов (`AsideHeader` и др.) читает контекст мобильности. Если страница должна корректно вести себя на мобильных:

```tsx
import {MobileProvider} from '@gravity-ui/uikit';

<ThemeProvider theme="light">
  <MobileProvider>
    <App />
  </MobileProvider>
</ThemeProvider>
```

## По типам страниц

| Recipe | ThemeProvider | Toaster | MobileProvider |
|---|---|---|---|
| `recipe-landing` | ✅ | обычно не нужен | опц. |
| `recipe-dashboard` | ✅ | если есть действия с фидбэком | ✅ (AsideHeader) |
| `recipe-settings-form` | ✅ | ✅ («Сохранено») | опц. |

## Чего НЕ делать (anti-patterns)

- Рендерить компоненты Гравити без `ThemeProvider` / без импорта `styles.css`.
- Забыть глобальный reset — `*{box-sizing:border-box}` **и** `html, body, #root { height: 100%; margin: 0 }`. Без `border-box` грид page-constructor оверфлоит и сваливает карточки 2-в-ряд; без `margin:0` `AsideHeader` не прилегает к краям вьюпорта.
- `<ToasterProvider>` без `toaster={new Toaster()}`.
- Создавать `new Toaster()` внутри компонента (сброс state при ререндере).
- Глотать `ToasterComponent` — без него тосты не видны.
- Подменять видимое подтверждение `console.log`'ом ради зелёного build.
- Сочинять `tsconfig.json` руками с `references` на composite-проект, у которого `noEmit` → `TS6310`, as-emitted сборка падает (бери scaffold из официального `gravity-ui-vite-example` или держи один tsconfig — см. «Скаффолд проекта» выше).

## See also

- `registry.json` — routing (когда какую либу брать) + версии (`libraries[]` / `bundles[]`).
- Recipes: `recipe-dashboard`, `recipe-landing`, `recipe-settings-form`; бренд / тема — `gravity-foundations/theming`.
