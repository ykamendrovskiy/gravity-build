# recipe-list — Гравити-сборка страницы-списка

> Тип: `recipe`. Реализует `pattern-list` на Gravity UI. Версии — из `registry.json` `libraries[]` по имени
> (uikit / table / icons / illustrations). Сначала — `scaffold-app-shell`. Состояния и data-safety — по
> `pattern-list` (он ссылается на `interface-foundations`).

## Пакеты (версии — из libraries[], не выдумывать)

`@gravity-ui/uikit` · `@gravity-ui/icons` · опц. `@gravity-ui/illustrations` (пустые/ошибки). Плоская таблица —
**uikit `Table`**, НЕ `@gravity-ui/table` (тот для grouping/tree/DnD). НЕ `react-data-table` (legacy).

## Скелет

```tsx
import {Table, withTableActions, withTableSelection, withTableSorting,
        TextInput, Select, Button, Label, Dialog, Skeleton} from '@gravity-ui/uikit';
import {Magnifier, Plus, TrashBin, Pencil} from '@gravity-ui/icons';
// Icon рендерится через uikit <Icon data={...} size={...}/> — размеры см. library-icons
```

### Плоская таблица (flat) — uikit Table + HOC

```tsx
// columns/data, не верстать <table>/Table.Head вручную
const columns = [
  {id: 'name', name: 'Название'},
  {id: 'type', name: 'Тип'},
  {id: 'status', name: 'Статус', template: (r) => <Label theme={r.status==='ok'?'success':'danger'}>{r.statusText}</Label>},
];
// HOC-стек: протягивай 2-й generic E снизу вверх (НЕ as unknown as, НЕ каст базового Table):
const EquipmentTable = withTableActions<Equip, {}>(
  withTableSelection<Equip, {}>(
    withTableSorting<Equip>(Table)
  )
);
// getRowActions={(item) => [{text:'Изменить', handler:...}, {text:'Удалить', theme:'danger', handler:...}]}
// <EquipmentTable data={rows} columns={columns} width="max" ... />
```

**Ширина таблицы:** дефолт uikit Table — `width: auto` (сжимается по контенту) → в ограниченной контент-колонке
кнопка-действие шапки «повисает» правее таблицы (наблюдён разрыв 300px+). **Дефолт рецепта — `width="max"`**:
таблица заполняет колонку, правые края шапки/фильтров/таблицы сходятся (та же механика, что width-binding
ActionsPanel — `pattern-actions-panel`). Другие раскладки (колонка, суженная под контент таблицы; действия на
контейнере) — валидны, но это осознанный выбор сервиса (профиль), не дефолт. Правило уровня вида — `pattern-list`.

Грабли имён/пропов (статусы — `Label`, не `Badge`; заголовок — `Text variant`, не `Heading`; диалог с
шапкой — `Dialog`, не `Modal title`) — сверь по `library-uikit` перед импортом.

### Фильтры над таблицей

```tsx
<Flex gap={2} alignItems="center">           {/* gap — число-шкала 1-8, не px/строки */}
  <TextInput value={q} onUpdate={setQ} placeholder="Поиск" hasClear
             startContent={<Icon data={Magnifier} size={16}/>} />
  <Select placeholder="Тип" options={...} />
</Flex>
```
Иконка поиска — в слот `startContent` (НЕ `leftContent`), размер по контролу — см. library-icons.
**Хорошая практика:** у поля поиска — проп `hasClear` (крестик очистки, когда введён текст; verified uikit@7.42).

### ActionsPanel на выборе строк

При непустом выборе показывай `ActionsPanel` (массовые действия). Раскладка: **над футером**, ширина **как
таблица** (никогда шире), **прибита к краю** (`sticky`) + компенсирующий `padding` списку. Контейнеру дай
**определённую ширину** (`width:100%`), иначе действия наезжают. Иконка в балк-кнопке — слотом item-конфига.
Полная идиома + механика — `pattern-actions-panel`.

### Добавление — Dialog + FormRow

```tsx
<Dialog open={open} onClose={guardedClose}>   {/* guardedClose: при введённых данных — подтверждение, см. ниже */}
  <Dialog.Header caption="Добавить оборудование" />
  <Dialog.Body>
    <FormRow label="Название"><TextInput .../></FormRow>
    <FormRow label="Тип"><Select .../></FormRow>
  </Dialog.Body>
  <Dialog.Footer onClickButtonApply={submit} textButtonApply="Добавить" loading={pending} />
</Dialog>
```
`FormRow` — из `@gravity-ui/components` (лейбл+контрол консистентно), НЕ инлайн `label=` на каждом инпуте.

## Состояния (по pattern-list → interface-foundations)

- **Loading:** `<Skeleton/>` на месте строк.
- **Empty / нет результатов / Error** — три РАЗНЫХ `PlaceholderContainer` (см. pattern-list): пусто впервые →
  `image={<NotFound/>}`; нет результатов фильтра → `<NoSearchResults/>`; page-level ошибка загрузки →
  `<InternalError/>` + «Обновить». Все из `@gravity-ui/illustrations`; без покраски `--gil-color-*` иллюстрация
  бесцветна — см. `library-illustrations`.
- **Удаление / закрытие диалога с вводом:** подтверждающий `Dialog` (data-safety, interface-foundations §2).
- **Сабмит:** `loading` на кнопке + видимая ошибка, форма не закрывается.

## Не делать

`Table.Head`/`<table>` руками; `Badge`/`Heading`/`Modal title`; `leftContent` (→`startContent`);
`as unknown as` на HOC-стеке; версии «из головы» (бери из `libraries[]`).
