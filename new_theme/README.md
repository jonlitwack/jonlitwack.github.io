# Jon Litwack Website

This is a Jekyll-based website for jonlitwack.com featuring a modern design with data visualization aesthetics and a focus on AI-powered development expertise.

## Features

- Dark mode (primary) with light mode toggle
- Data visualization animation in the hero section
- Responsive design for all device sizes
- Portfolio project showcase
- Blog/insights section
- Contact form

## Getting Started

### Prerequisites

- Ruby version 2.5.0 or higher
- RubyGems
- GCC and Make

### Installation

1. Install Jekyll and Bundler:
```
gem install jekyll bundler
```

2. Clone this repository or download the files.

3. Navigate to the project directory and install dependencies:
```
bundle install
```

4. Start the local development server:
```
bundle exec jekyll serve
```

5. Open your browser and visit: http://localhost:4000

## Project Structure

- `_layouts/`: HTML templates for different page types
- `_includes/`: Reusable HTML components
- `_data/`: Configuration data for navigation and social links
- `_sass/`: SCSS partials for styling
- `assets/`: Static files (JS, CSS, images)
- `_projects/`: Portfolio project collection
- `_posts/`: Blog posts/insights collection

## Customization

### Content

- Edit `index.md` to update the homepage content
- Add portfolio projects in `_projects/`
- Add blog posts in `_posts/`
- Update navigation in `_data/navigation.yml`
- Update social links in `_data/social.yml`

### Styling

- Main style variables are in `_sass/_variables.scss`
- Color scheme, spacing, and typography can be adjusted here

## Contact Form

By default, the contact form uses Formspree. Update the form action in `_includes/contact-form.html` with your own Formspree endpoint or another form service.

## Deployment

This site can be deployed on any static site hosting service:

- GitHub Pages
- Netlify
- Vercel
- Amazon S3
- And many others

## License

All rights reserved.

---

Created by Jon Litwack