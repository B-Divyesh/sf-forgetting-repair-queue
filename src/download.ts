import type { AppData } from './types';

function save(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function exportRepairs(data: AppData): void {
  const header = ['source_card_id', 'original_prompt', 'decision', 'revised_prompt', 'revised_answer', 'split_prompt_a', 'split_prompt_b', 'note', 'updated_at'];
  const rows = data.repairs.map((repair) => {
    const card = data.dataset.cards.find((item) => item.id === repair.cardId);
    return [card?.sourceId ?? '', card?.question ?? '', repair.decision, repair.prompt, repair.answer, repair.splitA, repair.splitB, repair.note, repair.updatedAt];
  });
  save([header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'), 'repair-queue-plan.csv', 'text/csv;charset=utf-8');
}

export function exportBackup(data: AppData): void {
  save(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2), 'repair-queue-backup.json', 'application/json');
}

export function downloadOriginal(data: AppData): void {
  save(data.dataset.raw, `original-${data.dataset.filename || 'export.csv'}`, 'text/plain;charset=utf-8');
}
