# gravity-foundations/color — модель цвета

> Тип: `gravity-foundations`. **Модель** цвета Гравити (library-spanning). Как ПОМЕНЯТЬ/брендировать —
> `gravity-foundations/theming` (это ≠ color).

## Двухслойная модель

- **Приватный слой** — `--g-color-private-<hue>-<step>` (сырые оттенки палитры). **Напрямую не используй.**
- **Семантический слой** — ссылается на приватный, по РОЛИ. Бери ЕГО:
  - фон / заливка: `--g-color-base-*` (`base-background`, `base-brand`, `base-generic`, `base-float`,
    `base-danger/info/warning/success-*`…);
  - текст / иконки: `--g-color-text-*` (`text-primary/secondary/hint/brand/danger/…`;
    **`text-brand-contrast`** — текст на бренд-фоне);
  - линии / границы: `--g-color-line-*`.

## Правила

- Бери **семантический** токен по роли — не сырой hex и не приватный токен.
- Текст на брендовом/цветном фоне → `--g-color-text-brand-contrast` (или соответствующий contrast-токен), иначе нечитаемо.
- Кастомизация/бренд/тема — не здесь, а в `theming` (полный набор токенов на ОБЕ темы, не 2-4 штуки).

## See also
`gravity-foundations/theming` (как кастомизировать) · `library-uikit` (`Label`/`Text` — цветовые пропы).
