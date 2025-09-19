// src/langgraph/tools/responseFormatter.js
// Returns a friendly summary and optional table data for UI.

export default async function formatResponse(
  { userQuery, mongoQuery, rows },
  model
) {
  console.log('rows.length ................:', !rows);
  try {
    if (!rows || rows.length === 0) {
      return {
        summary: 'No results found.',
        explanation:
          'The query ran successfully, but there was no data that matched your criteria.',
        data: '[]',
        chartSuggestion: 'none',
      };
    }

    const recordCount = rows.length;
    const dataSample = rows.slice(0, 5);
    const fieldNames = Object.keys(rows[0]);
    const statsSummary = `Found ${recordCount} total records.`;

    console.log('Record Count:', recordCount);
    console.log('DATATSSSSSAMPLE:', dataSample);

    const prompt = `
      You are an expert data analyst working for a multi-tenant SaaS application called IntelliQuery. Your role is to interpret the results of a database query and explain them in simple, clear, and business-friendly language for a non-technical user.

      **Context:**
      - Original User Question: "${userQuery}"
      - Executed MongoDB Query: "${JSON.stringify(mongoQuery)}"

      **Query Result Analysis:**
      - Total Records Found: ${recordCount}
      - Data Fields: [${fieldNames.join(', ')}]
      - Aggregate Statistics: "${statsSummary}"
      - Data Sample (first 5 records):
      \`\`\`json
      ${JSON.stringify(dataSample)}
      \`\`\`

      **Your Task:**
      Based on all the context above, generate a JSON object with the following structure. Do NOT include any text outside of the JSON object itself.

      1.  \`summary\`: A concise, one or two-sentence natural language summary answering the user's original question directly.
      2.  \`explanation\`: A slightly more detailed paragraph explaining the findings. If there are many results, mention the total count and explain that you are showing a sample. If there are interesting patterns or totals, mention them here.
      3.  \`data\`: The sample data provided to you, formatted as a JSON string.
      4.  \`chartSuggestion\`: Based on the data fields and the user's question, suggest a suitable chart type. Valid options are: "bar", "line", "pie", or "none". For example, if the user asked for a count over time, suggest "line". If they asked for a breakdown by category, suggest "bar" or "pie".

      **Example Output Format:**
      {
      "summary": "...",
      "explanation": "...",
      "data": "...",
      "chartSuggestion": "..."
      }
`;

    // 3. Invoke the LLM
    const response = await model.invoke([{ role: 'user', content: prompt }]);
    const responseText = response?.content ?? response?.text ?? '';

    console.log('RESPONSE FORMATTER RESPONSE: ', responseText);

    // Clean and parse the LLM's JSON output
    const formattedResponse = JSON.parse(
      responseText.replace(/```json/g, '').replace(/```/g, '')
    );

    return formattedResponse;
  } catch (error) {
    console.error('Error in Response Formatting Agent:', error);
    return {
      summary: `Found ${rows?.length} results.`,
      explanation: 'Displaying a sample of the raw data.',
      data: JSON.stringify(rows?.slice(0, 10), null, 2),
      chartSuggestion: 'none',
    };
  }
}
