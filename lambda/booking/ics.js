/**
 * .ics calendar invite generator for Q-Atelier bookings.
 */

function generateICS({ name, email, date, time_slot, service }) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time_slot.split(':').map(Number);

  // Build UTC datetime strings (input is local Amsterdam time, but we treat as UTC for simplicity
  // since .ics clients will display in user's local timezone)
  const dtStart = formatDT(year, month, day, hour, minute);
  const dtEnd = formatDT(year, month, day, hour + 1, minute);
  const now = formatDTNow();
  const uid = `${date}-${time_slot.replace(':', '')}-${Date.now()}@q-atelier.nl`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Q-Atelier//Booking//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Afspraak Q-Atelier — ${service}`,
    'LOCATION:Laan van Vollenhove 159\\, 3706 CD Zeist',
    `ORGANIZER;CN=Q-Atelier:mailto:q.atelier89@gmail.com`,
    `ATTENDEE;CN=${name};RSVP=TRUE:mailto:${email}`,
    `DESCRIPTION:Afspraak bij Q-Atelier voor ${service}.\\nAdres: Laan van Vollenhove 159\\, 3706 CD Zeist.`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function formatDT(year, month, day, hour, minute) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00Z`;
}

function formatDTNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

module.exports = { generateICS };
