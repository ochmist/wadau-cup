/* Wadau Cup — team detail page. Tap any team flag (leaderboard or profile) to land here.
   Answers: how is this team doing, what has it paid the pool, who holds it, and what's
   still winnable. Grounded entirely in WADAU data (results feed, tiers, picks). */

function teamHolders(code) {
  const W = window.WADAU;
  const list = [];
  W.players.forEach((p) => {
    const t = p.teams.find((x) => x.code === code);
    if (t) list.push({ name:p.name, short:p.short, rank:p.rank, me:p.me, inMoney:p.inMoney, pts:t.pts, rem:t.rem, alive:t.alive });
  });
  return list.sort((a, b) => b.pts - a.pts);
}

function teamResults(code) {
  const W = window.WADAU;
  return W.results.filter((r) => r.kind !== 'callout' && (r.a === code || r.b === code)).map((r) => {
    const isA = r.a === code;
    const opp = isA ? r.b : r.a;
    const gf = isA ? r.sa : r.sb, ga = isA ? r.sb : r.sa;
    const res = r.win === 'draw' ? 'D' : (r.win === code ? 'W' : 'L');
    const got = (r.pts.find((x) => x[0] === code) || [, , 0])[2];
    return { round:r.round, opp, gf, ga, res, got, pens:r.pens };
  });
}

function TeamLiveStrip({ code }) {
  const W = window.WADAU, L = W.LIVE;
  if (!L) return null;
  const M = L.MATCH;
  if (code !== M.home.code && code !== M.away.code) return null;
  return (
    <a href="Wadau Cup - Live Match.html" style={{ textDecoration:'none', color:'inherit', display:'block' }}>
      <div className="wc-card" style={{ padding:'11px 15px', borderColor:'var(--lime-line)', display:'flex', alignItems:'center', gap:11,
        background:'var(--lime-soft)' }}>
        <span className="wc-live-dot" />
        <span className="wc-eyebrow" style={{ color:'var(--lime-ink)' }}>Live now</span>
        <span style={{ fontSize:13.5, fontWeight:700, letterSpacing:'-0.01em', flex:1 }}>
          {M.home.flag} {M.home.name} {M.home.score}–{M.away.score} {M.away.name} {M.away.flag}
        </span>
        <span className="wc-num" style={{ fontSize:12, fontWeight:600, color:'var(--lime-ink)' }}>{M.minute}′</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--lime-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h9M8 4l4 4-4 4" /></svg>
      </div>
    </a>
  );
}

function TeamHero({ code, big }) {
  const W = window.WADAU, T = W.T;
  const t = T[code], alive = !(code in W.OUT);
  const meta = W.tierMeta[t.t];
  const statusLine = alive ? (W.NEXT[code] || 'Round of 16') : ('Eliminated · ' + (W.OUT[code] || 'Group') + ' stage');
  return (
    <div className="wc-card" style={{ padding: big ? '22px 24px' : '18px 18px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-50, right:-30, width:170, height:170, borderRadius:'50%',
        background:'radial-gradient(circle, var(--surface-3), transparent 70%)', pointerEvents:'none' }} />
      <div style={{ display:'flex', alignItems:'center', gap:16, position:'relative' }}>
        <div style={{ width: big ? 72 : 60, height: big ? 72 : 60, borderRadius:18, flex:'none', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: big ? 40 : 34, background:'var(--flag-bg)', border:'1px solid var(--flag-bd)', boxShadow:'0 8px 22px -12px rgba(0,0,0,0.5)',
          filter: alive ? 'none' : 'grayscale(1)', opacity: alive ? 1 : 0.6 }}>{t.f}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, flexWrap:'wrap' }}>
            <span style={{ fontSize: big ? 26 : 22, fontWeight:800, letterSpacing:'-0.02em' }}>{t.n}</span>
            <TierBadge tier={t.t} size={24} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:7 }}>
            <span className="wc-pill" style={{ padding:'3px 9px' }}>Group {W.GROUPS[code] || '—'}</span>
            <span style={{ fontSize:12.5, color:'var(--dim)', fontWeight:500 }}>{meta.label} · +{meta.win}/win</span>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:9, marginTop:16, padding:'10px 13px', borderRadius:12,
        background: alive ? 'var(--lime-soft)' : 'var(--surface-2)', border:'1px solid '+(alive ? 'var(--lime-line)' : 'var(--line)') }}>
        {alive
          ? <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--up)', flex:'none', boxShadow:'0 0 0 3px var(--up-soft)' }} />
          : <span style={{ color:'var(--down)', fontSize:13, flex:'none' }}>✕</span>}
        <span style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', color: alive ? 'var(--lime-ink)' : 'var(--dim)' }}>
          {alive ? 'Still in' : 'Out'}
        </span>
        <span style={{ fontSize:12.5, color:'var(--dim)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>· {statusLine}</span>
      </div>
    </div>
  );
}

function TeamStatTrio({ code }) {
  const holders = teamHolders(code);
  const poolBanked = holders.reduce((s, h) => s + h.pts, 0);
  const poolWinnable = holders.reduce((s, h) => s + (h.alive ? h.rem - h.pts : 0), 0);
  const stat = (v, l, c) => (
    <div className="wc-card" style={{ flex:1, padding:'13px 15px' }}>
      <div className="wc-num" style={{ fontSize:22, fontWeight:600, color: c || 'var(--text)', lineHeight:1 }}>{v}</div>
      <div className="wc-eyebrow" style={{ marginTop:6, fontSize:9 }}>{l}</div>
    </div>
  );
  return (
    <div style={{ display:'flex', gap:10 }}>
      {stat(holders.length, 'held by', 'var(--text)')}
      {stat(poolBanked, 'pool pts delivered', 'var(--lime-ink)')}
      {stat('+' + Math.max(0, poolWinnable), 'still winnable', 'var(--gold)')}
    </div>
  );
}

function TeamPath({ code }) {
  const W = window.WADAU;
  const results = teamResults(code);
  const alive = !(code in W.OUT);
  const isLive = W.LIVE && (code === W.LIVE.MATCH.home.code || code === W.LIVE.MATCH.away.code);
  const perWin = W.tierMeta[W.T[code].t].win;
  const resCol = (r) => r === 'W' ? 'var(--up)' : r === 'L' ? 'var(--down)' : 'var(--flat)';
  const resBg = (r) => r === 'W' ? 'var(--up-soft)' : r === 'L' ? 'var(--down-soft)' : 'var(--surface-3)';

  // Build the full road ahead: every knockout round this team could still play.
  const KO = [['R16', 'Round of 16'], ['QF', 'Quarter-final'], ['SF', 'Semi-final'], ['F', 'Final']];
  const playedR16 = results.some((r) => /16/.test(r.round));
  const ns = (W.NEXT[code] || '').split(' · ');
  const nextOpp = (ns[1] || '').replace(/^vs\s*/, '');
  const nextWhen = ns[2] || '';
  let liveOpp = '';
  if (isLive) {
    const M = W.LIVE.MATCH;
    liveOpp = code === M.home.code ? M.away.name : M.home.name;
  }
  const road = [];
  if (alive) {
    KO.forEach(([key, label]) => {
      if (key === 'R16' && playedR16 && !isLive) return;
      const immediate = road.length === 0;
      const live = immediate && isLive && key === 'R16';
      road.push({ key, label, live,
        opp: live ? liveOpp : (immediate ? nextOpp : ''), when: immediate ? nextWhen : '', perWin });
    });
  }
  const totalPotential = road.length * perWin;

  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <SectionLabel>Path so far</SectionLabel>
      {results.length === 0 && <div style={{ fontSize:13, color:'var(--faint)', marginTop:11 }}>No scored results in the recent feed.</div>}
      <div style={{ marginTop:11 }}>
        {results.map((r, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--line)' }}>
            <span style={{ width:22, height:22, flex:'none', borderRadius:7, fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center', color:resCol(r.res), background:resBg(r.res) }}>{r.res}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:600 }}>
                <span style={{ marginRight:6 }}>{W.T[r.opp].f}</span>vs {W.T[r.opp].n}
              </div>
              <div className="wc-eyebrow" style={{ marginTop:2 }}>{r.round}</div>
            </div>
            <div style={{ textAlign:'right', flex:'none' }}>
              <div className="wc-num" style={{ fontSize:14, fontWeight:600 }}>{r.gf}–{r.ga}{r.pens && <span style={{ color:'var(--faint)', fontSize:10, marginLeft:4 }}>p{r.pens}</span>}</div>
              {r.got > 0 && <div className="wc-num" style={{ fontSize:11, color:'var(--lime-ink)', fontWeight:600, marginTop:2 }}>+{r.got} pool</div>}
            </div>
          </div>
        ))}
      </div>

      {!alive && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:11, padding:'11px 13px', borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--line)' }}>
          <span style={{ color:'var(--down)', fontSize:13 }}>✕</span>
          <span style={{ fontSize:13, color:'var(--dim)' }}>Eliminated — no games remaining.</span>
        </div>
      )}

      {road.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <SectionLabel>Road ahead</SectionLabel>
            <span className="wc-num" style={{ fontSize:11, color:'var(--gold)', fontWeight:600 }}>up to +{totalPotential} more</span>
          </div>
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', left:11, top:8, bottom:8, width:1.5, background:'var(--line)' }} />
            {road.map((g, i) => (
              <div key={g.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', position:'relative' }}>
                <span style={{ width:23, height:23, flex:'none', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1,
                  background: g.live ? 'var(--lime-soft)' : 'var(--surface-3)', border:'1.5px solid '+(g.live ? 'var(--lime-line)' : (i === 0 ? 'var(--line-2)' : 'var(--line)')) }}>
                  {g.live
                    ? <span className="wc-live-dot" style={{ width:7, height:7 }} />
                    : <span className="wc-num" style={{ fontSize:9.5, fontWeight:700, color: i === 0 ? 'var(--text)' : 'var(--faint)' }}>{g.key === 'F' ? '🏆' : i + 1}</span>}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:600 }}>
                    {g.label}{g.opp && <span style={{ color:'var(--dim)', fontWeight:500 }}> · vs {g.opp}</span>}
                  </div>
                  <div className="wc-eyebrow" style={{ marginTop:2 }}>
                    {g.live ? 'Live now' : (i === 0 ? (g.when || 'Up next') : 'Opponent TBC')}
                  </div>
                </div>
                <div style={{ textAlign:'right', flex:'none' }}>
                  <div className="wc-num" style={{ fontSize:12.5, fontWeight:600, color: i === 0 ? 'var(--lime-ink)' : 'var(--dim)' }}>+{g.perWin}</div>
                  <div className="wc-eyebrow" style={{ marginTop:1, fontSize:8 }}>if won</div>
                </div>
              </div>
            ))}
          </div>
          <div className="wc-eyebrow" style={{ marginTop:11, paddingTop:11, borderTop:'1px solid var(--line)', color:'var(--faint)' }}>
            Win all {road.length} to lift the trophy · +{perWin} to every holder per round
          </div>
        </div>
      )}
    </div>
  );
}

function TeamHolders({ code, nav }) {
  const holders = teamHolders(code);
  const top = holders[0];
  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <SectionLabel>In the pool · {holders.length} {holders.length === 1 ? 'holder' : 'holders'}</SectionLabel>
        {top && <span className="wc-num" style={{ fontSize:11, color:'var(--faint)' }}>most valuable to {top.me ? 'you' : top.name.split(' ')[0]}</span>}
      </div>
      <div style={{ marginTop:6 }}>
        {holders.map((h, i) => (
          <div key={h.name} onClick={() => nav && nav.go('player', { name:h.name })}
            style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 0', borderBottom: i === holders.length - 1 ? 'none' : '1px solid var(--line)', cursor:'pointer' }}>
            <span className="wc-num" style={{ fontSize:12, color: h.inMoney ? 'var(--gold)' : 'var(--faint)', width:24, fontWeight:600 }}>#{h.rank}</span>
            <div className="wc-avatar" style={{ width:30, height:30, borderRadius:9, fontSize:11,
              background: h.me ? 'var(--lime)' : 'var(--surface-3)', color: h.me ? 'var(--on-lime)' : 'var(--dim)' }}>{h.short}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:14, fontWeight:600 }}>{h.me ? 'You' : h.name}</span>
                {h.me && <span className="wc-tag-you">You</span>}
              </div>
            </div>
            <div style={{ textAlign:'right', flex:'none' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:3, justifyContent:'flex-end' }}>
                <span className="wc-num" style={{ fontSize:15, fontWeight:600 }}>{h.pts}</span>
                <span className="wc-eyebrow" style={{ fontSize:8 }}>pts</span>
              </div>
              {h.alive && (h.rem - h.pts) > 0 && <div className="wc-num" style={{ fontSize:10.5, color:'var(--lime-ink)', marginTop:2 }}>+{h.rem - h.pts} left</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamScoring({ code }) {
  const W = window.WADAU, t = W.T[code], meta = W.tierMeta[t.t];
  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <SectionLabel>Tier &amp; scoring</SectionLabel>
        <TierBadge tier={t.t} size={26} />
      </div>
      <div style={{ fontSize:15, fontWeight:700, marginTop:11 }}>Tier {t.t} · {meta.label}</div>
      <div style={{ fontSize:13, color:'var(--dim)', marginTop:6, lineHeight:1.55 }}>{meta.blurb}</div>
      <div style={{ display:'flex', gap:10, marginTop:14 }}>
        <div style={{ flex:1, padding:'11px 13px', borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--line)' }}>
          <div className="wc-num" style={{ fontSize:20, fontWeight:600, color:'var(--lime-ink)', lineHeight:1 }}>+{meta.win}</div>
          <div className="wc-eyebrow" style={{ marginTop:6, fontSize:9 }}>per win</div>
        </div>
        <div style={{ flex:1, padding:'11px 13px', borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--line)' }}>
          <div className="wc-num" style={{ fontSize:20, fontWeight:600, lineHeight:1 }}>{W.roundsLeft}</div>
          <div className="wc-eyebrow" style={{ marginTop:6, fontSize:9 }}>rounds left</div>
        </div>
      </div>
    </div>
  );
}

function TeamAbout({ code }) {
  const W = window.WADAU, info = W.TEAMINFO[code];
  if (!info) return null;
  const stat = (v, l) => (
    <div style={{ flex:1, padding:'11px 12px', borderRadius:12, background:'var(--surface-2)', border:'1px solid var(--line)' }}>
      <div className="wc-num" style={{ fontSize:18, fontWeight:600, lineHeight:1 }}>{v}</div>
      <div className="wc-eyebrow" style={{ marginTop:6, fontSize:8.5 }}>{l}</div>
    </div>
  );
  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <SectionLabel>About</SectionLabel>
      <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.55, marginTop:9 }}>{info.blurb}</div>
      <div style={{ display:'flex', gap:9, marginTop:14 }}>
        {stat('#' + info.fifa, 'FIFA rank')}
        {stat(info.titles, 'WC titles')}
        {stat(info.apps, 'appearances')}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14, paddingTop:13, borderTop:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'var(--surface-3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>👔</div>
          <div><div className="wc-eyebrow">Head coach</div><div style={{ fontSize:13.5, fontWeight:600, marginTop:2 }}>{info.coach}</div></div>
        </div>
        <div style={{ textAlign:'right' }}><div className="wc-eyebrow">Best finish</div><div style={{ fontSize:12.5, fontWeight:600, marginTop:2, color:'var(--gold)' }}>{info.best}</div></div>
      </div>
    </div>
  );
}

function TeamSquad({ code }) {
  const W = window.WADAU, sq = W.SQUADS && W.SQUADS[code], info = W.TEAMINFO[code];
  if (!sq) {
    if (!info) return null;
    return (
      <div className="wc-card" style={{ padding:'17px 18px' }}>
        <SectionLabel>Key players</SectionLabel>
        <div style={{ marginTop:10 }}>
          {info.key.map((pl, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 0', borderBottom: i === info.key.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <div className="wc-avatar" style={{ width:32, height:32, borderRadius:9, fontSize:11 }}>{pl.name.split(' ').pop().slice(0, 2).toUpperCase()}</div>
              <span style={{ fontSize:14, fontWeight:600, flex:1 }}>{pl.name}</span>
              <span className="wc-pill" style={{ padding:'2px 8px' }}>{pl.pos}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const groups = [['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['FWD', 'Forwards']];
  const total = sq.GK.length + sq.DEF.length + sq.MID.length + sq.FWD.length;
  return (
    <div className="wc-card" style={{ padding:'17px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <SectionLabel>Squad</SectionLabel>
        <span className="wc-num" style={{ fontSize:11, color:'var(--faint)' }}>{total} players</span>
      </div>
      {groups.map(([key, label]) => (
        <div key={key} style={{ marginTop:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span className="wc-num" style={{ fontSize:10, fontWeight:700, color:'var(--lime-ink)', background:'var(--lime-soft)', border:'1px solid var(--lime-line)', borderRadius:6, padding:'2px 7px' }}>{key}</span>
            <span className="wc-eyebrow">{label}</span>
            <span className="wc-num" style={{ fontSize:10, color:'var(--faint)' }}>{sq[key].length}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'7px 8px' }}>
            {sq[key].map((pl, i) => (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 11px 5px 5px', borderRadius:999,
                background: pl.cap ? 'var(--gold-soft)' : 'var(--surface-2)', border:'1px solid ' + (pl.cap ? 'var(--gold-line)' : 'var(--line)') }}>
                <span className="wc-avatar" style={{ width:20, height:20, borderRadius:6, fontSize:8.5,
                  background: pl.cap ? 'var(--gold)' : 'var(--surface-3)', color: pl.cap ? 'var(--on-lime,#0A0E13)' : 'var(--dim)' }}>{pl.name.split(/[ .]/).pop().slice(0, 2).toUpperCase()}</span>
                <span style={{ fontSize:12.5, fontWeight:600 }}>{pl.name}</span>
                {pl.cap && <span className="wc-num" style={{ fontSize:9, fontWeight:700, color:'var(--gold)' }}>C</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
      {info && <div className="wc-eyebrow" style={{ marginTop:15, paddingTop:13, borderTop:'1px solid var(--line)', color:'var(--faint)' }}>Coach · {info.coach}</div>}
    </div>
  );
}

function SegTabs({ tabs, value, onChange }) {
  return (
    <div style={{ display:'flex', gap:3, padding:3, background:'var(--surface-2)', border:'1px solid var(--line)', borderRadius:12 }}>
      {tabs.map((tb) => (
        <button key={tb} onClick={() => onChange(tb)} style={{ flex:1, fontFamily:'inherit', fontSize:13, fontWeight:600, padding:'9px 6px', borderRadius:9, border:'none', cursor:'pointer',
          background: value === tb ? 'var(--bg)' : 'transparent', color: value === tb ? 'var(--text)' : 'var(--dim)', boxShadow: value === tb ? '0 1px 3px rgba(0,0,0,0.18)' : 'none', letterSpacing:'-0.01em' }}>{tb}</button>
      ))}
    </div>
  );
}

function RankTeam({ mode, nav, params, theme, onTheme }) {
  const W = window.WADAU;
  const code = (params && params.code) || 'FRA';
  const t = W.T[code];
  const [tab, setTab] = React.useState('Team');
  const isLiveTeam = !!(W.LIVE && (code === W.LIVE.MATCH.home.code || code === W.LIVE.MATCH.away.code));

  const TeamTab = ({ desktop }) => desktop ? (
    <>
      <TeamAbout code={code} />
      <div style={{ marginTop:20 }}><TeamSquad code={code} /></div>
    </>
  ) : (
    <>
      <TeamAbout code={code} />
      <TeamSquad code={code} />
    </>
  );

  const PoolTab = ({ desktop }) => desktop ? (
    <>
      <TeamStatTrio code={code} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:20, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <TeamHolders code={code} nav={nav} />
          <TeamScoring code={code} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <TeamPath code={code} />
          <TeamGroupCard code={code} nav={nav} />
        </div>
      </div>
    </>
  ) : (
    <>
      <TeamStatTrio code={code} />
      <TeamPath code={code} />
      <TeamGroupCard code={code} nav={nav} />
      <TeamHolders code={code} nav={nav} />
      <TeamScoring code={code} />
    </>
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
          <div style={{ maxWidth:1040, margin:'0 auto', padding:'24px 28px 56px' }}>
            <TeamLiveStrip code={code} />
            <div style={{ marginTop: isLiveTeam ? 16 : 0 }}><TeamHero code={code} big /></div>
            <div style={{ marginTop:18, maxWidth:380 }}><SegTabs tabs={['Team', 'Pool']} value={tab} onChange={setTab} /></div>
            <div style={{ marginTop:20 }}>{tab === 'Team' ? <TeamTab desktop /> : <PoolTab desktop />}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <BackBar title={t.n} onBack={() => nav.back()} right={<ThemeToggle theme={theme} onToggle={onTheme} />} />
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ padding:'16px 16px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <TeamLiveStrip code={code} />
          <TeamHero code={code} />
          <SegTabs tabs={['Team', 'Pool']} value={tab} onChange={setTab} />
          {tab === 'Team' ? <TeamTab /> : <PoolTab />}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RankTeam, TeamHero, TeamPath, TeamHolders, TeamScoring, teamHolders, teamResults });
