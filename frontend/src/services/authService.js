import { ROLES, PERMISSIONS, normalizeRole, hasPermission } from '../config/rbac';

const AUTH_STORAGE_KEY = 'creativeHubAuthUser';
const USERS_STORAGE_KEY = 'creativeHubUsersList';

export function getAuthToken() {
  const user = getCurrentUser();
  return user?.token || null;
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed) {
      parsed.role = normalizeRole(parsed.role);
    }
    return parsed;
  } catch (err) {
    console.error('Error parsing stored session:', err);
    return null;
  }
}

export async function logoutUser() {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn('[Auth Service] Logout network call error:', err.message);
    }
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function loginUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Please enter both your work email and password.');
  }

  let response;
  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });
  } catch (err) {
    throw new Error('Authentication service unavailable. Unable to connect to server.');
  }

  if (!response.ok) {
    let errorMessage = 'Invalid email or password.';
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMessage = errData.error;
      }
    } catch {
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data || !data.token || !data.user) {
    throw new Error('Invalid authentication response from server.');
  }

  const sessionUser = {
    id: String(data.user.id || data.user._id),
    name: data.user.name,
    email: data.user.email,
    role: normalizeRole(data.user.role),
    avatar: data.user.avatar,
    token: data.token
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((u) => ({
          ...u,
          id: String(u.id || u._id),
          role: normalizeRole(u.role)
        }));
      }
    }
  } catch (err) {
    console.error('Error reading users from storage:', err);
  }
  return [];
}

export function saveStoredUsers(users) {
  const normalized = (users || []).map((u) => ({
    ...u,
    id: String(u.id || u._id),
    role: normalizeRole(u.role)
  }));
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized));
}

export async function fetchUsersApi() {
  const token = getAuthToken();
  if (!token) {
    return [];
  }

  try {
    const res = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        const formatted = data.users.map((u) => ({
          id: String(u.id || u._id),
          name: u.name,
          email: u.email,
          role: normalizeRole(u.role),
          avatar: u.avatar,
          createdAt: u.createdAt
        }));
        saveStoredUsers(formatted);
        return formatted;
      }
    }
  } catch (err) {
    console.warn('[Auth Service] /api/users request failed:', err.message);
  }
  return [];
}

export async function createUser(userData, currentUser = null) {
  const token = getAuthToken();
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  const cleanPassword = (userData.password || '').trim();
  const requester = currentUser || getCurrentUser();
  const requestedRole = normalizeRole(userData.role || ROLES.VIEWER);

  if (!cleanPassword) {
    throw new Error('Password is required.');
  }

  // Determine required permission
  let requiredPerm;
  if (requestedRole === ROLES.SUPER_ADMIN) {
    requiredPerm = PERMISSIONS.USER_CREATE_SUPER_ADMIN;
  } else if (requestedRole === ROLES.ADMIN) {
    requiredPerm = PERMISSIONS.USER_CREATE_ADMIN;
  } else {
    requiredPerm = PERMISSIONS.USER_CREATE_VIEWER;
  }

  if (!hasPermission(requester, requiredPerm)) {
    throw new Error(`Access denied. You do not have permission to create accounts with role "${requestedRole}".`);
  }

  const payload = {
    ...userData,
    email: cleanEmail,
    password: cleanPassword,
    role: requestedRole
  };

  if (!token) {
    throw new Error('Authentication required. Please sign in to create accounts.');
  }

  const res = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    const data = await res.json();
    const userObj = {
      id: String(data.user.id || data.user._id),
      name: data.user.name,
      email: data.user.email,
      role: normalizeRole(data.user.role),
      avatar: data.user.avatar,
      createdAt: data.user.createdAt
    };
    const users = getStoredUsers().filter((u) => u.email.toLowerCase() !== cleanEmail);
    saveStoredUsers([...users, userObj]);
    return userObj;
  } else {
    let errMsg = 'Failed to create user.';
    try {
      const errData = await res.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch {}
    throw new Error(errMsg);
  }
}

export async function updateUser(id, updatedFields, currentUser = null) {
  const token = getAuthToken();
  const requester = currentUser || getCurrentUser();

  const users = getStoredUsers();
  const targetUser = users.find((u) => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase());

  const targetCurrentRole = targetUser ? normalizeRole(targetUser.role) : ROLES.VIEWER;

  // Determine required edit permission
  let editPerm;
  if (targetCurrentRole === ROLES.SUPER_ADMIN) {
    editPerm = PERMISSIONS.USER_UPDATE_SUPER_ADMIN;
  } else if (targetCurrentRole === ROLES.ADMIN) {
    editPerm = PERMISSIONS.USER_UPDATE_ADMIN;
  } else {
    editPerm = PERMISSIONS.USER_UPDATE_VIEWER;
  }

  if (targetUser && !hasPermission(requester, editPerm, targetUser)) {
    throw new Error(`Access denied. You do not have permission to edit ${targetCurrentRole.replace('_', ' ')} accounts.`);
  }

  // Role modification permission
  if (updatedFields.role) {
    const newRole = normalizeRole(updatedFields.role);
    if (newRole !== targetCurrentRole) {
      if (normalizeRole(requester?.role) !== ROLES.SUPER_ADMIN) {
        throw new Error('Access denied. Only Super Administrators are authorized to change roles.');
      }
      if (targetCurrentRole === ROLES.SUPER_ADMIN && newRole !== ROLES.SUPER_ADMIN) {
        const superAdminCount = users.filter((u) => normalizeRole(u.role) === ROLES.SUPER_ADMIN).length;
        if (superAdminCount <= 1) {
          throw new Error('Operation blocked. Cannot demote the final remaining Super Administrator account.');
        }
      }
    }
  }

  if (!token) {
    throw new Error('Authentication required. Please sign in to update accounts.');
  }

  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updatedFields)
  });

  if (res.ok) {
    const data = await res.json();
    const userObj = {
      id: String(data.user.id || data.user._id),
      name: data.user.name,
      email: data.user.email,
      role: normalizeRole(data.user.role),
      avatar: data.user.avatar,
      createdAt: data.user.createdAt
    };
    const updatedList = users.map((u) => (String(u.id) === String(id) ? userObj : u));
    saveStoredUsers(updatedList);
    return userObj;
  } else {
    let errMsg = 'Failed to update user.';
    try {
      const errData = await res.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch {}
    throw new Error(errMsg);
  }
}

export async function deleteUser(id, currentUser = null) {
  const token = getAuthToken();
  const requester = currentUser || getCurrentUser();
  const requesterId = String(requester?.id || requester?._id);

  const users = getStoredUsers();
  const targetUser = users.find((u) => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase());

  if (targetUser) {
    const targetRole = normalizeRole(targetUser.role);
    const targetId = String(targetUser.id);
    const superAdminCount = users.filter((u) => normalizeRole(u.role) === ROLES.SUPER_ADMIN).length;

    // 1. Safety Rule: Cannot delete final remaining Super Admin
    if (targetRole === ROLES.SUPER_ADMIN && superAdminCount <= 1) {
      throw new Error('Protection rule: Cannot delete the final remaining Super Administrator account. At least one Super Admin must remain.');
    }

    // 2. Prevent self-deletion for Super Admin
    if (requesterId === targetId && targetRole === ROLES.SUPER_ADMIN) {
      throw new Error('You cannot delete your own active Super Administrator account. Please have another Super Admin manage this account.');
    }

    // 3. Permission check
    let deletePerm;
    if (targetRole === ROLES.SUPER_ADMIN) {
      deletePerm = PERMISSIONS.USER_DELETE_SUPER_ADMIN;
    } else if (targetRole === ROLES.ADMIN) {
      deletePerm = PERMISSIONS.USER_DELETE_ADMIN;
    } else {
      deletePerm = PERMISSIONS.USER_DELETE_VIEWER;
    }

    if (!hasPermission(requester, deletePerm, targetUser, { superAdminCount })) {
      throw new Error(`Access denied. You do not have permission to delete ${targetRole.replace('_', ' ')} accounts.`);
    }
  }

  if (!token) {
    throw new Error('Authentication required. Please sign in to delete accounts.');
  }

  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    const updatedUsers = users.filter((u) => String(u.id) !== String(id) && u.email.toLowerCase() !== String(id).toLowerCase());
    saveStoredUsers(updatedUsers);
    return updatedUsers;
  } else {
    let errMsg = 'Failed to delete user.';
    try {
      const errData = await res.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch {}
    throw new Error(errMsg);
  }
}
