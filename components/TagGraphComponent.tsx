import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import type { TagGraphData } from '@/lib/tag-graph'
import styles from '@/styles/components/GraphView.module.css'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div>Loading graph...</div>
})

interface TagGraphComponentProps {
  tagGraphData: TagGraphData
  viewType: 'sidebar' | 'fullscreen'
}

interface TagNode {
  id: string
  name: string
  count: number
  val: number
}

interface TagLink {
  source: string
  target: string
  value: number
}

export const TagGraphComponent: React.FC<TagGraphComponentProps> = ({ 
  tagGraphData, 
  viewType 
}) => {
  const router = useRouter()
  const fgRef = useRef<any>(null)
  const [graphData, setGraphData] = useState<{ nodes: TagNode[]; links: TagLink[] }>({ 
    nodes: [], 
    links: [] 
  })
  const [isGraphLoaded, setIsGraphLoaded] = useState(false)

  // Prepare graph data from tag graph data
  useEffect(() => {
    const nodes: TagNode[] = Object.entries(tagGraphData.tagCounts).map(([tag, count]) => ({
      id: tag,
      name: tag,
      count,
      val: Math.max(1, Math.log(count + 1) * 5) // Scale size based on count
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

    setGraphData({ nodes, links })
  }, [tagGraphData])

  // Handle node click to navigate to tag page
  const handleNodeClick = useCallback((node: any) => {
    if (node?.id) {
      router.push(`/tag/${encodeURIComponent(node.id)}`)
    }
  }, [router])

  // Initial camera setup
  useEffect(() => {
    if (fgRef.current && viewType === 'sidebar') {
      fgRef.current.zoomToFit(400, 50)
    }
  }, [viewType])

  // Center graph when loaded
  useEffect(() => {
    if (isGraphLoaded && fgRef.current) {
      fgRef.current.zoomToFit(400, 50)
    }
  }, [isGraphLoaded])

  // Custom node rendering for pill-shaped nodes
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const tagName = node.name
    const count = node.count
    const fontSize = Math.max(10, Math.min(16, node.val * 2 / globalScale))
    
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

  if (!graphData.nodes.length) {
    return (
      <div className={styles.tagViewContainer}>
        <div className={styles.tagViewPlaceholder}>
          <div>No tags found</div>
        </div>
      </div>
    )
  }

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      nodeCanvasObject={nodeCanvasObject}
      nodeLabel=""
      onNodeClick={handleNodeClick}
      onEngineStop={handleEngineStop}
      backgroundColor="transparent"
      width={viewType === 'sidebar' ? 300 : undefined}
      height={viewType === 'sidebar' ? 300 : undefined}
      cooldownTicks={100}
      warmupTicks={50}
      linkWidth={1}
      linkColor={() => '#94a3b8'}
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={0.5}
      nodeVal="val"
    />
  )
}
