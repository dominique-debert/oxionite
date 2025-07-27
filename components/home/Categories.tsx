import { useRouter } from 'next/router'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { PageInfo, SiteMap } from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'

import styles from '../../styles/components/home/Categories.module.css'

// --- Interfaces ---
interface CategoriesProps {
  siteMap?: SiteMap
}

interface Node {
  id: string
  label: string
  x: number
  y: number
  vx: number
  vy: number
  level: number
  radius: number
  page: PageInfo
}

interface Edge {
  from: string
  to: string
}

interface Point {
  x: number
  y: number
}

// --- Component ---
export default function Categories({ siteMap }: CategoriesProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDarkMode } = useDarkMode()

  // --- State and Refs ---
  const draggedNodeRef = useRef<Node | null>(null)
  const isPanningRef = useRef<boolean>(false)
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 })
  const clickStartPosRef = useRef<Point | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })

  // --- Data Memoization ---
  const { nodes, edges } = useMemo(() => {
    if (!siteMap) return { nodes: [], edges: [] }
    const locale = router.locale || 'ko'
    const categories = Object.values(siteMap.pageInfoMap).filter(
      (page) => page.type === 'Category' && page.language === locale
    )

    const getLevel = (pageId: string, pageInfoMap: Record<string, PageInfo>): number => {
      let level = 0
      let currentPage = pageInfoMap[pageId]
      while (currentPage && currentPage.parentPageId) {
        level++
        currentPage = pageInfoMap[currentPage.parentPageId]
      }
      return level
    }

    const nodes: Node[] = categories.map((page) => ({
      id: page.pageId,
      label: page.title,
      x: 0, y: 0, vx: 0, vy: 0,
      level: getLevel(page.pageId, siteMap.pageInfoMap),
      radius: 40,
      page
    }))

    const edges: Edge[] = categories
      .filter((page) => page.parentPageId)
      .map((page) => ({ from: page.parentPageId!, to: page.pageId }))

    return { nodes, edges }
  }, [siteMap, router.locale])

  // --- Main Effect Hook ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !nodes.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    // --- Utility Functions ---
    const getCanvasPos = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left - offset.x) / scale,
        y: (e.clientY - rect.top - offset.y) / scale
      }
    }

    // --- Physics Simulation ---
    const updatePhysics = () => {
      const repulsion = 1200, stiffness = 0.06, damping = 0.85

      nodes.forEach(node1 => {
        nodes.forEach(node2 => {
          if (node1 === node2) return
          const dx = node2.x - node1.x, dy = node2.y - node1.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (repulsion / (dist * dist)) * -1
          const fx = (dx / dist) * force, fy = (dy / dist) * force
          node1.vx += fx; node1.vy += fy
        })
      })

      edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from), to = nodes.find(n => n.id === edge.to)
        if (from && to) {
          const dx = to.x - from.x, dy = to.y - from.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const displacement = dist - 200
          const force = displacement * stiffness
          const fx = (dx / dist) * force, fy = (dy / dist) * force
          from.vx += fx; from.vy += fy
          to.vx -= fx; to.vy -= fy
        }
      })

      nodes.forEach(node => {
        if (node !== draggedNodeRef.current) {
          node.vx *= damping; node.vy *= damping
          node.x += node.vx; node.y += node.vy
        }
      })
    }

    // --- Rendering ---
    const render = () => {
      updatePhysics()
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.translate(offset.x, offset.y)
      ctx.scale(scale, scale)

      const colors = {
        edge: getComputedStyle(document.body).getPropertyValue('--border-color'),
        nodeBg: getComputedStyle(document.body).getPropertyValue('--default-bg-color'),
        nodeBorder: getComputedStyle(document.body).getPropertyValue('--border-color'),
        text: getComputedStyle(document.body).getPropertyValue('--primary-text-color')
      }

      edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from), to = nodes.find(n => n.id === edge.to)
        if (from && to) {
          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y)
          ctx.strokeStyle = colors.edge; ctx.stroke()
        }
      })

      nodes.forEach(node => {
        ctx.beginPath(); ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI)
        ctx.fillStyle = colors.nodeBg; ctx.fill()
        ctx.strokeStyle = colors.nodeBorder; ctx.stroke()
        ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x, node.y)
      })

      ctx.restore()
      animationFrameId = requestAnimationFrame(render)
    }

    // --- Event Handlers ---
    const onMouseDown = (e: MouseEvent) => {
      const pos = getCanvasPos(e)
      clickStartPosRef.current = pos
      const clickedNode = nodes.find(n => Math.hypot(pos.x - n.x, pos.y - n.y) < n.radius)
      if (clickedNode) {
        draggedNodeRef.current = clickedNode
      } else {
        isPanningRef.current = true
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (draggedNodeRef.current) {
        const pos = getCanvasPos(e)
        draggedNodeRef.current.x = pos.x; draggedNodeRef.current.y = pos.y
      } else if (isPanningRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x
        const dy = e.clientY - lastMousePosRef.current.y
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      const startPos = clickStartPosRef.current
      const endPos = getCanvasPos(e)
      if (startPos && Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y) < 5) {
        const clickedNode = nodes.find(n => Math.hypot(endPos.x - n.x, endPos.y - n.y) < n.radius)
        if (clickedNode) {
          router.push(`/${clickedNode.page.language}/${clickedNode.page.slug}`)
        }
      }
      draggedNodeRef.current = null; isPanningRef.current = false; clickStartPosRef.current = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const scaleAmount = -e.deltaY * 0.001
      const newScale = Math.max(0.1, Math.min(5, scale + scaleAmount))
      const mousePos = { x: e.offsetX, y: e.offsetY }
      const newOffsetX = mousePos.x - (mousePos.x - offset.x) * (newScale / scale)
      const newOffsetY = mousePos.y - (mousePos.y - offset.y) * (newScale / scale)
      setScale(newScale)
      setOffset({ x: newOffsetX, y: newOffsetY })
    }

    // --- Initial Layout & Cleanup ---
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    const levels = [...new Set(nodes.map(n => n.level))].sort((a, b) => a - b)
    nodes.forEach(node => {
      const levelIndex = levels.indexOf(node.level)
      const nodesInLevel = nodes.filter(n => n.level === node.level)
      const siblingIndex = nodesInLevel.indexOf(node)
      node.x = (canvas.offsetWidth / (nodesInLevel.length + 1)) * (siblingIndex + 1)
      node.y = (canvas.offsetHeight / (levels.length + 1)) * (levelIndex + 1)
    })

    render()

    window.addEventListener('resize', resizeCanvas)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [nodes, edges, isDarkMode, router, scale, offset])

  return <canvas ref={canvasRef} className={styles.container} />
}