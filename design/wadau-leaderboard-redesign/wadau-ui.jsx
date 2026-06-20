/* Wadau Cup — shared UI kit for the player prototype. Assumes .wc theme vars are in scope. */
(function injectUICSS() {
  if (document.getElementById('wc-ui-styles')) return;
  const css = `
  .wc-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; white-space:nowrap;
            font-family:inherit; font-weight:600; font-size:15px; padding:15px 18px; border-radius:14px;
            border:1px solid transparent; cursor:pointer; transition:transform .08s, opacity .15s, background .15s; letter-spacing:-0.01em; }
  .wc-btn:active { transform:scale(0.985); }
  .wc-btn-primary { background:var(--lime); color:var(--on-lime); box-shadow:0 8px 24px -10px var(--lime-line); }
  .wc-btn-primary:disabled { background:var(--surface-3); color:var(--faint); box-shadow:none; cursor:not-allowed; }
  .wc-btn-ghost { background:transparent; border-color:var(--line-2); color:var(--text); }
  .wc-btn-gold { background:var(--gold-grad); color:#1a1206; box-shadow:0 8px 24px -10px var(--gold-line); }
  .wc-btn-dark { background:var(--surface-3); color:var(--text); }

  .wc-iconbtn { width:38px; height:38px; border-radius:11px; border:1px solid var(--line-2); background:var(--surface);
                color:var(--text); display:flex; align-items:center; justify-content:center; cursor:pointer; flex:none; transition:border-color .12s; }
  .wc-iconbtn:hover { border-color:var(--text); }

  .wc-sheet-scrim { position:absolute; inset:0; background:rgba(3,6,10,0.62); backdrop-filter:blur(3px);
                    z-index:40; display:flex; align-items:flex-end; animation:wc-fade .18s ease; }
  .wc-sheet { width:100%; background:var(--surface); border-radius:22px 22px 0 0; border-top:1px solid var(--line-2);
              max-height:88%; display:flex; flex-direction:column; animation:wc-slideup .26s cubic-bezier(.2,.8,.25,1); box-shadow:0 -20px 50px -20px rgba(0,0,0,.6); }
  .wc-sheet-grip { width:38px; height:4px; border-radius:2px; background:var(--line-2); margin:10px auto 4px; flex:none; }
  @keyframes wc-fade { from{opacity:0} to{opacity:1} }
  @keyframes wc-slideup { from{transform:translateY(100%)} to{transform:translateY(0)} }

  .wc-tier-badge { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center;
                   font-family:var(--mono); font-weight:600; font-size:17px; flex:none; }
  .wc-chiprow { display:flex; gap:7px; }
  .wc-chip { font-family:var(--mono); font-size:11px; font-weight:500; letter-spacing:0.04em; text-transform:uppercase;
             padding:5px 10px; border-radius:999px; border:1px solid var(--line-2); color:var(--dim); cursor:pointer; white-space:nowrap; }
  .wc-chip.on { background:var(--text); color:var(--bg); border-color:var(--text); }

  .wc-screen { position:absolute; inset:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; }
  .wc-screen::-webkit-scrollbar { display:none; }
  .wc-anim-fwd { animation:wc-inright .28s cubic-bezier(.2,.8,.25,1); }
  .wc-anim-back { animation:wc-inleft .28s cubic-bezier(.2,.8,.25,1); }
  .wc-anim-fade { animation:wc-fade .2s ease; }
  @keyframes wc-inright { from{transform:translateX(26px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes wc-inleft { from{transform:translateX(-26px);opacity:0} to{transform:translateX(0);opacity:1} }
  `;
  const s = document.createElement('style'); s.id = 'wc-ui-styles'; s.textContent = css;
  document.head.appendChild(s);
})();

function Btn({ kind = 'primary', children, onClick, disabled, style }) {
  return <button className={'wc-btn wc-btn-' + kind} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function TierBadge({ tier, size }) {
  const colors = {
    A:['#A074FF','rgba(160,116,255,0.16)'], B:['#5BC8FF','rgba(91,200,255,0.16)'],
    C:['#36D399','rgba(54,211,153,0.16)'], D:['#C6FF3A','rgba(198,255,58,0.16)'],
    E:['#FFB23E','rgba(255,178,62,0.16)'], F:['#FF6A4D','rgba(255,106,77,0.16)'],
  };
  const [fg, bg] = colors[tier] || ['#fff','#333'];
  return <div className="wc-tier-badge" style={{ color:fg, background:bg, ...(size?{width:size,height:size,fontSize:size*0.46,borderRadius:size*0.29}:{}) }}>{tier}</div>;
}

function BackBar({ title, onBack, right, theme, onTheme }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px 12px', position:'sticky', top:0,
      background:'var(--bg)', zIndex:10, borderBottom:'1px solid var(--line)' }}>
      <button className="wc-iconbtn" onClick={onBack} aria-label="Back" style={{ width:36, height:36 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
      </button>
      <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.01em', flex:1 }}>{title}</div>
      {right}
    </div>
  );
}

function BottomSheet({ title, subtitle, onClose, children }) {
  const [enter, setEnter] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setEnter(true), 20); return () => clearTimeout(t); }, []);
  return (
    <div onClick={onClose} style={{ position:'absolute', inset:0, zIndex:40, display:'flex', alignItems:'flex-end',
      background:`rgba(3,6,10,${enter?0.62:0})`, backdropFilter:'blur(3px)', transition:'background .2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:'100%', background:'var(--surface)', borderRadius:'22px 22px 0 0',
        borderTop:'1px solid var(--line-2)', maxHeight:'88%', display:'flex', flexDirection:'column',
        boxShadow:'0 -20px 50px -20px rgba(0,0,0,.6)', transform: enter?'translateY(0)':'translateY(26px)',
        transition:'transform .30s cubic-bezier(.2,.8,.25,1)' }}>
        <div className="wc-sheet-grip" />
        {(title || subtitle) && (
          <div style={{ padding:'8px 20px 14px', borderBottom:'1px solid var(--line)' }}>
            {title && <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.01em' }}>{title}</div>}
            {subtitle && <div style={{ fontSize:13, color:'var(--dim)', marginTop:3 }}>{subtitle}</div>}
          </div>
        )}
        <div style={{ overflowY:'auto', padding:'8px 0 14px' }}>{children}</div>
      </div>
    </div>
  );
}

function Stepper({ value, set, min = 0, max = 12 }) {
  const Bt = ({ d, on, label }) => (
    <button className="wc-iconbtn" onClick={on} aria-label={label}
      style={{ width:48, height:48, borderRadius:14, fontSize:22, opacity: d?0.4:1, pointerEvents:d?'none':'auto' }}>{label}</button>
  );
  return (
    <div style={{ display:'flex', alignItems:'center', gap:18, justifyContent:'center' }}>
      <Bt d={value<=min} on={() => set(Math.max(min, value-1))} label="−" />
      <div className="wc-num" style={{ fontSize:46, fontWeight:600, minWidth:64, textAlign:'center', letterSpacing:'-0.03em' }}>{value}</div>
      <Bt d={value>=max} on={() => set(Math.min(max, value+1))} label="+" />
    </div>
  );
}

function SectionLabel({ children, style }) {
  return <div className="wc-eyebrow" style={{ padding:'0 2px', ...style }}>{children}</div>;
}

// compact "my standing" strip used on several screens
function MiniStanding({ p }) {
  const W = window.WADAU;
  return (
    <div className="wc-card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ textAlign:'center' }}>
        <div className="wc-num" style={{ fontSize:11, color:'var(--faint)' }}>RANK</div>
        <div className="wc-num" style={{ fontSize:26, fontWeight:600, color: p.rank<=3?'var(--gold)':'var(--text)', lineHeight:1.05 }}>{p.rank}</div>
        <div style={{ marginTop:3, display:'flex', justifyContent:'center' }}><Mover value={p.mover} /></div>
      </div>
      <div style={{ width:1, alignSelf:'stretch', background:'var(--line)' }} />
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <span style={{ fontSize:11, color:'var(--faint)', fontFamily:'var(--mono)' }}>POINTS</span>
          <span style={{ fontSize:11, color:'var(--faint)', fontFamily:'var(--mono)' }}>PROJ. PAYOUT</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:2 }}>
          <span className="wc-num" style={{ fontSize:24, fontWeight:600 }}>{p.points}</span>
          <span className="wc-num" style={{ fontSize:16, fontWeight:600, color: p.payout?'var(--gold)':'var(--dim)' }}>{p.payout?fmtKES(p.payout):'—'}</span>
        </div>
        <div style={{ marginTop:10 }}><CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={W.scaleMax} /></div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', onConfirm, onClose, children }) {
  const [enter, setEnter] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setEnter(true), 20); return () => clearTimeout(t); }, []);
  return (
    <div onClick={onClose} style={{ position:'absolute', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:22,
      background:`rgba(3,6,10,${enter?0.62:0})`, backdropFilter:'blur(3px)', transition:'background .2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} className="wc-card" style={{ width:'100%', maxWidth:384, padding:'22px 22px 20px',
        transform: enter?'scale(1)':'scale(0.96)', transition:'transform .2s cubic-bezier(.2,.8,.25,1)' }}>
        <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.01em' }}>{title}</div>
        <div style={{ fontSize:13.5, color:'var(--dim)', marginTop:8, lineHeight:1.5 }}>{body}</div>
        {children}
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <Btn kind="ghost" onClick={onClose}>{cancelLabel}</Btn>
          <Btn kind={tone} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

const COUNTRY_CODES = [
  ['KE','254'],['US','1'],['GB','44'],['TZ','255'],['UG','256'],['NG','234'],['ZA','27'],['GH','233'],['RW','250'],['ET','251'],
  ['AF','93'],['AL','355'],['DZ','213'],['AD','376'],['AO','244'],['AR','54'],['AM','374'],['AU','61'],['AT','43'],['AZ','994'],
  ['BS','1242'],['BH','973'],['BD','880'],['BB','1246'],['BY','375'],['BE','32'],['BZ','501'],['BJ','229'],['BT','975'],['BO','591'],
  ['BA','387'],['BW','267'],['BR','55'],['BN','673'],['BG','359'],['BF','226'],['BI','257'],['KH','855'],['CM','237'],['CA','1'],
  ['CV','238'],['CF','236'],['TD','235'],['CL','56'],['CN','86'],['CO','57'],['KM','269'],['CG','242'],['CD','243'],['CR','506'],
  ['CI','225'],['HR','385'],['CU','53'],['CY','357'],['CZ','420'],['DK','45'],['DJ','253'],['DM','1767'],['DO','1809'],['EC','593'],
  ['EG','20'],['SV','503'],['GQ','240'],['ER','291'],['EE','372'],['SZ','268'],['FJ','679'],['FI','358'],['FR','33'],['GA','241'],
  ['GM','220'],['GE','995'],['DE','49'],['GR','30'],['GD','1473'],['GT','502'],['GN','224'],['GW','245'],['GY','592'],['HT','509'],
  ['HN','504'],['HU','36'],['IS','354'],['IN','91'],['ID','62'],['IR','98'],['IQ','964'],['IE','353'],['IL','972'],['IT','39'],
  ['JM','1876'],['JP','81'],['JO','962'],['KZ','7'],['KI','686'],['KW','965'],['KG','996'],['LA','856'],['LV','371'],['LB','961'],
  ['LS','266'],['LR','231'],['LY','218'],['LI','423'],['LT','370'],['LU','352'],['MG','261'],['MW','265'],['MY','60'],['MV','960'],
  ['ML','223'],['MT','356'],['MH','692'],['MR','222'],['MU','230'],['MX','52'],['FM','691'],['MD','373'],['MC','377'],['MN','976'],
  ['ME','382'],['MA','212'],['MZ','258'],['MM','95'],['NA','264'],['NR','674'],['NP','977'],['NL','31'],['NZ','64'],['NI','505'],
  ['NE','227'],['KP','850'],['MK','389'],['NO','47'],['OM','968'],['PK','92'],['PW','680'],['PA','507'],['PG','675'],['PY','595'],
  ['PE','51'],['PH','63'],['PL','48'],['PT','351'],['QA','974'],['RO','40'],['RU','7'],['KN','1869'],['LC','1758'],['VC','1784'],
  ['WS','685'],['SM','378'],['ST','239'],['SA','966'],['SN','221'],['RS','381'],['SC','248'],['SL','232'],['SG','65'],['SK','421'],
  ['SI','386'],['SB','677'],['SO','252'],['KR','82'],['SS','211'],['ES','34'],['LK','94'],['SD','249'],['SR','597'],['SE','46'],
  ['CH','41'],['SY','963'],['TW','886'],['TJ','992'],['TH','66'],['TL','670'],['TG','228'],['TO','676'],['TT','1868'],['TN','216'],
  ['TR','90'],['TM','993'],['TV','688'],['UA','380'],['AE','971'],['UY','598'],['UZ','998'],['VU','678'],['VE','58'],['VN','84'],
  ['YE','967'],['ZM','260'],['ZW','263'],
];
function flagEmoji(iso) { return iso.toUpperCase().replace(/./g, (c)=>String.fromCodePoint(127397 + c.charCodeAt(0))); }
function CountryCodeSelect({ value, onChange }) {
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center', borderRight:'1px solid var(--line)' }}>
      <select value={value} onChange={(e)=>onChange(e.target.value)} style={{
        fontFamily:'var(--mono)', fontSize:15, fontWeight:500, color:'var(--dim)', background:'transparent',
        border:'none', outline:'none', padding:'13px 26px 13px 12px', cursor:'pointer',
        appearance:'none', WebkitAppearance:'none', MozAppearance:'none' }}>
        {COUNTRY_CODES.map(([iso,dial],i)=><option key={i} value={'+'+dial} style={{ color:'#111' }}>{flagEmoji(iso)} +{dial}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" style={{ position:'absolute', right:9, color:'var(--faint)', pointerEvents:'none' }}><path d="M2 4l4 4 4-4"/></svg>
    </div>
  );
}

Object.assign(window, { Btn, TierBadge, BackBar, BottomSheet, Stepper, SectionLabel, MiniStanding, ConfirmDialog, CountryCodeSelect, COUNTRY_CODES });
