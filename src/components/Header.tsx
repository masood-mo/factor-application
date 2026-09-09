import React, { useState, useEffect } from 'react';
import { ActiveTab, LodgeSettings, Cheque } from '../types';
import {
  FileText,
  ShoppingBag,
  List,
  BarChart3,
  Settings,
  PlusCircle,
  Download,
  Building2,
  Menu,
  X,
  CreditCard,
  Users,
  Banknote,
  Calculator,
  BellRing
} from 'lucide-react';
import { getChequeAlarmStatus } from '../utils/persianDate';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: LodgeSettings;
  cheques?: Cheque[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  cheques = []
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const customerTitle = settings.customerTitle || 'مهمان';
  const alarmDays = settings.chequeAlarmDays ?? 2;

  // Calculate active due cheques for alarm badge
  const dueChequesCount = cheques.filter((c) => {
    if (c.status !== 'PENDING') return false;
    const alarm = getChequeAlarmStatus(c.dueDate, alarmDays);
    return alarm.isAlarm || alarm.isPast;
  }).length;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const navItems = [
    { id: 'new_sales_invoice' as ActiveTab, label: `فاکتور فروش جدید`, icon: PlusCircle },
    { id: 'sales_invoices_list' as ActiveTab, label: 'فاکتورهای فروش', icon: FileText },
    { id: 'new_purchase_invoice' as ActiveTab, label: 'فاکتور خرید جدید', icon: ShoppingBag },
    { id: 'purchase_invoices_list' as ActiveTab, label: 'فاکتورهای خرید', icon: CreditCard },
    { id: 'guests_list' as ActiveTab, label: `${customerTitle}‌ها و کیف پول`, icon: Users },
    {
      id: 'cheques_list' as ActiveTab,
      label: 'چک‌ها و سررسید',
      icon: CreditCard,
      badge: dueChequesCount > 0 ? dueChequesCount : undefined
    },
    { id: 'wages_list' as ActiveTab, label: 'دستمزد و حقوق', icon: Banknote },
    { id: 'budget_investor' as ActiveTab, label: 'بودجه و سرمایه‌گذار', icon: Calculator },
    { id: 'items_catalog' as ActiveTab, label: 'کالاها و خدمات', icon: List },
    { id: 'reports' as ActiveTab, label: 'گزارش‌های مالی', icon: BarChart3 },
    { id: 'settings' as ActiveTab, label: 'تنظیمات', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-amber-900/15 sticky top-0 z-30 shadow-xs no-print backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Lodge Brand & Logo */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {settings.lodgeLogo ? (
              <img
                src={settings.lodgeLogo}
                alt={settings.lodgeName}
                className="w-10 h-10 rounded-xl object-cover border border-amber-900/20 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-800 text-amber-200 flex items-center justify-center font-bold shadow-xs border border-amber-900/30">
                <Building2 className="w-5 h-5 text-amber-200" />
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight flex items-center gap-1.5">
                {settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک'}
              </h1>
              <p className="text-[11px] text-amber-900/70 font-medium">حسابداری، بودجه و فاکتورینگ</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'text-slate-700 hover:text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Medium Screen Dropdown or Navigation Buttons */}
          <div className="hidden md:flex xl:hidden items-center gap-1.5">
            <button
              onClick={() => setActiveTab('new_sales_invoice')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeTab === 'new_sales_invoice' ? 'bg-amber-800 text-white' : 'bg-amber-50 text-amber-900'
              }`}
            >
              فاکتور فروش
            </button>
            <button
              onClick={() => setActiveTab('guests_list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeTab === 'guests_list' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {customerTitle}‌ها
            </button>
            <button
              onClick={() => setActiveTab('cheques_list')}
              className={`relative px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeTab === 'cheques_list' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              چک‌ها
              {dueChequesCount > 0 && (
                <span className="mr-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {dueChequesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('budget_investor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeTab === 'budget_investor' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              بودجه و سود
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                activeTab === 'reports' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              گزارش‌ها
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-xl text-xs font-bold ${
                activeTab === 'settings' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              title="تنظیمات"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Right Controls: PWA Install & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            {dueChequesCount > 0 && (
              <button
                onClick={() => setActiveTab('cheques_list')}
                className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-rose-100 transition-all cursor-pointer"
                title={`${dueChequesCount} چک در آستانه سررسید`}
              >
                <BellRing className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                <span className="hidden sm:inline">سررسید چک:</span>
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {dueChequesCount}
                </span>
              </button>
            )}

            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="نصب اپلیکیشن روی دستگاه"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">نصب برنامه</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
              aria-label="منو"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 max-h-[75vh] overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-800 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
