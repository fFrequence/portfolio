/* ============================================================
   FREQUENCE PORTFOLIO — main.js (single page)
   ============================================================ */

// ---- THEME TOGGLE ----
const html = document.documentElement;
const toggleBtn = document.getElementById('themeToggle');
const toggleIcon = toggleBtn?.querySelector('.toggle-icon');

const savedTheme = localStorage.getItem('freq-theme') || 'light';
html.setAttribute('data-theme', savedTheme);
updateIcon(savedTheme);

toggleBtn?.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('freq-theme', next);
  updateIcon(next);
});

function updateIcon(theme) {
  if (toggleIcon) {
    toggleIcon.textContent = theme === 'dark' ? '☽' : '☀︎';
  }
  updateLogo(theme);
}

function updateLogo(theme) {
  const logoImg = document.querySelector('.nav-logo-img');
  if (logoImg) {
    logoImg.src = theme === 'dark' ? 'imgs/lightlogo.png' : 'imgs/logo.png';
  }
}

// ---- BACK TO TOP ----
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---- SCROLL REVEAL ----
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Trigger above-fold elements immediately
setTimeout(() => {
  document.querySelectorAll('.reveal').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('visible');
      observer.unobserve(el);
    }
  });
}, 80);
