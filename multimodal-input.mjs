export function buildAgentInput(message, attachments) {
  if (attachments === undefined || attachments === null || attachments.length === 0) return message;
  if (!Array.isArray(attachments) || attachments.length > 1) {
    const error = new Error("Attach at most one image.");
    error.statusCode = 400;
    throw error;
  }
  const attachment = attachments[0] || {};
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(attachment.dataUrl || "");
  if (!match || attachment.mimeType !== match[1]) {
    const error = new Error("Image must be PNG, JPEG, or WebP.");
    error.statusCode = 400;
    throw error;
  }
  const bytes = Buffer.byteLength(match[2], "base64");
  if (bytes === 0 || bytes > 4 * 1024 * 1024) {
    const error = new Error("Image must be smaller than 4 MB.");
    error.statusCode = 400;
    throw error;
  }
  return [{
    type: "message",
    role: "user",
    content: [
      { type: "input_text", text: message },
      { type: "input_image", image_url: attachment.dataUrl, detail: "auto" },
    ],
  }];
}
