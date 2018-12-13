import React from 'react'
import { DragSource } from 'react-dnd'
import style from './style.scss'

const source = {
  beginDrag(props) {
    return { source: 'panel', ...props }
  }
}

function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

const DragNode = ({ connectDragSource, isDragging }) => {
  return connectDragSource(
    <div
      className={style.dragZone}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move'
      }}
    >
      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 12.97v-1.929h5.016V6h1.968v5.041H18v1.93h-5.016V18h-1.968v-5.03z" fillRule="evenodd" />
      </svg>
    </div>
  )
}

export default DragSource(props => props.type, source, collect)(DragNode)
