import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  PersonAdd,
  Email,
  Lock,
  Badge,
  Delete,
  Edit,
  Inventory2,
  Business,
  Search,
  CheckCircle,
  Cancel,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { adminService } from '../services/adminService';
import { offerService } from '../services/offerService';
import { useLanguage } from '../context/LanguageContext';
import { User } from '../types/api';

type Admin = User & {
  _id?: string;
  id?: string;
  status?: 'active' | 'inactive' | string;
  full_name?: string;
  agency_name?: string;
  agency_logo_url?: string;
  role?: string;
};

type Offer = {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  location?: string;
  destination?: string;
  total_price?: number;
  price?: number;
  agency?: { name?: string; logo?: string } | null;
  creator?: { name?: string } | null;
};

const PAGE_SIZE = 10;

function StatCard({ title, value, accent }: { title: string; value: string | number; accent?: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-100 p-4 shadow-sm flex flex-col gap-2`}
    >
      <div className="text-xs text-gray-500">{title}</div>
      <div className={`text-2xl font-semibold text-gray-900 ${accent || ''}`}>{value}</div>
    </motion.div>
  );
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-3 rounded-md bg-gray-200/60 animate-pulse ${className}`} />;
}

function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="16" width="104" height="56" rx="8" stroke="#E5E7EB" strokeWidth="2" fill="#FAFAFA" />
        <path d="M28 32H92" stroke="#E5E7EB" strokeWidth="2" />
        <circle cx="36" cy="48" r="8" fill="#E5E7EB" />
      </svg>
      <div className="text-lg font-semibold text-gray-800">{title}</div>
      {subtitle && <div className="text-sm text-gray-500 max-w-md">{subtitle}</div>}
      {action}
    </div>
  );
}

function ConfirmModal({ open, title, message, loading, onCancel, onConfirm }: { open: boolean; title: string; message?: string; loading?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-lg border border-gray-100">
        <div className="text-lg font-semibold text-gray-900">{title}</div>
        {message && <div className="text-sm text-gray-600 mt-2">{message}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-60">
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AdminManagement() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'agencies' | 'offers'>('agencies');

  // Admins
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Offers
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  // Search & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [offerSearchQuery, setOfferSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Create form
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: '',
    agency_name: '',
    agency_logo_url: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmContext, setConfirmContext] = useState<{ type: 'admin' | 'offer'; id: string | null; name?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const totalAgencies = admins.length;
    const activeAgencies = admins.filter((a) => a.status === 'active').length;
    const inactiveAgencies = admins.filter((a) => a.status === 'deactivated').length;
    const totalOffers = offers.length;
    return { totalAgencies, activeAgencies, inactiveAgencies, totalOffers };
  }, [admins, offers]);

  const fetchAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    setGlobalError(null);
    try {
      const data = await adminService.getAllAdmins();
      const adminsList = data?.admins || data?.data?.admins || data?.users || data?.data?.users || data?.data || data || [];
      const list = Array.isArray(adminsList) ? adminsList : adminsList ? [adminsList] : [];
      setAdmins(list as Admin[]);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) setGlobalError('You do not have permission to view agency admins.');
      else setGlobalError('Failed to fetch agency admins. Please try again later.');
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  const fetchOffers = useCallback(async () => {
    setIsLoadingOffers(true);
    try {
      const data = await offerService.getAllOffers();
      const list = Array.isArray(data) ? data : data?.offers || data?.data?.offers || data?.data || [];
      setOffers(list as Offer[]);
    } catch (err) {
      console.error('Failed to fetch offers', err);
    } finally {
      setIsLoadingOffers(false);
    }
  }, []);

  useEffect(() => {
    // always refresh stats when tab changes
    if (activeTab === 'agencies') fetchAdmins();
    else fetchOffers();
  }, [activeTab, fetchAdmins, fetchOffers]);

  // Input handling with simple realtime validation
  const validateForm = useCallback((data = formData) => {
    const errs: Record<string, string> = {};
    if (!data.agency_name) errs.agency_name = 'Agency name is required';
    if (!/^[\w-.]+@[\w-]+\.[a-z]{2,}$/i.test(data.email)) errs.email = 'Enter a valid email';
    if (data.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (data.phone.length < 6) errs.phone = 'Enter a valid phone';
    return errs;
  }, [formData]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setFormErrors((p) => ({ ...p, [name]: '' }));
  }, []);

  const handleCreateAdmin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      await adminService.createAdmin({
        firstName: formData.agency_name.split(' ')[0] || 'Admin',
        lastName: formData.agency_name.split(' ').slice(1).join(' ') || 'Account',
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        agency_name: formData.agency_name || null,
        agency_logo_url: formData.agency_logo_url || null,
      });
      setGlobalSuccess('Agency admin created');
      setFormData({ phone: '', email: '', password: '', agency_name: '', agency_logo_url: '' });
      setFormOpen(false);
      fetchAdmins();
      setTimeout(() => setGlobalSuccess(null), 3000);
    } catch (err: any) {
      const apiError = err?.response?.data;
      const errorCode = apiError?.error?.code;
      const msg = errorCode === 'user_already_exists' || err?.response?.status === 409 ? 'User already exists' : apiError?.message || 'Failed to create admin';
      setGlobalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, fetchAdmins]);

  const openDeleteConfirm = useCallback((type: 'admin' | 'offer', id: string | null, name?: string) => {
    setConfirmContext({ type, id, name });
    setConfirmOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    setConfirmOpen(false);
    setConfirmContext(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmContext) return;
    setIsDeleting(true);
    try {
      if (confirmContext.type === 'admin' && confirmContext.id) {
        await adminService.deleteAdmin(confirmContext.id);
        await fetchAdmins();
      }
      if (confirmContext.type === 'offer' && confirmContext.id) {
        await offerService.deleteOffer(confirmContext.id);
        setOffers((prev) => prev.filter((o) => (o.id || o._id) !== confirmContext.id));
      }
      setConfirmOpen(false);
      setConfirmContext(null);
    } catch (err) {
      console.error('Delete failed', err);
      setGlobalError('Failed to delete.');
    } finally {
      setIsDeleting(false);
    }
  }, [confirmContext, fetchAdmins]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) => {
      return (
        (a.firstName || '').toLowerCase().includes(q) ||
        (a.lastName || '').toLowerCase().includes(q) ||
        (a.agency_name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q)
      );
    });
  }, [admins, searchQuery]);

  const filteredOffers = useMemo(() => {
    const q = offerSearchQuery.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((o) => {
      return (
        (o.title || o.name || '').toLowerCase().includes(q) ||
        (o.location || o.destination || '').toLowerCase().includes(q) ||
        (o.agency?.name || o.creator?.name || '').toLowerCase().includes(q)
      );
    });
  }, [offers, offerSearchQuery]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredAdmins.length / PAGE_SIZE)), [filteredAdmins.length]);
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pagedAdmins = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAdmins.slice(start, start + PAGE_SIZE);
  }, [filteredAdmins, page]);

  const getInitials = useCallback((admin: Admin) => {
    const name = admin.full_name || admin.name || `${admin.firstName || ''} ${admin.lastName || ''}`;
    const parts = name.split(' ');
    const first = parts[0]?.[0] || '?';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase();
  }, []);

  const getAdminName = useCallback((admin: Admin) => {
    return admin.full_name || admin.name || `${admin.firstName || ''} ${admin.lastName || ''}`;
  }, []);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl bg-gradient-to-br from-white/60 to-white/40 border border-gray-100 shadow-sm gap-4`}>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.admins.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.admins.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('agencies')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'agencies' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Business className="text-lg" /> {t.admins.agencies}
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'offers' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Inventory2 className="text-lg" /> {t.admins.allOffers}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Agencies" value={stats.totalAgencies} />
        <StatCard title="Active Agencies" value={stats.activeAgencies} accent="text-emerald-600" />
        <StatCard title="Inactive Agencies" value={stats.inactiveAgencies} accent="text-rose-600" />
        <StatCard title="Total Offers" value={stats.totalOffers} />
      </div>

      {activeTab === 'agencies' && (
        <div>
          {/* Admins table / mobile cards */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t.admins.agencies}</h3>
                <div className="text-sm text-gray-500">{t.admins.manageAdminsDesc || ''}</div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setFormOpen(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium shadow hover:shadow-md inline-flex items-center gap-2">
                  <PersonAdd className="text-lg" /> {t.admins.createAdmin}
                </motion.button>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search agencies, name, email..." className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
            </div>

            {isLoadingAdmins ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <SkeletonLine className="w-1/3" />
                        <SkeletonLine className="w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-white/80 sticky top-0">
                      <tr className="text-left text-gray-500 text-xs font-medium border-b border-gray-100">
                        <th className="py-3 px-4">{t.common.name}</th>
                        <th className="py-3 px-4">Agency / Organization</th>
                        <th className="py-3 px-4">{t.common.email}</th>
                        <th className="py-3 px-4">{t.common.status}</th>
                        <th className="py-3 px-4 text-right">{t.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedAdmins.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10">
                            <EmptyState title={t.admins.noAdmins || 'No agency admins yet'} subtitle={t.admins.createFirstAdmin || ''} action={<button type="button" onClick={() => setFormOpen(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{t.admins.createAdmin}</button>} />
                          </td>
                        </tr>
                      ) : (
                        pagedAdmins.map((admin) => {
                          const id = admin._id || admin.id || '';
                          const inactive = admin.status === 'deactivated';
                          return (
                            <tr key={id} className={`hover:bg-gray-50 transition-colors ${inactive ? 'bg-rose-50' : ''}`}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${inactive ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {admin.agency_logo_url ? (
                                      <img src={admin.agency_logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
                                    ) : (
                                      getInitials(admin)
                                    )}
                                  </div>
                                  <div>
                                    <div className={`font-medium ${inactive ? 'text-rose-800' : 'text-gray-900'}`}>{getAdminName(admin)}</div>
                                    <div className="text-xs text-gray-500">{admin.phone}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">{getAdminName(admin)}</td>
                              <td className="py-3 px-4">{admin.email}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${inactive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {inactive ? <Cancel className="text-[14px]" /> : <CheckCircle className="text-[14px]" />}
                                  {inactive ? t.common.inactive : t.common.active}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                    <Edit />
                                  </button>
                                  <button onClick={() => openDeleteConfirm('admin', id, getAdminName(admin))} className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                                    <Delete />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filteredAdmins.length === 0 ? (
                    <EmptyState title={t.admins.noAdmins || 'No agency admins yet'} subtitle={t.admins.createFirstAdmin || ''} action={<button type="button" onClick={() => setFormOpen(true)} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{t.admins.createAdmin}</button>} />
                  ) : (
                    filteredAdmins.map((admin) => {
                      const id = admin._id || admin.id || '';
                      const inactive = admin.status === 'deactivated';
                      return (
                        <div key={id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${inactive ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {admin.agency_logo_url ? (
                                  <img src={admin.agency_logo_url} alt="logo" className="w-12 h-12 rounded-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
                                ) : (
                                  getInitials(admin)
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{getAdminName(admin)}</div>
                                <div className="text-sm text-gray-500">{getAdminName(admin)}</div>
                                <div className="text-xs text-gray-500">{admin.email}</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className={`text-xs font-semibold px-3 py-1 rounded-full ${inactive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{inactive ? t.common.inactive : t.common.active}</div>
                              <div className="flex items-center gap-2">
                                <button className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                  <Edit />
                                </button>
                                <button onClick={() => openDeleteConfirm('admin', id, getAdminName(admin))} className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                                  <Delete />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {filteredAdmins.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredAdmins.length)} of {filteredAdmins.length}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50">Previous</button>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded-lg ${page === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>{i + 1}</button>
                      ))}
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{t.admins.allOffers}</h3>
            </div>
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder={t.admins.searchOffers} value={offerSearchQuery} onChange={(e) => setOfferSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>

          {isLoadingOffers ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <SkeletonLine className="w-1/3" />
                      <SkeletonLine className="w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-white/80 sticky top-0">
                  <tr className="text-left text-gray-500 text-xs font-medium border-b border-gray-100">
                    <th className="py-3 px-4">{t.common.name}</th>
                    <th className="py-3 px-4">{t.offers.destination}</th>
                    <th className="py-3 px-4">{t.offers.price}</th>
                    <th className="py-3 px-4">{t.admins.agencies}</th>
                    <th className="py-3 px-4 text-right">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10">
                        <EmptyState title={t.admins.noOffers || 'No offers'} subtitle={t.admins.createFirstOffer || ''} />
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map((offer) => {
                      const id = offer.id || offer._id || '';
                      return (
                        <tr key={id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{offer.name || offer.title || 'Untitled'}</td>
                          <td className="py-3 px-4 text-gray-600">{offer.location || offer.destination || '-'}</td>
                          <td className="py-3 px-4 font-semibold text-blue-600">{offer.total_price ? `${offer.total_price} DZD` : offer.price ? `${offer.price} DZD` : '0 DZD'}</td>
                          <td className="py-3 px-4 text-gray-600">{offer.agency?.name || offer.creator?.name || 'Unknown Agency'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button onClick={() => openDeleteConfirm('offer', id, offer.title || offer.name)} className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                                <Delete />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Admin Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t.admins.createAdmin}</h3>
              </div>
              <button onClick={() => setFormOpen(false)} className="p-2 text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {globalError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{globalError}</div>}
            {globalSuccess && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{globalSuccess}</div>}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">{t.admins.agencyName}</label>
                <div className="relative">
                  <Business className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input name="agency_name" value={formData.agency_name} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-200" required />
                </div>
                {formErrors.agency_name && <div className="text-rose-600 text-xs mt-1">{formErrors.agency_name}</div>}
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">{t.common.email}</label>
                <div className="relative">
                  <Email className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-200" required />
                </div>
                {formErrors.email && <div className="text-rose-600 text-xs mt-1">{formErrors.email}</div>}
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">{t.common.phone}</label>
                <div className="relative">
                  <Badge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-200" required />
                </div>
                {formErrors.phone && <div className="text-rose-600 text-xs mt-1">{formErrors.phone}</div>}
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">{t.login.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleInputChange} className="w-full pl-10 pr-12 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-200" required />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </button>
                </div>
                {formErrors.password && <div className="text-rose-600 text-xs mt-1">{formErrors.password}</div>}
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Agency Logo URL</label>
                <div className="relative">
                  <Business className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input name="agency_logo_url" value={formData.agency_logo_url} onChange={handleInputChange} className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-200" />
                </div>
                {formData.agency_logo_url && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={formData.agency_logo_url} alt="logo preview" className="w-10 h-10 rounded-md object-cover border border-gray-100" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
                    <div className="text-sm text-gray-500">Preview</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setFormOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  {t.common.cancel || 'Cancel'}
                </button>
                <motion.button whileTap={{ scale: 0.995 }} type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium shadow hover:shadow-md disabled:opacity-50 transition-all">
                  {isSubmitting ? t.common.creating : t.admins.createButton}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmModal open={confirmOpen} title={`Confirm delete`} message={`Are you sure you want to delete ${confirmContext?.name || 'this item'}?`} loading={isDeleting} onCancel={handleConfirmCancel} onConfirm={handleConfirm} />
    </div>
  );
}
