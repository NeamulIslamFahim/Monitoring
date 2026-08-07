const MOVIE_FORMAT_RE = /^Bangla Movie At \d{1,2}:\d{2} (AM|PM)\(.+\)$/;
const DAY_MINUTES = 1440;

let CHANNELS = [];
let currentTab = 'overview';
let searchTerm = '';
let reportMeta = { date: '', totalRows: 0 };

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

function processRows(rows) {
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
      const isGeneralType = programType === 'general';
      const isNonGeneralName = programName !== 'general';
      const isNonRecordTelecast = !['record', 'recorded'].includes(telecast);
      return isGeneralType && (isNonGeneralName || isNonRecordTelecast);
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
      const isMovie = genreKey ? (r[genreKey] || '').toString().trim().toLowerCase() === 'movie' : false;
      const movieFormatValid = nameKey ? MOVIE_FORMAT_RE.test(programName) : true;
      return {
        channel: ch,
        start: (r[startKey] || '').toString().trim(),
        end: (r[endKey] || '').toString().trim(),
        programName,
        telecast,
        isMovie,
        movieFormatValid,
        showInMovieTab: isMovie && (telecast.toLowerCase() === 'live' || !movieFormatValid),
        azanCount: nameKey && rowNameValue(r).includes('azan') ? 1 : 0,
      };
    });

    return {
      name: ch,
      rows: list.length,
      rowsData,
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
    };
  });

  const dateVal = dateKey ? (rows[0][dateKey] || '') : '';
  return { channels, meta: { date: String(dateVal).trim(), totalRows: rows.length } };
}

function handleFile(file) {
  const errBox = document.getElementById('err');
  errBox.style.display = 'none';
  document.getElementById('filename').textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const result = processRows(rows);
      CHANNELS = result.channels;
      reportMeta = result.meta;
      renderAll();
    } catch (err) {
      errBox.textContent = 'সমস্যা হয়েছে: ' + err.message;
      errBox.style.display = 'block';
      document.getElementById('dash').style.display = 'none';
    }
  };
  reader.onerror = () => {
    errBox.textContent = 'ফাইল পড়া যায়নি। আবার চেষ্টা করুন।';
    errBox.style.display = 'block';
  };
  reader.readAsArrayBuffer(file);
}

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
['dragover'].forEach(evt =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag');
  })
);
['dragleave', 'drop'].forEach(evt =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag');
  })
);
dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  currentTab = btn.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
  renderTab();
});

document.getElementById('search').addEventListener('input', (e) => {
  searchTerm = e.target.value.toLowerCase();
  renderTab();
});

function pill(ok, okText, failText, naText) {
  if (naText !== undefined && okText === null) return '<span class="pill na">' + naText + '</span>';
  const cls = ok ? 'ok' : 'bad';
  return '<span class="pill ' + cls + '"><span class="dot"></span>' + (ok ? okText : failText) + '</span>';
}

function renderAll() {
  document.getElementById('dash').style.display = 'block';
  document.getElementById('tally').classList.remove('off');

  const startFails = CHANNELS.filter(c => !c.startOk).length;
  const endFails = CHANNELS.filter(c => !c.endOk).length;
  const movieFails = CHANNELS.filter(c => !c.movieOk).length;
  const over1400 = CHANNELS.filter(c => c.duration > 1400).length;
  const programNameAzanTotal = CHANNELS.reduce((sum, c) => sum + (c.programNameAzanCount || 0), 0);

  document.getElementById('metaStrip').innerHTML =
    '<div class="meta-item">রিপোর্ট তারিখ<b>' + (reportMeta.date || '—') + '</b></div>' +
    '<div class="meta-item">মোট চ্যানেল<b>' + CHANNELS.length + '</b></div>' +
    '<div class="meta-item">মোট রো<b>' + reportMeta.totalRows + '</b></div>';

  document.getElementById('kpiRow').innerHTML = [
    ['মোট চ্যানেল', CHANNELS.length, ''],
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
  return CHANNELS.filter(c => c.name.toLowerCase().includes(searchTerm));
}

function renderTab() {
  const el = document.getElementById('tabContent');
  const list = filteredChannels();

  if (currentTab === 'overview') {
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

  if (currentTab === 'review') {
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

  if (currentTab === 'azan') {
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

  if (currentTab === 'startend') {
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

  if (currentTab === 'movie') {
    const movieList = list.filter(c => (c.movieIssueRows || []).length > 0);
    el.innerHTML = '<div class="format-hint">সঠিক ফরম্যাট: <code>Bangla Movie At HH:MM AM/PM(Movie Name)</code> - যেমন <code>Bangla Movie At 09:50 PM(Biyer Prostab)</code></div>' +
      (movieList.length ? movieList.map(c =>
        '<div class="badmovie-card"><div class="ch">' + c.name + ' - ' + c.movieIssueRows.length + ' টি Movie রেকর্ড</div>' +
        c.movieIssueRows.map(row => '<div class="badmovie-row"><span>' + row.name + '</span><span>' + (row.start || '—') + ' - ' + (row.end || '—') + ' • ' + (row.telecast || 'No Telecast') + '</span></div>').join('') +
        '</div>'
      ).join('') : '<div class="empty">কোনো Movie ফরম্যাট সমস্যা নেই।</div>');
    return;
  }

  if (currentTab === 'duration') {
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
}
