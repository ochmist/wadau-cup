/* Wadau Cup — ranking redesign: lean leaderboard rows, expand-in-place ceiling
   drawer, stage tracker, and the persistent "you" anchor. Built on .wc tokens.
   Reuses Mover, FlagRow, CeilingBar, MoneyLine, Crest from wadau-components. */

(function injectRankCSS() {
  if (document.getElementById('wc-rank-styles')) return;
  const s = document.createElement('style');
  s.id = 'wc-rank-styles';
  s.textContent = `
    @keyframes wc-rk-flash { 0%{ background:var(--lime-soft); } 100%{ background:transparent; } }
    .wc-rk-row { position:relative; cursor:pointer; transition:background .14s; }
    .wc-rk-row:hover { background:var(--surface-2); }
    .wc-rk-row.money:hover { background:var(--gold-soft); }
    .wc-rk-flash { animation:wc-rk-flash 1.8s ease-out; }
    .wc-rk-chev { transition:transform .2s ease; color:var(--faint); flex:none; }
    .wc-rk-chev.open { transform:rotate(180deg); }
    .wc-rk-drawer { overflow:hidden; }
    .wc-rk-seg { display:inline-flex; gap:2px; padding:2px; background:var(--surface-2); border:1px solid var(--line); border-radius:9px; }
    .wc-rk-jump { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; font-weight:600; letter-spacing:0.04em;
                  text-transform:uppercase; color:var(--on-lime); background:var(--lime); border:none; border-radius:999px; padding:7px 13px; cursor:pointer;
                  box-shadow:0 6px 18px -8px var(--lime-line); }
    .wc-rk-pip { flex:1; height:4px; border-radius:2px; }
  `;
  document.head.appendChild(s);
})();

/* ---------- stage tracker: which knockout rounds can still score ---------- */
function StageTracker({ compact }) {
  const W = window.WADAU;
  const col = (st) => st === 'done' ? 'var(--lime-ink)' : st === 'current' ? 'var(--text)' : 'var(--faint)';
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        {W.STAGES.map((s, i) => (
          <React.Fragment key={s.key}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flex:1 }}>
              <div style={{ width:'100%', height:4, borderRadius:2,
                background: s.state === 'done' ? 'var(--lime)' : s.state === 'current' ? 'var(--track-2)' : 'var(--track)' }} />
              {!compact && <span className="wc-num" style={{ fontSize:9, color:col(s.state), fontWeight: s.state==='current'?700:500, whiteSpace:'nowrap' }}>{s.short}</span>}
            </div>
          </React.Fragment>
        ))}
      </div>
      {!compact && (
        <div style={{ fontSize:11.5, color:'var(--dim)', marginTop:8 }}>
          <span style={{ color:'var(--lime-ink)', fontWeight:600 }}>{W.roundsLeft} rounds left</span> your alive teams can still score in
        </div>
      )}
    </div>
  );
}

/* ---------- the ceiling math, spelled out ---------- */
function CeilingExplain({ p }) {
  const W = window.WADAU;
  return (
    <div>
      <div style={{ fontSize:13, color:'var(--dim)', lineHeight:1.5 }}>
        <span className="wc-num" style={{ color:'var(--lime-ink)', fontWeight:700 }}>{p.points}</span> banked
        <span style={{ margin:'0 6px', color:'var(--faint)' }}>+</span>
        <span className="wc-num" style={{ color:'var(--text)', fontWeight:700 }}>{p.winnable}</span> still winnable
        <span style={{ margin:'0 6px', color:'var(--faint)' }}>=</span>
        <span className="wc-num" style={{ color:'var(--text)', fontWeight:700 }}>{p.ceiling}</span> ceiling
      </div>
      <div style={{ marginTop:11 }}><CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={W.scaleMax} showCaption={false} /></div>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:9 }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ width:10, height:10, borderRadius:3, background:'var(--lime)' }} />
          <span className="wc-eyebrow">Banked</span>
        </span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ width:10, height:10, borderRadius:3, background:'var(--track-2)' }} />
          <span className="wc-eyebrow">Still winnable</span>
        </span>
      </div>
    </div>
  );
}

/* ---------- per-row money context (no bar, just the competitive read) ---------- */
function MoneyContext({ p, align = 'right' }) {
  if (p.inMoney) {
    return <div className="wc-num wc-gold-fill" style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap' }}>{window.WADAU.fmtKES ? window.WADAU.fmtKES(p.payout) : 'KES ' + p.payout.toLocaleString()}</div>;
  }
  if (p.toMoney <= 2) {
    return <div className="wc-num" style={{ fontSize:11.5, color:'var(--down)', fontWeight:600, whiteSpace:'nowrap' }}>{p.toMoney} {p.toMoney === 1 ? 'pt' : 'pts'} from money</div>;
  }
  return <div className="wc-num" style={{ fontSize:11.5, color: p.canReachMoney ? 'var(--dim)' : 'var(--faint)', whiteSpace:'nowrap' }}>
    {p.canReachMoney ? `${p.toMoney} pts back` : 'out of contention'}
  </div>;
}

/* contributing alive teams as compact chips */
function ContribChips({ p, max }) {
  const parts = p.ceilingParts.slice(0, max || 6);
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {parts.map((c) => (
        <span key={c.code} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 9px 4px 5px',
          borderRadius:999, background:'var(--surface-2)', border:'1px solid var(--line)' }}>
          <span className="wc-flag alive" style={{ width:18, height:18, fontSize:12 }}>{c.flag}</span>
          <span style={{ fontSize:11.5, fontWeight:600 }}>{c.name}</span>
          <span className="wc-num" style={{ fontSize:10.5, color:'var(--lime-ink)', fontWeight:600 }}>+{c.winnable}</span>
        </span>
      ))}
    </div>
  );
}

/* ---------- expand drawer body (shared mobile+desktop) ---------- */
function RowDrawer({ p, nav, ceilingTick }) {
  return (
    <div style={{ padding:'2px 2px 4px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16 }}>
        <div>
          <SectionLabel style={{ marginBottom:10 }}>Points vs ceiling</SectionLabel>
          <CeilingExplain p={p} />
        </div>
        <div>
          <SectionLabel style={{ marginBottom:10 }}>Still winnable from</SectionLabel>
          <ContribChips p={p} />
        </div>
        <div>
          <SectionLabel style={{ marginBottom:10 }}>Scoring rounds left</SectionLabel>
          <StageTracker />
        </div>
      </div>
      <button className="wc-btn wc-btn-ghost" onClick={(e) => { e.stopPropagation(); nav && nav.go('player', { name: p.name }); }}
        style={{ marginTop:16, padding:'10px 14px', fontSize:13, width:'100%' }}>
        <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          View full profile
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
        </span>
      </button>
    </div>
  );
}

/* ---------- MOBILE lean row ---------- */
function LeanRowMobile({ p, last, open, onRowClick, onChevron, nav, flashRef, showCeilingHint }) {
  const money = p.inMoney;
  return (
    <div ref={p.me ? flashRef : null} className={'wc-rk-row' + (money ? ' money' : '')}
      style={{ borderBottom: last && !open ? 'none' : '1px solid var(--line)', background: money ? 'var(--gold-soft)' : 'transparent' }}>
      {money && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'linear-gradient(180deg,#F6E7A6,#E7C56A 55%,#C99A38)' }} />}
      <div onClick={onRowClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px 13px 18px' }}>
        {/* rank + mover */}
        <div style={{ width:26, flex:'none', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4 }}>
          <span className="wc-num" style={{ fontSize:20, fontWeight:600, lineHeight:1, color: money ? 'var(--gold)' : 'var(--text)' }}>{p.rank}</span>
          <Mover value={p.mover} showZero={false} />
        </div>
        {/* name + flags */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
            <span style={{ fontSize:15.5, fontWeight:600, letterSpacing:'-0.01em', whiteSpace:'nowrap' }}>{p.me ? 'You' : p.name}</span>
            {p.me && <span className="wc-tag-you">You</span>}
            {!p.paid && <span className="wc-num" style={{ fontSize:9, color:'var(--down)', background:'var(--down-soft)', padding:'1px 5px', borderRadius:4 }}>UNPAID</span>}
          </div>
          <FlagRow teams={p.teams} size={20} onTeam={(tm) => nav && nav.go('team', { code: tm.code })} />
        </div>
        {/* points + money ctx + chevron */}
        <div style={{ flex:'none', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:3 }}>
              <span className="wc-num" style={{ fontSize:23, fontWeight:600, lineHeight:1 }}>{p.points}</span>
              <span className="wc-eyebrow" style={{ fontSize:9 }}>pts</span>
            </div>
            <div style={{ marginTop:6, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
              {showCeilingHint && <span className="wc-num" style={{ fontSize:10.5, color:'var(--faint)' }}>↗{p.ceiling}</span>}
              <MoneyContext p={p} />
            </div>
          </div>
          <span onClick={(e) => { e.stopPropagation(); onChevron(); }} style={{ display:'flex', padding:4, margin:-4 }}>
            <svg className={'wc-rk-chev' + (open ? ' open' : '')} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </div>
      </div>
      {open && (
        <div className="wc-rk-drawer" style={{ padding:'0 16px 16px 18px' }}>
          <div style={{ borderTop:'1px solid var(--line)', paddingTop:14 }}>
            <RowDrawer p={p} nav={nav} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- DESKTOP lean row ---------- */
function LeanRowDesktop({ p, last, open, onRowClick, onChevron, nav, flashRef, showCeilingHint }) {
  const money = p.inMoney;
  return (
    <div ref={p.me ? flashRef : null} className={'wc-rk-row' + (money ? ' money' : '')}
      style={{ borderBottom: last && !open ? 'none' : '1px solid var(--line)', background: money ? 'var(--gold-soft)' : 'transparent' }}>
      {money && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:'linear-gradient(180deg,#F6E7A6,#E7C56A 55%,#C99A38)' }} />}
      <div onClick={onRowClick} style={{ display:'grid', gridTemplateColumns:'52px 1fr 92px 150px 60px 28px', alignItems:'center', gap:16, padding:'13px 22px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="wc-num" style={{ fontSize:19, fontWeight:600, color: money ? 'var(--gold)' : 'var(--text)' }}>{p.rank}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:13, minWidth:0 }}>
          <div className="wc-avatar" style={{ background: p.me ? 'var(--lime)' : 'var(--surface-3)', color: p.me ? 'var(--on-lime)' : 'var(--dim)' }}>{p.short}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:15.5, fontWeight:600, letterSpacing:'-0.01em' }}>{p.me ? 'You' : p.name}</span>
              {p.me && <span className="wc-tag-you">You</span>}
              {!p.paid && <span className="wc-num" style={{ fontSize:9.5, color:'var(--down)', background:'var(--down-soft)', padding:'1px 5px', borderRadius:4 }}>UNPAID</span>}
            </div>
            <div style={{ marginTop:7 }}><FlagRow teams={p.teams} size={19} onTeam={(tm) => nav && nav.go('team', { code: tm.code })} /></div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <span className="wc-num" style={{ fontSize:21, fontWeight:600 }}>{p.points}</span>
          <span className="wc-eyebrow" style={{ fontSize:9, marginLeft:4 }}>pts</span>
          {showCeilingHint && <div className="wc-num" style={{ fontSize:10.5, color:'var(--faint)', marginTop:3 }}>↗ {p.ceiling}</div>}
        </div>
        <div style={{ textAlign:'right' }}><MoneyContext p={p} /></div>
        <div style={{ display:'flex', justifyContent:'flex-end' }}><Mover value={p.mover} /></div>
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <span onClick={(e) => { e.stopPropagation(); onChevron(); }} style={{ display:'flex', padding:4, margin:-4, cursor:'pointer' }}>
            <svg className={'wc-rk-chev' + (open ? ' open' : '')} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
          </span>
        </div>
      </div>
      {open && (
        <div className="wc-rk-drawer" style={{ padding:'0 22px 18px 22px' }}>
          <div style={{ borderTop:'1px solid var(--line)', paddingTop:16, display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:28 }}>
            <div>
              <SectionLabel style={{ marginBottom:10 }}>Points vs ceiling</SectionLabel>
              <CeilingExplain p={p} />
              <div style={{ marginTop:16 }}>
                <SectionLabel style={{ marginBottom:10 }}>Scoring rounds left</SectionLabel>
                <StageTracker />
              </div>
            </div>
            <div>
              <SectionLabel style={{ marginBottom:10 }}>Still winnable from</SectionLabel>
              <ContribChips p={p} />
              <button className="wc-btn wc-btn-ghost" onClick={(e) => { e.stopPropagation(); nav && nav.go('player', { name: p.name }); }}
                style={{ marginTop:16, padding:'10px 14px', fontSize:13, width:'100%' }}>
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  View full profile
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- persistent "you" anchor ---------- */
function YouAnchor({ onJump, compact }) {
  const W = window.WADAU, me = W.me;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding: compact ? '10px 14px' : '12px 16px',
      background:'var(--surface)', border:'1px solid var(--lime-line)', borderRadius:14,
      boxShadow:'0 -6px 24px -16px rgba(0,0,0,0.5), 0 0 0 1px var(--lime-line)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
        <span className="wc-num" style={{ fontSize:18, fontWeight:600, color: me.inMoney ? 'var(--gold)' : 'var(--text)' }}>{me.rank}</span>
        <div className="wc-avatar" style={{ width:28, height:28, borderRadius:8, background:'var(--lime)', color:'var(--on-lime)' }}>{me.short}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:14, fontWeight:700 }}>You</span>
            <Mover value={me.mover} showZero={false} />
          </div>
          <div className="wc-num" style={{ fontSize:10.5, color:'var(--dim)', marginTop:1 }}>
            {me.points} pts · {me.inMoney ? 'in the money' : `${me.toMoney} from money`}
          </div>
        </div>
      </div>
      <button className="wc-rk-jump" onClick={onJump}>
        Jump to me
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" /></svg>
      </button>
    </div>
  );
}

Object.assign(window, {
  StageTracker, CeilingExplain, MoneyContext, ContribChips, RowDrawer,
  LeanRowMobile, LeanRowDesktop, YouAnchor,
});
