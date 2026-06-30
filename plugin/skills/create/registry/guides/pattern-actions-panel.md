# pattern-actions-panel — массовые действия над выбором / bulk actions (под-паттерн)

> Тип: `pattern` (под-паттерн, не целый вид). Что делать, когда у коллекции есть **выбор строк**.
> Применим к ЛЮБОЙ таблице/списку с чекбоксами — uikit `Table`, `@gravity-ui/table`, кастомный список;
> поэтому живёт отдельно, а не в `library-table` / `recipe-dashboard`. Гравити-реализация — `ActionsPanel`
> (`@gravity-ui/uikit`).

## Принцип (агностично)

Если у коллекции есть чекбоксы выбора — при **непустом выборе** должно быть видно, **что с выбранным сделать**.
Не оставляй выбор «мёртвым» (выбрал строки → действий нет = selection бесполезен). Массовые действия:

- **доступны, пока есть выбор** — панель не теряется; **КАК** (в потоке под списком / прижата к краю) зависит от
  scroll-модели страницы (см. «Раскладка» ниже) — здесь не диктуется;
- **не перекрывают данные** — если список скроллит под прижатой панелью, дай компенсирующий отступ на её высоту;
- **ширина:** дефолт — **= ширине таблицы** (`width="max"`, см. ниже). Допустимо **уже + по центру** — это выбор
  сервиса/конкретной страницы (профиль/сборка), не корректность. **Шире таблицы — никогда.**

> **Балк ⇒ обычно есть и per-row actions.** Если у строк есть выбор+балк, у них, как правило, есть и
> **поштучные** действия (изменить / удалить отдельную строку): `withTableActions` + `getRowActions` (uikit
> `Table` — kebab/`…` в строке) или колонка действий. Не давай только балк, если строкой оперируют и по одной.
> (per-row слой — `recipe-list` / `library-table`.)

## Гравити-реализация — `ActionsPanel`

`ActionsPanel` (`@gravity-ui/uikit`) — готовая панель массовых действий. Рендери её при непустом выборе
(`selectedRowsCount > 0` / `Object.keys(rowSelection).length`).

**Критичная механика раскладки (источник багов прогонов — run-05/aurora):** `ActionsPanel` **меряет ширину
своего контейнера**, чтобы разложить действия (лишние сворачивает в overflow-дропдаун — поэтому у каждого
`item` задаются и `button`, и `dropdown`). Дай ему контейнер с **определённой шириной**:

- в `position:sticky` / auto-width обёртке **без ширины** действия наезжают друг на друга;
- дай обёртке `width:100%` **И** таблице `width="max"` — иначе таблица по ширине контента, а панель по
  контейнеру → **рассинхрон ширины** (owner-review: панель шире/уже данных). С `width="max"` обе = контейнеру;
- иконку в кнопке действия клади в `button.props.children` (как в любой `Button`); отдельного `icon`-слота у item НЕТ.

> **Per-service:** к какому краю прибита (низ / верх) — выбирает сервис; «прибита + компенсирующий отступ +
> ширина как у таблицы» верно всегда.

NB: **апстрим панель НЕ позиционирует** (в `ActionsPanel.scss` нет `position`/`width`/`z-index`, все stories
рендерят её голой) — раскладка это **наша прескрипция**, не upstream-паттерн. Где живёт панель = **scroll-модель
страницы** (ниже): дефолт прост (в потоке), прилипание — апгрейд с граблями (тоже ниже, выверено браузером).

**Форма `actions` (TS — verified против uikit):**

```tsx
import {ActionsPanel} from '@gravity-ui/uikit';
import type {ActionsPanelProps} from '@gravity-ui/uikit';

const actions: ActionsPanelProps['actions'] = [
  { id: 'delete',
    button:   {props: {children: 'Удалить', view: 'outlined-danger', onClick: onBulkDelete}},
    dropdown: {item: {action: onBulkDelete, text: 'Удалить', theme: 'danger'}},
    // collapsed?: true → всегда в overflow-дропдауне
  },
];

```

## Раскладка = scroll-модель страницы (сборка / профиль)

Где закреплена панель — следствие того, **как страница скроллится**:

- **whole-page scroll** (нет закреплённой шапки — **greenfield-дефолт**): скроллит вся страница. Панель —
  **sticky к низу вьюпорта, последним элементом в потоке**. Чисто, без машинерии (verified browser):

```tsx
<DataTable width="max" data={rows} columns={columns} selectedIds={selected}
           onSelectionChange={setSelected} getRowId={(r) => r.id}
           getRowActions={(r) => [{text:'Изменить', handler:() => onEdit(r)},
                                  {text:'Удалить', theme:'danger', handler:() => onDelete(r)}]}
           edgePadding />
{selected.length > 0 && (
  <div style={{position:'sticky', bottom:'var(--g-spacing-4)', zIndex:3, marginTop:'var(--g-spacing-2)'}}>
    <ActionsPanel actions={actions} onClose={clearSelection}
                  renderNote={() => `${selected.length} выбрано`} />
  </div>
)}
```
Почему чисто: панель **последняя в потоке** → при полном скролле садится под последнюю строку (та открывается,
**клиренс НЕ нужен**); короткий список → sticky no-op, панель просто под таблицей; `zIndex:3` — над sticky-колонкой
действий (z:2). Не нужно «прилипание» вовсе — убери `position`/`zIndex`, останется панель в потоке под таблицей.

- **fixed top + scrolling body / bounded region** (закреплённая шапка): whole-page-sticky НЕ подходит (скроллит не
  вся страница). Панель — sticky к низу **скролл-области**; тут добавляются клиренс + реальная высота от app-shell
  (см. «bounded» в граблях). Апгрейд под scroll-модель конкретной сборки.

## Грабли прилипания (выверено браузером, owner-review 2026-06-29)

Каждый пункт = реальный баг, пойманный в браузере:

- **`width="max"` на таблице** — иначе таблица по ширине контента, панель по контейнеру → **рассинхрон ширины**.
- **`zIndex` панели > sticky action-колонки** — колонка действий это `g-table__cell_sticky_end` с **z:2** (verified
  inspect) → панели нужен **z ≥ 3** (+ непрозрачный фон, он есть); иначе «⋯» уезжающих под панель строк **всплывают над ней**.
- **whole-page: панель — ПОСЛЕДНИЙ элемент в потоке** → клиренс НЕ нужен (садится под последнюю строку сама).
- **bounded-область (fixed-top модель):** (a) клиренс-отступ = высоте панели **ТОЛЬКО когда реально скроллит**
  (`scrollHeight > clientHeight`) — иначе лишняя пустая «строка»; (b) высота области — от app-shell flex-цепочки
  (`flex:1; minHeight:0`), **НЕ** магический `maxHeight: calc(100vh - Npx)` (оставляет отступ снизу вьюпорта, ломается
  при другой шапке); (c) панель **БЕЗ** padded-блока с фоном — иначе белая полоса (панель непрозрачна).

bounded-сниппет (только для fixed-top/bounded — иначе бери whole-page выше):

```tsx
const PANEL_H = 52; const ref = useRef<HTMLDivElement>(null); const [scrolls, setScrolls] = useState(false);
useEffect(() => { const el = ref.current; if (!el) return;
  const check = () => setScrolls(el.scrollHeight > el.clientHeight + 1);
  check(); const ro = new ResizeObserver(check); ro.observe(el); return () => ro.disconnect();
}, [rows.length, selected.length]);

<div ref={ref} style={{flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative'}}>  {/* высота от app-shell flex, НЕ magic maxHeight */}
  <div style={{paddingBottom: selected.length && scrolls ? PANEL_H : 0}}>   {/* клиренс ТОЛЬКО при скролле */}
    <DataTable width="max" /* …те же пропы… */ />
  </div>
  {selected.length > 0 && (
    <div style={{position: 'sticky', bottom: 0, zIndex: 3}}>                 {/* z≥3 (выше sticky-колонки z:2); БЕЗ bg-полосы */}
      <ActionsPanel actions={actions} onClose={clearSelection}
                    renderNote={() => `${selected.length} выбрано`} />
    </div>
  )}
</div>
```

Форма item: `{id; collapsed?; button: {props: ButtonProps}; dropdown: {item: DropdownMenuItem; group?: string}}`
— у КАЖДОГО item и `button` (видимая кнопка), и `dropdown` (overflow; `group?` — группировка в overflow-меню).
⚠️ **`ActionsPanelItem` НЕ экспортируется** из `@gravity-ui/uikit` (→ TS2724) — типизируй массив через
`ActionsPanelProps['actions']` (элемент — `ActionsPanelProps['actions'][number]`). Экспортируются только
`ActionsPanel` + `ActionsPanelProps`. (verified uikit@7.42 — `build/.../ActionsPanel/index.d.ts`)
`ActionsPanelProps` = `{actions; onClose?; renderNote?; noteClassName?; className?; maxRowActions?}` — `maxRowActions`
по умолчанию **4**; пропов `open`/`sticky`/`position` НЕТ (видимость и позиционирование — на потребителе).
Подменю/switcher — НЕ отдельный вид item: задай `dropdown.item.items: [...]` → панель сама отрендерит кнопку как
`DropdownMenu`-switcher. Кнопки рендерятся как `view="flat-contrast" size="m"` (переопредели в `button.props`).
Иконка действия — внутри `button.props.children` (отдельного `icon`-слота нет). (verified uikit@7.42 source)

## Дальше

- Сборка таблицы: `recipe-list` (плоская) / `recipe-dashboard` (группировка/tree/DnD).
- Контракт состояний коллекции: `interface-foundations`.
