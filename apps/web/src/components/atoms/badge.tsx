export interface BadgeProps {
  readonly children: React.ReactNode;
  readonly tone?: 'neutral' | 'condition' | 'live' | 'ended' | 'draft' | 'own';
}

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-hairline text-ink-soft',
  condition: 'bg-linen text-ink',
  live: 'bg-brand-100 text-brand-700',
  ended: 'border border-hairline text-ink-faint',
  draft: 'bg-amber-100 text-amber-800',
  own: 'border border-ink text-ink',
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
