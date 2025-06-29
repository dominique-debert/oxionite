import React, { useEffect } from 'react'

// Configuration: Maximum number of characters before truncation
const MAX_TOC_TEXT_LENGTH = 30

// Configuration: Maximum height for Table of Contents (in viewport height units)
const MAX_TOC_HEIGHT = '60vh'

const TruncatedTOC: React.FC = () => {
  useEffect(() => {
    // Apply max height to TOC aside element
    const applyMaxHeight = () => {
      const asideElement = document.querySelector('.notion-aside') as HTMLElement
      if (asideElement) {
        asideElement.style.maxHeight = MAX_TOC_HEIGHT
        asideElement.style.overflowY = 'auto'
        asideElement.style.paddingRight = '8px'
      }
    }

    const processToC = () => {
      // Find all links within .notion-aside
      const tocLinks = document.querySelectorAll('.notion-aside a')
      
      tocLinks.forEach((link, index) => {
        const element = link as HTMLElement
        const originalText = element.textContent || ''
        
        // Store original text in data attribute (only on first run)
        if (!element.dataset.originalText) {
          element.dataset.originalText = originalText
        }
        
        // Use stored original text
        const textToTruncate = element.dataset.originalText || ''
        
        // Truncate and add ellipsis if text exceeds MAX_TOC_TEXT_LENGTH
        if (textToTruncate.length > MAX_TOC_TEXT_LENGTH) {
          element.textContent = textToTruncate.substring(0, MAX_TOC_TEXT_LENGTH) + '...'
        } else {
          element.textContent = textToTruncate
        }
        
        // Find the corresponding heading in the page to determine its level
        const href = element.getAttribute('href')
        if (href && href.startsWith('#')) {
          const targetId = href.substring(1)
          const targetElement = document.getElementById(targetId)
          
          if (targetElement) {
            // Detect heading level from the target element
            let headingLevel = 1
            const tagName = targetElement.tagName.toLowerCase()
            
            if (tagName.match(/^h[1-6]$/)) {
              headingLevel = parseInt(tagName.charAt(1))
            } else {
              // Check if it has notion heading classes
              if (targetElement.classList.contains('notion-h1') || 
                  targetElement.classList.contains('notion-header')) {
                headingLevel = 1
              } else if (targetElement.classList.contains('notion-h2') || 
                        targetElement.classList.contains('notion-sub_header')) {
                headingLevel = 2
              } else if (targetElement.classList.contains('notion-h3') || 
                        targetElement.classList.contains('notion-sub_sub_header')) {
                headingLevel = 3
              }
            }
            
            // Find the parent li element and add appropriate class
            const listItem = element.closest('li')
            if (listItem) {
              // Remove any existing heading level classes
              listItem.className = listItem.className.replace(/notion-table-of-contents-item-h[1-6]/g, '')
              
              // Add the heading level class
              listItem.classList.add('notion-table-of-contents-item')
              listItem.classList.add(`notion-table-of-contents-item-h${headingLevel}`)
              
              // Also set data-level attribute
              listItem.setAttribute('data-level', headingLevel.toString())
            }
          }
        }
      })
    }

    // Initial setup
    applyMaxHeight()
    processToC()

    // Create observer to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false
      let shouldApplyHeight = false
      
      mutations.forEach((mutation) => {
        // Check if new nodes were added
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            // Check if the added node is an element and contains ToC links
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node as Element).querySelector?.('.notion-aside a')) {
              shouldProcess = true
            }
            // Check if the added node is the aside element itself
            if (node.nodeType === Node.ELEMENT_NODE && 
                ((node as Element).classList?.contains('notion-aside') || 
                 (node as Element).querySelector?.('.notion-aside'))) {
              shouldApplyHeight = true
              shouldProcess = true
            }
          })
        }
      })
      
      if (shouldApplyHeight || shouldProcess) {
        // Small delay to ensure DOM is fully updated
        setTimeout(() => {
          if (shouldApplyHeight) applyMaxHeight()
          if (shouldProcess) processToC()
        }, 100)
      }
    })

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Cleanup observer on component unmount
    return () => {
      observer.disconnect()
    }
  }, [])

  return null // This component doesn't render anything visible
}

export default TruncatedTOC 