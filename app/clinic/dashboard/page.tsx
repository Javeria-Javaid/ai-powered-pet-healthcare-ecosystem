'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClinicDashboard() {
  const router = useRouter();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'vets' | 'profile'>('dashboard');

  // Database states
  const [clinic, setClinic] = useState<any>(null);
  const [vets, setVets] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppts, setFilteredAppts] = useState<any[]>([]);
  
  // Filtering states
  const [apptFilter, setApptFilter] = useState<string>('ALL'); // ALL, TODAY, UPCOMING, COMPLETED, CANCELLED, REQUESTED, CONFIRMED

  // Loading/Error states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', address: '', phone: '' });

  // Load dashboard data
  useEffect(() => {
    async function loadData() {
      try {
        setError('');
        const clinicRes = await fetch('/api/clinic/profile');
        if (!clinicRes.ok) {
          router.push('/');
          return;
        }
        const clinicData = await clinicRes.json();
        setClinic(clinicData.clinic);
        setProfileForm({
          name: clinicData.clinic.name,
          address: clinicData.clinic.address,
          phone: clinicData.clinic.phone || '',
        });

        const vetsRes = await fetch('/api/clinic/vets');
        if (vetsRes.ok) {
          const vetsData = await vetsRes.json();
          setVets(vetsData.vets);
        }

        const apptsRes = await fetch('/api/clinic/appointments');
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setAppointments(apptsData.appointments);
          setFilteredAppts(apptsData.appointments);
        }

      } catch (err) {
        setError('Failed to load clinic dashboard details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Handle appointment status filtering
  async function handleFilterChange(filter: string) {
    setApptFilter(filter);
    setLoading(true);
    try {
      const res = await fetch(`/api/clinic/appointments?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setFilteredAppts(data.appointments);
      }
    } catch (e) {
      setError('Failed to fetch filtered appointments.');
    } finally {
      setLoading(false);
    }
  }

  // Handle clinic profile update
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/clinic/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      setSubmitting(false);

      if (data.success) {
        setClinic(data.clinic);
        setIsEditingProfile(false);
        setSuccessMsg('Clinic profile updated successfully.');
      } else {
        setError(data.error?.message || 'Failed to update profile.');
      }
    } catch (err) {
      setSubmitting(false);
      setError('A connection error occurred.');
    }
  }

  // Logout handler
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e) {
      router.push('/');
    }
  }

  if (loading && !clinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-500">Loading clinic dashboard...</p>
      </div>
    );
  }

  const todayAppts = appointments.filter(appt => {
    const apptDate = new Date(appt.dateTime);
    const today = new Date();
    return apptDate.getDate() === today.getDate() &&
      apptDate.getMonth() === today.getMonth() &&
      apptDate.getFullYear() === today.getFullYear();
  });

  const upcomingAppts = appointments.filter(appt => {
    return new Date(appt.dateTime) > new Date() && ['REQUESTED', 'CONFIRMED'].includes(appt.status);
  });

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
        <div>
          <div className="mb-8">
            <h1 className="text-xl font-bold text-blue-600">PETIVA Clinic</h1>
            <p className="text-xs text-zinc-400 mt-1">Clinic Portal Admin</p>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition ${
                activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition ${
                activeTab === 'appointments' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              📅 Appointments
            </button>
            <button
              onClick={() => setActiveTab('vets')}
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition ${
                activeTab === 'vets' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              🩺 Veterinarians
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              🏥 Clinic Profile
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="w-full text-center border border-zinc-200 px-3 py-2 rounded text-sm font-medium text-red-600 hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950"
        >
          🚪 Log Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{clinic?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                clinic?.isVerified ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
              }`}>
                {clinic?.isVerified ? '✓ Verified' : '⚠ Verification Pending'}
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            {successMsg}
          </div>
        )}

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 font-medium">Associated Veterinarians</p>
                <p className="text-3xl font-bold mt-2">{vets.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 font-medium">Today's Appointments</p>
                <p className="text-3xl font-bold mt-2">{todayAppts.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 font-medium">Upcoming Schedules</p>
                <p className="text-3xl font-bold mt-2">{upcomingAppts.length}</p>
              </div>
            </div>

            {/* Today's Schedule Overview */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-bold mb-4">Today's Appointments Overview</h3>
              {todayAppts.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">No appointments scheduled for today.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {todayAppts.map(appt => (
                    <div key={appt.id} className="flex justify-between items-center border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800">
                      <div>
                        <p className="text-sm font-bold">Pet: {appt.pet.name} ({appt.pet.species})</p>
                        <p className="text-xs text-zinc-500">Vet: Dr. {appt.vet.user.firstName} {appt.vet.user.lastName} • Owner: {appt.owner.firstName} {appt.owner.lastName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          appt.status === 'CONFIRMED' ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div className="flex flex-col gap-6">
            {/* Filter buttons */}
            <div className="flex gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              {['ALL', 'TODAY', 'UPCOMING', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded transition ${
                    apptFilter === f ? 'bg-blue-600 text-white' : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* List of filtered appointments */}
            {filteredAppts.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 italic">No appointments matched the selected filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAppts.map(appt => (
                  <div key={appt.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs text-zinc-400">{new Date(appt.dateTime).toLocaleString()}</span>
                        <h4 className="font-bold text-sm mt-1">Pet: {appt.pet.name} ({appt.pet.species})</h4>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                        appt.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex flex-col gap-1">
                      <p>👤 <strong>Owner:</strong> {appt.owner.firstName} {appt.owner.lastName} ({appt.owner.email})</p>
                      <p>🩺 <strong>Veterinarian:</strong> Dr. {appt.vet.user.firstName} {appt.vet.user.lastName}</p>
                      <p>📋 <strong>Reason:</strong> {appt.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. VETERINARIANS TAB */}
        {activeTab === 'vets' && (
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-bold">Associated Veterinarians</h3>
            {vets.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 italic">No veterinarians are currently associated with this clinic.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vets.map(v => (
                  <div key={v.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-base">Dr. {v.firstName} {v.lastName}</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">{v.email}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        v.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 flex flex-col gap-1">
                      <p>🎓 <strong>Specialization:</strong> {v.specialization || 'General Vet Practitioner'}</p>
                      <p>🪪 <strong>License Number:</strong> {v.licenseNumber}</p>
                      <p>🛡️ <strong>Verification:</strong> {v.isVerified ? '✓ Verified Practitioner' : '⚠ Verification Pending'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-bold">Clinic Profile Information</h3>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    ✏️ Edit Profile
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Clinic Name</label>
                    <input
                      type="text" required
                      value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Address / Location</label>
                    <input
                      type="text" required
                      value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>

                  <div className="flex gap-2 justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="text-xs font-semibold px-3 py-1.5 rounded border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" disabled={submitting}
                      className="text-xs font-semibold px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-4 text-sm">
                  <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400">Clinic Name</p>
                    <p className="font-semibold mt-0.5">{clinic?.name}</p>
                  </div>

                  <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400">Address Location</p>
                    <p className="font-semibold mt-0.5">{clinic?.address}</p>
                  </div>

                  <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400">Phone</p>
                    <p className="font-semibold mt-0.5">{clinic?.phone || 'Not Specified'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">Verification Status</p>
                    <p className="font-semibold mt-0.5 text-green-600 dark:text-green-400">{clinic?.isVerified ? 'Verified Hospital Portal' : 'Unverified'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
