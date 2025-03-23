/**
 * Jon Litwack Website - Main JavaScript
 * 
 * Handles theme based on system preference, animation of data visualization
 * and other interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
  // Theme handling based on system preference
  function applyThemePreference() {
    // Get the system preference
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersLightMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    
    // Apply theme based on system preference
    if (prefersLightMode) {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
      console.log('Applying light mode based on system preference');
    } else {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      console.log('Applying dark mode based on system preference');
    }
  }
  
  // Apply theme on load
  applyThemePreference();
  
  // Listen for system preference changes
  if (window.matchMedia) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const lightModeMediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    darkModeMediaQuery.addEventListener('change', e => {
      if (e.matches) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        console.log('Changed to dark mode based on system preference');
      }
    });
    
    lightModeMediaQuery.addEventListener('change', e => {
      if (e.matches) {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
        console.log('Changed to light mode based on system preference');
      }
    });
  }
  
  // Header scroll effect
  window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  });
  
  // Data visualization animation
  initDataVisualization();
  
  // Intersection Observer for section headers
  const sectionHeaders = document.querySelectorAll('.section-header');
  if (sectionHeaders.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.1 });
    
    sectionHeaders.forEach(header => {
      observer.observe(header);
    });
  }
});

/**
 * Initialize the data visualization animation
 */
function initDataVisualization() {
  // Select the SVG element
  const svg = document.querySelector('.data-viz');
  
  // If SVG doesn't exist, exit
  if (!svg) return;
  
  // Get the SVG dimensions
  const svgWidth = parseInt(svg.getAttribute('viewBox').split(' ')[2]);
  const svgHeight = parseInt(svg.getAttribute('viewBox').split(' ')[3]);
  
  // Create data flow lines with staggered animation
  createDataFlowLines(svg, 10);
  
  // Create and animate particles along the paths
  createParticles(svg);
  
  // Create random nodes (data points)
  createNodes(svg, 30);
}

/**
 * Creates animated flowing lines representing data streams
 * @param {SVGElement} svg - The SVG element
 * @param {number} count - Number of lines to create
 */
function createDataFlowLines(svg, count) {
  const colors = ['#3B82F6', '#7E22CE', '#0CA5E9']; // Blue, Purple, Teal
  const svgWidth = parseInt(svg.getAttribute('viewBox').split(' ')[2]);
  const svgHeight = parseInt(svg.getAttribute('viewBox').split(' ')[3]);
  
  for (let i = 0; i < count; i++) {
    // Random parameters for the path
    const startY = Math.random() * svgHeight;
    const controlPoint1X = svgWidth * 0.25 + (Math.random() * 100 - 50);
    const controlPoint1Y = Math.random() * svgHeight;
    const controlPoint2X = svgWidth * 0.75 + (Math.random() * 100 - 50);
    const controlPoint2Y = Math.random() * svgHeight;
    const endY = Math.random() * svgHeight;
    
    // Create path string for a cubic bezier curve
    const pathString = `M0,${startY} C${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${svgWidth},${endY}`;
    
    // Create the path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colors[i % colors.length]);
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('opacity', '0.3');
    path.classList.add('data-line');
    
    // Add animation delay for staggered effect
    path.style.animationDelay = `${i * 0.2}s`;
    
    // Append to SVG
    svg.appendChild(path);
  }
}

/**
 * Creates animated particles that flow along the data lines
 * @param {SVGElement} svg - The SVG element
 */
function createParticles(svg) {
  const paths = svg.querySelectorAll('.data-line');
  
  paths.forEach(path => {
    // Create multiple particles for each path
    for (let i = 0; i < 5; i++) {
      createParticleOnPath(svg, path, i);
    }
  });
}

/**
 * Creates a single particle that animates along a path
 * @param {SVGElement} svg - The SVG element
 * @param {SVGPathElement} path - The path element
 * @param {number} index - Index for staggered animation
 */
function createParticleOnPath(svg, path, index) {
  // Create circle element
  const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  const size = 3 + Math.random() * 3; // Random size between 3-6px
  
  particle.setAttribute('r', size);
  particle.setAttribute('fill', path.getAttribute('stroke'));
  particle.setAttribute('opacity', '0');
  particle.classList.add('particle');
  
  // Append to SVG
  svg.appendChild(particle);
  
  // Get path length for animation
  const pathLength = path.getTotalLength();
  
  // Animation function
  function animateParticle() {
    // Start animation with random offset
    let startPosition = Math.random();
    
    // Duration between 3-6 seconds
    const duration = 3000 + Math.random() * 3000;
    const startTime = performance.now();
    
    function updatePosition(timestamp) {
      // Calculate progress (0 to 1)
      const elapsed = timestamp - startTime;
      let progress = (elapsed % duration) / duration;
      
      // Add offset
      progress = (progress + startPosition) % 1;
      
      // Get point along the path
      const point = path.getPointAtLength(progress * pathLength);
      
      // Update particle position
      particle.setAttribute('cx', point.x);
      particle.setAttribute('cy', point.y);
      
      // Opacity animation (fade in/out)
      // Fade in from 0-10%, full opacity from 10-90%, fade out from 90-100%
      let opacity = 0;
      if (progress < 0.1) {
        opacity = progress * 10; // Fade in
      } else if (progress > 0.9) {
        opacity = (1 - progress) * 10; // Fade out
      } else {
        opacity = 1; // Full opacity
      }
      
      particle.setAttribute('opacity', opacity * 0.8); // Max opacity 0.8
      
      // Continue animation
      requestAnimationFrame(updatePosition);
    }
    
    // Start animation
    requestAnimationFrame(updatePosition);
  }
  
  // Start animation with staggered delay
  setTimeout(animateParticle, index * 400);
}

/**
 * Creates node points representing data clusters
 * @param {SVGElement} svg - The SVG element
 * @param {number} count - Number of nodes to create
 */
function createNodes(svg, count) {
  const colors = ['#3B82F6', '#7E22CE', '#0CA5E9']; // Blue, Purple, Teal
  const svgWidth = parseInt(svg.getAttribute('viewBox').split(' ')[2]);
  const svgHeight = parseInt(svg.getAttribute('viewBox').split(' ')[3]);
  
  for (let i = 0; i < count; i++) {
    // Random position
    const x = 100 + Math.random() * (svgWidth - 200); // Keep away from edges
    const y = 100 + Math.random() * (svgHeight - 200);
    
    // Create the node group
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Create the node circle
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const size = 2 + Math.random() * 4; // Random size between 2-6px
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    node.setAttribute('cx', x);
    node.setAttribute('cy', y);
    node.setAttribute('r', size);
    node.setAttribute('fill', color);
    node.setAttribute('opacity', '0.6');
    
    // Add a subtle glow effect
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', x);
    glow.setAttribute('cy', y);
    glow.setAttribute('r', size * 2);
    glow.setAttribute('fill', color);
    glow.setAttribute('opacity', '0.1');
    
    // Add subtle animation to the node
    animateNode(node, glow);
    
    // Add to group and SVG
    nodeGroup.appendChild(glow);
    nodeGroup.appendChild(node);
    svg.appendChild(nodeGroup);
  }
}

/**
 * Creates a pulsing animation for nodes
 * @param {SVGCircleElement} node - The node circle
 * @param {SVGCircleElement} glow - The glow circle
 */
function animateNode(node, glow) {
  // Get initial values
  const initialRadius = parseFloat(node.getAttribute('r'));
  const initialGlowRadius = parseFloat(glow.getAttribute('r'));
  
  // Create a random duration between 2-5 seconds
  const duration = 2000 + Math.random() * 3000;
  const startTime = performance.now();
  
  function updatePulse(timestamp) {
    // Calculate progress (0 to 1)
    const elapsed = (timestamp - startTime) % duration;
    const progress = elapsed / duration;
    
    // Sinusoidal pulse effect
    const pulse = Math.sin(progress * Math.PI * 2) * 0.2 + 1;
    
    // Apply to radius
    node.setAttribute('r', initialRadius * pulse);
    glow.setAttribute('r', initialGlowRadius * pulse);
    
    // Continue animation
    requestAnimationFrame(updatePulse);
  }
  
  // Start animation
  requestAnimationFrame(updatePulse);
}