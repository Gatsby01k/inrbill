/**
 * Zero-JS collapsible section (native <details>/<summary>) — used to tuck
 * away secondary controls (decision notes, "add another", rarely-touched
 * forms) so the primary next action on a card stays the only thing visible
 * by default, instead of every possible control being shown flat at once.
 */
export function Disclosure({
  label,
  defaultOpen = false,
  className,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details className={className} open={defaultOpen}>
      <summary className="disclosure-summary">
        <span className="chev" aria-hidden>
          ▸
        </span>
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
