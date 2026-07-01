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
- **`Table` не имеет пропов `width`/`stickyHeader`** (`TableProps` = размеры/выравнивание; это пропы uikit `DataTable` → TS2322 при копировании оттуда). Полная ширина — `attributes={{style:{width:'100%'}}}`; sticky-заголовок — через контейнер/scroll-модель, не проп.

## Группировка / tree-rows / expanding — следуй официальному паттерну (route, не сочиняй)

Группировку строк **не хэндролль** — в @gravity-ui/table есть канонический пример (README + Storybook: <https://gravity-ui.com/libraries/table>). Хэндролл без типов даёт `Property 'items' does not exist on type` (сборка) либо пустые / «не число» группы (рантайм). Канонический каркас:

- **Дискриминированный union данных:** `type Item = Group | Leaf`, где у `Group` есть подстроки (напр. `items: Leaf[]`), у `Leaf` — нет.
- **`getSubRows: (item) => 'items' in item ? item.items : undefined`** — guard `'items' in item` сужает к `Group` (агрегации по `.items` типобезопасны), на leaf → `undefined`.
- **`getGroupTitle: (row) => row.getValue('name')`** — метка строки-заголовка группы (без неё группы пустые).
- **`enableExpanding: true`** + `const [expanded, setExpanded] = React.useState<ExpandedState>({})`.
- **Тип-импорты** (`Row`, `ExpandedState`) — `import type {...} from '@gravity-ui/table/tanstack'` (но `ColumnDef` — из главного пакета, см. ловушку выше).
- Агрегацию по группе в `cell` считай по типизированному `row.original` (через guard), не предполагай `items` у всех строк.

## See also

- **Выбор строк** (`selectionColumn`): при непустом выборе покажи массовые действия — раскладка/механика в `pattern-actions-panel`.
- `registry.json` — три «table» в Гравити: какую когда (routing) + версия пакета (`libraries[]`).
- `recipe-dashboard.md` — таблица в составе дашборда (grouping/tree/DnD целиком).
