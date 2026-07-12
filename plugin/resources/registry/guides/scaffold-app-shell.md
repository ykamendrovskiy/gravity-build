# Scaffold: App-shell (обязательная обвязка приложения)

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

Стили uikit **не** обнуляют отступ `body`, не растягивают корень на всю высоту и **не задают `box-sizing: border-box` глобально** (uikit ставит его только на `html`, дальше по дереву — браузерный `content-box`). Без reset: (1) `body { margin: 8px }` оставляет зазор, `AsideHeader` не прилегает к краям; (2) `content-box` ломает грид-раскладки, которые ждут border-box — напр. сетка `@gravity-ui/page-constructor`: паддинги колонок прибавляются к ширине → **горизонтальный оверфлоу + карточки сваливаются 2-в-ряд вместо 3** (verified browser); (3) `<ul>`/`<ol>` наследуют UA `padding-inline-start: 40px` — uikit `Stepper` это `<ol>`, без сброса **уезжает вправо на 40px** (verified). Добавь глобальный reset:

```css
/* src/index.css */
*, *::before, *::after { box-sizing: border-box; }  /* грид-раскладки (page-constructor) ждут border-box */
html, body, #root {
  height: 100%;
  margin: 0;
}
ul, ol { margin: 0; padding: 0; }  /* uikit Stepper — это <ol>; без сброса наследует UA padding-inline-start:40px и уезжает вправо */
```

И подключи его в точке входа **после** стилей uikit:

```tsx
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import './index.css';
```

Обязательно для приложений с `AsideHeader` / полноэкранным шеллом (`recipe-dashboard`); для узкой формы по центру — желательно (иначе зазор по краям).

## Сценарии состояний (dev-переключатель + манифест) — чтобы состояния были достижимы

Контракт состояний твоего паттерна (empty / loading / error / …) должен быть **достижим** — разработчику,
ревьюеру и автопроверке (гейту) — но НЕ прод-контролом (дисциплина — `interface-foundations` «Состояния в DEV»).
Каноническая идиома:

```tsx
// src/scenarios.ts
export const SCENARIOS_ON = import.meta.env.DEV || !!import.meta.env.VITE_SCENARIOS;
export const scenario = SCENARIOS_ON
  ? (new URLSearchParams(location.search).get('scenario') ?? 'ideal')
  : 'ideal';
```

- В обычном `vite build` переключатель **мёртв** (`SCENARIOS_ON` сворачивается в false; URL-параметр
  игнорируется, dev-ветки не рендерятся) — критерий ПОВЕДЕНЧЕСКИЙ, не байтовый: строки-маркеры могут
  оставаться в чанке (у esbuild/terser по-разному) — проверяй «панель/сценарии не работают в plain»,
  не grep по бандлу. С `VITE_SCENARIOS=1 vite build` — живой. Это снимает конфликт «Tier 1 / гейт гоняются через
  `vite preview` (прод-билд), где `import.meta.env.DEV` уже false»: **сборка для гейта/ревью —
  `VITE_SCENARIOS=1 npm run build`**, демо/прод-сборка остаётся чистой.
- Требует `src/vite-env.d.ts` (см. «Скаффолд проекта» — иначе TS2339).

**Манифест сценариев** — декларация «какие состояния у сборки есть и как их достичь» (self-describing build;
его читает headless-гейт и обходит все состояния, не только начальный роут):

```jsonc
// scenarios.manifest.json — в КОРНЕ проекта (рядом с package.json)
{
  "version": 1,
  "param": "scenario",
  "default": "ideal",
  "scenarios": ["ideal", "empty", "loading", "error", "filter-empty"],
  // опционально: человеческие имена для прото-панели (гейт их игнорирует)
  "labels": {"ideal": "1 — данные загружены", "empty": "2 — пусто"},
  // опционально: floor ширины (figma-mapping) — overflow ниже него гейт
  // классифицирует как объявленную политику адаптива, не находку
  "intendedMinWidth": 1000
}
```

- id сценариев = контракт состояний паттерна (`pattern-list` / `pattern-dashboard`: empty / loading / error /
  filter-empty; форма: submit-pending / submit-error; многошаговый флоу: step-2 / done — любое состояние,
  в которое сборка умеет прыгнуть по `?scenario=<id>`).
- **Декларируй только реализованное:** каждый id обязан реально переключать UI. Задекларированный, но не
  реализованный сценарий хуже отсутствия манифеста — гейт пойдёт по нему судить.
- **Интеракционные сценарии (submit-pending / submit-error / done) обязаны ПРЕСЕТИТЬ состояние на загрузке**,
  а не только менять поведение API после клика (иначе DOM = ideal → noop). Идиома `FILLED_PRESET`
  (verified): валидно заполненный стейт формы + инициализатор статуса по сценарию:
  ```tsx
  const preset = SCENARIOS_ON ? scenario : 'ideal';
  const [form, setForm] = useState(preset === 'ideal' ? EMPTY_FORM : FILLED_PRESET);
  const [status, setStatus] = useState<Status>(
    preset === 'submit-pending' ? 'pending' : preset === 'submit-error' ? 'error' : 'idle');
  ```
- Чисто статическая страница без асинхронных данных (лендинг) — манифест не нужен.
- **Оверлейные состояния (меню / диалог / шторка) делай управляемыми** (`open`-проп из пресета) — иначе
  сценарий недостижим. Вложенное hover-подменю `DropdownMenu` НЕ пресетится URL-параметром: вместо
  подменю переключай `items` того же управляемого меню (и гаси авто-закрытие в тике переключения —
  флаг + `setTimeout(0)`-сброс). Гочи controlled-`DropdownMenu` (апдейтер в `onOpenToggle`,
  тултип-перехват) — `library-uikit` «Грабли вёрстки». (verified S4-сборкой + гейтом)
- **Transient-фидбек (тост) как часть задекларированного состояния не должен исчезать:** в пресете зови
  `toaster.add({..., autoHiding: false})` — состояние обязано СТОЯТЬ для гейта и стейкхолдера; в живом
  флоу (после клика) — дефолтное автоскрытие.

## Прото-панель (человеческая поверхность манифеста)

**Политика: панель — ДЕФОЛТ для сборки со сценарным манифестом** (есть манифест → есть панель):
в прод-билде она мертва вместе со сценариями, в дев/гейт-билде даёт просмотр состояний и тему —
цена нулевая, польза постоянная. Не добавляй только если пользователь явно попросил «без панели»
(пропуск помечай, как эскейп «без проверки»); чисто статическая сборка без манифеста панели
не имеет по определению. Вид/состав ручек — профильная ось.

Панель = Select сценариев (имена из `labels`) + Switch темы. Контракт (verified S4-сборкой +
двусторонним A/B гейта):

- живёт ТОЛЬКО при `SCENARIOS_ON` (в plain-билде мертва вместе со сценариями); `?panel=0` прячет;
- **маркер `data-proto-panel` на корне ОБОИХ видов** (панель И свёрнутый чип) — контракт с headless-гейтом:
  поддерево исключается из аудитов и из noop-подписи (без выреза Select с именем текущего сценария
  делает DOM всех сценариев разным и ослепляет noop-детектор);
- переключение сценария = запись URL-параметра с перезагрузкой (сценарии ПРЕСЕТЯТ начальное состояние;
  живой свап без перемонтирования даст смесь состояний);
- сворачивание в чип кнопкой в шапке + **полное скрытие по `⌘+.` / `Ctrl+.`** (как скрытие UI в
  Figma-прототипах; подсказку шортката держи строкой в панели — тултип с чужим действием врёт);
- угол выбирай от занятости кадра: тосты uikit живут bottom-right; тема = поднятое состояние
  `<ThemeProvider>` (не хардкод в main).

Каркас: `Card(fixed, data-proto-panel) → [шапка: Text + Button-шеврон] + Select(labels) + Switch(тема) +
Text-подсказка «⌘+.»`; чип: `div[data-proto-panel] → Button view="raised" + Icon(Sliders)`.

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
- Забыть глобальный reset — `*{box-sizing:border-box}`, `html, body, #root { height:100%; margin:0 }` **и** `ul,ol{margin:0;padding:0}`. Без `border-box` грид page-constructor оверфлоит и сваливает карточки 2-в-ряд; без list-reset `Stepper` (`<ol>`) уезжает вправо на 40px; без `margin:0` `AsideHeader` не прилегает к краям вьюпорта.
- `<ToasterProvider>` без `toaster={new Toaster()}`.
- Создавать `new Toaster()` внутри компонента (сброс state при ререндере).
- Глотать `ToasterComponent` — без него тосты не видны.
- Подменять видимое подтверждение `console.log`'ом ради зелёного build.
- Сценарий-переключатель без гейтинга (`import.meta.env.DEV || VITE_SCENARIOS`) — прод-UI не место контролу состояний; и `scenarios.manifest.json` с id, которые ничего не переключают.
- Сочинять `tsconfig.json` руками с `references` на composite-проект, у которого `noEmit` → `TS6310`, as-emitted сборка падает (бери scaffold из официального `gravity-ui-vite-example` или держи один tsconfig — см. «Скаффолд проекта» выше).

## See also

- `registry.json` — routing (когда какую либу брать) + версии (`libraries[]` / `bundles[]`).
- Recipes: `recipe-dashboard`, `recipe-landing`, `recipe-settings-form`; бренд / тема — `gravity-foundations/theming`.
