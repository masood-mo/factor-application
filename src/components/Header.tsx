import React, { useState, useEffect, useRef } from 'react';
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
  BellRing,
  Calendar,
  ChevronDown,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FolderOpen
} from 'lucide-react';
import { getChequeAlarmStatus, formatPersianDate, getCurrentJalaliDate } from '../utils/persianDate';

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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  // 4 Main Menu Categories with clean sub-menus
  const menuCategories = [
    {
      id: 'sales_group',
      title: 'فروش و مهمانان',
      shortTitle: 'فروش',
      icon: ShoppingBag,
      subItems: [
        {
          id: 'new_sales_invoice' as ActiveTab,
          label: 'صدور فاکتور فروش جدید',
          desc: 'ثبت سریع اقلام یا صدای هوشمند',
          icon: PlusCircle,
          highlight: true
        },
        {
          id: 'sales_invoices_list' as ActiveTab,
          label: 'لیست فاکتورهای فروش',
          desc: 'مشاهده، چاپ، تسویه و پیش‌فاکتورها',
          icon: FileText
        },
        {
          id: 'guests_list' as ActiveTab,
          label: `${customerTitle}‌ها و کیف پول`,
          desc: 'مانده حساب، شارژ و سوابق رفت‌وآمد',
          icon: Users
        }
      ]
    },
    {
      id: 'purchase_group',
      title: 'خرید و هزینه‌ها',
      shortTitle: 'خرید',
      icon: CreditCard,
      subItems: [
        {
          id: 'new_purchase_invoice' as ActiveTab,
          label: 'ثبت فاکتور خرید جدید',
          desc: 'ثبت خرید اقلام و مواد اولیه',
          icon: PlusCircle
        },
        {
          id: 'purchase_invoices_list' as ActiveTab,
          label: 'لیست فاکتورهای خرید',
          desc: 'بدهی به تامین‌کنندگان و اصناف',
          icon: CreditCard
        },
        {
          id: 'wages_list' as ActiveTab,
          label: 'دستمزد و حقوق پرسنل',
          desc: 'ثبت پرداختی‌ها و تسویه کارکنان',
          icon: Banknote
        }
      ]
    },
    {
      id: 'treasury_group',
      title: 'خزانه‌داری و مالی',
      shortTitle: 'مالی',
      icon: Calculator,
      badge: dueChequesCount > 0 ? dueChequesCount : undefined,
      subItems: [
        {
          id: 'cheques_list' as ActiveTab,
          label: 'مدیریت چک‌ها و سررسید',
          desc: 'هشدارهای سررسید چک‌های دریافتی/پرداختی',
          icon: CreditCard,
          badge: dueChequesCount > 0 ? dueChequesCount : undefined
        },
        {
          id: 'budget_investor' as ActiveTab,
          label: 'بودجه کل و سرمایه‌گذار',
          desc: 'محاسبه سهم سود، درآمد و هزینه‌ها',
          icon: Calculator
        }
      ]
    },
    {
      id: 'system_group',
      title: 'پایه و گزارش‌ها',
      shortTitle: 'پایه',
      icon: FolderOpen,
      subItems: [
        {
          id: 'items_catalog' as ActiveTab,
          label: 'کاتالوگ کالاها و خدمات',
          desc: 'تعریف اتاق‌ها، غذاها و خدمات بوم‌گردی',
          icon: List
        },
        {
          id: 'reports' as ActiveTab,
          label: 'گزارش‌های مالی و تحلیلی',
          desc: 'سود و زیان، تراز و نمودارهای آماری',
          icon: BarChart3
        },
        {
          id: 'settings' as ActiveTab,
          label: 'تنظیمات اقامتگاه',
          desc: 'مشخصات، چاپ، درصدها و پشتیبان‌گیری',
          icon: Settings
        }
      ]
    }
  ];

  // Helper to check if a main menu group is currently active
  const isGroupActive = (category: typeof menuCategories[0]) => {
    return category.subItems.some((sub) => sub.id === activeTab);
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white/95 border-b border-amber-900/15 sticky top-0 z-40 shadow-xs no-print backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {settings.lodgeLogo ? (
                <img
                  src={settings.lodgeLogo}
                  alt={settings.lodgeName}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-amber-900/20 shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-800 text-amber-200 flex items-center justify-center font-bold shadow-xs border border-amber-900/30">
                  <Building2 className="w-5 h-5 text-amber-200" />
                </div>
              )}
              <div>
                <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-tight flex items-center gap-1.5">
                  {settings.lodgeName || 'اقامتگاه بوم‌گردی خانه برزک'}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-amber-900/70 font-medium hidden xs:block">
                  سیستم هوشمند حسابداری، بودجه و فاکتور
                </p>
              </div>
            </div>

            {/* Desktop Structured Main Menus with Dropdowns */}
            <nav ref={dropdownRef} className="hidden md:flex items-center gap-2">
              {menuCategories.map((cat) => {
                const CatIcon = cat.icon;
                const active = isGroupActive(cat);
                const isOpen = openDropdown === cat.id;

                return (
                  <div key={cat.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(isOpen ? null : cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-800 text-white shadow-xs'
                          : 'text-slate-700 hover:text-amber-950 hover:bg-amber-50'
                      }`}
                    >
                      <CatIcon className={`w-3.5 h-3.5 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                      <span>{cat.title}</span>
                      {cat.badge !== undefined && (
                        <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
                          {cat.badge}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                          active ? 'text-amber-200' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Window */}
                    {isOpen && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-amber-900/15 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-right">
                        <div className="text-[10px] font-bold text-amber-900/60 px-2.5 py-1 mb-1 border-b border-slate-100">
                          بخش {cat.title}
                        </div>
                        <div className="space-y-1">
                          {cat.subItems.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = activeTab === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectTab(sub.id)}
                                className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-right transition-all cursor-pointer ${
                                  isSubActive
                                    ? 'bg-amber-100/80 text-amber-950 font-black'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                    isSubActive
                                      ? 'bg-amber-800 text-white'
                                      : sub.highlight
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <SubIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold truncate">{sub.label}</span>
                                    {sub.badge !== undefined && (
                                      <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                        {sub.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{sub.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Instant Action: New Invoice */}
              <button
                type="button"
                onClick={() => handleSelectTab('new_sales_invoice')}
                className="flex items-center gap-1.5 bg-gradient-to-l from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ml-1"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>+ فاکتور فروش</span>
              </button>
            </nav>

            {/* Header Right Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Cheque Due Alarm Bell (Direct Click) */}
              {dueChequesCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectTab('cheques_list')}
                  className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-rose-100 transition-all cursor-pointer"
                  title={`${dueChequesCount} چک در آستانه سررسید`}
                >
                  <BellRing className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                  <span className="hidden sm:inline">سررسید چک:</span>
                  <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {dueChequesCount}
                  </span>
                </button>
              )}

              {/* Jalali Date Badge */}
              <div className="hidden lg:flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-950 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-amber-800" />
                <span>{formatPersianDate(getCurrentJalaliDate())}</span>
              </div>

              {/* Source ZIP Download */}
              <a
                href="/api/download-zip"
                download="factor-application.zip"
                className="hidden sm:flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="دانلود فایل ZIP سورس‌کد کامل پروژه"
              >
                <Download className="w-3.5 h-3.5 text-amber-800" />
                <span className="hidden md:inline">دانلود ZIP</span>
              </a>

              {/* PWA Install */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  title="نصب اپلیکیشن روی دستگاه"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">نصب برنامه</span>
                </button>
              )}

              {/* Mobile Drawer Trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                aria-label="منوی اصلی"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Full Categorized Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-50 border-b border-amber-900/20 px-3 pt-3 pb-6 max-h-[80vh] overflow-y-auto shadow-2xl animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500">منوی بخش‌های نرم‌افزار</span>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                {formatPersianDate(getCurrentJalaliDate())}
              </span>
            </div>

            <div className="space-y-3">
              {menuCategories.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.id} className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 px-2 py-1 mb-1.5 text-xs font-bold text-amber-900 border-b border-slate-100">
                      <CatIcon className="w-4 h-4 text-amber-800" />
                      <span>{cat.title}</span>
                      {cat.badge !== undefined && (
                        <span className="mr-auto bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                          {cat.badge} چک
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {cat.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelectTab(sub.id)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSubActive
                                ? 'bg-amber-800 text-white shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-amber-300' : 'text-slate-500'}`} />
                              <span>{sub.label}</span>
                            </div>
                            {sub.badge !== undefined && (
                              <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ZIP Download in Mobile Drawer */}
              <div className="pt-2">
                <a
                  href="/api/download-zip"
                  download="factor-application.zip"
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-amber-950 bg-amber-100/70 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-amber-800" />
                    <span>دانلود سورس‌کد کامل پروژه (ZIP)</span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-md">ZIP</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/98 border-t border-amber-900/15 z-40 shadow-2xl backdrop-blur-lg px-2 py-1.5 no-print">
        <div className="flex items-center justify-around">
          
          {/* 1. Sales */}
          <button
            type="button"
            onClick={() => handleSelectTab('sales_invoices_list')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'sales_invoices_list' || activeTab === 'guests_list'
                ? 'text-amber-800 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">فروش</span>
          </button>

          {/* 2. Purchases */}
          <button
            type="button"
            onClick={() => handleSelectTab('purchase_invoices_list')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'purchase_invoices_list' || activeTab === 'new_purchase_invoice' || activeTab === 'wages_list'
                ? 'text-amber-800 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">خرید</span>
          </button>

          {/* 3. Center Action Button: + New Invoice */}
          <div className="relative -top-4">
            <button
              type="button"
              onClick={() => handleSelectTab('new_sales_invoice')}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-800 to-amber-600 text-white flex items-center justify-center shadow-lg border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="صدور فاکتور جدید"
            >
              <PlusCircle className="w-6 h-6 text-amber-200" />
            </button>
          </div>

          {/* 4. Cheques & Treasury */}
          <button
            type="button"
            onClick={() => handleSelectTab('cheques_list')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'cheques_list' || activeTab === 'budget_investor'
                ? 'text-amber-800 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">مالی و چک</span>
            {dueChequesCount > 0 && (
              <span className="absolute top-0 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white animate-ping" />
            )}
          </button>

          {/* 5. Full Menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              mobileMenuOpen || activeTab === 'items_catalog' || activeTab === 'reports' || activeTab === 'settings'
                ? 'text-amber-800 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">سایر منوها</span>
          </button>

        </div>
      </nav>
    </>
  );
};
