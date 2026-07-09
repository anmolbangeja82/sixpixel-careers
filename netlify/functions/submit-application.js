const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// Optional: if your Notion "Role" property is a Select field, its options must
// match these exactly (case-sensitive). Rich-text fields don't have this restriction.
const REQUIRED_FIELDS = ["name", "role", "email", "phone", "portfolio", "location", "whyUs", "pitch", "resumeLink"];

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  if (!process.env.NOTION_KEY || !DATABASE_ID) {
    console.error("Missing NOTION_KEY or NOTION_DATABASE_ID env vars");
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: "Server is not configured" })
    };
  }

  let entry;
  try {
    entry = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  const missing = REQUIRED_FIELDS.filter((f) => !entry || !entry[f]);
  if (missing.length > 0) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Missing required fields: " + missing.join(", ") })
    };
  }

  try {
    await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        "Name": { title: [{ text: { content: entry.name } }] },
        "Role": { select: { name: entry.role } },
        "Email": { email: entry.email },
        "Phone": { phone_number: entry.phone },
        "Portfolio Link": { url: entry.portfolio },
        "Current Location": { rich_text: [{ text: { content: entry.location } }] },
        "Navi Mumbai Answer": { rich_text: [{ text: { content: entry.videographerAnswer || "" } }] },
        "Why SixPixel Studio": { rich_text: [{ text: { content: entry.whyUs } }] },
        "Why Hire Them": { rich_text: [{ text: { content: entry.pitch } }] },
        "Resume Link": { url: entry.resumeLink },
        "Submitted At": { date: { start: entry.submittedAt || new Date().toISOString() } }
      }
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error("Notion create page failed:", err.body || err.message || err);
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({ error: "Failed to save to Notion" })
    };
  }
};
