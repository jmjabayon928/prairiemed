'use client';

import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Label from './Label';
import { Calendar } from 'lucide-react';

import type { Instance } from 'flatpickr/dist/types/instance';
import type {
  BaseOptions,
  Hook,
  DateOption,
} from 'flatpickr/dist/types/options';

type Props = Readonly<{
  id: string;
  mode?: 'single' | 'multiple' | 'range' | 'time';
  onChange?: Hook | Hook[];
  /** Flatpickr accepts a single date or an array depending on mode */
  defaultDate?: DateOption | DateOption[];
  label?: string;
  placeholder?: string;
  className?: string;
}>;

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Use Partial<BaseOptions> — flatpickr accepts a subset of options.
    const options: Partial<BaseOptions> = {
      mode: mode ?? 'single',
      static: true,
      monthSelectorType: 'static',
      dateFormat: 'Y-m-d',
      ...(defaultDate !== undefined ? { defaultDate } : {}),
      ...(onChange ? { onChange } : {}),
    };

    const fp: Instance = flatpickr(inputRef.current, options);
    return () => fp.destroy();
  }, [mode, defaultDate, onChange]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          placeholder={placeholder}
          className={
            className ??
            'h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800'
          }
          type="text"
          aria-label="Date Picker"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <Calendar className="size-6" />
        </span>
      </div>
    </div>
  );
}
