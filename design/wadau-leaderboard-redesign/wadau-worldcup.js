/* Wadau Cup — World Cup group-stage standings (illustrative final group tables).
   12 groups, 4 teams each. Top two of each group highlighted as advancing.
   Rows: [code, won, drawn, lost, goalsFor, goalsAgainst]. */
(function () {
  const W = window.WADAU;

  const RAW = {
    A: [['CZE',2,1,0,5,2],['MEX',2,0,1,4,3],['KOR',1,1,1,3,3],['RSA',0,0,3,1,5]],
    B: [['SUI',2,1,0,4,1],['CAN',1,2,0,3,2],['QAT',1,1,1,3,3],['BIH',0,0,3,1,5]],
    C: [['BRA',3,0,0,7,1],['MAR',2,0,1,4,2],['SCO',1,0,2,2,4],['HAI',0,0,3,1,7]],
    D: [['TUR',2,1,0,5,2],['USA',2,0,1,4,3],['AUS',1,0,2,2,4],['PAR',0,1,2,1,3]],
    E: [['GER',2,1,0,6,2],['ECU',1,2,0,3,1],['CIV',1,0,2,2,4],['CUW',0,1,2,1,5]],
    F: [['NED',2,1,0,6,2],['JPN',2,0,1,5,3],['SWE',1,1,1,3,3],['TUN',0,0,3,1,7]],
    G: [['BEL',2,1,0,5,1],['NZL',1,1,1,2,3],['EGY',1,1,1,3,3],['IRN',0,1,2,1,4]],
    H: [['ESP',3,0,0,8,1],['URU',2,0,1,4,2],['CPV',1,1,1,3,4],['KSA',1,0,2,2,4]],
    I: [['FRA',2,1,0,6,1],['SEN',2,0,1,4,2],['NOR',1,0,2,3,4],['IRQ',0,1,2,1,5]],
    J: [['ARG',3,0,0,7,2],['ALG',1,1,1,3,3],['AUT',1,1,1,2,3],['JOR',0,1,2,1,5]],
    K: [['POR',2,1,0,5,2],['COL',2,0,1,4,3],['COD',1,0,2,3,5],['UZB',0,1,2,2,4]],
    L: [['ENG',2,1,0,5,1],['CRO',2,0,1,4,2],['GHA',1,0,2,3,4],['PAN',0,1,2,1,6]],
  };

  const GROUPTABLES = {};
  Object.keys(RAW).forEach((g) => {
    GROUPTABLES[g] = RAW[g].map((r) => {
      const [code, w, d, l, gf, ga] = r;
      return { code, w, d, l, gf, ga, p: w + d + l, gd: gf - ga, pts: w * 3 + d };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  });

  // lookup a team's group + its row
  W.groupOf = function (code) {
    const g = W.GROUPS[code];
    if (!g || !GROUPTABLES[g]) return null;
    const table = GROUPTABLES[g];
    const pos = table.findIndex((x) => x.code === code);
    return { group: g, table, pos, row: table[pos] };
  };

  W.GROUPTABLES = GROUPTABLES;
})();
