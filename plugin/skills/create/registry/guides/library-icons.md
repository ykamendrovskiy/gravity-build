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
- **Отступы/центровка — автоматом**, ЕСЛИ иконка в штатном слоте контрола. Руками padding не подбирай.
- **Размер — руками.** Контрол НЕ ресайзит иконку (нет CSS-правила на `svg`); `Icon` без `size` падает на
  viewBox ≈16px → одинаковая иконка во всех размерах = баг. Ставь `<Icon size={N}/>` по шкале контрола.

**Слоты (куда класть иконку):**

| Контрол | Слот | NB |
|---|---|---|
| `Button` | просто `children` (детектится авто) | оборачивать не надо |
| `TextInput` | `startContent` / `endContent` | **НЕ** `leftContent`/`rightContent` |
| `Label` | проп `icon` | — |

**Размер `<Icon size>` по размеру контрола:**

| size | xs | s | m | l | xl |
|---|---|---|---|---|---|
| **Button** (`BUTTON_ICON_SIZE_MAP`) | 12 | 14 | 16 | 16 | 20 |
| **Label** (`iconSizeMap`, размеры xxs–m) | 12 (xxs/xs) | 14 (s) | 16 (m) | — | — |
| **TextInput** | — | 14–16 | 16 | 16 | 20 |

```tsx
<Button size="l"><Icon data={Plus} size={16}/> Добавить</Button>
<TextInput size="m" startContent={<Icon data={Magnifier} size={16}/>} />
<Label size="s" icon={<Icon data={Tag} size={14}/>}>тег</Label>
```

Источник: uikit@7.42 — `Button/constants.js` `BUTTON_ICON_SIZE_MAP`, `Label/Label.js` `iconSizeMap`,
слот-обёртки `Button.js`/`AdditionalContent.js`/`Label.js`; отсутствие `svg`-размеров — `Icon.css`.

## Как найти правильное имя (не выдумывать)

Имя иконки легко сгаллюцинировать. Точный машиночитаемый каталог — **`metadata.json`** в репозитории:

- **Файл:** <https://github.com/gravity-ui/icons/blob/main/metadata.json> (raw: `raw.githubusercontent.com/gravity-ui/icons/main/metadata.json`).
- Это массив всех 781 иконки; у каждой: `name` (kebab), `style` (`regular` / `fill`), `componentName` (**это и есть имя импорта**, PascalCase), `keywords` (поисковые слова по смыслу — заполнены у ~43%).
- **Как пользоваться:** зафетчи файл и найди иконку по `name`/`keywords` под нужный смысл → импортируй её `componentName`. Пример: ищешь «календарь» → `Calendar`; «удалить» → `CircleXmark` / `CircleMinus`.
- Многие иконки имеют пару `regular` + `fill` (заливка) — `componentName` у fill-версии оканчивается на `Fill` (напр. `AlarmFill`).

Альтернатива для человека — showcase: <https://gravity-ui.com/icons> (поиск по картинкам).

Если подходящей иконки в `metadata.json` нет — **не подставляй похожее выдуманное имя** (несуществующее имя = ошибка импорта); возьми ближайшую существующую или оставь без иконки.

## Офлайн-сабсет частых имён (быстрая проверка без фетча)

Фетч `metadata.json` недоступен — сверь частое имя здесь (verified против metadata @ icons v2.18). Имени нет в списке → фетч/showcase, **не выдумывай**.

- **Действия:** добавить `Plus` (в круге `CirclePlus`) · удалить **`TrashBin`** (НЕ `Trash`) · редактировать `Pencil` · закрыть/× `Xmark` · ок/чек `Check` · искать `Magnifier` · фильтр `Funnel` · обновить `ArrowRotateLeft` · копировать `Copy` · ещё/меню `Ellipsis` (верт. `EllipsisVertical`) · настройки `Gear` · скачать `ArrowDownToLine` · загрузить `ArrowUpFromLine` · сохранить `FloppyDisk`.
- **Статусы/фидбэк:** инфо `CircleInfo` · предупреждение `TriangleExclamation` · ошибка `CircleXmark` · успех `CircleCheck` · запрет `Ban`.
- **Инфраструктура (домен):** сервер `Server` · БД `Database` · облако `Cloud` · диск/хранилище `HardDrive` · дисплей/монитор `Display` · CPU `Cpu` · контейнеры/кубы `Cubes3` · питание `Power`.
- **Объекты/нав:** папка `Folder` · файл `File` · пользователь `Person` (мн. `Persons`) · календарь `Calendar` · часы `Clock` · дом `House` · замок `Lock` · ключ `Key` · тег `Tag` · ссылка `Link` · показать `Eye` (скрыть `EyeSlash`) · слайдеры `Sliders`.
- **Шевроны/стрелки:** раскрытие `ArrowChevronDown` / `…Up` / `…Left` / `…Right`; сортировка `ArrowUpArrowDown`.

NB: у многих есть `*Fill`-версия (заливка) — `componentName` оканчивается на `Fill`. Полный каталог (781) — `metadata.json` выше.

## See also

- `library-uikit.md` — компонент `Icon` (как рендерить) + ловушки контролов.
- `registry.json` — routing (когда нужны иконки) + версия пакета (`libraries[]` → icons).
