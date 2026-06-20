/* Wadau Cup — live match-center sample data.
   Self-contained narrative: Senegal 1–0 France, 63' LIVE (Round of 16) — the
   "heating up" fixture from the banter feed. Two-sided pool stakes:
   leader Wanjiru's France is LOSING to Senegal, held by Achieng (one off the
   money) and Aisha. Lineups / managers / timeline are illustrative. */
(function () {
  const W = window.WADAU;
  const T = W.T;
  const find = (n) => W.players.find((p) => p.name === n);

  const MATCH = {
    comp: 'World Cup 2026', round: 'Round of 16', venue: 'MetLife Stadium · East Rutherford',
    status: 'live', minute: 63, startSec: 63 * 60 + 12,
    home: { code:'SEN', name:'Senegal', flag:'🇸🇳', score:1, manager:'Pape Thiaw', mgrFlag:'🇸🇳', formation:'4-3-3' },
    away: { code:'FRA', name:'France', flag:'🇫🇷', score:0, manager:'D. Deschamps', mgrFlag:'🇫🇷', formation:'4-3-3' },
  };

  // pitch coords: x 0..100 (L→R), y 0..100 (top→bottom). Home = top half, Away = bottom half.
  const HOME_XI = [
    { n:16, name:'É. Mendy',  pos:'GK',  x:50, y:7 },
    { n:22, name:'Sabaly',    pos:'RB',  x:82, y:17 },
    { n:3,  name:'Koulibaly', pos:'CB',  x:60, y:15, c:true },
    { n:21, name:'Diallo',    pos:'CB',  x:40, y:15 },
    { n:12, name:'F. Mendy',  pos:'LB',  x:18, y:17, assist:true },
    { n:6,  name:'Gueye',     pos:'CM',  x:30, y:29, booked:true },
    { n:5,  name:'N. Mendy',  pos:'CM',  x:50, y:31 },
    { n:8,  name:'N’Diaye',   pos:'CM',  x:70, y:29 },
    { n:18, name:'Jackson',   pos:'RW',  x:74, y:42 },
    { n:10, name:'I. Sarr',   pos:'ST',  x:50, y:44, goal:true },
    { n:19, name:'Dia',       pos:'LW',  x:26, y:42 },
  ];
  const AWAY_XI = [
    { n:11, name:'Dembélé',    pos:'LW', x:72, y:58, off:true },
    { n:10, name:'Mbappé',     pos:'ST', x:50, y:56, c:true, post:true },
    { n:9,  name:'Kolo Muani', pos:'RW', x:28, y:58 },
    { n:7,  name:'Griezmann',  pos:'CM', x:30, y:70 },
    { n:14, name:'Camavinga',  pos:'CM', x:50, y:72 },
    { n:8,  name:'Tchouaméni', pos:'CM', x:70, y:70, booked:true },
    { n:22, name:'T. Hernández',pos:'LB',x:82, y:83 },
    { n:5,  name:'Saliba',     pos:'CB', x:60, y:85 },
    { n:4,  name:'Upamecano',  pos:'CB', x:40, y:85 },
    { n:2,  name:'Koundé',     pos:'RB', x:18, y:83 },
    { n:1,  name:'Maignan',    pos:'GK', x:50, y:94 },
  ];
  const HOME_BENCH = [
    { n:1,  name:'Diaw', pos:'GK' }, { n:9, name:'Niane', pos:'FW' },
    { n:7,  name:'A. Sarr', pos:'MF' }, { n:14, name:'Diatta', pos:'MF' },
    { n:4,  name:'Niakhaté', pos:'DF' }, { n:11, name:'Ndiaye', pos:'FW' },
  ];
  const AWAY_BENCH = [
    { n:16, name:'Areola', pos:'GK' }, { n:20, name:'Coman', pos:'FW', on:true },
    { n:26, name:'Barcola', pos:'FW' }, { n:15, name:'Thuram', pos:'FW' },
    { n:6,  name:'Zaïre-Emery', pos:'MF' }, { n:3, name:'Digne', pos:'DF' },
  ];

  // Timeline — newest first. kind: goal|card-y|card-r|sub|chance|whistle|var
  const TIMELINE = [
    { kind:'now', min:"63'", text:'In play', side:null },
    { kind:'card-y', min:"58'", side:'away', team:'FRA', text:'Tchouaméni', sub:'Tactical foul to stop the break' },
    { kind:'sub', min:"54'", side:'away', team:'FRA', text:'Coman on for Dembélé', sub:'Deschamps chases the game' },
    { kind:'chance', min:"49'", side:'home', team:'SEN', text:'Jackson stings the palms', sub:'Maignan pushes it wide' },
    { kind:'whistle', min:"HT", text:'Half time · Senegal 1–0 France', side:null },
    { kind:'card-y', min:"45'+2", side:'home', team:'SEN', text:'Gueye', sub:'Late challenge in midfield' },
    { kind:'goal', min:"41'", side:'home', team:'SEN', text:'I. Sarr', sub:'Header · assist F. Mendy', stake:'+pts for Achieng & Aisha' },
    { kind:'chance', min:"33'", side:'away', team:'FRA', text:'Mbappé rattles the post', sub:'Inches from the leader’s equaliser' },
    { kind:'chance', min:"19'", side:'home', team:'SEN', text:'Dia drags it wide', sub:'Senegal’s first real look' },
    { kind:'whistle', min:"1'", text:'Kick-off', side:null },
  ];

  const STATS = [
    { label:'Possession', h:37, a:63, pct:true },
    { label:'Shots', h:8, a:13 },
    { label:'On target', h:4, a:5 },
    { label:'Expected goals (xG)', h:1.3, a:1.5, dec:true },
    { label:'Corners', h:3, a:7 },
    { label:'Fouls', h:12, a:8 },
  ];

  // Pool stakes — who holds each side + projected "if it ends now" effect.
  const mk = (name, note, deltaTone) => { const p = find(name); return { name, short:p.short, rank:p.rank, me:p.me, points:p.points, note, deltaTone }; };
  const STAKES = {
    home: { // Senegal — winning
      team:'Senegal', flag:'🇸🇳', tone:'up',
      holders:[ mk('Achieng', '▲ into 3rd · the money', 'up'), mk('Aisha', '▲ climbs 2', 'up') ],
    },
    away: { // France — losing
      team:'France', flag:'🇫🇷', tone:'down',
      holders:[ mk('Wanjiru', 'lead frozen · chasers close', 'flat'), mk('Dennoh', 'no return', 'flat') ],
    },
    // dramatic swing if score holds
    swing: { up: mk('Achieng', 'P4 → P3', 'up'), down: mk('Otieno', 'P3 → P4', 'down'),
             headline:'Senegal hold on and the table tightens — the leader gains nothing while Achieng slips into the money.' },
  };

  W.LIVE = { MATCH, HOME_XI, AWAY_XI, HOME_BENCH, AWAY_BENCH, TIMELINE, STATS, STAKES };
})();
