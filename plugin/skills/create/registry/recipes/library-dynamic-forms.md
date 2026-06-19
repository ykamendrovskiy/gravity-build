# Каталог: dynamic-forms (@gravity-ui/dynamic-forms)

Библиотека рендеринга форм и значений **по JSON-Schema-спецификации**. Бери, когда поля формы описаны данными (spec), а не фиксированы в коде. Нет upstream AI-доков → этот каталог основной; детали — README и Storybook (<https://preview.gravity-ui.com/dynamic-forms>).

## Когда брать

- Поля формы приходят из конфига/схемы (генерируемые/настраиваемые формы, редакторы параметров по описанию).
- Нужен и ввод, и read-only показ значений по одной и той же схеме.
- **Не для** простой формы из 3-4 фиксированных полей — там проще uikit-контролы (`library-uikit`) + `FormRow` (`library-components`).

## Использование

```tsx
import {DynamicField, Spec, dynamicConfig} from '@gravity-ui/dynamic-forms';
import {Form} from 'react-final-form';

// Ввод — DynamicField встраивается в react-final-form Form:
<Form onSubmit={onSubmit}>
  {() => <DynamicField name={name} spec={spec} config={dynamicConfig} />}
</Form>;

// Read-only показ значений по той же схеме:
import {DynamicView, dynamicViewConfig} from '@gravity-ui/dynamic-forms';
<DynamicView value={value} spec={spec} config={dynamicViewConfig} />;
```

- **`DynamicField`** требует контекста `react-final-form` (оборачивай в `<Form>`).
- **`Spec`** — тип спецификации поля/группы (JSON-Schema-подобный).
- I18N: язык переключается `configure({lang: Lang.Ru})` (по умолчанию `en`).

## Установка (bundle)

Ставить **набором** — у dynamic-forms есть peer-зависимости, которые npm сам не поставит:

- `@gravity-ui/dynamic-forms` + `final-form` + `react-final-form` + `react-is` + `@gravity-ui/uikit`.
- Точные версии — bundle `dynamic-forms` в `r/version-index.json`.

## See also

- `r/library-routing.json` — schema-driven форма vs ручная.
- `r/recipe-settings-form.json` — ручная форма настроек (для сравнения).
- `r/version-index.json` — bundle `dynamic-forms` (peer-граф).
