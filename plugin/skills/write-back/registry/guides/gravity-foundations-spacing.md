# gravity-foundations/spacing — шкала отступов

> Тип: `gravity-foundations`. Шкала отступов Гравити (library-spanning).

## Шкала

Токены `--g-spacing-0…10` (шаг ≈ 4px: `--g-spacing-1`=4, `2`=8, `4`=16…). Хелперы `spacing()` / `sp()`
(`@gravity-ui/uikit`) возвращают значение по шкале.

## Применение

- `Flex` / `Box`, отступ между детьми: проп **`gap={N}`** — **число-шкала 1-8** (не px и не строка `"md"`);
  `gap={4}` ≈ 16px.
- У `Flex`/`Box` **НЕТ** MUI-стиля `padding`/`margin`-пропов — отступы через `spacing()`/`sp()` (в `style`/классе).
- Не хардкодь пиксели — бери шаг шкалы / токен.

## See also
`library-uikit` (ловушка `Flex/Box gap={1-8}`, нет `padding`/`margin`-пропов).
