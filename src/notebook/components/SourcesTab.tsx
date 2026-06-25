import { pdfSources } from '../mockData'
import DropZone from './DropZone'
import SourceItem from './SourceItem'

export default function SourcesTab() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <DropZone />
      <div className="flex flex-col gap-2">
        {pdfSources.map((source) => (
          <SourceItem key={source.id} source={source} />
        ))}
      </div>
    </div>
  )
}
