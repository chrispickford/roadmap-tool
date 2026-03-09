import { state } from './state';
import { escHtml, formatDate } from './dates';

export let selectedRowId: number | null = null;
export function setSelectedRowId(id: number | null): void { selectedRowId = id; }

export function renderConfig(): void {
  (document.getElementById('cfg-title') as HTMLInputElement).value      = state.title;
  (document.getElementById('cfg-date-start') as HTMLInputElement).value = state.dateStart;
  (document.getElementById('cfg-date-end') as HTMLInputElement).value   = state.dateEnd;

  // Sprints
  const sprintsList = document.getElementById('sprints-list')!;
  sprintsList.innerHTML = '';
  const sortedSprints = [...state.sprints].sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  sortedSprints.forEach(s => {
    const item = document.createElement('div');
    item.className = 'config-item';
    item.innerHTML = `
      <span class="config-item-label">${escHtml(s.label)}</span>
      <span class="config-item-sub">${formatDate(s.start)}</span>
      <button class="icon-btn" data-action="edit-sprint" data-id="${s.id}" title="Edit">✎</button>
    `;
    sprintsList.appendChild(item);
  });

  // Milestones
  const milestonesList = document.getElementById('milestones-list')!;
  milestonesList.innerHTML = '';
  state.milestones.forEach(m => {
    const item = document.createElement('div');
    item.className = 'config-item';
    item.innerHTML = `
      <span class="config-item-label">${escHtml(m.label.replace('\n', ' '))}</span>
      <span class="config-item-sub">${formatDate(m.date)}</span>
      <button class="icon-btn" data-action="edit-milestone" data-id="${m.id}" title="Edit">✎</button>
    `;
    milestonesList.appendChild(item);
  });

  // Rows / Swimlanes
  const rowsList = document.getElementById('rows-list')!;
  rowsList.innerHTML = '';
  state.rows.forEach(row => {
    const item = document.createElement('div');
    item.className = 'config-item';
    item.innerHTML = `
      <span class="color-swatch" style="background:${row.color}"></span>
      <span class="config-item-label">${escHtml(row.label)}</span>
      <span class="config-item-sub">${row.deliverables.length}d</span>
      <button class="icon-btn" data-action="edit-row" data-id="${row.id}" title="Edit">✎</button>
    `;
    rowsList.appendChild(item);
  });
}

export function renderDeliverables(): void {
  if (!state.rows.find(r => r.id === selectedRowId)) {
    selectedRowId = state.rows[0]?.id ?? null;
  }

  document.getElementById('row-tabs')!.innerHTML = state.rows.map(r => `
    <button class="row-tab ${r.id === selectedRowId ? 'active' : ''}" data-row-id="${r.id}">
      <span class="tab-swatch" style="background:${r.color}"></span>
      ${escHtml(r.label)}
    </button>
  `).join('');

  const tbody = document.getElementById('dp-tbody')!;
  const row = state.rows.find(r => r.id === selectedRowId);

  if (!row) {
    tbody.innerHTML = '<tr><td colspan="4" class="dp-empty">Add a swimlane to get started.</td></tr>';
    return;
  }

  const sorted = [...row.deliverables].sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  tbody.innerHTML = sorted.length
    ? sorted.map(d => `
        <tr>
          <td>${escHtml(d.label)}</td>
          <td class="dp-date-cell">${formatDate(d.start)}</td>
          <td class="dp-date-cell">${formatDate(d.end)}</td>
          <td class="dp-actions-cell">
            <button class="icon-btn" data-action="edit-deliverable" data-row-id="${row.id}" data-id="${d.id}" title="Edit">✎</button>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" class="dp-empty">No deliverables yet — click + Add Deliverable.</td></tr>';
}
