/**
 * Theme Switcher - Handles manual switching between light and dark modes
 */
(function() {
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

  // Add event listener to theme toggle button if it exists
  document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeColorMeta = document.getElementById('theme-color');
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    // Apply saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#181817');
      if (statusBarMeta) statusBarMeta.setAttribute('content', 'black-translucent');
    } else {
      // Default to light mode
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
      if (themeColorMeta) themeColorMeta.setAttribute('content', '#FFFFFF');
      if (statusBarMeta) statusBarMeta.setAttribute('content', 'default');
    }
  });
})(); 