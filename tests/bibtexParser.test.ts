import { describe, it, expect } from "vitest";
import { unescapeLatex } from "../src/core/latexUnescape";
import { parseBibtex, ParsedBibEntry } from "../src/core/bibtexParser";

describe("LaTeX Diacritic Unescaping", () => {
  it("unescapes umlauts / diaeresis (\\\"a, \\\"{a}, \\\"A, etc.)", () => {
    expect(unescapeLatex('Schr\\"oder')).toBe("Schröder");
    expect(unescapeLatex('M\\"{u}ller')).toBe("Müller");
    expect(unescapeLatex('J\\"{a}ger')).toBe("Jäger");
    expect(unescapeLatex('\\"a')).toBe("ä");
    expect(unescapeLatex('\\"{a}')).toBe("ä");
    expect(unescapeLatex('{\\"a}')).toBe("ä");
    expect(unescapeLatex('{\\"{a}}')).toBe("ä");
    expect(unescapeLatex('\\"A')).toBe("Ä");
    expect(unescapeLatex('\\"{A}')).toBe("Ä");
    expect(unescapeLatex('na\\"{i}ve')).toBe("naïve");
    expect(unescapeLatex('citro\\"{e}n')).toBe("citroën");
  });

  it("unescapes acute accents (\\'e, \\'{e}, \\'a, etc.)", () => {
    expect(unescapeLatex("Ren\\'e")).toBe("René");
    expect(unescapeLatex("Ren\\'{e}")).toBe("René");
    expect(unescapeLatex("Jos\\'{e}")).toBe("José");
    expect(unescapeLatex("Garcia M\\'{a}rquez")).toBe("Garcia Márquez");
    expect(unescapeLatex("Hern\\'{a}n")).toBe("Hernán");
    expect(unescapeLatex("\\'e")).toBe("é");
    expect(unescapeLatex("\\'{e}")).toBe("é");
    expect(unescapeLatex("{\\'e}")).toBe("é");
    expect(unescapeLatex("{\\'{e}}")).toBe("é");
    expect(unescapeLatex("\\'E")).toBe("É");
  });

  it("unescapes grave accents (\\`{a}, \\`a, etc.)", () => {
    expect(unescapeLatex("\\`{a}")).toBe("à");
    expect(unescapeLatex("\\`a")).toBe("à");
    expect(unescapeLatex("vis-\\`{a}-vis")).toBe("vis-à-vis");
    expect(unescapeLatex("Moli\\`{e}re")).toBe("Molière");
    expect(unescapeLatex("{\\`{a}}")).toBe("à");
  });

  it("unescapes tildes (\\~{a}, \\~a, \\~{n}, etc.)", () => {
    expect(unescapeLatex("\\~{a}")).toBe("ã");
    expect(unescapeLatex("\\~a")).toBe("ã");
    expect(unescapeLatex("S\\~{a}o Paulo")).toBe("São Paulo");
    expect(unescapeLatex("Pe\\~{n}a")).toBe("Peña");
    expect(unescapeLatex("Pi\\~nero")).toBe("Piñero");
    expect(unescapeLatex("Cam\\~{o}es")).toBe("Camões");
    expect(unescapeLatex("\\~{A}")).toBe("Ã");
  });

  it("unescapes circumflex (\\^{o}, \\^o, etc.)", () => {
    expect(unescapeLatex("\\^{o}")).toBe("ô");
    expect(unescapeLatex("\\^o")).toBe("ô");
    expect(unescapeLatex("r\\^{o}le")).toBe("rôle");
    expect(unescapeLatex("ch\\^{a}teau")).toBe("château");
    expect(unescapeLatex("f\\^{e}te")).toBe("fête");
    expect(unescapeLatex("{\\^{o}}")).toBe("ô");
  });

  it("unescapes cedillas (\\c{c}, \\c c, etc.)", () => {
    expect(unescapeLatex("\\c{c}")).toBe("ç");
    expect(unescapeLatex("\\c c")).toBe("ç");
    expect(unescapeLatex("Fran\\c{c}ois")).toBe("François");
    expect(unescapeLatex("Fran\\c cois")).toBe("François");
    expect(unescapeLatex("{\\c{c}}")).toBe("ç");
    expect(unescapeLatex("{\\c c}")).toBe("ç");
    expect(unescapeLatex("\\c{C}")).toBe("Ç");
    expect(unescapeLatex("Bar\\c{s}")).toBe("Barş");
  });

  it("unescapes ring above (\\r{a}, \\r a, \\r{A})", () => {
    expect(unescapeLatex("\\r{a}")).toBe("å");
    expect(unescapeLatex("\\r a")).toBe("å");
    expect(unescapeLatex("\\r{A}")).toBe("Å");
    expect(unescapeLatex("{\\r{a}}")).toBe("å");
    expect(unescapeLatex("{\\r a}")).toBe("å");
    expect(unescapeLatex("Angstr\\r{o}m")).toBe("Angström".replace("ö", "o\u030A").normalize("NFC"));
  });

  it("unescapes Hungarian double acute (\\H{o}, \\H o, \\H{O})", () => {
    expect(unescapeLatex("\\H{o}")).toBe("ő");
    expect(unescapeLatex("\\H o")).toBe("ő");
    expect(unescapeLatex("\\H{O}")).toBe("Ő");
    expect(unescapeLatex("Erd\\H{o}s")).toBe("Erdős");
    expect(unescapeLatex("{\\H{o}}")).toBe("ő");
    expect(unescapeLatex("\\H{u}")).toBe("ű");
  });

  it("unescapes caron / háček (\\v{s}, \\v s, \\v{S}, etc.)", () => {
    expect(unescapeLatex("\\v{s}")).toBe("š");
    expect(unescapeLatex("\\v s")).toBe("š");
    expect(unescapeLatex("\\v{S}")).toBe("Š");
    expect(unescapeLatex("{\\v{s}}")).toBe("š");
    expect(unescapeLatex("{\\v s}")).toBe("š");
    expect(unescapeLatex("\\v{c}")).toBe("č");
    expect(unescapeLatex("\\v{z}")).toBe("ž");
    expect(unescapeLatex("Dvo\\v{r}\\'{a}k")).toBe("Dvořák");
  });

  it("unescapes breve (\\u{g}, \\u g, \\u{G})", () => {
    expect(unescapeLatex("\\u{g}")).toBe("ğ");
    expect(unescapeLatex("\\u g")).toBe("ğ");
    expect(unescapeLatex("\\u{G}")).toBe("Ğ");
    expect(unescapeLatex("Erdo\\u{g}an")).toBe("Erdoğan");
    expect(unescapeLatex("{\\u{g}}")).toBe("ğ");
  });

  it("unescapes special letters (\\l{}, \\o{}, \\ae{}, \\oe{}, \\aa{}, \\ss{})", () => {
    expect(unescapeLatex("\\l{}")).toBe("ł");
    expect(unescapeLatex("{\\l}")).toBe("ł");
    expect(unescapeLatex("\\L{}")).toBe("Ł");
    expect(unescapeLatex("{\\L}")).toBe("Ł");
    expect(unescapeLatex("Wa\\l{}esa")).toBe("Wałesa");
    expect(unescapeLatex("\\o{}")).toBe("ø");
    expect(unescapeLatex("{\\o}")).toBe("ø");
    expect(unescapeLatex("\\O{}")).toBe("Ø");
    expect(unescapeLatex("S\\o{}rensen")).toBe("Sørensen");
    expect(unescapeLatex("S{\\o}rensen")).toBe("Sørensen");
    expect(unescapeLatex("\\ae{}")).toBe("æ");
    expect(unescapeLatex("{\\ae}")).toBe("æ");
    expect(unescapeLatex("\\AE{}")).toBe("Æ");
    expect(unescapeLatex("\\oe{}")).toBe("œ");
    expect(unescapeLatex("{\\oe}")).toBe("œ");
    expect(unescapeLatex("\\OE{}")).toBe("Œ");
    expect(unescapeLatex("\\aa{}")).toBe("å");
    expect(unescapeLatex("{\\aa}")).toBe("å");
    expect(unescapeLatex("\\AA{}")).toBe("Å");
    expect(unescapeLatex("{\\AA}")).toBe("Å");
    expect(unescapeLatex("\\ss{}")).toBe("ß");
    expect(unescapeLatex("{\\ss}")).toBe("ß");
  });

  it("unescapes dotless i and j with accents", () => {
    expect(unescapeLatex("\\'{\\i}")).toBe("í");
    expect(unescapeLatex('\\"{\\i}')).toBe("ï");
    expect(unescapeLatex("\\i{}")).toBe("ı");
    expect(unescapeLatex("{\\i}")).toBe("ı");
  });

  it("unescapes dot above, macron, and dot below", () => {
    expect(unescapeLatex("\\.{z}")).toBe("ż");
    expect(unescapeLatex("\\.z")).toBe("ż");
    expect(unescapeLatex("\\={a}")).toBe("ā");
    expect(unescapeLatex("\\=a")).toBe("ā");
    expect(unescapeLatex("\\d{a}")).toBe("ạ");
    expect(unescapeLatex("\\d a")).toBe("ạ");
  });
});

describe("LaTeX Special Characters and Formatting", () => {
  it("unescapes special symbols (\\&, \\%, \\$, \\_, \\#)", () => {
    expect(unescapeLatex("AT\\&T")).toBe("AT&T");
    expect(unescapeLatex("100\\% Sure")).toBe("100% Sure");
    expect(unescapeLatex("\\$500 Prize")).toBe("$500 Prize");
    expect(unescapeLatex("user\\_name")).toBe("user_name");
    expect(unescapeLatex("Issue \\#42")).toBe("Issue #42");
  });

  it("unescapes dashes (\\textendash/--, \\textemdash/---)", () => {
    expect(unescapeLatex("pages 10--20")).toBe("pages 10–20");
    expect(unescapeLatex("pages 10\\textendash 20")).toBe("pages 10–20");
    expect(unescapeLatex("pages 10\\textendash{}20")).toBe("pages 10–20");
    expect(unescapeLatex("thought---then spoken")).toBe("thought—then spoken");
    expect(unescapeLatex("thought\\textemdash then spoken")).toBe("thought—then spoken");
    expect(unescapeLatex("thought\\textemdash{}then spoken")).toBe("thought—then spoken");
  });

  it("unescapes backslash (\\textbackslash)", () => {
    expect(unescapeLatex("path\\textbackslash to\\textbackslash file")).toBe("path\\to\\file");
    expect(unescapeLatex("C:\\textbackslash Windows")).toBe("C:\\Windows");
  });

  it("unescapes LaTeX quotes (`` and '')", () => {
    expect(unescapeLatex("``Deep Learning''")).toBe('"Deep Learning"');
  });

  it("unwraps formatting tags (\\emph, \\textit, \\textbf, \\textsc)", () => {
    expect(unescapeLatex("\\emph{Machine Learning}")).toBe("Machine Learning");
    expect(unescapeLatex("\\textit{Science}")).toBe("Science");
    expect(unescapeLatex("\\textbf{Important}")).toBe("Important");
    expect(unescapeLatex("\\textsc{Nasa}")).toBe("Nasa");
    expect(unescapeLatex("{\\em Artificial Intelligence}")).toBe("Artificial Intelligence");
  });
});

describe("Semantic Protection Brace Stripping", () => {
  it("strips single protection braces around acronyms and words", () => {
    expect(unescapeLatex("{NASA}")).toBe("NASA");
    expect(unescapeLatex("The {Hubble} Space Telescope")).toBe("The Hubble Space Telescope");
    expect(unescapeLatex("{COVID}-19 pandemic")).toBe("COVID-19 pandemic");
  });

  it("strips double protection braces ({{Deep Learning}} -> Deep Learning)", () => {
    expect(unescapeLatex("{{Deep Learning}}")).toBe("Deep Learning");
    expect(unescapeLatex("{{{Triple Wrapped}}}")).toBe("Triple Wrapped");
    expect(unescapeLatex("{{IEEE} Transactions on {AI}}")).toBe("IEEE Transactions on AI");
  });

  it("strips multiple disjoint protected phrases in a title", () => {
    const raw = "Applying {BERT} and {GPT-4} to {SLR} Bibliometrics";
    expect(unescapeLatex(raw)).toBe("Applying BERT and GPT-4 to SLR Bibliometrics");
  });

  it("preserves literal escaped braces (\\{ and \\})", () => {
    expect(unescapeLatex("Set \\{x, y\\}")).toBe("Set {x, y}");
  });

  it("normalizes multi-line whitespace and line breaks", () => {
    const raw = "A title that spans\n  multiple lines with\n  extra   spaces";
    expect(unescapeLatex(raw)).toBe("A title that spans multiple lines with extra spaces");
  });
});

describe("BibTeX Entry Parsing", () => {
  it("parses standard entry types (@article, @inproceedings, @book, @phdthesis, @misc)", () => {
    const bib = `
      @article{einstein1905,
        author = {Albert Einstein},
        title = {Zur Elektrodynamik bewegter K{\\"o}rper},
        journal = {Annalen der Physik},
        year = {1905},
        volume = {17},
        pages = {891--921}
      }

      @book{knuth1984,
        author = {Donald E. Knuth},
        title = {The {\\TeX}book},
        publisher = {Addison-Wesley},
        year = {1984}
      }
    `;

    const entries = parseBibtex(bib);
    expect(entries).toHaveLength(2);

    expect(entries[0].entryType).toBe("article");
    expect(entries[0].citationKey).toBe("einstein1905");
    expect(entries[0].fields.author).toBe("Albert Einstein");
    expect(entries[0].fields.year).toBe("1905");
    expect(entries[0].fields.volume).toBe("17");
    expect(entries[0].fields.pages).toBe("891--921");

    expect(entries[1].entryType).toBe("book");
    expect(entries[1].citationKey).toBe("knuth1984");
    expect(entries[1].fields.author).toBe("Donald E. Knuth");
    expect(entries[1].fields.publisher).toBe("Addison-Wesley");
    expect(entries[1].fields.year).toBe("1984");
  });

  it("normalizes entry types to lowercase regardless of original casing", () => {
    const bib = `
      @ARTICLE{key1, title = {First}}
      @InProceedings{key2, title = {Second}}
      @MISC{key3, title = {Third}}
    `;
    const entries = parseBibtex(bib);
    expect(entries[0].entryType).toBe("article");
    expect(entries[1].entryType).toBe("inproceedings");
    expect(entries[2].entryType).toBe("misc");
  });

  it("handles values in braces {value} and quotes \"value\"", () => {
    const bib = `
      @article{mixedquotes,
        title = "A Title in Double Quotes",
        journal = {A Journal in Curly Braces},
        author = "Author One and Author Two",
        note = {Note with "internal quotes" preserved}
      }
    `;
    const [entry] = parseBibtex(bib);
    expect(entry.fields.title).toBe("A Title in Double Quotes");
    expect(entry.fields.journal).toBe("A Journal in Curly Braces");
    expect(entry.fields.author).toBe("Author One and Author Two");
    expect(entry.fields.note).toBe('Note with "internal quotes" preserved');
  });

  it("parses bare numbers and unquoted tokens", () => {
    const bib = `
      @article{barevalues,
        title = {Bare Value Test},
        year = 2024,
        volume = 12,
        number = 4
      }
    `;
    const [entry] = parseBibtex(bib);
    expect(entry.fields.year).toBe("2024");
    expect(entry.fields.volume).toBe("12");
    expect(entry.fields.number).toBe("4");
  });

  it("parses multi-line fields with internal indentation", () => {
    const bib = `
      @article{multiline,
        title = {Deep Learning for Systematic
                 Literature Reviews: A Comprehensive
                 Survey of Recent Advances},
        abstract = {Systematic literature reviews are essential for synthesizing
                    knowledge across disciplines. In this survey, we review
                    novel deep learning architectures applied to bibliometrics.}
      }
    `;
    const [entry] = parseBibtex(bib);
    expect(entry.fields.title).toBe(
      "Deep Learning for Systematic Literature Reviews: A Comprehensive Survey of Recent Advances"
    );
    expect(entry.fields.abstract).toBe(
      "Systematic literature reviews are essential for synthesizing knowledge across disciplines. In this survey, we review novel deep learning architectures applied to bibliometrics."
    );
  });

  it("handles concatenated field values with # operator", () => {
    const bib = `
      @article{concat,
        author = "John Doe" # " and " # "Jane Smith",
        title = "Part 1: " # "{Introduction to AI}",
        pages = "100" # "--" # "120"
      }
    `;
    const [entry] = parseBibtex(bib);
    expect(entry.fields.author).toBe("John Doe and Jane Smith");
    expect(entry.fields.title).toBe("Part 1: {Introduction to AI}");
    expect(entry.fields.pages).toBe("100--120");
  });

  it("extracts all standard and custom fields preserving 100% of metadata", () => {
    const bib = `
      @article{fullmetadata,
        title = {Comprehensive Study},
        author = {Smith, John and Doe, Jane},
        year = {2023},
        journal = {Journal of Data Science},
        doi = {10.1016/j.jds.2023.01.001},
        abstract = {Detailed abstract here.},
        keywords = {bibliometrics, machine learning, deduplication},
        publisher = {Elsevier},
        eprint = {2301.12345},
        archiveprefix = {arXiv},
        primaryclass = {cs.DL},
        custom_department = {Computer Science},
        x_custom_flag = {Validated}
      }
    `;
    const [entry] = parseBibtex(bib);
    expect(entry.fields.title).toBe("Comprehensive Study");
    expect(entry.fields.author).toBe("Smith, John and Doe, Jane");
    expect(entry.fields.year).toBe("2023");
    expect(entry.fields.journal).toBe("Journal of Data Science");
    expect(entry.fields.doi).toBe("10.1016/j.jds.2023.01.001");
    expect(entry.fields.abstract).toBe("Detailed abstract here.");
    expect(entry.fields.keywords).toBe("bibliometrics, machine learning, deduplication");
    expect(entry.fields.publisher).toBe("Elsevier");
    expect(entry.fields.eprint).toBe("2301.12345");
    expect(entry.fields.archiveprefix).toBe("arXiv");
    expect(entry.fields.primaryclass).toBe("cs.DL");
    expect(entry.fields.custom_department).toBe("Computer Science");
    expect(entry.fields.x_custom_flag).toBe("Validated");
  });

  it("handles trailing commas gracefully", () => {
    const bib = `
      @article{trailingcomma,
        title = {Trailing Comma Entry},
        year = {2024},
      }
    `;
    const [entry] = parseBibtex(bib);
    expect(entry.citationKey).toBe("trailingcomma");
    expect(entry.fields.title).toBe("Trailing Comma Entry");
    expect(entry.fields.year).toBe("2024");
  });

  it("ignores @comment and outside comments and handles @string macros", () => {
    const bib = `
      % This is a top-level LaTeX comment
      This is non-BibTeX text that should be ignored as comment.

      @string{jnl_ds = "Journal of Data Science"}
      @string{springer = "Springer Nature"}

      @comment{This is a BibTeX comment entry that should be ignored}

      @article{key_with_macro,
        title = {Macro Expansion Test},
        journal = jnl_ds,
        publisher = springer,
        year = {2022}
      }
    `;
    const entries = parseBibtex(bib);
    expect(entries).toHaveLength(1);
    expect(entries[0].citationKey).toBe("key_with_macro");
    expect(entries[0].fields.journal).toBe("Journal of Data Science");
    expect(entries[0].fields.publisher).toBe("Springer Nature");
    expect(entries[0].fields.year).toBe("2022");
  });

  it("handles parentheses as entry delimiters @article(key, ...)", () => {
    const bib = `
      @article(paren_key,
        title = {Entry Delimited by Parentheses},
        year = {2021}
      )
    `;
    const entries = parseBibtex(bib);
    expect(entries).toHaveLength(1);
    expect(entries[0].citationKey).toBe("paren_key");
    expect(entries[0].fields.title).toBe("Entry Delimited by Parentheses");
    expect(entries[0].fields.year).toBe("2021");
  });

  it("returns an empty array for empty or comment-only strings", () => {
    expect(parseBibtex("")).toEqual([]);
    expect(parseBibtex("   \n\t  ")).toEqual([]);
    expect(parseBibtex("% Only comments here\n% Nothing else")).toEqual([]);
    expect(parseBibtex("@comment{nothing to see here}")).toEqual([]);
  });
});

describe("Integration: unescapeLatex and parseBibtex", () => {
  it("seamlessly parses and unescapes complex real-world BibTeX entries", () => {
    const bib = `
      @article{muller2024slr,
        author = {M{\\"u}ller, J{\\"o}rg and Schr{\\'e}der, Ren{\\'e} and {NASA} Deep Space Team},
        title = {An Overview of {AI} for {SLR}: \\emph{Past}, {\\c{C}}urrent \\& Future \\textendash{} 2024},
        journal = {IEEE Transactions on {AI} \\& Bibliometrics},
        year = {2024},
        volume = {12},
        pages = {100--115},
        doi = {10.1109/TAIB.2024.1234567},
        abstract = {In this paper, we explore {NLP} applications in SLR. We achieve a 99\\% accuracy on benchmark \\#1.}
      }
    `;

    const entries = parseBibtex(bib);
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.entryType).toBe("article");
    expect(entry.citationKey).toBe("muller2024slr");

    // Check raw parsed values maintain braces and LaTeX
    expect(entry.fields.author).toContain('M{\\"u}ller');
    expect(entry.fields.title).toContain('{AI}');

    // Apply unescapeLatex and check clean human-readable UTF-8
    const cleanAuthor = unescapeLatex(entry.fields.author);
    expect(cleanAuthor).toBe("Müller, Jörg and Schréder, René and NASA Deep Space Team");

    const cleanTitle = unescapeLatex(entry.fields.title);
    expect(cleanTitle).toBe("An Overview of AI for SLR: Past, Çurrent & Future – 2024");

    const cleanJournal = unescapeLatex(entry.fields.journal);
    expect(cleanJournal).toBe("IEEE Transactions on AI & Bibliometrics");

    const cleanPages = unescapeLatex(entry.fields.pages);
    expect(cleanPages).toBe("100–115");

    const cleanAbstract = unescapeLatex(entry.fields.abstract);
    expect(cleanAbstract).toBe("In this paper, we explore NLP applications in SLR. We achieve a 99% accuracy on benchmark #1.");
  });

  it("supports unescape option in parseBibtex if requested", () => {
    const bib = `
      @article{auto_unescape,
        author = {Schr{\\"o}der, Ren{\\'e}},
        title = {{AI} \\& {NASA} Advances},
        pages = {1--10}
      }
    `;
    const entries = parseBibtex(bib, { unescape: true });
    expect(entries).toHaveLength(1);
    expect(entries[0].fields.author).toBe("Schröder, René");
    expect(entries[0].fields.title).toBe("AI & NASA Advances");
    expect(entries[0].fields.pages).toBe("1–10");
  });
});
