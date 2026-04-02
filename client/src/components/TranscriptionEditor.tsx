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

// ─── Composant principal ──────────────────────────────────────────────────────

export function TranscriptionEditor({
  transcriptionId,
  originalText,
  editedText,
  segmentsData,
  onTextChange,
}: TranscriptionEditorProps) {
  // État de l'éditeur
  const [currentText, setCurrentText] = useState<string>(editedText ?? originalText);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [isEditing, setIsEditing] = useState(false);

  // Rechercher/Remplacer
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // Segments Whisper
  const [showLowConfidence, setShowLowConfidence] = useState(true);
  const [lowConfidenceSegments, setLowConfidenceSegments] = useState<WhisperSegment[]>([]);
  const [allSegments, setAllSegments] = useState<WhisperSegment[]>([]);

  // Lecteur audio synchronisé
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      staleTime: 5 * 60 * 1000, // 5 min (URL signée valide)
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

  // Synchroniser si le texte externe change
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

  // Synchronisation audio → segment actif
  useEffect(() => {
    if (!isAudioPlaying || allSegments.length === 0) return;

    const idx = allSegments.findIndex(
      (seg) => audioCurrentTime >= seg.start && audioCurrentTime < seg.end
    );
    if (idx !== currentSegmentIndex) {
      setCurrentSegmentIndex(idx);
    }
  }, [audioCurrentTime, allSegments, isAudioPlaying, currentSegmentIndex]);

  // ─── Handlers audio ─────────────────────────────────────────────────────────

  const handleAudioTimeUpdate = () => {
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
    setCurrentSegmentIndex(-1);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
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
  const seekToSegment = (segment: WhisperSegment) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = segment.start;
    setAudioCurrentTime(segment.start);
    if (!isAudioPlaying) {
      audio.play().catch(() => {});
      setIsAudioPlaying(true);
    }
  };

  // ─── Handlers éditeur ───────────────────────────────────────────────────────

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCurrentText(newText);
    setIsDirty(true);
    setSaveStatus("unsaved");
    onTextChange?.(newText);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "h") {
      e.preventDefault();
      setShowSearch(true);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSaveNow();
    }
  };

  // ─── Indicateur de statut de sauvegarde ─────────────────────────────────────

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
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
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
              <TooltipContent><p>{showAudioPlayer ? "Masquer" : "Afficher"} le lecteur audio synchronisé</p></TooltipContent>
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
                  <span className="text-xs font-medium text-cyan-400">Lecture synchronisée</span>
                  {allSegments.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · Le texte suit la lecture audio
                    </span>
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

                {!audioUrlQuery.isLoading && !audioUrlQuery.isError && !audioUrl && (
                  <div className="text-xs text-muted-foreground py-2">
                    Le fichier audio n'est plus disponible (expiré ou supprimé).
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
                          {isAudioPlaying
                            ? <Pause className="w-4 h-4" />
                            : <Play className="w-4 h-4" />
                          }
                        </Button>

                        {/* Volume */}
                        <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors">
                          {audioMuted || audioVolume === 0
                            ? <VolumeX className="w-3.5 h-3.5" />
                            : <Volume2 className="w-3.5 h-3.5" />
                          }
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
                        {currentSegmentIndex >= 0 && allSegments[currentSegmentIndex] && (
                          <span className="text-xs text-cyan-400/70 italic truncate ml-auto max-w-[200px]">
                            "{allSegments[currentSegmentIndex].text.trim()}"
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
                          <span className={`line-clamp-1 ${isLowConfidence(seg) ? "text-amber-400/80" : ""}`}>
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
                  <span className="text-xs font-medium text-muted-foreground">Rechercher / Remplacer</span>
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
                          {matchCount > 0 ? `${currentMatch}/${matchCount}` : "0"}
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
                    {lowConfidenceSegments.length} passage{lowConfidenceSegments.length > 1 ? "s" : ""} à vérifier
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {lowConfidenceSegments.map((seg) => (
                    <div key={seg.id} className="flex items-start gap-2">
                      <button
                        onClick={() => audioUrl ? seekToSegment(seg) : undefined}
                        className={`text-xs text-amber-500/70 shrink-0 mt-0.5 ${audioUrl ? "hover:text-amber-400 cursor-pointer" : "cursor-default"}`}
                        title={audioUrl ? "Cliquer pour écouter ce passage" : ""}
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
          {/* Segment actif en lecture */}
          {isAudioPlaying && currentSegmentIndex >= 0 && allSegments[currentSegmentIndex] && (
            <div className="absolute bottom-2 right-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* ── Pied de page : compteur de mots ── */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{wordCount.toLocaleString("fr-FR")} mots · {readingTime} de lecture</span>
          <span className="text-xs opacity-60 hidden sm:block">Ctrl+S sauvegarder · Ctrl+H rechercher</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
