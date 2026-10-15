import { Star } from 'lucide-react';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}

/** Read-only when onChange is omitted. Clicking the current value clears the rating. */
export default function Stars({ value, onChange, size = 14 }: Props) {
  if (!value && !onChange) return <span className="text-xs text-muted">Unrated</span>;
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`Rating: ${value || 'none'} of 5`}>
      {[1, 2, 3, 4, 5].map(n => {
        const star = <Star size={size} className={n <= value ? 'fill-star text-star' : 'text-line'} strokeWidth={1.75} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="rounded p-0.5 transition hover:scale-125" onClick={() => onChange(n === value ? 0 : n)}>
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}
