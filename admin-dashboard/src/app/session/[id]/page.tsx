'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    MapPin,
    Video,
    Mic,
    Clock,
    Shield,
    Download
} from 'lucide-react';
import { format } from 'date-fns';

interface Evidence {
    id: string;
    type: string;
    storage_path: string;
    created_at: string;
    data: any;
}

interface SessionDetail {
    id: string;
    status: string;
    trigger_type: string;
    started_at: string;
    ended_at: string | null;
    profiles: {
        full_name: string;
        id: string;
    };
}

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) fetchSessionData(params.id as string);
    }, [params.id]);

    async function fetchSessionData(sessionId: string) {
        try {
            const { data: sessionData } = await supabase
                .from('emergency_sessions')
                .select('*, profiles(full_name, id)')
                .eq('id', sessionId)
                .single();

            if (sessionData) {
                setSession(sessionData as any);

                const { data: evidence } = await supabase
                    .from('evidence')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: true });

                if (evidence) setEvidenceList(evidence as any);
            }
        } catch (error) {
            console.error('Error fetching session:', error);
        } finally {
            setLoading(false);
        }
    }

    async function resolveSession() {
        if (!session) return;
        const { error } = await supabase
            .from('emergency_sessions')
            .update({ status: 'resolved', ended_at: new Date().toISOString() })
            .eq('id', session.id);

        if (!error) fetchSessionData(session.id);
    }

    if (loading) return <div className="p-8 text-center">Loading session details...</div>;
    if (!session) return <div className="p-8 text-center">Session not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </button>

                    <div className="flex items-center space-x-3">
                        {session.status === 'active' && (
                            <button
                                onClick={resolveSession}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                                Resolve Incident
                            </button>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${session.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                            {session.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Session Info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{session.profiles?.full_name}</h1>
                            <p className="text-slate-500 mt-1 flex items-center">
                                <Shield className="w-4 h-4 mr-1" />
                                Trigger: {session.trigger_type.replace('_', ' ').toUpperCase()}
                            </p>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                            <p>Started: {format(new Date(session.started_at), 'PPpp')}</p>
                            {session.ended_at && <p>Ended: {format(new Date(session.ended_at), 'PPpp')}</p>}
                        </div>
                    </div>
                </div>

                {/* Evidence Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Location History */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                            Location History
                        </h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {evidenceList.filter(e => e.type === 'location').map((loc) => (
                                <div key={loc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {loc.data?.latitude?.toFixed(5)}, {loc.data?.longitude?.toFixed(5)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Accuracy: {loc.data?.accuracy?.toFixed(1)}m
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {format(new Date(loc.created_at), 'HH:mm:ss')}
                                    </span>
                                </div>
                            ))}
                            {evidenceList.filter(e => e.type === 'location').length === 0 && (
                                <p className="text-slate-500 text-sm">No location data available.</p>
                            )}
                        </div>
                    </div>

                    {/* Media Evidence */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                            <Video className="w-5 h-5 mr-2 text-purple-500" />
                            Media Evidence
                        </h2>
                        <div className="space-y-3">
                            {evidenceList.filter(e => ['video', 'audio'].includes(e.type)).map((media) => (
                                <div key={media.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center">
                                        {media.type === 'video' ? (
                                            <Video className="w-8 h-8 p-1.5 bg-purple-100 text-purple-600 rounded-lg mr-3" />
                                        ) : (
                                            <Mic className="w-8 h-8 p-1.5 bg-orange-100 text-orange-600 rounded-lg mr-3" />
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900 capitalize">{media.type} Recording</p>
                                            <p className="text-xs text-slate-500">
                                                {format(new Date(media.created_at), 'HH:mm:ss')}
                                            </p>
                                        </div>
                                    </div>
                                    {media.storage_path && (
                                        <a
                                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${media.storage_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            ))}
                            {evidenceList.filter(e => ['video', 'audio'].includes(e.type)).length === 0 && (
                                <p className="text-slate-500 text-sm">No media evidence available.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
