/** Date and time formatting, standing in for Android's DateUtils and SimpleDateFormat. */

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

const fmt = (options: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat(undefined, options);
  } catch {
    return new Intl.DateTimeFormat('en-GB', options);
  }
};

const dayMonth = fmt({ day: 'numeric', month: 'short' });
const dayMonthYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' });

/** "Just now", "5 minutes ago", "3 hours ago", "Yesterday", "2 days ago", then the date. */
export function timeAgo(t: number, abbreviated = false, now = Date.now()): string {
  const diff = now - t;
  if (diff < MIN) return abbreviated ? 'just now' : 'Just now';
  if (diff < HOUR) {
    const m = Math.floor(diff / MIN);
    return abbreviated ? `${m} min. ago` : `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return abbreviated ? `${h} hr. ago` : `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(t).getFullYear() === new Date(now).getFullYear() ? dayMonth.format(t) : dayMonthYear.format(t);
}

/** Relative day for history lists: "Today", "Yesterday", "3 days ago", then the date. */
export function relativeDay(t: number, now = Date.now()): string {
  const start = (x: number) => { const d = new Date(x); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const days = Math.round((start(now) - start(t)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(t).getFullYear() === new Date(now).getFullYear() ? dayMonth.format(t) : dayMonthYear.format(t);
}

export const formatDate = {
  /** "Saturday 8 November" */
  longDay: (t: number) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(t),
  /** "Saturday 8 November 2026, 14:05" */
  full: (t: number) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(t),
  /** "Sat 8 Nov 2026" */
  shortWithYear: (t: number) => fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(t),
  /** "Sat 8 Nov" */
  shortDay: (t: number) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(t),
  /** "8 Nov" */
  dayMonth: (t: number) => dayMonth.format(t),
  /** "8/11" */
  numeric: (t: number) => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}`; },
  /** "November 2026" */
  monthYear: (t: number) => fmt({ month: 'long', year: 'numeric' }).format(t),
};
