'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  
  // Base states
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [discoveryVets, setDiscoveryVets] = useState<any[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'pets' | 'appointments' | 'ai'>('pets');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [isEditingPet, setIsEditingPet] = useState(false);
  const [petForm, setPetForm] = useState({ name: '', species: '', breed: '', gender: '', dateOfBirth: '', weight: '' });
  
  const [isBookingAppt, setIsBookingAppt] = useState(false);
  const [bookingForm, setBookingForm] = useState({ petId: '', vetId: '', clinicId: '', dateTime: '', reason: '' });
  
  // AI Health Assistant States
  const [aiPetId, setAiPetId] = useState('');
  const [aiConversationId, setAiConversationId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch initial profile and pets and appointments
  useEffect(() => {
    async function loadData() {
      try {
        const profRes = await fetch('/api/profile');
        if (!profRes.ok) {
          router.push('/');
          return;
        }
        const profData = await profRes.json();
        setProfile(profData.profile);
        setProfileForm({
          firstName: profData.profile.firstName,
          lastName: profData.profile.lastName,
          phone: profData.profile.phone || '',
        });

        const petsRes = await fetch('/api/pets');
        if (petsRes.ok) {
          const petsData = await petsRes.json();
          setPets(petsData.pets);
          if (petsData.pets.length > 0) {
            setAiPetId(petsData.pets[0].id);
          }
        }

        const apptsRes = await fetch('/api/appointments');
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          setAppointments(apptsData.appointments);
        }

        const discoveryRes = await fetch('/api/vet/discovery');
        if (discoveryRes.ok) {
          const discoveryData = await discoveryRes.json();
          setDiscoveryVets(discoveryData.veterinarians);
        }
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load conversation history for the selected pet
  useEffect(() => {
    async function loadChatHistory() {
      if (!aiPetId) return;
      setError('');
      try {
        const res = await fetch(`/api/ai/chat?petId=${aiPetId}`);
        if (res.ok) {
          const data = await res.json();
          setAiConversationId(data.conversationId || '');
          setChatMessages(data.messages || []);
        } else {
          setChatMessages([]);
          setAiConversationId('');
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }
    loadChatHistory();
  }, [aiPetId]);

  // Load select pet details and timeline
  async function handleSelectPet(pet: any) {
    setSelectedPet(pet);
    setTimeline([]);
    try {
      const res = await fetch(`/api/pets/${pet.id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline);
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
    }
  }

  // Profile operations
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setIsEditingProfile(false);
      } else {
        setError(data.error.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Connection error updating profile.');
    }
  }

  // Pet operations
  async function handleAddPet(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petForm),
      });
      const data = await res.json();
      if (data.success) {
        setPets([data.pet, ...pets]);
        setIsAddingPet(false);
        setPetForm({ name: '', species: '', breed: '', gender: '', dateOfBirth: '', weight: '' });
      } else {
        setError(data.error.message || 'Failed to add pet.');
      }
    } catch (err) {
      setError('Connection error adding pet.');
    }
  }

  async function handleEditPet(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPet) return;
    setError('');
    try {
      const res = await fetch(`/api/pets/${selectedPet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petForm),
      });
      const data = await res.json();
      if (data.success) {
        setPets(pets.map(p => p.id === selectedPet.id ? data.pet : p));
        setSelectedPet(data.pet);
        setIsEditingPet(false);
      } else {
        setError(data.error.message || 'Failed to update pet.');
      }
    } catch (err) {
      setError('Connection error updating pet.');
    }
  }

  async function handleDeletePet(petId: string) {
    if (!confirm('Are you sure you want to delete this pet? This deletes all associated health records.')) return;
    try {
      const res = await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
      if (res.ok) {
        setPets(pets.filter(p => p.id !== petId));
        if (selectedPet?.id === petId) {
          setSelectedPet(null);
          setTimeline([]);
        }
      }
    } catch (err) {
      setError('Failed to delete pet.');
    }
  }

  // Booking operations
  async function handleBookAppt(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments([data.appointment, ...appointments]);
        setIsBookingAppt(false);
        setBookingForm({ petId: '', vetId: '', clinicId: '', dateTime: '', reason: '' });
        const listRes = await fetch('/api/appointments');
        if (listRes.ok) {
          const listData = await listRes.json();
          setAppointments(listData.appointments);
        }
      } else {
        setError(data.error.message || 'Failed to book appointment.');
      }
    } catch (err) {
      setError('Connection error booking appointment.');
    }
  }

  async function handleCancelAppt(apptId: string) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(appointments.map(a => a.id === apptId ? data.appointment : a));
        const listRes = await fetch('/api/appointments');
        if (listRes.ok) {
          const listData = await listRes.json();
          setAppointments(listData.appointments);
        }
      }
    } catch (err) {
      setError('Failed to cancel appointment.');
    }
  }

  // AI Assistant Chat operations
  async function handleSendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || aiLoading) return;
    setError('');

    const userMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: aiConversationId || undefined,
          petId: aiConversationId ? undefined : aiPetId,
          message: userMsg.content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (!aiConversationId) {
          setAiConversationId(data.conversationId);
        }
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        setError(data.error.message || 'AI processing failure.');
      }
    } catch (err) {
      setError('AI Chat connection error.');
    } finally {
      setAiLoading(false);
    }
  }

  function handleResetChat() {
    setAiConversationId('');
    setChatMessages([]);
    setError('');
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  const selectedVet = discoveryVets.find(v => v.id === bookingForm.vetId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-500 font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-blue-600">Pet Healthcare Ecosystem</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Welcome, <span className="font-semibold text-zinc-900 dark:text-zinc-50">{profile?.firstName}</span>
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

      {/* Tab Selectors */}
      <div className="bg-white border-b border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 px-6">
        <div className="mx-auto max-w-6xl flex gap-6">
          <button 
            onClick={() => setActiveTab('pets')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'pets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500'}`}
          >
            My Pets & Health Files
          </button>
          <button 
            onClick={() => setActiveTab('appointments')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'appointments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500'}`}
          >
            Appointments & Vet Booking
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${activeTab === 'ai' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500'}`}
          >
            AI Veterinary Health Assistant
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
          
          {/* TAB 1: PETS VIEW */}
          {activeTab === 'pets' && (
            <>
              {/* Left Column: Profile & Pets List */}
              <div className="flex flex-col gap-8 md:col-span-1">
                {/* Profile Card */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Owner Profile</h2>
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
                      <div>
                        <label className="text-xs font-medium text-zinc-500 block mb-1">First Name</label>
                        <input 
                          type="text" required value={profileForm.firstName} 
                          onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                          className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-zinc-500 block mb-1">Last Name</label>
                        <input 
                          type="text" required value={profileForm.lastName} 
                          onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                          className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-zinc-500 block mb-1">Phone</label>
                        <input 
                          type="text" value={profileForm.phone} 
                          onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>
                      <button type="submit" className="mt-2 w-full rounded bg-blue-600 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
                        Save Profile
                      </button>
                    </form>
                  ) : (
                    <div className="text-sm flex flex-col gap-2">
                      <p><span className="text-zinc-500">Name:</span> {profile?.firstName} {profile?.lastName}</p>
                      <p><span className="text-zinc-500">Email:</span> {profile?.email}</p>
                      <p><span className="text-zinc-500">Phone:</span> {profile?.phone || 'Not provided'}</p>
                    </div>
                  )}
                </div>

                {/* Pets List */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">My Pets</h2>
                    <button 
                      onClick={() => {
                        setIsAddingPet(true);
                        setPetForm({ name: '', species: '', breed: '', gender: '', dateOfBirth: '', weight: '' });
                        setError('');
                      }}
                      className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      + Add
                    </button>
                  </div>

                  {isAddingPet && (
                    <form onSubmit={handleAddPet} className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">New Pet</h3>
                      <input 
                        type="text" placeholder="Name" required value={petForm.name}
                        onChange={e => setPetForm({ ...petForm, name: e.target.value })}
                        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input 
                        type="text" placeholder="Species" required value={petForm.species}
                        onChange={e => setPetForm({ ...petForm, species: e.target.value })}
                        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input 
                        type="text" placeholder="Breed" value={petForm.breed}
                        onChange={e => setPetForm({ ...petForm, breed: e.target.value })}
                        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input 
                        type="text" placeholder="Gender" value={petForm.gender}
                        onChange={e => setPetForm({ ...petForm, gender: e.target.value })}
                        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input 
                        type="date" value={petForm.dateOfBirth}
                        onChange={e => setPetForm({ ...petForm, dateOfBirth: e.target.value })}
                        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input 
                        type="number" step="0.1" placeholder="Weight (kg)" value={petForm.weight}
                        onChange={e => setPetForm({ ...petForm, weight: e.target.value })}
                        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setIsAddingPet(false)} className="rounded px-2.5 py-1 text-xs bg-zinc-200 dark:bg-zinc-800">Cancel</button>
                        <button type="submit" className="rounded px-2.5 py-1 text-xs bg-blue-600 text-white font-semibold">Save</button>
                      </div>
                    </form>
                  )}

                  <div className="flex flex-col gap-2">
                    {pets.map((pet) => (
                      <div 
                        key={pet.id} onClick={() => handleSelectPet(pet)}
                        className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition ${selectedPet?.id === pet.id ? 'border-blue-600 bg-blue-50/20' : 'border-zinc-100 hover:bg-zinc-50'}`}
                      >
                        <div>
                          <p className="font-bold text-sm">{pet.name}</p>
                          <p className="text-xs text-zinc-500">{pet.species} {pet.breed ? `• ${pet.breed}` : ''}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeletePet(pet.id); }} className="text-zinc-400 hover:text-red-600 text-xs">Delete</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Pet Details & History timeline */}
              <div className="md:col-span-2">
                {selectedPet ? (
                  <div className="flex flex-col gap-8">
                    {/* Detail Card */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">{selectedPet.name}'s Profile</h2>
                        <button 
                          onClick={() => {
                            setIsEditingPet(!isEditingPet);
                            setPetForm({
                              name: selectedPet.name,
                              species: selectedPet.species,
                              breed: selectedPet.breed || '',
                              gender: selectedPet.gender || '',
                              dateOfBirth: selectedPet.dateOfBirth ? selectedPet.dateOfBirth.split('T')[0] : '',
                              weight: selectedPet.weight ? selectedPet.weight.toString() : '',
                            });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {isEditingPet ? 'Cancel' : 'Edit Info'}
                        </button>
                      </div>

                      {isEditingPet ? (
                        <form onSubmit={handleEditPet} className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="Name" required value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                          <input type="text" placeholder="Species" required value={petForm.species} onChange={e => setPetForm({ ...petForm, species: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                          <input type="text" placeholder="Breed" value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                          <input type="text" placeholder="Gender" value={petForm.gender} onChange={e => setPetForm({ ...petForm, gender: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                          <input type="date" value={petForm.dateOfBirth} onChange={e => setPetForm({ ...petForm, dateOfBirth: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                          <input type="number" step="0.1" placeholder="Weight" value={petForm.weight} onChange={e => setPetForm({ ...petForm, weight: e.target.value })} className="rounded border px-3 py-1.5 text-sm dark:bg-zinc-800" />
                          <div className="col-span-2 flex justify-end">
                            <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-xs text-white font-semibold">Save Details</button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div><span className="text-zinc-500 text-xs block">Breed</span> <span className="font-semibold">{selectedPet.breed || 'N/A'}</span></div>
                          <div><span className="text-zinc-500 text-xs block">Gender</span> <span className="font-semibold">{selectedPet.gender || 'N/A'}</span></div>
                          <div><span className="text-zinc-500 text-xs block">Weight</span> <span className="font-semibold">{selectedPet.weight ? `${selectedPet.weight} kg` : 'N/A'}</span></div>
                          <div><span className="text-zinc-500 text-xs block">DOB</span> <span className="font-semibold">{selectedPet.dateOfBirth ? new Date(selectedPet.dateOfBirth).toLocaleDateString() : 'N/A'}</span></div>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <h2 className="text-lg font-bold mb-4">Timeline</h2>
                      {timeline.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-4">No events logged.</p>
                      ) : (
                        <div className="relative border-l border-zinc-200 pl-6 ml-3 flex flex-col gap-6 dark:border-zinc-800">
                          {timeline.map((event, idx) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border bg-white border-blue-600 dark:bg-zinc-900" />
                              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span className="font-bold text-blue-600 uppercase">{event.type}</span>
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                              </div>
                              <p className="font-bold text-sm">{event.title}</p>
                              {event.description && <p className="text-xs text-zinc-500 mt-1">{event.description}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-12 text-center text-zinc-400">
                    Select a pet profile from the list to view its medical records.
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: APPOINTMENTS VIEW */}
          {activeTab === 'appointments' && (
            <>
              {/* Left Column: Booking Form */}
              <div className="flex flex-col gap-8 md:col-span-1">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-bold mb-4">Book New Appointment</h2>
                  
                  <form onSubmit={handleBookAppt} className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Select Pet</label>
                      <select 
                        required value={bookingForm.petId}
                        onChange={e => setBookingForm({ ...bookingForm, petId: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm dark:bg-zinc-800"
                      >
                        <option value="">-- Choose Pet --</option>
                        {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Select Veterinarian</label>
                      <select 
                        required value={bookingForm.vetId}
                        onChange={e => {
                          const vId = e.target.value;
                          setBookingForm({ ...bookingForm, vetId: vId, clinicId: '' });
                        }}
                        className="w-full rounded border px-3 py-1.5 text-sm dark:bg-zinc-800"
                      >
                        <option value="">-- Choose Vet --</option>
                        {discoveryVets.map(v => (
                          <option key={v.id} value={v.id}>
                            Dr. {v.lastName} ({v.specialization || 'General'}) {v.isVerified ? '✓' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedVet && (
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">Select Clinic</label>
                        <select 
                          required value={bookingForm.clinicId}
                          onChange={e => setBookingForm({ ...bookingForm, clinicId: e.target.value })}
                          className="w-full rounded border px-3 py-1.5 text-sm dark:bg-zinc-800"
                        >
                          <option value="">-- Choose Clinic --</option>
                          {selectedVet.clinics.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Date & Time</label>
                      <input 
                        type="datetime-local" required value={bookingForm.dateTime}
                        onChange={e => setBookingForm({ ...bookingForm, dateTime: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm dark:bg-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">Reason for Visit</label>
                      <input 
                        type="text" required placeholder="Annual vaccination" value={bookingForm.reason}
                        onChange={e => setBookingForm({ ...bookingForm, reason: e.target.value })}
                        className="w-full rounded border px-3 py-1.5 text-sm dark:bg-zinc-800"
                      />
                    </div>

                    <button type="submit" className="mt-2 w-full rounded bg-blue-600 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
                      Request Slot
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Appointments List */}
              <div className="md:col-span-2 flex flex-col gap-6">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-lg font-bold mb-4">My Booked Appointments</h2>
                  {appointments.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 text-center">No upcoming appointments booked.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {appointments.map((appt) => (
                        <div key={appt.id} className="rounded-lg border p-4 flex items-center justify-between border-zinc-150 dark:border-zinc-800">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                appt.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {appt.status}
                              </span>
                              <span className="text-xs text-zinc-400">{new Date(appt.dateTime).toLocaleString()}</span>
                            </div>
                            <h3 className="font-bold text-sm">Pet: {appt.pet.name}</h3>
                            <p className="text-xs text-zinc-600 mt-1">Vet: Dr. {appt.vet.user.lastName} • Clinic: {appt.clinic.name}</p>
                            <p className="text-xs text-zinc-500 italic mt-1">Reason: {appt.reason}</p>
                          </div>
                          {appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED' && (
                            <button 
                              onClick={() => handleCancelAppt(appt.id)}
                              className="rounded bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: AI ASSISTANT VIEW */}
          {activeTab === 'ai' && (
            <div className="md:col-span-3">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden flex flex-col h-[600px]">
                {/* Chat Panel Header */}
                <div className="border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 flex justify-between items-center">
                  <div>
                    <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider">AI Veterinary Health Assistant</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Reads pet profiles and health charts to answer your questions.</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!aiConversationId && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Active Pet Context:</span>
                        <select 
                          value={aiPetId} 
                          onChange={e => setAiPetId(e.target.value)}
                          className="rounded border border-zinc-300 px-2.5 py-1 text-xs dark:bg-zinc-800"
                        >
                          {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                    <button 
                      onClick={handleResetChat}
                      className="rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-xs px-2.5 py-1 font-semibold"
                    >
                      Reset Chat
                    </button>
                  </div>
                </div>

                {/* Chat Message Lists Thread */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                  {chatMessages.length === 0 ? (
                    <div className="my-auto text-center max-w-md mx-auto flex flex-col gap-4">
                      <div>
                        <p className="font-bold text-zinc-700 dark:text-zinc-300">How can I help you and your pet today?</p>
                        <p className="text-xs text-zinc-500 mt-1">Ask about diagnostic history, booster vaccine due dates, weight logs, or upcoming appointments.</p>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => { setChatInput("Tell me about my pet's health."); }}
                          className="w-full text-left rounded-lg border border-zinc-200 hover:bg-zinc-50 p-3 text-xs font-medium dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900"
                        >
                          💡 "Tell me about my pet's health."
                        </button>
                        <button
                          type="button"
                          onClick={() => { setChatInput("What vaccinations does my pet have?"); }}
                          className="w-full text-left rounded-lg border border-zinc-200 hover:bg-zinc-50 p-3 text-xs font-medium dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900"
                        >
                          💡 "What vaccinations does my pet have?"
                        </button>
                        <button
                          type="button"
                          onClick={() => { setChatInput("Does my pet have any recorded allergies?"); }}
                          className="w-full text-left rounded-lg border border-zinc-200 hover:bg-zinc-50 p-3 text-xs font-medium dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900"
                        >
                          💡 "Does my pet have any recorded allergies?"
                        </button>
                        <button
                          type="button"
                          onClick={() => { setChatInput("Prepare me for my upcoming appointment."); }}
                          className="w-full text-left rounded-lg border border-zinc-200 hover:bg-zinc-50 p-3 text-xs font-medium dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900"
                        >
                          💡 "Prepare me for my upcoming appointment."
                        </button>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div 
                        key={index}
                        className={`flex flex-col max-w-[80%] rounded-lg p-4 text-sm ${
                          msg.role === 'user' 
                            ? 'self-end bg-blue-600 text-white rounded-br-none' 
                            : 'self-start bg-zinc-200 text-zinc-950 rounded-bl-none dark:bg-zinc-800 dark:text-zinc-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                          {msg.role === 'user' ? 'Owner Query' : 'Health Assistant'}
                        </span>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    ))
                  )}
                  {aiLoading && (
                    <div className="self-start bg-zinc-100 rounded-lg p-4 text-sm rounded-bl-none dark:bg-zinc-850 flex items-center gap-2 text-zinc-500">
                      <span className="animate-pulse">Assistant is querying pet databases...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat input box */}
                <form onSubmit={handleSendChatMessage} className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 flex gap-2">
                  <input 
                    type="text" required placeholder="Ask about medications, timelines, or vaccines..."
                    value={chatInput} onChange={e => setChatInput(e.target.value)}
                    disabled={aiLoading}
                    className="flex-1 rounded border px-4 py-2 text-sm dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <button 
                    type="submit" disabled={aiLoading}
                    className="rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
