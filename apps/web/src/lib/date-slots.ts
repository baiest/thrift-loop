function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whether `date`'s calendar day is today or later, relative to `now`. */
export function isDateSelectable(date: Date, now: Date): boolean {
  return startOfDay(date) >= startOfDay(now);
}

/** Whether `hour` on `date` is still in the future, relative to `now`. */
export function isHourSelectable(date: Date, hour: number, now: Date): boolean {
  const day = startOfDay(date);
  const today = startOfDay(now);
  if (day > today) {
    return true;
  }
  if (day < today) {
    return false;
  }
  return hour > now.getHours();
}
