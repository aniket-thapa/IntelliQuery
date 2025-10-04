// src/langgraph/tools/queryRepair.js
import extractAndParseJson from '../../utils/extractAndParseJson.js';

export default async function repairMongoQuery({
  failingQuery,
  errorMessage,
  schemaContext,
  recentMessages,
  model,
}) {
  console.log('Attempting to repair failing query:', failingQuery);
  console.log('Error message:', errorMessage);

  const prompt = `
A MongoDB aggregation pipeline failed. Your task is to correct it based on the error and schema.
Return ONLY the corrected, valid JSON object with "collection" and "pipeline" keys.

**Security Rules**: The pipeline MUST be read-only. Do not use stages like $out or $merge. Do not include keywords like update, delete, or drop.

Failing Query Object:
${JSON.stringify(failingQuery, null, 2)}

Error Message Received:
${errorMessage}

Schema Context (use this to fix field names, types, and lookups):
${JSON.stringify(schemaContext, null, 2)}

Recent Messages (for conversational context):
${(recentMessages || []).map((m) => `${m.sender}: ${m.text}`).join('\n')}

Return a corrected JSON object in the format { "collection": "collectionName", "pipeline": [...] }. Do NOT include any explanations or commentary.
`;

  const response = await model.invoke([
    {
      role: 'system',
      content:
        'You are a MongoDB expert that corrects failing aggregation pipelines. You only output valid JSON.',
    },
    { role: 'user', content: prompt },
  ]);

  const raw = response?.content ?? '';
  let parsed = extractAndParseJson(raw);

  if (!parsed) {
    throw new Error('Repair LLM did not return valid JSON');
  }

  if (!parsed.collection || !Array.isArray(parsed.pipeline)) {
    throw new Error(
      'Repaired query is missing "collection" or "pipeline" key.'
    );
  }

  return parsed;
}
