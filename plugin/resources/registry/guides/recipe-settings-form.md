# Recipe: Settings Form

Гравити-сборка страницы настроек / формы из нескольких полей с submit / cancel.

> **Тонкий рецепт** (ADR-0005): здесь — Гравити-специфика (какие контролы, hard-part-сниппеты, обвязка). Что
> делает форму хорошей и как скомпоновать её целиком (раскладка, состояния, data-safety) — `pattern-form`
> (+ `interface-foundations`). Полный copy-paste «скелет всей страницы» намеренно НЕ даём — композицию собирает
> модель по контракту паттерна, чтобы не клонировать пример буквально.

Форм-контролы в Гравити — `@gravity-ui/uikit`. Для базовой формы из 5-10 полей других вариантов в стартовом наборе нет.

## Хочу → бери / не бери

| Хочу | Бери | НЕ бери | Почему |
|---|---|---|---|
| Текстовое поле | `TextInput` | `<input>`, `Input` | каноническое имя; label / error / validationState |
| Число | `NumberInput` | `TextInput type="number"` | корректные клавиши / parsing |
| Выбор одного из списка | `Select` с `value={[v]}` (массив!) | `Dropdown`, `<select>` | `Dropdown` — меню (action-button), `Select` — input; `value` у Select **всегда массив** |
| Тогл (одна настройка вкл/выкл) | `Switch` | `Toggle`; `Checkbox` для настройки | в Гравити имя — `Switch`; Checkbox — для пунктов в списке |
| Чекбокс | `Checkbox` | `<input type="checkbox">` | штатный, с indeterminate |
| Радиогруппа (список вариантов) | `RadioGroup` | `Radio` поштучно | state-controller + keyboard-nav |
| Выбор 2–4 взаимоисключающих, видны сразу | `SegmentedRadioGroup` | `Select` для 2–3 опций | сегменты видны без раскрытия списка |
| Диапазон / процент, где наглядность важнее точной цифры | `Slider` | `NumberInput`, когда нужен тактильный выбор | визуальный выбор значения |
| Подпись поля + описание | `FormRow` (`label` + `FormRow.FieldDescription`) из `@gravity-ui/components` | инлайновый проп `label=` у контрола, когда поле несёт описание | `label=` крамшит подпись ВНУТРЬ контрола (компактный инлайн, не раскладка формы) |
| Submit / Cancel | `Button view="action"` (Save) + `view="normal"` (Cancel) | одинаковые view; несколько action-кнопок | одна action-кнопка на блок — визуальный приоритет |
| Опасное / необратимое действие | `ConfirmDialog` (`@gravity-ui/components`) подтверждение | прямой submit без подтверждения | необратимое — через подтверждение (см. `library-components`) |
| Валидацию поля | `validationState="invalid"` + `errorMessage="…"` | `<Text color="danger">` сбоку | штатный API, корректные screen-reader атрибуты |
| Группы полей с заголовками | `<Flex direction="column">` + `Text variant="subheader-2"` сверху, спейсинг между группами больше, чем внутри | плоский список | визуальная иерархия |
| Обвязку (Theme + Toaster) | App-shell ниже | — | без неё нет темы / нельзя показать «Сохранено» |

## Построение формы — Гравити-реализация (hard-parts)

> **Что делает форму хорошей** (FormRow vs инлайн `label=`, выравнивание ширины, размещение описаний,
> валидация, data-safety) — агностичный спек **`pattern-form`**. Здесь — неочевидные Гравити-куски.

- **Подпись + описание → `FormRow`** (`@gravity-ui/components`), не инлайновый `label=` контрола. **`validationState` / `errorMessage` — на КОНТРОЛЕ, НЕ на `FormRow`** (канон граблей — `library-components` «FormRow — грабли»):

  ```tsx
  import {FormRow} from '@gravity-ui/components';
  import {TextInput} from '@gravity-ui/uikit';

  <FormRow label="Название проекта" fieldId="projectName" required>
    <TextInput
      id="projectName" value={name} onUpdate={setName}
      validationState={nameOk ? undefined : 'invalid'}      // валидация — на КОНТРОЛЕ, не на FormRow
      errorMessage={nameOk ? undefined : 'Введите название'}
    />
    <FormRow.FieldDescription>Отображается в шапке консоли и в аудит-логе.</FormRow.FieldDescription>
  </FormRow>
  ```

- **Длинное / второстепенное описание → `HelpMark`** в слоте `labelHelpPopover` (форма не разъезжается):

  ```tsx
  import {HelpMark} from '@gravity-ui/uikit';

  <FormRow
    label="Шаг раскатки, %"
    labelHelpPopover={<HelpMark>Инкремент процента пользователей при постепенной раскатке.</HelpMark>}
  >
    <Slider min={1} max={100} value={step} onUpdate={setStep} />
  </FormRow>
  ```

- Ширину полосы формы ограничь (`maxWidth` ≈ 560–720px); ширину контролов в секции выравнивай (см. `pattern-form`).

## App-shell (обязательная обвязка)

Полный setup (ThemeProvider + fonts/styles + Toaster-экземпляр на верхнем уровне модуля +
`ToasterProvider toaster={…}` — обязательный проп + `<ToasterComponent/>`) — **канон `scaffold-app-shell`**,
сюда не копируется. Самый частый промах — `ToasterProvider` без обязательного пропа `toaster`.

В компоненте: `const {add} = useToaster(); add({name: 'ws-saved', title: 'Сохранено', theme: 'success', autoHiding: 3000})`.

## Package layout

Для формы из 5-10 полей `@gravity-ui/dynamic-forms` (JSON-schema формы) — overkill, берётся для сложных динамических конфигов.

## Чего НЕ делать (anti-patterns)

- Имена не из Гравити: `Toggle` (→ `Switch`), `Dropdown` (→ `Select`), `Input` (→ `TextInput`).
- `Select value` строкой: `value="eu"` → TS-ошибка; нужно `value={['eu']}`.
- `<ToasterProvider>` без `toaster={new Toaster()}` — сборка падает.
- Несколько `view="action"` кнопок на странице — только одна primary.
- Submit без loading / error — хотя бы `loading={isSubmitting}`.

## See also

- `pattern-form` — агностичный спек формы (раскладка, контракт, data-safety); `scaffold-app-shell.md` — обвязка (Theme + Toaster).
- `library-components.md` — `FormRow`, `ConfirmDialog` (API подтверждения).
- `registry.json` — форм-контролы и формы посложнее (routing: dynamic-forms / dialog-fields) + версии.
