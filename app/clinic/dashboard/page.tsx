'use client';
import { PawPrint, Home, Calendar, Users, Building2, Settings, LogOut, Hand, Clock, Dog, X, Stethoscope } from 'lucide-react';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClinicDashboard() {
  const router = useRouter();

  // Database states
  const [clinic, setClinic] = useState<any>(null);
  const [vets, setVets] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppts, setFilteredAppts] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Filtering states
  const [apptFilter, setApptFilter] = useState<string>('ALL'); // ALL, TODAY, UPCOMING, COMPLETED, CANCELLED, REQUESTED, CONFIRMED

  // Selected appointment details modal
  const [selectedAppt, setSelectedAppt] = useState<any>(null);

  // Navigation tab state
  const [activeNav, setActiveNav] = useState<'dashboard' | 'appointments' | 'vets' | 'profile'>('dashboard');

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
        // Get admin profile first
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setAdminProfile(meData.user);
        }

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
        setError(data.error.message || 'Failed to update clinic profile.');
      }
    } catch (err) {
      setSubmitting(false);
      setError('Connection error updating profile.');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      router.push('/');
    }
  }

  if (loading && !clinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 ">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600"></div>
          <p className="text-zinc-500 font-medium">Loading Clinic Portal...</p>
        </div>
      </div>
    );
  }

  // Helper calculations
  const today = new Date().toDateString();
  const todayAppts = appointments.filter(a => new Date(a.dateTime).toDateString() === today && a.status !== 'CANCELLED');
  const upcomingApptsCount = appointments.filter(a => new Date(a.dateTime) > new Date() && a.status !== 'CANCELLED').length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-zinc-900  ">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-60 border-r border-zinc-150 bg-white p-5   flex flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Logo Header */}
          <div className="flex flex-col gap-0.5 px-1 leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-2xl"><PawPrint className="inline w-4 h-4" /></span>
              <span className="text-base font-black tracking-tight text-zinc-900 ">PETIVA</span>
            </div>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-8">Clinic Admin</span>
          </div>

          {/* Links list */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => { setActiveNav('dashboard'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Home className="inline w-4 h-4" /></span> Dashboard
            </button>
            <button
              onClick={() => { setActiveNav('appointments'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'appointments'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Calendar className="inline w-4 h-4" /></span> Appointments
            </button>
            <button
              onClick={() => { setActiveNav('vets'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'vets'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Users className="inline w-4 h-4" /></span> Veterinarians
            </button>
            <button
              onClick={() => { setActiveNav('profile'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'profile'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Building2 className="inline w-4 h-4" /></span> Clinic Profile
            </button>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 ">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-zinc-200  flex items-center justify-center text-sm font-bold">
                {adminProfile?.firstName?.[0] || 'C'}
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-zinc-900 ">{adminProfile?.firstName} {adminProfile?.lastName}</p>
                <p className="text-[10px] text-zinc-400 font-medium">Clinic Manager</p>
              </div>
            </div>
            <button onClick={() => { setActiveNav('profile'); }} className="text-zinc-400 hover:text-zinc-600"><Settings className="inline w-4 h-4" /></button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full border border-zinc-200 hover:bg-zinc-50  :bg-zinc-850 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition text-zinc-700 "
          >
            <LogOut className="inline w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600   ">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-600   ">
            {successMsg}
          </div>
        )}

        {/* 2.1 DASHBOARD VIEW */}
        {activeNav === 'dashboard' && (
          <div className="flex flex-col gap-8">
            {/* Welcome banner */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-zinc-950  leading-tight">Good morning, {adminProfile?.firstName || 'Manager'}! <Hand className="inline w-4 h-4" /></h2>
                <p className="text-xs text-zinc-400 mt-0.5">Manage your clinic operations and veterinarian associations.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold">
                  {adminProfile?.firstName?.[0]}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-lg /30"><Calendar className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-2xl font-black">{todayAppts.length.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Today's Appointments</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-lg /30"><Clock className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-2xl font-black">{upcomingApptsCount.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Upcoming Appointments</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-lg /30"><Stethoscope className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-2xl font-black">{vets.length.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Veterinarians</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 text-lg /30"><Building2 className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-xs font-bold text-zinc-800  truncate max-w-[130px]">{clinic?.name}</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Clinic Location</p>
                </div>
              </div>
            </div>

            {/* Split layout: clinic appointments table & vets listing */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Today's Appointments table (Left 2/3) */}
              <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm  ">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-zinc-900 ">Today's Scheduled Visits</h3>
                  <button onClick={() => { setActiveNav('appointments'); }} className="text-xs text-blue-600 font-semibold hover:underline">View all schedule →</button>
                </div>

                {todayAppts.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-8 text-center">No appointments scheduled for today.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100 text-zinc-400  font-semibold">
                          <th className="pb-3">Time</th>
                          <th className="pb-3">Pet</th>
                          <th className="pb-3">Veterinarian</th>
                          <th className="pb-3">Reason</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 ">
                        {todayAppts.map(appt => (
                          <tr key={appt.id} className="text-zinc-700 ">
                            <td className="py-3 font-semibold text-zinc-900 ">
                              {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 font-bold text-blue-600 flex items-center gap-1.5">
                              <span><Dog className="inline w-4 h-4" /></span> {appt.pet?.name}
                            </td>
                            <td className="py-3 font-medium">Dr. {appt.vet?.user?.firstName} {appt.vet?.user?.lastName}</td>
                            <td className="py-3 text-zinc-500">{appt.reason}</td>
                            <td className="py-3">
                              <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
                                appt.status === 'CONFIRMED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setSelectedAppt(appt)}
                                className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-white text-[10px] font-bold"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Clinic Vets list (Right 1/3) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm   flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-zinc-900 ">Associated Vets</h3>
                    <button onClick={() => { setActiveNav('vets'); }} className="text-xs text-blue-600 font-semibold hover:underline">View all vets →</button>
                  </div>

                  {vets.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-6">No veterinarians associated with this clinic.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {vets.slice(0, 5).map(vet => (
                        <div
                          key={vet.id}
                          className="flex items-center justify-between p-2 rounded-xl border border-zinc-100 bg-[#fbfcfd]/40  text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-purple-600"><Stethoscope className="inline w-4 h-4" /></span>
                            <div>
                              <h4 className="font-bold text-zinc-900 ">Dr. {vet.firstName} {vet.lastName}</h4>
                              <p className="text-[9px] text-zinc-400">{vet.specialization || 'General practice'}</p>
                            </div>
                          </div>
                          <span className="text-[9px] text-green-600 font-bold">● {vet.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setActiveNav('vets'); }}
                  className="w-full mt-4 rounded-xl border border-zinc-150 py-2 text-center text-xs font-bold hover:bg-zinc-50"
                >
                  <Users className="inline w-4 h-4" /> View all veterinarians
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 2.2 APPOINTMENTS VIEW */}
        {activeNav === 'appointments' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Clinic Appointments</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Filter:</span>
                <select
                  value={apptFilter}
                  onChange={e => handleFilterChange(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs "
                >
                  <option value="ALL">All Appointments</option>
                  <option value="TODAY">Today's Visits</option>
                  <option value="UPCOMING">Upcoming Schedule</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAppts.map(appt => (
                <div key={appt.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm   flex justify-between items-start">
                  <div>
                    <span className="text-xs text-zinc-400">{new Date(appt.dateTime).toLocaleString()}</span>
                    <h4 className="font-bold text-sm mt-1">Pet Patient: {appt.pet?.name}</h4>
                    <p className="text-xs text-zinc-500">Owner: {appt.pet?.owner?.firstName} {appt.pet?.owner?.lastName}</p>
                    <p className="text-xs text-zinc-500">Vet: Dr. {appt.vet?.user?.firstName} {appt.vet?.user?.lastName}</p>
                    <p className="text-xs text-zinc-400 mt-2 italic">Reason: {appt.reason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      appt.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {appt.status}
                    </span>
                    <button
                      onClick={() => setSelectedAppt(appt)}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.3 ASSOCIATED VETS INDEX */}
        {activeNav === 'vets' && (
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold">Clinic Veterinarians Index</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vets.map(v => (
                <div key={v.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm   flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm">Dr. {v.firstName} {v.lastName}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{v.specialization || 'General Vet Practice'}</p>
                    <p className="text-xs text-zinc-500 mt-1">Contact: {v.phone || v.email}</p>
                  </div>
                  <span className="text-xs font-bold text-green-600">● {v.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.4 CLINIC PROFILE VIEW & EDIT */}
        {activeNav === 'profile' && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm max-w-xl  ">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Clinic Profile</h3>
              <button
                onClick={() => {
                  setIsEditingProfile(!isEditingProfile);
                  setError('');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Clinic Name</label>
                  <input
                    type="text" required
                    value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Address Location</label>
                  <input
                    type="text" required
                    value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Clinic Contact Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <button
                  type="submit" disabled={submitting}
                  className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition w-full disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Clinic Profile'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-sm">
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">Clinic Name</p>
                  <p className="font-semibold mt-0.5">{clinic?.name}</p>
                </div>
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">Clinic Address</p>
                  <p className="font-semibold mt-0.5">{clinic?.address}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Clinic Contact Phone</p>
                  <p className="font-semibold mt-0.5">{clinic?.phone || 'Not Specified'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. APPOINTMENT DETAILS DIALOG OVERLAY */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl   flex flex-col gap-4 text-zinc-900 ">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold">Appointment Details</h3>
              <button onClick={() => setSelectedAppt(null)} className="text-zinc-400 hover:text-zinc-600 font-bold"><X className="inline w-4 h-4" /></button>
            </div>

            <div className="flex flex-col gap-3 text-xs leading-relaxed">
              <div className="border-b border-zinc-100 pb-2 ">
                <span className="text-zinc-400 block">Date & Time</span>
                <span className="font-bold text-sm text-blue-600">{new Date(selectedAppt.dateTime).toLocaleString()}</span>
              </div>
              <div className="border-b border-zinc-100 pb-2 ">
                <span className="text-zinc-400 block">Pet Patient</span>
                <span className="font-bold text-sm"><Dog className="inline w-4 h-4" /> {selectedAppt.pet?.name} ({selectedAppt.pet?.breed || selectedAppt.pet?.species})</span>
              </div>
              <div className="border-b border-zinc-100 pb-2 ">
                <span className="text-zinc-400 block">Pet Owner</span>
                <span className="font-bold text-sm">{selectedAppt.pet?.owner?.firstName} {selectedAppt.pet?.owner?.lastName} ({selectedAppt.pet?.owner?.email})</span>
              </div>
              <div className="border-b border-zinc-100 pb-2 ">
                <span className="text-zinc-400 block">Assigned Veterinarian</span>
                <span className="font-bold text-sm">Dr. {selectedAppt.vet?.user?.firstName} {selectedAppt.vet?.user?.lastName}</span>
              </div>
              <div>
                <span className="text-zinc-400 block">Reason for Visit</span>
                <span className="font-medium">{selectedAppt.reason}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedAppt(null)}
              className="mt-3 w-full rounded-full bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
