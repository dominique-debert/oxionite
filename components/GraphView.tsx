import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import siteConfig from 'site.config';
import { MdFullscreen, MdFullscreenExit, MdMyLocation, MdHome } from 'react-icons/md';
import { createPortal } from 'react-dom';
import type { NodeObject, LinkObject } from 'react-force-graph-2d';

import type { SiteMap, PageInfo, Block } from '@/lib/types';
import { mapImageUrl } from '@/lib/map-image-url';
import { useDarkMode } from '@/lib/use-dark-mode';
import styles from '@/styles/components/GraphView.module.css';

const ForceGraph2D = dynamic(() => import('./ForceGraphWrapper'), { ssr: false });

const GRAPH_LAYOUT_CONFIG = {
  HOME_NODE_SIZE: 32,
  CATEGORY_NODE_SIZE: 10,
  POST_NODE_SIZE: 4,
  HOME_CORNER_RADIUS: 16,
  CATEGORY_CORNER_RADIUS: 2,
  LINK_WIDTH: 1,
  HOVER_OPACITY: 0.1,
  HOME_NAME_FONT_SIZE: 4,
  HOME_DESC_FONT_SIZE: 2,
  CATEGORY_FONT_SIZE: 2,
  POST_FONT_SIZE: 1,
};

const ZOOM_CONFIG = {
  // Base zoom levels for different node types (normalized to POST_NODE_SIZE = 1)
  HOME_NODE_ZOOM: 10,
  CATEGORY_NODE_ZOOM: 10,
  POST_NODE_ZOOM: 10,
  
  // Base reference size (POST_NODE_SIZE)
  BASE_NODE_SIZE: 4,
  
  // Zoom calculation: zoom = BASE_ZOOM * (BASE_NODE_SIZE / actual_node_size)
  // This ensures consistent visual size regardless of node type
};

const HOME_NODE_ID = '__HOME__';

export interface GraphNode extends NodeObject {
  id: string;
  name: string;
  description?: string;
  type: 'Category' | 'Post' | 'Home';
  imageUrl?: string;
  page: Partial<PageInfo>;
  img?: HTMLImageElement;
  neighbors?: GraphNode[];
  links?: GraphLink[];
  val?: number;
}

export interface GraphLink extends LinkObject {
  source: string;
  target: string;
}

const imageCache = new Map<string, HTMLImageElement>();

const getNodeSize = (node: GraphNode) => {
  switch (node.type) {
    case 'Home':
      return GRAPH_LAYOUT_CONFIG.HOME_NODE_SIZE;
    case 'Category':
      return GRAPH_LAYOUT_CONFIG.CATEGORY_NODE_SIZE;
    case 'Post':
      return GRAPH_LAYOUT_CONFIG.POST_NODE_SIZE;
    default:
      return 1;
  }
};

const createGraphData = (navigationTree: PageInfo[], locale: string) => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const addedNodes = new Set<string>();
  const pageMap = new Map<string, PageInfo>();

  const homeImageUrl = '/favicon.png';
  const homeNode: GraphNode = {
    id: HOME_NODE_ID,
    name: siteConfig.name,
    description: siteConfig.description,
    type: 'Home',
    page: { slug: '', language: locale },
    imageUrl: homeImageUrl,
  };

  if (!imageCache.has(homeImageUrl)) {
    const img = new Image();
    img.src = homeImageUrl;
    imageCache.set(homeImageUrl, img);
  }
  homeNode.img = imageCache.get(homeImageUrl);
  nodes.push(homeNode);
  addedNodes.add(HOME_NODE_ID);

  const allPages: PageInfo[] = [];
  function flatten(pages: PageInfo[]) {
    pages.forEach(p => {
      allPages.push(p);
      if (p.children) flatten(p.children);
    });
  }
  flatten(navigationTree);

  allPages.forEach(page => {
    if (page.language !== locale || (page.type !== 'Category' && page.type !== 'Post')) {
      return;
    }

    if (addedNodes.has(page.pageId)) {
      return;
    }

    const imageUrl = page.coverImage && page.coverImageBlock
      ? mapImageUrl(page.coverImage, page.coverImageBlock as Block)
      : undefined;

    const node: GraphNode = {
      id: page.pageId,
      name: page.title,
      type: page.type as 'Category' | 'Post',
      imageUrl,
      page,
    };

    if (imageUrl && !imageCache.has(imageUrl)) {
      const img = new Image();
      img.src = imageUrl;
      img.addEventListener('load', () => {
        imageCache.set(imageUrl, img);
      });
      img.addEventListener('error', () => {
        console.warn(`Failed to load image: ${imageUrl}`);
      });
    }
    if (imageUrl) {
      node.img = imageCache.get(imageUrl);
    }

    nodes.push(node);
    addedNodes.add(page.pageId);
    pageMap.set(page.pageId, page);
  });

  nodes.forEach(node => {
    if (node.id === HOME_NODE_ID) {
      return;
    }

    const page = pageMap.get(node.id);
    if (!page) {
      return;
    }

    if (page.parentPageId && addedNodes.has(page.parentPageId)) {
      links.push({ source: page.parentPageId, target: node.id });
    } else {
      links.push({ source: HOME_NODE_ID, target: node.id });
    }
  });
  
  links.forEach(link => {
    const a = nodes.find(n => n.id === link.source);
    const b = nodes.find(n => n.id === link.target);
    if (!a || !b) return;

    if (!a.neighbors) a.neighbors = [];
    if (!b.neighbors) b.neighbors = [];
    a.neighbors.push(b);
    b.neighbors.push(a);

    if (!a.links) a.links = [];
    if (!b.links) b.links = [];
    a.links.push(link);
    b.links.push(link);
  });

  nodes.forEach(node => {
    node.val = getNodeSize(node);
  });

  return { nodes, links };
};

interface GraphViewProps {
  siteMap?: SiteMap;
  viewType?: 'home' | 'sidenav';
}

function GraphComponent({ siteMap, isModal = false, viewType = 'home', closeModal }: { siteMap?: SiteMap, isModal?: boolean, viewType?: 'home' | 'sidenav', closeModal?: () => void }) {
  const router = useRouter();
  const locale = router.locale || 'ko';

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState(new Set<string>());
  const { isDarkMode } = useDarkMode();

  const [isGraphLoaded, setIsGraphLoaded] = useState(false);
  const [fgInstance, setFgInstance] = useState<any>(null);

  const colors = useMemo(() => {
    const colors = isDarkMode ? {
      node: 'rgba(0, 0, 0, 0.3)',
      text: 'rgba(255, 255, 255, 0.9)',
      desc: 'rgba(255, 255, 255, 0.7)',
      link: 'rgba(255, 255, 255, 0.2)',
      linkHover: 'rgba(255, 255, 255, 0.3)',
      linkMinor: 'rgba(255, 255, 255, 0.1)',
      hover: 'rgba(255, 255, 255, 0.06)',
      bg: 'rgba(0, 0, 0, 0.3)'
    } : {
      node: 'rgba(255, 255, 255, 0.3)',
      text: 'rgb(50, 48, 44)',
      desc: 'rgba(50, 48, 44, 0.7)',
      link: 'rgba(0, 0, 0, 0.2)',
      linkHover: 'rgba(0, 0, 0, 0.3)',
      linkMinor: 'rgba(0, 0, 0, 0.1)',
      hover: 'rgba(0, 0, 0, 0.04)',
      bg: 'rgba(255, 255, 255, 0.3)'
    };
    return colors;
  }, [isDarkMode]);

  const graphData = useMemo(() => {
    if (!siteMap) {
      return { nodes: [], links: [] };
    }
    return createGraphData(siteMap.navigationTree, locale);
  }, [siteMap, locale]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleEngineStop = useCallback(() => {
    setIsGraphLoaded(true);
  }, [setIsGraphLoaded]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.id === HOME_NODE_ID) {
      void router.push('/');
    } else {
      const page = node.page as PageInfo;
      if (page?.slug) {
        if (isModal && closeModal) {
          closeModal();
        }
        const url = node.page.type === 'Post'
          ? `/post/${node.page.slug}`
          : node.page.type === 'Category'
          ? `/category/${node.page.slug}`
          : `/${node.page.slug}`
        void router.push(url);
      }
    }
    
    // Always close modal on node click (works for both mobile and desktop)
    if (isModal) {
      console.log('[GraphComponent] Closing modal after node click');
      if (typeof window !== 'undefined' && (window as any).closeGraphModal) {
        (window as any).closeGraphModal();
      }
    }
  }, [router, isModal, closeModal]);

  const handleNodeHover = (node: GraphNode | null) => {
    const newIds = new Set<string>();
    if (node) {
      newIds.add(node.id as string);
      node.neighbors?.forEach(neighbor => newIds.add(neighbor.id as string));
    }
    setHighlightedNodeIds(newIds);
    setHoveredNode(node);
  };

  const handleCanvasMouseLeave = useCallback(() => {
    console.log('[GraphComponent] Mouse left canvas - resetting hover state');
    handleNodeHover(null);
  }, []);

  const focusOnNode = useCallback((node: GraphNode) => {
    if (!fgInstance) {
      console.log('[GraphComponent] focusOnNode: fgInstance is null or undefined.');
      return;
    }
    console.log('[GraphComponent] focusOnNode called for node:', node.name);
    console.log('[GraphComponent] dimensions:', dimensions);
    
    if (fgInstance && typeof fgInstance.zoomToFit === 'function') {
      // 캔버스 크기에 따라 동적으로 padding 계산
      const minDimension = Math.min(dimensions.width, dimensions.height);
      const dynamicPadding = Math.max(20, minDimension * 0.1); // 최소 20px, 최대 10%
      
      console.log('[GraphComponent] zoomToFit with dynamic padding:', dynamicPadding);
      fgInstance.zoomToFit(400, dynamicPadding, (n: any) => n.id === node.id);
    } else {
      console.error('[GraphComponent] zoomToFit is NOT a function or fgInstance is not set.', { fgInstance });
    }
  }, [fgInstance, dimensions]);

  const handleFocusCurrentNode = useCallback(() => {
    if (!fgInstance) return;
    const slug = router.asPath.split('/').pop()?.split('?')[0] || '';
    const currentNode = graphData.nodes.find(n => n.page.slug === slug);
    if (currentNode) {
      focusOnNode(currentNode);
    } else {
      focusOnNode(graphData.nodes.find(n => n.id === HOME_NODE_ID) as GraphNode);
    }
  }, [fgInstance, graphData.nodes, router.asPath, focusOnNode]);

  const handleFitToHome = useCallback(() => {
    if (!fgInstance) {
      console.log('[GraphComponent] handleFitToHome: fgInstance is null');
      return;
    }
    console.log('[GraphComponent] handleFitToHome: calling zoomToFit');
    const minDimension = Math.min(dimensions.width, dimensions.height);
    const padding = Math.max(40, minDimension * 0.15);
    fgInstance.zoomToFit(400, padding);
  }, [fgInstance, dimensions]);

  // Reliable focusing system with timeout fallback and viewType debugging
  const performFocusBasedOnViewType = useCallback((targetPath?: string, attemptCount = 0) => {
    if (!fgInstance || !isGraphLoaded) {
      console.log('[GraphComponent] Cannot focus - fgInstance or isGraphLoaded not ready');
      return;
    }

    console.log(`[GraphComponent] === FOCUS ATTEMPT === viewType: ${viewType}, path: ${targetPath || router.asPath}`);

    const MAX_ATTEMPTS = 20; // 2 seconds max wait (100ms * 20)
    
    // Try to get actual engine state
    let isEngineRunning = false;
    try {
      // Check if we can access the engine directly
      if (fgInstance._destructor) {
        // ForceGraph2D instance
        const alpha = fgInstance.d3Alpha?.() || fgInstance.alpha?.();
        isEngineRunning = alpha !== undefined && alpha > 0.01;
      } else {
        // Fallback: check if nodes are still moving
        const nodes = fgInstance.graphData?.()?.nodes;
        if (nodes && nodes.length > 0) {
          const movingNodes = nodes.filter((n: any) => 
            (n.vx && Math.abs(n.vx) > 0.01) || 
            (n.vy && Math.abs(n.vy) > 0.01)
          );
          isEngineRunning = movingNodes.length > 0;
        }
      }
    } catch {
      console.warn('[GraphComponent] Error checking physics engine state');
      return false;
    }

    if (isEngineRunning && attemptCount < MAX_ATTEMPTS) {
      console.log(`[GraphComponent] Engine running, attempt ${attemptCount + 1}/${MAX_ATTEMPTS}, viewType: ${viewType}`);
      setTimeout(() => {
        performFocusBasedOnViewType(targetPath, attemptCount + 1);
      }, 100);
      return;
    }

    // Engine stopped or max attempts reached
    console.log(`[GraphComponent] Proceeding with focus, viewType: ${viewType}`);
    
    const currentPath = targetPath || router.asPath;
    const minDimension = Math.min(dimensions.width, dimensions.height);
    
    if (viewType === 'sidenav') {
      // SideNav: focus on current location with moderate zoom
      const slug = currentPath.split('/').pop()?.split('?')[0] || '';
      const currentNode = graphData.nodes.find(n => n.page.slug === slug);
      console.log(`[GraphComponent] SideNav mode - looking for slug: ${slug}, found node: ${currentNode?.name || 'none'}`);
      if (currentNode) {
        console.log('[GraphComponent] SideNav - focusing on current node with dynamic zoom:', currentNode.name);
        
        // Calculate dynamic zoom based on node type and size
        let targetZoom = ZOOM_CONFIG.POST_NODE_ZOOM; // Default for post
        
        if (currentNode.type === 'Home') {
          targetZoom = ZOOM_CONFIG.HOME_NODE_ZOOM;
        } else if (currentNode.type === 'Category') {
          targetZoom = ZOOM_CONFIG.CATEGORY_NODE_ZOOM;
        } else {
          targetZoom = ZOOM_CONFIG.POST_NODE_ZOOM;
        }
        
        // Adjust zoom based on actual node size for consistent visual appearance
        const actualNodeSize = currentNode.type === 'Home' ? GRAPH_LAYOUT_CONFIG.HOME_NODE_SIZE :
                              currentNode.type === 'Category' ? GRAPH_LAYOUT_CONFIG.CATEGORY_NODE_SIZE :
                              GRAPH_LAYOUT_CONFIG.POST_NODE_SIZE;
        
        const finalZoom = targetZoom * (ZOOM_CONFIG.BASE_NODE_SIZE / actualNodeSize);
        
        console.log(`[GraphComponent] Node type: ${currentNode.type}, size: ${actualNodeSize}, zoom: ${finalZoom.toFixed(2)}`);
        
        // Center on the node and apply calculated zoom
        fgInstance.centerAt(currentNode.x, currentNode.y, 400);
        setTimeout(() => {
          fgInstance.zoom(finalZoom, 400);
        }, 100);
        
      } else {
        console.log('[GraphComponent] SideNav - current node not found, focusing on home');
        const homePadding = Math.max(40, minDimension * 0.2);
        fgInstance.zoomToFit(400, homePadding, (n: any) => n.id === HOME_NODE_ID);
      }
    } else {
      // Home: fit to all nodes
      console.log(`[GraphComponent] Home view - fitting to all nodes, path: ${currentPath}`);
      const homePadding = Math.max(40, minDimension * 0.15);
      fgInstance.zoomToFit(400, homePadding);
    }
  }, [fgInstance, isGraphLoaded, viewType, router.asPath, graphData.nodes, dimensions]);

  // Initial load focus with delay
  useEffect(() => {
    if (isGraphLoaded && fgInstance) {
      console.log('[GraphComponent] Initial load detected, waiting for engine...');
      // Add extra delay for initial load to ensure graph is fully ready
      setTimeout(() => {
        performFocusBasedOnViewType();
      }, 500);
    }
  }, [isGraphLoaded, fgInstance, performFocusBasedOnViewType]);

  // Route change handler
  useEffect(() => {
    if (isGraphLoaded && fgInstance) {
      console.log('[GraphComponent] Route change detected:', router.asPath);
      performFocusBasedOnViewType(router.asPath);
    }
  }, [router.asPath, isGraphLoaded, fgInstance, performFocusBasedOnViewType]);

  return (
    <div className={styles.graphInner} ref={containerRef} onMouseLeave={handleCanvasMouseLeave}>
      <div className={styles.buttonContainer}>
        <button onClick={handleFocusCurrentNode} className={styles.button} aria-label="Focus on current node">
          <MdMyLocation size={24} />
        </button>
        <button onClick={handleFitToHome} className={styles.button} aria-label="Fit to home">
          <MdHome size={24} />
        </button>
        {isModal ? (
          <button onClick={() => (window as any).closeGraphModal()} className={styles.button} aria-label="Close fullscreen">
            <MdFullscreenExit size={24} />
          </button>
        ) : (
          <button onClick={() => (window as any).openGraphModal()} className={styles.button} aria-label="Open in fullscreen">
            <MdFullscreen size={24} />
          </button>
        )}
      </div>

      {dimensions.width > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          onReady={setFgInstance}
          nodeLabel="name"
          nodeVal="val"
          warmupTicks={200}
          cooldownTicks={100}
          cooldownTime={15_000}
          onEngineStop={handleEngineStop as any}
          linkColor={(link) => {
            if (!hoveredNode) return colors.link;
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode)?.id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode)?.id;
            return sourceId === hoveredNode.id || targetId === hoveredNode.id ? colors.linkHover : colors.linkMinor;
          }}
          linkWidth={GRAPH_LAYOUT_CONFIG.LINK_WIDTH}
          onNodeClick={handleNodeClick as any}
          onNodeHover={handleNodeHover as any}
          onBackgroundClick={() => handleNodeHover(null)}
          onNodeDragEnd={(node: any) => {
            node.fx = undefined;
            node.fy = undefined;
          }}
          nodeCanvasObject={(node, ctx) => {
            const isHighlighted = highlightedNodeIds.has(node.id as string);
            if (!hoveredNode) {
              ctx.globalAlpha = 1;
            } else {
              ctx.globalAlpha = isHighlighted ? 1 : GRAPH_LAYOUT_CONFIG.HOVER_OPACITY;
            }

            const isTheHoveredNode = hoveredNode && hoveredNode.id === node.id;
            const { HOME_NODE_SIZE, CATEGORY_NODE_SIZE, POST_NODE_SIZE, HOME_CORNER_RADIUS, CATEGORY_CORNER_RADIUS, HOME_NAME_FONT_SIZE, CATEGORY_FONT_SIZE, POST_FONT_SIZE } = GRAPH_LAYOUT_CONFIG;

            // Helper function to draw image that completely fills the shape (crop to fill)
            const drawImageFillShape = (img: HTMLImageElement, x: number, y: number, width: number, height: number) => {
              const imgAspect = img.width / img.height;
              const containerAspect = width / height;
              
              let drawWidth, drawHeight, offsetX, offsetY;
              
              if (imgAspect > containerAspect) {
                // Image is wider, crop sides to fit height
                drawHeight = height;
                drawWidth = height * imgAspect;
                offsetX = (width - drawWidth) / 2;
                offsetY = 0;
              } else {
                // Image is taller, crop top/bottom to fit width
                drawWidth = width;
                drawHeight = width / imgAspect;
                offsetX = 0;
                offsetY = (height - drawHeight) / 2;
              }
              
              ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
            };

            if (node.type === 'Home') {
              const size = HOME_NODE_SIZE;
              ctx.beginPath();
              ctx.roundRect(node.x! - size / 2, node.y! - size / 2, size, size, HOME_CORNER_RADIUS);
              ctx.fillStyle = isTheHoveredNode ? colors.hover : colors.bg;
              ctx.fill();
              ctx.strokeStyle = colors.link;
              ctx.stroke();
              if (node.img && node.img.complete) {
                ctx.save();
                // Create clipping path that matches the exact shape
                ctx.beginPath();
                ctx.roundRect(node.x! - size / 2, node.y! - size / 2, size, size, HOME_CORNER_RADIUS);
                ctx.clip();
                
                // Draw image to completely fill the shape
                drawImageFillShape(
                  node.img, 
                  node.x! - size / 2, 
                  node.y! - size / 2, 
                  size, 
                  size
                );
                ctx.restore();
              }
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = colors.text;
              ctx.font = `600 ${HOME_NAME_FONT_SIZE}px Sans-Serif`;
              ctx.fillText(node.name, node.x!, node.y! + size / 2 + HOME_NAME_FONT_SIZE);
            } else {
              ctx.beginPath();
              let nodeSize: number;
              if (node.type === 'Category') {
                nodeSize = CATEGORY_NODE_SIZE;
                ctx.roundRect(node.x! - nodeSize / 2, node.y! - nodeSize / 2, nodeSize, nodeSize, CATEGORY_CORNER_RADIUS);
              } else { // Post
                nodeSize = POST_NODE_SIZE;
                ctx.arc(node.x!, node.y!, nodeSize / 2, 0, 2 * Math.PI, false);
              }
              ctx.fillStyle = isTheHoveredNode ? colors.hover : colors.node;
              ctx.fill();
              if (node.img && node.img.complete) {
                ctx.save();
                // Create clipping path that matches the exact shape
                ctx.beginPath();
                if (node.type === 'Category') {
                  ctx.roundRect(node.x! - nodeSize / 2, node.y! - nodeSize / 2, nodeSize, nodeSize, CATEGORY_CORNER_RADIUS);
                } else { // Post - circular
                  ctx.arc(node.x!, node.y!, nodeSize / 2, 0, 2 * Math.PI, false);
                }
                ctx.clip();
                
                // Draw image to completely fill the shape
                drawImageFillShape(
                  node.img,
                  node.x! - nodeSize / 2,
                  node.y! - nodeSize / 2,
                  nodeSize,
                  nodeSize
                );
                ctx.restore();
              }
              const label = node.name || '';
              const fontSize = node.type === 'Category' ? CATEGORY_FONT_SIZE : POST_FONT_SIZE;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = colors.text;
              const textYOffset = (nodeSize / 2) + 2;
              ctx.fillText(label, node.x!, node.y! + textYOffset);
            }
            ctx.globalAlpha = 1;
          }}
        />
      )}
    </div>
  );
}

export default function GraphView({ siteMap, viewType = 'home' }: GraphViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => {
    setIsMounted(true);
    (window as any).openGraphModal = openModal;
    (window as any).closeGraphModal = closeModal;

    return () => {
      delete (window as any).openGraphModal;
      delete (window as any).closeGraphModal;
    }
  }, [openModal, closeModal]);

  const containerClasses = `${styles.graphContainer} ${viewType === 'home' ? styles.homeView : styles.sideNavView}`;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <GraphComponent siteMap={siteMap} isModal={true} viewType={viewType} closeModal={closeModal} />
      </div>
    </div>
  );

  return (
    <div className={containerClasses}>
      <GraphComponent siteMap={siteMap} viewType={viewType} />
      {isMounted && isModalOpen && createPortal(modalContent, document.getElementById('modal-root')!)}
    </div>
  );
}
