import { DropTarget } from 'react-dnd'
import React from 'react'
import classnames from 'classnames'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { ToolTypes, ActionTypes } from '../../panels/Constants'
import { viewElementProperties } from '~/actions'
import style from './style.scss'

class NodeTitle extends React.Component {
  constructor() {
    super()
    this.state = {}
  }

  updateHoverStatus({ isOverFirstHalf, itemType }) {
    const enterOrReceive = isOverFirstHalf ? ActionTypes.OnEnter : ActionTypes.OnReceive
    const actionType = itemType === ToolTypes.Transition ? ActionTypes.Transition : enterOrReceive
    this.setState({ isOverFirstHalf, itemType, actionType })
  }

  handleClick = e => {
    this.props.viewElementProperties({
      type: ToolTypes.Node,
      node: this.props.node
    })
  }

  render() {
    const { title, isWaiting, isOver, connectDropTarget } = this.props

    return connectDropTarget(
      <div
        ref={e => {
          this.domNode = e
        }}
        className={classnames(
          {
            [style.hoverOnEnter]: isOver && this.state.actionType === ActionTypes.OnEnter,
            [style.hoverOnReceive]: isOver && this.state.actionType === ActionTypes.OnReceive,
            [style.hoverTransition]: isOver && this.state.actionType === ActionTypes.Transition,
            [style.waiting]: isWaiting
          },
          style['section-title']
        )}
        onClick={this.handleClick}
      >
        {title}
      </div>
    )
  }
}

const targetSpec = {
  hover(props, monitor, component) {
    if (!component.domNode || !component.updateHoverStatus) {
      return
    }

    const domElementRect = component.domNode.getBoundingClientRect()
    const clientOffset = monitor.getClientOffset()
    const mouseYposOnDomElement = clientOffset.y - domElementRect.top

    component.updateHoverStatus({
      isOverFirstHalf: mouseYposOnDomElement < domElementRect.height / 2,
      itemType: monitor.getItemType()
    })
  },

  drop(props, monitor, component) {
    if (!monitor.didDrop()) {
      const selected = monitor.getItem()

      return {
        dropEffect: selected.source === 'diagram' ? 'move' : 'add',
        target: {
          node: props.node,
          actionType: component.state.actionType,
          index: -1,
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

function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    itemType: monitor.getItemType()
  }
}

const mapStateToProps = state => ({ selectedItem: state.panels.selectedItem })
const mapDispatchToProps = { viewElementProperties }

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  DropTarget(props => props.dropType, targetSpec, collect)
)(NodeTitle)
