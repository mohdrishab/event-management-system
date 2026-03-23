import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, LeaveApplication, ApplicationStatus } from '../types';
import { storageService } from '../services/storageService';
import { generateLeaveReason, improveWriting, makeProfessional, shortenText } from '../services/geminiService';
import { Button } from '../components/Button';
import { Calendar, Clock, CheckCircle, XCircle, Sparkles, LogOut, ArrowRight, BarChart3, Hourglass, CalendarDays, Camera, X, ZoomIn, ZoomOut, Move, Loader2, Bell, FileText, Compass, User as UserIcon, Award, MapPin, Building, ChevronDown, Wand2, Edit3, Trash2 } from 'lucide-react';
import { format, differenceInDays, isFuture } from 'date-fns';
import { certificateService, isCertificatesFeatureEnabled } from '../modules/certificates/certificateService';
import { eligibilityService } from '../modules/certificates/eligibilityService';
import type { CertificateView } from '../modules/certificates/certificateTypes';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

const EVENT_TYPES = ['Hackathon', 'Workshop', 'Seminar', 'Competition', 'Conference', 'Other'];

export const safeDate = (dateString: string | undefined) => {
  if (!dateString) return new Date();
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
};

// Simple internal Modal Component for Cropper
const ProfileCropperModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64Image: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                setZoom(1);
                setOffset({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handlePointerUp = () => setIsDragging(false);

    const handleSave = () => {
        if (!imageRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 450;
        canvas.height = 600;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = imageRef.current;
        const scaleFactor = 1.5; 
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
        
        const aspect = img.naturalWidth / img.naturalHeight;
        let drawWidth = canvas.width;
        let drawHeight = canvas.width / aspect;

        if (drawHeight < canvas.height) {
            drawHeight = canvas.height;
            drawWidth = canvas.height * aspect;
        }

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        onSave(canvas.toDataURL('image/jpeg', 0.9));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Update Profile Photo</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    {!imageSrc ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-64 flex flex-col items-center justify-center gap-4 hover:bg-gray-100 transition-colors relative">
                             <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                             <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center">
                                 <Camera className="w-8 h-8" />
                             </div>
                             <p className="text-gray-500 text-sm font-medium">Click to upload photo</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative w-[300px] h-[400px] bg-gray-900 overflow-hidden rounded-lg shadow-inner ring-4 ring-orange-100">
                                <img 
                                    ref={imageRef}
                                    src={imageSrc} 
                                    alt="Upload" 
                                    className="absolute max-w-none origin-center select-none"
                                    style={{
                                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                                        left: '50%',
                                        top: '50%',
                                        cursor: isDragging ? 'grabbing' : 'grab'
                                    }}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    draggable={false}
                                />
                                <div className="absolute inset-0 pointer-events-none border border-white/20">
                                    <div className="w-full h-1/3 border-b border-white/20"></div>
                                    <div className="w-full h-1/3 border-b border-white/20 top-1/3 absolute"></div>
                                    <div className="h-full w-1/3 border-r border-white/20 left-0 absolute top-0"></div>
                                    <div className="h-full w-1/3 border-r border-white/20 right-1/3 absolute top-0"></div>
                                </div>
                            </div>

                            <div className="w-full px-4 space-y-2">
                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                    <span>Zoom</span>
                                    <span>{Math.round(zoom * 100)}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ZoomOut className="w-4 h-4 text-gray-400" />
                                    <input 
                                        type="range" 
                                        min="0.5" 
                                        max="3" 
                                        step="0.1" 
                                        value={zoom} 
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="w-full accent-orange-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <ZoomIn className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                                    <Move className="w-3 h-3" /> Drag image to position
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex gap-3">
                    {imageSrc && (
                         <Button variant="ghost" onClick={() => setImageSrc(null)} className="flex-1">Change Image</Button>
                    )}
                    <Button variant="primary" onClick={handleSave} disabled={!imageSrc} className="flex-1">Save Profile Photo</Button>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState(initialUser);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  
  // Form State
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventType, setEventType] = useState('Hackathon');
  const [organizedBy, setOrganizedBy] = useState('');
  const [reason, setReason] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | ApplicationStatus>('ALL');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'EXPLORE' | 'PROFILE' | 'CERTIFICATES'>('DASHBOARD');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [certificatesEnabled, setCertificatesEnabled] = useState(false);
  const [certificatesFeatureLoading, setCertificatesFeatureLoading] = useState(true);

  const [certificates, setCertificates] = useState<CertificateView[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [uploadingCertificateForAppId, setUploadingCertificateForAppId] = useState<string | null>(null);
  const [uploadableApplications, setUploadableApplications] = useState<Record<string, any>[]>([]);
  const [uploadableLoading, setUploadableLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const enabled = await isCertificatesFeatureEnabled();
        if (!cancelled) setCertificatesEnabled(enabled);
      } catch (err) {
        console.error('Failed to check certificates feature flag', err);
        if (!cancelled) setCertificatesEnabled(false);
      } finally {
        if (!cancelled) setCertificatesFeatureLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadApplications();
  }, [user.id]);

  const loadCertificates = async () => {
    if (!certificatesEnabled) return;
    setCertificatesLoading(true);
    try {
      const list = await certificateService.getStudentCertificates(user.id);
      setCertificates(list);
    } catch (error) {
      console.error('Failed to load certificates', error);
    } finally {
      setCertificatesLoading(false);
    }
  };

  const loadUploadableApplications = async () => {
    if (!certificatesEnabled) return;
    setUploadableLoading(true);
    try {
      const list = await certificateService.getUploadableApplications(user.id);
      setUploadableApplications(list);
    } catch (error) {
      console.error('Failed to load uploadable applications', error);
    } finally {
      setUploadableLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const myApps = await storageService.getStudentApplications(user.id);
      setApplications(myApps);
      await loadCertificates();
    } catch (error) {
      console.error("Failed to load applications", error);
    }
  };

  useEffect(() => {
    if (!certificatesFeatureLoading && certificatesEnabled) {
      void loadCertificates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificatesEnabled, certificatesFeatureLoading, user.id]);

  useEffect(() => {
    if (!certificatesFeatureLoading && certificatesEnabled) {
      void loadUploadableApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificatesEnabled, certificatesFeatureLoading, user.id, certificates]);

  const handleAiAction = async (action: 'generate' | 'improve' | 'professional' | 'shorten') => {
    if (action === 'generate' && (!eventName || !startDate || !endDate)) {
      alert("Please enter Event Name and Date Range first to generate a draft.");
      return;
    }
    if (action !== 'generate' && !reason) {
      alert("Please enter some text in the Statement of Purpose first.");
      return;
    }

    setIsGenerating(true);
    setShowAiMenu(false);
    try {
      let result = '';
      switch (action) {
        case 'generate':
          result = await generateLeaveReason(eventName, startDate, endDate, user.name);
          break;
        case 'improve':
          result = await improveWriting(reason);
          break;
        case 'professional':
          result = await makeProfessional(reason);
          break;
        case 'shorten':
          result = await shortenText(reason);
          break;
      }
      setReason(result);
    } catch (error) {
      console.error("AI Action failed", error);
      alert("Failed to process text with AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !startDate || !endDate || !reason || !eventLocation || !organizedBy) return;

    if (safeDate(startDate) > safeDate(endDate)) {
        alert("End date cannot be before start date");
        return;
    }
    
    try {
      const eligibility = await eligibilityService.checkStudentEligibilityForNewEvent({
        studentId: user.id,
      });
      if (!eligibility.eligible) {
        alert(eligibility.reason || 'You are not eligible to apply for this event.');
        return;
      }
    } catch (err: any) {
      console.error('Eligibility check failed', err);
      alert(err?.message || 'Failed to check eligibility for this event.');
      return;
    }

    setIsSubmitting(true);

    try {
        await storageService.saveApplication({
          student_id: user.id,
          event_name: eventName,
          start_date: startDate,
          end_date: endDate,
          eventLocation,
          eventType,
          organizedBy,
          reason,
        });
        setEventName('');
        setStartDate('');
        setEndDate('');
        setEventLocation('');
        setEventType('Hackathon');
        setOrganizedBy('');
        setReason('');
        await loadApplications();
        alert("Application submitted successfully!");
    } catch (error: any) {
        console.error("Submission failed:", error);
        alert(`Failed to submit application: ${error.message || 'Unknown error'}`);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleWithdraw = async (appId: string) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      try {
        await storageService.updateApplicationStatus(appId, 'REJECTED'); // Or a new 'WITHDRAWN' status if added to types
        await loadApplications();
      } catch (error) {
        console.error("Failed to withdraw", error);
        alert("Failed to withdraw application");
      }
    }
  };

  const handleCertificateUpload = async (applicationId: string, file: File) => {
    if (!certificatesEnabled) return;
    setUploadingCertificateForAppId(applicationId);
    try {
      const existing = certificates.find(c => c.applicationId === applicationId) || null;

      if (existing?.status === 'approved' && !existing.fileMissing) {
        throw new Error('This application already has an approved certificate.');
      }

        if (existing?.status === 'rejected' || existing?.status === 'revoked') {
        await certificateService.reuploadCertificate({ studentId: user.id, applicationId, file });
      } else {
        // For missing / pending certificates, upload will upsert/overwrite to `pending`.
        await certificateService.uploadCertificate({ studentId: user.id, applicationId, file });
      }

      await loadCertificates();
        await loadUploadableApplications();
      alert('Certificate uploaded successfully.');
    } catch (err: any) {
      console.error('Certificate upload failed', err);
      alert(err?.message || 'Failed to upload certificate.');
    } finally {
      setUploadingCertificateForAppId(null);
    }
  };

  const handleProfileSave = async (base64Image: string) => {
      const updatedUser = { ...user, profilePic: base64Image };
      try {
        await storageService.updateUser(updatedUser);
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Failed to update profile", error);
        alert("Failed to update profile picture");
      }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Approved</span>;
      case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>;
      default: return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200"><Clock className="w-3 h-3 mr-1"/> Pending</span>;
    }
  };

  const getCertificateStatusBadge = (status?: string) => {
    switch (String(status || '').toUpperCase()) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle className="w-3 h-3 mr-1" /> Revoked
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
            <Hourglass className="w-3 h-3 mr-1" /> Pending
          </span>
        );
    }
  };

  const requiresCertificateForEvent = (_eventType?: string | null) => {
    // Certificates apply to all event types (when the module is enabled).
    return certificatesEnabled;
  };

  const getDuration = () => {
    if (!startDate || !endDate) return null;
    const start = safeDate(startDate);
    const end = safeDate(endDate);
    if (start > end) return null;
    const days = differenceInDays(end, start) + 1;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const filteredApplications = useMemo(() => applications.filter(app => 
    filterStatus === 'ALL' || app.status?.toUpperCase() === filterStatus.toUpperCase()
  ), [applications, filterStatus]);

  const certificateByAppId = useMemo(() => {
    return new Map<string, CertificateView>(certificates.map(c => [c.applicationId, c]));
  }, [certificates]);

  const stats = useMemo(() => ({
    total: applications.length,
    approved: applications.filter(a => a.status?.toUpperCase() === 'APPROVED').length,
    pending: applications.filter(a => a.status?.toUpperCase() === 'PENDING').length,
    rejected: applications.filter(a => a.status?.toUpperCase() === 'REJECTED').length,
    upcoming: applications.filter(a => a.status?.toUpperCase() === 'APPROVED' && isFuture(safeDate(a.startDate))).length
  }), [applications]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <ProfileCropperModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} onSave={handleProfileSave} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('DASHBOARD')}>
            <div className="w-9 h-9 bg-gradient-to-tr from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="font-bold text-lg">E</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-800 hidden sm:block">UniEvent<span className="text-orange-600">Student</span></h1>
          </div>

          <div className="flex items-center gap-3">
             <button 
               onClick={() => setActiveTab('EXPLORE')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  activeTab === 'EXPLORE' ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
               }`}
             >
               <Compass className="w-4 h-4" />
               Explore Events
             </button>
             <button
               onClick={() => setActiveTab('CERTIFICATES')}
               className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                 activeTab === 'CERTIFICATES'
                   ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100'
                   : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
               }`}
             >
               <FileText className="w-4 h-4" />
               Certificates
             </button>
             <div className="h-6 w-px bg-gray-200 mx-1"></div>
             <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             <div className="h-6 w-px bg-gray-200 mx-1"></div>
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('PROFILE')}>
                 <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.usn}</span>
                 </div>
                 <button className="relative w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all shadow-sm group">
                     {user.profilePic ? <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">{user.name.charAt(0)}</div>}
                 </button>
             </div>
            <button onClick={onLogout} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 ml-2"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8">
        
        {activeTab === 'DASHBOARD' && (
          <>
            {/* Statistics Cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                  <div><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Total Apps</p></div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center"><Hourglass className="w-5 h-5" /></div>
                  <div><p className="text-2xl font-bold text-gray-900">{stats.pending}</p><p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Pending</p></div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle className="w-5 h-5" /></div>
                  <div><p className="text-2xl font-bold text-gray-900">{stats.approved}</p><p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Approved</p></div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div>
                  <div><p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p><p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Upcoming</p></div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* New Application Form */}
                <section className="lg:col-span-5 xl:col-span-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                      <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b border-gray-50">
                        <FileText className="w-5 h-5 text-orange-600" /> New Application
                      </h2>
                      
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Event Details Section */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2">Event Details</h3>
                          
                          <div>
                              <input type="text" placeholder="Event Name (e.g. Hackathon 2024)" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm" value={eventName} onChange={(e) => setEventName(e.target.value)} required disabled={isSubmitting} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">Starts</label>
                                  <input type="date" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} required disabled={isSubmitting} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 ml-1">Ends</label>
                                  <input type="date" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} required disabled={isSubmitting} />
                              </div>
                          </div>
                          
                          {getDuration() && <div className="text-xs text-orange-700 font-medium bg-orange-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 border border-orange-100"><Clock className="w-3.5 h-3.5" /> Total Duration: {getDuration()}</div>}
                          
                          <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input type="text" placeholder="Location (e.g. Main Auditorium)" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} required disabled={isSubmitting} />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <select className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm appearance-none" value={eventType} onChange={(e) => setEventType(e.target.value)} disabled={isSubmitting}>
                                  {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" placeholder="Organized By" className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm" value={organizedBy} onChange={(e) => setOrganizedBy(e.target.value)} required disabled={isSubmitting} />
                            </div>
                          </div>
                        </div>

                        {/* Statement of Purpose Section */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Statement of Purpose</h3>
                            
                            {/* AI Tools Dropdown */}
                            <div className="relative">
                              <button 
                                type="button" 
                                onClick={() => setShowAiMenu(!showAiMenu)}
                                className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded transition-colors flex items-center gap-1 font-bold border border-orange-200 bg-orange-50/50"
                              >
                                <Wand2 className="w-3 h-3" /> AI Assist <ChevronDown className="w-3 h-3" />
                              </button>
                              
                              {showAiMenu && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 overflow-hidden">
                                  <button type="button" onClick={() => handleAiAction('generate')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Generate Draft</button>
                                  <button type="button" onClick={() => handleAiAction('improve')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"><Edit3 className="w-4 h-4" /> Improve Writing</button>
                                  <button type="button" onClick={() => handleAiAction('professional')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Make Professional</button>
                                  <button type="button" onClick={() => handleAiAction('shorten')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Shorten Text</button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="relative">
                            <textarea 
                              rows={5} 
                              placeholder="Explain why you want to attend this event and how it benefits your academic growth..." 
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all text-sm" 
                              value={reason} 
                              onChange={(e) => setReason(e.target.value)} 
                              required 
                              disabled={isSubmitting || isGenerating} 
                            />
                            {isGenerating && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-orange-600">
                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                <span className="text-xs font-bold">AI is writing...</span>
                              </div>
                            )}
                            <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 font-medium">
                              {reason.length} chars
                            </div>
                          </div>
                        </div>

                        <Button fullWidth type="submit" disabled={isGenerating || isSubmitting} size="lg" className="shadow-lg shadow-orange-200 rounded-xl py-3.5">
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Submit Application'}
                        </Button>
                      </form>
                  </div>
                </section>

                {/* Application History */}
                <section className="lg:col-span-7 xl:col-span-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h2 className="text-xl font-bold text-gray-800">Application History</h2>
                      <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                        <button onClick={() => setFilterStatus('ALL')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'ALL' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>All <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'ALL' ? 'bg-gray-600' : 'bg-gray-100'}`}>{stats.total}</span></button>
                        <div className="w-px h-4 bg-gray-200 mx-1"></div>
                        <button onClick={() => setFilterStatus('PENDING')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>Pending <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'PENDING' ? 'bg-yellow-200/50' : 'bg-gray-100'}`}>{stats.pending}</span></button>
                        <button onClick={() => setFilterStatus('APPROVED')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>Approved <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'APPROVED' ? 'bg-green-200/50' : 'bg-gray-100'}`}>{stats.approved}</span></button>
                        <button onClick={() => setFilterStatus('REJECTED')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>Rejected <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${filterStatus === 'REJECTED' ? 'bg-red-200/50' : 'bg-gray-100'}`}>{stats.rejected}</span></button>
                      </div>
                  </div>

                  <div className="space-y-4">
                      {filteredApplications.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900">No applications yet</h3>
                          <p className="text-gray-500 text-sm max-w-xs mx-auto mt-1 mb-6">
                            {filterStatus === 'ALL' ? "You haven't filed any leave requests yet. Fill out the form to apply for an event." : `You have no ${filterStatus.toLowerCase()} requests.`}
                          </p>
                          {filterStatus !== 'ALL' && (
                            <Button variant="outline" onClick={() => setFilterStatus('ALL')}>View All Applications</Button>
                          )}
                        </div>
                      )}
                      
                      {filteredApplications.map((app) => (
                        <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group p-5">
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                      {app.eventType || 'Event'}
                                    </span>
                                    {getStatusBadge(app.status)}
                                  </div>
                                  <h3 className="font-bold text-lg text-gray-900 leading-tight">{app.eventName}</h3>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mt-3 mb-4">
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                  <Calendar className="w-4 h-4 text-gray-400"/>
                                  <span className="font-medium">{format(safeDate(app.startDate), 'MMM d')} - {format(safeDate(app.endDate), 'MMM d, yyyy')}</span>
                                </div>
                                {app.eventLocation && (
                                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <MapPin className="w-4 h-4 text-gray-400"/>
                                    <span className="font-medium truncate">{app.eventLocation}</span>
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-gray-600 text-sm line-clamp-2 bg-gray-50 p-3 rounded-xl border border-gray-100/50">
                                {app.reason}
                              </p>

                              {certificatesEnabled && (app.status?.toUpperCase() === 'APPROVED' || certificateByAppId.get(app.id)) && (
                                <div className="mt-4 p-4 rounded-xl border border-orange-100 bg-orange-50/30">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <Award className="w-4 h-4 text-orange-600" />
                                      <h4 className="font-semibold text-gray-900">Certificate Status</h4>
                                    </div>
                                    {certificateByAppId.get(app.id) ? (
                                      getCertificateStatusBadge(certificateByAppId.get(app.id)?.status)
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                        Not uploaded
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="text-xs text-gray-600">
                                      <span className="font-semibold text-gray-700">Deadline: </span>
                                      <span>{format(safeDate(app.endDate), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {certificateByAppId.get(app.id)?.isLate ? (
                                        <span className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                                          <Clock className="w-3 h-3" /> Late upload
                                        </span>
                                      ) : (
                                        <span className="font-semibold text-gray-700">On time / Not late</span>
                                      )}
                                    </div>
                                  </div>

                                  {certificateByAppId.get(app.id)?.signedUrl && !certificateByAppId.get(app.id)?.fileMissing && (
                                    <div className="mt-3">
                                      <a
                                        href={certificateByAppId.get(app.id)?.signedUrl || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-xs font-semibold text-orange-700 hover:text-orange-800"
                                      >
                                        <FileText className="w-4 h-4" /> View certificate (PDF)
                                      </a>
                                    </div>
                                  )}

                                  {certificateByAppId.get(app.id)?.fileMissing && (
                                    <div className="mt-3 text-xs text-red-700 font-medium">
                                      File not found in storage. Please re-upload.
                                    </div>
                                  )}

                                  {certificateByAppId.get(app.id)?.remarks && (
                                    <div className="mt-3 text-xs text-gray-700">
                                      <span className="font-semibold">Staff remarks: </span>
                                      {certificateByAppId.get(app.id)?.remarks}
                                    </div>
                                  )}

                                  <div className="mt-4">
                                    {(() => {
                                      const cert = certificateByAppId.get(app.id);
                                      const busy = uploadingCertificateForAppId === app.id;

                                      if (!cert) {
                                        return (
                                          <>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Upload certificate PDF</label>
                                            <input
                                              type="file"
                                              accept="application/pdf"
                                              className="block w-full text-xs text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                              disabled={busy || isSubmitting || isGenerating}
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleCertificateUpload(app.id, f);
                                              }}
                                            />
                                          </>
                                        );
                                      }

                                      if (cert.status === 'pending' && !cert.fileMissing) {
                                        return (
                                          <div className="text-xs text-gray-600">
                                            Certificate uploaded and pending review. Re-upload is available only after rejection or revocation.
                                          </div>
                                        );
                                      }

                                      if (cert.status === 'rejected' || cert.status === 'revoked' || cert.fileMissing) {
                                        return (
                                          <>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Re-upload (overwrites previous file)</label>
                                            <input
                                              type="file"
                                              accept="application/pdf"
                                              className="block w-full text-xs text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                              disabled={busy || isSubmitting || isGenerating}
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleCertificateUpload(app.id, f);
                                              }}
                                            />
                                          </>
                                        );
                                      }

                                      return <div className="text-xs text-gray-600">Certificate approved. Re-upload not required.</div>;
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Actions Column */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-4 min-w-[120px]">
                              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider text-center sm:text-right w-full mb-2 hidden sm:block">
                                Submitted<br/>{format(safeDate(app.timestamp), 'MMM d, yyyy')}
                              </div>
                              {app.actionByName && app.status?.toUpperCase() !== 'PENDING' && (
                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider text-center sm:text-right w-full mb-2 hidden sm:block">
                                  {app.status?.toUpperCase() === 'APPROVED' ? 'Approved by' : 'Rejected by'}<br/>{app.actionByName}
                                </div>
                              )}
                              
                              <div className="flex sm:flex-col gap-2 w-full">
                                <Button variant="outline" size="sm" className="w-full text-xs">View Details</Button>
                                {app.status?.toUpperCase() === 'PENDING' && (
                                  <button onClick={() => handleWithdraw(app.id)} className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 border border-transparent hover:border-red-100">
                                    <Trash2 className="w-3 h-3" /> Withdraw
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
            </div>
          </>
        )}

        {activeTab === 'CERTIFICATES' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-800">Certificates</h2>
            </div>

            {!certificatesFeatureLoading && !certificatesEnabled ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-600">
                Module disabled
              </div>
            ) : (
              <>
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Upload Certificate</h3>

                  {uploadableLoading ? (
                    <div className="text-sm text-gray-500">Loading uploadable applications…</div>
                  ) : uploadableApplications.length === 0 ? (
                    <div className="text-sm text-gray-500">No approved applications pending certificate upload.</div>
                  ) : (
                    <div className="space-y-4">
                      {uploadableApplications.map((app: any) => (
                        <div
                          key={String(app.id)}
                          className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                        >
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                              {app.event_type || 'Event'}
                            </div>
                            <div className="mt-2 font-bold text-gray-900">{app.event_name || 'Event'}</div>
                            <div className="mt-1 text-sm text-gray-600">
                              {app.start_date && app.end_date
                                ? `${format(safeDate(app.start_date), 'MMM d')} - ${format(safeDate(app.end_date), 'MMM d, yyyy')}`
                                : ''}
                            </div>
                          </div>

                          <div className="w-full sm:w-[260px]">
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                              Upload certificate PDF
                            </label>
                            <input
                              type="file"
                              accept="application/pdf"
                              className="block w-full text-xs text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                              disabled={uploadingCertificateForAppId === String(app.id) || isSubmitting || isGenerating}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void handleCertificateUpload(String(app.id), f);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Certificate Status</h3>
                  </div>

                  {certificatesLoading ? (
                    <div className="text-sm text-gray-500">Loading certificates…</div>
                  ) : certificates.length === 0 ? (
                    <div className="text-sm text-gray-500">No certificates uploaded yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {certificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 flex flex-col gap-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-bold text-gray-900">
                                  {cert.eventName || cert.eventType || 'Event'}
                                </div>
                                {getCertificateStatusBadge(cert.status)}
                              </div>
                              {cert.startDate && cert.endDate && (
                                <div className="mt-1 text-sm text-gray-600">
                                  {format(safeDate(cert.startDate), 'MMM d')} -{' '}
                                  {format(safeDate(cert.endDate), 'MMM d, yyyy')}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col sm:items-end gap-2">
                              {cert.signedUrl && !cert.fileMissing ? (
                                <a
                                  href={cert.signedUrl || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-xs font-semibold text-orange-700 hover:text-orange-800"
                                >
                                  <FileText className="w-4 h-4" /> View certificate (PDF)
                                </a>
                              ) : (
                                <div className="text-xs text-red-700 font-medium">
                                  {cert.fileMissing ? 'File missing in storage.' : 'File unavailable.'}
                                </div>
                              )}
                            </div>
                          </div>

                          {cert.remarks && (
                            <div className="text-xs text-gray-700">
                              <span className="font-semibold">Staff remarks: </span>
                              {cert.remarks}
                            </div>
                          )}

                          <div className="mt-1">
                            {cert.status === 'pending' && !cert.fileMissing ? (
                              <div className="text-xs text-gray-600">
                                Certificate uploaded and pending review.
                              </div>
                            ) : cert.status === 'approved' ? (
                              <div className="text-xs text-gray-600">
                                Certificate approved. Re-upload not required.
                              </div>
                            ) : (
                              <>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                  Re-upload (overwrites previous file)
                                </label>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="block w-full text-xs text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                  disabled={uploadingCertificateForAppId === cert.applicationId || isSubmitting || isGenerating}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void handleCertificateUpload(cert.applicationId, f);
                                  }}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== 'DASHBOARD' && activeTab !== 'CERTIFICATES' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              {activeTab === 'EXPLORE' && <Compass className="w-10 h-10 text-gray-400" />}
              {activeTab === 'PROFILE' && <UserIcon className="w-10 h-10 text-gray-400" />}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Section
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              This feature is currently under development. Check back soon for updates to the student portal.
            </p>
            <Button className="mt-8" onClick={() => setActiveTab('DASHBOARD')}>Return to Dashboard</Button>
          </div>
        )}

      </main>
    </div>
  );
};
