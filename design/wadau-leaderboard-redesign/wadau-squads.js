/* Wadau Cup — full squad lists per team, grouped by position (GK / DEF / MID / FWD).
   Representative 23-man World Cup squads. Captain marked with a leading *.
   Format per team: "GK | DEF | MID | FWD", names separated by /. */
(function () {
  const W = window.WADAU;

  const RAW = {
    FRA: 'Maignan/Areola/Samba | Koundé/Saliba/Upamecano/T.Hernández/Konaté/L.Hernández/Gusto | Tchouaméni/Camavinga/Griezmann/Rabiot/Zaïre-Emery/Fofana | *Mbappé/Dembélé/Kolo Muani/Thuram/Coman/Barcola',
    SEN: 'É.Mendy/Diaw/Dieng | Sabaly/*Koulibaly/Diallo/F.Mendy/Niakhaté/Jakobs/Mbodji | Gueye/N.Mendy/N’Diaye/A.Sarr/Diatta/P.Gueye | I.Sarr/Jackson/Dia/Niane/Ndiaye/Diédhiou',
    ESP: 'Simón/Raya/Remiro | Carvajal/Le Normand/Laporte/Cucurella/Vivian/Grimaldo/Navas | *Rodri/Pedri/Fabián/Zubimendi/Merino/Ruiz | Lamine Yamal/Nico Williams/Morata/Oyarzabal/Olmo/Ferran',
    ARG: 'E.Martínez/Rulli/Armani | Molina/Romero/Otamendi/Tagliafico/Lisandro/Montiel/Acuña | De Paul/Mac Allister/Enzo/Paredes/Lo Celso/Palacios | *Messi/J.Álvarez/L.Martínez/Di María/Garnacho/N.González',
    ENG: 'Pickford/Ramsdale/Henderson | Walker/Stones/Guéhi/Trippier/Konsa/Trent/Lewis | *Bellingham/Rice/Mainoo/Gallagher/Foden/Palmer | Kane/Saka/Bowen/Watkins/Gordon/Toney',
    BRA: 'Alisson/Ederson/Bento | Danilo/Marquinhos/Gabriel/W.Estêvão/É.Militão/Wendell/B.Henrique | *Casemiro/Bruno Guimarães/Lucas Paquetá/André/Andreas/Joelinton | Vinícius Jr/Rodrygo/Raphinha/Endrick/Savinho/Martinelli',
    NED: 'Verbruggen/Flekken/Bijlow | Dumfries/*Van Dijk/De Vrij/Aké/Geertruida/Hato/Timber | De Jong/Reijnders/Schouten/Veerman/Koopmeiners/Gravenberch | Gakpo/Depay/Simons/Malen/Brobbey/Weghorst',
    GER: 'Neuer/Ter Stegen/Baumann | Kimmich/Tah/Rüdiger/Mittelstädt/Schlotterbeck/Henrichs/Anton | *Gündoğan/Andrich/Wirtz/Musiala/Groß/Stiller | Havertz/Sané/Füllkrug/Undav/Adeyemi/Beier',
    BEL: 'Casteels/Sels/Vandevoordt | Castagne/Faes/*Vertonghen/T.Hazard/Theate/De Cuyper/Debast | De Bruyne/Tielemans/Onana/Mangala/Vanaken/Vermeeren | Lukaku/Doku/Trossard/Openda/Bakayoko/De Ketelaere',
    MAR: 'Bounou/Munir/El Kajoui | *Hakimi/Saïss/Aguerd/Mazraoui/El Yamiq/Attiat-Allah/Masina | Amrabat/Ounahi/Amallah/Ezzalzouli/Ounahi | Ziyech/En-Nesyri/Boufal/Diaz/Aboukhlal/Hamdallah',
    CRO: 'Livaković/Ivušić/Labrović | Stanišić/Gvardiol/Šutalo/Sosa/Pongračić/Juranović/Erlić | *Modrić/Brozović/Kovačić/Pašalić/Sučić/Baturina | Kramarić/Perišić/Budimir/Petković/Pašalić/Vlašić',
    COL: 'Vargas/Montero/Mier | Muñoz/Sánchez/Lucumí/Mojica/Cuesta/Arias/Mina | *J.Rodríguez/Lerma/R.Ríos/Uribe/Castaño/Arias | L.Díaz/Córdoba/Borré/J.Quintero/Sinisterra/Borja',
    URU: 'Rochet/Sosa/Mele | Nández/*Araújo/Giménez/Olivera/Cáceres/Viña/Varela | Valverde/Bentancur/Ugarte/De Arrascaeta/Pellistri/Vecino | Núñez/Pellistri/Maxi Gómez/Cavani/Suárez/Rodríguez',
    JPN: 'Suzuki/Ōsako/Tani | Sugawara/Itakura/Tomiyasu/M.Nakayama/Watanabe/Hashioka/Machida | *Endō/Morita/Kamada/Kubo/Mitoma/Dōan | Ueda/Asano/Maeda/Furuhashi/Minamino/Hidemasa',
    USA: 'Turner/Horvath/Schulte | Dest/Robinson/Richards/A.Long/C.Carter/Scally/Ream | McKennie/Adams/Musah/Tillman/Aaronson/Luna | *Pulišić/Weah/Reyna/Balogun/Sargent/Vázquez',
    MEX: 'Ochoa/Malagón/J.Sánchez | Sánchez/Montes/Vásquez/Gallardo/Arteaga/Araujo/Reyes | E.Álvarez/Chávez/L.Romo/Pineda/Sánchez/Lainez | *Giménez/H.Lozano/Antuna/Martín/Vega/Quiñones',
    SUI: 'Sommer/Kobel/Mvogo | Widmer/Akanji/Schär/Rodríguez/Elvedi/Comert/Mbabu | *Xhaka/Freuler/Zakaria/Sow/Aebischer/Rieder | Embolo/Shaqiri/Vargas/Amdouni/Okafor/Ndoye',
    ECU: 'Galíndez/Domínguez/Ramírez | Preciado/Hincapié/Torres/Estupiñán/Pacho/Arboleda/Porozo | *Caicedo/Gruezo/Méndez/Sarmiento/Plata/Páez | Valencia/K.Page/Rodríguez/Estrada/Mena/Reasco',
    AUT: 'Pentz/Schlager/Lawal | Posch/Danso/Lienhart/Mwene/Wöber/Trauner/Querfeld | *Sabitzer/Seiwald/Laimer/Baumgartner/Grillitsch/Schmid | Arnautović/Gregoritsch/Baumgartner/Wimmer/Adamu/Entrup',
    KOR: 'Kim Seung-gyu/Jo Hyeon-woo/Song Bum-keun | Kim Tae-hwan/Kim Min-jae/Kim Young-gwon/Kim Jin-su/Jung Seung-hyun/Lee Ki-je/Seol Young-woo | *Son Heung-min/Hwang In-beom/Lee Jae-sung/Lee Kang-in/Park Yong-woo/Hong Hyun-seok | Oh Hyeon-gyu/Cho Gue-sung/Hwang Hee-chan/Hwang Ui-jo/Jeong Woo-yeong',
    AUS: 'Ryan/Vukovic/Glover | Atkinson/Souttar/Rowles/Behich/Karačić/Degenek/Wright | *Mooy/Irvine/McGree/Baccus/O’Neill/Metcalfe | Leckie/Goodwin/Duke/Boyle/Maclaren/Borrello',
    ALG: 'M’Bolhi/Oukidja/Mandréa | Atal/Bensebaini/Mandi/Aït-Nouri/Tougai/Bedrane/Hadjam | *Mahrez/Bennacer/Zerrouki/Chaïbi/Bentaleb/Belaïli | Slimani/Bounedjah/Amoura/Brahimi/Gouiri/Boudaoui',
    EGY: 'El Shenawy/Abou Gabal/El Shennawy | Hegazi/Hamdy/Abdelmonem/A.Fattouh/Ashraf/Hamada/Tawfik | *Elneny/Hamdi/Trezeguet/Zizo/Soliman/Attia | Salah/Mostafa Mohamed/Marmoush/Sobhi/Trezeguet/Faraj',
    CAN: 'St-Clair/Crépeau/Sirois | Johnston/Vitória/Cornelius/*Davies/Miller/Laryea/Adekugbe | Eustáquio/Kone/Koné/Buchanan/Hutchinson/Fraser | David/Larin/Ugbo/Cavallini/Shaffelburg/Millar',
    NOR: 'Nyland/Dyngeland/Klæsson | Ryerson/Ajer/Østigård/Bjørkan/Møller Wolfe/Heggem/Strand Larsen | *Ødegaard/Berge/Berg/Aursnes/Thorsby/Nusa | Haaland/Sørloth/Bobb/Nusa/Strand Larsen/Myhre',
    PAN: 'Mosquera/Penedo/Ortega | Murillo/Córdoba/Andrade/Davis/Galván/Escobar/Welch | *Carrasquilla/Barcenas/Godoy/Ayarza/Yanis/Rodríguez | Fajardo/Tejada/Waterman/Gómez/Quintero/Carrasquilla',
    CIV: 'Y.Fofana/Badra/Diakité | Aurier/Singo/Ndicka/Konan/Boly/Agbadou/Diomandé | *Kessié/Seri/Sangaré/Fofana/Kessié/Bayo | Haller/Pépé/Krasso/Gradel/Diakité/Kouamé',
    SWE: 'Olsen/Nordfeldt/Brolin | Lustig/Lindelöf/Hien/A.Augustinsson/Starfelt/Krafth/Holm | *Forsberg/Olsson/Cajuste/Bergvall/Svensson/Ekdal | Isak/Kulusevski/Gyökeres/Elanga/Bernhardsson/Quaison',
    PAR: 'Coronel/Fernández/Olmedo | Espínola/Alonso/G.Gómez/Balbuena/Rojas/Giménez/Sanabria | *Almirón/Cubas/Villasanti/Enciso/Bobadilla/Campuzano | Sanabria/Romero/Enciso/González/Ramírez/López',
    CZE: 'Staněk/Jaroš/Kovář | Coufal/Hranáč/Krejčí/Doudera/Holeš/Zima/Vitík | *Souček/Provod/Černý/Barák/Lingr/Sadílek | Schick/Hložek/Kuchta/Chorý/Jurásek/Mojmír',
    SCO: 'Gunn/Gordon/Clark | Hendry/Tierney/McKenna/*Robertson/Porteous/Ralston/Cooper | McTominay/McGregor/Gilmour/McGinn/Christie/Ferguson | Adams/Dykes/Shankland/McLean/Conway/Doak',
    TUN: 'Dahmen/Ben Saïd/Memmiche | Talbi/Bronn/Meriah/Maâloul/Ben Slimane/Drager/Kechrida | *Skhiri/Laïdouni/Aouadhi/Sassi/Ben Romdhane/Mejbri | Msakni/Jaziri/Khazri/Maaloul/Achouri/Jebali',
    COD: 'Mpasi/Lukama/Tshamala | Mbemba/Masuaku/Mukau/Inonga/Kalulu/Batubinsika/Mukoko | *Bakambu/Pickel/Moutoussamy/Mukau/Wan-Bissaka/Lokonga | Wissa/Bakambu/Elia/Bongonda/Bakambu/Mayele',
    UZB: 'Nematov/Yusupov/Ergashev | Khusanov/Abdukholikov/Ashurmatov/Saidov/Khamrobekov/Rakhmonaliev/Tukhtakhujaev | *Masharipov/Yakhshiboev/Urunov/Fayzullaev/Iskanderov/Khamraliev | Shomurodov/Sergeev/Turgunboev/Erkinov/Hamrobekov/Tukhtasinov',
    QAT: 'Barsham/Al-Sheeb/Saleh | Ro-Ro/B.Khoukhi/Hassan/Pedro Miguel/Correia/Salman/Ahmed | *Hatem/Madibo/Waad/Boudiaf/Al-Haydos/Al-Rawi | A.Afif/Almoez Ali/Muntari/Ali/Hassan/Aziz',
    IRQ: 'Hachim/Talib/Hassan | M.Ali/Adnan/Bayesh/Tahseen/Hussein/Faisal/Kadhim | *Resan/Tahseen/Ali Jasim/Aymen/Faiz/Hashim | A.Hussein/Hussein/Hardan/Jabar/Manabari/Atwan',
    RSA: 'Williams/*Foster/Bvuma | Mudau/Mvala/Modiba/Mbatha/De Reuck/Xulu/Maart | Mokoena/Zwane/Mahlangu/Kekana/Morena/Sithole | Foster/Ngezana/Tau/Mofokeng/Rayners/Makgopa',
    KSA: 'Al-Owais/Al-Rubaie/Al-Aqidi | Al-Boleahi/Al-Tambakti/Al-Amri/Al-Shahrani/Al-Breik/Madu/Hawsawi | Kanno/Al-Faraj/Al-Malki/Al-Dawsari/Al-Najei/Otayf | *Al-Dawsari/Al-Shehri/Al-Buraikan/Asiri/Al-Hamdan/Marran',
    BIH: 'Vasilj/Hadžikić/Šehić | Kvržić/Bičakčić/Katić/Mujakić/Barišić/Hadžiahmetović/Cipetić | *Tadić/Pjanić/Hajradinović/Gigović/Cimirot/Krunić | Džeko/Demirović/Prevljak/Bajraktarević/Hodžić/Husić',
    CPV: 'Vozinha/Marcio/Hélder | Stopira/Roberto/Diney/Logan/Pico/Kenny/Steven | *Jamiro/Patrick/Kukula/Telles/Deroy/Laros | Bebé/Ryan Mendes/Garry/Livramento/Gilson/Yannick',
    GHA: 'Ati-Zigi/Nurudeen/Wollacott | Mensah/Salisu/Djiku/Lamptey/Aidoo/Rahman/Seidu | *Partey/Kudus/Ashimeru/Samed/Bernard/Owusu | I.Williams/A.Semenyo/Sulemana/A.Ayew/Bukari/Fatawu',
    CUW: 'Room/Bonevacia/Pieters | Bacuna/Martina/Janga/Hoogdorp/Bochove/Sambo/van der Werff | *L.Bacuna/Sambo/Antonia/Kortsmit/Maria/Sno | Locadia/Antonia/Bachirou/Janga/Margaret/Klongary',
    HAI: 'Placide/Johnson/Casimir | Sylvain/Belkebla/Numa/Joseph/Saint-Just/Camelo/Vincent | *Belkebla/Banatte/Bryan/Pierre/Vincent/Ambroise | Pierrot/Boranbah/Bazile/Saint-Juste/Cantave/Innocent',
    NZL: 'Marinović/Sail/Crawford | Boxall/Stamenić/Pijnaker/Tuiloma/Cacace/Surman/Bell | *Stamenić/Garbett/Bell/Lewis/Ingham/de Vries | Wood/Just/Stamenić/Old/Waine/Barbarouses',
    JOR: 'Abu Laila/Shafi/Al-Salameen | Nasib/Abu Zrayq/Haddad/Rashdan/Al-Arab/Saleh/Othman | *Al-Rashdan/Al-Naimat/Olwan/Al-Mardi/Abu Hashish/Haddad | Al-Tamari/Al-Naimat/Olwan/Abu Zrayq/Al-Rawabdeh/Tu’ma',
  };

  function parsePlayer(s) {
    s = s.trim();
    const cap = s[0] === '*';
    return { name: cap ? s.slice(1) : s, cap };
  }
  const SQUADS = {};
  Object.keys(RAW).forEach((code) => {
    const [gk, def, mid, fwd] = RAW[code].split('|').map((g) => g.split('/').map(parsePlayer));
    SQUADS[code] = { GK: gk, DEF: def, MID: mid, FWD: fwd };
  });

  W.SQUADS = SQUADS;
})();
