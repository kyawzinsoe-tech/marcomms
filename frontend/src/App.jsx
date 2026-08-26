import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { useDashboardState } from './hooks/useDashboardState';
import {
  getStoredUsers,
  fetchUsersApi,
  createUser,
  updateUser,
  deleteUser
} from './services/authService';
import { ROLES, PERMISSIONS, normalizeRole } from './config/rbac';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiGrid } from './components/KpiGrid';
import { AlertsSection } from './components/AlertsSection';
import { SubscriptionsTable } from './components/SubscriptionsTable';
import { TokenSection } from './components/TokenSection';
import { TokenHistoryTable } from './components/TokenHistoryTable';
import { UserManagementSection } from './components/UserManagementSection';
import { UserModal } from './components/UserModal';
import { ReportsDataSection } from './components/ReportsDataSection';
import { SubscriptionModal } from './components/SubscriptionModal';
import { TokenModal } from './components/TokenModal';
import { Building2, CreditCard, Megaphone } from 'lucide-react';
import { PrintReport } from './components/PrintReport';
import { Toast } from './components/Toast';
import { AssetLibrarySection } from './components/assets/AssetLibrarySection';
import { SupplierDirectorySection } from './components/suppliers/SupplierDirectorySection';
import { ProductionOrdersSection } from './components/production-orders/ProductionOrdersSection';
import { ErrorDialog } from './components/common/ErrorDialog';

const HASH_MAP = {
  '': 'dashboard',
  '#': 'dashboard',
  'dashboard': 'dashboard',
  'alerts': 'alerts',
  'subscriptions': 'subscriptions',
  'tokens': 'tokens',
  'token-usage': 'tokens',
  'magnific': 'tokens',
  'reports': 'reports',
  'reports-data': 'reports',
  'kbz-bank': 'kbz-bank',
  'asset-kbz-bank': 'kbz-bank',
  'kbz-pay': 'kbz-pay',
  'asset-kbz-pay': 'kbz-pay',
  'kbz-comms': 'kbz-comms',
  'asset-kbz-comms': 'kbz-comms',
  'suppliers': 'suppliers',
  'supplier-directory': 'suppliers',
  'production-orders': 'production-orders',
  'production': 'production-orders',
  'user-management': 'user-management',
  'users': 'user-management'
};

const getCanonicalSection = (hash) => {
  if (!hash) return 'dashboard';
  const clean = hash.replace(/^#\/?/, '').trim().toLowerCase();
  return HASH_MAP[clean] || 'dashboard';
};

function DashboardApp() {
  const { user, isSuperAdmin, isAdmin, isViewer, can, isAuthenticated, logout } = useAuth();

  const {
    state,
    saveStatus,
    reportMonth,
    subscriptions,
    selectedMonthEntries,
    selectedYear,
    selectedYearEntries,
    totalSubscriptionsCount,
    activeSubscriptionsCount,
    activePercentage,
    knownMonthlyCost,
    magnificAllocationTotal,
    selectedMonthTokensUsed,
    selectedMonthTokenCost,
    alerts,
    overdueCount,
    setReportMonth,
    addSubscription,
    updateSubscription,
    archiveSubscription,
    deleteSubscription,
    addTokenEntry,
    updateTokenEntry,
    archiveTokenEntry,
    deleteTokenEntry,
    importBackup,
    resetToDemo
  } = useDashboardState();

  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return getCanonicalSection(window.location.hash);
    }
    return 'dashboard';
  });
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [printType, setPrintType] = useState(null);
  const [toast, setToast] = useState(null);

  // User Management State (Authoritative from Backend MongoDB)
  const [usersList, setUsersList] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [appError, setAppError] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const refreshUsers = async () => {
    if (isAuthenticated && isAdmin) {
      try {
        const liveUsers = await fetchUsersApi();
        if (Array.isArray(liveUsers)) {
          setUsersList(liveUsers);
        }
      } catch (err) {
        console.warn('[User Sync] Failed to refresh users from backend:', err.message);
      }
    }
  };

  // Sync users from MongoDB when authenticated as Admin / Super Admin
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      refreshUsers();
    }
  }, [isAuthenticated, isAdmin]);

  // Route permission validator
  const checkPermissionForSection = (sec) => {
    switch (sec) {
      case 'kbz-bank':
        return can(PERMISSIONS.ASSET_READ_BANK);
      case 'kbz-pay':
        return can(PERMISSIONS.ASSET_READ_PAY);
      case 'kbz-comms':
        return can(PERMISSIONS.ASSET_READ_COMMS);
      case 'suppliers':
        return can(PERMISSIONS.SUPPLIER_READ);
      case 'production-orders':
        return can(PERMISSIONS.PRODUCTION_ORDER_READ);
      case 'user-management':
        return isAdmin;
      default:
        return true;
    }
  };

  // Synchronize activeSection with window.location.hash and browser Back/Forward navigation
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleHashChange = () => {
      const target = getCanonicalSection(window.location.hash);
      if (checkPermissionForSection(target)) {
        setActiveSection(target);
      } else {
        setActiveSection('dashboard');
        if (window.location.hash && window.location.hash !== '#dashboard' && window.location.hash !== '#') {
          window.location.hash = '#dashboard';
        }
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, user, isAdmin]);

  const handleNavigate = (sec) => {
    if (!checkPermissionForSection(sec)) return;
    setActiveSection(sec);
    if (window.location.hash !== `#${sec}`) {
      window.location.hash = `#${sec}`;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Subscriptions Modal Handlers
  const handleOpenAddSubscription = () => {
    if (!isAdmin) return;
    setEditingSubscription(null);
    setIsSubModalOpen(true);
  };

  const handleOpenEditSubscription = (sub) => {
    if (!isAdmin) return;
    setEditingSubscription(sub);
    setIsSubModalOpen(true);
  };

  const handleSaveSubscription = (formData) => {
    if (!isAdmin) return;
    if (editingSubscription) {
      updateSubscription(editingSubscription.id, formData);
      showToast(`Updated "${formData.product}" subscription.`, 'success');
    } else {
      addSubscription(formData);
      showToast(`Added "${formData.product}" subscription.`, 'success');
    }
  };

  // Token Modal Handlers
  const handleOpenNewToken = () => {
    if (!isAdmin) return;
    setEditingToken(null);
    setIsTokenModalOpen(true);
  };

  const handleOpenEditToken = (tok) => {
    if (!isAdmin) return;
    setEditingToken(tok);
    setIsTokenModalOpen(true);
  };

  const handleSaveToken = (formData) => {
    if (!isAdmin) return;
    if (editingToken) {
      updateTokenEntry(editingToken.id, formData);
      showToast('Updated token usage entry.', 'success');
    } else {
      addTokenEntry(formData);
      showToast('Recorded new token usage entry.', 'success');
    }
  };

  // User Management Handlers (3-Tier Canonical RBAC)
  const handleOpenAddUser = () => {
    if (!isAdmin) return;
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (targetUser) => {
    if (!targetUser) return;
    const targetRole = normalizeRole(targetUser.role);
    let editPerm;
    if (targetRole === ROLES.SUPER_ADMIN) {
      editPerm = PERMISSIONS.USER_UPDATE_SUPER_ADMIN;
    } else if (targetRole === ROLES.ADMIN) {
      editPerm = PERMISSIONS.USER_UPDATE_ADMIN;
    } else {
      editPerm = PERMISSIONS.USER_UPDATE_VIEWER;
    }

    if (!can(editPerm, targetUser)) {
      setAppError('You do not have permission to edit this account.');
      return;
    }
    setEditingUser(targetUser);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (userData) => {
    if (!isAdmin) return;
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData, user);
        await refreshUsers();
        showToast(`User "${userData.name}" updated successfully.`, 'success');
      } else {
        await createUser(userData, user);
        await refreshUsers();
        showToast(`New user "${userData.name}" (${(userData.role || 'viewer').toUpperCase()}) created!`, 'success');
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      setAppError(err.message || 'Failed to save user account.');
    }
  };

  const handleDeleteUser = async (userId) => {
    const targetUser = usersList.find((u) => String(u.id) === String(userId));
    if (!targetUser) {
      setAppError('User account not found.');
      return;
    }

    const targetRole = normalizeRole(targetUser.role);
    const superAdminCount = usersList.filter((u) => normalizeRole(u.role) === ROLES.SUPER_ADMIN).length;

    let deletePerm;
    if (targetRole === ROLES.SUPER_ADMIN) {
      deletePerm = PERMISSIONS.USER_DELETE_SUPER_ADMIN;
    } else if (targetRole === ROLES.ADMIN) {
      deletePerm = PERMISSIONS.USER_DELETE_ADMIN;
    } else {
      deletePerm = PERMISSIONS.USER_DELETE_VIEWER;
    }

    if (!can(deletePerm, targetUser, { superAdminCount })) {
      setAppError('You do not have permission to delete this account.');
      return;
    }

    try {
      await deleteUser(userId, user);
      await refreshUsers();
      showToast('User account removed successfully.', 'info');
    } catch (err) {
      setAppError(err.message || 'Failed to delete user account.');
    }
  };

  // PDF / Print Generation (Allowed for all authenticated roles)
  const handlePrint = (type) => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 60);
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        alertCount={alerts.length}
        saveStatus={saveStatus}
        user={user}
        isSuperAdmin={isSuperAdmin}
        isAdmin={isAdmin}
        onLogout={logout}
      />

      <main className="main-content">
        {/* VIEW 1: EXECUTIVE DASHBOARD */}
        {activeSection === 'dashboard' && (
          <>
            <Header
              activeSection="dashboard"
              reportMonth={reportMonth}
              onMonthChange={setReportMonth}
              onPrintMonthly={() => handlePrint('month')}
              onPrintYearly={() => handlePrint('year')}
              user={user}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
            />

            <KpiGrid
              totalCount={totalSubscriptionsCount}
              activeCount={activeSubscriptionsCount}
              activePercentage={activePercentage}
              overdueCount={overdueCount}
              monthlyCost={knownMonthlyCost}
              monthTokensUsed={selectedMonthTokensUsed}
            />

            {alerts.length > 0 && (
              <AlertsSection
                alerts={alerts}
                isAdmin={isAdmin}
                onEditSubscription={handleOpenEditSubscription}
                onNotify={showToast}
              />
            )}

            <SubscriptionsTable
              subscriptions={subscriptions}
              isAdmin={isAdmin}
              onAddSubscription={handleOpenAddSubscription}
              onEditSubscription={handleOpenEditSubscription}
              onArchiveSubscription={(id) => {
                if (!isAdmin) return;
                archiveSubscription(id);
                showToast('Subscription archived from active view.', 'info');
              }}
              onDeleteSubscription={(id) => {
                if (!isAdmin) return;
                deleteSubscription(id);
                showToast('Subscription deleted.', 'info');
              }}
            />
          </>
        )}

        {/* VIEW 2: ALERTS & RENEWALS */}
        {activeSection === 'alerts' && (
          <>
            <Header
              activeSection="alerts"
              reportMonth={reportMonth}
              onMonthChange={setReportMonth}
              onPrintMonthly={() => handlePrint('month')}
              onPrintYearly={() => handlePrint('year')}
              user={user}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
            />

            <AlertsSection
              alerts={alerts}
              isAdmin={isAdmin}
              onEditSubscription={handleOpenEditSubscription}
              onNotify={showToast}
            />
          </>
        )}

        {/* VIEW 3: SUBSCRIPTIONS */}
        {activeSection === 'subscriptions' && (
          <>
            <Header
              activeSection="subscriptions"
              reportMonth={reportMonth}
              onMonthChange={setReportMonth}
              onPrintMonthly={() => handlePrint('month')}
              onPrintYearly={() => handlePrint('year')}
              user={user}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
            />

            <SubscriptionsTable
              subscriptions={subscriptions}
              isAdmin={isAdmin}
              onAddSubscription={handleOpenAddSubscription}
              onEditSubscription={handleOpenEditSubscription}
              onArchiveSubscription={(id) => {
                if (!isAdmin) return;
                archiveSubscription(id);
                showToast('Subscription archived from active view.', 'info');
              }}
              onDeleteSubscription={(id) => {
                if (!isAdmin) return;
                deleteSubscription(id);
                showToast('Subscription deleted.', 'info');
              }}
            />
          </>
        )}

        {/* VIEW 4: TOKEN USAGE & ANALYTICS */}
        {activeSection === 'tokens' && (
          <>
            <Header
              activeSection="tokens"
              reportMonth={reportMonth}
              onMonthChange={setReportMonth}
              onPrintMonthly={() => handlePrint('month')}
              onPrintYearly={() => handlePrint('year')}
              user={user}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
            />

            <TokenSection
              entries={selectedMonthEntries}
              reportMonth={reportMonth}
              selectedYear={selectedYear}
              tokenAllocationTotal={magnificAllocationTotal}
              tokensUsedTotal={selectedMonthTokensUsed}
              tokenCostTotal={selectedMonthTokenCost}
              isAdmin={isAdmin}
              onNewTokenEntry={handleOpenNewToken}
              onPrintMonthly={() => handlePrint('month')}
              onPrintYearly={() => handlePrint('year')}
            />

            <TokenHistoryTable
              entries={selectedMonthEntries}
              reportMonth={reportMonth}
              isAdmin={isAdmin}
              onEditToken={handleOpenEditToken}
              onArchiveToken={(id) => {
                if (!isAdmin) return;
                archiveTokenEntry(id);
                showToast('Token entry archived.', 'info');
              }}
              onDeleteToken={(id) => {
                if (!isAdmin) return;
                deleteTokenEntry(id);
                showToast('Token entry deleted.', 'info');
              }}
            />
          </>
        )}

        {/* VIEW 5: REPORTS & DATA */}
        {activeSection === 'reports' && (
          <>
            <Header
              activeSection="reports"
              reportMonth={reportMonth}
              onMonthChange={setReportMonth}
              onPrintMonthly={() => handlePrint('month')}
              onPrintYearly={() => handlePrint('year')}
              user={user}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
            />

            <ReportsDataSection
              reportMonth={reportMonth}
              selectedYear={selectedYear}
              subscriptions={state.subscriptions}
              tokenEntries={selectedMonthEntries}
              alerts={alerts}
              fullState={state}
              isAdmin={isAdmin}
              onPrint={handlePrint}
              onImport={importBackup}
              onReset={resetToDemo}
              onNotify={showToast}
            />
          </>
        )}

        {/* VIEW 6: KBZ BANK ASSET LIBRARY */}
        {activeSection === 'kbz-bank' && can(PERMISSIONS.ASSET_READ_BANK) && (
          <AssetLibrarySection
            library="kbz_bank"
            title="KBZ Bank Asset Library"
            subtitle="Official brand identities, vector logomarks, typography, and marketing key visuals for KBZ Bank."
            icon={Building2}
            user={user}
            onNotify={showToast}
          />
        )}

        {/* VIEW 7: KBZPAY ASSET LIBRARY */}
        {activeSection === 'kbz-pay' && can(PERMISSIONS.ASSET_READ_PAY) && (
          <AssetLibrarySection
            library="kbz_pay"
            title="KBZPay Asset Library"
            subtitle="Official brand assets, mobile app icon sets, partner lockups, and design systems for KBZPay."
            icon={CreditCard}
            user={user}
            onNotify={showToast}
          />
        )}

        {/* VIEW 8: KBZBANK COMMS ASSET LIBRARY */}
        {activeSection === 'kbz-comms' && can(PERMISSIONS.ASSET_READ_COMMS) && (
          <AssetLibrarySection
            library="kbz_comms"
            title="KBZBank Comms Asset Library"
            subtitle="Corporate communication templates, press kit lockups, event banners, and PR design materials."
            icon={Megaphone}
            user={user}
            onNotify={showToast}
          />
        )}

        {/* VIEW 9: PROCUREMENT SUPPLIER DIRECTORY */}
        {activeSection === 'suppliers' && can(PERMISSIONS.SUPPLIER_READ) && (
          <SupplierDirectorySection
            user={user}
            onNotify={showToast}
          />
        )}

        {/* VIEW 10: PRODUCTION ORDERS MATRIX */}
        {activeSection === 'production-orders' && can(PERMISSIONS.PRODUCTION_ORDER_READ) && (
          <ProductionOrdersSection
            user={user}
            onNotify={showToast}
          />
        )}

        {/* VIEW 11: USER MANAGEMENT & ACTIVE SESSIONS */}
        {activeSection === 'user-management' && isAdmin && (
          <UserManagementSection
            users={usersList}
            currentUserId={user?.id}
            currentUserRole={user?.role}
            isSuperAdmin={isSuperAdmin}
            onAddUser={handleOpenAddUser}
            onEditUser={handleOpenEditUser}
            onDeleteUser={handleDeleteUser}
          />
        )}

        <footer style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '24px 0 12px' }}>
          copyright by kbz marcomms.
        </footer>
      </main>

      {isAdmin && (
        <>
          <SubscriptionModal
            isOpen={isSubModalOpen}
            onClose={() => setIsSubModalOpen(false)}
            onSave={handleSaveSubscription}
            subscription={editingSubscription}
          />

          <TokenModal
            isOpen={isTokenModalOpen}
            onClose={() => setIsTokenModalOpen(false)}
            onSave={handleSaveToken}
            tokenEntry={editingToken}
            defaultMonth={reportMonth}
          />

          <UserModal
            isOpen={isUserModalOpen}
            onClose={() => setIsUserModalOpen(false)}
            onSave={handleSaveUser}
            editingUser={editingUser}
            isSuperAdmin={isSuperAdmin}
          />
        </>
      )}

      {printType && (
        <PrintReport
          type={printType}
          reportMonth={reportMonth}
          selectedYear={selectedYear}
          subscriptions={subscriptions}
          tokenEntries={printType === 'month' ? selectedMonthEntries : selectedYearEntries}
          alerts={alerts}
        />
      )}

      {toast && (
        <div className="toast-container">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <ErrorDialog
        isOpen={Boolean(appError)}
        title="Application Alert"
        message={appError}
        onClose={() => setAppError(null)}
      />
    </div>
  );
}

export function App() {
  // Automatically remove URL query parameters (e.g. ?utm_source=...) on initial load while preserving path and hash
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}

export default App;

