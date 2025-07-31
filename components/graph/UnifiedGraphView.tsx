import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { useGraphContext, GraphProvider } from './GraphProvider';
import { MdFullscreen, MdMyLocation, MdHome, MdOutlineFullscreenExit } from 'react-icons/md';
import { PiGraphBold } from "react-icons/pi";
import { FaTags } from 'react-icons/fa';
import styles from '@/styles/components/GraphView.module.css';
import type { SiteMap } from '@/lib/types';
import { PostGraphView } from './views/PostGraphView';
import { TagGraphView } from './views/TagGraphView';

interface UnifiedGraphViewProps {
  siteMap?: SiteMap;
  viewType?: 'home' | 'sidenav';
  className?: string;
  currentTag?: string;
}

const GraphContent: React.FC<{
  viewType: 'home' | 'sidenav';
  currentTag?: string;
}> = ({ viewType, currentTag }) => {
  const { state, actions } = useGraphContext();

  const getDimensions = () => {
    switch (viewType) {
      case 'sidenav':
        return { width: 300, height: 300 };
      case 'home':
      default:
        return { width: 800, height: 600 };
    }
  };

  const { width, height } = getDimensions();

  const handleViewChange = useCallback((view: 'post_view' | 'tag_view') => {
    actions.setCurrentView(view);
  }, [actions]);

  const handleModalToggle = useCallback(() => {
    actions.setIsModalOpen(!state.isModalOpen);
  }, [actions, state.isModalOpen]);

  const handleFocusCurrent = useCallback(() => {
    if (state.currentView === 'post_view') {
      // Focus home in post view
      actions.zoomToNode('__HOME__');
    } else if (state.currentView === 'tag_view' && currentTag) {
      // Focus current tag in tag view
      actions.zoomToNode(currentTag);
    }
  }, [actions, state.currentView, currentTag]);

  const handleFitToHome = useCallback(() => {
    actions.zoomToFit();
  }, [actions]);

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleModalToggle}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.viewNavContainer}>
          <nav className={styles.viewNav}>
            <button
              className={`${styles.viewNavItem} ${state.currentView === 'post_view' ? styles.active : ''}`}
              onClick={() => handleViewChange('post_view')}
            >
              <PiGraphBold className={styles.viewNavIcon} />
              Post View
            </button>
            <button
              className={`${styles.viewNavItem} ${state.currentView === 'tag_view' ? styles.active : ''}`}
              onClick={() => handleViewChange('tag_view')}
            >
              <FaTags className={styles.viewNavIcon} />
              Tag View
            </button>
          </nav>
        </div>
        
        <div className={styles.modalGraphContainer}>
          <div className={styles.buttonContainer}>
            <button 
              onClick={handleFocusCurrent} 
              className={styles.button}
              aria-label="Focus on current"
            >
              <MdMyLocation size={20} />
            </button>
            <button 
              onClick={handleFitToHome} 
              className={styles.button} 
              aria-label="Fit to home"
            >
              <MdHome size={20} />
            </button>
            <button 
              onClick={handleModalToggle} 
              className={styles.button} 
              aria-label="Close fullscreen"
            >
              <MdOutlineFullscreenExit size={20} />
            </button>
          </div>
          
          {state.currentView === 'post_view' ? (
            <PostGraphView className="w-full h-full" />
          ) : (
            <TagGraphView 
              className="w-full h-full" 
              currentTag={currentTag} 
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.graphContainer}>
      <div className={styles.viewNavContainer}>
        <nav className={styles.viewNav}>
          <button
            className={`${styles.viewNavItem} ${state.currentView === 'post_view' ? styles.active : ''}`}
            onClick={() => handleViewChange('post_view')}
          >
            <PiGraphBold className={styles.viewNavIcon} />
            Post View
          </button>
          <button
            className={`${styles.viewNavItem} ${state.currentView === 'tag_view' ? styles.active : ''}`}
            onClick={() => handleViewChange('tag_view')}
          >
            <FaTags className={styles.viewNavIcon} />
            Tag View
          </button>
        </nav>
      </div>

      <div className="relative">
        <div className={styles.buttonContainer}>
          <button 
            onClick={handleFocusCurrent} 
            className={styles.button}
            aria-label="Focus on current"
          >
            <MdMyLocation size={20} />
          </button>
          <button 
            onClick={handleFitToHome} 
            className={styles.button} 
            aria-label="Fit to home"
          >
            <MdHome size={20} />
          </button>
          <button 
            onClick={handleModalToggle} 
            className={styles.button} 
            aria-label="Open in fullscreen"
          >
            {state.isModalOpen ? <MdOutlineFullscreenExit size={20} /> : <MdFullscreen size={20} />}
          </button>
        </div>

        {state.currentView === 'post_view' ? (
          <PostGraphView width={width} height={height} />
        ) : (
          <TagGraphView width={width} height={height} currentTag={currentTag} />
        )}
      </div>

      {state.isModalOpen && typeof window !== 'undefined' && 
        createPortal(modalContent, document.getElementById('modal-root') || document.body)}
    </div>
  );
};

export const UnifiedGraphView: React.FC<UnifiedGraphViewProps> = ({
  siteMap,
  viewType = 'home',
  className,
  currentTag,
}) => {
  const router = useRouter();
  const locale = router.locale || 'en';
  
  return (
    <GraphProvider siteMap={siteMap} locale={locale}>
      <div className={className}>
        <GraphContent viewType={viewType} currentTag={currentTag} />
      </div>
    </GraphProvider>
  );
};
