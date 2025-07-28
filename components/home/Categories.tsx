import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

import type { SiteMap, PageInfo, Block } from '@/lib/types';
import { mapImageUrl } from '@/lib/map-image-url';
import { useDarkMode } from '@/lib/use-dark-mode';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// 5. Layout variables are grouped at the top.
const GRAPH_LAYOUT_CONFIG = {
  CATEGORY_NODE_SIZE: 24,
  POST_NODE_SIZE: 12,
  CATEGORY_CORNER_RADIUS: 4,
  LABEL_FONT_SIZE: 4,
  LINK_WIDTH: 2,
};

interface CategoriesProps {
  siteMap?: SiteMap;
}

interface GraphNode {
  id: string;
  name: string;
  type: 'Category' | 'Post';
  imageUrl?: string;
  page: PageInfo;
  img?: HTMLImageElement;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

const imageCache = new Map<string, HTMLImageElement>();

// 1. Displays posts and categories for the current locale at once.
const createGraphData = (navigationTree: PageInfo[], locale: string) => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const addedNodes = new Set<string>();

  const addNode = (page: PageInfo) => {
    if (addedNodes.has(page.pageId) || page.language !== locale) return;
    if (page.type !== 'Category' && page.type !== 'Post') return;

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
  };

  const traverse = (pages: PageInfo[]) => {
    pages.forEach((page) => {
      if (page.language !== locale) return;

      if (page.type === 'Category') {
        addNode(page);

        if (page.children?.length) {
          page.children.forEach((child) => {
            if (child.language === locale && (child.type === 'Category' || child.type === 'Post')) {
              addNode(child);
              links.push({
                source: page.pageId,
                target: child.pageId,
              });
            }
          });
          traverse(page.children);
        }
      }
    });
  };

  traverse(navigationTree);
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
        link: 'rgba(255, 255, 255, 0.2)',
        hover: 'rgba(255, 255, 255, 0.06)',
        bg: 'rgba(0, 0, 0, 0.3)'
      };
    } else {
      return {
        node: 'rgba(255, 255, 255, 0.3)',
        text: 'rgb(50, 48, 44)',
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

  // 4. Clicking routes to the slug, which works for both types.
  const handleNodeClick = (node: any) => {
    const page = node.page as PageInfo;
    if (page) {
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
          linkColor={(link) => {
            const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
            return hoveredNode && (sourceId === hoveredNode.id || targetId === hoveredNode.id)
              ? colors.hover
              : colors.link;
          }}
          linkWidth={GRAPH_LAYOUT_CONFIG.LINK_WIDTH}
          onNodeClick={handleNodeClick}
          onNodeHover={node => setHoveredNode(node as GraphNode)}
          nodeCanvasObject={(node: GraphNode, ctx, globalScale) => {
            const isHovered = hoveredNode && hoveredNode.id === node.id;
            const { CATEGORY_NODE_SIZE, POST_NODE_SIZE, CATEGORY_CORNER_RADIUS, LABEL_FONT_SIZE } = GRAPH_LAYOUT_CONFIG;

            // 2 & 3. Draw shape based on node type (Category or Post)
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

            // 2 & 3. Draw cover image if available
            if (node.img && node.img.complete) {
              ctx.save();
              ctx.clip(); // Clip to the path we just drew
              const size = node.type === 'Category' ? CATEGORY_NODE_SIZE : POST_NODE_SIZE;
              ctx.drawImage(node.img, node.x! - size / 2, node.y! - size / 2, size, size);
              ctx.restore();
            }

            // Draw label
            const label = node.name || '';
            const fontSize = LABEL_FONT_SIZE;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = colors.text;
            const textYOffset = (node.type === 'Category' ? CATEGORY_NODE_SIZE / 2 : POST_NODE_SIZE / 2) + 8;
            ctx.fillText(label, node.x!, node.y! + textYOffset);
          }}
        />
      )}
    </div>
  );
}
