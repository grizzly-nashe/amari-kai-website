import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/home'; 
import Admin from './pages/admin'; 

function Navigation() {
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const location = useLocation();

  useEffect(() => {
    const closeMenu = () => { setShowCallMenu(false); setShowMobileMenu(false); };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') return;
    const handleScroll = () => {
      const sections = ['home', 'services', 'projects', 'profile', 'contact'];
      let current = 'home';
      sections.forEach(sec => {
        const el = document.getElementById(sec);
        if (el && window.scrollY >= el.offsetTop - 100) current = sec;
      });
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const scrollTo = (id) => {
    setShowMobileMenu(false);
    if (location.pathname !== '/') {
      window.location.href = `/#${id}`;
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    setActiveSection(id);
  };

  if (location.pathname.includes('admin')) return null;

  return (
    <nav className="navbar" style={{ padding: '0.2rem 5%' }}>
      <Link to="/" className="logo" onClick={() => scrollTo('home')} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img src="/logo.png" alt="Amari-Kai Logo" style={{ height: '95px', width: '95px', objectFit: 'cover', borderRadius: '50%', backgroundColor: 'white', padding: '4px', border: '2px solid var(--accent)' }} />
        <span style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>AMARI-KAI</span>
      </Link>
      
      <div className="nav-links">
        <span className={`nav-link-item ${activeSection === 'home' ? 'active' : ''}`} onClick={() => scrollTo('home')}>Home</span>
        <span className={`nav-link-item ${activeSection === 'services' ? 'active' : ''}`} onClick={() => scrollTo('services')}>Services</span>
        <span className={`nav-link-item ${activeSection === 'projects' ? 'active' : ''}`} onClick={() => scrollTo('projects')}>Projects</span>
        <span className={`nav-link-item ${activeSection === 'profile' ? 'active' : ''}`} onClick={() => scrollTo('profile')}>Profile</span>
        <span className={`nav-link-item ${activeSection === 'contact' ? 'active' : ''}`} onClick={() => scrollTo('contact')}>Contact</span>
        
        <div style={{ position: 'relative' }}>
          <button className={`btn-call ${showCallMenu ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowCallMenu(!showCallMenu); }}>
            Call Now
          </button>
          {showCallMenu && (
            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <a href="tel:+263787925423" className="dropdown-item">📞 +263 78 792 5423</a>
              <a href="tel:+263783533771" className="dropdown-item">📞 +263 78 353 3771</a>
              <a href="https://wa.me/263787925423" target="_blank" rel="noreferrer" className="dropdown-item">💬 WhatsApp</a>
              <a href="mailto:amarikaiinvestments@gmail.com" className="dropdown-item">✉️ Email</a>
            </div>
          )}
        </div>
      </div>

      <div className="mobile-menu-btn" onClick={(e) => { e.stopPropagation(); setShowMobileMenu(!showMobileMenu); }}>☰</div>

      {showMobileMenu && (
        <div className="mobile-menu-dropdown" onClick={(e) => e.stopPropagation()}>
          <span onClick={() => scrollTo('home')}>Home</span>
          <span onClick={() => scrollTo('services')}>Services</span>
          <span onClick={() => scrollTo('projects')}>Projects</span>
          <span onClick={() => scrollTo('profile')}>Profile</span>
          <span onClick={() => scrollTo('contact')}>Contact</span>
          <a href="tel:+263787925423" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>📞 Call Now</a>
        </div>
      )}
    </nav>
  );
}

function App() {
  const location = useLocation();

  return (
    <div className="app-container">
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>

      {!location.pathname.includes('admin') && (
        <footer style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem 8% 1rem 8%' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: '2rem', marginBottom: '1rem' }}>
            
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'white', letterSpacing: '0.5px', lineHeight: '1.1' }}>
                AMARI-KAI<br/>INVESTMENTS
              </h1>
              <p style={{ color: '#888', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                Excellence Built on Solid Ground.
              </p>
            </div>

            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem', color: 'white', fontWeight: 800 }}>Inquiries</h4>
              
              <p style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '0.6rem' }}>
                For any inquiries or information, contact us:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', color: '#ccc', fontSize: '0.85rem', fontWeight: 500 }}>
                  <span>+263 78 792 5423</span>
                  <span style={{ color: '#666' }}>/</span>
                  <span>+263 78 353 3771</span>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                  <a href="https://wa.me/263787925423" target="_blank" rel="noreferrer" style={{ color: '#ccc', textDecoration: 'underline' }}>
                    WhatsApp Us
                  </a>
                  <span style={{ color: '#444' }}>|</span>
                  <a href="mailto:amarikaiinvestments@gmail.com" style={{ color: '#ccc', textDecoration: 'underline' }}>
                    amarikaiinvestments@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ color: '#666', fontSize: '0.7rem' }}>© 2024 Amari-Kai Investments Pvt Ltd. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span style={{ color: '#666', fontSize: '0.7rem', cursor: 'pointer' }}>Privacy Policy</span>
              <span style={{ color: '#666', fontSize: '0.7rem', cursor: 'pointer' }}>Terms of Service</span>
            </div>
          </div>
        </footer>
      )}

      {!location.pathname.includes('admin') && (
        <div className="mobile-bar">
          <a href="tel:+263787925423">📞 Call Now</a>
          <a href="https://wa.me/263787925423">💬 WhatsApp</a>
        </div>
      )}
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}