# Brief: Даты и время (date-components + date-utils)

Две библиотеки в паре. У апстрима нет AI-доков → точный API бери из README / Storybook, имена экспортов сверяй перед использованием.

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

Готовые контролы дат поверх date-utils: дата-пикеры, календарь, диапазоны, relative-date-пикер. **Точные имена экспортов и пропы — из README / Storybook:** <https://github.com/gravity-ui/date-components> и <https://preview.gravity-ui.com/date-components>. Значения они принимают/отдают в формате `date-utils` — связывай через него, не конвертируй руками.

## Интеграция

- Значение из пикера (`date-components`) → форматируй/сравнивай через `date-utils`.
- В форме (`recipe-settings-form`) дата-поле — это `date-components`-контрол, а не `TextInput`.

## See also

- `r/library-routing.json` — строка «Поля даты/времени».
- `r/library-docs.json` — апстрим без AI-доков → README/Storybook fallback.
