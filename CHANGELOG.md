# Changelog

## 0.1.5 — beta (2026-06-24)

- Добавлена библиотека иллюстраций **`@gravity-ui/illustrations`** (`^2.1.1`) в закреплённый набор — для пустых и ошибочных состояний (`PlaceholderContainer`), чтобы не растягивать иконку вместо иллюстрации. В каталоге uikit отмечено, что `image` у `PlaceholderContainer` — обязательный проп.

## 0.1.4 — beta (2026-06-22)

- Освежены закреплённые версии Gravity-пакетов (сверка с npm на 2026-06-22): **`@gravity-ui/navigation` 4 → 6** (AsideHeader; v6 вернул v4-форму API `compact`/`renderFooter`, добавил `menuGroups`/`menuOverflow`), **`@gravity-ui/uikit` 7.41 → 7.42** (peer navigation@6), `@gravity-ui/components` 4.22, `dynamic-forms` 5.18, `markdown-editor` 15.41. Без изменений: `icons`, `page-constructor`, `table`, `date-*`.
- Валидация: 3 независимые «наивные» сборки дашборда (AsideHeader + таблица с группировкой и выделением строк) — Tier 0 (`tsc && vite build`) + проверка в браузере чистые на новых версиях; navigation@6 регрессий не дал.

## 0.1.3 — beta (2026-06-19)

- page-constructor: роутинг конфигов блоков на **канонические шаблоны пакета** (`editor/data/templates/<block>.json` — готовые к вставке) + установленные `.d.ts` для форм пропов; usage-доки = сабблоки.
- Смягчён совет по `slider-block` (канон не задаёт `slidesToShow`); уточнены формы блоков `companies-block` (полоса `images:{desktop,mobile}`, не массив) и `quote` (`image`+`logo` обязательны).
- Иконки: решение по смыслу (`@gravity-ui/icons` если подходит, иначе подобрать уместную), не мандат и не рисовать вслепую.
- Примечание: у `TextInput` нет пропа `width` (это `Select`).

## 0.1.2 — beta (2026-06-19)

- Исправлен роутинг доков page-constructor: блоки перечислять через GitHub API contents (а не угадывать имена файлов → 404); имя файла usage-доки = camelCase имя компонента (`headerBlock.md`), не kebab-`type` (`header-block`); покрытие неполное (`extended-features-block`/`questions-block` без usage-доки) → запасной путь: TS-типы в `src/blocks/`.

## 0.1.1 — beta (2026-06-19)

- Скилл сборки переименован `gravity-prototype` → `create` (вызывается как `gravity-build:create`).
- README: команды установки разнесены на отдельные блоки + HTTPS-URL + раздел про проблемы с SSH.

## 0.1.0 — beta (2026-06-19)

- Первая публичная бета.
- Скиллы: `gravity-build` (сборка), `synthesize-profile` (синтез профиля через интервью),
  `write-back` (сворачивание фидбека в слои знания), `feedback` (оформление фидбека тестера).
- Knowledge-registry: 6 библиотек Gravity UI, recipes (лендинг / дашборд / форма / настройки),
  version-index, паттерны (app-shell, theming).
- Per-service профиль (опционально): `service-profile.json` в корне целевого проекта.
