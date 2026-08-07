import { useState } from "react";

const CHANNELS = ["ATN Bangla","ATN News","Ananda TV","Asian TV","BTV","BTV Chattrogram","BTV News","BTV Sangsad","Bangla TV","Bangla Vision","Bijoy TV","Boishakhi TV","Channel 1","Channel 24","Channel 9","Channel I","Channel S","DBC News","Deepto TV","Desh TV","Duronto TV","ETV","Ekattor TV","Ekhon TV","GTV","Global TV","Green TV","Independent TV","Jamuna TV","Maasranga TV","Mohona TV","My TV","NEWS 24","NTV","Nagorik TV","Nexus TV","RTV","SA TV","Somoy TV","Star News","T Sports"];

const BAD_START = {"Ananda TV":"00:04:38","BTV":"00:00:19","BTV Chattrogram":"00:16:10","Bijoy TV":"00:03:23","Boishakhi TV":"00:00:09","Channel S":"00:00:38","Ekhon TV":"00:01:00","Global TV":"00:02:19","Green TV":"00:00:04","Jamuna TV":"00:00:15","Maasranga TV":"00:00:15","NEWS 24":"00:00:06"};
const BAD_END = {"Ananda TV":"23:59:10","BTV Chattrogram":"23:53:26","Bangla TV":"23:59:56","Boishakhi TV":"23:54:57","Desh TV":"23:49:35","ETV":"23:55:40","GTV":"23:59:03","Global TV":"23:55:20","Green TV":"23:59:43","Independent TV":"23:55:36","Jamuna TV":"23:54:52","Nexus TV":"23:59:28","Star News":"23:59:58"};

const BAD_MOVIE = {
  "Ananda TV": ["Bangla Movie At 09:50PM(Mone Rekho Amay)"],
  "BTV Sangsad": ["Bangla Movie At 3:00 PM(Shoth Manush)"],
  "Bangla TV": ["Bangla Movie At 02:30 AM (Dobir Shaheb Er Shongshar)"],
  "Bangla Vision": ["Bangla Movie At 10:35AM(Tumi Amar Prem)"],
  "Mohona TV": ["Bangla Movie at 1:30 AM(Mackup)"],
  "My TV": ["Bangla Movie At 01:30PM(Lipstick)"],
  "SA TV": ["Bangla Movie At 10:27 AM (Mittu Datha)"],
};

const DURATIONS = {
  "ATN Bangla":1379.48,"ATN News":1277.46,"Ananda TV":1404.02,"Asian TV":1308.26,"BTV":1285.33,
  "BTV Chattrogram":1209.51,"BTV News":942.55,"BTV Sangsad":1429.68,"Bangla TV":1407.78,
  "Bangla Vision":1369.36,"Bijoy TV":1321.84,"Boishakhi TV":1202.21,"Channel 1":1409.03,
  "Channel 24":1312.58,"Channel 9":1392.87,"Channel I":1422.81,"Channel S":1236.04,
  "DBC News":1198.81,"Deepto TV":1553.68,"Desh TV":1192.94,"Duronto TV":1432.61,
  "ETV":1365.44,"Ekattor TV":1364.33,"Ekhon TV":1413.47,"GTV":1286.93,"Global TV":1375.42,
  "Green TV":1207.54,"Independent TV":1340.60,"Jamuna TV":1248.39,"Maasranga TV":1383.86,
  "Mohona TV":1430.94,"My TV":1393.13,"NEWS 24":1385.03,"NTV":1434.54,"Nagorik TV":1402.91,
  "Nexus TV":1409.45,"RTV":1309.93,"SA TV":1436.86,"Somoy TV":1328.32,"Star News":1408.43,
  "T Sports":1375.97
};

const TABS = ["📋 Overview","⏰ Start/End Time","🎬 Movie Format","⏱️ Duration"];

export default function App() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = CHANNELS.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  const badStartList = Object.keys(BAD_START);
  const badEndList = Object.keys(BAD_END);
  const badMovieList = Object.keys(BAD_MOVIE);
  const overDuration = Object.entries(DURATIONS).filter(([,v]) => v > 1440).map(([k]) => k);

  const hasIssue = (ch) =>
    badStartList.includes(ch) || badEndList.includes(ch) ||
    badMovieList.includes(ch) || DURATIONS[ch] > 1440;

  const pill = (ok, label) => (
    <span style={{
      display:"inline-block", padding:"2px 10px", borderRadius:12, fontSize:12,
      background: ok ? "#d1fae5" : "#fee2e2",
      color: ok ? "#065f46" : "#991b1b", fontWeight:600
    }}>{ok ? "✅" : "❌"} {label}</span>
  );

  return (
    <div style={{fontFamily:"'Segoe UI',sans-serif",maxWidth:900,margin:"0 auto",padding:16,background:"#f8fafc",minHeight:"100vh"}}>
      <div style={{background:"linear-gradient(135deg,#1e3a5f,#2563eb)",borderRadius:16,padding:"20px 24px",marginBottom:20,color:"#fff"}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700}}>📺 TV Program Monitoring Report</h1>
        <p style={{margin:"4px 0 0",opacity:.8,fontSize:13}}>Date: 2026-07-30 &nbsp;|&nbsp; Total Channels: <b>41</b> &nbsp;|&nbsp; Total Rows: <b>1877</b></p>
        <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
          {[["❌ Bad Start",badStartList.length],["❌ Bad End",badEndList.length],["❌ Bad Movie Format",badMovieList.length],["❌ Over Duration",overDuration.length]].map(([label,count])=>(
            <div key={label} style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"6px 14px",fontSize:13}}>
              {label}: <b>{count}</b>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
            background: tab===i ? "#2563eb" : "#fff",
            color: tab===i ? "#fff" : "#374151",
            boxShadow: tab===i ? "0 2px 8px #2563eb44" : "0 1px 3px #0001"
          }}>{t}</button>
        ))}
      </div>

      {/* Search */}
      <input
        placeholder="🔍 Channel খুঁজুন..."
        value={search} onChange={e=>setSearch(e.target.value)}
        style={{width:"100%",boxSizing:"border-box",padding:"9px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,marginBottom:14,outline:"none"}}
      />

      {/* TAB 0: Overview */}
      {tab===0 && (
        <div>
          <h3 style={{color:"#1e3a5f",margin:"0 0 10px"}}>সব Channel এর Status একনজরে</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {filtered.map(ch=>(
              <div key={ch} style={{
                background:"#fff",borderRadius:12,padding:"12px 14px",
                border: hasIssue(ch) ? "1.5px solid #fca5a5" : "1.5px solid #bbf7d0",
                boxShadow:"0 1px 4px #0001"
              }}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:6,color:"#1e293b"}}>{ch}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {pill(!badStartList.includes(ch),"Start")}
                  {pill(!badEndList.includes(ch),"End")}
                  {pill(!badMovieList.includes(ch),"Movie")}
                  {pill(DURATIONS[ch]<=1440,"Duration")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: Start/End */}
      {tab===1 && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <h3 style={{color:"#dc2626",margin:"0 0 10px"}}>❌ Start Time সমস্যা ({badStartList.length} টি)</h3>
              <p style={{fontSize:12,color:"#64748b",margin:"0 0 10px"}}>প্রত্যাশিত: <b>00:00:01</b></p>
              {filtered.filter(c=>badStartList.includes(c)).map(ch=>(
                <div key={ch} style={{background:"#fff",border:"1.5px solid #fca5a5",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                  <b style={{color:"#1e293b"}}>{ch}</b>
                  <div style={{color:"#dc2626",fontSize:13,marginTop:2}}>শুরু: {BAD_START[ch]}</div>
                </div>
              ))}
              {filtered.filter(c=>!badStartList.includes(c)).length > 0 && (
                <div style={{background:"#d1fae5",borderRadius:10,padding:"10px 14px",marginTop:10,fontSize:13,color:"#065f46"}}>
                  ✅ {filtered.filter(c=>!badStartList.includes(c)).length} টি Channel ঠিক আছে
                </div>
              )}
            </div>
            <div>
              <h3 style={{color:"#dc2626",margin:"0 0 10px"}}>❌ End Time সমস্যা ({badEndList.length} টি)</h3>
              <p style={{fontSize:12,color:"#64748b",margin:"0 0 10px"}}>প্রত্যাশিত: <b>23:59:59</b></p>
              {filtered.filter(c=>badEndList.includes(c)).map(ch=>(
                <div key={ch} style={{background:"#fff",border:"1.5px solid #fca5a5",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                  <b style={{color:"#1e293b"}}>{ch}</b>
                  <div style={{color:"#dc2626",fontSize:13,marginTop:2}}>শেষ: {BAD_END[ch]}</div>
                </div>
              ))}
              {filtered.filter(c=>!badEndList.includes(c)).length > 0 && (
                <div style={{background:"#d1fae5",borderRadius:10,padding:"10px 14px",marginTop:10,fontSize:13,color:"#065f46"}}>
                  ✅ {filtered.filter(c=>!badEndList.includes(c)).length} টি Channel ঠিক আছে
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Movie Format */}
      {tab===2 && (
        <div>
          <h3 style={{color:"#1e3a5f",margin:"0 0 6px"}}>🎬 Movie Name Format Check</h3>
          <div style={{background:"#eff6ff",border:"1.5px solid #bfdbfe",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:14,color:"#1e40af"}}>
            ✅ সঠিক Format: <b>Bangla Movie At HH:MM PM/AM(Movie Name)</b><br/>
            যেমন: <code>Bangla Movie At 09:50 PM(DeadBody)</code>
          </div>
          <div style={{marginBottom:12,background:"#d1fae5",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#065f46"}}>
            ✅ সঠিক আছে: {CHANNELS.filter(c=>!badMovieList.includes(c)).length} টি Channel (Movie আছে এমন)
          </div>
          {filtered.filter(c=>badMovieList.includes(c)).map(ch=>(
            <div key={ch} style={{background:"#fff",border:"1.5px solid #fca5a5",borderRadius:12,padding:"12px 16px",marginBottom:10}}>
              <b style={{color:"#dc2626",fontSize:15}}>❌ {ch}</b>
              {BAD_MOVIE[ch].map((name,i)=>(
                <div key={i} style={{background:"#fef2f2",borderRadius:8,padding:"6px 10px",marginTop:8,fontSize:13,color:"#7f1d1d",fontFamily:"monospace"}}>
                  {name}
                </div>
              ))}
            </div>
          ))}
          {filtered.filter(c=>badMovieList.includes(c)).length===0 && (
            <div style={{textAlign:"center",color:"#64748b",padding:20}}>কোনো সমস্যা নেই বা search-এ নেই।</div>
          )}
        </div>
      )}

      {/* TAB 3: Duration */}
      {tab===3 && (
        <div>
          <h3 style={{color:"#1e3a5f",margin:"0 0 6px"}}>⏱️ Duration Summary (Limit: 1440 min)</h3>
          <div style={{background:"#fee2e2",border:"1.5px solid #fca5a5",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:14,color:"#991b1b"}}>
            ❌ <b>Deepto TV</b> একমাত্র Channel যেটি 1440 min ছাড়িয়েছে → <b>1553.68 min</b>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {filtered.sort((a,b)=>DURATIONS[b]-DURATIONS[a]).map(ch=>{
              const dur = DURATIONS[ch];
              const pct = Math.min((dur/1440)*100,100);
              const over = dur > 1440;
              return (
                <div key={ch} style={{background:"#fff",borderRadius:10,padding:"10px 14px",border:`1.5px solid ${over?"#fca5a5":"#e2e8f0"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontWeight:600,fontSize:13,color:over?"#dc2626":"#1e293b"}}>{over?"❌ ":""}{ch}</span>
                    <span style={{fontSize:13,color:over?"#dc2626":"#374151",fontWeight:over?700:400}}>{dur} min</span>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:6,height:8,overflow:"hidden"}}>
                    <div style={{
                      width:`${pct}%`,height:"100%",borderRadius:6,
                      background: over ? "#ef4444" : dur > 1380 ? "#f59e0b" : "#22c55e"
                    }}/>
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
