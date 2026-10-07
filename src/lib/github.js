/* ========================================
   GITHUB REPOSITORIES
   Build-time fetch of public repos for project cards
   Sean Bowman [10/05/2026]
   ======================================== */

// @ts-check

import reposFallback from '../data/reposFallback.json';

const githubUsername = 'sean-bowman';
// This repository is excluded from the home page's featured cards
const portfolioRepoName = 'portfolio';

/**
 * @typedef {Object} Repo
 * @property {string} name
 * @property {string | null} description
 * @property {string | null} language
 * @property {string} updated_at - ISO timestamp of the last push or edit
 * @property {string} html_url
 */

/** @type {Promise<Repo[]> | null} */
let _repoRequest = null;

/**
 * Fetch public, non-forked repositories, sorted by last update.
 * Runs once per build; every page that calls it shares the same request.
 * Uses GITHUB_TOKEN when present (set in the deploy workflow) for the higher
 * authenticated rate limit. Falls back to the committed snapshot in
 * src/data/reposFallback.json so a GitHub outage cannot break a deploy.
 * @returns {Promise<Repo[]>} Repositories ready for rendering
 */
export function getRepos() {
    if (!_repoRequest) {
        _repoRequest = _fetchRepos();
    }
    return _repoRequest;
}

/**
 * Featured repositories for the home page: the three most recently updated,
 * excluding this site's own repository.
 * @returns {Promise<Repo[]>}
 */
export async function getFeaturedRepos() {
    const repos = await getRepos();
    return repos.filter(repo => repo.name.toLowerCase() !== portfolioRepoName).slice(0, 3);
}

/**
 * @returns {Promise<Repo[]>}
 */
async function _fetchRepos() {
    /** @type {Record<string, string>} */
    const headers = { 'Accept': 'application/vnd.github+json' };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(
            `https://api.github.com/users/${githubUsername}/repos?type=owner&sort=updated&per_page=100`,
            { headers }
        );
        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}`);
        }
        const allRepos = await response.json();
        return allRepos
            .filter((/** @type {any} */ repo) => !repo.fork)
            .map((/** @type {any} */ repo) => ({
                name: repo.name,
                description: repo.description,
                language: repo.language,
                updated_at: repo.updated_at,
                html_url: repo.html_url
            }));
    } catch (error) {
        console.warn(`[github] ${error instanceof Error ? error.message : error}; using reposFallback.json`);
        return reposFallback;
    }
}

/**
 * Map a language name to its GitHub linguist color for the card's language dot.
 * @param {string} language - Language name as reported by the GitHub API
 * @returns {string} Hex color
 */
export function getLanguageColor(language) {
    /** @type {Record<string, string>} */
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

/**
 * Format a repository's update timestamp the way the cards display it.
 * @param {string} isoDate - ISO timestamp
 * @returns {string} e.g. 'Oct 4, 2026'
 */
export function formatUpdated(isoDate) {
    return new Date(isoDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
