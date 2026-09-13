// Build an iCalendar (.ics) file from the plan so it can be imported into Google/Apple Calendar.
import { sortBy, activeVariant, dayView } from './util.js';

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
const stamp = (date, time) => `${date.replace(/-/g, '')}T${(time || '09:00').replace(':', '')}00`;
const fold = (line) => { const out = []; while (line.length > 72) { out.push(line.slice(0, 72)); line = ' ' + line.slice(72); } out.push(line); return out.join('\r\n'); };

export function buildIcs(trip) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Japan 2027 planner//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(trip.meta.title || 'Trip')}`];
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const av = activeVariant(trip);
  for (const d0 of sortBy(trip.days || [], (x) => x.date)) {
    const d = dayView(d0, av);
    for (const it of d.items || []) {
      if (it.status === 'skip') continue;
      const start = stamp(d.date, it.time);
      let end;
      if (it.endTime) { end = stamp(it.endTime < (it.time || '') ? nextDay(d.date) : d.date, it.endTime); }
      else { const [h, m] = (it.time || '09:00').split(':').map(Number); const e = new Date(2000, 0, 1, h, m + 60); end = stamp(d.date, `${pad(e.getHours())}:${pad(e.getMinutes())}`); }
      const desc = [it.notes, it.status ? `Status: ${it.status}` : '', it.url].filter(Boolean).join('\n');
      lines.push('BEGIN:VEVENT', `UID:${it.id}@japan2027`, `DTSTAMP:${now}`, fold(`SUMMARY:${esc(it.title)}`), `DTSTART:${start}`, `DTEND:${end}`,
        it.location ? fold(`LOCATION:${esc(it.location)}`) : null, desc ? fold(`DESCRIPTION:${esc(desc)}`) : null, 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n') + '\r\n';
}

function nextDay(iso) { const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m - 1, d + 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }
