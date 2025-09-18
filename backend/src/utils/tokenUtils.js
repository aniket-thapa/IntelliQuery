// src/utils/tokenUtils.js
// Simple helpers to trim history to avoid huge prompts.
// We use a character-limit heuristic rather than real token counting.

export function estimateAndTrimHistory(messages = [], charLimit = 3000) {
  // messages: [{ sender, text }]
  if (!messages || messages.length === 0) return [];

  // concatenate from most recent backward until within charLimit
  const out = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const chunk = `${m.sender}: ${m.text}\n`;
    const len = chunk.length;
    if (total + len > charLimit) break;
    out.unshift(m); // preserve chronological order
    total += len;
  }
  return out;
}
