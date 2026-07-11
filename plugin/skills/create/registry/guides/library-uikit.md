# Каталог: uikit — компоненты и актуальные имена экспортов

Справочник по `@gravity-ui/uikit`: **какой компонент есть под задачу** и **как он точно называется**. Две функции: (1) каталог с назначением — чтобы выбрать компонент; (2) guard от устаревших/неверных имён — сверь имя **перед** импортом. Это не замена детальному API (пропы/варианты — в Storybook upstream), а карта набора + защита от выдуманных имён.

Имена соответствуют **uikit@7** (точная версия — в `registry.json` → `libraries[]`). Всё импортируется из корня `@gravity-ui/uikit`, **кроме** явно помеченного `/unstable`. На другом мажоре сверяйся заново.

## ⚠️ Ловушки (частые неверные имена — проверь сначала здесь)

| Тянешься за… | В uikit@7 на самом деле | Почему промах |
|---|---|---|
| `RadioButton` | `SegmentedRadioGroup` (сегментированный single-choice) или `Radio` + `RadioGroup` (обычные радио) | `RadioButton` в экспортах нет — устаревшее имя |
| `<Tabs items={[...]} />` (монолит) | `TabProvider` + `TabList` + `Tab` + `TabPanel` (композиция) | старый API, в uikit@7 разнесён на композицию |
| `TreeSelect` / `TreeList` из корня | `unstable_TreeSelect` / `unstable_TreeList` из `@gravity-ui/uikit/unstable` | в корневом экспорте их нет — только под `./unstable` |
| `ListItemView` из корня / самодельная строка сайдбара | `unstable_ListItemView` из `@gravity-ui/uikit/unstable` (`import {unstable_ListItemView as ListItemView}`) | готовая строка списка/меню (`content={{title, startSlot}}` + `selected` + `height`) — но только под `./unstable`; рендер-грабли selected — см. «Грабли вёрстки» |
| `<Grid>` | грид-система = `Row` + `Col` (из layout) | компонента `Grid` нет |
| индикатор шагов «с нуля» | `Stepper` — он есть, не сочиняй | готовый компонент существует |
| `<Toaster />` как JSX | класс `new Toaster()` + хук `useToaster()` | setup — в `scaffold-app-shell` |
| `Badge` / `Chip` / `Tag` / `Pill` | `Label` (тег / чип / статус-метка) | в uikit нет `Badge`; метка-чип = `Label` |
| `Heading` / `Title` / `<h1>`-компонент | `Text` с `variant` — заголовок только `header-1`/`header-2`; крупнее `display-1…4`; подзаголовок `subheader-1…3` | отдельного `Heading` нет; `header-3…6` НЕ существуют (verified source@7.44 — `TEXT_VARIANTS`) |
| `Modal` с пропом `title` | `Dialog` (`Dialog.Header` / `Body` / `Footer`) | `Modal` низкоуровневый (без `title`); диалог с шапкой/футером = `Dialog` |
| `Table.Head` / `Body` / `Row` / `Cell` (композиц. таблица как в HTML/MUI) | uikit `Table` — `data`/`columns`-driven (`<Table data columns/>`), подкомпонентов НЕТ; группировка/дерево/DnD → `@gravity-ui/table` (см. `registry.json`) | частый рефлекс из HTML/других ДС: uikit Table НЕ композиционный |

## ⚠️ Грабли пропов (не имён — но ломают сборку, TS2322)

| Компонент | Грабли | Правильно |
|---|---|---|
| `NumberInput` | `onUpdate` отдаёт `number \| null` (null при очистке поля). Стейт `number \| undefined` его не примет → TS2322 на `onUpdate={setX}` | держи стейт `number \| null`: `useState<number \| null>(10)` (или оборачивай: `onUpdate={(v) => setX(v ?? undefined)}`) |
| `Select` | пропа `style` нет — `<Select style={{maxWidth}}/>` не типизируется → TS2322 | ширину задавай пропом `width` (`number \| 'auto' \| 'max'`); для max-width оберни в `<div style={{maxWidth}}>` + `width="max"` |
| `Select` — `value` | `value="eu"` строкой — тип не примет / поведение ломается: `value` **ВСЕГДА массив**, даже для single-select | `value={['eu']}` + `onUpdate={([v]) => …}` (деструктурируй первый элемент) |
| `TextInput` | пропа `width` НЕТ (это `Select`) → `width="max"` на `TextInput` = TS2322 | полноширинный по умолчанию; нужна ширина — оберни в `<div style={{width}}>` / Flex с шириной |
| `PlaceholderContainer` | проп `image` **required** (не опционально); голая `Icon` растягивается огромной | дай иллюстрацию из `@gravity-ui/illustrations` — имена + **покраска по темам** в `library-illustrations` |
| `TextInput` — слот иконки | пропов `leftContent`/`rightContent` НЕТ → TS2322 | слоты `startContent` / `endContent` (полный слот-каталог — `library-icons`) |
| `Select` — иконка в контроле | у `Select` слота иконки НЕТ вообще (`start/endContent` тоже не существуют → TS2322 excess-prop; verified source@7.44) | кастомный триггер через `renderControl` |
| `Flex` / `Box` — отступы | нет MUI-стиля `padding`/`margin`-пропов; `gap="md"` (строка) не типизируется | `gap={N}` — **число-шкала 1-8** (`4` ≈ 16px), не строка/пиксели; отступы — хелпер `spacing`/`sp` или `style` |
| uikit `Table` + HOC-стек | `withTableSorting(withTableSelection(withTableActions(Table)))` теряет пропы внутренних обёрток в типах → `getRowActions`/`onSortChange` не видны (TS2322) | у каждого HOC сигнатура `withX<I extends TableDataItem, E extends {} = {}>` — **`I` = тип строки (1-й), `E` = накопленные пропы (2-й)**. Протяни оба снизу вверх: `withTableActions<Data, WithTableSortingProps & WithTableSelectionProps<Data>>(withTableSelection<Data, WithTableSortingProps>(withTableSorting<Data>(Table)))`. **НЕ** `as unknown as` и **НЕ** каст базового `Table` к `ComponentType<TableProps<Data>>` (схлопывает накопленные пропы). NB: `WithTableSortingProps` — не дженерик; `WithTableSelectionProps<I>`/`WithTableActionsProps<I>` — дженерики (verified uikit@7.42 source) |
| uikit `Table` колонка — сортировка | проп `sortable` на колонке НЕ существует (рефлекс из MUI/antd) → TS2353 | `withTableSorting` читает `column.meta.sort`: `meta: {sort: true}` (или compare-fn `(a,b) => number`), не `sortable` (verified: uikit source) |
| uikit `Table` колонка — выравнивание | `align: 'left'`/`'right'` — физические значения **deprecated** (console-warning `[Table] Physical values (left, right) … deprecated`) | логические `align: 'start'`/`'end'` (`'center'` без изменений); числовую колонку правь `align: 'end'` (verified browser: варнинг уходит, колонка остаётся правой) |

## ⚠️ Грабли вёрстки / рендера (`tsc` молчит, но результат портится)

- **Фикс-размерный элемент (`Avatar` / `Icon` / `Label`) в flex-ряду рядом с растягивающимся текстом** — задай
  ему `flex-shrink: 0` (uikit сам не задаёт), а текстовому соседу `min-width: 0`. Иначе длинный текст сплющивает
  аватар/иконку в эллипс. Контракт flex-ряда целиком (кто гибкий, куда уходит сжатие) —
  **`gravity-foundations-layout`**.
- **Шапка «крошки + правый контрол» — контракт приоритета: крошки уступают, контрол держится.** По
  умолчанию `Breadcrumbs` — единственный гибкий элемент ряда (`flex:1; min-width:0`): хватает места → тянутся,
  кажут полный путь; сузили вьюпорт → сжимаются первыми, средние уходят в «…», а закреплённые справа контролы
  (и левый бейдж/`Divider`) держатся — всем НЕ-крошкам `flex-shrink:0`. Это контракт flex-ряда
  (`gravity-foundations-layout`): гибкий здесь — крошки, свёртка = их способ сжаться на реальном overflow. **Не усаживай `<ol>` ровно по контенту** (`Flex`-крошки без `flex:1`) — иначе ложная
  свёртка при свободном месте (баг замера uikit 7.42/7.43: контейнер в margin-box, крошки в border-box,
  `margin:-2px` → −4px; → `lab/runs/2026-07-07-writeback-breadcrumbs-collapse/upstream-todo.md`). Ловушки:
  `maxItems` — не выключатель ложной свёртки (его дело — форс-компакт до N); сосед-спейсер `flex:1` не лечит;
  элементы — `<Breadcrumbs.Item>`-дети, НЕ `items`-проп (легаси v5 → в 7.x игнорируется, пустой рендер; verified source).
  **Профиль-ручка (default → override):** дефолт — уступают крошки; сервис может иначе (правые контролы
  сворачиваются в одну кнопку «ещё»/overflow, cap ширины крошек, выравнивание).
- **`unstable_ListItemView` как пункт сайдбара/меню** — дефолт `selectionViewType="multiple"`: `selected`
  рисует **чекмарк**, а не заливку. Для папок/навигации — `selectionViewType="single"` (заливка выбранного без
  галки). Плотность строки — проп `height={N}` (значение = ручка профиля). Divider-типа у него нет —
  разделитель списка = `<li role="separator">` с фоном `--g-color-line-generic` (verified браузером,
  figma-спайк S1).
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
- **`SegmentedRadioGroup` icon-only: `<Icon>` ПРЯМЫМ значением, без обёрток** (`content={<Icon…/>}` или прямой
  child) — иначе `<span>`-обёртка ломает автодетект `isIcon(content || children)` и `_icon`-модификатор не
  вешается. Переданная прямо — **центрируется по обеим осям на пине `^7.43`**: uikit 7.43 починил вертикаль
  (`_icon` = `display:flex; align-items:center; height:100%`); на **≤7.42** был `display:block` → иконка прижата
  к ВЕРХУ (verified браузером: 7.42 vOffset −6, 7.43-правило → 0/0 обе оси). Заплатки НЕ нужно. Прежняя
  `margin:0`-нота — двойной промах (audit T1.1): диагностировала **вертикальный** баг как горизонтальный margin,
  и селектор был одноклассовый (проигрывал `_size_`-правилу). Единственный остаточный кейс смещения — обёртка, ломающая `isIcon`.
- **Кнопка без текста (только иконка) — оборачивай в `ActionTooltip`** с полным названием действия:
  `<ActionTooltip title="Отозвать ключ"><Button…><Icon…/></Button></ActionTooltip>` (у `ActionTooltip` есть
  `description` и `hotkey` — для сложных действий). Кнопке с текстом тултип не обязателен — добавляй по
  сложности действия (когда подпись короче смысла). Практика universal; formulировки — вкус сервиса (profile).
- **`Stepper.Item` `id` и `value` — СТРОКАМИ, оба.** Тип `id` схлопывается до `string` (пересечение с Button
  `id?: string` → на числе TS2322), а подсветка текущего шага — строгое `id === value`: числовой `value` при
  строковом `id` **молча** гасит подсветку (tsc может пройти). verified .d.ts + repro, fanout-01 uikit 7.43.
- **`Stepper` на узких экранах — оборачивай в `overflowX:auto`.** Это непереносящийся горизонтальный
  флекс-`<ol>` (без `flex-wrap`; пропов orientation/wrap/scroll НЕТ — verified .d.ts): 3 текстовых шага =
  интринзик ~450px → на ≤375 бьёт за вьюпорт и тянет весь документ. Канон «скролл внутри виджета»
  (`gravity-foundations-layout`): `<div style={{overflowX:'auto', minWidth:0}}><Stepper…/></div>` — на широких
  no-op, на узких скроллит степпер, не страницу (verified фиксером fanout-02, re-gate 0 overflow).

- **Кликабельность шагов `Stepper` — по ПОСЕЩЁННЫМ (visited-набор в state)**, не «только назад от текущего»:
  вернувшись с шага 2 на шаг 1, пользователь должен уметь кликнуть вперёд на уже посещённый шаг 2
  (owner-review fanout-02). Рифма с «completion из state»: и отметки, и кликабельность — производные от
  visited/completed-набора, не от сравнения индексов. Механика: `Stepper.Item disabled={!visited[id]}` —
  disabled-Item рендерит disabled-кнопку (не эмитит `onUpdate` + даёт визуальный аффорданс; verified fanout-02).
- **uikit `Table` — всегда давай `getRowId` со стабильным id** (`getRowId="id"` / функция): без него строки
  кеятся индексом (`String(index)` → React `key`; verified Table.js 7.43) → при фильтрации/сортировке React
  переиспользует `<tr>` со сменой содержимого — бледный 1px-разделитель (`--g-color-line-generic`) даёт
  paint-глюк «пропала линия между строками», при этом computed-стили чистые (ловится только глазом; verified
  repro fanout-02: фильтр→сброс).
- **`Checkbox` ВНУТРИ кликабельного `Card type="selection"` — не делай:** событие двоится (toggle срабатывает
  дважды) и карточка получает `role="radio"` (ломается семантика мультивыбора). Строка-с-чекбоксом =
  **полноширинный `Checkbox` с `content`** (лейбл-строка целиком кликабельна) — verified builder'ом fanout-02.
  **Но длинный текст в `content` сам НЕ ужимается и НЕ режется** (s3-figma-naive): у `.g-control-label__text`
  есть flex-grow, но нет `min-width:0` (флексовый `min-width:auto` → спан красится ЗА контейнер и наезжает
  на соседей строки — Label-чип); `Text ellipsis` внутри него тоже мёртв — `g-text_ellipsis` на inline-боксе
  inert (overflow не применяется к inline). Канон: `:global(.g-control-label__text) { flex: 1 1 auto;
  min-width: 0; }` + перенос строк (или блочная обёртка, если нужен ellipsis) — тот же контракт flex-ряда
  (`gravity-foundations-layout`), недоданный внутренним классом uikit. Ловится только painted-rect
  (`Range.getBoundingClientRect`), element-rect коллизию не видит — класс R9 «мерь результат».

- **`DefinitionList`: точечные лидеры — дефолт БЕЗ пропа-выключателя** (types 7.43: у item только
  `copyText`/`note`). Дизайн без точек (частое решение макетов) → узкий CSS-оверрайд
  `.g-definition-list__dots { border-block-end: none; }` с пометкой — ступень-3 лестницы
  `gravity-foundations-theming` «Кастомизация поверх компонента»; правило «макет>дефолт компонента» —
  `figma-mapping` «политика фиделити» (verified s3-figma-naive).

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
