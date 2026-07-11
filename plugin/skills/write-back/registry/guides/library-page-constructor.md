# Каталог: @gravity-ui/page-constructor — блоки маркетинговых страниц

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
| `card-layout-block` | Сетка карточек (BasicCard / PriceCard / …) |
| `slider-block` | Слайдер card-контента |
| `companies-block` | Полоса логотипов (ОДНА картинка `images:{desktop,mobile}`, не массив) |
| `questions-block` | FAQ-аккордеон |
| `banner-block` | Финальный CTA-баннер |
| `media-block` / `content-layout-block` | Видео/картинка / текст + media |

Sub-блоки (`card-layout`/`slider` `children` — любой sub-блок): `BasicCard`, `Quote`, `PriceCard`, `MediaCard`,
`ImageCard`, `BackgroundCard`, `BannerCard`, `LayoutItem`, `Divider`, `HubspotForm` (+ `PriceDetailed` —
**deprecated → `PriceCard`**). Канон-шаблон `slider-block.json` везёт `basic-card`.

## Грабли угадывания (сверь по шаблону/usage)

- `theme` карточек — `default`/`light`/`dark` (НЕ `'normal'` — это view кнопки uikit).
- Тарифы: `PriceCard` (актуальный) фичи в `list`; `PriceDetailed` (**deprecated → `PriceCard`**) — в `details` (+`items`).
- **Выделение плана:** флага `popular`/`highlighted` у pricing-сабблоков НЕТ. У `PriceCard` `theme`
  (`'default'|'light'|'dark'`) красит **только текст** (в `PriceCard.css` нет `background` на `_theme_`); поверхность —
  отдельный проп `backgroundColor`. Значит `theme:'dark'` **в одиночку = белый текст на прозрачном → невидимо**
  (verified browser+source, PC 8.13). Выделяй: `border: 'line'` (рамка, безопасно; тип `CardBorder` =
  `'shadow'|'line'|'none'` — НЕ boolean, `border: true` не примется типом; verified .d.ts) ЛИБО тёмный
  `backgroundColor` **+ парный** `theme:'dark'` (тёмный фон + белый текст, verified) / светлый `backgroundColor` +
  `theme:'default'`. НЕ ставь `theme:'dark'` без тёмного `backgroundColor`.
- **Кнопки на ТЁМНОМ блоке** (`theme:'dark'` у `header-block`/секции): блок красит только свой текст, а uikit-кнопка
  берёт цвет из `g-root_theme_light` приложения (блок НЕ оборачивает содержимое в `g-root_theme_dark`) →
  `outlined`/`normal` = тёмный текст на тёмном фоне = нечитаемо. Бери **-contrast**-темы:
  `theme:'outlined-contrast'` / `'flat-contrast'` / `'normal-contrast'` (PC `ButtonTheme` = uikit `ButtonView` —
  все -contrast доступны); `action` (жёлтая заливка) читаема как есть. verified browser+source.
- `slider-block` — структура из `templates/slider-block.json` (плоский массив сабблоков). **`slidesToShow` — ЧИСЛО (`2` → 2 на всех брейкпоинтах) ИЛИ объект по брейкпоинтам Гравити (`{sm,md,lg,xl}`); `{desktop,tablet,mobile}` — НЕ те ключи, игнорируются → дефолт 3 узких** (verified source). Требует `import 'swiper/css'` в entry (см. `recipe-landing`) — без него слайды не сжимаются.
- **`slider-block` vs `card-layout-block`:** слайдер — когда набор **не влезает во вьюпорт целиком** (нужен
  горизонтальный скролл). Фиксированный набор, который влезает (3–6 карточек) → `card-layout-block` (статичная
  сетка, по умолч. 3/2/1). Слайдер сам прячет стрелки/точки при `watchOverflow` (мисьюз не ломает визуал, но
  карусель для нескроллящегося контента = неверный примитив).
- **Карточки с БОЛЬШОЙ картинкой СБОКУ от текста** (напр. `quote` с крупным аватаром слева): при 3-в-ряд колонка
  текста схлопывается (~90–120px, нечитаемо; verified browser). **Скоуп правила — только такие карточки.** Варианты
  (что уместнее по подаче): (а) **1 или 2 в ряд** — `slider-block` (`slidesToShow: 1`/`2`; про `swiper/css` + формат
  см. выше) ИЛИ `card-layout-block` `colSizes={{all:12, md:6}}` (2-в-ряд); (б) **перестроить карточку** — картинка
  **сверху** / компактный аватар в футере / без картинки — тогда **3-в-ряд читаемо**. Запрещена именно связка
  «большая боковая картинка + 3-в-ряд», а не 3-в-ряд как таковое (карточки без большой боковой картинки — `PriceCard`,
  `BasicCard` с картинкой сверху — спокойно идут 3-в-ряд).
- **Отзывы/цитаты с подписью — дефолт `basic-card`, НЕ `quote`** (verified браузером): `quote` везёт
  обязательную БОЛЬШУЮ боковую `image` + `logo` → даже 2-в-ряд текст тесен, колонка подписи рвётся в
  слово-на-строку, а большая картинка дублирует аватар подписи. Канон отзыва: `basic-card` — `title` = имя,
  `text` = цитата, **`additionalInfo` = роль/компания** (штатный muted-слот), **аватар — `icon`-слотом**
  (`icon: {src, alt}`, мелкий над заголовком) — картинка возвращается в правильном МАСШТАБЕ, не боковой
  простынёй. `quote` оставляй для случая с настоящим фото-контентом. **NB:** `text` в runtime-конфиге (без
  YFM-трансформ-этапа) рендерится литерально — markdown (`_курсив_`, `\n\n`-абзацы) НЕ работает; подпись — в
  `additionalInfo`, не markdown'ом в text. **NB-2:** тип требует `url` (карточка-ссылка), но `PageContent`
  пермиссивен — без `url` карточка валидно рендерится не-ссылкой (для отзыва так и нужно).
- `companies-block` — ОДНА картинка-полоса, не массив логотипов.
- `quote` — `image` И `logo` обязательны; автор `author:{firstName,secondName,description,avatar}`. Placeholder-SVG для `image`/`logo`: `data:image/svg+xml,`+`encodeURIComponent` (**НЕ `btoa`** — падает на кириллице → пустая страница) **И XML-escape текста** в SVG (`&`→`&amp;`, `<`→`&lt;`) — сырой `&` в названии (напр. «Studio&Co») делает SVG невалидным → битая картинка. Оба бага `tsc`-невидимы, ловятся только браузером.
- Иконки фич — из `@gravity-ui/icons` по смыслу; НЕ внешние CDN, НЕ кривой self-drawn SVG. Self-host (path).

## See also
Сборка лендинга (Provider/SCSS/Vite) — `recipe-landing`. Контракт — `pattern-landing`. Версии — `registry.json` `libraries[]`.
