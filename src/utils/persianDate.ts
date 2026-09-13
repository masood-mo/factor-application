// Pure zero-dependency Jalali (Shamsi) Date Converter & Utility

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  return [gy, gm, days + 1];
}

export function getCurrentJalaliDate(): string {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

export function formatJalaliDate(dateStr?: string | Date): string {
  if (!dateStr) return getCurrentJalaliDate();
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    return dateStr;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return getCurrentJalaliDate();
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

export function parseJalaliToDate(jalaliStr: string): Date | null {
  if (!jalaliStr) return null;
  const parts = jalaliStr.split('/').map((s) => parseInt(s, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [gy, gm, gd] = jalaliToGregorian(parts[0], parts[1], parts[2]);
  return new Date(gy, gm - 1, gd, 12, 0, 0);
}

export function isDateInRange(dateJalali: string, startDateJalali?: string, endDateJalali?: string): boolean {
  if (!dateJalali) return false;
  if (!startDateJalali && !endDateJalali) return true;

  const dateNorm = dateJalali.trim();
  const startNorm = startDateJalali ? startDateJalali.trim() : '1300/01/01';
  const endNorm = endDateJalali ? endDateJalali.trim() : '1500/12/29';

  return dateNorm >= startNorm && dateNorm <= endNorm;
}

export function getTodayJalali(): string {
  return getCurrentJalaliDate();
}

export function getFirstDayOfMonthJalali(): string {
  const current = getCurrentJalaliDate();
  const parts = current.split('/');
  return `${parts[0]}/${parts[1]}/01`;
}

export function getLastDayOfMonthJalali(): string {
  const current = getCurrentJalaliDate();
  const parts = current.split('/');
  const month = parseInt(parts[1], 10);
  const lastDay = month <= 6 ? '31' : month <= 11 ? '30' : '29';
  return `${parts[0]}/${parts[1]}/${lastDay}`;
}

export function getDaysDifferenceFromToday(targetJalali: string): number {
  const targetDate = parseJalaliToDate(targetJalali);
  const today = parseJalaliToDate(getCurrentJalaliDate());
  if (!targetDate || !today) return 999;
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getChequeAlarmStatus(dueDateJalali: string, alarmDays: number = 2) {
  const daysLeft = getDaysDifferenceFromToday(dueDateJalali);
  const isPast = daysLeft < 0;
  const isToday = daysLeft === 0;
  const isAlarm = daysLeft >= 0 && daysLeft <= alarmDays;
  return {
    daysLeft,
    isPast,
    isToday,
    isAlarm
  };
}

export function formatPersianPrice(num: number | string | undefined | null): string {
  if (num === undefined || num === null || isNaN(Number(num))) return '۰';
  return Number(num).toLocaleString('fa-IR');
}

export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

// Formats any Jalali or Gregorian date string into standard Jalali with Persian numerals (e.g. ۱۴۰۳/۰۶/۲۰)
export function formatPersianDate(dateStr?: string | Date): string {
  if (!dateStr) return toPersianDigits(getCurrentJalaliDate());
  let str = '';
  if (typeof dateStr === 'string') {
    if (dateStr.includes('/')) {
      str = dateStr;
    } else {
      const d = new Date(dateStr);
      str = isNaN(d.getTime()) ? dateStr : formatJalaliDate(d);
    }
  } else {
    str = formatJalaliDate(dateStr);
  }
  return toPersianDigits(str);
}

export function toEnglishDigits(str?: string | null): string {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return res;
}

/**
 * Generate invoice serial number in the requested format:
 * F-year-0001 (e.g., F-۱۴۰۵-۰۰۰۱ or F-1405-0001 converted to Persian digits)
 * Starts from 0001 for each Persian calendar year.
 */
export function generateNextInvoiceSerialNumber(existingSerialNumbers: string[], dateJalali?: string): string {
  const jalali = dateJalali || getCurrentJalaliDate();
  const yearEng = toEnglishDigits(jalali.split('/')[0] || '1403');
  
  let maxSeq = 0;
  for (const rawSerial of existingSerialNumbers) {
    if (!rawSerial) continue;
    const clean = toEnglishDigits(rawSerial).trim();
    // Match patterns like F-1405-0001 or F-1405-1 or similar
    const match = clean.match(/^F-(\d{4})-(\d+)$/i);
    if (match) {
      const serialYear = match[1];
      const serialNum = parseInt(match[2], 10);
      if (serialYear === yearEng && !isNaN(serialNum)) {
        if (serialNum > maxSeq) {
          maxSeq = serialNum;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  // Format with Persian numerals: F-۱۴۰۵-۰۰۰۱
  return `F-${toPersianDigits(yearEng)}-${toPersianDigits(seqStr)}`;
}
