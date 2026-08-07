import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { buildValidationSummary, formatMinutes, getValueFromRow, normalizeText } from "./dashboardLogic";

const TABS = ["📋 Overview", "⏰ Start/End Time", "🎬 Movie Format", "⏱️ Duration"];

const parseUploadedData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const rows = [];

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
          sheetRows.forEach((row) => {
            if (row && Object.values(row).some((value) => normalizeText(value) !== "")) {
              rows.push(row);
            }
          });
        });

        const normalized = rows
          .map((row) => ({
            channel: getValueFromRow(row, ["channel", "channelname", "name", "station", "tvchannel"]),
            startTime: getValueFromRow(row, ["starttime", "start", "starttimevalue", "startat", "started"]),
            endTime: getValueFromRow(row, ["endtime", "end", "endtimevalue", "endat", "ended"]),
            movieName: getValueFromRow(row, ["moviename", "movie", "movietitle", "programname", "program", "title"]),
            duration: getValueFromRow(row, ["duration", "durationminutes", "minutes", "totalduration", "length", "durationmin", "durationmins"]),
          }))
          .filter((row) => row.channel);

        resolve(normalized);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsArrayBuffer(file);
  });
};

export default function App() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const parsedRows = await parseUploadedData(file);
      setRows(parsedRows);
    } catch (err) {
      setError(err.message || "Unable to parse the selected file.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validation = useMemo(() => buildValidationSummary(rows.map((row) => ({
    ...row,
    channel: row.channel,
    startTime: row.startTime,
    endTime: row.endTime,
    movieName: row.movieName,
    duration: row.duration,
  }))), [rows]);

  const channelStats = useMemo(() => validation.stats || [], [validation]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return channelStats.filter((item) => item.channel.toLowerCase().includes(query));
  }, [channelStats, search]);

  const badStartList = validation.invalidStart.map((item) => item.channel);
  const badEndList = validation.invalidEnd.map((item) => item.channel);
  const badMovieList = validation.invalidMovie.map((item) => item.channel);
  const overDuration = validation.invalidDuration.map((item) => item.channel);

  const pill = (ok, label) => (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, background: ok ? "#d1fae5" : "#fee2e2", color: ok ? "#065f46" : "#991b1b", fontWeight: 600 }}>
      {ok ? "✅" : "❌"} {label}
    </span>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", maxWidth: 900, margin: "0 auto", padding: 16, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📺 TV Program Monitoring Report</h1>
        <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 13 }}>
          Channels: <b>{validation.totalChannels}</b> &nbsp;|&nbsp; Rows: <b>{validation.totalRows}</b> &nbsp;|&nbsp; Upload a CSV/XLS/XLSX file to validate monitoring data.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ background: "rgba(255,255,255,.2)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileUpload} style={{ display: "none" }} />
            ⬆️ Upload file
          </label>
          <span style={{ fontSize: 13, opacity: 0.9 }}>{fileName || "No file selected yet"}</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          {[ ["❌ Bad Start", badStartList.length], ["❌ Bad End", badEndList.length], ["❌ Bad Movie Format", badMovieList.length], ["❌ Over Duration", overDuration.length] ].map(([label, count]) => (
            <div key={label} style={{ background: "rgba(255,255,255,.15)", borderRadius: 10, padding: "6px 14px", fontSize: 13 }}>
              {label}: <b>{count}</b>
            </div>
          ))}
        </div>
      </div>

      {error ? <div style={{ marginBottom: 12, background: "#fee2e2", color: "#991b1b", padding: "10px 12px", borderRadius: 10 }}>{error}</div> : null}
      {isLoading ? <div style={{ marginBottom: 12, color: "#1e3a5f", fontWeight: 600 }}>Reading your file...</div> : null}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === i ? "#2563eb" : "#fff", color: tab === i ? "#fff" : "#374151", boxShadow: tab === i ? "0 2px 8px #2563eb44" : "0 1px 3px #0001" }}>
            {t}
          </button>
        ))}
      </div>

      <input placeholder="🔍 Channel search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "9px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, marginBottom: 14, outline: "none" }} />

      {!rows.length && !isLoading ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, textAlign: "center", color: "#64748b" }}>
          Upload a file to start visualizing your monitoring data.
        </div>
      ) : null}

      {tab === 0 && rows.length > 0 && (
        <div>
          <h3 style={{ color: "#1e3a5f", margin: "0 0 10px" }}>All channels at a glance</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
            {filtered.map((item) => (
              <div key={item.channel} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: item.startIssues > 0 || item.endIssues > 0 || item.movieIssues > 0 || item.durationIssues > 0 ? "1.5px solid #fca5a5" : "1.5px solid #bbf7d0", boxShadow: "0 1px 4px #0001" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#1e293b" }}>{item.channel}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {pill(item.startOk, "Start")}
                  {pill(item.endOk, "End")}
                  {pill(item.movieOk, "Movie")}
                  {pill(item.durationOk, "Duration")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 1 && rows.length > 0 && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <h3 style={{ color: "#dc2626", margin: "0 0 10px" }}>❌ Start time issues ({badStartList.length})</h3>
              {filtered.filter((item) => !item.startOk).map((item) => (
                <div key={item.channel} style={{ background: "#fff", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                  <b style={{ color: "#1e293b" }}>{item.channel}</b>
                  <div style={{ color: "#dc2626", fontSize: 13, marginTop: 2 }}>Start: {item.startTime || "N/A"}</div>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ color: "#dc2626", margin: "0 0 10px" }}>❌ End time issues ({badEndList.length})</h3>
              {filtered.filter((item) => !item.endOk).map((item) => (
                <div key={item.channel} style={{ background: "#fff", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                  <b style={{ color: "#1e293b" }}>{item.channel}</b>
                  <div style={{ color: "#dc2626", fontSize: 13, marginTop: 2 }}>End: {item.endTime || "N/A"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 2 && rows.length > 0 && (
        <div>
          <h3 style={{ color: "#1e3a5f", margin: "0 0 6px" }}>🎬 Movie name format check</h3>
          {filtered.filter((item) => !item.movieOk).map((item) => (
            <div key={item.channel} style={{ background: "#fff", border: "1.5px solid #fca5a5", borderRadius: 12, padding: "12px 16px", marginBottom: 10 }}>
              <b style={{ color: "#dc2626", fontSize: 15 }}>❌ {item.channel}</b>
              <div style={{ background: "#fef2f2", borderRadius: 8, padding: "6px 10px", marginTop: 8, fontSize: 13, color: "#7f1d1d", fontFamily: "monospace" }}>
                {item.movieName || "N/A"}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 3 && rows.length > 0 && (
        <div>
          <h3 style={{ color: "#1e3a5f", margin: "0 0 6px" }}>⏱️ Duration summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.sort((a, b) => b.duration - a.duration).map((item) => {
              const pct = Math.min((item.duration / 1440) * 100, 100);
              const over = item.duration > 1440;
              return (
                <div key={item.channel} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: `1.5px solid ${over ? "#fca5a5" : "#e2e8f0"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: over ? "#dc2626" : "#1e293b" }}>{over ? "❌ " : ""}{item.channel}</span>
                    <span style={{ fontSize: 13, color: over ? "#dc2626" : "#374151", fontWeight: over ? 700 : 400 }}>{formatMinutes(item.duration)}</span>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 6, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: over ? "#ef4444" : item.duration > 1380 ? "#f59e0b" : "#22c55e" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
