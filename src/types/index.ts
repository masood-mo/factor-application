export interface BudgetRowConfig {
  id: string;
  name: string;
  percentage: number; // e.g. 20 for 20%
  description?: string;
  categoryIds?: string[];
}

export interface LodgeSettings {
  lodgeName: string;
  lodgeLogo: string;
  signatureImage: string;
  stampImage: string;
  economicCode: string;
  phone: string;
  address: string;
  taxRate: number; // e.g. 10 for 10%
  accountNumber: string;
  cardNumber: string;
  shaba: string;
  accountOwner: string;
  units: string[];
  customerTitle: string; // e.g. 'مهمان', 'مشتری', 'خریدار'
  whatsappShareTemplate?: string;
  whatsappTemplate?: string;
  chequeAlarmDays: number; // e.g. 2 days before due date
  budgetRows: BudgetRowConfig[];
  investorSharePercent: number; // e.g. 30%
  investorExemptCategoryIds: string[]; // categories exempt from investor profit calculation
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Item {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  unit: string;
  basePrice: number;
  createdAt?: string;
}

export interface SalesInvoiceItem {
  id: string;
  rowNum: number;
  itemId?: string;
  itemName: string;
  unit: string;
  quantity: number;
  basePrice: number;
  totalPrice: number; // quantity * basePrice
  discountPercent: number; // 0 - 100
  discountAmount: number;
  taxAmount: number;
  payableAmount: number;
  description: string;
  isNewlyAddedToCatalog?: boolean;
}

export interface PaymentRecord {
  id: string;
  invoiceId?: string;
  invoiceType?: 'SALES' | 'PURCHASE';
  amount: number;
  date: string; // YYYY/MM/DD
  method: 'CASH' | 'POS' | 'CHEQUE' | 'WALLET' | 'BANK_TRANSFER';
  stageTitle?: string; // e.g. 'پیش‌پرداخت ۱', 'واریز دوم', 'تسویه نهایی'
  referenceNumber?: string;
  chequeId?: string;
  chequeNumber?: string;
  notes?: string;
  description?: string;
  createdAt: string;
}

export type InvoicePayment = PaymentRecord;

export interface Cheque {
  id: string;
  invoiceId?: string;
  invoiceType?: 'SALES' | 'PURCHASE';
  type: 'RECEIVABLE' | 'PAYABLE'; // دریافتی از مشتری یا پرداختی به فروشنده
  chequeNumber: string;
  bankName: string;
  branchName?: string;
  accountOwner: string;
  recipientName: string;
  amount: number;
  dueDate: string; // YYYY/MM/DD
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
  clearanceDate?: string;
  guestId?: string;
  guestName?: string;
  vendorName?: string;
  notes?: string;
  createdAt: string;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  nationalCode?: string;
  job?: string;
  city?: string;
  description?: string; // notes / dietary / preferences
  walletBalance: number;
  tags?: string[];
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  guestId: string;
  guestName: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'REFUND';
  amount: number;
  date: string;
  method: 'CASH' | 'POS' | 'CHEQUE' | 'CARD_TO_CARD';
  referenceNumber?: string;
  chequeNumber?: string;
  invoiceId?: string;
  description: string;
  createdAt: string;
}

export interface WagePayment {
  id: string;
  employeeName: string;
  role: string;
  phone?: string;
  date: string;
  amount: number;
  type: 'SALARY' | 'HOURLY' | 'BONUS' | 'OVERTIME' | 'ADVANCE';
  paymentMethod: 'CASH' | 'CARD_TO_CARD' | 'CHEQUE';
  referenceNumber?: string;
  period?: string; // e.g. 'مرداد ۱۴۰۳'
  notes?: string;
  paid: boolean;
  createdAt: string;
}

export interface SalesInvoice {
  id: string;
  serialNumber: string;
  invoiceKind: 'FINAL' | 'PROFORMA'; // فاکتور قطعی یا پیش‌فاکتور
  status?: 'FINAL' | 'PROFORMA';
  date: string; // YYYY/MM/DD
  guestId?: string;
  guestName: string;
  guestPhone?: string;
  guestNationalCode?: string;
  guestJob?: string;
  notes: string;
  items: SalesInvoiceItem[];
  totalItemsAmount: number;
  totalDiscountAmount: number;
  totalTaxAmount: number;
  totalPayable: number;
  totalPayableInWords: string;
  payments: PaymentRecord[];
  totalPaidAmount: number;
  remainingBalance: number;
  paid: boolean;
  paymentDate?: string;
  createdAt: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  rowNum: number;
  itemId?: string;
  itemName: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // quantity * unitPrice
  discount: number;
  paidAmount: number; // totalPrice - discount
  description: string;
}

export interface PurchaseInvoice {
  id: string;
  serialNumber: string;
  date: string; // YYYY/MM/DD
  vendorName: string;
  vendorPhone?: string;
  notes: string;
  items: PurchaseInvoiceItem[];
  totalAmount: number;
  totalDiscount: number;
  totalPaid: number;
  payments: PaymentRecord[];
  totalPaidAmount: number;
  remainingBalance: number;
  paid: boolean;
  paymentDate?: string;
  createdAt: string;
}

export type ActiveTab = 
  | 'new_sales_invoice' 
  | 'sales_invoices_list' 
  | 'new_purchase_invoice' 
  | 'purchase_invoices_list' 
  | 'items_catalog' 
  | 'guests_list'
  | 'cheques_list'
  | 'wages_list'
  | 'budget_investor'
  | 'reports' 
  | 'settings';
