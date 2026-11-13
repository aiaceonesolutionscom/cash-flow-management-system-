import React, { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, Loader2, RefreshCw, X, Pencil } from 'lucide-react';
import { api } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Category, CategoryType, Company } from '../types';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';

export const CategoriesPage: React.FC = () => {
  const { selectedCompanyId, refreshTrigger, triggerRefresh, activeCompanyName, companies } = useFilters();
  const [categories, setCategories] = useState<Category[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState<string>('');
  const [catType, setCatType] = useState<CategoryType>('EXPENSE');
  const [companyId, setCompanyId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        companyId: selectedCompanyId,
        type: typeFilter !== 'all' ? typeFilter : undefined
      };
      const res = await api.get('/categories', { params });
      if (res.data.success) {
        const rawCats: Category[] = res.data.categories || [];
        if (!selectedCompanyId || selectedCompanyId === 'all') {
          const map = new Map<string, Category>();
          for (const c of rawCats) {
            const key = `${c.name.trim().toLowerCase()}_${c.type}`;
            if (!map.has(key)) {
              map.set(key, { ...c, company: undefined });
            } else {
              const existing = map.get(key)!;
              if (existing._count && c._count) {
                existing._count.transactions += (c._count.transactions || 0);
              }
            }
          }
          setCategories(Array.from(map.values()));
        } else {
          setCategories(rawCats);
        }
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [selectedCompanyId, typeFilter, refreshTrigger]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType('EXPENSE');
    setCompanyId(selectedCompanyId !== 'all' ? selectedCompanyId : (companies[0]?.id || ''));
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCompanyId(cat.companyId || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!catName.trim()) {
      setError('Category name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: catName.trim(),
        type: catType,
        companyId: companyId || null
      };

      const res = editingCategory
        ? await api.put(`/categories/${editingCategory.id}`, payload)
        : await api.post('/categories', payload);

      if (res.data.success) {
        setIsModalOpen(false);
        setEditingCategory(null);
        triggerRefresh();
        fetchCategories();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || (editingCategory ? 'Failed to update category.' : 'Failed to create category.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (cat: Category) => {
    if (cat._count && cat._count.transactions > 0) {
      setWarningMessage(`Cannot delete category "${cat.name}" because it is currently linked to ${cat._count.transactions} transaction(s). Please reassign or delete those transactions first.`);
      return;
    }
    setDeleteTarget(cat);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/categories/${deleteTarget.id}`);
      if (res.data.success) {
        setDeleteTarget(null);
        triggerRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Expense & Income Categories</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard and custom financial categories for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCategories}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Category
          </button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Categories
        </button>
        <button
          onClick={() => setTypeFilter('EXPENSE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            typeFilter === 'EXPENSE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Expense Categories
        </button>
        <button
          onClick={() => setTypeFilter('INCOME')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            typeFilter === 'INCOME' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Income Categories
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No categories found matching criteria.
          </div>
        ) : (
          <>
            {/* Mobile Cards for Categories */}
            <div className="md:hidden divide-y divide-slate-100">
              {categories.slice((page - 1) * limit, page * limit).map((cat) => {
                const isProtected = cat.name.trim().toLowerCase() === 'company funds' || cat.name.toLowerCase().includes('company fund');

                return (
                  <div key={cat.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{cat.name}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${
                          cat.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {cat.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {cat.company ? cat.company.name : 'Global Default'} • <span className="text-slate-600 font-semibold">{cat._count?.transactions || 0} txn</span>
                      </div>
                    </div>

                    {isProtected ? (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                        System Default
                      </span>
                    ) : (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={cat._count && cat._count.transactions > 0 ? 'Cannot delete: transactions linked' : 'Delete category'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table for Categories */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Linked Transactions</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.slice((page - 1) * limit, page * limit).map((cat) => {
                    const isProtected = cat.name.trim().toLowerCase() === 'company funds' || cat.name.toLowerCase().includes('company fund');

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{cat.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {cat.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cat.company ? `${cat.company.name}` : 'Global Default'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {cat._count?.transactions || 0} transactions
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isProtected ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full inline-block">
                              System Default
                            </span>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleOpenEdit(cat)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Category"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(cat)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title={cat._count && cat._count.transactions > 0 ? 'Cannot delete: transactions linked' : 'Delete category'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Dynamic Category Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(categories.length / limit) || 1}
          totalItems={categories.length}
          itemsPerPage={limit}
          onPageChange={setPage}
          onItemsPerPageChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingCategory ? 'Modify category name or classification type' : 'Add custom income or expense category'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Legal Fees, Cloud Hosting, Logistics..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Classification Type *
                </label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as CategoryType)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EXPENSE">Expense Category (Cash Out)</option>
                  <option value="INCOME">Income Category (Cash In)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assign to Company
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Global (Available to All Companies)</option>
                  {companies.map((c: Company) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingCategory ? (
                    'Update Category'
                  ) : (
                    'Create Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Dialog for Category Deletion */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${deleteTarget?.name}" (${deleteTarget?.type})?\n\nThis category will be permanently removed.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Warning Dialog for Linked Transactions */}
      <ConfirmDialog
        isOpen={!!warningMessage}
        title="Cannot Delete Category"
        message={warningMessage || ''}
        confirmText="Understood"
        cancelText="Close"
        variant="warning"
        onConfirm={() => setWarningMessage(null)}
        onCancel={() => setWarningMessage(null)}
      />
    </div>
  );
};
