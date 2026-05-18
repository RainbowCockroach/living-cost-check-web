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
    "nav.expenses": "Thống kê",
    "nav.budget": "Ngân sách",
    "nav.tags": "Loại",
    "nav.targets": "Kế hoạch",
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
    "apiKey.lastError": "Lần trước máy chủ trả về {status} cho {path} lúc {at}. Có thể khoá đã sai, hoặc kết nối tạm thời gặp lỗi.",
    "apiKey.storedPresent": "Khoá đã lưu trên thiết bị này (độ dài {length}).",
    "apiKey.storedMissing": "Hiện không có khoá nào lưu trên thiết bị này — localStorage có thể đã bị trình duyệt xoá.",

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
    "new.recentTags": "Loại hay dùng",
    "new.addNote": "+ Thêm chú thích",
    "new.addDate": "+ Chọn ngày khác",
    "new.date": "Ngày",
    "new.dateToday": "Hôm nay",

    "expenses.title": "Giao dịch",
    "expenses.from": "Từ",
    "expenses.to": "Đến",
    "expenses.refresh": "⟳",
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
    "budget.empty":
      "Chưa có loại chi tiêu nào. Tạo một loại bằng cách thêm một khoản chi.",
    "budget.col.tag": "Loại",
    "budget.col.assigned": "Phân bổ",
    "budget.col.spent": "Đã chi",
    "budget.col.available": "Còn lại",
    "budget.invalidAmount": "Số tiền phải là số nguyên không âm.",
    "budget.loadFailed": "Không tải được ngân sách.",
    "budget.saveFailed": "Lưu phân bổ thất bại.",

    "tag.searchOrCreate": "Loại chi tiêu",
    "tag.create": "+ Tạo “{name}”",

    "tags.title": "Quản lý loại",
    "tags.tab.spending": "Loại chi",
    "tags.tab.income": "Loại thu",
    "tags.col.name": "Tên",
    "tags.col.color": "Màu",
    "tags.col.actions": "",
    "tags.new.name": "Tên loại mới",
    "tags.new.add": "Thêm",
    "tags.empty": "Chưa có loại nào.",
    "tags.delete": "Xoá",
    "tags.deleteConfirm": "Xoá loại “{name}”?",
    "tags.loadFailed": "Không tải được danh sách loại.",
    "tags.saveFailed": "Lưu không thành công.",
    "tags.createFailed": "Tạo loại không thành công.",
    "tags.deleteFailed": "Xoá không thành công.",
    "tags.invalidName": "Tên loại không hợp lệ.",

    "targets.title": "Kế hoạch ngân sách",
    "targets.add": "Thêm kế hoạch",
    "targets.edit": "Sửa",
    "targets.delete": "Xoá",
    "targets.empty": "Chưa có kế hoạch nào.",
    "targets.form.tag": "Loại chi tiêu",
    "targets.form.kind": "Loại",
    "targets.form.amount": "Số tiền (VND)",
    "targets.form.dueMonth": "Tháng đến hạn",
    "targets.form.note": "Chú thích",
    "targets.form.save": "Lưu",
    "targets.form.cancel": "Huỷ",
    "targets.kind.by_date": "Đến hạn phải chi",
    "targets.kind.monthly_refill": "Dự phòng hàng tháng",
    "targets.kind.monthly_contribution": "Phải chi hàng tháng",
    "targets.monthsLeft": "{n} tháng còn lại",
    "targets.monthOverdue": "Đã quá hạn",
    "targets.deleteConfirm": "Xoá kế hoạch cho “{name}”?",
    "targets.invalidAmount": "Số tiền phải là số nguyên dương.",
    "targets.invalidDueMonth": "Vui lòng chọn tháng đến hạn.",
    "targets.invalidTag": "Vui lòng chọn một loại chi tiêu.",
    "targets.loadFailed": "Không tải được danh sách kế hoạch.",
    "targets.saveFailed": "Lưu kế hoạch thất bại.",
    "targets.deleteFailed": "Xoá kế hoạch thất bại.",

    "budget.col.needed": "Cần",
    "budget.col.target": "Kế hoạch",
    "budget.assignNeeded": "Phân bổ {amount} ₫",
    "budget.addTarget": "+ Thêm kế hoạch",
  },
  en: {
    "nav.new": "New",
    "nav.expenses": "Transactions",
    "nav.budget": "Budget",
    "nav.tags": "Tags",
    "nav.targets": "Targets",
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
    "apiKey.lastError": "Last server response was {status} on {path} at {at}. The key may be wrong, or the connection failed transiently.",
    "apiKey.storedPresent": "A key is stored on this device (length {length}).",
    "apiKey.storedMissing": "No key is stored on this device — the browser may have cleared localStorage.",

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
    "new.recentTags": "Frequently used",
    "new.addNote": "+ Add a note",
    "new.addDate": "+ Pick a date",
    "new.date": "Date",
    "new.dateToday": "Today",

    "expenses.title": "Transactions",
    "expenses.from": "From",
    "expenses.to": "To",
    "expenses.refresh": "⟳",
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

    "tags.title": "Manage tags",
    "tags.tab.spending": "Spending",
    "tags.tab.income": "Income",
    "tags.col.name": "Name",
    "tags.col.color": "Color",
    "tags.col.actions": "",
    "tags.new.name": "New tag name",
    "tags.new.add": "Add",
    "tags.empty": "No tags yet.",
    "tags.delete": "Delete",
    "tags.deleteConfirm": "Delete tag “{name}”?",
    "tags.loadFailed": "Failed to load tags.",
    "tags.saveFailed": "Failed to save.",
    "tags.createFailed": "Failed to create tag.",
    "tags.deleteFailed": "Failed to delete.",
    "tags.invalidName": "Invalid tag name.",

    "targets.title": "Budget targets",
    "targets.add": "Add target",
    "targets.edit": "Edit",
    "targets.delete": "Delete",
    "targets.empty": "No targets yet.",
    "targets.form.tag": "Tag",
    "targets.form.kind": "Kind",
    "targets.form.amount": "Amount (VND)",
    "targets.form.dueMonth": "Due month",
    "targets.form.note": "Note",
    "targets.form.save": "Save",
    "targets.form.cancel": "Cancel",
    "targets.kind.by_date": "By date",
    "targets.kind.monthly_refill": "Monthly refill",
    "targets.kind.monthly_contribution": "Monthly contribution",
    "targets.monthsLeft": "{n} months left",
    "targets.monthOverdue": "Overdue",
    "targets.deleteConfirm": "Delete the target for “{name}”?",
    "targets.invalidAmount": "Amount must be a positive whole number.",
    "targets.invalidDueMonth": "Please choose a due month.",
    "targets.invalidTag": "Please pick a spending tag.",
    "targets.loadFailed": "Failed to load targets.",
    "targets.saveFailed": "Failed to save target.",
    "targets.deleteFailed": "Failed to delete target.",

    "budget.col.needed": "Needed",
    "budget.col.target": "Target",
    "budget.assignNeeded": "Assign {amount} ₫",
    "budget.addTarget": "+ Add target",
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
