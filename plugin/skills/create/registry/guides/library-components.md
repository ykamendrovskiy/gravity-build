# Каталог: components (@gravity-ui/components)

Надстройка над uikit: «A set of complex React components» — составные и прикладные компоненты, которых в самом uikit нет. **Сначала ищи в uikit** (`library-uikit`) — базовые контролы там; сюда иди за готовыми составными блоками. Нет upstream AI-доков → этот каталог основной; пропы/детали из per-component README и Storybook (<https://preview.gravity-ui.com/components>). Описания ниже — из README каждого компонента.

## Каталог по назначению

**Формы и ввод:**

| Компонент | Для чего |
|---|---|
| `FormRow` | Поле формы с выровненной подписью (строка label↔контрол). |
| `DelayedTextInput` | `TextInput` с отложенной (debounced) выдачей значения. |
| `TokenizedInput` | Поле для запросов/фильтров, где выражения — токены. |
| `ItemSelector` | Формирование подмножества из списка (напр. набор колонок). |

**Диалоги и оверлеи:**

| Компонент | Для чего |
|---|---|
| `ConfirmDialog` | Диалог подтверждения действия. |
| `ChangelogDialog` | Модалка-чейнджлог: список версий продукта. |
| `PromoSheet` | Промо-диалог о новой фиче (мобильное приложение сервиса). |
| `SharePopover` | Поповер «поделиться». |

**Навигация и контент:**

| Компонент | Для чего |
|---|---|
| `AdaptiveTabs` | Табы; не влезающие по ширине уходят в выпадающий список «More». |
| `Gallery` | Галерея данных любого типа (просмотр с навигацией). |
| `InfiniteScroll` | Бесконечный список (лента, история): подгрузка при прокрутке вниз. |
| `Stories` | Информирование пользователя (новые фичи, анонсы) в формате stories. |
| `StoriesGroup` | Несколько групп stories. |
| `OnboardingMenu` | Чеклист онбординга: шаги освоения продукта (поверх `@gravity-ui/onboarding`). |

**Уведомления и вовлечение:**

| Компонент | Для чего |
|---|---|
| `Notifications` | Центр/список уведомлений (десктоп и touch). |
| `Notification` | Одиночная карточка уведомления. |
| `Reactions` | Пользовательские реакции-эмодзи (👍 😊 …). |
| `CookieConsent` | Баннер согласия на cookie. |
| `StoreBadge` | Бейджи-ссылки на Google Play / App Store. |

## Заметки

- Базовые контролы (Button, TextInput, Select, Switch…) — **в uikit**, не здесь.
- `@gravity-ui/components` — peer `@gravity-ui/markdown-editor`: если ставишь редактор, components уже в его bundle (`registry.json` → `bundles[]`).
- Версия требует uikit ^7.39+; точный пин uikit — в `registry.json` (`libraries[]`).
- Точные пропы и поведение каждого компонента — в его `README.md` (в папке компонента) и Storybook.

## ConfirmDialog — подтверждение деструктива / несохранённого (data-safety)

Канонический диалог подтверждения (удаление, «закрыть без сохранения»). Пропы verified против установленного пакета:

```tsx
import {ConfirmDialog} from '@gravity-ui/components';

<ConfirmDialog
  open={open}
  onClose={() => setOpen(false)}
  title="Удалить запись?"                        // строка; НЕ `caption`
  message="Действие необратимо."                 // ReactNode
  textButtonApply="Удалить"
  textButtonCancel="Отмена"
  onClickButtonApply={handleDelete}
  onClickButtonCancel={() => setOpen(false)}
  propsButtonApply={{view: 'outlined-danger'}}   // danger-вид кнопки применения для деструктива
/>
```

Форма пропа: `title?: string` + `message?: ReactNode` + спред `DialogProps` (`open` / `onClose` / `size`…) +
футер-пропы из `DialogFooterProps` (`textButtonApply` / `textButtonCancel` / `onClickButtonApply` /
`onClickButtonCancel` / `propsButtonApply` / `propsButtonCancel`). **Шапка — `title`, НЕ `caption`** (частый
промах). Низкоуровневая альтернатива с кастомным контентом — `Dialog` (uikit: Header / Body / Footer).

## FormRow — выравнивание подписи с ВЫСОКИМ контролом (verified fanout-02)

Дефолт `FormRow` рассчитан на однострочный контрол: `.gc-form-row__left` держит `min-height: 28px`, подпись
центрируется (`align-self: center`). С **высоким** контролом (вертикальная `RadioGroup`, список опций,
multi-строчный блок) подпись опускается ниже первой строки контрола (замер: +6px уже на 3 радио-опциях).
Пропа выравнивания у `FormRowProps` НЕТ — только `className`:

```css
.form-row-align-top .gc-form-row__left { min-height: 0; }
.form-row-align-top .gc-form-row__field-name { align-self: flex-start; }
```

Вешай класс на строки с высокими контролами; однострочные (TextInput/Select) оставляй на дефолтном
центрировании — там оно корректно.

## See also

- `library-uikit.md` — базовые компоненты (ищи там сначала).
- `registry.json` — когда какая библиотека (routing) + версии (`libraries[]`).
- `recipe-settings-form.md` — FormRow в составе формы настроек; `pattern-form` — раскладка формы.
