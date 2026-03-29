import { useState, useRef } from "react";

/* ─── TOKENS ──────────────────────────────────────────────────────────────── */
const T = {
  bg:"#FAF7F2", surface:"#F4EFE7", surfaceAlt:"#EDE5D8",
  sidebar:"#2C1F0E", border:"#D4C4A8", borderDark:"#B8A48A",
  ink:"#1E1208", text:"#3A2A14", muted:"#7A6048", faint:"#A89070",
  oak:"#8B5E3C", amber:"#C17A3A", amberLight:"#FDF3E3",
  green:"#4A7240", greenLight:"#EBF5E8", red:"#8B3A2A", redLight:"#FDEEED",
  wallBg:"#E8DECE", canvasBg:"#EDE5D8",
  winFill:"#C8E0F0", winStroke:"#6A9EBE",
};

/* ─── CONSTANTS ───────────────────────────────────────────────────────────── */
const MODEL="claude-sonnet-4-20250514", ES=4.5, TOEKICK=4.5, UPPER_BTM=54;
const ALL_WALLS=["South","North","East","West"];
const STD_W={base:[9,12,15,18,21,24,27,30,33,36,42,48],upper:[9,12,15,18,21,24,27,30,33,36,42,48],tall:[18,24,30,36],island:[36,42,48,54,60,72,84,96],vanity:[18,21,24,27,30,33,36,42,48]};
const STD_H={base:[30,31.5,34.5,36],upper:[12,15,18,24,30,36,42],tall:[72,84,90,96],island:[28.5,34.5,36,42],vanity:[28.5,30,31.5,32,34.5]};
const STD_D={base:[12,15,18,21,24],upper:[12,13,14],tall:[12,18,24],island:[24,27,30,36],vanity:[18,21,24]};
const DEFS={
  base:{label:"Base Cabinet",w:36,h:34.5,d:24,row:"lower"},
  upper:{label:"Wall Cabinet",w:36,h:30,d:12,row:"upper"},
  tall:{label:"Tall / Pantry",w:24,h:84,d:24,row:"lower"},
  island:{label:"Island",w:48,h:34.5,d:36,row:"island"},
  vanity:{label:"Vanity",w:36,h:32,d:21,row:"lower"},
};
const MATS={thermofoil:{label:"Thermofoil",rate:16},painted_mdf:{label:"Painted MDF",rate:22},maple:{label:"Maple",rate:40},cherry:{label:"Cherry",rate:56},walnut:{label:"Walnut",rate:70}};
const BASE_P={base:175,upper:140,tall:310,island:395,vanity:190};
const DOOR_STYLES=["Shaker","Flat Panel","Raised Panel","Beadboard","Glass Insert","Open Shelf"];
const BOX_MATS={melamine_white:{label:"White Melamine"},melamine_maple:{label:"Maple Melamine"},melamine_black:{label:"Black Melamine"},birch_ply:{label:"Birch Plywood"},particle:{label:"Particle Board"}};
const APPLIANCE_TYPES=[
  {key:"fridge",label:"Refrigerator",defW:36,defH:70,defD:30},
  {key:"range",label:"Range / Stove",defW:30,defH:36,defD:25},
  {key:"dishwasher",label:"Dishwasher",defW:24,defH:34,defD:24},
  {key:"microwave",label:"Microwave / OTR",defW:30,defH:17,defD:15},
  {key:"rangeHood",label:"Range Hood",defW:30,defH:6,defD:20},
  {key:"sink",label:"Sink",defW:33,defH:10,defD:22},
];
const UTILITY_TYPES=[
  {key:"water",label:"Water supply",icon:"💧"},
  {key:"drain",label:"Drain",icon:"⬇"},
  {key:"gas",label:"Gas line",icon:"🔥"},
  {key:"electrical",label:"Electrical / outlet",icon:"⚡"},
];

let _uid=1;
const uid=()=>`c${_uid++}`;
const fid=()=>`f${_uid++}`;
const aid=()=>`a${_uid++}`;
const utid=()=>`u${_uid++}`;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const getPrice=c=>Math.round(BASE_P[c.type]+(c.w*c.h/144)*(MATS[c.material]?.rate??40));
const notesHas=(c,kw)=>c.notes?.toLowerCase().includes(kw);
const wallWidth=(wall,room)=>["East","West"].includes(wall)?room.depth:room.width;

const makeCab=(type,wall,all,ww)=>{
  const def=DEFS[type];
  const row=all.filter(c=>c.wall===wall&&DEFS[c.type]?.row===def.row);
  const nx=row.length?Math.max(...row.map(c=>c.x+c.w))+3:3;
  return{id:uid(),type,w:def.w,h:def.h,d:def.d,x:Math.max(0,ww?Math.min(nx,ww-def.w):nx),
    ix:0,iy:0,wall:type==="island"?"Island":wall,material:"maple",doorStyle:"Shaker",finish:"Natural",notes:"",useStandard:true};
};

/* ─── GLOBAL STYLES ───────────────────────────────────────────────────────── */
const GS=()=>(
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:${T.bg};color:${T.text};font-size:15px}
    input,select{font-family:'DM Sans',sans-serif;font-size:14px}
    button{font-family:'DM Sans',sans-serif;cursor:pointer}
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-track{background:${T.surface}}
    ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade-up{animation:fadeUp 0.3s ease forwards}
  `}</style>
);

/* ─── SHARED UI ───────────────────────────────────────────────────────────── */
const Card=({children,style})=><div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:24,...style}}>{children}</div>;
const Lbl=({children,style})=><div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:T.muted,marginBottom:6,...style}}>{children}</div>;
const IB={background:"#fff",border:`1.5px solid ${T.border}`,borderRadius:6,padding:"8px 12px",fontSize:14,color:T.ink,outline:"none",width:"100%"};
const FI=({style,...p})=><input style={{...IB,...style}} onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border} {...p}/>;
const FS=({style,children,...p})=><select style={{...IB,...style}} onFocus={e=>e.target.style.borderColor=T.amber} onBlur={e=>e.target.style.borderColor=T.border} {...p}>{children}</select>;
const Btn=({children,variant="primary",style,...p})=>{
  const v={primary:{background:T.amber,color:"#fff",border:"none"},outline:{background:"transparent",border:`1.5px solid ${T.borderDark}`,color:T.text},ghost:{background:"transparent",border:"none",color:T.muted},danger:{background:T.redLight,color:T.red,border:`1px solid #e0c0bb`}}[variant];
  return <button style={{padding:"10px 20px",borderRadius:7,fontSize:14,fontWeight:600,display:"inline-flex",alignItems:"center",gap:8,transition:"all 0.15s",...v,...style}} onMouseEnter={e=>{e.currentTarget.style.opacity="0.85";e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(0)";}} {...p}>{children}</button>;
};
const Badge=({children,color="amber"})=>{
  const c={amber:{bg:T.amberLight,text:T.amber,border:"#F0D0A0"},green:{bg:T.greenLight,text:T.green,border:"#C0DDB8"},red:{bg:T.redLight,text:T.red,border:"#E0C0BB"}}[color]||{bg:T.amberLight,text:T.amber,border:"#F0D0A0"};
  return <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:99,background:c.bg,color:c.text,border:`1px solid ${c.border}`,letterSpacing:"0.06em"}}>{children}</span>;
};

/* ─── API ─────────────────────────────────────────────────────────────────── */
async function callClaude(messages,max_tokens=1800){
  const r=await fetch("/ai-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens,messages})});
  const d=await r.json();
  if(d.error)throw new Error(d.error.message);
  return d.content.filter(b=>b.type==="text").map(b=>b.text).join("");
}
const parseJSON=txt=>JSON.parse(txt.replace(/```json\n?|```\n?/g,"").trim());

/* ─── DROPZONE ────────────────────────────────────────────────────────────── */
function Dropzone({label,onFile,preview}){
  const [drag,setDrag]=useState(false),inp=useRef();
  const handle=f=>{if(!f)return;const r=new FileReader();r.onload=e=>onFile({base64:e.target.result.split(",")[1],mimeType:f.type||"image/jpeg",dataUrl:e.target.result});r.readAsDataURL(f);};
  return(
    <div onClick={()=>inp.current.click()} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}
      style={{border:`2px dashed ${drag?T.amber:T.border}`,borderRadius:10,background:drag?T.amberLight:"#fff",cursor:"pointer",overflow:"hidden",transition:"all 0.15s",minHeight:preview?0:120}}>
      <input ref={inp} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
      {preview
        ?<div style={{position:"relative"}}><img src={preview} alt="" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block"}}/><div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(44,31,14,0.75)",padding:"5px 10px",fontSize:12,color:"#FAF7F2",textAlign:"center"}}>Click to replace</div></div>
        :<div style={{textAlign:"center",padding:"28px 20px"}}><div style={{fontSize:28,marginBottom:8}}>📷</div><div style={{fontSize:14,fontWeight:500,color:T.muted,marginBottom:4}}>{label}</div><div style={{fontSize:12,color:T.faint}}>Click or drag & drop · JPG or PNG</div></div>
      }
    </div>
  );
}

/* ─── FEATURE EDITOR (windows & doors) ───────────────────────────────────── */
function FeatureEditor({features,setFeatures,activeWalls,room}){
  const add=type=>{
    const wall=activeWalls[0]||"South";
    const ww=wallWidth(wall,room);
    setFeatures(f=>[...f,{id:fid(),type,wall,x:Math.round(ww/2-12),width:type==="window"?24:32,height:type==="window"?36:80,fromFloor:type==="window"?40:0}]);
  };
  const upd=(id,ch)=>setFeatures(f=>f.map(x=>x.id===id?{...x,...ch}:x));
  const del=id=>setFeatures(f=>f.filter(x=>x.id!==id));
  const IS={...IB,padding:"5px 8px",fontSize:13};

  return(
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h3 style={{fontSize:16,fontWeight:600,color:T.ink}}>Windows & doors</h3>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="outline" style={{padding:"6px 14px",fontSize:12}} onClick={()=>add("window")}>+ Window</Btn>
          <Btn variant="outline" style={{padding:"6px 14px",fontSize:12}} onClick={()=>add("door")}>+ Door</Btn>
        </div>
      </div>
      {features.length===0
        ?<p style={{fontSize:13,color:T.faint,fontStyle:"italic"}}>No windows or doors added yet. Add them or the AI will detect them from your blueprint.</p>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {features.map(f=>(
            <div key={f.id} style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr 1fr 1fr auto",gap:8,alignItems:"center",padding:"10px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8}}>
              <span style={{fontSize:18}}>{f.type==="window"?"🪟":"🚪"}</span>
              <div>
                <Lbl style={{marginBottom:3}}>Wall</Lbl>
                <select value={f.wall} onChange={e=>upd(f.id,{wall:e.target.value})} style={{...IS,width:"100%"}}>
                  {activeWalls.map(w=><option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <Lbl style={{marginBottom:3}}>From left"</Lbl>
                <input type="number" value={f.x} onChange={e=>upd(f.id,{x:parseInt(e.target.value)||0})} style={{...IS,width:"100%"}}/>
              </div>
              <div>
                <Lbl style={{marginBottom:3}}>Width"</Lbl>
                <input type="number" value={f.width} onChange={e=>upd(f.id,{width:parseInt(e.target.value)||24})} style={{...IS,width:"100%"}}/>
              </div>
              <div>
                <Lbl style={{marginBottom:3}}>Height"</Lbl>
                <input type="number" value={f.height} onChange={e=>upd(f.id,{height:parseInt(e.target.value)||36})} style={{...IS,width:"100%"}}/>
              </div>
              <button onClick={()=>del(f.id)} style={{background:"none",border:"none",color:T.red,fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
      }
    </Card>
  );
}

/* ─── APPLIANCE EDITOR ─────────────────────────────────────────────────────── */
function ApplianceEditor({appliances,setAppliances,activeWalls,room}){
  const add=type=>{
    const def=APPLIANCE_TYPES.find(a=>a.key===type);
    if(!def)return;
    const wall=activeWalls[0]||"South";
    const ww=wallWidth(wall,room);
    setAppliances(a=>[...a,{id:aid(),type:type,label:def.label,wall,x:Math.round(ww/2-def.defW/2),w:def.defW,h:def.defH,d:def.defD}]);
  };
  const upd=(id,ch)=>setAppliances(a=>a.map(x=>x.id===id?{...x,...ch}:x));
  const del=id=>setAppliances(a=>a.filter(x=>x.id!==id));
  const IS={...IB,padding:"5px 8px",fontSize:13};
  // Which appliance types haven't been added yet?
  const usedTypes=appliances.map(a=>a.type);
  const available=APPLIANCE_TYPES.filter(t=>!usedTypes.includes(t.key));

  return(
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h3 style={{fontSize:16,fontWeight:600,color:T.ink}}>Appliances</h3>
        {available.length>0&&(
          <select onChange={e=>{if(e.target.value){add(e.target.value);e.target.value="";}}} defaultValue="" style={{...IS,width:"auto",padding:"6px 12px",fontSize:12,color:T.amber,fontWeight:600,borderColor:T.amber,background:"#fff"}}>
            <option value="" disabled>+ Add appliance</option>
            {available.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        )}
      </div>
      {appliances.length===0
        ?<p style={{fontSize:13,color:T.faint,fontStyle:"italic"}}>No appliances added yet. The AI will assume standard sizes if left empty.</p>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {appliances.map(a=>{
            const emoji={fridge:"🧊",range:"🔥",dishwasher:"🫧",microwave:"📡",rangeHood:"💨",sink:"🚰"}[a.type]||"📦";
            return(
              <div key={a.id} style={{display:"grid",gridTemplateColumns:"auto 1fr 60px 60px 60px 90px auto",gap:8,alignItems:"center",padding:"10px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8}}>
                <span style={{fontSize:18}}>{emoji}</span>
                <div style={{fontSize:14,fontWeight:500,color:T.ink}}>{a.label}</div>
                <div>
                  <div style={{fontSize:10,color:T.faint,marginBottom:2,textAlign:"center"}}>W"</div>
                  <input type="number" value={a.w} onChange={e=>upd(a.id,{w:parseInt(e.target.value)||0})} style={{...IS,width:"100%",textAlign:"center"}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.faint,marginBottom:2,textAlign:"center"}}>H"</div>
                  <input type="number" value={a.h} onChange={e=>upd(a.id,{h:parseInt(e.target.value)||0})} style={{...IS,width:"100%",textAlign:"center"}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.faint,marginBottom:2,textAlign:"center"}}>D"</div>
                  <input type="number" value={a.d} onChange={e=>upd(a.id,{d:parseInt(e.target.value)||0})} style={{...IS,width:"100%",textAlign:"center"}}/>
                </div>
                <div>
                  <div style={{fontSize:10,color:T.faint,marginBottom:2}}>Wall</div>
                  <select value={a.wall} onChange={e=>upd(a.id,{wall:e.target.value})} style={{...IS,width:"100%"}}>
                    {activeWalls.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <button onClick={()=>del(a.id)} style={{background:"none",border:"none",color:T.red,fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
              </div>
            );
          })}
        </div>
      }
      <p style={{fontSize:12,color:T.faint,marginTop:10}}>Appliance dimensions help the AI place cabinets with proper clearance.</p>
    </Card>
  );
}

/* ─── UTILITIES EDITOR (gas, plumbing, electrical) ────────────────────────── */
function UtilitiesEditor({utilities,setUtilities,activeWalls,room}){
  const add=type=>{
    const def=UTILITY_TYPES.find(u=>u.key===type);
    if(!def)return;
    const wall=activeWalls[0]||"South";
    const ww=wallWidth(wall,room);
    setUtilities(u=>[...u,{id:utid(),type:type,label:def.label,icon:def.icon,wall,x:Math.round(ww/2),fromFloor:6,notes:""}]);
  };
  const upd=(id,ch)=>setUtilities(u=>u.map(x=>x.id===id?{...x,...ch}:x));
  const del=id=>setUtilities(u=>u.filter(x=>x.id!==id));
  const IS={...IB,padding:"5px 8px",fontSize:13};

  return(
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h3 style={{fontSize:16,fontWeight:600,color:T.ink}}>Plumbing, gas & electrical</h3>
        <div style={{display:"flex",gap:6}}>
          {UTILITY_TYPES.map(t=>(
            <button key={t.key} onClick={()=>add(t.key)} title={`Add ${t.label}`} style={{padding:"5px 10px",borderRadius:6,fontSize:12,fontWeight:600,background:T.surface,border:`1px solid ${T.border}`,color:T.muted,cursor:"pointer"}}>
              {t.icon}
            </button>
          ))}
        </div>
      </div>
      {utilities.length===0
        ?<p style={{fontSize:13,color:T.faint,fontStyle:"italic"}}>Mark gas lines, water supply, drains, and outlets so the AI avoids placing cabinets over them.</p>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {utilities.map(u=>(
            <div key={u.id} style={{display:"grid",gridTemplateColumns:"auto 1fr 80px 80px 1fr auto",gap:8,alignItems:"center",padding:"10px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8}}>
              <span style={{fontSize:18}}>{u.icon}</span>
              <div style={{fontSize:14,fontWeight:500,color:T.ink}}>{u.label}</div>
              <div>
                <div style={{fontSize:10,color:T.faint,marginBottom:2}}>Wall</div>
                <select value={u.wall} onChange={e=>upd(u.id,{wall:e.target.value})} style={{...IS,width:"100%"}}>
                  {activeWalls.map(w=><option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:10,color:T.faint,marginBottom:2}}>From left"</div>
                <input type="number" value={u.x} onChange={e=>upd(u.id,{x:parseInt(e.target.value)||0})} style={{...IS,width:"100%"}}/>
              </div>
              <div>
                <div style={{fontSize:10,color:T.faint,marginBottom:2}}>Notes</div>
                <input type="text" value={u.notes} onChange={e=>upd(u.id,{notes:e.target.value})} style={{...IS,width:"100%"}} placeholder="e.g. main shutoff"/>
              </div>
              <button onClick={()=>del(u.id)} style={{background:"none",border:"none",color:T.red,fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
      }
    </Card>
  );
}

/* ─── ROOM OPTIONS CARD ───────────────────────────────────────────────────── */
function RoomOptionsCard({room,setRoom}){
  const Toggle=({label,desc,value,onChange})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8}}>
      <div><div style={{fontSize:14,fontWeight:500,color:T.ink}}>{label}</div><div style={{fontSize:12,color:T.faint}}>{desc}</div></div>
      <button onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:value?T.amber:T.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
        <span style={{position:"absolute",top:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",left:value?22:2,display:"block"}}/>
      </button>
    </div>
  );
  const IS={...IB,padding:"7px 10px"};
  return(
    <Card>
      <h3 style={{fontSize:16,fontWeight:600,color:T.ink,marginBottom:14}}>Room options</h3>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <Toggle label="Cabinets to ceiling" desc="Upper cabinets extend to ceiling height" value={room.toCeiling} onChange={v=>setRoom(r=>({...r,toCeiling:v}))}/>
        <Toggle label="Crown moulding" desc="Decorative trim at top of uppers" value={room.crownMoulding} onChange={v=>setRoom(r=>({...r,crownMoulding:v}))}/>
        <div style={{padding:"12px 14px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:14,fontWeight:500,color:T.ink}}>Bulkhead / soffit</div><div style={{fontSize:12,color:T.faint}}>Dropped ceiling section above uppers</div></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" value={room.bulkheadHeight} onChange={e=>setRoom(r=>({...r,bulkheadHeight:parseInt(e.target.value)||0}))} style={{...IS,width:64,textAlign:"center"}} placeholder="0"/>
              <span style={{fontSize:13,color:T.faint}}>inches</span>
            </div>
          </div>
          {room.bulkheadHeight>0&&<p style={{fontSize:12,color:T.amber,marginTop:6}}>Uppers will be limited to {room.height-UPPER_BTM-room.bulkheadHeight}" max height.</p>}
        </div>
        <div style={{padding:"12px 14px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:14,fontWeight:500,color:T.ink}}>Cabinet box material</div><div style={{fontSize:12,color:T.faint}}>Interior box construction (separate from door finish)</div></div>
            <select value={room.boxMaterial} onChange={e=>setRoom(r=>({...r,boxMaterial:e.target.value}))} style={{...IS,width:180}}>
              {Object.entries(BOX_MATS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─── STEP 1 — ROOM SETUP ─────────────────────────────────────────────────── */
function RoomSetupView({room,setRoom,activeWalls,setActiveWalls,onNext}){
  const [blueprint,setBlueprint]=useState(null);
  const [photo,setPhoto]=useState(null);
  const [analysis,setAnalysis]=useState(null);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);

  const toggleWall=w=>setActiveWalls(p=>p.includes(w)?p.filter(x=>x!==w):[...p,w]);

  const analyze=async()=>{
    if(!blueprint)return;
    setLoading(true);setErr(null);
    try{
      const txt=await callClaude([{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:blueprint.mimeType,data:blueprint.base64}},
        {type:"text",text:`Analyze this image (room photo, hand sketch, or floor plan) and extract kitchen dimensions.

Return ONLY valid JSON, no markdown:
{
  "width": <room width in inches>,
  "depth": <room depth in inches>,
  "height": <ceiling height in inches, default 96>,
  "confidence": "high|medium|low",
  "notes": "<one sentence observation>",
  "walls": ["South","West"],
  "features": [
    {"type":"window","wall":"North","x":36,"width":24,"height":36,"fromFloor":40},
    {"type":"door","wall":"South","x":0,"width":32,"height":80,"fromFloor":0}
  ],
  "suggestedLayout": "Galley|L-Shape|U-Shape|G-Shape|Island Kitchen",
  "existingObstacles": ["<obstacle>"]
}

CRITICAL RULES:
- Convert ALL feet to inches (multiply by 12). So 7' = 84", 8' = 96", 2' = 24"
- "width" = the horizontal wall measurement shown (e.g. 7' = 84")  
- "depth" = the vertical/perpendicular wall measurement shown (e.g. 8' = 96")
- If a measurement says 8' for depth, depth = 96 (not 72 or 84)
- "walls" = only walls with cabinet space. L-shape=2 walls, U-shape=3, Galley=2 opposite
- For "features": include ALL windows and doors visible. "x" = inches from left corner of that wall
- Windows typically: height=36, fromFloor=40. Doors: height=80, fromFloor=0
- If no features visible, return empty array []`}
      ]}]);
      const p=parseJSON(txt);
      setAnalysis(p);
      if(p.width) setRoom(r=>({...r,width:clamp(p.width,60,600)}));
      if(p.depth) setRoom(r=>({...r,depth:clamp(p.depth,60,600)}));
      if(p.height) setRoom(r=>({...r,height:clamp(p.height,84,144)}));
      if(p.walls?.length) setActiveWalls(p.walls.filter(w=>ALL_WALLS.includes(w)));
      if(p.features) setRoom(r=>({...r,features:(p.features||[]).map(f=>({...f,id:fid()}))}));
    }catch(e){setErr("Couldn't read this image. Set dimensions and walls manually below.");}
    setLoading(false);
  };

  return(
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:920}}>
      <div className="fade-up">
        <h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:6}}>Set up your room</h1>
        <p style={{fontSize:15,color:T.muted,marginBottom:32}}>Upload photos and a sketch or blueprint. The AI reads dimensions, detects walls, and finds windows and doors.</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
          <div>
            <Lbl>Existing space photo <span style={{color:T.faint,fontWeight:400,textTransform:"none"}}>(optional)</span></Lbl>
            <Dropzone label="Upload room photo" onFile={setPhoto} preview={photo?.dataUrl}/>
            <p style={{fontSize:12,color:T.faint,marginTop:6}}>Helps understand the space</p>
          </div>
          <div>
            <Lbl>Blueprint, sketch, or floor plan <span style={{color:T.amber}}>★ recommended</span></Lbl>
            <Dropzone label="Upload blueprint or sketch" onFile={f=>{setBlueprint(f);setAnalysis(null);}} preview={blueprint?.dataUrl}/>
            <p style={{fontSize:12,color:T.faint,marginTop:6}}>Hand-drawn sketches with measurements work great</p>
          </div>
        </div>

        {blueprint&&!analysis&&(
          <Btn onClick={analyze} disabled={loading} style={{marginBottom:24}}>
            {loading?<><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span> Analyzing…</>:<><span>⚡</span> Read dimensions from image</>}
          </Btn>
        )}
        {err&&<div style={{background:T.redLight,border:`1px solid #e0b8b3`,borderRadius:8,padding:"12px 16px",color:T.red,fontSize:14,marginBottom:20}}>{err}</div>}

        {analysis&&(
          <Card style={{marginBottom:24,borderColor:T.amber}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:15,fontWeight:600,color:T.green}}>✓ Image analyzed</span>
              <Badge color={analysis.confidence==="high"?"green":analysis.confidence==="medium"?"amber":"red"}>{(analysis.confidence||"low").toUpperCase()} CONFIDENCE</Badge>
            </div>
            {analysis.notes&&<p style={{color:T.muted,fontSize:14,marginBottom:12,fontStyle:"italic"}}>"{analysis.notes}"</p>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {analysis.features?.length>0&&<div><Lbl>Detected features</Lbl>{analysis.features.map((f,i)=><div key={i} style={{fontSize:13,color:T.text,marginBottom:4}}>{f.type==="window"?"🪟":"🚪"} {f.type} on {f.wall} wall — {f.width}" wide at {f.x}" from left</div>)}</div>}
              {analysis.existingObstacles?.length>0&&<div><Lbl>Obstacles</Lbl>{analysis.existingObstacles.map((o,i)=><div key={i} style={{fontSize:13,color:T.red,marginBottom:4}}>⚠ {o}</div>)}</div>}
            </div>
            {analysis.suggestedLayout&&<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`,fontSize:14,color:T.muted}}>Suggested layout: <strong style={{color:T.oak}}>{analysis.suggestedLayout}</strong></div>}
          </Card>
        )}

        <Card style={{marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:600,color:T.ink,marginBottom:16}}>{analysis?"Verify extracted dimensions":"Enter room dimensions"}</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            {[["Room width","width","Wall to wall"],["Room depth","depth","Front to back"],["Ceiling height","height","Floor to ceiling"]].map(([l,k,hint])=>(
              <div key={k}>
                <Lbl>{l}</Lbl>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <FI type="number" value={room[k]} style={{width:90}} onChange={e=>setRoom(r=>({...r,[k]:parseInt(e.target.value)||96}))}/>
                  <span style={{fontSize:14,color:T.muted}}>inches</span>
                  <span style={{fontSize:13,color:T.faint}}>({(room[k]/12).toFixed(1)}')</span>
                </div>
                <p style={{fontSize:12,color:T.faint,marginTop:4}}>{hint}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:600,color:T.ink,marginBottom:6}}>Which walls have cabinet space?</h3>
          <p style={{fontSize:14,color:T.muted,marginBottom:16}}>Galley = 2 opposite · L-shape = 2 adjacent · U-shape = 3</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            {ALL_WALLS.map(w=>{
              const isOn=activeWalls.includes(w);
              return <button key={w} onClick={()=>toggleWall(w)} style={{padding:"10px 22px",borderRadius:8,fontSize:14,fontWeight:600,background:isOn?T.amber:T.surface,border:`2px solid ${isOn?T.amber:T.border}`,color:isOn?"#fff":T.muted,cursor:"pointer",transition:"all 0.15s"}}>{isOn?"✓ ":""}{w} wall</button>;
            })}
          </div>
          {activeWalls.length===0&&<p style={{fontSize:13,color:T.red}}>⚠ Select at least one wall.</p>}
          <Lbl style={{marginBottom:10}}>Room footprint preview</Lbl>
          <RoomFootprint room={room} activeWalls={activeWalls}/>
        </Card>

        <div style={{marginBottom:24}}>
          <FeatureEditor
            features={room.features||[]}
            setFeatures={f=>setRoom(r=>({...r,features:typeof f==="function"?f(r.features||[]):f}))}
            activeWalls={activeWalls} room={room}/>
        </div>

        <div style={{marginBottom:24}}>
          <ApplianceEditor
            appliances={room.appliances||[]}
            setAppliances={a=>setRoom(r=>({...r,appliances:typeof a==="function"?a(r.appliances||[]):a}))}
            activeWalls={activeWalls} room={room}/>
        </div>

        <div style={{marginBottom:24}}>
          <UtilitiesEditor
            utilities={room.utilities||[]}
            setUtilities={u=>setRoom(r=>({...r,utilities:typeof u==="function"?u(r.utilities||[]):u}))}
            activeWalls={activeWalls} room={room}/>
        </div>

        <div style={{marginBottom:24}}>
          <RoomOptionsCard room={room} setRoom={setRoom}/>
        </div>

        <Btn onClick={onNext} disabled={activeWalls.length===0} style={{fontSize:15,padding:"12px 28px"}}>Next: Get AI layout recommendations →</Btn>
      </div>
    </div>
  );
}

function RoomFootprint({room,activeWalls}){
  const sc=Math.min(320/room.width,200/room.depth);
  const W=room.width*sc,D=room.depth*sc,P=36;
  const wc=w=>activeWalls?.includes(w)?T.oak:T.border;
  const features=room.features||[];
  return(
    <svg width={W+P*2} height={D+P*2} style={{display:"block",borderRadius:8,background:T.wallBg}}>
      {Array.from({length:Math.floor(room.width/12)+1},(_,i)=><line key={`v${i}`} x1={P+i*12*sc} y1={P} x2={P+i*12*sc} y2={P+D} stroke={T.border} strokeWidth={0.8}/>)}
      {Array.from({length:Math.floor(room.depth/12)+1},(_,i)=><line key={`h${i}`} x1={P} y1={P+i*12*sc} x2={P+W} y2={P+i*12*sc} stroke={T.border} strokeWidth={0.8}/>)}
      <line x1={P} y1={P+D} x2={P+W} y2={P+D} stroke={wc("South")} strokeWidth={4}/>
      <line x1={P} y1={P} x2={P+W} y2={P} stroke={wc("North")} strokeWidth={4}/>
      <line x1={P+W} y1={P} x2={P+W} y2={P+D} stroke={wc("East")} strokeWidth={4}/>
      <line x1={P} y1={P} x2={P} y2={P+D} stroke={wc("West")} strokeWidth={4}/>
      {/* Features on footprint */}
      {features.map(f=>{
        const fw=f.width*sc;
        let fx,fy,fw2,fh2;
        const th=6;
        switch(f.wall){
          case"South":fx=P+f.x*sc;fy=P+D-th;fw2=fw;fh2=th;break;
          case"North":fx=P+f.x*sc;fy=P;fw2=fw;fh2=th;break;
          case"East":fx=P+W-th;fy=P+f.x*sc;fw2=th;fh2=fw;break;
          case"West":fx=P;fy=P+f.x*sc;fw2=th;fh2=fw;break;
          default:return null;
        }
        return <rect key={f.id} x={fx} y={fy} width={fw2} height={fh2} fill={f.type==="window"?T.winFill:"#EDE5D8"} stroke={f.type==="window"?T.winStroke:T.faint} strokeWidth={1.5}/>;
      })}
      {[["South",P+W/2,P+D+20,0],["North",P+W/2,P-12,0],["East",P+W+20,P+D/2,90],["West",P-20,P+D/2,-90]].map(([w,x,y,rot])=>(
        <text key={w} x={x} y={y} textAnchor="middle" fill={wc(w)} fontSize={11} fontFamily="DM Sans" fontWeight={activeWalls?.includes(w)?600:400} transform={rot?`rotate(${rot} ${x} ${y})`:undefined}>{w}</text>
      ))}
      <text x={P+W/2} y={P+D/2+5} textAnchor="middle" fill={T.faint} fontSize={13} fontFamily="DM Sans">{((room.width/12)*(room.depth/12)).toFixed(0)} sq ft</text>
    </svg>
  );
}

/* ─── STEP 2 — RECOMMENDATIONS ────────────────────────────────────────────── */
function RecommendationsView({room,activeWalls,onApply,onSkip}){
  const [recs,setRecs]=useState(null),[loading,setLoading]=useState(false),[err,setErr]=useState(null);
  const generate=async()=>{
    setLoading(true);setErr(null);
    try{
      const sqft=((room.width/12)*(room.depth/12)).toFixed(1);
      const wallList=activeWalls.join(", ");
      const featList=(room.features||[]).map(f=>`${f.type} on ${f.wall} wall at ${f.x}" from left, ${f.width}" wide`).join("; ")||"none";
      const applianceList=(room.appliances||[]).map(a=>`${a.label}: ${a.w}"W × ${a.h}"H × ${a.d}"D on ${a.wall} wall`).join("; ")||"none specified (use standard sizes)";
      const utilityList=(room.utilities||[]).map(u=>`${u.label} on ${u.wall} wall at ${u.x}" from left${u.notes?` (${u.notes})`:""}`).join("; ")||"none marked";
      const roomOpts=[];
      if(room.toCeiling) roomOpts.push("Cabinets to ceiling: YES — uppers should reach ceiling height");
      if(room.crownMoulding) roomOpts.push("Crown moulding: YES — account for 3-4\" trim at top of uppers");
      if(room.bulkheadHeight>0) roomOpts.push(`Bulkhead/soffit: ${room.bulkheadHeight}" drop from ceiling — limits upper cabinet height`);
      roomOpts.push(`Box material: ${BOX_MATS[room.boxMaterial]?.label||"Birch Plywood"}`);
      const optsStr=roomOpts.join(". ");
      const txt=await callClaude([{role:"user",content:
        `You are an NKBA-certified kitchen designer. Generate a cabinet layout.

Space: ${room.width}" wide × ${room.depth}" deep × ${room.height}" ceiling (${sqft} sq ft)
AVAILABLE WALLS ONLY: ${wallList}
OBSTACLES (windows/doors — do NOT place cabinets over these): ${featList}
APPLIANCES: ${applianceList}
PLUMBING / GAS / ELECTRICAL: ${utilityList}
ROOM OPTIONS: ${optsStr}

APPLIANCE RULES:
- Place sink base cabinet at the water supply/drain location if marked
- Place range/stove cabinet at the gas line location if marked
- Size sink base to accommodate the specified sink width (add 3" minimum)
- Size range opening to the specified range/stove width exactly
- Fridge gets no cabinet — leave a gap equal to fridge width
- Dishwasher goes adjacent to sink base (24" standard)

Return ONLY valid JSON — no markdown:
{"layout":"L-Shape","explanation":"2-3 sentences.","workTriangle":{"sink":60,"range":48,"fridge":72,"total":180,"valid":true,"note":"sentence."},"bestPractices":[{"rule":"Primary aisle clearance","description":"42\\" min between facing surfaces","recommended":"48\\"","met":true},{"rule":"Counter height","description":"36\\" floor to countertop","recommended":"36\\"","met":true},{"rule":"Upper cabinet elevation","description":"18\\" min between countertop and upper cab bottom","recommended":"18\\"","met":true},{"rule":"Work triangle perimeter","description":"144\\"–312\\" total","recommended":"180\\"","met":true},{"rule":"Sink landing space","description":"24\\" one side, 18\\" other","recommended":"24\\"/18\\"","met":true},{"rule":"Range landing space","description":"12\\" one side, 15\\" other","recommended":"15\\"/12\\"","met":true},{"rule":"Island clearance","description":"42\\" min on all sides","recommended":"48\\"","met":true}],"cabinets":[{"type":"base","wall":"South","w":36,"h":34.5,"d":24,"material":"maple","doorStyle":"Shaker","finish":"Natural","notes":"Sink base","x":6}],"tips":["Tip 1.","Tip 2.","Tip 3."],"warnings":[]}

RULES: Only walls ${wallList}. Avoid windows/doors when placing cabinets. Place appliances at utility locations where possible. 10-16 cabinets. Mix base, upper, one tall pantry. Island only if >=120" wide AND >=144" deep. x values must not exceed wall width minus cabinet width.${room.toCeiling?" Upper cabinets should extend to ceiling height.":""}${room.bulkheadHeight>0?" Bulkhead drops "+room.bulkheadHeight+'"  from ceiling - max upper height is '+(room.height-UPPER_BTM-room.bulkheadHeight)+'".':""}`
      }],2500);
      setRecs(parseJSON(txt));
    }catch(e){setErr("Could not generate — please try again.");}
    setLoading(false);
  };
  return(
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:920}}>
      <div className="fade-up">
        <h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:6}}>AI layout recommendations</h1>
        <p style={{fontSize:15,color:T.muted,marginBottom:8}}>Based on your {(room.width/12).toFixed(1)}' × {(room.depth/12).toFixed(1)}' space and NKBA best practices.</p>
        <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
          {activeWalls.map(w=><Badge key={w} color="amber">{w} wall</Badge>)}
          {(room.features||[]).map(f=><Badge key={f.id} color="green">{f.type==="window"?"🪟":"🚪"} {f.wall}</Badge>)}
          {(room.appliances||[]).map(a=><Badge key={a.id} color="amber">{a.label}</Badge>)}
          {(room.utilities||[]).map(u=><Badge key={u.id} color="green">{u.icon} {u.label}</Badge>)}
          {room.toCeiling&&<Badge color="amber">To ceiling</Badge>}
          {room.crownMoulding&&<Badge color="amber">Crown moulding</Badge>}
        </div>
        {!recs&&(
          <div>
            <Btn onClick={generate} disabled={loading} style={{marginBottom:12}}>{loading?<><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>⟳</span> Generating…</>:"⚡ Generate AI recommendations"}</Btn>
            {!loading&&<div><Btn variant="ghost" onClick={onSkip} style={{fontSize:14,color:T.muted}}>Skip and design manually →</Btn></div>}
          </div>
        )}
        {err&&<div style={{background:T.redLight,border:`1px solid #e0b8b3`,borderRadius:8,padding:"12px 16px",color:T.red,fontSize:14,marginBottom:20}}>{err}</div>}
        {recs&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <Card>
                <Lbl>Recommended layout</Lbl>
                <div style={{fontSize:26,fontWeight:600,fontFamily:"'Lora',serif",color:T.oak,marginBottom:10}}>{recs.layout}</div>
                <p style={{fontSize:14,color:T.muted,lineHeight:1.7}}>{recs.explanation}</p>
              </Card>
              <Card>
                <Lbl>Work triangle</Lbl>
                <div style={{display:"flex",gap:20,marginBottom:12}}>
                  {[["Sink→Range",recs.workTriangle?.sink],["Range→Fridge",recs.workTriangle?.range],["Fridge→Sink",recs.workTriangle?.fridge]].map(([l,v])=>(
                    <div key={l}><div style={{fontSize:11,color:T.faint,marginBottom:2}}>{l}</div><div style={{fontSize:18,fontWeight:600,color:T.ink}}>{v}"</div></div>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <Badge color={recs.workTriangle?.valid?"green":"red"}>{recs.workTriangle?.total}" total</Badge>
                  <span style={{fontSize:12,color:T.faint}}>NKBA: 144"–312"</span>
                </div>
                <p style={{fontSize:13,color:T.muted}}>{recs.workTriangle?.note}</p>
              </Card>
            </div>
            <Card>
              <Lbl style={{marginBottom:16}}>NKBA compliance checklist</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {recs.bestPractices?.map((bp,i)=>(
                  <div key={i} style={{display:"flex",gap:12,padding:"12px 14px",background:bp.met?T.greenLight:T.redLight,border:`1px solid ${bp.met?"#C0DDB8":"#e0b8b3"}`,borderRadius:8}}>
                    <span style={{fontSize:18,flexShrink:0}}>{bp.met?"✓":"⚠"}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:bp.met?T.green:T.red,marginBottom:3}}>{bp.rule}</div>
                      <div style={{fontSize:13,color:T.muted,lineHeight:1.5}}>{bp.description}</div>
                      <div style={{fontSize:12,color:bp.met?T.green:T.red,marginTop:4,fontWeight:500}}>Recommended: {bp.recommended}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <Lbl style={{marginBottom:12}}>Suggested cabinet plan — {recs.cabinets?.length} units</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
                {recs.cabinets?.map((c,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7}}>
                    <div style={{fontSize:12,color:T.amber,fontWeight:600,marginBottom:3}}>{DEFS[c.type]?.label} — {c.wall}</div>
                    <div style={{fontSize:15,fontWeight:600,color:T.ink}}>{c.w}" × {c.h}" × {c.d}"</div>
                    {c.notes&&<div style={{fontSize:12,color:T.muted,marginTop:3}}>{c.notes}</div>}
                  </div>
                ))}
              </div>
            </Card>
            {recs.tips?.length>0&&<Card><Lbl style={{marginBottom:12}}>Design tips</Lbl>{recs.tips.map((t,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:10}}><span style={{color:T.amber,fontWeight:700,flexShrink:0}}>→</span><span style={{fontSize:14,color:T.text,lineHeight:1.65}}>{t}</span></div>)}</Card>}
            {recs.warnings?.length>0&&<Card style={{borderColor:"#e0b8b3",background:T.redLight}}>{recs.warnings.map((w,i)=><div key={i} style={{fontSize:14,color:T.red,marginBottom:4}}>⚠ {w}</div>)}</Card>}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",paddingBottom:16}}>
              <Btn onClick={()=>onApply(recs.cabinets||[])} style={{fontSize:15,padding:"12px 28px"}}>Apply to design canvas →</Btn>
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
function ElevationCanvas({cabs,wall,wallW,wallH,sel,onSel,onMove,features,utilities}){
  const drag=useRef(null);
  const PL=60,PR=30,PT=40,PB=60;
  const SW=PL+wallW*ES+PR,SH=PT+wallH*ES+PB,FY=PT+wallH*ES;
  const getCabY=c=>DEFS[c.type].row==="upper"?FY-(UPPER_BTM+c.h)*ES:FY-c.h*ES;
  const onPD=(e,id)=>{e.stopPropagation();onSel(id);const c=cabs.find(x=>x.id===id);if(c)drag.current={id,mx0:e.clientX,cx0:c.x};};
  const onPM=e=>{if(!drag.current)return;const c=cabs.find(x=>x.id===drag.current.id);if(!c)return;onMove(drag.current.id,clamp(drag.current.cx0+(e.clientX-drag.current.mx0)/ES,0,wallW-c.w));};
  const onPU=()=>{drag.current=null;};
  const wallCabs=cabs.filter(c=>c.wall===wall);
  const wallFeatures=(features||[]).filter(f=>f.wall===wall);

  // only warn on lower cabs — upper cabs at different height, not a real conflict
  const hasOverlap=c=>{
    if(DEFS[c.type]?.row!=="lower") return false;
    return wallFeatures.some(f=>{
      const cabEnd=c.x+c.w, featEnd=f.x+f.width;
      return c.x<featEnd&&cabEnd>f.x;
    });
  };

  const bf="#C19A6B",df="#D4AF82",de="#A8825A",si="#C8A474",tf="#5C3D1E",ct="#8B6340",hn="#8B7355";
  return(
    <svg width={SW} height={SH} style={{display:"block",background:T.canvasBg,userSelect:"none",minWidth:SW,borderRadius:8}}
      onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU} onClick={()=>onSel(null)}>
      {/* Wall background */}
      <rect x={PL} y={PT} width={wallW*ES} height={wallH*ES} fill="#E8E0D5" stroke={T.borderDark} strokeWidth={1}/>
      {Array.from({length:Math.floor(wallW/12)+1},(_,i)=><line key={i} x1={PL+i*12*ES} y1={PT} x2={PL+i*12*ES} y2={FY} stroke="#D4C8B8" strokeWidth={0.5}/>)}
      <rect x={PL} y={PT} width={wallW*ES} height={(wallH-UPPER_BTM)*ES} fill="rgba(193,122,58,0.04)" stroke="#D4C0A0" strokeWidth={0.8} strokeDasharray="6,5"/>
      <text x={PL+6} y={PT+(wallH-UPPER_BTM)*ES-7} fill="#C4A870" fontSize={10} fontFamily="DM Sans">Upper zone</text>

      {/* ── WINDOWS & DOORS ── */}
      {wallFeatures.map(f=>{
        const fx=PL+f.x*ES, fw=f.width*ES;
        const fFromFloor=f.fromFloor??( f.type==="door"?0:40);
        const fHeight=f.height??(f.type==="door"?80:36);
        const fh=fHeight*ES, fy=FY-(fFromFloor+fHeight)*ES;

        if(f.type==="window"){
          return(
            <g key={f.id}>
              {/* Clear opening in wall */}
              <rect x={fx} y={fy} width={fw} height={fh} fill={T.winFill} stroke={T.winStroke} strokeWidth={1.5}/>
              {/* Window panes */}
              <line x1={fx+fw/2} y1={fy} x2={fx+fw/2} y2={fy+fh} stroke={T.winStroke} strokeWidth={1}/>
              <line x1={fx} y1={fy+fh/2} x2={fx+fw} y2={fy+fh/2} stroke={T.winStroke} strokeWidth={1}/>
              {/* Sill top & bottom */}
              <rect x={fx-4} y={fy-4} width={fw+8} height={4} fill="#C4A870" rx={1}/>
              <rect x={fx-4} y={fy+fh} width={fw+8} height={4} fill="#C4A870" rx={1}/>
              <text x={fx+fw/2} y={fy+fh/2+4} textAnchor="middle" fill={T.winStroke} fontSize={9} fontFamily="DM Sans">WIN</text>
            </g>
          );
        } else {
          return(
            <g key={f.id}>
              {/* Door opening — clear wall */}
              <rect x={fx} y={FY-fh} width={fw} height={fh} fill={T.canvasBg} stroke="none"/>
              {/* Door frame */}
              <line x1={fx} y1={FY-fh} x2={fx} y2={FY} stroke={T.borderDark} strokeWidth={2}/>
              <line x1={fx+fw} y1={FY-fh} x2={fx+fw} y2={FY} stroke={T.borderDark} strokeWidth={2}/>
              {/* Door swing arc */}
              <path d={`M ${fx} ${FY-fh} A ${fw} ${fw} 0 0 1 ${fx+fw} ${FY-fh}`} fill="rgba(193,122,58,0.06)" stroke={T.muted} strokeWidth={0.8} strokeDasharray="4,3"/>
              <text x={fx+fw/2} y={FY-fh/2+4} textAnchor="middle" fill={T.muted} fontSize={9} fontFamily="DM Sans">DOOR</text>
            </g>
          );
        }
      })}

      {/* ── UTILITY MARKERS ── */}
      {(utilities||[]).filter(u=>u.wall===wall).map(u=>{
        const ux=PL+u.x*ES;
        const uy=FY-(u.fromFloor||6)*ES;
        const colors={water:"#4A90D9",drain:"#6B7B8D",gas:"#E07030",electrical:"#D4A017"};
        const col=colors[u.type]||T.muted;
        return(
          <g key={u.id}>
            <circle cx={ux} cy={uy} r={8} fill={col} fillOpacity={0.2} stroke={col} strokeWidth={1.5}/>
            <text x={ux} y={uy+4} textAnchor="middle" fill={col} fontSize={10} fontFamily="DM Sans" fontWeight={700}>
              {u.type==="water"?"W":u.type==="drain"?"D":u.type==="gas"?"G":"E"}
            </text>
            <text x={ux} y={uy-14} textAnchor="middle" fill={col} fontSize={9} fontFamily="DM Sans">{u.label}</text>
          </g>
        );
      })}

      {/* Countertops */}
      {wallCabs.filter(c=>DEFS[c.type]?.row==="lower").map(c=>(
        <rect key={`ct${c.id}`} x={PL+c.x*ES-1} y={FY-c.h*ES-2.5*ES} width={c.w*ES+2} height={2.5*ES} fill={ct} rx={1}/>
      ))}

      {/* Cabinets */}
      {wallCabs.map(c=>{
        const isSel=c.id===sel, isLower=DEFS[c.type]?.row==="lower", isOverlap=hasOverlap(c);
        const cx=PL+c.x*ES, cyy=getCabY(c), cw=c.w*ES, ch=c.h*ES;
        const tkH=isLower?TOEKICK*ES:0, bodyH=ch-tkH, nD=cw>=27*ES?2:1, dw=cw/nD;
        // appliance visuals only make sense on lower / base cabinets
        const isSink=isLower&&notesHas(c,"sink"), isRange=isLower&&(notesHas(c,"range")||notesHas(c,"stove")), isFridge=isLower&&(notesHas(c,"fridge")||notesHas(c,"refrigerator"));
        return(
          <g key={c.id} style={{cursor:"grab"}} onPointerDown={e=>onPD(e,c.id)} onClick={e=>{e.stopPropagation();onSel(c.id);}}>
            <rect x={cx} y={cyy} width={cw} height={bodyH}
              fill={isFridge?"#D4C8B8":isRange?"#C8A888":bf}
              stroke={isOverlap?"#CC4422":isSel?T.amber:de} strokeWidth={isSel||isOverlap?2:1} rx={1}/>
            {isLower&&<rect x={cx+3} y={cyy+bodyH} width={cw-6} height={tkH} fill={tf} rx={1}/>}

            {/* Sink visual */}
            {isSink&&(
              <g>
                <rect x={cx+cw*0.15} y={cyy+bodyH*0.25} width={cw*0.7} height={bodyH*0.5} fill="#8AAABB" stroke="#6A8898" strokeWidth={1} rx={3}/>
                <circle cx={cx+cw/2} cy={cyy+bodyH*0.5} r={cw*0.06} fill="#5A7888"/>
                <line x1={cx+cw/2} y1={cyy+bodyH*0.2} x2={cx+cw/2} y2={cyy+bodyH*0.35} stroke="#8A9098" strokeWidth={2} strokeLinecap="round"/>
              </g>
            )}

            {/* Range/stove visual — 4 burner circles, fixed size */}
            {isRange&&(
              <g>
                {(()=>{
                  const br=6, gap=Math.min(cw*0.22, 16);
                  return [[-1,-1],[1,-1],[-1,1],[1,1]].map(([ox,oy],i)=>(
                    <g key={i}>
                      <circle cx={cx+cw/2+ox*gap} cy={cyy+bodyH/2+oy*gap} r={br} fill="none" stroke="#8A7060" strokeWidth={1.5}/>
                      <circle cx={cx+cw/2+ox*gap} cy={cyy+bodyH/2+oy*gap} r={br*0.35} fill="#A88070"/>
                    </g>
                  ));
                })()}
              </g>
            )}

            {/* Fridge visual — handle + shelves */}
            {isFridge&&(
              <g>
                <line x1={cx+cw*0.75} y1={cyy+bodyH*0.2} x2={cx+cw*0.75} y2={cyy+bodyH*0.8} stroke="#A09080" strokeWidth={3} strokeLinecap="round"/>
                <line x1={cx+cw*0.1} y1={cyy+bodyH*0.45} x2={cx+cw*0.9} y2={cyy+bodyH*0.45} stroke="#B8A898" strokeWidth={0.8} strokeDasharray="3,2"/>
              </g>
            )}

            {/* Doors (only if not special appliance) */}
            {!isSink&&!isRange&&!isFridge&&Array.from({length:nD}).map((_,i)=>{
              const ddx=cx+i*dw;
              return(
                <g key={i}>
                  <rect x={ddx+2} y={cyy+2} width={dw-4} height={bodyH-4} fill={df} stroke={de} strokeWidth={0.8} rx={1}/>
                  {c.doorStyle==="Shaker"&&<rect x={ddx+7} y={cyy+7} width={dw-14} height={bodyH-14} fill="none" stroke={si} strokeWidth={1} rx={1}/>}
                  {c.doorStyle==="Raised Panel"&&<rect x={ddx+6} y={cyy+6} width={dw-12} height={bodyH-12} fill="#D8B88E" stroke={de} strokeWidth={0.8} rx={2}/>}
                  <rect x={ddx+(i===0?dw-10:5)} y={cyy+bodyH/2-7} width={6} height={14} fill={hn} rx={3}/>
                </g>
              );
            })}

            {isSel&&<rect x={cx-3} y={cyy-3} width={cw+6} height={ch+6} fill="none" stroke={T.amber} strokeWidth={2} strokeDasharray="6,3" rx={2}/>}
            {isOverlap&&!isSel&&<rect x={cx-2} y={cyy-2} width={cw+4} height={ch+4} fill="none" stroke="#CC4422" strokeWidth={1.5} strokeDasharray="4,3" rx={2}/>}
            <text x={cx+cw/2} y={FY+18} textAnchor="middle" fill={isSel?T.amber:T.faint} fontSize={11} fontFamily="DM Sans">{c.w}"</text>
          </g>
        );
      })}

      <rect x={PL} y={FY} width={wallW*ES} height={4} fill={T.oak} opacity={0.4}/>
      <line x1={PL} y1={FY+32} x2={PL+wallW*ES} y2={FY+32} stroke={T.borderDark} strokeWidth={1}/>
      <line x1={PL} y1={FY+26} x2={PL} y2={FY+38} stroke={T.borderDark} strokeWidth={1}/>
      <line x1={PL+wallW*ES} y1={FY+26} x2={PL+wallW*ES} y2={FY+38} stroke={T.borderDark} strokeWidth={1}/>
      <text x={PL+wallW*ES/2} y={FY+50} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans">{wallW}"  ({(wallW/12).toFixed(1)}')</text>
      <text x={PL+wallW*ES/2} y={PT-16} textAnchor="middle" fill={T.faint} fontSize={11} fontFamily="DM Sans" letterSpacing={2}>{wall.toUpperCase()} WALL</text>
      {wallCabs.length===0&&!wallFeatures.length&&<text x={PL+wallW*ES/2} y={FY-wallH*ES/2+6} textAnchor="middle" fill="#C4B8A8" fontSize={14} fontFamily="DM Sans">← Add cabinets from the left panel</text>}
    </svg>
  );
}

/* ─── FLOOR PLAN CANVAS ───────────────────────────────────────────────────── */
function FloorPlanCanvas({cabs,room,sel,onSel,onMoveIsland}){
  const drag=useRef(null);
  const FS=2.4,P=64,W=P*2+room.width*FS,H=P*2+room.depth*FS;
  const L=P,Tp=P,R=P+room.width*FS,B=P+room.depth*FS;
  const features=room.features||[];

  const getRect=c=>{
    const cw=c.w*FS,cd=c.d*FS;
    if(c.wall==="Island"){const cx=clamp(L+room.width*FS/2-cw/2+(c.ix||0)*FS,L,R-cw),cy=clamp(Tp+room.depth*FS/2-cd/2+(c.iy||0)*FS,Tp,B-cd);return{x:cx,y:cy,w:cw,h:cd};}
    switch(c.wall){
      case"South":return{x:L+c.x*FS,y:B-cd,w:cw,h:cd};
      case"North":return{x:L+c.x*FS,y:Tp,w:cw,h:cd};
      case"East":return{x:R-cd,y:Tp+c.x*FS,w:cd,h:cw};
      case"West":return{x:L,y:Tp+c.x*FS,w:cd,h:cw};
      default:return null;
    }
  };

  const onPD=(e,c)=>{if(c.wall!=="Island")return;e.stopPropagation();onSel(c.id);drag.current={id:c.id,mx0:e.clientX,my0:e.clientY,ix0:c.ix||0,iy0:c.iy||0};};
  const onPM=e=>{if(!drag.current)return;onMoveIsland(drag.current.id,drag.current.ix0+(e.clientX-drag.current.mx0)/FS,drag.current.iy0+(e.clientY-drag.current.my0)/FS);};
  const onPU=()=>{drag.current=null;};

  return(
    <svg width={W} height={H} style={{display:"block",background:T.canvasBg,userSelect:"none",borderRadius:8}}
      onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU} onClick={()=>onSel(null)}>
      <rect x={L} y={Tp} width={room.width*FS} height={room.depth*FS} fill="#EDE5D8" stroke={T.oak} strokeWidth={2.5} rx={2}/>
      {Array.from({length:Math.floor(room.width/12)+1},(_,i)=><line key={`v${i}`} x1={L+i*12*FS} y1={Tp} x2={L+i*12*FS} y2={B} stroke={T.border} strokeWidth={0.8}/>)}
      {Array.from({length:Math.floor(room.depth/12)+1},(_,i)=><line key={`h${i}`} x1={L} y1={Tp+i*12*FS} x2={R} y2={Tp+i*12*FS} stroke={T.border} strokeWidth={0.8}/>)}

      {/* Windows & doors on floor plan */}
      {features.map(f=>{
        const fw=f.width*FS, th=8;
        let fx,fy,fw2,fh2;
        switch(f.wall){
          case"South":fx=L+f.x*FS;fy=B-th;fw2=fw;fh2=th;break;
          case"North":fx=L+f.x*FS;fy=Tp;fw2=fw;fh2=th;break;
          case"East":fx=R-th;fy=Tp+f.x*FS;fw2=th;fh2=fw;break;
          case"West":fx=L;fy=Tp+f.x*FS;fw2=th;fh2=fw;break;
          default:return null;
        }
        if(f.type==="window"){
          return(
            <g key={f.id}>
              <rect x={fx} y={fy} width={fw2} height={fh2} fill={T.winFill} stroke={T.winStroke} strokeWidth={2}/>
              {fw2>fh2
                ?<line x1={fx+fw2/2} y1={fy} x2={fx+fw2/2} y2={fy+fh2} stroke={T.winStroke} strokeWidth={1}/>
                :<line x1={fx} y1={fy+fh2/2} x2={fx+fw2} y2={fy+fh2/2} stroke={T.winStroke} strokeWidth={1}/>
              }
            </g>
          );
        } else {
          // Door opening — clear the wall and show arc
          return(
            <g key={f.id}>
              <rect x={fx} y={fy} width={fw2} height={fh2} fill="#EDE5D8" stroke="none"/>
              <rect x={fx} y={fy} width={fw2} height={fh2} fill="none" stroke={T.faint} strokeWidth={1} strokeDasharray="3,2"/>
            </g>
          );
        }
      })}

      {/* ── UTILITY MARKERS on floor plan ── */}
      {(room.utilities||[]).map(u=>{
        const colors={water:"#4A90D9",drain:"#6B7B8D",gas:"#E07030",electrical:"#D4A017"};
        const col=colors[u.type]||T.muted;
        const r=7;
        let ux,uy;
        switch(u.wall){
          case"South":ux=L+u.x*FS;uy=B-r;break;
          case"North":ux=L+u.x*FS;uy=Tp+r;break;
          case"East":ux=R-r;uy=Tp+u.x*FS;break;
          case"West":ux=L+r;uy=Tp+u.x*FS;break;
          default:return null;
        }
        return(
          <g key={u.id}>
            <circle cx={ux} cy={uy} r={r} fill={col} fillOpacity={0.25} stroke={col} strokeWidth={1.5}/>
            <text x={ux} y={uy+3.5} textAnchor="middle" fill={col} fontSize={8} fontFamily="DM Sans" fontWeight={700}>
              {u.type==="water"?"W":u.type==="drain"?"D":u.type==="gas"?"G":"E"}
            </text>
          </g>
        );
      })}

      {/* Cabinets */}
      {cabs.map(c=>{
        const r=getRect(c);if(!r)return null;
        const isSel=c.id===sel,isUpper=DEFS[c.type]?.row==="upper",isIsland=c.wall==="Island";
        const isLowerCab=!isUpper;
        const isSink=isLowerCab&&notesHas(c,"sink"),isRange=isLowerCab&&(notesHas(c,"range")||notesHas(c,"stove")),isFridge=isLowerCab&&(notesHas(c,"fridge")||notesHas(c,"refrigerator"));
        const fill=isIsland?"#C4A870":isUpper?"#D4CCBC":isFridge?"#C8BEB0":isRange?"#C4A888":"#C8B898";
        // label: appliance name or width
        const lbl=isSink?"SINK":isRange?"RANGE":isFridge?"FRIDGE":`${c.w}"`;
        const lblColor=isSink?"#5A8898":isRange?"#7A5030":isFridge?"#607888":isSel?T.amber:T.muted;
        return(
          <g key={c.id} style={{cursor:isIsland?"grab":"pointer"}} onPointerDown={e=>onPD(e,c)} onClick={e=>{e.stopPropagation();onSel(c.id);}}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={fill} stroke={isSel?T.amber:T.borderDark} strokeWidth={isSel?2:1} strokeDasharray={isUpper?"3,2":"none"} rx={2}/>
            {/* Sink: small basin rectangle */}
            {isSink&&r.w>20&&r.h>14&&<rect x={r.x+r.w*0.2} y={r.y+r.h*0.2} width={r.w*0.6} height={r.h*0.55} fill="#8AAABB" stroke="#6A8898" strokeWidth={1} rx={2}/>}
            {/* Range: 4 small burner dots */}
            {isRange&&r.w>20&&r.h>14&&[[-1,-1],[1,-1],[-1,1],[1,1]].map(([ox,oy],i)=>(
              <circle key={i} cx={r.x+r.w/2+ox*Math.min(r.w*0.18,6)} cy={r.y+r.h/2+oy*Math.min(r.h*0.22,6)} r={Math.min(r.w,r.h)*0.09} fill="none" stroke="#8A7060" strokeWidth={1}/>
            ))}
            {/* Fridge: thin handle line */}
            {isFridge&&r.w>10&&<line x1={r.x+r.w*0.75} y1={r.y+r.h*0.25} x2={r.x+r.w*0.75} y2={r.y+r.h*0.75} stroke="#9A8878" strokeWidth={2} strokeLinecap="round"/>}
            <text x={r.x+r.w/2} y={r.y+r.h/2+(isSink||isRange||isFridge?r.h*0.42:4)} textAnchor="middle" fill={lblColor} fontSize={9} fontFamily="DM Sans" fontWeight={600}>{lbl}</text>
            {isIsland&&<text x={r.x+r.w/2} y={r.y+r.h/2+14} textAnchor="middle" fill={T.faint} fontSize={8} fontFamily="DM Sans">drag</text>}
          </g>
        );
      })}

      <text x={L+room.width*FS/2} y={B+22} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans">South  {room.width}"</text>
      <text x={L+room.width*FS/2} y={Tp-14} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans">North</text>
      <text x={R+22} y={Tp+room.depth*FS/2} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans" transform={`rotate(90 ${R+22} ${Tp+room.depth*FS/2})`}>East  {room.depth}"</text>
      <text x={L-22} y={Tp+room.depth*FS/2} textAnchor="middle" fill={T.muted} fontSize={12} fontFamily="DM Sans" transform={`rotate(-90 ${L-22} ${Tp+room.depth*FS/2})`}>West</text>

      {/* Legend */}
      <rect x={L} y={B+34} width={12} height={10} fill="#C8B898" stroke={T.borderDark} strokeWidth={1} rx={2}/>
      <text x={L+16} y={B+43} fill={T.faint} fontSize={11} fontFamily="DM Sans">Lower/Island</text>
      <rect x={L+100} y={B+34} width={12} height={10} fill="#D4CCBC" stroke={T.borderDark} strokeWidth={1} strokeDasharray="3,2" rx={2}/>
      <text x={L+116} y={B+43} fill={T.faint} fontSize={11} fontFamily="DM Sans">Upper</text>
      <rect x={L+160} y={B+34} width={12} height={10} fill={T.winFill} stroke={T.winStroke} strokeWidth={1.5} rx={1}/>
      <text x={L+176} y={B+43} fill={T.faint} fontSize={11} fontFamily="DM Sans">Window</text>
      {(room.utilities||[]).length>0&&<>
        <circle cx={L+236} cy={B+39} r={5} fill="#4A90D9" fillOpacity={0.3} stroke="#4A90D9" strokeWidth={1}/>
        <text x={L+244} y={B+43} fill={T.faint} fontSize={11} fontFamily="DM Sans">Utility</text>
      </>}
    </svg>
  );
}

/* ─── DESIGN SIDEBAR ──────────────────────────────────────────────────────── */
function DesignSidebar({onAdd,wall,setWall,room,setRoom,cabs,activeWalls}){
  return(
    <div style={{width:240,background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
      <div style={{padding:"20px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:10}}>Active wall</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {activeWalls.map(w=>{
            const count=cabs.filter(c=>c.wall===w).length,isA=wall===w;
            return(
              <button key={w} onClick={()=>setWall(w)} style={{padding:"9px 8px",background:isA?T.amber:"rgba(255,255,255,0.06)",border:`1px solid ${isA?T.amber:"rgba(255,255,255,0.12)"}`,borderRadius:7,color:isA?"#fff":"rgba(255,255,255,0.55)",fontSize:13,fontWeight:600,cursor:"pointer",position:"relative",transition:"all 0.15s"}}>
                {w}
                {count>0&&<span style={{position:"absolute",top:-5,right:-5,background:isA?"#fff":T.amber,color:isA?T.amber:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{padding:"16px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:10}}>Room (inches)</div>
        {[["Width","width"],["Depth","depth"],["Height","height"]].map(([l,k])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{color:"rgba(255,255,255,0.45)",fontSize:13,width:46}}>{l}</span>
            <input type="number" value={room[k]} onChange={e=>setRoom(r=>({...r,[k]:parseInt(e.target.value)||96}))} style={{width:64,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:5,padding:"5px 8px",color:"#FAF7F2",fontSize:13,outline:"none"}}/>
            <span style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>"</span>
          </div>
        ))}
      </div>
      <div style={{padding:"16px",flex:1}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:10}}>Add to {wall.toLowerCase()}</div>
        {Object.entries(DEFS).filter(([t])=>t!=="island").map(([type,def])=>(
          <button key={type} onClick={()=>onAdd(type)} style={{display:"block",width:"100%",padding:"10px 12px",marginBottom:6,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"rgba(255,255,255,0.8)",textAlign:"left",cursor:"pointer",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(193,122,58,0.25)";e.currentTarget.style.borderColor=T.amber;}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>+ {def.label}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{def.w}"W × {def.h}"H × {def.d}"D</div>
          </button>
        ))}
        <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:8}}>Freestanding</div>
          <button onClick={()=>onAdd("island")} style={{display:"block",width:"100%",padding:"10px 12px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"rgba(255,255,255,0.8)",textAlign:"left",cursor:"pointer",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(193,122,58,0.25)";e.currentTarget.style.borderColor=T.amber;}}
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
function PropertiesPanel({c,update,del,activeWalls}){
  if(!c)return(
    <div style={{width:280,background:T.surface,borderLeft:`1px solid ${T.border}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:24,color:T.faint}}><div style={{fontSize:28,marginBottom:8}}>👆</div><div style={{fontSize:14,color:T.muted}}>Select a cabinet<br/>to edit its properties</div></div>
    </div>
  );
  const useStd=c.useStandard!==false;
  const stdW=STD_W[c.type]||[],stdH=STD_H[c.type]||[],stdD=STD_D[c.type]||[];
  const isBase=DEFS[c.type]?.row==="lower";
  const hWarning=isBase&&(c.h<30||c.h>36)?(c.h<30?"Below standard — may be too low":"Above standard — countertop unusually high"):null;
  const IS={...IB,padding:"7px 10px"};
  const DF=({label,k,stdList})=>(
    <div>
      <div style={{fontSize:11,color:T.faint,marginBottom:4,textAlign:"center"}}>{label}</div>
      {useStd&&stdList.length>0
        ?<select value={c[k]} onChange={e=>update(c.id,{[k]:parseFloat(e.target.value)})} style={{...IS,padding:"7px 4px",textAlign:"center"}}>{stdList.map(v=><option key={v} value={v}>{v}"</option>)}</select>
        :<input type="number" value={c[k]} onChange={e=>update(c.id,{[k]:parseFloat(e.target.value)||0})} style={{...IS,padding:"7px 4px",textAlign:"center"}}/>
      }
    </div>
  );
  return(
    <div style={{width:280,background:T.surface,borderLeft:`1px solid ${T.border}`,flexShrink:0,overflowY:"auto",padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h3 style={{fontFamily:"'Lora',serif",fontSize:17,color:T.oak}}>{DEFS[c.type]?.label}</h3>
        <Btn variant="danger" style={{padding:"5px 10px",fontSize:12}} onClick={()=>del(c.id)}>Remove</Btn>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"10px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8}}>
        <div><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{useStd?"Standard sizes":"Custom sizes"}</div><div style={{fontSize:11,color:T.faint}}>{useStd?"Common dimensions":"Free entry"}</div></div>
        <button onClick={()=>update(c.id,{useStandard:!useStd})} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:useStd?T.amber:T.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
          <span style={{position:"absolute",top:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",left:useStd?22:2,display:"block"}}/>
        </button>
      </div>
      <div style={{marginBottom:14}}>
        <Lbl>Dimensions</Lbl>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <DF label='W"' k="w" stdList={stdW}/><DF label='H"' k="h" stdList={stdH}/><DF label='D"' k="d" stdList={stdD}/>
        </div>
        {hWarning&&<div style={{marginTop:8,padding:"8px 10px",background:"#FFF8E8",border:"1px solid #F0D080",borderRadius:6,fontSize:12,color:"#8B6020"}}>⚠ {hWarning}<br/><span style={{color:T.faint}}>Standard base: 34.5" (36" with top)</span></div>}
      </div>
      {[["Material","material",Object.entries(MATS).map(([v,m])=>({v,l:m.label}))],["Door style","doorStyle",DOOR_STYLES]].map(([label,k,opts])=>(
        <div key={k} style={{marginBottom:12}}>
          <Lbl>{label}</Lbl>
          <select value={c[k]} onChange={e=>update(c.id,{[k]:e.target.value})} style={{...IS,width:"100%"}}>{opts.map(o=><option key={typeof o==="string"?o:o.v} value={typeof o==="string"?o:o.v}>{typeof o==="string"?o:o.l}</option>)}</select>
        </div>
      ))}
      <div style={{marginBottom:12}}><Lbl>Finish / color</Lbl><input type="text" value={c.finish} onChange={e=>update(c.id,{finish:e.target.value})} style={{...IS,width:"100%"}}/></div>
      <div style={{marginBottom:12}}>
        <Lbl>Wall</Lbl>
        <select value={c.wall} onChange={e=>update(c.id,{wall:e.target.value})} style={{...IS,width:"100%"}}>
          {[...activeWalls,"Island"].map(w=><option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div style={{marginBottom:16}}>
        <Lbl>Notes</Lbl>
        <input type="text" value={c.notes} onChange={e=>update(c.id,{notes:e.target.value})} style={{...IS,width:"100%"}} placeholder="e.g. sink base, range, fridge"/>
        <p style={{fontSize:11,color:T.faint,marginTop:4}}>Type "sink", "range", or "fridge" to show appliance icons</p>
      </div>
      <div style={{padding:16,background:T.amberLight,border:`1px solid #F0D0A0`,borderRadius:9}}>
        <div style={{fontSize:11,color:T.amber,fontWeight:600,letterSpacing:"0.06em",marginBottom:4}}>UNIT PRICE (EST.)</div>
        <div style={{fontSize:30,fontWeight:700,fontFamily:"'Lora',serif",color:T.oak}}>${getPrice(c).toLocaleString()}</div>
        <div style={{fontSize:12,color:T.muted,marginTop:6,lineHeight:1.7}}>{c.w}"W × {c.h}"H × {c.d}"D<br/>{MATS[c.material]?.label} · {c.doorStyle}</div>
      </div>
    </div>
  );
}

/* ─── QUOTE VIEW ──────────────────────────────────────────────────────────── */
function QuoteView({cabs,project,setProject}){
  const sub=cabs.reduce((s,c)=>s+getPrice(c),0),tax=Math.round(sub*0.08),total=sub+tax;
  const IS={...IB,padding:"7px 10px"};
  return(
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:860}}>
      <div className="fade-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
          <div><h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:4}}>Project Quote</h1><p style={{fontSize:14,color:T.muted}}>{new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</p></div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[["Project name","name"],["Client","client"],["Address","address"],["City","city"],["Province","province"],["Postal code","postal"],["Phone","phone"],["Email","email"]].map(([l,k])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,color:T.muted,width:90}}>{l}</span><input value={project[k]} onChange={e=>setProject(p=>({...p,[k]:e.target.value}))} style={{...IS,width:220}}/></div>
            ))}
          </div>
        </div>
        {cabs.length===0
          ?<Card><p style={{color:T.faint,textAlign:"center",padding:"40px 0",fontSize:15}}>No cabinets yet — go to Design to add some.</p></Card>
          :<>
            <Card style={{marginBottom:24,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                <thead><tr style={{background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`}}>{["#","Type","W × H × D","Wall","Material","Door Style","Price"].map(h=><th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:T.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                <tbody>{cabs.map((c,i)=>(
                  <tr key={c.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"#fff":T.surface}}>
                    <td style={{padding:"11px 14px",color:T.faint}}>{String(i+1).padStart(2,"00")}</td>
                    <td style={{padding:"11px 14px",fontWeight:500}}>{DEFS[c.type]?.label}{c.notes?` (${c.notes})`:""}</td>
                    <td style={{padding:"11px 14px",color:T.muted}}>{c.w}" × {c.h}" × {c.d}"</td>
                    <td style={{padding:"11px 14px",color:T.muted}}>{c.wall}</td>
                    <td style={{padding:"11px 14px",color:T.muted}}>{MATS[c.material]?.label}</td>
                    <td style={{padding:"11px 14px",color:T.muted}}>{c.doorStyle}</td>
                    <td style={{padding:"11px 14px",fontWeight:600,color:T.oak,textAlign:"right"}}>${getPrice(c).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:24}}>
              <Card style={{width:300,padding:20}}>
                {[["Subtotal",sub],["Tax (8%)",tax]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:15}}><span style={{color:T.muted}}>{l}</span><span>${v.toLocaleString()}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"14px 0 0",alignItems:"center"}}>
                  <span style={{fontSize:18,fontWeight:700,fontFamily:"'Lora',serif",color:T.ink}}>Total</span>
                  <span style={{fontSize:22,fontWeight:700,fontFamily:"'Lora',serif",color:T.oak}}>${total.toLocaleString()}</span>
                </div>
              </Card>
            </div>
            <p style={{fontSize:13,color:T.faint,marginBottom:16,lineHeight:1.6}}>Estimate based on listed dimensions and materials. Final pricing subject to site verification.</p>
            <Btn onClick={()=>window.print()}>🖨 Print quote</Btn>
          </>
        }
      </div>
    </div>
  );
}

/* ─── ORDER SHEET ─────────────────────────────────────────────────────────── */
function OrderSheet({cabs,project,room}){
  const totalPrice=cabs.reduce((s,c)=>s+getPrice(c),0);
  const features=room.features||[];
  return(
    <div style={{flex:1,overflowY:"auto",padding:"36px 48px",maxWidth:900}}>
      <div className="fade-up">
        <div style={{textAlign:"center",marginBottom:32}}><h1 style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.ink,marginBottom:4}}>Manufacturer Order Sheet</h1><p style={{fontSize:14,color:T.muted}}>{project.name} — {project.client||"No client"} — {new Date().toLocaleDateString()}</p></div>

        {/* Customer info */}
        {(project.address||project.phone||project.email)&&(
          <Card style={{marginBottom:16}}>
            <Lbl style={{marginBottom:10}}>Customer contact</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,fontSize:14}}>
              {project.address&&<div><span style={{color:T.faint}}>Address:</span> {project.address}{project.city?`, ${project.city}`:""}{project.province?`, ${project.province}`:""} {project.postal}</div>}
              {project.phone&&<div><span style={{color:T.faint}}>Phone:</span> {project.phone}</div>}
              {project.email&&<div><span style={{color:T.faint}}>Email:</span> {project.email}</div>}
            </div>
          </Card>
        )}

        <Card style={{marginBottom:24}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
            {[["Project",project.name||"—"],["Client",project.client||"—"],["Room",`${(room.width/12).toFixed(1)}' × ${(room.depth/12).toFixed(1)}'`],["Ceiling",`${room.height}"`]].map(([l,v])=>(
              <div key={l}><Lbl>{l}</Lbl><div style={{fontSize:15,fontWeight:500}}>{v}</div></div>
            ))}
          </div>
          {/* Room options row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
            <div><Lbl>Box material</Lbl><div style={{fontSize:14,fontWeight:500}}>{BOX_MATS[room.boxMaterial]?.label||"Birch Plywood"}</div></div>
            <div><Lbl>To ceiling</Lbl><div style={{fontSize:14,fontWeight:500}}>{room.toCeiling?"Yes":"No"}</div></div>
            <div><Lbl>Crown moulding</Lbl><div style={{fontSize:14,fontWeight:500}}>{room.crownMoulding?"Yes":"No"}</div></div>
            <div><Lbl>Bulkhead</Lbl><div style={{fontSize:14,fontWeight:500}}>{room.bulkheadHeight>0?`${room.bulkheadHeight}" drop`:"None"}</div></div>
          </div>
          {features.length>0&&(
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
              <Lbl style={{marginBottom:8}}>Room features</Lbl>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {features.map(f=><div key={f.id} style={{fontSize:13,color:T.muted,background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 10px"}}>{f.type==="window"?"🪟":"🚪"} {f.type} on {f.wall} wall — {f.width}" wide at {f.x}" from left</div>)}
              </div>
            </div>
          )}
          {(room.appliances||[]).length>0&&(
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
              <Lbl style={{marginBottom:8}}>Appliances</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                {(room.appliances||[]).map(a=><div key={a.id} style={{fontSize:13,color:T.muted,background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px"}}><div style={{fontWeight:500,color:T.ink,marginBottom:2}}>{a.label}</div>{a.w}" × {a.h}" × {a.d}" — {a.wall} wall</div>)}
              </div>
            </div>
          )}
          {(room.utilities||[]).length>0&&(
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
              <Lbl style={{marginBottom:8}}>Plumbing, gas & electrical</Lbl>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                {(room.utilities||[]).map(u=><div key={u.id} style={{fontSize:13,color:T.muted,background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 10px"}}>{u.icon} {u.label} — {u.wall} wall at {u.x}" from left{u.notes?` (${u.notes})`:""}</div>)}
              </div>
            </div>
          )}
        </Card>
        {[...ALL_WALLS,"Island"].map(w=>{
          const wc=cabs.filter(c=>c.wall===w);if(!wc.length)return null;
          return(
            <div key={w} style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><h3 style={{fontFamily:"'Lora',serif",fontSize:17,color:T.oak}}>{w} wall</h3><span style={{fontSize:13,color:T.muted}}>{wc.length} unit{wc.length!==1?"s":""}</span></div>
              <Card style={{padding:0,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`}}>{["#","Type","W","H","D","Material","Door Style","Finish","Notes"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:T.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                  <tbody>{wc.map((c,i)=>(
                    <tr key={c.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"#fff":T.surface}}>
                      <td style={{padding:"9px 12px",color:T.faint}}>{i+1}</td>
                      <td style={{padding:"9px 12px",fontWeight:500}}>{DEFS[c.type]?.label}</td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:T.oak}}>{c.w}</td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:T.oak}}>{c.h}</td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:T.oak}}>{c.d}</td>
                      <td style={{padding:"9px 12px",color:T.muted}}>{MATS[c.material]?.label}</td>
                      <td style={{padding:"9px 12px",color:T.muted}}>{c.doorStyle}</td>
                      <td style={{padding:"9px 12px",color:T.muted}}>{c.finish||"—"}</td>
                      <td style={{padding:"9px 12px",color:T.faint}}>{c.notes||"—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>
            </div>
          );
        })}
        {cabs.length===0&&<Card><p style={{color:T.faint,textAlign:"center",padding:"40px 0"}}>No cabinets to order yet.</p></Card>}
        {cabs.length>0&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24,paddingTop:20,borderTop:`1px solid ${T.border}`}}>
            <span style={{fontSize:15,color:T.muted}}>{cabs.length} unit{cabs.length!==1?"s":""} — Est. ${totalPrice.toLocaleString()}</span>
            <Btn onClick={()=>window.print()}>🖨 Print / Export PDF</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CLIENT PRESENTATION VIEW ───────────────────────────────────────────── */
function PresentationView({cabs,room,project,activeWalls}){
  const total=cabs.reduce((s,c)=>s+getPrice(c),0);
  const tax=Math.round(total*0.08);
  const date=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const features=room.features||[];

  // Group by material for summary
  const matGroups={};
  cabs.forEach(c=>{
    const k=MATS[c.material]?.label||c.material;
    matGroups[k]=(matGroups[k]||0)+1;
  });

  // Mini elevation SVG for each wall — read-only, scaled to fit
  function MiniElevation({wall}){
    const wallCabs=cabs.filter(c=>c.wall===wall);
    const wallFeats=(features||[]).filter(f=>f.wall===wall);
    if(!wallCabs.length&&!wallFeats.length) return null;
    const ww=wallWidth(wall,room);
    const wh=room.height;
    const ES2=3.2;
    const PL=40,PR=20,PT=28,PB=44;
    const SW=PL+ww*ES2+PR, SH=PT+wh*ES2+PB, FY=PT+wh*ES2;
    const getCabY=c=>DEFS[c.type].row==="upper"?FY-(UPPER_BTM+c.h)*ES2:FY-c.h*ES2;
    const bf="#C19A6B",df="#D4AF82",de="#A8825A",si="#C8A474",tf="#5C3D1E",ct="#8B6340",hn="#8B7355";
    return(
      <svg width={SW} height={SH} style={{display:"block",background:"#F8F4EE",borderRadius:6,border:`1px solid ${T.border}`}}>
        <rect x={PL} y={PT} width={ww*ES2} height={wh*ES2} fill="#EDE8E0" stroke={T.borderDark} strokeWidth={0.8}/>
        {/* Upper zone dashed */}
        <rect x={PL} y={PT} width={ww*ES2} height={(wh-UPPER_BTM)*ES2} fill="none" stroke="#D4C0A0" strokeWidth={0.5} strokeDasharray="4,4"/>
        {/* Wall label */}
        <text x={PL+ww*ES2/2} y={PT-10} textAnchor="middle" fill={T.faint} fontSize={9} fontFamily="DM Sans" letterSpacing={1}>{wall.toUpperCase()} WALL</text>
        {/* Features */}
        {wallFeats.map(f=>{
          const fx=PL+f.x*ES2, fw=f.width*ES2;
          const ff=f.fromFloor??(f.type==="door"?0:40), fh2=(f.height??(f.type==="door"?80:36))*ES2;
          const fy=FY-(ff+(f.height??(f.type==="door"?80:36)))*ES2;
          if(f.type==="window") return(
            <g key={f.id}>
              <rect x={fx} y={fy} width={fw} height={fh2} fill={T.winFill} stroke={T.winStroke} strokeWidth={1}/>
              <line x1={fx+fw/2} y1={fy} x2={fx+fw/2} y2={fy+fh2} stroke={T.winStroke} strokeWidth={0.8}/>
              <line x1={fx} y1={fy+fh2/2} x2={fx+fw} y2={fy+fh2/2} stroke={T.winStroke} strokeWidth={0.8}/>
              <rect x={fx-3} y={fy-3} width={fw+6} height={3} fill="#C4A870" rx={1}/>
              <rect x={fx-3} y={fy+fh2} width={fw+6} height={3} fill="#C4A870" rx={1}/>
            </g>
          );
          return(
            <g key={f.id}>
              <rect x={fx} y={FY-fh2} width={fw} height={fh2} fill="#F8F4EE" stroke="none"/>
              <line x1={fx} y1={FY-fh2} x2={fx} y2={FY} stroke={T.borderDark} strokeWidth={1.5}/>
              <line x1={fx+fw} y1={FY-fh2} x2={fx+fw} y2={FY} stroke={T.borderDark} strokeWidth={1.5}/>
              <path d={`M ${fx} ${FY-fh2} A ${fw} ${fw} 0 0 1 ${fx+fw} ${FY-fh2}`} fill="rgba(193,122,58,0.05)" stroke={T.muted} strokeWidth={0.6} strokeDasharray="3,3"/>
            </g>
          );
        })}
        {/* Countertops */}
        {wallCabs.filter(c=>DEFS[c.type]?.row==="lower").map(c=>(
          <rect key={`ct${c.id}`} x={PL+c.x*ES2-1} y={FY-c.h*ES2-2.2*ES2} width={c.w*ES2+2} height={2.2*ES2} fill={ct} rx={1}/>
        ))}
        {/* Cabinets */}
        {wallCabs.map(c=>{
          const isLower=DEFS[c.type]?.row==="lower";
          const cx=PL+c.x*ES2, cyy=getCabY(c), cw=c.w*ES2, ch=c.h*ES2;
          const tkH=isLower?TOEKICK*ES2:0, bodyH=ch-tkH, nD=cw>=27*ES2?2:1, dw=cw/nD;
          const isSink=isLower&&notesHas(c,"sink"), isRange=isLower&&(notesHas(c,"range")||notesHas(c,"stove")), isFridge=isLower&&(notesHas(c,"fridge")||notesHas(c,"refrigerator"));
          return(
            <g key={c.id}>
              <rect x={cx} y={cyy} width={cw} height={bodyH} fill={isFridge?"#D4C8B8":isRange?"#C8A888":bf} stroke={de} strokeWidth={0.8} rx={1}/>
              {isLower&&<rect x={cx+2} y={cyy+bodyH} width={cw-4} height={tkH} fill={tf} rx={1}/>}
              {isSink&&<rect x={cx+cw*0.15} y={cyy+bodyH*0.25} width={cw*0.7} height={bodyH*0.5} fill="#8AAABB" stroke="#6A8898" strokeWidth={0.8} rx={2}/>}
              {isRange&&(()=>{const br=4,gap=Math.min(cw*0.22,12);return [[-1,-1],[1,-1],[-1,1],[1,1]].map(([ox,oy],i)=><g key={i}><circle cx={cx+cw/2+ox*gap} cy={cyy+bodyH/2+oy*gap} r={br} fill="none" stroke="#8A7060" strokeWidth={1}/></g>);})()}
              {isFridge&&<line x1={cx+cw*0.75} y1={cyy+bodyH*0.2} x2={cx+cw*0.75} y2={cyy+bodyH*0.8} stroke="#A09080" strokeWidth={2} strokeLinecap="round"/>}
              {!isSink&&!isRange&&!isFridge&&Array.from({length:nD}).map((_,i)=>{
                const ddx=cx+i*dw;
                return(
                  <g key={i}>
                    <rect x={ddx+2} y={cyy+2} width={dw-4} height={bodyH-4} fill={df} stroke={de} strokeWidth={0.6} rx={1}/>
                    {c.doorStyle==="Shaker"&&<rect x={ddx+5} y={cyy+5} width={dw-10} height={bodyH-10} fill="none" stroke={si} strokeWidth={0.7} rx={1}/>}
                    <rect x={ddx+(i===0?dw-8:4)} y={cyy+bodyH/2-5} width={4} height={10} fill={hn} rx={2}/>
                  </g>
                );
              })}
              <text x={cx+cw/2} y={FY+14} textAnchor="middle" fill={T.faint} fontSize={8} fontFamily="DM Sans">{c.w}"</text>
            </g>
          );
        })}
        {/* Floor */}
        <rect x={PL} y={FY} width={ww*ES2} height={3} fill={T.oak} opacity={0.35}/>
        {/* Dim */}
        <line x1={PL} y1={FY+24} x2={PL+ww*ES2} y2={FY+24} stroke={T.borderDark} strokeWidth={0.8}/>
        <line x1={PL} y1={FY+20} x2={PL} y2={FY+28} stroke={T.borderDark} strokeWidth={0.8}/>
        <line x1={PL+ww*ES2} y1={FY+20} x2={PL+ww*ES2} y2={FY+28} stroke={T.borderDark} strokeWidth={0.8}/>
        <text x={PL+ww*ES2/2} y={FY+38} textAnchor="middle" fill={T.muted} fontSize={9} fontFamily="DM Sans">{ww}" ({(ww/12).toFixed(1)}')</text>
      </svg>
    );
  }

  return(
    <div style={{flex:1,overflowY:"auto",background:"#F7F3ED"}}>
      <style>{`
        @media print {
          @page { margin: 0.6in; size: letter portrait; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-page { background: white !important; }
        }
      `}</style>

      {cabs.length===0 ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:16}}>
          <div style={{fontSize:32}}>📋</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:20,color:T.oak}}>No design yet</div>
          <div style={{fontSize:14,color:T.muted}}>Go to Design and add some cabinets first, then come back here.</div>
        </div>
      ) : (<>

      {/* Toolbar — hidden on print */}
      <div className="no-print" style={{background:"#fff",borderBottom:`1px solid ${T.border}`,
        padding:"10px 32px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:14,color:T.muted,flex:1}}>
          Preview how this will look to your client — then print or save as PDF.
        </span>
        <Btn onClick={()=>window.print()} style={{padding:"8px 20px"}}>
          🖨 Print / Save as PDF
        </Btn>
      </div>

      {/* Page */}
      <div className="print-page" style={{maxWidth:820,margin:"0 auto",background:"#fff",
        padding:"56px 64px",minHeight:"100vh",boxShadow:"0 2px 24px rgba(44,31,14,0.08)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          paddingBottom:28,borderBottom:`2px solid ${T.oak}`,marginBottom:36}}>
          <div>
            <div style={{fontFamily:"'Lora',serif",fontSize:28,fontWeight:600,color:T.oak,marginBottom:4}}>
              Kitchen Design Proposal
            </div>
            <div style={{fontSize:14,color:T.muted}}>{date}</div>
          </div>
          <div style={{textAlign:"right"}}>
            {project.client&&<div style={{fontFamily:"'Lora',serif",fontSize:18,color:T.ink,marginBottom:4}}>
              Prepared for: <strong>{project.client}</strong>
            </div>}
            {project.address&&<div style={{fontSize:13,color:T.muted}}>{project.address}</div>}
            {(project.city||project.province)&&<div style={{fontSize:13,color:T.muted}}>{[project.city,project.province,project.postal].filter(Boolean).join(", ")}</div>}
            {project.phone&&<div style={{fontSize:13,color:T.muted}}>{project.phone}</div>}
            {project.email&&<div style={{fontSize:13,color:T.muted}}>{project.email}</div>}
            <div style={{fontSize:14,color:T.muted,marginTop:4}}>{project.name}</div>
            <div style={{fontSize:13,color:T.faint,marginTop:4}}>
              {(room.width/12).toFixed(1)}' × {(room.depth/12).toFixed(1)}' · {room.height}" ceiling
            </div>
          </div>
        </div>

        {/* Design highlights */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:40}}>
          {[
            ["Cabinets",`${cabs.length} unit${cabs.length!==1?"s":""}`,activeWalls.length+" wall"+(activeWalls.length!==1?"s":"")],
            ["Primary material",Object.entries(matGroups).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Maple",`${cabs.length} cabinets`],
            ["Door style",cabs[0]?.doorStyle||"Shaker",cabs[0]?.finish||"Natural finish"],
          ].map(([l,v,sub])=>(
            <div key={l} style={{padding:"16px 20px",background:T.amberLight,
              borderLeft:`3px solid ${T.amber}`,borderRadius:"0 8px 8px 0"}}>
              <div style={{fontSize:11,fontWeight:600,color:T.amber,letterSpacing:"0.08em",
                textTransform:"uppercase",marginBottom:6}}>{l}</div>
              <div style={{fontSize:18,fontWeight:600,fontFamily:"'Lora',serif",color:T.oak}}>{v}</div>
              {sub&&<div style={{fontSize:12,color:T.muted,marginTop:3}}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Room options summary */}
        {(room.toCeiling||room.crownMoulding||room.bulkheadHeight>0||(room.appliances||[]).length>0||(room.utilities||[]).length>0)&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:40}}>
            {/* Appliances */}
            {(room.appliances||[]).length>0&&(
              <div style={{padding:"16px 20px",border:`1px solid ${T.border}`,borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:600,color:T.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Appliances</div>
                {(room.appliances||[]).map(a=>(
                  <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.surface}`,fontSize:13}}>
                    <span style={{color:T.ink,fontWeight:500}}>{a.label}</span>
                    <span style={{color:T.muted}}>{a.w}" × {a.h}" × {a.d}" — {a.wall} wall</span>
                  </div>
                ))}
              </div>
            )}
            {/* Room options */}
            <div style={{padding:"16px 20px",border:`1px solid ${T.border}`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:600,color:T.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Specifications</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:13}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.muted}}>Box material</span><span style={{color:T.ink}}>{BOX_MATS[room.boxMaterial]?.label||"Birch Plywood"}</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.muted}}>Cabinets to ceiling</span><span style={{color:T.ink}}>{room.toCeiling?"Yes":"No"}</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.muted}}>Crown moulding</span><span style={{color:T.ink}}>{room.crownMoulding?"Yes":"No"}</span></div>
                {room.bulkheadHeight>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.muted}}>Bulkhead drop</span><span style={{color:T.ink}}>{room.bulkheadHeight}"</span></div>}
                {(room.utilities||[]).length>0&&<div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${T.surface}`}}>
                  <div style={{fontSize:11,fontWeight:600,color:T.muted,marginBottom:4}}>UTILITY LOCATIONS</div>
                  {(room.utilities||[]).map(u=><div key={u.id} style={{color:T.muted,marginBottom:3}}>{u.icon} {u.label} — {u.wall} wall at {u.x}" from left{u.notes?` (${u.notes})`:""}</div>)}
                </div>}
              </div>
            </div>
          </div>
        )}

        {/* Wall elevations */}
        <div style={{marginBottom:40}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:18,color:T.oak,marginBottom:18,
            paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
            Wall Elevations
          </div>
          {/* Render walls in pairs */}
          {(() => {
            const wallsWithCabs = activeWalls.filter(w =>
              cabs.some(c=>c.wall===w) || features.some(f=>f.wall===w)
            );
            return wallsWithCabs.map(w=>(
              <div key={w} style={{marginBottom:28}}>
                <MiniElevation wall={w}/>
              </div>
            ));
          })()}
          {cabs.some(c=>c.wall==="Island")&&(
            <div style={{padding:"14px 18px",background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:8,fontSize:14,color:T.muted}}>
              ⬜ Island — {cabs.find(c=>c.wall==="Island")?.w}" × {cabs.find(c=>c.wall==="Island")?.h}" × {cabs.find(c=>c.wall==="Island")?.d}" — included in cabinet count above
            </div>
          )}
        </div>

        {/* Cabinet list — clean client version (no technical jargon) */}
        <div style={{marginBottom:40}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:18,color:T.oak,marginBottom:18,
            paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
            Cabinet Specifications
          </div>
          {activeWalls.concat(cabs.some(c=>c.wall==="Island")?["Island"]:[]).map(w=>{
            const wc=cabs.filter(c=>c.wall===w); if(!wc.length) return null;
            return(
              <div key={w} style={{marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:600,color:T.oak,letterSpacing:"0.06em",
                  textTransform:"uppercase",marginBottom:8}}>{w} Wall</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      {["Type","Size (W × H × D)","Material","Door Style","Notes"].map(h=>(
                        <th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:11,
                          fontWeight:600,color:T.faint,letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wc.map((c,i)=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${T.surface}`,
                        background:i%2===0?"#fff":T.surface}}>
                        <td style={{padding:"8px 10px",fontWeight:500,color:T.ink}}>{DEFS[c.type]?.label}</td>
                        <td style={{padding:"8px 10px",color:T.muted}}>{c.w}" × {c.h}" × {c.d}"</td>
                        <td style={{padding:"8px 10px",color:T.muted}}>{MATS[c.material]?.label}</td>
                        <td style={{padding:"8px 10px",color:T.muted}}>{c.doorStyle}</td>
                        <td style={{padding:"8px 10px",color:T.faint,fontStyle:c.notes?"normal":"italic"}}>
                          {c.notes||"—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Investment summary */}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:40}}>
          <div style={{width:300,padding:"24px 28px",background:T.amberLight,
            border:`1px solid #E8C888`,borderRadius:10}}>
            <div style={{fontFamily:"'Lora',serif",fontSize:16,color:T.ink,
              marginBottom:16,paddingBottom:12,borderBottom:`1px solid #E8C888`}}>
              Investment Summary
            </div>
            {[["Cabinet supply",total],["Installation ($25/cabinet)",cabs.length*25]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                marginBottom:8,fontSize:14}}>
                <span style={{color:T.muted}}>{l}</span>
                <span style={{color:T.text}}>${v.toLocaleString()}</span>
              </div>
            ))}
            <div style={{height:1,background:"#E8C888",margin:"12px 0"}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:14}}>
              <span style={{color:T.muted}}>Subtotal</span>
              <span style={{color:T.text}}>${(total+cabs.length*25).toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,fontSize:14}}>
              <span style={{color:T.muted}}>Tax (8%)</span>
              <span style={{color:T.text}}>${Math.round((total+cabs.length*25)*0.08).toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,color:T.ink}}>Total</span>
              <span style={{fontFamily:"'Lora',serif",fontSize:24,fontWeight:600,color:T.oak}}>
                ${Math.round((total+cabs.length*25)*1.08).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{paddingTop:20,borderTop:`1px solid ${T.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:12,color:T.faint,lineHeight:1.6}}>
            This proposal is valid for 30 days.<br/>
            Pricing subject to final site measurement and material availability.
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Lora',serif",fontSize:14,color:T.oak,fontWeight:600}}>CabinetWorks</div>
            <div style={{fontSize:12,color:T.faint,marginTop:2}}>Signature: ______________________</div>
            <div style={{fontSize:12,color:T.faint,marginTop:2}}>Date: ___________________________</div>
          </div>
        </div>

      </div>
    </>)}
    </div>
  );
}

/* ─── MAIN APP ────────────────────────────────────────────────────────────── */
export default function App(){
  const [view,setView]=useState("setup");
  const [subView,setSubView]=useState("elevation");
  const [project,setProject]=useState({name:"New Kitchen Project",client:"",address:"",city:"",province:"",postal:"",phone:"",email:""});
  const [room,setRoom]=useState({width:144,depth:120,height:96,features:[],appliances:[],utilities:[],toCeiling:false,crownMoulding:false,bulkheadHeight:0,boxMaterial:"birch_ply"});
  const [activeWalls,setActiveWalls]=useState(["South","West"]);
  const [cabs,setCabs]=useState([]);
  const [sel,setSel]=useState(null);
  const [wall,setWall]=useState("South");
  const [zoom,setZoom]=useState(1);
  const zoomIn=()=>setZoom(z=>Math.min(2,+(z+0.2).toFixed(1)));
  const zoomOut=()=>setZoom(z=>Math.max(0.4,+(z-0.2).toFixed(1)));
  const zoomReset=()=>setZoom(1);

  const ww=wallWidth(wall,room);

  const addCab=type=>{const c=makeCab(type,type==="island"?"Island":wall,cabs,ww);setCabs(p=>[...p,c]);setSel(c.id);};
  const applyRecs=rcs=>{
    const nc=(rcs||[]).filter(r=>DEFS[r.type]&&(r.wall==="Island"||activeWalls.includes(r.wall))).map(r=>{
      const rw=wallWidth(r.wall,room);
      return{id:uid(),type:r.type,w:clamp(r.w||DEFS[r.type].w,9,96),h:clamp(r.h||DEFS[r.type].h,12,96),
        d:clamp(r.d||DEFS[r.type].d,9,36),x:clamp(r.x||3,0,rw-(r.w||DEFS[r.type].w)),
        ix:0,iy:0,wall:r.wall||activeWalls[0],material:r.material||"maple",
        doorStyle:r.doorStyle||"Shaker",finish:r.finish||"Natural",notes:r.notes||"",useStandard:true};
    });
    setCabs(nc);
  };
  const updateCab=(id,ch)=>setCabs(p=>p.map(c=>c.id===id?{...c,...ch}:c));
  const deleteCab=id=>{setCabs(p=>p.filter(c=>c.id!==id));setSel(null);};
  const moveCab=(id,x)=>setCabs(p=>p.map(c=>c.id===id?{...c,x:clamp(x,0,ww-c.w)}:c));
  const moveIsland=(id,ix,iy)=>setCabs(p=>p.map(c=>c.id===id?{...c,ix,iy}:c));
  const handleSetActiveWalls=walls=>{setActiveWalls(walls);if(!walls.includes(wall)&&walls.length>0)setWall(walls[0]);};

  const selCab=cabs.find(c=>c.id===sel);
  const total=cabs.reduce((s,c)=>s+getPrice(c),0);

  const STEPS=[{id:"setup",n:"01",label:"Room setup"},{id:"recs",n:"02",label:"AI recommendations"},{id:"design",n:"03",label:"Design"},{id:"present",n:"04",label:"Client view"},{id:"quote",n:"05",label:"Quote"},{id:"order",n:"06",label:"Order sheet"}];

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg,overflow:"hidden"}}>
      <GS/>
      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,height:58,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",boxShadow:"0 1px 4px rgba(44,31,14,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:18,fontWeight:600,color:T.oak}}>CabinetWorks</div>
          <div style={{width:1,height:22,background:T.border}}/>
          <span style={{fontSize:14,color:T.muted}}>{project.name}</span>
        </div>
        <nav style={{display:"flex",gap:2,height:"100%",alignItems:"stretch"}}>
          {STEPS.map(s=>{
            const isA=view===s.id,isDone=STEPS.findIndex(x=>x.id===view)>STEPS.findIndex(x=>x.id===s.id);
            return <button key={s.id} onClick={()=>setView(s.id)} style={{padding:"0 16px",background:"transparent",border:"none",borderBottom:`3px solid ${isA?T.amber:"transparent"}`,color:isA?T.amber:isDone?T.oak:T.faint,fontSize:13,fontWeight:isA?600:400,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all 0.15s",whiteSpace:"nowrap"}}><span style={{fontSize:11,fontWeight:700,opacity:0.6}}>{s.n}</span>{s.label}</button>;
          })}
        </nav>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:20,fontWeight:600,color:T.oak}}>${total.toLocaleString()}</div>
          <div style={{fontSize:11,color:T.faint,letterSpacing:"0.06em",textTransform:"uppercase"}}>Est. total</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {view==="setup"&&<RoomSetupView room={room} setRoom={setRoom} activeWalls={activeWalls} setActiveWalls={handleSetActiveWalls} onNext={()=>setView("recs")}/>}
        {view==="recs"&&<RecommendationsView room={room} activeWalls={activeWalls} onApply={rcs=>{applyRecs(rcs);setView("design");}} onSkip={()=>setView("design")}/>}
        {view==="design"&&<>
          <DesignSidebar onAdd={addCab} wall={wall} setWall={setWall} room={room} setRoom={setRoom} cabs={cabs} activeWalls={activeWalls}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
            <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"0 20px",display:"flex",alignItems:"stretch",flexShrink:0,height:44}}>
              {[["elevation","Elevation view"],["floorplan","Floor plan"]].map(([v,l])=>(
                <button key={v} onClick={()=>setSubView(v)} style={{padding:"0 16px",background:"none",border:"none",borderBottom:`3px solid ${subView===v?T.amber:"transparent"}`,color:subView===v?T.amber:T.muted,fontSize:13,fontWeight:subView===v?600:400,cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
              ))}
              <div style={{flex:1}}/>
              {/* Zoom controls */}
              <div style={{display:"flex",alignItems:"center",gap:4,marginRight:16}}>
                <button onClick={zoomOut} style={{width:28,height:28,background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.muted}}>−</button>
                <button onClick={zoomReset} style={{minWidth:46,height:28,background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,fontSize:11,cursor:"pointer",color:T.muted,fontFamily:"monospace"}}>{Math.round(zoom*100)}%</button>
                <button onClick={zoomIn}  style={{width:28,height:28,background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.muted}}>+</button>
              </div>
              <div style={{display:"flex",alignItems:"center",fontSize:13,color:T.faint}}>
                {cabs.length} cabinet{cabs.length!==1?"s":""}
                {(room.features||[]).length>0&&<span style={{marginLeft:8,color:T.winStroke}}>{(room.features||[]).length} feature{(room.features||[]).length!==1?"s":""}</span>}
                {cabs.length>0&&<span style={{marginLeft:8,color:T.amber,fontWeight:600}}>${total.toLocaleString()}</span>}
              </div>
            </div>
            <div style={{flex:1,overflow:"auto",padding:28}}>
              <div style={{transform:`scale(${zoom})`,transformOrigin:"top left",display:"inline-block"}}>
                {subView==="elevation"
                  ?<ElevationCanvas cabs={cabs} wall={wall} wallW={ww} wallH={room.height} sel={sel} onSel={setSel} onMove={moveCab} features={room.features||[]} utilities={room.utilities||[]}/>
                  :<FloorPlanCanvas cabs={cabs} room={room} sel={sel} onSel={setSel} onMoveIsland={moveIsland}/>
                }
              </div>
            </div>
          </div>
          <PropertiesPanel c={selCab} update={updateCab} del={deleteCab} activeWalls={[...activeWalls,"Island"]}/>
        </>}
        {view==="quote"&&<QuoteView cabs={cabs} project={project} setProject={setProject}/>}
        {view==="present"&&<PresentationView cabs={cabs} room={room} project={project} activeWalls={activeWalls}/>}
        {view==="order"&&<OrderSheet cabs={cabs} project={project} room={room}/>}
      </div>
    </div>
  );
}
