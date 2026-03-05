/* ========================================
   TELLBILL PROFESSIONAL LANDING PAGE
   JavaScript Interactions
   ======================================== */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
    // Google Play Store app link - opens in new tab
    GOOGLE_PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=com.tellbill.app',
    // Demo video URL
    DEMO_VIDEO_URL: 'https://example.com/demo.mp4',
    // Enterprise for submission endpoint (can be connected to backend)
    ENTERPRISE_FORM_ENDPOINT: '/api/enterprise-inquiry'
};

// ========================================
// MODAL FUNCTIONS
// ========================================

/**
 * Opens a modal dialog
 * @param {string} modalId - ID of the modal element to open
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        // Disable body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Track modal opening with GA4
        if (typeof gtag !== 'undefined') {
            gtag('event', 'modal_opened', {
                modal_name: modalId
            });
        }
        
        console.log(`Modal opened: ${modalId}`);
    }
}

/**
 * Closes a modal dialog
 * @param {string} modalId - ID of the modal element to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Re-enable body scroll
        document.body.style.overflow = 'auto';
        
        // Pause video if demo modal was closed
        if (modalId === 'demo-modal') {
            const video = document.getElementById('demo-video');
            if (video) {
                video.pause();
            }
        }
        
        console.log(`Modal closed: ${modalId}`);
    }
}

/**
 * Setup modal event listeners - allow clicking overlay to close modal
 */
function setupModalListeners() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                const modal = overlay.parentElement;
                closeModal(modal.id);
            }
        });
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="display: flex"]');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
}

// ========================================
// GOOGLE PLAY STORE REDIRECT
// ========================================

/**
 * Redirects user to Google Play Store in a new tab
 * Prevents page reload and tracks the action
 */
function handleStoreRedirect() {
    // Track store redirect with GA4
    if (typeof gtag !== 'undefined') {
        gtag('event', 'store_redirect_click', {
            store: 'google_play',
            url: CONFIG.GOOGLE_PLAY_STORE_URL
        });
    }
    
    console.log('Redirecting to Google Play Store:', CONFIG.GOOGLE_PLAY_STORE_URL);
    
    // Open in new tab without stopping page functionality
    window.open(CONFIG.GOOGLE_PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
}

/**
 * Setup all store redirect buttons
 */
function setupStoreRedirects() {
    const storeButtons = document.querySelectorAll('[data-action="store-redirect"]');
    
    storeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            handleStoreRedirect();
        });
    });
    
    console.log(`Setup ${storeButtons.length} store redirect button(s)`);
}

// ========================================
// DEMO VIDEO MODAL
// ========================================

/**
 * Setup demo video buttons to open modal
 */
function setupDemoModal() {
    const demoButtons = document.querySelectorAll('[data-action="demo-modal"]');
    
    demoButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update video source in case it was changed
            const video = document.getElementById('demo-video');
            if (video && video.querySelector('source')) {
                video.querySelector('source').src = CONFIG.DEMO_VIDEO_URL;
                video.load();
            }
            
            // Open modal
            openModal('demo-modal');
        });
    });
    
    console.log(`Setup demo modal button(s)`);
}

// ========================================
// ENTERPRISE CONTACT FORM
// ========================================

/**
 * Handle enterprise form submission
 * @param {Event} event - Form submission event
 */
function handleEnterpriseSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Track form submission with GA4
    if (typeof gtag !== 'undefined') {
        gtag('event', 'enterprise_inquiry_submit', {
            company: data.company,
            team_size: data.team_size
        });
    }
    
    console.log('Enterprise inquiry submitted:', data);
    
    // Send to backend (optional - can be connected to your backend)
    // For demo, we'll just show a success message
    showSuccessMessage(form);
    
    // In production, you would send this to your backend:
    /*
    fetch(CONFIG.ENTERPRISE_FORM_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            showSuccessMessage(form);
        } else {
            showErrorMessage(form);
        }
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        showErrorMessage(form);
    });
    */
}

/**
 * Show success message after form submission
 * @param {HTMLFormElement} form - The form element
 */
function showSuccessMessage(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    const originalClass = submitButton.className;
    
    // Update button to show success
    submitButton.textContent = '✓ Thank you! We\'ll be in touch.';
    submitButton.style.backgroundColor = '#22c55e';
    submitButton.disabled = true;
    
    // Reset form
    form.reset();
    
    // Revert button after 3 seconds, then close modal
    setTimeout(() => {
        submitButton.textContent = originalText;
        submitButton.className = originalClass;
        submitButton.style.backgroundColor = '';
        submitButton.disabled = false;
        
        // Close modal after delay
        closeModal('enterprise-modal');
    }, 3000);
}

/**
 * Setup enterprise contact form modal
 */
function setupEnterpriseModal() {
    const enterpriseButtons = document.querySelectorAll('[data-action="enterprise-modal"]');
    
    enterpriseButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('enterprise-modal');
        });
    });
    
    // Setup form submission
    const enterpriseForm = document.getElementById('enterprise-form');
    if (enterpriseForm) {
        enterpriseForm.addEventListener('submit', handleEnterpriseSubmit);
    }
    
    console.log(`Setup enterprise modal button(s) and form`);
}

// ========================================
// FAQ ACCORDION
// ========================================

function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-question');
    
    faqItems.forEach(button => {
        button.addEventListener('click', () => {
            const wasActive = button.classList.contains('active');
            const answer = button.nextElementSibling;
            
            // Close all other items
            document.querySelectorAll('.faq-question.active').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelectorAll('.faq-answer.active').forEach(item => {
                item.classList.remove('active');
            });
            
            // Open clicked item if not already active
            if (!wasActive) {
                button.classList.add('active');
                answer.classList.add('active');
            }
        });
    });
}

// ========================================
// SMOOTH SCROLL FOR NAVIGATION
// ========================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// ========================================
// CTA TRACKING
// ========================================

function setupCTATracking() {
    const ctaButtons = document.querySelectorAll('.btn-primary, .btn-cta');
    
    ctaButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const buttonText = btn.textContent.trim();
            
            // Track with GA4 if available
            if (typeof gtag !== 'undefined') {
                gtag('event', 'cta_click', {
                    button_text: buttonText,
                    button_type: btn.classList.contains('btn-cta') ? 'final' : 'standard'
                });
            }
            
            // Log for debugging
            console.log('CTA clicked:', buttonText);
        });
    });
}

// ========================================
// NAVBAR SHADOW ON SCROLL
// ========================================

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 50) {
            navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    }, { passive: true });
}

// ========================================
// SCROLL ANIMATIONS
// ========================================

function setupScrollAnimations() {
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe feature cards, testimonials, pricing cards
        const elementsToObserve = document.querySelectorAll(
            '.feature-card, .testimonial, .pricing-card, .why-card'
        );
        
        elementsToObserve.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.5s ease';
            observer.observe(el);
        });
    }
}

// ========================================
// LAZY LOADING FOR IMAGES
// ========================================

function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ========================================
// FORM HANDLING (FOR FUTURE USE)
// ========================================

function setupForms() {
    const forms = document.querySelectorAll('form:not(#enterprise-form)');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_submit', {
                    form_name: form.name || 'contact_form'
                });
            }
            
            console.log('Form submitted');
        });
    });
}

// ========================================
// UTILITY: TRACK EVENTS
// ========================================

function trackEvent(eventName, data = {}) {
    // Track with GA4 if available
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, data);
    }
    console.log(`Event: ${eventName}`, data);
}

// ========================================
// UTILITY: DEBOUNCE
// ========================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
    console.log('TellBill Professional Landing Page Initialized');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Core functionality
            setupFAQ();
            setupSmoothScroll();
            setupCTATracking();
            setupNavbarScroll();
            setupScrollAnimations();
            setupLazyLoading();
            setupForms();
            
            // NEW: Interactive features with modals and redirects
            setupModalListeners();      // Handle modal open/close interactions
            setupStoreRedirects();       // All "Start Free Trial" buttons
            setupDemoModal();            // Demo video modal
            setupEnterpriseModal();      // Enterprise contact form modal
        });
    } else {
        // Core functionality
        setupFAQ();
        setupSmoothScroll();
        setupCTATracking();
        setupNavbarScroll();
        setupScrollAnimations();
        setupLazyLoading();
        setupForms();
        
        // NEW: Interactive features with modals and redirects
        setupModalListeners();      // Handle modal open/close interactions
        setupStoreRedirects();       // All "Start Free Trial" buttons
        setupDemoModal();            // Demo video modal
        setupEnterpriseModal();      // Enterprise contact form modal
    }
}

// Start initialization
init();

// ========================================
// PERFORMANCE MONITORING (Optional)
// ========================================

if ('performance' in window && 'PerformanceObserver' in window) {
    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 3000) {
                    console.warn('Long task detected:', entry);
                }
            }
        });
        observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
        console.log('Performance monitoring not available');
    }
}
        // PerformanceObserver not available in all browsers
