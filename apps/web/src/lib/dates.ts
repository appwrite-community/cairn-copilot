import { differenceInCalendarDays, format, formatISO, isSameYear, parseISO } from 'date-fns';

/**
 * Close dates, due dates, and renewal dates are calendar dates stored at
 * 12:00 UTC. They are read as the calendar date only, so every viewer sees
 * the same day in any time zone.
 */
export function parseDateOnly(iso: string) {
  return parseISO(iso.slice(0, 10));
}

export function toDateOnly(date: Date) {
  return `${formatISO(date, { representation: 'date' })}T12:00:00.000Z`;
}

export function today() {
  return parseISO(formatISO(new Date(), { representation: 'date' }));
}

/** Calendar days from today to the date: 0 is today, negative is overdue. */
export function daysFromToday(iso: string) {
  return differenceInCalendarDays(parseDateOnly(iso), today());
}

export function formatDateOnly(iso: string, style: 'short' | 'weekday' | 'long' = 'short') {
  const date = parseDateOnly(iso);
  if (style === 'weekday') return format(date, 'EEE, MMM d');
  if (style === 'long') return format(date, 'EEEE, MMMM d, yyyy');
  return format(date, isSameYear(date, new Date()) ? 'MMM d' : 'MMM d, yyyy');
}

/** "Today", "Tomorrow", "In 5 days", "2 days overdue", or the date. */
export function describeDue(iso: string) {
  const days = daysFromToday(iso);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${-days} days overdue`;
  if (days < 7) return format(parseDateOnly(iso), 'EEEE');
  return formatDateOnly(iso);
}

export function relativeTime(iso: string, now = Date.now()) {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInCalendarDays(now, new Date(iso));
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const date = new Date(iso);
  return format(date, isSameYear(date, now) ? 'MMM d' : 'MMM d, yyyy');
}

// dateStyle cannot be combined with timeZoneName, so the fields are listed one by one.
const fullDateTimeFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

/** Full timestamp with the viewer's time zone, for tooltips. */
export function fullDateTime(iso: string) {
  return fullDateTimeFormat.format(new Date(iso));
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
