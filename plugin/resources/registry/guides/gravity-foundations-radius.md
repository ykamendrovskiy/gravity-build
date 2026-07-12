# gravity-foundations/radius — радиусы

> Тип: `gravity-foundations`. Скругления Гравити (library-spanning).

## Токены

`--g-border-radius-xs / s / m / l / xl`. У компонентов — свои производные (`--g-button-border-radius`,
`--g-card-border-radius`, `--g-list-container-border-radius`…), завязанные на ту же шкалу.

## Правила
- Бери токен радиуса, не хардкодь px.
- Кастомный компонент в стиле Гравити → `border-radius: var(--g-border-radius-m)` (или подходящий шаг).

## See also
`gravity-foundations/spacing` · `gravity-foundations/color`.
