import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import siteConfig from 'site.config';
import { MdFullscreen, MdFullscreenExit, MdMyLocation } from 'react-icons/md';
import { createPortal } from 'react-dom';

import type { SiteMap, PageInfo, Block } from '@/lib/types';
import { mapImageUrl } from '@/lib/map-image-url';
import { useDarkMode } from '@/lib/use-dark-mode';
import styles from '@/styles/components/GraphView.module.css';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

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

interface GraphViewProps {
  siteMap?: SiteMap;
  viewType?: 'home' | 'sidenav';
}

interface GraphNode {
  id: string;
  name: string;
  description?: string;
  type: 'Category' | 'Post' | 'Home';
  imageUrl?: string;
  page: Partial<PageInfo>;
  img?: HTMLImageElement;
  x?: number;
  y?: number;
  neighbors?: GraphNode[];
  links?: GraphLink[];
  val?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
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
    const a = nodes.find(n => n.id === (link.source as any)?.id || n.id === link.source);
    const b = nodes.find(n => n.id === (link.target as any)?.id || n.id === link.target);
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

const GraphComponent = React.forwardRef(({ siteMap }: { siteMap?: SiteMap }, ref) => {
  const router = useRouter();
  const locale = router.locale || 'ko';
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set<GraphNode>());
  const [highlightLinks, setHighlightLinks] = useState(new Set<GraphLink>());
  const { isDarkMode } = useDarkMode();

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

  const focusOnNode = useCallback((node: GraphNode) => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 150, (n: GraphNode) => n === node);
    }
  }, []);

  React.useImperativeHandle(ref, () => ({
    focusOnNode,
  }));

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

    const slug = router.asPath.split('/').pop()?.split('?')[0];
    const currentNode = graphData.nodes.find(n => n.page.slug === slug);
    if (currentNode) {
      setTimeout(() => focusOnNode(currentNode), 500);
    }

    return () => window.removeEventListener('resize', updateDimensions);
  }, [graphData, router.asPath, focusOnNode]);

  const handleNodeClick = (node: any) => {
    const typedNode = node as GraphNode;
    if (typedNode.id === HOME_NODE_ID) {
      void router.push('/');
      return;
    }
    const page = typedNode.page as PageInfo;
    if (page && page.slug) {
      void router.push(`/${page.language}/${page.slug}`);
    }
  };

  const handleNodeHover = (node: any) => {
    const typedNode = node as GraphNode | null;
    const newHighlightNodes = new Set<GraphNode>();
    const newHighlightLinks = new Set<GraphLink>();

    if (typedNode) {
      newHighlightNodes.add(typedNode);
      typedNode.neighbors?.forEach(neighbor => newHighlightNodes.add(neighbor));
      typedNode.links?.forEach(link => newHighlightLinks.add(link));
    }

    setHoveredNode(typedNode);
    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  };

  return (
    <div ref={containerRef} className={styles.graphInner}>
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeVal="val"
          autoPauseRedraw={false}
          linkColor={(link: any) => {
            const typedLink = link as GraphLink;
            if (!hoveredNode) return colors.link;
            return highlightLinks.has(typedLink) ? colors.linkHover : colors.linkMinor;
          }}
          linkWidth={GRAPH_LAYOUT_CONFIG.LINK_WIDTH}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          nodeCanvasObject={(untypedNode, ctx) => {
            const node = untypedNode as GraphNode;
            if (hoveredNode && !highlightNodes.has(node)) {
              ctx.globalAlpha = GRAPH_LAYOUT_CONFIG.HOVER_OPACITY;
            } else {
              ctx.globalAlpha = 1;
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
});

export default function GraphView({ siteMap, viewType = 'home' }: GraphViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const graphRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleFocusCurrentNode = () => {
    if (graphRef.current) {
      const slug = router.asPath.split('/').pop()?.split('?')[0];
      const siteMapNodes = (siteMap?.navigationTree || []);
      const nodes = createGraphData(siteMapNodes, router.locale || 'ko').nodes;
      const currentNode = nodes.find(n => n.page.slug === slug);
      if (currentNode) {
        graphRef.current.focusOnNode(currentNode);
      }
    }
  };

  const containerClasses = `${styles.graphContainer} ${viewType === 'home' ? styles.homeView : styles.sideNavView}`;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
         <div className={styles.buttonContainer}>
          <button onClick={handleFocusCurrentNode} className={styles.button} aria-label="Focus on current node">
            <MdMyLocation size={24} />
          </button>
          <button onClick={closeModal} className={styles.button} aria-label="Close fullscreen">
            <MdFullscreenExit size={24} />
          </button>
        </div>
        <GraphComponent siteMap={siteMap} ref={graphRef} />
      </div>
    </div>
  );

  return (
    <div className={containerClasses}>
      <div className={styles.buttonContainer}>
        <button onClick={handleFocusCurrentNode} className={styles.button} aria-label="Focus on current node">
          <MdMyLocation size={24} />
        </button>
        <button onClick={openModal} className={styles.button} aria-label="Open in fullscreen">
          <MdFullscreen size={24} />
        </button>
      </div>
      <GraphComponent siteMap={siteMap} ref={graphRef} />

      {isMounted && isModalOpen && createPortal(modalContent, document.getElementById('modal-root')!)}
    </div>
  );
}
