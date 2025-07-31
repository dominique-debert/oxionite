#!/usr/bin/env node

// Test script to verify tag graph data generation
import { getSiteMap } from './lib/get-site-map'
import { buildTagGraphData } from './lib/tag-graph'

async function testTagGraph() {
  console.log('Testing tag graph data generation...')
  
  try {
    const siteMap = await getSiteMap()
    console.log(`Total pages: ${Object.keys(siteMap.pageInfoMap).length}`)
    
    if (siteMap.tagGraphData) {
      console.log('\n=== Tag Graph Data by Locale ===')
      console.log(`Total posts: ${siteMap.tagGraphData.totalPosts}`)
      console.log(`Available locales: ${Object.keys(siteMap.tagGraphData.locales).join(', ')}`)
      
      // Test English locale by default
      const enData = siteMap.tagGraphData.locales['en']
      if (enData) {
        const { tagCounts, tagRelationships, tagPages, totalPosts } = enData
        
        console.log('\n=== English Locale Data ===')
        console.log(`Total posts with tags: ${totalPosts}`)
        console.log(`Unique tags: ${Object.keys(tagCounts).length}`)
        
        console.log('\n=== Top 10 Tags by Frequency ===')
        Object.entries(tagCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([tag, count], index) => {
            console.log(`${index + 1}. ${tag}: ${count} occurrences`)
          })
        
        console.log('\n=== Tag Relationships ===')
        Object.entries(tagRelationships).slice(0, 5).forEach(([tag, related]) => {
          console.log(`${tag}: ${related.join(', ')}`)
        })
        
        console.log('\n=== Tag Pages (first 5 tags) ===')
        Object.entries(tagPages).slice(0, 5).forEach(([tag, pages]) => {
          console.log(`${tag}: ${pages.length} pages`)
        })
      }
      
      // Show summary for all locales
      Object.entries(siteMap.tagGraphData.locales).forEach(([locale, data]) => {
        console.log(`\n=== ${locale.toUpperCase()} Locale Summary ===`)
        console.log(`Tags: ${Object.keys(data.tagCounts).length}`)
        console.log(`Posts: ${data.totalPosts}`)
      })
    } else {
      console.log('No tag graph data found')
    }
    
  } catch (error) {
    console.error('Error testing tag graph:', error)
  }
}

// Run if this is the main module
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

if (process.argv[1] === __filename) {
  testTagGraph()
}
