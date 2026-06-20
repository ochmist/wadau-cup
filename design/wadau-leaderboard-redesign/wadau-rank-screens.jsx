/* Wadau Cup — redesigned leaderboard screens (mobile + desktop) using the lean
   rows, expand drawers, and the "you" anchor. */

function scrollToRow(node) {
  if (!node) return;
  let sp = node.parentElement;
  while (sp && sp !== document.body) {
    const oy = getComputedStyle(sp).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && sp.scrollHeight > sp.clientHeight + 4) break;
    sp = sp.parentElement;
  }
  if (!sp || sp === document.body) {
    if (node.scrollIntoView) node.scrollIntoView({ block: 'center' });
    return;
  }
  const spRect = sp.getBoundingClientRect();
  const nRect = node.getBoundingClientRect();
  const target = sp.scrollTop + (nRect.top - spRect.top) - 70;
  try { sp.scrollTo({ top: target, behavior: 'smooth' }); } catch (e) { sp.scrollTop = target; }
}

function useJumpToMe() {
  const meRef = React.useRef(null);
  const [flash, setFlash] = React.useState(false);
  const jump = React.useCallback(() => {
    scrollToRow(meRef.current);
    setFlash(false);
    setTimeout(() => { setFlash(true); setTimeout(() => setFlash(false), 1700); }, 40);
  }, []);
  return { meRef, flash, jump };
}

/* small standings header bits */
function CompactPotStrip() {
  const W = window.WADAU;
  return (
    <div className="wc-card" style={{ padding:'12px 15px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div>
        <div className="wc-eyebrow">Prize pool</div>
        <div className="wc-num" style={{ fontSize:21, fontWeight:600, letterSpacing:'-0.02em', marginTop:3 }}>{fmtKES(W.pot)}</div>
      </div>
      <div style={{ display:'flex', gap:13, textAlign:'right' }}>
        {[['1st', W.payouts[0]], ['2nd', W.payouts[1]], ['3rd', W.payouts[2]]].map(([k, v]) => (
          <div key={k}>
            <div className="wc-eyebrow wc-gold-text" style={{ fontSize:8.5 }}>{k}</div>
            <div className="wc-num" style={{ fontSize:12.5, fontWeight:600, color:'var(--gold)', marginTop:2 }}>{fmtK(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopPotBand() {
  const W = window.WADAU;
  return (
    <div className="wc-card" style={{ padding:'18px 22px', marginBottom:20, position:'relative', overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>
      <div style={{ position:'absolute', top:-50, right:-20, width:200, height:200, borderRadius:'50%',
        background:'radial-gradient(circle, var(--lime-soft), transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'relative' }}>
        <div className="wc-eyebrow">Prize pool</div>
        <div className="wc-num" style={{ fontSize:30, fontWeight:600, letterSpacing:'-0.03em', lineHeight:1, marginTop:7 }}>{fmtKES(W.pot)}</div>
        <div style={{ display:'flex', gap:14, marginTop:9 }}>
          <span><span className="wc-num" style={{ fontSize:13, fontWeight:600 }}>{W.entries}</span> <span className="wc-eyebrow">players</span></span>
          <span><span className="wc-num" style={{ fontSize:13, fontWeight:600 }}>{fmtK(W.buyin)}</span> <span className="wc-eyebrow">buy-in</span></span>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, position:'relative' }}>
        {[['1st', W.payouts[0]], ['2nd', W.payouts[1]], ['3rd', W.payouts[2]]].map(([k, v], i) => (
          <div key={k} style={{ minWidth:96, padding:'10px 14px', borderRadius:11, background:'var(--surface-2)', border:'1px solid var(--gold-line)' }}>
            <div className="wc-eyebrow wc-gold-text" style={{ fontSize:9 }}>{k}</div>
            <div className="wc-num wc-gold-fill" style={{ fontSize:16, fontWeight:600, marginTop:4 }}>{fmtKES(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StandingsBar() {
  const W = window.WADAU;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <span style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.01em' }}>Standings</span>
        <span className="wc-pill" style={{ padding:'3px 8px' }}>{W.round}</span>
      </div>
      <span className="wc-eyebrow">Tap a row to explain</span>
    </div>
  );
}

/* ---------------- MOBILE ---------------- */
function RankLeaderboardMobile({ nav, theme, onTheme, tweaks }) {
  const W = window.WADAU;
  const t = tweaks || {};
  const { meRef, flash, jump } = useJumpToMe();
  const [openName, setOpenName] = React.useState(null);
  const toggle = (name) => setOpenName((o) => (o === name ? null : name));
  const rowTap = t.rowTap || 'expand';
  const onRow = (name) => () => (rowTap === 'profile' ? nav.go('player', { name }) : toggle(name));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ flex:1, minWidth:0, overflowY:'auto' }}>
        <div style={{ padding:'12px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Crest size={26} />
            <div style={{ fontSize:15.5, fontWeight:800, letterSpacing:'-0.02em' }}>Wadau Cup</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="wc-pill"><span className="wc-live-dot" />Live</span>
            <ThemeToggle theme={theme} onToggle={onTheme} />
          </div>
        </div>

        <div style={{ padding:'0 16px' }}><CompactPotStrip /></div>

        <div style={{ padding:'10px 16px 0' }}>
          <button onClick={() => nav.go('worldcup')} className="wc-card" style={{ padding:'11px 14px', width:'100%', textAlign:'left', cursor:'pointer',
            display:'flex', alignItems:'center', gap:11, fontFamily:'inherit', color:'var(--text)' }}>
            <span style={{ fontSize:17, flex:'none' }}>🏆</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:700, letterSpacing:'-0.01em' }}>World Cup tables</div>
              <div className="wc-eyebrow" style={{ marginTop:2 }}>Group standings &amp; results</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--dim)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
          </button>
        </div>

        <div style={{ padding:'14px 16px 8px' }}><StandingsBar /></div>

        <div className="wc-card" style={{ margin:'0 16px', overflow:'hidden', padding:0 }}>
          {W.players.map((p, i) => (
            <React.Fragment key={p.name}>
              <div className={flash && p.me ? 'wc-rk-flash' : ''}>
                <LeanRowMobile p={p} last={i === W.players.length - 1} open={openName === p.name}
                  onRowClick={onRow(p.name)} onChevron={() => toggle(p.name)} nav={nav} flashRef={meRef} showCeilingHint={t.ceilingHint} />
              </div>
              {p.rank === 3 && <MoneyLine />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ height:16 }} />
      </div>

      {/* persistent you-anchor — always present so jump-to-me is never hidden */}
      <div style={{ flex:'none', padding:'10px 14px 12px', background:'linear-gradient(180deg, transparent, var(--bg) 40%)' }}>
        <YouAnchor onJump={jump} compact />
      </div>
    </div>
  );
}

/* ---------------- DESKTOP ---------------- */
function RankLeaderboardDesktop({ nav, theme, onTheme, tweaks }) {
  const W = window.WADAU;
  const t = tweaks || {};
  const { meRef, flash, jump } = useJumpToMe();
  const [openName, setOpenName] = React.useState(null);
  const toggle = (name) => setOpenName((o) => (o === name ? null : name));
  const rowTap = t.rowTap || 'expand';
  const onRow = (name) => () => (rowTap === 'profile' ? nav.go('player', { name }) : toggle(name));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* top bar */}
      <div style={{ flex:'none', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 28px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <Crest size={32} />
          <div>
            <div style={{ fontSize:17, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1 }}>Wadau Cup</div>
            <div className="wc-eyebrow" style={{ marginTop:3 }}>World Cup 2026</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:24, alignItems:'center' }}>
          {['Leaderboard', 'Results', 'Banter', 'My Picks'].map((x, i) => {
            const onResults = x === 'Results';
            return (
              <span key={x} onClick={onResults ? () => nav.go('worldcup') : undefined}
                style={{ fontSize:14, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? 'var(--text)' : 'var(--dim)', position:'relative', paddingBottom:3, cursor: onResults ? 'pointer' : 'default' }}>
                {x}{i === 0 && <span style={{ position:'absolute', left:0, right:0, bottom:-16, height:2, background:'var(--lime)' }} />}
              </span>
            );
          })}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <ThemeToggle theme={theme} onToggle={onTheme} />
          <div className="wc-avatar" style={{ background:'var(--lime)', color:'var(--on-lime)' }}>{W.me.short}</div>
        </div>
      </div>

      <div style={{ flex:1, minWidth:0, overflowY:'auto' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'22px 28px 56px' }}>
          <DesktopPotBand />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24, alignItems:'start' }}>
            {/* table */}
            <div className="wc-card" style={{ overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'17px 22px 14px' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:11 }}>
                  <span style={{ fontSize:17, fontWeight:700, letterSpacing:'-0.01em' }}>Standings</span>
                  <span className="wc-eyebrow">Updated {W.updated}</span>
                </div>
                <span className="wc-eyebrow">Tap a row to explain the ceiling</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'52px 1fr 92px 150px 60px 28px', gap:16, padding:'0 22px 10px', borderBottom:'1px solid var(--line)' }}>
                {['Rank', 'Player', 'Points', 'Money', 'Move', ''].map((h, i) => (
                  <span key={i} className="wc-eyebrow" style={{ textAlign: i >= 2 && i <= 3 ? 'right' : 'left', fontSize:9.5 }}>{h}</span>
                ))}
              </div>
              {W.players.map((p, i) => (
                <React.Fragment key={p.name}>
                  <div className={flash && p.me ? 'wc-rk-flash' : ''}>
                    <LeanRowDesktop p={p} last={i === W.players.length - 1} open={openName === p.name}
                      onRowClick={onRow(p.name)} onChevron={() => toggle(p.name)} nav={nav} flashRef={meRef} showCeilingHint={t.ceilingHint} />
                  </div>
                  {p.rank === 3 && <MoneyLine />}
                </React.Fragment>
              ))}
            </div>

            {/* rail */}
            <div style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:18 }}>
              {/* your position card */}
              <div className="wc-card" style={{ padding:'18px 20px', borderColor:'var(--lime-line)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <SectionLabel style={{ color:'var(--lime-ink)' }}>Your position</SectionLabel>
                  <Mover value={W.me.mover} showZero={false} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:13 }}>
                  <span className="wc-num" style={{ fontSize:30, fontWeight:600, color: W.me.inMoney ? 'var(--gold)' : 'var(--text)', lineHeight:1 }}>{W.me.rank}</span>
                  <div style={{ flex:1 }}>
                    <div className="wc-num" style={{ fontSize:15, fontWeight:600 }}>{W.me.points} <span className="wc-eyebrow">pts</span></div>
                    <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>{W.me.inMoney ? 'in the money' : `${W.me.toMoney} pts from the money`}</div>
                  </div>
                </div>
                <div style={{ marginTop:14 }}><CeilingBar points={W.me.points} ceiling={W.me.ceiling} scaleMax={W.scaleMax} /></div>
                <button className="wc-rk-jump" onClick={jump} style={{ marginTop:15, width:'100%', justifyContent:'center', padding:'9px' }}>
                  Jump to my row
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" /></svg>
                </button>
              </div>

              {/* still alive for 1st */}
              <div className="wc-card" style={{ padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <SectionLabel>Still alive for 1st</SectionLabel>
                  <span className="wc-num" style={{ fontSize:13, fontWeight:600, color:'var(--lime-ink)' }}>{W.contention} of {W.entries}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--dim)', marginTop:9, lineHeight:1.5 }}>
                  Players whose <b style={{ color:'var(--text)' }}>ceiling</b> can still reach the leader's {W.leaderPoints}.
                </div>
                <div style={{ marginTop:13, display:'flex', flexDirection:'column', gap:9 }}>
                  {W.players.slice(0, 4).map((p) => (
                    <div key={p.name} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => nav.go('player', { name:p.name })}>
                      <span className="wc-num" style={{ fontSize:11, color:'var(--faint)', width:12 }}>{p.rank}</span>
                      <span style={{ fontSize:12.5, fontWeight:500, width:58 }}>{p.me ? 'You' : p.name}</span>
                      <div style={{ flex:1 }}><CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={W.scaleMax} showCaption={false} /></div>
                      <span className="wc-num" style={{ fontSize:11, color:'var(--faint)', width:26, textAlign:'right' }}>{p.ceiling}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* scoring rounds left */}
              <div className="wc-card" style={{ padding:'18px 20px' }}>
                <SectionLabel style={{ marginBottom:12 }}>Scoring rounds left</SectionLabel>
                <StageTracker />
              </div>

              {/* world cup standings entry */}
              <button onClick={() => nav.go('worldcup')} className="wc-card" style={{ padding:'15px 18px', textAlign:'left', cursor:'pointer',
                display:'flex', alignItems:'center', gap:13, fontFamily:'inherit', width:'100%', color:'var(--text)' }}>
                <div style={{ width:36, height:36, borderRadius:10, flex:'none', background:'var(--surface-3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏆</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, letterSpacing:'-0.01em' }}>World Cup tables</div>
                  <div className="wc-eyebrow" style={{ marginTop:3 }}>Group standings &amp; results</div>
                </div>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--dim)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RankLeaderboardMobile, RankLeaderboardDesktop, useJumpToMe, scrollToRow });
