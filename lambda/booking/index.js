const { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');
const { generateICS } = require('./ics');
const { sendBookingEmail, sendPlainEmail, sendHtmlEmail } = require('./email');

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({ region: 'eu-west-1' });

const TABLE = process.env.BOOKINGS_TABLE;
const SNS_ARN = process.env.SNS_TOPIC_ARN;
const SIBEL_EMAIL = process.env.SIBEL_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;

const ALLOWED_SLOTS = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
const TOKEN_TTL_DAYS = 7;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=UTF-8',
  'Access-Control-Allow-Origin': '*',
};

// Convert "2026-03-31" to "31/03/2026"
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.resource;

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: JSON_HEADERS, body: '' };
  }

  try {
    if (method === 'GET' && path === '/slots') return await getSlots(event);
    if (method === 'POST' && path === '/booking') return await createBooking(event);
    if (method === 'GET' && path === '/action') return await handleAction(event);
    if (method === 'GET' && path === '/reschedule') return await showRescheduleForm(event);
    if (method === 'POST' && path === '/reschedule') return await handleReschedule(event);
    if (method === 'GET' && path === '/respond') return await handleRespond(event);
    return { statusCode: 404, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    console.error('Handler error:', err);
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};

// ── Helper: find booking by token ──────────────────────────────────
async function findByToken(token) {
  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'token-index',
    KeyConditionExpression: '#t = :token',
    ExpressionAttributeNames: { '#t': 'token' },
    ExpressionAttributeValues: { ':token': { S: token } },
  }));
  return (result.Items && result.Items.length > 0) ? result.Items[0] : null;
}

function validateToken(item) {
  if (!item) return 'Token niet gevonden';
  const expiresAt = Number(item.token_expires_at?.N || 0);
  if (Date.now() / 1000 > expiresAt) return 'Token is verlopen';
  const status = item.status?.S;
  if (status === 'CONFIRMED' || status === 'CANCELLED') return 'Deze actie is al uitgevoerd';
  return null;
}

function htmlPage(title, body) {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Q-Atelier</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#FAF8F5;color:#2C2623;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:2rem}
.card{max-width:500px;width:100%;background:#fff;border:1px solid #E8DAD2;padding:2.5rem;text-align:center}
h1{font-size:1.4rem;margin-bottom:1rem;color:#2C2623}p{font-size:0.95rem;line-height:1.7;color:#5A4F4A;margin-bottom:0.8rem}
.ok{color:#3A5F34}.err{color:#8B3A3A}</style></head>
<body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}

const API_BASE = 'https://apqc7wkzj6.execute-api.eu-west-1.amazonaws.com/prod';

// ── GET /slots ─────────────────────────────────────────────────────
async function getSlots(event) {
  const month = event.queryStringParameters && event.queryStringParameters.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Parameter month is required (YYYY-MM)' }) };
  }

  const result = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'month-index',
    KeyConditionExpression: '#m = :month',
    ExpressionAttributeNames: { '#m': 'month' },
    ExpressionAttributeValues: { ':month': { S: month } },
  }));

  const booked = new Set();
  for (const item of result.Items || []) {
    const status = item.status?.S;
    if (status !== 'CANCELLED') {
      booked.add(`${item.date.S}|${item.time_slot.S}`);
    }
  }

  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const slots = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, mon - 1, day).getDay();
    if (dayOfWeek === 0) continue;

    const daySlots = {};
    for (const slot of ALLOWED_SLOTS) {
      daySlots[slot] = booked.has(`${dateStr}|${slot}`) ? 'booked' : 'available';
    }
    slots[dateStr] = daySlots;
  }

  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(slots) };
}

// ── POST /booking (PENDING flow) ──────────────────────────────────
async function createBooking(event) {
  const body = JSON.parse(event.body || '{}');
  const { name, email, phone, date, time_slot, service } = body;

  if (!name || !email || !phone || !date || !time_slot || !service) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Alle velden zijn verplicht' }) };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Ongeldig datumformaat (YYYY-MM-DD)' }) };
  }
  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Datum mag niet in het verleden liggen' }) };
  }
  const [y, m, d] = date.split('-').map(Number);
  if (new Date(y, m - 1, d).getDay() === 0) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Op zondag zijn wij gesloten' }) };
  }
  if (!ALLOWED_SLOTS.includes(time_slot)) {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Ongeldig tijdstip' }) };
  }

  const month = date.substring(0, 7);
  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const token = uuidv4();
  const tokenExpiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_DAYS * 24 * 60 * 60;

  try {
    await dynamo.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        date: { S: date },
        time_slot: { S: time_slot },
        month: { S: month },
        name: { S: name },
        email: { S: email },
        phone: { S: phone },
        service: { S: service },
        status: { S: 'PENDING' },
        token: { S: token },
        token_expires_at: { N: String(tokenExpiresAt) },
        expires_at: { N: String(expiresAt) },
        created_at: { S: new Date().toISOString() },
      },
      ConditionExpression: 'attribute_not_exists(#d) OR #status = :cancelled',
      ExpressionAttributeNames: { '#d': 'date', '#status': 'status' },
      ExpressionAttributeValues: { ':cancelled': { S: 'CANCELLED' } },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { statusCode: 409, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Dit tijdstip is helaas al bezet' }) };
    }
    throw err;
  }

  const fd = formatDate(date);

  // Email to Sibel with action buttons
  const acceptUrl = `${API_BASE}/action?token=${token}&action=accept`;
  const rescheduleUrl = `${API_BASE}/reschedule?token=${token}`;
  const rejectUrl = `${API_BASE}/action?token=${token}&action=reject`;

  const btnStyle = 'display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;text-decoration:none;border-radius:4px;color:#ffffff;';
  const sibelHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#FAF8F5;padding:20px;color:#2C2623;">
<div style="max-width:500px;margin:0 auto;background:#ffffff;border:1px solid #E8DAD2;padding:30px;">
<h2 style="margin:0 0 20px;font-size:20px;color:#2C2623;">Nieuwe afspraak aanvraag</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:15px;">
<tr><td style="padding:6px 0;color:#8A7F7A;">Naam</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
<tr><td style="padding:6px 0;color:#8A7F7A;">E-mail</td><td style="padding:6px 0;">${email}</td></tr>
<tr><td style="padding:6px 0;color:#8A7F7A;">Telefoon</td><td style="padding:6px 0;">${phone}</td></tr>
<tr><td style="padding:6px 0;color:#8A7F7A;">Datum</td><td style="padding:6px 0;font-weight:600;">${fd}</td></tr>
<tr><td style="padding:6px 0;color:#8A7F7A;">Tijdstip</td><td style="padding:6px 0;font-weight:600;">${time_slot}</td></tr>
<tr><td style="padding:6px 0;color:#8A7F7A;">Service</td><td style="padding:6px 0;">${service}</td></tr>
</table>
<div style="text-align:center;">
<a href="${acceptUrl}" style="${btnStyle}background:#3A7D44;margin:0 4px 10px;">Accepteren</a>
<a href="${rescheduleUrl}" style="${btnStyle}background:#2E6B9E;margin:0 4px 10px;">Nieuw tijdstip voorstellen</a>
<a href="${rejectUrl}" style="${btnStyle}background:#A63D40;margin:0 4px 10px;">Afwijzen</a>
</div>
</div></body></html>`;

  await sendHtmlEmail({
    to: SIBEL_EMAIL,
    from: FROM_EMAIL,
    subject: `Nieuwe afspraak aanvraag — ${name} op ${fd} om ${time_slot}`,
    html: sibelHtml,
  });

  // SMS to Sibel
  await sns.send(new PublishCommand({
    TopicArn: SNS_ARN,
    Message: `Nieuwe afspraak aanvraag: ${name} op ${fd} om ${time_slot} voor ${service}. Check je mail.`,
  }));

  // Confirmation email to customer
  await sendPlainEmail({
    to: email,
    from: FROM_EMAIL,
    subject: 'Uw afspraak aanvraag bij Q-Atelier is ontvangen',
    body:
      `Beste ${name},\r\n\r\n` +
      `Wij hebben uw aanvraag ontvangen voor een afspraak op ${fd} om ${time_slot} voor ${service}.\r\n\r\n` +
      `Wij nemen zo snel mogelijk contact op ter bevestiging.\r\n\r\n` +
      `Met vriendelijke groet,\r\nQ-Atelier`,
  });

  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ message: 'Aanvraag ontvangen' }) };
}

// ── GET /action?token=TOKEN&action=accept|reject ──────────────────
async function handleAction(event) {
  const params = event.queryStringParameters || {};
  const { token, action } = params;

  if (!token || !action || !['accept', 'reject'].includes(action)) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Ongeldige link.</p>') };
  }

  const item = await findByToken(token);
  const error = validateToken(item);
  if (error) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', `<p class="err">${error}</p>`) };
  }

  const name = item.name.S;
  const email = item.email.S;
  const phone = item.phone.S;
  const date = item.date.S;
  const time_slot = item.time_slot.S;
  const service = item.service.S;
  const fd = formatDate(date);

  if (action === 'accept') {
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { date: { S: date }, time_slot: { S: time_slot } },
      UpdateExpression: 'SET #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': { S: 'CONFIRMED' } },
    }));

    const icsContent = generateICS({ name, email, date, time_slot, service });
    await sendBookingEmail({ to: email, from: FROM_EMAIL, name, date: fd, time_slot, service, icsContent });

    const sibelIcs = generateICS({ name, email, date, time_slot, service });
    await sendBookingEmail({
      to: SIBEL_EMAIL,
      from: FROM_EMAIL,
      name,
      date: fd,
      time_slot,
      service,
      icsContent: sibelIcs,
    });

    return { statusCode: 200, headers: HTML_HEADERS, body: htmlPage('Afspraak bevestigd', `<p class="ok">${name} ontvangt een bevestiging per e-mail.</p>`) };
  }

  if (action === 'reject') {
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { date: { S: date }, time_slot: { S: time_slot } },
      UpdateExpression: 'SET #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': { S: 'CANCELLED' } },
    }));

    await sendPlainEmail({
      to: email,
      from: FROM_EMAIL,
      subject: 'Uw afspraak bij Q-Atelier',
      body:
        `Beste ${name},\r\n\r\n` +
        `Helaas kunnen wij uw afspraak op dit moment niet bevestigen.\r\n` +
        `Wij nemen zo snel mogelijk contact met u op.\r\n\r\n` +
        `Met vriendelijke groet,\r\nQ-Atelier`,
    });

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone.replace(/[^0-9]/g, '')}`;
    await sendPlainEmail({
      to: SIBEL_EMAIL,
      from: FROM_EMAIL,
      subject: `Afspraak afgewezen — ${name}`,
      body:
        `Je hebt de afspraak van ${name} afgewezen.\r\n\r\n` +
        `Klantgegevens:\r\n` +
        `Naam: ${name}\r\n` +
        `E-mail: ${email}\r\n` +
        `Telefoon: ${phone}\r\n` +
        `WhatsApp: ${whatsappUrl}\r\n\r\n` +
        `Neem contact op met de klant om een alternatief te bespreken.`,
    });

    return { statusCode: 200, headers: HTML_HEADERS, body: htmlPage('Afspraak afgewezen', '<p>De klant wordt op de hoogte gesteld.</p>') };
  }

  return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Ongeldige actie.</p>') };
}

// ── GET /reschedule?token=TOKEN ───────────────────────────────────
async function showRescheduleForm(event) {
  const params = event.queryStringParameters || {};
  const { token } = params;

  if (!token) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Ongeldige link.</p>') };
  }

  const item = await findByToken(token);
  const error = validateToken(item);
  if (error) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', `<p class="err">${error}</p>`) };
  }

  const name = item.name.S;
  const date = item.date.S;
  const time_slot = item.time_slot.S;
  const service = item.service.S;
  const fd = formatDate(date);
  const todayStr = new Date().toISOString().split('T')[0];

  const slotsOptions = ALLOWED_SLOTS.map(s => `<option value="${s}">${s}</option>`).join('');

  const formHtml = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nieuw tijdstip voorstellen — Q-Atelier</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#FAF8F5;color:#2C2623;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:2rem}
.card{max-width:500px;width:100%;background:#fff;border:1px solid #E8DAD2;padding:2.5rem}
h1{font-size:1.3rem;margin-bottom:1.5rem;text-align:center}
.info{background:#F3EDE6;padding:1rem;margin-bottom:1.5rem;font-size:0.9rem;line-height:1.6}
label{display:block;font-size:0.85rem;margin-bottom:0.3rem;color:#5A4F4A}
input,select{width:100%;padding:0.7rem;border:1px solid #E8DAD2;font-size:0.95rem;margin-bottom:1rem;background:#FAF8F5}
input:focus,select:focus{outline:none;border-color:#C9A99A}
button{width:100%;padding:0.85rem;border:1px solid #2C2623;background:transparent;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer}
button:hover{background:#2C2623;color:#FAF8F5}</style></head>
<body><div class="card">
<h1>Nieuw tijdstip voorstellen</h1>
<div class="info">
<strong>Huidige aanvraag:</strong><br>
Klant: ${name}<br>
Datum: ${fd}<br>
Tijd: ${time_slot}<br>
Service: ${service}
</div>
<form method="POST" action="${API_BASE}/reschedule">
<input type="hidden" name="token" value="${token}">
<label for="new_date">Nieuwe datum</label>
<input type="date" id="new_date" name="new_date" min="${todayStr}" required>
<label for="new_time_slot">Nieuw tijdstip</label>
<select id="new_time_slot" name="new_time_slot" required>${slotsOptions}</select>
<button type="submit">Voorstellen</button>
</form>
</div></body></html>`;

  return { statusCode: 200, headers: HTML_HEADERS, body: formHtml };
}

// ── POST /reschedule ──────────────────────────────────────────────
async function handleReschedule(event) {
  const params = new URLSearchParams(event.body || '');
  const token = params.get('token');
  const new_date = params.get('new_date');
  const new_time_slot = params.get('new_time_slot');

  if (!token || !new_date || !new_time_slot) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Alle velden zijn verplicht.</p>') };
  }

  if (!ALLOWED_SLOTS.includes(new_time_slot)) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Ongeldig tijdstip.</p>') };
  }

  const item = await findByToken(token);
  const error = validateToken(item);
  if (error) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', `<p class="err">${error}</p>`) };
  }

  // Check if new slot is already booked
  const existing = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: '#d = :date AND #ts = :ts',
    ExpressionAttributeNames: { '#d': 'date', '#ts': 'time_slot' },
    ExpressionAttributeValues: { ':date': { S: new_date }, ':ts': { S: new_time_slot } },
  }));
  if (existing.Items && existing.Items.length > 0) {
    const existingStatus = existing.Items[0].status?.S;
    if (existingStatus !== 'CANCELLED') {
      return { statusCode: 409, headers: HTML_HEADERS, body: htmlPage('Bezet', '<p class="err">Dit tijdstip is helaas al bezet. Kies een ander tijdstip.</p>') };
    }
  }

  const name = item.name.S;
  const email = item.email.S;
  const date = item.date.S;
  const time_slot = item.time_slot.S;
  const service = item.service.S;
  const fd = formatDate(date);
  const fnd = formatDate(new_date);

  const customerToken = uuidv4();
  const tokenExpiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_DAYS * 24 * 60 * 60;

  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { date: { S: date }, time_slot: { S: time_slot } },
    UpdateExpression: 'SET #s = :status, suggested_date = :sd, suggested_time_slot = :sts, customer_token = :ct, token_expires_at = :te',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status': { S: 'RESCHEDULED' },
      ':sd': { S: new_date },
      ':sts': { S: new_time_slot },
      ':ct': { S: customerToken },
      ':te': { N: String(tokenExpiresAt) },
    },
  }));

  const acceptUrl = `${API_BASE}/respond?token=${customerToken}&action=accept`;
  const rejectUrl = `${API_BASE}/respond?token=${customerToken}&action=reject`;

  const btnStyle = 'display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;text-decoration:none;border-radius:4px;color:#ffffff;';
  const rescheduleHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#FAF8F5;padding:20px;color:#2C2623;">
<div style="max-width:500px;margin:0 auto;background:#ffffff;border:1px solid #E8DAD2;padding:30px;">
<h2 style="margin:0 0 20px;font-size:20px;color:#2C2623;">Nieuw tijdstip voorgesteld</h2>
<p style="font-size:15px;line-height:1.6;color:#5A4F4A;">Beste ${name},</p>
<p style="font-size:15px;line-height:1.6;color:#5A4F4A;">Helaas zijn wij op <strong>${fd}</strong> om <strong>${time_slot}</strong> niet beschikbaar.</p>
<p style="font-size:15px;line-height:1.6;color:#5A4F4A;">Wij stellen voor: <strong>${fnd}</strong> om <strong>${new_time_slot}</strong>.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${acceptUrl}" style="${btnStyle}background:#3A7D44;margin:0 8px 10px;">Accepteren</a>
<a href="${rejectUrl}" style="${btnStyle}background:#A63D40;margin:0 8px 10px;">Afwijzen</a>
</div>
<p style="font-size:13px;color:#8A7F7A;">Met vriendelijke groet,<br>Q-Atelier</p>
</div></body></html>`;

  await sendHtmlEmail({
    to: email,
    from: FROM_EMAIL,
    subject: `Nieuw tijdstip voorgesteld — Q-Atelier`,
    html: rescheduleHtml,
  });

  await sendPlainEmail({
    to: SIBEL_EMAIL,
    from: FROM_EMAIL,
    subject: `Nieuw tijdstip voorgesteld aan ${name}`,
    body: `Je hebt een nieuw tijdstip voorgesteld aan ${name}: ${fnd} om ${new_time_slot}.\r\nDe klant ontvangt een e-mail.`,
  });

  return { statusCode: 200, headers: HTML_HEADERS, body: htmlPage('Nieuw tijdstip voorgesteld', '<p class="ok">De klant ontvangt een e-mail.</p>') };
}

// ── GET /respond?token=CUSTOMER_TOKEN&action=accept|reject ────────
async function handleRespond(event) {
  const params = event.queryStringParameters || {};
  const { token, action } = params;

  if (!token || !action || !['accept', 'reject'].includes(action)) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Ongeldige link.</p>') };
  }

  // Find booking by customer_token (scan required — no GSI for customer_token)
  let item = null;
  try {
    const scanResult = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'customer_token = :ct',
      ExpressionAttributeValues: { ':ct': { S: token } },
    }));
    item = scanResult.Items && scanResult.Items.length > 0 ? scanResult.Items[0] : null;
  } catch (scanErr) {
    console.error('Scan error in /respond:', scanErr);
    return { statusCode: 500, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Er ging iets mis. Probeer het later opnieuw.</p>') };
  }

  if (!item) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Token niet gevonden.</p>') };
  }

  const expiresAt = Number(item.token_expires_at?.N || 0);
  if (Date.now() / 1000 > expiresAt) {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Token is verlopen.</p>') };
  }

  const status = item.status?.S;
  if (status === 'CONFIRMED' || status === 'CANCELLED') {
    return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Deze actie is al uitgevoerd.</p>') };
  }

  const name = item.name.S;
  const email = item.email.S;
  const phone = item.phone.S;
  const date = item.date.S;
  const time_slot = item.time_slot.S;
  const service = item.service.S;
  const suggestedDate = item.suggested_date?.S || date;
  const suggestedTime = item.suggested_time_slot?.S || time_slot;
  const fsd = formatDate(suggestedDate);

  if (action === 'accept') {
    // Mark original booking as historical record
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { date: { S: date }, time_slot: { S: time_slot } },
      UpdateExpression: 'SET #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': { S: 'CANCELLED' } },
    }));

    // Create new confirmed booking at the suggested date/time
    const newMonth = suggestedDate.substring(0, 7);
    const newExpiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    await dynamo.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        date: { S: suggestedDate },
        time_slot: { S: suggestedTime },
        month: { S: newMonth },
        name: { S: name },
        email: { S: email },
        phone: { S: phone },
        service: { S: service },
        status: { S: 'CONFIRMED' },
        expires_at: { N: String(newExpiresAt) },
        created_at: { S: new Date().toISOString() },
      },
    }));

    const icsContent = generateICS({ name, email, date: suggestedDate, time_slot: suggestedTime, service });

    await sendBookingEmail({
      to: email,
      from: FROM_EMAIL,
      name,
      date: fsd,
      time_slot: suggestedTime,
      service,
      icsContent,
    });

    const sibelIcs = generateICS({ name, email, date: suggestedDate, time_slot: suggestedTime, service });
    await sendBookingEmail({
      to: SIBEL_EMAIL,
      from: FROM_EMAIL,
      name,
      date: fsd,
      time_slot: suggestedTime,
      service,
      icsContent: sibelIcs,
    });

    return { statusCode: 200, headers: HTML_HEADERS, body: htmlPage('Bevestigd!', '<p class="ok">U ontvangt een bevestiging per e-mail.</p>') };
  }

  if (action === 'reject') {
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: { date: { S: date }, time_slot: { S: time_slot } },
      UpdateExpression: 'SET #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': { S: 'CANCELLED' } },
    }));

    await sendPlainEmail({
      to: email,
      from: FROM_EMAIL,
      subject: 'Uw afspraak bij Q-Atelier',
      body:
        `Beste ${name},\r\n\r\n` +
        `Helaas. Neem contact op met ons via +31 6 85 56 95 51 of q.atelier89@gmail.com om een passend tijdstip te vinden.\r\n\r\n` +
        `Met vriendelijke groet,\r\nQ-Atelier`,
    });

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone.replace(/[^0-9]/g, '')}`;
    await sendPlainEmail({
      to: SIBEL_EMAIL,
      from: FROM_EMAIL,
      subject: `${name} heeft het nieuwe tijdstip afgewezen`,
      body:
        `${name} heeft het nieuwe tijdstip afgewezen.\r\n\r\n` +
        `Klantgegevens:\r\n` +
        `Naam: ${name}\r\n` +
        `E-mail: ${email}\r\n` +
        `Telefoon: ${phone}\r\n` +
        `WhatsApp: ${whatsappUrl}`,
    });

    return { statusCode: 200, headers: HTML_HEADERS, body: htmlPage('Begrepen', '<p>Q-Atelier neemt contact met u op.</p>') };
  }

  return { statusCode: 400, headers: HTML_HEADERS, body: htmlPage('Fout', '<p class="err">Ongeldige actie.</p>') };
}
