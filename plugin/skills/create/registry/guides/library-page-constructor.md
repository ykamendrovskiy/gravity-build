# library-page-constructor — каталог @gravity-ui/page-constructor

> Тип: `library`. Config-driven блоки под лендинги. **docs-режим: route в upstream** — у пакета свои AI-доки;
> точные формы пропов бери оттуда / из установленного пакета, **НЕ угадывай** (тип `PageContent` пермиссивный,
> `tsc` кривой конфиг не поймает — отрендерится частично).

## Где брать конфигурацию блока (приоритет)

1. **Установленный пакет (офлайн, не протухает):**
   - канонический шаблон — `node_modules/@gravity-ui/page-constructor/build/esm/editor/data/templates/<block>.json`
     (copy-paste рабочая структура: `slider-block.json`, `header-block.json`…). **Начинай отсюда.**
   - формы пропов — `…/build/esm/models/constructor-items/{blocks,sub-blocks}.d.ts`.
2. Upstream `AGENTS.md`: github.com/gravity-ui/page-constructor/blob/main/AGENTS.md
3. Поштучные usage-доки: `memory-bank/usage/<componentName>.md` — имя **camelCase** (`headerBlock.md`, не
   `header-block`). Папку сперва листай через GitHub API (raw-URL не листит → 404). Покрыты НЕ все блоки
   (нет `extended-features-block`/`questions-block`) — если usage-дока нет, бери шаблон + `.d.ts`, не ретрай 404.

## Block type reference (частые)

| `type` | Назначение |
|---|---|
| `header-block` | Заголовок секции: title + description + CTA |
| `hero-block` | Full-bleed hero с фоном |
| `extended-features-block` / `promo-features-block` | Фичи: иконка + title + текст |
| `card-layout-block` | Сетка карточек (Quote / PriceCard / …) |
| `slider-block` | Слайдер card-контента |
| `companies-block` | Полоса логотипов (ОДНА картинка `images:{desktop,mobile}`, не массив) |
| `questions-block` | FAQ-аккордеон |
| `banner-block` | Финальный CTA-баннер |
| `media-block` / `content-layout-block` | Видео/картинка / текст + media |

Sub-блоки `card-layout`/`slider`: `BasicCard`, `Quote`, `PriceCard`, `PriceDetailed`, `MediaCard`, `ImageCard`, `BackgroundCard`.

## Грабли угадывания (сверь по шаблону/usage)

- `theme` карточек — `default`/`light`/`dark` (НЕ `'normal'` — это view кнопки uikit).
- Тарифы: `PriceCard` фичи в `list`; `PriceDetailed` — в `details` (+`items` для строк цены).
- `slider-block` — структура из `templates/slider-block.json` (плоский массив сабблоков); `slidesToShow` канон не задаёт.
- `companies-block` — ОДНА картинка-полоса, не массив логотипов.
- `quote` — `image` И `logo` обязательны; автор `author:{firstName,secondName,description,avatar}`.
- Иконки фич — из `@gravity-ui/icons` по смыслу; НЕ внешние CDN, НЕ кривой self-drawn SVG. Self-host (path).

## See also
Сборка лендинга (Provider/SCSS/Vite) — `recipe-landing`. Контракт — `pattern-landing`. Версии — `registry.json` `libraries[]`.
