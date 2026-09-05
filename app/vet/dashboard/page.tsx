'use client';
import VetChatInterface from '../../components/VetChatInterface';
import { PawPrint, Home, Calendar, Users, Clipboard, Building2, User, Settings, LogOut, Hand, Clock, Dog, X, MessageCircle } from 'lucide-react';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VetDashboard() {
  const router = useRouter();

  // Vet states loaded from server APIs
  const [vetProfile, setVetProfile] = useState<any>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  
  // Selected Patient Details & History
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [history, setHistory] = useState<any>({
    medicalRecords: [],
    vaccinations: [],
    medications: [],
    allergies: [],
    conditions: [],
    metrics: [],
  });

  // UI Nav Tab state
  const [activeNav, setActiveNav] = useState<'dashboard' | 'appointments' | 'patients' | 'records' | 'clinic' | 'profile' | 'messages'>('dashboard');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  // UI Editing & Input states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', specialization: '' });
  
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ symptoms: '', diagnosis: '', treatmentPlan: '', notes: '' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load vet profile, clinics, patients, and appointments
  useEffect(() => {
    async function loadData() {
      try {
        const profRes = await fetch('/api/vet/profile');
        if (!profRes.ok) {
          router.push('/');
          return;
        }
        const profData = await profRes.json();
        setVetProfile(profData.vet);
        setProfileForm({
          firstName: profData.vet.firstName,
          lastName: profData.vet.lastName,
          phone: profData.vet.phone || '',
          specialization: profData.vet.specialization || '',
        });

        const clinicsRes = await fetch('/api/clinics');
        if (clinicsRes.ok) {
          const clinicsData = await clinicsRes.json();
          setClinics(clinicsData.clinics);
        }

        const patientsRes = await fetch('/api/vet/patients');
        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData.patients);
        }

        const apptsRes = await fetch('/api/appointments');
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setAppointments(apptsData.appointments);
        }
      } catch (err) {
        setError('Failed to load veterinarian dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Load patient details & history
  async function handleSelectPatient(patient: any) {
    setSelectedPatient(patient);
    setIsAddingRecord(false);
    setHistory({
      medicalRecords: [],
      vaccinations: [],
      medications: [],
      allergies: [],
      conditions: [],
      metrics: [],
    });

    try {
      const res = await fetch(`/api/vet/patients/${patient.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to load patient history:', err);
    }
  }

  // Update profile
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/vet/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success) {
        setVetProfile(data.vet);
        setIsEditingProfile(false);
        setSuccessMsg('Profile updated successfully.');
      } else {
        setError(data.error.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Connection error updating profile.');
    }
  }

  // Add Medical Record Log
  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    setError('');
    try {
      const res = await fetch(`/api/vet/patients/${selectedPatient.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordForm),
      });
      const data = await res.json();
      if (data.success) {
        setHistory({
          ...history,
          medicalRecords: [data.record, ...history.medicalRecords],
        });
        setIsAddingRecord(false);
        setRecordForm({ symptoms: '', diagnosis: '', treatmentPlan: '', notes: '' });
        setSuccessMsg('Medical record entry created successfully.');
      } else {
        setError(data.error.message || 'Failed to create record entry.');
      }
    } catch (err) {
      setError('Connection error posting record.');
    }
  }

  // Appointment Actions
  
  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (e) {}
  }

  useEffect(() => {
    if (activeNav === 'messages') {
      loadConversations();
      setSelectedConversation(null);
    }
  }, [activeNav]);

  async function handleUpdateApptStatus(apptId: string, status: 'CONFIRMED' | 'CANCELLED') {
    setError('');
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        const apptsRes = await fetch('/api/appointments');
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setAppointments(apptsData.appointments);
        }
        const patientsRes = await fetch('/api/vet/patients');
        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData.patients);
        }
      } else {
        setError(data.error.message || 'Failed to update appointment status.');
      }
    } catch (err) {
      setError('Failed to process appointment action.');
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 ">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600"></div>
          <p className="text-zinc-500 font-medium">Loading Veterinarian Portal...</p>
        </div>
      </div>
    );
  }

  // Helpers
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
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-8">Veterinarian</span>
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
              onClick={() => { setActiveNav('messages'); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'messages'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span><MessageCircle className="inline w-4 h-4" /></span> Messages
              </div>
              {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
                 <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}</span>
              )}
            </button>

            <button
              onClick={() => { setActiveNav('patients'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'patients'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Users className="inline w-4 h-4" /></span> Patients
            </button>
            <button
              onClick={() => { setActiveNav('records'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'records'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Clipboard className="inline w-4 h-4" /></span> Health Records
            </button>
            <button
              onClick={() => { setActiveNav('clinic'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'clinic'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Building2 className="inline w-4 h-4" /></span> Clinic
            </button>
            <button
              onClick={() => { setActiveNav('profile'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeNav === 'profile'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><User className="inline w-4 h-4" /></span> Profile
            </button>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 ">
            <div className="flex items-center gap-2.5">
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=100"
                alt="Vet profile avatar"
                className="h-9 w-9 rounded-full object-cover border border-zinc-200"
              />
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-zinc-900 ">Dr. {vetProfile?.firstName} {vetProfile?.lastName}</p>
                <p className="text-[10px] text-zinc-400 font-medium">Veterinarian</p>
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
            {/* Welcome message header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-zinc-950  leading-tight">Good morning, Dr. {vetProfile?.firstName}! <Hand className="inline w-4 h-4" /></h2>
                <p className="text-xs text-zinc-400 mt-0.5">Here's your practice overview for today.</p>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=100"
                  alt="Dr Jane Doe profile avatar circular header"
                  className="h-8 w-8 rounded-full object-cover border border-zinc-200"
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl font-bold /30"><Calendar className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-2xl font-black">{todayAppts.length.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Today's Appointments</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-xl font-bold /30"><Clock className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-2xl font-black">{upcomingApptsCount.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Upcoming (Next 7 days)</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-xl font-bold /30"><Users className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-2xl font-black">{patients.length.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Patients Under Care</p>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-150 bg-white p-5 flex items-center gap-4 shadow-sm  ">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 text-xl font-bold /30"><Clipboard className="inline w-4 h-4" /></div>
                <div>
                  <p className="text-2xl font-black">
                    {appointments.filter(a => a.status === 'REQUESTED').length.toString().padStart(2, '0')}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">Pending Actions</p>
                </div>
              </div>
            </div>

            {/* Split row: Today's Appointments & Patients List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Today's Appointments List (Left column 2/3) */}
              <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm  ">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-zinc-900 ">Today's Appointments</h3>
                  <button onClick={() => { setActiveNav('appointments'); }} className="text-xs text-blue-600 font-semibold hover:underline">View all appointments →</button>
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
                          <th className="pb-3">Owner</th>
                          <th className="pb-3">Reason</th>
                          <th className="pb-3">Clinic</th>
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
                            <td className="py-3 font-bold text-blue-600 flex items-center gap-2">
                              <span><Dog className="inline w-4 h-4" /></span> {appt.pet?.name}
                            </td>
                            <td className="py-3 font-medium">{appt.pet?.owner?.firstName} {appt.pet?.owner?.lastName}</td>
                            <td className="py-3 text-zinc-500">{appt.reason}</td>
                            <td className="py-3 font-medium text-zinc-600">{appt.clinic?.name}</td>
                            <td className="py-3">
                              <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
                                appt.status === 'CONFIRMED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleSelectPatient(appt.pet)}
                                className="rounded bg-blue-550 hover:bg-blue-600 px-3 py-1 text-white text-[10px] font-bold"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* My Patients sidebar card (Right column 1/3) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm   flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-zinc-900 ">My Patients</h3>
                    <button onClick={() => { setActiveNav('patients'); }} className="text-xs text-blue-600 font-semibold hover:underline">View all patients →</button>
                  </div>

                  {patients.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-6">No patients added.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {patients.slice(0, 5).map(patient => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-100 bg-[#fbfcfd]/40 hover:bg-zinc-50 text-left transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg"><Dog className="inline w-4 h-4" /></span>
                            <div>
                              <h4 className="font-bold text-xs text-zinc-900 ">{patient.name}</h4>
                              <p className="text-[9px] text-zinc-400">{patient.breed || patient.species}</p>
                            </div>
                          </div>
                          <span className="text-[9px] text-zinc-400">View &gt;</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setActiveNav('patients'); }}
                  className="w-full mt-4 rounded-xl border border-zinc-150 py-2 text-center text-xs font-bold hover:bg-zinc-50"
                >
                  <Users className="inline w-4 h-4" /> View all patients
                </button>
              </div>

            </div>

            {/* Quick Actions Row */}
            <div>
              <h3 className="text-base font-bold text-zinc-900  mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => { setActiveNav('appointments'); }}
                  className="rounded-2xl border border-zinc-150 bg-white p-4.5 text-left hover:bg-zinc-50 shadow-sm transition flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-lg"><Calendar className="inline w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900">New Appointment</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Schedule a clinic visit</p>
                  </div>
                </button>
                <button
                  onClick={() => { setActiveNav('patients'); }}
                  className="rounded-2xl border border-zinc-150 bg-white p-4.5 text-left hover:bg-zinc-50 shadow-sm transition flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-lg"><PawPrint className="inline w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900">Add New Patient</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Register a pet patient</p>
                  </div>
                </button>
                <button
                  onClick={() => { setActiveNav('records'); }}
                  className="rounded-2xl border border-zinc-150 bg-white p-4.5 text-left hover:bg-zinc-50 shadow-sm transition flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-lg"><Clipboard className="inline w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900">Health Records</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">View medical histories</p>
                  </div>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* 2.2 APPOINTMENTS VIEW */}
        {activeNav === 'appointments' && (
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold">Appointments Schedule</h3>
            <div className="grid grid-cols-1 gap-4">
              {appointments.map(appt => (
                <div key={appt.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm   flex justify-between items-center">
                  <div>
                    <span className="text-xs text-zinc-400">{new Date(appt.dateTime).toLocaleString()}</span>
                    <h4 className="font-bold text-sm mt-1">Pet Patient: {appt.pet?.name}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Owner: {appt.owner?.firstName} {appt.owner?.lastName}</p>
                    <p className="text-xs text-zinc-400 mt-1">Reason: {appt.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    {appt.status !== 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateApptStatus(appt.id, 'CONFIRMED')}
                        className="rounded bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
                      >
                        Confirm
                      </button>
                    )}
                    {appt.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleUpdateApptStatus(appt.id, 'CANCELLED')}
                        className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.3 PATIENTS TAB LISTING */}
        {activeNav === 'patients' && (
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold">My Patients Index</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map(p => (
                <div key={p.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm   flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm">{p.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{p.species} • {p.breed}</p>
                    <p className="text-xs text-zinc-500 mt-1">Owner: {p.owner.firstName} {p.owner.lastName}</p>
                  </div>
                  <button
                    onClick={() => handleSelectPatient(p)}
                    className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs text-white font-bold"
                  >
                    View Chart
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.4 HEALTH RECORDS LISTING */}
        {activeNav === 'records' && (
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold">EHR Health Records Files</h3>
            <p className="text-xs text-zinc-500">Please choose a pet patient from your patients index to inspect and append clinical records.</p>
          </div>
        )}

        {/* 2.5 CLINIC CONTEXT VIEW */}
        {activeNav === 'clinic' && (
          <div className="flex flex-col gap-6">
            <h3 className="text-xl font-bold">Clinic Associations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clinics.map(c => (
                <div key={c.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm  ">
                  <h4 className="font-bold text-sm text-blue-600">{c.name}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{c.address}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.6 PROFILE SETTINGS VIEW */}
        {activeNav === 'profile' && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm max-w-xl  ">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Vet Profile Settings</h3>
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
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">First Name</label>
                  <input
                    type="text" required
                    value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Last Name</label>
                  <input
                    type="text" required
                    value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Specialization</label>
                  <input
                    type="text"
                    value={profileForm.specialization} onChange={e => setProfileForm({ ...profileForm, specialization: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition w-full"
                >
                  Save Profile Changes
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-sm">
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">Full Name</p>
                  <p className="font-semibold mt-0.5">Dr. {vetProfile?.firstName} {vetProfile?.lastName}</p>
                </div>
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">License Number</p>
                  <p className="font-semibold mt-0.5">{vetProfile?.licenseNumber}</p>
                </div>
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">Specialization</p>
                  <p className="font-semibold mt-0.5">{vetProfile?.specialization || 'General Practice'}</p>
                </div>
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">Contact Phone</p>
                  <p className="font-semibold mt-0.5">{vetProfile?.phone || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Verification Status</p>
                  <span className="text-xs font-bold text-green-600 mt-1 inline-block">● Verified</span>
                </div>
              </div>
            )}
          </div>
        )}
      
        {/* MESSAGES VIEW */}
        {activeNav === 'messages' && vetProfile && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {selectedConversation ? (
              <VetChatInterface 
                conversationId={selectedConversation.id}
                conversationContext={selectedConversation}
                currentUserId={vetProfile?.userId}
                onBack={() => { setSelectedConversation(null); loadConversations(); }}
              />
            ) : (
              <>
                <h3 className="text-xl font-bold">Messages</h3>
                <div className="grid grid-cols-1 gap-4">
                  {conversations.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <p className="text-sm text-zinc-500">You have no messages yet.</p>
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <div 
                        key={conv.id} 
                        onClick={() => setSelectedConversation(conv)}
                        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="flex gap-4 items-center">
                          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                             {conv.pet?.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <h4 className="font-bold text-sm text-zinc-900">{conv.pet?.name} <span className="text-zinc-400 font-normal">({conv.owner?.firstName} {conv.owner?.lastName})</span></h4>
                               {conv.unreadCount > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{conv.unreadCount}</span>
                               )}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1 max-w-sm">
                              {conv.latestMessage ? (
                                <>
                                  <span className="font-semibold">{conv.latestMessage.senderId === vetProfile?.userId ? 'You: ' : ''}</span>
                                  {conv.latestMessage.content}
                                </>
                              ) : (
                                'No messages yet'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                             {new Date(conv.appointment?.dateTime).toLocaleDateString()}
                          </span>
                          {conv.latestMessage && (
                            <span className="text-[10px] text-zinc-400 mt-1">
                               {new Date(conv.latestMessage.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </main>

      {/* 3. PATIENT HISTORY DIALOG OVERLAY */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl   flex flex-col gap-4 max-h-[85vh] overflow-y-auto text-zinc-900 ">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h3 className="text-lg font-bold">Patient Chart: {selectedPatient.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Owner: {selectedPatient.owner?.firstName} {selectedPatient.owner?.lastName} ({selectedPatient.owner?.email})</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-zinc-400 hover:text-zinc-600 font-bold"><X className="inline w-4 h-4" /></button>
            </div>

            {/* Patient Attributes */}
            <div className="grid grid-cols-4 gap-4 p-3 bg-zinc-50 rounded-xl /50">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Species</p>
                <p className="text-xs font-bold mt-0.5">{selectedPatient.species}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Breed</p>
                <p className="text-xs font-bold mt-0.5">{selectedPatient.breed || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Gender</p>
                <p className="text-xs font-bold mt-0.5">{selectedPatient.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-semibold">Weight</p>
                <p className="text-xs font-bold mt-0.5">{selectedPatient.weight ? `${selectedPatient.weight} kg` : 'N/A'}</p>
              </div>
            </div>

            {/* Medical Logs timeline */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-xs text-zinc-800 ">Clinical Diagnosis Records</h4>
                <button
                  onClick={() => setIsAddingRecord(!isAddingRecord)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {isAddingRecord ? 'Cancel' : '+ Add Record Entry'}
                </button>
              </div>

              {isAddingRecord && (
                <form onSubmit={handleAddRecord} className="rounded-xl border border-zinc-150 p-4 bg-zinc-50/50 /30 flex flex-col gap-3 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Symptoms</label>
                    <input
                      type="text" required placeholder="Limping on hind left leg"
                      value={recordForm.symptoms} onChange={e => setRecordForm({ ...recordForm, symptoms: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-xs "
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Diagnosis</label>
                    <input
                      type="text" required placeholder="Minor strain"
                      value={recordForm.diagnosis} onChange={e => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-xs "
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Treatment Plan</label>
                    <input
                      type="text" required placeholder="Rest for 5 days"
                      value={recordForm.treatmentPlan} onChange={e => setRecordForm({ ...recordForm, treatmentPlan: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-xs "
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Notes</label>
                    <textarea
                      placeholder="Optional notes..."
                      value={recordForm.notes} onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-xs "
                    />
                  </div>
                  <button type="submit" className="rounded bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                    Save Record Entry
                  </button>
                </form>
              )}

              {history.medicalRecords.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-3">No medical logs found for this patient.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {history.medicalRecords.map((rec: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-zinc-150 p-3 bg-zinc-50/20 text-xs">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-zinc-800 ">Symptom: {rec.symptoms}</span>
                        <span className="text-[10px] text-zinc-400">{new Date(rec.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p><strong>Diagnosis:</strong> {rec.diagnosis}</p>
                      <p className="mt-1"><strong>Plan:</strong> {rec.treatmentPlan}</p>
                      {rec.notes && <p className="mt-1 italic text-zinc-400">Notes: {rec.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Info Grid (Allergies & Vaccinations) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <h4 className="font-bold text-xs text-zinc-800  mb-2">Vaccinations</h4>
                {history.vaccinations.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic">No vaccinations recorded.</p>
                ) : (
                  <ul className="list-disc pl-4 text-[11px] text-zinc-600 flex flex-col gap-1">
                    {history.vaccinations.map((v: any, idx: number) => (
                      <li key={idx}>{v.name} - {v.status} ({new Date(v.dateAdministered).toLocaleDateString()})</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-800  mb-2">Allergies</h4>
                {history.allergies.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic">No allergies recorded.</p>
                ) : (
                  <ul className="list-disc pl-4 text-[11px] text-zinc-600 flex flex-col gap-1">
                    {history.allergies.map((a: any, idx: number) => (
                      <li key={idx}>{a.allergen} ({a.severity})</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
