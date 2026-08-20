import { findKey, timeToSeconds, formatGapSeconds, MOVIE_FORMAT_RE, AD_SUFFIX_RE, DAY_MINUTES } from './utils.js';

const liveVisualProgramTypes = new Set([
    'drama-single',
    'drama dubbing-serial',
    'telefilm',
    'drama-serial',
    'drama serial',
    'drama dubbing-single',
    'movie-kids',
]);

function formatAdDate(value) {
    const text = String(value || '').trim();
    const match = text.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
}

function formatAdTime(value) {
    const text = String(value || '').trim();
    const match = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return text;
    return match[1].padStart(2, '0') + ':' + match[2] + ':' + (match[3] || '00');
}

export function processRows(rows) {
    if (!rows.length) throw new Error('ফাইলে কোনো ডাটা পাওয়া যায়নি।');

    const headers = Object.keys(rows[0]);
    const chKey = findKey(headers, ['channel name', 'channel']);
    const startKey = findKey(headers, ['start time']);
    const endKey = findKey(headers, ['end time']);
    const durKey = findKey(headers, ['program_duration_min', 'duration_min', 'duration']);
    const genreKey = findKey(headers, ['program_type_genre', 'genre', 'program_type', 'type']);
    const nameKey = findKey(headers, ['program_name', 'program name']);
    const telecastKey = findKey(headers, ['telecast', 'telecast type', 'broadcast type', 'broadcast_type']);
    const dateKey = findKey(headers, ['program_date', 'date']);
    const adNameKey = findKey(headers, ['ad_name', 'ad name']);

    if (!chKey || !startKey || !endKey) {
        throw new Error('ফাইলে Channel Name, Start Time, End Time কলাম খুঁজে পাওয়া যায়নি। কলামের নাম চেক করুন।');
    }

    const groups = {};
    rows.forEach(r => {
        const ch = (r[chKey] || '').toString().trim();
        if (!ch) return;
        if (!groups[ch]) groups[ch] = [];
        groups[ch].push(r);
    });

    const channels = Object.keys(groups).sort().map(ch => {
        const list = groups[ch].slice().sort((a, b) => {
            const ta = timeToSeconds(a[startKey]);
            const tb = timeToSeconds(b[startKey]);
            return (ta ?? 0) - (tb ?? 0);
        });

        const first = list[0];
        const last = list[list.length - 1];
        const firstStart = (first[startKey] || '').toString().trim();
        const lastEnd = (last[endKey] || '').toString().trim();
        const startOk = firstStart === '0:00:01' || firstStart === '00:00:01';
        const endOk = lastEnd === '23:59:59';

        let totalDuration = 0;
        if (durKey) {
            list.forEach(r => {
                const v = parseFloat(r[durKey]);
                if (!isNaN(v)) totalDuration += v;
            });
        } else {
            list.forEach(r => {
                const s = timeToSeconds(r[startKey]);
                const e = timeToSeconds(r[endKey]);
                if (s !== null && e !== null && e >= s) totalDuration += (e - s) / 60;
            });
        }

        let movies = [];
        let badMovies = [];
        let movieIssueRows = [];
        if (genreKey && nameKey) {
            movies = list.filter(r => (r[genreKey] || '').toString().trim().toLowerCase() === 'movie');
            movies.forEach(r => {
                const name = (r[nameKey] || '').toString().trim();
                const telecast = telecastKey ? (r[telecastKey] || '').toString().trim() : '';
                const isLive = telecast.toLowerCase() === 'live';
                const validFormat = MOVIE_FORMAT_RE.test(name);

                if (!validFormat) {
                    badMovies.push({ name, start: r[startKey], end: r[endKey], telecast });
                }
                if (isLive || !validFormat) {
                    movieIssueRows.push({
                        name,
                        start: r[startKey],
                        end: r[endKey],
                        telecast,
                        validFormat,
                    });
                }
            });
        }

        const rowNameValue = nameKey ? (r => (r[nameKey] || '').toString().trim().toLowerCase()) : null;
        const rowGenreValue = genreKey ? (r => (r[genreKey] || '').toString().trim().toLowerCase()) : null;
        const programNameAzanCount = nameKey ? list.filter(r => rowNameValue(r).includes('azan')).length : 0;
        const generalNameCount = nameKey ? list.filter(r => rowNameValue(r) === 'general').length : 0;
        const generalTypeCount = genreKey ? list.filter(r => rowGenreValue(r) === 'general').length : 0;
        const telecastRecordCount = telecastKey ? list.filter(r => ['record', 'recorded'].includes((r[telecastKey] || '').toString().trim().toLowerCase())).length : 0;
        const telecastLiveCount = telecastKey ? list.filter(r => (r[telecastKey] || '').toString().trim().toLowerCase() === 'live').length : 0;
        const reviewIssues = list.filter(r => {
            const programType = genreKey ? (r[genreKey] || '').toString().trim().toLowerCase() : '';
            const programName = nameKey ? (r[nameKey] || '').toString().trim().toLowerCase() : '';
            const telecast = telecastKey ? (r[telecastKey] || '').toString().trim().toLowerCase() : '';
            const isProgramGeneral = programType === 'program-general' && programName === 'program-general';
            const isProgramReligionsAzanLive = programType === 'program-religions' && programName.includes('azan') && telecast === 'live';
            const isGeneralType = programType === 'general';
            const isNonGeneralName = programName !== 'general';
            const isNonRecordTelecast = !['record', 'recorded'].includes(telecast);
            const isLiveVisualType = telecast === 'live' && liveVisualProgramTypes.has(programType);
            return isProgramGeneral || isProgramReligionsAzanLive || (isGeneralType && (isNonGeneralName || isNonRecordTelecast)) || isLiveVisualType;
        }).map(r => ({
            start: r[startKey],
            end: r[endKey],
            programType: genreKey ? (r[genreKey] || '').toString().trim() : '',
            programName: nameKey ? (r[nameKey] || '').toString().trim() : '',
            telecast: telecastKey ? (r[telecastKey] || '').toString().trim() : '',
        }));

        const rowsData = list.map(r => {
            const programName = nameKey ? (r[nameKey] || '').toString().trim() : '';
            const telecast = telecastKey ? (r[telecastKey] || '').toString().trim() : '';
            const adName = adNameKey ? (r[adNameKey] || '').toString().trim() : '';
            const isMovie = genreKey ? (r[genreKey] || '').toString().trim().toLowerCase() === 'movie' : false;
            const start = (r[startKey] || '').toString().trim();
            const end = (r[endKey] || '').toString().trim();
            const durationValue = durKey ? parseFloat(r[durKey]) : null;
            const movieFormatValid = nameKey ? MOVIE_FORMAT_RE.test(programName) : true;
            return {
                channel: ch,
                start,
                end,
                programName,
                telecast,
                adName,
                duration: durationValue,
                isMovie,
                movieFormatValid,
                showInMovieTab: isMovie && (telecast.toLowerCase() === 'live' || !movieFormatValid),
                azanCount: nameKey && rowNameValue(r).includes('azan') ? 1 : 0,
                hasAdSuffix: adName ? AD_SUFFIX_RE.test(adName) : false,
                showInNoSuffixTab: !!adName && !AD_SUFFIX_RE.test(adName),
            };
        });

        const noSuffixRows = adNameKey
            ? rowsData.filter(row => row.showInNoSuffixTab)
            : [];

        const gapRows = rowsData.slice(1).map((row, idx) => {
            const prev = rowsData[idx];
            const prevEndSec = timeToSeconds(prev.end);
            const nextStartSec = timeToSeconds(row.start);
            const gapSeconds = (prevEndSec !== null && nextStartSec !== null) ? nextStartSec - prevEndSec : null;

            return {
                channel: ch,
                index: idx + 2,
                prevProgramName: prev.programName || '—',
                prevEnd: prev.end || '—',
                nextProgramName: row.programName || '—',
                nextStart: row.start || '—',
                gapSeconds,
                gapText: formatGapSeconds(gapSeconds),
                gapMinutes: gapSeconds === null ? null : Math.round((gapSeconds / 60) * 100) / 100,
                status: gapSeconds === null ? 'unknown' : (gapSeconds < 0 ? 'overlap' : (gapSeconds === 0 ? 'touching' : 'gap')),
            };
        });

        const timeIssueRows = rowsData.filter(row => {
            const startSec = timeToSeconds(row.start);
            const endSec = timeToSeconds(row.end);
            const durationIsZero = row.duration !== null && !Number.isNaN(row.duration) && Number(row.duration) === 0;
            return startSec !== null && endSec !== null && startSec > endSec && durationIsZero;
        }).map(row => ({
            channel: ch,
            start: row.start || 'â€”',
            end: row.end || 'â€”',
            duration: row.duration === null || Number.isNaN(row.duration) ? 'â€”' : row.duration,
            programName: row.programName || 'â€”',
            telecast: row.telecast || 'â€”',
        }));

        return {
            name: ch,
            rows: list.length,
            rowsData,
            gapRows,
            firstStart,
            startOk,
            lastEnd,
            endOk,
            duration: Math.round(totalDuration * 100) / 100,
            withinLimit: totalDuration <= DAY_MINUTES + 0.5,
            movieCount: movies.length,
            badMovies,
            movieIssueRows,
            movieOk: badMovies.length === 0,
            programNameAzanCount,
            generalNameCount,
            generalTypeCount,
            telecastRecordCount,
            telecastLiveCount,
            reviewIssues,
            noSuffixRows,
            timeIssueRows,
        };
    });

    const dateVal = dateKey ? (rows[0][dateKey] || '') : '';
    return { channels, meta: { date: String(dateVal).trim(), totalRows: rows.length } };
}

export function processAdRows(rows) {
    if (!rows.length) throw new Error('The file does not contain any data.');

    const headers = Object.keys(rows[0]);
    const chKey = findKey(headers, ['channel name', 'channel']);
    const adNameKey = findKey(headers, ['ad_name', 'ad name']);
    const adTypeKey = findKey(headers, ['ad_type', 'ad type']);
    const dateKey = findKey(headers, ['ad_date', 'date']);
    const startKey = findKey(headers, ['start']);
    const finishKey = findKey(headers, ['finish', 'end']);
    const durationKey = findKey(headers, ['duration']);

    if (!chKey || !adNameKey) {
        throw new Error('The file must contain Channel Name and Ad_Name columns.');
    }

    const groups = {};
    rows.forEach(row => {
        const channel = String(row[chKey] || '').trim();
        if (!channel) return;

        const adName = String(row[adNameKey] || '').trim();
        const suffixMatch = adName.match(/-\s*(\d+)\s*$/);
        const duration = durationKey ? String(row[durationKey] || '').trim() : '';
        const durationNumber = Number.parseFloat(duration);
        if (!groups[channel]) groups[channel] = [];
        groups[channel].push({
            adName,
            adType: adTypeKey ? String(row[adTypeKey] || '').trim() : '',
            date: dateKey ? formatAdDate(row[dateKey]) : '',
            start: startKey ? formatAdTime(row[startKey]) : '',
            finish: finishKey ? formatAdTime(row[finishKey]) : '',
            duration,
            suffixDuration: suffixMatch ? Number.parseInt(suffixMatch[1], 10) : null,
            durationNumber,
            hasPrefix: AD_SUFFIX_RE.test(adName),
        });
    });

    const channels = Object.keys(groups).sort((a, b) => a.localeCompare(b)).map(name => {
        const ads = groups[name];
        const noPrefixRows = ads.filter(ad => ad.adName && !ad.hasPrefix);
        const adTypeErrorRows = ads.filter(ad => ad.adType.toLowerCase() !== 'promo');
        const durationMismatchRows = ads.filter(ad =>
            ad.suffixDuration !== null && Number.isFinite(ad.durationNumber) && ad.suffixDuration > ad.durationNumber
        );
        return { name, rows: ads.length, noPrefixRows, adTypeErrorRows, durationMismatchRows };
    });

    const dateValue = dateKey ? String(rows[0][dateKey] || '').trim() : '';
    return { channels, meta: { date: dateValue, totalRows: rows.length } };
}

export class ProgramReportParser {
    parse(rows) {
        return processRows(rows);
    }
}

export class TvcReportParser {
    parse(rows) {
        return processAdRows(rows);
    }
}
