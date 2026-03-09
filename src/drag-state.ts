import type { HitArea, RowBound, LayoutCache, DragState } from './types';

export let hitAreas: HitArea[]       = [];
export let rowBounds: RowBound[]     = [];
export let layoutCache: LayoutCache | null = null;
export let dragState: DragState | null     = null;

export function setHitAreas(v: HitArea[]):             void { hitAreas    = v; }
export function setRowBounds(v: RowBound[]):           void { rowBounds   = v; }
export function setLayoutCache(v: LayoutCache | null): void { layoutCache = v; }
export function setDragState(v: DragState | null):     void { dragState   = v; }
