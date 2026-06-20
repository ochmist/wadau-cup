/* Wadau Cup — shared sample data for the leaderboard system.
   Numbers are illustrative of a tournament mid-Round-of-16. */
(function () {
  // Team dictionary: code -> { n: name, f: flag emoji, t: tier }
  const T = {
    FRA:{n:'France',f:'🇫🇷',t:'A'}, ESP:{n:'Spain',f:'🇪🇸',t:'A'}, ARG:{n:'Argentina',f:'🇦🇷',t:'A'},
    ENG:{n:'England',f:'🏴',t:'A'}, POR:{n:'Portugal',f:'🇵🇹',t:'A'}, BRA:{n:'Brazil',f:'🇧🇷',t:'A'},
    NED:{n:'Netherlands',f:'🇳🇱',t:'A'}, GER:{n:'Germany',f:'🇩🇪',t:'A'},
    BEL:{n:'Belgium',f:'🇧🇪',t:'B'}, MAR:{n:'Morocco',f:'🇲🇦',t:'B'}, CRO:{n:'Croatia',f:'🇭🇷',t:'B'},
    COL:{n:'Colombia',f:'🇨🇴',t:'B'}, SEN:{n:'Senegal',f:'🇸🇳',t:'B'}, MEX:{n:'Mexico',f:'🇲🇽',t:'B'},
    SUI:{n:'Switzerland',f:'🇨🇭',t:'B'}, URU:{n:'Uruguay',f:'🇺🇾',t:'B'},
    JPN:{n:'Japan',f:'🇯🇵',t:'C'}, USA:{n:'USA',f:'🇺🇸',t:'C'}, IRN:{n:'Iran',f:'🇮🇷',t:'C'},
    TUR:{n:'Türkiye',f:'🇹🇷',t:'C'}, ECU:{n:'Ecuador',f:'🇪🇨',t:'C'}, AUT:{n:'Austria',f:'🇦🇹',t:'C'},
    KOR:{n:'South Korea',f:'🇰🇷',t:'C'}, AUS:{n:'Australia',f:'🇦🇺',t:'C'},
    ALG:{n:'Algeria',f:'🇩🇿',t:'D'}, EGY:{n:'Egypt',f:'🇪🇬',t:'D'}, CAN:{n:'Canada',f:'🇨🇦',t:'D'},
    NOR:{n:'Norway',f:'🇳🇴',t:'D'}, PAN:{n:'Panama',f:'🇵🇦',t:'D'}, CIV:{n:"Côte d'Ivoire",f:'🇨🇮',t:'D'},
    SWE:{n:'Sweden',f:'🇸🇪',t:'D'}, PAR:{n:'Paraguay',f:'🇵🇾',t:'D'},
    CZE:{n:'Czechia',f:'🇨🇿',t:'E'}, SCO:{n:'Scotland',f:'🏴',t:'E'}, TUN:{n:'Tunisia',f:'🇹🇳',t:'E'},
    COD:{n:'DR Congo',f:'🇨🇩',t:'E'}, UZB:{n:'Uzbekistan',f:'🇺🇿',t:'E'}, QAT:{n:'Qatar',f:'🇶🇦',t:'E'},
    IRQ:{n:'Iraq',f:'🇮🇶',t:'E'}, RSA:{n:'South Africa',f:'🇿🇦',t:'E'},
    KSA:{n:'Saudi Arabia',f:'🇸🇦',t:'F'}, BIH:{n:'Bosnia',f:'🇧🇦',t:'F'}, CPV:{n:'Cabo Verde',f:'🇨🇻',t:'F'},
    GHA:{n:'Ghana',f:'🇬🇭',t:'F'}, CUW:{n:'Curaçao',f:'🇨🇼',t:'F'}, HAI:{n:'Haiti',f:'🇭🇹',t:'F'},
    NZL:{n:'New Zealand',f:'🇳🇿',t:'F'}, JOR:{n:'Jordan',f:'🇯🇴',t:'F'},
  };

  // Player picks: [code, ptsEarned, remaining(maxStillEarnable), alive]
  const RAW = [
    { name:'Wanjiru', short:'WN', prev:2, paid:true, me:false, finalGoals:3, picks:[
      ['FRA',8,10,1],['MAR',6,6,1],['JPN',5,5,1],['EGY',4,0,0],['CZE',4,4,1],['GHA',4,5,1] ] },
    { name:'Brayo', short:'BR', prev:1, paid:true, me:true, finalGoals:2, picks:[
      ['ESP',9,10,1],['BEL',7,7,1],['USA',4,0,0],['NOR',3,0,0],['SCO',3,4,1],['KSA',4,5,1] ] },
    { name:'Otieno', short:'OT', prev:5, paid:true, me:false, finalGoals:4, picks:[
      ['ARG',8,10,1],['URU',5,6,1],['ECU',4,4,1],['CIV',3,0,0],['TUN',2,0,0],['CPV',5,6,1] ] },
    { name:'Achieng', short:'AC', prev:3, paid:true, me:false, finalGoals:2, picks:[
      ['ENG',8,10,1],['SEN',5,5,1],['KOR',4,0,0],['CAN',3,4,1],['UZB',3,3,1],['HAI',3,0,0] ] },
    { name:'Kimani', short:'KM', prev:4, paid:true, me:false, finalGoals:3, picks:[
      ['POR',7,9,1],['MEX',5,5,1],['IRN',4,0,0],['SWE',3,3,1],['QAT',3,3,1],['BIH',3,0,0] ] },
    { name:'Njoro', short:'NJ', prev:6, paid:true, me:false, finalGoals:5, picks:[
      ['BRA',9,10,1],['COL',5,6,1],['AUT',2,0,0],['PAN',2,0,0],['IRQ',2,0,0],['NZL',3,4,1] ] },
    { name:'Mwangi', short:'MW', prev:9, paid:true, me:false, finalGoals:2, picks:[
      ['GER',7,9,1],['SUI',5,5,1],['TUR',3,0,0],['ALG',3,3,1],['COD',2,0,0],['JOR',2,0,0] ] },
    { name:'Aisha', short:'AI', prev:7, paid:true, me:false, finalGoals:3, picks:[
      ['NED',7,8,1],['SEN',4,5,1],['AUS',3,0,0],['EGY',4,0,0],['SCO',3,4,1],['GHA',4,5,1] ] },
    { name:'Dennoh', short:'DN', prev:8, paid:false, me:false, finalGoals:1, picks:[
      ['FRA',6,9,1],['URU',4,0,0],['JPN',4,5,1],['NOR',2,0,0],['TUN',2,0,0],['CUW',2,0,0] ] },
    { name:'Faith', short:'FT', prev:11, paid:true, me:false, finalGoals:4, picks:[
      ['ESP',6,9,1],['BEL',5,6,1],['IRN',2,0,0],['PAR',2,0,0],['UZB',2,3,1],['KSA',2,0,0] ] },
    { name:'Maxie', short:'MX', prev:10, paid:false, me:false, finalGoals:2, picks:[
      ['POR',6,8,1],['MAR',4,5,1],['ECU',3,4,1],['CIV',2,0,0],['RSA',1,0,0],['JOR',2,0,0] ] },
    { name:'Shiro', short:'SH', prev:12, paid:true, me:false, finalGoals:3, picks:[
      ['ARG',7,10,1],['SUI',3,0,0],['KOR',2,0,0],['SWE',2,3,1],['QAT',1,0,0],['HAI',1,0,0] ] },
    { name:'Baraka', short:'BA', prev:14, paid:true, me:false, finalGoals:3, picks:[
      ['GER',6,9,1],['COL',3,0,0],['AUT',2,0,0],['CAN',2,3,1],['SCO',1,0,0],['NZL',1,0,0] ] },
    { name:'Trevor', short:'TR', prev:13, paid:false, me:false, finalGoals:2, picks:[
      ['NED',5,8,1],['MEX',3,0,0],['USA',2,0,0],['PAN',1,0,0],['IRQ',1,0,0],['CPV',1,0,0] ] },
  ];

  const BUYIN = 1000;
  const players = RAW.map((p, i) => {
    const teams = p.picks.map(([c, pts, rem, alive]) => ({
      code: c, name: T[c].n, flag: T[c].f, tier: T[c].t,
      pts, rem, alive: !!alive,
    }));
    const points = teams.reduce((s, t) => s + t.pts, 0);
    const ceiling = points + teams.reduce((s, t) => s + (t.alive ? t.rem : 0), 0);
    const aliveCount = teams.filter((t) => t.alive).length;
    return { ...p, teams, points, ceiling, aliveCount, prevRank: p.prev };
  });

  // Rank by points desc (already authored in order); compute mover from prevRank.
  players.sort((a, b) => b.points - a.points);
  players.forEach((p, i) => { p.rank = i + 1; p.mover = p.prevRank - p.rank; });

  const entries = players.length;
  const pot = entries * BUYIN;
  const payouts = [Math.round(pot * 0.5), Math.round(pot * 0.3), Math.round(pot * 0.2)];
  players.forEach((p) => { p.payout = p.rank <= 3 ? payouts[p.rank - 1] : 0; });

  const leaderPoints = players[0].points;
  const contention = players.filter((p) => p.ceiling >= leaderPoints).length;
  const scaleMax = Math.max(...players.map((p) => p.ceiling)) + 4; // shared bar scale

  window.WADAU = {
    T, players, entries, pot, buyin: BUYIN, payouts, scaleMax,
    leaderPoints, contention,
    round: 'Round of 16', updated: '2h ago',
    poolName: 'Wadau Cup', season: '2026',
  };
})();
