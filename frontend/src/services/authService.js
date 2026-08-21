const AUTH_STORAGE_KEY = 'creativeHubAuthUser';
const USERS_STORAGE_KEY = 'creativeHubUsersList';

export const INITIAL_USERS = [
  {
    id: 'u_kyawzin',
    name: 'Kyaw Zin Soe',
    email: 'kyawzin.soe@kbzbank.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01'
  },
  {
    id: 'u_suhnin',
    name: 'Su Hnin Phway',
    email: 'suhnin.phway@kbzbank.com',
    password: 'admin123',
    role: 'admin',
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
    const isAdminDomain = cleanEmail.endsWith('@kbzbank.com') || cleanEmail.includes('admin') || cleanEmail.includes('marcomms');
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
      role: isAdminDomain ? 'admin' : 'user',
      avatar: isAdminDomain
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
        if (!users.some((u) => u.email && u.email.toLowerCase() === initial.email.toLowerCase())) {
          users.unshift(initial);
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
      console.log('[Auth Service] API /api/users error, using storage cache');
    }
  }
  return getStoredUsers();
}

export async function createUser(userData) {
  const token = getAuthToken();
  const cleanEmail = (userData.email || '').trim().toLowerCase();

  if (token && token !== 'local_jwt_token_demo') {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        const data = await res.json();
        const users = getStoredUsers();
        saveStoredUsers([...users, data.user]);
        return data.user;
      }
    } catch (err) {
      console.log('[Auth Service] API create user error, using local save');
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
    password: userData.password || 'user123',
    role: userData.role === 'admin' ? 'admin' : 'viewer',
    avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);
  return newUser;
}

export async function updateUser(id, updatedFields) {
  const token = getAuthToken();
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
        const users = getStoredUsers().map((u) => (u.id === id ? data.user : u));
        saveStoredUsers(users);
        return data.user;
      }
    } catch (err) {
      console.log('[Auth Service] API update user error');
    }
  }

  const users = getStoredUsers().map((u) => {
    if (u.id === id) {
      return {
        ...u,
        ...updatedFields,
        role: updatedFields.role ? (updatedFields.role === 'admin' ? 'admin' : 'viewer') : u.role,
        email: updatedFields.email ? updatedFields.email.trim().toLowerCase() : u.email
      };
    }
    return u;
  });

  saveStoredUsers(users);
  return users.find((u) => u.id === id);
}

export async function deleteUser(id) {
  const token = getAuthToken();
  if (token && token !== 'local_jwt_token_demo') {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.log('[Auth Service] API delete user error');
    }
  }

  const users = getStoredUsers().filter((u) => u.id !== id);
  saveStoredUsers(users);
  return users;
}
