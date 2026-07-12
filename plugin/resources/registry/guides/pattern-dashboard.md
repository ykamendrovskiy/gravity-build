# pattern-dashboard — дашборд / админка (агностичный спек вида)

> Тип: `pattern`. Что есть хороший дашборд / админка, безотносительно сборки. Композиция + контракт.
> **Ссылается** на `interface-foundations` (состояния таблицы) и под-паттерн `pattern-actions-panel`.
> Гравити-сборка (AsideHeader, таблицы, grouping / DnD, код) — `recipe-dashboard`.

## Композиция

1. **Постоянная боковая навигация** по разделам (сворачивается в иконки).
2. **Рабочая область** в центре — часто таблица данных, с которыми постоянно работают
   (фильтрация, выделение, группировка).
3. **Выбор строк ⇒ массовые действия** (см. `pattern-actions-panel`).
4. Опц. панель действий / фильтров над рабочей областью.

## Как дашборд реализует состояния (контракт → interface-foundations §1)

Рабочая таблица — асинхронные данные ⇒ полный контракт состояний:

- **Loading:** `Skeleton` на месте строк (block-level), сайдбар уже на месте (не грузится вместе с данными).
- **Empty:** `PlaceholderContainer` в рабочей области (раздел без данных).
- **Partial / Error:** как в `interface-foundations` (page-level load-fail = full-area + retry; block / фон — компактно).
- **Ideal:** таблица с данными.

Сценарии этого контракта сделай достижимыми и **задекларируй** — dev-переключатель + `scenarios.manifest.json`
(id: `ideal` / `empty` / `loading` / `error`) → `scaffold-app-shell` «Сценарии состояний».

## Ручки сервиса (profile)

Набор разделов (`sections`), плотность таблицы (`density`), группировка по умолчанию (`defaultGrouping`), `headerDecoration` сайдбара. Омиссия = дефолт.

## Дальше

- Гравити-сборка (AsideHeader + `@gravity-ui/table` grouping / tree / DnD + column-reorder + TanStack-pitfalls):
  **`recipe-dashboard`**.
- Массовые действия над выбором: **`pattern-actions-panel`**.
- Эталонные composite-дашборды (реальный код Гравити): **`reference-interfaces`**.
