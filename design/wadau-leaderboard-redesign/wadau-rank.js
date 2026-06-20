/* Wadau Cup — derivations for the ranking/ceiling redesign.
   Adds: per-player winnable breakdown, stage tracker, money-gap context.
   Pure functions over the existing WADAU data — no fabricated numbers. */
(function () {
  const W = window.WADAU;
  const tierWin = {}; Object.keys(W.tierMeta).forEach((k) => (tierWin[k] = W.tierMeta[k].win));

  // Knockout stage tracker. We're mid Round-of-16: Group + R32 done, R16 in play.
  W.STAGES = [
    { key:'GRP', label:'Group', short:'Grp', state:'done' },
    { key:'R32', label:'Round of 32', short:'R32', state:'done' },
    { key:'R16', label:'Round of 16', short:'R16', state:'current' },
    { key:'QF',  label:'Quarters', short:'QF', state:'upcoming' },
    { key:'SF',  label:'Semis', short:'SF', state:'upcoming' },
    { key:'F',   label:'Final', short:'Final', state:'upcoming' },
  ];
  W.roundsLeft = W.STAGES.filter((s) => s.state === 'upcoming').length; // 3 (QF, SF, Final)

  const leader = W.players[0];

  // Augment each player with redesign-friendly derivations.
  W.players.forEach((p) => {
    const alive = p.teams.filter((t) => t.alive).slice().sort((a, b) => (b.pts + b.rem) - (a.pts + a.rem));
    const out = p.teams.filter((t) => !t.alive).slice().sort((a, b) => b.pts - a.pts);
    p.aliveSorted = alive;
    p.outSorted = out;
    p.winnable = p.ceiling - p.points;               // = Σ rem of alive teams
    p.bankedFromAlive = alive.reduce((s, t) => s + t.pts, 0);
    p.bankedFromOut = out.reduce((s, t) => s + t.pts, 0);
    // each alive team's contribution to the ceiling headroom
    p.ceilingParts = alive.map((t) => ({
      code: t.code, name: t.name, flag: t.flag, tier: t.tier,
      earned: t.pts, winnable: t.rem, perWin: tierWin[t.tier],
      next: (W.NEXT[t.code] || 'Round of 16').replace(/^R16 · /, ''),
    }));
  });

  // money / contention context per player (computed after ranks exist)
  const moneyCut = W.players[2].points;       // 3rd place points = money line
  const moneyCeil = W.players[2].ceiling;
  W.players.forEach((p) => {
    p.inMoney = p.rank <= 3;
    p.toMoney = p.inMoney ? 0 : moneyCut - p.points;        // points behind the cut now
    p.canReachMoney = p.ceiling >= moneyCut;                 // ceiling still clears the cut
    p.canReachFirst = p.ceiling >= leader.points;
    p.gapToLeader = leader.points - p.points;
  });

  // nearest rivals for "where you stand"
  W.rivalsFor = function (p) {
    const ahead = W.players.find((x) => x.rank === p.rank - 1) || null;
    const behind = W.players.find((x) => x.rank === p.rank + 1) || null;
    return { ahead, behind };
  };

  W.tierWin = tierWin;
  W.moneyCut = moneyCut; W.moneyCeil = moneyCeil;
})();
