/**
 * Jazzmin Horizontal Tabs - Fix for dynamic tab switching
 * Ensures tabs switch without requiring page reload
 * This fixes the issue where URL changes but content doesn't update
 */

(function() {
  'use strict';
  
  function initTabEvents() {
    // Find all nav-tabs (Bootstrap tabs)
    const navTabs = document.querySelectorAll('.nav-tabs');
    
    navTabs.forEach(function(tabContainer) {
      const tabLinks = tabContainer.querySelectorAll('a[role="tab"], a[data-toggle="tab"]');
      
      tabLinks.forEach(function(tabLink) {
        // Remove any existing listeners
        const newTabLink = tabLink.cloneNode(true);
        tabLink.parentNode.replaceChild(newTabLink, tabLink);
        
        // Add click handler
        newTabLink.addEventListener('click', function(e) {
          e.preventDefault();
          
          const target = this.getAttribute('data-bs-target') || 
                        this.getAttribute('href') ||
                        this.getAttribute('data-target');
          
          if (!target) return;
          
          // Make sure target starts with #
          const targetSelector = target.startsWith('#') ? target : '#' + target;
          const targetPane = document.querySelector(targetSelector);
          
          if (!targetPane) return;
          
          // Remove active class from all tabs and panes
          tabContainer.querySelectorAll('a[role="tab"]').forEach(function(link) {
            link.classList.remove('active');
            link.setAttribute('aria-selected', 'false');
          });
          
          const tabContent = tabContainer.closest('.form-tabs') || 
                           tabContainer.closest('.fieldset_group') ||
                           document.querySelector('.tab-content');
          
          if (tabContent) {
            tabContent.querySelectorAll('.tab-pane').forEach(function(pane) {
              pane.classList.remove('active', 'show');
              pane.setAttribute('role', 'tabpanel');
            });
          }
          
          // Add active class to clicked tab and target pane
          this.classList.add('active');
          this.setAttribute('aria-selected', 'true');
          targetPane.classList.add('active', 'show');
          
          // Trigger any necessary form updates
          if (window.django && window.django.jQuery) {
            window.django.jQuery(targetPane).trigger('shown.bs.tab');
          }
        });
      });
    });
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initTabEvents, 100);
    });
  } else {
    setTimeout(initTabEvents, 100);
  }
  
  // Also reinit on any dynamic content loading (for related fields, etc)
  if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      // Check if tabs were added/modified
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          const hasTabElements = Array.from(mutation.addedNodes).some(function(node) {
            return node.nodeType === 1 && (
              node.classList && (
                node.classList.contains('nav-tabs') ||
                node.classList.contains('tab-pane')
              )
            );
          });
          if (hasTabElements) {
            setTimeout(initTabEvents, 50);
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
