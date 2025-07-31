import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useGraphContext } from '../GraphProvider';
import { useDarkMode } from '@/lib/use-dark-mode';
import { GRAPH_CONFIG, GRAPH_COLORS } from '../utils/graphConfig';
import type { GraphNode } from '../types/graph.types';

const ForceGraphWrapper = dynamic(() => import('../../ForceGraphWrapper'), {
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

  // Save zoom state on interaction
  const handleZoom = useCallback(() => {
    void actions.saveZoomState('post_view');
  }, [actions]);

  // Node canvas object for custom rendering
  const nodeCanvasObject = useCallback((
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;
    const label = node.name;
    const fontSize = node.type === 'Root' 
      ? GRAPH_CONFIG.visual.HOME_NAME_FONT_SIZE 
      : GRAPH_CONFIG.visual.POST_FONT_SIZE;
    
    ctx.font = `${fontSize / globalScale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, Math.max(node.val || 1, 1) / globalScale, 0, 2 * Math.PI);
    ctx.fillStyle = colors.node;
    ctx.fill();
    
    // Draw label
    if (globalScale >= 1.5) {
      ctx.fillText(label, node.x!, node.y! + (node.val || 1) / globalScale + 5);
    }
  }, [isDarkMode]);

  // Link styling
  const linkCanvasObject = useCallback((
    link: any,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;
    
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = colors.link;
    ctx.lineWidth = GRAPH_CONFIG.visual.LINK_WIDTH / globalScale;
    ctx.stroke();
  }, [isDarkMode]);

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
          onReady={setGraphInstance}
          backgroundColor="transparent"
          width={graphWidth}
          height={graphHeight}
          cooldownTicks={GRAPH_CONFIG.physics.cooldownTicks}
          warmupTicks={GRAPH_CONFIG.physics.warmupTicks}
          linkWidth={GRAPH_CONFIG.visual.LINK_WIDTH}
          linkColor={() => isDarkMode ? GRAPH_COLORS.dark.link : GRAPH_COLORS.light.link}
          nodeRelSize={GRAPH_CONFIG.visual.POST_NODE_SIZE}
          d3AlphaDecay={GRAPH_CONFIG.physics.d3AlphaDecay}
          d3VelocityDecay={GRAPH_CONFIG.physics.d3VelocityDecay}
          onNodeDragEnd={(node: any) => {
            node.fx = undefined;
            node.fy = undefined;
          }}
        />
      )}
    </div>
  );
};
