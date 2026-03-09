import { state, uid, restoreState, saveToLocalStorage } from './state';
import { toDate } from './dates';
import { renderCanvas, renderToCanvas, getCanvasWidth } from './renderer';
import { openModal, closeModal, handleModalSave, handleModalDelete } from './modal';
import { selectedRowId, setSelectedRowId, renderConfig, renderDeliverables } from './config-ui';
import { initCanvasDrag, initContextMenu, initPanelResize } from './drag';

// ── Core update ───────────────────────────────────────────────────────────────
function onChange(): void {
  renderCanvas();
  renderConfig();
  renderDeliverables();
  saveToLocalStorage();
}

// ── General inputs ────────────────────────────────────────────────────────────
(document.getElementById('cfg-title') as HTMLInputElement).addEventListener('input', e => {
  state.title = (e.target as HTMLInputElement).value;
  renderCanvas();
});

(document.getElementById('cfg-date-start') as HTMLInputElement).addEventListener('change', e => {
  state.dateStart = (e.target as HTMLInputElement).value;
  onChange();
});

(document.getElementById('cfg-date-end') as HTMLInputElement).addEventListener('change', e => {
  state.dateEnd = (e.target as HTMLInputElement).value;
  onChange();
});

// ── Modal buttons ─────────────────────────────────────────────────────────────
document.getElementById('modal-save-btn')!.addEventListener('click', () => {
  handleModalSave();
  onChange();
});

document.getElementById('modal-delete-btn')!.addEventListener('click', () => {
  handleModalDelete();
  onChange();
});

document.getElementById('modal-close-btn')!.addEventListener('click', closeModal);
document.getElementById('modal-cancel-btn')!.addEventListener('click', closeModal);
document.getElementById('modal-overlay')!.addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ── Sidebar add buttons ───────────────────────────────────────────────────────
document.querySelector('[data-action="add-sprint"]')!.addEventListener('click', () => {
  openModal({
    title: 'Add Sprint',
    fields: [
      { name: 'label', label: 'Label',      type: 'text', value: '' },
      { name: 'start', label: 'Start Date', type: 'date', value: state.dateStart },
    ],
    onSave(vals) { state.sprints.push({ id: uid(), label: vals.label, start: vals.start }); },
  });
});

document.querySelector('[data-action="add-milestone"]')!.addEventListener('click', () => {
  openModal({
    title: 'Add Milestone',
    fields: [
      { name: 'label', label: 'Label (use \\n for line break)', type: 'text', value: '' },
      { name: 'date',  label: 'Date', type: 'date', value: state.dateStart },
    ],
    onSave(vals) {
      state.milestones.push({ id: uid(), label: vals.label.replace(/\\n/g, '\n'), date: vals.date });
    },
  });
});

document.querySelector('[data-action="add-row"]')!.addEventListener('click', () => {
  openModal({
    title: 'Add Swimlane',
    fields: [
      { name: 'label', label: 'Label', type: 'text',  value: '' },
      { name: 'color', label: 'Color', type: 'color', value: '#4a90d9' },
    ],
    onSave(vals) {
      state.rows.push({ id: uid(), label: vals.label, color: vals.color, deliverables: [] });
    },
  });
});

// ── Sidebar edit delegation ───────────────────────────────────────────────────
function handleSidebarClick(e: Event): void {
  const btn = (e.target as Element).closest<HTMLElement>('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action!;
  const id     = Number(btn.dataset.id);

  if (action === 'edit-sprint') {
    const sprint = state.sprints.find(s => s.id === id);
    if (!sprint) return;
    openModal({
      title: 'Edit Sprint',
      fields: [
        { name: 'label', label: 'Label',      type: 'text', value: sprint.label },
        { name: 'start', label: 'Start Date', type: 'date', value: sprint.start },
      ],
      onSave(vals) { sprint.label = vals.label; sprint.start = vals.start; },
      onDelete()   { state.sprints.splice(state.sprints.indexOf(sprint), 1); },
    });
  }

  if (action === 'edit-milestone') {
    const m = state.milestones.find(x => x.id === id);
    if (!m) return;
    openModal({
      title: 'Edit Milestone',
      fields: [
        { name: 'label', label: 'Label (use \\n for line break)', type: 'text', value: m.label.replace('\n', '\\n') },
        { name: 'date',  label: 'Date', type: 'date', value: m.date },
      ],
      onSave(vals) { m.label = vals.label.replace(/\\n/g, '\n'); m.date = vals.date; },
      onDelete()   { state.milestones.splice(state.milestones.indexOf(m), 1); },
    });
  }

  if (action === 'edit-row') {
    const row = state.rows.find(r => r.id === id);
    if (!row) return;
    openModal({
      title: 'Edit Swimlane',
      fields: [
        { name: 'label', label: 'Label', type: 'text',  value: row.label },
        { name: 'color', label: 'Color', type: 'color', value: row.color },
      ],
      onSave(vals) { row.label = vals.label; row.color = vals.color; },
      onDelete()   { state.rows.splice(state.rows.indexOf(row), 1); },
    });
  }
}

document.getElementById('sprints-list')!.addEventListener('click',   handleSidebarClick);
document.getElementById('milestones-list')!.addEventListener('click', handleSidebarClick);
document.getElementById('rows-list')!.addEventListener('click',       handleSidebarClick);

// ── Deliverables panel ────────────────────────────────────────────────────────
document.getElementById('row-tabs')!.addEventListener('click', e => {
  const tab = (e.target as Element).closest<HTMLElement>('[data-row-id]');
  if (!tab) return;
  setSelectedRowId(Number(tab.dataset.rowId));
  renderDeliverables();
});

document.getElementById('dp-tbody')!.addEventListener('click', e => {
  const btn = (e.target as Element).closest<HTMLElement>('[data-action="edit-deliverable"]');
  if (!btn) return;
  const row = state.rows.find(r => r.id === Number(btn.dataset.rowId));
  if (!row) return;
  const d = row.deliverables.find(x => x.id === Number(btn.dataset.id));
  if (!d) return;
  openModal({
    title: 'Edit Deliverable',
    fields: [
      { name: 'label', label: 'Label',      type: 'text', value: d.label },
      { name: 'start', label: 'Start Date', type: 'date', value: d.start },
      { name: 'end',   label: 'End Date',   type: 'date', value: d.end   },
    ],
    onSave(vals) { d.label = vals.label; d.start = vals.start; d.end = vals.end; },
    onDelete()   { row.deliverables.splice(row.deliverables.indexOf(d), 1); },
  });
});

document.getElementById('add-deliverable-btn')!.addEventListener('click', () => {
  const row = state.rows.find(r => r.id === selectedRowId);
  if (!row) return;
  openModal({
    title: `Add Deliverable — ${row.label}`,
    fields: [
      { name: 'label', label: 'Label',      type: 'text', value: '' },
      { name: 'start', label: 'Start Date', type: 'date', value: state.dateStart },
      { name: 'end',   label: 'End Date',   type: 'date', value: state.dateEnd   },
    ],
    onSave(vals) {
      row.deliverables.push({ id: uid(), label: vals.label, start: vals.start, end: vals.end });
    },
  });
});

// ── Toolbar buttons ───────────────────────────────────────────────────────────
document.getElementById('export-btn')!.addEventListener('click', () => {
  const EXPORT_W = 1920;
  const EXPORT_H = 1080;

  const srcCanvas = document.createElement('canvas');
  renderToCanvas(srcCanvas, EXPORT_W);

  const outCanvas = document.createElement('canvas');
  outCanvas.width  = EXPORT_W;
  outCanvas.height = EXPORT_H;
  const octx = outCanvas.getContext('2d')!;
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, EXPORT_W, EXPORT_H);

  const scale = Math.min(EXPORT_W / srcCanvas.width, EXPORT_H / srcCanvas.height);
  const drawW = srcCanvas.width  * scale;
  const drawH = srcCanvas.height * scale;
  octx.drawImage(srcCanvas, (EXPORT_W - drawW) / 2, (EXPORT_H - drawH) / 2, drawW, drawH);

  const link     = document.createElement('a');
  link.download  = `${state.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  link.href      = outCanvas.toDataURL('image/png');
  link.click();
});

document.getElementById('clear-btn')!.addEventListener('click', () => {
  if (!confirm('Clear all data? This cannot be undone.')) return;
  state.title      = 'Project Roadmap';
  state.dateStart  = '2026-01-01';
  state.dateEnd    = '2026-06-30';
  state.sprints    = [];
  state.milestones = [];
  state.rows       = [];
  setSelectedRowId(null);
  onChange();
});

document.getElementById('save-json-btn')!.addEventListener('click', () => {
  const blob    = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  const safeName = state.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  link.download = `${safeName}.json`;
  link.href     = url;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById('load-json-btn')!.addEventListener('click', () => {
  (document.getElementById('load-json-input') as HTMLInputElement).click();
});

(document.getElementById('load-json-input') as HTMLInputElement).addEventListener('change', e => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      restoreState(JSON.parse((ev.target as FileReader).result as string));
      setSelectedRowId(null);
      onChange();
    } catch (_) {
      alert('Could not read file — make sure it is a valid roadmap JSON.');
    }
  };
  reader.readAsText(file);
  (e.target as HTMLInputElement).value = '';
});

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`tab-${(tab as HTMLElement).dataset.tab}`)!.classList.remove('hidden');
  });
});

// ── Drag, panel resize, resize observer ──────────────────────────────────────
initCanvasDrag(onChange);
initContextMenu(onChange, (row, start, end) => {
  openModal({
    title: `Add Deliverable — ${row.label}`,
    fields: [
      { name: 'label', label: 'Label',      type: 'text', value: '' },
      { name: 'start', label: 'Start Date', type: 'date', value: start },
      { name: 'end',   label: 'End Date',   type: 'date', value: end   },
    ],
    onSave(vals) {
      row.deliverables.push({ id: uid(), label: vals.label, start: vals.start, end: vals.end });
    },
  });
}, (d, row) => {
  openModal({
    title: 'Edit Deliverable',
    fields: [
      { name: 'label', label: 'Label',      type: 'text', value: d.label },
      { name: 'start', label: 'Start Date', type: 'date', value: d.start },
      { name: 'end',   label: 'End Date',   type: 'date', value: d.end   },
    ],
    onSave(vals) { d.label = vals.label; d.start = vals.start; d.end = vals.end; },
    onDelete()   { row.deliverables.splice(row.deliverables.indexOf(d), 1); },
  });
});
initPanelResize();

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
new ResizeObserver(() => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderCanvas, 50);
}).observe(document.querySelector('.workspace')!);

// ── Init ──────────────────────────────────────────────────────────────────────
try {
  const saved = localStorage.getItem('roadmap-state');
  if (saved) restoreState(JSON.parse(saved));
} catch (_) {}

onChange();
