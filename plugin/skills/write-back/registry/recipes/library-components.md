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
- `@gravity-ui/components` — peer `@gravity-ui/markdown-editor`: если ставишь редактор, components уже в его bundle (`version-index`).
- Версия требует uikit ^7.39 (`version-index` держит uikit ^7.41).
- Точные пропы и поведение каждого компонента — в его `README.md` (в папке компонента) и Storybook.

## See also

- `r/library-uikit.json` — базовые компоненты (ищи там сначала).
- `r/library-routing.json` — когда какая библиотека.
- `r/recipe-settings-form.json` — FormRow в составе формы настроек.
