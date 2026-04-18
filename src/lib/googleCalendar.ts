// Builds a Google Calendar event creation URL from an event.
// Docs: https://calendar.google.com/calendar/render?action=TEMPLATE
//
// dates format:
//   - Timed event: YYYYMMDDTHHmmss/YYYYMMDDTHHmmss (local, no Z)
//   - All-day event: YYYYMMDD/YYYYMMDD (end is exclusive)

export interface GCalEventInput {
  title: string;
  emoji?: string;
  date: string;            // YYYY-MM-DD (start)
  end_date?: string | null; // YYYY-MM-DD (inclusive end for multi-day)
  time?: string | null;     // HH:mm
  end_time?: string | null; // HH:mm
  location?: string | null;
  notes?: string | null;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const stripDate = (d: string) => d.replace(/-/g, '');

const stripTime = (t: string) => t.replace(/:/g, '') + '00';

const addDays = (yyyymmdd: string, days: number) => {
  const d = new Date(yyyymmdd + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};

export function buildGoogleCalendarUrl(event: GCalEventInput): string {
  const title = event.emoji ? `${event.emoji} ${event.title}` : event.title;

  let dates: string;
  if (event.time) {
    // Timed event (single day, optional end time)
    const startDate = stripDate(event.date);
    const startTime = stripTime(event.time);
    const endDate = stripDate(event.end_date || event.date);
    const endTime = event.end_time
      ? stripTime(event.end_time)
      : // Default to +1 hour if no end time
        stripTime(
          (() => {
            const [h, m] = event.time.split(':').map(Number);
            const next = (h + 1) % 24;
            return `${pad(next)}:${pad(m)}`;
          })()
        );
    dates = `${startDate}T${startTime}/${endDate}T${endTime}`;
  } else {
    // All-day event(s) — Google's end date is exclusive, so add 1 day
    const start = stripDate(event.date);
    const endInclusive = event.end_date || event.date;
    const end = addDays(endInclusive, 1);
    dates = `${start}/${end}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
  });
  if (event.location) params.set('location', event.location);
  if (event.notes) params.set('details', event.notes);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
