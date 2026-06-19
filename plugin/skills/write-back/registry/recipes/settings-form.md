# Recipe: Settings Form

Страница настроек / форма параметров из нескольких полей с кнопками submit / cancel.

Форм-контролы в Гравити — это `@gravity-ui/uikit`. Для базовой формы из 5-10 полей других вариантов в стартовом наборе нет.

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
| Опасное действие | `Button view="outlined-danger"` + `Dialog` подтверждения | прямой submit без Dialog | необратимое — через подтверждение |
| Валидацию поля | `validationState="invalid"` + `errorMessage="…"` | `<Text color="danger">` сбоку | штатный API, корректные screen-reader атрибуты |
| Группы полей с заголовками | `<Flex direction="column">` + `Text variant="subheader-2"` сверху, спейсинг между группами больше, чем внутри | плоский список | визуальная иерархия |
| Обвязку (Theme + Toaster) | App-shell ниже | — | без неё нет темы / нельзя показать «Сохранено» |

## Построение формы (раскладка, ширина, описания)

Скелет с одинаковыми `<TextInput label=…>` на всю ширину компилируется, но смотрится сыро. Конвенции хорошей формы:

- **Подпись + описание поля → `FormRow`** (из `@gravity-ui/components`), не инлайновый проп `label=` контрола. `FormRow` даёт сетку «подпись ↔ контрол» и слот описания; инлайновый `label=` запихивает подпись внутрь контрола (это для компактного инлайна, не для страницы настроек).

  ```tsx
  import {FormRow} from '@gravity-ui/components';
  import {TextInput} from '@gravity-ui/uikit';

  <FormRow label="Название проекта" fieldId="projectName" required>
    <TextInput id="projectName" value={name} onUpdate={setName} />
    <FormRow.FieldDescription>Отображается в шапке консоли и в аудит-логе.</FormRow.FieldDescription>
  </FormRow>
  ```

- **Ширина контролов — выровненная, а не «каждый по своему контенту».** Чтобы полоса не разъехалась: в пределах секции дай контролам **единую ширину по большему из значимых полей** (правые края выровнены) — крупные и верхние поля задают размер. По-настоящему компактные (один процент, счётчик из 2–3 цифр) можно оставить узкими, но не делай колонку рваной. Растянутый на всю строку `NumberInput` под «200» — плохо, но и десяток разной ширины полей — тоже. Ориентир по контенту: число/код/процент — узко (≈120–200px), название/slug — средне (≈280–360px), описание — широко; внутри секции подтягивай к большему.
- **Ширина полосы формы** — ограничь (`maxWidth` ≈ 560–720px), не во весь экран.
- **Контрол под задачу** (см. таблицу выше): точное число → `NumberInput`; диапазон/процент с наглядностью → `Slider`; 2–4 взаимоисключающих → `SegmentedRadioGroup`; длинный текст → `TextArea`.
- **Описание поля — два места:**
  - короткое, важное для заполнения → под контролом, `FormRow.FieldDescription`;
  - длинное / второстепенное / «почему так» → в попап **`HelpMark`** рядом с подписью, через слот `labelHelpPopover` (форма не разъезжается вертикально):

  ```tsx
  import {HelpMark} from '@gravity-ui/uikit';

  <FormRow
    label="Шаг раскатки, %"
    labelHelpPopover={<HelpMark>Инкремент процента пользователей при постепенной раскатке.</HelpMark>}
  >
    <Slider min={1} max={100} value={step} onUpdate={setStep} />
  </FormRow>
  ```

> **Что здесь per-service, а не универсально.** Точные числа ширины, политика «единая ширина vs по контенту», дефолт размещения описаний (`FieldDescription` vs `HelpMark`), а также **выравнивание контента страницы и адаптивность** (центрирование, max-width контента, брейкпоинты) — это конвенции уровня **сервиса/команды**, не общегравитийные. Универсальный гайд даёт разумный дефолт; финальную настройку задаёт профиль сервиса (roadmap: per-service-context).

## App-shell (обязательная обвязка)

Самый частый промах — `ToasterProvider` без обязательного пропа `toaster`. Полный setup — в `recipes/app-shell.md`. Кратко:

```tsx
// src/main.tsx
import {createRoot} from 'react-dom/client';
import {ThemeProvider, Toaster, ToasterProvider, ToasterComponent} from '@gravity-ui/uikit';

import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';

import {App} from './App';

const toaster = new Toaster();   // ⚠️ экземпляр на верхнем уровне модуля

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme="light">
    <ToasterProvider toaster={toaster}>      {/* ⚠️ обязательный проп toaster */}
      <App />
      <ToasterComponent />                   {/* ⚠️ контейнер тостов */}
    </ToasterProvider>
  </ThemeProvider>,
);
```

В компоненте: `const {add} = useToaster(); add({name: 'ws-saved', title: 'Сохранено', theme: 'success', autoHiding: 3000})`.

## Skeleton

```tsx
import {useState} from 'react';
import {Button, Checkbox, Flex, Select, Switch, Text, TextInput, useToaster} from '@gravity-ui/uikit';

export function WorkspaceSettings() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [region, setRegion] = useState<string[]>(['eu']);
  const [plan, setPlan] = useState<string[]>(['team']);
  const [publicProjects, setPublicProjects] = useState(false);
  const [integrations, setIntegrations] = useState({slack: true, github: false, digest: true});

  const {add: addToast} = useToaster();

  const slugValid = /^[a-z0-9-]*$/.test(slug);

  const handleSave = () => {
    if (!name.trim() || !slugValid) return;
    addToast({name: 'ws-saved', title: 'Сохранено', theme: 'success', autoHiding: 3000});
  };

  return (
    <Flex direction="column" gap={6} style={{maxWidth: 720, padding: 24}}>
      <Flex direction="column" gap={1}>
        <Text variant="header-1">Настройки рабочего пространства</Text>
        <Text variant="body-2" color="secondary">Параметры команды и интеграции</Text>
      </Flex>

      {/* Группа 1: основное */}
      <Flex direction="column" gap={3}>
        <Text variant="subheader-2">Основное</Text>
        <Flex direction="column" gap={2}>
          <TextInput
            label="Название команды"
            value={name}
            onUpdate={setName}
            validationState={name.trim() ? undefined : 'invalid'}
            errorMessage={name.trim() ? undefined : 'Введите название'}
          />
          <TextInput
            label="Домен (slug)"
            value={slug}
            onUpdate={setSlug}
            validationState={slugValid ? undefined : 'invalid'}
            errorMessage={slugValid ? undefined : 'Только латиница в нижнем регистре, цифры и дефис'}
          />
          <Select
            label="Регион"
            value={region}
            onUpdate={setRegion}
            options={[{value: 'eu', content: 'Европа'}, {value: 'us', content: 'США'}, {value: 'ru', content: 'Россия'}]}
          />
          <Select
            label="Тариф"
            value={plan}
            onUpdate={setPlan}
            options={[{value: 'free', content: 'Free'}, {value: 'team', content: 'Team'}, {value: 'business', content: 'Business'}]}
          />
        </Flex>
      </Flex>

      {/* Группа 2: доступ и интеграции */}
      <Flex direction="column" gap={3}>
        <Text variant="subheader-2">Доступ и интеграции</Text>
        <Flex direction="column" gap={2}>
          <Switch checked={publicProjects} onUpdate={setPublicProjects}>
            Разрешить публичные проекты
          </Switch>
          <Checkbox checked={integrations.slack}  onUpdate={(v) => setIntegrations((s) => ({...s, slack: v}))}>Slack-уведомления</Checkbox>
          <Checkbox checked={integrations.github} onUpdate={(v) => setIntegrations((s) => ({...s, github: v}))}>Синхронизация с GitHub</Checkbox>
          <Checkbox checked={integrations.digest} onUpdate={(v) => setIntegrations((s) => ({...s, digest: v}))}>Еженедельный дайджест</Checkbox>
        </Flex>
      </Flex>

      {/* Кнопки */}
      <Flex gap={2} justifyContent="flex-end">
        <Button view="normal">Отмена</Button>
        <Button view="action" onClick={handleSave}>Сохранить</Button>
      </Flex>
    </Flex>
  );
}
```

Ключевое:
- **Размер всех контролов одинаковый** — не смешивать `size="l"` с `size="s"` на одной странице.
- **Иерархия spacing** — между группами `gap={6}`, внутри группы `gap={2}`. Заголовки секций — `Text variant="subheader-2"`.
- **Одна `view="action"` кнопка** на блок (Save), остальные — `view="normal"`.
- **Validation: `validationState="invalid"` + `errorMessage`** — штатный API, не `<Text color="danger">` сбоку.
- **`Select value` всегда массив** — `value={['eu']}`, `onUpdate={(values) => setRegion(values)}` (single-select — `values[0]`).
- **`<Flex gap={N}>`** — gap это шкала 1-8 (где `4` ≈ 16px), не пиксели. Не `style={{display:'flex', gap:16}}`.

## Package layout

Для формы из 5-10 полей `@gravity-ui/dynamic-forms` (JSON-schema формы) — overkill, берётся для сложных динамических конфигов.

## Чего НЕ делать (anti-patterns)

- Имена не из Гравити: `Toggle` (→ `Switch`), `Dropdown` (→ `Select`), `Input` (→ `TextInput`).
- `Select value` строкой: `value="eu"` → TS-ошибка; нужно `value={['eu']}`.
- `<ToasterProvider>` без `toaster={new Toaster()}` — сборка падает.
- Несколько `view="action"` кнопок на странице — только одна primary.
- Submit без loading / error — хотя бы `loading={isSubmitting}`.

## See also

- `recipes/app-shell.md` — полная обвязка (Theme + Toaster).
- `r/library-routing.json` — форм-контролы и формы посложнее (dynamic-forms / dialog-fields).
- `r/version-index.json` — версии пакетов.
