import React from 'react'
import { DragSource, DropTarget } from 'react-dnd'
import { compose } from 'redux'
import { connect } from 'react-redux'
import classnames from 'classnames'
import nanoid from 'nanoid'

import ActionItem from '../../common/action'
import ConditionItem from '../../common/condition'
import { StandardPortWidget } from './Ports'
import { ActionTypes } from '../../panels/Constants'
import { viewElementProperties } from '~/actions'
import { isAction } from '../../helpers'

import style from './style.scss'

class NodeElement extends React.Component {
  constructor() {
    super()
    this.state = {
      id: nanoid()
    }
  }

  shouldComponentUpdate(nextProps) {
    if (
      this.props.index !== nextProps.index ||
      this.props.isOver !== nextProps.isOver ||
      this.props.selectedItem !== nextProps.selectedItem
    ) {
      return true
    }
    return false
  }

  render() {
    if (this.props.actionType === ActionTypes.Transition) {
      return this.renderTransition()
    } else {
      return this.renderContent()
    }
  }

  handleClick = () => {
    const properties = {
      type: isAction(this.props.item) ? 'action' : 'content',
      id: this.state.id,
      index: this.props.index,
      node: this.props.node,
      item: this.props.item,
      actionType: this.props.actionType
    }

    this.props.viewElementProperties(properties)
  }

  handleClickTransition = () => {
    const properties = {
      type: 'transition',
      id: this.state.id,
      node: this.props.node,
      item: this.props.item
    }

    this.props.viewElementProperties(properties)
  }

  renderContent() {
    const { item, isOver, connectDropTarget, connectDragSource } = this.props

    return connectDragSource(
      connectDropTarget(
        <div
          className={classnames(
            {
              [style.hoverOnEnter]: isOver && this.props.actionType === ActionTypes.OnEnter,
              [style.hoverOnReceive]: isOver && this.props.actionType === ActionTypes.OnReceive,
              [style.selected]: this.props.selectedItem && this.props.selectedItem.id === this.state.id
            },
            style.item
          )}
          onClick={this.handleClick}
          onMouseDown={e => e.stopPropagation()}
        >
          <ActionItem text={item} />
        </div>
      )
    )
  }

  renderTransition() {
    const { index, outputPortName, item, node, isOver, connectDropTarget, connectDragSource } = this.props

    return connectDragSource(
      connectDropTarget(
        <div
          className={classnames(
            {
              [style.hoverTransition]: isOver,
              [style.selected]: this.props.selectedItem && this.props.selectedItem.id === this.state.id
            },
            style.item
          )}
          onClick={this.handleClickTransition}
          onMouseDown={e => e.stopPropagation()}
        >
          <ConditionItem condition={item} position={index} />
          <StandardPortWidget name={outputPortName} node={node} />
        </div>
      )
    )
  }
}

const targetSpec = {
  drop(props, monitor, component) {
    if (!monitor.didDrop()) {
      const selected = monitor.getItem()

      return {
        dropEffect: selected.source === 'diagram' ? 'move' : 'add',
        target: {
          node: props.node,
          actionType: props.actionType,
          index: props.index,
          item: props.item
        },
        source: {
          node: selected.node,
          actionType: selected.actionType,
          index: selected.index,
          item: selected.item || selected
        }
      }
    }
  }
}

function collectTarget(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
    itemType: monitor.getItemType()
  }
}

const sourceSpec = {
  beginDrag(props) {
    return { source: 'diagram', ...props }
  }
}

function collectSource(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

const mapStateToProps = state => ({ selectedItem: state.panels.selectedItem })
const mapDispatchToProps = { viewElementProperties }

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  DragSource(props => props.dragType, sourceSpec, collectSource),
  DropTarget(props => props.dropType, targetSpec, collectTarget)
)(NodeElement)
