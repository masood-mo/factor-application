import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  LodgeSettings,
  Category,
  Item,
  SalesInvoice,
  PurchaseInvoice,
  Guest,
  WalletTransaction,
  Cheque,
  WagePayment,
  BudgetRowConfig,
  Investor,
  InvestorPayout
} from '../types';
import { getCurrentJalaliDate } from '../utils/persianDate';

const SETTINGS_DOC = 'general';

export const DEFAULT_BUDGET_ROWS: BudgetRowConfig[] = [
  {
    id: 'b-wages',
    name: 'حقوق و دستمزد و انعام پرسنل',
    percentage: 20,
    description: 'حقوق و دستمزد پرسنل اقامتگاه، آشپزخانه و خدمات',
    isWageRow: true,
    isLocked: true,
  },
  {
    id: 'b-pcat-1',
    name: 'مواد غذایی و بهداشتی',
    percentage: 25,
    description: 'هزینه خرید مواد خوراکی، دیزی، گوشت، برنج، شوینده‌ها و ملزومات بهداشتی',
    purchaseCategoryId: 'pcat-1',
    isLocked: true,
  },
  {
    id: 'b-pcat-2',
    name: 'قبض و اینترنت',
    percentage: 5,
    description: 'قبوض آب، برق، گاز، اشتراک اینترنت و تلفن اقامتگاه',
    purchaseCategoryId: 'pcat-2',
    isLocked: true,
  },
  {
    id: 'b-pcat-3',
    name: 'تعمیرات و نگهداری',
    percentage: 10,
    description: 'کاهگل‌کاری، تاسیسات، رنگ‌آمیزی و مرمت سنتی بنا',
    purchaseCategoryId: 'pcat-3',
    isLocked: true,
  },
  {
    id: 'b-pcat-4',
    name: 'تبلیغات و محیط زیست',
    percentage: 5,
    description: 'تبلیغات مجازی، عکاسی، تفکیک زباله و حفاظت از محیط زیست',
    purchaseCategoryId: 'pcat-4',
    isLocked: true,
  },
  {
    id: 'b-investor',
    name: 'سود سرمایه‌گذار',
    percentage: 35,
    description: 'سهم سود مصوب سرمایه‌گذار از سود عملیاتی اقامتگاه',
    isInvestorShare: true,
    isLocked: true,
  },
];

export const DEFAULT_PURCHASE_CATEGORIES: Category[] = [
  { id: 'pcat-1', name: 'مواد غذایی و بهداشتی', description: 'مواد خوراکی، گوشت، برنج، لبنیات، شوینده‌ها و اقلام بهداشتی', type: 'PURCHASE' },
  { id: 'pcat-2', name: 'قبض و اینترنت', description: 'قبوض آب، برق، گاز، اشتراک اینترنت و تلفن اقامتگاه', type: 'PURCHASE' },
  { id: 'pcat-3', name: 'تعمیرات و نگهداری', description: 'تعمیرات تاسیسات، رنگ‌آمیزی، بهسازی اتاق‌ها و مرمت بنا', type: 'PURCHASE' },
  { id: 'pcat-4', name: 'تبلیغات و محیط زیست', description: 'تبلیغات، تولید محتوا، تفکیک پسماند و محیط زیست بوم‌گردی', type: 'PURCHASE' },
  { id: 'pcat-5', name: 'تجهیزات و ملزومات مصرفی', description: 'ظروف، ملحفه، منسوجات و تجهیزات مصرفی اقامتگاه', type: 'PURCHASE' },
];

export const DEFAULT_PURCHASE_ITEMS: Item[] = [];

export const DEFAULT_SETTINGS: LodgeSettings = {
  lodgeName: 'اقامتگاه بوم‌گردی خانه برزک',
  lodgeLogo: '/lodge-logo.svg',
  signatureImage: '',
  stampImage: '',
  economicCode: '411548796541',
  phone: '09132608400 - 03155663322',
  address: 'استان اصفهان، کاشان، شهر تاریخی و توریستی برزک، محله مصلی، کوچه باغ گل سرخ',
  taxRate: 0,
  accountNumber: '110-854721-1',
  cardNumber: '6037-9975-4321-8890',
  shaba: 'IR450170000000110854721001',
  accountOwner: 'مسعود ملائی (اقامتگاه بوم‌گردی خانه برزک)',
  units: ['نفر/شب', 'اتاق/شب', 'عدد', 'پرس', 'وعده', 'دست', 'کیلوگرم', 'تور', 'بسته', 'ساعت', 'بطری'],
  customerTitle: 'مهمان',
  whatsappShareTemplate: 'دوست گرامی با احترام، صورتحساب اقامتگاه بوم‌گردی خانه برزک به پیوست تقدیم می‌گردد:',
  chequeAlarmDays: 2,
  budgetRows: DEFAULT_BUDGET_ROWS,
  investorSharePercent: 35,
  investorExemptCategoryIds: ['cat-3'],
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'اقامت و صبحانه محلی', description: 'رزرو اتاق‌های سنتی خانه برزک همراه با صبحانه ویژه' },
  { id: 'cat-2', name: 'رستوران و نوشیدنی‌های سنتی', description: 'غذاهای سنتی کاشان، دیزی، شربت گل محمدی و دمنوش' },
  { id: 'cat-3', name: 'دست‌آفرید و صنایع دستی برزک', description: 'گلاب ناب، عرق نعنا، گلیم سنتی و سوغات برزک' },
  { id: 'cat-4', name: 'تور، بوم‌گردی و تجارب محلی', description: 'تور باغ‌گردی گل محمدی، رصد ستارگان و کویرنوردی' },
  { id: 'cat-5', name: 'سایر خدمات و پذیرایی اختصاصی', description: 'خدمات ویژه، عکاسی سنتی، حمل و نقل توریستی' }
];

export const DEFAULT_ITEMS: Item[] = [
  { id: 'item-1', categoryId: 'cat-1', categoryName: 'اقامت و صبحانه محلی', name: 'اقامت در سوئیت شاه‌نشین مهتاب (با صبحانه بوفه)', unit: 'نفر/شب', basePrice: 950000 },
  { id: 'item-2', categoryId: 'cat-1', categoryName: 'اقامت و صبحانه محلی', name: 'اقامت در اتاق سنتی ترنج (همراه صبحانه)', unit: 'نفر/شب', basePrice: 750000 },
  { id: 'item-3', categoryId: 'cat-1', categoryName: 'اقامت و صبحانه محلی', name: 'رزرو دربست حیاط و خانه برزک', unit: 'اتاق/شب', basePrice: 6500000 },
  { id: 'item-4', categoryId: 'cat-2', categoryName: 'رستوران و نوشیدنی‌های سنتی', name: 'دیزی سنگی ویژه با نان محلی، ترشی و دوغ کوزه', unit: 'پرس', basePrice: 320000 },
  { id: 'item-5', categoryId: 'cat-2', categoryName: 'رستوران و نوشیدنی‌های سنتی', name: 'شامی کباب قرمساق سنتی برزک', unit: 'پرس', basePrice: 280000 },
  { id: 'item-6', categoryId: 'cat-2', categoryName: 'رستوران و نوشیدنی‌های سنتی', name: 'سرویس چای آتشی، شربت زعفران و گلاب ناب برزک', unit: 'وعده', basePrice: 95000 },
  { id: 'item-7', categoryId: 'cat-3', categoryName: 'دست‌آفرید و صنایع دستی برزک', name: 'گلاب ناب سنتی دوآتشه برزک (۱ لیتر)', unit: 'بطری', basePrice: 220000 },
  { id: 'item-8', categoryId: 'cat-3', categoryName: 'دست‌آفرید و صنایع دستی برزک', name: 'عرق بیدمشک و نعناع اصل برزک', unit: 'بطری', basePrice: 150000 },
  { id: 'item-9', categoryId: 'cat-3', categoryName: 'دست‌آفرید و صنایع دستی برزک', name: 'گلیم دست‌بافت پشمی نقشه بومی', unit: 'عدد', basePrice: 2400000 },
  { id: 'item-10', categoryId: 'cat-4', categoryName: 'تور، بوم‌گردی و تجارب محلی', name: 'تور تجربه گلچینی و گلاب‌گیری سنتی برزک', unit: 'نفر', basePrice: 380000 },
  { id: 'item-11', categoryId: 'cat-4', categoryName: 'تور، بوم‌گردی و تجارب محلی', name: 'گشت بافت تاریخی، آسیاب آبی و تپه قلعه', unit: 'تور', basePrice: 850000 }
];

export const DEFAULT_GUESTS: Guest[] = [
  {
    id: 'guest-1',
    name: 'دکتر علیرضا افشار',
    phone: '09121112233',
    nationalCode: '0012345678',
    job: 'استاد دانشگاه و پژوهشگر معماری',
    city: 'تهران',
    description: 'علاقه‌مند به اتاق‌های آرام و نورگیر، ترجیح غذای ارگانیک و بدون شکر، مشتری وفادار فصل پاییز',
    walletBalance: 1500000,
    tags: ['VIP', 'معماری سنتی', 'سفر خانوادگی'],
    createdAt: '1403/02/10'
  },
  {
    id: 'guest-2',
    name: 'خانم مهندس سارا صبوری',
    phone: '09358889900',
    nationalCode: '1287654321',
    job: 'طراح گرافیک و عکاس مستند',
    city: 'اصفهان',
    description: 'عکاس تورهای گلاب‌گیری و علاقه‌مند به کارگاه‌های بوم‌گردی',
    walletBalance: 0,
    tags: ['عکاسی', 'تور گلاب‌گیری'],
    createdAt: '1403/03/15'
  }
];

export const DEFAULT_INVESTORS: Investor[] = [
  {
    id: 'inv-1',
    name: 'حاج محمدتقی برزکی',
    sharePercent: 60,
    phone: '09131612345',
    cardNumber: '6037-9911-2233-4455',
    shaba: 'IR120170000000112233445501',
    notes: 'سرمایه‌گذار اصلی مرمت بنا و تجهیز سوئیت‌های سنتی اقامتگاه',
    createdAt: '1402/01/01'
  },
  {
    id: 'inv-2',
    name: 'مهندس حمیدرضا ملائی',
    sharePercent: 40,
    phone: '09123456789',
    cardNumber: '5022-2910-8877-6655',
    shaba: 'IR880170000000887766550001',
    notes: 'سرمایه‌گذار توسعه بوم‌گردی و تجارب محلی',
    createdAt: '1402/01/01'
  }
];

export const DEFAULT_INVESTOR_PAYOUTS: InvestorPayout[] = [
  {
    id: 'payout-1',
    investorId: 'inv-1',
    investorName: 'حاج محمدتقی برزکی',
    amount: 18000000,
    date: '1403/04/15',
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: 'TRX-894210',
    period: 'سود سه ماهه بهار ۱۴۰۳',
    notes: 'واریز سود مصوب به حساب شبا پس از کسر هزینه‌ها و اقلام معاف',
    paid: true,
    calculatedProfitShare: 18000000,
    createdAt: '1403/04/15T10:00:00.000Z'
  },
  {
    id: 'payout-2',
    investorId: 'inv-2',
    investorName: 'مهندس حمیدرضا ملائی',
    amount: 12000000,
    date: '1403/04/15',
    paymentMethod: 'CARD_TO_CARD',
    referenceNumber: 'TRX-894211',
    period: 'سود سه ماهه بهار ۱۴۰۳',
    notes: 'واریز علی‌الحساب سود سهم ۴۰ درصدی فصل بهار',
    paid: true,
    calculatedProfitShare: 12000000,
    createdAt: '1403/04/15T10:15:00.000Z'
  }
];

// --- Local Storage & Firestore Helpers ---
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    return value === undefined ? null : value;
  }));
}

async function safeFirestoreOp<T>(op: () => Promise<T>, timeoutMs = 2500): Promise<T | null> {
  try {
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    return await Promise.race([op(), timeoutPromise]);
  } catch (err) {
    console.warn('Firestore operation error (fallback to local):', err);
    return null;
  }
}

function getLocalCache<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(`ecolodge_${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Local cache read error for ${key}:`, e);
  }
  return defaultVal;
}

function setLocalCache<T>(key: string, val: T): void {
  try {
    localStorage.setItem(`ecolodge_${key}`, JSON.stringify(val));
  } catch (e) {
    console.warn(`Local cache write error for ${key}:`, e);
  }
}

// --- Cloudflare D1 Sync Bridge ---
async function syncToD1(table: string, item: any, action: 'upsert' | 'delete' = 'upsert') {
  try {
    await fetch('/api/d1-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, item, action }),
    });
  } catch {
    // Ignore if offline or not running in Cloudflare Pages
  }
}

async function fetchFromD1<T>(table: string): Promise<T[] | null> {
  try {
    const res = await fetch(`/api/d1-sync?table=${table}`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        return json.data as T[];
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

// --- Settings Operations ---
export async function fetchSettings(): Promise<LodgeSettings> {
  const cached = getLocalCache<LodgeSettings>('settings', DEFAULT_SETTINGS);
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC);
    const snap = await safeFirestoreOp(() => getDoc(docRef));
    if (snap && snap.exists()) {
      const remote = { ...DEFAULT_SETTINGS, ...snap.data() } as LodgeSettings;
      setLocalCache('settings', remote);
      syncToD1('lodge_settings', { id: 'default', ...remote });
      return remote;
    } else if (snap) {
      safeFirestoreOp(() => setDoc(docRef, sanitizeForFirestore(cached)));
      return cached;
    }
    const d1Data = await fetchFromD1<LodgeSettings>('lodge_settings');
    if (d1Data && d1Data.length > 0) {
      const remote = { ...DEFAULT_SETTINGS, ...d1Data[0] };
      setLocalCache('settings', remote);
      return remote;
    }
    return cached;
  } catch {
    const d1Data = await fetchFromD1<LodgeSettings>('lodge_settings');
    if (d1Data && d1Data.length > 0) {
      const remote = { ...DEFAULT_SETTINGS, ...d1Data[0] };
      setLocalCache('settings', remote);
      return remote;
    }
    return cached;
  }
}

export async function saveSettings(settings: LodgeSettings): Promise<void> {
  setLocalCache('settings', settings);
  safeFirestoreOp(async () => {
    const docRef = doc(db, 'settings', SETTINGS_DOC);
    await setDoc(docRef, sanitizeForFirestore(settings), { merge: true });
  });
  syncToD1('lodge_settings', { id: 'default', ...settings });
}

// --- Category Operations ---
export async function fetchCategories(): Promise<Category[]> {
  const cached = getLocalCache<Category[]>('categories', DEFAULT_CATEGORIES);
  try {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const snap = await safeFirestoreOp(() => getDocs(q));
    if (snap && !snap.empty) {
      const list: Category[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
      if (list.length > 0) {
        setLocalCache('categories', list);
        return list;
      }
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function saveCategory(category: Partial<Category>): Promise<Category> {
  const id = category.id || `cat-${Date.now()}`;
  const catObj: Category = {
    id,
    name: category.name || 'دسته جدید',
    description: category.description || '',
    createdAt: category.createdAt || new Date().toISOString()
  };
  const list = getLocalCache<Category[]>('categories', DEFAULT_CATEGORIES);
  const idx = list.findIndex(c => c.id === id);
  if (idx >= 0) list[idx] = catObj;
  else list.push(catObj);
  setLocalCache('categories', list);

  try {
    await setDoc(doc(db, 'categories', id), catObj, { merge: true });
  } catch {
    // Offline mode
  }
  return catObj;
}

export async function deleteCategory(id: string): Promise<void> {
  const list = getLocalCache<Category[]>('categories', DEFAULT_CATEGORIES).filter(c => c.id !== id);
  setLocalCache('categories', list);
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch {
    // Offline mode
  }
}

// --- Item Operations ---
export async function fetchItems(): Promise<Item[]> {
  const cached = getLocalCache<Item[]>('items', DEFAULT_ITEMS);
  try {
    const q = query(collection(db, 'items'), orderBy('name', 'asc'));
    const snap = await safeFirestoreOp(() => getDocs(q));
    if (snap && !snap.empty) {
      const list: Item[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Item));
      if (list.length > 0) {
        setLocalCache('items', list);
        return [...list];
      }
    }
    return [...cached];
  } catch {
    return [...cached];
  }
}

export async function saveItem(item: Partial<Item>): Promise<Item> {
  const id = item.id || `item-${Date.now()}`;
  const itemObj: Item = {
    id,
    categoryId: item.categoryId || '',
    categoryName: item.categoryName || 'سایر',
    name: item.name || '',
    unit: item.unit || 'عدد',
    basePrice: Number(item.basePrice) || 0,
    createdAt: item.createdAt || new Date().toISOString()
  };
  const list = getLocalCache<Item[]>('items', DEFAULT_ITEMS);
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) list[idx] = itemObj;
  else list.push(itemObj);
  setLocalCache('items', list);

  try {
    await setDoc(doc(db, 'items', id), itemObj, { merge: true });
  } catch {
    // Offline mode
  }
  syncToD1('items', itemObj);
  return itemObj;
}

export async function deleteItem(id: string): Promise<void> {
  const list = getLocalCache<Item[]>('items', DEFAULT_ITEMS).filter(i => i.id !== id);
  setLocalCache('items', list);
  syncToD1('items', { id }, 'delete');
  try {
    await deleteDoc(doc(db, 'items', id));
  } catch {
    // Offline mode
  }
}

// --- Purchase Category Operations ---
export async function fetchPurchaseCategories(): Promise<Category[]> {
  const cached = getLocalCache<Category[]>('purchase_categories', DEFAULT_PURCHASE_CATEGORIES);
  try {
    const q = query(collection(db, 'purchase_categories'), orderBy('name', 'asc'));
    const snap = await safeFirestoreOp(() => getDocs(q));
    if (snap && !snap.empty) {
      const list: Category[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
      if (list.length > 0) {
        setLocalCache('purchase_categories', list);
        return list;
      }
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function savePurchaseCategory(category: Partial<Category>): Promise<Category> {
  const id = category.id || `pcat-${Date.now()}`;
  const catObj: Category = {
    id,
    name: category.name || 'دسته جدید خرید',
    description: category.description || '',
    type: 'PURCHASE',
    createdAt: category.createdAt || new Date().toISOString(),
  };
  const list = getLocalCache<Category[]>('purchase_categories', DEFAULT_PURCHASE_CATEGORIES);
  const idx = list.findIndex((c) => c.id === id);
  if (idx >= 0) list[idx] = catObj;
  else list.push(catObj);
  setLocalCache('purchase_categories', list);

  try {
    await setDoc(doc(db, 'purchase_categories', id), catObj, { merge: true });
  } catch {
    // Offline mode
  }
  return catObj;
}

export async function deletePurchaseCategory(id: string): Promise<void> {
  const list = getLocalCache<Category[]>('purchase_categories', DEFAULT_PURCHASE_CATEGORIES).filter((c) => c.id !== id);
  setLocalCache('purchase_categories', list);
  try {
    await deleteDoc(doc(db, 'purchase_categories', id));
  } catch {
    // Offline mode
  }
}

// --- Purchase Item Operations ---
export async function fetchPurchaseItems(): Promise<Item[]> {
  const cached = getLocalCache<Item[]>('purchase_items', DEFAULT_PURCHASE_ITEMS);
  try {
    const q = query(collection(db, 'purchase_items'), orderBy('name', 'asc'));
    const snap = await safeFirestoreOp(() => getDocs(q));
    if (snap && !snap.empty) {
      const list: Item[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Item));
      if (list.length > 0) {
        setLocalCache('purchase_items', list);
        return [...list];
      }
    }
    return [...cached];
  } catch {
    return [...cached];
  }
}

export async function savePurchaseItem(item: Partial<Item>): Promise<Item> {
  const id = item.id || `pitem-${Date.now()}`;
  const itemObj: Item = {
    id,
    categoryId: item.categoryId || '',
    categoryName: item.categoryName || 'سایر هزینه‌ها',
    name: item.name || '',
    unit: item.unit || 'عدد',
    basePrice: Number(item.basePrice) || 0,
    type: 'PURCHASE',
    createdAt: item.createdAt || new Date().toISOString(),
  };
  const list = getLocalCache<Item[]>('purchase_items', DEFAULT_PURCHASE_ITEMS);
  const idx = list.findIndex((i) => i.id === id);
  if (idx >= 0) list[idx] = itemObj;
  else list.push(itemObj);
  setLocalCache('purchase_items', list);

  try {
    await setDoc(doc(db, 'purchase_items', id), itemObj, { merge: true });
  } catch {
    // Offline mode
  }
  return itemObj;
}

export async function deletePurchaseItem(id: string): Promise<void> {
  const list = getLocalCache<Item[]>('purchase_items', DEFAULT_PURCHASE_ITEMS).filter((i) => i.id !== id);
  setLocalCache('purchase_items', list);
  try {
    await deleteDoc(doc(db, 'purchase_items', id));
  } catch {
    // Offline mode
  }
}

// --- Guest Operations ---
export async function fetchGuests(): Promise<Guest[]> {
  const cached = getLocalCache<Guest[]>('guests', DEFAULT_GUESTS);
  try {
    const q = query(collection(db, 'guests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: Guest[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Guest));
    if (list.length > 0) {
      setLocalCache('guests', list);
      return list;
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function saveGuest(guest: Partial<Guest>): Promise<Guest> {
  const id = guest.id || `guest-${Date.now()}`;
  const guestObj: Guest = {
    id,
    name: guest.name || 'مهمان جدید',
    phone: guest.phone || '',
    nationalCode: guest.nationalCode || '',
    job: guest.job || '',
    city: guest.city || '',
    description: guest.description || '',
    walletBalance: Number(guest.walletBalance) || 0,
    tags: guest.tags || [],
    createdAt: guest.createdAt || getCurrentJalaliDate()
  };
  const list = getLocalCache<Guest[]>('guests', DEFAULT_GUESTS);
  const idx = list.findIndex(g => g.id === id);
  if (idx >= 0) list[idx] = guestObj;
  else list.push(guestObj);
  setLocalCache('guests', list);

  try {
    await setDoc(doc(db, 'guests', id), guestObj, { merge: true });
  } catch {
    // Offline mode
  }
  syncToD1('guests', guestObj);
  return guestObj;
}

export async function deleteGuest(id: string): Promise<void> {
  const list = getLocalCache<Guest[]>('guests', DEFAULT_GUESTS).filter(g => g.id !== id);
  setLocalCache('guests', list);
  syncToD1('guests', { id }, 'delete');
  try {
    await deleteDoc(doc(db, 'guests', id));
  } catch {
    // Offline mode
  }
}

// --- Wallet Operations ---
export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  const cached = getLocalCache<WalletTransaction[]>('wallet_transactions', []);
  try {
    const q = query(collection(db, 'wallet_transactions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: WalletTransaction[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WalletTransaction));
    if (list.length > 0) {
      setLocalCache('wallet_transactions', list);
      return list;
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function recordWalletTransaction(tx: Partial<WalletTransaction>): Promise<WalletTransaction> {
  const id = tx.id || `wtx-${Date.now()}`;
  const txObj: WalletTransaction = {
    id,
    guestId: tx.guestId || '',
    guestName: tx.guestName || '',
    type: tx.type || 'DEPOSIT',
    amount: Number(tx.amount) || 0,
    date: tx.date || getCurrentJalaliDate(),
    method: tx.method || 'CASH',
    referenceNumber: tx.referenceNumber || '',
    chequeNumber: tx.chequeNumber || '',
    invoiceId: tx.invoiceId || '',
    description: tx.description || '',
    createdAt: tx.createdAt || new Date().toISOString()
  };

  const list = getLocalCache<WalletTransaction[]>('wallet_transactions', []);
  list.unshift(txObj);
  setLocalCache('wallet_transactions', list);

  // Update cached guest
  if (tx.guestId) {
    const guests = getLocalCache<Guest[]>('guests', DEFAULT_GUESTS);
    const guestIdx = guests.findIndex(g => g.id === tx.guestId);
    if (guestIdx >= 0) {
      const curBal = Number(guests[guestIdx].walletBalance) || 0;
      const delta = tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? txObj.amount : -txObj.amount;
      guests[guestIdx].walletBalance = Math.max(0, curBal + delta);
      setLocalCache('guests', guests);
    }
  }

  try {
    await setDoc(doc(db, 'wallet_transactions', id), txObj, { merge: true });
    if (tx.guestId) {
      const gRef = doc(db, 'guests', tx.guestId);
      const gSnap = await getDoc(gRef);
      if (gSnap.exists()) {
        const curBal = Number(gSnap.data().walletBalance) || 0;
        const delta = tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? txObj.amount : -txObj.amount;
        await updateDoc(gRef, { walletBalance: Math.max(0, curBal + delta) });
      }
    }
  } catch {
    // Offline mode
  }
  return txObj;
}

// --- Cheque Operations ---
export async function fetchCheques(): Promise<Cheque[]> {
  const cached = getLocalCache<Cheque[]>('cheques', []);
  try {
    const q = query(collection(db, 'cheques'), orderBy('dueDate', 'asc'));
    const snap = await getDocs(q);
    const list: Cheque[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Cheque));
    if (list.length > 0) {
      setLocalCache('cheques', list);
      return list;
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function saveCheque(cheque: Partial<Cheque>): Promise<Cheque> {
  const id = cheque.id || `chq-${Date.now()}`;
  const chequeObj: Cheque = {
    id,
    invoiceId: cheque.invoiceId || '',
    invoiceType: cheque.invoiceType || 'SALES',
    type: cheque.type || 'RECEIVABLE',
    chequeNumber: cheque.chequeNumber || '',
    bankName: cheque.bankName || '',
    branchName: cheque.branchName || '',
    accountOwner: cheque.accountOwner || '',
    recipientName: cheque.recipientName || '',
    amount: Number(cheque.amount) || 0,
    dueDate: cheque.dueDate || getCurrentJalaliDate(),
    status: cheque.status || 'PENDING',
    clearanceDate: cheque.clearanceDate || '',
    guestId: cheque.guestId || '',
    guestName: cheque.guestName || '',
    vendorName: cheque.vendorName || '',
    notes: cheque.notes || '',
    createdAt: cheque.createdAt || new Date().toISOString()
  };

  const list = getLocalCache<Cheque[]>('cheques', []);
  const idx = list.findIndex(c => c.id === id);
  if (idx >= 0) list[idx] = chequeObj;
  else list.push(chequeObj);
  setLocalCache('cheques', list);

  try {
    await setDoc(doc(db, 'cheques', id), chequeObj, { merge: true });
  } catch {
    // Offline mode
  }
  syncToD1('cheques', chequeObj);
  return chequeObj;
}

export async function deleteCheque(id: string): Promise<void> {
  const list = getLocalCache<Cheque[]>('cheques', []).filter(c => c.id !== id);
  setLocalCache('cheques', list);
  syncToD1('cheques', { id }, 'delete');
  try {
    await deleteDoc(doc(db, 'cheques', id));
  } catch {
    // Offline mode
  }
}

export async function updateChequeStatus(id: string, status: 'PENDING' | 'CLEARED' | 'BOUNCED', clearanceDate?: string): Promise<void> {
  const list = getLocalCache<Cheque[]>('cheques', []);
  const idx = list.findIndex(c => c.id === id);
  if (idx >= 0) {
    list[idx].status = status;
    list[idx].clearanceDate = status === 'CLEARED' ? (clearanceDate || getCurrentJalaliDate()) : '';
    setLocalCache('cheques', list);
  }

  try {
    const docRef = doc(db, 'cheques', id);
    await updateDoc(docRef, {
      status,
      clearanceDate: status === 'CLEARED' ? (clearanceDate || getCurrentJalaliDate()) : ''
    });
  } catch {
    // Offline mode
  }
}

// --- Wage / Payroll Operations ---
export async function fetchWagePayments(): Promise<WagePayment[]> {
  const cached = getLocalCache<WagePayment[]>('wage_payments', []);
  try {
    const q = query(collection(db, 'wage_payments'), orderBy('date', 'desc'));
    const snap = await safeFirestoreOp(() => getDocs(q));
    if (snap) {
      const list: WagePayment[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as WagePayment));
      setLocalCache('wage_payments', list);
      return list;
    }
    const d1Data = await fetchFromD1<WagePayment>('wages');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('wage_payments', d1Data);
      return d1Data;
    }
    return cached;
  } catch {
    const d1Data = await fetchFromD1<WagePayment>('wages');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('wage_payments', d1Data);
      return d1Data;
    }
    return cached;
  }
}

export async function saveWagePayment(wage: Partial<WagePayment>): Promise<WagePayment> {
  const id = wage.id || `wage-${Date.now()}`;
  const wageObj: WagePayment = {
    id,
    employeeName: wage.employeeName || '',
    role: wage.role || 'پرسنل اقامتگاه',
    phone: wage.phone || '',
    date: wage.date || getCurrentJalaliDate(),
    amount: Number(wage.amount) || 0,
    type: wage.type || 'SALARY',
    paymentMethod: wage.paymentMethod || 'CARD_TO_CARD',
    referenceNumber: wage.referenceNumber || '',
    period: wage.period || '',
    notes: wage.notes || '',
    paid: wage.paid ?? true,
    createdAt: wage.createdAt || new Date().toISOString()
  };

  const list = getLocalCache<WagePayment[]>('wage_payments', []);
  const idx = list.findIndex(w => w.id === id);
  if (idx >= 0) list[idx] = wageObj;
  else list.unshift(wageObj);
  setLocalCache('wage_payments', list);

  safeFirestoreOp(async () => {
    await setDoc(doc(db, 'wage_payments', id), sanitizeForFirestore(wageObj), { merge: true });
  });
  syncToD1('wages', wageObj);
  return wageObj;
}

export async function deleteWagePayment(id: string): Promise<void> {
  const list = getLocalCache<WagePayment[]>('wage_payments', []).filter(w => w.id !== id);
  setLocalCache('wage_payments', list);
  syncToD1('wages', { id }, 'delete');
  safeFirestoreOp(async () => {
    await deleteDoc(doc(db, 'wage_payments', id));
  });
}

// --- Investor Operations ---
export async function fetchInvestors(): Promise<Investor[]> {
  const cached = getLocalCache<Investor[]>('investors', DEFAULT_INVESTORS);
  try {
    const q = query(collection(db, 'investors'), orderBy('name', 'asc'));
    const snap = await safeFirestoreOp(() => getDocs(q));
    if (snap && !snap.empty) {
      const list: Investor[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Investor));
      if (list.length > 0) {
        setLocalCache('investors', list);
        return list;
      }
    }
    const d1Data = await fetchFromD1<Investor>('investors');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('investors', d1Data);
      return d1Data;
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function saveInvestor(investor: Partial<Investor>): Promise<Investor> {
  const id = investor.id || `inv-${Date.now()}`;
  const invObj: Investor = {
    id,
    name: investor.name || '',
    sharePercent: Number(investor.sharePercent) || 0,
    phone: investor.phone || '',
    nationalCode: investor.nationalCode || '',
    cardNumber: investor.cardNumber || '',
    shaba: investor.shaba || '',
    notes: investor.notes || '',
    createdAt: investor.createdAt || new Date().toISOString()
  };

  const list = getLocalCache<Investor[]>('investors', DEFAULT_INVESTORS);
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) list[idx] = invObj;
  else list.push(invObj);
  setLocalCache('investors', list);

  safeFirestoreOp(async () => {
    await setDoc(doc(db, 'investors', id), sanitizeForFirestore(invObj), { merge: true });
  });
  syncToD1('investors', invObj);
  return invObj;
}

export async function deleteInvestor(id: string): Promise<void> {
  const list = getLocalCache<Investor[]>('investors', DEFAULT_INVESTORS).filter(i => i.id !== id);
  setLocalCache('investors', list);
  syncToD1('investors', { id }, 'delete');
  safeFirestoreOp(async () => {
    await deleteDoc(doc(db, 'investors', id));
  });
}

// --- Investor Payouts Operations ---
export async function fetchInvestorPayouts(): Promise<InvestorPayout[]> {
  const cached = getLocalCache<InvestorPayout[]>('investor_payouts', DEFAULT_INVESTOR_PAYOUTS);
  try {
    const q = query(collection(db, 'investor_payouts'), orderBy('date', 'desc'));
    const snap = await safeFirestoreOp(() => getDocs(q));
    if (snap && !snap.empty) {
      const list: InvestorPayout[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as InvestorPayout));
      if (list.length > 0) {
        setLocalCache('investor_payouts', list);
        return list;
      }
    }
    const d1Data = await fetchFromD1<InvestorPayout>('investor_payouts');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('investor_payouts', d1Data);
      return d1Data;
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function saveInvestorPayout(payout: Partial<InvestorPayout>): Promise<InvestorPayout> {
  const id = payout.id || `payout-${Date.now()}`;
  const payoutObj: InvestorPayout = {
    id,
    investorId: payout.investorId || '',
    investorName: payout.investorName || '',
    amount: Number(payout.amount) || 0,
    date: payout.date || getCurrentJalaliDate(),
    paymentMethod: payout.paymentMethod || 'BANK_TRANSFER',
    referenceNumber: payout.referenceNumber || '',
    period: payout.period || '',
    notes: payout.notes || '',
    paid: payout.paid ?? true,
    calculatedProfitShare: payout.calculatedProfitShare ? Number(payout.calculatedProfitShare) : undefined,
    createdAt: payout.createdAt || new Date().toISOString()
  };

  const list = getLocalCache<InvestorPayout[]>('investor_payouts', DEFAULT_INVESTOR_PAYOUTS);
  const idx = list.findIndex(p => p.id === id);
  if (idx >= 0) list[idx] = payoutObj;
  else list.unshift(payoutObj);
  setLocalCache('investor_payouts', list);

  safeFirestoreOp(async () => {
    await setDoc(doc(db, 'investor_payouts', id), sanitizeForFirestore(payoutObj), { merge: true });
  });
  syncToD1('investor_payouts', payoutObj);
  return payoutObj;
}

export async function deleteInvestorPayout(id: string): Promise<void> {
  const list = getLocalCache<InvestorPayout[]>('investor_payouts', DEFAULT_INVESTOR_PAYOUTS).filter(p => p.id !== id);
  setLocalCache('investor_payouts', list);
  syncToD1('investor_payouts', { id }, 'delete');
  safeFirestoreOp(async () => {
    await deleteDoc(doc(db, 'investor_payouts', id));
  });
}

// --- Sales Invoice Operations ---
export async function fetchSalesInvoices(): Promise<SalesInvoice[]> {
  const cached = getLocalCache<SalesInvoice[]>('sales_invoices', []);
  try {
    const q = query(collection(db, 'sales_invoices'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: SalesInvoice[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const totalPayable = Number(data.totalPayable) || 0;
      const payments = data.payments || [];
      const totalPaidAmount = payments.length > 0 
        ? payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        : (data.paid ? totalPayable : 0);
      const remainingBalance = Math.max(0, totalPayable - totalPaidAmount);
      
      list.push({
        id: d.id,
        ...data,
        invoiceKind: data.invoiceKind || 'FINAL',
        payments,
        totalPaidAmount,
        remainingBalance,
        paid: remainingBalance === 0 && totalPayable > 0 ? true : (data.paid ?? false)
      } as SalesInvoice);
    });
    if (list.length > 0) {
      setLocalCache('sales_invoices', list);
      return list;
    }
    const d1Data = await fetchFromD1<SalesInvoice>('sales_invoices');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('sales_invoices', d1Data);
      return d1Data;
    }
    return cached;
  } catch {
    const d1Data = await fetchFromD1<SalesInvoice>('sales_invoices');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('sales_invoices', d1Data);
      return d1Data;
    }
    return cached;
  }
}

export async function saveSalesInvoice(invoice: Partial<SalesInvoice>): Promise<SalesInvoice> {
  const id = invoice.id || `inv-s-${Date.now()}`;
  const totalPayable = Number(invoice.totalPayable) || 0;
  const payments = invoice.payments || [];
  const totalPaidAmount = payments.length > 0
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : (invoice.paid ? totalPayable : (Number(invoice.totalPaidAmount) || 0));
  const remainingBalance = Math.max(0, totalPayable - totalPaidAmount);
  const isFullyPaid = (totalPayable > 0 && remainingBalance === 0) || (invoice.paid ?? false);

  const invoiceObj: SalesInvoice = {
    id,
    serialNumber: invoice.serialNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceKind: invoice.status === 'PROFORMA' || invoice.invoiceKind === 'PROFORMA' ? 'PROFORMA' : 'FINAL',
    status: invoice.status || invoice.invoiceKind || 'FINAL',
    date: invoice.date || getCurrentJalaliDate(),
    guestId: invoice.guestId || '',
    guestName: invoice.guestName || '',
    guestPhone: invoice.guestPhone || '',
    guestNationalCode: invoice.guestNationalCode || '',
    guestJob: invoice.guestJob || '',
    notes: invoice.notes || '',
    items: invoice.items || [],
    totalItemsAmount: Number(invoice.totalItemsAmount) || 0,
    totalDiscountAmount: Number(invoice.totalDiscountAmount) || 0,
    totalTaxAmount: Number(invoice.totalTaxAmount) || 0,
    totalPayable,
    totalPayableInWords: invoice.totalPayableInWords || '',
    payments,
    totalPaidAmount,
    remainingBalance,
    paid: isFullyPaid,
    paymentDate: invoice.paymentDate || (isFullyPaid ? getCurrentJalaliDate() : ''),
    createdAt: invoice.createdAt || new Date().toISOString()
  };

  // 1. Immediately update local cache
  const list = getLocalCache<SalesInvoice[]>('sales_invoices', []);
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) list[idx] = invoiceObj;
  else list.unshift(invoiceObj);
  setLocalCache('sales_invoices', list);

  // 2. Auto register / sync guest if not existing
  if (invoiceObj.guestName.trim()) {
    try {
      const guests = getLocalCache<Guest[]>('guests', DEFAULT_GUESTS);
      const existingGuest = guests.find(
        g => g.name.trim().toLowerCase() === invoiceObj.guestName.trim().toLowerCase() ||
             (invoiceObj.guestPhone && g.phone && g.phone === invoiceObj.guestPhone)
      );
      if (!existingGuest) {
        const newGuest: Guest = {
          id: `guest-${Date.now()}`,
          name: invoiceObj.guestName.trim(),
          phone: invoiceObj.guestPhone || '',
          nationalCode: invoiceObj.guestNationalCode || '',
          job: invoiceObj.guestJob || '',
          city: '',
          description: `ثبت خودکار از فاکتور ${invoiceObj.serialNumber}`,
          walletBalance: 0,
          tags: ['فاکتور فروش'],
          createdAt: invoiceObj.date
        };
        guests.unshift(newGuest);
        setLocalCache('guests', guests);
        safeFirestoreOp(() => setDoc(doc(db, 'guests', newGuest.id), sanitizeForFirestore(newGuest), { merge: true }));
      }
    } catch (e) {
      console.warn('Auto guest sync notice:', e);
    }
  }

  // 3. Fire-and-forget sync to Firestore (timeout-protected so UI never hangs)
  safeFirestoreOp(async () => {
    await setDoc(doc(db, 'sales_invoices', id), sanitizeForFirestore(invoiceObj), { merge: true });
  });

  // 4. Cloudflare D1 Sync
  syncToD1('sales_invoices', invoiceObj);

  return invoiceObj;
}

export async function deleteSalesInvoice(id: string): Promise<void> {
  const list = getLocalCache<SalesInvoice[]>('sales_invoices', []).filter(i => i.id !== id);
  setLocalCache('sales_invoices', list);
  syncToD1('sales_invoices', { id }, 'delete');
  try {
    await deleteDoc(doc(db, 'sales_invoices', id));
  } catch {
    // Offline mode
  }
}

export async function toggleSalesInvoicePaid(id: string, paid: boolean): Promise<void> {
  const list = getLocalCache<SalesInvoice[]>('sales_invoices', []);
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) {
    const inv = list[idx];
    inv.paid = paid;
    inv.totalPaidAmount = paid ? inv.totalPayable : 0;
    inv.remainingBalance = paid ? 0 : inv.totalPayable;
    inv.paymentDate = paid ? getCurrentJalaliDate() : '';
    setLocalCache('sales_invoices', list);
  }

  try {
    const docRef = doc(db, 'sales_invoices', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const total = Number(data.totalPayable) || 0;
      const curPayments = data.payments || [];
      let newPayments = [...curPayments];
      if (paid && curPayments.length === 0) {
        newPayments.push({
          id: `pay-${Date.now()}`,
          invoiceId: id,
          invoiceType: 'SALES',
          amount: total,
          date: getCurrentJalaliDate(),
          method: 'POS',
          stageTitle: 'تسویه کامل',
          createdAt: new Date().toISOString()
        });
      }
      await updateDoc(docRef, {
        paid,
        payments: newPayments,
        totalPaidAmount: paid ? total : 0,
        remainingBalance: paid ? 0 : total,
        paymentDate: paid ? getCurrentJalaliDate() : ''
      });
    }
  } catch {
    // Offline mode
  }
}

// --- Purchase Invoice Operations ---
export async function fetchPurchaseInvoices(): Promise<PurchaseInvoice[]> {
  const cached = getLocalCache<PurchaseInvoice[]>('purchase_invoices', []);
  try {
    const q = query(collection(db, 'purchase_invoices'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: PurchaseInvoice[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const totalAmount = Number(data.totalPaid || data.totalAmount) || 0;
      const payments = data.payments || [];
      const totalPaidAmount = payments.length > 0 
        ? payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        : (data.paid ? totalAmount : 0);
      const remainingBalance = Math.max(0, totalAmount - totalPaidAmount);
      
      list.push({
        id: d.id,
        ...data,
        payments,
        totalPaidAmount,
        remainingBalance,
        paid: (totalAmount > 0 && remainingBalance === 0) ? true : (data.paid ?? true)
      } as PurchaseInvoice);
    });
    if (list.length > 0) {
      setLocalCache('purchase_invoices', list);
      return list;
    }
    const d1Data = await fetchFromD1<PurchaseInvoice>('purchase_invoices');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('purchase_invoices', d1Data);
      return d1Data;
    }
    return cached;
  } catch {
    const d1Data = await fetchFromD1<PurchaseInvoice>('purchase_invoices');
    if (d1Data && d1Data.length > 0) {
      setLocalCache('purchase_invoices', d1Data);
      return d1Data;
    }
    return cached;
  }
}

export async function savePurchaseInvoice(invoice: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> {
  const id = invoice.id || `inv-p-${Date.now()}`;
  const totalAmount = Number(invoice.totalPaid || invoice.totalAmount) || 0;
  const payments = invoice.payments || [];
  const totalPaidAmount = payments.length > 0
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : (invoice.paid ? totalAmount : (Number(invoice.totalPaidAmount) || 0));
  const remainingBalance = Math.max(0, totalAmount - totalPaidAmount);
  const isFullyPaid = (totalAmount > 0 && remainingBalance === 0) || (invoice.paid ?? true);

  const invoiceObj: PurchaseInvoice = {
    id,
    serialNumber: invoice.serialNumber || `PUR-${Math.floor(1000 + Math.random() * 9000)}`,
    date: invoice.date || getCurrentJalaliDate(),
    vendorName: invoice.vendorName || '',
    vendorPhone: invoice.vendorPhone || '',
    notes: invoice.notes || '',
    items: invoice.items || [],
    totalAmount: invoice.totalAmount || 0,
    totalDiscount: invoice.totalDiscount || 0,
    totalPaid: invoice.totalPaid || 0,
    payments,
    totalPaidAmount,
    remainingBalance,
    paid: isFullyPaid,
    paymentDate: invoice.paymentDate || (isFullyPaid ? getCurrentJalaliDate() : ''),
    createdAt: invoice.createdAt || new Date().toISOString()
  };

  const list = getLocalCache<PurchaseInvoice[]>('purchase_invoices', []);
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) list[idx] = invoiceObj;
  else list.unshift(invoiceObj);
  setLocalCache('purchase_invoices', list);

  try {
    await setDoc(doc(db, 'purchase_invoices', id), invoiceObj, { merge: true });
  } catch {
    // Offline mode
  }
  syncToD1('purchase_invoices', invoiceObj);
  return invoiceObj;
}

export async function deletePurchaseInvoice(id: string): Promise<void> {
  const list = getLocalCache<PurchaseInvoice[]>('purchase_invoices', []).filter(i => i.id !== id);
  setLocalCache('purchase_invoices', list);
  syncToD1('purchase_invoices', { id }, 'delete');
  try {
    await deleteDoc(doc(db, 'purchase_invoices', id));
  } catch {
    // Offline mode
  }
}

export async function togglePurchaseInvoicePaid(id: string, paid: boolean): Promise<void> {
  const list = getLocalCache<PurchaseInvoice[]>('purchase_invoices', []);
  const idx = list.findIndex(i => i.id === id);
  if (idx >= 0) {
    const inv = list[idx];
    const total = Number(inv.totalPaid || inv.totalAmount) || 0;
    inv.paid = paid;
    inv.totalPaidAmount = paid ? total : 0;
    inv.remainingBalance = paid ? 0 : total;
    inv.paymentDate = paid ? getCurrentJalaliDate() : '';
    setLocalCache('purchase_invoices', list);
  }

  try {
    const docRef = doc(db, 'purchase_invoices', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const total = Number(data.totalPaid || data.totalAmount) || 0;
      await updateDoc(docRef, {
        paid,
        totalPaidAmount: paid ? total : 0,
        remainingBalance: paid ? 0 : total,
        paymentDate: paid ? getCurrentJalaliDate() : ''
      });
    }
  } catch {
    // Offline mode
  }
}
