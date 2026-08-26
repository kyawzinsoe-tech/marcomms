import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  Layers,
  Zap,
  FileText,
  Users,
  LogOut,
  Eye,
  Building2,
  CreditCard,
  Megaphone,
  Truck,
  Printer,
  User as UserIcon
} from 'lucide-react';
import { PERMISSIONS, hasPermission } from '../config/rbac';

export function Sidebar({
  activeSection,
  onNavigate,
  alertCount,
  saveStatus,
  user,
  isSuperAdmin,
  isAdmin,
  onLogout
}) {
  // Navigation groups with role-based visibility
  const canReadBank = user && hasPermission(user, PERMISSIONS.ASSET_READ_BANK);
  const canReadPay = user && hasPermission(user, PERMISSIONS.ASSET_READ_PAY);
  const canReadComms = user && hasPermission(user, PERMISSIONS.ASSET_READ_COMMS);
  const canReadSuppliers = user && hasPermission(user, PERMISSIONS.SUPPLIER_READ);
  const canReadProduction = user && hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_READ);
  const canViewUsers = user && hasPermission(user, PERMISSIONS.USER_VIEW);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: alertCount },
    { id: 'subscriptions', label: 'Subscriptions', icon: Layers },
    { id: 'tokens', label: 'Token Usage', icon: Zap },
    { id: 'reports', label: 'Reports & Data', icon: FileText, separatorBefore: true }
  ];

  const assetPillarItems = [
    { id: 'kbz-bank', label: 'KBZ Bank', icon: Building2, visible: canReadBank },
    { id: 'kbz-pay', label: 'KBZPay', icon: CreditCard, visible: canReadPay },
    { id: 'kbz-comms', label: 'KBZBank Comms', icon: Megaphone, visible: canReadComms }
  ].filter((item) => item.visible);

  const procurementItems = [
    { id: 'suppliers', label: 'Supplier Directory', icon: Truck, visible: canReadSuppliers },
    { id: 'production-orders', label: 'Production Orders', icon: Printer, visible: canReadProduction }
  ].filter((item) => item.visible);

  const adminNavItems = [
    { id: 'user-management', label: 'User Management', icon: Users, visible: canViewUsers }
  ].filter((item) => item.visible);

  const handleNav = (id, e) => {
    e.preventDefault();
    onNavigate(id);
  };

  const renderNavGroup = (items) => (
    <div className="nav-links">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        const hasSeparator = Boolean(item.separatorBefore);

        return (
          <React.Fragment key={item.id}>
            {hasSeparator && (
              <div
                style={{
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  margin: '8px 4px 8px'
                }}
              />
            )}
            <a
              href={`#${item.id}`}
              onClick={(e) => handleNav(item.id, e)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-item-content">
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
              {Boolean(item.badge) && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </a>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <aside className="sidebar">
      {/* Brand Header */}
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
          <div className="brand-subtitle">Marcomms Webportal</div>
        </div>
      </div>

      {/* Core Subscriptions & Tools */}
      {renderNavGroup(mainNavItems)}

      {/* Asset Pillars Group */}
      {assetPillarItems.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 14px 6px',
              marginBottom: '4px'
            }}
          >
            Asset Pillars
          </div>
          {renderNavGroup(assetPillarItems)}
        </div>
      )}

      {/* Procurement & Vendors Group */}
      {procurementItems.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 14px 6px',
              marginBottom: '4px'
            }}
          >
            Procurement & Vendors
          </div>
          {renderNavGroup(procurementItems)}
        </div>
      )}

      {/* Administration Group */}
      {adminNavItems.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 14px 6px',
              marginBottom: '4px'
            }}
          >
            Administration
          </div>
          {renderNavGroup(adminNavItems)}
        </div>
      )}

      {/* Account / Session Area (Positioned directly below User Management) */}
      <div className="sidebar-footer">
        {isAdmin ? (
          <div className="save-status-card">
            <div className="pulse-dot" />
            <div>
              <b>{saveStatus}</b>
              <small>{isSuperAdmin ? 'Super Admin authority' : 'Realtime cloud & local sync'}</small>
            </div>
          </div>
        ) : (
          <div className="save-status-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
              <Eye size={14} />
            </div>
            <div>
              <b style={{ color: '#1e3a8a' }}>Viewer Mode</b>
              <small>Read-only access active</small>
            </div>
          </div>
        )}

        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  <span
                    className={`user-role-badge ${
                      isSuperAdmin
                        ? 'badge-role-superadmin'
                        : isAdmin
                        ? 'badge-role-admin'
                        : 'badge-role-user'
                    }`}
                    style={{
                      background: isSuperAdmin ? '#f3e8ff' : undefined,
                      color: isSuperAdmin ? '#7e22ce' : undefined,
                      border: isSuperAdmin ? '1px solid #d8b4fe' : undefined,
                      fontSize: '9.5px',
                      padding: '2px 6px'
                    }}
                  >
                    {(user.role || 'viewer').toUpperCase().replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="user-email">{user.email}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-sidebar-logout"
              onClick={onLogout}
              title="Sign Out of Marcomms Webportal"
            >
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
