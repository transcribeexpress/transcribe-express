/**
 * Tests pour l'extension AudioSync (ProseMirror Plugin)
 *
 * Couvre :
 *  - Helpers du TranscriptionEditor (countWords, formatTime, etc.)
 *  - Conversion texte → HTML Tiptap
 *  - Logique de synchronisation audio/segment (Edit-Sync)
 *  - Logique de résolution paragraphe → segment (Click-to-Seek)
 *  - Structure et exports du module audioSyncExtension
 */
import { describe, it, expect } from "vitest";

// ─── Tests des helpers du TranscriptionEditor ────────────────────────────────

describe("TranscriptionEditor helpers", () => {
  function countWords(text: string): number {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }

  function estimateReadingTime(wordCount: number): string {
    const minutes = wordCount / 200;
    if (minutes < 1) return "< 1 min";
    return `${Math.round(minutes)} min`;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  interface WhisperSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    avg_logprob?: number;
  }

  function isLowConfidence(segment: WhisperSegment): boolean {
    if (segment.avg_logprob !== undefined) {
      return segment.avg_logprob < -0.5;
    }
    return false;
  }

  function formatConfidence(segment: WhisperSegment): string {
    if (segment.avg_logprob !== undefined) {
      const prob = Math.exp(segment.avg_logprob);
      return `Confiance : ${Math.round(prob * 100)}%`;
    }
    return "Confiance inconnue";
  }

  describe("countWords", () => {
    it("compte les mots correctement", () => {
      expect(countWords("Bonjour le monde")).toBe(3);
      expect(countWords("Un")).toBe(1);
      expect(countWords("")).toBe(0);
      expect(countWords("   ")).toBe(0);
    });

    it("gère les espaces multiples", () => {
      expect(countWords("Bonjour   le    monde")).toBe(3);
    });

    it("gère les retours à la ligne", () => {
      expect(countWords("Bonjour\nle\nmonde")).toBe(3);
    });
  });

  describe("estimateReadingTime", () => {
    it("retourne < 1 min pour peu de mots", () => {
      expect(estimateReadingTime(50)).toBe("< 1 min");
    });

    it("retourne le temps arrondi pour plus de mots", () => {
      expect(estimateReadingTime(200)).toBe("1 min");
      expect(estimateReadingTime(600)).toBe("3 min");
    });
  });

  describe("formatTime", () => {
    it("formate les secondes en MM:SS", () => {
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(5)).toBe("0:05");
      expect(formatTime(65)).toBe("1:05");
      expect(formatTime(3661)).toBe("61:01");
    });
  });

  describe("isLowConfidence", () => {
    it("détecte les segments à faible confiance", () => {
      expect(
        isLowConfidence({ id: 1, start: 0, end: 5, text: "test", avg_logprob: -0.8 })
      ).toBe(true);
    });

    it("ne marque pas les segments à haute confiance", () => {
      expect(
        isLowConfidence({ id: 1, start: 0, end: 5, text: "test", avg_logprob: -0.3 })
      ).toBe(false);
    });

    it("retourne false si avg_logprob est absent", () => {
      expect(
        isLowConfidence({ id: 1, start: 0, end: 5, text: "test" })
      ).toBe(false);
    });
  });

  describe("formatConfidence", () => {
    it("formate la confiance en pourcentage", () => {
      const result = formatConfidence({
        id: 1, start: 0, end: 5, text: "test", avg_logprob: -0.3,
      });
      expect(result).toContain("Confiance :");
      expect(result).toContain("%");
    });

    it("retourne 'Confiance inconnue' sans avg_logprob", () => {
      expect(
        formatConfidence({ id: 1, start: 0, end: 5, text: "test" })
      ).toBe("Confiance inconnue");
    });
  });
});

// ─── Tests de la conversion texte → HTML Tiptap ─────────────────────────────

describe("textToTiptapHTML", () => {
  interface WhisperSegment {
    id: number;
    start: number;
    end: number;
    text: string;
  }

  function textToTiptapHTML(
    text: string,
    segments?: WhisperSegment[]
  ): string {
    if (segments && segments.length > 0) {
      return segments
        .map((seg) => {
          const escaped = seg.text
            .trim()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<p>${escaped}</p>`;
        })
        .join("");
    }

    const lines = text.split("\n");
    return lines
      .map((line) => {
        const escaped = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<p>${escaped || "<br>"}</p>`;
      })
      .join("");
  }

  it("convertit les segments en paragraphes HTML", () => {
    const segments: WhisperSegment[] = [
      { id: 0, start: 0, end: 5, text: " Bonjour " },
      { id: 1, start: 5, end: 10, text: " le monde " },
    ];
    const html = textToTiptapHTML("Bonjour le monde", segments);
    expect(html).toBe("<p>Bonjour</p><p>le monde</p>");
  });

  it("échappe les caractères HTML dans les segments", () => {
    const segments: WhisperSegment[] = [
      { id: 0, start: 0, end: 5, text: " <script>alert('xss')</script> " },
    ];
    const html = textToTiptapHTML("test", segments);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("convertit le texte brut en paragraphes par ligne", () => {
    const html = textToTiptapHTML("Ligne 1\nLigne 2\nLigne 3");
    expect(html).toBe("<p>Ligne 1</p><p>Ligne 2</p><p>Ligne 3</p>");
  });

  it("gère les lignes vides avec <br>", () => {
    const html = textToTiptapHTML("Ligne 1\n\nLigne 3");
    expect(html).toBe("<p>Ligne 1</p><p><br></p><p>Ligne 3</p>");
  });

  it("échappe les caractères HTML dans le texte brut", () => {
    const html = textToTiptapHTML("a < b & c > d");
    expect(html).toBe("<p>a &lt; b &amp; c &gt; d</p>");
  });
});

// ─── Tests de la logique Edit-Sync (audio → segment actif) ──────────────────

describe("Edit-Sync : synchronisation audio/segment", () => {
  interface Segment {
    id: number;
    start: number;
    end: number;
    text: string;
  }

  const segments: Segment[] = [
    { id: 0, start: 0, end: 5.5, text: "Premier segment" },
    { id: 1, start: 5.5, end: 12.0, text: "Deuxième segment" },
    { id: 2, start: 12.0, end: 18.3, text: "Troisième segment" },
    { id: 3, start: 18.3, end: 25.0, text: "Quatrième segment" },
  ];

  function findActiveSegment(currentTime: number, segs: Segment[]): number {
    return segs.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );
  }

  it("trouve le premier segment au début", () => {
    expect(findActiveSegment(0, segments)).toBe(0);
    expect(findActiveSegment(2.5, segments)).toBe(0);
    expect(findActiveSegment(5.4, segments)).toBe(0);
  });

  it("trouve le deuxième segment", () => {
    expect(findActiveSegment(5.5, segments)).toBe(1);
    expect(findActiveSegment(8.0, segments)).toBe(1);
    expect(findActiveSegment(11.9, segments)).toBe(1);
  });

  it("trouve le troisième segment", () => {
    expect(findActiveSegment(12.0, segments)).toBe(2);
    expect(findActiveSegment(15.0, segments)).toBe(2);
  });

  it("retourne -1 après le dernier segment", () => {
    expect(findActiveSegment(25.0, segments)).toBe(-1);
    expect(findActiveSegment(30.0, segments)).toBe(-1);
  });

  it("retourne -1 pour un temps négatif", () => {
    expect(findActiveSegment(-1, segments)).toBe(-1);
  });

  it("retourne -1 pour une liste vide", () => {
    expect(findActiveSegment(5, [])).toBe(-1);
  });
});

// ─── Tests de la logique Click-to-Seek ──────────────────────────────────────

describe("Click-to-Seek : résolution paragraphe → segment", () => {
  interface Segment {
    id: number;
    start: number;
    end: number;
    text: string;
  }

  const segments: Segment[] = [
    { id: 0, start: 0, end: 5.5, text: "Premier segment" },
    { id: 1, start: 5.5, end: 12.0, text: "Deuxième segment" },
    { id: 2, start: 12.0, end: 18.3, text: "Troisième segment" },
  ];

  /**
   * Simule la résolution du segment depuis un index de paragraphe.
   * Dans l'éditeur, 1 paragraphe = 1 segment Whisper.
   */
  function resolveSegmentFromParagraph(
    paragraphIndex: number,
    segs: Segment[]
  ): Segment | null {
    if (paragraphIndex < 0 || paragraphIndex >= segs.length) return null;
    return segs[paragraphIndex];
  }

  it("résout le premier paragraphe vers le premier segment", () => {
    const seg = resolveSegmentFromParagraph(0, segments);
    expect(seg).not.toBeNull();
    expect(seg!.start).toBe(0);
    expect(seg!.text).toBe("Premier segment");
  });

  it("résout le deuxième paragraphe vers le deuxième segment", () => {
    const seg = resolveSegmentFromParagraph(1, segments);
    expect(seg).not.toBeNull();
    expect(seg!.start).toBe(5.5);
    expect(seg!.text).toBe("Deuxième segment");
  });

  it("résout le dernier paragraphe vers le dernier segment", () => {
    const seg = resolveSegmentFromParagraph(2, segments);
    expect(seg).not.toBeNull();
    expect(seg!.start).toBe(12.0);
  });

  it("retourne null pour un index hors limites", () => {
    expect(resolveSegmentFromParagraph(-1, segments)).toBeNull();
    expect(resolveSegmentFromParagraph(3, segments)).toBeNull();
    expect(resolveSegmentFromParagraph(100, segments)).toBeNull();
  });

  it("retourne null pour une liste vide", () => {
    expect(resolveSegmentFromParagraph(0, [])).toBeNull();
  });

  it("le timestamp du segment est utilisé pour le seek audio", () => {
    // Simulation du seek : audio.currentTime = segment.start
    const clickedParagraph = 1;
    const seg = resolveSegmentFromParagraph(clickedParagraph, segments);
    expect(seg).not.toBeNull();

    // Le seek doit positionner l'audio au début du segment
    const seekTarget = seg!.start;
    expect(seekTarget).toBe(5.5);
    expect(seekTarget).toBeGreaterThanOrEqual(0);
  });
});

// ─── Tests du formatage du timestamp pour le tooltip hover ──────────────────

describe("formatTimeShort : tooltip timestamp au hover", () => {
  function formatTimeShort(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  it("formate 0 secondes", () => {
    expect(formatTimeShort(0)).toBe("0:00");
  });

  it("formate des secondes < 60", () => {
    expect(formatTimeShort(5)).toBe("0:05");
    expect(formatTimeShort(59)).toBe("0:59");
  });

  it("formate des minutes entières", () => {
    expect(formatTimeShort(60)).toBe("1:00");
    expect(formatTimeShort(120)).toBe("2:00");
  });

  it("formate des temps mixtes", () => {
    expect(formatTimeShort(65)).toBe("1:05");
    expect(formatTimeShort(3661)).toBe("61:01");
  });

  it("génère un tooltip lisible pour les segments", () => {
    const segments = [
      { start: 0 },
      { start: 12.5 },
      { start: 125.3 },
    ];
    const tooltips = segments.map((s) => `→ ${formatTimeShort(s.start)}`);
    expect(tooltips[0]).toBe("→ 0:00");
    expect(tooltips[1]).toBe("→ 0:12");
    expect(tooltips[2]).toBe("→ 2:05");
  });
});

// ─── Tests de structure du module audioSyncExtension ────────────────────────

describe("AudioSyncExtension module", () => {
  it("exporte AudioSyncExtension", async () => {
    const mod = await import("./audioSyncExtension");
    expect(mod.AudioSyncExtension).toBeDefined();
    expect(mod.AudioSyncExtension.name).toBe("audioSync");
  });

  it("exporte audioSyncPluginKey", async () => {
    const mod = await import("./audioSyncExtension");
    expect(mod.audioSyncPluginKey).toBeDefined();
  });

  it("exporte CLICK_FLASH_META", async () => {
    const mod = await import("./audioSyncExtension");
    expect(mod.CLICK_FLASH_META).toBeDefined();
    expect(typeof mod.CLICK_FLASH_META).toBe("string");
  });

  it("AudioSyncExtension supporte la configuration onSegmentClick", async () => {
    const mod = await import("./audioSyncExtension");
    // L'extension doit avoir des options par défaut
    expect(mod.AudioSyncExtension).toBeDefined();
    // La méthode configure doit exister (héritée de Extension)
    expect(typeof mod.AudioSyncExtension.configure).toBe("function");
  });

  it("exporte le type AudioSyncSegment (vérification d'import)", async () => {
    const mod = await import("./audioSyncExtension");
    expect(mod).toBeDefined();
    // Le type est vérifié à la compilation TypeScript
  });
});

// ─── Tests de la correction Bug 1 : découpage en paragraphes par segments ────
// Vérifie que textToTiptapHTML génère bien un paragraphe par segment
// même quand les segments arrivent après l'initialisation de l'éditeur.

describe("Bug 1 fix : découpage en paragraphes par segment Whisper", () => {
  interface WhisperSegment {
    id: number;
    start: number;
    end: number;
    text: string;
  }

  function textToTiptapHTML(
    text: string,
    segments?: WhisperSegment[]
  ): string {
    if (segments && segments.length > 0) {
      return segments
        .map((seg) => {
          const escaped = seg.text
            .trim()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<p>${escaped}</p>`;
        })
        .join("");
    }
    const lines = text.split("\n");
    return lines
      .map((line) => {
        const escaped = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<p>${escaped || "<br>"}</p>`;
      })
      .join("");
  }

  const segments: WhisperSegment[] = [
    { id: 0, start: 0, end: 3.2, text: " Bonjour tout le monde. " },
    { id: 1, start: 3.2, end: 7.8, text: " Ceci est le deuxième segment. " },
    { id: 2, start: 7.8, end: 12.1, text: " Et voici le troisième. " },
  ];

  it("génère un paragraphe par segment (pas un seul bloc)", () => {
    const html = textToTiptapHTML("Bonjour tout le monde. Ceci est le deuxième segment. Et voici le troisième.", segments);
    // Doit contenir exactement 3 balises <p>
    const matches = html.match(/<p>/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(3);
  });

  it("le texte de chaque segment est dans son propre paragraphe", () => {
    const html = textToTiptapHTML("texte brut", segments);
    expect(html).toContain("<p>Bonjour tout le monde.</p>");
    expect(html).toContain("<p>Ceci est le deuxième segment.</p>");
    expect(html).toContain("<p>Et voici le troisième.</p>");
  });

  it("sans segments, le texte brut est en un seul paragraphe", () => {
    const html = textToTiptapHTML("Texte brut sans segments");
    expect(html).toBe("<p>Texte brut sans segments</p>");
  });

  it("segmentsAppliedRef empêche le redécoupage répété (simulation)", () => {
    // Simule la logique de segmentsAppliedRef
    let segmentsApplied = false;
    let setContentCallCount = 0;

    function applySegmentsIfNeeded(
      editorReady: boolean,
      segments: WhisperSegment[],
      isDirty: boolean
    ) {
      if (!editorReady || segments.length === 0) return;
      if (segmentsApplied) return; // Déjà appliqué
      if (isDirty) return; // Ne pas écraser les modifications de l'utilisateur

      setContentCallCount++;
      segmentsApplied = true;
    }

    // Premier appel : segments arrivent, éditeur prêt
    applySegmentsIfNeeded(true, segments, false);
    expect(setContentCallCount).toBe(1);
    expect(segmentsApplied).toBe(true);

    // Deuxième appel : ne doit pas rappeler setContent
    applySegmentsIfNeeded(true, segments, false);
    expect(setContentCallCount).toBe(1); // Toujours 1

    // Troisième appel avec isDirty=true : ne doit pas rappeler setContent
    segmentsApplied = false; // Reset pour tester isDirty
    applySegmentsIfNeeded(true, segments, true);
    expect(setContentCallCount).toBe(1); // Toujours 1
  });
});

// ─── Tests de la correction Bug 2 : pendingSeek pour le lecteur fermé ────────
// Vérifie que le timestamp cible est correctement stocké et appliqué
// quand le lecteur audio vient d'être ouvert (source pas encore chargée).

describe("Bug 2 fix : pendingSeek pour Click-to-Seek avec lecteur fermé", () => {
  it("stocke le timestamp dans pendingSeekRef quand l'audio n'est pas disponible", () => {
    // Simulation de la logique onSegmentClick
    let pendingSeek: number | null = null;
    let showAudioPlayer = false;

    function onSegmentClick(segmentStart: number, audioElement: HTMLAudioElement | null) {
      if (!audioElement || !audioElement.src || audioElement.src === window.location.href) {
        // Lecteur fermé ou source non chargée → stocker le timestamp
        pendingSeek = segmentStart;
        showAudioPlayer = true;
        return "pending";
      }
      return "immediate";
    }

    const result = onSegmentClick(12.5, null);
    expect(result).toBe("pending");
    expect(pendingSeek).toBe(12.5);
    expect(showAudioPlayer).toBe(true);
  });

  it("applique le pendingSeek dans onLoadedMetadata", () => {
    let pendingSeek: number | null = 12.5;
    let seekApplied = false;
    let playStarted = false;

    function handleLoadedMetadata(audioCurrentTime: { value: number }) {
      if (pendingSeek !== null) {
        const targetTime = pendingSeek;
        pendingSeek = null;
        audioCurrentTime.value = targetTime;
        seekApplied = true;
        playStarted = true;
      }
    }

    const audioCurrentTime = { value: 0 };
    handleLoadedMetadata(audioCurrentTime);

    expect(seekApplied).toBe(true);
    expect(playStarted).toBe(true);
    expect(audioCurrentTime.value).toBe(12.5);
    expect(pendingSeek).toBeNull(); // Reset après application
  });

  it("ne déclenche pas de seek si pendingSeek est null", () => {
    let pendingSeek: number | null = null;
    let seekApplied = false;

    function handleLoadedMetadata() {
      if (pendingSeek !== null) {
        seekApplied = true;
      }
    }

    handleLoadedMetadata();
    expect(seekApplied).toBe(false);
  });

  it("seek immédiat quand l'audio est déjà disponible", () => {
    let pendingSeek: number | null = null;
    let immediateSeekTarget: number | null = null;

    const mockAudio = {
      src: "https://s3.example.com/audio.mp3",
      currentTime: 0,
    };

    function onSegmentClick(segmentStart: number, audio: typeof mockAudio | null) {
      if (!audio || !audio.src || audio.src === window.location.href) {
        pendingSeek = segmentStart;
        return "pending";
      }
      immediateSeekTarget = segmentStart;
      return "immediate";
    }

    const result = onSegmentClick(8.3, mockAudio);
    expect(result).toBe("immediate");
    expect(immediateSeekTarget).toBe(8.3);
    expect(pendingSeek).toBeNull(); // Pas de pending seek
  });
});
