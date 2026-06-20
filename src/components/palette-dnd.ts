/** Shared contract between the Palette (drag source) and Editor (drop target). */

/** Node kinds the palette can place. Flows are drawn by connecting (F2). */
export type PlaceableKind = "stock" | "converter"

/** Custom MIME type carrying the kind across an HTML5 drag-and-drop. */
export const NODE_DND_MIME = "application/x-meadows-node"
