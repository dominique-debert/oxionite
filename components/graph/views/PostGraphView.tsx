import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useGraphContext } from '../GraphProvider';
import { useDarkMode } from '@/lib/use-dark-mode';
import { GRAPH_CONFIG, GRAPH_COLORS, HOME_NODE_ID } from '../utils/graphConfig';
import type { GraphNode } from '../types/graph.types';

const ForceGraphWrapper = dynamic(() => import('../ForceGraphWrapper'), {
  ssr: false,
  loading: () => <div>Loading graph...</div>
});

interface PostGraphViewProps {
  width?: number;
  height?: number;
  className?: string;
}

export const PostGraphView: React.FC<PostGraphViewProps> = ({
  width,
  height,
  className = '',
}) => {
  const router = useRouter();
  const { state, actions, data, instance } = useGraphContext();
  const { isDarkMode } = useDarkMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: width || 800, height: height || 600 });

  const { postGraphData } = data;
  const { graphRef, setGraphInstance } = instance;
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  // Handle node click for navigation
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'Root') {
      void router.push('/');
    } else if (node.url && node.url !== '#') {
      void router.push(node.url);
    }
  }, [router]);

  // Restore zoom state on view change
  useEffect(() => {
    if (state.isGraphLoaded && graphRef.current) {
      void actions.applyZoomState('post_view');
    }
  }, [state.currentView, state.isGraphLoaded, actions, graphRef]);

  // Handle node hover
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
    const newIds = new Set<string>();
    if (node) {
      newIds.add(node.id as string);
      // Add connected nodes to highlight
      postGraphData?.links.forEach(link => {
        if (link.source === node.id) newIds.add(link.target as string);
        if (link.target === node.id) newIds.add(link.source as string);
      });
    }
    setHighlightedNodeIds(newIds);
  }, [postGraphData]);

  const handleCanvasMouseLeave = useCallback(() => {
    handleNodeHover(null);
  }, [handleNodeHover]);

  // Save zoom state on interaction
  const handleZoom = useCallback(() => {
    void actions.saveZoomState('post_view');
  }, [actions]);

  // Helper function to draw image that completely fills the shape (crop to fill)
  const drawImageFillShape = useCallback((
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
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
    
    return { drawWidth, drawHeight, offsetX, offsetY };
  }, []);

  // Node canvas object for custom rendering with glassmorphism
  const nodeCanvasObject = useCallback((
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;
    
    // Handle hover opacity effect
    const isHighlighted = highlightedNodeIds.has(node.id as string);
    if (!hoveredNode) {
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = isHighlighted ? 1 : GRAPH_CONFIG.visual.HOVER_OPACITY;
    }

    const isTheHoveredNode = hoveredNode && hoveredNode.id === node.id;
    const label = node.name;
    
    // Fixed node sizes (not affected by zoom)
    let nodeSize: number;
    let cornerRadius: number;
    
    if (node.id === HOME_NODE_ID) {
      nodeSize = GRAPH_CONFIG.visual.HOME_NODE_SIZE;
      cornerRadius = GRAPH_CONFIG.visual.HOME_CORNER_RADIUS;
    } else if (node.type === 'Category') {
      nodeSize = GRAPH_CONFIG.visual.CATEGORY_NODE_SIZE;
      cornerRadius = GRAPH_CONFIG.visual.CATEGORY_CORNER_RADIUS;
    } else { // Post and Home-type pages
      nodeSize = GRAPH_CONFIG.visual.POST_NODE_SIZE;
      cornerRadius = nodeSize / 2; // Make it circular
    }

    const W_OUTER = GRAPH_CONFIG.visual.NODE_OUTER_BORDER_WIDTH;
    const W_INNER = GRAPH_CONFIG.visual.NODE_INNER_BORDER_WIDTH;

    // --- 1. Draw Outer Border ---
    ctx.strokeStyle = colors.nodeOuterBorder;
    ctx.lineWidth = W_OUTER;
    if (node.type === 'Category') {
      const outerPathX = node.x! - (nodeSize / 2) + (W_OUTER / 2);
      const outerPathY = node.y! - (nodeSize / 2) + (W_OUTER / 2);
      const outerPathSize = nodeSize - W_OUTER;
      const outerPathRadius = cornerRadius - (W_OUTER / 2);
      ctx.beginPath();
      ctx.roundRect(outerPathX, outerPathY, outerPathSize, outerPathSize, outerPathRadius > 0 ? outerPathRadius : 0);
      ctx.stroke();
    } else {
      const outerPathRadius = (nodeSize / 2) - (W_OUTER / 2);
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, outerPathRadius > 0 ? outerPathRadius : 0, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // --- 2. Draw Inner Border ---
    ctx.strokeStyle = colors.nodeInnerBorder;
    ctx.lineWidth = W_INNER;
    if (node.type === 'Category') {
      const innerPathX = node.x! - (nodeSize / 2) + W_OUTER + (W_INNER / 2);
      const innerPathY = node.y! - (nodeSize / 2) + W_OUTER + (W_INNER / 2);
      const innerPathSize = nodeSize - (2 * W_OUTER) - W_INNER;
      const innerPathRadius = cornerRadius - W_OUTER - (W_INNER / 2);
      ctx.beginPath();
      ctx.roundRect(innerPathX, innerPathY, innerPathSize, innerPathSize, innerPathRadius > 0 ? innerPathRadius : 0);
      ctx.stroke();
    } else {
      const innerPathRadius = (nodeSize / 2) - W_OUTER - (W_INNER / 2);
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, innerPathRadius > 0 ? innerPathRadius : 0, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // --- 3. Draw Node Background ---
    ctx.fillStyle = colors.node;
    if (node.type === 'Category') {
      const fillX = node.x! - (nodeSize / 2) + W_OUTER + W_INNER;
      const fillY = node.y! - (nodeSize / 2) + W_OUTER + W_INNER;
      const fillSize = nodeSize - 2 * (W_OUTER + W_INNER);
      const fillRadius = cornerRadius - W_OUTER - W_INNER;
      ctx.beginPath();
      ctx.roundRect(fillX, fillY, fillSize, fillSize, fillRadius > 0 ? fillRadius : 0);
      ctx.fill();
    } else {
      const fillRadius = (nodeSize / 2) - W_OUTER - W_INNER;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, fillRadius > 0 ? fillRadius : 0, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw cover image or favicon
    if (node.imageUrl && node.img && node.img.complete) {
      ctx.save();
      
      // Define the image area, which is the node's fill area
      const imageAreaOffset = W_OUTER + W_INNER;
      const imageAreaSize = nodeSize - 2 * imageAreaOffset;

      if (imageAreaSize <= 0) {
        ctx.restore();
        return; // Don't draw if the area is non-existent
      }

      // Create a clipping path that matches the node's fill area
      if (node.type === 'Category') {
        const imageCornerRadius = cornerRadius - imageAreaOffset;
        ctx.beginPath();
        ctx.roundRect(
          node.x! - imageAreaSize / 2,
          node.y! - imageAreaSize / 2,
          imageAreaSize,
          imageAreaSize,
          imageCornerRadius > 0 ? imageCornerRadius : 0
        );
      } else { // Post and Home-type pages
        const imageRadius = imageAreaSize / 2;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, imageRadius, 0, 2 * Math.PI);
      }
      ctx.clip();

      // Draw the image, scaled to fill the clipped area
      const { drawWidth, drawHeight, offsetX, offsetY } = drawImageFillShape(
        node.img,
        node.x! - imageAreaSize / 2,
        node.y! - imageAreaSize / 2,
        imageAreaSize,
        imageAreaSize
      );
      ctx.drawImage(
        node.img,
        node.x! + offsetX - imageAreaSize / 2,
        node.y! + offsetY - imageAreaSize / 2,
        drawWidth,
        drawHeight
      );
      ctx.restore();
    } else if (node.id === HOME_NODE_ID) {
      // Draw favicon for home node
      const innerOffset = GRAPH_CONFIG.visual.NODE_OUTER_BORDER_WIDTH;
      const innerSize = nodeSize - 2 * innerOffset;
      const faviconSize = innerSize * 0.8;
      ctx.fillStyle = colors.text;
      ctx.font = `${faviconSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', node.x!, node.y!);
    }

    // Draw label with fixed size (scales with zoom)
    const fontSize = node.type === 'Root' 
      ? GRAPH_CONFIG.visual.HOME_NAME_FONT_SIZE 
      : node.type === 'Category'
      ? GRAPH_CONFIG.visual.CATEGORY_FONT_SIZE
      : GRAPH_CONFIG.visual.POST_FONT_SIZE;
    
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    
    const textYOffset = nodeSize / 2 + 3;
    ctx.fillText(label, node.x!, node.y! + textYOffset);
    
    ctx.globalAlpha = 1;
  }, [isDarkMode, hoveredNode, highlightedNodeIds, drawImageFillShape]);

  // Link styling with hover effects
  const linkCanvasObject = useCallback((
    link: any,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;
    
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode)?.id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode)?.id;
    
    // Handle hover opacity for links
    if (hoveredNode) {
      const isConnected = sourceId === hoveredNode.id || targetId === hoveredNode.id;
      ctx.globalAlpha = isConnected ? 1 : GRAPH_CONFIG.visual.HOVER_OPACITY;
    } else {
      ctx.globalAlpha = 1;
    }
    
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = colors.link;
    ctx.lineWidth = GRAPH_CONFIG.visual.LINK_WIDTH;
    ctx.stroke();
    
    ctx.globalAlpha = 1;
  }, [isDarkMode, hoveredNode]);

  if (!postGraphData || postGraphData.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No data available</div>
          <div className="text-sm text-gray-500">Unable to load site structure</div>
        </div>
      </div>
    );
  }

  // Handle responsive sizing
  useEffect(() => {
    if (!containerRef.current || (width && height)) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width: containerWidth, height: containerHeight } = entries[0].contentRect;
        setDimensions({ width: containerWidth, height: containerHeight });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [width, height]);

  const containerStyle = (width && height) ? { width, height } : { width: '100%', height: '100%' };
  const graphWidth = width || dimensions.width;
  const graphHeight = height || dimensions.height;

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      {(graphWidth > 0 && graphHeight > 0) && (
        <ForceGraphWrapper
          ref={graphRef}
          graphData={postGraphData}
          nodeCanvasObject={nodeCanvasObject as any}
          linkCanvasObject={linkCanvasObject as any}
          onNodeClick={handleNodeClick as any}
          onZoom={handleZoom}
          onZoomEnd={handleZoom}
          onEngineStop={() => actions.setIsGraphLoaded(true)}
          onReady={(instance) => {
            setGraphInstance(instance);
            // Apply physics forces using the instance's built-in methods
            instance.d3Force('link')
              .distance(GRAPH_CONFIG.physics.linkDistance)
              .strength(GRAPH_CONFIG.physics.linkStrength);
            instance.d3Force('charge').strength(-GRAPH_CONFIG.physics.nodeRepulsion);
          }}
          backgroundColor="transparent"
          width={graphWidth}
          height={graphHeight}
          cooldownTicks={GRAPH_CONFIG.physics.cooldownTicks}
          warmupTicks={GRAPH_CONFIG.physics.warmupTicks}
          linkWidth={GRAPH_CONFIG.visual.LINK_WIDTH}
          linkColor={() => isDarkMode ? GRAPH_COLORS.dark.link : GRAPH_COLORS.light.link}
          nodeRelSize={1} // Use fixed size instead of relative
          d3AlphaDecay={GRAPH_CONFIG.physics.d3AlphaDecay}
          d3VelocityDecay={GRAPH_CONFIG.physics.d3VelocityDecay}
          onNodeHover={handleNodeHover as any}
          onBackgroundClick={() => handleNodeHover(null)}
          onNodeDragEnd={(node: any) => {
            node.fx = undefined;
            node.fy = undefined;
          }}
        />
      )}
    </div>
  );
};
