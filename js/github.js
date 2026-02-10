/* ========================================
   GITHUB REPOSITORY INTEGRATION
   Fetches public repos and renders project cards
   Sean Bowman [02/09/2026]
   ======================================== */

const githubUsername = 'sean-bowman';
const cacheKey = 'github_repos';
const cacheTtl = 5 * 60 * 1000; // 5 minutes
const portfolioRepoName = 'portfolio'; // Exclude from featured section

document.addEventListener('DOMContentLoaded', () => {
    initGitHubProjects();
});


/**
 * Initialize GitHub project cards on the current page.
 * Finds all .projects-grid containers, shows a loading state,
 * fetches repos from the GitHub API, and renders cards into each grid.
 * Featured sections (on index.html) are limited to 3 repos.
 */
async function initGitHubProjects() {
    const grids = document.querySelectorAll('.projects-grid');
    if (grids.length === 0) return;

    grids.forEach(grid => renderLoadingState(grid));

    try {
        const repos = await fetchGitHubRepos(githubUsername);
        grids.forEach(grid => {
            const isFeatured = grid.closest('.featured-projects') !== null;
            // Featured section excludes this portfolio repo and limits to 3
            const displayRepos = isFeatured
                ? repos.filter(repo => repo.name.toLowerCase() !== portfolioRepoName).slice(0, 3)
                : repos;
            renderProjectCards(displayRepos, grid);
        });
    } catch (error) {
        grids.forEach(grid => renderErrorState(grid, 'Unable to load projects. Please try again later.'));
    }
}


/**
 * Fetch public, non-forked repos for a GitHub user.
 * Results are cached in sessionStorage for 5 minutes to avoid
 * redundant API calls during page navigation.
 * @param {string} username - GitHub username to fetch repos for
 * @returns {Array} Array of non-forked repository objects from the GitHub API
 */
async function fetchGitHubRepos(username) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTtl) {
            return data;
        }
    }

    const response = await fetch(
        `https://api.github.com/users/${username}/repos?type=owner&sort=updated&per_page=100`
    );

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const allRepos = await response.json();
    const repos = allRepos.filter(repo => !repo.fork);

    sessionStorage.setItem(cacheKey, JSON.stringify({
        data: repos,
        timestamp: Date.now()
    }));

    return repos;
}


/**
 * Render project cards from GitHub repo data into a container.
 * Each card displays the repo name, description, primary language
 * with a colored dot, last updated date, and a link to the repo.
 * @param {Array} repos - Array of GitHub repo objects
 * @param {HTMLElement} container - The .projects-grid element to populate
 */
function renderProjectCards(repos, container) {
    container.innerHTML = '';

    if (repos.length === 0) {
        container.innerHTML = '<p class="no-projects">No projects found.</p>';
        return;
    }

    repos.forEach(repo => {
        const card = document.createElement('article');
        card.className = 'project-card fade-in';
        card.setAttribute('data-category', 'software');

        const updatedDate = new Date(repo.updated_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const languageHtml = repo.language
            ? `<span class="repo-language">
                   <span class="language-dot" style="background-color: ${getLanguageColor(repo.language)}"></span>
                   ${repo.language}
               </span>`
            : '';

        card.innerHTML = `
            <div class="project-content">
                <div class="project-category">
                    <span class="category-badge software">${repo.language || 'Repository'}</span>
                </div>
                <h3 class="project-title">${repo.name}</h3>
                <p class="project-description">
                    ${repo.description || 'No description provided.'}
                </p>
                <div class="repo-meta">
                    ${languageHtml}
                    <span class="repo-updated">Updated ${updatedDate}</span>
                </div>
                <div class="project-links">
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">View on GitHub</a>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}


/**
 * Show a loading spinner inside the projects grid while repos are being fetched.
 * @param {HTMLElement} container - The .projects-grid element to show loading state in
 */
function renderLoadingState(container) {
    container.innerHTML = `
        <div class="projects-loading">
            <div class="loading"></div>
            <p>Loading projects...</p>
        </div>
    `;
}


/**
 * Show an error message inside the projects grid when fetching fails.
 * @param {HTMLElement} container - The .projects-grid element to show the error in
 * @param {string} message - The error message to display
 */
function renderErrorState(container, message) {
    container.innerHTML = `
        <div class="projects-error">
            <p>${message}</p>
        </div>
    `;
}


/**
 * Map programming language names to their GitHub-style colors.
 * @param {string} language - The programming language name
 * @returns {string} Hex color code for the language dot indicator
 */
function getLanguageColor(language) {
    const colors = {
        'Python': '#3572A5',
        'C#': '#178600',
        'JavaScript': '#f1e05a',
        'TypeScript': '#3178c6',
        'Java': '#b07219',
        'C++': '#f34b7d',
        'C': '#555555',
        'Go': '#00ADD8',
        'Rust': '#dea584',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'MATLAB': '#e16737',
        'Fortran': '#4d41b1',
        'Julia': '#a270ba'
    };
    return colors[language] || '#8b949e';
}
