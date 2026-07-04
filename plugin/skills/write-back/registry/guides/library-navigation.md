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

## AsideHeader: слоты, итемы, футер, лого (verified nav 6.1 / .d.ts + tsc, write-back Storage CD)

**Слоты сверху вниз** (сетка вертикальная, названия обманчивы):

```
logo                      ← самый верх
subheaderItems: AsideHeaderItem[]   ← СРАЗУ ПОД ЛОГО (top-slot! не «сбоку» и не «вспомогательный»)
menuItems: AsideHeaderItem[]        ← основной список
renderFooter={(data) => <FooterItem …/>}   ← низ
```

- **`subheaderItems` — верх, не бок:** settings / help / профиль пользователя туда НЕ клади — их место в
  футере (типовой промах: «sub» звучит как вторичное → уехало наверх под лого).
- **Симметрии subheader↔footer НЕТ:** низ — только функция `renderFooter`, итемы в ней — `<FooterItem>`.
  **`FooterItem` экспортируется из корня** (`import {FooterItem} from '@gravity-ui/navigation'` — verified tsc
  @6.1.2; не ищи deep-путей: сквозной реэкспорт root→components→AsideHeader).
- **`AsideHeaderItem` — плоский** (`extends MenuItem`: `id`/`title`/`icon`/`onItemClick`/`current`…), БЕЗ
  обёртки `{item: {...}}` — обёртка = домысел, TS2353.
- **Лого:** `logo.icon` = `IconProps['data']` (React-компонент/IconData, НЕ JSX `<svg>…</svg>`); для готового
  SVG-файла/data-URI проще **`logo.iconSrc: string`** (+ `iconSize`) — кастомный логотип без создания
  React-компонента.

**Брендинг поверх AsideHeader — переменными, не хаком классов.** Кастомизация — через публичные CSS-переменные
`--gn-aside-header-*` (`background-color`, `item-current-background-color`, `item-background-color-hover`,
`item-icon-color`, `item-expanded-radius`…) + токены темы. **НЕ переопределяй внутренние `gn-*`-классы широкими
`[class*='gn-…']`-селекторами с ручными паддингами/отрицательными margin:** такие оверрайды пишутся под одну
конкретную структуру и ломаются при её изменении (реальный кейс: aside был норм, добавили subheader/footer-секции —
поехала ширина кнопок: компенсация `margin-left:-8px` на `icon-place` была заскоуплена по ID только на
menu-items-бар, новые composite-бары секций остались нескомпенсированными). Корпоративный брендинг-слой —
дом в **service-profile (theme)**, не в компонентных селекторах.

## Заметки

- `AsideHeader` читает контекст мобильности — оборачивай приложение в `MobileProvider` (`scaffold-app-shell`).
- Версию бери из `registry.json` (`libraries[]`); не откатывай на старые мажоры (теряются скругления hover/selected).
- Полный сценарий «дашборд с AsideHeader + таблицей» — `recipe-dashboard`.

## See also

- `registry.json` — когда брать navigation vs uikit/page-constructor (routing) + версия (`libraries[]`).
- `recipe-dashboard.md` — каркас дашборда целиком.
- `scaffold-app-shell.md` — ThemeProvider / MobileProvider.
