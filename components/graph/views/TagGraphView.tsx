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

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.id) {
      void router.push(`/tag/${encodeURIComponent(node.id)}`);
    }
  }, [router]);

  useEffect(() => {
    if (state.isGraphLoaded && graphRef.current && state.currentView === 'tag_view') {
      if (currentTag) {
        actions.zoomToNode(currentTag, 400);
      } else {
        actions.applyCurrentZoom();
      }
    }
  }, [currentTag, state.currentView, state.isGraphLoaded]);

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

  const handleZoomEnd = useCallback(() => {
    actions.saveCurrentZoom();
  }, [actions]);

  const nodeCanvasObject = useCallback((
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;
    
    const isHighlighted = highlightedNodeIds.has(node.id as string);
    ctx.globalAlpha = !hoveredNode || isHighlighted ? 1 : GRAPH_CONFIG.visual.HOVER_OPACITY;

    const isCurrentTag = currentTag === node.id;
    const label = node.name;
    
    // Use node.val for dynamic sizing, with a base size and scaling factor
    const baseSize = 2;
    const scalingFactor = 0.5;
    const nodeSize = baseSize + (node.val || 1) * scalingFactor;
    
    const W_OUTER = isCurrentTag ? 2 : GRAPH_CONFIG.visual.NODE_OUTER_BORDER_WIDTH;
    const W_INNER = isCurrentTag ? 2 : GRAPH_CONFIG.visual.NODE_INNER_BORDER_WIDTH;

    ctx.strokeStyle = isCurrentTag ? colors.highlight : colors.nodeOuterBorder;
    ctx.lineWidth = W_OUTER;
    const outerPathRadius = (nodeSize / 2) - (W_OUTER / 2);
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, outerPathRadius > 0 ? outerPathRadius : 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = isCurrentTag ? colors.highlight : colors.nodeInnerBorder;
    ctx.lineWidth = W_INNER;
    const innerPathRadius = (nodeSize / 2) - W_OUTER - (W_INNER / 2);
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, innerPathRadius > 0 ? innerPathRadius : 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = isCurrentTag ? colors.highlight : colors.node;
    const fillRadius = (nodeSize / 2) - W_OUTER - W_INNER;
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, fillRadius > 0 ? fillRadius : 0, 0, 2 * Math.PI);
    ctx.fill();

    const fontSize = GRAPH_CONFIG.visual.TAG_NAME_FONT_SIZE;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    
    const textYOffset = nodeSize / 2 + 3;
    ctx.fillText(label, node.x!, node.y! + textYOffset);
    
    if (node.count && globalScale >= 1.5) {
      ctx.font = `${fontSize - 1}px sans-serif`;
      ctx.fillText(`(${node.count})`, node.x!, node.y! + textYOffset + 3);
    }
    
    ctx.globalAlpha = 1;
  }, [isDarkMode, currentTag, hoveredNode, highlightedNodeIds]);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;

    ctx.globalAlpha = !hoveredNode || highlightedLinks.has(link) ? 0.6 : GRAPH_CONFIG.visual.HOVER_OPACITY;

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = colors.link;
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }, [isDarkMode, hoveredNode, highlightedLinks]);

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

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      {(graphWidth > 0 && graphHeight > 0) && (
        <ForceGraphWrapper
          ref={graphRef}
          graphData={tagGraphData}
          nodeCanvasObject={nodeCanvasObject as any}
          linkCanvasObject={linkCanvasObject as any}
          onNodeClick={handleNodeClick as any}
          onZoomEnd={handleZoomEnd}
          onEngineStop={() => {
            actions.setIsGraphLoaded(true);
            actions.applyCurrentZoom();
          }}
          onReady={(instance) => {
            setGraphInstance(instance);
            const physics = GRAPH_CONFIG.physics.tag;
            instance.d3Force('link')
              .distance(physics.linkDistance)
              .strength(physics.linkStrength);
            instance.d3Force('charge').strength(-physics.nodeRepulsion);
          }}
          backgroundColor="transparent"
          width={graphWidth}
          height={graphHeight}
          cooldownTicks={GRAPH_CONFIG.physics.tag.cooldownTicks}
          warmupTicks={GRAPH_CONFIG.physics.tag.warmupTicks}
          d3AlphaDecay={GRAPH_CONFIG.physics.tag.d3AlphaDecay}
          d3VelocityDecay={GRAPH_CONFIG.physics.tag.d3VelocityDecay}
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
