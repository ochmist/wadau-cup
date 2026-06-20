/* Wadau Cup — extended data for player journeys (draft, results feed, my picks). */
(function () {
  const W = window.WADAU;
  const T = W.T;

  // group by tier
  const byTier = { A:[], B:[], C:[], D:[], E:[], F:[] };
  Object.keys(T).forEach((code) => byTier[T[code].t].push(code));

  // real groups (from fixture), keyed by code
  const GROUPS = {
    ALG:'J', ARG:'J', AUS:'D', AUT:'J', BEL:'G', BIH:'B', BRA:'C', CPV:'H', CAN:'B', COL:'K',
    CIV:'E', CRO:'L', CUW:'E', CZE:'A', COD:'K', ECU:'E', EGY:'G', ENG:'L', FRA:'I', GER:'E',
    GHA:'L', HAI:'C', IRN:'G', IRQ:'I', JPN:'F', JOR:'J', MEX:'A', MAR:'C', NED:'F', NZL:'G',
    NOR:'I', PAN:'L', PAR:'D', POR:'K', QAT:'B', KSA:'H', SCO:'C', SEN:'I', RSA:'A', KOR:'A',
    ESP:'H', SWE:'F', SUI:'B', TUN:'F', TUR:'D', USA:'D', URU:'H', UZB:'K',
  };

  const tierMeta = {
    A: { label:'Favourites',  win:1, blurb:'The giants. Low points per win, but they go deep.' },
    B: { label:'Contenders',  win:1, blurb:'Strong sides that can upset anyone on their day.' },
    C: { label:'Dark horses', win:2, blurb:'Worth more per win. A run here pays off.' },
    D: { label:'Outsiders',   win:2, blurb:'Punch above their weight for solid points.' },
    E: { label:'Underdogs',   win:3, blurb:'Big points early. One win swings your week.' },
    F: { label:'Longshots',   win:4, blurb:'Max points if they shock the world. High risk.' },
  };

  // global team status at this point in the tournament (Round of 16)
  const NEXT = {
    ESP:'R16 · vs Cabo Verde · Sat 6pm', BEL:'R16 · vs Uzbekistan · Sat 9pm',
    SCO:'R16 · vs Morocco · Sun 6pm', KSA:'R16 · vs Ghana · Sun 9pm',
    FRA:'R16 · vs DR Congo · Sat 9pm', ARG:'R16 · vs Norway · Sun 9pm',
    BRA:'R16 · vs Haiti · Sat 6pm', GER:'R16 · vs Ecuador · Sun 6pm',
    ENG:'R16 · vs Croatia · Mon 9pm', POR:'R16 · vs Colombia · Mon 6pm',
    NED:'R16 · vs Japan · Sun 6pm', JPN:'R16 · vs Netherlands · Sun 6pm',
    MAR:'R16 · vs Scotland · Sun 6pm', SEN:'R16 · vs France · Sat 9pm',
    MEX:'R16 · vs Switzerland · Mon 6pm', SUI:'R16 · vs Mexico · Mon 6pm',
    COL:'R16 · vs Portugal · Mon 6pm', URU:'R16 · vs Spain · Sat 6pm',
    CPV:'R16 · vs Saudi Arabia · Sun 9pm', GHA:'R16 · vs Saudi Arabia · Sun 9pm',
    ECU:'R16 · vs Germany · Sun 6pm', CZE:'R16 · vs Mexico · Mon 6pm',
    QAT:'R16 · vs Canada · Tue 6pm', CAN:'R16 · vs Qatar · Tue 6pm',
    UZB:'R16 · vs Belgium · Sat 9pm', ALG:'R16 · vs Austria · Tue 9pm',
    NZL:'R16 · vs New chance · Tue', COD:'R16', SWE:'R16 · vs Cabo Verde · Sun',
  };
  const OUT = {
    EGY:'Group', USA:'R32', NOR:'R32', CIV:'Group', TUN:'Group', KOR:'R32', HAI:'Group',
    IRN:'Group', BIH:'Group', AUT:'R32', PAN:'Group', IRQ:'Group', JOR:'Group', TUR:'R32',
    AUS:'Group', PAR:'Group', RSA:'Group', CUW:'Group',
  };
  function teamStatus(code, alive) {
    if (alive) return { alive:true, line: NEXT[code] || 'Round of 16' };
    return { alive:false, line: 'Out · ' + (OUT[code] || 'Group') };
  }

  // me
  const me = W.players.find((p) => p.me) || W.players[1];

  // lock countdown target
  const lockAt = Date.now() + (3 * 24 + 14) * 3600 * 1000 + 22 * 60 * 1000;

  const f = (c) => T[c].f; // flag
  const n = (c) => T[c].n; // name
  // results feed (newest first)
  const results = [
    { id:'r1', kind:'callout', tone:'mover', title:'Otieno is on the charge', body:'Up 2 places to 3rd after Argentina & Cabo Verde both advanced. +5 pts on the day.', tag:'Biggest mover' },
    { id:'r2', round:'Round of 16', a:'FRA', b:'COD', sa:3, sb:0, win:'FRA', pts:[['FRA','A',1]], held:2, note:'France stroll into the Quarters.' },
    { id:'r3', round:'Round of 16', a:'ARG', b:'NOR', sa:2, sb:1, win:'ARG', pts:[['ARG','A',1]], held:1, note:'Late winner sends Argentina through.' },
    { id:'r4', kind:'callout', tone:'upset', title:'Longshot shocks the bracket', body:'Cabo Verde (Tier F) knock out Panama to reach the Round of 16 — worth +2 to anyone holding them.', tag:'Upset of the round' },
    { id:'r5', round:'Round of 16', a:'CPV', b:'PAN', sa:1, sb:0, win:'CPV', pts:[['CPV','F',2]], held:2, note:'History for Cabo Verde.' },
    { id:'r6', round:'Round of 16', a:'BEL', b:'UZB', sa:2, sb:0, win:'BEL', pts:[['BEL','B',1]], held:2, note:'Belgium efficient as ever.' },
    { id:'r7', round:'Round of 32', a:'MAR', b:'EGY', sa:1, sb:1, win:'MAR', pens:'5–4', pts:[['MAR','B',1]], held:2, note:'Morocco hold their nerve on penalties.' },
    { id:'r8', round:'Round of 32', a:'JPN', b:'USA', sa:2, sb:1, win:'JPN', pts:[['JPN','C',2]], held:1, note:'USA out — Japan punch their ticket.' },
    { id:'r9', round:'Round of 32', a:'ESP', b:'HAI', sa:4, sb:0, win:'ESP', pts:[['ESP','A',1]], held:2, note:'Spain cruise.' },
    { id:'r10', round:'Group F', a:'NED', b:'TUN', sa:2, sb:2, win:'draw', pts:[['NED','A',0],['TUN','E',2]], held:3, note:'Honours even — underdog draw points matter.' },
  ];

  Object.assign(W, { byTier, GROUPS, tierMeta, teamStatus, NEXT, OUT, me, lockAt, results, joinedCount: W.entries });
})();
