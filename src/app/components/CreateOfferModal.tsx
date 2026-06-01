import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Close,
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
import { useLanguage } from '../context/LanguageContext';
import { canManageOffers } from '../utils/authRole';
import { resolveCurrentUserId } from '../utils/tenantScope';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer?: any;
  onSuccess?: () => void;
}

export function CreateOfferModal({ isOpen, onClose, offer, onSuccess }: CreateOfferModalProps) {
  const { t, isRTL } = useLanguage();
  const m = t.modal;

  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    type: 'standard',
    price: '',
    duration: '',
    maxPeople: '15',
    description: '',
    highlights: [''],
    inclusions: ['flights', 'hotel'] as string[],
    itinerary: [{ day: 1, title: '', description: '' }],
    status: 'active',
  });

  const [images, setImages] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync prop updates when the modal is opened or the target offer changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: offer?.title || offer?.name || '',
        destination: offer?.location || offer?.destination || '',
        type: offer?.type || 'standard',
        price: offer?.total_price?.toString() || offer?.price?.toString()?.replace(' DZD', '')?.replace('$', '')?.replace(',', '') || '',
        duration: offer?.duration?.toString()?.replace(' days', '') || '',
        maxPeople: offer?.places?.toString() || '15',
        description: offer?.description || '',
        highlights: offer?.amenities?.length ? offer.amenities : [''],
        inclusions: ['flights', 'hotel'] as string[],
        itinerary: offer?.itinerary?.length
          ? offer.itinerary.map((it: string, i: number) => {
              const match = String(it).match(/^Day \d+ – (.*?): (.*)$/);
              if (match) {
                return { day: i + 1, title: match[1], description: match[2] };
              }
              return { day: i + 1, title: '', description: it };
            })
          : [{ day: 1, title: '', description: '' }],
        status: offer?.available === false ? 'draft' : 'active',
      });
      setImages(offer?.image_url || offer?.image ? [offer.image_url || offer.image] : []);
      setImageFile(null);
      setError(null);
    }
  }, [offer, isOpen]);

  if (!isOpen) return null;

  const inclusions = [
    { id: 'flights', label: m.inclFlights, icon: Flight },
    { id: 'hotel', label: m.inclHotel, icon: Hotel },
    { id: 'meals', label: m.inclMeals, icon: Restaurant },
    { id: 'transport', label: m.inclTransport, icon: DirectionsCar },
    { id: 'activities', label: m.inclActivities, icon: LocalActivity },
  ];

  const offerTypes = [
    { value: 'standard', label: m.typeStandard },
    { value: 'custom', label: m.typeCustom },
    { value: 'special', label: m.typeSpecial },
    { value: 'activity', label: m.typeActivity },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!canManageOffers()) {
        setError('Only agency admins can create offers.');
        return;
      }

      await resolveCurrentUserId();

      const payload: Record<string, unknown> = {
        title: formData.name,
        location: formData.destination,
        type: formData.type,
        description: formData.description,
        duration: formData.duration ? `${formData.duration} days` : undefined,
        places: parseInt(formData.maxPeople, 10) || undefined,
        available: formData.status === 'active',
        total_price: parseFloat(formData.price) || undefined,
        currency: 'DZD',
        amenities: formData.highlights.filter((h: string) => h.trim() !== ''),
        itinerary: formData.itinerary
          .map((day: any) =>
            day.title ? `Day ${day.day} – ${day.title}: ${day.description}` : day.description
          )
          .filter(Boolean),
      };
      const imageVal = images.length > 0 ? images[0] : (offer?.image_url || offer?.image || '');
      if (imageVal && !imageFile) payload.image_url = imageVal;

      const fileOpts = imageFile ? { imageFile } : undefined;

      if (offer) {
        await offerService.updateOffer((offer.id || offer._id).toString(), payload, fileOpts);
      } else {
        await offerService.createOffer(payload, fileOpts);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.data) ? err.response.data.data.map((d: any) => d.message).join(', ') : null) ||
        err?.message ||
        m.failedToSave;
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = `w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`;
  const labelClass = `block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`;
  const iconInputClass = (side: 'left' | 'right' = 'left') => {
    const base = 'w-full py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
    return isRTL
      ? `${base} pr-11 pl-4 text-right`
      : `${base} pl-11 pr-4 text-left`;
  };
  const iconPosClass = `absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-2xl font-bold text-white">
            {offer ? m.editTitle : m.createTitle}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">

            {/* Basic Information */}
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
              <h3 className={`text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Info className="text-blue-600" />
                {m.basicInfo}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Offer Name */}
                <div>
                  <label className={labelClass}>{m.offerName} *</label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={m.offerNamePlaceholder} className={fieldClass} />
                </div>

                {/* Destination */}
                <div>
                  <label className={labelClass}>{m.destination} *</label>
                  <div className="relative">
                    <LocationOn className={iconPosClass} />
                    <input type="text" required value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder={m.destinationPlaceholder} className={iconInputClass()} />
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className={labelClass}>{m.type} *</label>
                  <select required value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={fieldClass}>
                    {offerTypes.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className={labelClass}>{m.status} *</label>
                  <select value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={fieldClass}>
                    <option value="draft">{m.statusDraft}</option>
                    <option value="active">{m.statusActive}</option>
                    <option value="paused">{m.statusPaused}</option>
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className={labelClass}>{m.price} *</label>
                  <div className="relative">
                    <AttachMoney className={iconPosClass} />
                    <input type="number" required value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="1200" className={iconInputClass()} />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className={labelClass}>{m.duration} *</label>
                  <div className="relative">
                    <CalendarToday className={iconPosClass} />
                    <input type="number" required value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="7" className={iconInputClass()} />
                  </div>
                </div>

                {/* Max People */}
                <div className="md:col-span-2">
                  <label className={labelClass}>{m.maxPeople}</label>
                  <div className="relative">
                    <People className={iconPosClass} />
                    <input type="number" value={formData.maxPeople}
                      onChange={(e) => setFormData({ ...formData, maxPeople: e.target.value })}
                      placeholder="15" className={iconInputClass()} />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>{m.description} *</label>
              <textarea required value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={m.descriptionPlaceholder} rows={4}
                className={`${fieldClass} resize-none`} />
            </div>

            {/* Image — file upload (preferred) or URL */}
            <div>
              <label className={labelClass}>{m.imageUrl} *</label>
              <input
                type="file"
                accept="image/*"
                className={`${fieldClass} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 mb-2`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImages([URL.createObjectURL(file)]);
                  }
                }}
              />
              <p className={`text-xs text-gray-500 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {m.imageUrlOrUpload || 'Or paste an image URL:'}
              </p>
              <input
                type="url"
                required={!imageFile}
                value={images.length > 0 && !imageFile ? images[0] : (offer?.image_url || offer?.image || '')}
                onChange={(e) => {
                  setImageFile(null);
                  setImages([e.target.value]);
                }}
                placeholder="https://example.com/image.jpg"
                className={fieldClass}
              />
              {(images.length > 0 ? images[0] : (offer?.image_url || offer?.image || '')) && (
                <div className="mt-3 relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400">
                  <img
                    src={images.length > 0 ? images[0] : (offer?.image_url || offer?.image || '')}
                    alt="Preview" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center -z-10">
                    <span className="text-sm font-medium">{m.invalidImage}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Highlights */}
            <div>
              <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <label className="block text-sm font-medium text-gray-700">{m.highlights}</label>
                <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({ ...formData, highlights: [...formData.highlights, ''] })}
                  className={`flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Add className="text-lg" />{m.addHighlight}
                </motion.button>
              </div>
              <div className="space-y-2">
                {formData.highlights.map((highlight: string, index: number) => (
                  <div key={index} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <input type="text" value={highlight}
                      onChange={(e) => {
                        const nh = [...formData.highlights]; nh[index] = e.target.value;
                        setFormData({ ...formData, highlights: nh });
                      }}
                      placeholder={`${m.highlightPlaceholder} ${index + 1}`}
                      className={`flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`} />
                    {formData.highlights.length > 1 && (
                      <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setFormData({ ...formData, highlights: formData.highlights.filter((_: any, i: number) => i !== index) })}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                        <Delete className="text-xl" />
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* What's Included */}
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {m.whatsIncluded}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {inclusions.map((item) => {
                  const Icon = item.icon;
                  const isSelected = formData.inclusions.includes(item.id);
                  return (
                    <motion.button key={item.id} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const newInc = isSelected
                          ? formData.inclusions.filter((i) => i !== item.id)
                          : [...formData.inclusions, item.id];
                        setFormData({ ...formData, inclusions: newInc });
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      <Icon className="text-2xl" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Itinerary */}
            <div>
              <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <label className="block text-sm font-medium text-gray-700">{m.itinerary}</label>
                <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setFormData({
                    ...formData,
                    itinerary: [...formData.itinerary, { day: formData.itinerary.length + 1, title: '', description: '' }]
                  })}
                  className={`flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Add className="text-lg" />{m.addDay}
                </motion.button>
              </div>
              <div className="space-y-4">
                {formData.itinerary.map((day: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className={`font-bold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {m.day} {day.day}
                    </h4>
                    <div className="space-y-2">
                      <input type="text" value={day.title}
                        onChange={(e) => {
                          const ni = [...formData.itinerary]; ni[index].title = e.target.value;
                          setFormData({ ...formData, itinerary: ni });
                        }}
                        placeholder={m.dayTitle}
                        className={`w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`} />
                      <textarea value={day.description}
                        onChange={(e) => {
                          const ni = [...formData.itinerary]; ni[index].description = e.target.value;
                          setFormData({ ...formData, itinerary: ni });
                        }}
                        placeholder={m.dayDescription} rows={2}
                        className={`w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${isRTL ? 'text-right' : 'text-left'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className={`px-6 py-3 bg-red-50 text-red-600 border-t border-red-100 text-sm font-medium ${isRTL ? 'text-right' : 'text-center'}`}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onClose} disabled={isSubmitting}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50">
            {m.cancel}
          </motion.button>
          <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleSubmit} disabled={isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center min-w-[160px]">
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : offer ? m.updateButton : m.createButton}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}