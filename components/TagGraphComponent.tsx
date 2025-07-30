import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { PiGraphBold } from "react-icons/pi"
import { FaTags } from 'react-icons/fa'
import { MdFullscreen, MdFullscreenExit, MdMyLocation, MdHome } from 'react-icons/md'
import type { TagGraphData } from '@/lib/tag-graph'
import type { GraphMethods } from './ForceGraphWrapper'
import styles from '@/styles/components/GraphView.module.css'

declare global {
  interface Window {
    setGraphView?: (view: 'post_view' | 'tag_view') => void;
    graphView?: 'post_view' | 'tag_view';
    openGraphModal?: () => void;
    closeGraphModal?: () => void;
  }
}

const ForceGraphWrapper = dynamic(() => import('./ForceGraphWrapper'), {
  ssr: false,
  loading: () => <div>Loading graph...</div>
})

interface TagGraphComponentProps {
  tagGraphData: TagGraphData
  viewType: 'sidebar' | 'fullscreen'
  activeView?: 'post_view' | 'tag_view'
  onViewChange?: (view: 'post_view' | 'tag_view') => void
  isModal?: boolean
  currentTag?: string
}

interface TagNode {
  id: string
  name: string
  count: number
  val: number
  x?: number
  y?: number
  z?: number
  fx?: number
  fy?: number
  fz?: number
}

interface TagLink {
  source: string
  target: string
  value: number
}

export const TagGraphComponent: React.FC<TagGraphComponentProps> = ({ 
  tagGraphData, 
  viewType,
  activeView = 'tag_view',
  onViewChange,
  isModal = false,
  currentTag
}) => {
  const router = useRouter()
  const [fgInstance, setFgInstance] = useState<any>(null)
  const [graphData, setGraphData] = useState<{ nodes: TagNode[]; links: TagLink[] }>({ 
    nodes: [], 
    links: [] 
  })
  const [isGraphLoaded, setIsGraphLoaded] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Prepare graph data from tag graph data
  useEffect(() => {
    console.log('[TagGraphComponent] tagGraphData received:', {
      tagCounts: Object.keys(tagGraphData.tagCounts).length,
      tagRelationships: Object.keys(tagGraphData.tagRelationships).length,
      totalPosts: tagGraphData.totalPosts
    })
    
    const nodes: TagNode[] = Object.entries(tagGraphData.tagCounts).map(([tag, count]) => ({
      id: tag,
      name: tag,
      count,
      val: Math.max(count * 2, 1)
    }))

    const links: TagLink[] = []
    Object.entries(tagGraphData.tagRelationships).forEach(([tag, relatedTags]) => {
      relatedTags.forEach(relatedTag => {
        links.push({
          source: tag,
          target: relatedTag,
          value: 1
        })
      })
    })

    console.log('[TagGraphComponent] Prepared graph data:', { nodes: nodes.length, links: links.length })
    setGraphData({ nodes, links })
  }, [tagGraphData])

  // Handle node click to navigate to tag page
  const handleNodeClick = useCallback((node: any) => {
    if (node?.id) {
      router.push(`/tag/${encodeURIComponent(node.id)}`)
    }
  }, [router])

  // Handle control buttons
  const handleFocusCurrentNode = useCallback(() => {
    if (!currentTag || !fgInstance) return
    
    const targetNode = graphData.nodes.find(node => node.id === currentTag)
    if (targetNode && fgInstance && typeof fgInstance.zoomToFit === 'function') {
      fgInstance.zoomToFit(1000, 50, (node: any) => node.id === currentTag)
    }
  }, [fgInstance, graphData.nodes, currentTag])

  const handleFitToHome = useCallback(() => {
    if (fgInstance && typeof fgInstance.zoomToFit === 'function') {
      fgInstance.zoomToFit(400, 50)
    }
  }, [fgInstance])

  // Handle initial zoom based on current tag or fallback to home
  useEffect(() => {
    if (isGraphLoaded && fgInstance && graphData.nodes.length > 0) {
      try {
        if (currentTag) {
          // Find the current tag node
          const targetNode = graphData.nodes.find(node => node.id === currentTag)
          if (targetNode) {
            console.log('[TagGraphComponent] Focusing on current tag:', currentTag)
            // Use zoomToFit with a filter to focus on the specific tag
            setTimeout(() => {
              if (fgInstance && typeof fgInstance.zoomToFit === 'function') {
                fgInstance.zoomToFit(1000, 50, (node: any) => node.id === currentTag)
              }
            }, 500) // Delay to allow graph to stabilize
          } else {
            // Tag not found, fallback to home
            console.log('[TagGraphComponent] Tag not found, falling back to home view')
            handleFitToHome()
          }
        } else {
          // No current tag, use home view
          console.log('[TagGraphComponent] No current tag, using home view')
          handleFitToHome()
        }
      } catch (error) {
        console.error('[TagGraphComponent] Initial zoom failed:', error)
        handleFitToHome()
      }
    }
  }, [isGraphLoaded, fgInstance, graphData.nodes, currentTag])

  // Sidebar initial setup
  useEffect(() => {
    if (fgInstance && viewType === 'sidebar' && !currentTag) {
      fgInstance.zoomToFit(400, 50)
    }
  }, [viewType, fgInstance, currentTag])

  // Custom node rendering for pill-shaped nodes
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const tagName = node.name
    const count = node.count
    const fontSize = (Math.max(10, Math.min(16, node.val * 2 / globalScale))) / 10
    
    // Measure text widths
    ctx.font = `bold ${fontSize}px Inter, sans-serif`
    const tagWidth = ctx.measureText(tagName).width
    const countText = ` ${count}`
    const countWidth = ctx.measureText(countText).width
    
    const pillHeight = fontSize + 8
    const pillWidth = tagWidth + countWidth + 24
    const x = node.x - pillWidth / 2
    const y = node.y - pillHeight / 2
    
    // Draw pill background
    ctx.fillStyle = '#3b82f6'
    ctx.beginPath()
    // Use arc for rounded corners since roundRect might not be available
    const radius = pillHeight / 2
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + pillWidth - radius, y)
    ctx.arcTo(x + pillWidth, y, x + pillWidth, y + radius, radius)
    ctx.lineTo(x + pillWidth, y + pillHeight - radius)
    ctx.arcTo(x + pillWidth, y + pillHeight, x + pillWidth - radius, y + pillHeight, radius)
    ctx.lineTo(x + radius, y + pillHeight)
    ctx.arcTo(x, y + pillHeight, x, y + pillHeight - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
    ctx.closePath()
    ctx.fill()
    
    // Draw tag name
    ctx.fillStyle = 'white'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(tagName, x + 10, y + pillHeight / 2)
    
    // Draw count pill
    const countPillWidth = countWidth + 8
    const countPillX = x + 10 + tagWidth + 2
    ctx.fillStyle = '#1e40af'
    ctx.beginPath()
    const countRadius = (pillHeight - 4) / 2
    ctx.moveTo(countPillX + countRadius, y + 2)
    ctx.lineTo(countPillX + countPillWidth - countRadius, y + 2)
    ctx.arcTo(countPillX + countPillWidth, y + 2, countPillX + countPillWidth, y + 2 + countRadius, countRadius)
    ctx.lineTo(countPillX + countPillWidth, y + 2 + pillHeight - 4 - countRadius)
    ctx.arcTo(countPillX + countPillWidth, y + 2 + pillHeight - 4, countPillX + countPillWidth - countRadius, y + 2 + pillHeight - 4, countRadius)
    ctx.lineTo(countPillX + countRadius, y + 2 + pillHeight - 4)
    ctx.arcTo(countPillX, y + 2 + pillHeight - 4, countPillX, y + 2 + pillHeight - 4 - countRadius, countRadius)
    ctx.lineTo(countPillX, y + 2 + countRadius)
    ctx.arcTo(countPillX, y + 2, countPillX + countRadius, y + 2, countRadius)
    ctx.closePath()
    ctx.fill()
    
    ctx.fillStyle = 'white'
    ctx.fillText(countText, countPillX + 4, y + pillHeight / 2)
  }, [])

  // Handle graph load
  const handleEngineStop = useCallback(() => {
    setIsGraphLoaded(true)
  }, [])

  // Handle dimensions for modal
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        console.log('[TagGraphComponent] Dimensions calculated:', { width, height, isModal, viewType })
        
        // Ensure minimum dimensions for modal
        const finalWidth = Math.max(width, isModal ? 800 : 400)
        const finalHeight = Math.max(height, isModal ? 600 : 300)
        
        setDimensions({ width: finalWidth, height: finalHeight })
      } else {
        // Fallback dimensions
        console.log('[TagGraphComponent] Using fallback dimensions')
        setDimensions({ 
          width: isModal ? 800 : 400, 
          height: isModal ? 600 : 300 
        })
      }
    }

    // Use multiple attempts to ensure DOM is ready
    updateDimensions()
    const timeoutId = setTimeout(updateDimensions, 50)
    const longTimeoutId = setTimeout(updateDimensions, 200)
    
    window.addEventListener('resize', updateDimensions)
    return () => {
      clearTimeout(timeoutId)
      clearTimeout(longTimeoutId)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [isModal, viewType])

  if (!graphData.nodes.length) {
    return (
      <div className={styles.tagViewContainer} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.tagViewPlaceholder}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <FaTags size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div>No tags found</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>
              {Object.keys(tagGraphData.tagCounts).length === 0 ? 'No tag data available' : 'No tags to display'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.graphInner} ref={containerRef} style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative',
      minHeight: isModal ? '400px' : '300px'
    }}>
      {isModal && (
        <div className={styles.viewNavContainer}>
          <nav className={styles.viewNav}>
            <button
              className={`${styles.viewNavItem} ${isModal ? ((window.graphView === 'post_view') ? styles.active : '') : (activeView === 'post_view' ? styles.active : '')}`}
              onClick={() => {
                if (isModal) {
                  window.setGraphView?.('post_view')
                } else {
                  onViewChange?.('post_view')
                }
              }}
            >
              <PiGraphBold className={styles.viewNavIcon} />
              Graph View
            </button>
            <button
              className={`${styles.viewNavItem} ${isModal ? ((window.graphView === 'tag_view') ? styles.active : '') : (activeView === 'tag_view' ? styles.active : '')}`}
              onClick={() => {
                if (isModal) {
                  window.setGraphView?.('tag_view')
                } else {
                  onViewChange?.('tag_view')
                }
              }}
            >
              <FaTags className={styles.viewNavIcon} />
              Tag View
            </button>
          </nav>
        </div>
      )}
      <div className={styles.buttonContainer}>
        <button 
          onClick={handleFocusCurrentNode} 
          className={`${styles.button} ${(!currentTag || !graphData.nodes.find(node => node.id === currentTag)) ? styles.disabled : ''}`}
          disabled={!currentTag || !graphData.nodes.find(node => node.id === currentTag)}
          aria-label="Focus on current tag"
        >
          <MdMyLocation size={20} />
        </button>
        <button onClick={handleFitToHome} className={styles.button} aria-label="Fit to home">
          <MdHome size={20} />
        </button>
        {isModal ? (
          <button onClick={() => window.closeGraphModal?.()} className={styles.button} aria-label="Close fullscreen">
            <MdFullscreenExit size={20} />
          </button>
        ) : (
          <button onClick={() => window.openGraphModal?.()} className={styles.button} aria-label="Open in fullscreen">
            <MdFullscreen size={20} />
          </button>
        )}
      </div>
      <ForceGraphWrapper
        key={`tag-graph-${isModal}-${dimensions.width}-${dimensions.height}`}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        nodeLabel=""
        onNodeClick={handleNodeClick}
        onEngineStop={handleEngineStop}
        onReady={setFgInstance}
        backgroundColor="transparent"
        width={isModal ? Math.max(dimensions.width, 400) : (viewType === 'sidebar' ? 300 : 800)}
        height={isModal ? Math.max(dimensions.height, 300) : (viewType === 'sidebar' ? 300 : 600)}
        cooldownTicks={100}
        warmupTicks={50}
        linkWidth={1}
        linkColor={() => '#94a3b8'}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1}
        linkDirectionalParticleSpeed={0.006}
        nodeRelSize={4}
        nodeVal="val"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        onNodeDragEnd={(node: any) => {
          node.fx = undefined
          node.fy = undefined
        }}
      />
    </div>
  )
}
