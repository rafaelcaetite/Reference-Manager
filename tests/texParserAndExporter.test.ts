import { describe, it, expect } from "vitest";
import { parseTex, ParsedBibEntry } from "../src/core/texParser";
import { exportToBibtex } from "../src/core/bibtexExporter";

describe("TeX Parser (parseTex)", () => {
  describe("Embedded BibTeX Detection and Parsing", () => {
    it("extracts @article and @inproceedings entries from a TeX document", () => {
      const tex = `
\\documentclass{article}
\\begin{document}
\\title{Sample Paper}
\\maketitle

Some text citing \\cite{vaswani2017attention} and \\cite{devlin2019bert}.

\\begin{filecontents*}{\\jobname.bib}
@article{vaswani2017attention,
  author    = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  title     = {Attention is All You Need},
  journal   = {Advances in Neural Information Processing Systems},
  year      = {2017},
  volume    = {30},
  doi       = {10.5555/3295222.3295349}
}

@inproceedings{devlin2019bert,
  title     = {BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding},
  author    = {Devlin, Jacob and Chang, Ming-Wei and Lee, Kenton and Toutanova, Kristina},
  booktitle = {Proceedings of NAACL-HLT},
  year      = {2019},
  pages     = {4171--4186},
  doi       = {10.18653/v1/N19-1423}
}
\\end{filecontents*}

\\end{document}
`;

      const entries: ParsedBibEntry[] = parseTex(tex);

      expect(entries).toHaveLength(2);

      const article = entries.find((e) => e.citationKey === "vaswani2017attention");
      expect(article).toBeDefined();
      expect(article?.entryType).toBe("article");
      expect(article?.fields.title).toBe("Attention is All You Need");
      expect(article?.fields.author).toBe("Vaswani, Ashish and Shazeer, Noam and Parmar, Niki");
      expect(article?.fields.year).toBe("2017");
      expect(article?.fields.journal).toBe("Advances in Neural Information Processing Systems");
      expect(article?.fields.volume).toBe("30");
      expect(article?.fields.doi).toBe("10.5555/3295222.3295349");

      const inproc = entries.find((e) => e.citationKey === "devlin2019bert");
      expect(inproc).toBeDefined();
      expect(inproc?.entryType).toBe("inproceedings");
      expect(inproc?.fields.title).toBe(
        "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
      );
      expect(inproc?.fields.booktitle).toBe("Proceedings of NAACL-HLT");
      expect(inproc?.fields.year).toBe("2019");
      expect(inproc?.fields.pages).toBe("4171–4186");
      expect(inproc?.fields.doi).toBe("10.18653/v1/N19-1423");
    });

    it("handles nested braces and quotes in BibTeX fields within TeX", () => {
      const tex = `
@article{smith2021quantum,
  author = {{Smith}, John and {Quantum Working Group}},
  title = {A Study of {Quantum} Computing in {AI}},
  year = "2021",
  note = {Special issue on {QPU} & {FPGA}}
}
`;
      const entries = parseTex(tex);
      expect(entries).toHaveLength(1);
      expect(entries[0].citationKey).toBe("smith2021quantum");
      expect(entries[0].fields.title).toBe("A Study of Quantum Computing in AI");
      expect(entries[0].fields.year).toBe("2021");
      expect(entries[0].fields.author).toBe("Smith, John and Quantum Working Group");
      expect(entries[0].fields.note).toBe("Special issue on QPU & FPGA");
    });

    it("unescapes LaTeX diacritics in BibTeX fields", () => {
      const tex = `
@article{muller2022,
  author = {M{\\"u}ller, H{\\'e}ctor and Fran{\\c{c}}ois, Ren{\\'e}},
  title = {D{\\~a}o of Deep Learning \\& Machine Intelligence},
  year = {2022}
}
`;
      const entries = parseTex(tex);
      expect(entries).toHaveLength(1);
      expect(entries[0].fields.author).toBe("Müller, Héctor and François, René");
      expect(entries[0].fields.title).toBe("Dão of Deep Learning & Machine Intelligence");
    });
  });

  describe("thebibliography and bibitem Environment Parsing", () => {
    it("extracts citations from \\begin{thebibliography} environment with labeled and unlabeled \\bibitem", () => {
      const tex = `
\\begin{thebibliography}{99}
\\bibitem[Vaswani et al.(2017)]{vaswani2017}
Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017).
Attention is all you need. \\emph{Advances in Neural Information Processing Systems}, 30.
\\doi{10.5555/3295222.3295349}
\\url{https://arxiv.org/abs/1706.03762}

\\bibitem{devlin2019bert}
J. Devlin, M. Chang, K. Lee, and K. Toutanova, \`\`BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding,'' in \\textit{Proceedings of NAACL-HLT}, 2019, pp. 4171-4186. doi: 10.18653/v1/N19-1423.
\\end{thebibliography}
`;

      const entries = parseTex(tex);
      expect(entries).toHaveLength(2);

      // Entry 1: vaswani2017
      const e1 = entries.find((e) => e.citationKey === "vaswani2017");
      expect(e1).toBeDefined();
      expect(e1?.citationKey).toBe("vaswani2017");
      expect(e1?.fields.year).toBe("2017");
      expect(e1?.fields.title).toContain("Attention is all you need");
      expect(e1?.fields.author).toContain("Vaswani");
      expect(e1?.fields.journal).toBe("Advances in Neural Information Processing Systems");
      expect(e1?.fields.doi).toBe("10.5555/3295222.3295349");
      expect(e1?.fields.url).toBe("https://arxiv.org/abs/1706.03762");
      // Zero information lost: full raw text preserved
      expect(e1?.fields.raw_citation).toBeDefined();
      expect(e1?.fields.raw_citation).toContain("Vaswani, A.");
      expect(e1?.fields.raw_citation).toContain("\\doi{10.5555/3295222.3295349}");

      // Entry 2: devlin2019bert
      const e2 = entries.find((e) => e.citationKey === "devlin2019bert");
      expect(e2).toBeDefined();
      expect(e2?.citationKey).toBe("devlin2019bert");
      expect(e2?.fields.title).toBe(
        "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
      );
      expect(e2?.fields.year).toBe("2019");
      expect(e2?.fields.author).toContain("Devlin");
      expect(e2?.fields.booktitle).toBe("Proceedings of NAACL-HLT");
      expect(e2?.fields.doi).toBe("10.18653/v1/N19-1423");
      expect(e2?.fields.raw_citation).toContain("J. Devlin");
    });

    it("correctly preserves full raw citation text in raw_citation field", () => {
      const rawText = `Knuth, D. E. (1984). The TeXbook. Addison-Wesley, Reading, Massachusetts.`;
      const tex = `\\bibitem{knuth84} ${rawText}`;

      const entries = parseTex(tex);
      expect(entries).toHaveLength(1);
      expect(entries[0].citationKey).toBe("knuth84");
      expect(entries[0].fields.raw_citation).toBe(rawText);
      expect(entries[0].fields.year).toBe("1984");
      expect(entries[0].fields.author).toContain("Knuth");
      expect(entries[0].fields.title).toContain("The TeXbook");
    });

    it("ignores commented-out \\bibitem entries", () => {
      const tex = `
\\begin{thebibliography}{99}
% \\bibitem{commented1} This should be ignored.
\\bibitem{active1} Active Author. (2023). Active Title. Journal of Testing.
\\end{thebibliography}
`;
      const entries = parseTex(tex);
      expect(entries).toHaveLength(1);
      expect(entries[0].citationKey).toBe("active1");
    });
  });

  describe("Edge cases", () => {
    it("returns empty array for empty or non-bibliographic text", () => {
      expect(parseTex("")).toEqual([]);
      expect(parseTex("Just a regular LaTeX document with no citations.")).toEqual([]);
    });

    it("handles document with both embedded BibTeX and bibitem entries without crashing", () => {
      const tex = `
@article{art1,
  title = {Embedded Bib},
  author = {Tester},
  year = {2020}
}
\\begin{thebibliography}{1}
\\bibitem{bib1} Other Author (2021). Bibitem Title. Nature.
\\end{thebibliography}
`;
      const entries = parseTex(tex);
      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(entries.some((e) => e.citationKey === "art1")).toBe(true);
      expect(entries.some((e) => e.citationKey === "bib1")).toBe(true);
    });
  });
});

describe("BibTeX Exporter (exportToBibtex)", () => {
  it("formats clean, valid BibTeX output string with standard fields wrapped in braces", () => {
    const records = [
      {
        row: {
          title: "Attention is All You Need",
          author: "Vaswani, Ashish and Shazeer, Noam",
          year: "2017",
          journal: "Advances in Neural Information Processing Systems",
          doi: "10.5555/3295222.3295349",
          abstract: "The dominant sequence transduction models are based on complex recurrent networks.",
        },
      },
    ];

    const bibtex = exportToBibtex(records);

    expect(bibtex).toContain("@article{Vaswani2017Attention,");
    expect(bibtex).toContain("  title = {Attention is All You Need},");
    expect(bibtex).toContain("  author = {Vaswani, Ashish and Shazeer, Noam},");
    expect(bibtex).toContain("  year = {2017},");
    expect(bibtex).toContain("  journal = {Advances in Neural Information Processing Systems},");
    expect(bibtex).toContain("  doi = {10.5555/3295222.3295349},");
    expect(bibtex).toContain(
      "  abstract = {The dominant sequence transduction models are based on complex recurrent networks.}"
    );
    expect(bibtex.trim().endsWith("}")).toBe(true);
  });

  it("preserves explicit citationKey if provided in row", () => {
    const records = [
      {
        row: {
          citationKey: "custom_key_2024",
          title: "Custom Title",
          author: "Doe, Jane",
          year: "2024",
        },
      },
    ];

    const bibtex = exportToBibtex(records);
    expect(bibtex).toContain("@article{custom_key_2024,");
  });

  it("generates valid citation keys (AuthorYearTitle) when citationKey is missing", () => {
    const records = [
      {
        row: {
          title: "Deep Residual Learning for Image Recognition",
          author: "He, Kaiming and Zhang, Xiangyu and Ren, Shaoqing and Sun, Jian",
          year: "2016",
        },
      },
    ];

    const bibtex = exportToBibtex(records);
    expect(bibtex).toMatch(/@article\{He2016Deep,/);
  });

  it("sanitizes diacritics in generated citation keys", () => {
    const records = [
      {
        row: {
          title: "Étude sur l'apprentissage profond",
          author: "Müller, Klaus and François, René",
          year: "2023",
        },
      },
    ];

    const bibtex = exportToBibtex(records);
    // Diacritics should be stripped to plain ASCII in citation key
    expect(bibtex).toMatch(/@article\{Muller2023Etude,/);
  });

  it("handles missing authors or titles when generating citation keys", () => {
    const recordsNoAuthor = [
      {
        row: {
          title: "Anonymous Whitepaper",
          year: "2022",
        },
      },
    ];
    const bibNoAuthor = exportToBibtex(recordsNoAuthor);
    expect(bibNoAuthor).toMatch(/@article\{Anonymous2022Whitepaper,/);

    const recordsNoTitle = [
      {
        row: {
          author: "Smith, John",
          year: "2021",
        },
      },
    ];
    const bibNoTitle = exportToBibtex(recordsNoTitle);
    expect(bibNoTitle).toMatch(/@article\{Smith2021,/);
  });

  it("retains arbitrary custom fields and raw_citation", () => {
    const records = [
      {
        row: {
          title: "Preserving Data",
          author: "Alice",
          year: "2024",
          custom_tag: "SLR-Phase-2",
          raw_citation: "Alice (2024). Preserving Data. Full text citation.",
          notes: "Screened as relevant",
        },
      },
    ];

    const bibtex = exportToBibtex(records);
    expect(bibtex).toContain("  custom_tag = {SLR-Phase-2},");
    expect(bibtex).toContain("  raw_citation = {Alice (2024). Preserving Data. Full text citation.},");
    expect(bibtex).toContain("  notes = {Screened as relevant},");
  });

  it("excludes internal workspace fields (like __id, completenessScore, isDuplicate, etc.)", () => {
    const records = [
      {
        row: {
          title: "Clean Export Test",
          year: "2024",
          author: "Bob",
          __internal: "secret",
          completenessScore: "95",
          isDuplicate: "false",
          isPivot: "true",
          keep: "true",
          normalizedTitle: "clean export test",
          cleanYear: "2024",
          duplicateOfId: "null",
          similarityToParent: "0.0",
        },
      },
    ];

    const bibtex = exportToBibtex(records);
    expect(bibtex).not.toContain("__internal");
    expect(bibtex).not.toContain("completenessScore");
    expect(bibtex).not.toContain("isDuplicate");
    expect(bibtex).not.toContain("isPivot");
    expect(bibtex).not.toContain("keep");
    expect(bibtex).not.toContain("normalizedTitle");
    expect(bibtex).not.toContain("cleanYear");
  });

  it("deduplicates identical generated citation keys", () => {
    const records = [
      {
        row: {
          title: "Transformer Architecture Investigation",
          author: "Smith, John",
          year: "2020",
        },
      },
      {
        row: {
          title: "Transformer Architecture Investigation Part 2",
          author: "Smith, John",
          year: "2020",
        },
      },
    ];

    const bibtex = exportToBibtex(records);
    // First is Smith2020Transformer, second should have a disambiguated suffix (e.g. Smith2020Transformer_2 or Smith2020Transformerb)
    const matches = bibtex.match(/@article\{([^,]+),/g);
    expect(matches).toHaveLength(2);
    expect(matches![0]).not.toBe(matches![1]);
  });

  it("detects inproceedings entry type when booktitle or conference is present", () => {
    const records = [
      {
        row: {
          title: "Conference Paper",
          author: "Author A",
          year: "2022",
          booktitle: "Proceedings of ICML",
        },
      },
    ];

    const bibtex = exportToBibtex(records);
    expect(bibtex).toContain("@inproceedings{");
    expect(bibtex).toContain("  booktitle = {Proceedings of ICML},");
  });

  it("returns empty string when given an empty records list", () => {
    expect(exportToBibtex([])).toBe("");
  });
});
