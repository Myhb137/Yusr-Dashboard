import { motion } from 'motion/react';
import {
  Edit,
  Delete,
  MoreVert,
  Star,
  LocationOn,
  CalendarToday,
  People,
  Business,
} from '@mui/icons-material';
import { useState } from 'react';
import { isSuperAdmin, getCurrentRole } from '../utils/authRole';

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
  agencyEmail?: string;
  agencyName?: string;
}

interface OfferCardProps {
  offer: Offer;
  index: number;
  viewMode: 'grid' | 'list';
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  active: {
    label: 'Active',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  draft: {
    label: 'Draft',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    dotClass: 'bg-gray-500',
  },
  paused: {
    label: 'Paused',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
};

export function OfferCard({ offer, index, viewMode, onEdit, onDelete }: OfferCardProps) {
  const [showActions, setShowActions] = useState(false);
  const status = statusConfig[offer.status];
  const role = getCurrentRole();
  const superAdmin = isSuperAdmin(role);

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ backgroundColor: 'rgb(249 250 251)' }}
        className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer"
      >
        <div className="flex items-center gap-4">
          {/* Image */}
          <img
            src={offer.image}
            alt={offer.name}
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
          />

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 truncate">{offer.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <LocationOn className="text-gray-400 text-sm" />
                  <span className="text-sm text-gray-600">{offer.destination}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.bgClass} ${status.textClass} flex-shrink-0`}
              >
                <div className={`w-2 h-2 rounded-full ${status.dotClass}`}></div>
                <span>{status.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CalendarToday className="text-base" />
                <span>{offer.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <People className="text-base" />
                <span>{offer.bookings} bookings</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="text-yellow-500 text-base" />
                <span className="font-medium">{offer.rating}</span>
              </div>
              {superAdmin && (offer.agencyName || offer.agencyEmail) && (
                <div className="flex items-center gap-1 max-w-[150px] truncate" title={offer.agencyName || offer.agencyEmail}>
                  <Business className="text-base" />
                  <span className="truncate">{offer.agencyName || offer.agencyEmail}</span>
                </div>
              )}
              <div className="font-bold text-blue-600 ml-auto">{offer.price}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-colors"
              title="Edit"
            >
              <Edit className="text-xl" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors"
              title="Delete"
            >
              <Delete className="text-xl" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
              title="More"
            >
              <MoreVert className="text-xl" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring' }}
      whileHover={{ y: -4 }}
      className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img src={offer.image} alt={offer.name} className="w-full h-full object-cover" />

        {/* Status Badge */}
        <div
          className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${status.bgClass} ${status.textClass} backdrop-blur-sm`}
        >
          <div className={`w-2 h-2 rounded-full ${status.dotClass}`}></div>
          <span>{status.label}</span>
        </div>

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-colors"
            title="Edit"
          >
            <Edit className="text-indigo-600" />
          </motion.button>
         
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-colors"
            title="Delete"
          >
            <Delete className="text-red-600" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h4 className="font-bold text-gray-900 mb-2 text-lg truncate">{offer.name}</h4>

        <div className="flex items-center gap-2 text-gray-600 mb-3">
          <LocationOn className="text-lg" />
          <span className="text-sm truncate">{offer.destination}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <CalendarToday className="text-base" />
              <span>{offer.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="text-yellow-500 text-base" />
              <span className="font-medium">{offer.rating}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
          <div>
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-xl font-bold text-blue-600">{offer.price}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Bookings</p>
            <p className="font-bold text-gray-900">{offer.bookings}</p>
          </div>
        </div>
        {superAdmin && (offer.agencyName || offer.agencyEmail) && (
          <div className="mt-3 pt-3 border-t border-gray-200/50 flex items-center gap-2 text-xs text-gray-500 truncate" title={offer.agencyName || offer.agencyEmail}>
            <Business className="text-base shrink-0" />
            <span className="truncate">{offer.agencyName || offer.agencyEmail}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
