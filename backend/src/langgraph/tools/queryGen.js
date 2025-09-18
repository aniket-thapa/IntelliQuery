// src/langgraph/tools/queryGen.js
/**
 * generateMongoQuery: calls Gemini (ChatGoogleGenerativeAI) to produce a JSON
 * structure: { collection, filter, projection?, limit? }
 *
 * We instruct the model strictly to output JSON only and disallow any destructive ops.
 */

const FORBIDDEN_TOKENS = [
  'drop',
  'remove',
  'delete',
  'update',
  'mapReduce',
  '$where',
  'eval',
  'system.profile',
];

export default async function generateMongoQuery({
  userQuery,
  schemaMatches,
  model,
}) {
  if (!userQuery) throw new Error('userQuery required');
  if (!schemaMatches) throw new Error('schemaMatches required');

  // Build a compact schema context for the LLM
  const context = schemaMatches
    .map(
      (m, i) =>
        `${i + 1}. ${m.collectionName}.${m.fieldName} — ${
          m.description || ''
        } (score: ${m.score?.toFixed(3)})`
    )
    .join('\n');

  const systemPrompt = `
You are an assistant that MUST output a valid MongoDB query object in JSON ONLY. No explanation, no commentary.
Use only the collections/fields listed in the "Schema Context". If uncertain, ask for clarification instead of guessing.

Schema Context:
${context}

Important rules:
- Output must be valid JSON parseable to a JS object.
- The object must be of the form:
  {
    "collection": "<collectionName>",
    "filter": { ... },
    "projection": { "<field>": 1, ... },   // optional
    "limit": 50
  }
- DO NOT include any operations like drop, delete, update, mapReduce, $where, eval, or shell commands.
- Dates should be expressed as ISO strings (e.g., "2025-09-01T00:00:00Z").
- If the user mentions relative times like "last month", convert to explicit ISO range using the current date.

Respond ONLY with the JSON object.
`;

  const userPrompt = `User question: ${userQuery}`;

  // Invoke model: using model.invoke API from langchain wrapper
  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const out = response?.content ?? response?.text ?? '';
  // Basic defensive checks:
  for (const bad of FORBIDDEN_TOKENS) {
    if (out.toLowerCase().includes(bad)) {
      throw new Error('Model output contains forbidden operations');
    }
  }

  // parse JSON
  let parsed;
  try {
    parsed = typeof out === 'string' ? JSON.parse(out) : out;
  } catch (err) {
    // Try extracting JSON substring (best-effort)
    const jsonMatch = out.match(/\{[\s\S]*\}$/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Generated text is not valid JSON');
    }
  }

  // Final basic validation of parsed shape
  if (!parsed.collection || !parsed.filter) {
    throw new Error(
      'Generated query missing required keys (collection/filter)'
    );
  }

  // Normalize limit
  parsed.limit = parsed.limit || 50;

  return JSON.stringify(parsed);
}
