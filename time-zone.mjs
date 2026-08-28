export const FORMAT_USER_TIMESTAMPS_TOOL = Object.freeze({
  name: "format_user_timestamps",
  description:
    "Convert source timestamps into the current ClientSphere user's validated IANA time zone. " +
    "Use this after retrieving Fabric evidence and before displaying any date or time.",
  parameters: {
    type: "object",
    properties: {
      timestamps: {
        type: "array",
        description: "Exact source timestamps to convert. Include any source offset; timestamps without one are treated as UTC.",
        items: { type: "string" },
        minItems: 1,
        maxItems: 50,
      },
    },
    required: ["timestamps"],
    additionalProperties: false,
  },
});

export function buildUserTimestampTool() {
  return {
    type: "function",
    name: FORMAT_USER_TIMESTAMPS_TOOL.name,
    description: FORMAT_USER_TIMESTAMPS_TOOL.description,
    strict: true,
    parameters: FORMAT_USER_TIMESTAMPS_TOOL.parameters,
  };
}

export function normalizeUserTimeZone(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 100) return "UTC";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: value.trim() })
      .resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function parseSourceTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Timestamp must be a non-empty string.");
  }
  const trimmed = value.trim();
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = hasExplicitZone
    ? trimmed
    : `${trimmed.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`'${trimmed}' is not a valid timestamp.`);
  }
  return date;
}

function offsetLabel(date, timeZone) {
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value || "GMT";
  if (value === "GMT" || value === "UTC") return "UTC+00:00";
  const match = /(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?/.exec(value);
  if (!match) return value.replace(/^GMT/, "UTC");
  return `UTC${match[1]}${match[2].padStart(2, "0")}:${match[3] || "00"}`;
}

export function formatTimestampForUser(value, userTimeZone) {
  const timeZone = normalizeUserTimeZone(userTimeZone);
  const date = parseSourceTimestamp(value);
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(date);
  return {
    source: value.trim(),
    sourceUtc: date.toISOString(),
    local: `${local} (${offsetLabel(date, timeZone)} · ${timeZone})`,
  };
}

export function buildUserTimeContext(userTimeZone, now = new Date()) {
  const timeZone = normalizeUserTimeZone(userTimeZone);
  return {
    timeZone,
    marker: `[[USER_TIME_ZONE: ${timeZone}. Current local time: ${formatTimestampForUser(now.toISOString(), timeZone).local}.]]`,
  };
}

export function formatUserTimestamps(argsJson, userTimeZone) {
  let timestamps;
  try {
    timestamps = JSON.parse(argsJson || "{}").timestamps;
  } catch {
    return "Error: could not parse timestamp tool arguments.";
  }
  if (!Array.isArray(timestamps) || !timestamps.length || timestamps.length > 50) {
    return "Error: provide between 1 and 50 timestamps.";
  }
  try {
    return JSON.stringify({
      timeZone: normalizeUserTimeZone(userTimeZone),
      timestamps: timestamps.map((timestamp) => formatTimestampForUser(timestamp, userTimeZone)),
    });
  } catch (error) {
    return `Error converting timestamps: ${error.message}`;
  }
}
