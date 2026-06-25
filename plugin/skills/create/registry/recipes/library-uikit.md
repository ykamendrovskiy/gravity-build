# Каталог: uikit — компоненты и актуальные имена экспортов

Справочник по `@gravity-ui/uikit`: **какой компонент есть под задачу** и **как он точно называется**. Две функции: (1) каталог с назначением — чтобы выбрать компонент; (2) guard от устаревших/неверных имён — сверь имя **перед** импортом. Это не замена детальному API (пропы/варианты — в Storybook upstream), а карта набора + защита от выдуманных имён.

Имена соответствуют **uikit@7** (`version-index`, на момент сборки — v7.41.0). Всё импортируется из корня `@gravity-ui/uikit`, **кроме** явно помеченного `/unstable`. На другом мажоре сверяйся заново.

## ⚠️ Ловушки (частые неверные имена — проверь сначала здесь)

| Тянешься за… | В uikit@7 на самом деле | Почему промах |
|---|---|---|
| `RadioButton` | `SegmentedRadioGroup` (сегментированный single-choice) или `Radio` + `RadioGroup` (обычные радио) | `RadioButton` в экспортах нет — устаревшее имя |
| `<Tabs items={[...]} />` (монолит) | `TabProvider` + `TabList` + `Tab` + `TabPanel` (композиция) | старый API, в uikit@7 разнесён на композицию |
| `TreeSelect` / `TreeList` из корня | `unstable_TreeSelect` / `unstable_TreeList` из `@gravity-ui/uikit/unstable` | в корневом экспорте их нет — только под `./unstable` |
| `<Grid>` | грид-система = `Row` + `Col` (из layout) | компонента `Grid` нет |
| индикатор шагов «с нуля» | `Stepper` — он есть, не сочиняй | готовый компонент существует |
| `<Toaster />` как JSX | класс `new Toaster()` + хук `useToaster()` | setup — в `pattern-app-shell` |
| `Badge` / `Chip` / `Tag` / `Pill` | `Label` (тег / чип / статус-метка) | в uikit нет `Badge`; метка-чип = `Label` |
| `Heading` / `Title` / `<h1>`-компонент | `Text` с `variant="header-1…6"` / `subheader-*` | отдельного `Heading` нет; заголовок = `Text` с header-вариантом |
| `Modal` с пропом `title` | `Dialog` (`Dialog.Header` / `Body` / `Footer`) | `Modal` низкоуровневый (без `title`); диалог с шапкой/футером = `Dialog` |
| `Table.Head` / `Body` / `Row` / `Cell` (композиц. таблица как в HTML/MUI) | uikit `Table` — `data`/`columns`-driven (`<Table data columns/>`), подкомпонентов НЕТ; группировка/дерево/DnD → `@gravity-ui/table` (см. `library-routing`) | частый рефлекс из HTML/других ДС: uikit Table НЕ композиционный |

## ⚠️ Грабли пропов (не имён — но ломают сборку, TS2322)

| Компонент | Грабли | Правильно |
|---|---|---|
| `NumberInput` | `onUpdate` отдаёт `number \| null` (null при очистке поля). Стейт `number \| undefined` его не примет → TS2322 на `onUpdate={setX}` | держи стейт `number \| null`: `useState<number \| null>(10)` (или оборачивай: `onUpdate={(v) => setX(v ?? undefined)}`) |
| `Select` | пропа `style` нет — `<Select style={{maxWidth}}/>` не типизируется → TS2322 | ширину задавай пропом `width` (`number \| 'auto' \| 'max'`); для max-width оберни в `<div style={{maxWidth}}>` + `width="max"` |
| `TextInput` | пропа `width` НЕТ (это `Select`) → `width="max"` на `TextInput` = TS2322 | полноширинный по умолчанию; нужна ширина — оберни в `<div style={{width}}>` / Flex с шириной |
| `PlaceholderContainer` | проп `image` **required** (не опционально); голая `Icon` растягивается огромной | дай иллюстрацию из `@gravity-ui/illustrations` — имена + **покраска по темам** в `library-illustrations` |
| `TextInput` / `Select` — слот иконки | пропов `leftContent`/`rightContent` НЕТ → TS2322 | слоты называются `startContent` / `endContent` |
| `Flex` / `Box` — отступы | нет MUI-стиля `padding`/`margin`-пропов; `gap="md"` (строка) не типизируется | `gap={N}` — **число-шкала 1-8** (`4` ≈ 16px), не строка/пиксели; отступы — хелпер `spacing`/`sp` или `style` |
| uikit `Table` + HOC-стек | `withTableSorting(withTableSelection(withTableActions(Table)))` теряет пропы внутренних обёрток в типах → `getRowActions`/`onSortChange` не видны (TS2322) | протяни 2-й generic снизу вверх: `withTableActions<E, Sort&Sel>(withTableSelection<E, Sort>(withTableSorting<E>(Table)))` — **НЕ** `as unknown as` и **НЕ** каст базового `Table` как `ComponentType<TableProps<E>>` (схлопывает накопленные пропы — verified stage-2b) |
| uikit `Table` колонка — сортировка | проп `sortable` на колонке НЕ существует (рефлекс из MUI/antd) → TS2353 | `withTableSorting` читает `column.meta.sort`: `meta: {sort: true}` (или compare-fn `(a,b) => number`), не `sortable` (verified: uikit source) |

## Иллюстрации (`@gravity-ui/illustrations`)

`PlaceholderContainer.image` = иллюстрация под пустое / ошибочное состояние. Имена-экспорты, usage и **обязательная покраска по темам** (`--gil-color-*`, иначе невидимы) — отдельный каталог **`library-illustrations`**.

## Идиомы (как принято — находки прогонов)

- **Выбор строк в таблице ⇒ `ActionsPanel`.** Если у таблицы есть чекбоксы выбора, при непустом выборе показывай `ActionsPanel` с массовыми действиями — не оставляй выбор «мёртвым». **Раскладка:** панель идёт **над футером**, шириной **как таблица** (или уже, если контролов мало; **шире таблицы — никогда**). **NB (баг run-05/aurora):** `ActionsPanel` меряет ширину своего контейнера, чтобы разложить действия (лишние сворачивает в overflow-дропдаун — поэтому у каждого item и `button`, и `dropdown`). Дай ему контейнер с **определённой шириной** (напр. `width: 100%` блока таблицы / фикс max-width). В `position:sticky`/auto-width обёртке **без ширины** действия наезжают друг на друга (как на скриншоте). Минимально: оберни в `<div style={{width:'100%'}}>` (или Flex с шириной).
  - **Прибита к краю, не в скролле.** Панель массовых действий **прилипает к краю области** (`position: sticky`/`fixed`), а НЕ уезжает со скроллом списка — действия над выбором должны быть видны всегда. Раз панель перекрывает край контента, **добавь компенсирующий отступ** скроллируемому списку (напр. `padding-bottom` высоты панели при нижнем размещении), иначе последние строки прячутся под ней. *Где именно прибита — край панели (низ/верх) — задаёт сервис (см. ниже), но «прибита + компенсирующий отступ» верно всегда.*
- **Размер иконки ∝ размеру контрола.** Иконка в `Button` / `TextInput` / `Label` должна соответствовать `size` контрола (s/m/l → меньшая/средняя/большая иконка), а не быть фиксированной. Не подставляй один размер иконки во все контролы.
- **Форма (в т.ч. в диалоге) ⇒ `FormRow`.** Поля формы — через `FormRow` (`@gravity-ui/components`), лейбл+контрол консистентно; не инлайн `label=` на каждом инпуте. Раскладка формы — `recipe-settings-form`.
- **Безопасность данных.** Деструктив (удаление строк / балк) — через подтверждение `Dialog`, не молча. Форма с несохранённым вводом не закрывается по outside-click/Esc без подтверждения. Сабмит — видимый pending/ошибка (не тихий `console.log`).

## Каталог по назначению (корневые экспорты)

**Кнопки и действия:** `Button` (view/size/pin), `DropdownMenu` (меню по кнопке), `Menu` (пункты/группы), `ClipboardButton` / `CopyToClipboard` (копирование), `ActionsPanel` (массовые действия над выбранным).

**Текстовые поля:** `TextInput`, `TextArea`, `PasswordInput`, `NumberInput`, `PinInput` (ввод кода по ячейкам).

**Выбор и переключатели:** `Select` (single/multiple, опции, группы), `Checkbox`, `Switch` (on/off), `Radio` + `RadioGroup` (радио), `SegmentedRadioGroup` (сегментированный выбор одного из N), `Slider` (диапазон/значение), `Palette` (палитра эмодзи/цветов).

**Раскладка (layout):** `Flex`, `Box`, `Row`, `Col`, `Container`, `spacing` (хелпер `sp`). Грид — это `Row`+`Col`; отдельного `Grid` нет. `Divider` — разделитель.

**Типографика:** `Text` (variant/color/ellipsis), `Link`.

**Оверлеи и всплывашки:** `Modal` (низкоуровневый контейнер), `Dialog` (модальный диалог: Header/Body/Footer), `Sheet` (нижняя шторка, mobile), `Drawer` (боковая панель), `Popup` (позиционируемый попап — грунт), `Popover` (поповер с контентом), `Tooltip` / `ActionTooltip` (тултипы), `Portal` (рендер в портал), `Overlay` (оверлей поверх контента), `HelpMark` («?» с подсказкой).

**Навигация и структура страницы:** `Tabs` API (`TabProvider`/`TabList`/`Tab`/`TabPanel`), `Breadcrumbs` (крошки), `Pagination`, `Toc` (оглавление), `Accordion` (секции), `Disclosure` (раскрывающийся блок), `ArrowToggle` (стрелка раскрытия), `Stepper` (шаги визарда).

**Данные и коллекции:** `Table` (простая таблица — для группировки/дерева/DnD бери `@gravity-ui/table`, см. `library-routing`), `TableColumnSetup` (настройка колонок), `List` (виртуализированный список с фильтром/выбором), `DefinitionList` (термин→значение), `Card` (контейнер; `type="selection"`/`"action"`), `Label` (тег/чип), `Avatar` / `AvatarStack`, `User` / `UserLabel` (блок/чип пользователя), `FilePreview` (превью файла), `Icon` (рендер SVG: `<Icon data={X} size={16}/>`, иконка из `@gravity-ui/icons` через проп `data`). Дерево с выбором — `unstable_TreeSelect` / `unstable_TreeList` из `@gravity-ui/uikit/unstable`.

**Состояния и фидбэк:** `Alert` (инлайн-баннер), `Toaster`/`useToaster` (тосты — setup в app-shell), `Spin` (круговой спиннер), `Loader` (бар загрузки), `Skeleton` (заглушка), `Progress` (прогресс-бар), `PlaceholderContainer` (пустое / ошибочное состояние: иллюстрация+текст+действие; `image` — required, иллюстрацию бери из `@gravity-ui/illustrations` — см. `library-routing`).

**Прочее:** `Hotkey` (отображение хоткея), `ClipboardIcon`.

**Обвязка (см. `pattern-app-shell`):** `ThemeProvider` (тема), `MobileProvider` (мобильный контекст), `configure` (lang/i18n).

## Как узнать про остальные компоненты

Каталог покрывает частотные компоненты; набор шире. Чтобы найти то, чего здесь нет, и не выдумывать:

- **Полный список компонентов** = папки в `gravity-ui/uikit/src/components/` (каждая папка `<ComponentName>/` — отдельный компонент). Имя папки = имя экспорта (кроме `controls`/`layout`/`tabs` — это под-баррели, и `TreeList`/`TreeSelect` → `./unstable`).
- **Детали компонента** (пропы, варианты, примеры) — Storybook upstream и `<ComponentName>.tsx` в его папке.
- **Upstream-гайд:** <https://github.com/gravity-ui/uikit/blob/main/AGENTS.md> (общие правила; перечня компонентов в нём нет — этот каталог его дополняет).
- Если компонента нет ни здесь, ни в `src/components/` — его в uikit нет: не импортируй по памяти, посмотри `library-routing` (возможно, он в другой либе Гравити).

## See also

- `r/library-routing.json` — когда какую библиотеку Гравити брать.
- `r/library-docs.json` — детальный API uikit: route на upstream.
- `r/version-index.json` — версия uikit (и остального набора).
- `r/pattern-app-shell.json` — ThemeProvider / Toaster / MobileProvider setup.
