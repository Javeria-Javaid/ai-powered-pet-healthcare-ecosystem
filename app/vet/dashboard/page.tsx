'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VetDashboard() {
  const router = useRouter();

  // Vet states
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

  // UI tabs
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments'>('patients');

  // UI Editing & Input states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', specialization: '' });
  
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ symptoms: '', diagnosis: '', treatmentPlan: '', notes: '' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } else {
        console.error('Unauthorized patient access query rejected');
      }
    } catch (err) {
      console.error('Failed to load patient history:', err);
    }
  }

  // Update profile
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
      } else {
        setError(data.error.message || 'Failed to create record entry.');
      }
    } catch (err) {
      setError('Connection error posting record.');
    }
  }

  // Appointment Actions
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
        // Reload all data so schedules and patients are updated
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
      console.error('Logout error:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-500 font-medium">Loading Veterinarian Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Top Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-blue-600">Veterinarian Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Logged in: <span className="font-semibold text-zinc-900 dark:text-zinc-50">Dr. {vetProfile?.lastName}</span>
            </span>
            <button 
              onClick={handleLogout}
              className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="bg-white border-b border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 px-6">
        <div className="mx-auto max-w-6xl flex gap-6">
          <button 
            onClick={() => setActiveTab('patients')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'patients' ? 'border-b-blue-600 text-blue-600' : 'border-transparent text-zinc-500'}`}
          >
            Patients Files & Consents
          </button>
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'appointments' ? 'border-b-blue-600 text-blue-600' : 'border-transparent text-zinc-500'}`}
          >
            Schedules & Appointments
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          
          {/* TAB 1: PATIENTS SECTION */}
          {activeTab === 'patients' && (
            <>
              {/* Column 1: Vet Profile & Associated Clinics */}
              <div className="flex flex-col gap-8 md:col-span-1">
                {/* Profile */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Professional Profile</h2>
                    <button 
                      onClick={() => {
                        setIsEditingProfile(!isEditingProfile);
                        setError('');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {isEditingProfile ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
                      <input type="text" required value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                      <input type="text" required value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                      <input type="text" value={profileForm.specialization} onChange={e => setProfileForm({ ...profileForm, specialization: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                      <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                      <button type="submit" className="w-full rounded bg-blue-600 py-1.5 text-sm font-semibold text-white">Save</button>
                    </form>
                  ) : (
                    <div className="text-sm flex flex-col gap-2">
                      <p><span className="text-zinc-500 font-medium">Name:</span> Dr. {vetProfile?.firstName} {vetProfile?.lastName}</p>
                      <p><span className="text-zinc-500 font-medium">License:</span> {vetProfile?.licenseNumber}</p>
                      <p><span className="text-zinc-500 font-medium">Specialty:</span> {vetProfile?.specialization || 'General Practice'}</p>
                      <p><span className="text-zinc-500 font-medium">Verification:</span> <span className="font-semibold text-green-600">Verified</span></p>
                    </div>
                  )}
                </div>

                {/* Clinics */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-bold mb-4">My Clinics</h2>
                  <div className="flex flex-col gap-3">
                    {clinics.map((clinic) => (
                      <div key={clinic.id} className="rounded border p-4 dark:border-zinc-800 bg-zinc-50/50">
                        <p className="font-bold text-sm text-blue-600">{clinic.name}</p>
                        <p className="text-xs text-zinc-500 mt-1">{clinic.address}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2 & 3: Patients list & Patient details */}
              <div className="md:col-span-2 flex flex-col gap-8">
                {/* Pickers list */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-bold mb-4">Authorized Patients</h2>
                  {patients.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">No authorized patient files linked (requires confirmed appointments).</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {patients.map((pat) => (
                        <div 
                          key={pat.id} onClick={() => handleSelectPatient(pat)}
                          className={`rounded-lg border p-4 cursor-pointer transition ${selectedPatient?.id === pat.id ? 'border-blue-600 bg-blue-50/20' : 'border-zinc-150 hover:bg-zinc-50'}`}
                        >
                          <p className="font-bold text-sm">{pat.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">Species: {pat.species} {pat.breed ? `• ${pat.breed}` : ''}</p>
                          <p className="text-xs text-zinc-400 mt-2">Owner: {pat.owner.firstName} {pat.owner.lastName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patient history detail */}
                {selectedPatient ? (
                  <div className="flex flex-col gap-8">
                    {/* Header */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{selectedPatient.name}'s Medical File</h2>
                        <button onClick={() => setIsAddingRecord(!isAddingRecord)} className="rounded bg-blue-600 px-3 py-1 text-xs text-white font-semibold">
                          {isAddingRecord ? 'Cancel' : '+ Add Record'}
                        </button>
                      </div>

                      {isAddingRecord && (
                        <form onSubmit={handleAddRecord} className="mb-6 rounded-lg border border-zinc-200 p-4 bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 flex flex-col gap-3">
                          <textarea required placeholder="Symptoms" value={recordForm.symptoms} onChange={e => setRecordForm({ ...recordForm, symptoms: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" rows={2} />
                          <input type="text" required placeholder="Diagnosis" value={recordForm.diagnosis} onChange={e => setRecordForm({ ...recordForm, diagnosis: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                          <textarea required placeholder="Treatment Plan" value={recordForm.treatmentPlan} onChange={e => setRecordForm({ ...recordForm, treatmentPlan: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" rows={2} />
                          <textarea placeholder="Internal Notes" value={recordForm.notes} onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" rows={2} />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAddingRecord(false)} className="rounded px-3 py-1 text-xs bg-zinc-200">Cancel</button>
                            <button type="submit" className="rounded px-3 py-1 text-xs bg-blue-600 text-white font-semibold">Post</button>
                          </div>
                        </form>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <div><span className="text-zinc-500 text-xs block">DOB</span> <span className="font-semibold">{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}</span></div>
                        <div><span className="text-zinc-500 text-xs block">Gender</span> <span className="font-semibold">{selectedPatient.gender || 'N/A'}</span></div>
                        <div><span className="text-zinc-500 text-xs block">Weight</span> <span className="font-semibold">{selectedPatient.weight ? `${selectedPatient.weight} kg` : 'N/A'}</span></div>
                        <div><span className="text-zinc-500 text-xs block">Owner Contact</span> <span className="font-semibold text-xs">{selectedPatient.owner.phone || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* History lists */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <h2 className="text-lg font-bold mb-4">Diagnosis History Logs</h2>
                      <div className="flex flex-col gap-4">
                        {history.medicalRecords.map((rec: any) => {
                          const v = rec.versions[0];
                          return (
                            <div key={rec.id} className="rounded border p-4 dark:border-zinc-800">
                              <span className="text-xs text-zinc-400 block mb-1">{new Date(rec.createdAt).toLocaleDateString()}</span>
                              <p className="font-bold text-sm text-blue-600">Diagnosis: {v?.diagnosis}</p>
                              <p className="text-xs mt-1"><span className="font-semibold">Symptoms:</span> {v?.symptoms}</p>
                              <p className="text-xs mt-1"><span className="font-semibold">Plan:</span> {v?.treatmentPlan}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-12 text-center text-zinc-400">
                    Select a patient profile to view detailed history.
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: APPOINTMENTS SECTION */}
          {activeTab === 'appointments' && (
            <div className="md:col-span-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-lg font-bold mb-4">Patient Appointments Schedule</h2>
                
                {appointments.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">No appointments found in database.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {appointments.map((appt) => (
                      <div key={appt.id} className="rounded-lg border p-4 flex items-center justify-between border-zinc-150 dark:border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              appt.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {appt.status}
                            </span>
                            <span className="text-xs text-zinc-400">{new Date(appt.dateTime).toLocaleString()}</span>
                          </div>
                          <h3 className="font-bold text-sm">Patient: {appt.pet.name}</h3>
                          <p className="text-xs text-zinc-500 mt-1">Owner: {appt.owner.firstName} {appt.owner.lastName} • Clinic: {appt.clinic.name}</p>
                          <p className="text-xs text-zinc-500 italic mt-1">Reason: {appt.reason}</p>
                        </div>

                        {appt.status === 'REQUESTED' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateApptStatus(appt.id, 'CONFIRMED')}
                              className="rounded bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-semibold"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => handleUpdateApptStatus(appt.id, 'CANCELLED')}
                              className="rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 text-xs font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
