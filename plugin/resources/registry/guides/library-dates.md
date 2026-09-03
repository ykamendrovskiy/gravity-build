# Каталог: Даты и время (date-components + date-utils)

Две библиотеки в паре. date-components (v4+) **везёт AI-доки прямо в пакете** — `node_modules/@gravity-ui/date-components/dist/docs/` (`INDEX.md` + `components/<Name>.md`): это source of truth по API, именам экспортов и пропам, сверяй там. date-utils AI-доков не везёт — его API из README / типов.

## Что → бери

| Хочу | Бери | НЕ бери |
|---|---|---|
| Парсить / форматировать / считать даты (значения) | `@gravity-ui/date-utils` | `moment` / `dayjs` / голый `Date` для парсинга |
| UI: дата-пикер, календарь, выбор диапазона, относительные даты | `@gravity-ui/date-components` | `<input type="date">`; самописный календарь |

## date-utils (значения)

Хелперы для Date/Time. Ключевое:

```ts
import {dateTimeParse, dateTime} from '@gravity-ui/date-utils';

dateTimeParse('2021-08-07')?.format('YYYY-MM-DD');   // парсинг строки/массива/ts/объекта
dateTimeParse([2021, 7, 7])?.format(FMT);
dateTimeParse('now-1d')?.format(FMT);                // относительные: now, now-1d, now/d, now+1M
dateTimeParse('2021-08-07')?.fromNow();              // человекочитаемо относительно сейчас («3 года назад»)
dateTime({input, timeZone});                          // конструктор значения
```

Для «человекочитаемой даты» в UI: `.format('DD MMM YYYY')` (абсолютная) или `.fromNow()` (относительная, moment-стиль).

- `dateTimeParse(input)` возвращает значение или `undefined` (на некорректном входе) — проверяй на `undefined`.
- Поддержка таймзон и относительных выражений (`now-1d+1M`, `now/d`) из коробки — не реализуй руками.

## date-components (UI)

Готовые контролы дат поверх date-utils: дата-пикеры, календарь, диапазоны, relative-date-пикер. **Точные имена экспортов и пропы — из шипнутых AI-доков:** `dist/docs/INDEX.md` + `dist/docs/components/<Name>.md` (DateField, DatePicker, Calendar, RangeCalendar, RelativeDateField, RelativeDatePicker); Storybook <https://preview.gravity-ui.com/date-components> — для визуала. Значения они принимают/отдают в формате `date-utils` — связывай через него, не конвертируй руками.

## Грабли контракта

- **Локаль ГРУЗИТСЯ, а не только ставится.** `lang` в `ThemeProvider` задаёт язык, но данные локали
  надо загрузить: `await settings.loadLocale('ru')` из `@gravity-ui/date-utils` **до** рендера — иначе
  даты рисуются в дефолтной локали. При переключении языка — грузи до switch; при мультиязычии — прелоад
  всех нужных локалей на старте. (verified date-components@4.0 dist/docs/INDEX.md + date-utils@2.7 `settings.loadLocale`)
- **Invalid-даты (v4): displayed молча ≠ value.** С 4.0.0 поле **показывает** невалидную дату (напр. `31.02`)
  и не снапает её к валидной; но `onUpdate` зовётся **только на валидном значении** → connected value молча
  остаётся прежним, отображаемый текст с ним расходится. Лови невалид через `validationState="invalid"` +
  `errorMessage` (out-of-bounds min/max поле само рисует как invalid). Сигнатура: `onUpdate: (value: DateTime | null) => void`.
  (verified date-components@4.0 — стенд + Playwright, dist/docs/components/DateField.md)
- **onUpdate только на валидном (v4).** `RelativeDateField`/`DateField` НЕ стреляют `onUpdate` на промежуточных
  невалидных вводах (набор «now-1d» посимвольно = onUpdate только на «now» и «now-1d») — не вешай на них
  per-keystroke реакции (лайв-фильтр «по мере ввода»). (verified date-components@4.0 — стенд + Playwright)

## Интеграция

- Значение из пикера (`date-components`) → форматируй/сравнивай через `date-utils`.
- В форме (`recipe-settings-form`) дата-поле — это `date-components`-контрол, а не `TextInput`.

## See also

- `registry.json` — строка «Поля даты/времени» (routing) + версии (`bundles[]` → dates).
- date-components (v4+) везёт AI-доки в пакете (`dist/docs/`) — они source of truth по API; этот guide = курированное поверх (роутинг, грабли контракта, идиомы). date-utils — README / типы.
