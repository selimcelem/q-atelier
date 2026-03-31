/**
 * Resend email helper with .ics calendar attachment.
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Q-Atelier <info@q-atelier.nl>';

async function sendBookingEmail({ to, from, bcc, name, date, time_slot, service, icsContent }) {
  const subject = `Bevestiging afspraak Q-Atelier — ${date} om ${time_slot}`;
  const body =
    `Beste ${name},\r\n\r\n` +
    `Hierbij de bevestiging van uw afspraak bij Q-Atelier.\r\n\r\n` +
    `Datum: ${date}\r\n` +
    `Tijd: ${time_slot}\r\n` +
    `Service: ${service}\r\n\r\n` +
    `Adres: Laan van Vollenhove 159, 3706 CD Zeist.\r\n\r\n` +
    `Tot dan!\r\n— Q-Atelier`;

  const options = {
    from: FROM,
    to,
    subject,
    text: body,
    attachments: [
      {
        filename: 'afspraak.ics',
        content: Buffer.from(icsContent).toString('base64'),
        contentType: 'text/calendar; method=REQUEST',
      },
    ],
  };
  if (bcc) options.bcc = bcc;

  await resend.emails.send(options);
}

async function sendPlainEmail({ to, from, subject, body }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    text: body,
  });
}

async function sendHtmlEmail({ to, from, subject, html }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}

async function sendNotificationWithIcs({ to, from, subject, body, icsContent }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    text: body,
    attachments: [
      {
        filename: 'afspraak.ics',
        content: Buffer.from(icsContent).toString('base64'),
        contentType: 'text/calendar; method=REQUEST',
      },
    ],
  });
}

module.exports = { sendBookingEmail, sendPlainEmail, sendHtmlEmail, sendNotificationWithIcs };
