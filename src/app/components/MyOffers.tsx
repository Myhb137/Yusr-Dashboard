import { useState } from 'react';
import { motion } from 'motion/react';
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
} from '@mui/icons-material';
import { OfferCard } from './OfferCard';

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

const offers: Offer[] = [
  {
    id: 1,
    name: 'Paris Adventure',
    destination: 'Paris, France',
    image: 'https://images.unsplash.com/photo-1595441857632-71570ef36580?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQYXJpcyUyMEVpZmZlbCUyMFRvd2VyJTIwdHJhdmVsfGVufDF8fHx8MTc3MDk4ODUzOHww&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$1,200',
    duration: '7 days',
    bookings: 145,
    rating: 4.8,
    status: 'active',
    category: 'City Tour',
  },
  {
    id: 2,
    name: 'Dubai Luxury Tour',
    destination: 'Dubai, UAE',
    image: 'https://images.unsplash.com/photo-1768069794857-9306ac167c6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxEdWJhaSUyMHNreWxpbmUlMjBsdXh1cnl8ZW58MXx8fHwxNzcwOTIwNzUwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$2,450',
    duration: '5 days',
    bookings: 132,
    rating: 4.9,
    status: 'active',
    category: 'Luxury',
  },
  {
    id: 3,
    name: 'Tokyo Explorer',
    destination: 'Tokyo, Japan',
    image: 'https://images.unsplash.com/photo-1648871647634-0c99b483cb63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUb2t5byUyMEphcGFuJTIwY2l0eXNjYXBlfGVufDF8fHx8MTc3MDkyMDg5Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$1,700',
    duration: '8 days',
    bookings: 118,
    rating: 4.7,
    status: 'active',
    category: 'Cultural',
  },
  {
    id: 4,
    name: 'London Experience',
    destination: 'London, UK',
    image: 'https://images.unsplash.com/photo-1745016176874-cd3ed3f5bfc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMb25kb24lMjBCaWclMjBCZW58ZW58MXx8fHwxNzcwOTEzNzE1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$1,890',
    duration: '6 days',
    bookings: 98,
    rating: 4.6,
    status: 'paused',
    category: 'City Tour',
  },
  {
    id: 5,
    name: 'Istanbul Discovery',
    destination: 'Istanbul, Turkey',
    image: 'https://images.unsplash.com/photo-1613221357276-8fe60524973d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJc3RhbmJ1bCUyMFR1cmtleSUyMG1vc3F1ZXxlbnwxfHx8fDE3NzA4OTMwNTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$1,550',
    duration: '7 days',
    bookings: 87,
    rating: 4.5,
    status: 'active',
    category: 'Cultural',
  },
  {
    id: 6,
    name: 'Rome Classic',
    destination: 'Rome, Italy',
    image: 'https://images.unsplash.com/photo-1698103182362-51abdc45d008?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxSb21lJTIwQ29sb3NzZXVtJTIwSXRhbHl8ZW58MXx8fHwxNzcwOTkyMTQyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$1,320',
    duration: '5 days',
    bookings: 76,
    rating: 4.4,
    status: 'active',
    category: 'Historical',
  },
  {
    id: 7,
    name: 'Barcelona Getaway',
    destination: 'Barcelona, Spain',
    image: 'https://images.unsplash.com/photo-1630083937332-83b3841e9162?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCYXJjZWxvbmElMjBTcGFpbiUyMGFyY2hpdGVjdHVyZXxlbnwxfHx8fDE3NzA5MTc3Njh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$1,450',
    duration: '6 days',
    bookings: 65,
    rating: 4.7,
    status: 'draft',
    category: 'Beach',
  },
  {
    id: 8,
    name: 'New York Explorer',
    destination: 'New York, USA',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxOZXclMjBZb3JrJTIwQ2l0eSUyMHNreWxpbmV8ZW58MXx8fHwxNzcwOTUxMzY1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$2,100',
    duration: '7 days',
    bookings: 92,
    rating: 4.8,
    status: 'active',
    category: 'City Tour',
  },
  {
    id: 9,
    name: 'Santorini Sunset',
    destination: 'Santorini, Greece',
    image: 'https://images.unsplash.com/photo-1676730056228-7e38cbb88edc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTYW50b3JpbmklMjBHcmVlY2UlMjBzdW5zZXR8ZW58MXx8fHwxNzcwOTEyNDk3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$1,980',
    duration: '5 days',
    bookings: 103,
    rating: 4.9,
    status: 'active',
    category: 'Beach',
  },
  {
    id: 10,
    name: 'Maldives Paradise',
    destination: 'Maldives',
    image: 'https://images.unsplash.com/photo-1698726654862-377c0218dfdc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNYWxkaXZlcyUyMGJlYWNoJTIwcmVzb3J0fGVufDF8fHx8MTc3MDk3NTg0Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$3,200',
    duration: '7 days',
    bookings: 78,
    rating: 5.0,
    status: 'active',
    category: 'Luxury',
  },
  {
    id: 11,
    name: 'Cairo Historical',
    destination: 'Cairo, Egypt',
    image: 'https://images.unsplash.com/photo-1692986172150-ec32dccfa5f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxDYWlybyUyMEVneXB0JTIwcHlyYW1pZHN8ZW58MXx8fHwxNzcxMDAwMjIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$890',
    duration: '4 days',
    bookings: 54,
    rating: 4.3,
    status: 'draft',
    category: 'Historical',
  },
  {
    id: 12,
    name: 'Swiss Alps Adventure',
    destination: 'Swiss Alps, Switzerland',
    image: 'https://images.unsplash.com/photo-1633942515749-f93dddbbcff9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTd2lzcyUyMEFscHMlMjBtb3VudGFpbnN8ZW58MXx8fHwxNzcwOTIwMDExfDA&ixlib=rb-4.1.0&q=80&w=1080',
    price: '$2,650',
    duration: '8 days',
    bookings: 61,
    rating: 4.6,
    status: 'active',
    category: 'Adventure',
  },
];

interface MyOffersProps {
  onCreateOffer: () => void;
}

export function MyOffers({ onCreateOffer }: MyOffersProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'draft' | 'paused'>('all');

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || offer.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: offers.length,
    active: offers.filter((o) => o.status === 'active').length,
    draft: offers.filter((o) => o.status === 'draft').length,
    paused: offers.filter((o) => o.status === 'paused').length,
  };

  return (
    <div>
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
          {/* Search */}
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

          {/* Filters */}
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

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GridView />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ViewList />
            </motion.button>
          </div>

          {/* New Offer Button */}
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
      {filteredOffers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-12 text-center shadow-md"
        >
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Search className="text-gray-400 text-5xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No offers found</h3>
          <p className="text-gray-500 mb-6">
            Try adjusting your search or filters to find what you're looking for
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('all');
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg font-medium"
          >
            Clear Filters
          </motion.button>
        </motion.div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {filteredOffers.map((offer, index) => (
            <OfferCard key={offer.id} offer={offer} index={index} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
}