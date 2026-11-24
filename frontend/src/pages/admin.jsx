import { useState, useEffect, useRef } from 'react';

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('inquiries');
  
  const [adminName, setAdminName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success) {
        setAdminName(data.name);
        setLoggedIn(true);
      } else {
        alert("Invalid Email or Password");
      }
    } catch (error) {
      alert("Could not connect to the server.");
    }
  };

  useEffect(() => {
    if (loggedIn) {
      setLoading(true);
      fetch('http://localhost:5000/api/admin/inquiries')
        .then(res => res.json())
        .then(data => { setInquiries(data); setLoading(false); })
        .catch(err => { console.error(err); setLoading(false); });
    }
  }, [loggedIn]);

  const fetchProjects = () => {
    setLoadingProjects(true);
    fetch('http://localhost:5000/api/admin/projects')
      .then(res => res.json())
      .then(data => { setProjects(data); setLoadingProjects(false); })
      .catch(err => { console.error(err); setLoadingProjects(false); });
  };

  useEffect(() => {
    if (loggedIn && activeTab === 'projects') {
      fetchProjects();
    }
  }, [loggedIn, activeTab]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!imageFile) return alert("Please select an image.");
    
    setUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('title', title);
    formData.append('description', description);

    try {
      const response = await fetch('http://localhost:5000/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      if (data.success) {
        alert("Project uploaded successfully!");
        setTitle(''); setDescription(''); setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
        fetchProjects(); 
      } else {
        alert("Upload failed.");
      }
    } catch (error) {
      alert("Could not connect to server.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project? This cannot be undone.")) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/projects/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        fetchProjects(); 
      } else {
        alert("Failed to delete project.");
      }
    } catch (error) {
      alert("Could not connect to server.");
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
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="submit-btn" style={{ padding: '0.8rem' }}>Log In securely</button>
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
          <div style={{ padding: '1rem', cursor: 'pointer', color: '#ff6b6b', fontSize: '0.9rem' }} onClick={() => setLoggedIn(false)}>🚪 Logout</div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '3rem' }}>
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
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            {loading ? ( <div style={{ padding: '3rem', textAlign: 'center' }}>Loading data...</div> ) : inquiries.length === 0 ? ( <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>No inquiries yet.</div> ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Date</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Client</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Contact</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Service</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>{new Date(q.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{q.first_name} {q.last_name}<br/><span style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{q.address}</span></td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}><div>✉️ {q.email}</div><div>📞 {q.phone}</div></td>
                      <td style={{ padding: '1rem' }}>{q.service}</td>
                      <td style={{ padding: '1rem' }}>
                        <select defaultValue={q.status} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                          <option>New</option><option>Contacted</option><option>Quoted</option><option>Won</option><option>Lost</option>
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
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} ref={fileInputRef} required />
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
                {projects.map(project => (
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