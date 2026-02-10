/* ========================================
   PROJECT FILTERING FUNCTIONALITY
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initProjectFilter();
});


/**
 * Initialize project filtering functionality
 */
function initProjectFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    // Exit if we're not on the projects page
    if (filterButtons.length === 0 || projectCards.length === 0) {
        return;
    }

    // Add click event to each filter button
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');

            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Filter projects
            filterProjects(filter, projectCards);
        });
    });

    // Count and display project counts (optional enhancement)
    updateProjectCounts(filterButtons, projectCards);
}


/**
 * Filter project cards based on category
 */
function filterProjects(filter, projectCards) {
    projectCards.forEach(card => {
        const category = card.getAttribute('data-category');

        if (filter === 'all' || category === filter) {
            // Show card with fade-in animation
            card.classList.remove('hidden');
            card.classList.add('fade-in');
        } else {
            // Hide card
            card.classList.add('hidden');
            card.classList.remove('fade-in');
        }
    });

    // Optional: Scroll to top of projects section after filtering
    const projectsSection = document.querySelector('.projects-section');
    if (projectsSection && window.pageYOffset > 200) {
        const navbar = document.querySelector('.navbar');
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const scrollPosition = projectsSection.offsetTop - navbarHeight - 20;

        window.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
    }
}


/**
 * Update filter buttons with project counts
 * Example: "All Projects (8)" instead of just "All Projects"
 */
function updateProjectCounts(filterButtons, projectCards) {
    filterButtons.forEach(button => {
        const filter = button.getAttribute('data-filter');
        let count = 0;

        if (filter === 'all') {
            count = projectCards.length;
        } else {
            projectCards.forEach(card => {
                if (card.getAttribute('data-category') === filter) {
                    count++;
                }
            });
        }

        // Optional: Add count to button text
        // Uncomment the lines below to show counts
        /*
        const currentText = button.textContent;
        if (!currentText.includes('(')) {
            button.textContent = `${currentText} (${count})`;
        }
        */
    });
}


/**
 * Optional: Search functionality for projects
 * Uncomment to enable project search
 */
/*
function initProjectSearch() {
    // Create search input
    const filterSection = document.querySelector('.filter-section .container');
    if (!filterSection) return;

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.style.cssText = 'margin-top: 1rem; max-width: 400px; margin-left: auto; margin-right: auto;';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = 'Search projects...';
    searchInput.style.cssText = 'width: 100%; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: var(--border-radius); font-size: var(--font-size-base);';

    searchContainer.appendChild(searchInput);
    filterSection.appendChild(searchContainer);

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const projectCards = document.querySelectorAll('.project-card');

        projectCards.forEach(card => {
            const title = card.querySelector('.project-title').textContent.toLowerCase();
            const description = card.querySelector('.project-description').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());

            const matchesSearch = title.includes(searchTerm) ||
                                description.includes(searchTerm) ||
                                tags.some(tag => tag.includes(searchTerm));

            if (matchesSearch) {
                card.classList.remove('hidden');
                card.classList.add('fade-in');
            } else {
                card.classList.add('hidden');
                card.classList.remove('fade-in');
            }
        });
    });
}

// Uncomment to enable search
// initProjectSearch();
*/


/**
 * Optional: Sort functionality for projects
 * Uncomment to enable project sorting
 */
/*
function initProjectSort() {
    const filterSection = document.querySelector('.filter-section .container');
    if (!filterSection) return;

    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-container';
    sortContainer.style.cssText = 'margin-top: 1rem; text-align: center;';

    const sortSelect = document.createElement('select');
    sortSelect.className = 'sort-select';
    sortSelect.style.cssText = 'padding: 0.75rem; border: 2px solid var(--border-color); border-radius: var(--border-radius); font-size: var(--font-size-base); cursor: pointer;';

    sortSelect.innerHTML = `
        <option value="default">Sort by: Default</option>
        <option value="title-asc">Title (A-Z)</option>
        <option value="title-desc">Title (Z-A)</option>
    `;

    sortContainer.appendChild(sortSelect);
    filterSection.appendChild(sortContainer);

    // Sort functionality
    sortSelect.addEventListener('change', (e) => {
        const sortValue = e.target.value;
        const projectsGrid = document.querySelector('.projects-grid');
        const projectCards = Array.from(document.querySelectorAll('.project-card'));

        if (sortValue === 'title-asc') {
            projectCards.sort((a, b) => {
                const titleA = a.querySelector('.project-title').textContent;
                const titleB = b.querySelector('.project-title').textContent;
                return titleA.localeCompare(titleB);
            });
        } else if (sortValue === 'title-desc') {
            projectCards.sort((a, b) => {
                const titleA = a.querySelector('.project-title').textContent;
                const titleB = b.querySelector('.project-title').textContent;
                return titleB.localeCompare(titleA);
            });
        }

        // Re-append sorted cards
        projectCards.forEach(card => projectsGrid.appendChild(card));
    });
}

// Uncomment to enable sorting
// initProjectSort();
*/
