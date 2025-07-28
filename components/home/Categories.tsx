import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

import type { SiteMap, PageInfo, Block } from '@/lib/types';
import { mapImageUrl } from '@/lib/map-image-url';
import { useDarkMode } from '@/lib/use-dark-mode';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface CategoriesProps {
  siteMap?: SiteMap;
}

interface GraphNode {
  id: string;
  name: string;
  imageUrl?: string;
  page: PageInfo;
  img?: HTMLImageElement;
  val?: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

const imageCache = new Map<string, HTMLImageElement>();

const createGraphData = (navigationTree: PageInfo[], locale: string) => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  function traverse(pages: PageInfo[]) {
    pages.forEach((page) => {
      if (page.language !== locale || page.type !== 'Category') {
        return;
      }

      const imageUrl = page.coverImage && page.coverImageBlock
        ? mapImageUrl(page.coverImage, page.coverImageBlock as Block)
        : undefined;

      const node: GraphNode = {
        id: page.pageId,
        name: page.title,
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

      if (page.children && page.children.length > 0) {
        page.children.forEach((child) => {
          if (child.language === locale && child.type === 'Category') {
            links.push({
              source: page.pageId,
              target: child.pageId,
            });
          }
        });
        traverse(page.children);
      }
    });
  }

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
          nodeVal={10}
          linkColor={(link) => {
            const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
            return hoveredNode && (sourceId === hoveredNode.id || targetId === hoveredNode.id)
              ? colors.hover
              : colors.link;
          }}
          linkWidth={2}
          onNodeClick={handleNodeClick}
          onNodeHover={node => setHoveredNode(node as GraphNode)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const r = Math.sqrt(node.val || 1) * 4;
            const isHovered = hoveredNode && hoveredNode.id === node.id;

            // Draw circle
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = isHovered ? colors.hover : colors.node;
            ctx.fill();

            // Draw image inside circle
            if (node.img && node.img.complete) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI, false);
              ctx.clip();
              ctx.drawImage(node.img, node.x! - r, node.y! - r, r * 2, r * 2);
              ctx.restore();
            }

            // Draw label
            const label = node.name || '';
            const fontSize = 16 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = colors.text;
            ctx.fillText(label, node.x!, node.y! + r + 1);
          }}
        />
      )}
    </div>
  );
}
