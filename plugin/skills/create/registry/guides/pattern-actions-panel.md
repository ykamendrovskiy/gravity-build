# pattern-actions-panel — массовые действия над выбором / bulk actions (под-паттерн)

> Тип: `pattern` (под-паттерн, не целый вид). Что делать, когда у коллекции есть **выбор строк**.
> Применим к ЛЮБОЙ таблице/списку с чекбоксами — uikit `Table`, `@gravity-ui/table`, кастомный список;
> поэтому живёт отдельно, а не в `library-table` / `recipe-dashboard`. Гравити-реализация — `ActionsPanel`
> (`@gravity-ui/uikit`).

## Принцип (агностично)

Если у коллекции есть чекбоксы выбора — при **непустом выборе** должно быть видно, **что с выбранным сделать**.
Не оставляй выбор «мёртвым» (выбрал строки → действий нет = selection бесполезен). Массовые действия:

- **видны всегда, пока есть выбор** — панель прибита к краю области (`sticky` / `fixed`), НЕ уезжает со скроллом списка;
- **не перекрывают данные** — скроллируемому списку дай компенсирующий отступ на высоту панели, иначе последние
  строки прячутся под ней;
- **ширина = ширине таблицы**, к которой панель относится (иногда уже, **никогда шире**).

## Гравити-реализация — `ActionsPanel`

`ActionsPanel` (`@gravity-ui/uikit`) — готовая панель массовых действий. Рендери её при непустом выборе
(`selectedRowsCount > 0` / `Object.keys(rowSelection).length`).

**Критичная механика раскладки (источник багов прогонов — run-05/aurora):** `ActionsPanel` **меряет ширину
своего контейнера**, чтобы разложить действия (лишние сворачивает в overflow-дропдаун — поэтому у каждого
`item` задаются и `button`, и `dropdown`). Дай ему контейнер с **определённой шириной**:

- в `position:sticky` / auto-width обёртке **без ширины** действия наезжают друг на друга;
- минимально — оберни в `<div style={{width: '100%'}}>` (= ширине блока таблицы) или Flex с заданной шириной;
- иконку в кнопке действия задавай **слотом item-конфига** (`icon`), не сырым `<Icon>` + текст.

> **Per-service:** к какому краю прибита (низ / верх) — выбирает сервис; «прибита + компенсирующий отступ +
> ширина как у таблицы» верно всегда.

Прозовая идиома раскладки берётся моделью **ненадёжно** (sticky-футер часто ложится ПОВЕРХ строк вместо
корректного места — повтор на наивном Opus, пилот 2026-06-26). Если собираешь футер выбора — выдержи 3 правила
выше буквально и проверь в браузере, что панель НЕ перекрывает последние строки.

**Форма `actions` (TS — verified против uikit):**

```tsx
import {ActionsPanel} from '@gravity-ui/uikit';
import type {ActionsPanelItem} from '@gravity-ui/uikit';

const actions: ActionsPanelItem[] = [
  { id: 'delete',
    button:   {props: {children: 'Удалить', view: 'outlined-danger', onClick: onBulkDelete}},
    dropdown: {item: {action: onBulkDelete, text: 'Удалить', theme: 'danger'}},
    // collapsed?: true → всегда в overflow-дропдауне
  },
];

{count > 0 && (
  <div style={{position: 'sticky', bottom: 0, width: '100%'}}>
    <ActionsPanel actions={actions} onClose={clearSelection} />
  </div>
)}
```

`ActionsPanelItem` = `{id; collapsed?; button: {props: ButtonProps}; dropdown: {item: DropdownMenuItem}}` — у
КАЖДОГО item и `button` (видимая кнопка), и `dropdown` (overflow). `ActionsPanel` берёт `actions` + `onClose`.
Иконка действия — слотом внутри `button.props` (children `Icon`).

## Дальше

- Сборка таблицы: `recipe-list` (плоская) / `recipe-dashboard` (группировка/tree/DnD).
- Контракт состояний коллекции: `interface-foundations`.
