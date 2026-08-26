import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  AlertTriangle,
  Layers,
  Zap,
  FileText,
  Building2,
  CreditCard,
  Megaphone,
  Truck,
  Printer,
  Users,
  Plus,
  ArrowRight,
  Sparkles,
  Command,
  Download,
  Calendar
} from 'lucide-react';
import { PERMISSIONS, hasPermission } from '../../config/rbac';

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  user,
  isAdmin,
  subscriptions = [],
  assets = [],
  suppliers = [],
  productionOrders = [],
  onAddSubscription,
  onAddToken,
  onAddUser,
  onPrintMonthly,
  onPrintYearly
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global keydown listener for palette navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // RBAC Permission checks for destinations
  const canReadBank = !user || hasPermission(user, PERMISSIONS.ASSET_READ_BANK);
  const canReadPay = !user || hasPermission(user, PERMISSIONS.ASSET_READ_PAY);
  const canReadComms = !user || hasPermission(user, PERMISSIONS.ASSET_READ_COMMS);
  const canReadSuppliers = !user || hasPermission(user, PERMISSIONS.SUPPLIER_READ);
  const canReadProduction = !user || hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_READ);
  const canViewUsers = !user || hasPermission(user, PERMISSIONS.USER_VIEW);

  // Compile all search items
  const allItems = useMemo(() => {
    const items = [];

    // 1. Navigation Destinations (All 11 Modules)
    const destinations = [
      { id: 'nav-dashboard', type: 'Navigation', label: 'Executive Dashboard', desc: 'KPI metrics, run-rate, renewals', icon: LayoutDashboard, action: () => onNavigate('dashboard') },
      { id: 'nav-alerts', type: 'Navigation', label: 'Alert Center', desc: 'Expiration warnings, renewal timelines', icon: AlertTriangle, action: () => onNavigate('alerts') },
      { id: 'nav-subscriptions', type: 'Navigation', label: 'Subscription Management', desc: 'Tool licenses, plans, monthly spend', icon: Layers, action: () => onNavigate('subscriptions') },
      { id: 'nav-tokens', type: 'Navigation', label: 'AI Token Analytics', desc: 'Magnific token burn rates & usage history', icon: Zap, action: () => onNavigate('tokens') },
      { id: 'nav-reports', type: 'Navigation', label: 'Reports & Data Hub', desc: 'Executive PDF reports, S3 backups, analytics', icon: FileText, action: () => onNavigate('reports') },
      ...(canReadBank ? [{ id: 'nav-kbz-bank', type: 'Navigation', label: 'KBZ Bank Brand Assets', desc: 'Official logos, guidelines, vector marks', icon: Building2, action: () => onNavigate('kbz-bank') }] : []),
      ...(canReadPay ? [{ id: 'nav-kbz-pay', type: 'Navigation', label: 'KBZPay Brand Assets', desc: 'App icons, lockups, design system', icon: CreditCard, action: () => onNavigate('kbz-pay') }] : []),
      ...(canReadComms ? [{ id: 'nav-kbz-comms', type: 'Navigation', label: 'KBZBank Comms Brand Assets', desc: 'Press kit materials, PR templates', icon: Megaphone, action: () => onNavigate('kbz-comms') }] : []),
      ...(canReadSuppliers ? [{ id: 'nav-suppliers', type: 'Navigation', label: 'Procurement Supplier Directory', desc: 'Approved printing vendors & fabricators', icon: Truck, action: () => onNavigate('suppliers') }] : []),
      ...(canReadProduction ? [{ id: 'nav-production', type: 'Navigation', label: 'Production Orders Matrix', desc: 'Fabrication orders, milestones, specs', icon: Printer, action: () => onNavigate('production-orders') }] : []),
      ...(canViewUsers ? [{ id: 'nav-users', type: 'Navigation', label: 'User Management & Sessions', desc: 'Role governance, active logins, security', icon: Users, action: () => onNavigate('user-management') }] : [])
    ];
    items.push(...destinations);

    // 2. Quick Actions
    const quickActions = [
      ...(isAdmin ? [{ id: 'act-add-sub', type: 'Action', label: 'Add New Subscription', desc: 'Provision creative tool license', icon: Plus, action: () => { onClose(); onAddSubscription?.(); } }] : []),
      ...(isAdmin ? [{ id: 'act-add-token', type: 'Action', label: 'Record AI Token Usage', desc: 'Log Magnific AI project generation', icon: Zap, action: () => { onClose(); onAddToken?.(); } }] : []),
      { id: 'act-print-monthly', type: 'Action', label: 'Generate Monthly PDF Report', desc: 'Export executive monthly report document', icon: Calendar, action: () => { onClose(); onPrintMonthly?.(); } },
      { id: 'act-print-yearly', type: 'Action', label: 'Generate Annual Portfolio PDF', desc: 'Export calendar year summary document', icon: Sparkles, action: () => { onClose(); onPrintYearly?.(); } },
      ...(isAdmin ? [{ id: 'act-add-user', type: 'Action', label: 'Provision User Account', desc: 'Create new user with RBAC role', icon: Users, action: () => { onClose(); onAddUser?.(); } }] : [])
    ];
    items.push(...quickActions);

    // 3. Live Subscriptions Records
    subscriptions.forEach((sub) => {
      if (!sub.archived) {
        items.push({
          id: `sub-${sub.id}`,
          type: 'Subscription',
          label: sub.product,
          desc: `${sub.tool || 'Creative Tool'} • ${sub.plan || 'Monthly'} • ${sub.email || 'Assigned'}`,
          icon: Layers,
          action: () => {
            onNavigate('subscriptions');
            onClose();
          }
        });
      }
    });

    // 4. Live Brand Assets Records
    assets.forEach((asset) => {
      if (!asset.archived) {
        items.push({
          id: `asset-${asset.id}`,
          type: 'Brand Asset',
          label: asset.title,
          desc: `${asset.library?.toUpperCase().replace(/_/g, ' ')} • ${asset.category} • ${asset.fileType || 'Asset'}`,
          icon: Sparkles,
          action: () => {
            onNavigate(asset.library?.replace(/_/g, '-') || 'kbz-bank');
            onClose();
          }
        });
      }
    });

    // 5. Live Suppliers Records
    suppliers.forEach((sup) => {
      if (!sup.archived) {
        items.push({
          id: `sup-${sup.id}`,
          type: 'Supplier',
          label: sup.name,
          desc: `${Array.isArray(sup.categories) ? sup.categories.join(', ') : 'Printing'} • ${sup.phone || sup.email || 'Active'}`,
          icon: Truck,
          action: () => {
            onNavigate('suppliers');
            onClose();
          }
        });
      }
    });

    // 6. Live Production Orders Records
    productionOrders.forEach((po) => {
      if (!po.archived) {
        items.push({
          id: `po-${po.id}`,
          type: 'Production Order',
          label: `${po.orderNumber} — ${po.campaignName}`,
          desc: `${po.itemDescription || 'Fabrication'} • Status: ${po.status}`,
          icon: Printer,
          action: () => {
            onNavigate('production-orders');
            onClose();
          }
        });
      }
    });

    return items;
  }, [
    isAdmin,
    canReadBank,
    canReadPay,
    canReadComms,
    canReadSuppliers,
    canReadProduction,
    canViewUsers,
    subscriptions,
    assets,
    suppliers,
    productionOrders,
    onNavigate,
    onClose,
    onAddSubscription,
    onAddToken,
    onAddUser,
    onPrintMonthly,
    onPrintYearly
  ]);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allItems.slice(0, 14); // Initial recommended items

    return allItems
      .filter((item) => {
        const labelMatch = item.label.toLowerCase().includes(q);
        const descMatch = (item.desc || '').toLowerCase().includes(q);
        const typeMatch = item.type.toLowerCase().includes(q);
        return labelMatch || descMatch || typeMatch;
      })
      .slice(0, 20);
  }, [allItems, query]);

  // Handle arrow key navigation inside results
  const handleKeyDown = (e) => {
    if (filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        selected.action();
        onClose();
      }
    }
  };

  // Auto-scroll selected item into view when navigating with arrows
  useEffect(() => {
    if (listRef.current && filteredItems.length > 0) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredItems.length]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(6px)', zIndex: 1000 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette & Omnisearch"
        style={{
          maxWidth: '640px',
          width: '100%',
          padding: 0,
          borderRadius: '14px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.18s ease-out'
        }}
      >
        {/* Search Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg-surface)'
          }}
        >
          <Search size={18} color="var(--primary)" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="command-palette-listbox"
            aria-activedescendant={filteredItems[selectedIndex]?.id || ''}
            placeholder="Search modules, subscriptions, assets, suppliers, orders, or actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Omnisearch query"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--text-primary)',
              background: 'transparent',
              fontFamily: 'inherit'
            }}
          />
          <kbd
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              color: 'var(--text-muted)'
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          id="command-palette-listbox"
          role="listbox"
          aria-label="Search suggestions"
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '13.5px', fontWeight: 600 }}>No results found for &ldquo;{query}&rdquo;</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Try searching for a module name, tool, brand asset, supplier, or action.</div>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  id={item.id}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary-50, #f5f3ff)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: isSelected ? 'var(--primary)' : 'var(--bg-surface-secondary)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        transition: 'all 0.1s ease'
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {item.label}
                        </span>
                        <span
                          className="badge"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            background: item.type === 'Action' ? 'var(--warning-light)' : item.type === 'Navigation' ? 'var(--primary-100)' : 'var(--bg-surface-secondary)',
                            color: item.type === 'Action' ? 'var(--warning-text)' : item.type === 'Navigation' ? 'var(--primary)' : 'var(--text-muted)'
                          }}
                        >
                          {item.type}
                        </span>
                      </div>
                      {item.desc && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px'
                          }}
                        >
                          {item.desc}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <ArrowRight size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--bg-surface-secondary)',
            fontSize: '11.5px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span><kbd style={{ fontWeight: 700 }}>↑↓</kbd> Navigate</span>
            <span><kbd style={{ fontWeight: 700 }}>↵</kbd> Select</span>
            <span><kbd style={{ fontWeight: 700 }}>esc</kbd> Dismiss</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Command size={12} /> Marcomms Omnisearch
          </div>
        </div>
      </div>
    </div>
  );
}
