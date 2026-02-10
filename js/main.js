/* ========================================
   MAIN JAVASCRIPT UTILITIES
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize back to top button
    initBackToTop();

    // Initialize form validation (if contact form exists)
    initFormValidation();

    // Add loading state to external links
    initExternalLinks();
});


/**
 * Back to top button functionality
 */
function initBackToTop() {
    // Create back to top button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = '↑';
    backToTopBtn.setAttribute('aria-label', 'Back to top');
    backToTopBtn.setAttribute('title', 'Back to top');
    document.body.appendChild(backToTopBtn);

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    // Scroll to top when clicked
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}


/**
 * Form validation and submission handling
 */
function initFormValidation() {
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');

    if (!contactForm) {
        return; // Exit if form doesn't exist on this page
    }

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const subject = formData.get('subject');
        const message = formData.get('message');

        // Basic validation (HTML5 handles most of this, but we double-check)
        if (!name || !email || !subject || !message) {
            showFormStatus('Please fill in all required fields.', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showFormStatus('Please enter a valid email address.', 'error');
            return;
        }

        // If form action is not set up yet, show a message
        const formAction = contactForm.getAttribute('action');
        if (!formAction || formAction === '#') {
            showFormStatus(
                'Form backend not configured yet. Please set up a form service (Formspree, FormSubmit, etc.) in contact.html',
                'error'
            );
            console.log('Form data:', { name, email, subject, message });
            return;
        }

        // Show loading state
        const submitBtn = contactForm.querySelector('.btn-submit');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Sending...';

        try {
            // Submit the form
            const response = await fetch(formAction, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                showFormStatus('Thank you for your message! I\'ll get back to you soon.', 'success');
                contactForm.reset();
            } else {
                throw new Error('Form submission failed');
            }
        } catch (error) {
            showFormStatus('Oops! There was a problem sending your message. Please try again.', 'error');
            console.error('Form submission error:', error);
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    /**
     * Show form status message
     */
    function showFormStatus(message, type) {
        if (!formStatus) return;

        formStatus.textContent = message;
        formStatus.className = `form-status ${type}`;

        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                formStatus.className = 'form-status';
                formStatus.textContent = '';
            }, 5000);
        }
    }
}


/**
 * Add visual indication for external links
 */
function initExternalLinks() {
    const links = document.querySelectorAll('a[href^="http"]');

    links.forEach(link => {
        // Skip if it's a link to the same domain
        if (link.hostname === window.location.hostname) {
            return;
        }

        // Add external link attributes
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');

        // Optional: Add visual indicator (you can customize this)
        // Uncomment if you want to add an icon after external links
        /*
        const icon = document.createElement('span');
        icon.innerHTML = ' ↗';
        icon.style.fontSize = '0.8em';
        link.appendChild(icon);
        */
    });
}


/**
 * Utility: Debounce function for performance optimization
 * Useful for scroll and resize event handlers
 */
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


/**
 * Utility: Check if element is in viewport
 * Useful for scroll animations or lazy loading
 */
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}


/**
 * Optional: Fade in elements on scroll
 * Uncomment to enable scroll animations
 */
/*
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.project-card, .faq-item');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(element);
    });
}

// Uncomment to enable scroll animations
// initScrollAnimations();
*/
