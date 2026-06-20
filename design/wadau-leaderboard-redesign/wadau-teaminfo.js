/* Wadau Cup — team info: World Cup pedigree, coach, and key players per team.
   Illustrative squad/scouting data to flesh out the team page. Pedigree facts
   (titles / best finish / appearances) are real; coaches & key XI are representative. */
(function () {
  const W = window.WADAU;

  // [coach, fifaRank, titles, bestFinish, appearances, blurb, [[name,pos],[name,pos],[name,pos]]]
  const D = {
    FRA:['D. Deschamps',2,2,'Winners ’98 ’18',16,'Tournament favourites with ruthless transitions and a world-class spine.',[['K. Mbappé','FW'],['A. Tchouaméni','MF'],['W. Saliba','DF']]],
    ESP:['L. de la Fuente',8,1,'Winners ’10',16,'Possession machine; suffocate teams and pass them to death.',[['Pedri','MF'],['Lamine Yamal','FW'],['Rodri','MF']]],
    ARG:['L. Scaloni',1,3,'Winners ’78 ’86 ’22',18,'Reigning champions, built to grind out knockout football.',[['L. Messi','FW'],['J. Álvarez','FW'],['E. Martínez','GK']]],
    ENG:['T. Tuchel',4,0,'Winners ’66',16,'Deep, athletic squad still chasing a second star.',[['J. Bellingham','MF'],['H. Kane','FW'],['B. Saka','FW']]],
    POR:['R. Martínez',6,0,'Semis ’66 ’06',8,'Golden generation depth; flair from front to back.',[['B. Fernandes','MF'],['R. Leão','FW'],['Vitinha','MF']]],
    BRA:['D. Ancelotti',5,5,'5× Winners',22,'Record five-time winners, endless attacking talent.',[['Vinícius Jr','FW'],['Rodrygo','FW'],['Casemiro','MF']]],
    NED:['R. Koeman',7,0,'Runners-up ×3',11,'Total-football heritage, dangerous on the counter.',[['V. van Dijk','DF'],['C. Gakpo','FW'],['F. de Jong','MF']]],
    GER:['J. Nagelsmann',9,4,'4× Winners',20,'Four-time winners rebuilding around a young core.',[['J. Musiala','MF'],['F. Wirtz','MF'],['K. Havertz','FW']]],
    BEL:['R. Garcia',3,0,'3rd ’18',14,'Post-golden-gen reset with elite individuals.',[['K. De Bruyne','MF'],['J. Doku','FW'],['R. Lukaku','FW']]],
    MAR:['W. Regragui',12,0,'4th ’22',6,'History-makers of ’22; fearless and organised.',[['A. Hakimi','DF'],['B. Diaz','FW'],['S. Amrabat','MF']]],
    CRO:['Z. Boban',10,0,'Runners-up ’18',6,'Midfield craft keeps them punching above weight.',[['L. Modrić','MF'],['J. Gvardiol','DF'],['A. Kramarić','FW']]],
    COL:['N. Lorenzo',14,0,'QF ’14',6,'Technical, vibrant, dangerous in transition.',[['L. Díaz','FW'],['J. Rodríguez','MF'],['R. Borré','FW']]],
    SEN:['P. Thiaw',18,0,'QF ’02',4,'African champions with pace and power everywhere.',[['I. Sarr','FW'],['N. Mendy','MF'],['K. Koulibaly','DF']]],
    MEX:['J. Aguirre',16,0,'QF ’70 ’86',17,'Always at the finals; chasing a first deep run abroad.',[['S. Giménez','FW'],['E. Álvarez','MF'],['G. Ochoa','GK']]],
    SUI:['M. Yakin',19,0,'QF ’54',12,'Compact, hard to beat, clinical on the break.',[['G. Xhaka','MF'],['M. Akanji','DF'],['B. Embolo','FW']]],
    URU:['M. Bielsa',15,2,'Winners ’30 ’50',14,'Two-time champions blending grit and youth.',[['F. Valverde','MF'],['D. Núñez','FW'],['R. Araújo','DF']]],
    JPN:['H. Moriyasu',17,0,'R16 ×4',7,'Fast, fearless and beautifully drilled.',[['T. Kubo','FW'],['K. Mitoma','FW'],['W. Endo','MF']]],
    USA:['M. Pochettino',13,0,'3rd ’30',11,'Athletic young core on home soil.',[['C. Pulišić','FW'],['W. McKennie','MF'],['Y. Musah','MF']]],
    IRN:['A. Ghalenoei',20,0,'Group stage',6,'Disciplined and physical, tough first hurdle.',[['M. Taremi','FW'],['A. Jahanbakhsh','FW'],['A. Beiranvand','GK']]],
    TUR:['V. Montella',26,0,'3rd ’02',3,'Talented young side full of flair.',[['A. Güler','MF'],['H. Çalhanoğlu','MF'],['K. Akgün','FW']]],
    ECU:['S. Beccacece',24,0,'R16 ’06',5,'Energetic, well-organised, dangerous set pieces.',[['M. Caicedo','MF'],['K. Page','FW'],['P. Estupiñán','DF']]],
    AUT:['R. Rangnick',22,0,'3rd ’54',8,'Pressing-heavy, intense and cohesive.',[['M. Sabitzer','MF'],['K. Baumgartner','MF'],['D. Alaba','DF']]],
    KOR:['Hong Myung-bo',23,0,'4th ’02',12,'Quick and relentless with a global star up top.',[['Son Heung-min','FW'],['Lee Kang-in','MF'],['Kim Min-jae','DF']]],
    AUS:['T. Popović',25,0,'R16 ’06 ’22',7,'Hard-running, never-say-die Socceroos.',[['M. Leckie','FW'],['A. Mooy','MF'],['H. Souttar','DF']]],
    ALG:['V. Petković',38,0,'R16 ’14',5,'Technical North-African side with real upside.',[['R. Mahrez','FW'],['I. Bennacer','MF'],['Y. Atal','DF']]],
    EGY:['H. Hossam',35,0,'Group stage',4,'Built around one of the world’s best forwards.',[['M. Salah','FW'],['M. Elneny','MF'],['M. Abdelmonem','DF']]],
    CAN:['J. Marsch',30,0,'Group stage',3,'Quick, direct and improving fast on home turf.',[['A. Davies','DF'],['J. David','FW'],['S. Larin','FW']]],
    NOR:['S. Solbakken',28,0,'R16 ’98',4,'One of the planet’s deadliest strikers leads the line.',[['E. Haaland','FW'],['M. Ødegaard','MF'],['A. Nusa','FW']]],
    PAN:['T. Christiansen',40,0,'Debut ’18',2,'Spirited, physical and improving.',[['M. Murillo','DF'],['A. Carrasquilla','MF'],['J. Fajardo','FW']]],
    CIV:['E. Fae',41,0,'Group stage',4,'Athletic Ivorians with Cup-of-Nations pedigree.',[['S. Haller','FW'],['F. Kessié','MF'],['N. Pépé','FW']]],
    SWE:['J. Lagerbäck',27,0,'Runners-up ’58',13,'Organised, tall and a threat from dead balls.',[['A. Isak','FW'],['D. Kulusevski','MF'],['V. Lindelöf','DF']]],
    PAR:['G. Alfaro',45,0,'QF 2010',9,'Combative and compact, hard to break down.',[['M. Almirón','FW'],['J. Enciso','MF'],['G. Gómez','DF']]],
    CZE:['I. Hašek',33,0,'Runners-up ’34 ’62',11,'Classic Central-European resilience and craft.',[['P. Schick','FW'],['T. Souček','MF'],['L. Provod','MF']]],
    SCO:['S. Clarke',39,0,'Group stage',9,'Hard-working, set-piece dangerous and proud.',[['A. Robertson','DF'],['S. McTominay','MF'],['J. McGinn','MF']]],
    TUN:['F. Benzarti',42,0,'Group stage',6,'Disciplined and dogged North-African outfit.',[['H. Skhiri','MF'],['M. Talbi','DF'],['Y. Msakni','FW']]],
    COD:['S. Desabre',56,0,'Debut',1,'Pacey, raw and unpredictable on their bow.',[['C. Bakambu','FW'],['G. Mbemba','DF'],['Y. Wissa','FW']]],
    UZB:['T. Kapadze',57,0,'Debut',1,'Well-drilled debutants on the rise in Asia.',[['E. Shomurodov','FW'],['A. Masharipov','MF'],['A. Khusanov','DF']]],
    QAT:['L. Sánchez',43,0,'Group stage ’22',2,'Compact hosts of ’22 building experience.',[['A. Afif','FW'],['A. Hatem','MF'],['B. Khoukhi','DF']]],
    IRQ:['J. Arnautović',55,0,'Group stage ’86',2,'Spirited Lions of Mesopotamia.',[['A. Hussein','FW'],['Z. Tahseen','MF'],['R. Bayesh','DF']]],
    RSA:['H. Broos',58,0,'Group stage',4,'Quick, youthful Bafana Bafana.',[['P. Foster','GK'],['T. Mokoena','MF'],['L. Mvala','DF']]],
    KSA:['H. Renard',59,0,'R16 ’94',7,'Organised and brave — ’22’s giant-killers.',[['S. Al-Dawsari','FW'],['M. Kanno','MF'],['A. Al-Owais','GK']]],
    BIH:['S. Bajević',74,0,'Group stage ’14',1,'Technical Balkan side with bite.',[['E. Džeko','FW'],['M. Tadić','MF'],['S. Kvržić','MF']]],
    CPV:['B. Tavares',70,0,'Debut',1,'Fairy-tale debutants — the tournament’s romance.',[['Ryan Mendes','FW'],['Jamiro','MF'],['Bebé','FW']]],
    GHA:['O. Addo',68,0,'QF ’10',5,'Proud Black Stars chasing past glories.',[['M. Kudus','FW'],['T. Partey','MF'],['I. Williams','FW']]],
    CUW:['D. Lodeweges',82,0,'Debut',1,'Caribbean debutants with nothing to lose.',[['L. Bacuna','MF'],['J. Bacuna','MF'],['C. Martina','DF']]],
    HAI:['S. Sénéchal',86,0,'2nd app',2,'Tenacious and quick on the break.',[['D. Pierrot','FW'],['F. Sylvain','MF'],['J. Belkebla','MF']]],
    NZL:['D. Hay',89,0,'Group stage',3,'Physical and committed All Whites.',[['C. Wood','FW'],['M. Stamenić','MF'],['L. Garbett','MF']]],
    JOR:['J. Amota',62,0,'Debut',1,'Asian Cup finalists making their bow.',[['M. Al-Tamari','FW'],['Y. Al-Naimat','FW'],['N. Al-Rashdan','MF']]],
  };

  const TEAMINFO = {};
  Object.keys(D).forEach((code) => {
    const [coach, fifa, titles, best, apps, blurb, key] = D[code];
    TEAMINFO[code] = { coach, fifa, titles, best, apps, blurb,
      key: key.map(([name, pos]) => ({ name, pos })) };
  });

  // Real starting XI we already have for the live match teams.
  W.realXI = function (code) {
    const L = W.LIVE;
    if (!L) return null;
    if (code === L.MATCH.home.code) return { xi: L.HOME_XI, formation: L.MATCH.home.formation };
    if (code === L.MATCH.away.code) return { xi: L.AWAY_XI, formation: L.MATCH.away.formation };
    return null;
  };

  W.TEAMINFO = TEAMINFO;
})();
