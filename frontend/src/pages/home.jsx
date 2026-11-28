import { useState, useEffect } from 'react';
import { API } from '../config';

export default function Home() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '', service: 'Construction', message: ''
  });

  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(res => res.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching projects:", err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({firstName: '', lastName: '', email: '', phone: '', address: '', service: 'Construction', message: ''});
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const services = [
    { title: "Construction", desc: "Ground-up commercial builds, residential homes, and full renovations. We manage the project from foundation to finish.", img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80" },
    { title: "Engineering", desc: "Structural assessments, site planning, and professional engineering sign-offs for new builds and complex renovations.", img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80" },
    { title: "Plumbing", desc: "From rapid-response emergency leak repairs to full pipe replacements. We handle residential and commercial plumbing.", img: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&q=80" }
  ];

  return (
    <main>
      <section id="home" className="hero">
        <div>
          <h1>Excellence Built<br/>on Solid Ground</h1>
          <p>Honest, Reliable Builders, Plumbers & Engineers.</p>
          <div>
            <a href="#projects" className="btn-white">View Projects</a>
            <a href="#contact" className="btn-outline-white">Contact Us</a>
          </div>
        </div>
      </section>

      <section id="services" style={{ padding: '6rem 8%', background: 'white' }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '3rem', textAlign: 'center', color: 'var(--primary)' }}>Our Services</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          {services.map((s, i) => (
            <div key={i} className={`split-section ${i % 2 !== 0 ? 'reverse' : ''}`} style={{ padding: 0 }}>
              <div className="split-text">
                <h3 style={{ fontSize: '1.2rem', letterSpacing: '3px', marginBottom: '1rem' }}>{s.title}</h3>
                <h2 style={{ fontSize: '2.5rem' }}>Expert {s.title} Solutions</h2>
                <p>{s.desc}</p>
                <a href="#contact" className="btn-call" style={{ display: 'inline-block', marginTop: '1rem' }}>Request a Quote</a>
              </div>
              <div className="split-image" style={{ backgroundImage: `url('${s.img}')` }}></div>
            </div>
          ))}
        </div>
      </section>

      <section id="projects" className="projects-section">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2>Landmark Projects <span style={{color: 'var(--accent)'}}>//</span></h2>
          <p className="projects-subtitle">A visual portfolio of durability, precision, and superior design.</p>
        </div>

        <div className="carousel-container">
          {projects.length === 0 ? (
            <div style={{ color: 'white', textAlign: 'center', width: '100%', padding: '2rem' }}>
              Our latest projects are coming soon.
            </div>
          ) : (
            projects.map(project => (
              <div className="project-card" key={project.id}>
                <img src={project.image_url} alt={project.title} />
                <div className="project-overlay">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section id="profile" style={{ background: 'var(--bg-light)', padding: '6rem 8%' }}>
        <div style={{ marginBottom: '4rem' }}>
          <h3 style={{ color: 'var(--accent)', fontSize: '1rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>About Us</h3>
          <h1 style={{ fontSize: '4rem', color: 'var(--primary)', lineHeight: '1.1' }}>We Build for People</h1>
        </div>

        <div style={{ height: '50vh', background: `url('https://images.unsplash.com/photo-1541888086925-ebbcbfddb471?auto=format&fit=crop&q=80') center/cover`, borderRadius: '8px', marginBottom: '4rem' }}></div>

        <div className="split-section" style={{ background: 'white' }}>
          <div className="split-text">
            <h2 style={{ color: 'var(--accent)', fontSize: '2.5rem' }}>Amari-Kai Investments Pvt Ltd</h2>
          </div>
          <div className="split-text">
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Relationships</h3>
              <p style={{ color: 'var(--text-light)' }}>We believe in building strong relationships with our clients. This is the place to add a short description with relevant details, like pricing, duration and how to book.</p>
            </div>
            <div style={{ marginBottom: '2rem', borderTop: '1px solid #ddd', paddingTop: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Experience</h3>
              <p style={{ color: 'var(--text-light)' }}>With decades of combined experience, we bring expertise to every job. This is the place to add a short description with relevant details.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-text">
          <h2 style={{ fontSize: '3.5rem', marginBottom: '2rem', lineHeight: '1.1' }}>Start your next project</h2>
          <hr style={{ border: 'none', borderTop: '1px solid #555', margin: '2rem 0' }} />
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Get in touch</h2>
          <p style={{ color: '#aaa', marginBottom: '2rem' }}>Let's discuss how we can build your vision.</p>
          <p style={{ fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '1px', color: '#ccc' }}>
            Est. 2024 / Amari-Kai Investments /<br/>
            📞 +263 78 792 5423 / +263 78 353 3771<br/>
            ✉️ amarikaiinvestments@gmail.com
          </p>
        </div>

        <div className="contact-form" style={{ padding: '2rem 2.5rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Message Sent!</h2>
              <p style={{ color: 'var(--text-light)' }}>Thank you. Amari-Kai Investments will contact you shortly.</p>
              <button className="submit-btn" style={{ marginTop: '1rem', width: 'auto', padding: '0.8rem 2rem' }} onClick={() => setSubmitted(false)}>Send Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.8rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>First name *</label>
                  <input type="text" name="firstName" required placeholder="John" onChange={handleChange} value={formData.firstName} style={{ padding: '0.5rem 0' }} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Last name *</label>
                  <input type="text" name="lastName" required placeholder="Doe" onChange={handleChange} value={formData.lastName} style={{ padding: '0.5rem 0' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.8rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Email *</label>
                  <input type="email" name="email" required placeholder="john@example.com" onChange={handleChange} value={formData.email} style={{ padding: '0.5rem 0' }} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Phone</label>
                  <input type="tel" name="phone" placeholder="+263 78 792 5423" onChange={handleChange} value={formData.phone} style={{ padding: '0.5rem 0' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                <label>Address</label>
                <input type="text" name="address" placeholder="123 Main St, Harare" onChange={handleChange} value={formData.address} style={{ padding: '0.5rem 0' }} />
              </div>

              <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                <label>Service Needed</label>
                <select name="service" onChange={handleChange} value={formData.service} style={{ padding: '0.5rem 0' }}>
                  <option value="Construction">Construction</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Plumbing">Plumbing</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Additional information</label>
                <textarea name="message" rows="2" placeholder="Tell us about your project..." onChange={handleChange} value={formData.message} style={{ padding: '0.5rem 0' }}></textarea>
              </div>

              <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ padding: '0.8rem' }}>
                {isSubmitting ? 'Sending...' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
