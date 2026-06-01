import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star } from '@mui/icons-material';
import { offerService } from '../services/offerService';
import { bookingService } from '../services/bookingService';
import { useLanguage } from '../context/LanguageContext';
import { resolveAdminTenant, joinOffersWithBookers } from '../utils/tenantScope';
import { isSuperAdmin } from '../utils/authRole';

export function TopOffers() {
  const { t, isRTL, language } = useLanguage();
  const [topOffers, setTopOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopOffers = async () => {
      try {
        setIsLoading(true);
        const tenant = await resolveAdminTenant();
        
        // Co-fetch offers and bookings in parallel
        const [offersArray, bookingsArray] = await Promise.all([
          isSuperAdmin(tenant.role) ? offerService.getAllOffers() : offerService.getDashboardOffers(tenant),
          bookingService.getDashboardBookings(tenant) as Promise<any[]>,
        ]);

        // Join offers with bookings to get exact numbers
        const joined = joinOffersWithBookers(offersArray, bookingsArray);

        // Sort by booking count descending and slice top 5
        const sorted = joined
          .sort((a, b) => b.bookingCount - a.bookingCount)
          .slice(0, 5)
          .map((row, index) => {
            const offer = row.offer;
            return {
              id: offer.id || offer._id,
              rank: index + 1,
              name: offer.title || offer.name || 'Untitled Offer',
              bookings: row.bookingCount,
              rating: (offer.rating as number) || 5.0,
              revenue: row.totalRevenue,
              image: offer.image_url || offer.image || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1080&auto=format&fit=crop',
            };
          });

        setTopOffers(sorted);
      } catch (err) {
        console.error('Failed to fetch top offers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopOffers();
  }, []);

  const rankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-amber-500/10 text-amber-600 border border-amber-500/30',
          label: language === 'ar' ? 'الأول' : language === 'fr' ? '1er' : '1st',
        };
      case 2:
        return {
          bg: 'bg-slate-300/20 text-slate-600 border border-slate-300/40',
          label: language === 'ar' ? 'الثاني' : language === 'fr' ? '2e' : '2nd',
        };
      case 3:
        return {
          bg: 'bg-amber-700/10 text-amber-800 border border-amber-700/20',
          label: language === 'ar' ? 'الثالث' : language === 'fr' ? '3e' : '3rd',
        };
      default:
        return {
          bg: 'bg-gray-100 text-gray-500 border border-gray-200',
          label: language === 'ar' ? `${rank}` : `${rank}th`,
        };
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg h-full flex flex-col">
      <h3 className={`text-xl font-bold text-gray-900 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.overview.topOffers}
      </h3>
      <div className="space-y-3.5 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : topOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm font-medium">{t.common.noData}</p>
          </div>
        ) : (
          topOffers.map((offer, index) => {
            const rankInfo = rankStyles(offer.rank);
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
                whileHover={{ scale: 1.015, backgroundColor: 'rgba(249, 250, 251, 0.95)' }}
                className={`flex items-center gap-3.5 p-3 rounded-2xl border border-gray-100/60 hover:border-blue-200/60 bg-white/40 transition-all ${
                  isRTL ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Rank Badge */}
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0 shadow-sm ${rankInfo.bg}`}>
                  <span>{rankInfo.label}</span>
                </div>
                {/* Offer Info */}
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <h4 className="font-bold text-sm text-gray-900 truncate hover:text-blue-600 transition-colors">
                    {offer.name}
                  </h4>
                  <div className={`flex items-center gap-2.5 mt-1 text-[11px] text-gray-500 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <span className="font-medium">
                      {offer.bookings} {offer.bookings === 1 ? t.overview.bookings.slice(0, -1) || 'booking' : t.overview.bookings || 'bookings'}
                    </span>
                    <span className="text-gray-300 font-light">|</span>
                    <div className={`flex items-center gap-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Star className="text-yellow-500 !text-xs shrink-0" />
                      <span className="font-semibold text-gray-700">{offer.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Revenue */}
                <div className={`shrink-0 ${isRTL ? 'text-left' : 'text-right'}`}>
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold tracking-wider">
                    {t.analytics.revenue || 'Revenue'}
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm text-emerald-600">
                    {offer.revenue.toLocaleString()} DZD
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
