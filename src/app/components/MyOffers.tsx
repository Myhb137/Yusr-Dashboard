import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GridView,
  ViewList,
  Search,
  FilterList,
  Add,
  TrendingUp,
  CheckCircle,
  Pause,
  Drafts,
  DeleteOutline,
  WarningAmberRounded,
} from '@mui/icons-material';
import { OfferCard } from './OfferCard';
import { offerService } from '../services/offerService';
import { resolveAdminTenant } from '../utils/tenantScope';

interface Offer {
  id: number;
  name: string;
  destination: string;
  image: string;
  price: string;
  duration: string;
  bookings: number;
  rating: number;
  status: 'active' | 'draft' | 'paused';
  category: string;
}

interface MyOffersProps {
  onCreateOffer: () => void;
  onEditOffer: (offer: Offer) => void;
  refreshTrigger: number;
}

export function MyOffers({ onCreateOffer, onEditOffer, refreshTrigger }: MyOffersProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft' | 'paused'>('all');

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; offer: Offer | null; isDeleting: boolean }>({
    open: false,
    offer: null,
    isDeleting: false,
  });

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setIsLoading(true);
        
        const tenant = await resolveAdminTenant();
        const offersArray = (await offerService.getDashboardOffers(tenant)) as any[];

        const mappedOffers = offersArray.map((offer: any) => ({
          ...offer,
          id: offer.id || offer._id,
          name: offer.title || offer.name || 'Untitled Offer',
          destination: offer.location || offer.destination || 'Unknown Location',
          image: offer.image_url || offer.image || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1080&auto=format&fit=crop',
          price: offer.total_price !== undefined ? `${offer.total_price} DZD` : (typeof offer.price === 'number' ? `${offer.price} DZD` : (offer.price ? String(offer.price).replace('$', '') + ' DZD' : '0 DZD')),
          duration: typeof offer.duration === 'number' ? `${offer.duration} days` : offer.duration || '0 days',
          bookings: offer.places || offer.bookings || 0,
          rating: offer.rating || 0,
          status: offer.available === true ? 'active' : (offer.available === false ? 'paused' : (offer.status || 'draft')),
          category: offer.type || offer.category || 'Standard',
        }));
        setOffers(mappedOffers);
      } catch (err: any) {
        console.error('Failed to fetch offers:', err);
        setError(err.response?.data?.message || 'Failed to load offers. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOffers();
  }, [refreshTrigger]);

  const handleDeleteClick = useCallback((offer: Offer) => {
    setDeleteModal({ open: true, offer, isDeleting: false });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal.offer) return;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await offerService.deleteOffer(deleteModal.offer.id.toString());
      setOffers(prev => prev.filter(o => o.id !== deleteModal.offer!.id));
      setDeleteModal({ open: false, offer: null, isDeleting: false });
    } catch (err: any) {
      console.error('Failed to delete offer:', err);
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
      setError(err.response?.data?.message || 'Failed to delete the offer.');
    }
  }, [deleteModal.offer]);

  const handleDeleteCancel = useCallback(() => {
    if (!deleteModal.isDeleting) setDeleteModal({ open: false, offer: null, isDeleting: false });
  }, [deleteModal.isDeleting]);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesSearch =
        offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.destination.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || offer.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [offers, searchQuery, selectedStatus]);

  const stats = useMemo(() => {
    return {
      total: offers.length,
      active: offers.filter((o) => o.status === 'active').length,
      draft: offers.filter((o) => o.status === 'draft').length,
      paused: offers.filter((o) => o.status === 'paused').length,
    };
  }, [offers]);

  return (
    <div>
      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteModal.open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDeleteCancel}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Dialog */}
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 pointer-events-auto">
                {/* Icon */}
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <WarningAmberRounded className="text-red-500" style={{ fontSize: 36 }} />
                  </div>
                </div>

                {/* Text */}
                <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Offer</h2>
                <p className="text-gray-500 text-center mb-1">
                  Are you sure you want to delete
                </p>
                <p className="text-center font-semibold text-gray-900 mb-6 truncate px-4">
                  "{deleteModal.offer?.name}"?
                </p>
                <p className="text-sm text-red-500 text-center mb-8 bg-red-50 rounded-xl py-2 px-4">
                  This action <strong>cannot be undone</strong>. All data for this offer will be permanently removed.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteCancel}
                    disabled={deleteModal.isDeleting}
                    className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteConfirm}
                    disabled={deleteModal.isDeleting}
                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {deleteModal.isDeleting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <DeleteOutline className="text-xl" />
                        Delete
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Offers</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <CheckCircle className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
              <Drafts className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
              <p className="text-sm text-gray-500">Drafts</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -2 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Pause className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.paused}</p>
              <p className="text-sm text-gray-500">Paused</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search offers by name or destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              title="More Filters"
            >
              <FilterList className="text-gray-600" />
            </motion.button>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <GridView />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ViewList />
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateOffer}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all font-medium whitespace-nowrap"
          >
            <Add className="text-xl" />
            <span>Create Offer</span>
          </motion.button>
        </div>
      </div>

      {/* Offers Grid/List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 bg-red-50 rounded-2xl border border-red-100">
          <p className="font-medium text-lg">{error}</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-12 text-center shadow-md"
        >
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Search className="text-gray-400 text-5xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No offers found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your search or filters to find what you're looking for</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSearchQuery(''); setSelectedStatus('all'); }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg font-medium"
          >
            Clear Filters
          </motion.button>
        </motion.div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredOffers.map((offer, index) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              index={index}
              viewMode={viewMode}
              onEdit={() => onEditOffer(offer)}
              onDelete={() => handleDeleteClick(offer)}
            />
          ))}
        </div>
      )}
    </div>

  );
}