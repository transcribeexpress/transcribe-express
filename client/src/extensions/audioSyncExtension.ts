/**
 * Extension Tiptap : Audio Sync Highlight + Click-to-Seek
 *
 * Fonctionnalités :
 *  1. Surbrillance du segment Whisper actif pendant la lecture audio
 *     → Dispatcher setMeta(audioSyncPluginKey, { segmentIndex, segments })
 *
 *  2. Click-to-Seek : cliquer sur un paragraphe dans l'éditeur
 *     → identifie le segment Whisper correspondant
 *     → appelle onSegmentClick(segmentIndex, segment) pour positionner l'audio
 *     → flash visuel via meta CLICK_FLASH_META (transaction séparée, sans toucher segmentIndex)
 *
 * Correction du bug "repart à zéro" :
 *  - Le handleClick NE dispatche PLUS de transaction avec audioSyncPluginKey
 *    (cela écrasait le segmentIndex courant avant que le seek React ait eu le temps de s'appliquer)
 *  - Le flash visuel utilise exclusivement CLICK_FLASH_META, indépendant de l'état audio
 *  - L'état du plugin (segmentIndex, segments) n'est modifié QUE par les transactions
 *    venant de TranscriptionEditor (via audioSyncPluginKey meta)
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AudioSyncSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface AudioSyncMeta {
  /** Index du segment actif (-1 = aucun) */
  segmentIndex: number;
  /** Tous les segments Whisper */
  segments: AudioSyncSegment[];
}

/** Meta pour le flash de clic : indépendant de l'état audio */
interface ClickFlashMeta {
  /** Index du paragraphe cliqué (-1 = reset) */
  clickedIndex: number;
}

interface AudioSyncPluginState {
  decorationSet: DecorationSet;
  segmentIndex: number;
  /** Segments courants (pour le click-to-seek) */
  segments: AudioSyncSegment[];
  /** Index du segment en cours de "flash" après un clic */
  clickedSegmentIndex: number;
}

// ─── Clés du plugin ───────────────────────────────────────────────────────────

export const audioSyncPluginKey = new PluginKey<AudioSyncPluginState>(
  "audioSync"
);

/** Clé séparée pour le flash de clic — ne touche PAS à l'état audio */
export const CLICK_FLASH_META = "audioSyncClickFlash";

// ─── Helpers de position ─────────────────────────────────────────────────────

/**
 * Calcule les positions (from, to) d'un segment dans le document ProseMirror.
 * Stratégie 1 : index de paragraphe (1 paragraphe = 1 segment).
 * Stratégie 2 (fallback) : recherche textuelle si le document a été édité.
 */
function findSegmentPositions(
  doc: any,
  segmentIndex: number,
  segments: AudioSyncSegment[]
): { from: number; to: number } | null {
  if (segmentIndex < 0 || segmentIndex >= segments.length) return null;

  const segment = segments[segmentIndex];
  const segmentText = segment.text.trim();
  if (!segmentText) return null;

  // Stratégie 1 : index de paragraphe
  let paragraphIndex = 0;
  let found: { from: number; to: number } | null = null;

  doc.forEach((node: any, offset: number) => {
    if (found) return;
    if (node.type.name === "paragraph") {
      if (paragraphIndex === segmentIndex) {
        const from = offset + 1;
        const to = from + node.textContent.length;
        found = { from, to };
      }
      paragraphIndex++;
    }
  });

  if (found) return found;

  // Stratégie 2 (fallback) : recherche textuelle
  const fullText = doc.textContent;
  const searchText = segmentText.substring(0, 50);
  const textIndex = fullText.indexOf(searchText);
  if (textIndex === -1) return null;

  let startPos = -1;
  let endPos = -1;
  let charCount = 0;

  doc.descendants((node: any, nodePos: number) => {
    if (startPos !== -1 && endPos !== -1) return false;
    if (node.isText) {
      const nodeText = node.text || "";
      for (let i = 0; i < nodeText.length; i++) {
        if (charCount === textIndex) startPos = nodePos + i;
        if (charCount === textIndex + segmentText.length) {
          endPos = nodePos + i;
          return false;
        }
        charCount++;
      }
    }
    return true;
  });

  if (startPos !== -1) {
    return {
      from: startPos,
      to: endPos !== -1 ? endPos : startPos + segmentText.length,
    };
  }

  return null;
}

/**
 * Calcule les positions (from, to) d'un paragraphe entier par son index.
 * Utilisé pour les décorations de nœud (hover + flash).
 */
function findParagraphNodePositions(
  doc: any,
  paragraphIndex: number
): { from: number; to: number } | null {
  let idx = 0;
  let found: { from: number; to: number } | null = null;

  doc.forEach((node: any, offset: number) => {
    if (found) return;
    if (node.type.name === "paragraph") {
      if (idx === paragraphIndex) {
        found = { from: offset, to: offset + node.nodeSize };
      }
      idx++;
    }
  });

  return found;
}

/**
 * Résout l'index du paragraphe cliqué à partir d'une position ProseMirror.
 * Retourne -1 si le clic n'est pas dans un paragraphe.
 */
export function resolveParagraphIndex(doc: any, pos: number): number {
  let idx = 0;
  let found = -1;

  doc.forEach((node: any, offset: number) => {
    if (found !== -1) return;
    if (node.type.name === "paragraph") {
      const start = offset;
      const end = offset + node.nodeSize;
      if (pos >= start && pos < end) {
        found = idx;
      }
      idx++;
    }
  });

  return found;
}

// ─── Construction du DecorationSet ───────────────────────────────────────────

function buildDecorationSet(
  doc: any,
  segmentIndex: number,
  segments: AudioSyncSegment[],
  clickedSegmentIndex: number
): DecorationSet {
  const decorations: Decoration[] = [];

  // 1. Décoration inline : surbrillance du segment actif (lecture audio)
  if (segmentIndex >= 0) {
    const positions = findSegmentPositions(doc, segmentIndex, segments);
    if (positions) {
      decorations.push(
        Decoration.inline(positions.from, positions.to, {
          class: "active-segment-highlight",
          "data-segment-index": String(segmentIndex),
        })
      );
    }
  }

  // 2. Décoration de nœud : flash après un clic (seek)
  if (clickedSegmentIndex >= 0) {
    const nodePos = findParagraphNodePositions(doc, clickedSegmentIndex);
    if (nodePos) {
      decorations.push(
        Decoration.node(nodePos.from, nodePos.to, {
          class: "seek-flash-segment",
          "data-clicked-segment": String(clickedSegmentIndex),
        })
      );
    }
  }

  // 3. Décoration de nœud : curseur pointer + tooltip timestamp sur tous les paragraphes
  if (segments.length > 0) {
    let pIdx = 0;
    doc.forEach((node: any, offset: number) => {
      if (node.type.name === "paragraph" && pIdx < segments.length) {
        decorations.push(
          Decoration.node(offset, offset + node.nodeSize, {
            class: "seekable-paragraph",
            "data-paragraph-index": String(pIdx),
            title: `→ ${formatTimeShort(segments[pIdx].start)}`,
          })
        );
        pIdx++;
      }
    });
  }

  return DecorationSet.create(doc, decorations);
}

export function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Extension Tiptap ─────────────────────────────────────────────────────────

export interface AudioSyncOptions {
  /**
   * Callback appelé quand l'utilisateur clique sur un paragraphe.
   * Reçoit l'index du segment Whisper et le segment lui-même.
   */
  onSegmentClick: ((segmentIndex: number, segment: AudioSyncSegment) => void) | null;
}

export const AudioSyncExtension = Extension.create<AudioSyncOptions>({
  name: "audioSync",

  addOptions() {
    return {
      onSegmentClick: null,
    };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;

    return [
      new Plugin<AudioSyncPluginState>({
        key: audioSyncPluginKey,

        // ── État du plugin ──────────────────────────────────────────────────

        state: {
          init(): AudioSyncPluginState {
            return {
              decorationSet: DecorationSet.empty,
              segmentIndex: -1,
              segments: [],
              clickedSegmentIndex: -1,
            };
          },

          apply(tr, pluginState): AudioSyncPluginState {
            // ── Meta audioSync : mise à jour depuis l'audio (TranscriptionEditor) ──
            const audioMeta = tr.getMeta(audioSyncPluginKey) as
              | AudioSyncMeta
              | undefined;

            if (audioMeta !== undefined) {
              // Préserver le flash en cours si présent
              const clickedIdx = pluginState.clickedSegmentIndex;
              return {
                decorationSet: buildDecorationSet(
                  tr.doc,
                  audioMeta.segmentIndex,
                  audioMeta.segments,
                  clickedIdx
                ),
                segmentIndex: audioMeta.segmentIndex,
                segments: audioMeta.segments,
                clickedSegmentIndex: clickedIdx,
              };
            }

            // ── Meta flash : déclenché par le clic (indépendant de l'audio) ──
            const flashMeta = tr.getMeta(CLICK_FLASH_META) as
              | ClickFlashMeta
              | undefined;

            if (flashMeta !== undefined) {
              const newClickedIdx = flashMeta.clickedIndex;
              return {
                decorationSet: buildDecorationSet(
                  tr.doc,
                  pluginState.segmentIndex,
                  pluginState.segments,
                  newClickedIdx
                ),
                segmentIndex: pluginState.segmentIndex,
                segments: pluginState.segments,
                clickedSegmentIndex: newClickedIdx,
              };
            }

            // ── Document modifié par l'utilisateur → reconstruire les décorations ──
            if (tr.docChanged && pluginState.segments.length > 0) {
              return {
                decorationSet: buildDecorationSet(
                  tr.doc,
                  pluginState.segmentIndex,
                  pluginState.segments,
                  pluginState.clickedSegmentIndex
                ),
                segmentIndex: pluginState.segmentIndex,
                segments: pluginState.segments,
                clickedSegmentIndex: pluginState.clickedSegmentIndex,
              };
            }

            return pluginState;
          },
        },

        // ── Décorations ────────────────────────────────────────────────────

        props: {
          decorations(state) {
            return audioSyncPluginKey.getState(state)?.decorationSet;
          },

          // ── Click-to-Seek ───────────────────────────────────────────────
          //
          // IMPORTANT : ce handler NE dispatche PAS de transaction audioSyncPluginKey.
          // Il dispatche UNIQUEMENT CLICK_FLASH_META pour le flash visuel.
          // Le seek audio est géré exclusivement par onSegmentClick → React.
          // Cela évite le bug "repart à zéro" causé par un dispatch qui écrasait
          // le segmentIndex courant avant que le seek React ait eu le temps de s'appliquer.

          handleClick(view, pos, event) {
            // Ignorer les clics sur les contrôles UI
            const target = event.target as HTMLElement;
            if (
              target.tagName === "BUTTON" ||
              target.tagName === "INPUT" ||
              target.tagName === "A" ||
              target.closest("button") ||
              target.closest("input")
            ) {
              return false;
            }

            const pluginState = audioSyncPluginKey.getState(view.state);
            if (!pluginState || pluginState.segments.length === 0) return false;

            // Résoudre l'index du paragraphe cliqué
            const paragraphIdx = resolveParagraphIndex(view.state.doc, pos);
            if (paragraphIdx < 0 || paragraphIdx >= pluginState.segments.length) {
              return false;
            }

            const segment = pluginState.segments[paragraphIdx];

            // 1. Appeler le callback React pour le seek audio
            if (extensionOptions.onSegmentClick) {
              extensionOptions.onSegmentClick(paragraphIdx, segment);
            }

            // 2. Déclencher le flash visuel via CLICK_FLASH_META uniquement
            //    (ne touche PAS à segmentIndex ni à segments dans l'état du plugin)
            view.dispatch(
              view.state.tr.setMeta(CLICK_FLASH_META, {
                clickedIndex: paragraphIdx,
              })
            );

            // 3. Reset du flash après 600ms
            setTimeout(() => {
              if (view.isDestroyed) return;
              view.dispatch(
                view.state.tr.setMeta(CLICK_FLASH_META, { clickedIndex: -1 })
              );
            }, 600);

            // Retourner false pour ne pas bloquer la sélection de texte
            return false;
          },
        },
      }),
    ];
  },
});
