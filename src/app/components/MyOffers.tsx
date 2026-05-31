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
  People,
  ExpandMore,
  ExpandLess,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AttachMoney,
  PersonOutline,
} from '@mui/icons-material';
import { OfferCard } from './OfferCard';
import { offerService } from '../services/offerService';
import { bookingService } from '../services/bookingService';
import { resolveAdminTenant } from '../utils/tenantScope';
import {
  joinOffersWithBookers,
  type OfferWithBookers,
  type BookerInfo,
} from '../utils/tenantScope';

// ─── Local offer shape ────────────────────────────────────────

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

// ─── Status badge colours ─────────────────────────────────────

function bookingStatusClass(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'validated':
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'pending':
    case 'ready_for_agency':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function paymentStatusClass(status: string | null): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'under_review':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'failed':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'refunded':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}



// ─── Main component ───────────────────────────────────────────

export function MyOffers({ onCreateOffer, onEditOffer, refreshTrigger }: MyOffersProps) {
  const [offerRows, setOfferRows] = useState<OfferWithBookers[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft' | 'paused'>('all');



  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; offer: Offer | null; isDeleting: boolean }>({
    open: false,
    offer: null,
    isDeleting: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const tenant = await resolveAdminTenant();

        // Co-fetch offers and bookings in parallel — no sequential waterfall
        const [offersArray, bookingsArray] = await Promise.all([
          offerService.getDashboardOffers(tenant),
          bookingService.getDashboardBookings(tenant) as Promise<any[]>,
        ]);

        // Join offers with their bookers (pure client-side, no extra network calls)
        const joined = joinOffersWithBookers(offersArray, bookingsArray);
        setOfferRows(joined);

        // Map offer shape for OfferCard
        const mappedOffers = offersArray.map((offer: any) => {
          const offerId = String(offer.id || offer._id);
          const joinedRow = joined.find((r) => String(r.offer.id ?? r.offer._id) === offerId);
          const actualBookingCount = joinedRow ? joinedRow.bookingCount : 0;
          return {
            ...offer,
            id: offer.id || offer._id,
            name: offer.title || offer.name || 'Untitled Offer',
            destination: offer.location || offer.destination || 'Unknown Location',
            image:
              offer.image_url ||
              offer.image ||
              'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1080&auto=format&fit=crop',
            price:
              offer.total_price !== undefined
                ? `${offer.total_price} DZD`
                : typeof offer.price === 'number'
                ? `${offer.price} DZD`
                : offer.price
                ? String(offer.price).replace('$', '') + ' DZD'
                : '0 DZD',
            duration:
              typeof offer.duration === 'number' ? `${offer.duration} days` : offer.duration || '0 days',
            bookings: actualBookingCount,
            rating: offer.rating || 0,
            status:
              offer.available === true
                ? 'active'
                : offer.available === false
                ? 'paused'
                : offer.status || 'draft',
            category: offer.type || offer.category || 'Standard',
          };
        });
        setOffers(mappedOffers);
      } catch (err: any) {
        console.error('Failed to fetch offers:', err);
        setError(err.response?.data?.message || 'Failed to load offers. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const handleDeleteClick = useCallback((offer: Offer) => {
    setDeleteModal({ open: true, offer, isDeleting: false });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal.offer) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      await offerService.deleteOffer(deleteModal.offer.id.toString());
      setOffers((prev) => prev.filter((o) => o.id !== deleteModal.offer!.id));
      setOfferRows((prev) => prev.filter((r) => String(r.offer.id ?? r.offer._id) !== deleteModal.offer!.id.toString()));
      setDeleteModal({ open: false, offer: null, isDeleting: false });
    } catch (err: any) {
      console.error('Failed to delete offer:', err);
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
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
    const totalBookings = offerRows.reduce((s, r) => s + r.bookingCount, 0);
    const totalRevenue = offerRows.reduce((s, r) => s + r.totalRevenue, 0);
    const uniqueCustomers = new Set(
      offerRows.flatMap((r) => r.bookers.map((b) => b.userId).filter(Boolean))
    ).size;
    return {
      total: offers.length,
      active: offers.filter((o) => o.status === 'active').length,
      draft: offers.filter((o) => o.status === 'draft').length,
      paused: offers.filter((o) => o.status === 'paused').length,
      totalBookings,
      totalRevenue,
      uniqueCustomers,
    };
  }, [offers, offerRows]);

  return (
    <div>
      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteModal.open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDeleteCancel}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 pointer-events-auto">
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <WarningAmberRounded className="text-red-500" style={{ fontSize: 36 }} />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Offer</h2>
                <p className="text-gray-500 text-center mb-1">Are you sure you want to delete</p>
                <p className="text-center font-semibold text-gray-900 mb-6 truncate px-4">
                  "{deleteModal.offer?.name}"?
                </p>
                <p className="text-sm text-red-500 text-center mb-8 bg-red-50 rounded-xl py-2 px-4">
                  This action <strong>cannot be undone</strong>. All data for this offer will be permanently removed.
                </p>
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
                    className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          {
            label: 'Total Offers',
            value: stats.total,
            icon: <TrendingUp className="text-white text-xl" />,
            gradient: 'from-blue-600 to-indigo-600',
            delay: 0,
          },
          {
            label: 'Active',
            value: stats.active,
            icon: <CheckCircle className="text-white text-xl" />,
            gradient: 'from-emerald-500 to-teal-600',
            delay: 0.05,
          },
          {
            label: 'Draft',
            value: stats.draft,
            icon: <Drafts className="text-white text-xl" />,
            gradient: 'from-gray-500 to-gray-700',
            delay: 0.1,
          },
          {
            label: 'Paused',
            value: stats.paused,
            icon: <Pause className="text-white text-xl" />,
            gradient: 'from-amber-400 to-orange-500',
            delay: 0.15,
          },
          {
            label: 'Bookings',
            value: stats.totalBookings,
            icon: <People className="text-white text-xl" />,
            gradient: 'from-purple-500 to-pink-600',
            delay: 0.2,
          },
          {
            label: 'Revenue',
            value: stats.totalRevenue > 0 ? `${(stats.totalRevenue / 1000).toFixed(1)}k` : '0',
            icon: <AttachMoney className="text-white text-xl" />,
            gradient: 'from-rose-500 to-red-600',
            delay: 0.25,
          },
        ].map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: card.delay }}
            whileHover={{ y: -2 }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{card.value}</p>
                <p className="text-xs text-gray-500 truncate">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ── */}
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

      {/* ── Offers Grid / List ── */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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
          <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
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