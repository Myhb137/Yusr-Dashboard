import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Person,
  Notifications,
  Security,
  Email,
  Phone,
  Edit,
  Save,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { authService } from '../services/authService';
import { useEffect } from 'react';

export function Settings() {
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await authService.getCurrentUser();
      const user = data.user || data;
      setProfileData({
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await authService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Update local storage so the TopBar and Sidebar show the new name
      const stored = authService.getStoredUser();
      if (stored) {
        localStorage.setItem('user', JSON.stringify({ ...stored, firstName: profileData.firstName, lastName: profileData.lastName, name: `${profileData.firstName} ${profileData.lastName}` }));
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.response?.data?.detail || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage({ type: 'success', text: 'Password successfully updated!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.response?.data?.detail || 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  // Notification State
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailMarketing: false,
    pushBookings: true,
    pushMessages: true,
    smsBookings: false,
  });

  const sections = [
    { id: 'profile', label: 'Profile', icon: Person },
    { id: 'notifications', label: 'Notifications', icon: Notifications },
    { id: 'security', label: 'Security', icon: Security },
  ];

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your personal information</p>
        </div>
        <motion.button
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveProfile}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            isEditing
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
          }`}
        >
          {isEditing ? (
            <>
              <Save className="text-xl" />
              {loading ? 'Saving...' : 'Save Changes'}
            </>
          ) : (
            <>
              <Edit className="text-xl" />
              Edit Profile
            </>
          )}
        </motion.button>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg uppercase">
          {profileData.firstName.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{profileData.firstName} {profileData.lastName}</h3>
          <p className="text-sm text-gray-500 mb-3">{profileData.email}</p>
          {isEditing && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Change Photo
            </motion.button>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Person className="inline text-lg mr-1" /> First Name
          </label>
          <input
            type="text"
            value={profileData.firstName}
            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Person className="inline text-lg mr-1" /> Last Name
          </label>
          <input
            type="text"
            value={profileData.lastName}
            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Email className="inline text-lg mr-1" /> Email Address
          </label>
          <input
            type="email"
            value={profileData.email}
            disabled={true} // Usually email is uneditable or requires a different process
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Phone className="inline text-lg mr-1" /> Phone Number
          </label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mt-1">Choose how you want to be notified</p>
      </div>

      <div className="space-y-4">
        {/* Email Notifications */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Email className="text-blue-600" />
            Email Notifications
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-700">New Bookings</span>
              <input
                type="checkbox"
                checked={notifications.emailBookings}
                onChange={(e) => setNotifications({ ...notifications, emailBookings: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-700">Marketing & Promotions</span>
              <input
                type="checkbox"
                checked={notifications.emailMarketing}
                onChange={(e) => setNotifications({ ...notifications, emailMarketing: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Notifications className="text-purple-600" />
            Push Notifications
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-700">Booking Updates</span>
              <input
                type="checkbox"
                checked={notifications.pushBookings}
                onChange={(e) => setNotifications({ ...notifications, pushBookings: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-700">Customer Messages</span>
              <input
                type="checkbox"
                checked={notifications.pushMessages}
                onChange={(e) => setNotifications({ ...notifications, pushMessages: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="text-emerald-600" />
            SMS Notifications
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-700">Urgent Bookings</span>
              <input
                type="checkbox"
                checked={notifications.smsBookings}
                onChange={(e) => setNotifications({ ...notifications, smsBookings: e.target.checked })}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Keep your account secure</p>
      </div>

      {/* Change Password */}
      <div className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="text-blue-600" />
          Change Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Enter new password"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <motion.button
            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
            onClick={handleChangePassword}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg font-medium hover:shadow-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </motion.button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Security className="text-emerald-600" />
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
            Not Enabled
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg font-medium hover:shadow-xl transition-all"
        >
          Enable 2FA
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-md sticky top-6">
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <motion.button
                  key={section.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="text-xl" />
                  {section.label}
                </motion.button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="lg:col-span-3">
        {/* Global Alert Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="text-emerald-500" /> : <Cancel className="text-red-500" />}
            <span className="font-medium text-sm">{message.text}</span>
          </div>
        )}

        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-md"
        >
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'notifications' && renderNotificationsSection()}
          {activeSection === 'security' && renderSecuritySection()}
        </motion.div>
      </div>
    </div>
  );
}
