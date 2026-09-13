import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  LodgeSettings,
  Category,
  Item,
  SalesInvoice,
  PurchaseInvoice,
  Guest,
  WalletTransaction,
  Cheque,
  WagePayment,
} from './types';
import {
  fetchSettings,
  saveSettings,
  fetchCategories,
  saveCategory,
  deleteCategory,
  fetchItems,
  saveItem,
  deleteItem,
  fetchSalesInvoices,
  saveSalesInvoice,
  deleteSalesInvoice,
  toggleSalesInvoicePaid,
  fetchPurchaseInvoices,
  savePurchaseInvoice,
  deletePurchaseInvoice,
  togglePurchaseInvoicePaid,
  fetchGuests,
  saveGuest,
  deleteGuest,
  fetchWalletTransactions,
  recordWalletTransaction,
  fetchCheques,
  saveCheque,
  deleteCheque,
  updateChequeStatus,
  fetchWagePayments,
  saveWagePayment,
  deleteWagePayment,
  DEFAULT_SETTINGS,
} from './services/dbService';

import { Header } from './components/Header';
import { SettingsView } from './components/SettingsView';
import { ItemsCatalogView } from './components/ItemsCatalogView';
import { SalesInvoiceFormView } from './components/SalesInvoiceFormView';
import { PurchaseInvoiceFormView } from './components/PurchaseInvoiceFormView';
import { SalesInvoicesListView } from './components/SalesInvoicesListView';
import { PurchaseInvoicesListView } from './components/PurchaseInvoicesListView';
import { GuestsListView } from './components/GuestsListView';
import { ChequesListView } from './components/ChequesListView';
import { WagesListView } from './components/WagesListView';
import { BudgetAndInvestorView } from './components/BudgetAndInvestorView';
import { ReportsView } from './components/ReportsView';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('new_sales_invoice');

  // App Data State
  const [settings, setSettings] = useState<LodgeSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [wagePayments, setWagePayments] = useState<WagePayment[]>([]);

  // Edit / Print State
  const [editingSalesInvoice, setEditingSalesInvoice] = useState<SalesInvoice | null>(null);
  const [editingPurchaseInvoice, setEditingPurchaseInvoice] = useState<PurchaseInvoice | null>(null);
  const [printingSalesInvoice, setPrintingSalesInvoice] = useState<SalesInvoice | null>(null);

  // Fetch Initial Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [st, cats, its, sales, purchases, gst, wtxs, chq, wgs] = await Promise.all([
          fetchSettings(),
          fetchCategories(),
          fetchItems(),
          fetchSalesInvoices(),
          fetchPurchaseInvoices(),
          fetchGuests(),
          fetchWalletTransactions(),
          fetchCheques(),
          fetchWagePayments(),
        ]);

        setSettings(st);
        setCategories(cats);
        setItems(its);
        setSalesInvoices(sales);
        setPurchaseInvoices(purchases);
        setGuests(gst);
        setWalletTransactions(wtxs);
        setCheques(chq);
        setWagePayments(wgs);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Update dynamic favicon if logo is configured (Requirement 1)
  useEffect(() => {
    if (settings.lodgeLogo) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.lodgeLogo;
    }
  }, [settings.lodgeLogo]);

  // Handlers for Settings
  const handleSaveSettings = async (newSettings: LodgeSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
  };

  // Handlers for Categories
  const handleSaveCategory = async (cat: Partial<Category>): Promise<Category> => {
    const saved = await saveCategory(cat);
    const updated = await fetchCategories();
    setCategories(updated);
    return saved;
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    const updated = await fetchCategories();
    setCategories(updated);
  };

  // Handlers for Items
  const handleSaveItem = async (it: Partial<Item>): Promise<Item> => {
    const saved = await saveItem(it);
    const updated = await fetchItems();
    setItems(updated);
    return saved;
  };

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id);
    const updated = await fetchItems();
    setItems(updated);
  };

  // Auto-Create Item from Sales Invoice (if user typed new item name)
  const handleAutoCreateItem = async (it: Partial<Item>): Promise<Item> => {
    const saved = await saveItem(it);
    const updated = await fetchItems();
    setItems(updated);
    return saved;
  };

  // Handlers for Sales Invoices
  const handleSaveSalesInvoice = async (inv: Partial<SalesInvoice>): Promise<SalesInvoice> => {
    const saved = await saveSalesInvoice(inv);
    const updated = await fetchSalesInvoices();
    setSalesInvoices(updated);
    setEditingSalesInvoice(null);
    return saved;
  };

  const handleDeleteSalesInvoice = async (id: string) => {
    await deleteSalesInvoice(id);
    const updated = await fetchSalesInvoices();
    setSalesInvoices(updated);
  };

  const handleToggleSalesInvoicePaid = async (id: string, paidState: boolean) => {
    await toggleSalesInvoicePaid(id, paidState);
    const updated = await fetchSalesInvoices();
    setSalesInvoices(updated);
  };

  // Convert Proforma to Final Invoice
  const handleConvertToFinalInvoice = async (invoiceId: string) => {
    const target = salesInvoices.find((i) => i.id === invoiceId);
    if (!target) return;
    await saveSalesInvoice({
      ...target,
      status: 'FINAL',
      invoiceKind: 'FINAL'
    });
    const updated = await fetchSalesInvoices();
    setSalesInvoices(updated);
    if (printingSalesInvoice && printingSalesInvoice.id === invoiceId) {
      setPrintingSalesInvoice({
        ...printingSalesInvoice,
        status: 'FINAL',
        invoiceKind: 'FINAL'
      });
    }
  };

  // Handlers for Purchase Invoices
  const handleSavePurchaseInvoice = async (inv: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> => {
    const saved = await savePurchaseInvoice(inv);
    const updated = await fetchPurchaseInvoices();
    setPurchaseInvoices(updated);
    setEditingPurchaseInvoice(null);
    return saved;
  };

  const handleDeletePurchaseInvoice = async (id: string) => {
    await deletePurchaseInvoice(id);
    const updated = await fetchPurchaseInvoices();
    setPurchaseInvoices(updated);
  };

  const handleTogglePurchaseInvoicePaid = async (id: string, paidState: boolean) => {
    await togglePurchaseInvoicePaid(id, paidState);
    const updated = await fetchPurchaseInvoices();
    setPurchaseInvoices(updated);
  };

  // Handlers for Guests & Wallets
  const handleSaveGuest = async (guest: Partial<Guest>): Promise<Guest> => {
    const saved = await saveGuest(guest);
    const updated = await fetchGuests();
    setGuests(updated);
    return saved;
  };

  const handleDeleteGuest = async (id: string) => {
    await deleteGuest(id);
    const updated = await fetchGuests();
    setGuests(updated);
  };

  const handleRecordWalletTransaction = async (tx: Partial<WalletTransaction>): Promise<WalletTransaction> => {
    const saved = await recordWalletTransaction(tx);
    const [updatedGuests, updatedWtxs] = await Promise.all([
      fetchGuests(),
      fetchWalletTransactions(),
    ]);
    setGuests(updatedGuests);
    setWalletTransactions(updatedWtxs);
    return saved;
  };

  // Handlers for Cheques
  const handleSaveCheque = async (cheque: Partial<Cheque>): Promise<Cheque> => {
    const saved = await saveCheque(cheque);
    const updated = await fetchCheques();
    setCheques(updated);
    return saved;
  };

  const handleDeleteCheque = async (id: string) => {
    await deleteCheque(id);
    const updated = await fetchCheques();
    setCheques(updated);
  };

  const handleUpdateChequeStatus = async (id: string, status: 'PENDING' | 'CLEARED' | 'BOUNCED', clearanceDate?: string) => {
    await updateChequeStatus(id, status, clearanceDate);
    const updated = await fetchCheques();
    setCheques(updated);
  };

  // Handlers for Wages / Payroll
  const handleSaveWagePayment = async (wage: Partial<WagePayment>): Promise<WagePayment> => {
    const saved = await saveWagePayment(wage);
    const updated = await fetchWagePayments();
    setWagePayments(updated);
    return saved;
  };

  const handleDeleteWagePayment = async (id: string) => {
    await deleteWagePayment(id);
    const updated = await fetchWagePayments();
    setWagePayments(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-amber-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold">در حال اتصال به دیتابیس آنلاین اقامتگاه...</p>
        <p className="text-xs text-slate-400 mt-1">لطفاً شکیبا باشید</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col dir-rtl font-sans antialiased">
      
      {/* App Header & Navigation with Real-Time Cheque Alarm Badge */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'new_sales_invoice') setEditingSalesInvoice(null);
          if (tab !== 'new_purchase_invoice') setEditingPurchaseInvoice(null);
        }}
        settings={settings}
        cheques={cheques}
      />

      {/* Main App Content Views */}
      <main className="flex-1 pb-24 md:pb-12">
        {/* 1. New or Edit Sales Invoice Form */}
        {activeTab === 'new_sales_invoice' && (
          <SalesInvoiceFormView
            settings={settings}
            existingItems={items}
            existingGuests={guests}
            invoiceToEdit={editingSalesInvoice}
            onSaveInvoice={handleSaveSalesInvoice}
            onAutoCreateItem={handleAutoCreateItem}
            onPrintInvoice={(inv) => setPrintingSalesInvoice(inv)}
            onNavigateToList={() => setActiveTab('sales_invoices_list')}
            onCancelEdit={
              editingSalesInvoice
                ? () => {
                    setEditingSalesInvoice(null);
                    setActiveTab('sales_invoices_list');
                  }
                : undefined
            }
          />
        )}

        {/* 2. Sales Invoices List Window */}
        {activeTab === 'sales_invoices_list' && (
          <SalesInvoicesListView
            invoices={salesInvoices}
            customerTitle={settings.customerTitle || 'مهمان'}
            onSelectEdit={(inv) => {
              setEditingSalesInvoice(inv);
              setActiveTab('new_sales_invoice');
            }}
            onPrintInvoice={(inv) => setPrintingSalesInvoice(inv)}
            onTogglePaid={handleToggleSalesInvoicePaid}
            onDeleteInvoice={handleDeleteSalesInvoice}
            onAddNewInvoice={() => {
              setEditingSalesInvoice(null);
              setActiveTab('new_sales_invoice');
            }}
          />
        )}

        {/* 3. New or Edit Purchase Invoice Form */}
        {activeTab === 'new_purchase_invoice' && (
          <PurchaseInvoiceFormView
            settings={settings}
            existingItems={items}
            invoiceToEdit={editingPurchaseInvoice}
            onSaveInvoice={handleSavePurchaseInvoice}
            onCancelEdit={
              editingPurchaseInvoice
                ? () => {
                    setEditingPurchaseInvoice(null);
                    setActiveTab('purchase_invoices_list');
                  }
                : undefined
            }
          />
        )}

        {/* 4. Purchase Invoices List Window */}
        {activeTab === 'purchase_invoices_list' && (
          <PurchaseInvoicesListView
            invoices={purchaseInvoices}
            onSelectEdit={(inv) => {
              setEditingPurchaseInvoice(inv);
              setActiveTab('new_purchase_invoice');
            }}
            onTogglePaid={handleTogglePurchaseInvoicePaid}
            onDeleteInvoice={handleDeletePurchaseInvoice}
            onAddNewInvoice={() => {
              setEditingPurchaseInvoice(null);
              setActiveTab('new_purchase_invoice');
            }}
          />
        )}

        {/* 5. Guests & Customer Directory (Requirement 4) */}
        {activeTab === 'guests_list' && (
          <GuestsListView
            guests={guests}
            salesInvoices={salesInvoices}
            walletTransactions={walletTransactions}
            customerTitle={settings.customerTitle || 'مهمان'}
            onSaveGuest={handleSaveGuest}
            onDeleteGuest={handleDeleteGuest}
            onRecordWalletTransaction={handleRecordWalletTransaction}
            onIssueInvoiceForGuest={(guest) => {
              setEditingSalesInvoice({
                id: '',
                serialNumber: '',
                date: '',
                guestName: guest.name,
                guestNationalId: guest.nationalCode || '',
                guestPhone: guest.phone || '',
                items: [],
                subtotal: 0,
                serviceFee: 0,
                taxFee: 0,
                discount: 0,
                totalPayable: 0,
                paid: false,
                paymentMethod: 'CASH',
                status: 'FINAL',
                invoiceKind: 'FINAL',
                createdAt: new Date().toISOString(),
              });
              setActiveTab('new_sales_invoice');
            }}
          />
        )}

        {/* 6. Cheques Management & Alarms (Requirement 17 / Alarms) */}
        {activeTab === 'cheques_list' && (
          <ChequesListView
            cheques={cheques}
            settings={settings}
            onSaveCheque={handleSaveCheque}
            onDeleteCheque={handleDeleteCheque}
            onUpdateChequeStatus={handleUpdateChequeStatus}
          />
        )}

        {/* 7. Wages & Payroll (Requirement 7) */}
        {activeTab === 'wages_list' && (
          <WagesListView
            wagePayments={wagePayments}
            onSaveWagePayment={handleSaveWagePayment}
            onDeleteWagePayment={handleDeleteWagePayment}
          />
        )}

        {/* 8. Budget & Investor Profit Share (Requirement 14) */}
        {activeTab === 'budget_investor' && (
          <BudgetAndInvestorView
            settings={settings}
            salesInvoices={salesInvoices}
            purchaseInvoices={purchaseInvoices}
            wagePayments={wagePayments}
            categories={categories}
          />
        )}

        {/* 9. Items & Categories Catalog */}
        {activeTab === 'items_catalog' && (
          <ItemsCatalogView
            categories={categories}
            items={items}
            settings={settings}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            onSaveItem={handleSaveItem}
            onDeleteItem={handleDeleteItem}
          />
        )}

        {/* 10. Reports & Analytics */}
        {activeTab === 'reports' && (
          <ReportsView
            salesInvoices={salesInvoices}
            purchaseInvoices={purchaseInvoices}
            categories={categories}
            wagePayments={wagePayments}
            customerTitle={settings.customerTitle || 'مهمان'}
          />
        )}

        {/* 11. Settings (Requirements 1, 10, 11, 18, 19, etc.) */}
        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            categories={categories}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>

      {/* Invoice Printable & Export View Modal */}
      {printingSalesInvoice && (
        <InvoicePrintModal
          invoice={printingSalesInvoice}
          settings={settings}
          onClose={() => setPrintingSalesInvoice(null)}
          onConvertToFinalInvoice={handleConvertToFinalInvoice}
        />
      )}
    </div>
  );
}
