import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useGraphContext } from '../GraphProvider';
import { useDarkMode } from '@/lib/use-dark-mode';
import { GRAPH_CONFIG, GRAPH_COLORS } from '../utils/graphConfig';
import type { GraphNode } from '../types/graph.types';

const ForceGraphWrapper = dynamic(() => import('../ForceGraphWrapper'), {
  ssr: false,
  loading: () => <div>Loading tag graph...</div>
});

interface TagGraphViewProps {
  width?: number;
  height?: number;
  className?: string;
  currentTag?: string;
}

export const TagGraphView: React.FC<TagGraphViewProps> = ({
  width,
  height,
  className = '',
  currentTag,
}) => {
  const router = useRouter();
  const { state, actions, data, instance } = useGraphContext();
  const { isDarkMode } = useDarkMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: width || 800, height: height || 600 });

  const { tagGraphData } = data;
  const { graphRef, setGraphInstance } = instance;
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState<Set<any>>(new Set());

  // Handle node click for tag navigation
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.id) {
      void router.push(`/tag/${encodeURIComponent(node.id)}`);
    }
  }, [router]);

  // Restore zoom state on view change
  useEffect(() => {
    if (state.isGraphLoaded && graphRef.current) {
      void actions.applyZoomState('tag_view');
    }
  }, [state.currentView, state.isGraphLoaded, actions, graphRef]);

  // Handle node hover
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);

    const newHighlightedNodeIds = new Set<string>();
    const newHighlightedLinks = new Set<any>();

    if (node) {
      newHighlightedNodeIds.add(node.id as string);
      tagGraphData?.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode)?.id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode)?.id;

        if (sourceId === node.id) {
          newHighlightedNodeIds.add(targetId as string);
          newHighlightedLinks.add(link);
        }
        if (targetId === node.id) {
          newHighlightedNodeIds.add(sourceId as string);
          newHighlightedLinks.add(link);
        }
      });
    }

    setHighlightedNodeIds(newHighlightedNodeIds);
    setHighlightedLinks(newHighlightedLinks);
  }, [tagGraphData]);

  const handleCanvasMouseLeave = useCallback(() => {
    handleNodeHover(null);
  }, [handleNodeHover]);

  // Focus on current tag if provided
  useEffect(() => {
    if (currentTag && state.isGraphLoaded && graphRef.current) {
      setTimeout(() => {
        void actions.zoomToNode(currentTag, 1000, 100);
      }, 100);
    }
  }, [currentTag, state.isGraphLoaded, actions, graphRef]);

  // Save zoom state on interaction
  const handleZoom = useCallback(() => {
    void actions.saveZoomState('tag_view');
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

  // Node canvas object for tag visualization with glassmorphism
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

    const isCurrentTag = currentTag === node.id;
    const label = node.name;
    
    // Fixed node size (not affected by zoom)
    const baseSize = GRAPH_CONFIG.visual.TAG_NODE_SIZE;
    const nodeSize = baseSize + (node.count || 0) * 0.5; // Scale by tag count
    
    const W_OUTER = isCurrentTag ? 2 : GRAPH_CONFIG.visual.NODE_OUTER_BORDER_WIDTH;
    const W_INNER = isCurrentTag ? 2 : GRAPH_CONFIG.visual.NODE_INNER_BORDER_WIDTH;

    // --- 1. Draw Outer Border ---
    ctx.strokeStyle = isCurrentTag ? colors.highlight : colors.nodeOuterBorder;
    ctx.lineWidth = W_OUTER;
    const outerPathRadius = (nodeSize / 2) - (W_OUTER / 2);
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, outerPathRadius > 0 ? outerPathRadius : 0, 0, 2 * Math.PI);
    ctx.stroke();

    // --- 2. Draw Inner Border ---
    ctx.strokeStyle = isCurrentTag ? colors.highlight : colors.nodeInnerBorder;
    ctx.lineWidth = W_INNER;
    const innerPathRadius = (nodeSize / 2) - W_OUTER - (W_INNER / 2);
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, innerPathRadius > 0 ? innerPathRadius : 0, 0, 2 * Math.PI);
    ctx.stroke();

    // --- 3. Draw Node Background ---
    ctx.fillStyle = isCurrentTag ? colors.highlight : colors.node;
    const fillRadius = (nodeSize / 2) - W_OUTER - W_INNER;
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, fillRadius > 0 ? fillRadius : 0, 0, 2 * Math.PI);
    ctx.fill();

    // Draw label with fixed size (scales with zoom)
    const fontSize = GRAPH_CONFIG.visual.TAG_NAME_FONT_SIZE;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    
    const textYOffset = nodeSize / 2 + 3;
    ctx.fillText(label, node.x!, node.y! + textYOffset);
    
    // Show count
    if (node.count && globalScale >= 1.5) {
      ctx.font = `${fontSize - 1}px sans-serif`;
      ctx.fillText(`(${node.count})`, node.x!, node.y! + textYOffset + 3);
    }
    
    ctx.globalAlpha = 1;
  }, [isDarkMode, currentTag, hoveredNode, highlightedNodeIds]);

  // Link styling with hover effects
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;

    // Handle hover opacity for links
    if (hoveredNode) {
      ctx.globalAlpha = highlightedLinks.has(link) ? 1 : GRAPH_CONFIG.visual.HOVER_OPACITY;
    } else {
      ctx.globalAlpha = 0.6; // Keep default link opacity
    }

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = colors.link;
    // Use screen-space width (1.5px) divided by zoom level to maintain consistent visual size
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }, [isDarkMode, hoveredNode, highlightedLinks]);

  if (!tagGraphData || tagGraphData.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No tags found</div>
          <div className="text-sm text-gray-500">
            {tagGraphData ? 'No tag relationships to display' : 'No tag data available'}
          </div>
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

  // Initialize dimensions from container when no explicit dimensions provided
  useEffect(() => {
    if (!containerRef.current || (width && height)) return;
    
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      setDimensions({ width: clientWidth, height: clientHeight });
    }
  }, [width, height]);

  const containerStyle = (width && height) ? { width, height } : { width: '100%', height: '100%' };
  const graphWidth = width || dimensions.width;
  const graphHeight = height || dimensions.height;

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      {(graphWidth > 0 && graphHeight > 0) && (
        <ForceGraphWrapper
          ref={graphRef}
          graphData={tagGraphData}
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

          linkColor={() => isDarkMode ? GRAPH_COLORS.dark.link : GRAPH_COLORS.light.link}
          nodeRelSize={1} // Use fixed size instead of relative
          d3AlphaDecay={GRAPH_CONFIG.physics.d3AlphaDecay}
          d3VelocityDecay={GRAPH_CONFIG.physics.d3VelocityDecay}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1}
          linkDirectionalParticleSpeed={0.006}
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
