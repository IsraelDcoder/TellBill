// ========================================
// TELLBILL LANDING PAGE - SCRIPTS
// ========================================

// DOM Ready
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupSmoothScroll();
    setupFAQ();
    setupScrollAnimations();
    setupIntersectionObserver();
    setupCTAButtons();
});

// ========================================
// SMOOTH SCROLL
// ========================================

function setupSmoothScroll() {
    // Already handled by `scroll-behavior: smooth` in CSS
    // This adds enhanced smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // Skip if href is just "#"
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Add active state to nav link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
}

// ========================================
// FAQ ACCORDION
// ========================================

function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
            
            // Animate arrow
            const arrow = question.querySelector('svg');
            if (arrow) {
                arrow.style.transform = item.classList.contains('active') 
                    ? 'rotate(180deg)' 
                    : 'rotate(0deg)';
            }
        });
        
        // Allow keyboard navigation
        question.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                question.click();
            }
        });
    });
}

// ========================================
// SCROLL ANIMATIONS
// ========================================

function setupScrollAnimations() {
    // Add fade-in-scroll class to elements that should animate
    const elements = document.querySelectorAll(
        '.problem-card, .feature-card, .step, .testimonial-card, .faq-item'
    );
    
    elements.forEach(el => {
        el.classList.add('fade-in-scroll');
    });
}

// ========================================
// INTERSECTION OBSERVER FOR SCROLL ANIMATIONS
// ========================================

function setupIntersectionObserver() {
    const options = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, options);
    
    document.querySelectorAll('.fade-in-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ========================================
// CTA BUTTON INTERACTIONS
// ========================================

function setupCTAButtons() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    
    buttons.forEach(button => {
        // Handle Sign-up flows (replace with actual app logic)
        if (button.textContent.includes('Start Free Trial') || 
            button.textContent.includes('Test TellBill') ||
            button.textContent.includes('Start Your Free')) {
            button.addEventListener('click', handleTrialSignup);
        }
        
        // Add click feedback
        button.addEventListener('click', function(e) {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

// ========================================
// TRIAL SIGNUP HANDLER
// ========================================

function handleTrialSignup(e) {
    // This would integrate with your actual signup flow
    console.log('Trial signup clicked');
    
    // Option 1: Redirect to app
    // window.location.href = '/app/signup?trial=true';
    
    // Option 2: Open modal (implement as needed)
    // showSignupModal();
    
    // Option 3: Show alert for demo
    console.log('Redirecting to trial signup...');
}

// ========================================
// DEMO BUTTON INTERACTION
// ========================================

function setupDemoButton() {
    const demoBtns = document.querySelectorAll('.demo-btn, [class*="demo"]');
    
    demoBtns.forEach(btn => {
        if (btn.textContent.includes('Demo') || btn.textContent.includes('Play') || btn.textContent.includes('Test')) {
            btn.addEventListener('click', () => {
                // Animate the demo mockup
                const demoPreview = document.querySelector('.demo-preview');
                if (demoPreview) {
                    demoPreview.style.transform = 'scale(1.02)';
                    demoPreview.style.transition = 'all 0.3s ease';
                    setTimeout(() => {
                        demoPreview.style.transform = 'scale(1)';
                    }, 300);
                    
                    // Could add modal or video player here
                    console.log('Demo video would play here');
                    trackEvent('demo_clicked', { source: 'demo_button' });
                }
            });
        }
    });
}

// Call after DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDemoButton);
} else {
    setupDemoButton();
}

// ========================================
// NAVBAR STICKY BEHAVIOR
// ========================================

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
    }
});

// ========================================
// MOBILE MENU TOGGLE (if needed)
// ========================================

function setupMobileMenu() {
    const menuButton = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
        
        // Close menu when link is clicked
        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
            });
        });
    }
}

// ========================================
// FORM VALIDATION (if forms are added)
// ========================================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateForm(form) {
    const email = form.querySelector('input[type="email"]');
    
    if (email && !validateEmail(email.value)) {
        email.classList.add('error');
        return false;
    }
    
    return true;
}

// ========================================
// ANALYTICS TRACKING (GA4 or similar)
// ========================================

function trackEvent(eventName, eventData = {}) {
    console.log('Event tracked:', eventName, eventData);
    
    // Replace with actual analytics implementation
    // if (window.gtag) {
    //     gtag('event', eventName, eventData);
    // }
}

// Track page view
trackEvent('page_view', {
    page_title: document.title,
    page_path: window.location.pathname
});

// ========================================
// HELPER: DEBOUNCE FUNCTION
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
// HELPER: THROTTLE FUNCTION
// ========================================

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========================================
// RESPONSIVE NAV (if needed)
// ========================================

const resizeHandler = debounce(() => {
    if (window.innerWidth > 768) {
        // Show desktop nav
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.style.display = 'flex';
        }
    }
}, 250);

window.addEventListener('resize', resizeHandler);

// ========================================
// SECTION VISIBILITY TRACKING
// ========================================

function trackSectionVisibility() {
    const sections = document.querySelectorAll('section');
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionName = entry.target.id || entry.target.className;
                trackEvent('section_viewed', {
                    section: sectionName
                });
            }
        });
    }, { threshold: 0.5 });
    
    sections.forEach(section => {
        sectionObserver.observe(section);
    });
}

// Initialize section tracking
trackSectionVisibility();

// ========================================
// UTILITY: COPY TO CLIPBOARD
// ========================================

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// ========================================
// PERFORMANCE: LAZY LOAD IMAGES
// ========================================

function setupLazyLoading() {
    if ('IntersectionObserver' in window && document.querySelectorAll('img[data-src]').length > 0) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.add('loaded');
                    }
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
        
        console.log('Lazy loading initialized for images');
    }
}

// Initialize lazy loading if images exist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLazyLoading);
} else {
    setupLazyLoading();
}

// ========================================
// EXPORT FUNCTIONS FOR TESTING
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateEmail,
        validateForm,
        trackEvent,
        debounce,
        throttle
    };
}

console.log('TellBill Landing Page Scripts Loaded ✓');
