# Jekyll Implementation Guide for jonlitwack.com

This guide provides detailed instructions for implementing your website using Jekyll, following the brand strategy and visual identity we've defined.

## Getting Started with Jekyll

### 1. Install Jekyll and dependencies

First, ensure you have Ruby installed on your system, then install Jekyll and Bundler:

```bash
gem install jekyll bundler
```

### 2. Create a new Jekyll site (skip if you already have one)

```bash
jekyll new jonlitwack.com
cd jonlitwack.com
```

If you already have a Jekyll site, you can adapt these files to your existing structure.

### 3. Directory Structure Setup

Create folders according to the structure in the "Jon Litwack Jekyll Site Structure" artifact:

```bash
mkdir -p _data _includes _layouts _projects _posts _sass assets/css assets/js assets/images/projects pages
```

## Implementation Steps

### 1. Configuration

1. Replace the contents of `_config.yml` with the provided configuration in the "_config.yml" file
2. Update the personal information (email, social media usernames) to your actual information

### 2. Layouts & Includes

Copy the following files from the artifacts:

1. `_layouts/default.html` - The base layout with common elements
2. `_layouts/home.html` - The homepage layout
3. `_layouts/page.html` - For standard pages
4. `_layouts/project.html` - For project portfolio items

For the includes:
1. `_includes/head.html` - Meta tags and CSS links
2. `_includes/header.html` - Navigation
3. `_includes/footer.html` - Site footer
4. `_includes/data-visualization.html` - SVG animation
5. `_includes/contact-form.html` - Contact form component

### 3. Stylesheet Implementation

1. Create the main SCSS file at `assets/css/main.scss` using the "main.scss" file
2. Create the SASS partials in the `_sass` directory:
   - `_variables.scss` - Color and typography variables
   - `_base.scss` - Base styles and typography
   - `_layout.scss` - Layout components
   - `_animations.scss` - Animation styles
   - `_responsive.scss` - Media queries

Jekyll will automatically compile these into a single CSS file.

### 4. JavaScript Implementation

1. Create `assets/js/main.js` using the "main.js" file
2. This file handles:
   - Theme toggling (dark/light mode)
   - Header scroll effects
   - Data visualization animations

### 5. Content Setup

1. Create `index.md` with front matter from the "index.md" file
2. Create navigation data in `_data/navigation.yml`
3. Create social links data in `_data/social.yml`
4. Add sample project in `_projects` directory
5. Add sample blog post in `_posts` directory

### 6. Data Visualization

1. Create an SVG file for the background at `assets/images/data-flow-bg.svg`
2. The JavaScript animation will enhance this with dynamic elements

## Testing Your Site

To preview your site locally:

```bash
bundle exec jekyll serve
```

This will start a local server at `http://localhost:4000` where you can preview your site.

## Deployment Options

### GitHub Pages

1. Create a repository named `yourusername.github.io`
2. Push your Jekyll site to this repository
3. Configure GitHub Pages in the repository settings
4. Optionally set up a custom domain (jonlitwack.com)

### Netlify

1. Connect your Git repository to Netlify
2. Configure build settings:
   - Build command: `jekyll build` or `bundle exec jekyll build`
   - Publish directory: `_site/`
3. Set up your custom domain

## Customization

### Theme Customization

The stylesheet is built with SASS variables, making it easy to update the color scheme:

1. Edit the color variables in `_sass/_variables.scss` if you want to adjust the palette
2. All colors are defined as variables, so changing them will update throughout the site

### Content Management

Update the following files to manage your content:

1. `index.md` - Homepage content
2. Files in `_projects/` - Portfolio projects
3. Files in `_posts/` - Blog posts/insights
4. `_data/navigation.yml` - Navigation menu
5. `_data/social.yml` - Social media links

### Adding New Projects

Create a new file in the `_projects` directory with this format:

```markdown
---
layout: project
title: Project Title
summary: Brief project description
image: /assets/images/projects/your-image.jpg
date: 2025-03-22
featured: true
---

Project content goes here...
```

### Adding New Blog Posts

Create a new file in the `_posts` directory with this format:

```markdown
---
layout: post
title: "Post Title"
date: 2025-03-22 09:00:00 -0500
categories: [category1, category2]
excerpt: "Brief excerpt about the post"
---

Post content goes here...
```

## Performance Optimization

1. Optimize images using tools like ImageOptim before adding to the site
2. Consider using responsive images with the `srcset` attribute
3. Minify CSS and JavaScript for production (Jekyll can do this automatically)
4. Enable gzip compression on your server

## Accessibility Considerations

The design includes several accessibility features:

1. Skip to main content link for keyboard users
2. Proper heading hierarchy
3. Sufficient color contrast
4. Focus states for interactive elements
5. ARIA labels where appropriate

## Next Steps

1. Customize the content with your specific information
2. Add your actual projects and case studies
3. Configure the contact form with Formspree or another form service
4. Set up analytics (Google Analytics or Plausible)
5. Test across different browsers and devices
6. Deploy to your chosen hosting platform

This implementation follows Jekyll best practices and creates a site that is:
- Fast and performant
- Accessible
- Mobile-responsive
- Easy to maintain
- On-brand with your visual identity