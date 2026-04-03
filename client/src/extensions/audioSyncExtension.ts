/**
 * Extension Tiptap : Audio Sync Highlight + Click-to-Seek
 *
 * Fonctionnalités :
 *  1. Surbrillance du segment Whisper actif pendant la lecture audio
 *     → Dispatcher setMeta(audioSyncPluginKey, { segmentIndex, segments })
 *
 *  2. Click-to-Seek : cliquer sur un paragraphe dans l'éditeur
 *     → identifie le segment Whisper correspondant
 *     → appelle onSegmentClick(segmentIndex) pour positionner l'audio
 *
 * Architecture :
 *  - ProseMirror Plugin avec DecorationSet pour la surbrillance (sans re-render React)
 *  - handleClick ProseMirror pour intercepter les clics et résoudre le segment
 *  - Decoration.node sur le paragraphe actif pour l'indicateur hover
 *  - Callback onSegmentClick injecté via les options de l'extension
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

interface AudioSyncPluginState {
  decorationSet: DecorationSet;
  segmentIndex: number;
  /** Segments courants (pour le click-to-seek) */
  segments: AudioSyncSegment[];
  /** Index du segment en cours de "flash" après un clic */
  clickedSegmentIndex: number;
}

// ─── Clé du plugin ────────────────────────────────────────────────────────────

export const audioSyncPluginKey = new PluginKey<AudioSyncPluginState>(
  "audioSync"
);

// ─── Meta pour le flash de clic ───────────────────────────────────────────────

export const CLICK_FLASH_META = "audioSyncClickFlash";

// ─── Calcul des positions du segment actif ───────────────────────────────────

/**
 * Calcule les positions (from, to) d'un segment dans le document ProseMirror.
 *
 * Stratégie 1 : mapper par index de paragraphe (1 paragraphe = 1 segment).
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
        // Decoration.node prend les positions du nœud entier (offset, offset + nodeSize)
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
function resolveParagraphIndex(doc: any, pos: number): number {
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

  // 3. Décoration de nœud : indicateur hover sur tous les paragraphes avec segment
  //    (uniquement si des segments sont disponibles)
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

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Extension Tiptap ─────────────────────────────────────────────────────────

export interface AudioSyncOptions {
  /**
   * Callback appelé quand l'utilisateur clique sur un paragraphe.
   * Reçoit l'index du segment Whisper correspondant.
   * Retourner false pour annuler le comportement par défaut.
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
    // Capturer la référence aux options pour le closure du plugin
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
            // Meta audioSync : mise à jour du segment actif (depuis l'audio)
            const meta = tr.getMeta(audioSyncPluginKey) as
              | AudioSyncMeta
              | undefined;

            // Meta flash : reset du flash après animation
            const flashMeta = tr.getMeta(CLICK_FLASH_META) as
              | { reset: boolean }
              | undefined;

            if (meta !== undefined) {
              const { segmentIndex, segments } = meta;
              const clickedIdx = flashMeta?.reset
                ? -1
                : pluginState.clickedSegmentIndex;

              return {
                decorationSet: buildDecorationSet(
                  tr.doc,
                  segmentIndex,
                  segments,
                  clickedIdx
                ),
                segmentIndex,
                segments,
                clickedSegmentIndex: clickedIdx,
              };
            }

            // Reset du flash
            if (flashMeta?.reset) {
              return {
                decorationSet: buildDecorationSet(
                  tr.doc,
                  pluginState.segmentIndex,
                  pluginState.segments,
                  -1
                ),
                segmentIndex: pluginState.segmentIndex,
                segments: pluginState.segments,
                clickedSegmentIndex: -1,
              };
            }

            // Document modifié par l'utilisateur → mapper les décorations
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

          handleClick(view, pos, event) {
            // Ignorer les clics sur les contrôles UI (boutons, inputs, etc.)
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

            // Appeler le callback onSegmentClick
            if (extensionOptions.onSegmentClick) {
              extensionOptions.onSegmentClick(paragraphIdx, segment);
            }

            // Appliquer le flash visuel sur le paragraphe cliqué
            const { tr } = view.state;
            const currentSegIdx = pluginState.segmentIndex;
            const currentSegs = pluginState.segments;

            // Construire un nouveau DecorationSet avec le flash
            const newDecorationSet = buildDecorationSet(
              tr.doc,
              currentSegIdx,
              currentSegs,
              paragraphIdx
            );

            const flashTr = view.state.tr;
            flashTr.setMeta(audioSyncPluginKey, {
              segmentIndex: currentSegIdx,
              segments: currentSegs,
            });

            // Dispatcher une transaction pour déclencher le flash
            // On utilise un mécanisme séparé pour éviter les conflits avec l'état audio
            view.dispatch(
              view.state.tr.setMeta(audioSyncPluginKey, {
                segmentIndex: currentSegIdx,
                segments: currentSegs,
              })
            );

            // Reset du flash après 600ms
            setTimeout(() => {
              if (view.isDestroyed) return;
              view.dispatch(
                view.state.tr.setMeta(CLICK_FLASH_META, { reset: true })
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
