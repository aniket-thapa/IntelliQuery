// utils/extractAndParseJson.js
function extractAndParseJson(llmResponseText) {
  if (typeof llmResponseText !== 'string') return null;

  const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/s;
  const match = llmResponseText.match(jsonRegex);

  if (match && match[1]) {
    const jsonString = match[1];
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse the extracted JSON string:', error);
      // Fallback: continue and try other methods below
    }
  }

  // Fallback 1: try parsing the whole string in case it's pure JSON
  try {
    return JSON.parse(llmResponseText.trim());
  } catch (error) {
    // Fallback 2: try finding JSON substring (object or array)
    const m = llmResponseText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (e) {
        return null;
      }
    }
  }

  // Return null if all parsing attempts fail
  return null;
}

export default extractAndParseJson;
