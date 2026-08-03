// src/langgraph/tools/responseFormatter.js
import extractAndParseJson from '../../utils/extractAndParseJson.js';

export default async function formatResponse({ context, model }) {
  const { userQuery, rows, error } = context;

  if (error) {
    return {
      finalAnswer: `### Error\n${error}`,
      tableData: null,
    };
  }

  if (!rows || rows.length === 0) {
    return {
      finalAnswer:
        "### No Results\nI couldn't find any records matching your query.",
      tableData: null,
    };
  }

  const queryResultMetadata = {
    totalRows: rows.length,
    availableFields: Object.keys(rows[0]),
    sampleForAnalysis: rows.slice(0, 20),
  };

  const prompt = `
You are an elite Data Scientist and Frontend Engineer. Your mission is to transform raw JSON data into a stunning, interactive, and insightful user experience by generating a single, perfect JSON configuration object.

You MUST return a single, valid JSON object. Do not write any text or explanations outside of this object.

### MASTER JSON STRUCTURE
Your output must conform to this structure:
{
  "markdownAnalysis": "...",
  "tableConfig": { ... },
  "visualization": { ... }
}

---

### 1. Markdown Analysis Rules
Generate a comprehensive, data-driven report in a single Markdown string for the \`markdownAnalysis\` key.

- **Persona**: Write as a senior analyst presenting to a business stakeholder.
- **Content**: Your analysis MUST be based on the provided \`sampleForAnalysis\`.
  1.  **Main Title (#)**: Create a concise title that answers the user's original question.
  2.  **Executive Summary (##)**: In 2-3 sentences, state the most critical finding.
  3.  **Key Observations (##)**: Create a bulleted list of 3-5 specific, data-driven insights. Calculate totals, averages, or find trends in the sample data. Mention patterns, distributions, or interesting outliers.

---

### 2. Table Configuration Rules
Generate an object for the \`tableConfig\` key that defines an interactive data table.

- **Intelligent Column Selection**: From the \`availableFields\`, intelligently select only the most relevant columns. Omit redundant IDs or overly long text fields unless they are essential. The goal is a clean, readable table, not a raw data dump.
- **Column Objects**: The \`columns\` array must contain objects with these keys:
  - \`key\`: The exact field name from the data.
  - \`header\`: A user-friendly, title-cased header name.
  - \`renderAs\`: A string instruction for the UI. You MUST choose from this list:
    - **'default'**: For simple strings, numbers, booleans.
    - **'date'**: For ISO 8601 date strings.
    - **'currency'**: For numeric values that represent money.
    - **'link'**: For values that are URLs.
    - **'count'**: For arrays. Displays the number of items (e.g., "5 Users").
    - **'list'**: For arrays of objects. Creates a comma-separated list of values from a nested field.
  - \`sourceField\`: **REQUIRED for \`'list'\`**. The nested key to pull values from (e.g., key: 'users', sourceField: 'username').

- **Handling Nested Data**: Your primary goal for arrays is to flatten complexity. Use \`'count'\` or \`'list'\` to create a simple, readable summary in the table.

---

### 3. Visualization Rules
Generate an object for the \`visualization\` key or \`null\`. Your goal is to provide a configuration that tells the backend how to build a chart from the full dataset, not to populate the chart data yourself.

- **Decision Logic**:
  1.  If the data is a **time-series** (e.g., grouped by date), the \`type\` should be **'line'**.
  2.  If the data is **categorical** (e.g., grouped by status, type), the \`type\` should be **'bar'**.
  3.  If a chart is not appropriate, set the entire value to **\`null\`**.

- **Chart Mapping Configuration (if not null)**:
  Instead of a data object, you will create a \`mapping\` object. Based on the \`availableFields\`, you must identify the correct field names to use for the chart.
  \`\`\`json
  {
    "type": "line" | "bar" | "pie",
    "title": "A Descriptive Chart Title",
    "mapping": {
      "labelField": "field_name_for_x_axis",
      "dataField": "field_name_for_y_axis",
      "datasetLabel": "A descriptive label for the data series"
    }
  }
  \`\`\`

- **Example**: If \`availableFields\` are \`["date", "userCount", "users"]\`, your output for a time-series visualization should be:
  \`\`\`json
    {
      "type": "line",
      "title": "User Registrations Over Time",
      "mapping": {
        "labelField": "date",
        "dataField": "userCount",
        "datasetLabel": "Registered Users"
      }
    }
  \`\`\`

<!-- end list -->

---
### CONTEXT FOR YOUR ANALYSIS

**User's Original Question:**
${userQuery}

**Query Result Metadata:**
${JSON.stringify(queryResultMetadata, null, 2)}

---
Now, generate the single, complete, and valid JSON object based on these perfected instructions.
`;

  const response = await model.invoke([
    {
      role: 'system',
      content:
        'You are a data analyst AI that generates a comprehensive UI configuration object from database metadata, with special instructions for handling nested data.',
    },
    { role: 'user', content: prompt },
  ]);

  const raw = response?.content ?? '';
  try {
    const parsed = extractAndParseJson(raw);
    if (!parsed.markdownAnalysis || !parsed.tableConfig) {
      throw new Error(
        'LLM did not return the expected markdownAnalysis or tableConfig.'
      );
    }

    let finalVisualization = null;

    if (parsed.visualization && parsed.visualization.mapping) {
      const { mapping, type, title } = parsed.visualization;
      const { labelField, dataField, datasetLabel } = mapping;

      if (
        rows.length > 0 &&
        rows[0][labelField] !== undefined &&
        rows[0][dataField] !== undefined
      ) {
        finalVisualization = {
          type: type,
          title: title,
          data: {
            labels: rows.map((row) => row[labelField]),
            datasets: [
              {
                label: datasetLabel,
                data: rows.map((row) => row[dataField]),
              },
            ],
          },
        };
      }
    }

    return {
      finalAnswer: parsed.markdownAnalysis,
      tableData: {
        tableConfig: parsed.tableConfig,
        visualization: finalVisualization,
        rows: rows,
      },
    };
  } catch (err) {
    console.error('Error parsing AI response formatter:', err);
    // Fallback creates a basic config if the AI fails.
    return {
      finalAnswer: `I've successfully retrieved the ${rows.length} records.`,
      tableData: {
        markdownAnalysis: `**Query Successful**\n\nFound ${rows.length} matching records.`,
        tableConfig: {
          columns: Object.keys(rows[0]).map((key) => ({
            key: key,
            header: key,
            renderAs: 'default',
            sourceField: null,
          })),
        },
        visualization: null,
        rows: rows,
      },
    };
  }
}
