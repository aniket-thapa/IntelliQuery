// src/langgraph/tools/queryRepair.js
// Given a failing query and error message, ask the LLM to produce a corrected query JSON.

const FORBIDDEN_TOKENS = [
  'drop',
  'remove',
  'delete',
  'update',
  '$where',
  'eval',
  'mapreduce',
];

export default async function repairMongoQuery({
  failingQuery,
  errorMessage,
  schemaContext,
  recentMessages,
  model,
}) {
  const prompt = `
The previously generated MongoDB query failed when executed. Do not be defensive — repair it.

Failing query (JSON):
${JSON.stringify(failingQuery, null, 2)}

Error message from MongoDB:
${errorMessage}

Schema context:
${JSON.stringify(schemaContext, null, 2)}

Recent chat messages:
${recentMessages.map((m) => `${m.sender}: ${m.text}`).join('\n')}

Produce only a corrected MongoDB query JSON (same format as before).
Rules:
- No destructive operators
- If the failure is due to syntax or field mismatch, correct it using only the schema context.
- Ensure the JSON is parseable.
`;

  const response = await model.invoke([
    {
      role: 'system',
      content:
        'You are a helpful assistant that corrects MongoDB JSON queries.',
    },
    { role: 'user', content: prompt },
  ]);

  const text = response?.content ?? response?.text ?? '';
  // parse JSON
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error('Repair LLM did not return valid JSON');
  }

  // check for forbidden words
  const serialized = JSON.stringify(parsed).toLowerCase();
  for (const f of FORBIDDEN_TOKENS) {
    if (serialized.includes(f))
      throw new Error('Repair contains forbidden operations');
  }

  parsed.limit = parsed.limit || 50;
  parsed.projection = parsed.projection || undefined;
  parsed.filter = parsed.filter || {};

  return parsed;
}
