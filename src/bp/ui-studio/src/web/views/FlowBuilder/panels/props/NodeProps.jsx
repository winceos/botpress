import React from 'react'
import classnames from 'classnames'
import style from './NodeProps.styl'

export default class NodeProps extends React.Component {
  /** const canMakeStartNode = () => {
      const current = this.props.currentFlow && this.props.currentFlow.startNode
      const potential = this.props.currentFlowNode && this.props.currentFlowNode.name
      return current && potential && current !== potential
    }

    const setAsCurrentNode = () => {
      this.props.updateFlow({
        startNode: this.props.currentFlowNode.name
      })
    } */
  render() {
    const { name, isStartNode, onEnter, onReceive, next } = this.props.node
    const isWait = false

    return (
      <div className={classnames(style.panel, style.padded)}>
        <div className={style['form-field']}>
          <label htmlFor="title" className={style.form__label}>
            Node Name
          </label>
          <span>{name}</span>
        </div>
        <div className={style['form-field']}>
          <label htmlFor="title" className={style.form__label}>
            Is Start Node
          </label>
          <span>{isStartNode ? 'Yes' : 'No'}</span>
        </div>
        <div className={style['form-field']}>
          <label htmlFor="title" className={style.form__label}>
            Wait for user message?
          </label>
          <span>{isWait ? 'Yes' : 'No'}</span>
        </div>
        <div className={style['form-field']}>
          <label htmlFor="title" className={style.form__label}>
            Actions on enter
          </label>
          <span>{onEnter.length}</span>
        </div>
        <div className={style['form-field']}>
          <label htmlFor="title" className={style.form__label}>
            Actions on receive
          </label>
          <span>{onReceive.length}</span>
        </div>
        <div className={style['form-field']}>
          <label htmlFor="title" className={style.form__label}>
            Transitions
          </label>
          <span>{next.length}</span>
        </div>
        <hr />
        To add a new element on this node, drag a tool from the Toolbox
      </div>
    )
  }
}
