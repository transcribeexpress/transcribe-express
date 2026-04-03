/**
 * Extension Tiptap : Audio Sync Highlight
 *
 * Applique une décoration <mark> sur le segment Whisper actif
 * pendant la lecture audio. Utilise un ProseMirror Plugin avec
 * DecorationSet pour une surbrillance performante sans re-render React.
 *
 * Usage :
 *   1. Ajouter AudioSyncExtension aux extensions Tiptap
 *   2. Dispatcher une transaction avec setMeta('audioSync', { segmentIndex, segments })
 *      pour mettre à jour la surbrillance
 *   3. Le plugin calcule les positions (from, to) du segment actif dans le document
 *      et applique Decoration.inline avec la classe CSS 'active-segment-highlight'
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
}

// ─── Clé du plugin ────────────────────────────────────────────────────────────

export const audioSyncPluginKey = new PluginKey<AudioSyncPluginState>(
  "audioSync"
);

// ─── Calcul des positions ─────────────────────────────────────────────────────

/**
 * Calcule les positions (from, to) d'un segment dans le document ProseMirror.
 *
 * Stratégie : le document est structuré en paragraphes, un par segment.
 * On parcourt les nœuds enfants du document pour trouver le paragraphe
 * correspondant à l'index du segment.
 *
 * Si le document n'a pas le même nombre de paragraphes que de segments
 * (l'utilisateur a ajouté/supprimé des lignes), on utilise un fallback
 * basé sur la recherche textuelle du contenu du segment.
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

  // Stratégie 1 : mapper par index de paragraphe
  let paragraphIndex = 0;
  let found: { from: number; to: number } | null = null;

  doc.forEach((node: any, offset: number) => {
    if (found) return;
    if (node.type.name === "paragraph") {
      if (paragraphIndex === segmentIndex) {
        // Position du contenu du paragraphe (offset + 1 pour entrer dans le nœud)
        const from = offset + 1;
        const to = from + node.textContent.length;
        found = { from, to };
      }
      paragraphIndex++;
    }
  });

  if (found) return found;

  // Stratégie 2 (fallback) : recherche textuelle dans le document entier
  const fullText = doc.textContent;
  const searchText = segmentText.substring(0, 50); // Premiers 50 caractères pour éviter les faux négatifs
  const textIndex = fullText.indexOf(searchText);

  if (textIndex === -1) return null;

  // Convertir l'index textuel en position ProseMirror
  let pos = 0;
  let charCount = 0;
  let startPos = -1;
  let endPos = -1;

  doc.descendants((node: any, nodePos: number) => {
    if (startPos !== -1 && endPos !== -1) return false;

    if (node.isText) {
      const nodeText = node.text || "";
      for (let i = 0; i < nodeText.length; i++) {
        if (charCount === textIndex) {
          startPos = nodePos + i;
        }
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

// ─── Extension Tiptap ─────────────────────────────────────────────────────────

export const AudioSyncExtension = Extension.create({
  name: "audioSync",

  addProseMirrorPlugins() {
    return [
      new Plugin<AudioSyncPluginState>({
        key: audioSyncPluginKey,

        state: {
          init(): AudioSyncPluginState {
            return {
              decorationSet: DecorationSet.empty,
              segmentIndex: -1,
            };
          },

          apply(tr, pluginState): AudioSyncPluginState {
            const meta = tr.getMeta(audioSyncPluginKey) as
              | AudioSyncMeta
              | undefined;

            if (meta !== undefined) {
              const { segmentIndex, segments } = meta;

              // Aucun segment actif → vider les décorations
              if (segmentIndex < 0) {
                return {
                  decorationSet: DecorationSet.empty,
                  segmentIndex: -1,
                };
              }

              // Calculer les positions du segment actif
              const positions = findSegmentPositions(
                tr.doc,
                segmentIndex,
                segments
              );

              if (!positions) {
                return {
                  decorationSet: DecorationSet.empty,
                  segmentIndex,
                };
              }

              // Créer la décoration inline
              const decoration = Decoration.inline(
                positions.from,
                positions.to,
                {
                  class: "active-segment-highlight",
                  "data-segment-index": String(segmentIndex),
                }
              );

              return {
                decorationSet: DecorationSet.create(tr.doc, [decoration]),
                segmentIndex,
              };
            }

            // Pas de meta audioSync → mapper les décorations existantes
            // (quand le document change par édition utilisateur)
            if (tr.docChanged) {
              return {
                decorationSet: pluginState.decorationSet.map(
                  tr.mapping,
                  tr.doc
                ),
                segmentIndex: pluginState.segmentIndex,
              };
            }

            return pluginState;
          },
        },

        props: {
          decorations(state) {
            return audioSyncPluginKey.getState(state)?.decorationSet;
          },
        },
      }),
    ];
  },
});
