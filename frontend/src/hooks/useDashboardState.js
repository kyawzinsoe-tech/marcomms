import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchDashboardData, saveDashboardData, normalizeData, generateId, DEMO_DATA } from '../services/api';
import { getTodayISO, calculateDayDiff } from '../utils/formatters';

export function useDashboardState() {
  const [state, setState] = useState(() => {
    // Initial fallback while async load runs
    return normalizeData(DEMO_DATA);
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');

  // Load from storage on mount
  useEffect(() => {
    async function init() {
      const data = await fetchDashboardData();
      setState(data);
      setIsLoaded(true);
    }
    init();
  }, []);

  // Save changes automatically
  const persistState = useCallback(async (newState) => {
    setState(newState);
    setSaveStatus('Saving...');
    await saveDashboardData(newState);
    setSaveStatus('Saved');
  }, []);

  // Subscriptions Actions
  const addSubscription = useCallback((item) => {
    const newSub = {
      ...item,
      id: item.id || generateId('sub'),
      alertDays: Number(item.alertDays ?? 7),
      archived: false
    };
    persistState({
      ...state,
      subscriptions: [...state.subscriptions, newSub]
    });
  }, [state, persistState]);

  const updateSubscription = useCallback((id, updatedFields) => {
    const updated = state.subscriptions.map((sub) => {
      if (sub.id === id) {
        return {
          ...sub,
          ...updatedFields,
          alertDays: Number(updatedFields.alertDays ?? sub.alertDays ?? 7)
        };
      }
      return sub;
    });
    persistState({
      ...state,
      subscriptions: updated
    });
  }, [state, persistState]);

  const archiveSubscription = useCallback((id) => {
    const updated = state.subscriptions.map((sub) =>
      sub.id === id ? { ...sub, archived: true } : sub
    );
    persistState({
      ...state,
      subscriptions: updated
    });
  }, [state, persistState]);

  const deleteSubscription = useCallback((id) => {
    const updated = state.subscriptions.filter((sub) => sub.id !== id);
    persistState({
      ...state,
      subscriptions: updated
    });
  }, [state, persistState]);

  // Token Actions
  const addTokenEntry = useCallback((item) => {
    const newEntry = {
      ...item,
      id: item.id || generateId('tok'),
      tokens: Number(item.tokens || 0),
      archived: false
    };
    const updatedEntries = [...state.tokenEntries, newEntry];
    const month = item.date ? item.date.slice(0, 7) : state.reportMonth;
    persistState({
      ...state,
      reportMonth: month,
      tokenEntries: updatedEntries
    });
  }, [state, persistState]);

  const updateTokenEntry = useCallback((id, updatedFields) => {
    const updated = state.tokenEntries.map((tok) => {
      if (tok.id === id) {
        return {
          ...tok,
          ...updatedFields,
          tokens: Number(updatedFields.tokens ?? tok.tokens ?? 0)
        };
      }
      return tok;
    });
    persistState({
      ...state,
      tokenEntries: updated
    });
  }, [state, persistState]);

  const archiveTokenEntry = useCallback((id) => {
    const updated = state.tokenEntries.map((tok) =>
      tok.id === id ? { ...tok, archived: true } : tok
    );
    persistState({
      ...state,
      tokenEntries: updated
    });
  }, [state, persistState]);

  const deleteTokenEntry = useCallback((id) => {
    const updated = state.tokenEntries.filter((tok) => tok.id !== id);
    persistState({
      ...state,
      tokenEntries: updated
    });
  }, [state, persistState]);

  const setReportMonth = useCallback((month) => {
    persistState({
      ...state,
      reportMonth: month
    });
  }, [state, persistState]);

  const importBackup = useCallback((json) => {
    const normalized = normalizeData(json);
    persistState(normalized);
  }, [persistState]);

  const resetToDemo = useCallback(() => {
    const demo = normalizeData(DEMO_DATA);
    persistState(demo);
  }, [persistState]);

  // Selectors & Computed Metrics
  const visibleSubscriptions = useMemo(() => {
    return state.subscriptions.filter((s) => !s.archived);
  }, [state.subscriptions]);

  const activeSubscriptions = useMemo(() => {
    return visibleSubscriptions.filter((s) => s.status === 'Active');
  }, [visibleSubscriptions]);

  const totalSubscriptionsCount = visibleSubscriptions.length;
  const activeSubscriptionsCount = activeSubscriptions.length;
  const activePercentage = totalSubscriptionsCount
    ? Math.round((activeSubscriptionsCount / totalSubscriptionsCount) * 100)
    : 0;

  const knownMonthlyCost = useMemo(() => {
    const total = activeSubscriptions.reduce((sum, s) => {
      const cost = Number(s.cost);
      if (isNaN(cost) || cost <= 0) return sum;
      return sum + cost;
    }, 0);

    return Math.round((total + Number.EPSILON) * 100) / 100;
  }, [activeSubscriptions]);

  const magnificAllocationTotal = useMemo(() => {
    return visibleSubscriptions
      .filter((s) => s.product.toLowerCase().includes('magnific'))
      .reduce((sum, s) => sum + Number(s.initialTokens || 0), 0);
  }, [visibleSubscriptions]);

  const selectedMonthEntries = useMemo(() => {
    return state.tokenEntries
      .filter((e) => !e.archived && e.date?.slice(0, 7) === state.reportMonth)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [state.tokenEntries, state.reportMonth]);

  const selectedYear = useMemo(() => {
    return Number(state.reportMonth.slice(0, 4)) || new Date().getFullYear();
  }, [state.reportMonth]);

  const selectedYearEntries = useMemo(() => {
    return state.tokenEntries
      .filter((e) => !e.archived && e.date?.startsWith(String(selectedYear)))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [state.tokenEntries, selectedYear]);

  const selectedMonthTokensUsed = useMemo(() => {
    return selectedMonthEntries.reduce((sum, e) => sum + Number(e.tokens || 0), 0);
  }, [selectedMonthEntries]);

  const selectedMonthTokenCost = useMemo(() => {
    return selectedMonthEntries.reduce((sum, e) => sum + Number(e.cost || 0), 0);
  }, [selectedMonthEntries]);

  const alerts = useMemo(() => {
    const today = getTodayISO();
    return visibleSubscriptions
      .filter((s) => s.expiry)
      .map((s) => {
        const diff = calculateDayDiff(today, s.expiry);
        const windowDays = Number(s.alertDays ?? 7);
        if (diff < 0) {
          return { subscription: s, type: 'overdue', diff };
        } else if (diff <= windowDays) {
          return { subscription: s, type: 'due', diff };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.diff - b.diff);
  }, [visibleSubscriptions]);

  const overdueCount = useMemo(() => {
    return alerts.filter((a) => a.type === 'overdue').length;
  }, [alerts]);

  return {
    state,
    isLoaded,
    saveStatus,
    reportMonth: state.reportMonth,
    subscriptions: visibleSubscriptions,
    allSubscriptions: state.subscriptions,
    tokenEntries: state.tokenEntries,
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
  };
}
