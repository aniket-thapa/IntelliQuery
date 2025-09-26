// src/langgraph/tools/responseFormatter.js
import extractAndParseJson from '../../utils/extractAndParseJson.js';

export default async function formatResponse({ context, model }) {
  const { userQuery, schemaContext, rows } = context;

  // Handle the case where the query returns no data
  if (!rows || rows.length === 0) {
    return {
      // Use markdown for a consistent look and feel
      finalAnswer:
        "### No Results\nI couldn't find any records matching your query.",
      // Provide an empty structure for the frontend
      tableData: { visualization: null, markdownResponse: 'No data found.' },
    };
  }

  // Use a larger sample for better analysis, but cap it to avoid huge prompts
  const sampleRows = rows.slice(0, 50);
  const prompt = `
You are a senior Data Analyst AI. Your task is to interpret a user's question and the resulting database query results, then present the findings in a clear, insightful, and visually appealing way for a web UI.

You MUST return a single, valid JSON object with two keys: "markdownResponse" and "visualization".

1.  **markdownResponse**: A string containing a comprehensive analysis in Markdown format.
    * Start with a concise, natural-language summary of the findings.
    * Follow with a well-structured Markdown table of the data.
    * If the data has many columns, choose the most relevant ones. Do not show document IDs unless explicitly asked.

2.  **visualization**: An object that suggests a chart for the frontend to render, or \`null\` if no chart is appropriate.
    * **chartType**: Suggest a chart type from: 'bar', 'pie', 'line', 'doughnut', or 'table'. Choose the best type to represent the data. For example, use 'pie' for proportions, 'bar' for comparisons, 'line' for time-series. If no chart fits well, use 'table'.
    * **data**: Format the data to be directly consumable by a library like Chart.js.
        * **labels**: An array of strings for the x-axis or pie chart segments.
        * **datasets**: An array of dataset objects. Each object should have a \`label\` (string) and \`data\` (an array of numbers).

**RULES:**
* Analyze the data to identify the best labels and datasets for the chart. For example, if the user asks "How many users per country?", the labels should be the countries and the data should be the user counts.
* Do not invent data. All information must come from the provided rows.
* The entire output must be ONLY the JSON object. No commentary.

---
**CONTEXT**

**User's Original Question:**
${userQuery}

**Database Results (sample of ${sampleRows.length} out of ${
    rows.length
  } total rows):**
${JSON.stringify(sampleRows, null, 2)}

---
Now, generate the JSON response.
`;

  const response = await model.invoke([
    {
      role: 'system',
      content:
        'You are a data analyst AI that formats database results into a comprehensive JSON object with Markdown and chart data.',
    },
    { role: 'user', content: prompt },
  ]);

  const raw = response?.content ?? '';
  try {
    const parsed = extractAndParseJson(raw);
    if (!parsed.markdownResponse) {
      throw new Error('LLM did not return the expected markdownResponse.');
    }
    // Return the full structured data. The key `tableData` is kept for consistency with the agent's state.
    return {
      finalAnswer: parsed.markdownResponse, // Keep the markdown here for direct rendering
      tableData: parsed, // Pass the whole object with { markdownResponse, visualization }
    };
  } catch (err) {
    console.error('Error parsing AI response formatter:', err);
    // Fallback in case of a parsing error
    return {
      finalAnswer:
        "### Query Successful\nI've retrieved the data, but there was an issue formatting the detailed analysis. Here is the raw data.",
      tableData: {
        markdownResponse: `**Raw Data (${
          rows.length
        } rows)**\n\n\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\``,
        visualization: null,
      },
    };
  }
}
