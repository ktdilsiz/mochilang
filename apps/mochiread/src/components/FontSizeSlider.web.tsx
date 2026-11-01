import { createElement, type ChangeEvent } from 'react';
import { useTheme } from '../theme';

export function FontSizeSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const theme = useTheme();
  return createElement('input', {
    type: 'range', min: 18, max: 48, step: 1, value,
    'aria-label': 'Font size', 'aria-valuetext': `${value} pixels`,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value)),
    style: { width: '100%', height: 36, margin: 0, accentColor: theme.accent, cursor: 'pointer' },
  });
}
