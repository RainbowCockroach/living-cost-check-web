import { useI18n } from "../i18n";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "icon-spin" : undefined}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-3.51-7.12" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

export default function RefreshButton({
  onClick,
  loading,
  className,
}: {
  onClick: () => void;
  loading: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`icon-btn${className ? " " + className : ""}`}
      aria-label={t("expenses.refresh")}
      title={t("expenses.refresh")}
    >
      <RefreshIcon spinning={loading} />
    </button>
  );
}
