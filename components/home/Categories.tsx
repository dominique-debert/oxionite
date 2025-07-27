import { useRouter } from 'next/router'
import React, { useEffect, useMemo, useRef } from 'react'

import type { PageInfo, SiteMap } from '@/lib/types'
import { useDarkMode } from '@/lib/use-dark-mode'

import styles from '../../styles/components/home.module.css'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDarkMode } = useDarkMode()

  // --- State and Refs ---
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])
  const draggedNodeRef = useRef<Node | null>(null)
  const hoveredNodeRef = useRef<Node | null>(null)
  const isPanningRef = useRef<boolean>(false)
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 })
  const clickStartPosRef = useRef<Point | null>(null)
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 })
  const twoFingerTapRef = useRef({ lastTap: 0, timeout: null as NodeJS.Timeout | null })

  // --- Data Memoization ---
  useMemo(() => {
    if (!siteMap) {
      nodesRef.current = []
      edgesRef.current = []
      return
    }
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

    nodesRef.current = categories.map((page) => ({
      id: page.pageId,
      label: page.title,
      x: 0, y: 0, vx: 0, vy: 0,
      level: getLevel(page.pageId, siteMap.pageInfoMap),
      radius: 40,
      page
    }))

    edgesRef.current = categories
      .filter((page) => page.parentPageId)
      .map((page) => ({ from: page.parentPageId!, to: page.pageId }))

  }, [siteMap, router.locale])

  // --- Main Effect Hook ---
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas || !nodesRef.current.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    // --- Utility Functions ---
    const getCanvasPos = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect()
      const { scale, offsetX, offsetY } = transformRef.current
      return {
        x: (x - rect.left - offsetX) / scale,
        y: (y - rect.top - offsetY) / scale
      }
    }

    const getNodeAtPos = (pos: Point) => {
      return nodesRef.current.find(n => Math.hypot(pos.x - n.x, pos.y - n.y) < n.radius)
    }

    // --- Physics Simulation ---
    const updatePhysics = () => {
      const repulsion = 1200, stiffness = 0.06, damping = 0.85
      const nodes = nodesRef.current
      const edges = edgesRef.current

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
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
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
      const { scale, offsetX, offsetY } = transformRef.current
      const dpr = window.devicePixelRatio || 1
      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr * scale, 0, 0, dpr*scale, dpr*offsetX, dpr*offsetY)

      const colors = {
        edge: getComputedStyle(document.body).getPropertyValue('--border-color'),
        nodeBg: getComputedStyle(document.body).getPropertyValue('--default-bg-color'),
        nodeBorder: getComputedStyle(document.body).getPropertyValue('--border-color'),
        text: getComputedStyle(document.body).getPropertyValue('--primary-text-color'),
        hoverBg: getComputedStyle(document.body).getPropertyValue('--hover-bg-color'),
        hoverBorder: getComputedStyle(document.body).getPropertyValue('--hover-border-color'),
      }

      edgesRef.current.forEach(edge => {
        const from = nodesRef.current.find(n => n.id === edge.from)
        const to = nodesRef.current.find(n => n.id === edge.to)
        if (from && to) {
          const dx = to.x - from.x
          const dy = to.y - from.y
          const dist = Math.hypot(dx, dy) || 1
          const newFromX = from.x + (dx / dist) * from.radius
          const newFromY = from.y + (dy / dist) * from.radius
          const newToX = to.x - (dx / dist) * to.radius
          const newToY = to.y - (dy / dist) * to.radius

          ctx.beginPath(); ctx.moveTo(newFromX, newFromY); ctx.lineTo(newToX, newToY)
          ctx.strokeStyle = colors.edge; ctx.stroke()
        }
      })

      nodesRef.current.forEach(node => {
        const isHovered = node === hoveredNodeRef.current
        ctx.beginPath(); ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI)
        ctx.fillStyle = isHovered ? colors.hoverBg : colors.nodeBg; ctx.fill()
        ctx.strokeStyle = isHovered ? colors.hoverBorder : colors.nodeBorder; ctx.stroke()
        ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x, node.y)
      })

      ctx.restore()
      animationFrameId = requestAnimationFrame(render)
    }

    // --- Event Handlers ---
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault()
      const pos = getCanvasPos(e.clientX, e.clientY)
      clickStartPosRef.current = pos
      const clickedNode = getNodeAtPos(pos)
      if (clickedNode) {
        draggedNodeRef.current = clickedNode
        draggedNodeRef.current.vx = 0
        draggedNodeRef.current.vy = 0
      } else {
        isPanningRef.current = true
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault()
      const pos = getCanvasPos(e.clientX, e.clientY)
      if (draggedNodeRef.current) {
        draggedNodeRef.current.x = pos.x
        draggedNodeRef.current.y = pos.y
      } else if (isPanningRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x
        const dy = e.clientY - lastMousePosRef.current.y
        transformRef.current.offsetX += dx
        transformRef.current.offsetY += dy
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      } else {
        hoveredNodeRef.current = getNodeAtPos(pos) || null
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault()
      const startPos = clickStartPosRef.current
      const endPos = getCanvasPos(e.clientX, e.clientY)
      if (startPos && Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y) < 5) {
        const clickedNode = getNodeAtPos(endPos)
        if (clickedNode) {
          router.push(`/${clickedNode.page.language}/${clickedNode.page.slug}`)
        }
      }
      draggedNodeRef.current = null
      isPanningRef.current = false
      clickStartPosRef.current = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { scale, offsetX, offsetY } = transformRef.current
      const scaleAmount = -e.deltaY * 0.001
      const newScale = Math.max(0.1, Math.min(5, scale + scaleAmount))
      const mousePos = getCanvasPos(e.clientX, e.clientY)
      transformRef.current.offsetX = e.clientX - (e.clientX - offsetX) * (newScale / scale)
      transformRef.current.offsetY = e.clientY - (e.clientY - offsetY) * (newScale / scale)
      transformRef.current.scale = newScale
    }

    // --- Touch Handlers for Mobile ---
    let initialPinchDistance = 0

    const getTouchPos = (touch: Touch) => getCanvasPos(touch.clientX, touch.clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const pos = getTouchPos(touch)
        clickStartPosRef.current = pos
        const clickedNode = getNodeAtPos(pos)
        if (clickedNode) {
          draggedNodeRef.current = clickedNode
          draggedNodeRef.current.vx = 0
          draggedNodeRef.current.vy = 0
        } else {
          isPanningRef.current = true
          lastMousePosRef.current = { x: touch.clientX, y: touch.clientY }
        }
      } else if (e.touches.length === 2) {
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
      }

      // Double tap to reset
      const now = new Date().getTime()
      if (now - twoFingerTapRef.current.lastTap < 300) {
        if (twoFingerTapRef.current.timeout) clearTimeout(twoFingerTapRef.current.timeout)
        // Reset logic here if needed
        twoFingerTapRef.current.lastTap = 0
      } else {
        twoFingerTapRef.current.lastTap = now
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault() // Prevent scrolling
      if (e.touches.length === 1 && draggedNodeRef.current) {
        const pos = getTouchPos(e.touches[0])
        draggedNodeRef.current.x = pos.x
        draggedNodeRef.current.y = pos.y
      } else if (e.touches.length === 1 && isPanningRef.current) {
        const touch = e.touches[0]
        const dx = touch.clientX - lastMousePosRef.current.x
        const dy = touch.clientY - lastMousePosRef.current.y
        transformRef.current.offsetX += dx
        transformRef.current.offsetY += dy
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY }
      } else if (e.touches.length === 2) {
        const currentPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const scaleAmount = (currentPinchDistance / initialPinchDistance) - 1
        const { scale, offsetX, offsetY } = transformRef.current
        const newScale = Math.max(0.1, Math.min(5, scale + scaleAmount))

        const midPoint = {
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        }

        transformRef.current.offsetX = midPoint.x - (midPoint.x - offsetX) * (newScale / scale)
        transformRef.current.offsetY = midPoint.y - (midPoint.y - offsetY) * (newScale / scale)
        transformRef.current.scale = newScale
        initialPinchDistance = currentPinchDistance
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPanningRef.current = false
      }
      if (e.touches.length < 1) {
         if (draggedNodeRef.current) {
            const startPos = clickStartPosRef.current
            // This needs clientX/Y from the ended touch, which is in changedTouches
            const endTouch = e.changedTouches[0]
            if (endTouch) {
                const endPos = getCanvasPos(endTouch.clientX, endTouch.clientY)
                if (startPos && Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y) < 5) {
                    const clickedNode = getNodeAtPos(endPos)
                    if (clickedNode) {
                        router.push(`/${clickedNode.page.language}/${clickedNode.page.slug}`)
                    }
                }
            }
        }
        draggedNodeRef.current = null
      }
       clickStartPosRef.current = null
    }

    // --- Initial Layout & Cleanup ---
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.resetTransform()
      ctx.scale(dpr, dpr)
      transformRef.current.offsetX = rect.width / 2
      transformRef.current.offsetY = rect.height / 2
    }

    resizeCanvas()
    const levels = [...new Set(nodesRef.current.map(n => n.level))].sort((a, b) => a - b)
    nodesRef.current.forEach(node => {
      const levelIndex = levels.indexOf(node.level)
      const nodesInLevel = nodesRef.current.filter(n => n.level === node.level)
      const siblingIndex = nodesInLevel.indexOf(node)
      const jitter = (Math.random() - 0.5) * 2
      node.x = (siblingIndex - (nodesInLevel.length - 1) / 2) * 300 + jitter
      node.y = (levelIndex - (levels.length - 1) / 2) * 300
    })

    render()

    window.addEventListener('resize', resizeCanvas)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    // Touch events for mobile
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDarkMode, router, siteMap]) // Dependencies updated

  return (
    <div ref={containerRef} className={styles.categoriesContainer}>
      <canvas ref={canvasRef} className={styles.categoriesCanvas} />
    </div>
  )
}