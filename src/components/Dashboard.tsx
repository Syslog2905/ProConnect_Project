import { useState, useEffect, useRef } from 'react';
import { 
  db, 
  auth, 
  collection, 
  query, 
  where, 
  or,
  and,
  onSnapshot, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
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
  Copy,
  Camera,
  Upload,
  Loader2,
  Send,
  MoreVertical,
  ArrowLeft,
  Linkedin,
  Menu,
  X as CloseIcon,
  UserCircle,
  Clock,
  FileText,
  Paperclip,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Connection, ConnectionStatus, JobPost, Message, Attachment } from '../types';
import { EmployerInsights } from './EmployerInsights';
import { Pricing } from './Pricing';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import Cropper from 'react-easy-crop';
import TurndownService from 'turndown';
import { getCroppedImg } from '../lib/imageUtils';

type Tab = 'network' | 'settings' | 'profile' | 'discovery' | 'insights' | 'pricing' | 'jobs' | 'messages';

export function Dashboard() {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>((profile?.role === 'recruiter' || profile?.role === 'employer') ? 'discovery' : 'profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [skillsWarning, setSkillsWarning] = useState(false);
  const [showSkillsConfirm, setShowSkillsConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
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
    skills: '',
    photoURL: '',
    linkedinURL: '',
    cvURL: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isFirstLoad = useRef(true);
  const isEditingRef = useRef(isEditing);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // Cropper state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [connectedProfiles, setConnectedProfiles] = useState<Record<string, UserProfile>>({});
  const [activeChat, setActiveChat] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  // Ensure public profile is synced on dashboard load
  useEffect(() => {
    if (user && profile) {
      const sync = async () => {
        try {
          const publicRef = doc(db, 'public_profiles', user.uid);
          await setDoc(publicRef, {
            uid: user.uid,
            displayName: profile.displayName,
            headline: profile.headline || '',
            bio: profile.bio || '',
            skills: profile.skills || [],
            photoURL: profile.photoURL || null,
            linkedinURL: profile.linkedinURL || null,
            cvURL: profile.cvURL || null,
            role: profile.role,
            visibility: profile.visibility,
            isFeatured: profile.isFeatured || false,
            isFoundingMember: profile.isFoundingMember || false,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error('Error auto-syncing public profile:', error);
        }
      };
      sync();
    }
  }, [user, profile]);

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
    bulletListMarker: '-'
  });

  // Remove elements that shouldn't be converted to text (like styles, scripts, etc.)
  turndownService.remove(['style', 'script', 'title', 'meta', 'link']);

  const handleSmartPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, field: 'bio' | 'headline') => {
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    if (html) {
      e.preventDefault();
      const markdown = turndownService.turndown(html);
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editForm[field];
      
      const newText = text.substring(0, start) + markdown + text.substring(end);
      setEditForm({ ...editForm, [field]: newText });
      
      // Update character limits if needed
      if (field === 'headline') {
        setEditForm(prev => ({ ...prev, headline: newText.substring(0, 200) }));
      }
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('bio-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editForm.bio;
    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = before + prefix + selectedText + suffix + after;
    setEditForm({ ...editForm, bio: newText });

    // Refocus and set selection (roughly)
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  useEffect(() => {
    if (!user) return;

    // Listen to user profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        
        // Only update editForm if the user is NOT currently editing
        // to prevent overwriting their unsaved changes
        if (!isEditingRef.current) {
          setEditForm({
            headline: data.headline || '',
            bio: data.bio || '',
            skills: data.skills?.join(', ') || '',
            photoURL: data.photoURL || '',
            linkedinURL: data.linkedinURL || '',
            cvURL: data.cvURL || ''
          });
        }
        
        // Default tab based on role if just loaded
        if (isFirstLoad.current) {
          setActiveTab((data.role === 'recruiter' || data.role === 'employer') ? 'discovery' : 'profile');
          isFirstLoad.current = false;
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));

    // Listen to connections where user is recipient
    const qReceived = query(
      collection(db, 'connections'),
      where('toUid', '==', user.uid)
    );
    
    // Listen to connections where user is sender
    const qSent = query(
      collection(db, 'connections'),
      where('fromUid', '==', user.uid)
    );

    const updateConnections = (received: Connection[], sent: Connection[]) => {
      const all = [...received, ...sent];
      // Sort by date with safety for null timestamps (pending server time)
      all.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || Date.now();
        const timeB = b.createdAt?.toMillis() || Date.now();
        return timeB - timeA;
      });
      setConnections(all);
    };

    let receivedDocs: Connection[] = [];
    let sentDocs: Connection[] = [];

    const unsubReceived = onSnapshot(qReceived, (snap) => {
      receivedDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      updateConnections(receivedDocs, sentDocs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'connections'));

    const unsubSent = onSnapshot(qSent, (snap) => {
      sentDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Connection));
      updateConnections(receivedDocs, sentDocs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'connections'));

    // Listen to discovery (all roles) - Using public_profiles for PII safety
    const discoveryQ = query(
      collection(db, 'public_profiles'),
      where('visibility', 'in', ['active', 'passive'])
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
      unsubReceived();
      unsubSent();
      unsubDiscovery();
      unsubJobs();
    };
  }, [user]);

  // Fetch profiles for connections
  useEffect(() => {
    if (!user || connections.length === 0) return;

    const acceptedUids = connections
      .filter(c => c.status === 'accepted')
      .map(c => c.fromUid === user.uid ? c.toUid : c.fromUid);

    const pendingUids = connections
      .filter(c => c.status === 'pending' && c.toUid === user.uid)
      .map(c => c.fromUid);

    const sentPendingUids = connections
      .filter(c => c.status === 'pending' && c.fromUid === user.uid)
      .map(c => c.toUid);

    const allUids = Array.from(new Set([...acceptedUids, ...pendingUids, ...sentPendingUids]));
    
    const fetchProfiles = async () => {
      const uidsToFetch = allUids.filter(uid => !connectedProfiles[uid]);
      if (uidsToFetch.length === 0) return;

      const profilePromises = uidsToFetch.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'public_profiles', uid));
          if (snap.exists()) {
            return { uid, data: snap.data() as UserProfile };
          }
        } catch (error) {
          console.error(`Error fetching profile for ${uid}:`, error);
        }
        return null;
      });

      const results = await Promise.all(profilePromises);
      const newProfiles: Record<string, UserProfile> = {};
      results.forEach(res => {
        if (res) newProfiles[res.uid] = res.data;
      });

      if (Object.keys(newProfiles).length > 0) {
        setConnectedProfiles(prev => ({ ...prev, ...newProfiles }));
      }
    };

    fetchProfiles();
  }, [connections, user]);

  // Listen to messages for active chat
  useEffect(() => {
    if (!user || !activeChat) {
      setMessages([]);
      return;
    }

    const msgQuery = query(
      collection(db, 'messages'),
      or(
        and(where('senderUid', '==', user.uid), where('receiverUid', '==', activeChat.uid)),
        and(where('senderUid', '==', activeChat.uid), where('receiverUid', '==', user.uid))
      )
    );

    const unsubscribe = onSnapshot(msgQuery, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(all.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || Date.now();
        const timeB = b.createdAt?.toMillis() || Date.now();
        return timeA - timeB;
      }));
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [user, activeChat]);

  const updateVisibility = async (mode: UserProfile['visibility']) => {
    if (!user || !profile) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { ...profile, visibility: mode });
      
      // Sync to public profiles if professional
      if (profile.role === 'professional') {
        const publicRef = doc(db, 'public_profiles', user.uid);
        await setDoc(publicRef, { 
          visibility: mode,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const saveProfile = async (forceConvert = false) => {
    if (!user || !profile) return;
    
    // Check for semicolons or other delimiters if not already confirmed
    const hasAlternativeDelimiters = editForm.skills.includes(';') || editForm.skills.includes('|');
    if (!forceConvert && hasAlternativeDelimiters) {
      setShowSkillsConfirm(true);
      return;
    }

    if (forceConvert) {
      setShowSkillsConfirm(false);
    }

    setIsSaving(true);
    try {
      // Split by comma, semicolon, or pipe to be flexible
      const skillsArray = editForm.skills
        .split(/[,;|]/)
        .map(s => s.trim())
        .filter(s => s !== '');
      
      // Safety check for Firestore size limits and rules (max 50 skills)
      if (skillsArray.length > 50) {
        showToast("Maximum 50 skills allowed", "error");
        setIsSaving(false);
        return;
      }
      
      const updates: Partial<UserProfile> = {
        headline: editForm.headline.substring(0, 200), // Enforce rule limits
        bio: editForm.bio.substring(0, 5000),         // Enforce rule limits
        skills: skillsArray,
        photoURL: editForm.photoURL || null,
        linkedinURL: editForm.linkedinURL || null,
        cvURL: editForm.cvURL || null
      };

      console.log('User UID:', user.uid);
      console.log('Profile Updates:', updates);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, updates);
      
      // Sync to public profiles for discovery and networking (No PII)
      const publicRef = doc(db, 'public_profiles', user.uid);
      await setDoc(publicRef, {
        uid: user.uid,
        displayName: profile.displayName,
        headline: updates.headline || profile.headline,
        bio: updates.bio || profile.bio,
        skills: updates.skills || profile.skills,
        photoURL: updates.photoURL || profile.photoURL,
        linkedinURL: updates.linkedinURL === null ? null : (updates.linkedinURL || (profile.linkedinURL || null)),
        cvURL: updates.cvURL === null ? null : (updates.cvURL || (profile.cvURL || null)),
        role: profile.role,
        visibility: profile.visibility,
        isFeatured: profile.isFeatured || false,
        isFoundingMember: profile.isFoundingMember || false,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsEditing(false);
      showToast("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      
      // Provide more specific feedback
      let errorMessage = "Failed to update profile";
      if (error?.code === 'permission-denied') {
        errorMessage = "Permission denied. Check if your profile data is valid.";
      } else if (error?.message?.includes('quota')) {
        errorMessage = "Storage quota exceeded. Please try again later.";
      }
      
      showToast(errorMessage, "error");
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (Original file can be larger, we will compress during crop)
    if (file.size > 2 * 1024 * 1024) { // 2MB limit for original upload
      showToast("Original photo is too large. Please select an image under 2MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const confirmCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    setUploading(true);
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      setEditForm(prev => ({ ...prev, photoURL: croppedImage }));
      setShowCropper(false);
      setImageToCrop(null);
    } catch (e) {
      console.error('Error cropping image:', e);
      showToast('Failed to crop image. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const postJob = async () => {
    if (!user || !profile) return;
    
    // Validation
    if (!jobForm.title.trim()) return showToast("Please enter a job title", "error");
    if (!jobForm.company.trim()) return showToast("Please enter a company name", "error");
    if (!jobForm.industry) return showToast("Please select an industry", "error");
    if (!jobForm.category) return showToast("Please select a category", "error");
    if (!jobForm.location.trim()) return showToast("Please enter a location", "error");
    if (!jobForm.description.trim()) return showToast("Please enter a job description", "error");

    setIsSaving(true);
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
      showToast("Job posted successfully!");
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
    } catch (error) {
      console.error('Error posting job:', error);
      showToast("Failed to post job listing. Please check your connection.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnection = async (id: string, status: ConnectionStatus) => {
    try {
      const conn = connections.find(c => c.id === id);
      if (!conn) return;
      await updateDoc(doc(db, 'connections', id), { status });
      showToast(status === 'accepted' ? "Connection accepted!" : "Request ignored", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `connections/${id}`);
    }
  };

  const sendMessage = async (attachments?: Attachment[]) => {
    const finalAttachments = attachments || pendingAttachments;
    if (!user || !activeChat || (!newMessage.trim() && finalAttachments.length === 0)) return;

    setIsSendingMessage(true);
    try {
      const msgData: any = {
        senderUid: user.uid,
        receiverUid: activeChat.uid,
        content: newMessage.trim(),
        createdAt: serverTimestamp()
      };

      if (finalAttachments.length > 0) {
        msgData.attachments = finalAttachments;
      }
      
      await setDoc(doc(collection(db, 'messages')), msgData);
      setNewMessage('');
      setPendingAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const sendCV = async () => {
    if (!profile?.cvURL) {
      showToast("Please add a CV link in your profile settings first.", "info");
      return;
    }

    const attachment: Attachment = {
      name: "CV / Resume",
      url: profile.cvURL,
      type: "application/pdf" // Fallback to PDF as most likely
    };

    await sendMessage([attachment]);
    showToast("CV shared with " + activeChat?.displayName);
  };

  const sendConnectionRequest = async (toUid: string) => {
    if (!user || !profile) return;

    // Credit check for recruiters
    if (profile.role === 'recruiter' && profile.subscriptionTier !== 'pro') {
      const currentCredits = profile.connectionCredits || 0;
      if (currentCredits <= 0) {
        showToast("You have run out of connection credits. Upgrade to Pro for unlimited requests!", "error");
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
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            connectionCredits: (profile.connectionCredits || 1) - 1
          });
        } catch (creditError) {
          console.error("Warning: Failed to deduct connection credit:", creditError);
          // We don't fail the whole connection request if just the credit count fails to update
        }
      }

      showToast("Connection request sent!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `connections`);
    }
  };

  const handleUpgrade = async (tier: 'pro' | 'free' | 'one-time') => {
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
      
      let variantId = '';
      
      if (tier === 'one-time') {
        variantId = import.meta.env.VITE_LEMON_SQUEEZY_SINGLE_JOB_VARIANT_ID;
      } else {
        variantId = (profile.role === 'recruiter' || profile.role === 'employer')
          ? import.meta.env.VITE_LEMON_SQUEEZY_PRO_PLAN_VARIANT_ID 
          : import.meta.env.VITE_LEMON_SQUEEZY_FEATURED_BOOST_VARIANT_ID;
      }

      console.log("Selected Variant ID:", variantId);

      if (!variantId) {
        const errorMsg = `Configuration error: Missing Variant ID for ${tier === 'one-time' ? 'Single Job' : profile.role}. Please check your Secrets.`;
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
      showToast("Account deletion requested. In a production app, all your data would be wiped now.", "info");
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

  const filteredDiscovery = discoveryUsers.filter(u => {
    // 1. Hide people we already have an active or pending relationship with
    // This keeps the Discovery feed focused on finding NEW talent and opportunities.
    const hasActiveOrPending = connections.some(c => 
      (c.fromUid === u.uid || c.toUid === u.uid) && 
      (c.status === 'accepted' || c.status === 'pending')
    );
    if (hasActiveOrPending) return false;

    // 2. Role-based visibility rules:
    // Professionals: Visible to everyone if 'Active'. Visible to recruiters if 'Passive'.
    // Recruiters/Employers: Always visible if 'Active' or 'Passive' to ensure discoverability.
    
    const isProfessional = u.role === 'professional';
    const amRecruiterOrEmployer = profile.role === 'recruiter' || profile.role === 'employer';

    if (u.visibility === 'hidden') return false;
    
    if (u.visibility === 'passive') {
      // Professionals in passive mode are only visible to their connections (already handles in Network)
      // UNLESS searching/browsing as an Employer/Recruiter who needs to find them
      if (isProfessional && amRecruiterOrEmployer) {
        return true; // Allow employers to find talent
      }
      
      // Since we filtered existing connections at the start, 
      // other professionals in passive mode are hidden from this view.
      return false;
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return u.displayName?.toLowerCase().includes(query) ||
           u.headline?.toLowerCase().includes(query) ||
           u.skills?.some(s => s.toLowerCase().includes(query));
  });

  return (
    <>
      {/* Photo Cropper Modal */}
      <AnimatePresence>
        {showCropper && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Adjust Profile Photo</h3>
                <button onClick={() => setShowCropper(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="relative h-80 bg-slate-100">
                {imageToCrop && (
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    cropShape="round"
                    showGrid={false}
                  />
                )}
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>Zoom</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCropper(false)}
                    className="flex-1 px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCrop}
                    disabled={uploading}
                    className="flex-1 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[120] lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <span className="font-bold text-slate-900">TalentFabric</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <CloseIcon size={24} className="text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col items-center p-4 rounded-3xl bg-slate-50 border border-slate-100 mb-6">
                  {profile.photoURL ? (
                    <div className="h-20 w-20 rounded-full border-4 border-white shadow-sm overflow-hidden mb-3 bg-white shrink-0">
                      <img src={profile.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : null}
                  <h3 className="font-bold text-slate-900">{profile.displayName}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{profile.role}</p>
                </div>

                <div className="space-y-1">
                  <MobileTabButton 
                    active={activeTab === 'discovery'} 
                    onClick={() => { setActiveTab('discovery'); setIsMobileMenuOpen(false); }}
                    icon={<Search size={20} />}
                    label="Discovery"
                    hidden={profile.role === 'professional'}
                  />
                  <MobileTabButton 
                    active={activeTab === 'profile'} 
                    onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                    icon={<UserIcon size={20} />}
                    label="My Profile"
                    hidden={profile.role !== 'professional'}
                  />
                  <MobileTabButton 
                    active={activeTab === 'network'} 
                    onClick={() => { setActiveTab('network'); setIsMobileMenuOpen(false); }}
                    icon={<MessageSquare size={20} />}
                    label="Network"
                    badge={connections.filter(c => c.status === 'pending').length}
                  />
                  <MobileTabButton 
                    active={activeTab === 'jobs'} 
                    onClick={() => { setActiveTab('jobs'); setIsMobileMenuOpen(false); }}
                    icon={<ClipboardList size={20} />}
                    label="Job Board"
                  />
                  <MobileTabButton 
                    active={activeTab === 'insights'} 
                    onClick={() => { setActiveTab('insights'); setIsMobileMenuOpen(false); }}
                    icon={<Building2 size={20} />}
                    label="Employer Insights"
                  />
                  <div className="h-px bg-slate-100 my-4" />
                  <MobileTabButton 
                    active={activeTab === 'pricing'} 
                    onClick={() => { setActiveTab('pricing'); setIsMobileMenuOpen(false); }}
                    icon={<CreditCard size={20} />}
                    label="Plans & Billing"
                  />
                  <MobileTabButton 
                    active={activeTab === 'settings'} 
                    onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                    icon={<Settings size={20} />}
                    label="Settings"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-4 z-50">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-50 text-slate-600 active:scale-95 transition-all"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
              <Users size={18} />
            </div>
            <span className="font-bold text-slate-900">TalentFabric</span>
          </div>
          <button 
            onClick={() => setActiveTab('profile')}
            className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm shrink-0"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                <UserIcon size={18} />
              </div>
            )}
          </button>
        </div>

      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-4">
        {/* Desktop Sidebar (hidden on mobile) */}
        <aside className="hidden lg:block space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4 overflow-hidden border-4 border-white shadow-md shrink-0">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName || ''} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                      <UserIcon size={48} />
                    </div>
                  )}
                </div>
                {activeTab === 'profile' && isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer mb-4">
                    <Camera className="text-white" size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
                {profile.displayName}
                {profile.isFoundingMember && (
                  <Shield size={18} className="text-indigo-600" />
                )}
                {profile.subscriptionTier === 'pro' && (profile.role === 'recruiter' || profile.role === 'employer') && (
                  <Crown size={18} className="text-amber-500" />
                )}
                {profile.isFeatured && profile.role === 'professional' && (
                  <Zap size={18} className="text-indigo-500" />
                )}
              </h2>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                {profile.role}
                {profile.subscriptionTier === 'pro' && ' • PRO'}
              </p>
              <p className="text-sm text-slate-500">
                {profile.headline || (
                  profile.role === 'employer' ? 'Company Lead' : 
                  profile.role === 'recruiter' ? 'Talent Architect' : 
                  'Professional Expert'
                )}
              </p>
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
                    showToast('Referral code copied!');
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
              {(profile.role === 'professional' || profile.role === 'recruiter' || profile.role === 'employer') && (
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
                className="h-[calc(100vh-12rem)] min-h-[500px]"
              >
                <div className="flex h-full gap-6">
                  {/* Left Sidebar: Requests & Connections */}
                  <div className={`flex flex-col gap-6 ${activeChat ? 'hidden lg:flex w-80' : 'w-full lg:w-80'} shrink-0 overflow-y-auto pr-2 custom-scrollbar`}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Networking</h2>
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {connections.filter(c => c.status === 'accepted').length} Connected
                        </span>
                      </div>
                      
                      {/* Incoming Invites Section */}
                      {connections.filter(c => c.status === 'pending' && c.toUid === user.uid).length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Incoming Invites</p>
                          {connections.filter(c => c.status === 'pending' && c.toUid === user.uid).map((conn) => {
                            const sender = connectedProfiles[conn.fromUid];
                            return (
                              <div key={conn.id} className="group rounded-2xl bg-white p-4 shadow-sm border border-indigo-100 flex items-center gap-3 hover:border-indigo-200 transition-all">
                                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0 border border-indigo-100">
                                  {sender?.photoURL ? (
                                    <img src={sender.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <UserCircle size={18} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {sender?.displayName || 'New Member'}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {sender?.headline || (sender?.role === 'professional' ? 'Talent' : 'Hiring Team')}
                                  </p>
                                </div>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleConnection(conn.id, 'accepted')}
                                    className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"
                                    title="Accept"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleConnection(conn.id, 'rejected')}
                                    className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    title="Reject"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                <div className="flex gap-1.5 group-hover:hidden">
                                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Sent Invites Section */}
                      {connections.filter(c => c.status === 'pending' && c.fromUid === user.uid).length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Sent Invites</p>
                          {connections.filter(c => c.status === 'pending' && c.fromUid === user.uid).map((conn) => {
                            const recipient = connectedProfiles[conn.toUid];
                            return (
                              <div key={conn.id} className="rounded-2xl bg-white/40 p-4 border border-slate-100 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-300 overflow-hidden shrink-0 border border-slate-100">
                                  {recipient?.photoURL ? (
                                    <img src={recipient.photoURL} alt="" className="h-full w-full object-cover opacity-60" referrerPolicy="no-referrer" />
                                  ) : (
                                    <UserCircle size={18} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-600 truncate">
                                    {recipient?.displayName || 'Loading...'}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <Clock size={10} className="text-amber-500" />
                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                                      Awaiting acceptance
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleConnection(conn.id, 'rejected')}
                                  className="h-7 w-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title="Cancel Request"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Conversations List */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">My Connections</p>
                        {connections.filter(c => c.status === 'accepted').length === 0 ? (
                          <div className="rounded-2xl bg-white/50 border border-dashed border-slate-200 p-8 text-center">
                            <Users size={24} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-xs text-slate-500">No active connections. Visit Discovery to find talent!</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {connections.filter(c => c.status === 'accepted').map((conn) => {
                              const otherUid = conn.fromUid === user.uid ? conn.toUid : conn.fromUid;
                              const contact = connectedProfiles[otherUid];
                              const isActive = activeChat?.uid === otherUid;
                              
                              return (
                                <button 
                                  key={conn.id}
                                  onClick={() => setActiveChat(contact || null)}
                                  className={`w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-all border ${
                                    isActive 
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                                      : 'bg-white text-slate-900 border-transparent hover:border-slate-200'
                                  }`}
                                >
                                  <div className={`h-11 w-11 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 ${isActive ? 'border-white/20' : 'border-slate-50 bg-slate-50 text-slate-400'}`}>
                                    {contact?.photoURL ? (
                                      <img src={contact.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <UserIcon size={20} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <p className="text-sm font-bold truncate pr-2">
                                        {contact?.displayName || 'Loading...'}
                                      </p>
                                      {contact?.role === 'employer' && (
                                        <Building2 size={12} className={isActive ? 'text-white/60' : 'text-slate-400'} />
                                      )}
                                      {contact?.role === 'recruiter' && (
                                        <Shield size={12} className={isActive ? 'text-white/60' : 'text-indigo-400'} />
                                      )}
                                    </div>
                                    <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                                      {contact?.headline || (contact?.role === 'professional' ? 'Talent' : 'Hiring Team')}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Chat Window */}
                  <div className={`flex flex-col flex-1 rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm relative ${!activeChat && 'hidden lg:flex items-center justify-center'}`}>
                    {activeChat ? (
                      <>
                        {/* Chat Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setActiveChat(null)}
                              className="lg:hidden p-2 -ml-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            >
                              <ArrowLeft size={20} />
                            </button>
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden text-slate-400">
                                {activeChat.photoURL ? (
                                  <img src={activeChat.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <UserIcon size={18} />
                                )}
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow-sm" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">{activeChat.displayName}</h3>
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                  activeChat.role === 'employer' 
                                    ? 'bg-amber-50 text-amber-600' 
                                    : activeChat.role === 'recruiter'
                                      ? 'bg-indigo-50 text-indigo-600'
                                      : 'bg-slate-50 text-slate-500'
                                }`}>
                                  {activeChat.role}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">Online</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                              <MoreVertical size={20} />
                            </button>
                          </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                          {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto space-y-3 opacity-60">
                              <div className="p-4 rounded-3xl bg-indigo-50 text-indigo-500">
                                <MessageSquare size={32} />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-900">Direct Message</h3>
                                <p className="text-xs text-slate-500">Say hello to {activeChat.displayName.split(' ')[0]} and start your professional conversation.</p>
                              </div>
                            </div>
                          ) : (
                            messages.map((msg, i) => {
                              const isMe = msg.senderUid === user.uid;
                              const showAvatar = i === 0 || messages[i-1].senderUid !== msg.senderUid;
                              
                              return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2`}>
                                  {!isMe && showAvatar && (
                                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 mb-1">
                                      {activeChat.photoURL ? (
                                        <img src={activeChat.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <UserIcon size={12} className="text-slate-400" />
                                      )}
                                    </div>
                                  )}
                                  {!isMe && !showAvatar && <div className="w-6 shrink-0" />}
                                  
                                  <div className={`max-w-[75%] space-y-1`}>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm space-y-2 ${
                                      isMe 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                                    }`}>
                                      {msg.content && <p>{msg.content}</p>}
                                      {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="space-y-1 pt-1">
                                          {msg.attachments.map((at, idx) => (
                                            <a 
                                              key={idx}
                                              href={at.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`flex items-center gap-2 p-2 rounded-xl transition-all border ${
                                                isMe 
                                                  ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                                                  : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                              }`}
                                            >
                                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>
                                                <FileText size={16} />
                                              </div>
                                              <div className="flex-1 min-w-0 pr-2">
                                                <p className={`text-[10px] font-bold truncate ${isMe ? 'text-white' : 'text-slate-900'}`}>{at.name}</p>
                                                <p className={`text-[9px] ${isMe ? 'text-white/60' : 'text-slate-500'}`}>Click to open</p>
                                              </div>
                                              <Download size={12} className={isMe ? 'text-white/40' : 'text-slate-400'} />
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <p className={`text-[9px] font-medium text-slate-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                      {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-100 bg-white">
                          {/* Pending Attachments Preview */}
                          <AnimatePresence>
                            {pendingAttachments.length > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex flex-wrap gap-2 mb-3"
                              >
                                {pendingAttachments.map((at, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 pl-3 pr-1 py-1 rounded-xl group">
                                    <div className="flex items-center gap-2">
                                      <FileText size={14} className="text-indigo-600" />
                                      <span className="text-[10px] font-bold text-indigo-700 max-w-[100px] truncate">{at.name}</span>
                                    </div>
                                    <button 
                                      onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                                      className="p-1 text-indigo-300 hover:text-indigo-600 transition-colors"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {profile?.cvURL && (
                                <button 
                                  onClick={sendCV}
                                  disabled={isSendingMessage}
                                  className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 transition-all flex items-center justify-center shrink-0 group relative"
                                  title="Share My CV"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 transition-transform group-hover:scale-110" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <path d="M12 18v-6"/>
                                    <path d="m9 15 3 3 3-3"/>
                                  </svg>
                                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    Attach My CV
                                  </span>
                                </button>
                              )}
                              <button 
                                onClick={() => setShowAttachmentModal(true)}
                                disabled={isSendingMessage}
                                className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 transition-all flex items-center justify-center shrink-0 group relative"
                                title="Attach External Link"
                              >
                                <Paperclip size={20} className="transition-transform group-hover:scale-110" />
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  Attach Link
                                </span>
                              </button>
                            </div>

                            <div className="flex-1 relative">
                              <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                  }
                                }}
                                placeholder="Write a message..." 
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                              />
                              <button 
                                onClick={() => sendMessage()}
                                disabled={(!newMessage.trim() && pendingAttachments.length === 0) || isSendingMessage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                              >
                                {isSendingMessage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              </button>
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-2 text-center font-medium">
                            Use links to share external docx or pdf resumes.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-6 max-w-sm mx-auto p-12">
                        <div className="mx-auto h-24 w-24 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-200 relative">
                          <MessageSquare size={48} className="translate-y-1" />
                          <Zap size={24} className="absolute top-2 right-2 text-indigo-400 animate-pulse fill-indigo-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-slate-900">Direct Messages</h3>
                          <p className="text-sm text-slate-500 leading-relaxed">
                            Once your connection requests are accepted, you can start direct conversations with hiring managers and recruiters.
                          </p>
                        </div>
                        <div className="pt-4">
                          <button 
                            onClick={() => setActiveTab('discovery')}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                          >
                            <Search size={18} />
                            Grow Your Circle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : (isEditing ? <Save size={18} /> : <Edit2 size={18} />)}
                    <span>{isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Edit Profile')}</span>
                  </button>
                </div>

                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200 space-y-10">
                  <div className="space-y-4">
                    <label className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                      Headline
                    </label>
                    {isEditing ? (
                      <textarea 
                        value={editForm.headline}
                        onChange={(e) => {
                          setEditForm({ ...editForm, headline: e.target.value.substring(0, 200) });
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onPaste={(e) => handleSmartPaste(e, 'headline')}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[44px]"
                        placeholder="e.g. Senior Software Engineer at TechCorp"
                        rows={1}
                      />
                    ) : (
                      <div className="text-slate-700 prose-sm prose-slate">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {profile.headline || 'No headline set'}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                      Professional Bio
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-auto px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 italic font-sans">Markdown supported</span>
                    </label>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1 border-b border-slate-100 pb-2">
                          <button 
                            onClick={() => insertMarkdown('**', '**')}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Bold"
                          >
                            <span className="font-bold text-sm">B</span>
                          </button>
                          <button 
                            onClick={() => insertMarkdown('_', '_')}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Italic"
                          >
                            <span className="italic font-serif text-sm">I</span>
                          </button>
                          <div className="w-px h-4 bg-slate-200 mx-1" />
                          <button 
                            onClick={() => insertMarkdown('\n### ')}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Heading"
                          >
                            <span className="font-bold text-xs">H3</span>
                          </button>
                          <button 
                            onClick={() => insertMarkdown('\n- ')}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Bullet List"
                          >
                            <span className="text-sm">• List</span>
                          </button>
                          <button 
                            onClick={() => insertMarkdown('[', '](url)')}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors ml-auto"
                            title="Link"
                          >
                            <span className="text-xs font-mono underline">link</span>
                          </button>
                        </div>
                        <textarea 
                          id="bio-editor"
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          onPaste={(e) => handleSmartPaste(e, 'bio')}
                          className="w-full h-48 rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono"
                          placeholder="Tell recruiters about your experience and what you're looking for... (Markdown supported)"
                        />
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preview</p>
                          <div className="prose prose-slate prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editForm.bio || '*No bio content*'}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                        {profile.bio ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{profile.bio}</ReactMarkdown>
                        ) : (
                          <p className="italic text-slate-400">Add a bio to help recruiters understand your background.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                      Professional Links
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* LinkedIn URL */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">LinkedIn Profile</p>
                        {isEditing ? (
                          <div className="relative">
                            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="url"
                              value={editForm.linkedinURL}
                              onChange={(e) => setEditForm({ ...editForm, linkedinURL: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="https://linkedin.com/in/yourprofile"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 h-11 px-4 bg-slate-50 rounded-xl border border-slate-100">
                            {profile.linkedinURL ? (
                              <a 
                                href={profile.linkedinURL} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors group"
                              >
                                <Linkedin size={18} className="group-hover:scale-110 transition-transform" />
                                <span>LinkedIn Profile</span>
                              </a>
                            ) : (
                              <p className="text-slate-400 text-sm italic">Not linked</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CV / Resume URL */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">CV / Resume Link</p>
                        {isEditing ? (
                          <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="url"
                              value={editForm.cvURL}
                              onChange={(e) => setEditForm({ ...editForm, cvURL: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="Link to Google Drive, Dropbox, etc."
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 h-11 px-4 bg-slate-50 rounded-xl border border-slate-100">
                            {profile.cvURL ? (
                              <a 
                                href={profile.cvURL} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors group"
                              >
                                <FileText size={18} className="group-hover:scale-110 transition-transform" />
                                <span>View CV / Resume</span>
                              </a>
                            ) : (
                              <p className="text-slate-400 text-sm italic">No CV linked</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                      Skills
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-auto px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 italic font-sans truncate">comma separated</span>
                    </label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input 
                          type="text"
                          value={editForm.skills}
                          onChange={(e) => {
                            setEditForm({ ...editForm, skills: e.target.value });
                            setSkillsWarning(e.target.value.includes(';') || e.target.value.includes('|'));
                          }}
                          className={`w-full rounded-xl border p-3 text-sm focus:ring-2 outline-none transition-all ${
                            skillsWarning ? 'border-amber-400 focus:ring-amber-500 bg-amber-50' : 'border-slate-200 focus:ring-indigo-500'
                          }`}
                          placeholder="React, TypeScript, Node.js, AWS..."
                        />
                        {skillsWarning && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[11px] font-medium text-amber-600 flex items-center gap-1"
                          >
                            <AlertTriangle size={12} />
                            Please use commas to separate skills (e.g. React, Node.js)
                          </motion.p>
                        )}
                      </div>
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
                  {discoveryUsers.length === 0 ? (
                    <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center bg-white/50">
                      <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                        <Search size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">No members found</h3>
                      <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        Users must set their visibility to <strong>Active</strong> to appear in discovery. 
                        Once you connect, they remain visible to you even in <strong>Passive</strong> mode.
                      </p>
                    </div>
                  ) : filteredDiscovery.length === 0 ? (
                    <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center bg-white/50">
                      <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                        <Search size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">No matches found</h3>
                      <p className="text-slate-500 mt-2">No members matched your search for "{searchQuery}". Try a broader term.</p>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="mt-4 text-indigo-600 font-bold hover:underline"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    filteredDiscovery.map((p) => (
                      <div key={p.uid} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 border border-slate-100 shadow-sm hidden sm:flex">
                              {p.photoURL ? (
                                <img src={p.photoURL} alt={p.displayName || ''} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <UserIcon size={24} />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900">{p.displayName}</h3>
                                {p.visibility === 'passive' && (
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-wider">Passive</span>
                                )}
                                {p.isFeatured && (
                                  <Zap size={14} className="text-indigo-500 fill-indigo-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-xs text-slate-500">
                                  {p.headline || (
                                    p.role === 'employer' ? 'Company Lead' : 
                                    p.role === 'recruiter' ? 'Talent Architect' : 
                                    'Professional'
                                  )}
                                </p>
                                {p.linkedinURL && (
                                  <a 
                                    href={p.linkedinURL} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    title="LinkedIn Profile"
                                  >
                                    <Linkedin size={14} />
                                  </a>
                                )}
                                {p.cvURL && (
                                  <a 
                                    href={p.cvURL} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    title="View CV / Resume"
                                  >
                                    <FileText size={14} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          {(() => {
                            const conn = connections.find(c => c.fromUid === p.uid || c.toUid === p.uid);
                            if (conn?.status === 'accepted') {
                              return (
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                  <Check size={16} />
                                  <span className="text-xs font-bold font-sans">Connected</span>
                                </div>
                              );
                            }
                            if (conn?.status === 'pending') {
                              return (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                                  <Loader2 size={16} className="animate-spin" />
                                  <span className="text-xs font-bold font-sans">Pending</span>
                                </div>
                              );
                            }
                            return (
                              <button 
                                onClick={() => sendConnectionRequest(p.uid)}
                                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                title="Send Connection Request"
                              >
                                <Plus size={20} />
                              </button>
                            );
                          })()}
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

            {activeTab === 'insights' && (profile.role === 'professional' || profile.role === 'recruiter' || profile.role === 'employer') && (
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {(profile.role === 'recruiter' || profile.role === 'employer') ? 'Manage Job Postings' : 'Open Opportunities'}
                  </h2>
                  {(profile.role === 'recruiter' || profile.role === 'employer') && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {profile.subscriptionTier === 'free' && (
                        <button 
                          onClick={() => setActiveTab('pricing')}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-6 py-3.5 text-sm font-bold text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all w-full sm:w-auto"
                        >
                          <Zap size={18} />
                          Upgrade to Pro
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const myJobsCount = jobs.filter(j => j.recruiterUid === user.uid).length;
                          if (profile.subscriptionTier === 'free' && myJobsCount >= 1) {
                            showToast("Free plan is limited to 1 job listing. Upgrade to Pro for unlimited postings!", "info");
                            setActiveTab('pricing');
                          } else {
                            setIsPostingJob(true);
                          }
                        }}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all w-full sm:w-auto"
                      >
                        <Plus size={20} />
                        Post a Job
                      </button>
                    </div>
                  )}
                </div>

                {profile.role !== 'professional' && profile.subscriptionTier === 'free' && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-900">Free Tier Limit</p>
                      <p className="text-xs text-amber-700">You are on the Free plan. You can have 1 active job listing. <button onClick={() => setActiveTab('pricing')} className="font-bold underline hover:text-amber-800 transition-colors">Upgrade to Pro</button> for unlimited hiring.</p>
                    </div>
                  </div>
                )}

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
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
                              {job.isFoundingMember && (
                                <Shield size={16} className="text-indigo-600" />
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
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
                            <button className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
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
              className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl max-h-[95vh] overflow-y-auto"
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
                      <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                      <option value="Furniture & Interior">Furniture & Interior</option>
                      <option value="Construction">Construction</option>
                      <option value="Hospitality">Hospitality</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Logistics">Logistics</option>
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
                      <option value="Skilled Trades">Skilled Trades</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Administration">Administration</option>
                      <option value="Logistics">Logistics</option>
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
                    disabled={isSaving}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 size={18} className="animate-spin" />}
                    <span>{isSaving ? 'Posting...' : 'Post Job Listing'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Skills Format Confirmation Modal */}
      <AnimatePresence>
        {showSkillsConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSkillsConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Check Skills Format</h3>
              <p className="text-slate-600 text-center mb-8">
                It looks like you've used semicolons (;) or other characters instead of commas for your skills. 
                Would you like us to automatically convert them to commas for you?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => saveProfile(true)}
                  className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Yes, Convert & Save
                </button>
                <button 
                  onClick={() => setShowSkillsConfirm(false)}
                  className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                >
                  No, Let Me Fix It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attachment Modal */}
      <AnimatePresence>
        {showAttachmentModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttachmentModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Attach Prof. Link</h3>
                <button 
                  onClick={() => setShowAttachmentModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Link Name / Title</label>
                  <div className="relative">
                    <Edit2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Portfolio PDF, Draft Resume"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">External URL</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="url" 
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowAttachmentModal(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (!newAttachmentUrl || !newAttachmentName) {
                      showToast("Please provide both a name and a link", "error");
                      return;
                    }
                    setPendingAttachments(prev => [...prev, {
                      name: newAttachmentName,
                      url: newAttachmentUrl,
                      type: 'link'
                    }]);
                    setNewAttachmentName('');
                    setNewAttachmentUrl('');
                    setShowAttachmentModal(false);
                  }}
                  className="flex-1 rounded-2xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  Add Attachment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[200] flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' && <Check size={20} />}
            {toast.type === 'error' && <X size={20} />}
            {toast.type === 'info' && <Shield size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200 px-6 py-3 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {profile.role === 'professional' ? (
            <BottomNavItem 
              active={activeTab === 'profile'} 
              onClick={() => setActiveTab('profile')}
              icon={<UserIcon size={20} />}
              label="Profile"
            />
          ) : (
            <BottomNavItem 
              active={activeTab === 'discovery'} 
              onClick={() => setActiveTab('discovery')}
              icon={<Search size={20} />}
              label="Explore"
            />
          )}
          <BottomNavItem 
            active={activeTab === 'network'} 
            onClick={() => setActiveTab('network')}
            icon={<MessageSquare size={20} />}
            label="Network"
            badge={connections.filter(c => c.status === 'pending').length}
          />
          <BottomNavItem 
            active={activeTab === 'jobs'} 
            onClick={() => setActiveTab('jobs')}
            icon={<ClipboardList size={20} />}
            label="Jobs"
          />
          <BottomNavItem 
            active={activeTab === 'insights'} 
            onClick={() => setActiveTab('insights')}
            icon={<Building2 size={20} />}
            label="Insights"
          />
        </div>
      </nav>
    </div>
    </>
  );
}

function MobileTabButton({ active, onClick, icon, label, hidden, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, hidden?: boolean, badge?: number }) {
  if (hidden) return null;
  return (
    <button 
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all active:scale-95 ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <div className={`${active ? 'text-white' : 'text-slate-400'}`}>
        {icon}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 ? (
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${active ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function BottomNavItem({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 relative ${
        active ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      <div className={`p-2 rounded-2xl transition-colors ${active ? 'bg-indigo-50' : 'bg-transparent'}`}>
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute top-1 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white border-2 border-white">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
