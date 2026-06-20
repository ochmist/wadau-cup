/* Wadau Cup — leaderboard visual system + components.
   Themed via a root class: .wc.wc-dark / .wc.wc-light (sets CSS vars). */

(function injectCSS() {
  if (document.getElementById('wc-styles')) return;
  const css = `
  .wc, .wc * { box-sizing: border-box; }
  .wc {
    font-family: 'Hanken Grotesk', system-ui, sans-serif;
    --mono: 'Geist Mono','SFMono-Regular',ui-monospace,monospace;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .wc-num { font-family: var(--mono); font-feature-settings:'tnum' 1,'ss01' 1; letter-spacing:-0.01em; }

  /* ---- DARK (broadcast) ---- */
  .wc-dark {
    --bg: #0A0E13; --bg-grad-1: #0E141C; --bg-grad-2: #090C11;
    --surface: #11161E; --surface-2: #161D27; --surface-3: #1B2330;
    --line: rgba(255,255,255,0.07); --line-2: rgba(255,255,255,0.12);
    --text: #F3F6F9; --dim: #8C97A6; --faint: #5A6573;
    --lime: #C6FF3A; --lime-soft: rgba(198,255,58,0.14); --lime-line: rgba(198,255,58,0.30);
    --lime-ink: #C6FF3A;
    --on-lime: #0A0E13;
    --violet: #A074FF; --violet-soft: rgba(160,116,255,0.14);
    --up: #C6FF3A; --up-soft: rgba(198,255,58,0.14);
    --down: #FF6A4D; --down-soft: rgba(255,106,77,0.13);
    --flat: #6B7280;
    --gold: #E7C56A; --gold-deep: #C99A38; --gold-soft: rgba(231,197,106,0.10); --gold-line: rgba(231,197,106,0.28);
    --gold-grad: linear-gradient(135deg,#F4E2A1 0%,#E7C56A 38%,#C99A38 100%);
    --track: rgba(255,255,255,0.085); --track-2: rgba(255,255,255,0.26);
    --flag-bg: #EDF0F4; --flag-bd: rgba(0,0,0,0.14); --flag-out-bg: rgba(255,255,255,0.045);
    --tip-bg: #1C2431; --tip-fg: #F3F6F9;
    --shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 18px 50px -24px rgba(0,0,0,0.7);
  }
  /* ---- LIGHT (editorial) ---- */
  .wc-light {
    --bg: #F3F4F1; --bg-grad-1: #F7F8F5; --bg-grad-2: #ECEEE9;
    --surface: #FFFFFF; --surface-2: #F6F7F4; --surface-3: #EFF1EC;
    --line: rgba(15,20,25,0.09); --line-2: rgba(15,20,25,0.16);
    --text: #0E141A; --dim: #4B5560; --faint: #6C7681;
    --lime: #C6FF3A; --lime-soft: rgba(150,200,20,0.16); --lime-line: rgba(120,165,10,0.45);
    --lime-ink: #4E8C00;
    --on-lime: #0A0E13;
    --violet: #6D40D6; --violet-soft: rgba(109,64,214,0.10);
    --up: #2F8F3E; --up-soft: rgba(47,143,62,0.12);
    --down: #D8442A; --down-soft: rgba(216,68,42,0.10);
    --flat: #8A929C;
    --gold: #9A7B1F; --gold-deep: #7E631A; --gold-soft: rgba(190,150,30,0.10); --gold-line: rgba(170,135,40,0.32);
    --gold-grad: linear-gradient(135deg,#D9BE63 0%,#C0982B 55%,#9A7B1F 100%);
    --track: rgba(15,20,25,0.09); --track-2: rgba(15,20,25,0.24);
    --flag-bg: #FFFFFF; --flag-bd: rgba(15,20,25,0.14); --flag-out-bg: #E7EAE4;
    --tip-bg: #11161E; --tip-fg: #FFFFFF;
    --shadow: 0 1px 2px rgba(15,20,25,0.04), 0 12px 30px -18px rgba(15,20,25,0.18);
  }

  .wc-eyebrow { font-family: var(--mono); font-size:10.5px; font-weight:500; letter-spacing:0.16em; text-transform:uppercase; color: var(--faint); white-space:nowrap; }
  .wc-gold-text { color: var(--gold); }
  .wc-gold-fill { color: var(--gold); }

  /* mover chip */
  .wc-mover { display:inline-flex; align-items:center; gap:2px; font-family:var(--mono); font-weight:600; font-size:11px; line-height:1;
              padding:3px 5px 3px 4px; border-radius:5px; letter-spacing:0; }
  .wc-mover svg { width:8px; height:8px; }
  .wc-mover.up { color:var(--up); background:var(--up-soft); }
  .wc-mover.down { color:var(--down); background:var(--down-soft); }
  .wc-mover.flat { color:var(--flat); background:transparent; padding-left:5px; }

  /* flag chips */
  .wc-flags { display:flex; gap:4px; align-items:center; }
  .wc-flag { font-size:15px; line-height:1; width:22px; height:22px; display:flex; align-items:center; justify-content:center;
             border-radius:6px; position:relative; cursor:pointer; transition:transform .1s ease; -webkit-text-size-adjust:100%; }
  .wc-flag.alive { background:var(--flag-bg); border:1px solid var(--flag-bd); box-shadow:0 1px 2px rgba(0,0,0,0.16); }
  .wc-flag.out { background:var(--flag-out-bg); border:1px solid var(--line); filter:grayscale(1); opacity:0.42; }
  .wc-flag.out::after { content:''; position:absolute; left:3px; right:3px; top:50%; height:1.5px; background:var(--text); opacity:0.6; transform:rotate(-14deg); }
  .wc-flag:active { transform:scale(0.9); }
  .wc-flag-tip { position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%);
             background:var(--tip-bg); border:1px solid var(--line-2); border-radius:9px; padding:6px 10px;
             white-space:nowrap; z-index:30; box-shadow:0 10px 30px -8px rgba(0,0,0,0.45);
             display:flex; align-items:center; gap:7px; cursor:default; }
  .wc-flag-tip::after { content:''; position:absolute; top:100%; left:50%; transform:translateX(-50%);
             border:5px solid transparent; border-top-color:var(--tip-bg); }
  .wc-icon-btn { width:30px; height:30px; border-radius:9px; border:1px solid var(--line-2); background:transparent;
             color:var(--dim); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:color .12s, border-color .12s; }
  .wc-icon-btn:hover { color:var(--text); border-color:var(--text); }

  /* ceiling bar */
  .wc-bar { position:relative; height:7px; border-radius:4px; background:var(--track); overflow:hidden; }
  .wc-bar-ceil { position:absolute; top:0; left:0; bottom:0; background:var(--track-2); border-radius:4px; }
  .wc-bar-cur { position:absolute; top:0; left:0; bottom:0; background:var(--lime); border-radius:4px; box-shadow:0 0 10px -1px var(--lime-line); }
  .wc-bar-tick { position:absolute; top:-2px; bottom:-2px; width:1.5px; background:var(--text); opacity:0.5; }

  .wc-divider-money { display:flex; align-items:center; gap:10px; padding:9px 20px; }
  .wc-divider-money .ln { flex:1; height:1px; background:linear-gradient(90deg,transparent,var(--gold-line),transparent); }
  .wc-divider-money .lbl { font-family:var(--mono); font-size:10px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold); white-space:nowrap; }

  .wc-pill { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:10.5px; font-weight:500;
             letter-spacing:0.06em; text-transform:uppercase; padding:5px 9px; border-radius:999px; border:1px solid var(--line-2); color:var(--dim); white-space:nowrap; }
  .wc-live-dot { width:6px; height:6px; border-radius:50%; background:var(--up); box-shadow:0 0 0 3px var(--up-soft); }

  .wc-avatar { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center;
               font-family:var(--mono); font-weight:600; font-size:12px; background:var(--surface-3); color:var(--dim); flex:none; letter-spacing:0.02em; }
  .wc-tag-you { font-family:var(--mono); font-size:9px; font-weight:600; letter-spacing:0.08em; color:var(--on-lime);
               background:var(--lime); padding:2px 5px; border-radius:4px; text-transform:uppercase; }

  .wc-card { background:var(--surface); border:1px solid var(--line); border-radius:16px; }
  `;
  const s = document.createElement('style');
  s.id = 'wc-styles';
  s.textContent = css;
  document.head.appendChild(s);
})();

const fmtK = (n) => n.toLocaleString('en-US');
const fmtKES = (n) => 'KES ' + n.toLocaleString('en-US');

function ArrowUp() {
  return React.createElement('svg', { viewBox:'0 0 8 8', fill:'none' },
    React.createElement('path', { d:'M4 7V1M4 1L1.4 3.6M4 1l2.6 2.6', stroke:'currentColor', strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' }));
}
function ArrowDown() {
  return React.createElement('svg', { viewBox:'0 0 8 8', fill:'none' },
    React.createElement('path', { d:'M4 1v6M4 7L1.4 4.4M4 7l2.6-2.6', stroke:'currentColor', strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' }));
}

function Mover({ value, showZero = true }) {
  if (value > 0) return <span className="wc-mover up"><ArrowUp/>{value}</span>;
  if (value < 0) return <span className="wc-mover down"><ArrowDown/>{Math.abs(value)}</span>;
  return showZero ? <span className="wc-mover flat">—</span> : null;
}

function FlagRow({ teams, size, onTeam }) {
  const [sel, setSel] = React.useState(null);
  React.useEffect(() => {
    if (sel === null) return;
    const close = () => setSel(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [sel]);
  return (
    <div className="wc-flags">
      {teams.map((t, i) => (
        <span key={t.code + t.tier} className={'wc-flag ' + (t.alive ? 'alive' : 'out')}
          onClick={(e) => { e.stopPropagation(); if (onTeam) onTeam(t); }}
          onPointerDown={(e) => { e.stopPropagation(); if (!onTeam) setSel(sel === i ? null : i); }}
          style={size ? { width:size, height:size, fontSize:Math.round(size*0.66) } : null}>
          {t.flag}
          {!onTeam && sel === i && (
            <span className="wc-flag-tip" onPointerDown={(e) => e.stopPropagation()}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--tip-fg)' }}>{t.name}</span>
              <span className="wc-num" style={{ fontSize:10.5, color: t.alive ? 'var(--lime)' : 'var(--down)' }}>
                {t.tier} · {t.alive ? t.pts + ' pts' : 'out'}
              </span>
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="wc-icon-btn" onClick={onToggle} title="Switch theme" aria-label="Switch theme">
      {theme === 'dark'
        ? <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8L4.4 4.4"/></svg>
        : <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a.6.6 0 0 0-.8-.8 8.2 8.2 0 1 0 10.5 10.5.6.6 0 0 0-.8-.8z"/></svg>}
    </button>
  );
}

function CeilingBar({ points, ceiling, scaleMax, showCaption = true }) {
  const cur = Math.max(0, Math.min(100, (points / scaleMax) * 100));
  const cl = Math.max(0, Math.min(100, (ceiling / scaleMax) * 100));
  const headroom = ceiling - points;
  return (
    <div style={{ width:'100%' }}>
      <div className="wc-bar">
        <div className="wc-bar-ceil" style={{ width: cl + '%' }} />
        <div className="wc-bar-cur" style={{ width: cur + '%' }} />
        <div className="wc-bar-tick" style={{ left: 'calc(' + cl + '% - 1px)' }} />
      </div>
      {showCaption && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:6 }}>
          <span className="wc-num" style={{ fontSize:11, color:'var(--dim)' }}>
            <span style={{ color:'var(--lime-ink)', fontWeight:600 }}>{points}</span> now
          </span>
          <span className="wc-num" style={{ fontSize:11, color:'var(--faint)' }}>
            +{headroom} left · ceiling {ceiling}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- MOBILE ROW ---------- */
function MobileRow({ p, scaleMax, last }) {
  const money = p.rank <= 3;
  return (
    <div style={{
      padding:'14px 18px 16px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
      background: money ? 'var(--gold-soft)' : 'transparent',
      position:'relative',
    }}>
      {money && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4,
        background:'linear-gradient(180deg,#F6E7A6,#E7C56A 55%,#C99A38)', boxShadow:'0 0 12px -1px var(--gold-line)' }} />}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {/* rank + mover */}
        <div style={{ width:30, flex:'none', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:5 }}>
          <span className="wc-num" style={{
            fontSize:21, fontWeight:600, lineHeight:1,
            color: money ? 'var(--gold)' : 'var(--text)',
          }}>{p.rank}</span>
          <Mover value={p.mover} />
        </div>
        {/* name + flags */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
            <span style={{ fontSize:16, fontWeight:600, letterSpacing:'-0.01em', whiteSpace:'nowrap' }}>{p.name}</span>
            {p.me && <span className="wc-tag-you">You</span>}
          </div>
          <FlagRow teams={p.teams} />
        </div>
        {/* points + payout */}
        <div style={{ flex:'none', textAlign:'right' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:3 }}>
            <span className="wc-num" style={{ fontSize:24, fontWeight:600, lineHeight:1 }}>{p.points}</span>
            <span className="wc-eyebrow" style={{ fontSize:9 }}>pts</span>
          </div>
          {money
            ? <div className="wc-num wc-gold-fill" style={{ fontSize:13, fontWeight:600, marginTop:6, whiteSpace:'nowrap' }}>{fmtKES(p.payout)}</div>
            : <div className="wc-num" style={{ fontSize:11.5, color:'var(--faint)', marginTop:6 }}>
                {p.rank === 4 ? '1 pt from money' : 'out of money'}
              </div>}
        </div>
      </div>
      {/* ceiling bar full width */}
      <div style={{ marginTop:13 }}>
        <CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={scaleMax} />
      </div>
    </div>
  );
}

function MoneyLine() {
  return (
    <div className="wc-divider-money">
      <div className="ln" />
      <div className="lbl">◆ Money line · top 3 paid</div>
      <div className="ln" />
    </div>
  );
}

/* ---------- MOBILE SCREEN ---------- */
function MobileLeaderboard({ theme: initialTheme }) {
  const W = window.WADAU;
  const [theme, setTheme] = React.useState(initialTheme);
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return (
    <div className={'wc wc-' + theme} style={{ background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* status bar */}
      <div style={{ height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', flex:'none' }}>
        <span className="wc-num" style={{ fontSize:13, fontWeight:600 }}>9:41</span>
        <div style={{ display:'flex', gap:6, alignItems:'center', opacity:0.9 }}>
          <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="4.5" width="3" height="6.5" rx="1"/><rect x="9" y="2" width="3" height="9" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
          <svg width="16" height="11" viewBox="0 0 24 16" fill="currentColor"><rect x="0.5" y="2" width="20" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.5"/><rect x="2.5" y="4" width="14" height="8" rx="1.5"/><rect x="22" y="6" width="2" height="4" rx="1"/></svg>
        </div>
      </div>

      {/* header */}
      <div style={{ padding:'6px 18px 0', flex:'none' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Crest/>
            <div>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1 }}>Wadau Cup</div>
              <div className="wc-eyebrow" style={{ marginTop:3, whiteSpace:'nowrap' }}>World Cup 2026 · Pool</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="wc-pill"><span className="wc-live-dot"/>Live</span>
            <ThemeToggle theme={theme} onToggle={toggle} />
            <div className="wc-avatar" style={{ width:30, height:30, borderRadius:9 }}>BR</div>
          </div>
        </div>

        {/* pot card */}
        <div className="wc-card" style={{ marginTop:14, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-30, width:160, height:160, borderRadius:'50%',
            background:'radial-gradient(circle, var(--lime-soft), transparent 70%)', pointerEvents:'none' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
            <div>
              <div className="wc-eyebrow">Prize pool</div>
              <div className="wc-num" style={{ fontSize:31, fontWeight:600, letterSpacing:'-0.03em', lineHeight:1, marginTop:7, whiteSpace:'nowrap' }}>
                {fmtKES(W.pot)}
              </div>
            </div>
            <div style={{ textAlign:'right', display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ whiteSpace:'nowrap' }}><span className="wc-num" style={{ fontSize:15, fontWeight:600 }}>{W.entries}</span>
                <span className="wc-eyebrow" style={{ marginLeft:5 }}>players</span></div>
              <div style={{ whiteSpace:'nowrap' }}><span className="wc-num" style={{ fontSize:15, fontWeight:600 }}>{fmtK(W.buyin)}</span>
                <span className="wc-eyebrow" style={{ marginLeft:5 }}>buy-in</span></div>
            </div>
          </div>
          {/* payout split */}
          <div style={{ display:'flex', gap:7, marginTop:15, position:'relative' }}>
            {[['1st',W.payouts[0]],['2nd',W.payouts[1]],['3rd',W.payouts[2]]].map(([k,v],i)=>(
              <div key={k} style={{ flex: i===0?1.5:i===1?1.1:0.85, padding:'8px 10px', borderRadius:9,
                background:'var(--surface-2)', border:'1px solid var(--gold-line)' }}>
                <div className="wc-eyebrow wc-gold-text" style={{ fontSize:9 }}>{k}</div>
                <div className="wc-num wc-gold-fill" style={{ fontSize:13.5, fontWeight:600, marginTop:3 }}>{fmtK(v)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* round status row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'16px 2px 10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.01em' }}>Standings</span>
            <span className="wc-pill" style={{ padding:'3px 8px' }}>{W.round}</span>
          </div>
          <span className="wc-eyebrow">Updated {W.updated}</span>
        </div>
      </div>

      {/* list */}
      <div>
        {W.players.map((p, i) => (
          <React.Fragment key={p.name}>
            <MobileRow p={p} scaleMax={W.scaleMax} last={i === W.players.length - 1} />
            {p.rank === 3 && <MoneyLine/>}
          </React.Fragment>
        ))}
      </div>

      {/* bottom nav */}
      <BottomNav/>
    </div>
  );
}

function BottomNav() {
  const items = [
    ['Table', 'M3 5h14M3 10h14M3 15h14', true],
    ['Feed', 'M4 4h12v3H4zM4 9h12v7H4z', false],
    ['Draft', 'M10 3v14M3 10h14', false],
    ['Picks', 'M5 4h10v12l-5-3-5 3z', false],
  ];
  return (
    <div style={{ flex:'none', display:'flex', borderTop:'1px solid var(--line)', background:'var(--surface)', padding:'10px 8px 22px' }}>
      {items.map(([label, d, active]) => (
        <div key={label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5,
          color: active ? 'var(--text)' : 'var(--faint)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
          <span style={{ fontSize:10.5, fontWeight: active?600:500, letterSpacing:'0.01em' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function Crest({ size = 30 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:9, background:'var(--lime)', flex:'none',
      display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 16px -4px var(--lime-line)' }}>
      <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19l-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z" fill="#0A0E13"/>
      </svg>
    </div>
  );
}

Object.assign(window, { Mover, FlagRow, ThemeToggle, CeilingBar, MobileRow, MoneyLine, MobileLeaderboard, BottomNav, Crest, fmtK, fmtKES, ArrowUp, ArrowDown });
