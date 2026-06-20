/* Wadau Cup — World Cup group standings: group tables (with pool-pick markers),
   a per-team group card for the team page, and the full standings screen.
   Built on .wc tokens. Reuses SectionLabel, ThemeToggle, BackBar, FlagRow. */

/* which pool members hold a team — for the "your picks" markers on tables */
function holdersShort(code) {
  return window.WADAU.players.filter((p) => p.teams.some((t) => t.code === code && t.alive)).map((p) => p.short);
}
function meHolds(code) {
  const me = window.WADAU.me;
  return me.teams.some((t) => t.code === code);
}

function GroupTable({ g, full, highlightCode, nav }) {
  const W = window.WADAU, table = W.GROUPTABLES[g];
  const Cell = ({ children, w, dim, strong }) => (
    <span className="wc-num" style={{ width:w, flex:'none', textAlign:'center', fontSize: full ? 12.5 : 12,
      fontWeight: strong ? 700 : 500, color: dim ? 'var(--faint)' : (strong ? 'var(--text)' : 'var(--dim)') }}>{children}</span>
  );
  return (
    <div className="wc-card" style={{ overflow:'hidden', padding:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 15px 10px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <span style={{ width:24, height:24, borderRadius:7, background:'var(--surface-3)', display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>{g}</span>
          <span style={{ fontSize:14, fontWeight:700, letterSpacing:'-0.01em' }}>Group {g}</span>
        </div>
        <div style={{ display:'flex', gap: full ? 0 : 12 }}>
          {full
            ? ['P','W','D','L','GF','GA','GD','Pts'].map((h, i) => <Cell key={h} w={i === 7 ? 34 : 26} dim>{h}</Cell>)
            : ['GD','Pts'].map((h, i) => <Cell key={h} w={i === 1 ? 30 : 28} dim>{h}</Cell>)}
        </div>
      </div>
      <div>
        {table.map((r, i) => {
          const adv = i < 2;
          const hl = r.code === highlightCode;
          const holders = holdersShort(r.code);
          const mine = meHolds(r.code);
          return (
            <div key={r.code} onClick={() => nav && nav.go('team', { code: r.code })}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 15px', cursor: nav ? 'pointer' : 'default',
                borderBottom: i === table.length - 1 ? 'none' : '1px solid var(--line)',
                background: hl ? 'var(--lime-soft)' : 'transparent', position:'relative' }}>
              {adv && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background: i === 0 ? 'var(--lime)' : 'var(--lime-line)' }} />}
              <span className="wc-num" style={{ width:14, flex:'none', fontSize:12, color: adv ? 'var(--lime-ink)' : 'var(--faint)', fontWeight:600 }}>{i + 1}</span>
              <span className={'wc-flag ' + (r.code in W.OUT ? 'out' : 'alive')} style={{ width:21, height:21, fontSize:14, flex:'none' }}>{W.T[r.code].f}</span>
              <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:13.5, fontWeight: hl ? 700 : 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1, minWidth:0 }}>{W.T[r.code].n}</span>
                {mine && <span className="wc-tag-you" style={{ fontSize:8 }}>PICK</span>}
                {!mine && holders.length > 0 && <span className="wc-num" style={{ fontSize:9.5, color:'var(--faint)' }}>{holders.length}♦</span>}
              </div>
              {full
                ? <>
                    <Cell w={26}>{r.p}</Cell><Cell w={26}>{r.w}</Cell><Cell w={26}>{r.d}</Cell><Cell w={26}>{r.l}</Cell>
                    <Cell w={26}>{r.gf}</Cell><Cell w={26}>{r.ga}</Cell><Cell w={26}>{r.gd > 0 ? '+' + r.gd : r.gd}</Cell><Cell w={34} strong>{r.pts}</Cell>
                  </>
                : <>
                    <Cell w={28}>{r.gd > 0 ? '+' + r.gd : r.gd}</Cell>
                    <Cell w={30} strong>{r.pts}</Cell>
                  </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* compact group card for the team page — this team's group, highlighted */
function TeamGroupCard({ code, nav }) {
  const W = window.WADAU, info = W.groupOf(code);
  if (!info) return null;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <SectionLabel>Group {info.group} · final table</SectionLabel>
        {nav && <button onClick={() => nav.go('worldcup')} className="wc-bt-reply-btn" style={{ fontSize:11.5, color:'var(--lime-ink)', fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          All groups
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h6M6 3l3 3-3 3" /></svg>
        </button>}
      </div>
      <GroupTable g={info.group} highlightCode={code} nav={nav} />
    </div>
  );
}

/* the full World Cup standings screen */
function WorldCupScreen({ mode, nav, theme, onTheme }) {
  const W = window.WADAU;
  const groups = Object.keys(W.GROUPTABLES);
  const Legend = () => (
    <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:4 }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
        <span style={{ width:11, height:11, borderRadius:3, background:'var(--lime)' }} /><span className="wc-eyebrow">Through to knockouts</span>
      </span>
      <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
        <span className="wc-tag-you" style={{ fontSize:8 }}>PICK</span><span className="wc-eyebrow">Your team</span>
      </span>
      <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
        <span className="wc-num" style={{ fontSize:11, color:'var(--faint)' }}>N♦</span><span className="wc-eyebrow">Held by N in pool</span>
      </span>
    </div>
  );

  if (mode === 'desktop') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ flex:'none', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:'1px solid var(--line)' }}>
          <button onClick={() => nav.back()} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontFamily:'inherit', fontSize:13.5, fontWeight:600 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
            Back
          </button>
          <ThemeToggle theme={theme} onToggle={onTheme} />
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 28px 56px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:23, fontWeight:800, letterSpacing:'-0.02em' }}>World Cup 2026</div>
                <div style={{ fontSize:13.5, color:'var(--dim)', marginTop:4 }}>Group stage — final tables. Tap a team for its page.</div>
              </div>
              <Legend />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, alignItems:'start' }}>
              {groups.map((g) => <GroupTable key={g} g={g} full={false} nav={nav} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <BackBar title="World Cup 2026" onBack={() => nav.back()} right={<ThemeToggle theme={theme} onToggle={onTheme} />} />
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ padding:'14px 16px 24px' }}>
          <div style={{ fontSize:13.5, color:'var(--dim)', marginBottom:12 }}>Group stage — final tables. Tap a team for its page.</div>
          <div style={{ marginBottom:14 }}><Legend /></div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {groups.map((g) => <GroupTable key={g} g={g} full={false} nav={nav} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GroupTable, TeamGroupCard, WorldCupScreen, holdersShort, meHolds });
