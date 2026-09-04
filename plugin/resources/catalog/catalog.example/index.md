# Каталог решений — пример (фрагмент; сайт дизайн-системы на Next.js)

Что уже есть и из чего собрано. Перед новой страницей сверься: не изобретай новое без необходимости,
а если существующее не подходит — скажи почему. Построил новое — добавь карточку.

## Страницы (по устройству)
- **archetype-landing** — `/` · витринная full-width страница на page-constructor с кастомными блоками · код: `src/pages/index.tsx, src/content/landing.ts`
- **archetype-docs-article** — `/docs/<chapter>/<article>` · текстовая страница раздела с сайдбаром; примеры через ExampleBlock · код: `src/pages/docs/[sectionId]/[articleId].tsx, src/components/DocsPage/DocsPage.tsx`
- **archetype-library-catalog** — `/libraries` · галерея сущностей с поиском и карточками · код: `src/pages/libraries/index.tsx, src/components/Libraries/Libraries.tsx`
- **archetype-media** — `/media` · контентная страница из YAML на штатных блоках page-constructor, без кода · код: `src/pages/media/index.tsx, src/content/media-<locale>.yaml`

## Каркас
- **layout-shell** — хром сайта: меню, футер, тема, внутренний скролл · код: `src/components/Layout/Layout.tsx`

## Источники данных
- **data-lib-versions** — версии и даты публикации библиотек семейства (npm через серверный слой) · код: `src/api/server.ts` · ограничения: сеть на SSR · окружение: без GITHUB_TOKEN звёзды/лицензия пусты

## Как принято в репо
- **Живые примеры** — файл `*Example.tsx` в `src/content/components/<lib>/examples/components/`, в MDX — через ExampleBlock (пример: `uikit/examples/components/`)
- **Заголовки через i18n** — ключи в `public/locales/<l>/<namespace>.json`; новый namespace — во все локали (пример: `public/locales/en/design-articles-info.json`)

## Вне каталога, но существует
- **blog** — `/blog` · лента постов на blog-constructor со своей механикой; обложки и даты постов — `src/pages/api/blog-posts.ts`
