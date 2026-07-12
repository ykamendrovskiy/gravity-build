# reference-interfaces — эталонные интерфейсы на Гравити (route на реальные реализации)

> Тип: route-guide. Полные идиоматичные интерфейсы, собранные командой Гравити, живут в репе лендинга
> `gravity-ui/landing/src/components/UISamples/`. Покрывают то, чего нет в recipe: **КОМПОЗИЦИЯ целого
> интерфейса** (list-detail, dashboard-grid, form-page), а не одиночный surface. Строишь похожий composite —
> сперва изучи эталон (**route, не копируй вслепую**): там реальная структура, layout, разбивка на
> под-компоненты, mock-данные.

## Эталоны (что собираю → где смотреть → какой паттерн иллюстрирует)

| Хочу собрать | Эталон (`UISamples/…`) | Иллюстрирует |
|---|---|---|
| Почта / мессенджер / list-detail (список + детальный просмотр + действия) | `MailPreview/` (Navigation + EmailList + CurrentEmail + Inbox) | `pattern-list` (+ detail) |
| Дашборд с метриками и графиками | `DashboardPreview2/` (DashboardContent + HeaderActionBar + charts) | `pattern-dashboard` |
| Каталог карточек / детальная карточка объекта (товар, объявление, бронь) | `ApartmentCardPreview/` (Gallery / Actions / Rank / Sheet), `CardsPreview/` | `pattern-list` (+ detail) |
| Форма-страница | `FormPreview/` | `pattern-form` |
| Таблица-листинг / таск-трекер | `Table` / `Tasks` Preview | `pattern-list`, `pattern-dashboard` |
| Мониторинг / инфраструктурный дашборд | `KubernetesPreview/`, `OsnPreview/` | `pattern-dashboard` |
| Любой composite, которого нет выше | весь каталог: github.com/gravity-ui/landing/tree/main/src/components/UISamples | — |

## Чего НЕ делать (anti-patterns)

- Это **preview-компоненты лендинга**, не продакшен-приложения — изучай СТРУКТУРУ и композицию, не копируй
  вербатим (упрощения, mock-обвязка, без app-shell — рендерятся внутри `ThemeProvider` лендинга).
- Таблицы в сэмплах (`TablePreview`) — на **uikit `Table` + HOC** (`withTableSelection` / `withTableSorting` /
  `withTableActions`), НЕ `@gravity-ui/table`. Это стандартный путь обычной таблицы; `@gravity-ui/table` — только
  для группировки / tree-rows / DnD-колонок / virtualization (см. routing в `registry.json`).
- `MailPreview` использует `@gravity-ui/uikit/unstable` (`TreeList`) — экспериментальные API; проверь
  стабильность, прежде чем брать в продакшен.
- Навигация неоднородна по контексту: dashboard → `AsideHeader` (navigation); mail → uikit/unstable `TreeList`
  (дерево папок). Обе валидны — выбирай по характеру (app-shell vs дерево), не считай одну единственно верной.
- И `FormPreview`, и `recipe-settings-form` ведут ПОЛЯ через `FormRow` (`@gravity-ui/components`) — идиома
  поля едина (`pattern-form`). Разница между ними — композиция страницы (превью-панель рядом с формой vs
  секции формы, сгруппированные `Flex`), не идиома поля.

## See also

- Паттерны, которые эти эталоны иллюстрируют: `pattern-list` · `pattern-dashboard` · `pattern-form`.
- Источник: github.com/gravity-ui/landing/tree/main/src/components/UISamples (UI-samples с gravity-ui.com).
