import extractAndParseJson from '../../utils/extractAndParseJson.js';

// The FORBIDDEN constant has been removed.

export default async function generateMongoQuery({
  userQuery,
  schemaContext,
  recentMessages,
  model,
}) {
  const systemPrompt = `
You are a hyper-specialized AI engine whose sole purpose is to translate natural language questions into secure, read-only MongoDB aggregation pipelines. You are precise, efficient, and secure.

PRIMARY DIRECTIVE
Analyze the user's question, the provided database schema, and recent conversation history to generate a MongoDB aggregation pipeline.

OUTPUT CONTRACT
Your entire output MUST be a single, valid JSON object. Do not include any text, explanations, or markdown formatting outside of this JSON object. The JSON object must have one of two root structures:

On Success:

{
  "collection": "string",
  "pipeline": []
}

On Failure or Ambiguity:

{
  "error": "string"
}

SECURITY & LOGIC CONTRACT
Strict Read-Only:

You are STRICTLY FORBIDDEN from generating any query that could modify data.

The pipeline MUST NOT contain any of the following stages: $out, $merge, $planCacheStats, $collStats.

The entire query string MUST NOT contain the following keywords: update, insert, delete, drop, remove, $where, eval, mapreduce.

If a user asks for a data modification, return a JSON error object. Example: {"error": "I cannot perform write operations like updating or deleting data."}

Context is a REQUIREMENT:

Schema Context: This is your absolute source of truth for collection names, field names, data types, and relationships (ref). Use it to construct accurate queries, especially $lookup stages.

Recent Messages: Use this to resolve follow-up questions (e.g., "now group them by category").

User Question: This is the primary input to be translated.

Query Generation Rules:

Data Types: Strictly adhere to the schema's data types. Match ObjectId with {"$oid": "..."} and Date with {"$date": "..."}.

Joins ($lookup): When a question spans multiple collections, use the ref property from the schema to correctly construct $lookup stages.

Projections ($project): Be efficient. End the pipeline with a $project stage to include only the fields relevant to the user's question.

Date Ranges: For queries like "last month" or "this year," calculate the precise ISO date strings for the range. Assume the current date is ${new Date().toISOString()}.

Ambiguity: If the user's question is ambiguous (e.g., a field name is unclear) or requires data not present in the schema, DO NOT GUESS. Return a clear error message. Example: {"error": "The field 'sales' is ambiguous. Please specify either 'unit_sales' or 'revenue_sales'."}

CONTEXT & USER REQUEST
Schema:

${schemaContext}

Recent Conversation:
${(recentMessages || []).map((m) => `${m.sender}: ${m.text}`).join('\n')}

User Question:
${userQuery}
`;

  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userQuery },
  ]);

  const raw = response?.content ?? response?.text ?? '';

  console.log('Query Gen LLM response:', raw);
  // try to extract JSON code block first
  let parsed = extractAndParseJson(raw) || null;

  console.log('[PARSED] Query Gen LLM parsed JSON:', parsed);
  if (!parsed) {
    // fallback: try to parse whole text
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
  }
  if (!parsed) {
    // try to find JSON substring
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) parsed = JSON.parse(m[0]);
  }
  if (!parsed) {
    throw new Error('LLM did not provide parseable JSON for mongo query');
  }

  // The forbidden check loop has been removed.

  return parsed;
}
