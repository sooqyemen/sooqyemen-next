'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // TODO: Replace with actual form submission logic
    // This should send the form data to a backend API or email service
    // For now, we simulate the submission
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1000);
  };

  return (
    <div className="contact-page" dir="rtl">
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="card" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ marginBottom: 12, fontSize: 28, fontWeight: 900 }}>اتصل بنا</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            نحن هنا لمساعدتك! أرسل لنا رسالتك وسنرد عليك في أقرب وقت ممكن.
          </p>

          {submitted ? (
            <div className="card" style={{ padding: 20, background: '#f0fdf4', border: '1px solid #86efac' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 style={{ color: '#166534', marginBottom: 8 }}>تم إرسال رسالتك بنجاح!</h2>
                <p className="muted" style={{ marginBottom: 16 }}>
                  شكراً لتواصلك معنا. سنرد على رسالتك خلال 24-48 ساعة.
                </p>
                <button
                  className="btn btnPrimary"
                  onClick={() => setSubmitted(false)}
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="name" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  الاسم الكامل <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  البريد الإلكتروني <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="example@email.com"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label htmlFor="subject" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  الموضوع <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="input"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="موضوع رسالتك"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="message" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  الرسالة <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="input"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="اكتب رسالتك هنا..."
                  style={{ resize: 'vertical', minHeight: 120 }}
                />
              </div>

              <div className="row" style={{ gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="submit"
                  className="btn btnPrimary"
                  disabled={submitting}
                  style={{ minWidth: 120 }}
                >
                  {submitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                </button>
                <Link href="/" className="btn">
                  العودة للرئيسية
                </Link>
              </div>
            </form>
          )}

          <div className="card" style={{ marginTop: 32, padding: 20, background: '#f8fafc' }}>
            <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 800 }}>طرق التواصل الأخرى</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontSize: 20 }}>📧</span>
                <span><strong>البريد الإلكتروني:</strong> at8888w@gmail.com</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontSize: 20 }}>📞</span>
                <span><strong>للدعم الفني:</strong> 735263681</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span style={{ fontSize: 20 }}>⏰</span>
                <span><strong>ساعات العمل:</strong> الأحد - الخميس، 9 صباحاً - 5 مساءً</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
