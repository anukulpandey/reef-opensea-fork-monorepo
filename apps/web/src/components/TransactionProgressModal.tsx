type TransactionProgressTone = "processing" | "success" | "error";

type TransactionProgressState = {
  title: string;
  message: string;
  detail?: string;
  steps: string[];
  activeStep: number;
  tone: TransactionProgressTone;
};

type TransactionProgressModalProps = {
  state: TransactionProgressState | null;
};

export default function TransactionProgressModal({ state }: TransactionProgressModalProps) {
  if (!state) {
    return null;
  }

  const stepCount = state.steps.length;
  const resolvedStepIndex =
    state.tone === "success"
      ? stepCount
      : Math.max(1, Math.min(stepCount, state.activeStep + 1));
  const progressPercent = stepCount > 0 ? Math.max(12, (resolvedStepIndex / stepCount) * 100) : 0;
  const statusLabel =
    state.tone === "processing" ? "Processing" : state.tone === "success" ? "Completed" : "Action failed";
  const currentStepLabel =
    stepCount > 0
      ? state.tone === "success"
        ? "All steps completed"
        : state.steps[Math.min(stepCount - 1, Math.max(0, state.activeStep))] ?? "Working"
      : "Working";

  return (
    <div className="transactionProgressOverlay" role="presentation">
      <div className={`transactionProgressModal tone-${state.tone}`} role="status" aria-live="polite">
        <div className="transactionProgressIntro">
          <span className={`transactionProgressStatusPill tone-${state.tone}`}>{statusLabel}</span>
          {state.steps.length ? (
            <span className="transactionProgressStepCount">
              Step {Math.min(stepCount, resolvedStepIndex)} of {stepCount}
            </span>
          ) : null}
        </div>

        <div className="transactionProgressBody">
          <div className="transactionProgressSignal" aria-hidden="true">
            <span className="transactionProgressSignalHalo" />
            <span className="transactionProgressSignalRing" />
            <span className="transactionProgressSignalCore" />
          </div>
          <div className="transactionProgressHeader">
            <h2>{state.title}</h2>
            <p>{state.message}</p>
            {state.detail ? <span className="transactionProgressDetail">{state.detail}</span> : null}
          </div>
        </div>

        {state.steps.length ? (
          <div className="transactionProgressWorkflow">
            <div className="transactionProgressSummaryGrid">
              <article className="transactionProgressSummaryCard">
                <span>Current step</span>
                <strong>{currentStepLabel}</strong>
              </article>
              <article className="transactionProgressSummaryCard">
                <span>Progress</span>
                <strong>{Math.round(progressPercent)}%</strong>
              </article>
            </div>

            <div className="transactionProgressBar" aria-hidden="true">
              <span
                className={
                  state.tone === "success"
                    ? "transactionProgressBarFill success"
                    : state.tone === "error"
                      ? "transactionProgressBarFill error"
                      : "transactionProgressBarFill"
                }
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="transactionProgressStepsShell">
              <div className="transactionProgressSectionHeader">
                <strong>Workflow</strong>
                <span>{stepCount} steps</span>
              </div>
              <div className="transactionProgressSteps">
                {state.steps.map((step, index) => {
                  const stepState =
                    state.tone === "success" || index < state.activeStep
                      ? "done"
                      : index === state.activeStep
                        ? state.tone === "error"
                          ? "error"
                          : "active"
                        : "pending";

                  const stepStateLabel =
                    stepState === "done"
                      ? "Done"
                      : stepState === "active"
                        ? "In progress"
                        : stepState === "error"
                          ? "Needs attention"
                          : "Pending";

                  return (
                    <div key={`${step}-${index}`} className={`transactionProgressStep ${stepState}`}>
                      <span className="transactionProgressStepMarker">
                        {stepState === "done" ? "✓" : index + 1}
                      </span>
                      <div className="transactionProgressStepCopy">
                        <span className="transactionProgressStepLabel">{step}</span>
                        <span className="transactionProgressStepState">{stepStateLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
