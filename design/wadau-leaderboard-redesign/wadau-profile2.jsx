/* Wadau Cup — redesigned player profile. Makes the points path legible:
   what was banked, from which teams, what's still winnable, and how that
   builds the ceiling. Renders mobile (scroll) or desktop (2-col) via `mode`. */

function ProfileHero({ p, big }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
      <div className="wc-avatar" style={{ width: big ? 60 : 54, height: big ? 60 : 54, borderRadius:17, fontSize: big ? 20 : 18,
        background: p.me ? 'var(--lime)' : 'var(--surface-3)', color: p.me ? 'var(--on-lime)' : 'var(--dim)' }}>{p.short}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize: big ? 24 : 20, fontWeight:800, letterSpacing:'-0.02em' }}>{p.me ? 'You' : p.name}</span>
          {p.me && <span className="wc-tag-you">You</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginTop:6 }}>
          <span className="wc-num" style={{ fontSize:14, fontWeight:600, color: p.inMoney ? 'var(--gold)' : 'var(--dim)' }}>Rank #{p.rank}</span>
          <Mover value={p.mover} />
          {!p.paid && <span className="wc-num" style={{ fontSize:9.5, color:'var(--down)', background:'var(--down-soft)', padding:'1px 6px', borderRadius:4 }}>UNPAID</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', flex:'none' }}>
        <div className="wc-num" style={{ fontSize: big ? 34 : 30, fontWeight:600, lineHeight:1 }}>{p.points}</div>
        <div className="wc-eyebrow" style={{ marginTop:4 }}>points</div>
        <div className="wc-num" style={{ fontSize:13, fontWeight:600, color: p.inMoney ? 'var(--gold)' : 'var(--faint)', marginTop:9, whiteSpace:'nowrap' }}>
          {p.inMoney ? fmtKES(p.payout) : 'Out of money'}
        </div>
      </div>
    </div>
  );
}

function PointsPathCard({ p }) {
  const W = window.WADAU;
  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <SectionLabel>Points path</SectionLabel>
      <div style={{ fontSize:14.5, lineHeight:1.55, marginTop:10, color:'var(--text)' }}>
        Banked <b className="wc-num" style={{ color:'var(--lime-ink)' }}>{p.points}</b>.
        Up to <b className="wc-num">{p.winnable}</b> more {p.winnable === 0 ? 'is' : 'are'} still winnable from your{' '}
        <b>{p.aliveSorted.length} alive {p.aliveSorted.length === 1 ? 'team' : 'teams'}</b> — a ceiling of <b className="wc-num">{p.ceiling}</b>.
      </div>
      <div style={{ marginTop:15 }}><CeilingBar points={p.points} ceiling={p.ceiling} scaleMax={W.scaleMax} /></div>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:11 }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ width:11, height:11, borderRadius:3, background:'var(--lime)' }} /><span className="wc-eyebrow">Banked {p.points}</span>
        </span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <span style={{ width:11, height:11, borderRadius:3, background:'var(--track-2)' }} /><span className="wc-eyebrow">Winnable +{p.winnable}</span>
        </span>
      </div>
      <div style={{ marginTop:17, paddingTop:15, borderTop:'1px solid var(--line)' }}>
        <SectionLabel style={{ marginBottom:11 }}>Scoring rounds left</SectionLabel>
        <StageTracker />
      </div>
    </div>
  );
}

/* the ceiling ledger — every team's contribution, summing to the ceiling */
function LedgerRow({ t, alive, last, nav }) {
  const W = window.WADAU;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 2px', borderBottom: last ? 'none' : '1px solid var(--line)', opacity: alive ? 1 : 0.7 }}>
      <TierBadge tier={t.tier} size={30} />
      <span onClick={() => nav && nav.go('team', { code: t.code })} className={'wc-flag ' + (alive ? 'alive' : 'out')} style={{ width:24, height:24, fontSize:15, cursor: nav ? 'pointer' : 'default' }}>{t.flag}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600 }}>{t.name}</div>
        <div className="wc-num" style={{ fontSize:10.5, color:'var(--faint)', marginTop:2 }}>
          {alive ? (W.NEXT[t.code] || 'Round of 16').replace(/^R16 · /, 'Next · ') : 'Out · ' + (W.OUT[t.code] || 'Group')}
        </div>
      </div>
      <div style={{ textAlign:'right', width:52, flex:'none' }}>
        <div className="wc-num" style={{ fontSize:15, fontWeight:600 }}>{t.pts}</div>
        <div className="wc-eyebrow" style={{ fontSize:8 }}>earned</div>
      </div>
      <div style={{ textAlign:'right', width:58, flex:'none' }}>
        {alive && t.rem > 0
          ? <><div className="wc-num" style={{ fontSize:15, fontWeight:600, color:'var(--lime-ink)' }}>+{t.rem}</div><div className="wc-eyebrow" style={{ fontSize:8 }}>winnable</div></>
          : <div className="wc-num" style={{ fontSize:14, color:'var(--faint)' }}>—</div>}
      </div>
    </div>
  );
}

function CeilingLedger({ p, nav }) {
  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <SectionLabel>How your ceiling is built</SectionLabel>
      <div style={{ fontSize:13, color:'var(--dim)', marginTop:9, lineHeight:1.5 }}>
        Everything you’ve banked, plus the most each <b style={{ color:'var(--text)' }}>alive</b> team can still win.
      </div>

      <div style={{ marginTop:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--lime)' }} />
          <SectionLabel style={{ color:'var(--lime-ink)' }}>Alive · {p.aliveSorted.length}</SectionLabel>
        </div>
        {p.aliveSorted.map((t, i) => <LedgerRow key={t.code} t={t} alive last={i === p.aliveSorted.length - 1} nav={nav} />)}
      </div>

      {p.outSorted.length > 0 && (
        <div style={{ marginTop:16 }}>
          <SectionLabel style={{ marginBottom:4 }}>✕ Eliminated · {p.outSorted.length} · banked, nothing left</SectionLabel>
          {p.outSorted.map((t, i) => <LedgerRow key={t.code} t={t} alive={false} last={i === p.outSorted.length - 1} nav={nav} />)}
        </div>
      )}

      {/* totals */}
      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        {[['Banked', p.points, 'var(--lime-ink)'], ['Winnable', '+' + p.winnable, 'var(--text)'], ['Ceiling', p.ceiling, 'var(--text)']].map(([k, v, c]) => (
          <div key={k} style={{ flex:1, padding:'11px 13px', borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--line)' }}>
            <div className="wc-num" style={{ fontSize:20, fontWeight:600, color:c, lineHeight:1 }}>{v}</div>
            <div className="wc-eyebrow" style={{ marginTop:6, fontSize:9 }}>{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhereYouStand({ p }) {
  const W = window.WADAU;
  const { ahead, behind } = W.rivalsFor(p);
  const Line = ({ label, val, tone }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--line)' }}>
      <span style={{ fontSize:13, color:'var(--dim)' }}>{label}</span>
      <span className="wc-num" style={{ fontSize:13.5, fontWeight:600, color: tone || 'var(--text)' }}>{val}</span>
    </div>
  );
  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <SectionLabel>Where {p.me ? 'you' : p.name.split(' ')[0]} stand{p.me ? '' : 's'}</SectionLabel>
      <div style={{ marginTop:8 }}>
        {!p.inMoney && <Line label="To the money (3rd)" val={`${p.toMoney} pts back`} tone="var(--down)" />}
        {p.rank > 1 && <Line label="To the leader" val={`${p.gapToLeader} pts back`} />}
        {ahead && <Line label={`Catch ${ahead.me ? 'you' : ahead.name} (#${ahead.rank})`} val={`+${Math.max(0, ahead.points - p.points)} to pass`} tone="var(--lime-ink)" />}
        {behind && <Line label={`${behind.me ? 'You' : behind.name} (#${behind.rank}) chasing`} val={`${Math.max(0, p.points - behind.points)} pts behind`} />}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:10 }}>
          <span style={{ fontSize:13, color:'var(--dim)' }}>Can still reach 1st?</span>
          <span className="wc-num" style={{ fontSize:13.5, fontWeight:600, color: p.canReachFirst ? 'var(--lime-ink)' : 'var(--faint)' }}>
            {p.canReachFirst ? 'Yes — ceiling clears it' : 'No longer possible'}
          </span>
        </div>
      </div>
    </div>
  );
}

function TieBreaker({ p }) {
  return (
    <div className="wc-card" style={{ padding:'15px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <SectionLabel>Tie-breaker</SectionLabel>
        <div style={{ fontSize:13.5, fontWeight:600, marginTop:4 }}>Goals in the Final</div>
      </div>
      <span className="wc-num" style={{ fontSize:24, fontWeight:600, color:'var(--lime-ink)' }}>{p.finalGoals}</span>
    </div>
  );
}

function RankProfile({ mode, nav, params, theme, onTheme }) {
  const W = window.WADAU;
  const p = W.players.find((x) => x.name === (params && params.name)) || W.me;

  if (mode === 'desktop') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ flex:'none', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:'1px solid var(--line)' }}>
          <button onClick={() => nav.back()} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'var(--dim)', cursor:'pointer', fontFamily:'inherit', fontSize:13.5, fontWeight:600 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5" /></svg>
            Back to leaderboard
          </button>
          <ThemeToggle theme={theme} onToggle={onTheme} />
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ maxWidth:1040, margin:'0 auto', padding:'24px 28px 56px' }}>
            <div className="wc-card" style={{ padding:'22px 24px' }}><ProfileHero p={p} big /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:20, alignItems:'start' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <PointsPathCard p={p} />
                <WhereYouStand p={p} />
                <TieBreaker p={p} />
              </div>
              <CeilingLedger p={p} nav={nav} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // mobile
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <BackBar title={p.me ? 'You' : p.name} onBack={() => nav.back()} right={<ThemeToggle theme={theme} onToggle={onTheme} />} />
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ padding:'16px 16px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <ProfileHero p={p} />
          <PointsPathCard p={p} />
          <CeilingLedger p={p} nav={nav} />
          <WhereYouStand p={p} />
          <TieBreaker p={p} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RankProfile, ProfileHero, PointsPathCard, CeilingLedger, WhereYouStand, TieBreaker });
