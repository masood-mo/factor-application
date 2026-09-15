import React, { useState } from 'react';
import { Category, Item, LodgeSettings } from '../types';
import { formatPersianPrice } from '../utils/numberToWords';
import { FolderPlus, PackagePlus, Search, Edit3, Trash2, Folder, Tag, Plus, Check, X, Filter, RefreshCw, Loader2 } from 'lucide-react';

interface ItemsCatalogViewProps {
  catalogType?: 'SALES' | 'PURCHASE';
  onSwitchCatalogType?: (type: 'SALES' | 'PURCHASE') => void;
  categories: Category[];
  items: Item[];
  settings: LodgeSettings;
  onSaveCategory: (category: Partial<Category>) => Promise<Category>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSaveItem: (item: Partial<Item>) => Promise<Item>;
  onDeleteItem: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export const ItemsCatalogView: React.FC<ItemsCatalogViewProps> = ({
  catalogType = 'SALES',
  onSwitchCatalogType,
  categories,
  items,
  settings,
  onSaveCategory,
  onDeleteCategory,
  onSaveItem,
  onDeleteItem,
  onRefresh,
}) => {
  const isPurchase = catalogType === 'PURCHASE';
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);

  // Category Modal Handlers
  const handleOpenCategoryModal = (cat?: Category) => {
    setEditingCategory(cat || { name: '', description: '' });
    setCategoryModalOpen(true);
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;
    try {
      await onSaveCategory(editingCategory);
      setCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      console.error(err);
      alert('خطا در ذخیره دسته‌بندی');
    }
  };

  const handleDeleteCategoryClick = async (id: string, name: string) => {
    const itemsInCat = items.filter((it) => it.categoryId === id);
    if (itemsInCat.length > 0) {
      alert(`دسته "${name}" دارای ${itemsInCat.length} کالا است. ابتدا کالاهای آن را حذف یا جابه‌جا کنید.`);
      return;
    }
    if (confirm(`آیا از حذف دسته "${name}" اطمینان دارید؟`)) {
      try {
        await onDeleteCategory(id);
        if (selectedCategoryId === id) setSelectedCategoryId('ALL');
      } catch (err) {
        console.error(err);
        alert('خطا در حذف دسته‌بندی');
      }
    }
  };

  // Item Modal Handlers
  const handleOpenItemModal = (item?: Item) => {
    const initialCatId = selectedCategoryId !== 'ALL' ? selectedCategoryId : (categories[0]?.id || '');
    const foundCat = categories.find((c) => c.id === initialCatId);

    setEditingItem(
      item
        ? { ...item }
        : {
            categoryId: initialCatId,
            categoryName: foundCat?.name || 'سایر',
            name: '',
            unit: settings.units[0] || 'عدد',
            basePrice: 0,
          }
    );
    setItemModalOpen(true);
  };

  const handleSaveItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.categoryId) {
      alert('لطفاً نام کالا و دسته را وارد کنید.');
      return;
    }

    const categoryObj = categories.find((c) => c.id === editingItem.categoryId);

    try {
      await onSaveItem({
        ...editingItem,
        categoryName: categoryObj?.name || editingItem.categoryName || 'سایر',
      });
      setItemModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert('خطا در ذخیره کالا');
    }
  };

  const handleDeleteItemClick = async (id: string, name: string) => {
    if (confirm(`آیا از حذف کالا/خدمت "${name}" اطمینان دارید؟`)) {
      try {
        await onDeleteItem(id);
      } catch (err) {
        console.error(err);
        alert('خطا در حذف کالا');
      }
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategoryId === 'ALL' || item.categoryId === selectedCategoryId;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleManualRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Catalog Mode Selector Tabs */}
      {onSwitchCatalogType && (
        <div className="flex items-center gap-2 mb-5 p-1.5 bg-slate-200/80 rounded-2xl w-fit border border-slate-300">
          <button
            type="button"
            onClick={() => onSwitchCatalogType('SALES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isPurchase
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-600" />
            <span>کاتالوگ کالا و خدمات فروش (درآمدها)</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchCatalogType('PURCHASE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isPurchase
                ? 'bg-white text-emerald-950 shadow-xs ring-1 ring-emerald-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Folder className="w-4 h-4 text-emerald-600" />
            <span>کاتالوگ کالا و خدمات خرید (هزینه‌ها و بودجه)</span>
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Tag className={`w-6 h-6 ${isPurchase ? 'text-emerald-600' : 'text-amber-600'}`} />
              {isPurchase ? 'کاتالوگ کالا و خدمات خرید (هزینه‌ها)' : 'کاتالوگ کالا و خدمات فروش (درآمدها)'}
            </h2>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              isPurchase ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isPurchase ? 'مربوط به فاکتورهای خرید و ردیف‌های بودجه' : 'مربوط به فاکتورهای فروش و پذیرایی'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isPurchase
              ? 'دسته‌بندی هزینه‌ها (مواد غذایی و بهداشتی، قبض و اینترنت، تعمیرات و نگهداری، تبلیغات و محیط زیست) و اقلام مصرفی'
              : 'دسته‌بندی خدمات اقامتی، رستوران، صنایع دستی و تورها برای صدور فاکتور فروش اقامتگاه'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="به‌روزرسانی لیست"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">به‌روزرسانی</span>
            </button>
          )}

          <button
            onClick={() => handleOpenCategoryModal()}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FolderPlus className={`w-4 h-4 ${isPurchase ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{isPurchase ? 'ایجاد دسته خرید جدید' : 'ایجاد دسته فروش جدید'}</span>
          </button>

          <button
            onClick={() => handleOpenItemModal()}
            className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
              isPurchase ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>{isPurchase ? 'تعریف کالای خرید جدید' : 'تعریف کالا/خدمت جدید'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Category Hierarchy Selection */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-amber-700" />
              دسته‌بندی‌های کالا و خدمات
            </h3>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {categories.length} دسته
            </span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedCategoryId === 'ALL'
                  ? 'bg-amber-700 text-white font-bold shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                <span>همه دسته‌ها</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md ${
                selectedCategoryId === 'ALL' ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-600'
              }`}>
                {items.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = items.filter((i) => i.categoryId === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <div key={cat.id} className="group relative flex items-center">
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer pl-12 ${
                      isSelected
                        ? 'bg-amber-700 text-white font-bold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-200' : 'text-amber-600'}`} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-amber-800 text-amber-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>

                  {/* Actions on Category */}
                  <div className="absolute left-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                      title="ویرایش دسته"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategoryClick(cat.id, cat.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="حذف دسته"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Items List Table */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search bar & Selected category indicator */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام کالا یا خدمت..."
                className="w-full pl-3 pr-9 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2" />
            </div>

            <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
              نمایش <span className="font-bold text-slate-800">{filteredItems.length}</span> مورد از مجموع {items.length} کالا
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">{isPurchase ? 'نام کالای خرید' : 'نام کالا / خدمت'}</th>
                    <th className="px-4 py-3">{isPurchase ? 'دسته‌بندی هزینه' : 'دسته مربوطه'}</th>
                    <th className="px-4 py-3">واحد اندازه‌گیری</th>
                    <th className="px-4 py-3">{isPurchase ? 'برآورد قیمت خرید (تومان)' : 'قیمت پایه فروش (تومان)'}</th>
                    <th className="px-4 py-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        {isPurchase
                          ? 'هیچ کالایی در کاتالوگ خرید ثبت نشده است. می‌توانید با دکمه «تعریف کالای خرید جدید» اولین قلم هزینه اقامتگاه را تعریف فرمایید.'
                          : 'هیچ کالا یا خدمتی با مشخصات وارد شده یافت نشد.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-medium text-[11px]">
                            {item.categoryName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{item.unit}</td>
                        <td className="px-4 py-3 font-bold text-amber-700">
                          {formatPersianPrice(item.basePrice)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenItemModal(item)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
                              title="ویرایش"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItemClick(item.id, item.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create/Edit Category */}
      {categoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FolderPlus className={`w-4 h-4 ${isPurchase ? 'text-emerald-700' : 'text-amber-700'}`} />
                {editingCategory.id
                  ? (isPurchase ? 'ویرایش دسته خرید' : 'ویرایش دسته فروش')
                  : (isPurchase ? 'افزودن دسته‌بندی خرید جدید' : 'افزودن دسته‌بندی فروش جدید')}
              </h3>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان دسته <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="مثال: صنایع دستی، اقامت و صبحانه..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  توضیحات کوتاه
                </label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  ذخیره دسته
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Item */}
      {itemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PackagePlus className={`w-4 h-4 ${isPurchase ? 'text-emerald-700' : 'text-amber-700'}`} />
                {editingItem.id
                  ? (isPurchase ? 'ویرایش کالای خرید' : 'ویرایش کالا / خدمت')
                  : (isPurchase ? 'افزودن کالای خرید جدید' : 'افزودن کالا یا خدمت جدید')}
              </h3>
              <button
                onClick={() => setItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPurchase ? 'انتخاب دسته‌بندی هزینه' : 'انتخاب دسته مربوطه'} <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editingItem.categoryId || ''}
                  onChange={(e) => {
                    const catObj = categories.find((c) => c.id === e.target.value);
                    setEditingItem({
                      ...editingItem,
                      categoryId: e.target.value,
                      categoryName: catObj?.name || 'سایر',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isPurchase ? 'نام کالای خرید' : 'نام کالا یا خدمت'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder={
                    isPurchase
                      ? 'مثال: گوشت و پروتئین، برنج طارم، شوینده، آبگرمکن...'
                      : 'مثال: دیزی سنگی محلی، اقامت اتاق شاه‌نشین...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    واحد اندازه‌گیری <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingItem.unit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                  >
                    {settings.units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPurchase ? 'برآورد قیمت خرید (تومان)' : 'قیمت پایه فروش (تومان)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={editingItem.basePrice || 0}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, basePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                  {editingItem.basePrice! > 0 && (
                    <span className="text-[10px] text-amber-700 font-bold block mt-1">
                      {formatPersianPrice(editingItem.basePrice!)} تومان
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`flex items-center gap-1.5 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-xs ${
                    isPurchase ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-700 hover:bg-amber-800'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  ذخیره کالا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
