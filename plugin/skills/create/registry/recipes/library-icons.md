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

## Как найти правильное имя (не выдумывать)

Имя иконки легко сгаллюцинировать. Точный машиночитаемый каталог — **`metadata.json`** в репозитории:

- **Файл:** <https://github.com/gravity-ui/icons/blob/main/metadata.json> (raw: `raw.githubusercontent.com/gravity-ui/icons/main/metadata.json`).
- Это массив всех 781 иконки; у каждой: `name` (kebab), `style` (`regular` / `fill`), `componentName` (**это и есть имя импорта**, PascalCase), `keywords` (поисковые слова по смыслу — заполнены у ~43%).
- **Как пользоваться:** зафетчи файл и найди иконку по `name`/`keywords` под нужный смысл → импортируй её `componentName`. Пример: ищешь «календарь» → `Calendar`; «удалить» → `CircleXmark` / `CircleMinus`.
- Многие иконки имеют пару `regular` + `fill` (заливка) — `componentName` у fill-версии оканчивается на `Fill` (напр. `AlarmFill`).

Альтернатива для человека — showcase: <https://gravity-ui.com/icons> (поиск по картинкам).

Если подходящей иконки в `metadata.json` нет — **не подставляй похожее выдуманное имя** (несуществующее имя = ошибка импорта); возьми ближайшую существующую или оставь без иконки.

## See also

- `r/library-uikit.json` — компонент `Icon` (как рендерить).
- `r/library-routing.json` — когда нужны иконки.
- `r/version-index.json` — версия пакета.
