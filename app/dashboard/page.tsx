'use client';
import { PawPrint, Home, Users, Calendar, User, Settings, LogOut, Hand, Clock, Building2, Clipboard, RefreshCw, Bot, Shield, Pill, MessageCircle, X, Stethoscope } from 'lucide-react';


import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export default function Dashboard() {
  const router = useRouter();
  
  // Base states loaded from server APIs
  const [profile, setProfile] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [discoveryVets, setDiscoveryVets] = useState<any[]>([]);
  
  // Navigation & Modals states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pets' | 'appointments' | 'ai' | 'profile' | 'chat'>('dashboard');
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [isEditingPet, setIsEditingPet] = useState(false);
  const [petForm, setPetForm] = useState({ name: '', species: '', breed: '', gender: '', dateOfBirth: '', weight: '' });
  
  const [isBookingAppt, setIsBookingAppt] = useState(false);
  const [bookingForm, setBookingForm] = useState({ petId: '', vetId: '', clinicId: '', dateTime: '', reason: '' });

  // Reschedule states — slot options come from the server (check_slots availability rules)
  const [isReschedulingAppt, setIsReschedulingAppt] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlotIso, setSelectedSlotIso] = useState('');
  
  // AI Health Assistant States
  const [aiPetId, setAiPetId] = useState('');
  const [aiConversationId, setAiConversationId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean | string>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch initial profile, pets, and appointments
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
            setSelectedPet(petsData.pets[0]);
            // Fetch initial pet's timeline
            const timeRes = await fetch(`/api/pets/${petsData.pets[0].id}/timeline`);
            if (timeRes.ok) {
              const timeData = await timeRes.json();
              setTimeline(timeData.timeline);
            }
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

  
  async function handleOpenVetChat(appointment: any) {
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/conversation`);
      const data = await res.json();
      if (data.success) {
        setSelectedConversation({
          ...data.conversation,
          appointment,
          pet: profile?.pets?.find((p: any) => p.id === appointment.petId) || { name: 'Pet' },
          veterinarian: appointment.vet
        });
        setActiveTab('chat');
      } else {
        alert(data.error?.message || 'Could not open chat.');
      }
    } catch (err) {
      alert('Connection error opening chat.');
    }
  }

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load conversation history for the selected pet
  useEffect(() => {
    async function loadChatHistory() {
      if (!aiPetId) return;
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
    setAiPetId(pet.id);
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
    setSuccessMsg('');
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
        setSuccessMsg('Profile updated successfully.');
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
    setModalError('');
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
        handleSelectPet(data.pet);
      } else {
        setModalError(data.error.message || 'Failed to add pet.');
      }
    } catch (err) {
      setModalError('Connection error adding pet.');
    }
  }

  async function handleEditPet(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPet) return;
    setModalError('');
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
        setModalError(data.error.message || 'Failed to update pet.');
      }
    } catch (err) {
      setModalError('Connection error updating pet.');
    }
  }

  async function handleDeletePet(petId: string) {
    if (!confirm('Are you sure you want to delete this pet? This deletes all associated health records.')) return;
    try {
      const res = await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
      if (res.ok) {
        setPets(pets.filter(p => p.id !== petId));
        if (selectedPet?.id === petId) {
          const remaining = pets.filter(p => p.id !== petId);
          if (remaining.length > 0) {
            handleSelectPet(remaining[0]);
          } else {
            setSelectedPet(null);
            setTimeline([]);
          }
        }
      }
    } catch (err) {
      setError('Failed to delete pet.');
    }
  }

  // Booking operations
  async function handleBookAppt(e: React.FormEvent) {
    e.preventDefault();
    setModalError('');
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
        setModalError(data.error.message || 'Failed to book appointment.');
      }
    } catch (err) {
      setModalError('Connection error booking appointment.');
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
      } else {
        setError(data.error?.message || 'Failed to cancel appointment.');
      }
    } catch (err) {
      setError('Connection error cancelling appointment.');
    }
  }

  // Reschedule operations — options come from /api/appointments/[id]/slots, which applies the
  // same availability rules as the AI assistant's check_slots (working hours 9 AM - 5 PM,
  // vet's REQUESTED/CONFIRMED bookings and past times excluded)
  function toKarachiDateString(d: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);
  }

  async function fetchRescheduleSlots(apptId: string, date: string) {
    setSlotsLoading(true);
    setSlotsError('');
    setRescheduleSlots([]);
    setSelectedSlotIso('');
    try {
      const res = await fetch(`/api/appointments/${apptId}/slots?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setRescheduleSlots(data.slots || []);
      } else {
        setSlotsError(data.error?.message || 'Failed to load available slots.');
      }
    } catch (err) {
      setSlotsError('Connection error loading slots.');
    } finally {
      setSlotsLoading(false);
    }
  }

  function handleOpenReschedule(appt: any) {
    setRescheduleTarget(appt);
    setModalError('');
    const karachiDate = toKarachiDateString(new Date(appt.dateTime));
    setRescheduleDate(karachiDate);
    setIsReschedulingAppt(true);
    fetchRescheduleSlots(appt.id, karachiDate);
  }

  function handleRescheduleDateChange(date: string) {
    setRescheduleDate(date);
    if (date && rescheduleTarget) {
      fetchRescheduleSlots(rescheduleTarget.id, date);
    }
  }

  async function handleRescheduleAppt(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleTarget || !selectedSlotIso) return;
    setModalError('');
    try {
      const res = await fetch(`/api/appointments/${rescheduleTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESCHEDULE', dateTime: selectedSlotIso }),
      });
      const data = await res.json();
      if (data.success) {
        setIsReschedulingAppt(false);
        setSuccessMsg('Appointment rescheduled — the vet will need to confirm the new time.');
        const listRes = await fetch('/api/appointments');
        if (listRes.ok) {
          const listData = await listRes.json();
          setAppointments(listData.appointments);
        }
      } else {
        setModalError(data.error?.message || 'Failed to reschedule appointment.');
      }
    } catch (err) {
      setModalError('Connection error rescheduling appointment.');
    }
  }

  // AI Assistant Chat operations
  async function handleSendChatMessage(e?: React.FormEvent, customInput?: string) {
    if (e) e.preventDefault();
    const inputToSend = customInput || chatInput;
    if (!inputToSend.trim() || aiLoading) return;
    setError('');

    const userMsg = { role: 'user', content: inputToSend };
    setChatMessages(prev => [...prev, userMsg]);
    if (!customInput) setChatInput('');
    setAiLoading('Analyzing health records...');

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

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/x-ndjson')) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
              if (part.trim()) {
                const data = JSON.parse(part);
                if (data.type === 'status') {
                  setAiLoading(data.message);
                } else if (data.type === 'result') {
                  if (data.success) {
                    if (!aiConversationId && data.conversationId) {
                      setAiConversationId(data.conversationId);
                    }
                    setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
                  } else {
                    setError(data.error?.message || 'AI processing failure.');
                  }
                }
              }
            }
          }
        }
      } else {
        const data = await res.json();
        if (data.success) {
          if (!aiConversationId) {
            setAiConversationId(data.conversationId);
          }
          setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        } else {
          setError(data.error.message || 'AI processing failure.');
        }
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
      router.push('/');
    }
  }

  // Clear errors when switching tabs
  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [activeTab]);

  const [modalError, setModalError] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 ">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600"></div>
          <p className="text-zinc-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const upcomingAppt = [...appointments]
    .filter(appt => new Date(appt.dateTime) > new Date() && (appt.status === 'CONFIRMED' || appt.status === 'REQUESTED'))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-zinc-900  ">
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className="w-60 border-r border-zinc-150 bg-white p-5   flex flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Logo Header */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl"><PawPrint className="inline w-4 h-4" /></span>
            <span className="text-xl font-bold tracking-tight text-zinc-900 ">PETIVA</span>
          </div>

          {/* Sidebar Menu Links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => { setActiveTab('dashboard'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Home className="inline w-4 h-4" /></span> Dashboard
            </button>
            <button
              onClick={() => { setActiveTab('pets'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'pets'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Users className="inline w-4 h-4" /></span> My Pets
            </button>
            <button
              onClick={() => { setActiveTab('appointments'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'appointments'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Calendar className="inline w-4 h-4" /></span> Appointments
            </button>
            <button
              onClick={() => { setActiveTab('ai'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'ai'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><Stethoscope className="inline w-4 h-4" /></span> AI Assistant
            </button>
            <button
              onClick={() => { setActiveTab('profile'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-500 hover:bg-zinc-50 :bg-zinc-800'
              }`}
            >
              <span><User className="inline w-4 h-4" /></span> Profile
            </button>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 ">
            <div className="flex items-center gap-2.5">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100"
                alt="Owner profile avatar"
                className="h-9 w-9 rounded-full object-cover border border-zinc-200"
              />
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-zinc-900 ">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-[10px] text-zinc-400 font-medium">Pet Owner</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('profile')} className="text-zinc-400 hover:text-zinc-600"><Settings className="inline w-4 h-4" /></button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full border border-zinc-200 hover:bg-zinc-50  :bg-zinc-800 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition text-zinc-700 "
          >
            <LogOut className="inline w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* 2. MIDDLE MAIN WORKSPACE */}
      <main className="flex-1 p-8 overflow-y-auto max-w-4xl">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 relative">
            <button onClick={() => setError('')} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-xs text-green-600 relative">
            <button onClick={() => setSuccessMsg('')} className="absolute top-2 right-2 text-green-500 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
            {successMsg}
          </div>
        )}

        {/* 2.1 DASHBOARD TAB VIEW */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-8">
            {/* Header Greeting Banner */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-zinc-950  leading-tight">Good morning, {profile?.firstName}! <Hand className="inline w-4 h-4" /></h2>
                <p className="text-xs text-zinc-400 mt-0.5">Your pets are healthier with PETIVA</p>
              </div>
              {/* Profile avatar header */}
              <div className="flex items-center gap-4">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100"
                  alt="Jane Doe profile avatar circular header"
                  className="h-8 w-8 rounded-full object-cover border border-zinc-200"
                />
              </div>
            </div>

            {/* My Pets list */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-zinc-900 ">My Pets</h3>
                <button
                  onClick={() => {
                    setPetForm({ name: '', species: '', breed: '', gender: '', dateOfBirth: '', weight: '' });
                    setIsAddingPet(true);
                  }}
                  className="rounded-full border border-blue-600 px-4 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition"
                >
                  + Add Pet
                </button>
              </div>

              {pets.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center  ">
                  <p className="text-sm text-zinc-400 italic">You haven't added a pet yet.</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {pets.map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => handleSelectPet(pet)}
                      className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left min-w-[210px] transition ${
                        selectedPet?.id === pet.id
                          ? 'border-blue-600 bg-blue-50/50 /20'
                          : 'border-zinc-200 bg-white   hover:bg-zinc-50'
                      }`}
                    >
                      <img
                        src={pet.species === 'Cat' 
                          ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=100"
                          : "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=100"
                        }
                        alt={pet.name}
                        className="h-10 w-10 rounded-full object-cover border border-zinc-150"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900  flex items-center gap-1">
                          {pet.name} <span className="text-xs text-zinc-400">{pet.gender === 'Female' ? '' : ''}</span>
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{pet.breed || pet.species}</p>
                        <span className="text-[9px] font-bold text-blue-600  flex items-center gap-1 mt-1">
                          ● Active
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Pet Detail Card */}
            {selectedPet && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm   grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 h-40 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-150">
                  <img
                    src={selectedPet.species === 'Cat' 
                      ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400"
                      : "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=400"
                    }
                    alt={selectedPet.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:col-span-8 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-2xl font-black text-zinc-900  flex items-center gap-1.5">
                        {selectedPet.name} <span className="text-lg text-zinc-400">{selectedPet.gender === 'Female' ? '' : ''}</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1">{selectedPet.breed || selectedPet.species} • {selectedPet.gender}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => { setActiveTab('pets'); }}
                        className="rounded-full border border-zinc-200 px-3.5 py-1 text-xs font-semibold hover:bg-zinc-50  transition"
                      >
                        View Full Profile →
                      </button>
                    </div>
                  </div>

                  {/* Health Overview grid */}
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    <div className="rounded-xl bg-zinc-50/50 p-3.5 border border-zinc-100 /30 ">
                      <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Vaccinations</p>
                      <p className="text-[11px] font-bold mt-1 text-green-600 ">
                        {timeline.filter(e => e.type === 'VACCINATION').length} Recorded
                      </p>
                    </div>
                    <div className="rounded-xl bg-zinc-50/50 p-3.5 border border-zinc-100 /30 ">
                      <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Medications</p>
                      <p className="text-[11px] font-bold mt-1 text-orange-600 ">
                        {timeline.filter(e => e.type === 'MEDICATION').length} Active
                      </p>
                    </div>
                    <div className="rounded-xl bg-zinc-50/50 p-3.5 border border-zinc-100 /30 ">
                      <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Allergies</p>
                      <p className="text-[11px] font-bold mt-1 text-purple-600 ">
                        {timeline.filter(e => e.type === 'ALLERGY').length === 0 
                          ? 'None recorded' 
                          : `${timeline.filter(e => e.type === 'ALLERGY').length} Recorded`}
                      </p>
                    </div>
                    <div className="rounded-xl bg-zinc-50/50 p-3.5 border border-zinc-100 /30 ">
                      <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Last Visit</p>
                      <p className="text-[11px] font-bold mt-1 text-zinc-700 ">
                        {(() => {
                          const pastAppts = timeline.filter(e => e.type === 'APPOINTMENT' && new Date(e.date) < new Date());
                          return pastAppts.length > 0 ? new Date(pastAppts[0].date).toLocaleDateString() : 'None';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Appointment & Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Upcoming Appointment */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm  ">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-zinc-900 ">Upcoming Appointment</h3>
                  <button onClick={() => { setActiveTab('appointments'); }} className="text-xs text-blue-600 font-semibold hover:underline">View all</button>
                </div>

                {upcomingAppt ? (
                  <div className="rounded-xl border border-zinc-150 p-4 bg-[#fcfdfe]/50 flex flex-col gap-4">
                    <div className="flex gap-4">
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-150 shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=200"
                          alt="Veterinary clinic office"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm text-zinc-900 ">{upcomingAppt.pet.name} – General Checkup</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${upcomingAppt.status === 'REQUESTED' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {upcomingAppt.status === 'REQUESTED' ? 'Pending Confirmation' : upcomingAppt.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Vet: Dr. {upcomingAppt.vet?.user?.firstName} {upcomingAppt.vet?.user?.lastName}</p>
                        <p className="text-xs text-zinc-400">Clinic: {upcomingAppt.clinic.name}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-2.5 flex items-center gap-1">
                          <span><Calendar className="inline w-4 h-4" /></span> {new Date(upcomingAppt.dateTime).toLocaleDateString()} • <span><Clock className="inline w-4 h-4" /></span> {new Date(upcomingAppt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => handleOpenReschedule(upcomingAppt)}
                        className="rounded-lg border border-blue-200 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancelAppt(upcomingAppt.id)}
                        className="rounded-lg border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-zinc-400 italic">No upcoming appointments</p>
                    <button
                      onClick={() => {
                        setBookingForm({ petId: selectedPet?.id || '', vetId: '', clinicId: '', dateTime: '', reason: '' });
                        setIsBookingAppt(true);
                      }}
                      className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Book Appointment
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Health Activity Timeline */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm  ">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-zinc-900 ">Recent Health Activity</h3>
                  <button onClick={() => { setActiveTab('pets'); }} className="text-xs text-blue-600 font-semibold hover:underline">View history</button>
                </div>

                {timeline.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-6">No health activities recorded.</p>
                ) : (
                  <div className="flex flex-col gap-4 relative pl-4 border-l-2 border-dashed border-zinc-150 ml-2">
                    {timeline.filter((item: any) => item.createdAt && !isNaN(new Date(item.createdAt).getTime()) && (item.symptoms || item.treatmentPlan || item.diagnosis)).slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="relative flex gap-3 items-start mb-2">
                        {/* Dot indicator */}
                        <div className="absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm flex items-center justify-center">
                          <span className="text-[7px] text-white">●</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-800 ">
                            {item.symptoms ? `Diagnosis: ${item.diagnosis || 'Health update'}` : `Vaccination logged`}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {item.symptoms ? `Symptoms: ${item.symptoms}` : (item.treatmentPlan ? `Treatment: ${item.treatmentPlan}` : '')}{(item.symptoms || item.treatmentPlan) && item.createdAt ? ' • ' : ''}{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-base font-bold text-zinc-900  mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setPetForm({ name: '', species: '', breed: '', gender: '', dateOfBirth: '', weight: '' });
                    setIsAddingPet(true);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white p-4.5 hover:bg-zinc-50 flex justify-between items-center text-left transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl"><PawPrint className="inline w-4 h-4" /></span>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 ">Add New Pet</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Register a new pet</p>
                    </div>
                  </div>
                  <span className="text-zinc-400 font-bold">&gt;</span>
                </button>
                <button
                  onClick={() => {
                    setBookingForm({ petId: selectedPet?.id || '', vetId: '', clinicId: '', dateTime: '', reason: '' });
                    setIsBookingAppt(true);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white p-4.5 hover:bg-zinc-50 flex justify-between items-center text-left transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl"><Calendar className="inline w-4 h-4" /></span>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 ">Book Appointment</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">Schedule a visit for your pet</p>
                    </div>
                  </div>
                  <span className="text-zinc-400 font-bold">&gt;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2.2 MY PETS PORTFOLIO TAB */}
        {activeTab === 'pets' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">My Pets Portfolio</h3>
              <button
                onClick={() => {
                  setPetForm({ name: '', species: '', breed: '', gender: '', dateOfBirth: '', weight: '' });
                  setIsAddingPet(true);
                }}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                + Add Pet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pets.map(pet => (
                <div key={pet.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm   flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-bold">{pet.name} {pet.gender === 'Female' ? '' : ''}</h4>
                      <p className="text-xs text-zinc-400">{pet.breed || pet.species} • {pet.gender}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPet(pet);
                          setPetForm({
                            name: pet.name,
                            species: pet.species,
                            breed: pet.breed || '',
                            gender: pet.gender || '',
                            dateOfBirth: pet.dateOfBirth ? new Date(pet.dateOfBirth).toISOString().split('T')[0] : '',
                            weight: pet.weight ? pet.weight.toString() : '',
                          });
                          setIsEditingPet(true);
                        }}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePet(pet.id)}
                        className="text-xs text-red-600 font-semibold hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.3 APPOINTMENTS PORTAL */}
        {activeTab === 'appointments' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Appointments Portal</h3>
              <button
                onClick={() => {
                  setBookingForm({ petId: selectedPet?.id || '', vetId: '', clinicId: '', dateTime: '', reason: '' });
                  setIsBookingAppt(true);
                }}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Book Appointment
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appointments.map(appt => (
                <div key={appt.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm  ">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-zinc-400">{new Date(appt.dateTime).toLocaleString()}</span>
                      <h4 className="font-bold text-sm mt-1">Pet: {appt.pet?.name}</h4>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      appt.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      appt.status === 'EXPIRED' ? 'bg-zinc-200 text-zinc-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    <p><Stethoscope className="inline w-4 h-4" /> <strong>Vet:</strong> Dr. {appt.vet?.user?.firstName} {appt.vet?.user?.lastName}</p>
                    <p><Building2 className="inline w-4 h-4" /> <strong>Clinic:</strong> {appt.clinic?.name}</p>
                    <p className="mt-1"><Clipboard className="inline w-4 h-4" /> <strong>Reason:</strong> {appt.reason}</p>
                  </div>
                  
                  {(appt.status === 'CONFIRMED' || appt.status === 'COMPLETED') && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenVetChat(appt)}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
                      >
                        Chat with Vet
                      </button>
                    </div>
                  )}
                  {(appt.status === 'REQUESTED' || appt.status === 'CONFIRMED') && new Date(appt.dateTime) > new Date() && (

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenReschedule(appt)}
                        className="rounded-lg border border-blue-200 px-4 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancelAppt(appt.id)}
                        className="rounded-lg border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2.4 AI ASSISTANT FULL PORTAL VIEW */}
        {activeTab === 'ai' && (
          <div className="flex flex-col gap-6 h-[550px] border border-zinc-200 rounded-2xl bg-white shadow-sm overflow-hidden  ">
            <div className="p-4 border-b border-zinc-150 bg-[#fbfcfd]/50 flex justify-between items-center  ">
              <div>
                <h3 className="font-bold text-sm"><Stethoscope className="inline w-4 h-4" /> AI Veterinary Health Assistant</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Focus: {selectedPet?.name || 'All pets'}</p>
              </div>
              <button
                onClick={handleResetChat}
                className="text-xs font-semibold text-zinc-500 hover:text-blue-600 transition"
              >
                <RefreshCw className="inline w-4 h-4" /> Reset Chat
              </button>
            </div>

            <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 bg-zinc-50 /50">
              {chatMessages.length === 0 ? (
                <div className="my-auto text-center flex flex-col items-center gap-3">
                  <span className="text-3xl text-blue-600"><Bot className="inline w-8 h-8" /></span>
                  <p className="text-sm font-semibold text-zinc-500">How can I help you with your pet's health today?</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${
                      msg.role === 'user'
                        ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                        : 'mr-auto bg-white text-zinc-800 rounded-bl-none border border-zinc-150   '
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm  max-w-none">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="mr-auto bg-white border border-zinc-150 text-zinc-500 rounded-2xl rounded-bl-none p-4 text-xs italic   shadow-sm flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600"></div>
                  {typeof aiLoading === 'string' ? aiLoading : 'Analyzing health records...'}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChatMessage} className="p-4 border-t border-zinc-150 bg-white   flex gap-3 items-end">
              <textarea autoComplete='off' 
                required
                placeholder="Ask a health query..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim()) handleSendChatMessage(e);
                  }
                }}
                rows={1}
                className="flex-grow resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm min-h-[44px] max-h-[120px]   focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
              <button
                type="submit" disabled={!!aiLoading || !chatInput.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center shrink-0 h-[44px]"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* 2.5 OWNER PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm max-w-xl  ">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Owner Profile Settings</h3>
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
                  <input autoComplete='off' 
                    type="text" required
                    value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Last Name</label>
                  <input autoComplete='off' 
                    type="text" required
                    value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Contact Phone</label>
                  <input autoComplete='off' 
                    type="text"
                    value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm  "
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition w-full"
                >
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-sm">
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">First Name</p>
                  <p className="font-semibold mt-0.5">{profile?.firstName}</p>
                </div>
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">Last Name</p>
                  <p className="font-semibold mt-0.5">{profile?.lastName}</p>
                </div>
                <div className="border-b border-zinc-100 pb-3 ">
                  <p className="text-xs text-zinc-400">Email Address</p>
                  <p className="font-semibold mt-0.5">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Contact Phone</p>
                  <p className="font-semibold mt-0.5">{profile?.phone || 'Not Specified'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. RIGHT SIDEBAR: AI HEALTH ASSISTANT (DESKTOP PANEL) */}
      <aside className="w-80 border-l border-zinc-150 bg-white p-6   hidden xl:flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-sm"><Stethoscope className="inline w-4 h-4" /></span>
              <h3 className="font-bold text-sm text-zinc-900 ">AI Veterinary Health Assistant</h3>
              <span className="bg-blue-600 text-white font-black text-[9px] px-1 py-0.5 rounded-sm uppercase tracking-wider">AI</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
              Ask PETIVA about {selectedPet?.name || 'your pets'} using their recorded health history.
            </p>
          </div>

          {/* Active Pet Selector */}
          <div className="mb-6">
            <label className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Active Pet</label>
            <select
              value={aiPetId}
              onChange={e => {
                setAiPetId(e.target.value);
                const matched = pets.find(p => p.id === e.target.value);
                if (matched) setSelectedPet(matched);
              }}
              className="w-full mt-1 rounded-xl border border-zinc-250 px-3 py-2.5 text-xs font-semibold   focus:outline-none"
            >
              {pets.map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.breed || p.species}</option>
              ))}
            </select>
          </div>

          {/* Welcome chat bubble */}
          <div className="mb-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-50 text-xs text-zinc-700 /20   flex gap-3 leading-relaxed">
            <span className="text-lg shrink-0"><PawPrint className="inline w-4 h-4" /></span>
            <p>
              Hi {profile?.firstName}! <Hand className="inline w-4 h-4" /> I'm PETIVA AI. Ask me anything about {selectedPet?.name || "your pet"}'s health, vaccinations, medications or upcoming appointments.
            </p>
          </div>

          {/* Try Asking preset prompts */}
          <div className="flex flex-col gap-2">
            <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Try asking</p>
            <button
              onClick={() => handleSendChatMessage(undefined, `Tell me about my pet's health`)}
              className="w-full text-left bg-[#fcfdfe] border border-zinc-200 rounded-xl p-3 text-[11px] font-semibold hover:bg-zinc-50   :bg-zinc-800 transition flex justify-between items-center"
            >
              <span className="flex items-center gap-2"><PawPrint className="inline w-4 h-4" /> Tell me about my pet's health</span>
              <span className="text-zinc-400">&gt;</span>
            </button>
            <button
              onClick={() => handleSendChatMessage(undefined, `What vaccinations does my pet have?`)}
              className="w-full text-left bg-[#fcfdfe] border border-zinc-200 rounded-xl p-3 text-[11px] font-semibold hover:bg-zinc-50   :bg-zinc-800 transition flex justify-between items-center"
            >
              <span className="flex items-center gap-2"><Shield className="inline w-4 h-4" />️ What vaccinations does my pet have?</span>
              <span className="text-zinc-400">&gt;</span>
            </button>
            <button
              onClick={() => handleSendChatMessage(undefined, `Does my pet have any allergies?`)}
              className="w-full text-left bg-[#fcfdfe] border border-zinc-200 rounded-xl p-3 text-[11px] font-semibold hover:bg-zinc-50   :bg-zinc-800 transition flex justify-between items-center"
            >
              <span className="flex items-center gap-2"><Pill className="inline w-4 h-4" /> Does my pet have any allergies?</span>
              <span className="text-zinc-400">&gt;</span>
            </button>
            <button
              onClick={() => handleSendChatMessage(undefined, `Prepare me for my upcoming appointment`)}
              className="w-full text-left bg-[#fcfdfe] border border-zinc-200 rounded-xl p-3 text-[11px] font-semibold hover:bg-zinc-50   :bg-zinc-800 transition flex justify-between items-center"
            >
              <span className="flex items-center gap-2"><Calendar className="inline w-4 h-4" /> Prepare me for my upcoming appointment</span>
              <span className="text-zinc-400">&gt;</span>
            </button>
          </div>
        </div>

        {/* Input box bottom promo */}
        <div className="border-t border-zinc-100 pt-4 flex flex-col gap-3">
          <button
            onClick={() => { setActiveTab('ai'); }}
            className="w-full rounded-full bg-blue-600 py-3 text-xs font-bold text-white text-center hover:bg-blue-700 shadow-md shadow-blue-500/10 transition block"
          >
            <MessageCircle className="inline w-4 h-4" /> Open AI Assistant Chat
          </button>
        </div>
      </aside>

      {/* 4. DIALOG MODALS */}
      
      {/* 4.1 ADD PET DIALOG OVERLAY */}
      {isAddingPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl   flex flex-col gap-4 text-zinc-900 ">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold">Register New Pet</h3>
              <button onClick={() => setIsAddingPet(false)} className="text-zinc-400 hover:text-zinc-600 font-bold"><X className="inline w-4 h-4" /></button>
            </div>

            {modalError && (
              <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 relative">
                <button type="button" onClick={() => setModalError('')} className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"><X className="w-3 h-3" /></button>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddPet} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Pet Name</label>
                <input autoComplete='off' 
                  type="text" required placeholder="e.g. Milo"
                  value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Species</label>
                  <select
                    value={petForm.species} onChange={e => setPetForm({ ...petForm, species: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Breed</label>
                  <input autoComplete='off' 
                    type="text" placeholder="Siamese"
                    value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Gender</label>
                  <select
                    value={petForm.gender} onChange={e => setPetForm({ ...petForm, gender: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Weight (kg)</label>
                  <input autoComplete='off' 
                    type="number" step="0.1" placeholder="4.5"
                    value={petForm.weight} onChange={e => setPetForm({ ...petForm, weight: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Date of Birth</label>
                <input autoComplete='off' 
                  type="date"
                  value={petForm.dateOfBirth} onChange={e => setPetForm({ ...petForm, dateOfBirth: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-full bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Add Pet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4.2 EDIT PET DIALOG OVERLAY */}
      {isEditingPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl   flex flex-col gap-4 text-zinc-900 ">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold">Edit Pet Details</h3>
              <button onClick={() => setIsEditingPet(false)} className="text-zinc-400 hover:text-zinc-600 font-bold"><X className="inline w-4 h-4" /></button>
            </div>

            {modalError && (
              <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 relative">
                <button type="button" onClick={() => setModalError('')} className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"><X className="w-3 h-3" /></button>
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditPet} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Pet Name</label>
                <input autoComplete='off' 
                  type="text" required
                  value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Species</label>
                  <select
                    value={petForm.species} onChange={e => setPetForm({ ...petForm, species: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Breed</label>
                  <input autoComplete='off' 
                    type="text"
                    value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-full bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4.3 BOOK APPOINTMENT DIALOG OVERLAY */}
      {isBookingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl   flex flex-col gap-4 text-zinc-900 ">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold">Book a Clinic Visit</h3>
              <button onClick={() => setIsBookingAppt(false)} className="text-zinc-400 hover:text-zinc-600 font-bold"><X className="inline w-4 h-4" /></button>
            </div>

            {modalError && (
              <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 relative">
                <button type="button" onClick={() => setModalError('')} className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"><X className="w-3 h-3" /></button>
                {modalError}
              </div>
            )}

            <form onSubmit={handleBookAppt} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Select Pet</label>
                <select
                  required value={bookingForm.petId}
                  onChange={e => setBookingForm({ ...bookingForm, petId: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                >
                  <option value="">Choose Pet...</option>
                  {pets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Select Veterinarian</label>
                <select
                  required value={bookingForm.vetId}
                  onChange={e => {
                    const vetId = e.target.value;
                    const matchedVet = discoveryVets.find(v => v.id === vetId);
                    const clinicId = matchedVet?.clinics?.[0]?.id || '';
                    setBookingForm({ ...bookingForm, vetId, clinicId });
                  }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                >
                  <option value="">Choose Doctor...</option>
                  {discoveryVets.map(v => (
                    <option key={v.id} value={v.id}>Dr. {v.user?.firstName} {v.user?.lastName} ({v.specialization || 'General Vet'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Schedule Date & Time</label>
                <input autoComplete='off' 
                  type="datetime-local" required
                  value={bookingForm.dateTime} onChange={e => setBookingForm({ ...bookingForm, dateTime: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Reason for Visit</label>
                <textarea autoComplete='off' 
                  required placeholder="Annual checkup, vaccines, or specific health concerns..."
                  value={bookingForm.reason} onChange={e => setBookingForm({ ...bookingForm, reason: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-full bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Submit Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4.4 RESCHEDULE APPOINTMENT DIALOG OVERLAY */}
      {isReschedulingAppt && rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl   flex flex-col gap-4 text-zinc-900 ">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold">Reschedule Appointment</h3>
              <button onClick={() => setIsReschedulingAppt(false)} className="text-zinc-400 hover:text-zinc-600 font-bold"><X className="inline w-4 h-4" /></button>
            </div>

            {modalError && (
              <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 relative">
                <button type="button" onClick={() => setModalError('')} className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"><X className="w-3 h-3" /></button>
                {modalError}
              </div>
            )}

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 text-xs text-zinc-600 flex flex-col gap-1">
              <p><strong>Pet:</strong> {rescheduleTarget.pet?.name}</p>
              <p><strong>Vet:</strong> Dr. {rescheduleTarget.vet?.user?.firstName} {rescheduleTarget.vet?.user?.lastName}</p>
              <p><strong>Clinic:</strong> {rescheduleTarget.clinic?.name}</p>
              <p><strong>Current time:</strong> {new Date(rescheduleTarget.dateTime).toLocaleString()}</p>
            </div>

            <form onSubmit={handleRescheduleAppt} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">New Date</label>
                <input
                  type="date" required
                  min={toKarachiDateString(new Date())}
                  value={rescheduleDate}
                  onChange={e => handleRescheduleDateChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">
                  Available Times <span className="font-normal text-zinc-400">(9 AM - 5 PM)</span>
                </label>
                {slotsLoading && <p className="text-xs text-zinc-400 py-2">Checking available slots...</p>}
                {!slotsLoading && slotsError && <p className="text-xs text-red-600 py-2">{slotsError}</p>}
                {!slotsLoading && !slotsError && rescheduleSlots.length === 0 && (
                  <p className="text-xs text-zinc-400 py-2">No slots available on this date — pick another date.</p>
                )}
                {!slotsLoading && rescheduleSlots.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {rescheduleSlots.map((slot: any) => {
                      const isCurrent = rescheduleTarget && new Date(slot.iso).getTime() === new Date(rescheduleTarget.dateTime).getTime();
                      const isSelected = selectedSlotIso === slot.iso;
                      const disabled = !slot.available || isCurrent;
                      return (
                        <button
                          key={slot.iso}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSelectedSlotIso(slot.iso)}
                          title={isCurrent ? 'Current appointment time' : !slot.available ? 'Not available' : ''}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : disabled
                              ? 'border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed'
                              : 'border-zinc-200 text-zinc-700 hover:bg-blue-50 hover:border-blue-200'
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Slots follow clinic working hours (9 AM - 5 PM). The appointment will be reset to Pending Confirmation and the vet will need to approve the new time.
              </p>

              <button
                type="submit"
                disabled={!selectedSlotIso}
                className="mt-3 w-full rounded-full bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed"
              >
                Confirm Reschedule
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
