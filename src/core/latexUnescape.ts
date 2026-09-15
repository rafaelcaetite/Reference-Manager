/**
 * High-performance, zero-dependency LaTeX character and diacritic unescaper.
 * Decodes LaTeX accents, special symbols, dashes, quotes, and strips semantic
 * protection braces into standard UTF-8 text.
 */

const DIACRITIC_MAP: Record<string, Record<string, string>> = {
  '"': {
    a: "ä", e: "ë", i: "ï", o: "ö", u: "ü", y: "ÿ",
    A: "Ä", E: "Ë", I: "Ï", O: "Ö", U: "Ü", Y: "Ÿ",
  },
  "'": {
    a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý",
    c: "ć", n: "ń", r: "ŕ", s: "ś", z: "ź", l: "ĺ",
    A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", Y: "Ý",
    C: "Ć", N: "Ń", R: "Ŕ", S: "Ś", Z: "Ź", L: "Ĺ",
  },
  "`": {
    a: "à", e: "è", i: "ì", o: "ò", u: "ù",
    A: "À", E: "È", I: "Ì", O: "Ò", U: "Ù",
  },
  "^": {
    a: "â", e: "ê", i: "î", o: "ô", u: "û",
    c: "ĉ", g: "ĝ", h: "ĥ", j: "ĵ", s: "ŝ", w: "ŵ", y: "ŷ",
    A: "Â", E: "Ê", I: "Î", O: "Ô", U: "Û",
    C: "Ĉ", G: "Ĝ", H: "Ĥ", J: "Ĵ", S: "Ŝ", W: "Ŵ", Y: "Ŷ",
  },
  "~": {
    a: "ã", e: "ẽ", i: "ĩ", o: "õ", u: "ũ", n: "ñ",
    A: "Ã", E: "Ẽ", I: "Ĩ", O: "Õ", U: "Ũ", N: "Ñ",
  },
  c: {
    c: "ç", C: "Ç", s: "ş", S: "Ş", t: "ţ", T: "Ţ",
    k: "ķ", K: "Ķ", l: "ļ", L: "Ļ", n: "ņ", N: "Ņ",
    r: "ŗ", R: "Ŗ", g: "ģ", G: "Ģ",
  },
  k: {
    a: "ą", A: "Ą", e: "ę", E: "Ę", i: "į", I: "Į", u: "ų", U: "Ų",
  },
  r: {
    a: "å", A: "Å", u: "ů", U: "Ů", o: "o\u030A",
  },
  H: {
    o: "ő", O: "Ő", u: "ű", U: "Ű",
  },
  v: {
    c: "č", C: "Č", d: "ď", D: "Ď", e: "ě", E: "Ě",
    l: "ľ", L: "Ľ", n: "ň", N: "Ň", r: "ř", R: "Ř",
    s: "š", S: "Š", t: "ť", T: "Ť", z: "ž", Z: "Ž",
  },
  u: {
    a: "ă", A: "Ă", e: "ĕ", E: "Ĕ", g: "ğ", G: "Ğ",
    i: "ĭ", I: "Ĭ", o: "ŏ", O: "Ŏ", u: "ŭ", U: "Ŭ",
  },
  ".": {
    z: "ż", Z: "Ż", c: "ċ", C: "Ċ", e: "ė", E: "Ė",
    g: "ġ", G: "Ġ", I: "İ",
  },
  "=": {
    a: "ā", A: "Ā", e: "ē", E: "Ē", i: "ī", I: "Ī",
    o: "ō", O: "Ō", u: "ū", U: "Ū",
  },
  d: {
    a: "ạ", A: "Ạ", d: "ḍ", D: "Ḍ", h: "ḥ", H: "Ḥ",
    k: "ḳ", K: "Ḳ", l: "ḷ", L: "Ḷ", m: "ṃ", M: "Ṃ",
    n: "ṇ", N: "Ṇ", r: "ṛ", R: "Ṛ", s: "ṣ", S: "Ṣ",
    t: "ṭ", T: "Ṭ", u: "ụ", U: "Ụ", w: "ẉ", W: "Ẉ",
    z: "ẓ", Z: "Ẓ",
  },
  b: {
    b: "ḇ", B: "Ḇ", d: "ḏ", D: "Ḏ", h: "ẖ", k: "ḵ",
    K: "Ḵ", l: "ḻ", L: "Ḻ", m: "ṟ", t: "ṯ", T: "Ṯ",
    z: "ẕ", Z: "Ẕ",
  },
};

const COMBINING_MAP: Record<string, string> = {
  '"': "\u0308",
  "'": "\u0301",
  "`": "\u0300",
  "^": "\u0302",
  "~": "\u0303",
  c: "\u0327",
  k: "\u0328",
  r: "\u030A",
  H: "\u030B",
  v: "\u030C",
  u: "\u0306",
  ".": "\u0307",
  "=": "\u0304",
  d: "\u0323",
  b: "\u0331",
};

const SPECIAL_LETTERS: Record<string, string> = {
  ae: "æ",
  AE: "Æ",
  oe: "œ",
  OE: "Œ",
  aa: "å",
  AA: "Å",
  ss: "ß",
  SS: "SS",
  o: "ø",
  O: "Ø",
  l: "ł",
  L: "Ł",
  i: "ı",
  j: "ȷ",
  th: "þ",
  TH: "Þ",
  dh: "ð",
  DH: "Ð",
  ng: "ŋ",
  NG: "Ŋ",
};

function resolveAccent(cmd: string, rawChar: string): string {
  let char = rawChar.trim();
  if (char === "\\i" || char === "{\\i}" || char === "i") {
    char = "i";
  } else if (char === "\\j" || char === "{\\j}" || char === "j") {
    char = "j";
  }

  const lookup = DIACRITIC_MAP[cmd]?.[char];
  if (lookup) {
    return lookup;
  }

  const combining = COMBINING_MAP[cmd];
  if (combining) {
    return (char + combining).normalize("NFC");
  }

  return char;
}

/**
 * Decodes LaTeX commands, diacritics, special symbols, and semantic protection
 * braces into standard human-readable UTF-8 strings.
 */
export function unescapeLatex(text: string): string {
  if (!text) return "";

  let s = text.replace(/\r?\n/g, " ");

  // Protect escaped backslash and braces with private Unicode placeholders
  s = s.replace(/\\textbackslash(?:\s*\{\}|\s+|\b)/g, "\uE002");
  s = s.replace(/\\\{/g, "\uE000");
  s = s.replace(/\\\}/g, "\uE001");

  // LaTeX macro names
  s = s.replace(/\\(La)?TeX\b/g, "$1TeX");

  // Unwrap formatting commands: \emph{...}, \textit{...}, etc.
  let prevUnwrap = "";
  while (prevUnwrap !== s) {
    prevUnwrap = s;
    s = s.replace(
      /\\(?:textbf|textit|emph|textsl|textsc|texttt|textrm|textsf|underline|url)\{([^{}]*)\}/g,
      "$1"
    );
  }
  s = s.replace(/\\(?:em|it|bf|rm|sf|tt|sl|sc)\s+/g, "");

  // Dashes: \textemdash / --- -> —, \textendash / -- -> –
  s = s.replace(/\\textemdash(?:\s*\{\}|\s+|\b)|---/g, "—");
  s = s.replace(/\\textendash(?:\s*\{\}|\s+|\b)|--/g, "–");

  // Quotes: `` and '' -> ", LaTeX quote macros
  s = s.replace(/``|''/g, '"');
  s = s.replace(/\\textquotedbl(?:left|right)?(?:\s*\{\}|\b)/g, '"');
  s = s.replace(/\\textquote(?:left|right)(?:\s*\{\}|\b)/g, "'");

  // Special characters: \&, \%, \$, \_, \#
  s = s.replace(/\\([&%$#_])/g, "$1");
  s = s.replace(/\\textasciitilde(?:\s*\{\}|\b)/g, "~");
  s = s.replace(/\\textasciicircum(?:\s*\{\}|\b)/g, "^");
  s = s.replace(/\\textless(?:\s*\{\}|\b)/g, "<");
  s = s.replace(/\\textgreater(?:\s*\{\}|\b)/g, ">");

  // Symbol accents: \"a, \"{a}, {\"a}, {\"{a}}, \'e, \`a, \^o, \~a, \.z, \=a
  s = s.replace(
    /\{?\\(["'\`^~.=])\s*(?:\{([a-zA-Z\\]+)\}|([a-zA-Z]))\}?/g,
    (_match, cmd, bracedChar, bareChar) => {
      const char = bracedChar ?? bareChar;
      return resolveAccent(cmd, char);
    }
  );

  // Letter accents: \c{c}, \c c, \v{s}, \v s, \H{o}, \H o, \u{g}, \u g, \r{a}, \r a, \k{a}, \d{a}, \b{a}
  s = s.replace(
    /\{?\\([ckrHvudb])(?:\{([a-zA-Z\\]+)\}|\s+([a-zA-Z]))\}?/g,
    (_match, cmd, bracedChar, spaceChar) => {
      const char = bracedChar ?? spaceChar;
      return resolveAccent(cmd, char);
    }
  );

  // Tie accent \t{oo} -> o͡o
  s = s.replace(
    /\{?\\t\{([a-zA-Z]{2})\}\}?/g,
    (_match, pair: string) => pair[0] + "\u0361" + pair[1]
  );

  // Special standalone letters: \l{}, \o{}, \ae{}, \oe{}, \aa{}, \ss{}, \i{}, etc.
  s = s.replace(
    /\{?\\(ae|AE|oe|OE|aa|AA|ss|SS|o|O|l|L|i|j|th|TH|dh|DH|ng|NG)(?:\{\}|(?=[^a-zA-Z]))\}?/g,
    (_match, code: string) => SPECIAL_LETTERS[code] ?? _match
  );

  // Strip semantic protection braces: {NASA} -> NASA, {{Deep Learning}} -> Deep Learning
  let prevBraces = "";
  while (prevBraces !== s) {
    prevBraces = s;
    s = s.replace(/\{([^{}]*)\}/g, "$1");
  }

  // Restore protected literal braces and backslashes
  s = s.replace(/\uE000/g, "{");
  s = s.replace(/\uE001/g, "}");
  s = s.replace(/\uE002/g, "\\");

  // Normalize multi-line whitespace and trim
  return s.replace(/\s+/g, " ").trim();
}
