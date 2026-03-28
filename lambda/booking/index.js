/**
 * Q-Atelier Booking Lambda
 *
 * Routes:
 *   GET  /slots?month=YYYY-MM   → returns available + booked slots for a month
 *   POST /booking               → creates a booking, sends SES + SNS notifications
 *
 * TODO (implement with Claude Code):
 *   - GET /slots: query DynamoDB month-index GSI, return slot availability map
 *   - POST /booking: validate input, write to DynamoDB, call SES with .ics, publish SNS
 *   - Generate .ics file (see ics.js helper)
 *   - Input validation (date not in past, slot not already booked, required fields)
 */

const { DynamoDBClient, PutItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const dynamo = new DynamoDBClient({});
const ses    = new SESClient({ region: "eu-west-1" });
const sns    = new SNSClient({ region: "eu-west-1" });

const TABLE  = process.env.BOOKINGS_TABLE;
const SNS_ARN = process.env.SNS_TOPIC_ARN;
const SIBEL_EMAIL = process.env.SIBEL_EMAIL;
const FROM_EMAIL  = process.env.FROM_EMAIL;

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path   = event.resource;

  try {
    if (method === "GET" && path === "/slots") {
      return await getSlots(event);
    }
    if (method === "POST" && path === "/booking") {
      return await createBooking(event);
    }
    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: "Not found" }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Internal error" }) };
  }
};

async function getSlots(event) {
  // TODO: parse ?month=YYYY-MM, query DynamoDB, return availability
  // Shape: { "2026-04-10": { "10:00": "booked", "11:00": "available" }, ... }
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ message: "TODO: implement getSlots" }),
  };
}

async function createBooking(event) {
  // TODO:
  // 1. Parse + validate body (name, email, phone, date, time_slot, service)
  // 2. Check slot not already booked (conditional write or pre-check)
  // 3. PutItem to DynamoDB
  // 4. Generate .ics content
  // 5. SendRawEmail via SES (to customer + Sibel, with .ics attachment)
  // 6. Publish SNS SMS to Sibel
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ message: "TODO: implement createBooking" }),
  };
}
