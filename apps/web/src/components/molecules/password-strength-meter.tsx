import { passwordStrength } from '@thrift-loop/shared';

const STRENGTH_SEGMENT_COUNT = 4;
const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
const STRENGTH_COLORS = [
  'bg-gray-200',
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-brand-500',
] as const;

export interface PasswordStrengthMeterProps {
  readonly password: string;
}

export function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps): React.JSX.Element | null {
  if (password.length === 0) {
    return null;
  }

  const score = passwordStrength(password);
  // score is clamped to [0, 4] by passwordStrength, matching these arrays' length.
  // eslint-disable-next-line security/detect-object-injection
  const color = STRENGTH_COLORS[score] ?? STRENGTH_COLORS[0];
  // eslint-disable-next-line security/detect-object-injection
  const label = STRENGTH_LABELS[score] ?? STRENGTH_LABELS[0];

  return (
    <div className="mt-2" data-testid="password-strength-meter">
      <div className="flex gap-1">
        {Array.from({ length: STRENGTH_SEGMENT_COUNT }, (_, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < score ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-600">{label}</p>
    </div>
  );
}
