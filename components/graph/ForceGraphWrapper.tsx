import React, { useRef, useImperativeHandle, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// 필요한 메서드만 노출하는 인터페이스 정의
export interface GraphMethods {
  zoomToFit: (ms?: number, padding?: number, nodeFilter?: (node: any) => boolean) => void;
  width: () => number;
  height: () => number;
}

type ForceGraphProps = React.ComponentProps<typeof ForceGraph2D> & {
  onReady?: (instance: any) => void;
};

const ForceGraphWrapper = React.forwardRef<GraphMethods, ForceGraphProps>(
  ({ onReady, ...restProps }, ref) => {
    const internalRef = useRef<any>(null);
    
    // ref가 설정될 때 필요한 메서드만 노출
    useImperativeHandle(ref, () => ({
      zoomToFit: (ms?: number, padding?: number, nodeFilter?: (node: any) => boolean) => {
        console.log('[ForceGraphWrapper] zoomToFit called:', {
          internalRef: internalRef.current,
          canvasWidth: internalRef.current?.width?.(),
          canvasHeight: internalRef.current?.height?.(),
          ms,
          padding,
          nodeFilter
        });
        if (internalRef.current && typeof internalRef.current.zoomToFit === 'function') {
          internalRef.current.zoomToFit(ms, padding, nodeFilter);
        } else {
          console.error('[ForceGraphWrapper] zoomToFit failed: internalRef not available', { internalRef });
        }
      },
      width: () => {
        return internalRef.current?.width?.() || 0;
      },
      height: () => {
        return internalRef.current?.height?.() || 0;
      }
    }), []);
    
    useEffect(() => {
      if (internalRef.current && onReady) {
        console.log('[ForceGraphWrapper] Graph ready, calling onReady');
        onReady(internalRef.current);
      }
    }, [onReady]);

    return <ForceGraph2D 
      {...restProps} 
      ref={internalRef} 
    />;
  }
);

ForceGraphWrapper.displayName = 'ForceGraphWrapper';

export default ForceGraphWrapper;
