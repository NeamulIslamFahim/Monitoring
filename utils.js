const MOVIE_FORMAT_RE = /^Bangla Movie At \d{1,2}:\d{2} (AM|PM)\(.+\)$/;
const AD_SUFFIX_RE = /-\s*\d+$/;
const DAY_MINUTES = 1440;

function findKey(headers, matchers) {
    for (const m of matchers) {
        const hit = headers.find(h => h.toLowerCase().trim() === m);
        if (hit) return hit;
    }
    for (const m of matchers) {
        const hit = headers.find(h => h.toLowerCase().includes(m));
        if (hit) return hit;
    }
    return null;
}

function parseTimeParts(value) {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return {
            hours: value.getHours(),
            minutes: value.getMinutes(),
            seconds: value.getSeconds(),
        };
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        if (value >= 0 && value < 1) {
            const totalSeconds = Math.round(value * DAY_MINUTES * 60);
            return {
                hours: Math.floor(totalSeconds / 3600) % 24,
                minutes: Math.floor((totalSeconds % 3600) / 60),
                seconds: totalSeconds % 60,
            };
        }
        return null;
    }

    const text = String(value).trim();
    if (!text) return null;

    const compact = text
        .replace(/[．。]/g, '.')
        .replace(/\s+/g, ' ')
        .trim();

    const timeMatch = compact.match(/^(\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?\s*([ap]m)?$/i);
    if (!timeMatch) return null;

    let hours = Number.parseInt(timeMatch[1], 10);
    const hasHourMinuteSecond = timeMatch[2] !== undefined;
    const minutes = Number.parseInt(timeMatch[2] || '0', 10);
    const seconds = Number.parseInt(timeMatch[3] || '0', 10);
    const suffix = timeMatch[4] ? timeMatch[4].toLowerCase() : '';

    if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
    if (minutes > 59 || seconds > 59) return null;

    if (suffix) {
        if (hours < 1 || hours > 12) return null;
        if (suffix === 'am') {
            hours = hours === 12 ? 0 : hours;
        } else if (suffix === 'pm') {
            hours = hours === 12 ? 12 : hours + 12;
        }
    } else if (hasHourMinuteSecond && text.includes(':') && hours > 23) {
        return null;
    }

    if (hours > 23) return null;

    return { hours, minutes, seconds };
}

function formatTime(value) {
    const parts = parseTimeParts(value);
    if (!parts) return String(value || '').trim();
    return String(parts.hours).padStart(2, '0') + ':' + String(parts.minutes).padStart(2, '0') + ':' + String(parts.seconds).padStart(2, '0');
}

function timeToSeconds(str) {
    const parts = parseTimeParts(str);
    if (!parts) return null;
    return parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
}

function formatGapSeconds(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) return '—';
    const sign = totalSeconds < 0 ? '-' : '';
    const abs = Math.abs(Math.round(totalSeconds));
    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    const seconds = abs % 60;
    const parts = [];
    if (hours) parts.push(String(hours));
    parts.push(String(hours ? String(minutes).padStart(2, '0') : minutes));
    parts.push(String(seconds).padStart(2, '0'));
    return sign + parts.join(':');
}

function pill(ok, okText, failText, naText) {
    if (naText !== undefined && okText === null) return '<span class="pill na">' + naText + '</span>';
    const cls = ok ? 'ok' : 'bad';
    return '<span class="pill ' + cls + '"><span class="dot"></span>' + (ok ? okText : failText) + '</span>';
}

export { MOVIE_FORMAT_RE, AD_SUFFIX_RE, DAY_MINUTES, findKey, timeToSeconds, formatGapSeconds, pill, formatTime };
