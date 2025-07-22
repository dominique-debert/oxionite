import type { ExtendedRecordMap } from 'notion-types'
import React from 'react'
import { NotionRenderer } from 'react-notion-x'

interface NotionCommentsProps {
  recordMap: ExtendedRecordMap
}

export function NotionComments({ recordMap }: NotionCommentsProps) {
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
