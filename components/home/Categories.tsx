import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import siteConfig from 'site.config';

import type { SiteMap, PageInfo, Block } from '@/lib/types';
import { mapImageUrl } from '@/lib/map-image-url';
import { useDarkMode } from '@/lib/use-dark-mode';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const GRAPH_LAYOUT_CONFIG = {
  HOME_NODE_SIZE: 8,
  CATEGORY_NODE_SIZE: 4,
  POST_NODE_SIZE: 2,
  HOME_CORNER_RADIUS: 16,
  CATEGORY_CORNER_RADIUS: 4,
  LINK_WIDTH: 1,
  HOVER_OPACITY: 0.3,
  HOME_NAME_FONT_SIZE: 4,
  HOME_DESC_FONT_SIZE: 2,
  CATEGORY_FONT_SIZE: 2,
  POST_FONT_SIZE: 1,
};

const HOME_NODE_ID = '__HOME__';

interface CategoriesProps {
  siteMap?: SiteMap;
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

  // First pass: create all valid nodes
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

  // Second pass: create links
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
  
  // Calculate neighbors
  links.forEach(link => {
    const a = nodes.find(n => n.id === (link.source as any).id || n.id === link.source);
    const b = nodes.find(n => n.id === (link.target as any).id || n.id === link.target);
    if (!a || !b) return;
    !a.neighbors && (a.neighbors = []);
    !b.neighbors && (b.neighbors = []);
    a.neighbors.push(b);
    b.neighbors.push(a);
  });

  nodes.forEach(node => {
    node.val = getNodeSize(node);
  });

  return { nodes, links };
};

export default function Categories({ siteMap }: CategoriesProps) {
  const router = useRouter();
  const locale = router.locale || 'ko';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const { isDarkMode } = useDarkMode();

  const colors = useMemo(() => {
    if (isDarkMode) {
      return {
        node: 'rgba(0, 0, 0, 0.3)',
        text: 'rgba(255, 255, 255, 0.9)',
        desc: 'rgba(255, 255, 255, 0.7)',
        link: 'rgba(255, 255, 255, 0.2)',
        hover: 'rgba(255, 255, 255, 0.06)',
        bg: 'rgba(0, 0, 0, 0.3)'
      };
    } else {
      return {
        node: 'rgba(255, 255, 255, 0.3)',
        text: 'rgb(50, 48, 44)',
        desc: 'rgba(50, 48, 44, 0.7)',
        link: 'rgba(0, 0, 0, 0.2)',
        hover: 'rgba(0, 0, 0, 0.04)',
        bg: 'rgba(255, 255, 255, 0.3)'
      };
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  const graphData = useMemo(() => {
    if (!siteMap) {
      return { nodes: [], links: [] };
    }
    return createGraphData(siteMap.navigationTree, locale);
  }, [siteMap, locale]);

  const handleNodeClick = (untypedNode: any) => {
    const node = untypedNode as GraphNode;
    if (node.id === HOME_NODE_ID) {
      void router.push('/');
      return;
    }
    const page = node.page as PageInfo;
    if (page && page.slug) {
      void router.push(`/${page.language}/${page.slug}`);
    }
  };

  if (!siteMap) {
    return <div style={{ width: '100%', height: '500px' }} />;
  }

  return (
    <div ref={containerRef}
      style={{
        width: '100%',
        height: '75vh',
        position: 'relative',
        border: `1px solid ${colors.link}`,
        borderRadius: '32px',
        overflow: 'hidden',
        backgroundColor: colors.bg,
      }}>
      {dimensions.width > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeVal="val"
          linkColor={(link: any) => {
            const source = link.source;
            const target = link.target;

            if (!source || !target) {
              return colors.link;
            }

            const sourceId = typeof source === 'object' ? source.id : source;
            const targetId = typeof target === 'object' ? target.id : target;
            
            if (hoveredNode && (sourceId === hoveredNode.id || targetId === hoveredNode.id)) {
              return colors.hover;
            }
            if (hoveredNode && !(hoveredNode.neighbors?.some(n => n.id === sourceId) || hoveredNode.neighbors?.some(n => n.id === targetId))) {
              return `rgba(0,0,0,${GRAPH_LAYOUT_CONFIG.HOVER_OPACITY})`;
            }
            return colors.link;
          }}
          linkWidth={GRAPH_LAYOUT_CONFIG.LINK_WIDTH}
          onNodeClick={handleNodeClick}
          onNodeHover={node => setHoveredNode(node as GraphNode)}
          nodeCanvasObject={(untypedNode, ctx) => {
            const node = untypedNode as GraphNode;
            const isHovered = hoveredNode && hoveredNode.id === node.id;
            const isNeighbor = hoveredNode && hoveredNode.neighbors?.some(n => n.id === node.id);
            const opacity = (hoveredNode && !isHovered && !isNeighbor) ? GRAPH_LAYOUT_CONFIG.HOVER_OPACITY : 1;

            ctx.globalAlpha = opacity;

            const {
              HOME_NODE_SIZE, CATEGORY_NODE_SIZE, POST_NODE_SIZE,
              HOME_CORNER_RADIUS, CATEGORY_CORNER_RADIUS,
              HOME_NAME_FONT_SIZE, HOME_DESC_FONT_SIZE, CATEGORY_FONT_SIZE, POST_FONT_SIZE
            } = GRAPH_LAYOUT_CONFIG;

            if (node.type === 'Home') {
              const size = HOME_NODE_SIZE;
              ctx.beginPath();
              ctx.roundRect(node.x! - size / 2, node.y! - size / 2, size, size, HOME_CORNER_RADIUS);
              ctx.fillStyle = isHovered ? colors.hover : colors.bg;
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
              
              return;
            }

            ctx.beginPath();
            if (node.type === 'Category') {
              const size = CATEGORY_NODE_SIZE;
              ctx.roundRect(node.x! - size / 2, node.y! - size / 2, size, size, CATEGORY_CORNER_RADIUS);
            } else { // Post
              const r = POST_NODE_SIZE / 2;
              ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI, false);
            }
            ctx.fillStyle = isHovered ? colors.hover : colors.node;
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
          }}
        />
      )}
    </div>
  );
}
