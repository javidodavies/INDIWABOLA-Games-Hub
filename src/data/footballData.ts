import { RegionId } from '../types';

export interface WhoAmIPuzzle {
  id: string;
  region: 'zambia' | 'all';
  difficulty: 'easy' | 'medium' | 'hard';
  name: string;
  aliases: string[];
  shirtNumber: string;
  positionCode: 'FW' | 'MF' | 'DF' | 'GK';
  timeline: string[];
  clues: [string, string, string, string, string, string];
  funFact: string;
}

export const WHO_AM_I_BANK: WhoAmIPuzzle[] = [
  {
    id: 'wai-kalusha',
    region: 'zambia',
    difficulty: 'easy',
    name: 'Kalusha Bwalya',
    aliases: ['kalusha', 'bwalya', 'great kalu'],
    shirtNumber: '11',
    positionCode: 'MF',
    timeline: ['1980 Mufulira', '1985 Cercle Brugge', '1989 PSV Eindhoven', '1994 Club América'],
    clues: [
      'Era & Position: 1980s–2000s · Attacking Midfielder / Forward',
      'Nationality & Caps: Zambia · 87 caps, 39 international goals',
      'Club Path: Mufulira Wanderers → Cercle Brugge → PSV Eindhoven → Club América',
      'Major Honours: 1988 African Footballer of the Year · 2× Eredivisie Champion',
      'Iconic Moment: Hat-trick hero in Zambia’s famous 4–0 win over Italy at Seoul 1988',
      'Shirt & Initials: Famous #11 · Initials K.B.',
    ],
    funFact: 'Known as "Great Kalu", he later served as FAZ President when Chipolopolo lifted the 2012 AFCON trophy.',
  },
  {
    id: 'wai-katongo',
    region: 'zambia',
    difficulty: 'medium',
    name: 'Christopher Katongo',
    aliases: ['katongo', 'chris katongo'],
    shirtNumber: '11',
    positionCode: 'FW',
    timeline: ['2001 Green Buffaloes', '2004 Jomo Cosmos', '2007 Brøndby', '2012 AFCON MVP'],
    clues: [
      'Era & Position: 2000s–2010s · Forward / Winger',
      'Nationality & Caps: Zambia · 103 caps, 23 international goals',
      'Club Path: Green Buffaloes → Jomo Cosmos → Brøndby → Arminia Bielefeld → Henan Jianye',
      'Major Honours: 2012 AFCON Winner & Tournament MVP · 2012 BBC African Footballer of the Year',
      'Iconic Moment: Captained Chipolopolo to victory in Libreville and scored the opening shootout penalty',
      'Shirt & Initials: Captain #11 · Initials C.K.',
    ],
    funFact: 'Katongo scored three goals at AFCON 2012 and was named Player of the Tournament.',
  },
  {
    id: 'wai-daka',
    region: 'zambia',
    difficulty: 'easy',
    name: 'Patson Daka',
    aliases: ['daka', 'patson'],
    shirtNumber: '20',
    positionCode: 'FW',
    timeline: ['2015 Kafue Celtic', '2016 Power Dynamos', '2017 RB Salzburg', '2021 Leicester City'],
    clues: [
      'Era & Position: 2017–Present · Striker',
      'Nationality & Caps: Zambia · Kafue-born international forward',
      'Club Path: Kafue Celtic → Power Dynamos → Red Bull Salzburg → Leicester City',
      'Major Honours: 2017 CAF U-20 AFCON Winner & MVP · 2020–21 Austrian Bundesliga Top Scorer',
      'Iconic Moment: Scored four goals in a single UEFA Europa League match against Spartak Moscow',
      'Shirt & Initials: #20 / #9 · Initials P.D.',
    ],
    funFact: 'Patson Daka won CAF Young Player of the Year in 2017 after firing Zambia to the U-20 AFCON title.',
  },
  {
    id: 'wai-banda',
    region: 'zambia',
    difficulty: 'easy',
    name: 'Barbra Banda',
    aliases: ['banda', 'barbra'],
    shirtNumber: '11',
    positionCode: 'FW',
    timeline: ['2016 Green Buffaloes', '2018 Logroño', '2020 Shanghai', '2024 Orlando Pride'],
    clues: [
      'Era & Position: 2016–Present · Forward',
      'Nationality & Caps: Zambia · Copper Queens Captain',
      'Club Path: Green Buffaloes → EDF Logroño → Shanghai Shengli → Orlando Pride',
      'Major Honours: 2024 NWSL Champion & Finals MVP · 2024 BBC Women’s Footballer of the Year',
      'Iconic Moment: First player in Olympic history to score back-to-back hat-tricks (Tokyo 2020)',
      'Shirt & Initials: #11 / #22 · Initials B.B.',
    ],
    funFact: 'Barbra Banda scored 10 goals across the Tokyo 2020 and Paris 2024 Olympic Games.',
  },
  {
    id: 'wai-chitalu',
    region: 'zambia',
    difficulty: 'hard',
    name: 'Godfrey Chitalu',
    aliases: ['chitalu', 'ucar', 'ucar chitalu'],
    shirtNumber: '9',
    positionCode: 'FW',
    timeline: ['1964 Kitwe United', '1970 Kabwe Warriors', '1972 107 Goals', '1993 Coach'],
    clues: [
      'Era & Position: 1964–1982 · Centre Forward',
      'Nationality & Caps: Zambia · 111 caps, 79 international goals',
      'Club Path: Kitwe United → Kabwe Warriors',
      'Major Honours: 5× Zambian Footballer of the Year · All-time Chipolopolo top scorer',
      'Iconic Moment: Scored an astonishing 107 goals in calendar year 1972 for club and country',
      'Shirt & Initials: Nicknamed "Ucar" · Initials G.C.',
    ],
    funFact: 'Godfrey Chitalu also coached the Zambian national team until the tragic 1993 Gabon air disaster.',
  },
  {
    id: 'wai-mweene',
    region: 'zambia',
    difficulty: 'medium',
    name: 'Kennedy Mweene',
    aliases: ['mweene', 'kennedy'],
    shirtNumber: '16',
    positionCode: 'GK',
    timeline: ['2004 Kitwe United', '2005 Free State Stars', '2013 Mamelodi Sundowns', '2016 CAF CL'],
    clues: [
      'Era & Position: 2004–2023 · Goalkeeper',
      'Nationality & Caps: Zambia · 122 international caps',
      'Club Path: Kitwe United → Free State Stars → Mamelodi Sundowns',
      'Major Honours: 2012 AFCON Champion · 2016 CAF Champions League Winner',
      'Iconic Moment: Saved Asamoah Gyan’s semi-final penalty and kept a clean sheet in the 2012 AFCON Final',
      'Shirt & Initials: Famous #16 · Initials K.M.',
    ],
    funFact: 'Kennedy Mweene also famously scored an equalizer from the penalty spot for Zambia against Nigeria at AFCON 2013.',
  },
  {
    id: 'wai-salah',
    region: 'all',
    difficulty: 'easy',
    name: 'Mohamed Salah',
    aliases: ['salah', 'mo salah'],
    shirtNumber: '11',
    positionCode: 'FW',
    timeline: ['2010 El Mokawloon', '2012 Basel', '2015 Roma', '2017 Liverpool'],
    clues: [
      'Era & Position: 2010–Present · Right Winger',
      'Nationality & Caps: Egypt · Over 100 international caps',
      'Club Path: El Mokawloon → Basel → Chelsea → Fiorentina → Roma → Liverpool',
      'Major Honours: UEFA Champions League · Premier League · 2× CAF African Footballer of the Year',
      'Iconic Moment: Scored 32 goals in his debut 38-game Premier League campaign (2017–18)',
      'Shirt & Initials: Iconic #11 · Initials M.S.',
    ],
    funFact: 'Mohamed Salah is Liverpool’s all-time top goalscorer in the Premier League era.',
  },
  {
    id: 'wai-drogba',
    region: 'all',
    difficulty: 'medium',
    name: 'Didier Drogba',
    aliases: ['drogba', 'didier'],
    shirtNumber: '11',
    positionCode: 'FW',
    timeline: ['1998 Le Mans', '2003 Marseille', '2004 Chelsea', '2012 UCL Final'],
    clues: [
      'Era & Position: 1998–2018 · Centre Forward',
      'Nationality & Caps: Ivory Coast · 105 caps, 65 goals',
      'Club Path: Le Mans → Guingamp → Marseille → Chelsea → Galatasaray',
      'Major Honours: 4× Premier League · UEFA Champions League · 2× African Footballer of the Year',
      'Iconic Moment: 88th-minute header and decisive winning penalty in the 2012 Champions League Final',
      'Shirt & Initials: Iconic #11 · Initials D.D.',
    ],
    funFact: 'Drogba faced Zambia in the 2012 AFCON Final in Libreville where Chipolopolo prevailed on penalties.',
  },
  {
    id: 'wai-etoo',
    region: 'all',
    difficulty: 'hard',
    name: "Samuel Eto'o",
    aliases: ['etoo', "eto'o", 'samuel'],
    shirtNumber: '9',
    positionCode: 'FW',
    timeline: ['1997 Real Madrid', '2000 Mallorca', '2004 Barcelona', '2009 Inter Milan'],
    clues: [
      'Era & Position: 1997–2019 · Striker',
      'Nationality & Caps: Cameroon · 118 caps, 56 goals',
      'Club Path: Real Madrid → Mallorca → Barcelona → Inter Milan → Chelsea',
      'Major Honours: 2× AFCON Winner · 4× African Footballer of the Year · Back-to-back European Trebles',
      'Iconic Moment: All-time leading goalscorer in Africa Cup of Nations history (18 goals)',
      'Shirt & Initials: Famous #9 · Initials S.E.',
    ],
    funFact: "Samuel Eto'o won consecutive continental trebles with Barcelona (2009) and Inter Milan (2010).",
  },
];

export type TriviaCategory = 'all' | 'club' | 'player' | 'competition' | 'national';

export interface TriviaQuestion {
  id: string;
  region: 'zambia' | 'all';
  category: Exclude<TriviaCategory, 'all'>;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export const TRIVIA_BANK: TriviaQuestion[] = [
  {
    id: 'trv-1',
    region: 'zambia',
    category: 'competition',
    difficulty: 'easy',
    question: 'In which city did Zambia defeat Ivory Coast on penalties to win the 2012 Africa Cup of Nations?',
    options: ['Bata', 'Libreville', 'Malabo', 'Franceville'],
    correctIndex: 1,
    explanation: 'Zambia triumphed 8–7 on penalties at Stade d’Angondjé in Libreville, Gabon—only kilometres from the 1993 air crash site.',
  },
  {
    id: 'trv-2',
    region: 'zambia',
    category: 'player',
    difficulty: 'easy',
    question: 'Which defender scored Zambia’s decisive winning penalty in the 2012 AFCON final shootout?',
    options: ['Stoppila Sunzu', 'Hichani Himoonde', 'Davies Nkausu', 'Joseph Musonda'],
    correctIndex: 0,
    explanation: 'Stoppila Sunzu calmly converted Zambia’s ninth kick after Kolo Touré and Gervinho missed for Ivory Coast.',
  },
  {
    id: 'trv-3',
    region: 'zambia',
    category: 'club',
    difficulty: 'medium',
    question: 'Which Zambian club became the first Zambian side to reach the CAF Champions League semi-finals in 2016?',
    options: ['Nkana FC', 'Power Dynamos', 'ZESCO United', 'Zanaco FC'],
    correctIndex: 2,
    explanation: 'ZESCO United reached the 2016 CAF Champions League semi-finals before narrowly falling to eventual champions Mamelodi Sundowns.',
  },
  {
    id: 'trv-4',
    region: 'zambia',
    category: 'club',
    difficulty: 'medium',
    question: 'Which Zambian club lifted the African Cup Winners’ Cup in 1991, becoming the first Zambian club to win a continental trophy?',
    options: ['Mufulira Wanderers', 'Power Dynamos', 'Nkana Red Devils', 'Green Buffaloes'],
    correctIndex: 1,
    explanation: 'Power Dynamos defeated BCC Lions of Nigeria 5–4 on aggregate in the 1991 African Cup Winners’ Cup final.',
  },
  {
    id: 'trv-5',
    region: 'zambia',
    category: 'national',
    difficulty: 'easy',
    question: 'Who scored a famous hat-trick in Zambia’s 4–0 victory over Italy at the 1988 Seoul Olympics?',
    options: ['Alex Chola', 'Derby Makinka', 'Kalusha Bwalya', 'Stone Nyirenda'],
    correctIndex: 2,
    explanation: 'Kalusha Bwalya struck three goals alongside Johnson Bwalya’s finish as Zambia shocked Italy 4–0 on 19 September 1988.',
  },
  {
    id: 'trv-6',
    region: 'zambia',
    category: 'club',
    difficulty: 'easy',
    question: 'Which two Copperbelt clubs contest Zambia’s fierce Kitwe Derby?',
    options: ['ZESCO United & Forest Rangers', 'Nkana FC & Power Dynamos', 'Kabwe Warriors & Prison Leopards', 'Red Arrows & Green Buffaloes'],
    correctIndex: 1,
    explanation: 'Nkana FC (Wusakile) and Power Dynamos (Arthur Davies Stadium) contest the iconic Kitwe Derby.',
  },
  {
    id: 'trv-7',
    region: 'zambia',
    category: 'player',
    difficulty: 'hard',
    question: 'How many league goals did Collins Mbesuma score in his record-breaking 2004–05 South African PSL season with Kaizer Chiefs?',
    options: ['21 goals', '25 goals', '29 goals', '35 goals'],
    correctIndex: 1,
    explanation: 'Collins "Ntofontofo" Mbesuma hit 25 league goals (35 in all competitions) during the 2004–05 campaign.',
  },
  {
    id: 'trv-8',
    region: 'zambia',
    category: 'player',
    difficulty: 'medium',
    question: 'Who became the most expensive African women’s footballer when signing for Bay FC in 2024?',
    options: ['Grace Chanda', 'Barbra Banda', 'Racheal Kundananji', 'Lushomo Mweemba'],
    correctIndex: 2,
    explanation: 'Racheal Kundananji joined Bay FC from Madrid CFF in February 2024 for a then world-record transfer fee.',
  },
  {
    id: 'trv-9',
    region: 'all',
    category: 'club',
    difficulty: 'easy',
    question: 'Which African club holds the all-time record for the most CAF Champions League titles?',
    options: ['TP Mazembe', 'Al Ahly', 'Espérance de Tunis', 'Zamalek'],
    correctIndex: 1,
    explanation: 'Egyptian giants Al Ahly lead Africa with 12 CAF Champions League trophies.',
  },
  {
    id: 'trv-10',
    region: 'all',
    category: 'national',
    difficulty: 'easy',
    question: 'Which country became the first African nation to reach a FIFA World Cup semi-final in 2022?',
    options: ['Senegal', 'Cameroon', 'Ghana', 'Morocco'],
    correctIndex: 3,
    explanation: 'Morocco defeated Belgium, Spain, and Portugal in Qatar 2022 to reach the semi-finals.',
  },
  {
    id: 'trv-11',
    region: 'all',
    category: 'player',
    difficulty: 'medium',
    question: 'Who is the only African footballer to have won the Ballon d’Or?',
    options: ['George Weah', 'Didier Drogba', "Samuel Eto'o", 'Sadio Mané'],
    correctIndex: 0,
    explanation: 'Liberian icon George Weah won the Ballon d’Or in 1995 while playing for PSG and AC Milan.',
  },
  {
    id: 'trv-12',
    region: 'all',
    category: 'national',
    difficulty: 'medium',
    question: 'Which manager led Zambia to their historic 2012 Africa Cup of Nations triumph?',
    options: ['Dario Bonetti', 'Hervé Renard', 'Wedson Nyirenda', 'Avram Grant'],
    correctIndex: 1,
    explanation: 'French coach Hervé Renard guided Chipolopolo to glory in Libreville in February 2012.',
  },
];

export interface MatchPredictionFixture {
  id: string;
  region: 'zambia' | 'all';
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeStrength: number;
  awayStrength: number;
  kickoffLabel: string;
  deadlineMinutes: number;
}

export const MATCH_PREDICTION_SLIPS: MatchPredictionFixture[] = [
  { id: 'fix-1', region: 'zambia', competition: 'MTN Super League', homeTeam: 'Nkana FC', awayTeam: 'Power Dynamos', homeStrength: 78, awayStrength: 80, kickoffLabel: 'Sat 15:00 CAT · Nkana Stadium', deadlineMinutes: 45 },
  { id: 'fix-2', region: 'zambia', competition: 'MTN Super League', homeTeam: 'ZESCO United', awayTeam: 'Red Arrows', homeStrength: 81, awayStrength: 79, kickoffLabel: 'Sat 15:00 CAT · Levy Mwanawasa', deadlineMinutes: 60 },
  { id: 'fix-3', region: 'zambia', competition: 'MTN Super League', homeTeam: 'Green Buffaloes', awayTeam: 'Zanaco FC', homeStrength: 75, awayStrength: 74, kickoffLabel: 'Sun 15:00 CAT · Edwin Imboela', deadlineMinutes: 120 },
  { id: 'fix-4', region: 'zambia', competition: 'MTN Super League', homeTeam: 'Kabwe Warriors', awayTeam: 'Mufulira Wanderers', homeStrength: 76, awayStrength: 72, kickoffLabel: 'Sun 15:00 CAT · Godfrey Chitalu', deadlineMinutes: 120 },
  { id: 'fix-5', region: 'zambia', competition: 'AFCON Qualifier', homeTeam: 'Zambia', awayTeam: 'Ivory Coast', homeStrength: 80, awayStrength: 84, kickoffLabel: 'Tue 18:00 CAT · Ndola', deadlineMinutes: 240 },
  { id: 'fix-6', region: 'all', competition: 'CAF Champions League', homeTeam: 'Al Ahly', awayTeam: 'Mamelodi Sundowns', homeStrength: 88, awayStrength: 85, kickoffLabel: 'Sat 20:00 CAT · Cairo', deadlineMinutes: 90 },
  { id: 'fix-7', region: 'all', competition: 'Premier League', homeTeam: 'Arsenal', awayTeam: 'Liverpool', homeStrength: 87, awayStrength: 87, kickoffLabel: 'Sun 17:30 CAT · London', deadlineMinutes: 150 },
  { id: 'fix-8', region: 'all', competition: 'La Liga', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', homeStrength: 89, awayStrength: 88, kickoffLabel: 'Sun 21:00 CAT · Madrid', deadlineMinutes: 180 },
];

export interface BolaWordPuzzle {
  word: string;
  region: 'zambia' | 'all';
  length: 5 | 6;
  hint: string;
}

export const BOLA_WORD_BANK: BolaWordPuzzle[] = [
  { word: 'NKANA', region: 'zambia', length: 5, hint: '13-time Zambian league champions from Kitwe.' },
  { word: 'ZESCO', region: 'zambia', length: 5, hint: 'Ndola giants nicknamed Team Ya Ziko.' },
  { word: 'SUNZU', region: 'zambia', length: 5, hint: 'Scored the winning penalty in Libreville 2012.' },
  { word: 'BANDA', region: 'zambia', length: 5, hint: 'Copper Queens Olympic hat-trick captain.' },
  { word: 'NDOLA', region: 'zambia', length: 5, hint: 'Home city of Levy Mwanawasa Stadium.' },
  { word: 'KITWE', region: 'zambia', length: 5, hint: 'Copperbelt city hosting the fiercest Zambian derby.' },
  { word: 'PITCH', region: 'all', length: 5, hint: 'The turf where the match unfolds.' },
  { word: 'DERBY', region: 'all', length: 5, hint: 'Fierce fixture between local rivals.' },
  { word: 'BRACE', region: 'all', length: 5, hint: 'Two goals scored by one player in a match.' },
  { word: 'SQUAD', region: 'all', length: 5, hint: 'Full matchday roster selected by the manager.' },
  { word: 'ZANACO', region: 'zambia', length: 6, hint: 'Lusaka bankers nicknamed The Bankers.' },
  { word: 'MWEENE', region: 'zambia', length: 6, hint: 'Zambia AFCON 2012 penalty-saving goalkeeper.' },
  { word: 'BWALYA', region: 'zambia', length: 6, hint: 'Surname of 1988 African Footballer of the Year Kalusha.' },
  { word: 'LUSAKA', region: 'zambia', length: 6, hint: 'Capital city home to National Heroes Stadium.' },
  { word: 'KEEPER', region: 'all', length: 6, hint: 'Last line of defence wearing gloves.' },
  { word: 'HEADER', region: 'all', length: 6, hint: 'Aerial strike off a corner or cross.' },
  { word: 'TROPHY', region: 'all', length: 6, hint: 'Silverware lifted by the champions.' },
];

export interface CrosswordData {
  id: string;
  region: 'zambia' | 'all';
  difficulty: 'easy' | 'medium';
  title: string;
  grid: (string | null)[][];
  across: { number: number; row: number; col: number; clue: string; answer: string }[];
  down: { number: number; row: number; col: number; clue: string; answer: string }[];
}

export const VERIFIED_CROSSWORDS: CrosswordData[] = [
  {
    id: 'cw-zm-clean',
    region: 'zambia',
    difficulty: 'easy',
    title: 'Zambia Matchday 5x5',
    grid: [
      ['N', 'D', 'O', 'L', 'A'],
      ['K', null, null, null, 'W'],
      ['A', 'R', 'E', 'N', 'A'],
      ['N', null, null, null, 'R'],
      ['A', 'H', 'E', 'A', 'D'],
    ],
    across: [
      { number: 1, row: 0, col: 0, clue: 'Copperbelt city of Levy Mwanawasa Stadium (5)', answer: 'NDOLA' },
      { number: 3, row: 2, col: 0, clue: 'Stadium ground packed for kickoff (5)', answer: 'ARENA' },
      { number: 4, row: 4, col: 0, clue: 'Leading on the scoreboard (5)', answer: 'AHEAD' },
    ],
    down: [
      { number: 1, row: 0, col: 0, clue: 'Kitwe giants with 13 Zambian league titles (5)', answer: 'NKANA' },
      { number: 2, row: 0, col: 4, clue: 'Golden Boot or MVP trophy (5)', answer: 'AWARD' },
    ],
  },
  {
    id: 'cw-zm-kitwe',
    region: 'zambia',
    difficulty: 'medium',
    title: 'Copperbelt Pitch 5x5',
    // Row 0: K I T W E  (City of Nkana & Power Dynamos)
    // Col 0: K A B W E  (City of Warriors!) -> Row 1: A, Row 2: B, Row 3: W, Row 4: E
    // Col 4: E R R O R  (Defensive mistake!) -> Row 1: R, Row 2: R, Row 3: O, Row 4: R
    // Row 2: B A R C A  (No, needs R at col 4 -> B R A C E ends E, what starts B and ends R? B O X E R? No football: B A L L R no).
    // Let's check Col 4 = E X T R A -> Row 2 ends T (B _ _ _ T -> B O O S T! B E A S T!) Row 4 ends A (E _ _ _ A -> E R E N A no, E X T R A starts E ends A).
    // Let's verify:
    // Row 0: K I T W E  (0,0=K, 0,4=E)
    // Col 0: K A B W E  (0,0=K, 2,0=B, 4,0=E) -> Kabwe!
    // Col 4: E X T R A  (0,4=E, 2,4=T, 4,4=A) -> Extra time!
    // Row 2: B E A S T  (2,0=B, 2,4=T) -> or B O O S T (momentum boost!)
    // Row 4: E R E N A? No, E _ _ _ A -> E B O L A no. Wait: if Row 4 is A R E N A -> Col 0 ends A -> N K A N A!!
    // Check Col 0 = N K A N A, Row 0 = N D O L A (already used). What if Col 0 = B A N D A (Barbra Banda!)?
    // Row 0: B R A C E  (0,0=B, 0,4=E) -> Two goals by one player!
    // Col 0: B A N D A  (0,0=B, 2,0=N, 4,0=A) -> Copper Queens captain!
    // Col 4: E X T R A  (0,4=E, 2,4=T, 4,4=A) -> 30 minutes added in knockout!
    // Row 2: N I G H T  (2,0=N, 2,4=T) -> Floodlit kickoff time!
    // Row 4: A R E N A  (4,0=A, 4,4=A) -> Stadium venue!
    // VERIFY EVERY WORD:
    // 1A (0,0): BRACE — Two goals scored by one player (5)
    // 3A (2,0): NIGHT — Floodlit evening kickoff setting (5)
    // 4A (4,0): ARENA — Stadium venue packed with fans (5)
    // 1D (0,0): BANDA — Copper Queens Olympic hat-trick captain Barbra (5)
    // 2D (0,4): EXTRA — Added 30-minute knockout period (5)
    grid: [
      ['B', 'R', 'A', 'C', 'E'],
      ['A', null, null, null, 'X'],
      ['N', 'I', 'G', 'H', 'T'],
      ['D', null, null, null, 'R'],
      ['A', 'R', 'E', 'N', 'A'],
    ],
    across: [
      { number: 1, row: 0, col: 0, clue: 'Two goals scored by one player (5)', answer: 'BRACE' },
      { number: 3, row: 2, col: 0, clue: 'Floodlit evening match setting (5)', answer: 'NIGHT' },
      { number: 4, row: 4, col: 0, clue: 'Packed stadium ground (5)', answer: 'ARENA' },
    ],
    down: [
      { number: 1, row: 0, col: 0, clue: 'Copper Queens Olympic captain Barbra (5)', answer: 'BANDA' },
      { number: 2, row: 0, col: 4, clue: 'Additional 30-minute knockout period (5)', answer: 'EXTRA' },
    ],
  },
  {
    id: 'cw-all-clean',
    region: 'all',
    difficulty: 'easy',
    title: 'Champions Pitch 5x5',
    grid: [
      ['S', 'C', 'O', 'R', 'E'],
      ['Q', null, null, null, 'X'],
      ['U', 'P', 'S', 'E', 'T'],
      ['A', null, null, null, 'R'],
      ['D', 'R', 'A', 'M', 'A'],
    ],
    across: [
      { number: 1, row: 0, col: 0, clue: 'Goals tally on the match board (5)', answer: 'SCORE' },
      { number: 3, row: 2, col: 0, clue: 'Giant-killing cup shock result (5)', answer: 'UPSET' },
      { number: 4, row: 4, col: 0, clue: 'Late stoppage-time excitement (5)', answer: 'DRAMA' },
    ],
    down: [
      { number: 1, row: 0, col: 0, clue: 'Full matchday player roster (5)', answer: 'SQUAD' },
      { number: 2, row: 0, col: 4, clue: 'Additional 30 minutes in knockout ties (5)', answer: 'EXTRA' },
    ],
  },
];

export interface ConnectionsGroup {
  category: string;
  difficulty: 1 | 2 | 3 | 4;
  items: [string, string, string, string];
}

export interface ConnectionsPuzzle {
  id: string;
  region: 'zambia' | 'all';
  title: string;
  groups: [ConnectionsGroup, ConnectionsGroup, ConnectionsGroup, ConnectionsGroup];
}

export const CONNECTIONS_BANK: ConnectionsPuzzle[] = [
  {
    id: 'conn-zm-1',
    region: 'zambia',
    title: 'Copperbelt & Chipolopolo',
    groups: [
      { category: 'Zambian Super League Clubs', difficulty: 1, items: ['NKANA', 'ZESCO', 'ZANACO', 'RED ARROWS'] },
      { category: '2012 AFCON Champions Squad', difficulty: 2, items: ['KATONGO', 'SUNZU', 'MWEENE', 'KALABA'] },
      { category: 'Copper Queens Stars', difficulty: 3, items: ['BANDA', 'KUNDANANJI', 'CHANDA', 'MWEEMBA'] },
      { category: 'Zambian Football Grounds', difficulty: 4, items: ['HEROES', 'MWANAWASA', 'NKOLOMA', 'WOODLANDS'] },
    ],
  },
  {
    id: 'conn-zm-2',
    region: 'zambia',
    title: 'Zambian Football Heritage',
    groups: [
      { category: 'Zambian Strikers', difficulty: 1, items: ['DAKA', 'MBESUMA', 'CHITALU', 'MAYUKA'] },
      { category: 'Copperbelt Football Cities', difficulty: 2, items: ['NDOLA', 'KITWE', 'MUFULIRA', 'CHINGOLA'] },
      { category: 'Zambian Club Nicknames', difficulty: 3, items: ['AIRMEN', 'BANKERS', 'WARRIORS', 'BUFFALOES'] },
      { category: 'Chipolopolo Coach Surnames', difficulty: 4, items: ['RENARD', 'NYIRENDA', 'GRANT', 'PHIRI'] },
    ],
  },
  {
    id: 'conn-all-1',
    region: 'all',
    title: 'Global Tactical Terms',
    groups: [
      { category: 'Set-Piece Routines', difficulty: 1, items: ['CORNER', 'FREE KICK', 'PENALTY', 'THROW-IN'] },
      { category: 'African Football Legends', difficulty: 2, items: ['DROGBA', "ETO'O", 'WEAH', 'SALAH'] },
      { category: 'Positions in a Back Four', difficulty: 3, items: ['LEFT BACK', 'SWEEPER', 'STOPPER', 'WING BACK'] },
      { category: 'Words Before "Card" or "Zone"', difficulty: 4, items: ['YELLOW', 'RED', 'DANGER', 'TECHNICAL'] },
    ],
  },
  {
    id: 'conn-all-2',
    region: 'all',
    title: 'Continental Giants & Finals',
    groups: [
      { category: 'CAF Champions League Winners', difficulty: 1, items: ['AL AHLY', 'TP MAZEMBE', 'WYDAD', 'ESPERANCE'] },
      { category: 'Major Football Trophies', difficulty: 2, items: ['AFCON', 'WORLD CUP', 'BALLON DOR', 'GOLDEN BOOT'] },
      { category: 'Match Official Calls', difficulty: 3, items: ['OFFSIDE', 'HANDBALL', 'ADVANTAGE', 'FOUL'] },
      { category: 'Formation Numbers', difficulty: 4, items: ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'] },
    ],
  },
];

export interface StrandsPuzzle {
  id: string;
  region: 'zambia' | 'all';
  difficulty: 'easy' | 'hard';
  theme: string;
  spangram: string;
  words: string[];
  grid: string[][];
}

export const STRANDS_BANK: StrandsPuzzle[] = [
  {
    id: 'str-zm-1',
    region: 'zambia',
    difficulty: 'easy',
    theme: 'Chipolopolo & Super League',
    spangram: 'ZAMBIA',
    words: ['ZAMBIA', 'NKANA', 'ZESCO', 'KITWE', 'GOAL', 'PASS', 'DERBY', 'PITCH'],
    grid: [
      ['Z', 'A', 'M', 'B', 'I', 'A', 'N', 'K'],
      ['Z', 'E', 'S', 'C', 'O', 'P', 'N', 'A'],
      ['K', 'I', 'T', 'W', 'E', 'G', 'O', 'A'],
      ['P', 'A', 'S', 'S', 'C', 'U', 'P', 'L'],
      ['D', 'E', 'R', 'B', 'Y', 'W', 'I', 'N'],
      ['P', 'I', 'T', 'C', 'H', 'B', 'O', 'L'],
    ],
  },
  {
    id: 'str-all-1',
    region: 'all',
    difficulty: 'hard',
    theme: 'Matchday Tactics & Positions',
    spangram: 'TACTICS',
    // Row 0: T A C T I C S W  -> TACTICS (0,0..0,6)
    // Row 1: K E E P E R I N  -> KEEPER (1,0..1,5), WIN (0,7 -> 1,7? 0,7=W 1,6=I 1,7=N -> WIN!)
    // Row 2: C O R N E R G S  -> CORNER (2,0..2,5)
    // Row 3: S Q U A D F O U  -> SQUAD (3,0..3,4), FOUL (3,5->3,7->4,7)
    // Row 4: S A V E B R A L  -> SAVE (4,0..4,3)
    // Row 5: F I N A L C U P  -> FINAL (5,0..5,4), CUP (5,5..5,7)
    words: ['TACTICS', 'KEEPER', 'CORNER', 'SQUAD', 'SAVE', 'FINAL', 'CUP', 'FOUL'],
    grid: [
      ['T', 'A', 'C', 'T', 'I', 'C', 'S', 'W'],
      ['K', 'E', 'E', 'P', 'E', 'R', 'I', 'N'],
      ['C', 'O', 'R', 'N', 'E', 'R', 'G', 'S'],
      ['S', 'Q', 'U', 'A', 'D', 'F', 'O', 'U'],
      ['S', 'A', 'V', 'E', 'B', 'R', 'A', 'L'],
      ['F', 'I', 'N', 'A', 'L', 'C', 'U', 'P'],
    ],
  },
];

export interface MatchReplayPuzzle {
  id: string;
  region: 'zambia' | 'all';
  matchTitle: string;
  dateAndVenue: string;
  finalScore: string;
  eventsChronological: { minute: string; text: string }[];
}

export const MATCH_REPLAY_BANK: MatchReplayPuzzle[] = [
  {
    id: 'mr-afcon-2012',
    region: 'zambia',
    matchTitle: 'Zambia vs Ivory Coast — AFCON 2012 Final',
    dateAndVenue: '12 Feb 2012 · Stade d’Angondjé, Libreville',
    finalScore: 'Zambia 0–0 Ivory Coast (8–7 Pens)',
    eventsChronological: [
      { minute: "12'", text: 'Joseph Musonda forced off injured early; Nyambe Mulenga enters.' },
      { minute: "70'", text: 'Didier Drogba blasts a crucial Ivory Coast penalty high over the crossbar.' },
      { minute: "90'+", text: 'Kennedy Mweene keeps a heroic clean sheet as final finishes 0–0 into extra time.' },
      { minute: "118'", text: 'Chris Katongo hits the post in a tense goalless extra-time period.' },
      { minute: 'Pens', text: 'Stoppila Sunzu buries the 9th kick to crown Zambia African champions.' },
    ],
  },
  {
    id: 'mr-ghana-2012',
    region: 'zambia',
    matchTitle: 'Zambia vs Ghana — AFCON 2012 Semi-Final',
    dateAndVenue: '8 Feb 2012 · Estadio de Bata, Equatorial Guinea',
    finalScore: 'Zambia 1–0 Ghana',
    eventsChronological: [
      { minute: "8'", text: 'Kennedy Mweene dives left to save Asamoah Gyan’s early penalty kick.' },
      { minute: "45'", text: 'Chipolopolo hold resolute at 0–0 heading into the half-time interval.' },
      { minute: "78'", text: 'Substitute Emmanuel Mayuka turns on the edge of the box and curls in off the post.' },
      { minute: "84'", text: 'Derek Boateng receives a second yellow card as Ghana drop to ten men.' },
      { minute: 'FT', text: 'Zambia reach their first AFCON Final since 1994 with a 1–0 victory.' },
    ],
  },
  {
    id: 'mr-seoul-1988',
    region: 'all',
    matchTitle: 'Zambia vs Italy — 1988 Seoul Olympics',
    dateAndVenue: '19 Sep 1988 · Gwangju Mudeung Stadium',
    finalScore: 'Zambia 4–0 Italy',
    eventsChronological: [
      { minute: "40'", text: 'Kalusha Bwalya curls in a sharp opener just before half-time.' },
      { minute: "55'", text: 'Kalusha Bwalya doubles Chipolopolo’s lead ten minutes after the break.' },
      { minute: "63'", text: 'Johnson Bwalya finishes cleanly to make it 3–0 against the Azzurri.' },
      { minute: "90'", text: 'Kalusha Bwalya completes a legendary hat-trick to seal 4–0.' },
      { minute: 'FT', text: 'Zambia tops Group B ahead of Italy in one of Olympic football’s great shocks.' },
    ],
  },
  {
    id: 'mr-istanbul-2005',
    region: 'all',
    matchTitle: 'AC Milan vs Liverpool — 2005 UCL Final',
    dateAndVenue: '25 May 2005 · Atatürk Olympic Stadium, Istanbul',
    finalScore: 'AC Milan 3–3 Liverpool (2–3 Pens)',
    eventsChronological: [
      { minute: "1'", text: 'Paolo Maldini volleys AC Milan ahead within the opening minute.' },
      { minute: "44'", text: 'Hernán Crespo nets his second goal to put AC Milan 3–0 up at half-time.' },
      { minute: "54'", text: 'Steven Gerrard heads Liverpool’s lifeline before Šmicer scores two minutes later.' },
      { minute: "60'", text: 'Xabi Alonso converts the rebound from his saved penalty to level 3–3.' },
      { minute: 'Pens', text: 'Jerzy Dudek denies Andriy Shevchenko to complete the Miracle of Istanbul.' },
    ],
  },
];

export interface DraftPlayer {
  id: string;
  name: string;
  pos: 'GK' | 'DEF' | 'MID' | 'FWD';
  club: string;
  nation: string;
  rating: number;
  cost: number;
}

export const DRAFT_POOL: DraftPlayer[] = [
  { id: 'dp1', name: 'Kennedy Mweene', pos: 'GK', club: 'Mamelodi Sundowns', nation: 'Zambia', rating: 83, cost: 7 },
  { id: 'dp2', name: 'Toaster Nsabata', pos: 'GK', club: 'ZESCO United', nation: 'Zambia', rating: 79, cost: 5 },
  { id: 'dp3', name: 'Lawrence Mulenga', pos: 'GK', club: 'Power Dynamos', nation: 'Zambia', rating: 80, cost: 6 },
  { id: 'dp4', name: 'Stoppila Sunzu', pos: 'DEF', club: 'Chipolopolo', nation: 'Zambia', rating: 84, cost: 8 },
  { id: 'dp5', name: 'Lushomo Mweemba', pos: 'DEF', club: 'Green Buffaloes', nation: 'Zambia', rating: 81, cost: 6 },
  { id: 'dp6', name: 'Tandi Mwape', pos: 'DEF', club: 'ZESCO United', nation: 'Zambia', rating: 78, cost: 5 },
  { id: 'dp16', name: 'Kabaso Chongo', pos: 'DEF', club: 'TP Mazembe', nation: 'Zambia', rating: 82, cost: 7 },
  { id: 'dp7', name: 'Rainford Kalaba', pos: 'MID', club: 'TP Mazembe', nation: 'Zambia', rating: 85, cost: 9 },
  { id: 'dp8', name: 'Kings Kangwa', pos: 'MID', club: 'Chipolopolo', nation: 'Zambia', rating: 82, cost: 8 },
  { id: 'dp9', name: 'Enock Mwepu', pos: 'MID', club: 'Brighton', nation: 'Zambia', rating: 84, cost: 9 },
  { id: 'dp10', name: 'Clatous Chama', pos: 'MID', club: 'ZESCO United', nation: 'Zambia', rating: 81, cost: 7 },
  { id: 'dp11', name: 'Kalusha Bwalya', pos: 'MID', club: 'Mufulira Wanderers', nation: 'Zambia', rating: 90, cost: 13 },
  { id: 'dp12', name: 'Patson Daka', pos: 'FWD', club: 'Leicester City', nation: 'Zambia', rating: 84, cost: 10 },
  { id: 'dp13', name: 'Barbra Banda', pos: 'FWD', club: 'Orlando Pride', nation: 'Zambia', rating: 89, cost: 12 },
  { id: 'dp14', name: 'Fashion Sakala', pos: 'FWD', club: 'Al-Fayha', nation: 'Zambia', rating: 81, cost: 8 },
  { id: 'dp15', name: 'Racheal Kundananji', pos: 'FWD', club: 'Bay FC', nation: 'Zambia', rating: 87, cost: 11 },
];

export interface MemoryCardPair {
  pairId: string;
  label: string;
  subtitle: string;
  kind: 'club' | 'trophy' | 'player' | 'icon';
  badgeColor: string;
}

export const MEMORY_PAIRS_BANK: MemoryCardPair[] = [
  { pairId: 'nkana', label: 'Nkana FC', subtitle: '13× Champions', kind: 'club', badgeColor: '#EF4444' },
  { pairId: 'power', label: 'Power Dynamos', subtitle: '1991 CAF Cup', kind: 'club', badgeColor: '#FACC15' },
  { pairId: 'zesco', label: 'ZESCO United', subtitle: 'Team Ya Ziko', kind: 'club', badgeColor: '#38BDF8' },
  { pairId: 'chipolopolo', label: 'Chipolopolo', subtitle: 'AFCON 2012', kind: 'trophy', badgeColor: '#B6FF00' },
  { pairId: 'copperqueens', label: 'Copper Queens', subtitle: 'Olympics', kind: 'player', badgeColor: '#EC4899' },
  { pairId: 'arrows', label: 'Red Arrows', subtitle: 'Airmen', kind: 'club', badgeColor: '#F97316' },
  { pairId: 'buffaloes', label: 'Green Buffaloes', subtitle: 'Lusaka', kind: 'club', badgeColor: '#10B981' },
  { pairId: 'kabwe', label: 'Kabwe Warriors', subtitle: 'Magnificent', kind: 'club', badgeColor: '#A855F7' },
  { pairId: 'kalu11', label: 'Great Kalu #11', subtitle: '1988 Legend', kind: 'player', badgeColor: '#FBBF24' },
  { pairId: 'goldenboot', label: 'Golden Boot', subtitle: 'Top Scorer', kind: 'icon', badgeColor: '#F59E0B' },
];

export function filterByRegion<T extends { region: 'zambia' | 'all' }>(items: T[], region: RegionId): T[] {
  if (region === 'zambia') {
    const zambian = items.filter((i) => i.region === 'zambia');
    return zambian.length > 0 ? zambian : items;
  }
  return items;
}
