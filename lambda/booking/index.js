const { DynamoDBClient, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { generateICS } = require('./ics');
const { sendBookingEmail } = require('./email');

const dynamo = new DynamoDBClient({});
const sns = new SNSClient({ region: 'eu-west-1' });

const TABLE = process.env.BOOKINGS_TABLE;
const SNS_ARN = process.env.SNS_TOPIC_ARN;
const SIBEL_EMAIL = process.env.SIBEL_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;

const ALLOWED_SLOTS = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.resource;

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  try {
    if (method === 'GET' && path === '/slots') {
      return await getSlots(event);
    }
    if (method === 'POST' && path === '/booking') {
      return await createBooking(event);
    }
    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Internal error' }) };
  }
};

async function getSlots(event) {
  const month = event.queryStringParameters && event.queryStringParameters.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Parameter month is required (YYYY-MM)' }),
    };
  }

  // Query booked slots from DynamoDB using month-index GSI
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'month-index',
      KeyConditionExpression: '#m = :month',
      ExpressionAttributeNames: { '#m': 'month' },
      ExpressionAttributeValues: { ':month': { S: month } },
    })
  );

  // Build set of booked date+slot combos
  const booked = new Set();
  for (const item of result.Items || []) {
    booked.add(`${item.date.S}|${item.time_slot.S}`);
  }

  // Generate all days in the month
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const slots = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, mon - 1, day).getDay();

    // Sunday (0) = closed
    if (dayOfWeek === 0) continue;

    const daySlots = {};
    for (const slot of ALLOWED_SLOTS) {
      daySlots[slot] = booked.has(`${dateStr}|${slot}`) ? 'booked' : 'available';
    }
    slots[dateStr] = daySlots;
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(slots),
  };
}

async function createBooking(event) {
  const body = JSON.parse(event.body || '{}');
  const { name, email, phone, date, time_slot, service } = body;

  // Validate required fields
  if (!name || !email || !phone || !date || !time_slot || !service) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Alle velden zijn verplicht' }),
    };
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Ongeldig datumformaat (YYYY-MM-DD)' }),
    };
  }

  // Validate date not in the past
  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Datum mag niet in het verleden liggen' }),
    };
  }

  // Validate not Sunday
  const [y, m, d] = date.split('-').map(Number);
  if (new Date(y, m - 1, d).getDay() === 0) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Op zondag zijn wij gesloten' }),
    };
  }

  // Validate time slot
  if (!ALLOWED_SLOTS.includes(time_slot)) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Ongeldig tijdstip' }),
    };
  }

  // Write to DynamoDB with condition to prevent double booking
  const month = date.substring(0, 7);
  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

  try {
    await dynamo.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: {
          date: { S: date },
          time_slot: { S: time_slot },
          month: { S: month },
          name: { S: name },
          email: { S: email },
          phone: { S: phone },
          service: { S: service },
          expires_at: { N: String(expiresAt) },
          created_at: { S: new Date().toISOString() },
        },
        ConditionExpression: 'attribute_not_exists(#d) AND attribute_not_exists(#ts)',
        ExpressionAttributeNames: { '#d': 'date', '#ts': 'time_slot' },
      })
    );
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Dit tijdstip is helaas al bezet' }),
      };
    }
    throw err;
  }

  // Generate .ics
  const icsContent = generateICS({ name, email, date, time_slot, service });

  // Send confirmation email with .ics attachment
  await sendBookingEmail({
    to: email,
    from: FROM_EMAIL,
    bcc: SIBEL_EMAIL,
    name,
    date,
    time_slot,
    service,
    icsContent,
  });

  // Send SMS notification to Sibel
  await sns.send(
    new PublishCommand({
      TopicArn: SNS_ARN,
      Message: `Nieuwe afspraak: ${name} op ${date} om ${time_slot} voor ${service}`,
    })
  );

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ message: 'Afspraak bevestigd' }),
  };
}
