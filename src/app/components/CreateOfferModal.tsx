import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Close,
  CloudUpload,
  Add,
  Delete,
  LocationOn,
  CalendarToday,
  AttachMoney,
  People,
  Flight,
  Hotel,
  Restaurant,
  DirectionsCar,
  LocalActivity,
  Info,
} from '@mui/icons-material';
import { offerService } from '../services/offerService';
import api from '../services/api';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer?: any;
  onSuccess?: () => void;
}

// Must match API enum: standard | custom | special | activity
const offerTypes = [
  { value: 'standard', label: 'Standard' },
  { value: 'custom', label: 'Custom' },
  { value: 'special', label: 'Special' },
  { value: 'activity', label: 'Activity' },
];

const inclusions = [
  { id: 'flights', label: 'Flights', icon: Flight },
  { id: 'hotel', label: 'Hotel', icon: Hotel },
  { id: 'meals', label: 'Meals', icon: Restaurant },
  { id: 'transport', label: 'Transport', icon: DirectionsCar },
  { id: 'activities', label: 'Activities', icon: LocalActivity },
];

export function CreateOfferModal({ isOpen, onClose, offer, onSuccess }: CreateOfferModalProps) {
  const [formData, setFormData] = useState({
    name: offer?.title || offer?.name || '',
    destination: offer?.location || offer?.destination || '',
    type: offer?.type || 'standard',
    price: offer?.total_price?.toString() || offer?.price?.toString().replace(' DZD', '').replace('$', '').replace(',', '') || '',
    duration: offer?.duration?.toString()?.replace(' days', '') || '',
    maxPeople: offer?.places?.toString() || '15',
    description: offer?.description || '',
    highlights: offer?.amenities?.length ? offer.amenities : [''],
    inclusions: ['flights', 'hotel'],
    itinerary: offer?.itinerary?.length
      ? offer.itinerary.map((t: string, i: number) => ({ day: i + 1, title: '', description: t }))
      : [{ day: 1, title: '', description: '' }],
    status: offer?.available === false ? 'draft' : 'active',
  });

  const [images, setImages] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const payload: Record<string, any> = {
        title: formData.name,
        location: formData.destination,
        type: formData.type,          // must be standard|custom|special|activity
        description: formData.description,
        duration: formData.duration ? `${formData.duration} days` : undefined,
        places: parseInt(formData.maxPeople, 10) || undefined,
        available: formData.status === 'active',
        total_price: parseFloat(formData.price) || undefined,
        currency: 'DZD',
        amenities: formData.highlights.filter((h: string) => h.trim() !== ''),
        itinerary: formData.itinerary
          .map((day: any) => day.title ? `Day ${day.day} – ${day.title}: ${day.description}` : day.description)
          .filter(Boolean),
      };
      const imageVal = images.length > 0 ? images[0] : (offer?.image_url || offer?.image || '');
      if (imageVal) payload.image_url = imageVal;

      if (offer) {
        // Update existing
        await offerService.updateOffer((offer.id || offer._id).toString(), payload);
      } else {
        // Create new
        await offerService.createOffer(payload);
      }
      
      // Trigger a refresh of the offers list
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to save offer:', err?.response?.data || err.message);
      const msg = err?.response?.data?.message
        || (Array.isArray(err?.response?.data?.data) ? err.response.data.data.map((d: any) => d.message).join(', ') : null)
        || err?.message
        || 'Failed to save offer. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addHighlight = () => {
    setFormData({ ...formData, highlights: [...formData.highlights, ''] });
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...formData.highlights];
    newHighlights[index] = value;
    setFormData({ ...formData, highlights: newHighlights });
  };

  const removeHighlight = (index: number) => {
    const newHighlights = formData.highlights.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, highlights: newHighlights });
  };

  const addItineraryDay = () => {
    setFormData({
      ...formData,
      itinerary: [
        ...formData.itinerary,
        { day: formData.itinerary.length + 1, title: '', description: '' },
      ],
    });
  };

  const toggleInclusion = (id: string) => {
    const newInclusions = formData.inclusions.includes(id)
      ? formData.inclusions.filter((i) => i !== id)
      : [...formData.inclusions, id];
    setFormData({ ...formData, inclusions: newInclusions });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <h2 className="text-2xl font-bold text-white">
            {offer ? 'Edit Offer' : 'Create New Offer'}
          </h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <Close className="text-white" />
          </motion.button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="text-blue-600" />
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Paris Adventure"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination *
                  </label>
                  <div className="relative">
                    <LocationOn className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="e.g., Paris, France"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    {offerTypes.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (DZD) *
                  </label>
                  <div className="relative">
                    <AttachMoney className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="1200"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (Days) *
                  </label>
                  <div className="relative">
                    <CalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      required
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="7"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max People
                  </label>
                  <div className="relative">
                    <People className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.maxPeople}
                      onChange={(e) => setFormData({ ...formData, maxPeople: e.target.value })}
                      placeholder="15"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your travel offer in detail..."
                rows={4}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL *
              </label>
              <input
                type="url"
                required
                value={images.length > 0 ? images[0] : (offer?.image_url || offer?.image || '')}
                onChange={(e) => setImages([e.target.value])}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {(images.length > 0 ? images[0] : (offer?.image_url || offer?.image || '')) && (
                <div className="mt-3 relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400">
                  <img
                    src={images.length > 0 ? images[0] : (offer?.image_url || offer?.image || '')}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide the broken image icon completely
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.display = 'block';
                    }}
                  />
                  {/* Fallback text that shows if image is hidden */}
                  <div className="absolute inset-0 flex items-center justify-center -z-10">
                    <span className="text-sm font-medium">Invalid or empty image URL</span>
                  </div>
                </div>
              )}
            </div>

            {/* Highlights */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Highlights</label>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addHighlight}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Add className="text-lg" />
                  Add
                </motion.button>
              </div>

              <div className="space-y-2">
                {formData.highlights.map((highlight: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                      placeholder={`Highlight ${index + 1}`}
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    {formData.highlights.length > 1 && (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeHighlight(index)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Delete className="text-xl" />
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What's Included
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {inclusions.map((item) => {
                  const Icon = item.icon;
                  const isSelected = formData.inclusions.includes(item.id);

                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleInclusion(item.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="text-2xl" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Itinerary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Itinerary</label>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addItineraryDay}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Add className="text-lg" />
                  Add Day
                </motion.button>
              </div>

              <div className="space-y-4">
                {formData.itinerary.map((day: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3">Day {day.day}</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={day.title}
                        onChange={(e) => {
                          const newItinerary = [...formData.itinerary];
                          newItinerary[index].title = e.target.value;
                          setFormData({ ...formData, itinerary: newItinerary });
                        }}
                        placeholder="Day title"
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                      <textarea
                        value={day.description}
                        onChange={(e) => {
                          const newItinerary = [...formData.itinerary];
                          newItinerary[index].description = e.target.value;
                          setFormData({ ...formData, itinerary: newItinerary });
                        }}
                        placeholder="Day description"
                        rows={2}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 text-red-600 border-t border-red-100 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all font-medium disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : offer ? (
              'Update Offer'
            ) : (
              'Create Offer'
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}