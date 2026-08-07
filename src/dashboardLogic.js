export const normalizeText = (value) =>
  String(value ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, " ");

export const normalizeHeader = (value) =>
  normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

export const getValueFromRow = (row, aliases) => {
  const aliasSet = new Set(aliases.map(normalizeHeader));
  for (const [key, value] of Object.entries(row || {})) {
    if (aliasSet.has(normalizeHeader(key))) {
      return normalizeText(value);
    }
  }
  return "";
};

const parseTimeParts = (value) => {
  const cleaned = normalizeText(value);
  if (!cleaned) return null;

  const matches = cleaned.match(/(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?/);
  if (!matches) return null;

  const hours = Number(matches[1]);
  const minutes = Number(matches[2] || 0);
  const seconds = Number(matches[3] || 0);

  return { hours, minutes, seconds };
};

export const parseDurationValue = (value) => {
  const cleaned = normalizeText(value);
  if (!cleaned) return null;

  const timeParts = parseTimeParts(cleaned);
  if (timeParts) {
    return timeParts.hours * 60 + timeParts.minutes + timeParts.seconds / 60;
  }

  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]);
};

export const formatMinutes = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "0 min";
  return `${Math.round(value)} min`;
};

export const calculateDurationMinutes = (startTime, endTime) => {
  const start = parseTimeParts(startTime);
  const end = parseTimeParts(endTime);

  if (!start || !end) return null;

  const startMinutes = start.hours * 60 + start.minutes + start.seconds / 60;
  const endMinutes = end.hours * 60 + end.minutes + end.seconds / 60;

  return endMinutes - startMinutes;
};

export const validateRows = (rows) => {
  const stats = {};

  rows.forEach((row) => {
    const channel = normalizeText(row.channel);
    if (!channel) return;

    if (!stats[channel]) {
      stats[channel] = {
        channel,
        startOk: true,
        endOk: true,
        movieOk: true,
        durationOk: true,
        duration: 0,
        startTime: row.startTime || "",
        endTime: row.endTime || "",
        movieName: row.movieName || "",
      };
    }

    const current = stats[channel];
    const explicitDuration = parseDurationValue(row.duration);
    const computedDuration = calculateDurationMinutes(row.startTime, row.endTime);
    const durationValue = explicitDuration ?? computedDuration;

    if (durationValue !== null) {
      current.duration += durationValue;
    }

    if (row.startTime && row.startTime !== "00:00:01") {
      current.startOk = false;
    }

    if (row.endTime && row.endTime !== "23:59:59") {
      current.endOk = false;
    }

    if (row.movieName && !/^Bangla Movie At\s+\d{1,2}:\d{2}\s*(AM|PM)\(.+\)$/.test(row.movieName)) {
      current.movieOk = false;
    }

    if (durationValue !== null && durationValue > 1440) {
      current.durationOk = false;
    }

    current.startTime = current.startTime || row.startTime;
    current.endTime = current.endTime || row.endTime;
    current.movieName = current.movieName || row.movieName;
  });

  return Object.values(stats).sort((a, b) => a.channel.localeCompare(b.channel));
};

export const buildValidationSummary = (rows) => {
  const stats = validateRows(rows);
  const totalChannels = stats.length;
  const invalidStart = stats.filter((item) => !item.startOk);
  const invalidEnd = stats.filter((item) => !item.endOk);
  const invalidMovie = stats.filter((item) => !item.movieOk);
  const invalidDuration = stats.filter((item) => !item.durationOk);

  return {
    totalChannels,
    totalRows: rows.length,
    invalidStart,
    invalidEnd,
    invalidMovie,
    invalidDuration,
    stats,
  };
};
