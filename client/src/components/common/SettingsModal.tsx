import React, { useState } from 'react';
import {
  X,
  User,
  KeyRound,
  ShieldCheck,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { admin } = useAuth();

  // Profile Edit State
  const [name, setName] = useState<string>(admin?.name || 'Administrator');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);
  const [passSuccess, setPassSuccess] = useState<string>('');
  const [passError, setPassError] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  if (!isOpen) return null;

  // Real-time password strength checks
  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  };

  const passedChecksCount = Object.values(checks).filter(Boolean).length;
  const isStrong = passedChecksCount === 5;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: 'Empty', color: 'bg-slate-200', text: 'text-slate-400', width: '0%' };
    if (passedChecksCount <= 2) return { label: 'Weak (Rejected)', color: 'bg-rose-500', text: 'text-rose-600', width: '30%' };
    if (passedChecksCount <= 4) return { label: 'Medium (Requires More)', color: 'bg-amber-500', text: 'text-amber-600', width: '70%' };
    return { label: 'Very Strong (Accepted)', color: 'bg-emerald-500', text: 'text-emerald-600', width: '100%' };
  };

  const strength = getStrengthLabel();

  // Suggest Strong Password Generator
  const generateStrongPassword = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%^&*()_+';
    const all = uppers + lowers + numbers + specials;

    let generated = '';
    // Ensure at least one from each required category
    generated += uppers[Math.floor(Math.random() * uppers.length)];
    generated += lowers[Math.floor(Math.random() * lowers.length)];
    generated += numbers[Math.floor(Math.random() * numbers.length)];
    generated += specials[Math.floor(Math.random() * specials.length)];

    // Fill remaining up to 14 characters
    for (let i = 4; i < 14; i++) {
      generated += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the characters
    generated = generated.split('').sort(() => 0.5 - Math.random()).join('');

    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPass(true);

    // Copy to clipboard
    navigator.clipboard.writeText(generated).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    });
  };

  // Submit Profile Name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    try {
      setIsUpdatingProfile(true);
      const res = await api.patch('/auth/profile', { name });
      if (res.data.success) {
        setProfileSuccess('Profile name updated successfully.');
        setTimeout(() => setProfileSuccess(''), 3000);
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!isStrong) {
      setPassError('Password is too weak. All 5 security requirements must be satisfied.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    try {
      setIsChangingPass(true);
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (res.data.success) {
        setPassSuccess('Admin password changed successfully! Your account is now secured.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPassSuccess(''), 4000);
      }
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base leading-tight">Admin Profile & Security Settings</h2>
              <p className="text-[11px] text-slate-500">Manage your profile details and master password credentials</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Profile Details */}
          <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/80">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Admin Profile</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="mt-4 space-y-3">
              {profileSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center">
                  <Check className="w-4 h-4 mr-1.5 shrink-0" />
                  {profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                  {profileError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Master Email (Protected)
                  </label>
                  <input
                    type="email"
                    value={admin?.email || 'admin@cashflow.local'}
                    disabled
                    className="w-full px-3 py-2 text-xs bg-slate-100/90 border border-slate-200 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingProfile && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Password Change (Strict Strong Security) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Change Password</h3>
              </div>

              {/* Suggest Strong Password Button */}
              <button
                type="button"
                onClick={generateStrongPassword}
                className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer group"
                title="Automatically generate a cryptographically strong password"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300 animate-pulse" />
                Suggest Strong Password
              </button>
            </div>

            {copiedNotification && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg flex items-center">
                <CheckCheck className="w-4 h-4 mr-1.5 shrink-0 text-blue-600" />
                Strong password generated and copied to your clipboard!
              </div>
            )}

            {passSuccess && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center">
                <Check className="w-4 h-4 mr-1.5 shrink-0" />
                {passSuccess}
              </div>
            )}

            {passError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter existing password"
                    className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    New Strong Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Min 8 chars, Aa, 123, !@#"
                      className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Password Strength:</span>
                    <span className={strength.text}>{strength.label}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>

                  {/* 5 Live Checkmarks */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 text-[11px]">
                    <div className={`flex items-center space-x-1 ${checks.length ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${checks.length ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${checks.upper ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${checks.upper ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${checks.lower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${checks.lower ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${checks.number ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${checks.number ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${checks.special ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${checks.special ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Special symbol (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-400">
                  {!isStrong && newPassword.length > 0 && (
                    <span className="text-rose-500 font-semibold">⚠️ Weak password will not be accepted.</span>
                  )}
                </p>

                <button
                  type="submit"
                  disabled={!isStrong || isChangingPass || newPassword !== confirmPassword}
                  className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isStrong && newPassword === confirmPassword
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isChangingPass && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Update Password Securely
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
