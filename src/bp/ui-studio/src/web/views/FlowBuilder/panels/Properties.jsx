import React from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { Button, Tooltip, OverlayTrigger } from 'react-bootstrap'
import classnames from 'classnames'
import { ToolTypes } from './Constants'
import ActionProps from './props/ActionProps'
import NodeProps from './props/NodeProps'
import ContentProps from './props/ContentProps'
import TransitionProps from './props/TransitionProps'
import { editFlowNodeAction, viewElementProperties, removeFlowNode } from '~/actions'
import style from './Properties.styl'

class Properties extends React.Component {
  handleDelete = () => {
    const { node, actionType, index, dragType } = this.props.selectedItem

    if (dragType === ToolTypes.Node) {
      this.props.removeFlowNode(node.id)
    } else {
      this.props.editFlowNodeAction({
        nodeId: node.id,
        actionType,
        remove: { index }
      })
    }

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

  renderHeader() {
    return (
      <div className={style.header}>
        <div className={style.parentNode}>
          Parent Node: <span>{this.props.selectedItem.node.name}</span>
        </div>

        <div className={style.buttons}>
          <Button className={style.btn} bsStyle="default" onClick={this.handleDelete}>
            <OverlayTrigger placement="bottom" overlay={this.createTooltip('delete', 'Delete')}>
              <i className="material-icons">delete</i>
            </OverlayTrigger>
          </Button>
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.selectedItem) {
      return null
    }

    return (
      <div className={classnames(style.panel, style.padded)}>
        {this.props.selectedItem.dragType !== ToolTypes.Node && this.renderHeader()}
        {this.renderAdvanced()}
      </div>
    )
  }

  createTooltip = (name, text) => <Tooltip id={name}>{text}</Tooltip>
}

const mapStateToProps = state => ({ selectedItem: state.panels.selectedItem })
const mapDispatchToProps = { viewElementProperties, editFlowNodeAction, removeFlowNode }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Properties)
