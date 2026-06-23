import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { customTripService } from '../services/customTripService';
import { CustomTrip } from '../types/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  FlightTakeoff, 
  Search, 
  CheckCircle, 
  Cancel, 
  PendingActions 
} from '@mui/icons-material';

export function CustomTrips() {
  const { t, isRTL } = useLanguage();
  const [trips, setTrips] = useState<CustomTrip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Super admin fetches all custom trips.
      const data = await customTripService.getAllCustomTrips();
      setTrips(data || []);
    } catch (err) {
      console.error('Failed to fetch custom trips', err);
      setError('Failed to load custom trips.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await customTripService.updateStatus(id, status);
      // Optimistically update the list
      setTrips((prev) => prev.map(trip => trip.id === id ? { ...trip, status } : trip));
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const filteredTrips = trips.filter(trip => {
    const q = searchQuery.toLowerCase();
    return (
      (trip.destination || '').toLowerCase().includes(q) ||
      (trip.user?.full_name || trip.user?.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl bg-gradient-to-br from-white/60 to-white/40 border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{(t.sidebar as any)?.customTrips || 'Custom Trips'}</h2>
          <p className="text-sm text-gray-500 mt-1">Manage custom trip requests from users</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-gray-900">All Requests</h3>
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              placeholder="Search destination, user..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-200" 
            />
          </div>
        </div>

        {error && <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-xl">{error}</div>}

        {isLoading ? (
          <div className="flex justify-center p-10"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-white/80 sticky top-0">
                <tr className="text-left text-gray-500 text-xs font-medium border-b border-gray-100">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Budget / Travelers</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-500">
                      No custom trips found.
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{trip.user?.full_name || trip.user?.firstName || 'Unknown User'}</div>
                        <div className="text-xs text-gray-500">{trip.user?.email}</div>
                      </td>
                      <td className="py-3 px-4 font-medium">{trip.destination}</td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {new Date(trip.departure_date).toLocaleDateString()} - <br/>
                        {new Date(trip.return_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-blue-600">{trip.budget} DZD</div>
                        <div className="text-xs text-gray-500">{trip.travelers} Travelers</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                          ${trip.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                            trip.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                            trip.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 
                            'bg-gray-100 text-gray-700'}`}>
                          {trip.status === 'pending' && <PendingActions className="text-[14px]" />}
                          {trip.status === 'approved' && <CheckCircle className="text-[14px]" />}
                          {trip.status === 'rejected' && <Cancel className="text-[14px]" />}
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {trip.status === 'pending' && (
                          <div className="inline-flex gap-2">
                            <button 
                              onClick={() => handleUpdateStatus(trip.id, 'approved')}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors text-xs font-medium"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(trip.id, 'rejected')}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors text-xs font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
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
  );
}
