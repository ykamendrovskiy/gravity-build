# Changelog

## 0.1.2 — beta (2026-06-19)

- Исправлен роутинг доков page-constructor: блоки перечислять через GitHub API contents (а не угадывать имена файлов → 404); имя файла usage-доки = camelCase имя компонента (`headerBlock.md`), не kebab-`type` (`header-block`); покрытие неполное (`extended-features-block`/`questions-block` без usage-доки) → fallback на TS-типы в `src/blocks/`.

## 0.1.1 — beta (2026-06-19)

- Скилл сборки переименован `gravity-prototype` → `create` (вызывается как `gravity-build:create`).
- README: команды установки разнесены на отдельные блоки + HTTPS-URL + troubleshooting (SSH).

## 0.1.0 — beta (2026-06-19)

- Первая публичная бета.
- Скиллы: `gravity-build` (сборка), `synthesize-profile` (синтез профиля через интервью),
  `write-back` (сворачивание фидбека в слои знания), `feedback` (оформление фидбека тестера).
- Knowledge-registry: 6 библиотек Gravity UI, recipes (лендинг / дашборд / форма / настройки),
  version-index, паттерны (app-shell, theming).
- Per-service профиль (опционально): `service-profile.json` в корне целевого проекта.
