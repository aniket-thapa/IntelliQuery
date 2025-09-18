// src/langgraph/tools/responseFormatter.js
// Returns a friendly summary and optional table data for UI.

export default async function formatResponse({
  context,
  model,
  maxTokensForAnswer = 512,
}) {
  const { userQuery, mongoQuery, rows } = context;

  // If no rows
  if (!rows || rows.length === 0) {
    const finalAnswer = 'No matching records found.';
    return { finalAnswer, tableData: { columns: [], rows: [] } };
  }

  // Ask LLM to produce a short summary and optionally table info
  const prompt = `
You are an assistant that formats DB results for a user interface.

User question:
${userQuery}

Mongo Query (short):
${JSON.stringify(mongoQuery)}

Rows (first 20 shown):
${JSON.stringify(rows)}

Produce a JSON object with:
{
  "finalAnswer": "<short friendly text, 1-3 sentences>",
  "table": {
    "columns": ["col1","col2",...],
    "rows": [
      {"col1": value, "col2": value, ...},
      ...
    ]
  }
}

Only return valid JSON. If rows are too large, include only top 10 rows in 'table.rows'.
`;

  const response = await model.invoke([
    { role: 'system', content: 'You are a concise formatter for chat UI.' },
    { role: 'user', content: prompt },
  ]);

  const text = response?.content ?? response?.text ?? '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) parsed = JSON.parse(match[0]);
    else {
      // fallback: create a simple answer
      const finalAnswer = `Returned ${
        rows.length
      } rows. Showing first ${Math.min(rows.length, 10)} rows.`;
      const columns = rows.length ? Object.keys(rows[0]) : [];
      const table = { columns, rows: rows.slice(0, 10) };
      return { finalAnswer, tableData: table };
    }
  }

  // sanitize parsed
  const finalAnswer = parsed.finalAnswer || `Returned ${rows.length} rows.`;
  const tableData = parsed.table || {
    columns: rows.length ? Object.keys(rows[0]) : [],
    rows: rows.slice(0, 10),
  };

  return { finalAnswer, tableData };
}
