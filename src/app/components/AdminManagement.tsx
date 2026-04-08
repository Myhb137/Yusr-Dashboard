import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PersonAdd, Email, Lock, Badge, Delete, Edit, Inventory2, Business, Search, CheckCircle, Cancel } from '@mui/icons-material';
import { adminService } from '../services/adminService';
import { offerService } from '../services/offerService';
import api from '../services/api';

export function AdminManagement() {
  const [activeTab, setActiveTab] = useState<'agencies' | 'offers'>('agencies');
  
  // Agencies State
  const [admins, setAdmins] = useState<any[]>([]);
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
    gender: 'male',
    role: 'admin'
  });

  // Offers State
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [offersSearchQuery, setOffersSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'agencies') {
      fetchAdmins();
    } else {
      fetchOffers();
    }
  }, [activeTab]);

  const fetchAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const data = await adminService.getAllUsers();
      setAdmins(data.users || data || []);
    } catch (err: any) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const fetchOffers = async () => {
    setIsLoadingOffers(true);
    try {
      const data = await offerService.getAllOffers();
      setOffers(Array.isArray(data) ? data : (data?.offers || []));
    } catch (err: any) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/api/v1/auth/signup', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gender: formData.gender,
        role: formData.role
      });
      setSuccess('Admin successfully created!');
      setFormData({ firstName: '', lastName: '', phone: '', email: '', password: '', gender: 'male', role: 'admin' });
      fetchAdmins();
    } catch (err: any) {
      console.error('Failed to create admin:', err);
      let errorMsg = 'Failed to create admin. Check console for details.';
      if (err.response?.data?.error?.code === 'user_already_exists') {
        errorMsg = 'This email is already registered! Please use a different email address.';
      } else if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`).join(' | ');
        } else {
          errorMsg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
        if (err.response.data.error?.message) {
          errorMsg += `: ${err.response.data.error.message}`;
        }
      }
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: any) => {
    try {
      const newStatus = admin.status === 'active' ? 'inactive' : 'active';
      await adminService.updateUserStatus(admin._id || admin.id, newStatus);
      fetchAdmins();
    } catch (err) {
      console.error('Failed to toggle status', err);
      alert('Failed to update status. Please view console for details.');
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

  const filteredOffers = offers.filter((offer) =>
    (offer.title || offer.name || '').toLowerCase().includes(offersSearchQuery.toLowerCase()) ||
    (offer.location || offer.destination || '').toLowerCase().includes(offersSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Platform Management</h2>
          <p className="text-sm text-gray-500 mt-1">Super Admin tools to review agencies and manage offers</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('agencies')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'agencies' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Business className="text-lg" />
            Agencies
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'offers' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Inventory2 className="text-lg" />
            Offers Review
          </button>
        </div>
      </div>

      {activeTab === 'agencies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Admin Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <PersonAdd className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Create Agency Admin</h3>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
            {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl">{success}</div>}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <div className="relative">
                    <Badge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Badge className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Email className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="admin@agency.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="admin">Agency Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Admin'}
              </motion.button>
            </form>
          </div>

          {/* Existing Admins List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Agencies & Admins</h3>
            
            {isLoadingAdmins ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-100 pb-3 text-gray-500 font-medium">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {admins.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      admins.map((admin: any) => (
                        <tr key={admin._id || admin.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {admin.name || `${admin.firstName || ''} ${admin.lastName || ''}`}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{admin.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              admin.role === 'superadmin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {admin.role || 'user'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all ${
                                admin.status !== 'inactive' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                              }`}
                            >
                              {admin.status !== 'inactive' ? <CheckCircle className="text-[14px]" /> : <Cancel className="text-[14px]"/>}
                              {admin.status !== 'inactive' ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors">
                              <Edit className="text-[18px]" />
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
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Global Offers Review</h3>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search offers..."
                value={offersSearchQuery}
                onChange={(e) => setOffersSearchQuery(e.target.value)}
                className="w-full md:w-80 pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          {isLoadingOffers ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 pb-3 text-gray-500 font-medium bg-gray-50/50">
                    <th className="py-3 px-4">Offer Name</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Agency / Creator</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No offers match your search criteria.
                      </td>
                    </tr>
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
