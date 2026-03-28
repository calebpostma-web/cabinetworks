import { useState, useRef } from "react";

/* ─── DESIGN TOKENS ────────────────────────────────────────────────────────── */
const T = {
  // Backgrounds
  bg:        "#FAF7F2",   // page warm cream
  surface:   "#F4EFE7",   // card surface
  surfaceAlt:"#EDE5D8",   // slightly deeper panel
  sidebar:   "#2C1F0E",   // dark walnut sidebar
  sidebarAlt:"#3A2A14",   // lighter walnut hover

  // Borders
  border:    "#D4C4A8",
  borderDark:"#B8A48A",

  // Text
  ink:       "#1E1208",   // near-black warm
  text:      "#3A2A14",   // body
  muted:     "#7A6048",   // secondary text
  faint:     "#A89070",   // placeholder / labels

  // Accent
  oak:       "#8B5E3C",   // wood brown
  amber:     "#C17A3A",   // call to action
  amberHov:  "#A86828",
  amberLight:"#FDF3E3",   // amber bg tint
  green:     "#4A7240",   // success / met
  greenLight:"#EBF5E8",
  red:       "#8B3A2A",   // warning
  redLight:  "#FDEEED",

  // Canvas
  wallBg:    "#E8DECE",
  canvasBg:  "#EDE5D8",
};

/* ─── CONSTANTS ─────────────────────────────────────────────────────────────── */
const MODEL   = "claude-sonnet-4-20250514";
const ES      = 4.5;
const TOEKICK = 4.5;
const UPPER_BTM = 54;
const WALLS   = ["South","North","East","West"];

const DEFS = {
  base:   { label:"Base Cabinet",   icon:"▭", w:36, h:34.5, d:24, row:"lower" },
  upper:  { label:"Wall Cabinet",   icon:"▭", w:36, h:30,   d:12, row:"upper" },
  tall:   { label:"Tall / Pantry",  icon:"▯", w:24, h:84,   d:24, row:"lower" },
  island: { label:"Island",         icon:"⬜", w:48, h:34.5, d:36, row:"island" },
  vanity: { label:"Vanity",         icon:"▭", w:36, h:32,   d:21, row:"lower" },
};

const MATS = {
  thermofoil:  { label:"Thermofoil",   rate:16 },
  painted_mdf: { label:"Painted MDF",  rate:22 },
  maple:       { label:"Maple",        rate:40 },
  cherry:      { label:"Cherry",       rate:56 },
  walnut:      { label:"Walnut",       rate:70 },
};

const BASE_P    = { base:175, upper:140, tall:310, island:395, vanity:190 };
const DOOR_STYLES = ["Shaker","Flat Panel","Raised Panel","Beadboard","Glass Insert","Open Shelf"];

let _uid = 1;
const uid   = () => `c${_uid++}`;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const getPrice = c => Math.round(BASE_P[c.type] + (c.w * c.h / 144) * (MATS[c.material]?.rate ?? 40));

const makeCab = (type, wall, all) => {
  const def = DEFS[type];
  const row = all.filter(c => c.wall === wall && DEFS[c.type]?.row === def.row);
  const nx  = row.length ? Math.max(...row.map(c => c.x + c.w)) + 3 : 3;
  return { id:uid(), type, w:def.w, h:def.h, d:def.d, x:nx,
    wall: type === "island" ? "Island" : wall,
    material:"maple", doorStyle:"Shaker", finish:"Natural", notes:"" };
};

/* ─── GLOBAL STYLES ─────────────────────────────────────────────────────────── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: ${T.bg}; color: ${T.text}; font-size: 15px; }
    input, select, textarea { font-family: 'DM Sans', sans-serif; font-size: 14px; }
    button { font-family: 'DM Sans', sans-serif; cursor: pointer; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${T.surface}; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-up { animation: fadeUp 0.3s ease forwards; }
  `}</style>
);

/* ─── SHARED UI COMPONENTS ──────────────────────────────────────────────────── */
const Card = ({ children, style }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:24, ...style }}>
    {children}
  </div>
);

const Label = ({ children, style }) => (
  <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:T.muted, marginBottom:6, ...style }}>
    {children}
  </div>
);

const Input = ({ style, ...props }) => (
  <input style={{ background:"#fff", border:`1.5px solid ${T.border}`, borderRadius:6, padding:"8px 12px",
    fontSize:14, color:T.ink, outline:"none", width:"100%", ...style }}
    onFocus={e=>e.target.style.borderColor=T.amber}
    onBlur={e=>e.target.style.borderColor=T.border}
    {...props}/>
);

const Select = ({ style, children, ...props }) => (
  <select style={{ background:"#fff", border:`1.5px solid ${T.border}`, borderRadius:6, padding:"8px 12px",
    fontSize:14, color:T.ink, outline:"none", width:"100%", ...style }}
    onFocus={e=>e.target.style.borderColor=T.amber}
    onBlur={e=>e.target.style.borderColor=T.border}
    {...props}>{children}</select>
);

const Btn = ({ children, variant="primary", style, ...props }) => {
  const base = { padding:"10px 20px", borderRadius:7, fontSize:14, fontWeight:600,
    border:"none", display:"inline-flex", alignItems:"center", gap:8, transition:"all 0.15s", ...style };
  const variants = {
    primary:  { background:T.amber, color:"#fff" },
    outline:  { background:"transparent", border:`1.5px solid ${T.borderDark}`, color:T.text },
    ghost:    { background:"transparent", color:T.muted },
    danger:   { background:T.redLight, color:T.red, border:`1px solid #e0c0bb` },
  };
  return (
    <button style={{ ...base, ...variants[variant] }}
      onMouseEnter={e=>{e.currentTarget.style.opacity="0.85"; e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="translateY(0)";}}
      {...props}>{children}</button>
  );
};

const Badge = ({ children, color="amber" }) => {
  const colors = {
    amber: { bg:T.amberLight, text:T.amber, border:"#F0D0A0" },
    green: { bg:T.greenLight, text:T.green, border:"#C0DDB8" },
    red:   { bg:T.redLight,   text:T.red,   border:"#E0C0BB" },
  };
  const c = colors[color] || colors.amber;
  return <span style={{ fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:99,
    background:c.bg, color:c.text, border:`1px solid ${c.border}`, letterSpacing:"0.06em" }}>
    {children}
  </span>;
};

/* ─── API ─────────────────────────────────────────────────────────────────── */
async function callClaude(messages, max_tokens=1800) {
  const r = await fetch("/ai-proxy", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:MODEL, max_tokens, messages }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content.filter(b=>b.type==="text").map(b=>b.text).join("");
}
const parseJSON = txt => JSON.parse(txt.replace(/```json\n?|```\n?/g,"").trim());

/* ─── DROPZONE ────────────────────────────────────────────────────────────── */
function Dropzone({ label, onFile, preview }) {
  const [drag, setDrag] = useState(false);
  const inp = useRef();
  const handle = f => {
    if (!f) return;
    const r = new FileReader();
    r.onload = e => onFile({ base64:e.target.result.split(",")[1], mimeType:f.type||"image/jpeg", dataUrl:e.target.result });
    r.readAsDataURL(f);
  };
  return (
    <div onClick={()=>inp.current.click()}
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}
      style={{ border:`2px dashed ${drag?T.amber:T.border}`, borderRadius:10, background:drag?T.amberLight:"#fff",
        cursor:"pointer", overflow:"hidden", transition:"all 0.15s", minHeight:preview?0:120 }}>
      <input ref={inp} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
      {preview
        ? <div style={{position:"relative"}}>
            <img src={preview} alt="" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block"}}/>
            <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(44,31,14,0.75)",
              padding:"5px 10px",fontSize:12,color:"#FAF7F2",textAlign:"center"}}>Click to replace</div>
          </div>
        : <div style={{textAlign:"center",padding:"28px 20px",color:T.faint}}>
            <div style={{fontSize:28,marginBottom:8}}>📷</div>
            <div style={{fontSize:14,fontWeight:500,color:T.muted,marginBottom:4}}>{label}</div>
            <div style={{fontSize:12,color:T.faint}}>Click or drag & drop · JPG or PNG</div>
          </div>
      }
    </div>
  );
}

/* ─── STEP 1 — ROOM SETUP ─────────────────────────────────────────────────── */
function RoomSetupView({ room, setRoom, onNext }) {
  const [photo, setPhoto]       = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState(null);

  const analyze = async () => {
    if (!blueprint) return;
    setLoading(true); setErr(null);
    try {
      const txt = await callClaude([{role:"user", content:[
        {type:"image", source:{type:"base64", media_type:blueprint.mimeType, data:blueprint.base64}},
        {type:"text", text:`Analyze this image and extract room dimensions for a kitchen design tool.

Return ONLY valid JSON with no markdown:
{"width":<inches>,"depth":<inches>,"height":<inches, default 96>,"confidence":"high|medium|low","notes":"<one sentence>","features":["<e.g. window south wall>"],"suggestedLayout":"Galley|L-Shape|U-Shape|G-Shape|Island Kitchen","existingObstacles":["<obstacle>"]}

Rules: convert feet to inches (×12). Typical kitchens 96–192" wide, 96–168" deep. Use 96 for ceiling if unseen.`}
      ]}]);
      const p = parseJSON(txt);
      setAnalysis(p);
      if (p.width)  setRoom(r=>({...r,width:clamp(p.width,60,600)}));
      if (p.depth)  setRoom(r=>({...r,depth:clamp(p.depth,60,600)}));
      if (p.height) setRoom(r=>({...r,height:clamp(p.height,84,144)}));
    } catch(e) { setErr("Couldn't read this image. Enter dimensions manually below."); }
    setLoading(false);
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:900}}>
      <div className="fade-up">
        <h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:6}}>
          Set up your room
        </h1>
        <p style={{fontSize:15,color:T.muted,marginBottom:32}}>
          Upload a photo of the existing space and a blueprint or floor plan. The AI will read the dimensions automatically.
        </p>

        {/* Upload grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
          <div>
            <Label>Existing space photo <span style={{color:T.faint,fontWeight:400,textTransform:"none"}}>(optional)</span></Label>
            <Dropzone label="Upload room photo" onFile={setPhoto} preview={photo?.dataUrl}/>
            <p style={{fontSize:12,color:T.faint,marginTop:6}}>Helps AI understand windows, obstacles, and existing layout</p>
          </div>
          <div>
            <Label>Blueprint or floor plan <span style={{color:T.amber}}>★ recommended</span></Label>
            <Dropzone label="Upload blueprint or floor plan" onFile={f=>{setBlueprint(f);setAnalysis(null);}} preview={blueprint?.dataUrl}/>
            <p style={{fontSize:12,color:T.faint,marginTop:6}}>AI reads width, depth, and ceiling height automatically</p>
          </div>
        </div>

        {/* Analyze button */}
        {blueprint && !analysis && (
          <Btn onClick={analyze} disabled={loading} style={{marginBottom:24}}>
            {loading
              ? <><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span> Analyzing with AI…</>
              : <><span>⚡</span> Read dimensions from blueprint</>
            }
          </Btn>
        )}

        {err && <div style={{background:T.redLight,border:`1px solid #e0b8b3`,borderRadius:8,
          padding:"12px 16px",color:T.red,fontSize:14,marginBottom:20}}>{err}</div>}

        {/* Analysis results */}
        {analysis && (
          <Card style={{marginBottom:24,borderColor:T.amber}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:15,fontWeight:600,color:T.green}}>✓ Blueprint analyzed</span>
              <Badge color={analysis.confidence==="high"?"green":analysis.confidence==="medium"?"amber":"red"}>
                {(analysis.confidence||"low").toUpperCase()} CONFIDENCE
              </Badge>
            </div>
            {analysis.notes && <p style={{color:T.muted,fontSize:14,marginBottom:12,fontStyle:"italic"}}>"{analysis.notes}"</p>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {analysis.features?.length>0 && (
                <div>
                  <Label>Detected features</Label>
                  {analysis.features.map((f,i)=>(
                    <div key={i} style={{fontSize:13,color:T.text,marginBottom:4}}>→ {f}</div>
                  ))}
                </div>
              )}
              {analysis.existingObstacles?.length>0 && (
                <div>
                  <Label>Obstacles / notes</Label>
                  {analysis.existingObstacles.map((o,i)=>(
                    <div key={i} style={{fontSize:13,color:T.red,marginBottom:4}}>⚠ {o}</div>
                  ))}
                </div>
              )}
            </div>
            {analysis.suggestedLayout && (
              <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`,fontSize:14,color:T.muted}}>
                AI suggests layout: <strong style={{color:T.oak}}>{analysis.suggestedLayout}</strong>
              </div>
            )}
          </Card>
        )}

        {/* Dimensions */}
        <Card>
          <h3 style={{fontSize:16,fontWeight:600,color:T.ink,marginBottom:16}}>
            {analysis ? "Verify extracted dimensions" : "Enter room dimensions"}
          </h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {[["Room width","width","Measured wall to wall"],["Room depth","depth","Front to back"],["Ceiling height","height","Floor to ceiling"]].map(([l,k,hint])=>(
              <div key={k}>
                <Label>{l}</Label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <Input type="number" value={room[k]} style={{width:90}}
                    onChange={e=>setRoom(r=>({...r,[k]:parseInt(e.target.value)||96}))}/>
                  <span style={{fontSize:14,color:T.muted}}>inches</span>
                  <span style={{fontSize:13,color:T.faint}}>({(room[k]/12).toFixed(1)}')</span>
                </div>
                <p style={{fontSize:12,color:T.faint,marginTop:4}}>{hint}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Room preview */}
        <div style={{marginTop:24,marginBottom:28}}>
          <Label style={{marginBottom:12}}>Room footprint preview</Label>
          <RoomFootprint room={room}/>
        </div>

        <Btn onClick={onNext} style={{fontSize:15,padding:"12px 28px"}}>
          Next: Get AI layout recommendations →
        </Btn>
      </div>
    </div>
  );
}

function RoomFootprint({ room }) {
  const sc = Math.min(320/room.width, 200/room.depth);
  const W = room.width*sc, D = room.depth*sc, P = 32;
  return (
    <svg width={W+P*2} height={D+P*2} style={{display:"block",borderRadius:8,background:T.wallBg}}>
      {/* Grid lines every foot */}
      {Array.from({length:Math.floor(room.width/12)+1},(_,i)=>(
        <line key={`v${i}`} x1={P+i*12*sc} y1={P} x2={P+i*12*sc} y2={P+D} stroke={T.border} strokeWidth={0.8}/>
      ))}
      {Array.from({length:Math.floor(room.depth/12)+1},(_,i)=>(
        <line key={`h${i}`} x1={P} y1={P+i*12*sc} x2={P+W} y2={P+i*12*sc} stroke={T.border} strokeWidth={0.8}/>
      ))}
      <rect x={P} y={P} width={W} height={D} fill="none" stroke={T.oak} strokeWidth={2} rx={2}/>
      <text x={P+W/2} y={P+D+22} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans">{room.width}" wide ({(room.width/12).toFixed(1)}')</text>
      <text x={P-10} y={P+D/2+4} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans"
        transform={`rotate(-90 ${P-10} ${P+D/2})`}>{room.depth}" deep</text>
      <text x={P+W/2} y={P+D/2+5} textAnchor="middle" fill={T.faint} fontSize={13} fontFamily="DM Sans">
        {((room.width/12)*(room.depth/12)).toFixed(0)} sq ft
      </text>
    </svg>
  );
}

/* ─── STEP 2 — AI RECOMMENDATIONS ─────────────────────────────────────────── */
function RecommendationsView({ room, onApply, onSkip }) {
  const [recs, setRecs]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  const generate = async () => {
    setLoading(true); setErr(null);
    try {
      const sqft = ((room.width/12)*(room.depth/12)).toFixed(1);
      const txt = await callClaude([{role:"user", content:
        `You are an NKBA-certified kitchen designer. Generate a professional cabinet layout recommendation.

Space: ${room.width}" wide × ${room.depth}" deep × ${room.height}" ceiling (${sqft} sq ft)

Return ONLY valid JSON — no markdown, no preamble:
{"layout":"L-Shape","explanation":"2-3 sentences why this suits the space.","workTriangle":{"sink":60,"range":48,"fridge":72,"total":180,"valid":true,"note":"One sentence about the work triangle."},"bestPractices":[{"rule":"Primary aisle clearance","description":"42\\" min between facing surfaces; 48\\" for 2-cook kitchen","recommended":"48\\"","met":true},{"rule":"Counter height","description":"36\\" floor to countertop","recommended":"36\\"","met":true},{"rule":"Upper cabinet elevation","description":"18\\" min between countertop and upper cab bottom","recommended":"18\\"","met":true},{"rule":"Work triangle perimeter","description":"144\\"–312\\" total (12–26')","recommended":"180\\"","met":true},{"rule":"Sink landing space","description":"24\\" one side, 18\\" other","recommended":"24\\" / 18\\"","met":true},{"rule":"Range landing space","description":"12\\" one side, 15\\" other","recommended":"15\\" / 12\\"","met":true},{"rule":"Island clearance","description":"42\\" min on all sides; 48\\" preferred","recommended":"48\\"","met":true}],"cabinets":[{"type":"base","wall":"South","w":36,"h":34.5,"d":24,"material":"maple","doorStyle":"Shaker","finish":"Natural","notes":"Sink base","x":6}],"tips":["Tip 1.","Tip 2.","Tip 3."],"warnings":[]}

Generate 10–16 cabinets for a ${sqft} sq ft kitchen. Mix base, upper/wall, and at least one tall pantry. Add island ONLY if room ≥120" wide AND ≥144" deep. Spread across walls logically.`
      }], 2500);
      setRecs(parseJSON(txt));
    } catch(e) { setErr("Could not generate recommendations — please try again."); }
    setLoading(false);
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:900}}>
      <div className="fade-up">
        <h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:6}}>
          AI layout recommendations
        </h1>
        <p style={{fontSize:15,color:T.muted,marginBottom:28}}>
          Based on your {(room.width/12).toFixed(1)}' × {(room.depth/12).toFixed(1)}' space and NKBA best practices.
        </p>

        {!recs && (
          <div>
            <Btn onClick={generate} disabled={loading} style={{marginBottom:16}}>
              {loading
                ? <><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span> Generating layout…</>
                : "⚡ Generate AI recommendations"
              }
            </Btn>
            {!loading && (
              <div style={{marginTop:8}}>
                <Btn variant="ghost" onClick={onSkip} style={{fontSize:14,color:T.muted}}>
                  Skip and design manually →
                </Btn>
              </div>
            )}
          </div>
        )}

        {err && <div style={{background:T.redLight,border:`1px solid #e0b8b3`,borderRadius:8,
          padding:"12px 16px",color:T.red,fontSize:14,marginBottom:20}}>{err}</div>}

        {recs && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>

            {/* Layout + Triangle */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <Card>
                <Label>Recommended layout</Label>
                <div style={{fontSize:26,fontWeight:600,fontFamily:"'Lora',serif",color:T.oak,marginBottom:10}}>{recs.layout}</div>
                <p style={{fontSize:14,color:T.muted,lineHeight:1.7}}>{recs.explanation}</p>
              </Card>
              <Card>
                <Label>Work triangle</Label>
                <div style={{display:"flex",gap:20,marginBottom:12}}>
                  {[["Sink→Range",recs.workTriangle?.sink],["Range→Fridge",recs.workTriangle?.range],["Fridge→Sink",recs.workTriangle?.fridge]].map(([l,v])=>(
                    <div key={l}>
                      <div style={{fontSize:11,color:T.faint,marginBottom:2}}>{l}</div>
                      <div style={{fontSize:18,fontWeight:600,color:T.ink}}>{v}"</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <Badge color={recs.workTriangle?.valid?"green":"red"}>
                    {recs.workTriangle?.total}" total
                  </Badge>
                  <span style={{fontSize:12,color:T.faint}}>NKBA target: 144"–312"</span>
                </div>
                <p style={{fontSize:13,color:T.muted}}>{recs.workTriangle?.note}</p>
              </Card>
            </div>

            {/* NKBA Checklist */}
            <Card>
              <Label style={{marginBottom:16}}>NKBA compliance checklist</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {recs.bestPractices?.map((bp,i)=>(
                  <div key={i} style={{display:"flex",gap:12,padding:"12px 14px",
                    background:bp.met?T.greenLight:T.redLight,
                    border:`1px solid ${bp.met?"#C0DDB8":"#e0b8b3"}`,borderRadius:8}}>
                    <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{bp.met?"✓":"⚠"}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:bp.met?T.green:T.red,marginBottom:3}}>{bp.rule}</div>
                      <div style={{fontSize:13,color:T.muted,lineHeight:1.5}}>{bp.description}</div>
                      <div style={{fontSize:12,color:bp.met?T.green:T.red,marginTop:4,fontWeight:500}}>Recommended: {bp.recommended}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Cabinet plan preview */}
            <Card>
              <Label style={{marginBottom:12}}>Suggested cabinet plan — {recs.cabinets?.length} units</Label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                {recs.cabinets?.map((c,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7}}>
                    <div style={{fontSize:12,color:T.amber,fontWeight:600,marginBottom:3}}>{DEFS[c.type]?.label} — {c.wall}</div>
                    <div style={{fontSize:15,fontWeight:600,color:T.ink}}>{c.w}" × {c.h}" × {c.d}"</div>
                    {c.notes && <div style={{fontSize:12,color:T.muted,marginTop:3}}>{c.notes}</div>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Tips */}
            {recs.tips?.length>0 && (
              <Card>
                <Label style={{marginBottom:12}}>Design tips for this space</Label>
                {recs.tips.map((tip,i)=>(
                  <div key={i} style={{display:"flex",gap:12,marginBottom:10}}>
                    <span style={{color:T.amber,fontWeight:700,flexShrink:0}}>→</span>
                    <span style={{fontSize:14,color:T.text,lineHeight:1.65}}>{tip}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* Warnings */}
            {recs.warnings?.length>0 && (
              <Card style={{borderColor:"#e0b8b3",background:T.redLight}}>
                {recs.warnings.map((w,i)=>(
                  <div key={i} style={{fontSize:14,color:T.red,marginBottom:4}}>⚠ {w}</div>
                ))}
              </Card>
            )}

            <div style={{display:"flex",gap:12,flexWrap:"wrap",paddingBottom:16}}>
              <Btn onClick={()=>{onApply(recs.cabinets||[]);}} style={{fontSize:15,padding:"12px 28px"}}>
                Apply to design canvas →
              </Btn>
              <Btn variant="outline" onClick={()=>setRecs(null)}>Regenerate</Btn>
              <Btn variant="ghost" onClick={onSkip}>Skip — design manually</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ELEVATION CANVAS ────────────────────────────────────────────────────── */
function ElevationCanvas({ cabs, wall, wallW, wallH, sel, onSel, onMove }) {
  const drag = useRef(null);
  const PL=60, PR=30, PT=40, PB=60;
  const SW=PL+wallW*ES+PR, SH=PT+wallH*ES+PB, FY=PT+wallH*ES;

  const getCabY = c => DEFS[c.type].row==="upper"
    ? FY-(UPPER_BTM+c.h)*ES : FY-c.h*ES;

  const onPD = (e,id) => {
    e.stopPropagation(); onSel(id);
    const c=cabs.find(x=>x.id===id);
    if (c) drag.current={id,mx0:e.clientX,cx0:c.x};
  };
  const onPM = e => {
    if (!drag.current) return;
    const c=cabs.find(x=>x.id===drag.current.id); if(!c) return;
    const nx=Math.max(0,Math.min(wallW-c.w,drag.current.cx0+(e.clientX-drag.current.mx0)/ES));
    onMove(drag.current.id,nx);
  };
  const onPU = ()=>{drag.current=null;};
  const wallCabs = cabs.filter(c=>c.wall===wall);

  // Cabinet wood colors
  const bodyFill  = "#C19A6B";
  const doorFill  = "#D4AF82";
  const doorEdge  = "#A8825A";
  const shakerIn  = "#C8A474";
  const tkFill    = "#5C3D1E";
  const ctFill    = "#8B6340";
  const handle    = "#8B7355";

  return (
    <svg width={SW} height={SH}
      style={{display:"block",background:T.canvasBg,userSelect:"none",minWidth:SW,borderRadius:8}}
      onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU}
      onClick={()=>onSel(null)}>

      {/* Wall surface */}
      <rect x={PL} y={PT} width={wallW*ES} height={wallH*ES} fill="#E8E0D5" stroke={T.borderDark} strokeWidth={1}/>

      {/* Subtle grid */}
      {Array.from({length:Math.floor(wallW/12)+1},(_,i)=>(
        <line key={`v${i}`} x1={PL+i*12*ES} y1={PT} x2={PL+i*12*ES} y2={FY} stroke="#D4C8B8" strokeWidth={0.5}/>
      ))}

      {/* Upper zone */}
      <rect x={PL} y={PT} width={wallW*ES} height={(wallH-UPPER_BTM)*ES}
        fill="rgba(193,122,58,0.04)" stroke="#D4C0A0" strokeWidth={0.8} strokeDasharray="6,5"/>
      <text x={PL+6} y={PT+(wallH-UPPER_BTM)*ES-7} fill="#C4A870" fontSize={10} fontFamily="DM Sans">Upper zone</text>

      {/* Countertops */}
      {wallCabs.filter(c=>DEFS[c.type]?.row==="lower").map(c=>(
        <rect key={`ct${c.id}`}
          x={PL+c.x*ES-1} y={FY-c.h*ES-2.5*ES}
          width={c.w*ES+2} height={2.5*ES}
          fill={ctFill} rx={1}/>
      ))}

      {/* Cabinets */}
      {wallCabs.map(c=>{
        const isSel=c.id===sel;
        const isLower=DEFS[c.type]?.row==="lower";
        const cx=PL+c.x*ES, cyy=getCabY(c), cw=c.w*ES, ch=c.h*ES;
        const tkH=isLower?TOEKICK*ES:0, bodyH=ch-tkH;
        const nDoors=cw>=27*ES?2:1, dw=cw/nDoors;
        return (
          <g key={c.id} style={{cursor:"grab"}}
            onPointerDown={e=>onPD(e,c.id)}
            onClick={e=>{e.stopPropagation();onSel(c.id);}}>
            {/* Cabinet body */}
            <rect x={cx} y={cyy} width={cw} height={bodyH}
              fill={bodyFill} stroke={isSel?T.amber:doorEdge}
              strokeWidth={isSel?2:1} rx={1}/>
            {/* Toe kick */}
            {isLower && <rect x={cx+3} y={cyy+bodyH} width={cw-6} height={tkH} fill={tkFill} rx={1}/>}
            {/* Doors */}
            {Array.from({length:nDoors}).map((_,i)=>{
              const ddx=cx+i*dw;
              return (
                <g key={i}>
                  <rect x={ddx+2} y={cyy+2} width={dw-4} height={bodyH-4}
                    fill={doorFill} stroke={doorEdge} strokeWidth={0.8} rx={1}/>
                  {c.doorStyle==="Shaker" && (
                    <rect x={ddx+7} y={cyy+7} width={dw-14} height={bodyH-14}
                      fill="none" stroke={shakerIn} strokeWidth={1} rx={1}/>
                  )}
                  {c.doorStyle==="Raised Panel" && (
                    <rect x={ddx+6} y={cyy+6} width={dw-12} height={bodyH-12}
                      fill="#D8B88E" stroke={doorEdge} strokeWidth={0.8} rx={2}/>
                  )}
                  <rect x={ddx+(i===0?dw-10:5)} y={cyy+bodyH/2-7}
                    width={6} height={14} fill={handle} rx={3}/>
                </g>
              );
            })}
            {/* Selection ring */}
            {isSel && <rect x={cx-3} y={cyy-3} width={cw+6} height={ch+6}
              fill="none" stroke={T.amber} strokeWidth={2} strokeDasharray="6,3" rx={2}/>}
            {/* Width label */}
            <text x={cx+cw/2} y={FY+18} textAnchor="middle"
              fill={isSel?T.amber:T.faint} fontSize={11} fontFamily="DM Sans">{c.w}"</text>
          </g>
        );
      })}

      {/* Floor line */}
      <rect x={PL} y={FY} width={wallW*ES} height={4} fill={T.oak} opacity={0.4}/>

      {/* Dimension lines */}
      <line x1={PL} y1={FY+32} x2={PL+wallW*ES} y2={FY+32} stroke={T.borderDark} strokeWidth={1}/>
      <line x1={PL} y1={FY+26} x2={PL} y2={FY+38} stroke={T.borderDark} strokeWidth={1}/>
      <line x1={PL+wallW*ES} y1={FY+26} x2={PL+wallW*ES} y2={FY+38} stroke={T.borderDark} strokeWidth={1}/>
      <text x={PL+wallW*ES/2} y={FY+50} textAnchor="middle"
        fill={T.muted} fontSize={12} fontFamily="DM Sans">{wallW}"  ({(wallW/12).toFixed(1)}')</text>

      {/* Empty state */}
      {wallCabs.length===0 && (
        <text x={PL+wallW*ES/2} y={FY-wallH*ES/2+6} textAnchor="middle"
          fill="#C4B8A8" fontSize={14} fontFamily="DM Sans">← Add cabinets from the left panel</text>
      )}

      {/* Wall label */}
      <text x={PL+wallW*ES/2} y={PT-16} textAnchor="middle"
        fill={T.faint} fontSize={11} fontFamily="DM Sans" letterSpacing={2}>{wall.toUpperCase()} WALL</text>
    </svg>
  );
}

/* ─── FLOOR PLAN CANVAS ───────────────────────────────────────────────────── */
function FloorPlanCanvas({ cabs, room, sel, onSel }) {
  const FS=2.4, P=64;
  const W=P*2+room.width*FS, H=P*2+room.depth*FS;
  const L=P, Tp=P, R=P+room.width*FS, B=P+room.depth*FS;

  const getRect = c => {
    const cw=c.w*FS, cd=c.d*FS;
    switch(c.wall){
      case "South":  return{x:L+c.x*FS,            y:B-cd,           w:cw,h:cd};
      case "North":  return{x:L+c.x*FS,            y:Tp,             w:cw,h:cd};
      case "East":   return{x:R-cd,                y:Tp+c.x*FS,     w:cd,h:cw};
      case "West":   return{x:L,                   y:Tp+c.x*FS,     w:cd,h:cw};
      case "Island": return{x:L+room.width*FS/2-cw/2, y:Tp+room.depth*FS/2-cd/2, w:cw,h:cd};
      default: return null;
    }
  };

  return (
    <svg width={W} height={H} style={{display:"block",background:T.canvasBg,userSelect:"none",borderRadius:8}}
      onClick={()=>onSel(null)}>
      {/* Room */}
      <rect x={L} y={Tp} width={room.width*FS} height={room.depth*FS} fill="#EDE5D8" stroke={T.oak} strokeWidth={2.5} rx={2}/>
      {/* Grid */}
      {Array.from({length:Math.floor(room.width/12)+1},(_,i)=>(
        <line key={`v${i}`} x1={L+i*12*FS} y1={Tp} x2={L+i*12*FS} y2={B} stroke={T.border} strokeWidth={0.8}/>
      ))}
      {Array.from({length:Math.floor(room.depth/12)+1},(_,i)=>(
        <line key={`h${i}`} x1={L} y1={Tp+i*12*FS} x2={R} y2={Tp+i*12*FS} stroke={T.border} strokeWidth={0.8}/>
      ))}
      {/* Labels */}
      <text x={L+room.width*FS/2} y={B+22} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans">South  {room.width}" ({(room.width/12).toFixed(1)}')</text>
      <text x={L+room.width*FS/2} y={Tp-14} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans">North</text>
      <text x={R+22} y={Tp+room.depth*FS/2} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans"
        transform={`rotate(90 ${R+22} ${Tp+room.depth*FS/2})`}>East  {room.depth}"</text>
      <text x={L-22} y={Tp+room.depth*FS/2} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans"
        transform={`rotate(-90 ${L-22} ${Tp+room.depth*FS/2})`}>West</text>
      {/* Cabinets */}
      {cabs.map(c=>{
        const r=getRect(c); if(!r) return null;
        const isSel=c.id===sel;
        const isUpper=DEFS[c.type]?.row==="upper";
        return (
          <g key={c.id} style={{cursor:"pointer"}} onClick={e=>{e.stopPropagation();onSel(c.id);}}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h}
              fill={isUpper?"#D4CCBC":"#C8B898"}
              stroke={isSel?T.amber:T.borderDark}
              strokeWidth={isSel?2:1}
              strokeDasharray={isUpper?"3,2":"none"}
              rx={2}/>
            <text x={r.x+r.w/2} y={r.y+r.h/2+4} textAnchor="middle"
              fill={isSel?T.amber:T.muted} fontSize={10} fontFamily="DM Sans">{c.w}"</text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={L} y={B+34} width={12} height={10} fill="#C8B898" stroke={T.borderDark} strokeWidth={1} rx={2}/>
      <text x={L+16} y={B+43} fill={T.faint} fontSize={11} fontFamily="DM Sans">Lower / Island</text>
      <rect x={L+110} y={B+34} width={12} height={10} fill="#D4CCBC" stroke={T.borderDark} strokeWidth={1} strokeDasharray="3,2" rx={2}/>
      <text x={L+126} y={B+43} fill={T.faint} fontSize={11} fontFamily="DM Sans">Upper (wall-mounted)</text>
    </svg>
  );
}

/* ─── DESIGN SIDEBAR ──────────────────────────────────────────────────────── */
function DesignSidebar({ onAdd, wall, setWall, room, setRoom, cabs }) {
  return (
    <div style={{width:240,background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
      {/* Wall selector */}
      <div style={{padding:"20px 16px",borderBottom:`1px solid rgba(255,255,255,0.08)`}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",
          color:"rgba(255,255,255,0.4)",marginBottom:10}}>Active wall</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {WALLS.map(w=>{
            const count=cabs.filter(c=>c.wall===w).length;
            const isA=wall===w;
            return (
              <button key={w} onClick={()=>setWall(w)}
                style={{padding:"9px 8px",background:isA?T.amber:"rgba(255,255,255,0.06)",
                  border:`1px solid ${isA?T.amber:"rgba(255,255,255,0.12)"}`,borderRadius:7,
                  color:isA?"#fff":"rgba(255,255,255,0.55)",fontSize:13,fontWeight:600,
                  cursor:"pointer",position:"relative",transition:"all 0.15s"}}>
                {w}
                {count>0 && <span style={{position:"absolute",top:-5,right:-5,
                  background:isA?"#fff":T.amber,color:isA?T.amber:"#fff",
                  borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Room dimensions */}
      <div style={{padding:"16px",borderBottom:`1px solid rgba(255,255,255,0.08)`}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",
          color:"rgba(255,255,255,0.4)",marginBottom:10}}>Room (inches)</div>
        {[["Width","width"],["Depth","depth"],["Height","height"]].map(([l,k])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{color:"rgba(255,255,255,0.45)",fontSize:13,width:46}}>{l}</span>
            <input type="number" value={room[k]}
              onChange={e=>setRoom(r=>({...r,[k]:parseInt(e.target.value)||96}))}
              style={{width:64,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:5,padding:"5px 8px",color:"#FAF7F2",fontSize:13,outline:"none"}}/>
            <span style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>"</span>
          </div>
        ))}
      </div>

      {/* Cabinet library */}
      <div style={{padding:"16px",flex:1}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",
          color:"rgba(255,255,255,0.4)",marginBottom:10}}>Add to {wall.toLowerCase()}</div>
        {Object.entries(DEFS).filter(([t])=>t!=="island").map(([type,def])=>(
          <button key={type} onClick={()=>onAdd(type)}
            style={{display:"block",width:"100%",padding:"10px 12px",marginBottom:6,
              background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:8,color:"rgba(255,255,255,0.8)",textAlign:"left",cursor:"pointer",
              transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=`rgba(193,122,58,0.25)`;e.currentTarget.style.borderColor=T.amber;}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>+ {def.label}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{def.w}"W × {def.h}"H × {def.d}"D</div>
          </button>
        ))}

        <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",
            color:"rgba(255,255,255,0.4)",marginBottom:8}}>Freestanding</div>
          <button onClick={()=>onAdd("island")}
            style={{display:"block",width:"100%",padding:"10px 12px",background:"rgba(255,255,255,0.06)",
              border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,
              color:"rgba(255,255,255,0.8)",textAlign:"left",cursor:"pointer",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=`rgba(193,122,58,0.25)`;e.currentTarget.style.borderColor=T.amber;}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>+ Island</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{DEFS.island.w}"W × {DEFS.island.h}"H × {DEFS.island.d}"D</div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PROPERTIES PANEL ────────────────────────────────────────────────────── */
function PropertiesPanel({ c, update, del }) {
  if (!c) return (
    <div style={{width:260,background:T.surface,borderLeft:`1px solid ${T.border}`,flexShrink:0,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:24,color:T.faint}}>
        <div style={{fontSize:28,marginBottom:8}}>👆</div>
        <div style={{fontSize:14,color:T.muted}}>Select a cabinet<br/>to edit its properties</div>
      </div>
    </div>
  );

  const F = ({label,k,type="number",opts})=>(
    <div style={{marginBottom:14}}>
      <Label>{label}</Label>
      {opts
        ? <Select value={c[k]} onChange={e=>update(c.id,{[k]:e.target.value})}>
            {opts.map(o=><option key={typeof o==="string"?o:o.v} value={typeof o==="string"?o:o.v}>{typeof o==="string"?o:o.l}</option>)}
          </Select>
        : <Input type={type} value={c[k]}
            onChange={e=>update(c.id,{[k]:type==="number"?parseFloat(e.target.value)||0:e.target.value})}/>
      }
    </div>
  );

  return (
    <div style={{width:260,background:T.surface,borderLeft:`1px solid ${T.border}`,
      flexShrink:0,overflowY:"auto",padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h3 style={{fontFamily:"'Lora',serif",fontSize:17,color:T.oak}}>{DEFS[c.type]?.label}</h3>
        <Btn variant="danger" style={{padding:"5px 10px",fontSize:12}} onClick={()=>del(c.id)}>Remove</Btn>
      </div>

      {/* Dimensions */}
      <div style={{marginBottom:16}}>
        <Label>Dimensions (inches)</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["W","w"],["H","h"],["D","d"]].map(([l,k])=>(
            <div key={k}>
              <div style={{fontSize:11,color:T.faint,marginBottom:4,textAlign:"center"}}>{l}</div>
              <Input type="number" value={c[k]} style={{textAlign:"center",padding:"7px 4px"}}
                onChange={e=>update(c.id,{[k]:parseFloat(e.target.value)||0})}/>
            </div>
          ))}
        </div>
      </div>

      <F label="Material" k="material" opts={Object.entries(MATS).map(([v,m])=>({v,l:m.label}))}/>
      <F label="Door style" k="doorStyle" opts={DOOR_STYLES}/>
      <F label="Finish / color" k="finish" type="text"/>
      <F label="Wall" k="wall" opts={[...WALLS,"Island"]}/>
      <F label="Notes" k="notes" type="text"/>

      {/* Price */}
      <div style={{marginTop:6,padding:16,background:"#FDF3E3",border:`1px solid #F0D0A0`,borderRadius:9}}>
        <div style={{fontSize:11,color:T.amber,fontWeight:600,letterSpacing:"0.06em",marginBottom:4}}>UNIT PRICE (EST.)</div>
        <div style={{fontSize:30,fontWeight:700,fontFamily:"'Lora',serif",color:T.oak}}>${getPrice(c).toLocaleString()}</div>
        <div style={{fontSize:12,color:T.muted,marginTop:6,lineHeight:1.7}}>
          {c.w}"W × {c.h}"H × {c.d}"D<br/>
          {MATS[c.material]?.label} · {c.doorStyle}
        </div>
      </div>
    </div>
  );
}

/* ─── QUOTE VIEW ──────────────────────────────────────────────────────────── */
function QuoteView({ cabs, project, setProject }) {
  const sub=cabs.reduce((s,c)=>s+getPrice(c),0);
  const tax=Math.round(sub*0.08);
  const total=sub+tax;

  return (
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:860}}>
      <div className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
          <div>
            <h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:4}}>Project Quote</h1>
            <p style={{fontSize:14,color:T.muted}}>{new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[["Project name","name"],["Client","client"]].map(([l,k])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:13,color:T.muted,width:90}}>{l}</span>
                <Input value={project[k]} style={{width:220}}
                  onChange={e=>setProject(p=>({...p,[k]:e.target.value}))}/>
              </div>
            ))}
          </div>
        </div>

        {cabs.length===0
          ? <Card><p style={{color:T.faint,textAlign:"center",padding:"40px 0",fontSize:15}}>
              No cabinets in the design yet — go to the Design tab to add cabinets.
            </p></Card>
          : <>
            <Card style={{marginBottom:24,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                <thead>
                  <tr style={{background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`}}>
                    {["#","Type","W × H × D","Wall","Material","Door Style","Price"].map(h=>(
                      <th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:12,
                        fontWeight:600,color:T.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cabs.map((c,i)=>(
                    <tr key={c.id} style={{borderBottom:`1px solid ${T.border}`,
                      background:i%2===0?"#fff":T.surface}}>
                      <td style={{padding:"11px 14px",color:T.faint}}>{String(i+1).padStart(2,"0")}</td>
                      <td style={{padding:"11px 14px",fontWeight:500,color:T.ink}}>{DEFS[c.type]?.label}</td>
                      <td style={{padding:"11px 14px",color:T.muted}}>{c.w}" × {c.h}" × {c.d}"</td>
                      <td style={{padding:"11px 14px",color:T.muted}}>{c.wall}</td>
                      <td style={{padding:"11px 14px",color:T.muted}}>{MATS[c.material]?.label}</td>
                      <td style={{padding:"11px 14px",color:T.muted}}>{c.doorStyle}</td>
                      <td style={{padding:"11px 14px",fontWeight:600,color:T.oak}}>${getPrice(c).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:24}}>
              <Card style={{width:300,padding:20}}>
                {[["Subtotal",sub],["Tax (8%)",tax]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",
                    padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:15}}>
                    <span style={{color:T.muted}}>{l}</span>
                    <span style={{color:T.text}}>${v.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"14px 0 0",alignItems:"center"}}>
                  <span style={{fontSize:18,fontWeight:700,fontFamily:"'Lora',serif",color:T.ink}}>Total</span>
                  <span style={{fontSize:22,fontWeight:700,fontFamily:"'Lora',serif",color:T.oak}}>${total.toLocaleString()}</span>
                </div>
              </Card>
            </div>

            <p style={{fontSize:13,color:T.faint,marginBottom:16,lineHeight:1.6}}>
              This estimate is based on listed dimensions and materials. Final pricing subject to site verification and material availability.
            </p>
            <Btn onClick={()=>window.print()}>🖨 Print quote</Btn>
          </>
        }
      </div>
    </div>
  );
}

/* ─── ORDER SHEET ─────────────────────────────────────────────────────────── */
function OrderSheet({ cabs, project, room }) {
  const totalPrice=cabs.reduce((s,c)=>s+getPrice(c),0);
  return (
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:900}}>
      <div className="fade-up">
        <div style={{textAlign:"center",marginBottom:32}}>
          <h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:4}}>
            Manufacturer Order Sheet
          </h1>
          <p style={{fontSize:14,color:T.muted}}>
            {project.name} — {project.client||"No client specified"} — {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card style={{marginBottom:24}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
            {[["Project",project.name||"—"],["Client",project.client||"—"],
              ["Room",`${(room.width/12).toFixed(1)}' × ${(room.depth/12).toFixed(1)}'`],
              ["Ceiling",`${room.height}" (${(room.height/12).toFixed(1)}')`]].map(([l,v])=>(
              <div key={l}>
                <Label>{l}</Label>
                <div style={{fontSize:15,color:T.ink,fontWeight:500}}>{v}</div>
              </div>
            ))}
          </div>
        </Card>

        {[...WALLS,"Island"].map(w=>{
          const wc=cabs.filter(c=>c.wall===w);
          if(!wc.length) return null;
          return (
            <div key={w} style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <h3 style={{fontFamily:"'Lora',serif",fontSize:17,color:T.oak}}>{w} wall</h3>
                <span style={{fontSize:13,color:T.muted}}>{wc.length} unit{wc.length!==1?"s":""}</span>
              </div>
              <Card style={{padding:0,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`}}>
                      {["#","Type","W","H","D","Material","Door Style","Finish","Notes"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,
                          fontWeight:600,color:T.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wc.map((c,i)=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"#fff":T.surface}}>
                        <td style={{padding:"9px 12px",color:T.faint}}>{i+1}</td>
                        <td style={{padding:"9px 12px",fontWeight:500,color:T.ink}}>{DEFS[c.type]?.label}</td>
                        <td style={{padding:"9px 12px",fontWeight:700,color:T.oak}}>{c.w}</td>
                        <td style={{padding:"9px 12px",fontWeight:700,color:T.oak}}>{c.h}</td>
                        <td style={{padding:"9px 12px",fontWeight:700,color:T.oak}}>{c.d}</td>
                        <td style={{padding:"9px 12px",color:T.muted}}>{MATS[c.material]?.label}</td>
                        <td style={{padding:"9px 12px",color:T.muted}}>{c.doorStyle}</td>
                        <td style={{padding:"9px 12px",color:T.muted}}>{c.finish||"—"}</td>
                        <td style={{padding:"9px 12px",color:T.faint}}>{c.notes||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          );
        })}

        {cabs.length===0 && <Card><p style={{color:T.faint,textAlign:"center",padding:"40px 0",fontSize:15}}>No cabinets to order yet.</p></Card>}
        {cabs.length>0 && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginTop:24,paddingTop:20,borderTop:`1px solid ${T.border}`}}>
            <span style={{fontSize:15,color:T.muted}}>
              {cabs.length} unit{cabs.length!==1?"s":""} — Est. ${totalPrice.toLocaleString()}
            </span>
            <div style={{display:"flex",gap:12}}>
              <span style={{fontSize:13,color:T.faint}}>Approved for production: ___________________ Date: __________</span>
              <Btn onClick={()=>window.print()}>🖨 Print / Export PDF</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MAIN APP ────────────────────────────────────────────────────────────── */
export default function App() {
  const [view,    setView]    = useState("setup");
  const [subView, setSubView] = useState("elevation");
  const [project, setProject] = useState({name:"New Kitchen Project",client:""});
  const [room,    setRoom]    = useState({width:144,depth:120,height:96});
  const [cabs,    setCabs]    = useState([]);
  const [sel,     setSel]     = useState(null);
  const [wall,    setWall]    = useState("South");

  const addCab = type=>{const c=makeCab(type,type==="island"?"Island":wall,cabs);setCabs(p=>[...p,c]);setSel(c.id);};
  const applyRecs = rcs=>{
    const newCabs=(rcs||[]).filter(r=>DEFS[r.type]).map(r=>({
      id:uid(),type:r.type,w:clamp(r.w||DEFS[r.type].w,9,96),
      h:clamp(r.h||DEFS[r.type].h,12,96),d:clamp(r.d||DEFS[r.type].d,9,36),
      x:Math.max(0,r.x||3),wall:r.wall||"South",
      material:r.material||"maple",doorStyle:r.doorStyle||"Shaker",
      finish:r.finish||"Natural",notes:r.notes||"",
    }));
    setCabs(newCabs);
  };
  const updateCab=(id,ch)=>setCabs(p=>p.map(c=>c.id===id?{...c,...ch}:c));
  const deleteCab=id=>{setCabs(p=>p.filter(c=>c.id!==id));setSel(null);};
  const moveCab=(id,x)=>setCabs(p=>p.map(c=>c.id===id?{...c,x}:c));

  const selCab=cabs.find(c=>c.id===sel);
  const total=cabs.reduce((s,c)=>s+getPrice(c),0);
  const wallW=["East","West"].includes(wall)?room.depth:room.width;

  const STEPS=[
    {id:"setup",  n:"01",label:"Room setup"},
    {id:"recs",   n:"02",label:"AI recommendations"},
    {id:"design", n:"03",label:"Design"},
    {id:"quote",  n:"04",label:"Quote"},
    {id:"order",  n:"05",label:"Order sheet"},
  ];

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg,overflow:"hidden"}}>
      <GlobalStyle/>

      {/* ── HEADER ── */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,height:58,flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",
        boxShadow:"0 1px 4px rgba(44,31,14,0.06)"}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,color:T.oak,letterSpacing:"0.02em"}}>
            CabinetWorks
          </div>
          <div style={{width:1,height:22,background:T.border}}/>
          <span style={{fontSize:14,color:T.muted}}>{project.name}</span>
        </div>

        {/* Steps */}
        <nav style={{display:"flex",gap:2,height:"100%",alignItems:"stretch"}}>
          {STEPS.map(s=>{
            const isActive=view===s.id;
            const isDone=STEPS.findIndex(x=>x.id===view)>STEPS.findIndex(x=>x.id===s.id);
            return (
              <button key={s.id} onClick={()=>setView(s.id)}
                style={{padding:"0 16px",background:"transparent",border:"none",
                  borderBottom:`3px solid ${isActive?T.amber:"transparent"}`,
                  color:isActive?T.amber:isDone?T.oak:T.faint,
                  fontSize:13,fontWeight:isActive?600:400,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:7,transition:"all 0.15s",
                  whiteSpace:"nowrap"}}>
                <span style={{fontSize:11,fontWeight:700,opacity:0.6}}>{s.n}</span>
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Total */}
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:20,fontWeight:600,color:T.oak}}>${total.toLocaleString()}</div>
          <div style={{fontSize:11,color:T.faint,letterSpacing:"0.06em",textTransform:"uppercase"}}>Est. total</div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {view==="setup" && (
          <RoomSetupView room={room} setRoom={setRoom} onNext={()=>setView("recs")}/>
        )}

        {view==="recs" && (
          <RecommendationsView room={room}
            onApply={rcs=>{applyRecs(rcs);setView("design");}}
            onSkip={()=>setView("design")}/>
        )}

        {view==="design" && <>
          <DesignSidebar onAdd={addCab} wall={wall} setWall={setWall} room={room} setRoom={setRoom} cabs={cabs}/>

          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
            {/* Sub-tabs */}
            <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,
              padding:"0 20px",display:"flex",alignItems:"stretch",flexShrink:0,height:44}}>
              {[["elevation","Elevation view"],["floorplan","Floor plan"]].map(([v,l])=>(
                <button key={v} onClick={()=>setSubView(v)}
                  style={{padding:"0 16px",background:"none",border:"none",
                    borderBottom:`3px solid ${subView===v?T.amber:"transparent"}`,
                    color:subView===v?T.amber:T.muted,fontSize:13,fontWeight:subView===v?600:400,
                    cursor:"pointer",transition:"all 0.15s"}}>
                  {l}
                </button>
              ))}
              <div style={{flex:1}}/>
              <div style={{display:"flex",alignItems:"center",fontSize:13,color:T.faint}}>
                {cabs.length} cabinet{cabs.length!==1?"s":""}
                {cabs.length>0 && <span style={{marginLeft:8,color:T.amber,fontWeight:600}}>${total.toLocaleString()}</span>}
              </div>
            </div>

            {/* Canvas */}
            <div style={{flex:1,overflow:"auto",padding:28}}>
              {subView==="elevation"
                ? <ElevationCanvas cabs={cabs} wall={wall} wallW={wallW} wallH={room.height}
                    sel={sel} onSel={setSel} onMove={moveCab}/>
                : <FloorPlanCanvas cabs={cabs} room={room} sel={sel} onSel={setSel}/>
              }
            </div>
          </div>

          <PropertiesPanel c={selCab} update={updateCab} del={deleteCab}/>
        </>}

        {view==="quote" && <QuoteView cabs={cabs} project={project} setProject={setProject}/>}
        {view==="order" && <OrderSheet cabs={cabs} project={project} room={room}/>}
      </div>
    </div>
  );
}
