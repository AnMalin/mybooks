import { useEffect, useMemo, useState } from 'react';
import { Book } from '../types';
import { MONTHS } from '../lib/dates';

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Single-series vertical bars; value shown on hover/focus, exact values in the sr-only list. */
function Bars({ data, label, unit = 'books', showValues = false }: { data: { label: string; value: number }[]; label: string; unit?: string; showValues?: boolean }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <figure aria-label={label}>
      <div className="flex h-44 items-end gap-1.5 border-b border-line">
        {data.map(d => (
          <div key={d.label} tabIndex={0} className="group relative flex h-full flex-1 flex-col justify-end outline-offset-2" aria-label={`${d.label}: ${d.value} ${unit}`}>
            <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-xs font-medium text-bg opacity-0 group-hover:opacity-100 group-focus:opacity-100">
              {d.label}: {d.value}
            </span>
            {showValues && <span className="mb-1 text-center text-xs font-medium tabular-nums group-hover:opacity-0">{d.value || ''}</span>}
            <div className="mx-auto w-full max-w-16 rounded-t-[4px] bg-accent transition group-hover:brightness-110" style={{ height: `${(d.value / max) * 82}%`, minHeight: d.value ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map(d => <span key={d.label} className="flex-1 truncate text-center text-[0.65rem] text-muted">{d.label}</span>)}
      </div>
    </figure>
  );
}

function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function HBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <ul className="grid gap-2">
      {rows.map(r => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-2 text-sm">
          <span className="truncate" title={r.label}>{r.label}</span>
          <span className="h-2 rounded-full bg-line"><span className="block h-2 rounded-full bg-accent" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums text-muted">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Stats({ books }: { books: Book[] }) {
  const read = useMemo(() => books.filter(b => b.status === 'read'), [books]);
  const dated = useMemo(() => read.filter(b => b.finishedAt), [read]);
  const years = useMemo(() => [...new Set(dated.map(b => +b.finishedAt!.slice(0, 4)))].sort((a, b) => b - a), [dated]);
  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear());
  const [goal, setGoal] = useState<number>(() => parseInt(safeGet('shelf.goal') ?? '', 10) || 24);
  useEffect(() => { try { localStorage.setItem('shelf.goal', String(goal)); } catch { /* ignore */ } }, [goal]);

  const rated = read.filter(b => b.rating > 0);
  const avg = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;
  const inYear = dated.filter(b => b.finishedAt!.startsWith(String(year)));
  const pages = inYear.reduce((s, b) => s + (b.pages ?? 0), 0);

  const perYear = [...years].reverse().map(y => ({ label: String(y), value: dated.filter(b => b.finishedAt!.startsWith(String(y))).length }));
  const perMonth = MONTHS.map((m, i) => ({ label: m, value: inYear.filter(b => +b.finishedAt!.slice(5, 7) === i + 1).length }));
  const perRating = [1, 2, 3, 4, 5].map(r => ({ label: `${r}★`, value: rated.filter(b => b.rating === r).length }));

  const topAuthors = Object.entries(
    read.reduce<Record<string, number>>((acc, b) => { if (b.author) acc[b.author] = (acc[b.author] ?? 0) + 1; return acc; }, {}),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([label, value]) => ({ label, value }));

  const byShelf = Object.entries(
    books.reduce<Record<string, number>>((acc, b) => { const k = b.shelf || 'No shelf'; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}),
  ).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));

  const audio = read.filter(b => b.format === 'audiobook').length;
  const goalPct = Math.min(100, Math.round((inYear.length / Math.max(1, goal)) * 100));

  if (books.length === 0) return <p className="py-16 text-center text-muted">Add some books to see your reading stats.</p>;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Books read" value={read.length} sub={`${books.filter(b => b.status === 'want').length} still to read`} />
        <Kpi label="Average rating" value={avg ? avg.toFixed(2) : '–'} sub={`${rated.length} rated`} />
        <Kpi label={`Finished in ${year}`} value={inYear.length} sub={pages ? `${pages.toLocaleString()} pages` : undefined} />
        <Kpi label="Audiobooks" value={audio} sub={read.length ? `${Math.round((audio / read.length) * 100)}% of read` : undefined} />
      </div>

      <Panel
        title={`Reading goal ${year}`}
        right={
          <label className="flex items-center gap-2 text-sm text-muted">Goal
            <input type="number" min={1} value={goal} onChange={e => setGoal(Math.max(1, parseInt(e.target.value, 10) || 1))} className="field !w-16 !py-1 text-center" />
          </label>
        }
      >
        <div className="h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={inYear.length} aria-valuemin={0} aria-valuemax={goal} aria-label="Reading goal progress">
          <div className="h-full rounded-full bg-accent" style={{ width: `${goalPct}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">{inYear.length} of {goal} books · {goalPct}%</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Books finished per year"><Bars data={perYear} label="Books finished per year" showValues /></Panel>
        <Panel
          title={`Books finished in ${year}`}
          right={years.length > 1 && (
            <select aria-label="Year" className="field !w-auto !py-1" value={year} onChange={e => setYear(+e.target.value)}>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          )}
        >
          <Bars data={perMonth} label={`Books finished per month in ${year}`} />
        </Panel>
        <Panel title="Rating distribution"><Bars data={perRating} label="Rating distribution" showValues /></Panel>
        <Panel title="Most read authors"><HBars rows={topAuthors} /></Panel>
        <Panel title="By shelf"><HBars rows={byShelf} /></Panel>
      </div>
    </div>
  );
}
