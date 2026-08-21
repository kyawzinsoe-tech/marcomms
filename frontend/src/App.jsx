import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { useDashboardState } from './hooks/useDashboardState';
import {
  getStoredUsers,
  createUser,
  updateUser,
  deleteUser
} from './services/authService';
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
import { DataBackup } from './components/DataBackup';
import { SubscriptionModal } from './components/SubscriptionModal';
import { TokenModal } from './components/TokenModal';
import { PrintReport } from './components/PrintReport';
import { Toast } from './components/Toast';

function DashboardApp() {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();

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

  const [activeSection, setActiveSection] = useState('dashboard');
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [printType, setPrintType] = useState(null);
  const [toast, setToast] = useState(null);

  // User Management State
  const [usersList, setUsersList] = useState(() => getStoredUsers());
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
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

  // User Management Handlers
  const handleOpenAddUser = () => {
    if (!isAdmin) return;
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (targetUser) => {
    if (!isAdmin) return;
    setEditingUser(targetUser);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (userData) => {
    if (!isAdmin) return;
    try {
      if (editingUser) {
        updateUser(editingUser.id, userData);
        setUsersList(getStoredUsers());
        showToast(`User "${userData.name}" updated successfully.`, 'success');
      } else {
        createUser(userData);
        setUsersList(getStoredUsers());
        showToast(`New user "${userData.name}" (${userData.role}) created!`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUser = (userId) => {
    if (!isAdmin) return;
    const updated = deleteUser(userId);
    setUsersList(updated);
    showToast('User account removed.', 'info');
  };

  // PDF / Print Generation
  const handlePrint = (type) => {
    if (!isAdmin) return;
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 60);
  };

  // Observe scroll to update active section in sidebar
  useEffect(() => {
    const sectionIds = isAdmin
      ? ['dashboard', 'alerts', 'subscriptions', 'tokens', 'users', 'reports']
      : ['dashboard', 'subscriptions', 'tokens'];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAdmin]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Sidebar
        activeSection={activeSection}
        onNavigate={(sec) => setActiveSection(sec)}
        alertCount={alerts.length}
        saveStatus={saveStatus}
        user={user}
        isAdmin={isAdmin}
        onLogout={logout}
      />

      <main className="main-content">
        <Header
          reportMonth={reportMonth}
          onMonthChange={setReportMonth}
          onPrintMonthly={() => handlePrint('month')}
          onPrintYearly={() => handlePrint('year')}
          user={user}
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

        {isAdmin && (
          <AlertsSection
            alerts={alerts}
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
            archiveSubscription(id);
            showToast('Subscription archived from active view.', 'info');
          }}
          onDeleteSubscription={(id) => {
            deleteSubscription(id);
            showToast('Subscription deleted.', 'info');
          }}
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
            archiveTokenEntry(id);
            showToast('Token entry archived.', 'info');
          }}
          onDeleteToken={(id) => {
            deleteTokenEntry(id);
            showToast('Token entry deleted.', 'info');
          }}
        />

        {isAdmin && (
          <>
            <UserManagementSection
              users={usersList}
              currentUserId={user?.id}
              onAddUser={handleOpenAddUser}
              onEditUser={handleOpenEditUser}
              onDeleteUser={handleDeleteUser}
            />

            <DataBackup
              fullState={state}
              onImport={importBackup}
              onReset={resetToDemo}
              onNotify={showToast}
            />
          </>
        )}

        <footer style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '24px 0 12px' }}>
          Creative Subscription Report &bull; React &bull; {isAdmin ? 'Admin Mode' : 'User (Viewer) Mode'}
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
          />

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
        </>
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
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}

export default App;
