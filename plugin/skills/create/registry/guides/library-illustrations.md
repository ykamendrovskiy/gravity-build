# Каталог: иллюстрации (`@gravity-ui/illustrations`)

Иллюстрации под пустые / ошибочные состояния — идут в `PlaceholderContainer.image` (uikit). См. также
`library-uikit` (сам компонент) и `registry.json` («Иллюстрации статусов данных» — когда брать).

## Использование

`PlaceholderContainer.image` ждёт **отрендеренный элемент** (`<NotFound/>`), не ссылку на компонент.
Иллюстрации — **named root-exports**. **НЕ** deep-import (`@gravity-ui/illustrations/notFound`, `/error`),
**НЕ** выдуманный `<Illustration name=.../>`. **НЕ** подменяй иллюстрацию большим `<Icon size={80}>` —
пустое / ошибка / **успех** все идут через иллюстрацию (не растянутую иконку; success → `SuccessOperation`).
**И не строй экран результата руками** (центрированный `Icon`+`Text`+`Button` во Flex — частый обход, при
котором весь этот гайд недостижим): экран done/success = тот же `PlaceholderContainer`, вертикально —
`direction="column" align="center"` (verified fanout-01, uikit 7.43).
И **покраска `--gil-color-*` (ниже) не опциональна** — без неё svg рендерится, но **бесцветный/невидимый**
(частый наивный промах: импортируют иллюстрацию, а шаг покраски пропускают → на экране «пусто»).

```tsx
import {NotFound, NoSearchResults, InternalError, AccessDenied} from '@gravity-ui/illustrations';
<PlaceholderContainer image={<NotFound />} title="Здесь пока пусто" actions={[{text: 'Добавить', onClick}]} />
```

## Имена (verified, v2.1) — под UI-Stack-состояния

- пусто / первый запуск → `NotFound` / `UnableToDisplay` (или **доменная**: `Folder` / `Project` / `Database` / `Disk` / `Network` / `Bucket`)
- нет результатов фильтра → `NoSearchResults`
- ошибка загрузки → `InternalError`
- нет доступа → `AccessDenied`
- успех → `SuccessOperation`

Полный набор (21): `AccessDenied` · `Bucket` · `Chart` · `Database` · `Detail` · `Disk` · `Feature` ·
`Folder` · `History` · `Identity` · `InternalError` · `Network` · `NoSearchResults` · `NotFound` ·
`Project` · `Queue` · `Snapshot` · `SuccessOperation` · `Template` · `UnableToDisplay` · `VirtualMachine`.

## Покраска — обязательна и ПО ТЕМАМ (иначе иллюстрации бесцветные/невидимые)

У пакета нет готового CSS; цвета — токены `--gil-color-*`, которые задаются **на каждую тему**
(`.g-root_theme_light` / `_dark` / при нужде `-hc`) через **приватные бренд-токены Гравити**.
Значения ниже — для **дефолтного бренда Гравити** (он `yellow`): `brand-*` заменён на `yellow-*` с тем же
индексом. **Кастомный бренд** — замени `yellow` на токен своего бренда (или используй sass-миксин, см. ниже).

```css
/* в index.css, ПОСЛЕ стилей uikit */
.g-root_theme_light {
  --gil-color-object-base:        var(--g-color-private-yellow-550-solid);
  --gil-color-object-hightlight:  var(--g-color-private-yellow-350-solid); /* NB: в пакете именно "hightlight" (опечатка апстрима) */
  --gil-color-object-accent-heavy: var(--g-color-private-yellow-650-solid);
  --gil-color-object-accent-light: var(--g-color-private-white-1000-solid);
  --gil-color-object-danger:      var(--g-color-private-red-550-solid);
  --gil-color-shadow-over-object: var(--g-color-private-yellow-650-solid);
  --gil-color-background-lines:   var(--g-color-private-yellow-650-solid);
  --gil-color-background-shapes:  var(--g-color-private-yellow-100-solid);
}
.g-root_theme_dark {
  --gil-color-object-base:        var(--g-color-private-yellow-550-solid);
  --gil-color-object-hightlight:  var(--g-color-private-yellow-700-solid);
  --gil-color-object-accent-heavy: var(--g-color-private-yellow-350-solid);
  --gil-color-object-accent-light: var(--g-color-private-white-1000-solid);
  --gil-color-object-danger:      var(--g-color-private-red-550-solid);
  --gil-color-shadow-over-object: var(--g-color-private-yellow-500-solid);
  --gil-color-background-lines:   var(--g-color-private-yellow-650-solid);
  --gil-color-background-shapes:  var(--g-color-private-yellow-200-solid);
}
```

Альтернатива со sass (дефолтные бренд-значения по темам, без ручных индексов):
```scss
@import '@gravity-ui/illustrations/styles/theme.scss';
.g-root {
  &_theme_light    { @include g-illustrations-colors-light; }
  &_theme_dark     { @include g-illustrations-colors-dark; }
  &_theme_light-hc { @include g-illustrations-colors-light-hc; }
  &_theme_dark-hc  { @include g-illustrations-colors-dark-hc; }
}
```

> Значения сверены с дефолтной темой Гравити (Themer / `theme.scss`): `--gil-*` → `--g-color-private-brand-*-solid`,
> а `brand` дефолтного бренда = `yellow`. Если сервис задаёт свой бренд через профиль — иллюстрации
> подхватят его, если ссылаться на бренд-токены (не на `yellow` напрямую).

## See also
- `library-uikit` — `PlaceholderContainer` (компонент, куда идёт `image`).
- `registry.json` — «Иллюстрации статусов данных» (когда брать пакет).
- `registry.json` — версия `@gravity-ui/illustrations` (`libraries[]`).
