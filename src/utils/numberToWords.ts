// Persian number to words converter & currency utilities

const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const dahgan = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const dahYek = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هیجده', 'نوزده'];
const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const basess = ['', ' هزار', ' میلیون', ' میلیارد', ' تریلیون'];

function convertThreeDigits(num: number): string {
  if (num === 0) return '';
  const parsed = num.toString().padStart(3, '0');
  const s = parseInt(parsed[0]);
  const d = parseInt(parsed[1]);
  const y = parseInt(parsed[2]);

  let result = '';

  if (s > 0) {
    result += sadgan[s];
  }

  if (d === 1) {
    if (result !== '') result += ' و ';
    result += dahYek[y];
  } else {
    if (d > 0) {
      if (result !== '') result += ' و ';
      result += dahgan[d];
    }
    if (y > 0) {
      if (result !== '') result += ' و ';
      result += yekan[y];
    }
  }

  return result;
}

export function numberToWordsPersian(num: number): string {
  if (num === 0) return 'صفر تومان';
  if (num < 0) return 'منفی ' + numberToWordsPersian(Math.abs(num));

  const strNum = Math.floor(num).toString();
  const groups: number[] = [];

  for (let i = strNum.length; i > 0; i -= 3) {
    groups.push(parseInt(strNum.substring(Math.max(0, i - 3), i)));
  }

  const parts: string[] = [];

  for (let i = 0; i < groups.length; i++) {
    const val = groups[i];
    if (val > 0) {
      const text = convertThreeDigits(val) + basess[i];
      parts.unshift(text);
    }
  }

  return parts.join(' و ') + ' تومان';
}

export function formatPersianPrice(price: number): string {
  if (isNaN(price)) return '0';
  return Math.round(price).toLocaleString('fa-IR');
}

export function formatPriceWithCurrency(price: number): string {
  return `${formatPersianPrice(price)} تومان`;
}

export function parsePersianNumber(str: string): number {
  if (!str) return 0;
  // Convert Persian/Arabic digits to English digits
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let cleanStr = str.toString();
  for (let i = 0; i < 10; i++) {
    cleanStr = cleanStr.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    cleanStr = cleanStr.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  cleanStr = cleanStr.replace(/[^0-9.-]/g, '');
  const val = parseFloat(cleanStr);
  return isNaN(val) ? 0 : val;
}
