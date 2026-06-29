# Recipe: Dashboard

Страница с постоянной боковой навигацией по разделам и рабочей областью в центре — часто с таблицей данных, с которыми постоянно работают (фильтрация, выделение, группировка).

## Хочу → бери / не бери

| Хочу | Бери | НЕ бери | Почему |
|---|---|---|---|
| Постоянный сайдбар с разделами + сворачивание в иконки | `@gravity-ui/navigation` `AsideHeader` (опц. `headerDecoration`) | самописный `<aside>`; `@gravity-ui/uikit` | `compact` / `menuItems` / `renderContent` / `renderFooter` из коробки; в uikit сайдбара нет |
| Таблица с группировкой / tree-rows / DnD-строк / virtualization | `@gravity-ui/table` (`useTable`, `Table`, `selectionColumn`) | `@gravity-ui/uikit` `Table`; `@gravity-ui/react-data-table` | uikit/Table — простая, без grouping; react-data-table — legacy, не на TanStack |
| Группировку строк | `@gravity-ui/table` через **tree-rows pattern** (см. ниже) | TanStack-grouping напрямую (`enableGrouping`) | tree-rows — штатный путь Гравити, рендерит handle expand/collapse |
| Селекшен + группировку одновременно | `@gravity-ui/table` + **обязательно** `useRowSelectionFixedHandler` | `useReactTable` без этого хука | parent-row checkbox не отслеживает детей ([TanStack #4878](https://github.com/TanStack/table/issues/4878)) |
| Реордер колонок через меню (canonical) | `useTableSettings` + `getSettingsColumn` | — | диалог настройки колонок (видимость + порядок) |
| Реордер колонок литеральным drag по хедеру | custom HTML5 drag через `headerCellAttributes` → `table.setColumnOrder` | `dragHandleColumn` + `ReorderingProvider` | это API для **row-DnD**, не column-DnD |
| Простую таблицу без grouping/DnD | `@gravity-ui/uikit` `Table` + опц. `withTableActions` | `@gravity-ui/table` (overkill) | — |
| Обвязку приложения (Theme, Toaster, стили) | `scaffold-app-shell.md` | — | обязательно |

## Skeleton

```tsx
// src/App.tsx
import {useState} from 'react';
import {AsideHeader} from '@gravity-ui/navigation';
import {House, Box, ShoppingBag, ChartColumn} from '@gravity-ui/icons';

import {SuppliesPage} from './pages/SuppliesPage';

export function App() {
  const [section, setSection] = useState('supplies');
  const [compact, setCompact] = useState(false);

  return (
    <AsideHeader
      compact={compact}
      onChangeCompact={setCompact}
      headerDecoration                 // визуальный полиш — рекомендую держать включённым
      logo={{text: 'Stockroom', icon: House}}
      menuItems={[
        {id: 'overview', title: 'Обзор',    icon: House,        current: section === 'overview', onItemClick: () => setSection('overview')},
        {id: 'products', title: 'Товары',   icon: Box,          current: section === 'products', onItemClick: () => setSection('products')},
        {id: 'supplies', title: 'Поставки', icon: ShoppingBag,  current: section === 'supplies', onItemClick: () => setSection('supplies')},
        {id: 'reports',  title: 'Отчёты',   icon: ChartColumn,  current: section === 'reports',  onItemClick: () => setSection('reports')},
      ]}
      renderContent={() => section === 'supplies' ? <SuppliesPage /> : null}
    />
  );
}
```

Обвязка приложения (ThemeProvider, стили, опц. Toaster) — отдельный обязательный слой: `scaffold-app-shell.md`.

> Иконки — из `@gravity-ui/icons`. Сверяй, что экспорт существует, прежде чем импортировать (имена — PascalCase от svg: `house` → `House`, `chart-column` → `ChartColumn`).

## Data table — базовая обвязка

```tsx
import {Table, useTable, selectionColumn} from '@gravity-ui/table';
import type {ColumnDef} from '@gravity-ui/table'; // расширенный (withNestingStyles), НЕ из /tanstack

const columns: ColumnDef<Supply>[] = [
  selectionColumn as ColumnDef<Supply>,
  {accessorKey: 'number',   header: 'Поставка',  size: 140},
  {accessorKey: 'supplier', header: 'Поставщик'},
  {accessorKey: 'qty',      header: 'Кол-во',    size: 100},
  {accessorKey: 'status',   header: 'Статус',    size: 120},
];

const table = useTable({columns, data, getRowId: (r) => r.id});

return <Table table={table} stickyHeader />;
```

`useTable` — обёртка над `useReactTable` с корректной мемоизацией state. `<Table>` — рендер, `selectionColumn` — готовая колонка чекбоксов с id `'_select'`.

**Не бери:** `@gravity-ui/uikit` `Table` + `withTableActions` (простая таблица — нет grouping/DnD/tree); `@gravity-ui/react-data-table` (legacy); `@tanstack/react-table` напрямую (`@gravity-ui/table` — и есть обёртка над ним, плюс хелперы и стилизация; голый TanStack легко приводит к stability-багам, см. TanStack-pitfalls).

## Data table — selection + grouping

**Обязательно** используй `useRowSelectionFixedHandler` — без него чекбокс родительской строки не отслеживает выделение детей ([TanStack #4878](https://github.com/TanStack/table/issues/4878)).

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
  enableMultiRowSelection: true,        // ⚠️ без него внутри группы чекбоксы ведут себя как радио
});
```

## Data table — что делать с выбором → `ActionsPanel`

Раз у таблицы есть selection-чекбоксы — при **непустом выборе** покажи массовые действия: не оставляй выбор
«мёртвым» (выбрал строки — должно быть видно, что с ними сделать). Без этого selection бесполезен.

Идиома + критичная раскладка (sticky / ширина = таблице / компенсирующий отступ + container-width-механика
`ActionsPanel`) вынесена в под-паттерн **`pattern-actions-panel`** (применим к любой таблице).

## Data table — grouping (tree-rows pattern)

В `@gravity-ui/table` группировка делается **через tree-rows**, не через TanStack-grouping. Данные — родительские объекты с массивом `items`:

```tsx
import {Table, TreeExpandableCell, useTable} from '@gravity-ui/table';
import type {ColumnDef} from '@gravity-ui/table';        // ⚠️ расширенный ColumnDef (withNestingStyles) — из ГЛАВНОГО пакета
import type {ExpandedState} from '@gravity-ui/table/tanstack'; // чистые TanStack-state-типы — из /tanstack

type Item = Group | Supply;
const data: Item[] = [
  {id: 'w-msk', name: 'Склад Москва',         items: [{id: 's1', ...}, {id: 's2', ...}]},
  {id: 'w-spb', name: 'Склад Санкт-Петербург', items: [...]},
];

const columns: ColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: 'Поставка',
    withNestingStyles: true,            // визуальный отступ для вложенных строк
    showTreeDepthIndicators: false,     // опц. — убирает линии иерархии
    cell: ({row, getValue}) => (
      <TreeExpandableCell row={row}>{getValue<string>()}</TreeExpandableCell>
    ),
  },
  // ...другие колонки
];

const [expanded, setExpanded] = useState<ExpandedState>({});

const table = useTable({
  columns, data,
  enableExpanding: true,
  getSubRows: (item) => 'items' in item ? item.items : undefined,
  onExpandedChange: setExpanded,
  state: {expanded},
});

return <Table table={table} getGroupTitle={(row) => row.getValue<string>('name')} />;
```

Ключевое:
- `TreeExpandableCell` рендерит handle для expand/collapse. **Без него** клик по строке-группе не имеет видимого триггера.
- `withNestingStyles: true` даёт визуальные отступы для дочерних строк.
- `getGroupTitle` определяет text label группирующей ячейки — без него заголовок группы рендерится пустым.

## Data table — column reorder

**В `@gravity-ui/table` нет нативного drag-on-header API.** Два штатных пути:

### (a) Settings menu — canonical

```tsx
import {Table, useTable, useTableSettings, getSettingsColumn, selectionColumn} from '@gravity-ui/table';

const columns: ColumnDef<Supply>[] = [
  selectionColumn as ColumnDef<Supply>,
  {id: 'number',   accessorKey: 'number',   header: 'Поставка'},
  {id: 'supplier', accessorKey: 'supplier', header: 'Поставщик'},
  {id: 'qty',      accessorKey: 'qty',      header: 'Кол-во'},
  {id: 'status',   accessorKey: 'status',   header: 'Статус'},
  getSettingsColumn<Supply>(),
];

const {state, callbacks} = useTableSettings({
  // ⚠️ initialOrdering должен содержать ВСЕ id (включая '_select' и '_settings') в нужном порядке.
  // Если оставить только leaf-колонки — TanStack положит selection/settings в конец, чекбоксы уедут вправо.
  initialOrdering: ['_select', 'number', 'supplier', 'qty', 'status', '_settings'],
  initialVisibility: {},
});

const table = useTable({
  columns, data,
  state: {columnOrder: state.columnOrder, columnVisibility: state.columnVisibility},
  onColumnOrderChange: callbacks.onColumnOrderChange,
  onColumnVisibilityChange: callbacks.onColumnVisibilityChange,
});
```

Альтернатива — не передавать `initialOrdering` вовсе: тогда порядок берётся из определения `columns`. `selectionColumn.id === '_select'`, `getSettingsColumn().id === '_settings'`.

### (b) Custom HTML5 drag on header — literal drag

Когда пользователь явно требует «перетаскивать сами хедеры», навесь drag-handlers через `headerCellAttributes` и обнови порядок через `table.setColumnOrder`:

```tsx
const draggedColRef = useRef<string | null>(null);

<Table
  table={table}
  headerCellAttributes={(header) => {
    if (header.column.id === '_select') return {};
    return {
      draggable: true,
      onDragStart: (e) => { draggedColRef.current = header.column.id; e.dataTransfer.effectAllowed = 'move'; },
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => {
        e.preventDefault();
        const fromId = draggedColRef.current;
        const toId = header.column.id;
        if (!fromId || fromId === toId) return;
        const order = table.getState().columnOrder.length
          ? table.getState().columnOrder
          : table.getAllLeafColumns().map((c) => c.id);
        const next = [...order];
        next.splice(next.indexOf(fromId), 1);
        next.splice(next.indexOf(toId), 0, fromId);
        table.setColumnOrder(next);
      },
      onDragEnd: () => { draggedColRef.current = null; },
      style: {cursor: 'grab', userSelect: 'none'},
    };
  }}
/>
```

Это bypass-ит Gravity settings-UI. Не забудь визуальную обратную связь (drop-indicator, курсор `grabbing` во время drag) — без неё UX слабый.

## Простая таблица (без grouping / DnD)

`@gravity-ui/uikit` `Table` + опционально `withTableActions` для actions-колонки.

## TanStack-pitfalls

Если пишешь обвязку руками (не через `useTable`) или используешь `useReactTable` напрямую — три типичные ловушки приводят к фризу страницы:

```tsx
const grouping = groupByWarehouse ? ['warehouse'] : [];   // ❌ новая ссылка каждый рендер

const table = useReactTable({
  state: {rowSelection, columnOrder, grouping, expanded: true},   // ❌ литерал + unstable
  enableRowSelection: (row) => !row.getIsGrouped(),                // ❌ новая fn-ref каждый рендер
  ...
});

useEffect(() => {                                  // ❌ table в deps + setState внутри
  onSelectionChange(table.getSelectedRowModel().flatRows.length);
}, [rowSelection, table, onSelectionChange]);
```

**Почему ломается:** `table` — новая ссылка каждый рендер. `useEffect` зависит от `table` → срабатывает каждый рендер → setState → новая `table` ref → effect → … После любого user-interaction браузер замораживается за несколько секунд (в dev-StrictMode эффекты удваиваются).

```tsx
const grouping = useMemo<GroupingState>(() => groupByWarehouse ? ['warehouse'] : [], [groupByWarehouse]);
const enableRowSelectionFn = useCallback((row: Row<Supply>) => !row.getIsGrouped(), []);

useEffect(() => {                                  // зависим от примитивов, не от table
  onSelectionChange?.(Object.keys(rowSelection).length);
}, [rowSelection, onSelectionChange]);
```

Или проще — используй штатные хуки `@gravity-ui/table` (`useTable`, `useRowSelectionFixedHandler`, `useTableSettings`): они мемоизируют за тебя.

## See also

- `scaffold-app-shell.md` — обязательная обвязка (ThemeProvider / стили / опц. Toaster).
- `pattern-dashboard` — агностичный спек вида + контракт состояний; `pattern-actions-panel` — действия над выбором.
- `registry.json` — выбор между тремя Gravity Table (routing) + версии (`libraries[]` / `bundles[]`).
