import React from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { fetchContentItem, fetchContentCategories, updateFlowNode, switchFlowNode } from '~/actions'
import { getCurrentFlow, getCurrentFlowNode } from '~/reducers'
import { ToolTypes } from './Constants'
import ActionProps from './props/ActionProps'
import NodeProps from './props/NodeProps'
import ContentProps from './props/ContentProps'
import TransitionProps from './props/TransitionProps'

class Properties extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidUpdate(prevProps) {
    if (this.props.selectedItem !== prevProps.selectedItem && !this.props.contentTypes) {
      this.props.fetchContentCategories()
    }
  }

  render() {
    if (!this.props.selectedItem) {
      return null
    }

    const { type, node } = this.props.selectedItem

    if (type === ToolTypes.Content) {
      return (
        <ContentProps
          data={this.props.selectedItem}
          node={node}
          contentTypes={this.props.contentTypes}
          contentElements={this.props.contentElements}
          updateFlowNode={this.props.updateFlowNode}
          currentFlow={this.props.currentFlow}
          currentFlowNode={this.props.currentFlowNode}
        />
      )
    } else if (type === ToolTypes.Action) {
      return (
        <ActionProps
          data={this.props.selectedItem}
          node={node}
          updateFlowNode={this.props.updateFlowNode}
          currentFlow={this.props.currentFlow}
          currentFlowNode={this.props.currentFlowNode}
          switchFlowNode={this.props.switchFlowNode}
        />
      )
    } else if (type === ToolTypes.Transition) {
      return <TransitionProps node={node} data={this.props.selectedItem} />
    } else if (type === ToolTypes.Node) {
      return <NodeProps node={node} />
    }
  }
}

const mapStateToProps = state => ({
  contentElements: state.content.itemsById,
  selectedItem: state.panels.selectedItem,
  contentTypes: state.content.categories,
  currentFlow: getCurrentFlow(state),
  currentFlowNode: getCurrentFlowNode(state)
})
const mapDispatchToProps = { fetchContentItem, fetchContentCategories, updateFlowNode, switchFlowNode }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Properties)
