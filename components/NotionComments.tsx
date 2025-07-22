import React from 'react'
import { NotionRenderer } from 'react-notion-x'
import type { ExtendedRecordMap } from 'notion-types'

export const NotionComments: React.FC<{
  recordMap: ExtendedRecordMap
}> = ({ recordMap }) => {
  if (!recordMap) {
    return null
  }

  return (
    <NotionRenderer
      recordMap={recordMap}
      fullPage={false}
      darkMode={false}
      previewImages={false}
      showCollectionViewDropdown={false}
    />
  )
}
