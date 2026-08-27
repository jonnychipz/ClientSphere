const prettySource = (name) =>
  (name || "knowledge base")
    .replace(/^\d+-/, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ");

function webCitation(annotation) {
  try {
    const url = new URL(annotation.url);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return {
      label: annotation.title || url.hostname.replace(/^www\./, ""),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

export function renderAgentResponse(response, fileMap = {}) {
  let text = response.output_text || "";
  let collectedText = "";
  const citations = [];
  const seen = new Set();
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part.type !== "output_text") continue;
      collectedText += part.text || "";
      for (const annotation of part.annotations || []) {
        if (annotation.type === "file_citation") {
          const source = prettySource(fileMap[annotation.file_id] || annotation.filename);
          const key = `file:${source}`;
          if (!seen.has(key)) {
            seen.add(key);
            citations.push(source);
          }
        } else if (annotation.type === "url_citation") {
          const citation = webCitation(annotation);
          const key = citation ? `url:${citation.url}` : "";
          if (citation && !seen.has(key)) {
            seen.add(key);
            citations.push(citation);
          }
        }
      }
    }
  }
  if (!text) text = collectedText;
  text = text
    .replace(/\u3010[^\u3011]*\u3011/g, "")
    .replace(/[\u3010\u3011]/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/ +([.,;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n");
  return { text: text.trim(), citations };
}
