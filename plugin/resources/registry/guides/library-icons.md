# Каталог: icons (@gravity-ui/icons)

Набор иконок Гравити: ~**781 SVG**, каждая доступна как React-компонент. Рендерь через uikit `Icon`. Нет upstream AI-доков; **имена иконок легко выдумать** — проверяй по showcase, не сочиняй.

## Импорт

Три способа (из README upstream):

```tsx
import {Cloud} from '@gravity-ui/icons';        // именованный (удобно для нескольких)
import Cloud from '@gravity-ui/icons/Cloud';     // дефолтный deep-import (тоньше для tree-shaking)
import cloudIcon from '@gravity-ui/icons/svgs/cloud.svg';  // сырой SVG (нужен svg-loader)
```

## Рендер через uikit Icon

Иконка передаётся в проп **`data`**, не как children:

```tsx
import {Icon, Button} from '@gravity-ui/uikit';
import {Plus, Gear} from '@gravity-ui/icons';

<Icon data={Gear} size={16} />
<Button><Icon data={Plus} size={16} /> Добавить</Button>
```

- `size` — пиксели (частые: 16, 18, 20).
- Имена React-компонентов — PascalCase; SVG-файлы в наборе — kebab-case (`cloud.svg` → `Cloud`, `circle-check.svg` → `CircleCheck`).
- Тип иконки (если типизируешь свой проп под иконку) — **`IconData`** из `@gravity-ui/uikit` (не `SVGIconData`): `import type {IconData} from '@gravity-ui/uikit'`.

## Иконка в контроле — слот + размер

Как Гравити ждёт иконку **в контроле** (проверено по исходникам uikit@7.42). Применяй широко.

**Правильный слот + ручной размер:**
- **Отступы:** в `Button` слот центрирует/отбивает сам. **В инпутах (`startContent`) — НЕ автоматом:** uikit-слот
  тесный (~1px by design) → лидирующая иконка жмётся к краю, отбей её (см. «Инсет старт-иконки» ниже).
- **Размер — руками.** Контрол НЕ ресайзит иконку (нет CSS-правила на `svg`); `Icon` без `size` падает на
  viewBox ≈16px → одинаковая иконка во всех размерах = баг. Ставь `<Icon size={N}/>` по шкале контрола.

**Слоты (куда класть иконку):**

| Контрол | Слот | NB |
|---|---|---|
| `Button` | просто `children` (детектится авто) | оборачивать не надо |
| `TextInput` | `startContent` / `endContent` | **НЕ** `leftContent`/`rightContent` |
| `Label` | проп `icon` | — |

**Размер `<Icon size>` по размеру контрола — рекомендованная ручная шкала:**

| size | xs | s | m | l | xl |
|---|---|---|---|---|---|
| **Button** | 12 | 14 | 16 | 16 | 20 |
| **Label** (размеры xxs–m) | 12 (xxs/xs) | 14 (s) | 16 (m) | — | — |
| **TextInput / инпуты** | — | 14–16 | 16 | 16 | 20 |

```tsx
<Button size="l"><Icon data={Plus} size={16}/> Добавить</Button>
<TextInput size="m" startContent={<Icon data={Magnifier} size={16}/>} />
<Label size="s" icon={<Icon data={Tag} size={14}/>}>тег</Label>
```

⚠️ **Шкала НЕ применяется автоматически — это рекомендация, размер ставишь сам** (проверено по uikit@7.42):
`BUTTON_ICON_SIZE_MAP` (`Button/constants.ts`) существует с этими значениями, но **нигде не используется**
(мёртвый экспорт); `Label.iconSizeMap` (`Label/Label.tsx`) рулит только встроенными `copy`/`info`/`close`, не
пользовательским `icon`; у `Icon` нет CSS-размера svg (`Icon.scss` = `line-height:0`, без `width`/`height`) →
без `size` иконка падает на viewBox ≈16px. Инпутообразные (`TextInput`/`NumberInput`/`PinInput`/date-*) ведут
себя как кнопки: слот иконку **не сайзит** (про инсет старт-иконки — ниже).
Шкала — универсальный дефолт; сервис может переопределить размеры под свою плотность (profile → `dimensions` density).

## Инсет старт-иконки в инпутах (lab-repro 2026-06-29)

uikit `startContent`-слот **тесный** — `padding-inline-start: 1px` by design («spacing relies on parent padding»,
`TextInput.scss`); отдельного пропа на инсет нет → лидирующая иконка жмётся к краю. **Отбей её обёрткой:**

```tsx
<TextInput size="m" startContent={
  <span style={{display: 'inline-flex', alignItems: 'center',
               paddingInlineStart: 'var(--g-spacing-2)',   // ЛЕВЫЙ инсет по размеру контрола (таблица ниже)
               paddingInlineEnd: 'var(--g-spacing-1)'}}>    // небольшой зазор до текста
    <Icon data={Magnifier} size={16}/>
  </span>
}/>
```

**Правило:** инсет зависит от **размера иконки** (а значит — от сервис-профиля) **и размера контрола**; общий
принцип — **левый инсет чуть больше вертикального** (сверху/снизу) инсета иконки, иначе лидирующая иконка выглядит
прижатой к краю.

**Левый инсет (`paddingInlineStart`) — дефолтный Гравити-профиль:**

| size | S | M | L | XL |
|---|---|---|---|---|
| px | 8 | 8 | 12 | 12 |
| токен | `spacing-2` | `spacing-2` | `spacing-3` | `spacing-3` |

Значения — **дефолт; сервис тюнит под свою иконочную плотность** (profile → `dimensions`, вслед за размером иконки).
Зазор до текста (`paddingInlineEnd`) — небольшой (`spacing-1`).

**Цвет иконки в инпуте — мэтч с СОСЕДНЕЙ надписью или на шаг ЛЕГЧЕ, тяжелее нельзя** (закреплено решением владельца):
иконки плотнее текста по форме → при том же цвете выглядят контрастнее. Точка отсчёта — фактический цвет
надписи рядом: **плейсхолдер uikit = `--g-color-text-hint`** (verified TextInput.css) → иконка поиска = `hint`
(мэтч; `secondary` уже ТЕМНЕЕ плейсхолдера — нельзя); рядом со значением/лейблом (`secondary`) — `secondary`
или `hint`. Без цвета иконка наследует `text-primary` инпута — всегда слишком тяжело. Механика: `Icon` рисует
`fill='currentColor'` (verified Icon.js) → `color` на инсет-обёртке:
`<span style={{…инсет…, color: 'var(--g-color-text-hint)'}}><Icon …/></span>`. Точный шаг — вкус сервиса (profile).

## Как найти правильное имя (не выдумывать)

Имя иконки легко сгаллюцинировать. Точный машиночитаемый каталог — **`metadata.json`** в репозитории:

- **Файл:** <https://github.com/gravity-ui/icons/blob/main/metadata.json> (raw: `raw.githubusercontent.com/gravity-ui/icons/main/metadata.json`).
- Это массив всех иконок (799 @ v2.20); у каждой: `name` (kebab), `style` (`regular` / `fill`), `componentName` (**это и есть имя импорта**, PascalCase), `keywords` (поисковые слова по смыслу — заполнены у ~43%).
- **Как пользоваться:** зафетчи файл и найди иконку по `name`/`keywords` под нужный смысл → импортируй её `componentName`. Пример: ищешь «календарь» → `Calendar`; «удалить» → `CircleXmark` / `CircleMinus`.
- Многие иконки имеют пару `regular` + `fill` (заливка) — `componentName` у fill-версии оканчивается на `Fill` (напр. `AlarmFill`).

Альтернатива для человека — showcase: <https://gravity-ui.com/icons> (поиск по картинкам).

Если подходящей иконки в `metadata.json` нет — **не подставляй похожее выдуманное имя** (несуществующее имя = ошибка импорта); возьми ближайшую существующую или оставь без иконки.

## Офлайн-сабсет частых имён (быстрая проверка без фетча)

Фетч `metadata.json` недоступен — сверь частое имя здесь (verified против metadata @ icons v2.20 — весь сабсет, включая «НЕ существует»-гарды). Имени нет в списке → фетч/showcase, **не выдумывай**.

**Нулевой шаг — свой установленный пакет (офлайн, точно ТВОЯ версия):** пакет плоский, имя компонента = имя
файла: `ls node_modules/@gravity-ui/icons | grep -i <тема>` (напр. `grep -i layout` → `LayoutList`,
`LayoutCells`, `LayoutSideContent`…). Это надёжнее любого списка: набор растёт от версии к версии (напр.
`ListUl` есть в 2.20, в ранних 2.x отсутствовал) — сверяй с тем, что установлено У ТЕБЯ, а не с чужим перечнем.

- **Действия:** добавить `Plus` (в круге `CirclePlus`) · удалить **`TrashBin`** (НЕ `Trash`) · редактировать `Pencil` · закрыть/× `Xmark` · ок/чек `Check` · искать `Magnifier` · фильтр `Funnel` · обновить `ArrowRotateLeft` · копировать `Copy` · ещё/меню `Ellipsis` (верт. `EllipsisVertical`) · настройки `Gear` · скачать `ArrowDownToLine` · загрузить `ArrowUpFromLine` · сохранить `FloppyDisk`.
- **Статусы/фидбэк:** инфо `CircleInfo` · предупреждение `TriangleExclamation` · ошибка `CircleXmark` · успех `CircleCheck` · запрет `Ban`.
- **Инфраструктура (домен):** сервер `Server` · БД `Database` · облако `Cloud` · диск/хранилище `HardDrive` · дисплей/монитор `Display` · CPU `Cpu` · контейнеры/кубы `Cubes3` · питание `Power`.
- **Раскладка / переключатели вида / сайдбар (verified @2.20, write-back Storage CD):** решётка-меню 9 точек
  `Dots9` (`Squares4` НЕ существует) · вид-список `LayoutList` · вид-плитка `LayoutCells` (крупная
  `LayoutCellsLarge`) · колонки `LayoutColumns` · боковая панель `LayoutSideContent` / `…Left` / `…Right`
  (`…Enabled` НЕ существует) · вкладки `LayoutTabs` · циклы/релизы `Arrows3RotateLeft` · модуль/плагин `Puzzle`
  (`Tasklet` НЕ существует) · выход `ArrowRightFromSquare` · drag-ручка `Grip` / `GripHorizontal`.
- **Объекты/нав:** папка `Folder` · файл `File` · пользователь `Person` (мн. `Persons`) · календарь `Calendar` · часы `Clock` · дом `House` · замок `Lock` · ключ `Key` · тег `Tag` · ссылка `Link` · показать `Eye` (скрыть `EyeSlash`) · слайдеры `Sliders`.
- **Шевроны/стрелки:** раскрытие `ArrowChevronDown` / `…Up` / `…Left` / `…Right`; сортировка `ArrowUpArrowDown`.

NB: у многих есть `*Fill`-версия (заливка) — `componentName` оканчивается на `Fill`. Полный каталог (799 @ v2.20) — `metadata.json` выше.

## See also

- `library-uikit.md` — компонент `Icon` (как рендерить) + ловушки контролов.
- `registry.json` — routing (когда нужны иконки) + версия пакета (`libraries[]` → icons).
