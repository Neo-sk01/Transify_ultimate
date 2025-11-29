'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  AlertTriangle,
  Users,
  FileText,
  Shield,
  Clock,
  MapPin,
  Video,
  Mic
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  activeEmergencies: number;
  totalUsers: number;
  totalEvidence: number;
}

interface EmergencySession {
  id: string;
  user_id: string;
  status: string;
  trigger_type: string;
  started_at: string;
  profiles: {
    full_name: string;
  };
}

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  details: any;
  profiles: {
    full_name: string;
  };
}

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    activeEmergencies: 0,
    totalUsers: 0,
    totalEvidence: 0,
  });
  const [activeSessions, setActiveSessions] = useState<EmergencySession[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchDashboardData();
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchDashboardData();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    // Realtime subscription
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Auth temporarily disabled for testing
  // if (!session) {
  //   return <div>Please log in</div>;
  // }

  async function fetchDashboardData() {
    try {
      // Fetch Stats
      const { count: activeCount } = await supabase
        .from('emergency_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: evidenceCount } = await supabase
        .from('evidence')
        .select('*', { count: 'exact', head: true });

      setStats({
        activeEmergencies: activeCount || 0,
        totalUsers: userCount || 0,
        totalEvidence: evidenceCount || 0,
      });

      // Fetch Active Sessions
      const { data: sessions } = await supabase
        .from('emergency_sessions')
        .select('*, profiles(full_name)')
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (sessions) setActiveSessions(sessions as any);

      // Fetch Recent Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logs) setRecentLogs(logs as any);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Security Dashboard</h1>
            <p className="text-slate-500 mt-1">Real-time monitoring and evidence management</p>
          </div>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-700">System Online</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Emergencies</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.activeEmergencies}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Users</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Evidence Collected</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalEvidence}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Active Emergencies List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-500" />
                Active Incidents
              </h2>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
                Live
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {activeSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No active emergencies detected.
                </div>
              ) : (
                activeSessions.map((session) => (
                  <div key={session.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{session.profiles?.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-slate-500 flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1" />
                            Started {formatDistanceToNow(new Date(session.started_at))} ago
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {session.trigger_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                        View Live Feed
                      </button>
                      <button className="flex-1 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                        Dispatch Support
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-slate-500" />
                Recent Activity
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No recent activity.
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {log.action.includes('LOGIN') ? (
                          <Users className="w-4 h-4 text-blue-500" />
                        ) : log.action.includes('EVIDENCE') ? (
                          <Video className="w-4 h-4 text-purple-500" />
                        ) : (
                          <Activity className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {log.profiles?.full_name || 'System'} <span className="font-normal text-slate-500">{log.action.toLowerCase().replace('_', ' ')}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(log.created_at))} ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
