import { ROLES, PERMISSIONS, normalizeRole, hasPermission } from '../config/rbac';

const AUTH_STORAGE_KEY = 'creativeHubAuthUser';
const USERS_STORAGE_KEY = 'creativeHubUsersList';

export const INITIAL_USERS = [
  {
    id: '6a885d7f0b6e44fbb788d6a3',
    name: 'Kyaw Zin Soe',
    email: 'kyawzin.soe@kbzbank.com',
    password: 'admin123',
    role: ROLES.SUPER_ADMIN,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01'
  },
  {
    id: '6a885b504de9494c63ebe6c5',
    name: 'Su Hnin Phway',
    email: 'suhnin.phway@kbzbank.com',
    password: 'admin123',
    role: ROLES.SUPER_ADMIN,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01'
  },
  {
    id: '6a881cf50a029194dcb65c09',
    name: 'Sarah Admin',
    email: 'admin@creativehub.com',
    password: 'admin123',
    role: ROLES.ADMIN,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01'
  },
  {
    id: '6a881cf60a029194dcb65c0b',
    name: 'Alex Viewer',
    email: 'user@creativehub.com',
    password: 'user123',
    role: ROLES.VIEWER,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-10'
  }
];

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

export function logoutUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function loginUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail) {
    throw new Error('Please enter your work email.');
  }

  // 1. Try Backend API endpoint if online
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword || 'admin123' })
    });

    if (response.ok) {
      const data = await response.json();
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
  } catch (err) {
    // Fallback mode for static hosting / offline
  }

  // 2. Stored Users check
  const users = getStoredUsers();
  let foundUser = users.find(
    (u) => u.email && u.email.toLowerCase() === cleanEmail
  );

  // 3. Fallback check against INITIAL_USERS
  if (!foundUser) {
    foundUser = INITIAL_USERS.find(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );
  }

  // 4. Auto-onboarding for KBZ Bank or team member
  if (!foundUser) {
    const isSuperAdminDomain = cleanEmail.endsWith('@kbzbank.com') || cleanEmail.includes('kyawzin') || cleanEmail.includes('suhnin');
    const isAdminDomain = isSuperAdminDomain || cleanEmail.includes('admin') || cleanEmail.includes('marcomms');

    let defaultRole = ROLES.VIEWER;
    if (isSuperAdminDomain) {
      defaultRole = ROLES.SUPER_ADMIN;
    } else if (isAdminDomain) {
      defaultRole = ROLES.ADMIN;
    }

    const formattedName = cleanEmail
      .split('@')[0]
      .split('.')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');

    foundUser = {
      id: `u_${Date.now()}`,
      name: formattedName,
      email: cleanEmail,
      password: cleanPassword || (isAdminDomain ? 'admin123' : 'user123'),
      role: defaultRole,
      avatar: defaultRole === ROLES.SUPER_ADMIN
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString().split('T')[0]
    };
    users.unshift(foundUser);
    saveStoredUsers(users);
  }

  const sessionUser = {
    id: String(foundUser.id || foundUser._id),
    name: foundUser.name,
    email: foundUser.email,
    role: normalizeRole(foundUser.role),
    avatar: foundUser.avatar,
    token: 'local_jwt_token_demo'
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
  
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

export function saveStoredUsers(users) {
  const normalized = users.map((u) => ({
    ...u,
    id: String(u.id || u._id),
    role: normalizeRole(u.role)
  }));
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized));
}

export async function fetchUsersApi() {
  const token = getAuthToken();
  if (token && token !== 'local_jwt_token_demo') {
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
      console.log('[Auth Service] API /api/users offline, using local storage cache');
    }
  }
  return getStoredUsers();
}

export async function createUser(userData, currentUser = null) {
  const token = getAuthToken();
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  const requester = currentUser || getCurrentUser();
  const requestedRole = normalizeRole(userData.role || ROLES.VIEWER);

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
    role: requestedRole
  };

  if (token && token !== 'local_jwt_token_demo') {
    try {
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
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create user.');
      }
    } catch (err) {
      if (!err.message.includes('Failed to fetch') && !err.message.includes('offline')) {
        throw err;
      }
    }
  }

  // Local fallback
  const users = getStoredUsers();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error(`A user with email "${userData.email}" already exists.`);
  }

  const newUser = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: userData.name.trim(),
    email: cleanEmail,
    password: userData.password || (requestedRole === ROLES.VIEWER ? 'user123' : 'admin123'),
    role: requestedRole,
    avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);
  return newUser;
}

export async function updateUser(id, updatedFields, currentUser = null) {
  const token = getAuthToken();
  const requester = currentUser || getCurrentUser();
  const requesterId = String(requester?.id || requester?._id);

  const users = getStoredUsers();
  const targetUser = users.find((u) => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase());
  if (!targetUser) {
    throw new Error('User not found.');
  }

  const targetCurrentRole = normalizeRole(targetUser.role);

  // Determine required edit permission
  let editPerm;
  if (targetCurrentRole === ROLES.SUPER_ADMIN) {
    editPerm = PERMISSIONS.USER_UPDATE_SUPER_ADMIN;
  } else if (targetCurrentRole === ROLES.ADMIN) {
    editPerm = PERMISSIONS.USER_UPDATE_ADMIN;
  } else {
    editPerm = PERMISSIONS.USER_UPDATE_VIEWER;
  }

  if (!hasPermission(requester, editPerm, targetUser)) {
    throw new Error(`Access denied. You do not have permission to edit ${targetCurrentRole.replace('_', ' ')} accounts.`);
  }

  // Role modification permission
  if (updatedFields.role) {
    const newRole = normalizeRole(updatedFields.role);
    if (newRole !== targetCurrentRole) {
      if (normalizeRole(requester.role) !== ROLES.SUPER_ADMIN) {
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

  if (token && token !== 'local_jwt_token_demo') {
    try {
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
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update user.');
      }
    } catch (err) {
      if (!err.message.includes('Failed to fetch') && !err.message.includes('offline')) {
        throw err;
      }
    }
  }

  const updatedUsers = users.map((u) => {
    if (String(u.id) === String(id)) {
      const newRole = normalizeRole(requester.role) === ROLES.SUPER_ADMIN && updatedFields.role ? normalizeRole(updatedFields.role) : u.role;
      return {
        ...u,
        ...updatedFields,
        role: newRole,
        email: updatedFields.email ? updatedFields.email.trim().toLowerCase() : u.email
      };
    }
    return u;
  });

  saveStoredUsers(updatedUsers);
  return updatedUsers.find((u) => String(u.id) === String(id));
}

export async function deleteUser(id, currentUser = null) {
  const token = getAuthToken();
  const requester = currentUser || getCurrentUser();
  const requesterId = String(requester?.id || requester?._id);

  const users = getStoredUsers();
  const targetUser = users.find((u) => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase());
  if (!targetUser) {
    throw new Error('User not found.');
  }

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

  // Try API deletion first
  if (token && token !== 'local_jwt_token_demo') {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete user.');
      }
    } catch (err) {
      if (!err.message.includes('Failed to fetch') && !err.message.includes('offline')) {
        throw err;
      }
    }
  }

  // Remove permanently from stored list
  const updatedUsers = users.filter((u) => String(u.id) !== targetId && u.email.toLowerCase() !== targetUser.email.toLowerCase());
  saveStoredUsers(updatedUsers);
  return updatedUsers;
}
