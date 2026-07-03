# Каталог: uikit — компоненты и актуальные имена экспортов

Справочник по `@gravity-ui/uikit`: **какой компонент есть под задачу** и **как он точно называется**. Две функции: (1) каталог с назначением — чтобы выбрать компонент; (2) guard от устаревших/неверных имён — сверь имя **перед** импортом. Это не замена детальному API (пропы/варианты — в Storybook upstream), а карта набора + защита от выдуманных имён.

Имена соответствуют **uikit@7** (точная версия — в `registry.json` → `libraries[]`). Всё импортируется из корня `@gravity-ui/uikit`, **кроме** явно помеченного `/unstable`. На другом мажоре сверяйся заново.

## ⚠️ Ловушки (частые неверные имена — проверь сначала здесь)

| Тянешься за… | В uikit@7 на самом деле | Почему промах |
|---|---|---|
| `RadioButton` | `SegmentedRadioGroup` (сегментированный single-choice) или `Radio` + `RadioGroup` (обычные радио) | `RadioButton` в экспортах нет — устаревшее имя |
| `<Tabs items={[...]} />` (монолит) | `TabProvider` + `TabList` + `Tab` + `TabPanel` (композиция) | старый API, в uikit@7 разнесён на композицию |
| `TreeSelect` / `TreeList` из корня | `unstable_TreeSelect` / `unstable_TreeList` из `@gravity-ui/uikit/unstable` | в корневом экспорте их нет — только под `./unstable` |
| `<Grid>` | грид-система = `Row` + `Col` (из layout) | компонента `Grid` нет |
| индикатор шагов «с нуля» | `Stepper` — он есть, не сочиняй | готовый компонент существует |
| `<Toaster />` как JSX | класс `new Toaster()` + хук `useToaster()` | setup — в `scaffold-app-shell` |
| `Badge` / `Chip` / `Tag` / `Pill` | `Label` (тег / чип / статус-метка) | в uikit нет `Badge`; метка-чип = `Label` |
| `Heading` / `Title` / `<h1>`-компонент | `Text` с `variant="header-1…6"` / `subheader-*` | отдельного `Heading` нет; заголовок = `Text` с header-вариантом |
| `Modal` с пропом `title` | `Dialog` (`Dialog.Header` / `Body` / `Footer`) | `Modal` низкоуровневый (без `title`); диалог с шапкой/футером = `Dialog` |
| `Table.Head` / `Body` / `Row` / `Cell` (композиц. таблица как в HTML/MUI) | uikit `Table` — `data`/`columns`-driven (`<Table data columns/>`), подкомпонентов НЕТ; группировка/дерево/DnD → `@gravity-ui/table` (см. `registry.json`) | частый рефлекс из HTML/других ДС: uikit Table НЕ композиционный |

## ⚠️ Грабли пропов (не имён — но ломают сборку, TS2322)

| Компонент | Грабли | Правильно |
|---|---|---|
| `NumberInput` | `onUpdate` отдаёт `number \| null` (null при очистке поля). Стейт `number \| undefined` его не примет → TS2322 на `onUpdate={setX}` | держи стейт `number \| null`: `useState<number \| null>(10)` (или оборачивай: `onUpdate={(v) => setX(v ?? undefined)}`) |
| `Select` | пропа `style` нет — `<Select style={{maxWidth}}/>` не типизируется → TS2322 | ширину задавай пропом `width` (`number \| 'auto' \| 'max'`); для max-width оберни в `<div style={{maxWidth}}>` + `width="max"` |
| `TextInput` | пропа `width` НЕТ (это `Select`) → `width="max"` на `TextInput` = TS2322 | полноширинный по умолчанию; нужна ширина — оберни в `<div style={{width}}>` / Flex с шириной |
| `PlaceholderContainer` | проп `image` **required** (не опционально); голая `Icon` растягивается огромной | дай иллюстрацию из `@gravity-ui/illustrations` — имена + **покраска по темам** в `library-illustrations` |
| `TextInput` / `Select` — слот иконки | пропов `leftContent`/`rightContent` НЕТ → TS2322 | слоты называются `startContent` / `endContent` |
| `Flex` / `Box` — отступы | нет MUI-стиля `padding`/`margin`-пропов; `gap="md"` (строка) не типизируется | `gap={N}` — **число-шкала 1-8** (`4` ≈ 16px), не строка/пиксели; отступы — хелпер `spacing`/`sp` или `style` |
| uikit `Table` + HOC-стек | `withTableSorting(withTableSelection(withTableActions(Table)))` теряет пропы внутренних обёрток в типах → `getRowActions`/`onSortChange` не видны (TS2322) | у каждого HOC сигнатура `withX<I extends TableDataItem, E extends {} = {}>` — **`I` = тип строки (1-й), `E` = накопленные пропы (2-й)**. Протяни оба снизу вверх: `withTableActions<Data, WithTableSortingProps & WithTableSelectionProps<Data>>(withTableSelection<Data, WithTableSortingProps>(withTableSorting<Data>(Table)))`. **НЕ** `as unknown as` и **НЕ** каст базового `Table` к `ComponentType<TableProps<Data>>` (схлопывает накопленные пропы). NB: `WithTableSortingProps` — не дженерик; `WithTableSelectionProps<I>`/`WithTableActionsProps<I>` — дженерики (verified uikit@7.42 source) |
| uikit `Table` колонка — сортировка | проп `sortable` на колонке НЕ существует (рефлекс из MUI/antd) → TS2353 | `withTableSorting` читает `column.meta.sort`: `meta: {sort: true}` (или compare-fn `(a,b) => number`), не `sortable` (verified: uikit source) |
| uikit `Table` колонка — выравнивание | `align: 'left'`/`'right'` — физические значения **deprecated** (console-warning `[Table] Physical values (left, right) … deprecated`) | логические `align: 'start'`/`'end'` (`'center'` без изменений); числовую колонку правь `align: 'end'` (verified browser: варнинг уходит, колонка остаётся правой) |

## ⚠️ Грабли вёрстки / рендера (`tsc` молчит, но результат портится)

- **Фикс-размерный элемент (`Avatar` / `Icon` / `Label`) в flex-ряду рядом с растягивающимся текстом** — задай
  ему `flex-shrink: 0` (uikit сам не задаёт), а текстовому соседу `min-width: 0`. Иначе длинный текст сплющивает
  аватар/иконку в эллипс.
- **Иконка+текст в `Button` — передавай детей МАССИВОМ** `[<Icon data={X} size={16}/>, 'Текст']`, **не Fragment**
  `<><Icon/> Текст</>`. uikit `prepareChildren` детектит иконку только среди **прямых** детей; `React.Children.toArray`
  держит Fragment одним узлом → иконка уходит в `g-button__text` (top-aligned, поверх текста). Массив → иконка в
  `g-button__icon` (центр + gap). (verified uikit@7.42 source+browser; то же для `button.props.children` в `ActionsPanel`.)
- **`Button` в ряду с инпутами/селектами — тот же `size`** (обычно `m`): `size="l"`-кнопка рядом с `m`-контролами
  визуально разъезжается по высоте. Размер кнопки — по контексту: в ряду контролов = размер контролов; отдельная
  primary-кнопка формы — по форм-политике (profile).
- **`Stepper` — отметку «выполнено» трекай в state**, НЕ выводи из текущего шага: `view={i < step ? 'success'}`
  теряет отметки при возврате назад (пройденные шаги перестают быть `< step`). Навигация кликом по шагу — только с
  `onUpdate` + `id` на `Stepper.Item`; без них степпер = индикатор (клик мёртв). Кликабельность — дизайн/профиль;
  корректная отметка выполненности — всегда из state.
- **Кнопка без текста (только иконка) — оборачивай в `ActionTooltip`** с полным названием действия:
  `<ActionTooltip title="Отозвать ключ"><Button…><Icon…/></Button></ActionTooltip>` (у `ActionTooltip` есть
  `description` и `hotkey` — для сложных действий). Кнопке с текстом тултип не обязателен — добавляй по
  сложности действия (когда подпись короче смысла). Практика universal; formulировки — вкус сервиса (profile).
- **`Stepper.Item` `id` и `value` — СТРОКАМИ, оба.** Тип `id` схлопывается до `string` (пересечение с Button
  `id?: string` → на числе TS2322), а подсветка текущего шага — строгое `id === value`: числовой `value` при
  строковом `id` **молча** гасит подсветку (tsc может пройти). verified .d.ts + repro, fanout-01 uikit 7.43.
- **Safari + `Dialog` выше вьюпорта — двоение вуали.** Вуаль `Modal` — это alpha-фон самого `.g-modal`, который
  одновременно скролл-контейнер (`overflow:auto`); на скроллируемом модале Safari двоит отрисовку вуали при
  открытии `Popup` (`Select`/`DatePicker`) и репейнтах (моргание на анимации открытия, кнопках `NumberInput`).
  Workaround: через документированный проп `Dialog` `modalClassName` сделать фон модала прозрачным и рисовать
  вуаль fixed-псевдоэлементом с `var(--g-color-sfx-veil)` (`pointer-events:none`; `z-index:-1`). ВРЕМЕННЫЙ —
  привязан к структуре `Modal` uikit 7.4x, пересмотреть при апгрейде.

## Иллюстрации (`@gravity-ui/illustrations`)

`PlaceholderContainer.image` = иллюстрация под пустое / ошибочное состояние. Имена-экспорты, usage и **обязательная покраска по темам** (`--gil-color-*`, иначе невидимы) — отдельный каталог **`library-illustrations`**.

## Сквозные идиомы (живут отдельно — со-локация)

Принципы, которые касаются не только uikit, вынесены в свои дома (открой по теме — здесь не дублируем):

- **Выбор строк в таблице ⇒ массовые действия** → `pattern-actions-panel` (панель видна при непустом выборе;
  раскладка sticky / ширина = таблице / компенсирующий отступ + критичная container-width-механика `ActionsPanel`).
- **Иконка в контроле — слот + размер** → `library-icons` (правильный слот даёт отступы даром; размер — руками
  по шкале контрола).
- **Форма ⇒ `FormRow`, не инлайн `label=`** → `pattern-form` (раскладка формы) + `library-components` (сам `FormRow`).
- **Безопасность данных** (деструктив → `Dialog`, guard несохранённого, видимый submit-feedback) →
  `interface-foundations`.

## Каталог по назначению (корневые экспорты)

**Кнопки и действия:** `Button` (view/size/pin), `DropdownMenu` (меню по кнопке), `Menu` (пункты/группы), `ClipboardButton` / `CopyToClipboard` (копирование), `ActionsPanel` (массовые действия над выбранным).

**Текстовые поля:** `TextInput`, `TextArea`, `PasswordInput`, `NumberInput`, `PinInput` (ввод кода по ячейкам).

**Выбор и переключатели:** `Select` (single/multiple, опции, группы), `Checkbox`, `Switch` (on/off), `Radio` + `RadioGroup` (радио), `SegmentedRadioGroup` (сегментированный выбор одного из N), `Slider` (диапазон/значение), `Palette` (палитра эмодзи/цветов).

**Раскладка (layout):** `Flex`, `Box`, `Row`, `Col`, `Container`, `spacing` (хелпер `sp`). Грид — это `Row`+`Col`; отдельного `Grid` нет. `Divider` — разделитель.

**Типографика:** `Text` (variant/color/ellipsis), `Link`.

**Оверлеи и всплывашки:** `Modal` (низкоуровневый контейнер), `Dialog` (модальный диалог: Header/Body/Footer), `Sheet` (нижняя шторка, mobile), `Drawer` (боковая панель), `Popup` (позиционируемый попап — грунт), `Popover` (поповер с контентом), `Tooltip` / `ActionTooltip` (тултипы), `Portal` (рендер в портал), `Overlay` (оверлей поверх контента), `HelpMark` («?» с подсказкой).

**Навигация и структура страницы:** `Tabs` API (`TabProvider`/`TabList`/`Tab`/`TabPanel`), `Breadcrumbs` (крошки), `Pagination`, `Toc` (оглавление), `Accordion` (секции), `Disclosure` (раскрывающийся блок), `ArrowToggle` (стрелка раскрытия), `Stepper` (шаги визарда).

**Данные и коллекции:** `Table` (простая таблица — для группировки/дерева/DnD бери `@gravity-ui/table`, см. `registry.json`), `TableColumnSetup` (настройка колонок), `List` (виртуализированный список с фильтром/выбором), `DefinitionList` (термин→значение), `Card` (контейнер; `type="selection"`/`"action"`), `Label` (тег/чип), `Avatar` / `AvatarStack`, `User` / `UserLabel` (блок/чип пользователя), `FilePreview` (превью файла), `Icon` (рендер SVG: `<Icon data={X} size={16}/>`, иконка из `@gravity-ui/icons` через проп `data`). Дерево с выбором — `unstable_TreeSelect` / `unstable_TreeList` из `@gravity-ui/uikit/unstable`.

**Состояния и фидбэк:** `Alert` (инлайн-баннер), `Toaster`/`useToaster` (тосты — setup в app-shell), `Spin` (круговой спиннер), `Loader` (бар загрузки), `Skeleton` (заглушка), `Progress` (прогресс-бар), `PlaceholderContainer` (пустое / ошибочное состояние: иллюстрация+текст+действие; `image` — required, иллюстрацию бери из `@gravity-ui/illustrations` — см. `registry.json`).

**Прочее:** `Hotkey` (отображение хоткея), `ClipboardIcon`.

**Обвязка (см. `scaffold-app-shell`):** `ThemeProvider` (тема), `MobileProvider` (мобильный контекст), `configure` (lang/i18n).

## Как узнать про остальные компоненты

Каталог покрывает частотные компоненты; набор шире. Чтобы найти то, чего здесь нет, и не выдумывать:

- **Полный список компонентов** = папки в `gravity-ui/uikit/src/components/` (каждая папка `<ComponentName>/` — отдельный компонент). Имя папки = имя экспорта (кроме `controls`/`layout`/`tabs` — это под-баррели, и `TreeList`/`TreeSelect` → `./unstable`).
- **Детали компонента** (пропы, варианты, примеры) — Storybook upstream и `<ComponentName>.tsx` в его папке.
- **Upstream-гайд:** <https://github.com/gravity-ui/uikit/blob/main/AGENTS.md> (общие правила; перечня компонентов в нём нет — этот каталог его дополняет).
- Если компонента нет ни здесь, ни в `src/components/` — его в uikit нет: не импортируй по памяти, посмотри `registry.json` (возможно, он в другой либе Гравити).

## See also

- `registry.json` — routing (когда какую либу брать) + версия uikit (`libraries[]`) + upstream-доки uikit (route).
- `scaffold-app-shell.md` — ThemeProvider / Toaster / MobileProvider setup.
- `library-icons.md` · `library-illustrations.md` — иконки и иллюстрации (рендер через uikit).
