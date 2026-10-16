import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import confetti from 'canvas-confetti';
import { 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { language, showToast } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  // Verification state
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenValid(false);
      setTokenError(
        language === 'ta' 
          ? 'மீட்டமைப்பு டோக்கன் விடுபட்டுள்ளது அல்லது தவறானது.' 
          : 'Password reset token is missing from the URL.'
      );
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await apiService.verifyResetToken(token);
        if (!isMounted) return;
        if (res.valid) {
          setTokenValid(true);
          setMaskedEmail(res.email || '');
        } else {
          setTokenValid(false);
          setTokenError(res.error || 'Password reset link has expired or is invalid.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setTokenValid(false);
        setTokenError(err.message || 'Failed to verify reset token.');
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token, language]);

  // Password strength check
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    if (pwd.length < 6) return { score: 1, label: language === 'ta' ? 'மிகக் குறைவு' : 'Too short', color: 'bg-rose-500' };
    let score = 1;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 2, label: language === 'ta' ? 'மிதமான' : 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: language === 'ta' ? 'நல்லது' : 'Good', color: 'bg-emerald-500' };
    return { score: 4, label: language === 'ta' ? 'மிக வலுவானது' : 'Strong', color: 'bg-emerald-600' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (newPassword.length < 6) {
      setSubmitError(
        language === 'ta' 
          ? 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.' 
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError(
        language === 'ta' 
          ? 'கடவுச்சொற்கள் பொருந்தவில்லை.' 
          : 'Passwords do not match. Please re-enter.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.resetPassword(token, newPassword);
      setIsSuccess(true);
      showToast(
        language === 'ta' 
          ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' 
          : 'Password successfully updated!', 
        'success'
      );

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_) {}
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to reset password. The link may have expired.');
      showToast(err.message || 'Reset failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-elevated text-center">
        
        {/* Brand Header */}
        <Link to="/" className="inline-flex items-center space-x-2 mx-auto">
          <div className="w-10 h-10 rounded-xl bg-brand-800 text-white flex items-center justify-center font-black">
            <Building2 className="w-6 h-6 text-emerald-300" />
          </div>
          <span className="text-2xl font-black text-slate-900">SPP Nestora</span>
        </Link>

        {/* 1. Loading State */}
        {isVerifying && (
          <div className="py-12 space-y-4">
            <Loader2 className="w-10 h-10 text-brand-800 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              {language === 'ta' ? 'மீட்டமைப்பு இணைப்பு சரிபார்க்கப்படுகிறது...' : 'Verifying reset link...'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'ta' ? 'தயவுசெய்து ஒரு கணம் காத்திருக்கவும்' : 'Please wait a moment while we validate your security token.'}
            </p>
          </div>
        )}

        {/* 2. Invalid or Expired Token State */}
        {!isVerifying && !tokenValid && (
          <div className="space-y-5 py-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {language === 'ta' ? 'இணைப்பு காலாவதியானது அல்லது தவறானது' : 'Invalid or Expired Link'}
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {tokenError || (language === 'ta' 
                  ? 'இந்த கடவுச்சொல் மீட்டமைப்பு இணைப்பு ஏற்கனவே பயன்படுத்தப்பட்டுள்ளது அல்லது 1 மணிநேர காலாவதியை எட்டியுள்ளது.' 
                  : 'This password reset link has expired (1-hour limit) or has already been used.')}
              </p>
            </div>

            <div className="pt-2 flex flex-col space-y-3">
              <Link
                to="/forgot-password"
                className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition inline-block"
              >
                {language === 'ta' ? 'புதிய மீட்டமைப்பு இணைப்பை கோருங்கள்' : 'Request New Reset Link'}
              </Link>
              <Link
                to="/login"
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
              >
                {language === 'ta' ? 'உள்நுழைவு பக்கத்திற்கு செல்' : 'Return to Sign In'}
              </Link>
            </div>
          </div>
        )}

        {/* 3. Success State */}
        {!isVerifying && tokenValid && isSuccess && (
          <div className="space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {language === 'ta' ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password Updated!'}
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {language === 'ta'
                  ? 'உங்கள் புதிய கடவுச்சொல் பாதுகாப்பாக புதுப்பிக்கப்பட்டது. இப்போது உங்கள் புதிய கடவுச்சொல்லுடன் உள்நுழையலாம்.'
                  : 'Your account password has been updated. You can now log into your dashboard using your new credentials.'}
              </p>
            </div>

            <div className="pt-3 space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/login?role=admin')}
                className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>{language === 'ta' ? 'நிர்வாகியாக உள்நுழைக (Sign In as Admin)' : 'Sign In to Admin Dashboard'}</span>
              </button>

              <Link
                to="/login"
                className="inline-block text-xs font-semibold text-slate-600 hover:text-slate-900 pt-1"
              >
                {language === 'ta' ? 'பொது உள்நுழைவு பக்கம்' : 'General Sign In Page'}
              </Link>
            </div>
          </div>
        )}

        {/* 4. Active Password Reset Form */}
        {!isVerifying && tokenValid && !isSuccess && (
          <div className="space-y-5 text-left">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
                <KeyRound className="w-3.5 h-3.5" />
                <span>{language === 'ta' ? 'பாதுகாப்பான மீட்டமைப்பு' : 'Secure Account Recovery'}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                {language === 'ta' ? 'புதிய கடவுச்சொல்லை அமைக்கவும்' : 'Set New Password'}
              </h2>
              {maskedEmail && (
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ta' ? 'கணக்கு:' : 'Account:'} <strong className="text-slate-800 font-mono">{maskedEmail}</strong>
                </p>
              )}
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'ta' ? 'புதிய கடவுச்சொல்' : 'New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">
                        {language === 'ta' ? 'வலிமை:' : 'Strength:'}
                      </span>
                      <span className="font-bold text-slate-700">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all duration-300 ${strength.color}`} 
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  {language === 'ta' ? 'குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்' : 'Must be at least 6 characters'}
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {language === 'ta' ? 'கடவுச்சொல்லை உறுதிப்படுத்தவும்' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || newPassword.length < 6}
                className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Updating Password...'}</span>
                  </>
                ) : (
                  <span>{language === 'ta' ? 'கடவுச்சொல்லை புதுப்பிக்கவும்' : 'Update Password & Sign In'}</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-brand-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'ta' ? 'உள்நுழைவுக்கு திரும்பு' : 'Cancel & Return to Login'}</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default ResetPasswordPage;
