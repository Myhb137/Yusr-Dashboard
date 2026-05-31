import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star } from '@mui/icons-material';
import { offerService } from '../services/offerService';
import { useLanguage } from '../context/LanguageContext';
import { resolveAdminTenant } from '../utils/tenantScope';

export function TopOffers() {
  const { t, isRTL } = useLanguage();
  const [topOffers, setTopOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopOffers = async () => {
      try {
        setIsLoading(true);
        const tenant = await resolveAdminTenant();
        const offersArray = (await offerService.getDashboardOffers(tenant)) as any[];

        const sorted = [...offersArray]
          .sort((a: any, b: any) => (b.bookings || b.places || 0) - (a.bookings || a.places || 0))
          .slice(0, 5)
          .map((offer: any, index: number) => ({
            id: offer.id || offer._id,
            rank: index + 1,
            name: offer.title || offer.name || 'Untitled Offer',
            bookings: offer.bookings || offer.places || 0,
            rating: offer.rating || 5.0,
            revenue: offer.total_price !== undefined
              ? `${(offer.total_price * (offer.bookings || offer.places || 0)).toLocaleString()} DZD`
              : '0 DZD',
          }));
        setTopOffers(sorted);
      } catch (err) {
        console.error('Failed to fetch top offers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopOffers();
  }, []);

  const rankGradients = [
    'from-yellow-400 to-orange-500',
    'from-gray-400 to-gray-600',
    'from-orange-400 to-orange-700',
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
      <h3 className={`text-xl font-bold text-gray-900 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.overview.topOffers}
      </h3>
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
          </div>
        ) : topOffers.length === 0 ? (
          <p className={`text-center py-6 text-gray-500 text-sm ${isRTL ? 'text-right' : 'text-center'}`}>
            {t.common.noData}
          </p>
        ) : topOffers.map((offer, index) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.05, type: 'spring' }}
            whileHover={{ backgroundColor: 'rgb(249 250 251)', scale: 1.02 }}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rankGradients[index]} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
              {offer.rank}
            </div>
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-bold text-sm text-gray-900 truncate">{offer.name}</p>
              <div className={`flex items-center gap-3 mt-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <span className="text-xs text-gray-500">{offer.bookings} {t.overview.bookings}</span>
                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Star className="text-yellow-500 text-sm" />
                  <span className="text-xs text-gray-600 font-medium">{offer.rating}</span>
                </div>
              </div>
            </div>
            <div className="font-bold text-emerald-600 shrink-0">{offer.revenue}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
