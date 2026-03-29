/**
 * SES raw email helper with .ics calendar attachment.
 */

const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'eu-west-1' });

async function sendBookingEmail({ to, from, bcc, name, date, time_slot, service, icsContent }) {
  const subject = `Bevestiging afspraak Q-Atelier — ${date} om ${time_slot}`;
  const body =
    `Beste ${name},\r\n\r\n` +
    `Hierbij de bevestiging van uw afspraak bij Q-Atelier.\r\n\r\n` +
    `Datum: ${date}\r\n` +
    `Tijd: ${time_slot}\r\n` +
    `Service: ${service}\r\n\r\n` +
    `Adres: Laan van Vollenhove 159, 3706 CD Zeist.\r\n\r\n` +
    `Tot dan!\r\n— Sibel, Q-Atelier`;

  const boundary = `----=_Part_${Date.now()}`;
  const icsBase64 = Buffer.from(icsContent).toString('base64');

  const rawMessage = [
    `From: Q-Atelier <${from}>`,
    `To: ${to}`,
    `Bcc: ${bcc}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
    '',
    `--${boundary}`,
    'Content-Type: text/calendar; charset=UTF-8; method=REQUEST',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="afspraak.ics"',
    '',
    icsBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  await ses.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage) },
    })
  );
}

async function sendPlainEmail({ to, from, subject, body }) {
  const rawMessage = [
    `From: Q-Atelier <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ].join('\r\n');

  await ses.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage) },
    })
  );
}

async function sendHtmlEmail({ to, from, subject, html }) {
  const rawMessage = [
    `From: Q-Atelier <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
  ].join('\r\n');

  await ses.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage) },
    })
  );
}

module.exports = { sendBookingEmail, sendPlainEmail, sendHtmlEmail };
