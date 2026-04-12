import { useEffect, useState } from 'react';
import CollapsibleSection from '../components/CollapsibleSection';
import MaterialIcon from '../components/MaterialIcon';
import { useAuth } from '../contexts/AuthContext';
import { changePassword, getGoals, Goal, updateGoals } from '../lib/api';

export default function Account() {
  const { userId, email } = useAuth();
  const [goals, setGoals] = useState<Goal | null>(null);
  const [weight, setWeight] = useState(83);
  const [height, setHeight] = useState(169);
  const [targetBmi, setTargetBmi] = useState(24);
  const [bmiInput, setBmiInput] = useState('24');
  const [metricsSaved, setMetricsSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const displayName = email?.split('@')[0] || 'Account';

  useEffect(() => {
    if (!userId) return;
    getGoals(userId).then((stored) => {
      setGoals(stored);
      setWeight(stored.weight || 83);
      setHeight(stored.height || 169);
      const bmi = stored.targetBmi || 24;
      setTargetBmi(bmi);
      setBmiInput(bmi.toString());
    });
  }, [userId]);

  const targetWeight = height ? Math.round(targetBmi * Math.pow(height / 100, 2) * 10) / 10 : null;

  const clearPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      setPasswordSuccess(true);
      clearPasswordForm();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } else {
      setPasswordError(result.error || 'Failed to change password');
    }
  };

  const handleSaveMetrics = async () => {
    if (!userId || !goals) return;
    const saved = await updateGoals(userId, { ...goals, weight, height, targetBmi });
    setGoals(saved);
    setMetricsSaved(true);
    setTimeout(() => setMetricsSaved(false), 2000);
  };


  return (
    <div className="space-y-4">
      <CollapsibleSection title="Account" icon="account_circle" defaultExpanded>
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <MaterialIcon name="account_circle" className="text-[32px] text-gray-600 dark:text-gray-200" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{displayName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{email || 'Unknown account'}</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Your Metrics"
        icon="monitoring"
        headerAction={({ isExpanded }) => isExpanded ? (
          <button
            type="button"
            onClick={handleSaveMetrics}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              metricsSaved
                ? 'bg-green-500 text-white'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              {metricsSaved && <MaterialIcon name="check_circle" className="text-[18px]" />}
              {metricsSaved ? 'Saved!' : 'Save'}
            </span>
          </button>
        ) : null}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Target BMI</label>
              <input
                type="text"
                inputMode="decimal"
                value={bmiInput}
                onChange={(e) => setBmiInput(e.target.value)}
                onBlur={(e) => {
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num) && num >= 15 && num <= 40) {
                    const rounded = Math.round(num * 10) / 10;
                    setTargetBmi(rounded);
                    setBmiInput(rounded.toString());
                  } else {
                    setBmiInput(targetBmi.toString());
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Target Weight</label>
              <div className="px-4 py-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                <span className={`text-xl font-bold ${targetBmi < 18.5 ? 'text-blue-600' : targetBmi <= 25 ? 'text-green-600' : targetBmi < 30 ? 'text-amber-500' : 'text-red-600'}`}>
                  {targetWeight || '—'}
                </span>
                <span className="text-sm text-gray-500 ml-1">kg</span>
              </div>
            </div>
          </div>
          {weight && targetWeight && (
            <div className="mt-3 text-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {weight > targetWeight ? 'To lose: ' : weight < targetWeight ? 'To gain: ' : 'At target!'}
                <span className={`font-semibold ${weight > targetWeight ? 'text-green-600' : weight < targetWeight ? 'text-red-600' : 'text-green-600'}`}>
                  {Math.abs(Math.round((weight - targetWeight) * 10) / 10)} kg
                </span>
              </span>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Password"
        icon="lock"
        onExpandedChange={(isExpanded) => {
          if (!isExpanded) clearPasswordForm();
        }}
        headerAction={({ isExpanded }) => isExpanded ? (
          <button
            type="submit"
            form="password-form"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        ) : null}
      >
        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-center">
            Password changed successfully!
          </div>
        )}

        <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {passwordError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {passwordError}
            </div>
          )}
        </form>
      </CollapsibleSection>
    </div>
  );
}
