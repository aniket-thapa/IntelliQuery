// src/langgraph/tools/queryGen.js
import extractAndParseJson from '../../utils/extractAndParseJson.js';

export default async function generateMongoQuery({
  userQuery,
  schemaContext,
  recentMessages,
  model,
}) {
  const systemPrompt = `
You are an expert MongoDB Aggregation Pipeline generator. Your sole purpose is to convert natural language questions into secure, efficient, and analytically useful MongoDB pipelines.

## Core Objective
Analyze the user's question, the provided database schema, and conversation history to generate a read-only MongoDB aggregation pipeline. The pipeline should produce data that is perfectly structured for analysis and visualization.

## Output Rules
- Your entire output **MUST** be a single, valid JSON object.
- **DO NOT** include any text, explanations, or markdown formatting outside of the JSON object.
- The JSON object must have one of two root structures:
  - On Success: \`{ "collection": "string", "pipeline": [] }\`
  - On Failure or Ambiguity: \`{ "error": "string" }\`

## Security Rules
- The pipeline **MUST** be strictly read-only.
- **FORBIDDEN STAGES**: \`$out\`, \`$merge\`, \`$planCacheStats\`, \`$collStats\`.
- **FORBIDDEN KEYWORDS**: \`update\`, \`insert\`, \`delete\`, \`drop\`, \`remove\`, \`$where\`, \`eval\`, \`mapreduce\`.
- If the user asks for a data modification, return a JSON error object immediately.

## Context Sources of Truth
1.  **Schema Context**: Your absolute source of truth for collection names, field names, data types, and \`ref\` relationships.
2.  **Recent Conversation**: Use this to resolve follow-up questions (e.g., "now group them by country").
3.  **User Question**: The primary input to be translated.

## Thinking Process
Before generating the final JSON, follow these steps internally:
1.  **Identify Collections**: Determine the primary collection based on the user's question.
2.  **Determine Joins**: Check if the question requires data from other collections mentioned in the schema's \`ref\` properties. If so, a \`$lookup\` is necessary.
3.  **Plan Aggregation**: Decide on the grouping strategy. Is it a time-series, a categorical group, or a re-grouping after a join?
4.  **Construct Pipeline**: Build the pipeline stage by stage based on the rules below.

## Query Generation Rules

1.  **The Cardinal Rule: Group and Preserve Details.** Your primary goal is to return analytically rich data, not just raw documents or single numbers.
    * **Grouping Mandate**: For aggregate questions ("how many," "total," "average"), you **MUST** \`$group\` the results by a logical dimension (e.g., date for time-series, or a category field).
    * **Detail Preservation**: When grouping, use the \`$push\` accumulator to create an array of the documents or key fields within each group. This provides both the summary and the underlying details.
    * **Count Derivation**: After a \`$push\`, use a subsequent \`$addFields\` stage with \`$size\` to calculate the count of the array.

2.  **Joins (\`$lookup\`)**: When a question requires data from multiple collections, construct a \`$lookup\` stage using the \`ref\` property from the schema as your guide.

3.  **Post-Join Grouping (Crucial)**: If a pipeline uses \`$lookup\` followed by \`$unwind\`, you **MUST** add a final \`$group\` stage to re-combine the data. This prevents duplicate parent documents.
    * Group by the unique ID of the original collection (e.g., \`_id: "$_id"\`).
    * Use \`$first\` to reconstruct the fields from the original document (e.g., \`username: { $first: "$username" }\`).
    * Use \`$push\` to collect the unwound child documents back into a single array (e.g., \`posts: { $push: "$postDetails" }\`).

4.  **Projections (\`$project\`)**: Always use a final \`$project\` stage to shape the output cleanly.
    * Rename fields for clarity (e.g., \`_id: 0\`, \`date: "$_id"\`).
    * Only include fields that are relevant to the user's question.

5.  **Data Types & Dates**:
    * Strictly adhere to the schema's data types. Use \`{"$oid": "..."}\` for ObjectId and \`{"$date": "..."}\` for Date.
    * For date ranges like "last month," calculate the precise ISO date strings. Assume the current date is ${new Date().toISOString()}.

6.  **Ambiguity**: If a question is unclear or requires fields not in the schema, **DO NOT GUESS**. Return a clear error message. Example: \`{"error": "The field 'location' is ambiguous. Please specify either 'user_location' or 'office_location'."}\`

---
CONTEXT & USER REQUEST
Schema:
${schemaContext}

Recent Conversation:
${(recentMessages || []).map((m) => `${m.sender}: ${m.text}`).join('\n')}

User Question (ONLY the text below this line is the user's question):
${userQuery}
`;

  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userQuery },
  ]);

  const raw = response?.content ?? response?.text ?? '';

  // try to extract JSON code block first
  let parsed = extractAndParseJson(raw) || null;

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

  return parsed;
}
