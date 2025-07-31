import React, { useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useGraphContext } from '../GraphProvider';
import { useDarkMode } from '@/lib/use-dark-mode';
import { GRAPH_CONFIG, GRAPH_COLORS } from '../utils/graphConfig';
import type { GraphNode } from '../types/graph.types';

const ForceGraphWrapper = dynamic(() => import('../../ForceGraphWrapper'), {
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
  width = 800,
  height = 600,
  className = '',
  currentTag,
}) => {
  const router = useRouter();
  const { state, actions, data, instance } = useGraphContext();
  const { isDarkMode } = useDarkMode();

  const { tagGraphData } = data;
  const { graphRef, setGraphInstance } = instance;

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

  // Node canvas object for tag visualization
  const nodeCanvasObject = useCallback((
    node: GraphNode,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ) => {
    const colors = isDarkMode ? GRAPH_COLORS.dark : GRAPH_COLORS.light;
    const label = node.name;
    const fontSize = GRAPH_CONFIG.visual.TAG_NAME_FONT_SIZE;
    
    ctx.font = `${fontSize / globalScale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Highlight current tag
    const isCurrentTag = currentTag === node.id;
    const nodeColor = isCurrentTag ? colors.highlight : colors.node;
    
    // Draw node circle with size based on tag count
    const radius = Math.max((node.val || 1) * 2, 1) / globalScale;
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
    ctx.fillStyle = nodeColor;
    ctx.fill();
    
    // Add border for current tag
    if (isCurrentTag) {
      ctx.strokeStyle = colors.highlight;
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }
    
    // Draw label
    if (globalScale >= 1.2) {
      ctx.fillStyle = colors.text;
      ctx.fillText(label, node.x!, node.y! + radius + 5);
      
      // Show count
      if (node.count && globalScale >= 2) {
        ctx.font = `${(fontSize - 1) / globalScale}px sans-serif`;
        ctx.fillText(`(${node.count})`, node.x!, node.y! + radius + 15);
      }
    }
  }, [isDarkMode, currentTag]);

  // Link styling for tag relationships
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
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [isDarkMode]);

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
    <div className={className} style={{ width, height }}>
      <ForceGraphWrapper
        ref={graphRef}
        graphData={tagGraphData}
        nodeCanvasObject={nodeCanvasObject as any}
        linkCanvasObject={linkCanvasObject as any}
        onNodeClick={handleNodeClick as any}
        onZoom={handleZoom}
        onZoomEnd={handleZoom}
        onEngineStop={() => actions.setIsGraphLoaded(true)}
        onReady={setGraphInstance}
        backgroundColor="transparent"
        width={width}
        height={height}
        cooldownTicks={GRAPH_CONFIG.physics.cooldownTicks}
        warmupTicks={GRAPH_CONFIG.physics.warmupTicks}
        linkWidth={GRAPH_CONFIG.visual.LINK_WIDTH}
        linkColor={() => isDarkMode ? GRAPH_COLORS.dark.link : GRAPH_COLORS.light.link}
        nodeRelSize={GRAPH_CONFIG.visual.TAG_NODE_SIZE}
        d3AlphaDecay={GRAPH_CONFIG.physics.d3AlphaDecay}
        d3VelocityDecay={GRAPH_CONFIG.physics.d3VelocityDecay}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1}
        linkDirectionalParticleSpeed={0.006}
        onNodeDragEnd={(node: any) => {
          node.fx = undefined;
          node.fy = undefined;
        }}
      />
    </div>
  );
};
