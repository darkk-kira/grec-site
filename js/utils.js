// ============================================================
//  GREC GROUP — Utilitaires JS globaux
// ============================================================

// ── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:16px">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Scroll Reveal ────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── Navbar Scroll Effect ─────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  function updateNavbar() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
      navbar.classList.remove('transparent');
    } else {
      navbar.classList.remove('scrolled');
      navbar.classList.add('transparent');
    }
  }

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
}

// ── Mobile Menu ───────────────────────────────────────────────
function initMobileMenu() {
  const btn   = document.getElementById('mobile-menu-btn');
  const menu  = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  if (btn.dataset.menuReady === 'true') return;
  btn.dataset.menuReady = 'true';

  btn.addEventListener('click', () => {
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
  });

  // Fermer au clic sur un lien
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Auth State Observer ───────────────────────────────────────
function initAuthState() {
  auth.onAuthStateChanged(async (user) => {
    const loginLinks  = document.querySelectorAll('.auth-login-link');
    const logoutLinks = document.querySelectorAll('.auth-logout-link');
    const memberLinks = document.querySelectorAll('.auth-member-link');
    const adminLinks  = document.querySelectorAll('.auth-admin-link');
    const chatLinks   = document.querySelectorAll('.auth-chat-link');

    if (user) {
      loginLinks.forEach(el => el.classList.add('hidden'));
      logoutLinks.forEach(el => el.classList.remove('hidden'));
      memberLinks.forEach(el => el.classList.remove('hidden'));
      chatLinks.forEach(el => el.classList.remove('hidden'));

      // Vérifier si admin
      try {
        const adminDoc = await db.collection(COLLECTIONS.ADMINS).doc(user.uid).get();
        if (adminDoc.exists) {
          adminLinks.forEach(el => el.classList.remove('hidden'));
        }
      } catch (e) { /* pas admin */ }
    } else {
      loginLinks.forEach(el => el.classList.remove('hidden'));
      logoutLinks.forEach(el => el.classList.add('hidden'));
      memberLinks.forEach(el => el.classList.add('hidden'));
      chatLinks.forEach(el => el.classList.add('hidden'));
      adminLinks.forEach(el => el.classList.add('hidden'));
    }
  });
}

// ── Logout ───────────────────────────────────────────────────
function logout() {
  auth.signOut().then(() => {
    showToast('Déconnexion réussie', 'success');
    setTimeout(() => window.location.href = '/index.html', 1000);
  });
}

// ── Format Date FR ───────────────────────────────────────────
function formatDateFR(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Truncate Text ─────────────────────────────────────────────
function truncate(str, n) {
  return str && str.length > n ? str.substring(0, n) + '...' : str;
}

// ── Slugify ───────────────────────────────────────────────────
function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim();
}

// ── Image Upload Preview ──────────────────────────────────────
function previewImage(inputEl, imgEl) {
  inputEl.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { imgEl.src = ev.target.result; };
    reader.readAsDataURL(file);
  });
}

// ── Upload File to Firebase Storage ──────────────────────

// ── Responsive Helpers ────────────────────────────────────────
function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function isTablet() {
  return window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches;
}

function isDesktop() {
  return window.matchMedia('(min-width: 1025px)').matches;
}

function getDeviceType() {
  if (isMobile()) return 'mobile';
  if (isTablet()) return 'tablet';
  return 'desktop';
}

// ── Optimize Animations for Mobile ──────────────────────────
function initResponsiveAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobileDevice = isMobile();

  if (prefersReducedMotion || isMobileDevice) {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('[style*="animation"]').forEach(el => {
      el.style.animation = 'none';
    });
  }
}

// ── Debounce Helper ──────────────────────────────────────────
function debounce(func, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// ── Throttle Helper ──────────────────────────────────────────
function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ── Lazy Load Images ──────────────────────────────────────────
function initLazyLoad() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
  }
}

async function uploadFile(file, path) {
  const ref = storage.ref(path + Date.now() + '_' + file.name);
  const snap = await ref.put(file);
  return await snap.ref.getDownloadURL();
}

// ── Counter Animation ─────────────────────────────────────────
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.floor(start).toLocaleString('fr-FR');
  }, 16);
}

// ── Init Global ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollReveal();
  initAuthState();
});


