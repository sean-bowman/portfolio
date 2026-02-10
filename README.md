# Portfolio Website

A clean, modern, and responsive portfolio website built with HTML, CSS, and JavaScript. Designed for easy deployment to GitHub Pages.

## Features

- **Multi-page structure**: Home, Projects, and Contact pages
- **Responsive design**: Works seamlessly on mobile, tablet, and desktop
- **Project filtering**: Filter projects by category (Software/Coding, General/Mixed)
- **Mobile navigation**: Hamburger menu for mobile devices
- **Modern UI**: Clean design with smooth animations and transitions
- **Accessible**: ARIA labels, semantic HTML, keyboard navigation support
- **SEO optimized**: Meta tags and semantic structure
- **Easy to customize**: Clear placeholders and CSS variables

## Project Structure

```
githubPagesSite/
├── index.html                 # Home/About page
├── projects.html              # Projects showcase
├── contact.html               # Contact page
├── README.md                  # This file
├── .gitignore                 # Git ignore rules
│
├── css/
│   ├── main.css              # Core styles and CSS variables
│   ├── navigation.css        # Navigation bar styles
│   ├── components.css        # Reusable components
│   └── responsive.css        # Media queries
│
├── js/
│   ├── main.js               # General utilities
│   ├── navigation.js         # Navigation functionality
│   └── projects.js           # Project filtering
│
└── assets/
    └── images/
        ├── profile-placeholder.jpg
        ├── project-placeholder-1.jpg
        ├── project-placeholder-2.jpg
        └── favicon.ico
```

## Getting Started

### 1. Local Development

To view the site locally:

**Option 1: Using Python**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option 2: Using Node.js**
```bash
npx serve
```

**Option 3: Using VS Code**
- Install the "Live Server" extension
- Right-click on `index.html` and select "Open with Live Server"

Then visit `http://localhost:8000` (or the port shown) in your browser.

### 2. Customization

#### Update Personal Information

Search for the following markers and replace with your information:

- `[YOUR NAME]` - Your name
- `[YOUR TITLE/ROLE]` - Your job title or role
- `[YOUR BACKGROUND]` - Your background and experience
- `[YOUR SPECIALTIES]` - Your areas of expertise
- `[YOUR STORY]` - Your personal story
- `[YOUR INTERESTS]` - Your interests and hobbies
- `your.email@example.com` - Your email address
- Social media URLs (GitHub, LinkedIn, Twitter)

#### Change Colors

Edit `css/main.css` and modify the CSS variables:

```css
:root {
    --primary-color: #2563eb;      /* Change to your preferred color */
    --secondary-color: #10b981;
    /* ... other variables ... */
}
```

#### Add Your Images

Replace placeholder images in `assets/images/`:

1. **Profile Photo** (`profile-placeholder.jpg`):
   - Recommended size: 400x400px
   - Square image works best
   - Formats: JPG, PNG, or WebP

2. **Project Screenshots** (`project-placeholder-1.jpg`, `project-placeholder-2.jpg`):
   - Recommended size: 600x400px (3:2 aspect ratio)
   - Clear screenshots of your projects
   - Optimize images (keep under 500KB each)

3. **Favicon** (`favicon.ico`):
   - Size: 32x32px or 16x16px
   - Use a favicon generator for best results

#### Add/Edit Projects

In `projects.html`, duplicate a project card and customize:

```html
<article class="project-card" data-category="software">
    <div class="project-image">
        <img src="./assets/images/your-project.jpg" alt="Project name">
    </div>
    <div class="project-content">
        <div class="project-category">
            <span class="category-badge software">Software/Coding</span>
        </div>
        <h3 class="project-title">Your Project Title</h3>
        <p class="project-description">
            Description of your project...
        </p>
        <div class="project-tags">
            <span class="tag">JavaScript</span>
            <span class="tag">React</span>
        </div>
        <div class="project-links">
            <a href="https://your-demo.com" class="btn btn-outline btn-sm">Live Demo</a>
            <a href="https://github.com/you/repo" class="btn btn-outline btn-sm">GitHub</a>
        </div>
    </div>
</article>
```

**Important**: Set `data-category` to either `software` or `general` for filtering to work.

#### Set Up Contact Form

The contact form requires a backend service. Choose one:

1. **Formspree** (https://formspree.io) - Free tier available
2. **FormSubmit** (https://formsubmit.co) - Completely free
3. **Netlify Forms** (https://www.netlify.com/products/forms/) - If hosting on Netlify
4. **Your own backend** - Custom solution

Update the form action in `contact.html`:

```html
<form class="contact-form" id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

## Deploying to GitHub Pages

### Option 1: User/Organization Site

1. Create a repository named `username.github.io` (replace `username` with your GitHub username)

2. Initialize git and push your code:
```bash
git init
git add .
git commit -m "Initial commit: Portfolio website"
git branch -M main
git remote add origin https://github.com/username/username.github.io.git
git push -u origin main
```

3. Your site will be live at `https://username.github.io`

### Option 2: Project Site

1. Create a repository with any name (e.g., `portfolio`)

2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit: Portfolio website"
git branch -M main
git remote add origin https://github.com/username/portfolio.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to repository Settings
   - Navigate to "Pages" section
   - Under "Source", select `main` branch and `/ (root)` folder
   - Click "Save"

4. Your site will be live at `https://username.github.io/portfolio`

### Using a Custom Domain (Optional)

1. Create a file named `CNAME` in the root directory with your domain:
```
yourdomain.com
```

2. Configure DNS settings with your domain provider:
   - For apex domain (yourdomain.com):
     - Create A records pointing to GitHub's IPs:
       - 185.199.108.153
       - 185.199.109.153
       - 185.199.110.153
       - 185.199.111.153
   - For subdomain (www.yourdomain.com):
     - Create CNAME record pointing to `username.github.io`

3. In GitHub repository settings, under "Pages", enter your custom domain

## Optimization Tips

### Image Optimization

- **Compress images**: Use tools like TinyPNG or ImageOptim
- **Use appropriate formats**:
  - JPG for photos
  - PNG for graphics with transparency
  - WebP for modern browsers (with fallback)
- **Lazy loading**: Already implemented for images

### Performance

- All CSS and JS files are already optimized for performance
- No external dependencies (no jQuery, no Bootstrap)
- Minimal file sizes

### SEO

- Update meta tags in each HTML file:
  - `<meta name="description">`
  - `<meta name="keywords">`
  - `<title>` tags

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility Features

- Semantic HTML5 elements
- ARIA labels for screen readers
- Keyboard navigation support
- Sufficient color contrast (WCAG AA compliant)
- Focus indicators for interactive elements
- Alt text for images

## Future Enhancements

Ideas for extending your portfolio:

1. **Blog section**: Add a `blog.html` page following the same pattern
2. **Dark mode**: Uncomment dark mode CSS in `responsive.css`
3. **Project detail pages**: Create individual pages for each project
4. **Animations**: Enable scroll animations in `main.js`
5. **Search functionality**: Enable project search in `projects.js`
6. **Resume page**: Add a dedicated resume/CV page
7. **Analytics**: Add Google Analytics tracking code
8. **Testimonials**: Add a testimonials section to the home page

## Troubleshooting

### Site not loading on GitHub Pages

- Check that you've enabled GitHub Pages in repository settings
- Verify the branch and folder are correctly set
- Wait 1-2 minutes after pushing changes (deployment takes time)
- Check repository name matches pattern for user sites

### Images not showing

- Verify file paths are correct (case-sensitive on GitHub Pages)
- Use relative paths starting with `./` (e.g., `./assets/images/photo.jpg`)
- Check image files are committed to the repository

### Contact form not working

- Verify form action URL is set correctly
- Check form service (Formspree, FormSubmit) is configured
- Ensure form method is set to "POST"

### Mobile menu not toggling

- Check that `navigation.js` is loaded correctly
- Verify no JavaScript errors in browser console
- Ensure HTML class names match those in JavaScript

## License

This project is open source and available for personal use. Feel free to modify and customize it for your own portfolio.

## Credits

Created as a portfolio template for GitHub Pages deployment. Built with vanilla HTML, CSS, and JavaScript.

---

**Need help?** Create an issue in the repository or reach out via the contact form on your deployed site.

**Live Demo**: [Add your deployed URL here]

**Last Updated**: January 2026
