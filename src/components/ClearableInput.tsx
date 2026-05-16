import { forwardRef } from 'react';

// Thin wrapper that adds a round "×" button on the right when the field has
// content. Mirrors the .input-wrap / .input-clear CSS pair already in
// styles.css. The mousedown-with-preventDefault is the load-bearing bit: it
// keeps focus on the input so a combobox dropdown doesn't close on clear.
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> & {
  value: string;
  onClear: () => void;
  clearAriaLabel?: string;
};

const ClearableInput = forwardRef<HTMLInputElement, Props>(function ClearableInput(
  { value, onClear, clearAriaLabel = 'Clear', disabled, className, ...rest },
  ref,
) {
  return (
    <span className="input-wrap">
      <input
        {...rest}
        ref={ref}
        value={value}
        disabled={disabled}
        className={className}
      />
      {value && !disabled && (
        <button
          type="button"
          className="input-clear"
          aria-label={clearAriaLabel}
          onMouseDown={(e) => {
            e.preventDefault();
            onClear();
          }}
        >
          ×
        </button>
      )}
    </span>
  );
});

export default ClearableInput;
