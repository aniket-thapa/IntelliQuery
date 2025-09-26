// src/utils/tokenUtils.js
export function estimateAndTrimHistory(messages = [], charLimit = 3000) {
  if (!Array.isArray(messages)) return [];
  const out = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const chunk = `${m.sender}: ${m.text}\n`;
    const len = chunk.length;
    if (total + len > charLimit) break;
    out.unshift(m);
    total += len;
  }
  return out;
}
