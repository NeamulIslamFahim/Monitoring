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

function timeToSeconds(str) {
    if (!str) return null;
    const s = String(str).trim();
    const m = s.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
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

export { MOVIE_FORMAT_RE, AD_SUFFIX_RE, DAY_MINUTES, findKey, timeToSeconds, formatGapSeconds, pill };
