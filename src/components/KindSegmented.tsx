import { useI18n, type MessageKey } from "../i18n";
import type { TxKind } from "../api";

// Shared two-way segmented toggle, originally introduced for NewExpenseScreen.
// Kept generic over `TxKind` so any screen that pivots on outflow/inflow can
// share the same visual treatment (low-contrast pill, colored underline on the
// active half).
const KINDS: {
  value: TxKind;
  glyph: string;
  labelKey: MessageKey;
  mod: "out" | "in";
}[] = [
  { value: "outflow", glyph: "−", labelKey: "new.kindExpense", mod: "out" },
  { value: "inflow", glyph: "+", labelKey: "new.kindIncome", mod: "in" },
];

type Props = {
  value: TxKind;
  onChange: (next: TxKind) => void;
  ariaLabel?: string;
};

export default function KindSegmented({ value, onChange, ariaLabel }: Props) {
  const { t } = useI18n();
  return (
    <div className="kind-segmented" role="tablist" aria-label={ariaLabel}>
      {KINDS.map((k) => {
        const active = value === k.value;
        return (
          <button
            key={k.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`kind-segmented__btn kind-segmented__btn--${k.mod} ${active ? "is-active" : ""}`}
            onClick={() => {
              if (value !== k.value) onChange(k.value);
            }}
          >
            <span className="kind-segmented__glyph" aria-hidden>
              {k.glyph}
            </span>
            {t(k.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
