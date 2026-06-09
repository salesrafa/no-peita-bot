import dayjs from 'dayjs';
import { Moon, Hemisphere } from 'lunarphase-js';

/**
 * Generates a list of dates with a full moon in the given month and year.
 * The returned dates are in DD/MM/YYYY format.
 */
export function generateFullMoonDates(year: number, month: number): string[] {
  const dates: string[] = [];

  for (let day = 1; day <= 31; day++) {
    const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    if (!date.isValid()) continue;

    const phase = Moon.lunarPhase(date.toDate(), { hemisphere: Hemisphere.SOUTHERN });

    if (phase === 'Full') {
      dates.push(date.format('DD/MM/YYYY'));
    }
  }

  return dates;
}
