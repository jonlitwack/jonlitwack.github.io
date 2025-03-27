/**
 * Theme Switcher - Handles manual switching between light and dark modes
 * and dynamic header name visibility
 */

const ThemeSwitcher = (function() {
  // Function to toggle theme
  function toggleTheme() {
    const themeColorMeta = document.getElementById('theme-color');
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#FFFFFF');
      if (statusBarMeta) statusBarMeta.setAttribute('content', 'default');
    } else {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#181817');
      if (statusBarMeta) statusBarMeta.setAttribute('content', 'black-translucent');
    }
  }
  
  // Initialize theme and dynamic name functionality
  function init() {
    // Theme toggle functionality
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Apply saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    }
    
    // Dynamic header name visibility
    const heroSection = document.querySelector('.hero');
    const dynamicName = document.querySelector('.dynamic-name');
    const logo = document.querySelector('.logo');
    
    if (!heroSection || !dynamicName || !logo) {
      return;
    }
    
    // Ensure initial state
    dynamicName.classList.remove('visible');
    logo.classList.remove('hidden');
    
    // Set up intersection observer with more precise thresholds
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // Store current scroll position
          const scrollPos = window.scrollY;
          
          // Only update classes if intersection ratio changes significantly
          if (entry.intersectionRatio > 0.5) {
            dynamicName.classList.remove('visible');
            logo.classList.remove('hidden');
          } else if (entry.intersectionRatio < 0.2) {
            dynamicName.classList.add('visible');
            logo.classList.add('hidden');
          }
          
          // Restore scroll position
          window.scrollTo(0, scrollPos);
        });
      },
      {
        rootMargin: '0px',
        threshold: [0, 0.2, 0.5, 0.8, 1.0]
      }
    );
    
    observer.observe(heroSection);
  }
  
  // Return public API
  return {
    init: init,
    toggleTheme: toggleTheme
  };
})();

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Ensure we start at the top
    window.scrollTo(0, 0);
    ThemeSwitcher.init();
  });
} else {
  window.scrollTo(0, 0);
  ThemeSwitcher.init();
}

// Expose to window for external access
window.ThemeSwitcher = ThemeSwitcher; 