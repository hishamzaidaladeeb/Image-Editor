import type { ReactNode } from "react";

type ComparisonItem = {
  label: string;
  url: string;
  alt?: string;
};

type ProcessingComparisonProps = {
  title: string;
  items: ComparisonItem[];
  processing?: boolean;
  processingLabel: string;
  children?: ReactNode;
};

export function ProcessingComparison({
  title,
  items,
  processing = false,
  processingLabel,
  children,
}: ProcessingComparisonProps) {
  if (items.length === 0) return null;

  return (
    <section className="processing-comparison" aria-label={title}>
      <div className="processing-comparison-header">
        <h2>{title}</h2>
        {children}
      </div>
      <div className={`processing-comparison-grid ${items.length === 3 ? "processing-comparison-grid-triple" : ""}`}>
        {items.map((item) => (
          <article className="processing-comparison-card" key={`${item.label}-${item.url}`}>
            <h3>{item.label}</h3>
            <div className="processing-comparison-frame">
              <img src={item.url} alt={item.alt ?? item.label} />
              {processing && item === items[items.length - 1] ? (
                <div className="processing-comparison-overlay" role="status" aria-live="polite">
                  {processingLabel}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export type { ComparisonItem };
