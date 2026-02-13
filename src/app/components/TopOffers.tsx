import { motion } from 'motion/react';
import { Star } from '@mui/icons-material';

interface Offer {
  id: number;
  rank: number;
  name: string;
  bookings: number;
  rating: number;
  revenue: string;
}

const topOffers: Offer[] = [
  { id: 1, rank: 1, name: 'Paris Adventure', bookings: 145, rating: 4.8, revenue: '$174,000' },
  { id: 2, rank: 2, name: 'Dubai Luxury Tour', bookings: 132, rating: 4.9, revenue: '$323,400' },
  { id: 3, rank: 3, name: 'Tokyo Explorer', bookings: 118, rating: 4.7, revenue: '$201,060' },
  { id: 4, rank: 4, name: 'London Experience', bookings: 98, rating: 4.6, revenue: '$185,220' },
  { id: 5, rank: 5, name: 'Istanbul Discovery', bookings: 87, rating: 4.5, revenue: '$134,850' },
];

const rankGradients = [
  'from-yellow-400 to-orange-500',
  'from-gray-400 to-gray-600',
  'from-orange-400 to-orange-700',
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
];

export function TopOffers() {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <h3 className="text-xl font-bold text-gray-900 mb-6">Top Offers</h3>

      {/* Offers List */}
      <div className="space-y-3">
        {topOffers.map((offer, index) => {
          const gradientClass = rankGradients[index];

          return (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.05, type: 'spring' }}
              whileHover={{ backgroundColor: 'rgb(249 250 251)', scale: 1.02 }}
              className="flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer"
            >
              {/* Rank Badge */}
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}
              >
                {offer.rank}
              </div>

              {/* Offer Details */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{offer.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">{offer.bookings} bookings</span>
                  <div className="flex items-center gap-1">
                    <Star className="text-yellow-500 text-sm" />
                    <span className="text-xs text-gray-600 font-medium">{offer.rating}</span>
                  </div>
                </div>
              </div>

              {/* Revenue */}
              <div className="font-bold text-emerald-600">{offer.revenue}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
