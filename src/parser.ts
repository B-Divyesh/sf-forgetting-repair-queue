import type { AnalysisResult, CardAnalysis } from './types';

const aliases = {
  id: ['card_id', 'cardid', 'cid', 'id', 'card'],
  question: ['front', 'question', 'prompt', 'term', 'field_1', 'text'],
  answer: ['back', 'answer', 'response', 'definition', 'field_2'],
  deck: ['deck', 'deck_name', 'deckname'],
  reviews: ['recent_reviews', 'review_count', 'reviews', 'reps', 'attempts'],
  failures: ['recent_failures', 'failures', 'lapses', 'again_count', 'incorrect'],
  averageMs: ['average_ms', 'avg_ms', 'response_ms', 'response_time', 'time_ms', 'avg_time'],
  rating: ['rating', 'ease', 'grade', 'result', 'button'],
  timestamp: ['reviewed_at', 'timestamp', 'review_time', 'date', 'datetime', 'review_id'],
  logTime: ['time', 'duration', 'answer_time'],
} as const;

type AliasKey = keyof typeof aliases;
type Row = Record<string, string>;

const clean = (value: string) => value.trim().toLowerCase().replace(/[\s./-]+/g, '_').replace(/[^a-z0-9_]/g, '');

export function parseDelimited(input: string): { headers: string[]; rows: Row[] } {
  const text = input.replace(/^\uFEFF/, '');
  if (!text.trim()) throw new Error('The file is empty. Choose a CSV or tab-separated export with a header row.');

  const firstLine = text.split(/\r?\n/, 1)[0];
  const candidates = [',', '\t', ';'];
  const delimiter = candidates.reduce((best, next) => firstLine.split(next).length > firstLine.split(best).length ? next : best, ',');
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim())) matrix.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) matrix.push(row);
  if (quoted) throw new Error('A quoted field is not closed. Export the file again or fix the unmatched quote.');
  if (matrix.length < 2) throw new Error('No data rows were found below the header.');

  const headers = matrix[0].map((header, index) => clean(header) || `column_${index + 1}`);
  const rows = matrix.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()])));
  return { headers, rows };
}

const findHeader = (headers: string[], key: AliasKey) => aliases[key].find((name) => headers.includes(name));
const value = (row: Row, header?: string) => header ? row[header] ?? '' : '';
const number = (raw: string) => {
  const parsed = Number.parseFloat(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const clamp = (num: number, min = 0, max = 1) => Math.min(max, Math.max(min, num));
const stripMarkup = (raw: string) => raw.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function scoreCard(card: Omit<CardAnalysis, 'score' | 'failurePoints' | 'timePoints' | 'repeatPoints'>): CardAnalysis {
  const failurePoints = Math.round(clamp(card.failureRate) * 75);
  const timePoints = card.averageMs === null ? 0 : Math.round(clamp((card.averageMs - 4000) / 12000) * 20);
  const repeatPoints = Math.round(clamp(card.recentFailures / 5) * 5);
  return { ...card, failurePoints, timePoints, repeatPoints, score: failurePoints + timePoints + repeatPoints };
}

const failedRating = (raw: string) => {
  const rating = raw.trim().toLowerCase();
  if (['again', 'fail', 'failed', 'incorrect', 'forgot', 'forgotten', '0'].includes(rating)) return true;
  const numeric = Number(rating);
  return Number.isFinite(numeric) && numeric === 1;
};

const timestampValue = (raw: string, index: number) => {
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : index;
};

export function analyseExport(input: string): AnalysisResult {
  const { headers, rows } = parseDelimited(input);
  const mapped = Object.fromEntries((Object.keys(aliases) as AliasKey[]).map((key) => [key, findHeader(headers, key)])) as Record<AliasKey, string | undefined>;
  const isLog = Boolean(mapped.rating && mapped.id);
  const recognized = (Object.entries(mapped) as [AliasKey, string | undefined][]).filter((entry): entry is [AliasKey, string] => Boolean(entry[1])).map(([key, header]) => `${header} → ${key}`);

  if (!mapped.question && !isLog) {
    throw new Error('No prompt column was recognized. Include a header such as Front, Question, or Prompt.');
  }

  let cards: CardAnalysis[];
  if (isLog) {
    const groups = new Map<string, { row: Row; time: number; index: number }[]>();
    rows.forEach((row, index) => {
      const id = value(row, mapped.id) || `row-${index + 1}`;
      const items = groups.get(id) ?? [];
      items.push({ row, index, time: timestampValue(value(row, mapped.timestamp), index) });
      groups.set(id, items);
    });
    cards = [...groups.entries()].map(([id, entries]) => {
      const recent = entries.sort((a, b) => b.time - a.time).slice(0, 20);
      const newest = recent[0].row;
      const failures = recent.filter(({ row }) => failedRating(value(row, mapped.rating))).length;
      const timeHeader = mapped.averageMs ?? mapped.logTime;
      const times = recent.map(({ row }) => number(value(row, timeHeader))).filter((time) => time > 0);
      const averageMs = times.length ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length) : null;
      return scoreCard({
        id: `card-${id}`,
        sourceId: id,
        question: stripMarkup(value(newest, mapped.question)) || `Card ${id} (prompt not included in this review log)`,
        answer: stripMarkup(value(newest, mapped.answer)),
        deck: value(newest, mapped.deck) || 'Imported deck',
        recentReviews: recent.length,
        recentFailures: failures,
        failureRate: recent.length ? failures / recent.length : 0,
        averageMs,
      });
    });
  } else {
    cards = rows.map((row, index) => {
      const reviews = Math.max(0, Math.round(number(value(row, mapped.reviews))));
      const failures = Math.max(0, Math.round(number(value(row, mapped.failures))));
      const recentReviews = reviews || Math.max(failures, 1);
      const average = number(value(row, mapped.averageMs));
      const id = value(row, mapped.id) || String(index + 1);
      return scoreCard({
        id: `card-${id}-${index}`,
        sourceId: id,
        question: stripMarkup(value(row, mapped.question)) || `Untitled card ${index + 1}`,
        answer: stripMarkup(value(row, mapped.answer)),
        deck: value(row, mapped.deck) || 'Imported deck',
        recentReviews,
        recentFailures: Math.min(failures, recentReviews),
        failureRate: recentReviews ? Math.min(failures, recentReviews) / recentReviews : 0,
        averageMs: average > 0 ? Math.round(average) : null,
      });
    });
  }

  cards.sort((a, b) => b.score - a.score || b.recentFailures - a.recentFailures);
  const warning = cards.every((card) => card.averageMs === null)
    ? 'No response-time column was found. Ranking uses failure evidence only.'
    : undefined;
  return { format: isLog ? 'review log' : 'card summary', cards, columns: headers, recognized, warning };
}
