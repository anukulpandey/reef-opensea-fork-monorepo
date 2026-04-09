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

  return (
    <div className="transactionProgressOverlay" role="presentation">
      <div className={`transactionProgressModal tone-${state.tone}`} role="status" aria-live="polite">
        <div className="transactionProgressVisual">
          <span className="transactionProgressGlow transactionProgressGlow--left" />
          <span className="transactionProgressGlow transactionProgressGlow--right" />
          <div className="transactionOrbScene">
            <span className="transactionPulseAura" />
            <span className="transactionOrbOrbit transactionOrbOrbit--one">
              <span className="transactionOrbSatellite" />
            </span>
            <span className="transactionOrbOrbit transactionOrbOrbit--two">
              <span className="transactionOrbSatellite" />
            </span>
            <div className="transactionOrb">
              <span className="transactionOrbRing transactionOrbRing--outer" />
              <span className="transactionOrbRing transactionOrbRing--middle" />
              <span className="transactionOrbCore" />
            </div>
          </div>
        </div>

        <div className="transactionProgressHeader">
          <span className="transactionProgressEyebrow">
            {state.tone === "processing"
              ? "Processing"
              : state.tone === "success"
                ? "Completed"
                : "Action failed"}
          </span>
          <h2>{state.title}</h2>
          <p>{state.message}</p>
          {state.detail ? <span className="transactionProgressDetail">{state.detail}</span> : null}
        </div>

        {state.steps.length ? (
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
        ) : null}

        {state.steps.length ? (
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

              return (
                <div key={`${step}-${index}`} className={`transactionProgressStep ${stepState}`}>
                  <span className="transactionProgressStepMarker" />
                  <span className="transactionProgressStepLabel">{step}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
