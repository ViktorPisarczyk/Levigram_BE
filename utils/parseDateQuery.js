// BE/utils/parseDateQuery.js
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addYears = (d, n) => new Date(d.getFullYear() + n, 0, 1);

const MONTHS_DE = [
  "januar",
  "februar",
  "märz",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "dezember",
];
const MONTHS_DE_SHORT = [
  "jan",
  "feb",
  "mär",
  "apr",
  "mai",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dez",
];

export function parseDateQuery(rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw) return { kind: "text", text: "" };

  const q = raw.toLowerCase();

  // relative
  if (q === "heute") {
    const from = startOfDay(new Date());
    const to = addDays(from, 1);
    return { kind: "date", range: { from, to } };
  }
  if (q === "gestern") {
    const today = startOfDay(new Date());
    const from = addDays(today, -1);
    const to = today;
    return { kind: "date", range: { from, to } };
  }

  // tokenize
  const tokens = q.split(/\s+/);
  let dateMatch = null;
  const textParts = [];

  const tryAttach = (m) => {
    if (!dateMatch) dateMatch = m;
  };

  for (const token of tokens) {
    let consumed = false;

    // dd.mm.yyyy | d.m.yy
    let m = token.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
    if (m) {
      const dd = Number(m[1]),
        mm = Number(m[2]) - 1,
        yyyy = m[3].length === 2 ? Number("20" + m[3]) : Number(m[3]);
      const from = new Date(yyyy, mm, dd);
      const to = addDays(from, 1);
      tryAttach({ kind: "date", range: { from, to } });
      consumed = true;
    }

    // yyyy-mm-dd
    if (!consumed) {
      m = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const from = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const to = addDays(from, 1);
        tryAttach({ kind: "date", range: { from, to } });
        consumed = true;
      }
    }

    // mm.yyyy | mm/yyyy
    if (!consumed) {
      m = token.match(/^(\d{1,2})[\.\/](\d{4})$/);
      if (m) {
        const from = new Date(Number(m[2]), Number(m[1]) - 1, 1);
        const to = addMonths(from, 1);
        tryAttach({ kind: "month", range: { from, to } });
        consumed = true;
      }
    }

    if (!consumed) textParts.push(token);
  }

  // "september 2025" / "sep 2025"
  const monthNameMatch = raw
    .toLowerCase()
    .match(
      /(jan(?:uar)?|feb(?:ruar)?|mär(?:z)?|apr(?:il)?|mai|jun(?:i)?|jul(?:i)?|aug(?:ust)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|dez(?:ember)?)\s+(\d{4})/i
    );
  if (!dateMatch && monthNameMatch) {
    const name = monthNameMatch[1].replace(".", "").toLowerCase();
    const yyyy = Number(monthNameMatch[2]);
    let idx = MONTHS_DE.indexOf(name);
    if (idx === -1) idx = MONTHS_DE_SHORT.indexOf(name);
    if (idx !== -1) {
      const from = new Date(yyyy, idx, 1);
      const to = addMonths(from, 1);
      const removed = raw.toLowerCase().replace(monthNameMatch[0], "").trim();
      return removed
        ? { kind: "month", range: { from, to }, text: removed }
        : { kind: "month", range: { from, to } };
    }
  }

  // Year only
  if (!dateMatch) {
    const yearOnly = raw.match(/(?:^|\s)(\d{4})(?:\s|$)/);
    if (yearOnly) {
      const y = Number(yearOnly[1]);
      const from = new Date(y, 0, 1);
      const to = addYears(from, 1);
      const removed = raw.replace(yearOnly[1], "").trim();
      return removed
        ? { kind: "year", range: { from, to }, text: removed }
        : { kind: "year", range: { from, to } };
    }
  }

  if (dateMatch) {
    const remaining = textParts.join(" ").trim();
    return remaining ? { ...dateMatch, text: remaining } : dateMatch;
  }

  return { kind: "text", text: raw };
}
