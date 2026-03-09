import { state, uid } from './state';
import { toDate, fromDate } from './dates';
import type { Deliverable, Row } from './types';
import { hitAreas, rowBounds, layoutCache, dragState, setDragState } from './drag-state';
import { renderCanvas } from './renderer';

export function canvasMouse(e: MouseEvent): { mx: number; my: number } {
  const canvas = document.getElementById('roadmap-canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  return {
    mx: (e.clientX - rect.left) * (canvas.width  / rect.width),
    my: (e.clientY - rect.top)  * (canvas.height / rect.height),
  };
}

export function computeSnapDate(canvasX: number): string {
  if (!layoutCache) return fromDate(new Date());
  const { chartLeft, chartWidth, dateStartMs, totalMs } = layoutCache;
  const ratio  = Math.max(0, Math.min(1, (canvasX - chartLeft) / chartWidth));
  const rawMs  = dateStartMs + ratio * totalMs;
  const dayMs  = 24 * 60 * 60 * 1000;

  if (state.sprints.length > 0) {
    const targets = state.sprints.map(s => toDate(s.start).getTime());
    let closest = targets[0], minDist = Infinity;
    for (const t of targets) {
      const dist = Math.abs(t - rawMs);
      if (dist < minDist) { minDist = dist; closest = t; }
    }
    return fromDate(new Date(closest));
  }

  return fromDate(new Date(Math.round(rawMs / dayMs) * dayMs));
}

export function initCanvasDrag(onChange: () => void): void {
  const canvas = document.getElementById('roadmap-canvas') as HTMLCanvasElement;

  canvas.addEventListener('mousemove', e => {
    if (dragState) return;
    const { mx, my } = canvasMouse(e);
    const hovering = hitAreas.some(
      h => mx >= h.x1 && mx <= h.x2 && my >= h.barTop && my <= h.barBottom
    );
    canvas.style.cursor = hovering ? 'grab' : 'default';
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return; // left click only
    const { mx, my } = canvasMouse(e);
    const hit = hitAreas.find(
      h => mx >= h.x1 && mx <= h.x2 && my >= h.barTop && my <= h.barBottom
    );
    if (!hit) return;
    e.preventDefault();

    const duration = +toDate(hit.d.end) - +toDate(hit.d.start);
    setDragState({
      d: hit.d,
      sourceRow: hit.row,
      targetRow: hit.row,
      offsetX: mx - hit.x1,
      duration,
      snapStart: hit.d.start,
      snapEnd:   hit.d.end,
    });
    canvas.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    renderCanvas();

    function onDragMove(ev: MouseEvent) {
      if (!dragState) return;
      const { mx: dmx, my: dmy } = canvasMouse(ev);
      const snapStart   = computeSnapDate(dmx - dragState.offsetX);
      const snapStartMs = toDate(snapStart).getTime();
      const snapEnd     = fromDate(new Date(snapStartMs + dragState.duration));

      let targetRow = dragState.sourceRow;
      for (const rb of rowBounds) {
        if (dmy >= rb.top && dmy < rb.top + rb.height) { targetRow = rb.row; break; }
      }

      setDragState({ ...dragState, snapStart, snapEnd, targetRow });
      renderCanvas();
    }

    function onDragEnd() {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup',   onDragEnd);
      document.body.style.cursor = '';
      canvas.style.cursor = 'default';

      if (dragState) {
        const { d, sourceRow, targetRow, snapStart, snapEnd } = dragState;
        d.start = snapStart;
        d.end   = snapEnd;
        if (targetRow.id !== sourceRow.id) {
          const idx = sourceRow.deliverables.indexOf(d);
          if (idx !== -1) sourceRow.deliverables.splice(idx, 1);
          targetRow.deliverables.push(d);
        }
        setDragState(null);
        onChange();
      }
    }

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
  });
}

// Returns the start/end date range of the sprint the given canvas X falls within.
// Falls back to a 2-week window from the clicked date if outside all sprints.
function detectSprintRange(canvasX: number): { start: string; end: string } {
  const dayMs = 24 * 60 * 60 * 1000;

  if (!layoutCache) {
    const today = fromDate(new Date());
    return { start: today, end: fromDate(new Date(Date.now() + 14 * dayMs)) };
  }

  const { chartLeft, chartWidth, dateStartMs, totalMs } = layoutCache;
  const ratio = Math.max(0, Math.min(1, (canvasX - chartLeft) / chartWidth));
  const rawMs = dateStartMs + ratio * totalMs;

  if (state.sprints.length > 0) {
    const sorted = [...state.sprints].sort((a, b) => +toDate(a.start) - +toDate(b.start));
    for (let i = 0; i < sorted.length; i++) {
      const sStart = +toDate(sorted[i].start);
      const sEnd   = i + 1 < sorted.length
        ? +toDate(sorted[i + 1].start)
        : dateStartMs + totalMs;
      if (rawMs >= sStart && rawMs < sEnd) {
        return { start: sorted[i].start, end: fromDate(new Date(sEnd)) };
      }
    }
  }

  // Outside all sprints or no sprints: 2-week window from click
  const startMs = Math.round(rawMs / dayMs) * dayMs;
  return { start: fromDate(new Date(startMs)), end: fromDate(new Date(startMs + 14 * dayMs)) };
}

export function initContextMenu(
  onChange: () => void,
  openAddDeliverable: (row: Row, start: string, end: string) => void,
  openEditDeliverable: (d: Deliverable, row: Row) => void,
): void {
  const canvas = document.getElementById('roadmap-canvas') as HTMLCanvasElement;
  const menu   = document.getElementById('context-menu')   as HTMLElement;

  let barTarget:   { d: Deliverable; row: Row }       | null = null;
  let blankTarget: { row: Row; start: string; end: string } | null = null;

  function showMenu(clientX: number, clientY: number, html: string): void {
    menu.innerHTML = html;
    // Clamp to viewport after inserting content so size is known
    menu.classList.remove('hidden');
    const { width, height } = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(clientX, window.innerWidth  - width  - 4)}px`;
    menu.style.top  = `${Math.min(clientY, window.innerHeight - height - 4)}px`;
  }

  function hideMenu(): void {
    menu.classList.add('hidden');
    barTarget   = null;
    blankTarget = null;
  }

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const { mx, my } = canvasMouse(e);

    const barHit = hitAreas.find(
      h => mx >= h.x1 && mx <= h.x2 && my >= h.barTop && my <= h.barBottom
    );

    if (barHit) {
      barTarget   = { d: barHit.d, row: barHit.row };
      blankTarget = null;
      showMenu(e.clientX, e.clientY, `
        <button data-action="edit">Edit</button>
        <button data-action="duplicate">Duplicate</button>
        <button data-action="delete">Delete</button>
      `);
      return;
    }

    if (layoutCache) {
      const { chartLeft, chartWidth } = layoutCache;
      const inChart = mx >= chartLeft && mx <= chartLeft + chartWidth;
      const rowHit  = rowBounds.find(rb => my >= rb.top && my < rb.top + rb.height);

      if (inChart && rowHit) {
        const { start, end } = detectSprintRange(mx);
        barTarget   = null;
        blankTarget = { row: rowHit.row, start, end };
        showMenu(e.clientX, e.clientY, `
          <button data-action="add-deliverable">Add Deliverable</button>
        `);
        return;
      }
    }

    hideMenu();
  });

  menu.addEventListener('click', e => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-action]');
    if (!btn) return;

    if (btn.dataset.action === 'edit' && barTarget) {
      openEditDeliverable(barTarget.d, barTarget.row);
    }

    if (btn.dataset.action === 'duplicate' && barTarget) {
      barTarget.row.deliverables.push({ ...barTarget.d, id: uid() });
      onChange();
    }

    if (btn.dataset.action === 'delete' && barTarget) {
      const idx = barTarget.row.deliverables.indexOf(barTarget.d);
      if (idx !== -1) barTarget.row.deliverables.splice(idx, 1);
      onChange();
    }

    if (btn.dataset.action === 'add-deliverable' && blankTarget) {
      const { row, start, end } = blankTarget;
      openAddDeliverable(row, start, end);
    }

    hideMenu();
  });

  document.addEventListener('click',   e => { if (!menu.contains(e.target as Node)) hideMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideMenu(); });
}

export function initPanelResize(): void {
  const handle    = document.querySelector('.panel-resize-handle') as HTMLElement;
  const editPanel = document.querySelector('.edit-panel') as HTMLElement;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = editPanel.offsetHeight;

    function onMove(ev: MouseEvent) {
      const h = Math.max(80, Math.min(500, startH + (ev.clientY - startY)));
      editPanel.style.height = `${h}px`;
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.body.style.cursor = '';
      renderCanvas();
    }

    document.body.style.cursor = 'ns-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}
