import React from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { Button } from 'react-bootstrap'
import classnames from 'classnames'
import { ToolTypes } from './Constants'
import ActionProps from './props/ActionProps'
import NodeProps from './props/NodeProps'
import ContentProps from './props/ContentProps'
import TransitionProps from './props/TransitionProps'
import { editFlowNodeAction, viewElementProperties } from '~/actions'
import style from './style.scss'

class Properties extends React.Component {
  handleDelete = () => {
    const { node, actionType, index } = this.props.selectedItem

    this.props.editFlowNodeAction({
      nodeId: node.id,
      actionType,
      remove: { index }
    })

    this.props.viewElementProperties(undefined)
  }

  renderAdvanced() {
    const { dragType, node } = this.props.selectedItem

    if (dragType === ToolTypes.Content) {
      return <ContentProps data={this.props.selectedItem} node={node} />
    } else if (dragType === ToolTypes.Action) {
      return <ActionProps data={this.props.selectedItem} node={node} />
    } else if (dragType === ToolTypes.Transition) {
      return <TransitionProps data={this.props.selectedItem} node={node} />
    } else if (dragType === ToolTypes.Node) {
      return <NodeProps node={node} />
    }
  }

  render() {
    if (!this.props.selectedItem) {
      return null
    }

    return (
      <div className={classnames(style.panel, style.padded)}>
        <div className={style.formField}>
          <label htmlFor="title">Parent Node</label>
          <span>{this.props.selectedItem.node.name}</span>
        </div>

        <Button bsSize="xs" onClick={this.handleDelete}>
          Delete element
        </Button>
        <hr />
        {this.renderAdvanced()}
      </div>
    )
  }
}

const mapStateToProps = state => ({ selectedItem: state.panels.selectedItem })
const mapDispatchToProps = { viewElementProperties, editFlowNodeAction }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Properties)
