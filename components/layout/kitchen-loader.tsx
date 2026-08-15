type KitchenLoaderProps = {
  label?: string;
  detail?: string;
};

export function KitchenLoader({
  label = "Preparing your page...",
  detail = "Kitchen is warming up.",
}: KitchenLoaderProps) {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-lg border bg-card px-6 py-8 text-center shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="kp-kitchen-loader" aria-hidden="true">
          <span className="kp-kitchen-loader__steam kp-kitchen-loader__steam--one" />
          <span className="kp-kitchen-loader__steam kp-kitchen-loader__steam--two" />
          <span className="kp-kitchen-loader__steam kp-kitchen-loader__steam--three" />
          <span className="kp-kitchen-loader__wing kp-kitchen-loader__wing--one" />
          <span className="kp-kitchen-loader__wing kp-kitchen-loader__wing--two" />
          <span className="kp-kitchen-loader__pot" />
          <span className="kp-kitchen-loader__flame kp-kitchen-loader__flame--one" />
          <span className="kp-kitchen-loader__flame kp-kitchen-loader__flame--two" />
        </div>
        <p className="mt-5 text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
