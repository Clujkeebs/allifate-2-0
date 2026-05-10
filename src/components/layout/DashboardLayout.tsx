import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Sparkles, Calendar, BarChart3, Library,
  Settings, Bell, Plus, Zap, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuthStore } from '@/store/auth'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/app'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/create', icon: Sparkles, label: 'Create', end: true },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/upgrade', icon: Zap, label: 'Upgrade' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/create': 'New Content',
  '/schedule': 'Schedule',
  '/analytics': 'Analytics',
  '/library': 'Library',
  '/upgrade': 'Upgrade',
  '/settings': 'Settings',
}

export function DashboardLayout() {
  const { profile, subscription } = useAuth()
  const { signOut } = useAuthStore()
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const pageTitle = PAGE_TITLES[location.pathname] || 'Virlo'
  const usagePct = subscription?.posts_limit === -1
    ? 8
    : Math.min(100, ((subscription?.posts_used_this_month || 0) / (subscription?.posts_limit || 20)) * 100)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#060A0E', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarCollapsed ? 60 : 216,
        flexShrink: 0,
        background: '#0D1117',
        borderRight: '1px solid #1A2530',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s cubic-bezier(.16,1,.3,1)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 20,
      }}>

        {/* Logo */}
        <div style={{ padding: sidebarCollapsed ? '18px 0' : '18px 16px', borderBottom: '1px solid #1A2530', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          {sidebarCollapsed
            ? <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#00E5A0,#00B4D8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#060A0E"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#060A0E" strokeWidth="2.2" strokeLinejoin="round"/>
                </svg>
              </div>
            : <Logo size="sm" />
          }
        </div>

        {/* New content button */}
        <div style={{ padding: sidebarCollapsed ? '10px 8px' : '10px 12px' }}>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
            style={{ width: '100%', padding: sidebarCollapsed ? '9px' : '9px 12px', fontSize: 13, borderRadius: 9, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          >
            <Plus size={15} />
            {!sidebarCollapsed && <span>New Content</span>}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: sidebarCollapsed ? '4px 8px' : '4px 10px', overflow: 'hidden' }}>
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: sidebarCollapsed ? '9px' : '8px 10px',
                  borderRadius: 9, marginBottom: 2,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  color: isActive ? '#00E5A0' : '#7A8FA0',
                  background: isActive ? 'rgba(0,229,160,0.08)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? 'inset 3px 0 0 #00E5A0' : 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer',
                }}>
                  <Icon size={16} style={{ flexShrink: 0, color: isActive ? '#00E5A0' : '#7A8FA0', transition: 'color 0.15s' }} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Subscription pill */}
        {!sidebarCollapsed && subscription && (
          <div style={{ margin: '0 10px 8px', padding: '10px 12px', background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.1)', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={11} color="#00E5A0" />
                <span style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: '#00E5A0', textTransform: 'capitalize' }}>{subscription.tier}</span>
              </div>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#7A8FA0' }}>
                {subscription.posts_used_this_month}/{subscription.posts_limit === -1 ? '∞' : subscription.posts_limit}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${usagePct}%` }} />
            </div>
          </div>
        )}

        {/* Profile */}
        <div style={{ padding: sidebarCollapsed ? '8px' : '8px 10px', borderTop: '1px solid #1A2530' }}>
          {sidebarCollapsed
            ? <button
                onClick={() => { signOut(); navigate('/') }}
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'center', padding: '7px', borderRadius: 8 }}
              >
                <LogOut size={14} />
              </button>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', borderRadius: 9, cursor: 'pointer', transition: 'background 0.15s' }}
                onClick={() => navigate('/settings')}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00E5A0,#00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#060A0E', flexShrink: 0 }}>
                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#ECF0F4', fontFamily: 'Syne', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile?.full_name || 'Account'}
                  </div>
                  <div style={{ fontSize: 10, color: '#7A8FA0' }}>View settings</div>
                </div>
              </div>
          }
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute', top: 20, right: -11,
            width: 22, height: 22, background: '#141B23',
            border: '1px solid #1A2530', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#7A8FA0', zIndex: 30,
            transition: 'all 0.15s',
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          height: 54, borderBottom: '1px solid #1A2530',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0, background: '#0D1117',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontFamily: 'Syne', fontWeight: 700, color: '#ECF0F4' }}>{pageTitle}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* New content shortcut */}
            <button
              onClick={() => navigate('/create')}
              className="btn-primary"
              style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8 }}
            >
              <Plus size={13} /> Create
            </button>

            {/* Notifications */}
            <button className="btn-ghost" style={{ padding: '7px', borderRadius: 8 }}>
              <Bell size={15} />
            </button>

            {/* Avatar menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'transparent', border: '1px solid #1A2530',
                  borderRadius: 9, padding: '5px 10px', cursor: 'pointer',
                  color: '#ECF0F4', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#00E5A0,#00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#060A0E' }}>
                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || 'Account'}
                </span>
              </button>

              {showUserMenu && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: '#141B23', border: '1px solid #1A2530', borderRadius: 10, padding: 4, minWidth: 160, zIndex: 50, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                  <button onClick={() => { navigate('/settings'); setShowUserMenu(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#ECF0F4', fontSize: 13, cursor: 'pointer', borderRadius: 7, fontFamily: 'DM Sans' }}>
                    Settings
                  </button>
                  <div style={{ height: 1, background: '#1A2530', margin: '2px 0' }} />
                  <button onClick={() => { signOut(); navigate('/') }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#FF4757', fontSize: 13, cursor: 'pointer', borderRadius: 7, fontFamily: 'DM Sans' }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', background: '#060A0E' }}>
          <Outlet />
        </main>
      </div>

      {/* Click-away for user menu */}
      {showUserMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowUserMenu(false)} />
      )}
    </div>
  )
}
