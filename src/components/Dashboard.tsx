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
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Connection, ConnectionStatus } from '../types';

type Tab = 'network' | 'settings' | 'profile' | 'discovery';

export function Dashboard() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('network');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Discovery state
  const [discoveryUsers, setDiscoveryUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
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
          setActiveTab(data.role === 'recruiter' ? 'discovery' : 'network');
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

    return () => {
      unsubProfile();
      unsubConnections();
      unsubDiscovery();
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
    if (!user) return;
    try {
      const id = `${user.uid}_${toUid}`;
      await setDoc(doc(db, 'connections', id), {
        id,
        fromUid: user.uid,
        toUid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert("Connection request sent!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `connections`);
    }
  };

  const exportData = () => {
    if (!profile) return;
    const data = JSON.stringify({ profile, connections }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proconnect-data-${user?.uid}.json`;
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
              <h2 className="text-xl font-bold text-slate-900">{profile.displayName}</h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">{profile.role}</p>
              <p className="text-sm text-slate-500">{profile.headline || 'Professional Expert'}</p>
            </div>
            
            <div className="mt-8 space-y-2">
              {profile.role === 'recruiter' && (
                <button 
                  onClick={() => setActiveTab('discovery')}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'discovery' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Search size={18} />
                  <span>Discovery</span>
                </button>
              )}
              {profile.role === 'professional' && (
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserIcon size={18} />
                  <span>My Profile</span>
                </button>
              )}
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
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Settings size={18} />
                <span>Settings</span>
              </button>
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
                              <h3 className="font-bold text-slate-900">{p.displayName}</h3>
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
      </AnimatePresence>
    </div>
  );
}
