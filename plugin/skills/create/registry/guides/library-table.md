# Каталог: table (@gravity-ui/table)

Таблица на базе **TanStack Table** с батарейками. Бери её для данных-heavy экранов с выбором/деревом/DnD/настройкой колонок. Не путать с простой `Table` из uikit и блоком `table` из page-constructor (`registry.json` routing разводит три «table»). Нет upstream AI-доков → этот каталог + `recipe-dashboard` — основной источник; детали из README/Storybook (<https://preview.gravity-ui.com/table>).

## Каталог экспортов

**Компоненты:**

| Экспорт | Для чего |
|---|---|
| `Table` | Готовая таблица (сортировка, выбор, настройки, виртуализация) — основная точка входа. |
| `BaseTable` | Низкоуровневая таблица без батареек (когда нужен свой контроль). |
| `TableSettings` | UI настройки видимости/порядка колонок. |
| `ReorderingProvider` | Контекст DnD-переупорядочивания строк. |
| `SortIndicator` | Индикатор сортировки в заголовке. |
| `TreeExpandableCell` | Ячейка раскрытия дерева (tree-rows). |
| `RangedSelectionCheckbox` | Выбор диапазона строк. |

**Хелперы колонок** (добавляются в массив колонок):

| Хелпер | Колонка |
|---|---|
| `selectionColumn` | Чекбоксы выбора строк. |
| `dragHandleColumn` | Ручка DnD-переупорядочивания. |
| `getActionsColumn` | Действия per-row. |
| `getSettingsColumn` / `getSettingsWithActionsColumn` | Шестерёнка настройки колонок (опц. + действия). |

**Хуки:** `useTable` (конфигурация, обёртка над TanStack `useReactTable`), `useTableSettings`, `useRowVirtualizer` / `useWindowRowVirtualizer` (виртуализация), `useDraggableRowDepth`.

## Ловушки

- **`ColumnDef` импорть из главного `@gravity-ui/table`**, не из `@gravity-ui/table/tanstack` — иначе теряется `withNestingStyles`, и nested-колонки дают `TS2353`.
- **В `cell` нет `info`:** `CellContext` отдаёт значение через `getValue()` → `cell: ({getValue}) => getValue()`.
- Версия — из `registry.json` (`libraries[]`); промежуточные версии не выдумывать.
- **`Table` не имеет пропа `width`** (это uikit `DataTable` → TS2322 при копировании). Полная ширина —
  `attributes={{style:{width:'100%'}}}`. А вот **`stickyHeader` — ЕСТЬ** (`BaseTable.d.ts`, boolean; ранняя
  формулировка «нет обоих» была неверна — поймано наивным сборщиком fanout-02, verified .d.ts @1.15.3).

## Выбор строк — обязательная обвязка (useRowSelectionFixedHandler)

Любой selection на `@gravity-ui/table` веди через штатный хук (мемоизация за тебя); при группах/дереве он
**обязателен** — без него чекбокс родительской строки не отслеживает выделение детей
([TanStack #4878](https://github.com/TanStack/table/issues/4878)):

```tsx
import {useRowSelectionFixedHandler} from '@gravity-ui/table';

const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
const onRowSelectionChange = useRowSelectionFixedHandler({
  rowSelection, setRowSelection, tableData: data, getSubRows, getRowId,
});

const table = useTable({
  columns, data, getRowId, getSubRows,
  state: {rowSelection},
  onRowSelectionChange,
  enableRowSelection: true,
  enableMultiRowSelection: true,   // ⚠️ без него внутри группы чекбоксы ведут себя как радио
});
```

Выбор непустой → покажи массовые действия (раскладка/механика — `pattern-actions-panel`).

## Per-row actions (колонка «⋯») — getActionsColumn

Хелпер `getActionsColumn` (НЕ `withTableActions` — тот для uikit `Table`):
`getActionsColumn<TRow>('_actions', {getRowActions: (item, index) => TableActionConfig[]})` — **2 аргумента**
(`columnId`, `options`); `getRowActions` принимает `(item, index)` (НЕ `{row}`); `TableActionConfig` =
`{text, handler, theme?, icon?}` либо группа `{title, items}`. Добавь `'_actions'` в `columnOrder`, иначе
колонка уедет в конец. (verified @gravity-ui/table source)

## Настройка колонок (useTableSettings) — initialOrdering со ВСЕМИ id

`useTableSettings({initialOrdering})`: массив должен содержать **ВСЕ** id колонок — включая служебные
`'_select'` (selectionColumn) и `'_settings'` (getSettingsColumn) — в нужном порядке. Только leaf-колонки →
TanStack положит selection/settings в конец, чекбоксы уедут вправо. Альтернатива: не передавать
`initialOrdering` вовсе (порядок из определения `columns`).

## TanStack-pitfalls — фриз страницы от unstable refs

Пишешь обвязку руками (не `useTable`) или зовёшь `useReactTable` напрямую — три ловушки ведут к фризу:

```tsx
const grouping = groupByWarehouse ? ['warehouse'] : [];   // ❌ новая ссылка каждый рендер
const table = useReactTable({
  state: {rowSelection, columnOrder, grouping, expanded: true},   // ❌ литерал + unstable
  enableRowSelection: (row) => !row.getIsGrouped(),               // ❌ новая fn-ref каждый рендер
});
useEffect(() => {                                  // ❌ table в deps + setState внутри
  onSelectionChange(table.getSelectedRowModel().flatRows.length);
}, [rowSelection, table, onSelectionChange]);
```

**Почему:** `table` — новая ссылка каждый рендер → effect каждый рендер → setState → новая `table` → … —
браузер замерзает за секунды после первого взаимодействия (в dev-StrictMode эффекты удвоены). Фикс: `useMemo`
для state-массивов, `useCallback` для fn-пропов, effects зависят от **примитивов** (`rowSelection`), не от
`table`. Или проще — штатные хуки пакета (`useTable`, `useRowSelectionFixedHandler`, `useTableSettings`):
они мемоизируют за тебя.

## Группировка / tree-rows / expanding — следуй официальному паттерну (route, не сочиняй)

Группировку строк **не хэндролль** — в @gravity-ui/table есть канонический пример (README + Storybook: <https://gravity-ui.com/libraries/table>). Хэндролл без типов даёт `Property 'items' does not exist on type` (сборка) либо пустые / «не число» группы (рантайм). Канонический каркас:

- **Дискриминированный union данных:** `type Item = Group | Leaf`, где у `Group` есть подстроки (напр. `items: Leaf[]`), у `Leaf` — нет.
- **`getSubRows: (item) => 'items' in item ? item.items : undefined`** — guard `'items' in item` сужает к `Group` (агрегации по `.items` типобезопасны), на leaf → `undefined`.
- **`getGroupTitle: (row) => row.getValue('name')`** — метка строки-заголовка группы (без неё группы пустые).
- **`enableExpanding: true`** + `const [expanded, setExpanded] = React.useState<ExpandedState>({})`.
- **Тип-импорты** (`Row`, `ExpandedState`) — `import type {...} from '@gravity-ui/table/tanstack'` (но `ColumnDef` — из главного пакета, см. ловушку выше).
- Агрегацию по группе в `cell` считай по типизированному `row.original` (через guard), не предполагай `items` у всех строк.

**Групповые строки — три verified-факта (fanout-02, owner-review):**

- **Два режима рендера группы:** full-width `<h2>`-полоса `BaseGroupHeader` — рендерится ТОЛЬКО при переданном
  `getIsGroupHeaderRow`; без него группа = обычные per-column ячейки. **`getGroupTitle` потребляется только
  первым режимом** — в per-cell режиме это мёртвый проп (тайтл собираешь сам в ячейке). Per-cell режим нужен,
  когда группе нужны свой чекбокс/колонки. **Канон тайтла группы (per-cell):** полноценный текст-акцент
  (`Text variant="subheader-1"` со статус-именем) + вторичный счётчик с плюрализацией; статусный `Label` — как
  дополнение, НЕ как замена тайтла (голый Label = «скупо», owner-вердикт).
- **Выбор с группами: НЕ исключай группы из `enableRowSelection`** (`selectionColumn` дизейблит чекбокс по
  `getCanSelect()`): каскад и indeterminate уже штатные (`mutateRowIsSelected` рекурсивно в `subRows`,
  `getIsSomeSelected` → tri-state) + `useRowSelectionFixedHandler`. Скоуп балк-действий на листья — фильтром
  выбранных id по своему справочнику листьев, не запретом выбора группы.
- **Геометрия вложенности — переменная `--_--depth-indicator-width`** (дефолт 16px; рулит И инсетом контента,
  И полосой-индикатором). Детям тесно у индикатора / сетка разъезжается с родителем → скоуп-оверрайд одной
  переменной (`.my-table .gt-styled-table__row { --_--depth-indicator-width: 28px }`), НЕ per-cell паддинги.

## Ширины колонок и скролл-модель (verified fanout-01, loop-b)

**Политика ширин — 3 класса колонок** (universal-правило; конкретные px — вкус/профиль):

1. **Контентно-переменные, выигрывают от ширины** (название, адрес, описание) — главные «поглотители»
   свободной ширины: наибольший `size` (он же вес при распределении излишка), без `maxSize`.
2. **Фикс-контент, но могут чуть шире** (дата, сумма, статус, номер) — умеренный `size` + **`maxSize`**
   как потолок (не дают лишней ширине размывать компактные значения).
3. **Никогда не растут** — служебные: `selectionColumn` (чекбоксы), actions «⋯», drag-handle. Хелперы
   пакета уже фиксируют их узкими — не переопределяй.

**Механика — `table-layout: fixed` + `width:auto` у поглотителя** (verified 1600, fanout-01):

```css
table.gt-table { table-layout: fixed; }
th.gt-table__header-cell[class*="_id_<колонка-поглотитель>"] { width: auto !important; }
```

⚠️ `[class*="_id_"]` — **ступень-3 хак** по лестнице `gravity-foundations-theming` «Кастомизация поверх
компонента» (публичного API колонки-поглотителя у пакета нет): держи селектор максимально узким (конкретный
`th` + конкретный column-id), пометь комментом «хак внутренних классов, привязан к версии» и внеси в отчёт
сборки как upstream-кандидат.

С auto-layout (дефолт) браузер тянет **ВСЕ** колонки пропорционально — чекбокс/«⋯» тоже (32→44, 44→60 на
1600), а `maxSize` из columnDef **не влияет на рендер** (клампит только `getSize()`). С `fixed`: px-ширины
из `columnDef.size` становятся **точными** (служебные и статичные держатся буквально: 32/44/110/150),
колонка-поглотитель с `width:auto` забирает весь излишек (адрес 650 на 1600). `size` статичных = их точная
ширина; `maxSize` не нужен.

**И обязательный `min-width` на самой таблице** (сумма фиксированных колонок + минимум поглотителя ~180–200):
в fixed-layout при сужении поглотитель схлопывается **до нуля** (verified: адрес 0px на вьюпорте 900) —
`min-width` передаёт сжатие overflowX-обёртке (скроллит таблица, а не исчезает колонка; документ не
переполняется). Тройка «fixed + width:auto поглотителю + min-width таблицы» — неделимый канон.

**Горизонтальная скролл-модель:** `Table`/`BaseTable` рендерит **голый `<table>` без scroll-контейнера**
(verified `BaseTable.js`); на узких ширинах сумма `size` распирает страницу (горизонтальный оверфлоу всего
документа). Канон: оберни **только таблицу** в `<div style={{overflowX:'auto', maxWidth:'100%'}}>` — НЕ
ActionsPanel и не всю рабочую область (сломаешь whole-page-sticky панели, `pattern-actions-panel`).
Соседний факт мобильной полосы: шапка страницы с кнопками (`Flex justifyContent="space-between"`) на
~375 не переносится сама — добавь `wrap`.

## See also

- **Выбор строк** (`selectionColumn`): при непустом выборе покажи массовые действия — раскладка/механика в `pattern-actions-panel`.
- `registry.json` — три «table» в Гравити: какую когда (routing) + версия пакета (`libraries[]`).
- `recipe-dashboard.md` — таблица в составе дашборда (grouping/tree/DnD целиком).
