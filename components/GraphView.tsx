import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { GraphMethods } from './ForceGraphWrapper';
import siteConfig from 'site.config';
import { MdFullscreen, MdFullscreenExit, MdMyLocation } from 'react-icons/md';
import { createPortal } from 'react-dom';
import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';

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
      page: page,
    };

    if (imageUrl && !imageCache.has(imageUrl)) {
      const img = new Image();
      img.src = imageUrl;
      imageCache.set(imageUrl, img);
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

    !a.neighbors && (a.neighbors = []);
    !b.neighbors && (b.neighbors = []);
    a.neighbors.push(b);
    b.neighbors.push(a);

    !a.links && (a.links = []);
    !b.links && (b.links = []);
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

function GraphComponent({ siteMap, isModal = false }: { siteMap?: SiteMap, isModal?: boolean }) {
  const router = useRouter();
  const locale = router.locale || 'ko';

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState(new Set<string>());
  const { isDarkMode } = useDarkMode();
  const [initialFocusNode, setInitialFocusNode] = useState<GraphNode | null>(null);
  const [isGraphLoaded, setIsGraphLoaded] = useState(false);
  const [fgInstance, setFgInstance] = useState<any>(null);

  const colors = useMemo(() => {
    if (isDarkMode) {
      return {
        node: 'rgba(0, 0, 0, 0.3)',
        text: 'rgba(255, 255, 255, 0.9)',
        desc: 'rgba(255, 255, 255, 0.7)',
        link: 'rgba(255, 255, 255, 0.2)',
        linkHover: 'rgba(255, 255, 255, 0.3)',
        linkMinor: 'rgba(255, 255, 255, 0.1)',
        hover: 'rgba(255, 255, 255, 0.06)',
        bg: 'rgba(0, 0, 0, 0.3)'
      };
    } else {
      return {
        node: 'rgba(255, 255, 255, 0.3)',
        text: 'rgb(50, 48, 44)',
        desc: 'rgba(50, 48, 44, 0.7)',
        link: 'rgba(0, 0, 0, 0.2)',
        linkHover: 'rgba(0, 0, 0, 0.3)',
        linkMinor: 'rgba(0, 0, 0, 0.1)',
        hover: 'rgba(0, 0, 0, 0.04)',
        bg: 'rgba(255, 255, 255, 0.3)'
      };
    }
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
    console.log('[GraphComponent] handleEngineStop triggered.');
    console.log('[GraphComponent] fgInstance in handleEngineStop:', fgInstance);
    
    // 그래프가 로드되었음을 표시
    setIsGraphLoaded(true);
    
    if (fgInstance && typeof fgInstance.zoomToFit === 'function') {
      if (initialFocusNode) {
        console.log('[GraphComponent] Engine stopped. Focusing on initial node:', initialFocusNode.name);
        fgInstance.zoomToFit(400, 150, (n: any) => n.id === initialFocusNode.id);
        setInitialFocusNode(null); // Reset after focusing
      } else {
        console.log('[GraphComponent] Engine stopped. Calling zoomToFit without a specific node.');
        fgInstance.zoomToFit(400, 150);
      }
    } else {
      console.error('[GraphComponent] Engine stopped, but zoomToFit is not available.', { fgInstance });
    }
  }, [initialFocusNode, setInitialFocusNode, fgInstance]);

  const handleNodeClick = (node: GraphNode) => {
    if (node.id === HOME_NODE_ID) {
      void router.push('/');
      return;
    }
    const page = node.page as PageInfo;
    if (page && page.slug) {
      void router.push(`/${page.language}/${page.slug}`);
    }
  };

  const handleNodeHover = (node: GraphNode | null) => {
    const newIds = new Set<string>();
    if (node) {
      newIds.add(node.id as string);
      node.neighbors?.forEach(neighbor => newIds.add(neighbor.id as string));
    }
    setHighlightedNodeIds(newIds);
    setHoveredNode(node);
  };

  const focusOnNode = useCallback((node: GraphNode) => {
    console.log('[GraphComponent] focusOnNode called for node:', node.name);
    console.log('[GraphComponent] fgInstance before zoomToFit:', fgInstance);
    
    if (fgInstance && typeof fgInstance.zoomToFit === 'function') {
      console.log('[GraphComponent] zoomToFit is a function. Calling it now.');
      fgInstance.zoomToFit(400, 150, (n: any) => n.id === node.id);
    } else {
      console.error('[GraphComponent] zoomToFit is NOT a function or fgInstance is not set.', { fgInstance });
    }
  }, [fgInstance]);

  const handleFocusCurrentNode = useCallback(() => {
    if (!fgInstance) {
      console.log('[GraphComponent] handleFocusCurrentNode: fgInstance is null or undefined.');
      return;
    }
    const slug = router.asPath.split('/').pop()?.split('?')[0] || '';
    const currentNode = graphData.nodes.find(n => n.page.slug === slug);
    if (currentNode) {
      focusOnNode(currentNode);
    } else {
      focusOnNode(graphData.nodes.find(n => n.id === HOME_NODE_ID) as GraphNode);
    }
  }, [fgInstance, graphData.nodes, router.asPath]);

  return (
    <div className={styles.graphInner} ref={containerRef}>
      <div className={styles.buttonContainer}>
        <button onClick={handleFocusCurrentNode} className={styles.button} aria-label="Focus on current node">
          <MdMyLocation size={24} />
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
          cooldownTicks={Infinity}
          cooldownTime={0}
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
          nodeCanvasObject={(node, ctx) => {
            const isHighlighted = highlightedNodeIds.has(node.id as string);
            if (!hoveredNode) {
              ctx.globalAlpha = 1;
            } else {
              ctx.globalAlpha = isHighlighted ? 1 : GRAPH_LAYOUT_CONFIG.HOVER_OPACITY;
            }

            const isTheHoveredNode = hoveredNode && hoveredNode.id === node.id;
            const { HOME_NODE_SIZE, CATEGORY_NODE_SIZE, POST_NODE_SIZE, HOME_CORNER_RADIUS, CATEGORY_CORNER_RADIUS, HOME_NAME_FONT_SIZE, CATEGORY_FONT_SIZE, POST_FONT_SIZE } = GRAPH_LAYOUT_CONFIG;
            if (node.type === 'Home') {
              const size = HOME_NODE_SIZE;
              ctx.beginPath();
              ctx.roundRect(node.x! - size / 2, node.y! - size / 2, size, size, HOME_CORNER_RADIUS);
              ctx.fillStyle = isTheHoveredNode ? colors.hover : colors.bg;
              ctx.fill();
              ctx.strokeStyle = colors.link;
              ctx.stroke();
              if (node.img && node.img.complete) {
                const iconSize = size * 0.6;
                ctx.save();
                ctx.clip();
                ctx.drawImage(node.img, node.x! - iconSize / 2, node.y! - iconSize / 2, iconSize, iconSize);
                ctx.restore();
              }
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = colors.text;
              ctx.font = `600 ${HOME_NAME_FONT_SIZE}px Sans-Serif`;
              ctx.fillText(node.name, node.x!, node.y! + size / 2 + HOME_NAME_FONT_SIZE);
            } else {
              ctx.beginPath();
              if (node.type === 'Category') {
                const size = CATEGORY_NODE_SIZE;
                ctx.roundRect(node.x! - size / 2, node.y! - size / 2, size, size, CATEGORY_CORNER_RADIUS);
              } else { // Post
                const r = POST_NODE_SIZE / 2;
                ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI, false);
              }
              ctx.fillStyle = isTheHoveredNode ? colors.hover : colors.node;
              ctx.fill();
              if (node.img && node.img.complete) {
                ctx.save();
                ctx.clip();
                const size = node.type === 'Category' ? CATEGORY_NODE_SIZE : POST_NODE_SIZE;
                ctx.drawImage(node.img, node.x! - size / 2, node.y! - size / 2, size, size);
                ctx.restore();
              }
              const label = node.name || '';
              const fontSize = node.type === 'Category' ? CATEGORY_FONT_SIZE : POST_FONT_SIZE;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = colors.text;
              const textYOffset = (node.type === 'Category' ? CATEGORY_NODE_SIZE / 2 : POST_NODE_SIZE / 2) + 2;
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
        <GraphComponent siteMap={siteMap} isModal={true} />
      </div>
    </div>
  );

  return (
    <div className={containerClasses}>
      <GraphComponent siteMap={siteMap} />
      {isMounted && isModalOpen && createPortal(modalContent, document.getElementById('modal-root')!)}
    </div>
  );
}
