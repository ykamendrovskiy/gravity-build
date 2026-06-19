# Каталог: navigation (каркас приложения)

`@gravity-ui/navigation` — компоненты каркаса приложения поверх uikit: левое меню, мобильная шапка, страница настроек. У библиотеки нет upstream AI-доков → этот каталог — основной источник; пропы/детали бери из README и Storybook (<https://preview.gravity-ui.com/navigation>).

## Каталог по назначению

| Компонент | Для чего |
|---|---|
| `AsideHeader` | Главный каркас: левое сворачиваемое меню (лого, пункты, футер, панель настроек). Основа дашборда/админки/консоли. |
| `Content` | Контентная область рядом с `AsideHeader`. |
| `Settings` | Каркас страницы настроек: секции/группы слева + поиск по настройкам. |
| `MobileHeader` | Верхний бар для мобильной раскладки. |
| `MobileLogo` / `Logo` | Лого в шапке (мобильной / десктопной). |
| `Footer` | Нижний блок (копирайт, ссылки). |
| `ActionBar` | Верхняя панель действий (toolbar над контентом). |
| `HotkeysPanel` | Выезжающая панель со списком горячих клавиш. |
| `Title` | Заголовок секции в навигации. |
| `TopAlert` | Алерт-полоса вверху приложения. |

## Заметки

- `AsideHeader` читает контекст мобильности — оборачивай приложение в `MobileProvider` (`pattern-app-shell`).
- Версию бери из `version-index` (^4.x: есть скругления hover/selected; ^3.x — нет).
- Полный сценарий «дашборд с AsideHeader + таблицей» — `recipe-dashboard`.

## See also

- `r/library-routing.json` — когда брать navigation vs uikit/page-constructor.
- `r/recipe-dashboard.json` — каркас дашборда целиком.
- `r/pattern-app-shell.json` — ThemeProvider / MobileProvider.
