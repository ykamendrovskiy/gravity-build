# Каталог решений — пример (фрагмент; сайт дизайн-системы на Next.js)

Одна строка на единицу: где код · что это · грабли (если наступали). Перед новой страницей сверься
с каталогом: что уже есть и как устроено; не изобретай новое без необходимости, а если существующее
не подходит — скажи почему. Что построил, что взял отсюда и почему не подошло существующее, на что
наступил — допиши сюда.

## Страницы (по устройству)

- **archetype-landing** — `/` · витринная full-width страница: секции, карточки, CTA на page-constructor с кастомными блоками · код: `src/pages/index.tsx, src/content/landing.ts`
- **archetype-docs-article** — `/docs/<chapter>/<article>` · текстовая страница раздела с сайдбаром; примеры кода через ExampleBlock в MDX · код: `src/pages/docs/[sectionId]/[articleId].tsx, src/components/DocsPage/DocsPage.tsx`
  - грабли: MDX подключает компоненты uikit и сетку конструктора только при явном флаге `withComponents` · сетка конструктора в MDX вне PC-страниц — колонки content-box
- **archetype-library-catalog** — `/libraries` · галерея сущностей с поиском и карточками с внешними метаданными · код: `src/pages/libraries/index.tsx, src/components/Libraries/Libraries.tsx`
- **archetype-media** — `/media` · контентная страница из YAML на штатных блоках page-constructor, без кода · код: `src/pages/media/index.tsx, src/content/media-<locale>.yaml`
  - грабли: `table-block` не адаптивен на 375 · ссылки в PC-блоках по умолчанию с темой `file-link`

## Каркас

- **layout-shell** — хром сайта: меню, футер, тема, внутренний скролл · код: `src/components/Layout/Layout.tsx`
  - грабли: скролл — контейнер `#content`, не документ (fullPage-скриншоты не работают)

## Источники данных

- **data-lib-versions** — актуальные версии и даты публикации библиотек семейства (npm через серверный слой) · код: `src/api/server.ts fetchAllLibsOnlyWithMetadata` · ограничения: сеть на SSR; GitHub-часть без токена деградирует
- **data-packages-versions** — версии 6 пакетов из package.json сайта — только для бейджа сайдбара · код: `src/data/packages-versions.json` · ограничения: 6 пакетов из 36, без дат

## Как принято в репо

- **Живые примеры** — файл `*Example.tsx` в `src/content/components/<lib>/examples/components/`, экспорт через barrel; в MDX — через ExampleBlock (пример: `src/content/components/uikit/examples/components/`)
- **Заголовки через i18n** — ключи в `public/locales/<l>/<namespace>.json`; новый namespace — во все локали, как принято в репо (пример: `public/locales/en/design-articles-info.json`)
- **Проверки** — `tsc --noEmit`, `eslint --fix`, `stylelint`, `madge --circular`; husky pre-commit; e2e-снапшот главной инвалидируется правкой меню/футера (пример: `.husky/pre-commit`)

## Вне каталога, но существует

- **blog** — `/blog` · лента постов на blog-constructor со своей механикой; источник обложек и дат постов — `src/pages/api/blog-posts.ts`
- **stand** — `/__stand` · внутренний стенд, остаток спецпроекта — к закрытию
