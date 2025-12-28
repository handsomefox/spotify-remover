type FlowStepsProps = {
  steps: string[];
  activeStep: number;
};

export default function FlowSteps({ steps, activeStep }: FlowStepsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {steps.map((label, index) => (
        <div
          key={label}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            index === activeStep
              ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
          }`}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
