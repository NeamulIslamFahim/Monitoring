import { state } from './state.js';
import { DAY_MINUTES, formatGapSeconds, pill } from './utils.js';

export function renderAll() {
    const CHANNELS = state.CHANNELS;
    const reportMeta = state.reportMeta;

    document.getElementById('dash').style.display = 'block';
    document.getElementById('tally').classList.remove('off');

    const startFails = CHANNELS.filter(c => !c.startOk).length;
    const endFails = CHANNELS.filter(c => !c.endOk).length;
    const movieFails = CHANNELS.reduce((sum, c) => sum + ((c.badMovies || []).length), 0);
    const reviewCount = CHANNELS.reduce((sum, c) => sum + ((c.reviewIssues || []).length), 0);
    const over1400 = CHANNELS.filter(c => c.duration > 1400).length;
    const programNameAzanTotal = CHANNELS.reduce((sum, c) => sum + (c.programNameAzanCount || 0), 0);

    document.getElementById('metaStrip').innerHTML =
        '<div class="meta-item">রিপোর্ট তারিখ<b>' + (reportMeta.date || '—') + '</b></div>' +
        '<div class="meta-item">মোট চ্যানেল<b>' + CHANNELS.length + '</b></div>' +
        '<div class="meta-item">মোট রো<b>' + reportMeta.totalRows + '</b></div>';

    document.getElementById('kpiRow').innerHTML = [
        ['মোট চ্যানেল', CHANNELS.length, ''],
        ['Program / Telecast', reviewCount, reviewCount ? 'warn' : 'ok'],
        ['Start Time ভুল', startFails, startFails ? 'bad' : 'ok'],
        ['End Time ভুল', endFails, endFails ? 'bad' : 'ok'],
        ['Movie ফরম্যাট ভুল', movieFails, movieFails ? 'warn' : 'ok'],
        ['Program Name Azan', programNameAzanTotal, ''],
        ['1400+ মিনিট', over1400, over1400 ? 'warn' : 'ok'],
    ].map(([label, val, cls]) =>
        '<div class="kpi ' + cls + '"><div class="label">' + label + '</div><div class="value">' + val + '</div></div>'
    ).join('');

    renderTab();
}

function filteredChannels() {
    return state.CHANNELS.filter(c => c.name.toLowerCase().includes(state.searchTerm));
}

export function renderTab() {
    const el = document.getElementById('tabContent');
    const list = filteredChannels();

    if (state.currentTab === 'overview') {
        if (!list.length) {
            el.innerHTML = '<div class="empty">কোনো চ্যানেল পাওয়া যায়নি।</div>';
            return;
        }

        el.innerHTML = '<div class="panel"><table><thead><tr>' +
            '<th>চ্যানেল</th><th>Start</th><th>End</th><th>Duration</th><th>Movie ফরম্যাট</th>' +
            '</tr></thead><tbody>' +
            list.map(c => {
                const pct = Math.min(100, Math.round((c.duration / DAY_MINUTES) * 100));
                const barColor = !c.withinLimit ? 'var(--signal-red)' : (pct < 90 ? 'var(--signal-amber)' : 'var(--signal-green)');
                return '<tr>' +
                    '<td class="chname">' + c.name + '</td>' +
                    '<td>' + pill(c.startOk, c.firstStart, c.firstStart) + '</td>' +
                    '<td>' + pill(c.endOk, c.lastEnd, c.lastEnd) + '</td>' +
                    '<td><div class="bar-wrap"><span class="mono" style="font-size:12px;">' + c.duration + ' মিনিট</span>' +
                    '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div></div></td>' +
                    '<td>' + (c.movieCount === 0 ? pill(null, null, null, 'প্রযোজ্য না') : pill(c.movieOk, 'ঠিক আছে', c.badMovies.length + ' টি ভুল')) + '</td>' +
                    '</tr>';
            }).join('') + '</tbody></table></div>';
        return;
    }

    if (state.currentTab === 'review') {
        const reviewRows = list.flatMap(c => (c.reviewIssues || []).map(issue => ({ channel: c.name, issue })));
        if (!reviewRows.length) {
            el.innerHTML = '<div class="empty">কোনো General / Telecast সমস্যা নেই।</div>';
            return;
        }

        el.innerHTML = '<div class="panel"><table><thead><tr>' +
            '<th>চ্যানেল</th><th>Program Type</th><th>Program Name</th><th>Telecast</th><th>Start</th><th>End</th>' +
            '</tr></thead><tbody>' +
            reviewRows.map(row => {
                return '<tr>' +
                    '<td class="chname">' + row.channel + '</td>' +
                    '<td>' + (row.issue.programType || '—') + '</td>' +
                    '<td>' + (row.issue.programName || '—') + '</td>' +
                    '<td>' + (row.issue.telecast || '—') + '</td>' +
                    '<td>' + (row.issue.start || '—') + '</td>' +
                    '<td>' + (row.issue.end || '—') + '</td>' +
                    '</tr>';
            }).join('') + '</tbody></table></div>';
        return;
    }

    if (state.currentTab === 'azan') {
        const azanChannels = list
            .map(c => ({
                ...c,
                azanRows: (c.rowsData || []).filter(r => r.azanCount > 0),
            }))
            .filter(c => c.azanRows.length > 0);

        if (!azanChannels.length) {
            el.innerHTML = '<div class="empty">কোনো Azan রেকর্ড নেই।</div>';
            return;
        }

        el.innerHTML = azanChannels.map(c => {
            return '<div class="badmovie-card">' +
                '<div class="ch">' + c.name + ' - ' + c.azanRows.length + 'টি Azan</div>' +
                c.azanRows.map(r => '<div class="badmovie-row"><span>' + (r.programName || 'Azan') + '</span><span>' + (r.start || '—') + ' - ' + (r.end || '—') + '</span></div>').join('') +
                '</div>';
        }).join('');
        return;
    }

    if (state.currentTab === 'startend') {
        const badStart = list.filter(c => !c.startOk);
        const badEnd = list.filter(c => !c.endOk);
        el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
            '<div><h3 class="headline" style="font-size:14px;margin:0 0 4px;">Start Time সমস্যা (' + badStart.length + ' টি)</h3>' +
            '<p style="font-size:12px;color:var(--muted);margin:0 0 10px;">প্রত্যাশিত মান: <span class="mono">00:00:01</span></p>' +
            (badStart.length ? badStart.map(c =>
                '<div class="badmovie-card"><div class="ch">' + c.name + '</div><div class="mono" style="color:var(--bad);font-size:13px;">শুরু: ' + c.firstStart + '</div></div>'
            ).join('') : '<div class="empty">কোনো সমস্যা নেই</div>') + '</div>' +
            '<div><h3 class="headline" style="font-size:14px;margin:0 0 4px;">End Time সমস্যা (' + badEnd.length + ' টি)</h3>' +
            '<p style="font-size:12px;color:var(--muted);margin:0 0 10px;">প্রত্যাশিত মান: <span class="mono">23:59:59</span></p>' +
            (badEnd.length ? badEnd.map(c =>
                '<div class="badmovie-card"><div class="ch">' + c.name + '</div><div class="mono" style="color:var(--bad);font-size:13px;">শেষ: ' + c.lastEnd + '</div></div>'
            ).join('') : '<div class="empty">কোনো সমস্যা নেই</div>') + '</div>' +
            '</div>';
        return;
    }

    if (state.currentTab === 'movie') {
        const movieList = list.filter(c => (c.movieIssueRows || []).length > 0);
        el.innerHTML = '<div class="format-hint">সঠিক ফরম্যাট: <code>Bangla Movie At HH:MM AM/PM(Movie Name)</code> - যেমন <code>Bangla Movie At 09:50 PM(Biyer Prostab)</code></div>' +
            (movieList.length ? movieList.map(c =>
                '<div class="badmovie-card"><div class="ch">' + c.name + ' - ' + c.movieIssueRows.length + ' টি Movie রেকর্ড</div>' +
                c.movieIssueRows.map(row => {
                    const formatLabel = row.name;
                    const telecastLabel = row.telecast || 'No Telecast';
                    return '<div class="badmovie-row"><span>' + formatLabel + '</span><span>' + (row.start || '—') + ' - ' + (row.end || '—') + ' • ' + telecastLabel + '</span></div>';
                }).join('') +
                '</div>'
            ).join('') : '<div class="empty">কোনো Movie ফরম্যাট সমস্যা নেই।</div>');
        return;
    }

    if (state.currentTab === 'duration') {
        const sorted = list.slice().sort((a, b) => b.duration - a.duration);
        el.innerHTML = '<div class="panel" style="padding:14px;">' +
            sorted.map(c => {
                const pct = Math.min(100, Math.round((c.duration / DAY_MINUTES) * 100));
                const over = !c.withinLimit;
                const barColor = over ? 'var(--signal-red)' : (c.duration > 1400 ? 'var(--signal-amber)' : 'var(--signal-green)');
                return '<div style="margin-bottom:12px;">' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
                    '<span style="font-size:13px;font-weight:600;' + (over ? 'color:var(--bad);' : '') + '">' + c.name + '</span>' +
                    '<span class="mono" style="font-size:12.5px;' + (over ? 'color:var(--bad);font-weight:600;' : 'color:var(--muted);') + '">' + c.duration + ' মিনিট</span></div>' +
                    '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + barColor + ';"></div></div></div>';
            }).join('') + '</div>';
        return;
    }

    if (state.currentTab === 'timegap') {
        const gapRows = list.flatMap(c => (c.gapRows || []).map(row => ({ channel: c.name, ...row })));
        if (!gapRows.length) {
            el.innerHTML = '<div class="empty">Time Gap দেখানোর মতো পর্যাপ্ত entries নেই।</div>';
            return;
        }

        const gapCount = gapRows.filter(row => row.status === 'gap').length;
        const overlapCount = gapRows.filter(row => row.status === 'overlap').length;
        const touchingCount = gapRows.filter(row => row.status === 'touching').length;

        el.innerHTML =
            '<div class="gap-summary">' +
                '<div class="summary-card gap"><div class="summary-label">Gap</div><div class="summary-value">' + gapCount + '</div></div>' +
                '<div class="summary-card overlap"><div class="summary-label">Overlap</div><div class="summary-value">' + overlapCount + '</div></div>' +
                '<div class="summary-card touching"><div class="summary-label">Touching</div><div class="summary-value">' + touchingCount + '</div></div>' +
            '</div>' +
            '<div class="panel"><table><thead><tr>' +
            '<th>চ্যানেল</th><th>Previous Program</th><th>Previous End</th><th>Next Program</th><th>Next Start</th><th>Gap</th><th>Status</th>' +
            '</tr></thead><tbody>' +
            gapRows.map(row => {
                const statusLabel = row.status === 'gap' ? 'Gap' : (row.status === 'overlap' ? 'Overlap' : (row.status === 'touching' ? 'Touching' : 'Unknown'));
                const statusPill = row.status === 'gap'
                    ? pill(true, 'Gap', 'Gap')
                    : row.status === 'overlap'
                        ? pill(false, 'Overlap', 'Overlap')
                        : pill(null, null, statusLabel);
                return '<tr>' +
                    '<td class="chname">' + row.channel + '</td>' +
                    '<td>' + row.prevProgramName + '</td>' +
                    '<td class="mono">' + row.prevEnd + '</td>' +
                    '<td>' + row.nextProgramName + '</td>' +
                    '<td class="mono">' + row.nextStart + '</td>' +
                    '<td class="mono" style="font-weight:600;' + (row.status === 'overlap' ? 'color:var(--bad);' : (row.status === 'gap' ? 'color:var(--ok);' : 'color:var(--muted);')) + '">' + formatGapSeconds(row.gapSeconds) + '</td>' +
                    '<td>' + statusPill + '</td>' +
                    '</tr>';
            }).join('') + '</tbody></table></div>';
        return;
    }
}
