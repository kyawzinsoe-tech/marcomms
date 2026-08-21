const AUTH_STORAGE_KEY = 'creativeHubAuthUser';
const USERS_STORAGE_KEY = 'creativeHubUsersList';

export const INITIAL_USERS = [
  {
    id: 'u_kyawzin',
    name: 'Kyaw Zin Soe',
    email: 'kyawzin.soe@kbzbank.com',
    password: 'admin123',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01'
  },
  {
    id: 'u_suhnin',
    name: 'Su Hnin Phway',
    email: 'suhnin.phway@kbzbank.com',
    password: 'admin123',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01'
  },
  {
    id: 'u_admin',
    name: 'Sarah Admin',
    email: 'admin@creativehub.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01'
  },
  {
    id: 'u_user',
    name: 'Alex Viewer',
    email: 'user@creativehub.com',
    password: 'user123',
    role: 'viewer',
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
    return raw ? JSON.parse(raw) : null;
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
        id: data.user.id || data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar,
        token: data.token
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    }
  } catch (err) {
    // Fallback mode for Netlify static hosting or offline
  }

  // 2. Direct check against INITIAL_USERS
  const preset = INITIAL_USERS.find(
    (u) => u.email && u.email.toLowerCase() === cleanEmail
  );

  if (preset) {
    const sessionUser = {
      id: preset.id,
      name: preset.name,
      email: preset.email,
      role: preset.role,
      avatar: preset.avatar,
      token: 'local_jwt_token_' + preset.id
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  }

  // 3. Stored Users check
  const users = getStoredUsers();
  let foundUser = users.find(
    (u) => u.email && u.email.toLowerCase() === cleanEmail
  );

  // 4. Auto-onboarding for KBZ Bank or any team member
  if (!foundUser) {
    const isSuperAdminDomain = cleanEmail.endsWith('@kbzbank.com') || cleanEmail.includes('kyawzin') || cleanEmail.includes('suhnin');
    const isAdminDomain = isSuperAdminDomain || cleanEmail.includes('admin') || cleanEmail.includes('marcomms');
    
    let defaultRole = 'viewer';
    if (isSuperAdminDomain) {
      defaultRole = 'super_admin';
    } else if (isAdminDomain) {
      defaultRole = 'admin';
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
      avatar: defaultRole === 'super_admin'
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString().split('T')[0]
    };
    users.unshift(foundUser);
    saveStoredUsers(users);
  }

  const sessionUser = {
    id: foundUser.id || foundUser._id,
    name: foundUser.name,
    email: foundUser.email,
    role: foundUser.role,
    avatar: foundUser.avatar,
    token: 'local_jwt_token_demo'
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    let users = raw ? JSON.parse(raw) : null;
    if (Array.isArray(users) && users.length > 0) {
      let modified = false;
      for (const initial of INITIAL_USERS) {
        const existingIdx = users.findIndex((u) => u.email && u.email.toLowerCase() === initial.email.toLowerCase());
        if (existingIdx === -1) {
          users.unshift(initial);
          modified = true;
        } else if (users[existingIdx].role !== initial.role) {
          // Sync upgraded roles from INITIAL_USERS
          users[existingIdx].role = initial.role;
          modified = true;
        }
      }
      if (modified) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
      return users;
    }
  } catch (err) {
    console.error('Error reading users from storage:', err);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

export function saveStoredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
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
        if (data.users) {
          saveStoredUsers(data.users);
          return data.users;
        }
      }
    } catch (err) {
      console.log('[Auth Service] API /api/users offline, using storage cache');
    }
  }
  return getStoredUsers();
}

export async function createUser(userData, currentUser = null) {
  const token = getAuthToken();
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  const requester = currentUser || getCurrentUser();
  const requesterRole = requester?.role;

  // RBAC Permission Check
  let assignedRole = 'viewer';
  if (requesterRole === 'super_admin') {
    assignedRole = ['super_admin', 'admin', 'viewer'].includes(userData.role) ? userData.role : 'viewer';
  } else if (requesterRole === 'admin') {
    if (userData.role === 'super_admin' || userData.role === 'admin') {
      throw new Error('Admins can only create Viewer accounts. Super Admin privileges required to create Admin accounts.');
    }
    assignedRole = 'viewer';
  } else {
    throw new Error('Access denied. You do not have permission to create user accounts.');
  }

  const payload = {
    ...userData,
    role: assignedRole
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
        const users = getStoredUsers();
        saveStoredUsers([...users, data.user]);
        return data.user;
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
    password: userData.password || (assignedRole === 'viewer' ? 'user123' : 'admin123'),
    role: assignedRole,
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
  const requesterRole = requester?.role;
  const requesterId = requester?.id;

  const users = getStoredUsers();
  const targetUser = users.find((u) => u.id === id);
  if (!targetUser) {
    throw new Error('User not found.');
  }

  const isSelf = requesterId === id;

  // RBAC Permission Check
  if (requesterRole === 'admin') {
    if (targetUser.role === 'super_admin') {
      throw new Error('Access denied. Administrators cannot edit Super Administrator accounts.');
    }
    if (targetUser.role === 'admin' && !isSelf) {
      throw new Error('Access denied. Administrators cannot edit other Administrator accounts.');
    }
    if (updatedFields.role && (updatedFields.role === 'admin' || updatedFields.role === 'super_admin') && targetUser.role !== updatedFields.role) {
      throw new Error('Access denied. Administrators cannot promote accounts to Admin or Super Admin.');
    }
  } else if (requesterRole !== 'super_admin') {
    throw new Error('Access denied. You do not have permission to edit accounts.');
  }

  // Protect last remaining Super Admin from demotion
  if (targetUser.role === 'super_admin' && updatedFields.role && updatedFields.role !== 'super_admin') {
    const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
    if (superAdminCount <= 1) {
      throw new Error('Operation blocked. You cannot demote the last remaining Super Administrator account.');
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
        const updatedList = users.map((u) => (u.id === id ? data.user : u));
        saveStoredUsers(updatedList);
        return data.user;
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
    if (u.id === id) {
      const newRole = requesterRole === 'super_admin' && updatedFields.role ? updatedFields.role : u.role;
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
  return updatedUsers.find((u) => u.id === id);
}

export async function deleteUser(id, currentUser = null) {
  const token = getAuthToken();
  const requester = currentUser || getCurrentUser();
  const requesterRole = requester?.role;
  const requesterId = requester?.id;

  const users = getStoredUsers();
  const targetUser = users.find((u) => u.id === id);
  if (!targetUser) {
    throw new Error('User not found.');
  }

  // 1. Protect last remaining Super Admin
  if (targetUser.role === 'super_admin') {
    const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
    if (superAdminCount <= 1) {
      throw new Error('Protection active: The last remaining Super Administrator account cannot be deleted.');
    }
  }

  // 2. Prevent self-deletion for Super Admin
  if (requesterId === id && targetUser.role === 'super_admin') {
    throw new Error('You cannot delete your own active Super Administrator account. Please have another Super Admin manage this account.');
  }

  // 3. Admin restrictions
  if (requesterRole === 'admin') {
    if (targetUser.role === 'super_admin') {
      throw new Error('Access denied. Administrators cannot delete Super Administrator accounts.');
    }
    if (targetUser.role === 'admin') {
      throw new Error('Access denied. Administrators cannot delete other Administrator accounts.');
    }
  } else if (requesterRole !== 'super_admin') {
    throw new Error('Access denied. You do not have permission to delete user accounts.');
  }

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

  const updatedUsers = users.filter((u) => u.id !== id);
  saveStoredUsers(updatedUsers);
  return updatedUsers;
}
