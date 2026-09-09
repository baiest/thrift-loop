type StepState = 'completed' | 'current' | 'upcoming';

function stateFor(index: number, currentIndex: number): StepState {
  if (index < currentIndex) {
    return 'completed';
  }
  if (index === currentIndex) {
    return 'current';
  }
  return 'upcoming';
}

const CIRCLE_CLASSES: Record<StepState, string> = {
  completed: 'bg-brand-500 text-white',
  current: 'bg-brand-500 text-white',
  upcoming: 'bg-linen text-gray-500',
};

const LABEL_CLASSES: Record<StepState, string> = {
  completed: 'text-ink',
  current: 'text-ink font-semibold',
  upcoming: 'text-gray-400',
};

export interface StepperProps {
  readonly steps: readonly string[];
  readonly currentIndex: number;
}

export function Stepper({ steps, currentIndex }: StepperProps): React.JSX.Element {
  return (
    <ol className="flex items-center">
      {steps.map((label, index) => {
        const state = stateFor(index, currentIndex);
        return (
          <li key={label} data-state={state} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                // state is narrowed to the fixed StepState union, not attacker input.
                // eslint-disable-next-line security/detect-object-injection
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${CIRCLE_CLASSES[state]}`}
              >
                {index + 1}
              </span>
              {/* eslint-disable-next-line security/detect-object-injection -- state is the fixed StepState union */}
              <span className={`text-xs ${LABEL_CLASSES[state]}`}>{label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-px flex-1 ${state === 'completed' ? 'bg-brand-500' : 'bg-linen'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
