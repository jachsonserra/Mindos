// ─── Estrutura da Bíblia (66 livros) ─────────────────────────────────────────

export interface BibleBook {
  id: string;        // slug para a API (inglês)
  name: string;      // nome em português
  abbrev: string;    // abreviação
  chapters: number;  // número de capítulos
  testament: 'ot' | 'nt';
}

// Antigo Testamento — 39 livros
export const OLD_TESTAMENT: BibleBook[] = [
  { id: 'genesis',        name: 'Gênesis',           abbrev: 'Gn',   chapters: 50,  testament: 'ot' },
  { id: 'exodus',         name: 'Êxodo',             abbrev: 'Ex',   chapters: 40,  testament: 'ot' },
  { id: 'leviticus',      name: 'Levítico',           abbrev: 'Lv',   chapters: 27,  testament: 'ot' },
  { id: 'numbers',        name: 'Números',            abbrev: 'Nm',   chapters: 36,  testament: 'ot' },
  { id: 'deuteronomy',    name: 'Deuteronômio',       abbrev: 'Dt',   chapters: 34,  testament: 'ot' },
  { id: 'joshua',         name: 'Josué',              abbrev: 'Js',   chapters: 24,  testament: 'ot' },
  { id: 'judges',         name: 'Juízes',             abbrev: 'Jz',   chapters: 21,  testament: 'ot' },
  { id: 'ruth',           name: 'Rute',               abbrev: 'Rt',   chapters: 4,   testament: 'ot' },
  { id: '1+samuel',       name: '1 Samuel',           abbrev: '1Sm',  chapters: 31,  testament: 'ot' },
  { id: '2+samuel',       name: '2 Samuel',           abbrev: '2Sm',  chapters: 24,  testament: 'ot' },
  { id: '1+kings',        name: '1 Reis',             abbrev: '1Rs',  chapters: 22,  testament: 'ot' },
  { id: '2+kings',        name: '2 Reis',             abbrev: '2Rs',  chapters: 25,  testament: 'ot' },
  { id: '1+chronicles',   name: '1 Crônicas',         abbrev: '1Cr',  chapters: 29,  testament: 'ot' },
  { id: '2+chronicles',   name: '2 Crônicas',         abbrev: '2Cr',  chapters: 36,  testament: 'ot' },
  { id: 'ezra',           name: 'Esdras',             abbrev: 'Ed',   chapters: 10,  testament: 'ot' },
  { id: 'nehemiah',       name: 'Neemias',            abbrev: 'Ne',   chapters: 13,  testament: 'ot' },
  { id: 'esther',         name: 'Ester',              abbrev: 'Et',   chapters: 10,  testament: 'ot' },
  { id: 'job',            name: 'Jó',                 abbrev: 'Jó',   chapters: 42,  testament: 'ot' },
  { id: 'psalms',         name: 'Salmos',             abbrev: 'Sl',   chapters: 150, testament: 'ot' },
  { id: 'proverbs',       name: 'Provérbios',         abbrev: 'Pv',   chapters: 31,  testament: 'ot' },
  { id: 'ecclesiastes',   name: 'Eclesiastes',        abbrev: 'Ec',   chapters: 12,  testament: 'ot' },
  { id: 'song+of+solomon',name: 'Cantares',           abbrev: 'Ct',   chapters: 8,   testament: 'ot' },
  { id: 'isaiah',         name: 'Isaías',             abbrev: 'Is',   chapters: 66,  testament: 'ot' },
  { id: 'jeremiah',       name: 'Jeremias',           abbrev: 'Jr',   chapters: 52,  testament: 'ot' },
  { id: 'lamentations',   name: 'Lamentações',        abbrev: 'Lm',   chapters: 5,   testament: 'ot' },
  { id: 'ezekiel',        name: 'Ezequiel',           abbrev: 'Ez',   chapters: 48,  testament: 'ot' },
  { id: 'daniel',         name: 'Daniel',             abbrev: 'Dn',   chapters: 12,  testament: 'ot' },
  { id: 'hosea',          name: 'Oséias',             abbrev: 'Os',   chapters: 14,  testament: 'ot' },
  { id: 'joel',           name: 'Joel',               abbrev: 'Jl',   chapters: 3,   testament: 'ot' },
  { id: 'amos',           name: 'Amós',               abbrev: 'Am',   chapters: 9,   testament: 'ot' },
  { id: 'obadiah',        name: 'Obadias',            abbrev: 'Ab',   chapters: 1,   testament: 'ot' },
  { id: 'jonah',          name: 'Jonas',              abbrev: 'Jn',   chapters: 4,   testament: 'ot' },
  { id: 'micah',          name: 'Miquéias',           abbrev: 'Mq',   chapters: 7,   testament: 'ot' },
  { id: 'nahum',          name: 'Naum',               abbrev: 'Na',   chapters: 3,   testament: 'ot' },
  { id: 'habakkuk',       name: 'Habacuque',          abbrev: 'Hc',   chapters: 3,   testament: 'ot' },
  { id: 'zephaniah',      name: 'Sofonias',           abbrev: 'Sf',   chapters: 3,   testament: 'ot' },
  { id: 'haggai',         name: 'Ageu',               abbrev: 'Ag',   chapters: 2,   testament: 'ot' },
  { id: 'zechariah',      name: 'Zacarias',           abbrev: 'Zc',   chapters: 14,  testament: 'ot' },
  { id: 'malachi',        name: 'Malaquias',          abbrev: 'Ml',   chapters: 4,   testament: 'ot' },
];

// Novo Testamento — 27 livros
export const NEW_TESTAMENT: BibleBook[] = [
  { id: 'matthew',         name: 'Mateus',            abbrev: 'Mt',   chapters: 28,  testament: 'nt' },
  { id: 'mark',            name: 'Marcos',            abbrev: 'Mc',   chapters: 16,  testament: 'nt' },
  { id: 'luke',            name: 'Lucas',             abbrev: 'Lc',   chapters: 24,  testament: 'nt' },
  { id: 'john',            name: 'João',              abbrev: 'Jo',   chapters: 21,  testament: 'nt' },
  { id: 'acts',            name: 'Atos',              abbrev: 'At',   chapters: 28,  testament: 'nt' },
  { id: 'romans',          name: 'Romanos',           abbrev: 'Rm',   chapters: 16,  testament: 'nt' },
  { id: '1+corinthians',   name: '1 Coríntios',       abbrev: '1Co',  chapters: 16,  testament: 'nt' },
  { id: '2+corinthians',   name: '2 Coríntios',       abbrev: '2Co',  chapters: 13,  testament: 'nt' },
  { id: 'galatians',       name: 'Gálatas',           abbrev: 'Gl',   chapters: 6,   testament: 'nt' },
  { id: 'ephesians',       name: 'Efésios',           abbrev: 'Ef',   chapters: 6,   testament: 'nt' },
  { id: 'philippians',     name: 'Filipenses',        abbrev: 'Fp',   chapters: 4,   testament: 'nt' },
  { id: 'colossians',      name: 'Colossenses',       abbrev: 'Cl',   chapters: 4,   testament: 'nt' },
  { id: '1+thessalonians', name: '1 Tessalonicenses', abbrev: '1Ts',  chapters: 5,   testament: 'nt' },
  { id: '2+thessalonians', name: '2 Tessalonicenses', abbrev: '2Ts',  chapters: 3,   testament: 'nt' },
  { id: '1+timothy',       name: '1 Timóteo',         abbrev: '1Tm',  chapters: 6,   testament: 'nt' },
  { id: '2+timothy',       name: '2 Timóteo',         abbrev: '2Tm',  chapters: 4,   testament: 'nt' },
  { id: 'titus',           name: 'Tito',              abbrev: 'Tt',   chapters: 3,   testament: 'nt' },
  { id: 'philemon',        name: 'Filemon',           abbrev: 'Fm',   chapters: 1,   testament: 'nt' },
  { id: 'hebrews',         name: 'Hebreus',           abbrev: 'Hb',   chapters: 13,  testament: 'nt' },
  { id: 'james',           name: 'Tiago',             abbrev: 'Tg',   chapters: 5,   testament: 'nt' },
  { id: '1+peter',         name: '1 Pedro',           abbrev: '1Pe',  chapters: 5,   testament: 'nt' },
  { id: '2+peter',         name: '2 Pedro',           abbrev: '2Pe',  chapters: 3,   testament: 'nt' },
  { id: '1+john',          name: '1 João',            abbrev: '1Jo',  chapters: 5,   testament: 'nt' },
  { id: '2+john',          name: '2 João',            abbrev: '2Jo',  chapters: 1,   testament: 'nt' },
  { id: '3+john',          name: '3 João',            abbrev: '3Jo',  chapters: 1,   testament: 'nt' },
  { id: 'jude',            name: 'Judas',             abbrev: 'Jd',   chapters: 1,   testament: 'nt' },
  { id: 'revelation',      name: 'Apocalipse',        abbrev: 'Ap',   chapters: 22,  testament: 'nt' },
];

export const ALL_BOOKS: BibleBook[] = [...OLD_TESTAMENT, ...NEW_TESTAMENT];

// ─── Salmo 91 embutido (João Ferreira de Almeida — domínio público) ──────────

export const PSALM_91_VERSES: { verse: number; text: string }[] = [
  { verse: 1,  text: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.' },
  { verse: 2,  text: 'Direi ao Senhor: Esperança minha e fortaleza minha; meu Deus, em quem confio.' },
  { verse: 3,  text: 'Porque ele te livrará do laço do passarinheiro, e da peste perniciosa.' },
  { verse: 4,  text: 'Ele te cobrirá com as suas penas, e debaixo das suas asas te abrigarás; a sua verdade será o teu escudo e broquel.' },
  { verse: 5,  text: 'Não te espantarás do terror noturno, nem da seta que voa de dia;' },
  { verse: 6,  text: 'Nem da peste que anda nas trevas, nem da destruição que assola ao meio-dia.' },
  { verse: 7,  text: 'Mil cairão ao teu lado, e dez mil à tua direita, mas não chegará a ti.' },
  { verse: 8,  text: 'Somente com os teus olhos contemplarás, e verás a recompensa dos ímpios.' },
  { verse: 9,  text: 'Porque tu disseste: O Senhor é a minha esperança; o Altíssimo fizeste a tua habitação.' },
  { verse: 10, text: 'Nenhum mal te sucederá, nem praga alguma chegará à tua tenda.' },
  { verse: 11, text: 'Porque aos seus anjos dará ordem a teu respeito, para te guardarem em todos os teus caminhos.' },
  { verse: 12, text: 'Eles te sustentarão nas suas mãos, para que não tropeces com o teu pé em alguma pedra.' },
  { verse: 13, text: 'Pisarás o leão e a áspide; calcarás aos pés o leãozinho e o dragão.' },
  { verse: 14, text: 'Pois que me amou, eu o livrarei; pô-lo-ei em segurança, porque conheceu o meu nome.' },
  { verse: 15, text: 'Quando me invocar, eu o atenderei; na angústia estarei com ele; livrá-lo-ei, e o glorificarei.' },
  { verse: 16, text: 'Saciá-lo-ei de longos dias, e mostrar-lhe-ei a minha salvação.' },
];
