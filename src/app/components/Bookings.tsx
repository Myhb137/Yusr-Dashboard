import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  FilterList,
  FileDownload,
  Visibility,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  AttachMoney,
  CalendarToday,
  Person,
  LocationOn,
} from '@mui/icons-material';

interface Booking {
  id: number;
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  offerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  amount: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'refunded';
}

const bookings: Booking[] = [
  {
    id: 1,
    bookingRef: 'YT-2024-001',
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    offerName: 'Paris Adventure',
    destination: 'Paris, France',
    startDate: '2024-03-15',
    endDate: '2024-03-22',
    travelers: 2,
    amount: '$2,400',
    status: 'confirmed',
    paymentStatus: 'paid',
  },
  {
    id: 2,
    bookingRef: 'YT-2024-002',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.j@email.com',
    offerName: 'Dubai Luxury Tour',
    destination: 'Dubai, UAE',
    startDate: '2024-03-20',
    endDate: '2024-03-25',
    travelers: 4,
    amount: '$9,800',
    status: 'confirmed',
    paymentStatus: 'paid',
  },
  {
    id: 3,
    bookingRef: 'YT-2024-003',
    customerName: 'Michael Chen',
    customerEmail: 'mchen@email.com',
    offerName: 'Tokyo Explorer',
    destination: 'Tokyo, Japan',
    startDate: '2024-04-01',
    endDate: '2024-04-09',
    travelers: 2,
    amount: '$3,400',
    status: 'pending',
    paymentStatus: 'pending',
  },
  {
    id: 4,
    bookingRef: 'YT-2024-004',
    customerName: 'Emma Williams',
    customerEmail: 'emma.w@email.com',
    offerName: 'Santorini Sunset',
    destination: 'Santorini, Greece',
    startDate: '2024-04-10',
    endDate: '2024-04-15',
    travelers: 2,
    amount: '$3,960',
    status: 'confirmed',
    paymentStatus: 'paid',
  },
  {
    id: 5,
    bookingRef: 'YT-2024-005',
    customerName: 'David Brown',
    customerEmail: 'dbrown@email.com',
    offerName: 'London Experience',
    destination: 'London, UK',
    startDate: '2024-03-25',
    endDate: '2024-03-31',
    travelers: 3,
    amount: '$5,670',
    status: 'cancelled',
    paymentStatus: 'refunded',
  },
  {
    id: 6,
    bookingRef: 'YT-2024-006',
    customerName: 'Lisa Anderson',
    customerEmail: 'lisa.a@email.com',
    offerName: 'Maldives Paradise',
    destination: 'Maldives',
    startDate: '2024-05-01',
    endDate: '2024-05-08',
    travelers: 2,
    amount: '$6,400',
    status: 'confirmed',
    paymentStatus: 'paid',
  },
  {
    id: 7,
    bookingRef: 'YT-2024-007',
    customerName: 'James Wilson',
    customerEmail: 'jwilson@email.com',
    offerName: 'Swiss Alps Adventure',
    destination: 'Swiss Alps, Switzerland',
    startDate: '2024-04-15',
    endDate: '2024-04-23',
    travelers: 4,
    amount: '$10,600',
    status: 'pending',
    paymentStatus: 'pending',
  },
  {
    id: 8,
    bookingRef: 'YT-2024-008',
    customerName: 'Sophia Martinez',
    customerEmail: 'sophia.m@email.com',
    offerName: 'Istanbul Discovery',
    destination: 'Istanbul, Turkey',
    startDate: '2024-03-28',
    endDate: '2024-04-04',
    travelers: 2,
    amount: '$3,100',
    status: 'confirmed',
    paymentStatus: 'paid',
  },
];

export function Bookings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.offerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'refunded':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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
              <CalendarToday className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Bookings</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
              <p className="text-sm text-gray-500">Confirmed</p>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <HourglassEmpty className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <Cancel className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
              <p className="text-sm text-gray-500">Cancelled</p>
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
              placeholder="Search by booking ref, customer, or offer..."
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
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              title="More Filters"
            >
              <FilterList className="text-gray-600" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all font-medium whitespace-nowrap"
            >
              <FileDownload className="text-xl" />
              <span className="hidden sm:inline">Export</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Booking Ref</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Offer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Dates</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Travelers</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Payment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking, index) => (
                <motion.tr
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-blue-600">{booking.bookingRef}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold">
                        {booking.customerName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{booking.customerName}</p>
                        <p className="text-sm text-gray-500">{booking.customerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{booking.offerName}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <LocationOn className="text-xs" />
                      {booking.destination}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{booking.startDate}</p>
                    <p className="text-sm text-gray-500">{booking.endDate}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Person className="text-sm" />
                      <span className="font-medium">{booking.travelers}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-gray-900">{booking.amount}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                      {booking.status === 'confirmed' && <CheckCircle className="text-xs" />}
                      {booking.status === 'pending' && <HourglassEmpty className="text-xs" />}
                      {booking.status === 'cancelled' && <Cancel className="text-xs" />}
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      title="View Details"
                    >
                      <Visibility className="text-lg" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
