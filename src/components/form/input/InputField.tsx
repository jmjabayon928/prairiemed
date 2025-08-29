import React from "react";

// Extend native HTML input props so attributes like `required`, `name`, `value`, etc. work
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Show green success styles */
  success?: boolean;
  /** Show red error styles */
  error?: boolean;
  /** Optional hint text below the input */
  hint?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      success = false,
      error = false,
      disabled = false,
      hint,
      ...rest
    },
    ref
  ) => {
    // Base styles (kept from your original component)
    let inputClasses =
      "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ";

    // Variant styles (kept from your original component)
    if (disabled) {
      inputClasses +=
        "text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 ";
    } else if (error) {
      inputClasses +=
        "text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10  dark:text-error-400 dark:border-error-500 ";
    } else if (success) {
      inputClasses +=
        "text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300  dark:text-success-400 dark:border-success-500 ";
    } else {
      inputClasses +=
        "bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ";
    }

    // Allow overrides passed in
    if (className) inputClasses += className ? ` ${className}` : "";

    return (
      <div className="relative">
        <input
          ref={ref}
          disabled={disabled}
          className={inputClasses}
          {...rest} // <-- includes name, type, required, min, max, step, onChange, defaultValue/value, etc.
        />

        {/* Optional Hint Text */}
        {hint && (
          <p
            className={`mt-1.5 text-xs ${
              error
                ? "text-error-500"
                : success
                ? "text-success-500"
                : "text-gray-500"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
