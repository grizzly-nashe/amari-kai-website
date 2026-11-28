import { useState, useEffect, useRef, useCallback } from 'react';
import { API } from '../config';

const TOKEN_KEY = 'amarikai_token';
const NAME_KEY = 'amarikai_admin_name';
const STATUSES = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'];

const storage = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
  remove: (key) => { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

// Shrinks big photos before upload (the server accepts up to 4 MB per image)
const compressImage = (file, maxSize = 1600, quality = 0.82) =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return resolve(file);
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

export default function Admin() {
  const [token, setToken] = useState(() => storage.get(TOKEN_KEY));
  const [adminName, setAdminName] = useState(() => storage.get(NAME_KEY) || '');
  const loggedIn = Boolean(token);

  const [activeTab, setActiveTab] = useState('inquiries');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const logout = useCallback(() => {
    storage.remove(TOKEN_KEY);
    storage.remove(NAME_KEY);
    setToken(null);
    setAdminName('');
  }, []);

  // fetch() that always sends the JWT and logs out if the server says it is invalid/expired
  const authFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        throw new Error('Session expired');
      }
      return res;
    },
    [token, logout]
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const response = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.token) {
        storage.set(TOKEN_KEY, data.token);
        storage.set(NAME_KEY, data.name || '');
        setAdminName(data.name || '');
        setToken(data.token);
        setPassword('');
      } else if (response.status === 401) {
        alert('Invalid Email or Password');
      } else {
        alert(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      alert('Could not connect to the server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/inquiries');
      const data = await res.json();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await authFetch('/api/admin/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (token) loadInquiries();
  }, [token, loadInquiries]);

  useEffect(() => {
    if (token && activeTab === 'projects') loadProjects();
  }, [token, activeTab, loadProjects]);

  const handleStatusChange = async (id, status) => {
    const previous = inquiries;
    setInquiries((list) => list.map((q) => (q.id === id ? { ...q, status } : q)));
    try {
      const res = await authFetch(`/api/admin/inquiries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Update failed');
    } catch (err) {
      if (err.message !== 'Session expired') {
        setInquiries(previous);
        alert('Could not update the status. Please try again.');
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert('Please select an image.');

    setUploading(true);
    try {
      const smallFile = await compressImage(imageFile);
      const formData = new FormData();
      formData.append('image', smallFile);
      formData.append('title', title);
      formData.append('description', description);

      // Do not set Content-Type here: the browser adds the multipart boundary
      const response = await authFetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await response.json().catch(() => ({}));

      if (data.success) {
        alert('Project uploaded successfully!');
        setTitle('');
        setDescription('');
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadProjects();
      } else {
        alert(data.message || 'Upload failed.');
      }
    } catch (error) {
      if (error.message !== 'Session expired') alert('Could not connect to server.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

    try {
      const response = await authFetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));

      if (data.success) {
        loadProjects();
      } else {
        alert(data.message || 'Failed to delete project.');
      }
    } catch (error) {
      if (error.message !== 'Session expired') alert('Could not connect to server.');
    }
  };

  if (!loggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <div style={{ background: 'white', padding: '3rem 2.5rem', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', width: '100%', maxWidth: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '50%' }} />
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label>Email Address</label>
              <input type="email" placeholder="admin@amarikai.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', display: 'flex', alignItems: 'center', color: 'var(--text-light)' }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className="submit-btn" style={{ padding: '0.8rem' }} disabled={loggingIn}>
              {loggingIn ? 'Logging in...' : 'Log In securely'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-light)' }}>
      <aside style={{ width: '260px', background: 'var(--primary)', color: 'white', padding: '2rem 1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '110px', width: '110px', objectFit: 'cover', borderRadius: '50%', backgroundColor: 'white', padding: '6px', border: '4px solid var(--accent)' }} />
        </div>

        <div style={{ padding: '1rem', cursor: 'pointer', borderRadius: '4px', background: activeTab === 'inquiries' ? 'var(--accent)' : 'transparent', marginBottom: '0.5rem', fontWeight: activeTab === 'inquiries' ? 600 : 400 }} onClick={() => setActiveTab('inquiries')}>
          📥 Client Inquiries
        </div>
        <div style={{ padding: '1rem', cursor: 'pointer', borderRadius: '4px', background: activeTab === 'projects' ? 'var(--accent)' : 'transparent', fontWeight: activeTab === 'projects' ? 600 : 400 }} onClick={() => setActiveTab('projects')}>
          🖼️ Manage Projects
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #444', paddingTop: '1rem' }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '1rem', color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem', textDecoration: 'none' }}>
            🌐 View Website
          </a>
          <div style={{ padding: '1rem', cursor: 'pointer', color: '#ff6b6b', fontSize: '0.9rem' }} onClick={logout}>🚪 Logout</div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '3rem', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: 'var(--primary)' }}>{activeTab === 'inquiries' ? 'Client Inquiries & Emails' : 'Manage Projects'}</h1>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>Admin</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>{adminName}</div>
            </div>
          </div>
        </div>

        {activeTab === 'inquiries' && (
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>Loading data...</div>
            ) : inquiries.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>No inquiries yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Date</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Client</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Contact</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Service</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Message</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((q) => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                      <td style={{ padding: '1rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>{new Date(q.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{q.first_name} {q.last_name}<br /><span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{q.address}</span></td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}><div>✉️ {q.email}</div><div>📞 {q.phone}</div></td>
                      <td style={{ padding: '1rem' }}>{q.service}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-main)', maxWidth: '280px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{q.message || '—'}</td>
                      <td style={{ padding: '1rem' }}>
                        <select
                          value={q.status || 'New'}
                          onChange={(e) => handleStatusChange(q.id, e.target.value)}
                          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                          {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px', marginBottom: '3rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Upload New Project</h3>
              <form onSubmit={handleUpload}>
                <div className="form-group">
                  <label>Project Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Commercial Plaza" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" required placeholder="Structural engineering and plumbing..." />
                </div>
                <div className="form-group">
                  <label>Select Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0] || null)} ref={fileInputRef} required />
                </div>
                <button type="submit" className="submit-btn" disabled={uploading}>
                  {uploading ? 'Uploading to Cloudinary...' : 'Upload Project'}
                </button>
              </form>
            </div>

            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Uploaded Projects</h3>
            {loadingProjects ? (
              <p>Loading projects...</p>
            ) : projects.length === 0 ? (
              <p style={{ color: 'var(--text-light)' }}>No projects uploaded yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {projects.map((project) => (
                  <div key={project.id} style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <img src={project.image_url} alt={project.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{project.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
                      <button
                        onClick={() => handleDelete(project.id)}
                        style={{ width: '100%', padding: '0.6rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, transition: '0.2s' }}
                      >
                        🗑️ Delete Project
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
