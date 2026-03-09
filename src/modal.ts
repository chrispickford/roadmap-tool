import type { ModalOptions } from './types';

let currentOnSave: (() => void) | null = null;
let currentOnDelete: (() => void) | null = null;

export function openModal({ title, fields, onSave, onDelete }: ModalOptions): void {
  (document.getElementById('modal-title') as HTMLElement).textContent = title;

  const body = document.getElementById('modal-body')!;
  body.innerHTML = '';

  fields.forEach(f => {
    const fg = document.createElement('div');
    fg.className = 'field-group';

    const label = document.createElement('label');
    label.textContent = f.label;
    fg.appendChild(label);

    let input: HTMLInputElement | HTMLTextAreaElement;
    if (f.type === 'textarea') {
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      (input as HTMLInputElement).type = f.type;
    }
    input.value = f.value || '';
    input.name  = f.name;
    input.id    = `modal-field-${f.name}`;
    fg.appendChild(input);
    body.appendChild(fg);
  });

  const deleteBtn = document.getElementById('modal-delete-btn')!;
  if (onDelete) {
    deleteBtn.classList.remove('hidden');
    currentOnDelete = onDelete;
  } else {
    deleteBtn.classList.add('hidden');
    currentOnDelete = null;
  }

  currentOnSave = () => {
    const values: Record<string, string> = {};
    fields.forEach(f => {
      const el = document.getElementById(`modal-field-${f.name}`) as HTMLInputElement | HTMLTextAreaElement;
      values[f.name] = el.value;
    });
    onSave(values);
    closeModal();
  };

  document.getElementById('modal-overlay')!.classList.remove('hidden');
}

export function closeModal(): void {
  document.getElementById('modal-overlay')!.classList.add('hidden');
  currentOnSave   = null;
  currentOnDelete = null;
}

export function handleModalSave(): void {
  if (currentOnSave) currentOnSave();
}

export function handleModalDelete(): void {
  if (currentOnDelete) {
    currentOnDelete();
    closeModal();
  }
}
