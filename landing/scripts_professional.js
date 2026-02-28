/* ========================================
   TELLBILL PROFESSIONAL LANDING PAGE
   JavaScript Interactions
   ======================================== */

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
// DEMO BUTTON INTERACTION
// ========================================

function setupDemoButton() {
    const demoButton = document.querySelector('button:contains("See Demo")') || 
                       Array.from(document.querySelectorAll('button')).find(btn => 
                           btn.textContent.includes('See Demo')
                       );
    
    if (demoButton) {
        demoButton.addEventListener('click', () => {
            // Track demo click
            if (typeof gtag !== 'undefined') {
                gtag('event', 'demo_viewed');
            }
            
            console.log('Demo button clicked');
            // Could add modal, video player, etc.
        });
    }
}

// ========================================
// FORM HANDLING (FOR FUTURE USE)
// ========================================

function setupForms() {
    const forms = document.querySelectorAll('form');
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
            setupFAQ();
            setupSmoothScroll();
            setupCTATracking();
            setupNavbarScroll();
            setupScrollAnimations();
            setupLazyLoading();
            setupDemoButton();
            setupForms();
        });
    } else {
        setupFAQ();
        setupSmoothScroll();
        setupCTATracking();
        setupNavbarScroll();
        setupScrollAnimations();
        setupLazyLoading();
        setupDemoButton();
        setupForms();
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
        // PerformanceObserver not available in all browsers
    }
}
