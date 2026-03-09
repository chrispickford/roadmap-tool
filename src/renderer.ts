import type { Row, RowLayout } from './types';
import { state } from './state';
import { toDate } from './dates';
import { assignTracks } from './tracks';
import {
  hitAreas, rowBounds, layoutCache, dragState,
  setHitAreas, setRowBounds, setLayoutCache,
} from './drag-state';

// ── Canvas constants ──────────────────────────────────────────────────────────
export const MIN_TRACK_H     = 28;
export const TRACK_GAP       = 4;
export const ROW_PAD         = 10;
export const TEXT_PAD_H      = 6;
export const TEXT_PAD_V      = 4;
export const LINE_H          = 13;
export const LABEL_SIZE      = 10;
export const LEFT_PAD        = 130;
export const RIGHT_PAD       = 20;
export const TITLE_H         = 40;
export const SPRINT_H        = 30;
export const MILESTONE_ROW_H = 55;
export const AXIS_H          = 40;

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  ctx.font = `${LABEL_SIZE}px sans-serif`;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function computeRowLayout(
  ctx: CanvasRenderingContext2D,
  row: Row,
  dateToX: (d: string | Date) => number
): RowLayout {
  const { numTracks, trackMap } = assignTracks(row.deliverables);
  const trackHeights = new Array<number>(numTracks).fill(MIN_TRACK_H);

  row.deliverables.forEach(d => {
    const t = trackMap.get(d.id) ?? 0;
    const barW = dateToX(d.end) - dateToX(d.start) - 2;
    if (barW > TEXT_PAD_H * 2) {
      const nLines = wrapText(ctx, d.label, barW - TEXT_PAD_H * 2).length;
      const h = Math.max(MIN_TRACK_H, nLines * LINE_H + TEXT_PAD_V * 2);
      trackHeights[t] = Math.max(trackHeights[t], h);
    }
  });

  const totalH =
    trackHeights.reduce((s, h) => s + h, 0) +
    Math.max(0, numTracks - 1) * TRACK_GAP +
    ROW_PAD * 2;

  return { numTracks, trackMap, trackHeights, totalH };
}

export function drawGhostBar(ctx: CanvasRenderingContext2D): void {
  if (!dragState || !layoutCache) return;
  const { snapStart, snapEnd, targetRow } = dragState;
  const { chartLeft, chartWidth, dateStartMs, totalMs } = layoutCache;

  const xFor = (str: string) =>
    chartLeft + ((toDate(str).getTime() - dateStartMs) / totalMs) * chartWidth;

  const rb = rowBounds.find(r => r.row.id === targetRow.id);
  if (!rb) return;

  const x1 = xFor(snapStart);
  const x2 = xFor(snapEnd);
  const w  = x2 - x1 - 2;
  if (w < 1) return;

  const barTop = rb.top + ROW_PAD;
  const barH   = MIN_TRACK_H;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = targetRow.color;
  ctx.beginPath();
  ctx.roundRect(x1 + 1, barTop, w, barH, 4);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = targetRow.color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  canvasWidth: number,
  updateLayout = false
): void {
  const ctx = canvas.getContext('2d')!;

  const dateStart = toDate(state.dateStart);
  const dateEnd   = toDate(state.dateEnd);
  const totalMs   = +dateEnd - +dateStart;
  if (totalMs <= 0) return;
  const chartWidth = canvasWidth - LEFT_PAD - RIGHT_PAD;
  const chartLeft  = LEFT_PAD;

  const dateToX = (dateOrStr: string | Date): number => {
    const d = typeof dateOrStr === 'string' ? toDate(dateOrStr) : dateOrStr;
    return chartLeft + ((+d - +dateStart) / totalMs) * chartWidth;
  };

  // Pass 1: compute row layouts using ctx for text measurement
  const rowLayouts = state.rows.map(row => computeRowLayout(ctx, row, dateToX));
  const totalRowsH = rowLayouts.reduce((s, l) => s + l.totalH, 0);

  // Pass 2: set canvas dimensions, then draw
  canvas.width  = canvasWidth;
  canvas.height = TITLE_H + SPRINT_H + MILESTONE_ROW_H + totalRowsH + AXIS_H;

  const contentTop = TITLE_H;
  const msRowTop   = contentTop + SPRINT_H;
  const dataTop    = msRowTop + MILESTONE_ROW_H;
  const axisY      = dataTop + totalRowsH;

  if (updateLayout) {
    setHitAreas([]);
    setRowBounds([]);
    setLayoutCache({ chartLeft, chartWidth, dateStartMs: +dateStart, totalMs, dataTop });
  }

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#111';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.title, canvasWidth / 2, TITLE_H - 10);

  // Sprint columns + headers
  const sortedSprints = [...state.sprints].sort((a, b) => +toDate(a.start) - +toDate(b.start));

  sortedSprints.forEach((sprint, i) => {
    const x1 = dateToX(sprint.start);
    const x2 = sortedSprints[i + 1] ? dateToX(sortedSprints[i + 1].start) : chartLeft + chartWidth;

    ctx.fillStyle = i % 2 === 0 ? '#f8f8f8' : '#ffffff';
    ctx.fillRect(x1, dataTop, x2 - x1, totalRowsH);

    ctx.fillStyle = i % 2 === 0 ? '#f0f0f0' : '#fafafa';
    ctx.fillRect(x1, contentTop, x2 - x1, SPRINT_H);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, contentTop, x2 - x1, SPRINT_H);

    ctx.fillStyle = '#444';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sprint.label, (x1 + x2) / 2, contentTop + SPRINT_H / 2 + 4);
  });

  // Left header column background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, contentTop, chartLeft, SPRINT_H + MILESTONE_ROW_H + totalRowsH);

  // Milestones swimlane
  ctx.fillStyle = '#fff5f5';
  ctx.fillRect(chartLeft, msRowTop, chartWidth, MILESTONE_ROW_H);

  ctx.strokeStyle = '#e8c8c8';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, msRowTop); ctx.lineTo(canvasWidth, msRowTop); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, msRowTop + MILESTONE_ROW_H); ctx.lineTo(canvasWidth, msRowTop + MILESTONE_ROW_H); ctx.stroke();

  ctx.fillStyle = '#c06060';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Milestones', chartLeft - 10, msRowTop + MILESTONE_ROW_H / 2 + 4);

  state.milestones.forEach(m => {
    const x = dateToX(m.date);
    ctx.strokeStyle = '#e03030';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(x, msRowTop); ctx.lineTo(x, dataTop + totalRowsH); ctx.stroke();
    ctx.setLineDash([]);
  });

  state.milestones.forEach(m => {
    const x  = dateToX(m.date);
    const dy = msRowTop + 16;

    ctx.fillStyle = '#e03030';
    ctx.beginPath();
    ctx.moveTo(x,     dy - 9);
    ctx.lineTo(x + 8, dy);
    ctx.lineTo(x,     dy + 9);
    ctx.lineTo(x - 8, dy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#cc2020';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    m.label.split('\n').forEach((line, li) => {
      ctx.fillText(line, x, dy + 16 + li * 11);
    });
  });

  // Data rows
  let rowTop = dataTop;

  state.rows.forEach((row, ri) => {
    const { trackMap, trackHeights, totalH } = rowLayouts[ri];

    if (updateLayout) {
      rowBounds.push({ row, top: rowTop, height: totalH });
    }

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, rowTop + totalH); ctx.lineTo(canvasWidth, rowTop + totalH); ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(row.label, chartLeft - 10, rowTop + totalH / 2 + 5);

    row.deliverables.forEach(d => {
      const trackIdx = trackMap.get(d.id) ?? 0;
      let barTop = rowTop + ROW_PAD;
      for (let t = 0; t < trackIdx; t++) barTop += trackHeights[t] + TRACK_GAP;
      const barH = trackHeights[trackIdx];

      const x1 = dateToX(d.start);
      const x2 = dateToX(d.end);
      const w  = x2 - x1 - 2;
      if (w < 1) return;

      const isDragging = dragState !== null && dragState.d.id === d.id;

      ctx.save();
      if (isDragging) ctx.globalAlpha = 0.25;
      ctx.fillStyle = row.color;
      ctx.beginPath();
      ctx.roundRect(x1 + 1, barTop, w, barH, 4);
      ctx.fill();
      ctx.restore();

      if (updateLayout) {
        hitAreas.push({ d, row, x1: x1 + 1, barTop, x2, barBottom: barTop + barH });
      }

      if (!isDragging) {
        const textW      = Math.max(0, w - TEXT_PAD_H * 2);
        const lines      = wrapText(ctx, d.label, textW);
        const textBlockH = lines.length * LINE_H;
        const firstBase  = barTop + (barH - textBlockH) / 2 + LINE_H - 3;
        const cx         = x1 + 1 + w / 2;

        ctx.fillStyle = '#fff';
        ctx.font = `${LABEL_SIZE}px sans-serif`;
        ctx.textAlign = 'center';
        lines.forEach((line, li) => ctx.fillText(line, cx, firstBase + li * LINE_H));
      }
    });

    rowTop += totalH;
  });

  if (dragState) drawGhostBar(ctx);

  // Date axis
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(chartLeft, axisY); ctx.lineTo(chartLeft + chartWidth, axisY); ctx.stroke();

  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  let tick = new Date(dateStart);
  while (tick <= dateEnd) {
    const x = dateToX(tick);
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, axisY); ctx.lineTo(x, axisY + 5); ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      tick.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      x, axisY + 16
    );
    tick = new Date(tick.getTime() + oneWeek);
  }
}

export function getCanvasWidth(): number {
  const container = document.getElementById('roadmap-container')!;
  return Math.max(600, container.clientWidth - 32);
}

export function renderCanvas(): void {
  renderToCanvas(
    document.getElementById('roadmap-canvas') as HTMLCanvasElement,
    getCanvasWidth(),
    true
  );
}
