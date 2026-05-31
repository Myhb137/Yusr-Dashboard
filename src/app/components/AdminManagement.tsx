import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { PersonAdd, Email, Lock, Badge, Delete, Edit, Inventory2, Business, Search, CheckCircle, Cancel } from '@mui/icons-material';
import { adminService } from '../services/adminService';
import { offerService } from '../services/offerService';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { User } from '../types/api';

export function AdminManagement() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'agencies' | 'offers'>('agencies');


  // Agencies State
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    agency_name: '',
    agency_logo_url: '',
  });

  // Offers State
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [offersSearchQuery, setOffersSearchQuery] = useState('');

  const fetchAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    setError(null);
    try {
      const data = await adminService.getAllAdmins();
      console.log('Admins API Response:', data);
      
      const adminsList = data?.admins || data?.data?.admins || data?.users || data?.data?.users || data?.data || data;
      
      if (adminsList && Array.isArray(adminsList)) {
        setAdmins(adminsList);
      } else if (adminsList && typeof adminsList === 'object') {
        // If it's a single object, maybe it's one admin?
        setAdmins([adminsList]);
      } else {
        setAdmins([]);
        if (!data) setError('API returned no data');
      }
    } catch (err: any) {
      console.error('Failed to fetch admins:', err);
      const status = err.response?.status;
      if (status === 403) {
        setError('You do not have permission to view agency admins.');
      } else {
        setError('Failed to fetch agency admins. Please try again later.');
      }
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  const fetchOffers = useCallback(async () => {
    setIsLoadingOffers(true);
    try {
      const data = await offerService.getAllOffers();
      setOffers(Array.isArray(data) ? data : (data?.offers || data?.data?.offers || data?.data || []));
    } catch (err: any) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setIsLoadingOffers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'agencies') {
      fetchAdmins();
    } else {
      fetchOffers();
    }
  }, [activeTab, fetchAdmins, fetchOffers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the dedicated POST /api/v1/admin/admins endpoint as per Swagger
      await adminService.createAdmin({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        agency_name: formData.agency_name || null,
        agency_logo_url: formData.agency_logo_url || null,
      });

      setSuccess(t.admins.adminCreated);
      setFormData({ firstName: '', lastName: '', phone: '', email: '', password: '', agency_name: '', agency_logo_url: '' });
      fetchAdmins();
    } catch (err: any) {
      const apiError = err.response?.data;
      const errorCode = apiError?.error?.code;
      
      const errorMsg =
        errorCode === 'user_already_exists' || err.response?.status === 409
          ? t.admins.userAlreadyExists
          : (Array.isArray(apiError?.data) ? apiError.data.map((d: any) => d.message).join(', ') : null) ||
            apiError?.message ||
            t.admins.failedToCreate;
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: any) => {
    try {
      // Swagger 'delete' is Deactivate. We can use it to toggle if we assume it sets status to inactive.
      await adminService.deleteAdmin(admin._id || admin.id);
      fetchAdmins();
    } catch (err: any) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this agency admin?')) return;
    try {
      await adminService.deleteAdmin(id);
      fetchAdmins();
    } catch (err: any) {
      console.error('Failed to deactivate admin', err);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      await offerService.deleteOffer(id);
      setOffers(offers.filter((offer) => (offer.id || offer._id) !== id));
    } catch (err) {
      console.error('Failed to delete offer', err);
      alert('Failed to delete the offer.');
    }
  };

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) =>
      (offer.title || offer.name || '').toLowerCase().includes(offersSearchQuery.toLowerCase()) ||
      (offer.location || offer.destination || '').toLowerCase().includes(offersSearchQuery.toLowerCase())
    );
  }, [offers, offersSearchQuery]);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold text-gray-900">{t.admins.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.admins.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('agencies')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'agencies' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Business className="text-lg" />
            {t.admins.agencies}
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'offers' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Inventory2 className="text-lg" />
            {t.admins.allOffers}
          </button>
        </div>
      </div>

      {activeTab === 'agencies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Admin Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                <PersonAdd className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t.admins.createAdmin}</h3>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
            {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl">{success}</div>}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.admins.firstName}</label>
                <div className="relative">
                  <Badge className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input type="text" name="firstName" required value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                    placeholder="John" />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.admins.lastName}</label>
                <input type="text" name="lastName" required value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Doe" />
              </div>
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.admins.agencyName}</label>
                <div className="relative">
                  <Business className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input type="text" name="agency_name" value={formData.agency_name} onChange={handleInputChange}
                    className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                    placeholder="Buraq Travel" />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.phone}</label>
                <div className="relative">
                  <Badge className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange}
                    className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                    placeholder="+1234567890" />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.email}</label>
                <div className="relative">
                  <Email className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input type="email" name="email" required value={formData.email} onChange={handleInputChange}
                    className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                    placeholder="admin@agency.com" />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t.login.password}</label>
                <div className="relative">
                  <Lock className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input type="password" name="password" required value={formData.password} onChange={handleInputChange}
                    className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                    placeholder="••••••••" />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Agency Logo URL</label>
                <div className="relative">
                  <Business className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input type="text" name="agency_logo_url" value={formData.agency_logo_url} onChange={handleInputChange}
                    className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                    placeholder="https://..." />
                </div>
              </div>


              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                {isSubmitting ? t.common.creating : t.admins.createButton}
              </motion.button>
            </form>
          </div>

          {/* Existing Admins List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-bold text-gray-900">{t.admins.agencies}</h3>
              {error && !isSubmitting && (
                <div className="p-2 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100 animate-pulse">
                  {error}
                </div>
              )}
            </div>
            {isLoadingAdmins ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full text-sm whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="border-b border-gray-100 pb-3 text-gray-500 font-medium">
                      <th className="py-3 px-4">{t.common.name}</th>
                      <th className="py-3 px-4">{t.admins.agencyName}</th>
                      <th className="py-3 px-4">{t.common.email}</th>
                      <th className="py-3 px-4">{t.common.status}</th>
                      <th className={`py-3 px-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {admins.length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-500">{t.admins.noAdmins}</td></tr>
                    ) : (
                      admins.map((admin: any) => (
                        <tr key={admin._id || admin.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {admin.name || `${admin.firstName || ''} ${admin.lastName || ''}`}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {admin.agency_name || admin.agencyName || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{admin.email}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all ${
                                admin.status !== 'inactive' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                              }`}
                            >
                              {admin.status !== 'inactive' ? <CheckCircle className="text-[14px]" /> : <Cancel className="text-[14px]"/>}
                              {admin.status !== 'inactive' ? t.common.active : t.common.inactive}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors">
                                <Edit className="text-[18px]" />
                              </button>
                              <button 
                                onClick={() => handleDeleteAdmin(admin._id || admin.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Delete className="text-[18px]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className={`flex flex-col md:flex-row items-center justify-between gap-4 mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <h3 className="text-lg font-bold text-gray-900">{t.admins.allOffers}</h3>
            <div className="relative w-full md:w-auto">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-xl ${isRTL ? 'right-3' : 'left-3'}`} />
              <input type="text" placeholder={t.admins.searchOffers}
                value={offersSearchQuery} onChange={(e) => setOffersSearchQuery(e.target.value)}
                className={`w-full md:w-80 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'}`} />
            </div>
          </div>

          {isLoadingOffers ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="border-b border-gray-100 pb-3 text-gray-500 font-medium bg-gray-50/50">
                      <th className="py-3 px-4">{t.common.name}</th>
                      <th className="py-3 px-4">{t.offers.destination}</th>
                      <th className="py-3 px-4">{t.offers.price}</th>
                      <th className="py-3 px-4">{t.admins.agencies}</th>
                      <th className={`py-3 px-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.common.actions}</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOffers.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">{t.admins.noOffers}</td></tr>
                  ) : (
                    filteredOffers.map((offer) => (
                      <tr key={offer.id || offer._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 font-medium text-gray-900">
                          {offer.name || offer.title || 'Untitled'}
                        </td>
                        <td className="py-4 px-4 text-gray-600">{offer.location || offer.destination || '-'}</td>
                        <td className="py-4 px-4 font-semibold text-blue-600">
                          {offer.total_price ? `${offer.total_price} DZD` : (offer.price ? `${offer.price} DZD` : '0 DZD')}
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {offer.agency?.name || offer.creator?.name || 'Unknown Agency'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDeleteOffer(offer.id || offer._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Offer"
                          >
                            <Delete className="text-[18px]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
