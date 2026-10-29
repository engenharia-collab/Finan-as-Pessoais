export function parseAmountInput(value: string): number | null {
  let amount = value.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!amount || !/^[\d.,]+$/.test(amount)) return null;
  const comma = amount.lastIndexOf(",");
  const dot = amount.lastIndexOf(".");
  let normalized: string;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? /\./g : /,/g;
    const index = amount.lastIndexOf(decimal);
    const whole = amount.slice(0, index).replace(grouping, "");
    const fraction = amount.slice(index + 1);
    if (!/^\d+$/.test(whole) || !/^\d{1,2}$/.test(fraction)) return null;
    normalized = `${whole}.${fraction}`;
  } else if (comma >= 0) {
    const segments = amount.split(",");
    if (segments.length > 2 || !/^\d+$/.test(segments[0])) return null;
    if (segments[1] !== undefined && !/^\d{1,2}$/.test(segments[1])) return null;
    normalized = `${segments[0]}.${segments[1] ?? ""}`;
  } else if (dot >= 0) {
    const segments = amount.split(".");
    if (segments.length > 2) {
      if (!/^\d{1,3}(?:\.\d{3})+$/.test(amount)) return null;
      normalized = amount.replaceAll(".", "");
    } else if (segments[1].length === 3 && /^\d{1,3}(?:\.\d{3})+$/.test(amount)) {
      normalized = amount.replace(".", "");
    } else {
      if (!/^\d+$/.test(segments[0]) || !/^\d{1,2}$/.test(segments[1])) return null;
      normalized = `${segments[0]}.${segments[1]}`;
    }
  } else {
    normalized = amount;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const cents = Math.round(parsed * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isISOMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
