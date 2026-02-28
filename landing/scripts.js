// ========================================
// TELLBILL LANDING PAGE - SCRIPTS
// Contractor-focused version
// ========================================

// ========================================
// FAQ ACCORDION FUNCTIONALITY
// ========================================

function setupFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-question');
    
    faqItems.forEach(button => {
        button.addEventListener('click', () => {
            const answer = button.nextElementSibling;
            const isActive = button.classList.contains('active');
            
            // Close all other items
            document.querySelectorAll('.faq-answer.active').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelectorAll('.faq-question.active').forEach(item => {
                item.classList.remove('active');
            });
            
            // Open clicked item if not already active
            if (!isActive) {
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
            if (href !== '#') {
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
// DEMO BUTTON INTERACTION
// ========================================

function setupDemoButton() {
    const demoBtns = document.querySelectorAll('.btn:contains("Play"), .btn:contains("Demo")');
    
    // More reliable selector
    document.querySelectorAll('.btn, button').forEach(btn => {
        const text = btn.textContent || '';
        if ((text.includes('Play') || text.includes('Demo')) && text.includes('video')) {
            btn.addEventListener('click', () => {
                const voiceDemo = document.querySelector('.voice-demo');
                if (voiceDemo) {
                    voiceDemo.style.transform = 'scale(1.02)';
                    voiceDemo.style.transition = 'all 0.3s ease';
                    setTimeout(() => {
                        voiceDemo.style.transform = 'scale(1)';
                    }, 300);
                }
                
                // Track event if GA4 available
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'demo_clicked', { source: 'demo_button' });
                }
            });
        }
    });
}

// ========================================
// CTA BUTTONS TRACKING
// ========================================

function setupCTAButtons() {
    document.querySelectorAll('.btn-primary, .btn-lg').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.textContent || '';
            
            if (text.includes('Try Free') || text.includes('Get Started') || text.includes('Free Trial') || text.includes('Started')) {
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'cta_clicked', { 
                        button_text: text.substring(0, 50),
                        button_type: 'primary'
                    });
                }
            }
        });
    });
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
                    }
                    img.classList.add('loaded');
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
// ANIMATE ON SCROLL
// ========================================

function setupScrollAnimations() {
    if ('IntersectionObserver' in window) {
        const elementObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1
        });
        
        // Add animation classes to elements
        const animatedElements = document.querySelectorAll(
            '.feature-block, .problem-item, .type-card, .testimonial-card, .flow-step, .pricing-card'
        );
        
        animatedElements.forEach(el => {
            el.classList.add('animate-on-scroll');
            elementObserver.observe(el);
        });
    }
}

// ========================================
// NAVBAR SCROLL EFFECT
// ========================================

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            navbar.style.boxShadow = 'none';
            navbar.style.background = 'white';
        }
    }, { passive: true });
}

// ========================================
// FORM HANDLING (Future)
// ========================================

function setupFormHandling() {
    // Placeholder for future form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_submit', { 
                    form_name: form.name || 'contact'
                });
            }
            
            console.log('Form submitted:', form);
        });
    });
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupFAQAccordion();
            setupSmoothScroll();
            setupDemoButton();
            setupCTAButtons();
            setupLazyLoading();
            setupScrollAnimations();
            setupNavbarScroll();
            setupFormHandling();
        });
    } else {
        setupFAQAccordion();
        setupSmoothScroll();
        setupDemoButton();
        setupCTAButtons();
        setupLazyLoading();
        setupScrollAnimations();
        setupNavbarScroll();
        setupFormHandling();
    }
}

// Initialize on load
init();

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Track events helper
function trackEvent(eventName, data = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, data);
    }
    console.log(`Event tracked: ${eventName}`, data);
}

// Debounce helper
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
