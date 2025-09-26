// utils/extractAndParseJson.js
function extractAndParseJson(llmResponseText) {
  const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/s;
  const match = llmResponseText.match(jsonRegex);

  if (match && match[1]) {
    const jsonString = match[1];
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse the extracted JSON string:', error);
      return null;
    }
  }

  // Return null if no JSON block was found
  return null;
}

export default extractAndParseJson;
