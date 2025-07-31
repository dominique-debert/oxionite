import { useRef, useCallback, useEffect } from 'react';


export const useGraphInstance = () => {
  const graphRef = useRef<any>(null);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setGraphInstance = useCallback((instance: any) => {
    graphRef.current = instance;
  }, []);

  const zoomToFit = useCallback((
    duration = 400,
    padding = 50,
    nodeFilter?: (node: any) => boolean
  ) => {
    if (!graphRef.current) return;
    
    try {
      graphRef.current.zoomToFit(duration, padding, nodeFilter);
    } catch (err) {
      console.error('Error zooming to fit:', err);
    }
  }, []);

  const zoomToNode = useCallback((
    nodeId: string,
    duration = 400,
    padding = 50
  ) => {
    if (!graphRef.current) return;
    
    try {
      graphRef.current.zoomToFit(duration, padding, (node: any) => node.id === nodeId);
    } catch (err) {
      console.error('Error zooming to node:', err);
    }
  }, []);

  const getZoomState = useCallback(() => {
    if (!graphRef.current) return null;
    
    try {
      return {
        zoom: graphRef.current.zoom(),
        center: graphRef.current.centerAt(),
      };
    } catch (err) {
      console.error('Error getting zoom state:', err);
      return null;
    }
  }, []);

  const setZoomState = useCallback((zoom: number, center: { x: number; y: number }) => {
    if (!graphRef.current) return;
    
    try {
      graphRef.current.zoom(zoom);
      graphRef.current.centerAt(center.x, center.y);
    } catch (err) {
      console.error('Error applying zoom state:', err);
    }
  }, []);

  const applyZoomState = (_view: string) => {
    // Implementation moved to useGraphState
  };

  const saveZoomState = (_view: string) => {
    // Implementation moved to useGraphState
  };

  const refresh = useCallback(() => {
    if (!graphRef.current) return;
    
    try {
      graphRef.current.refresh();
    } catch (err) {
      console.error('Error refreshing graph:', err);
    }
  }, []);

  const pauseAnimation = useCallback(() => {
    if (!graphRef.current) return;
    
    try {
      graphRef.current.pauseAnimation();
    } catch (err) {
      console.warn('Failed to pause animation:', err);
    }
  }, []);

  const resumeAnimation = useCallback(() => {
    if (!graphRef.current) return;
    
    try {
      graphRef.current.resumeAnimation();
    } catch (err) {
      console.warn('Failed to resume animation:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const timeoutRef = zoomTimeoutRef.current;
    return () => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
    };
  }, []);

  return {
    instance: {
      graphRef,
      setGraphInstance,
    },
    actions: {
      zoomToFit,
      zoomToNode,
      getZoomState,
      setZoomState,
      applyZoomState,
      saveZoomState,
      refresh,
      pauseAnimation,
      resumeAnimation,
    },
  };
};
