# gravity-foundations/spacing — шкала отступов

> Тип: `gravity-foundations`. Шкала отступов Гравити (library-spanning).

## Шкала

Токены `--g-spacing-0…10` (шаг ≈ 4px: `--g-spacing-1`=4, `2`=8, `4`=16…). Хелперы `spacing()` / `sp()`
(`@gravity-ui/uikit`) возвращают значение по шкале.

## Применение

- `Flex` / `Box`, отступ между детьми: проп **`gap={N}`** — целое из шкалы **`0…10` плюс единственная половинка `0.5`**
  (`1.5`, `2.5` и т.п. НЕ типизируются → TS2322; тип `Space`, verified uikit@7.50 source + tsc-репро `gap={1.5}`); `gap={4}` ≈ 16px. Строковая форма числа шкалы (`"4"`)
  типизируется тоже — но пиши числом; произвольные строки (`"md"`, `"16px"`) не типизируются.
- У `Flex`/`Box` **НЕТ** MUI-стиля `padding`/`margin`-пропов — отступы через `spacing()`/`sp()` (в `style`/классе).
  (verified uikit@7.50 tsc-репро: `<Flex padding={4}/>` и `<Box margin={2}/>` падают TS2322)
- Не хардкодь пиксели — бери шаг шкалы / токен.

## See also
`library-uikit` (грабли `Flex/Box gap`, нет `padding`/`margin`-пропов).
