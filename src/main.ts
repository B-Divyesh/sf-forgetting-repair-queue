import './style.css';
import { analyseExport } from './parser';
import { clearData, loadData, replaceData, saveDataset, saveRepair } from './store';
import { captureReturnedLicense, checkoutUrl, isOptimisticallyUnlocked, removeLicense, restoreLicense, verifyLicense } from './license';
import { downloadOriginal, exportBackup, exportRepairs } from './download';
import type { AppData, CardAnalysis, DataSet, Decision, Repair } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('App mount point is missing');

const FREE_LIMIT = 15;
let data: AppData | null = null;
let selectedId = '';
let selectedDecision: Decision = 'revise';
let filter: 'all' | 'open' | 'repaired' = 'all';
let importRaw = '';
let importFilename = '';
let preview: ReturnType<typeof analyseExport> | null = null;
let importError = '';
let showImporter = false;
let unlocked = false;
let licenseNotice = '';
let draft: Repair | null = null;
let undoState: { previous: Repair | null; saved: Repair } | null = null;
let demoMode = location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';

const sample = `card_id,deck,front,back,recent_reviews,recent_failures,average_ms
101,World history,"What happened in 1789?","The French Revolution began",12,7,14800
102,Biology,"What does it do?","The mitochondrion produces ATP",10,6,11300
103,Japanese,"上げる","to raise; to give",18,8,7800
104,Computing,"What is a closure?","A function bundled with its lexical environment",9,4,16200
105,Geography,"Congo capital","Kinshasa",14,5,6400
106,Music,"Relative minor?","A minor",11,4,12500
107,Chemistry,"Exceptions to octet rule","Incomplete octet; odd electrons; expanded octet",8,4,17600
108,Literature,"Who says this line?","Hamlet",6,3,9100
109,Mathematics,"Derivative rules","Power, product, quotient, chain",16,6,8900
110,Astronomy,"Why seasons?","Earth's axial tilt",10,3,15600
111,Economics,"Elasticity","Responsiveness of quantity to a change in price",12,3,9800
112,Art,"Impressionism date","19th century",7,2,13300
113,Spanish,"por vs para","Por: cause/exchange; para: purpose/destination",15,4,7200
114,Physics,"Direction?","Perpendicular to velocity and field",9,2,16400
115,Anatomy,"Name the branches","Too many branches listed here",10,2,15000
116,Poetry,"Meter","Iambic pentameter",8,2,12100
117,Logic,"Validity","No true premises and false conclusion",12,2,8500
118,Gardening,"Hardening off","Gradually acclimating seedlings outdoors",7,1,6200`;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
const percent = (value: number) => `${Math.round(value * 100)}%`;
const seconds = (value: number | null) => value === null ? 'not included' : `${(value / 1000).toFixed(1)} s`;
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function icon(name: 'mark' | 'arrow' | 'lock' | 'download' | 'spark'): string {
  const icons = {
    mark: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 5h22v22H5z"/><path d="M16 5v9l-3 3 3 3v7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/></svg>',
  };
  return icons[name];
}

function shell(content: string, workbench = false): string {
  return `
    <header class="site-header ${workbench ? 'site-header--work' : ''}">
      <a class="wordmark" href="/" data-action="home" aria-label="Repair Queue home">${icon('mark')}<span>Repair Queue</span></a>
      <nav aria-label="Utility navigation">
        <a href="/demo" data-action="open-demo">Demo</a>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
      </nav>
    </header>
    ${demoMode ? `<aside class="demo-banner" aria-label="Demo controls"><span><strong>Demo — sample data, nothing is saved</strong><small> to your study data.</small></span><div><button class="text-button" data-action="reset-demo">Reset demo</button><button class="button button--small button--secondary" data-action="start-real">Start for real</button></div></aside>` : ''}
    ${content}
    <footer>
      <span>Repair Queue · repair flashcard prompts from local exports</span>
      <span>Original hero artwork generated for this product · <a href="/privacy/">privacy</a> · Built by Param Factory · build 1.0.1</span>
    </footer>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function loadingView(): void {
  app.innerHTML = shell('<main id="main" class="loading"><h1>Repair weak flashcard prompts</h1><p>Opening your local workbench…</p></main>');
}

function landingView(): void {
  const saved = data && !showImporter;
  const importSection = previewView();
  app.innerHTML = shell(`
    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Repair Queue</p>
          <h1 id="hero-title">Repair weak<br><em>flashcard prompts.</em></h1>
          <p class="lede">For self-learners with Anki decks. Find prompts that fail often or take too long to answer.</p>
          <div class="hero-actions">
            <button class="button button--primary" data-action="sample">Try it with sample data ${icon('arrow')}</button>
            <span class="action-help">Opens a ranked sample queue.</span>
            ${saved ? `<button class="text-button" data-action="resume">Resume your queue</button>` : '<button class="text-button" data-action="focus-import">Analyse your export</button>'}
          </div>
          <ul class="trust-list" aria-label="Product facts"><li>Study files stay in your browser</li><li>Original import stays unchanged</li><li>Score details are shown</li></ul>
        </div>
        <figure class="hero-art">
          <picture>
            <source type="image/webp" srcset="/art/card-orchard-768.webp 768w, /art/card-orchard-1536.webp 1536w" sizes="(max-width: 760px) 100vw, 55vw">
            <img src="/art/card-orchard-768.jpg" width="768" height="512" alt="A torn index card growing into two smaller cards in a moonlit paper landscape" fetchpriority="high" decoding="async">
          </picture>
          <figcaption><span>01</span> Split an overloaded prompt into two answerable cards.</figcaption>
        </figure>
      </section>
      <section class="import-zone" id="import" aria-labelledby="import-title">
        <div class="section-number" aria-hidden="true">02 / IMPORT</div>
        <div class="import-heading"><h2 id="import-title">Analyse your<br>study export.</h2><p>Use a CSV or tab-separated export. Include a prompt column such as <code>Front</code> or <code>Question</code>.</p></div>
        ${importSection}
      </section>
      <section class="method" aria-labelledby="method-title">
        <p class="eyebrow">How the score works</p>
        <h2 id="method-title">See why each card is flagged.</h2>
        <div class="formula"><div><strong>75</strong><span>Recent failure ratio</span></div><div><strong>20</strong><span>Slow response signal</span></div><div><strong>5</strong><span>Repeated failures</span></div></div>
        <p>Review logs use each card’s latest 20 attempts. Slow responses add points after 4 seconds. Missing times do not add points.</p>
      </section>
    </main>`, false);
  bindLanding();
}

function previewView(): string {
  if (!preview) return `
    <div class="import-card">
      <label class="file-drop" for="csv-file"><span class="file-icon">↳</span><strong>Choose an export</strong><span>.csv or .txt · stays on this device</span></label>
      <input id="csv-file" class="visually-hidden" type="file" accept=".csv,.txt,text/csv,text/tab-separated-values">
      <details class="paste-disclosure"><summary>Or paste CSV text</summary><label for="csv-text">CSV or tab-separated text</label><textarea id="csv-text" rows="7" spellcheck="false" placeholder="Front,Back,Reviews,Lapses,Average_ms"></textarea><button class="button button--secondary" data-action="preview-paste" aria-label="Preview pasted CSV columns">Preview columns</button></details>
      <p class="form-error" role="alert">${escapeHtml(importError)}</p>
    </div>`;

  return `
    <div class="import-card import-card--preview">
      <div class="preview-title"><span class="success-mark">✓</span><div><strong>${escapeHtml(importFilename || 'Pasted export')}</strong><span>${preview.cards.length} cards · ${escapeHtml(preview.format)}</span></div><button class="text-button" data-action="cancel-preview">Choose another</button></div>
      <div class="mapping"><span>Recognized mapping</span><ul>${preview.recognized.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
      ${preview.warning ? `<p class="notice">${escapeHtml(preview.warning)}</p>` : ''}
      <button class="button button--primary button--wide" data-action="analyse">Build the repair queue ${icon('arrow')}</button>
      <p class="microcopy">The untouched source will be stored in this browser so you can download it later.</p>
    </div>`;
}

function bindLanding(): void {
  app.querySelector<HTMLInputElement>('#csv-file')?.addEventListener('change', async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try { preparePreview(await file.text(), file.name); } catch { setImportError('That file could not be read. Try exporting it as UTF-8 CSV.'); }
  });
  app.querySelector('[data-action="focus-import"]')?.addEventListener('click', () => document.querySelector<HTMLElement>('#import')?.scrollIntoView({ behavior: 'smooth' }));
  app.querySelector('[data-action="sample"]')?.addEventListener('click', () => { void openDemo(); });
  app.querySelector('[data-action="preview-paste"]')?.addEventListener('click', () => preparePreview(app.querySelector<HTMLTextAreaElement>('#csv-text')?.value ?? '', 'pasted-export.csv'));
  app.querySelector('[data-action="cancel-preview"]')?.addEventListener('click', () => { preview = null; importError = ''; landingView(); requestAnimationFrame(() => document.querySelector<HTMLElement>('#import')?.scrollIntoView()); });
  app.querySelector('[data-action="analyse"]')?.addEventListener('click', buildQueue);
  app.querySelector('[data-action="resume"]')?.addEventListener('click', () => { showImporter = false; workbenchView(); });
  bindShell();
}

function setImportError(message: string): void { importError = message; preview = null; landingView(); requestAnimationFrame(() => document.querySelector<HTMLElement>('#import')?.scrollIntoView()); }

function preparePreview(raw: string, filename: string): void {
  try {
    const result = analyseExport(raw);
    if (!result.cards.length) throw new Error('No cards were found.');
    importRaw = raw; importFilename = filename; preview = result; importError = '';
    landingView(); requestAnimationFrame(() => document.querySelector<HTMLElement>('#import')?.scrollIntoView());
  } catch (error) { setImportError(error instanceof Error ? error.message : 'This export could not be read.'); }
}

async function buildQueue(): Promise<void> {
  if (!preview) return;
  const dataset: DataSet = { ...preview, id: crypto.randomUUID(), filename: importFilename, importedAt: new Date().toISOString(), raw: importRaw };
  try {
    data = await saveDataset(dataset, demoMode ? 'demo' : 'real'); selectedId = dataset.cards[0]?.id ?? ''; showImporter = false; preview = null; draft = null;
    workbenchView(); announce(`Queue built from ${dataset.cards.length} cards.`);
  } catch (error) { setImportError(error instanceof Error ? error.message : 'Local storage is unavailable.'); }
}

function sampleDataSet(): DataSet {
  const analysed = analyseExport(sample);
  return {
    ...analysed,
    id: crypto.randomUUID(),
    filename: 'sample-trouble-cards.csv',
    importedAt: new Date().toISOString(),
    raw: sample,
  };
}

function updateRouteTitle(): void {
  document.title = demoMode ? 'Demo — Repair Queue' : 'Repair Queue — repair weak flashcards';
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', demoMode
    ? 'https://forgetting-repair-queue.sociobot.in/demo'
    : 'https://forgetting-repair-queue.sociobot.in/');
}

async function openDemo(reset = false, push = true): Promise<void> {
  demoMode = true;
  if (push) history.pushState({}, '', '/demo');
  updateRouteTitle();
  preview = null; importError = ''; showImporter = false; draft = null; undoState = null;
  try {
    if (reset) await clearData('demo');
    data = await loadData('demo');
    if (!data) data = await saveDataset(sampleDataSet(), 'demo');
    selectedId = data.dataset.cards[0]?.id ?? '';
    workbenchView();
    if (reset) announce('Demo reset with a fresh sample queue.');
  } catch (error) {
    demoMode = false;
    updateRouteTitle();
    data = null;
    importError = error instanceof Error ? error.message : 'The demo could not open local storage.';
    landingView();
  }
}

async function startForReal(push = true): Promise<void> {
  try { await clearData('demo'); } catch { /* The real workspace is still never touched. */ }
  demoMode = false;
  if (push) history.pushState({}, '', '/');
  updateRouteTitle();
  preview = null; importError = ''; showImporter = false; draft = null; undoState = null;
  try {
    data = await loadData('real');
    selectedId = data?.dataset.cards[0]?.id ?? '';
    if (data) workbenchView(); else landingView();
    announce('Demo closed. Your study data was not changed.');
  } catch (error) {
    data = null;
    importError = error instanceof Error ? error.message : 'Local storage could not be opened.';
    landingView();
  }
}

function bindShell(): void {
  app.querySelector('[data-action="open-demo"]')?.addEventListener('click', (event) => { event.preventDefault(); void openDemo(); });
  app.querySelector('[data-action="reset-demo"]')?.addEventListener('click', () => { void openDemo(true, false); });
  app.querySelector('[data-action="start-real"]')?.addEventListener('click', () => { void startForReal(); });
  app.querySelector('[data-action="home"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    if (demoMode) { void startForReal(); return; }
    showImporter = true;
    landingView();
  });
}

function scoreLabel(score: number): string { return score >= 55 ? 'Strong repair signal' : score >= 30 ? 'Worth inspecting' : 'Light signal'; }

function currentCard(): CardAnalysis | null { return data?.dataset.cards.find((card) => card.id === selectedId) ?? null; }
function repairFor(cardId: string): Repair | undefined { return data?.repairs.find((repair) => repair.cardId === cardId); }

function makeDraft(card: CardAnalysis): Repair {
  return repairFor(card.id) ?? { cardId: card.id, decision: selectedDecision, prompt: card.question, answer: card.answer, splitA: '', splitB: '', note: '', checks: [], updatedAt: '' };
}

function filteredCards(cards: CardAnalysis[]): CardAnalysis[] {
  if (filter === 'open') return cards.filter((card) => !repairFor(card.id));
  if (filter === 'repaired') return cards.filter((card) => repairFor(card.id));
  return cards;
}

function workbenchView(): void {
  if (!data) { landingView(); return; }
  const accessibleCards = unlocked ? data.dataset.cards : data.dataset.cards.slice(0, FREE_LIMIT);
  const visible = filteredCards(accessibleCards);
  if (!selectedId || !accessibleCards.some((card) => card.id === selectedId)) selectedId = accessibleCards[0]?.id ?? '';
  const card = currentCard();
  if (card && (!draft || draft.cardId !== card.id)) { draft = makeDraft(card); selectedDecision = draft.decision; }
  const completed = data.repairs.filter((repair) => accessibleCards.some((cardItem) => cardItem.id === repair.cardId)).length;
  const hidden = Math.max(0, data.dataset.cards.length - FREE_LIMIT);
  app.innerHTML = shell(`
    <main id="main" class="workbench">
      <section class="work-top">
        <div><p class="eyebrow">${demoMode ? 'Sample queue · ' : ''}${escapeHtml(data.dataset.filename)} · ${formatDate(data.dataset.importedAt)}</p><h1>Repair weak flashcard prompts</h1></div>
        <div class="work-actions">
          <span class="network-state" id="network-state">${navigator.onLine ? 'Ready offline' : 'Offline · changes save locally'}</span>
          <button class="text-button" data-action="new-import">New import</button>
          <button class="button button--small button--secondary" data-action="export-plan">${icon('download')} Export plan</button>
        </div>
      </section>
      <div class="progress-row"><div><span>${completed} repaired</span><span>${accessibleCards.length} in this queue</span></div><div class="progress-track" role="progressbar" aria-label="Repair progress" aria-valuemin="0" aria-valuemax="${accessibleCards.length}" aria-valuenow="${completed}"><i style="width:${accessibleCards.length ? completed / accessibleCards.length * 100 : 0}%"></i></div></div>
      <div class="work-grid">
        <aside class="queue-panel" aria-labelledby="queue-title">
          <div class="panel-heading"><div><span>01</span><h2 id="queue-title">Flagged cards</h2></div><label>Show<select id="queue-filter"><option value="all" ${filter === 'all' ? 'selected' : ''}>All</option><option value="open" ${filter === 'open' ? 'selected' : ''}>Open</option><option value="repaired" ${filter === 'repaired' ? 'selected' : ''}>Repaired</option></select></label></div>
          <ol class="queue-list">${visible.length ? visible.map((item) => queueItem(item, accessibleCards.indexOf(item))).join('') : '<li class="queue-empty">No cards match this view.</li>'}</ol>
          ${hidden && !unlocked ? `<div class="locked-row">${icon('lock')}<div><strong>${hidden} more ranked cards</strong><span>Unlimited queues are a one-time unlock.</span></div><button class="text-button" data-action="show-license">See unlock</button></div>` : ''}
        </aside>
        ${card ? evidencePanel(card) + decisionPanel(card) : '<section class="no-selection"><h2>Queue complete</h2><p>Export your repair plan or start a new import.</p></section>'}
      </div>
      ${licensePanel(hidden)}
      <section class="data-shelf" aria-labelledby="data-title"><div><p class="eyebrow">Local files</p><h2 id="data-title">Manage your local files</h2></div><p>The original export and every repair are stored in this browser. Nothing is sent to Repair Queue.</p><div><button class="text-button" data-action="download-original">Download original</button><button class="text-button" data-action="backup">Export JSON backup</button><label class="text-button file-label" for="backup-file">Restore JSON backup</label><input class="visually-hidden" id="backup-file" type="file" accept="application/json,.json"><button class="text-button text-button--danger" data-action="clear">Delete local data</button></div></section>
    </main>`, true);
  bindWorkbench();
  bindShell();
}

function queueItem(card: CardAnalysis, index: number): string {
  const repaired = repairFor(card.id);
  return `<li><button class="queue-item ${card.id === selectedId ? 'is-active' : ''}" data-card-id="${escapeHtml(card.id)}" ${card.id === selectedId ? 'aria-current="true"' : ''}><span class="queue-number">${String(index + 1).padStart(2, '0')}</span><span class="queue-copy"><strong>${escapeHtml(card.question)}</strong><small>${escapeHtml(card.deck)} · ${repaired ? `${repaired.decision} saved` : `${percent(card.failureRate)} failed`}</small></span><span class="score-badge ${repaired ? 'is-done' : ''}">${repaired ? '✓' : card.score}</span></button></li>`;
}

function evidencePanel(card: CardAnalysis): string {
  return `<section class="evidence-panel" aria-labelledby="evidence-title">
    <div class="panel-heading"><div><span>02</span><h2 id="evidence-title">Read the evidence</h2></div><span class="signal-label">${scoreLabel(card.score)}</span></div>
    <div class="card-paper">
      <div class="paper-meta"><span>${escapeHtml(card.deck)}</span><span>Card ${escapeHtml(card.sourceId)}</span></div>
      <p class="question">${escapeHtml(card.question)}</p>
      ${card.answer ? `<details><summary>Show current answer</summary><p>${escapeHtml(card.answer)}</p></details>` : '<p class="missing-answer">Answer was not included in this export.</p>'}
    </div>
    <div class="score-story"><div class="score-total"><strong>${card.score}</strong><span>/ 100<br>repair signal</span></div><p>This card failed <strong>${card.recentFailures} of ${card.recentReviews}</strong> recent reviews (${percent(card.failureRate)}). Its average response was <strong>${seconds(card.averageMs)}</strong>.</p></div>
    <div class="score-components" aria-label="Score breakdown">
      ${meter('Recent failures', card.failurePoints, 75, `${card.failurePoints} of 75 points`)}
      ${meter('Response time', card.timePoints, 20, card.averageMs === null ? 'Not scored; response time missing' : `${card.timePoints} of 20 points`)}
      ${meter('Repeat burden', card.repeatPoints, 5, `${card.repeatPoints} of 5 points`)}
    </div>
    <details class="why-score"><summary>How was this score calculated?</summary><p>Failure ratio contributes up to 75 points. Responses from 4–16 seconds add up to 20. Five or more recent failures add 5. The latest 20 log entries are used; summary files use the counts provided.</p></details>
  </section>`;
}

function meter(label: string, value: number, max: number, description: string): string {
  return `<div class="meter"><div><span>${label}</span><span>${escapeHtml(description)}</span></div><div class="meter-track"><i style="width:${max ? value / max * 100 : 0}%"></i></div></div>`;
}

function decisionPanel(card: CardAnalysis): string {
  const current = draft ?? makeDraft(card);
  const options: { id: Decision; label: string; help: string }[] = [
    { id: 'revise', label: 'Revise', help: 'Clarify one prompt' }, { id: 'split', label: 'Split', help: 'Make two cards' },
    { id: 'suspend', label: 'Suspend', help: 'Pause for later' }, { id: 'archive', label: 'Archive', help: 'Retire this card' },
  ];
  return `<section class="decision-panel" aria-labelledby="decision-title">
    <div class="panel-heading"><div><span>03</span><h2 id="decision-title">Choose a repair</h2></div></div>
    <div class="decision-tabs" role="group" aria-label="Repair type">${options.map((option) => `<button data-decision="${option.id}" aria-pressed="${selectedDecision === option.id}"><strong>${option.label}</strong><span>${option.help}</span></button>`).join('')}</div>
    <form id="repair-form">${decisionFields(current)}<label for="repair-note">Note for future you <span>(optional)</span></label><textarea id="repair-note" name="note" rows="3" placeholder="Why this repair should help">${escapeHtml(current.note)}</textarea>
      <button class="button button--primary button--wide" type="submit">Save ${selectedDecision} & next ${icon('arrow')}</button>
      <p class="save-note">Saved locally · you can edit this decision anytime</p>
    </form>
  </section>`;
}

function decisionFields(current: Repair): string {
  const checked = (id: string) => current.checks.includes(id) ? 'checked' : '';
  if (selectedDecision === 'revise') return `<p class="decision-intro">Rewrite the prompt so one specific answer fits.</p><label for="prompt">Revised prompt</label><textarea id="prompt" name="prompt" rows="4" required>${escapeHtml(current.prompt)}</textarea><label for="answer">Revised answer</label><textarea id="answer" name="answer" rows="3">${escapeHtml(current.answer)}</textarea><fieldset><legend>Clarity check</legend><label class="check"><input type="checkbox" name="checks" value="one-thing" ${checked('one-thing')}> <span>It asks one thing</span></label><label class="check"><input type="checkbox" name="checks" value="enough-context" ${checked('enough-context')}> <span>It includes enough context</span></label><label class="check"><input type="checkbox" name="checks" value="stable-answer" ${checked('stable-answer')}> <span>The answer will stay stable</span></label></fieldset>`;
  if (selectedDecision === 'split') return `<p class="decision-intro">Turn the overloaded prompt into two smaller cards.</p><label for="split-a">First new prompt</label><textarea id="split-a" name="splitA" rows="3" required>${escapeHtml(current.splitA)}</textarea><label for="split-b">Second new prompt</label><textarea id="split-b" name="splitB" rows="3" required>${escapeHtml(current.splitB)}</textarea><fieldset><legend>Split check</legend><label class="check"><input type="checkbox" name="checks" value="independent" ${checked('independent')}> <span>Each prompt stands on its own</span></label><label class="check"><input type="checkbox" name="checks" value="single-fact" ${checked('single-fact')}> <span>Each expects one answer</span></label></fieldset>`;
  if (selectedDecision === 'suspend') return `<div class="decision-callout"><strong>Pause, don’t delete.</strong><p>Record why this card should wait. Your source export is never changed.</p></div><fieldset><legend>Reason to suspend</legend><label class="check"><input type="checkbox" name="checks" value="missing-context" ${checked('missing-context')}> <span>Missing prerequisite or context</span></label><label class="check"><input type="checkbox" name="checks" value="not-current" ${checked('not-current')}> <span>Not useful right now</span></label><label class="check"><input type="checkbox" name="checks" value="source-check" ${checked('source-check')}> <span>Needs source verification</span></label></fieldset>`;
  return `<div class="decision-callout decision-callout--danger"><strong>Retire this prompt from the working deck.</strong><p>This only records an archive recommendation. Repair Queue never edits your Anki deck.</p></div><label class="check confirm-check"><input type="checkbox" name="checks" value="archive-confirmed" ${checked('archive-confirmed')} required> <span>I reviewed the evidence and want to archive this card</span></label>`;
}

function licensePanel(hidden: number): string {
  if (!hidden && !unlocked && !licenseNotice) return '';
  if (unlocked) return `<section class="license-panel"><div>${icon('spark')}<div><p class="eyebrow">Workbench Plus</p><h2>Unlimited queue unlocked</h2><p>Every imported card can now enter your repair queue. License checks are cached for 24 hours.</p></div></div><button class="text-button" data-action="remove-license">Remove license from this device</button></section>`;
  return `<section class="license-panel" id="license" aria-labelledby="license-title"><div>${icon('spark')}<div><p class="eyebrow">One-time unlock · $12 USD</p><h2 id="license-title">Unlock every ranked card.</h2><p>Workbench Plus unlocks unlimited ranked cards in every local repair queue. The free 15-card repair session, original downloads, backups, and accessibility features stay free.</p><p class="merchant">Sociobot / Dodo is the merchant of record. Refunds are handled through the hosted checkout.</p></div></div><div class="license-actions"><a class="button button--primary" href="${checkoutUrl}">Buy once · $12</a><details><summary>Have a license? Restore it</summary><form id="license-form"><label for="license-token">License token</label><input id="license-token" name="token" autocomplete="off" required><button class="button button--secondary" type="submit">Verify license</button></form></details>${licenseNotice ? `<p class="license-notice" role="status">${escapeHtml(licenseNotice)}</p>` : ''}</div></section>`;
}

function captureDraft(): void {
  if (!draft) return;
  const form = app.querySelector<HTMLFormElement>('#repair-form');
  if (!form) return;
  const formData = new FormData(form);
  draft = { ...draft, decision: selectedDecision, prompt: String(formData.get('prompt') ?? draft.prompt), answer: String(formData.get('answer') ?? draft.answer), splitA: String(formData.get('splitA') ?? draft.splitA), splitB: String(formData.get('splitB') ?? draft.splitB), note: String(formData.get('note') ?? ''), checks: formData.getAll('checks').map(String) };
}

function bindWorkbench(): void {
  app.querySelectorAll<HTMLElement>('[data-card-id]').forEach((button) => button.addEventListener('click', () => { captureDraft(); selectedId = button.dataset.cardId ?? ''; draft = null; workbenchView(); focusHeading('#evidence-title'); }));
  app.querySelector<HTMLSelectElement>('#queue-filter')?.addEventListener('change', (event) => { filter = (event.currentTarget as HTMLSelectElement).value as typeof filter; workbenchView(); });
  app.querySelectorAll<HTMLElement>('[data-decision]').forEach((button) => button.addEventListener('click', () => { captureDraft(); selectedDecision = button.dataset.decision as Decision; if (draft) draft.decision = selectedDecision; workbenchView(); focusHeading('#decision-title'); }));
  app.querySelector<HTMLFormElement>('#repair-form')?.addEventListener('submit', saveCurrentRepair);
  app.querySelector('[data-action="export-plan"]')?.addEventListener('click', () => { if (data) exportRepairs(data); announce('Repair plan exported.'); });
  app.querySelector('[data-action="download-original"]')?.addEventListener('click', () => { if (data) downloadOriginal(data); });
  app.querySelector('[data-action="backup"]')?.addEventListener('click', () => { if (data) exportBackup(data); });
  app.querySelector<HTMLInputElement>('#backup-file')?.addEventListener('change', restoreBackup);
  app.querySelector('[data-action="clear"]')?.addEventListener('click', deleteLocalData);
  app.querySelector('[data-action="new-import"]')?.addEventListener('click', () => { showImporter = true; preview = null; landingView(); requestAnimationFrame(() => document.querySelector<HTMLElement>('#import')?.scrollIntoView()); });
  app.querySelector('[data-action="show-license"]')?.addEventListener('click', () => document.querySelector<HTMLElement>('#license')?.scrollIntoView({ behavior: 'smooth' }));
  app.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', handleLicenseRestore);
  app.querySelector('[data-action="remove-license"]')?.addEventListener('click', () => { removeLicense(); unlocked = false; licenseNotice = 'License removed from this device.'; workbenchView(); });
}

async function saveCurrentRepair(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!data || !draft) return;
  captureDraft();
  if (!draft) return;
  const saved = { ...draft, decision: selectedDecision, updatedAt: new Date().toISOString() };
  const previous = repairFor(saved.cardId) ?? null;
  try {
    data = await saveRepair(data, saved, demoMode ? 'demo' : 'real'); undoState = { previous, saved };
    const accessible = (unlocked ? data.dataset.cards : data.dataset.cards.slice(0, FREE_LIMIT));
    const next = accessible.find((card) => !repairFor(card.id));
    if (next) selectedId = next.id;
    draft = null; workbenchView();
    announce(`${selectedDecision[0].toUpperCase()}${selectedDecision.slice(1)} saved.`, true);
  } catch (error) { announce(error instanceof Error ? error.message : 'The repair could not be saved.'); }
}

async function undoSave(): Promise<void> {
  if (!data || !undoState) return;
  const repairs = data.repairs.filter((repair) => repair.cardId !== undoState?.saved.cardId);
  if (undoState.previous) repairs.push(undoState.previous);
  data = { ...data, repairs };
  await replaceData(data, demoMode ? 'demo' : 'real'); selectedId = undoState.saved.cardId; undoState = null; draft = null; workbenchView(); announce('Last repair restored.');
}

async function restoreBackup(event: Event): Promise<void> {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as Partial<AppData> & { version?: number };
    if (!parsed.dataset?.cards || !Array.isArray(parsed.repairs)) throw new Error('This is not a Repair Queue backup.');
    data = { dataset: parsed.dataset, repairs: parsed.repairs }; await replaceData(data, demoMode ? 'demo' : 'real'); selectedId = data.dataset.cards[0]?.id ?? ''; draft = null; workbenchView(); announce('Backup restored.');
  } catch (error) { announce(error instanceof Error ? error.message : 'Backup could not be restored.'); }
}

async function deleteLocalData(): Promise<void> {
  if (demoMode) { await openDemo(true, false); return; }
  if (!confirm('Delete the imported export and all saved repairs from this browser? Downloaded files will not be affected.')) return;
  await clearData('real'); data = null; selectedId = ''; showImporter = false; landingView(); announce('Local study data deleted.');
}

async function handleLicenseRestore(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const token = String(new FormData(event.currentTarget as HTMLFormElement).get('token') ?? '').trim();
  licenseNotice = 'Checking the license…'; workbenchView();
  const verdict = await restoreLicense(token);
  unlocked = verdict.valid;
  licenseNotice = verdict.valid ? 'License verified. Unlimited cards are available.' : verdict.reason === 'offline' ? 'Could not verify while offline. Reconnect and try again.' : 'That license is not active for this product.';
  workbenchView();
}

function focusHeading(selector: string): void {
  const heading = document.querySelector<HTMLElement>(selector);
  if (!heading) return;
  heading.tabIndex = -1; heading.focus({ preventScroll: true });
}

function announce(message: string, withUndo = false): void {
  const toast = document.querySelector<HTMLDivElement>('#toast');
  if (!toast) return;
  toast.innerHTML = `${escapeHtml(message)}${withUndo ? ' <button type="button" data-action="undo">Undo</button>' : ''}`;
  toast.classList.add('is-visible');
  toast.querySelector('[data-action="undo"]')?.addEventListener('click', undoSave);
  window.setTimeout(() => toast.classList.remove('is-visible'), 5000);
}

function updateNetwork(): void {
  const element = document.querySelector<HTMLElement>('#network-state');
  if (element) element.textContent = navigator.onLine ? 'Ready offline' : 'Offline · changes save locally';
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const registration = await navigator.serviceWorker.register('/sw.js');
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        announce('An update is ready. Reload to use it.');
      }
    });
  });
}

async function init(): Promise<void> {
  loadingView(); captureReturnedLicense(); unlocked = isOptimisticallyUnlocked(); updateRouteTitle();
  if (demoMode) {
    await openDemo(false, false);
  } else {
    try { data = await loadData('real'); selectedId = data?.dataset.cards[0]?.id ?? ''; } catch (error) { importError = error instanceof Error ? error.message : 'Local storage could not be opened.'; }
    if (data) workbenchView(); else landingView();
  }
  void verifyLicense().then((verdict) => {
    if (verdict.reason === 'missing' || verdict.reason === 'offline') return;
    const changed = unlocked !== verdict.valid; unlocked = verdict.valid;
    if (!verdict.valid) licenseNotice = 'The saved license is no longer active.';
    if (changed && data) workbenchView();
  });
  void registerServiceWorker();
}

window.addEventListener('online', updateNetwork);
window.addEventListener('offline', updateNetwork);
window.addEventListener('popstate', () => {
  const nextDemo = location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
  if (nextDemo === demoMode) return;
  void (nextDemo ? openDemo(false, false) : startForReal(false));
});
void init();
