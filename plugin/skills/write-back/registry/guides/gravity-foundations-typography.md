# gravity-foundations/typography — тайп-скейл

> Тип: `gravity-foundations`. Типографическая система Гравити (library-spanning).

## Текст — через `Text` + `variant`, не сырые теги

Отдельного `Heading` НЕТ, и не верстай `<h1>…<h6>` руками — заголовки и текст = `<Text variant="…">`.

## Скейл вариантов (токены `--g-text-*`)

- Заголовки: `header-1…N`, `subheader-1…N`, `display-1…N`.
- Тело: `body-1` / `body-2` / `body-3` (+ `body-short`).
- Мелкое: `caption-1` / `caption-2`.

Размеры/интерлиньяж — токены `--g-text-<variant>-font-size` / `-line-height`. Шрифты —
`@gravity-ui/uikit/styles/fonts.css` (подключать ПЕРЕД `styles.css`).

## Правила
- Заголовок страницы — `Text variant="header-1"` (не `<h1>` и не выдуманный `Heading`).
- Размер текста — вариантом, не инлайн `font-size`.

## See also
`library-uikit` (`Text`/`Label`; ловушка `Heading→Text`) · `gravity-foundations/color` (цвет текста).
