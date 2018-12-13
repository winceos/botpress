import React from 'react'
import classnames from 'classnames'
import style from '../style.scss'

export default class NodeProps extends React.Component {
  render() {
    const { name, isStartNode, onEnter, onReceive, next } = this.props.node
    const isWait = false

    return (
      <div className={classnames(style.panel, style.padded)}>
        <div className={style.formField}>
          <label htmlFor="title">Node Name</label>
          <span>{name}</span>
        </div>
        <div className={style.formField}>
          <label htmlFor="title">Is Start Node</label>
          <span>{isStartNode ? 'Yes' : 'No'}</span>
        </div>
        <div className={style.formField}>
          <label htmlFor="title">Wait for user message?</label>
          <span>{isWait ? 'Yes' : 'No'}</span>
        </div>
        <div className={style.formField}>
          <label htmlFor="title">Actions on enter</label>
          <span>{onEnter.length}</span>
        </div>
        <div className={style.formField}>
          <label htmlFor="title">Actions on receive</label>
          <span>{onReceive.length}</span>
        </div>
        <div className={style.formField}>
          <label htmlFor="title">Transitions</label>
          <span>{next.length}</span>
        </div>
        <hr />
        To add a new element on this node, drag a tool from the Toolbox
      </div>
    )
  }
}
