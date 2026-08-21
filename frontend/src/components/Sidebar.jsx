import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  Layers,
  Zap,
  FileText,
  Users,
  Sparkles,
  LogOut,
  User as UserIcon
} from 'lucide-react';

export function Sidebar({
  activeSection,
  onNavigate,
  alertCount,
  saveStatus,
  user,
  isAdmin,
  onLogout
}) {
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: alertCount, adminOnly: true },
    { id: 'subscriptions', label: 'Subscriptions', icon: Layers, adminOnly: true },
    { id: 'tokens', label: 'Token Usage', icon: Zap, adminOnly: true },
    { id: 'users', label: 'User Management', icon: Users, adminOnly: true },
    { id: 'reports', label: 'Reports & Data', icon: FileText, adminOnly: true }
  ];

  const visibleNavItems = allNavItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const handleNav = (id, e) => {
    e.preventDefault();
    onNavigate(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="brand-section">
          <div className="brand-logo-card">
            <img
              src="/images/Logo_Lockup-01.png"
              alt="KBZ Bank & KBZPay"
              className="brand-logo-img"
            />
          </div>
          <div>
            <div className="brand-title">Creative Hub</div>
            <div className="brand-subtitle">Subscription Manager</div>
          </div>
        </div>

        <nav className="nav-links">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNav(item.id, e)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="nav-item-content">
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badge) && isAdmin && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        {isAdmin && (
          <div className="save-status-card">
            <div className="pulse-dot" />
            <div>
              <b>{saveStatus}</b>
              <small>Realtime local sync</small>
            </div>
          </div>
        )}

        {user && (
          <div className="user-profile-card">
            <div className="user-avatar-wrap">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder">
                  <UserIcon size={16} />
                </div>
              )}
            </div>

            <div className="user-meta">
              <div className="user-name-row">
                <span className="user-name">{user.name}</span>
                <span className={`user-role-badge ${isAdmin ? 'badge-role-admin' : 'badge-role-user'}`}>
                  {isAdmin ? 'ADMIN' : 'USER'}
                </span>
              </div>
              <span className="user-email">{user.email}</span>
            </div>

            <button
              type="button"
              className="btn-logout"
              title="Sign Out"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
