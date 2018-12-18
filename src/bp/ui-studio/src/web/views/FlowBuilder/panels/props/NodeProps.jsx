import React from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { updateFlow, editFlowNodeAction, updateFlowNode, refreshFlowsLinks } from '~/actions'
import { getCurrentFlow, getCurrentFlowNode } from '~/reducers'
import style from './NodeProps.styl'

class NodeProps extends React.Component {
  state = {
    nodeName: ''
  }

  componentDidMount() {
    if (this.props.node !== undefined) {
      this.setState({ nodeName: this.props.node.name })
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.node !== prevProps.node) {
      this.setState({ nodeName: this.props.node.name })
    }
  }

  canMakeStartNode = () => {
    const current = this.props.currentFlow && this.props.currentFlow.startNode
    const potential = this.props.currentFlowNode && this.props.currentFlowNode.name
    return current && potential && current !== potential
  }

  setAsStartNode = () => {
    this.props.updateFlow({
      startNode: this.props.currentFlowNode.name
    })
  }

  updateNodeAndRefresh = (...args) => {
    this.props.updateFlowNode(...args)
    this.props.refreshFlowsLinks()
  }

  handleNodeNameChange = e => this.setState({ nodeName: e.target.value })
  handleFinishedEditing = () => this.updateNodeAndRefresh({ name: this.state.nodeName })
  handleUpdateWaiting = e => this.updateNodeAndRefresh({ onReceive: e.target.checked ? [] : undefined })

  renderName() {
    return (
      <div className={style['form-field']}>
        <label htmlFor="title" className={style.form__label}>
          Node Name
        </label>
        <span>
          <input
            className={style.input}
            value={this.state.nodeName}
            onChange={this.handleNodeNameChange}
            onBlur={this.handleFinishedEditing}
          />
        </span>
      </div>
    )
  }

  renderStartNode() {
    return (
      <div className={style['form-field']}>
        <label htmlFor="title" className={style.form__label}>
          Is Start Node?
        </label>
        {this.props.node.isStartNode ? (
          <div>Yes</div>
        ) : (
          <div>
            No
            {this.canMakeStartNode() && (
              <a className={style.action} onClick={this.setAsStartNode}>
                Set as start node
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  renderIsWaiting() {
    const isChecked = _.isArray(this.props.currentFlowNode.onReceive)
    const readOnly = false

    return (
      <div className={style['form-field']}>
        <label htmlFor="title" className={style.form__label}>
          Wait for user message?
        </label>
        <label>
          <input
            name="isGoing"
            type="checkbox"
            checked={isChecked}
            disabled={readOnly}
            onChange={this.handleUpdateWaiting}
          />
          {'  Wait for user message'}
        </label>
      </div>
    )
  }

  render() {
    if (!this.props.currentFlowNode) {
      return null
    }

    return (
      <div>
        {this.renderName()}
        {this.renderStartNode()}
        {this.renderIsWaiting()}
        <hr />
        To add a new element on this node, drag a tool from the Toolbox
      </div>
    )
  }
}

const mapStateToProps = state => ({
  currentFlow: getCurrentFlow(state),
  currentFlowNode: getCurrentFlowNode(state)
})

const mapDispatchToProps = { updateFlow, editFlowNodeAction, updateFlowNode, refreshFlowsLinks }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NodeProps)
