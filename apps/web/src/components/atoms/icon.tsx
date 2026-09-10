export type IconName =
  | 'compass'
  | 'tag'
  | 'plus-circle'
  | 'user'
  | 'log-out'
  | 'search'
  | 'sliders'
  | 'x'
  | 'upload'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'grip'
  | 'gavel'
  | 'bell'
  | 'alert-circle'
  | 'check-circle';

const ICON_PATHS: Record<IconName, string> = {
  compass: 'M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 6.5l-2 5-5 2 2-5 5-2z',
  tag: 'M20 10l-9-9H3v8l9 9 8-8zM7 7h.01',
  'plus-circle': 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6v8m-4-4h8',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  'log-out': 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35',
  sliders: 'M4 6h16M4 12h10M4 18h6M17 15v6M14 3v6',
  x: 'M18 6L6 18M6 6l12 12',
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  grip: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  gavel: 'M3 14l6-6 4 4-6 6zM13 4l7 7M2 20h8',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  'alert-circle': 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6v5m0 3h.01',
  'check-circle': 'M12 2a10 10 0 100 20 10 10 0 000-20zm-3.5 10.5l2.5 2.5 5-5',
};

export interface IconProps {
  readonly name: IconName;
  readonly className?: string;
  readonly 'aria-label'?: string;
}

export function Icon({ name, className, 'aria-label': ariaLabel }: IconProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : 'true'}
      className={className}
    >
      {/* name is narrowed to the fixed IconName union, not attacker input. */}
      {/* eslint-disable-next-line security/detect-object-injection */}
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
