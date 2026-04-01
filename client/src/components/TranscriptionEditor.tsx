import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { motion, AnimatePresence } from "framer-motion";

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

/** Calcule le nombre de mots dans un texte */
function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

/** Durée estimée de lecture (200 mots/min) */
function estimateReadingTime(wordCount: number): string {
  const minutes = wordCount / 200;
  if (minutes < 1) return "< 1 min";
  return `${Math.round(minutes)} min`;
}

/** Détermine si un segment Whisper est à faible confiance */
function isLowConfidence(segment: WhisperSegment): boolean {
  // avg_logprob < -0.5 correspond à une confiance ~60% (seuil empirique)
  if (segment.avg_logprob !== undefined) {
    return segment.avg_logprob < -0.5;
  }
  return false;
}

/** Formate un score de confiance en pourcentage lisible */
function formatConfidence(segment: WhisperSegment): string {
  if (segment.avg_logprob !== undefined) {
    // Conversion logprob → probabilité approximative
    const prob = Math.exp(segment.avg_logprob);
    return `Confiance : ${Math.round(prob * 100)}%`;
  }
  return "Confiance inconnue";
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
  const [currentText, setCurrentText] = useState<string>(
    editedText ?? originalText
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [isEditing, setIsEditing] = useState(false);

  // Rechercher/Remplacer
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // Mise en évidence des segments à faible confiance
  const [showLowConfidence, setShowLowConfidence] = useState(true);
  const [lowConfidenceSegments, setLowConfidenceSegments] = useState<WhisperSegment[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Charger les segments Whisper
  useEffect(() => {
    if (segmentsData) {
      try {
        const segments: WhisperSegment[] = JSON.parse(segmentsData);
        const lowConf = segments.filter(isLowConfidence);
        setLowConfidenceSegments(lowConf);
      } catch {
        setLowConfidenceSegments([]);
      }
    }
  }, [segmentsData]);

  // Synchroniser si le texte externe change (ex: rechargement de la page)
  useEffect(() => {
    const incoming = editedText ?? originalText;
    setCurrentText(incoming);
    setIsDirty(false);
    setSaveStatus("saved");
  }, [editedText, originalText]);

  // Auto-resize du textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [currentText, autoResize]);

  // Comptage des occurrences de recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }
    try {
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = currentText.match(regex);
      setMatchCount(matches ? matches.length : 0);
      setCurrentMatch(matches && matches.length > 0 ? 1 : 0);
    } catch {
      setMatchCount(0);
    }
  }, [searchTerm, currentText]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCurrentText(newText);
    setIsDirty(true);
    setSaveStatus("unsaved");
    onTextChange?.(newText);

    // Auto-sauvegarde avec debounce 2s
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSaveStatus("saving");
      updateMutation.mutate({ id: transcriptionId, editedText: newText });
    }, 2000);
  };

  const handleSaveNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("saving");
    updateMutation.mutate({ id: transcriptionId, editedText: currentText });
  };

  const handleRestore = () => {
    setCurrentText(originalText);
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
    if (!searchTerm.trim()) return;
    try {
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const newText = currentText.replace(regex, replaceTerm);
      const count = (currentText.match(regex) || []).length;
      setCurrentText(newText);
      setIsDirty(true);
      setSaveStatus("unsaved");
      onTextChange?.(newText);
      toast.success(`${count} remplacement${count > 1 ? "s" : ""} effectué${count > 1 ? "s" : ""}`, {
        description: `"${searchTerm}" → "${replaceTerm}"`,
      });
      // Auto-sauvegarde après remplacement
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateMutation.mutate({ id: transcriptionId, editedText: newText });
      }, 1000);
    } catch {
      toast.error("Expression de recherche invalide");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+H → ouvrir rechercher/remplacer
    if ((e.ctrlKey || e.metaKey) && e.key === "h") {
      e.preventDefault();
      setShowSearch(true);
    }
    // Ctrl+S → sauvegarder
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSaveNow();
    }
  };

  // ─── Rendu du statut de sauvegarde ──────────────────────────────────────────

  const SaveStatusIndicator = () => {
    const configs = {
      saved: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Sauvegardé", color: "text-emerald-500" },
      saving: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Sauvegarde...", color: "text-amber-500" },
      unsaved: { icon: <Edit3 className="w-3.5 h-3.5" />, label: "Non sauvegardé", color: "text-orange-500" },
      error: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Erreur", color: "text-red-500" },
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

  const wordCount = countWords(currentText);
  const readingTime = estimateReadingTime(wordCount);
  const isModified = currentText !== originalText;

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        {/* ── Barre d'outils ── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Gauche : statut + badge modifié */}
          <div className="flex items-center gap-2 min-w-0">
            <SaveStatusIndicator />
            {isModified && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-purple-500/10 text-purple-400 border-purple-500/20">
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
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>{lowConfidenceSegments.length} à vérifier</span>
                    {showLowConfidence ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showLowConfidence ? "Masquer" : "Afficher"} les passages à faible confiance</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Droite : actions */}
          <div className="flex items-center gap-1.5 shrink-0">
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
              <TooltipContent><p>Rechercher / Remplacer (Ctrl+H)</p></TooltipContent>
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
              <TooltipContent><p>Sauvegarder (Ctrl+S)</p></TooltipContent>
            </Tooltip>

            {/* Restaurer l'original */}
            {isModified && (
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Restaurer</span>
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Restaurer le texte original</p></TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restaurer le texte original ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Toutes vos modifications seront supprimées et le texte original de la transcription sera restauré. Cette action est irréversible.
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
                  <span className="text-xs font-medium text-muted-foreground">Rechercher / Remplacer</span>
                  <button onClick={() => setShowSearch(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-8 px-3 pr-16 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                    />
                    {searchTerm && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {matchCount > 0 ? `${currentMatch}/${matchCount}` : "0"}
                      </span>
                    )}
                  </div>
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
                    {lowConfidenceSegments.length} passage{lowConfidenceSegments.length > 1 ? "s" : ""} à vérifier
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {lowConfidenceSegments.map((seg) => (
                    <div key={seg.id} className="flex items-start gap-2">
                      <span className="text-xs text-amber-500/70 shrink-0 mt-0.5">
                        {Math.floor(seg.start / 60)}:{String(Math.floor(seg.start % 60)).padStart(2, "0")}
                      </span>
                      <span className="text-xs text-muted-foreground italic line-clamp-2">
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

        {/* ── Zone d'édition principale ── */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            placeholder="Le texte de la transcription apparaîtra ici..."
            className={`w-full min-h-[200px] p-4 text-sm leading-relaxed bg-background border rounded-lg resize-none focus:outline-none transition-colors ${
              isEditing
                ? "border-ring ring-1 ring-ring"
                : "border-border hover:border-ring/50"
            }`}
            style={{ overflow: "hidden" }}
            spellCheck
            lang="fr"
          />
          {/* Indicateur de focus discret */}
          {isEditing && (
            <div className="absolute top-2 right-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* ── Pied de page : compteur de mots ── */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{wordCount.toLocaleString("fr-FR")} mots · {readingTime} de lecture</span>
          <span className="text-xs opacity-60 hidden sm:block">Ctrl+S pour sauvegarder · Ctrl+H pour rechercher</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
