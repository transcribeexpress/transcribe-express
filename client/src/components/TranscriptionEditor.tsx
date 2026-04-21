import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Edit3,
  Save,
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music2,
  SkipBack,
  SkipForward,
  Keyboard,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  AudioSyncExtension,
  audioSyncPluginKey,
  type AudioSyncSegment,
  type AudioSyncOptions,
} from "@/extensions/audioSyncExtension";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    probability?: number;
  }>;
}

interface TranscriptionEditorProps {
  transcriptionId: number;
  originalText: string;
  editedText: string | null | undefined;
  segmentsData: string | null | undefined;
  onTextChange?: (text: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function estimateReadingTime(wordCount: number): string {
  const minutes = wordCount / 200;
  if (minutes < 1) return "< 1 min";
  return `${Math.round(minutes)} min`;
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Convertit du texte brut en HTML pour Tiptap.
 * Chaque segment Whisper devient un paragraphe <p>.
 * Si pas de segments, chaque ligne du texte brut devient un <p>.
 */
function textToTiptapHTML(
  text: string,
  segments?: WhisperSegment[]
): string {
  if (segments && segments.length > 0) {
    // Un paragraphe par segment Whisper
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

  // Fallback : découper par lignes
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

// ─── Composant principal ──────────────────────────────────────────────────────

export function TranscriptionEditor({
  transcriptionId,
  originalText,
  editedText,
  segmentsData,
  onTextChange,
}: TranscriptionEditorProps) {
  // État de l'éditeur
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "error"
  >("saved");
  const [isEditing, setIsEditing] = useState(false);

  // Rechercher/Remplacer
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // Segments Whisper
  const [showLowConfidence, setShowLowConfidence] = useState(true);
  const [lowConfidenceSegments, setLowConfidenceSegments] = useState<
    WhisperSegment[]
  >([]);
  const [allSegments, setAllSegments] = useState<WhisperSegment[]>([]);

  // Lecteur audio synchronisé
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  // Edit-Sync : auto-scroll activé
  const [editSyncEnabled, setEditSyncEnabled] = useState(true);

  // Click-to-Seek : index du dernier segment cliqué (pour le toast)
  const [lastClickedSegment, setLastClickedSegment] = useState<number>(-1);

  // Ref stable pour le callback onSegmentClick (évite de recréer les extensions)
  const onSegmentClickRef = useRef<AudioSyncOptions["onSegmentClick"]>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  // Flag pour bloquer handleAudioTimeUpdate pendant un seek programmatique
  // Cela évite que timeupdate remette audioCurrentTime à 0 pendant le seek
  const isSeekingRef = useRef<boolean>(false);

  // Texte initial pour Tiptap
  const initialText = editedText ?? originalText;

  // Mémoriser les extensions Tiptap
  // AudioSyncExtension est configuré avec un callback stable via ref
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Désactiver les fonctionnalités de formatage riche non nécessaires
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        heading: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Le texte de la transcription apparaîtra ici...",
      }),
      AudioSyncExtension.configure({
        // Utiliser une ref stable pour éviter de recréer l'extension à chaque render
        onSegmentClick: (segmentIndex: number, segment: AudioSyncSegment) => {
          onSegmentClickRef.current?.(segmentIndex, segment);
        },
      }),
    ],
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Initialiser l'éditeur Tiptap
  const editor = useEditor({
    extensions,
    content: textToTiptapHTML(initialText, allSegments.length > 0 ? allSegments : undefined),
    editorProps: {
      attributes: {
        // La classe 'has-segments' active le padding gauche pour les timestamps hover
        class:
          "prose prose-sm prose-invert max-w-none focus:outline-none min-h-[200px] p-4 text-sm leading-relaxed",
        spellcheck: "true",
        lang: "fr",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText();
      setIsDirty(true);
      setSaveStatus("unsaved");
      onTextChange?.(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateMutation.mutate({ id: transcriptionId, editedText: text });
      }, 2000);
    },
    onFocus: () => setIsEditing(true),
    onBlur: () => setIsEditing(false),
  });

  // Mutation tRPC pour sauvegarder
  const updateMutation = trpc.transcriptions.update.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setIsDirty(false);
    },
    onError: (error) => {
      setSaveStatus("error");
      toast.error("Erreur de sauvegarde", { description: error.message });
    },
  });

  // Requête tRPC pour l'URL audio S3
  const audioUrlQuery = trpc.transcriptions.getAudioUrl.useQuery(
    { id: transcriptionId },
    {
      enabled: showAudioPlayer,
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );

  // Charger les segments Whisper
  useEffect(() => {
    if (segmentsData) {
      try {
        const segments: WhisperSegment[] = JSON.parse(segmentsData);
        setAllSegments(segments);
        setLowConfidenceSegments(segments.filter(isLowConfidence));
      } catch {
        setAllSegments([]);
        setLowConfidenceSegments([]);
      }
    }
  }, [segmentsData]);

  // Synchroniser le contenu si le texte externe change (ex: après restauration)
  useEffect(() => {
    if (!editor) return;
    const incoming = editedText ?? originalText;
    const currentEditorText = editor.getText();
    // Ne mettre à jour que si le contenu a réellement changé (pas à cause de notre propre édition)
    if (incoming !== currentEditorText && !isDirty) {
      editor.commands.setContent(
        textToTiptapHTML(incoming, allSegments.length > 0 ? allSegments : undefined)
      );
    }
  }, [editedText, originalText, editor, allSegments, isDirty]);

  // Ajouter/retirer la classe 'has-segments' sur l'éditeur
  // pour activer le padding gauche des timestamps au hover
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom as HTMLElement;
    if (allSegments.length > 0) {
      el.classList.add("has-segments");
    } else {
      el.classList.remove("has-segments");
    }
  }, [editor, allSegments]);

  // Comptage des occurrences de recherche
  useEffect(() => {
    if (!searchTerm.trim() || !editor) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }
    try {
      const text = editor.getText();
      const regex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );
      const matches = text.match(regex);
      setMatchCount(matches ? matches.length : 0);
      setCurrentMatch(matches && matches.length > 0 ? 1 : 0);
    } catch {
      setMatchCount(0);
    }
  }, [searchTerm, editor]);

  // ─── Edit-Sync : synchronisation audio → surbrillance segment actif ────────

  // Trouver le segment actif basé sur le currentTime audio
  useEffect(() => {
    if (allSegments.length === 0) return;

    const idx = allSegments.findIndex(
      (seg) => audioCurrentTime >= seg.start && audioCurrentTime < seg.end
    );

    if (idx !== currentSegmentIndex) {
      setCurrentSegmentIndex(idx);
    }
  }, [audioCurrentTime, allSegments, currentSegmentIndex]);

  // Mettre à jour la décoration Tiptap quand le segment actif change
  useEffect(() => {
    if (!editor || allSegments.length === 0) return;

    const { tr } = editor.state;
    tr.setMeta(audioSyncPluginKey, {
      segmentIndex: currentSegmentIndex,
      segments: allSegments.map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        text: s.text,
      })) as AudioSyncSegment[],
    });
    editor.view.dispatch(tr);
  }, [currentSegmentIndex, editor, allSegments]);

  // Auto-scroll vers le segment actif
  useEffect(() => {
    if (
      !editSyncEnabled ||
      currentSegmentIndex < 0 ||
      !editorContainerRef.current
    )
      return;

    // Chercher l'élément mark.active-segment-highlight dans le DOM de l'éditeur
    const highlightEl = editorContainerRef.current.querySelector(
      ".active-segment-highlight"
    );
    if (highlightEl) {
      highlightEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSegmentIndex, editSyncEnabled]);

  // ─── Handlers audio ─────────────────────────────────────────────────────────

  const handleAudioTimeUpdate = () => {
    // Ignorer les événements timeupdate pendant un seek programmatique
    // pour éviter que la barre de progression remette audioCurrentTime à 0
    if (isSeekingRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    setAudioCurrentTime(audio.currentTime);
  };

  const handleAudioLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioDuration(audio.duration);
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
    // Garder la surbrillance sur le dernier segment (ne pas reset à -1)
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
      // Maintenir la surbrillance à la pause (ne pas toucher currentSegmentIndex)
    } else {
      audio.play().catch(() => {
        toast.error("Impossible de lire l'audio", {
          description: "Le fichier audio n'est peut-être plus disponible.",
        });
      });
      setIsAudioPlaying(true);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audioMuted;
    setAudioMuted(!audioMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setAudioCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = parseFloat(e.target.value);
    audio.volume = vol;
    setAudioVolume(vol);
    if (vol === 0) {
      setAudioMuted(true);
      audio.muted = true;
    } else if (audioMuted) {
      setAudioMuted(false);
      audio.muted = false;
    }
  };

  // Cliquer sur un segment → aller à ce timestamp
  const seekToSegment = useCallback((segment: WhisperSegment) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = segment.start;
    setAudioCurrentTime(segment.start);
    if (!isAudioPlaying) {
      audio.play().catch(() => {});
      setIsAudioPlaying(true);
    }
  }, [isAudioPlaying]);

  // Click-to-Seek depuis l'éditeur Tiptap
  // Ce callback est mis à jour dans une ref stable pour éviter de recréer les extensions Tiptap.
  //
  // Correction définitive du bug "repart à zéro" :
  //  - isSeekingRef.current = true AVANT de modifier audio.currentTime
  //    pour bloquer handleAudioTimeUpdate (qui était appelé par timeupdate avec currentTime=0)
  //  - isSeekingRef.current = false dans l'événement 'seeked' (seek terminé)
  //  - setAudioCurrentTime() est appelé DANS 'seeked', avec la vraie valeur finale
  useEffect(() => {
    onSegmentClickRef.current = (segmentIndex: number, segment: AudioSyncSegment) => {
      // Ouvrir le lecteur audio si fermé (avant tout)
      setShowAudioPlayer(true);
      setLastClickedSegment(segmentIndex);

      const audio = audioRef.current;
      if (!audio) {
        // Le lecteur vient d'être ouvert : attendre qu'il soit monté dans le DOM
        setTimeout(() => {
          const a = audioRef.current;
          if (!a) return;
          isSeekingRef.current = true;
          a.addEventListener("seeked", function onSeeked() {
            isSeekingRef.current = false;
            setAudioCurrentTime(a.currentTime);
            a.removeEventListener("seeked", onSeeked);
          });
          a.currentTime = segment.start;
        }, 300);
        return;
      }

      // Activer le flag AVANT le seek pour bloquer timeupdate
      isSeekingRef.current = true;

      // Seek vers le timestamp du segment
      // 'seeked' se déclenche quand le navigateur a effectivement repositionné la lecture
      audio.addEventListener("seeked", function onSeeked() {
        isSeekingRef.current = false;
        setAudioCurrentTime(audio.currentTime);
        audio.removeEventListener("seeked", onSeeked);
      });

      audio.currentTime = segment.start;

      // Démarrer la lecture automatiquement si en pause
      if (!isAudioPlaying) {
        audio.addEventListener("seeked", function playAfterSeek() {
          audio.play().catch(() => {
            toast.error("Impossible de lire l'audio", {
              description: "Cliquez sur Play pour démarrer la lecture.",
            });
          });
          setIsAudioPlaying(true);
          audio.removeEventListener("seeked", playAfterSeek);
        });
      }
    };
  }, [isAudioPlaying]);

  // ─── Handlers éditeur ───────────────────────────────────────────────────────

  const handleSaveNow = () => {
    if (!editor) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const text = editor.getText();
    setSaveStatus("saving");
    updateMutation.mutate({ id: transcriptionId, editedText: text });
  };

  const handleRestore = () => {
    if (!editor) return;
    editor.commands.setContent(
      textToTiptapHTML(originalText, allSegments.length > 0 ? allSegments : undefined)
    );
    setIsDirty(true);
    setSaveStatus("saving");
    updateMutation.mutate(
      { id: transcriptionId, editedText: null },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setIsDirty(false);
          toast.success("Texte original restauré", {
            description: "Toutes vos modifications ont été supprimées.",
          });
        },
      }
    );
  };

  const handleReplaceAll = () => {
    if (!searchTerm.trim() || !editor) return;

    try {
      const text = editor.getText();
      const regex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );
      const newText = text.replace(regex, replaceTerm);
      const count = (text.match(regex) || []).length;

      // Reconstruire le contenu Tiptap avec le texte remplacé
      editor.commands.setContent(
        textToTiptapHTML(newText, undefined)
      );
      setIsDirty(true);
      setSaveStatus("unsaved");
      onTextChange?.(newText);

      toast.success(
        `${count} remplacement${count > 1 ? "s" : ""} effectué${count > 1 ? "s" : ""}`,
        {
          description: `"${searchTerm}" → "${replaceTerm}"`,
        }
      );

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateMutation.mutate({ id: transcriptionId, editedText: newText });
      }, 1000);
    } catch {
      toast.error("Expression de recherche invalide");
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setReplaceTerm("");
    setMatchCount(0);
    setCurrentMatch(0);
    searchInputRef.current?.focus();
  };

  // ─── Contrôles audio : skip ±5s ───────────────────────────────────────────

  const skipAudio = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
    audio.currentTime = newTime;
    setAudioCurrentTime(newTime);
  }, []);

  // ─── Détection écran tactile ─────────────────────────────────────────────────

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches
      );
    };
    check();
    // Re-check on resize (tablet orientation change)
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Feedback haptique (mobile) ──────────────────────────────────────────────

  const hapticFeedback = useCallback(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate(15);
    }
  }, []);

  // ─── Raccourcis clavier globaux ──────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+H → Rechercher/Remplacer
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      // Ctrl+S → Sauvegarder
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveNow();
        return;
      }

      // ── Raccourcis audio (uniquement quand le lecteur est ouvert) ──
      if (!showAudioPlayer || !audioRef.current) return;

      // Vérifier si l'utilisateur est en train de taper dans un champ de saisie
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("role") === "textbox" ||
        target.isContentEditable;

      // Ctrl+Espace → Play/Pause (fonctionne même en mode édition)
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      // Si l'utilisateur tape dans l'éditeur, ne pas intercepter Espace/Flèches
      if (isTyping) return;

      // Espace → Play/Pause (hors mode édition)
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      // ← → Reculer de 5 secondes
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipAudio(-5);
        return;
      }

      // → → Avancer de 5 secondes
      if (e.key === "ArrowRight") {
        e.preventDefault();
        skipAudio(5);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor, showAudioPlayer, skipAudio]);

  // ─── Indicateur de statut de sauvegarde ─────────────────────────────────────

  const SaveStatusIndicator = () => {
    const configs = {
      saved: {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        label: "Sauvegardé",
        color: "text-emerald-500",
      },
      saving: {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        label: "Sauvegarde...",
        color: "text-amber-500",
      },
      unsaved: {
        icon: <Edit3 className="w-3.5 h-3.5" />,
        label: "Non sauvegardé",
        color: "text-orange-500",
      },
      error: {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        label: "Erreur",
        color: "text-red-500",
      },
    };
    const { icon, label, color } = configs[saveStatus];
    return (
      <span className={`flex items-center gap-1 text-xs ${color}`}>
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
    );
  };

  // ─── Calculs dérivés ─────────────────────────────────────────────────────────

  const currentText = editor?.getText() ?? initialText;
  const wordCount = countWords(currentText);
  const readingTime = estimateReadingTime(wordCount);
  const isModified = currentText !== originalText;
  const audioUrl = audioUrlQuery.data?.url;

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        {/* ── Barre d'outils ── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Gauche : statut + badges */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <SaveStatusIndicator />
            {isModified && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0 h-5 bg-purple-500/10 text-purple-400 border-purple-500/20"
              >
                Modifié
              </Badge>
            )}
            {lowConfidenceSegments.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowLowConfidence(!showLowConfidence)}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      showLowConfidence
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>{lowConfidenceSegments.length} à vérifier</span>
                    {showLowConfidence ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {showLowConfidence ? "Masquer" : "Afficher"} les passages à
                    faible confiance
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Droite : actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Lecteur audio synchronisé */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 ${showAudioPlayer ? "text-cyan-400" : ""}`}
                  onClick={() => setShowAudioPlayer(!showAudioPlayer)}
                >
                  <Music2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {showAudioPlayer ? "Masquer" : "Afficher"} le lecteur audio
                  synchronisé
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Rechercher/Remplacer */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rechercher / Remplacer (Ctrl+H)</p>
              </TooltipContent>
            </Tooltip>

            {/* Sauvegarder */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2"
                  onClick={handleSaveNow}
                  disabled={saveStatus === "saving" || !isDirty}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Sauvegarder</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sauvegarder (Ctrl+S)</p>
              </TooltipContent>
            </Tooltip>

            {/* Restaurer l'original */}
            {isModified && (
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">
                          Restaurer
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Restaurer le texte original</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Restaurer le texte original ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Toutes vos modifications seront supprimées et le texte
                      original de la transcription sera restauré. Cette action
                      est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestore}>
                      Restaurer l'original
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* ── Lecteur audio synchronisé ── */}
        <AnimatePresence>
          {showAudioPlayer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Music2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-xs font-medium text-cyan-400">
                    Lecture synchronisée
                  </span>
                  {allSegments.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · Edit-Sync actif
                    </span>
                  )}
                  {/* Toggle Edit-Sync auto-scroll */}
                  {allSegments.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setEditSyncEnabled(!editSyncEnabled)}
                          className={`ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            editSyncEnabled
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {editSyncEnabled ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">
                            Défilement auto
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {editSyncEnabled ? "Désactiver" : "Activer"} le
                          défilement automatique pendant la lecture
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {audioUrlQuery.isLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Chargement du fichier audio...</span>
                  </div>
                )}

                {!audioUrlQuery.isLoading && audioUrlQuery.isError && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-red-400">
                      Impossible de charger l'audio. Vérifiez votre connexion.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-cyan-400 hover:text-cyan-300"
                      onClick={() => audioUrlQuery.refetch()}
                    >
                      Réessayer
                    </Button>
                  </div>
                )}

                {!audioUrlQuery.isLoading &&
                  !audioUrlQuery.isError &&
                  !audioUrl && (
                    <div className="text-xs text-muted-foreground py-2">
                      Le fichier audio n'est plus disponible (expiré ou
                      supprimé).
                    </div>
                  )}

                {audioUrl && (
                  <>
                    {/* Élément audio caché */}
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={handleAudioTimeUpdate}
                      onLoadedMetadata={handleAudioLoadedMetadata}
                      onEnded={handleAudioEnded}
                      preload="metadata"
                    />

                    {/* Contrôles */}
                    <div className="flex flex-col gap-2">
                      {/* Barre de progression */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-10 shrink-0 text-right">
                          {formatTime(audioCurrentTime)}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={audioDuration || 100}
                          step={0.1}
                          value={audioCurrentTime}
                          onChange={handleSeek}
                          className="flex-1 h-1.5 accent-cyan-400 cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground w-10 shrink-0">
                          {formatTime(audioDuration)}
                        </span>
                      </div>

                      {/* Boutons de contrôle */}
                      <div className="flex items-center gap-2">
                        {/* Play/Pause */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          onClick={togglePlayPause}
                        >
                          {isAudioPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Volume */}
                        <button
                          onClick={toggleMute}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {audioMuted || audioVolume === 0 ? (
                            <VolumeX className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={audioMuted ? 0 : audioVolume}
                          onChange={handleVolumeChange}
                          className="w-16 h-1.5 accent-cyan-400 cursor-pointer"
                        />

                        {/* Segment actif */}
                        {currentSegmentIndex >= 0 &&
                          allSegments[currentSegmentIndex] && (
                            <span className="text-xs text-cyan-400/70 italic truncate ml-auto max-w-[200px]">
                              "
                              {allSegments[currentSegmentIndex].text.trim()}
                              "
                            </span>
                          )}
                      </div>
                    </div>
                  </>
                )}

                {/* Liste des segments cliquables (si segments disponibles) */}
                {audioUrl && allSegments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-cyan-500/10">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Cliquez sur un segment pour y accéder :
                    </p>
                    <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                      {allSegments.map((seg, idx) => (
                        <button
                          key={seg.id}
                          onClick={() => seekToSegment(seg)}
                          className={`flex items-start gap-2 text-left px-2 py-1 rounded text-xs transition-colors ${
                            idx === currentSegmentIndex
                              ? "bg-cyan-500/15 text-cyan-300"
                              : "hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <span className="shrink-0 text-cyan-500/60 w-10 text-right">
                            {formatTime(seg.start)}
                          </span>
                          <span
                            className={`line-clamp-1 ${isLowConfidence(seg) ? "text-amber-400/80" : ""}`}
                          >
                            {seg.text.trim()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Panneau Rechercher/Remplacer ── */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-muted/50 border border-border rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Rechercher / Remplacer
                  </span>
                  <button
                    onClick={() => setShowSearch(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Champ Rechercher avec croix de réinitialisation */}
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-8 px-3 pr-16 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {/* Compteur d'occurrences */}
                      {searchTerm && (
                        <span className="text-xs text-muted-foreground">
                          {matchCount > 0
                            ? `${currentMatch}/${matchCount}`
                            : "0"}
                        </span>
                      )}
                      {/* Bouton croix pour vider le champ */}
                      {searchTerm && (
                        <button
                          onClick={handleClearSearch}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Effacer la recherche"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Champ Remplacer */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Remplacer par..."
                      value={replaceTerm}
                      onChange={(e) => setReplaceTerm(e.target.value)}
                      className="w-full h-8 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs shrink-0"
                    onClick={handleReplaceAll}
                    disabled={!searchTerm.trim() || matchCount === 0}
                  >
                    Tout remplacer
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Segments à faible confiance ── */}
        <AnimatePresence>
          {showLowConfidence && lowConfidenceSegments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-amber-400">
                    {lowConfidenceSegments.length} passage
                    {lowConfidenceSegments.length > 1 ? "s" : ""} à vérifier
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {lowConfidenceSegments.map((seg) => (
                    <div key={seg.id} className="flex items-start gap-2">
                      <button
                        onClick={() =>
                          audioUrl ? seekToSegment(seg) : undefined
                        }
                        className={`text-xs text-amber-500/70 shrink-0 mt-0.5 ${audioUrl ? "hover:text-amber-400 cursor-pointer" : "cursor-default"}`}
                        title={
                          audioUrl ? "Cliquer pour écouter ce passage" : ""
                        }
                      >
                        {formatTime(seg.start)}
                      </button>
                      <span className="text-xs text-muted-foreground italic line-clamp-2 flex-1">
                        "{seg.text.trim()}"
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-amber-500/70 shrink-0 cursor-help">
                            {seg.avg_logprob !== undefined
                              ? `${Math.round(Math.exp(seg.avg_logprob) * 100)}%`
                              : "?"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatConfidence(seg)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Zone d'édition principale (Tiptap) ── */}
        <div className="relative" ref={editorContainerRef}>
          <div
            className={`w-full bg-background border rounded-lg transition-colors overflow-y-auto max-h-[600px] ${
              isEditing
                ? "border-ring ring-1 ring-ring"
                : "border-border hover:border-ring/50"
            }`}
          >
            <EditorContent editor={editor} />
          </div>
          {/* Indicateur de focus discret */}
          {isEditing && (
            <div className="absolute top-2 right-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}
          {/* Indicateur Edit-Sync actif */}
          {currentSegmentIndex >= 0 &&
            allSegments[currentSegmentIndex] && (
              <div className="absolute bottom-2 right-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
            )}
        </div>

        {/* ── Contrôles tactiles flottants (mobile/tablette) ── */}
        <AnimatePresence>
          {showAudioPlayer && audioUrl && isTouchDevice && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="sticky bottom-0 z-20 pt-2"
            >
              <div className="audio-touch-controls flex items-center justify-center gap-1 bg-background/95 backdrop-blur-md border border-cyan-500/20 rounded-xl p-2 shadow-lg shadow-cyan-500/5">
                {/* Reculer 5s */}
                <button
                  onClick={() => { hapticFeedback(); skipAudio(-5); }}
                  className="touch-control-btn flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 active:bg-cyan-500/25 active:scale-95 transition-all"
                  aria-label="Reculer de 5 secondes"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={() => { hapticFeedback(); togglePlayPause(); }}
                  className="touch-control-btn flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-300 active:from-cyan-500/35 active:to-purple-500/35 active:scale-95 transition-all border border-cyan-500/20"
                  aria-label={isAudioPlaying ? "Pause" : "Lecture"}
                >
                  {isAudioPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </button>

                {/* Avancer 5s */}
                <button
                  onClick={() => { hapticFeedback(); skipAudio(5); }}
                  className="touch-control-btn flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 active:bg-cyan-500/25 active:scale-95 transition-all"
                  aria-label="Avancer de 5 secondes"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Indicateur de temps compact */}
                <div className="flex flex-col items-center ml-2 min-w-[52px]">
                  <span className="text-xs font-mono text-cyan-400">
                    {formatTime(audioCurrentTime)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    / {formatTime(audioDuration)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pied de page : compteur de mots + raccourcis ── */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {wordCount.toLocaleString("fr-FR")} mots · {readingTime} de lecture
          </span>
          {/* Desktop : afficher les raccourcis clavier */}
          {!isTouchDevice && (
            <span className="text-xs opacity-60 hidden sm:flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              {showAudioPlayer
                ? "Espace play/pause · ←→ ±5s · Ctrl+␣ en édition"
                : "Ctrl+S sauvegarder · Ctrl+H rechercher"}
            </span>
          )}
          {/* Mobile : indication tactile */}
          {isTouchDevice && showAudioPlayer && audioUrl && (
            <span className="text-xs opacity-60 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Contrôles tactiles actifs
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
