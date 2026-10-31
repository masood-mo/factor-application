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
  Investor,
  InvestorPayout,
  Vendor,
} from '../types';
import {
  fetchSettings,
  saveSettings,
  fetchCategories,
  saveCategory,
  fetchPurchaseCategories,
  savePurchaseCategory,
  fetchItems,
  saveItem,
  fetchPurchaseItems,
  savePurchaseItem,
  fetchSalesInvoices,
  saveSalesInvoice,
  fetchPurchaseInvoices,
  savePurchaseInvoice,
  fetchGuests,
  saveGuest,
  fetchWalletTransactions,
  recordWalletTransaction,
  fetchCheques,
  saveCheque,
  fetchWagePayments,
  saveWagePayment,
  fetchInvestors,
  saveInvestor,
  fetchInvestorPayouts,
  saveInvestorPayout,
  fetchVendors,
  saveVendor,
  DEFAULT_SETTINGS
} from './dbService';
import { getCurrentJalaliDate } from '../utils/persianDate';

export interface FullBackupData {
  version: string;
  exportedAt: string;
  exportedAtJalali: string;
  lodgeName: string;
  summary: {
    salesInvoicesCount: number;
    purchaseInvoicesCount: number;
    guestsCount: number;
    itemsCount: number;
    purchaseItemsCount: number;
    categoriesCount: number;
    purchaseCategoriesCount: number;
    chequesCount: number;
    wagePaymentsCount: number;
    investorsCount: number;
    investorPayoutsCount: number;
    vendorsCount: number;
  };
  data: {
    settings: LodgeSettings;
    categories: Category[];
    purchaseCategories: Category[];
    items: Item[];
    purchaseItems: Item[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    guests: Guest[];
    walletTransactions: WalletTransaction[];
    cheques: Cheque[];
    wagePayments: WagePayment[];
    investors: Investor[];
    investorPayouts: InvestorPayout[];
    vendors: Vendor[];
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  details?: {
    salesInvoicesRestored: number;
    purchaseInvoicesRestored: number;
    guestsRestored: number;
    itemsRestored: number;
    purchaseItemsRestored: number;
    categoriesRestored: number;
    purchaseCategoriesRestored: number;
    chequesRestored: number;
    wagePaymentsRestored: number;
    investorsRestored: number;
    investorPayoutsRestored: number;
    vendorsRestored: number;
  };
}

/**
 * Creates a complete snapshot of all database entities.
 */
export async function createFullDatabaseBackup(): Promise<FullBackupData> {
  const [
    settings,
    categories,
    purchaseCategories,
    items,
    purchaseItems,
    salesInvoices,
    purchaseInvoices,
    guests,
    walletTransactions,
    cheques,
    wagePayments,
    investors,
    investorPayouts,
    vendors,
  ] = await Promise.all([
    fetchSettings(),
    fetchCategories(),
    fetchPurchaseCategories(),
    fetchItems(),
    fetchPurchaseItems(),
    fetchSalesInvoices(),
    fetchPurchaseInvoices(),
    fetchGuests(),
    fetchWalletTransactions(),
    fetchCheques(),
    fetchWagePayments(),
    fetchInvestors(),
    fetchInvestorPayouts(),
    fetchVendors(),
  ]);

  const jalaliDate = getCurrentJalaliDate().replace(/\//g, '-');
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  const backupData: FullBackupData = {
    version: '2.0.0',
    exportedAt: now.toISOString(),
    exportedAtJalali: `${jalaliDate}_${timeStr}`,
    lodgeName: settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک',
    summary: {
      salesInvoicesCount: salesInvoices.length,
      purchaseInvoicesCount: purchaseInvoices.length,
      guestsCount: guests.length,
      itemsCount: items.length,
      purchaseItemsCount: purchaseItems.length,
      categoriesCount: categories.length,
      purchaseCategoriesCount: purchaseCategories.length,
      chequesCount: cheques.length,
      wagePaymentsCount: wagePayments.length,
      investorsCount: investors.length,
      investorPayoutsCount: investorPayouts.length,
      vendorsCount: vendors.length,
    },
    data: {
      settings,
      categories,
      purchaseCategories,
      items,
      purchaseItems,
      salesInvoices,
      purchaseInvoices,
      guests,
      walletTransactions,
      cheques,
      wagePayments,
      investors,
      investorPayouts,
      vendors,
    },
  };

  return backupData;
}

/**
 * Creates a complete snapshot of all database entities and triggers a file download to the user's computer.
 */
export async function downloadDatabaseBackup(): Promise<string> {
  const backupData = await createFullDatabaseBackup();
  const jalaliDate = getCurrentJalaliDate().replace(/\//g, '-');
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  // Convert to nicely formatted JSON blob
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Trigger browser download
  const link = document.createElement('a');
  link.href = url;
  const safeLodgeName = (backupData.lodgeName || 'ecolodge').replace(/\s+/g, '_');
  const fileName = `backup_${safeLodgeName}_${jalaliDate}_${timeStr}.json`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
}

/**
 * Parses and validates a JSON file selected by the user.
 */
export async function parseBackupFile(file: File): Promise<FullBackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        if (!json || typeof json !== 'object') {
          throw new Error('فایل انتخاب شده ساختار JSON معتبر ندارد.');
        }

        // Support both full wrapper format and direct data format
        let payloadData: any = json.data || json;

        if (!payloadData || typeof payloadData !== 'object') {
          throw new Error('فایل پشتیبان حاوی بخش داده‌های برنامه نیست.');
        }

        const normalized: FullBackupData = {
          version: json.version || '1.0.0',
          exportedAt: json.exportedAt || new Date().toISOString(),
          exportedAtJalali: json.exportedAtJalali || getCurrentJalaliDate(),
          lodgeName: json.lodgeName || payloadData.settings?.lodgeName || 'اقامتگاه',
          summary: {
            salesInvoicesCount: Array.isArray(payloadData.salesInvoices) ? payloadData.salesInvoices.length : 0,
            purchaseInvoicesCount: Array.isArray(payloadData.purchaseInvoices) ? payloadData.purchaseInvoices.length : 0,
            guestsCount: Array.isArray(payloadData.guests) ? payloadData.guests.length : 0,
            itemsCount: Array.isArray(payloadData.items) ? payloadData.items.length : 0,
            purchaseItemsCount: Array.isArray(payloadData.purchaseItems) ? payloadData.purchaseItems.length : 0,
            categoriesCount: Array.isArray(payloadData.categories) ? payloadData.categories.length : 0,
            purchaseCategoriesCount: Array.isArray(payloadData.purchaseCategories) ? payloadData.purchaseCategories.length : 0,
            chequesCount: Array.isArray(payloadData.cheques) ? payloadData.cheques.length : 0,
            wagePaymentsCount: Array.isArray(payloadData.wagePayments) ? payloadData.wagePayments.length : 0,
            investorsCount: Array.isArray(payloadData.investors) ? payloadData.investors.length : 0,
            investorPayoutsCount: Array.isArray(payloadData.investorPayouts) ? payloadData.investorPayouts.length : 0,
            vendorsCount: Array.isArray(payloadData.vendors) ? payloadData.vendors.length : 0,
          },
          data: {
            settings: payloadData.settings || DEFAULT_SETTINGS,
            categories: Array.isArray(payloadData.categories) ? payloadData.categories : [],
            purchaseCategories: Array.isArray(payloadData.purchaseCategories) ? payloadData.purchaseCategories : [],
            items: Array.isArray(payloadData.items) ? payloadData.items : [],
            purchaseItems: Array.isArray(payloadData.purchaseItems) ? payloadData.purchaseItems : [],
            salesInvoices: Array.isArray(payloadData.salesInvoices) ? payloadData.salesInvoices : [],
            purchaseInvoices: Array.isArray(payloadData.purchaseInvoices) ? payloadData.purchaseInvoices : [],
            guests: Array.isArray(payloadData.guests) ? payloadData.guests : [],
            walletTransactions: Array.isArray(payloadData.walletTransactions) ? payloadData.walletTransactions : [],
            cheques: Array.isArray(payloadData.cheques) ? payloadData.cheques : [],
            wagePayments: Array.isArray(payloadData.wagePayments) ? payloadData.wagePayments : [],
            investors: Array.isArray(payloadData.investors) ? payloadData.investors : [],
            investorPayouts: Array.isArray(payloadData.investorPayouts) ? payloadData.investorPayouts : [],
            vendors: Array.isArray(payloadData.vendors) ? payloadData.vendors : [],
          },
        };

        resolve(normalized);
      } catch (err: any) {
        reject(new Error(`خطا در بازخوانی فایل پشتیبان: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل از حافظه کامپیوتر.'));
    reader.readAsText(file);
  });
}

/**
 * Restores all data from the parsed backup into both localStorage and Firestore.
 */
export async function restoreDatabase(backup: FullBackupData): Promise<RestoreResult> {
  const d = backup.data;

  // 1. Settings
  if (d.settings) {
    await saveSettings(d.settings);
  }

  // 2. Categories
  for (const cat of d.categories) {
    await saveCategory(cat);
  }

  // 3. Purchase Categories
  for (const pcat of d.purchaseCategories) {
    await savePurchaseCategory(pcat);
  }

  // 4. Sales Catalog Items
  for (const item of d.items) {
    await saveItem(item);
  }

  // 5. Purchase Catalog Items
  for (const pitem of d.purchaseItems) {
    await savePurchaseItem(pitem);
  }

  // 6. Guests
  for (const guest of d.guests) {
    await saveGuest(guest);
  }

  // 7. Vendors
  for (const vendor of d.vendors) {
    await saveVendor(vendor);
  }

  // 8. Investors
  for (const investor of d.investors) {
    await saveInvestor(investor);
  }

  // 9. Investor Payouts
  for (const payout of d.investorPayouts) {
    await saveInvestorPayout(payout);
  }

  // 10. Wage Payments
  for (const wage of d.wagePayments) {
    await saveWagePayment(wage);
  }

  // 11. Cheques
  for (const cheque of d.cheques) {
    await saveCheque(cheque);
  }

  // 12. Wallet Transactions
  for (const tx of d.walletTransactions) {
    await recordWalletTransaction(tx);
  }

  // 13. Sales Invoices
  for (const inv of d.salesInvoices) {
    await saveSalesInvoice(inv);
  }

  // 14. Purchase Invoices
  for (const inv of d.purchaseInvoices) {
    await savePurchaseInvoice(inv);
  }

  return {
    success: true,
    message: 'اطلاعات با موفقیت از فایل پشتیبان بازیابی و در پایگاه داده ذخیره شد.',
    details: {
      salesInvoicesRestored: d.salesInvoices.length,
      purchaseInvoicesRestored: d.purchaseInvoices.length,
      guestsRestored: d.guests.length,
      itemsRestored: d.items.length,
      purchaseItemsRestored: d.purchaseItems.length,
      categoriesRestored: d.categories.length,
      purchaseCategoriesRestored: d.purchaseCategories.length,
      chequesRestored: d.cheques.length,
      wagePaymentsRestored: d.wagePayments.length,
      investorsRestored: d.investors.length,
      investorPayoutsRestored: d.investorPayouts.length,
      vendorsRestored: d.vendors.length,
    },
  };
}
