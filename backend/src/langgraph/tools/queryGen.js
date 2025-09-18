// src/langgraph/tools/queryGen.js
// Responsible for the first attempt at generating a Mongo query

const FORBIDDEN_TOKENS = [
  'drop',
  'remove',
  'delete',
  'update',
  '$where',
  'eval',
  'mapreduce',
];

export default async function generateMongoQuery({
  userQuery,
  schemaContext,
  recentMessages,
  model,
}) {
  const currentDate = new Date().toISOString();
  const systemPrompt = `
You are an expert assistant that MUST output a valid JSON object that represents a MongoDB READ operation only.
Use the schema fields provided. NO destructive operators allowed.

IMPORTANT: The current date and time is ${currentDate}. Use this to resolve any relative time phrases in the user's query (e.g., "today", "last month", "yesterday").

Desired JSON format (example):
{
  "collection": "users",
  "filter": { "country": "India", "createdAt": { "$gte": "2025-08-01T00:00:00Z", "$lt": "2025-09-01T00:00:00Z" } },
  "projection": { "name": 1, "email": 1, "createdAt": 1 },
  "limit": 100
}

Rules:
- Output only JSON, no explanation.
- Use only collections/fields from the schema context.
- Dates: convert relative time phrases ("last month") to concrete ISO ranges.
- Do not use any of: ${FORBIDDEN_TOKENS.join(', ')}.
- If unsure, return a filter that is safe (e.g., {"filter": {}, "limit": 0}) instead of guessing.

Schema context (list of collection.field and descriptions):
${schemaContext}

Recent chat messages (most recent last):
${recentMessages.map((m) => `${m.sender}: ${m.text}`).join('\n')}

User question:
${userQuery}
`;

  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userQuery },
  ]);

  console.log('RESPONSE from LLM in QueryGen: ', response);

  const text = response?.content ?? response?.text ?? '';
  // Attempt to parse JSON. If LLM included text, extract JSON substring
  let parsed;
  try {
    console.log('LLM TEXT:', text);
    parsed = JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);

    console.log('MATCH ', match);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('LLM did not return valid JSON for mongo query');
    }
  }

  // very basic forbidden token check
  const serialized = JSON.stringify(parsed).toLowerCase();
  for (const f of FORBIDDEN_TOKENS) {
    if (serialized.includes(f))
      throw new Error('Generated query contains forbidden operations');
  }

  // Some normalization
  parsed.limit = parsed.limit || 50;
  parsed.projection = parsed.projection || undefined;
  parsed.filter = parsed.filter || {};

  return parsed;
}
