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
        // Add ripple effect on click
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
        
        // Handle Sign-up flows (replace with actual app logic)
        if (button.textContent.includes('Start Free Trial') || 
            button.textContent.includes('Test TellBill') ||
            button.textContent.includes('Start Your Free')) {
            button.addEventListener('click', handleTrialSignup);
        }
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

const demoBtnElement = document.querySelector('.demo-btn');
if (demoBtnElement) {
    demoBtnElement.addEventListener('click', () => {
        const demoPreview = document.querySelector('.demo-preview');
        if (demoPreview) {
            demoPreview.style.animation = 'pulse 0.6s ease';
            setTimeout(() => {
                demoPreview.style.animation = '';
            }, 600);
        }
    });
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
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
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

// Initialize lazy loading if images exist
document.addEventListener('DOMContentLoaded', setupLazyLoading);

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
