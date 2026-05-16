import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Two languages for now; default Vietnamese. Adding a third just means another
// entry in `messages` plus its code in `Lang`.
export type Lang = "vi" | "en";

const STORAGE_KEY = "lcc.lang";

// Flat key/value dictionaries keep the call sites obvious (`t('nav.new')`)
// and TypeScript can enforce that every key exists in every language.
const messages = {
  vi: {
    "nav.new": "Mới",
    "nav.expenses": "Giao dịch",
    "nav.budget": "Ngân sách",
    "nav.apiKey": "Khoá API",
    "nav.signOut": "Đăng xuất",
    "nav.language": "Ngôn ngữ",

    "apiKey.title": "Khoá API",
    "apiKey.help":
      "Dán khoá API cá nhân của bạn. Khoá chỉ được lưu trong localStorage của trình duyệt trên thiết bị này.",
    "apiKey.label": "Khoá",
    "apiKey.placeholder": "Hỏi Vân để lấy",
    "apiKey.save": "Lưu",
    "apiKey.verifying": "Đang xác minh…",
    "apiKey.required": "Vui lòng nhập khoá API.",
    "apiKey.unreachable": "Không thể kết nối tới máy chủ.",

    "new.title": "Khoản chi mới",
    "new.titleIncome": "Thu nhập mới",
    "new.kindExpense": "Chi",
    "new.kindIncome": "Thu",
    "new.amount": "Số tiền (VND)",
    "new.tag": "Loại chi tiêu",
    "new.tagIncome": "Loại thu nhập",
    "new.note": "Chú thích (không bắt buộc)",
    "new.notePlaceholder": "VD: Đi cafe với bạn",
    "new.save": "Lưu",
    "new.saving": "Đang lưu…",
    "new.savedTo": "Đã lưu {amount} ₫ vào “{tag}”.",
    "new.savedIncomeTo": "Đã ghi {amount} ₫ thu nhập vào “{tag}”.",
    "new.invalidAmount": "Số tiền phải là số nguyên dương (VND).",
    "new.pickTag": "Chọn hoặc tạo một loại.",
    "new.failed": "Lưu không thành công.",
    "new.addPart": "Cộng vào tổng",
    "new.removePart": "Bỏ {amount} ₫",
    "new.partsTotal": "Tổng: {amount} ₫",

    "expenses.title": "Giao dịch",
    "expenses.from": "Từ",
    "expenses.to": "Đến",
    "expenses.refresh": "Làm mới",
    "expenses.loading": "Đang tải…",
    "expenses.edit": "Sửa",
    "expenses.done": "Xong",
    "expenses.delete": "Xoá",
    "expenses.summary": "{shown} trên {total} • {sum} ₫",
    "expenses.rangeTotal": "Tổng: {total} ₫",
    "expenses.empty": "Không có giao dịch nào trong khoảng này.",
    "expenses.loadFailed": "Không tải được dữ liệu.",
    "expenses.deleteFailed": "Xoá không thành công.",

    "budget.title": "Ngân sách tháng",
    "budget.prev": "Tháng trước",
    "budget.next": "Tháng sau",
    "budget.thisMonth": "Tháng này",
    "budget.toBeBudgeted": "Còn lại để phân bổ: {amount} ₫",
    "budget.empty": "Chưa có loại chi tiêu nào. Tạo một loại bằng cách thêm một khoản chi.",
    "budget.col.tag": "Loại",
    "budget.col.assigned": "Phân bổ",
    "budget.col.spent": "Đã chi",
    "budget.col.available": "Còn lại",
    "budget.invalidAmount": "Số tiền phải là số nguyên không âm.",
    "budget.loadFailed": "Không tải được ngân sách.",
    "budget.saveFailed": "Lưu phân bổ thất bại.",

    "tag.searchOrCreate": "Loại chi tiêu",
    "tag.create": "+ Tạo “{name}”",
  },
  en: {
    "nav.new": "New",
    "nav.expenses": "Transactions",
    "nav.budget": "Budget",
    "nav.apiKey": "API key",
    "nav.signOut": "Sign out",
    "nav.language": "Language",

    "apiKey.title": "API key",
    "apiKey.help":
      "Paste your personal API key. It is stored in your browser's localStorage on this device only.",
    "apiKey.label": "Key",
    "apiKey.placeholder": "paste key here",
    "apiKey.save": "Save",
    "apiKey.verifying": "Verifying…",
    "apiKey.required": "API key is required.",
    "apiKey.unreachable": "Could not reach the server.",

    "new.title": "New expense",
    "new.titleIncome": "New income",
    "new.kindExpense": "Expense",
    "new.kindIncome": "Income",
    "new.amount": "Amount (VND)",
    "new.tag": "Tag",
    "new.tagIncome": "Income tag",
    "new.note": "Note (optional)",
    "new.notePlaceholder": "e.g. lunch with team",
    "new.save": "Save",
    "new.saving": "Saving…",
    "new.savedTo": "Saved {amount} ₫ to “{tag}”.",
    "new.savedIncomeTo": "Recorded {amount} ₫ income to “{tag}”.",
    "new.invalidAmount": "Amount must be a positive whole number (VND).",
    "new.pickTag": "Pick or create a tag.",
    "new.failed": "Failed to save.",
    "new.addPart": "Add to total",
    "new.removePart": "Remove {amount} ₫",
    "new.partsTotal": "Total: {amount} ₫",

    "expenses.title": "Transactions",
    "expenses.from": "From",
    "expenses.to": "To",
    "expenses.refresh": "Refresh",
    "expenses.loading": "Loading…",
    "expenses.edit": "Edit",
    "expenses.done": "Done",
    "expenses.delete": "Delete",
    "expenses.summary": "{shown} of {total} • {sum} ₫",
    "expenses.rangeTotal": "Total: {total} ₫",
    "expenses.empty": "No transactions in this range.",
    "expenses.loadFailed": "Failed to load.",
    "expenses.deleteFailed": "Delete failed.",

    "budget.title": "Monthly budget",
    "budget.prev": "Prev",
    "budget.next": "Next",
    "budget.thisMonth": "This month",
    "budget.toBeBudgeted": "To be budgeted: {amount} ₫",
    "budget.empty": "No spending tags yet. Create one by logging an expense.",
    "budget.col.tag": "Tag",
    "budget.col.assigned": "Assigned",
    "budget.col.spent": "Spent",
    "budget.col.available": "Available",
    "budget.invalidAmount": "Amount must be a non-negative whole number.",
    "budget.loadFailed": "Failed to load budget.",
    "budget.saveFailed": "Failed to save assignment.",

    "tag.searchOrCreate": "search or create a tag",
    "tag.create": "+ Create “{name}”",
  },
} as const;

export type MessageKey = keyof (typeof messages)["vi"];

// `vars` are spliced in with a tiny `{name}` replacer — enough for our needs
// without dragging in a full ICU formatter.
function format(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  // BCP-47 locale to hand to Intl APIs (dates, numbers). Kept here so screens
  // don't each have to map 'vi' → 'vi-VN'.
  locale: string;
};

const I18nContext = createContext<Ctx | null>(null);

function readInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "vi" || stored === "en") return stored;
  return "vi";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    // Reflect the choice on <html lang> for screen readers / browser UI.
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = messages[lang];
    return {
      lang,
      setLang: setLangState,
      t: (key, vars) => format(dict[key], vars),
      locale: lang === "vi" ? "vi-VN" : "en-US",
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n called outside <I18nProvider>");
  return ctx;
}

// Convenience: most call sites only want `t`.
export function useT() {
  return useI18n().t;
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <select
      aria-label={t("nav.language")}
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      className="lang-switcher"
    >
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
