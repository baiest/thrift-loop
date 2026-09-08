export interface BadgeProps {
  readonly children: React.ReactNode;
  readonly tone?: 'neutral' | 'emerald' | 'amber';
}

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
};

export function Badge({ children, tone = 'neutral' }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        // tone is narrowed to the fixed union above, not attacker input.
        // eslint-disable-next-line security/detect-object-injection
        TONE_CLASSES[tone]
      }`}
    >
      {children}
    </span>
  );
}
