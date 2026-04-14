import { useState, useEffect } from 'react';
import { 
  db, 
  auth, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc,
  handleFirestoreError,
  OperationType,
  Timestamp,
  serverTimestamp
} from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  Search, 
  MessageSquare, 
  UserPlus, 
  Check, 
  X, 
  Shield, 
  Eye, 
  EyeOff,
  Settings,
  Download,
  Trash2,
  AlertTriangle,
  Users,
  Briefcase,
  User as UserIcon,
  Plus,
  Save,
  Edit2,
  Building2,
  Zap,
  Crown,
  CreditCard,
  ClipboardList,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Connection, ConnectionStatus, JobPost } from '../types';
import { EmployerInsights } from './EmployerInsights';
import { Pricing } from './Pricing';

type Tab = 'network' | 'settings' | 'profile' | 'discovery' | 'insights' | 'pricing' | 'jobs';

export function Dashboard() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>((profile?.role === 'recruiter' || profile?.role === 'employer') ? 'discovery' : 'profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Discovery state
  const [discoveryUsers, setDiscoveryUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Jobs state
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    location: '',
    type: 'full-time' as JobPost['type'],
    industry: '',
    category: '',
    description: '',
    requirements: '',
    salaryRange: ''
  });
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    headline: '',
    bio: '',
    skills: ''
  });

  useEffect(() => {
    if (!user) return;

    // Listen to user profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        setEditForm({
          headline: data.headline || '',
          bio: data.bio || '',
          skills: data.skills?.join(', ') || ''
        });
        // Default tab based on role if just loaded
        if (!profile) {
          setActiveTab((data.role === 'recruiter' || data.role === 'employer') ? 'discovery' : 'network');
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));

    // Listen to connections
    const q = query(
      collection(db, 'connections'),
      where('toUid', '==', user.uid)
    );
    const unsubConnections = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      setConnections(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'connections'));

    // Listen to discovery (all active professionals)
    const discoveryQ = query(
      collection(db, 'users'),
      where('role', '==', 'professional'),
      where('visibility', '==', 'active')
    );
    const unsubDiscovery = onSnapshot(discoveryQ, (snap) => {
      const docs = snap.docs
        .map(d => d.data() as UserProfile)
        .filter(p => p.uid !== user.uid);
      setDiscoveryUsers(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen to jobs
    const jobsQ = query(collection(db, 'jobs'), where('status', '==', 'active'));
    const unsubJobs = onSnapshot(jobsQ, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPost));
      setJobs(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'jobs'));

    return () => {
      unsubProfile();
      unsubConnections();
      unsubDiscovery();
      unsubJobs();
    };
  }, [user]);

  const updateVisibility = async (mode: UserProfile['visibility']) => {
    if (!user || !profile) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { ...profile, visibility: mode });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    try {
      const updatedProfile = {
        ...profile,
        headline: editForm.headline,
        bio: editForm.bio,
        skills: editForm.skills.split(',').map(s => s.trim()).filter(s => s !== '')
      };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const postJob = async () => {
    if (!user || !profile) return;
    try {
      const jobId = crypto.randomUUID();
      const newJob: JobPost = {
        id: jobId,
        recruiterUid: user.uid,
        title: jobForm.title,
        company: jobForm.company,
        location: jobForm.location,
        industry: jobForm.industry,
        category: jobForm.category,
        type: jobForm.type,
        description: jobForm.description,
        requirements: jobForm.requirements.split(',').map(r => r.trim()).filter(r => r !== ''),
        salaryRange: jobForm.salaryRange,
        status: 'active',
        createdAt: Timestamp.now(),
        isFoundingMember: profile.isFoundingMember
      };
      await setDoc(doc(db, 'jobs', jobId), newJob);
      setIsPostingJob(false);
      setJobForm({
        title: '',
        company: '',
        location: '',
        industry: '',
        category: '',
        type: 'full-time',
        description: '',
        requirements: '',
        salaryRange: ''
      });
      alert("Job posted successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jobs');
    }
  };

  const handleConnection = async (id: string, status: ConnectionStatus) => {
    try {
      const conn = connections.find(c => c.id === id);
      if (!conn) return;
      await setDoc(doc(db, 'connections', id), { ...conn, status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `connections/${id}`);
    }
  };

  const sendConnectionRequest = async (toUid: string) => {
    if (!user || !profile) return;

    // Credit check for recruiters
    if (profile.role === 'recruiter' && profile.subscriptionTier !== 'pro') {
      const currentCredits = profile.connectionCredits || 0;
      if (currentCredits <= 0) {
        alert("You have run out of connection credits. Upgrade to Pro for unlimited requests!");
        setActiveTab('pricing');
        return;
      }
    }

    try {
      const id = `${user.uid}_${toUid}`;
      await setDoc(doc(db, 'connections', id), {
        id,
        fromUid: user.uid,
        toUid,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Deduct credit if applicable
      if ((profile.role === 'recruiter' || profile.role === 'employer') && profile.subscriptionTier !== 'pro') {
        await setDoc(doc(db, 'users', user.uid), {
          ...profile,
          connectionCredits: (profile.connectionCredits || 1) - 1
        });
      }

      alert("Connection request sent!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `connections`);
    }
  };

  const handleUpgrade = async (tier: 'pro' | 'free') => {
    if (!user || !profile) return;
    setIsUpgrading(true);
    setUpgradeError(null);

    // If it's a downgrade or cancellation, we can handle it directly in Firestore for now
    // (In a real app, you'd cancel the subscription in Lemon Squeezy via API)
    if (tier === 'free') {
      try {
        const updates: Partial<UserProfile> = {
          subscriptionTier: 'free',
          isFeatured: false,
          featuredUntil: null,
        };
        await setDoc(doc(db, 'users', user.uid), { ...profile, ...updates });
        setIsUpgrading(false);
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        setIsUpgrading(false);
        return;
      }
    }

    // For paid upgrades, redirect to Lemon Squeezy
    try {
      console.log("Starting upgrade process for tier:", tier, "Role:", profile.role);
      
      const variantId = (profile.role === 'recruiter' || profile.role === 'employer')
        ? import.meta.env.VITE_LEMON_SQUEEZY_PRO_PLAN_VARIANT_ID 
        : import.meta.env.VITE_LEMON_SQUEEZY_FEATURED_BOOST_VARIANT_ID;

      console.log("Selected Variant ID:", variantId);

      if (!variantId) {
        const errorMsg = `Configuration error: Missing Variant ID for ${profile.role}. Please check your Secrets.`;
        console.error(errorMsg);
        setUpgradeError(errorMsg);
        setIsUpgrading(false);
        return;
      }

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: String(variantId),
          userId: user.uid,
          userEmail: user.email,
          returnUrl: window.location.origin
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.url) {
        console.log("Redirecting to checkout:", data.url);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from server");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setUpgradeError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsUpgrading(false);
    }
  };

  const exportData = () => {
    if (!profile) return;
    const data = JSON.stringify({ profile, connections }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talentfabric-data-${user?.uid}.json`;
    a.click();
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      alert("Account deletion requested. In a production app, all your data would be wiped now.");
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
    }
  };

  if (!profile) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );

  const filteredDiscovery = discoveryUsers.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                <UserIcon size={40} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
                {profile.displayName}
                {profile.isFoundingMember && (
                  <Shield size={18} className="text-indigo-600" title="Founding Partner" />
                )}
                {profile.subscriptionTier === 'pro' && (profile.role === 'recruiter' || profile.role === 'employer') && (
                  <Crown size={18} className="text-amber-500" title="Pro Business" />
                )}
                {profile.isFeatured && profile.role === 'professional' && (
                  <Zap size={18} className="text-indigo-500" title="Featured Professional" />
                )}
              </h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                {profile.role}
                {profile.subscriptionTier === 'pro' && ' • PRO'}
              </p>
              <p className="text-sm text-slate-500">{profile.headline || 'Professional Expert'}</p>
            </div>
            
            {(profile.role === 'recruiter' || profile.role === 'employer') && profile.subscriptionTier !== 'pro' && (
              <div className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Connection Credits</span>
                  <span className="text-xs font-bold text-indigo-700">{profile.connectionCredits || 0}/3</span>
                </div>
                <div className="h-2 w-full bg-indigo-200 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-indigo-600 transition-all" 
                    style={{ width: `${((profile.connectionCredits || 0) / 3) * 100}%` }}
                  />
                </div>
                <button 
                  onClick={() => setActiveTab('pricing')}
                  className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Zap size={14} />
                  Upgrade to Pro
                </button>
              </div>
            )}

            {/* Referral Section */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus size={16} className="text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">Refer & Earn</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-3">
                Share your code. When a friend joins, you both get 1 month of Pro!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-indigo-600">
                  {profile.referralCode || 'TF-XXXX'}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(profile.referralCode || '');
                    alert('Referral code copied!');
                  }}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Copy Referral Code"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            
            <div className="mt-8 space-y-2">
              {(profile.role === 'recruiter' || profile.role === 'employer') && (
                <div className="group relative">
                  <button 
                    onClick={() => setActiveTab('discovery')}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === 'discovery' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Search size={18} />
                    <span>Discovery</span>
                  </button>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Find and connect with active professionals
                  </div>
                </div>
              )}
              {profile.role === 'professional' && (
                <div className="group relative">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserIcon size={18} />
                    <span>My Profile</span>
                  </button>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Manage your professional identity and skills
                  </div>
                </div>
              )}
              <div className="group relative">
                <button 
                  onClick={() => setActiveTab('network')}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'network' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare size={18} />
                  <span>Network</span>
                  {connections.filter(c => c.status === 'pending').length > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
                      {connections.filter(c => c.status === 'pending').length}
                    </span>
                  )}
                </button>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Manage your connections and requests
                </div>
              </div>
              <div className="group relative">
                <button 
                  onClick={() => setActiveTab('jobs')}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'jobs' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardList size={18} />
                  <span>Job Board</span>
                </button>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {(profile.role === 'recruiter' || profile.role === 'employer') ? 'Manage your job postings' : 'Discover open opportunities'}
                </div>
              </div>
              {(profile.role === 'professional' || profile.role === 'recruiter') && (
                <div className="group relative">
                  <button 
                    onClick={() => setActiveTab('insights')}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === 'insights' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 size={18} />
                    <span>Employer Insights</span>
                  </button>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    Global company reviews and culture analysis
                  </div>
                </div>
              )}
              <div className="group relative">
                <button 
                  onClick={() => setActiveTab('pricing')}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'pricing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard size={18} />
                  <span>Plans & Billing</span>
                </button>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Manage your subscription and boosts
                </div>
              </div>
              <div className="group relative">
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Manage your data privacy and account
                </div>
              </div>
            </div>
          </div>

          {profile.role === 'professional' && (
            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
              <h3 className="flex items-center gap-2 font-bold mb-4">
                <Shield size={18} className="text-indigo-400" />
                Visibility Mode
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'active', icon: Eye, label: 'Active', desc: 'Recruiters can find you' },
                  { id: 'passive', icon: EyeOff, label: 'Passive', desc: 'Only contacts can see you' },
                  { id: 'hidden', icon: Shield, label: 'Hidden', desc: 'Incognito mode' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateVisibility(mode.id as any)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      profile.visibility === mode.id 
                        ? 'bg-indigo-600 border-indigo-500' 
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <mode.icon size={18} />
                    <div className="text-left">
                      <p className="text-sm font-bold">{mode.label}</p>
                      <p className="text-[10px] text-slate-400">{mode.desc}</p>
                    </div>
                  </button>
                ))}
                
                {!profile.isFeatured && (
                  <button 
                    onClick={() => setActiveTab('pricing')}
                    className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    <Zap size={16} />
                    Boost My Profile
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'network' && (
              <motion.div
                key="network"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-slate-900">Network Requests</h2>
                {connections.filter(c => c.status === 'pending').length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                      <Users size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No pending requests</h3>
                    <p className="text-slate-500">When recruiters or peers reach out, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {connections.filter(c => c.status === 'pending').map((conn) => (
                      <div key={conn.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <UserPlus size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">Connection Request</p>
                          <p className="text-xs text-slate-500">From UID: {conn.fromUid.slice(0, 8)}...</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleConnection(conn.id, 'accepted')}
                            className="h-8 w-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => handleConnection(conn.id, 'rejected')}
                            className="h-8 w-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Professional Profile</h2>
                  <button 
                    onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-all"
                  >
                    {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
                    <span>{isEditing ? 'Save Changes' : 'Edit Profile'}</span>
                  </button>
                </div>

                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200 space-y-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-900">Headline</label>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editForm.headline}
                        onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. Senior Software Engineer at TechCorp"
                      />
                    ) : (
                      <p className="text-slate-700">{profile.headline || 'No headline set'}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-900">Professional Bio</label>
                    {isEditing ? (
                      <textarea 
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        className="w-full h-32 rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Tell recruiters about your experience and what you're looking for..."
                      />
                    ) : (
                      <p className="text-slate-600 leading-relaxed italic">
                        {profile.bio || 'Add a bio to help recruiters understand your background.'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-900">Skills (comma separated)</label>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editForm.skills}
                        onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="React, TypeScript, Node.js, AWS..."
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.skills && profile.skills.length > 0 ? (
                          profile.skills.map((skill, i) => (
                            <span key={i} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-100">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <p className="text-slate-400 text-sm italic">No skills listed yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'discovery' && (
              <motion.div
                key="discovery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-900">Talent Discovery</h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, role, or skill..." 
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {filteredDiscovery.length === 0 ? (
                    <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                      <p className="text-slate-500">No professionals found matching your search.</p>
                    </div>
                  ) : (
                    filteredDiscovery.map((p) => (
                      <div key={p.uid} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                              <UserIcon size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900">{p.displayName}</h3>
                                {p.isFeatured && (
                                  <Zap size={14} className="text-indigo-500 fill-indigo-500" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{p.headline || 'Professional'}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => sendConnectionRequest(p.uid)}
                            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                            title="Send Connection Request"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4 italic">
                          {p.bio || 'No bio provided.'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {p.skills?.slice(0, 4).map((skill, i) => (
                            <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                          {(p.skills?.length || 0) > 4 && (
                            <span className="text-[10px] font-bold text-slate-400 px-2 py-1">
                              +{(p.skills?.length || 0) - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'insights' && (profile.role === 'professional' || profile.role === 'recruiter') && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <EmployerInsights />
              </motion.div>
            )}

            {activeTab === 'jobs' && (
              <motion.div
                key="jobs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {(profile.role === 'recruiter' || profile.role === 'employer') ? 'Manage Job Postings' : 'Open Opportunities'}
                  </h2>
                  {(profile.role === 'recruiter' || profile.role === 'employer') && (
                    <button 
                      onClick={() => setIsPostingJob(true)}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-all"
                    >
                      <Plus size={18} />
                      <span>Post a Job</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {((profile.role === 'recruiter' || profile.role === 'employer') ? jobs.filter(j => j.recruiterUid === user.uid) : jobs).length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                      <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                        <ClipboardList size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">No jobs found</h3>
                      <p className="text-slate-500">
                        {(profile.role === 'recruiter' || profile.role === 'employer')
                          ? 'Start by posting your first job opportunity.' 
                          : 'Check back later for new opportunities from top employers.'}
                      </p>
                    </div>
                  ) : (
                    ((profile.role === 'recruiter' || profile.role === 'employer') ? jobs.filter(j => j.recruiterUid === user.uid) : jobs).map((job) => (
                      <div key={job.id} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
                              {job.isFoundingMember && (
                                <Shield size={16} className="text-indigo-600" title="Founding Partner" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><Building2 size={14} /> {job.company}</span>
                              <span className="flex items-center gap-1"><Search size={14} /> {job.location}</span>
                              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{job.type}</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{job.industry}</span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{job.category}</span>
                            </div>
                          </div>
                          {profile.role === 'professional' && (
                            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all">
                              Apply Now
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-3 mb-4">{job.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.map((req, i) => (
                            <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'pricing' && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Pricing 
                  profile={profile} 
                  onUpgrade={handleUpgrade} 
                  isUpgrading={isUpgrading}
                  error={upgradeError}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <Shield className="text-indigo-600" />
                    Your Data Rights
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 mb-4">
                        <Download size={20} />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-2">Data Portability</h3>
                      <p className="text-sm text-slate-600 mb-4">Download all your profile data, connection history, and messages in a machine-readable JSON format.</p>
                      <button 
                        onClick={exportData}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
                      >
                        Export My Data
                      </button>
                    </div>

                    <div className="rounded-2xl bg-red-50 p-6 border border-red-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 mb-4">
                        <Trash2 size={20} />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-2">Right to Erasure</h3>
                      <p className="text-sm text-slate-600 mb-4">Permanently delete your account and all associated data from our servers. This action is irreversible.</p>
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-sm font-bold text-red-600 hover:text-red-700 underline underline-offset-4"
                      >
                        Delete My Account
                      </button>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-4">Consent History</h3>
                    <div className="rounded-xl bg-slate-50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <Check size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">GDPR Terms Accepted</p>
                          <p className="text-xs text-slate-500">
                            Version 1.2 • {profile.consentDate ? profile.consentDate.toDate().toLocaleDateString() : 'Pending'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-400">Active</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">Delete Account?</h3>
              <p className="text-slate-600 text-center mb-8">
                This will permanently delete your profile and all connections. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteAccount}
                  className="flex-1 py-3 rounded-xl bg-red-600 font-bold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isPostingJob && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPostingJob(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                    <Plus size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Post a New Job</h2>
                </div>
                <button onClick={() => setIsPostingJob(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900">Job Title</label>
                    <input 
                      type="text"
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Senior Product Designer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900">Company Name</label>
                    <input 
                      type="text"
                      value={jobForm.company}
                      onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. TalentFabric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900">Industry</label>
                    <select 
                      value={jobForm.industry}
                      onChange={(e) => setJobForm({ ...jobForm, industry: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      required
                    >
                      <option value="">Select Industry</option>
                      <option value="Technology">Technology</option>
                      <option value="Finance">Finance</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Retail">Retail</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900">Role Category</label>
                    <select 
                      value={jobForm.category}
                      onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Management">Management</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900">Location</label>
                    <input 
                      type="text"
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Berlin, Germany (Remote)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900">Job Type</label>
                    <select 
                      value={jobForm.type}
                      onChange={(e) => setJobForm({ ...jobForm, type: e.target.value as JobPost['type'] })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-900">Job Description</label>
                  <textarea 
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    className="w-full h-32 rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Describe the role and your company culture..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-900">Requirements (comma separated)</label>
                  <input 
                    type="text"
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="React, 5+ years experience, English C1..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-900">Salary Range (Optional)</label>
                  <input 
                    type="text"
                    value={jobForm.salaryRange}
                    onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. €60k - €80k"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsPostingJob(false)}
                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={postJob}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    Post Job Listing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
