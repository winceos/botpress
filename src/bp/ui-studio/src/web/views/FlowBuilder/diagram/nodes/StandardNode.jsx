import React, { Component } from 'react'
import classnames from 'classnames'
import _ from 'lodash'
import { NodeModel, NodeFactory } from 'storm-react-diagrams'
import { ToolTypes, ActionTypes } from '../../panels/Constants'
import { StandardOutgoingPortModel, StandardPortWidget, StandardIncomingPortModel } from './Ports'
import { isAction } from '~/util'
import NodeElement from './NodeElement'
import NodeTitle from './NodeTitle'

import style from './StandardNode.styl'

export class StandardNodeWidget extends Component {
  static defaultProps = {
    size: 200,
    node: null
  }

  renderContent(node, actionType) {
    const dropTypes = [ToolTypes.Content, ToolTypes.Action]
    return (
      <div>
        {node[actionType].map((item, i) => {
          return (
            <NodeElement
              key={`${i}.${item}`}
              index={i}
              dropType={dropTypes}
              dragType={isAction(item) ? ToolTypes.Action : ToolTypes.Content}
              actionType={actionType}
              item={item}
              node={node}
            />
          )
        })}
      </div>
    )
  }

  renderTransition(node) {
    const dropTypes = [ToolTypes.Transition]
    return (
      <div>
        {node.next.map((item, i) => {
          return (
            <NodeElement
              key={`${i}.${item}`}
              dropType={dropTypes}
              dragType={ToolTypes.Transition}
              actionType={ActionTypes.Transition}
              index={i}
              item={item}
              node={node}
              outputPortName={`out${i}`}
            />
          )
        })}
      </div>
    )
  }

  renderTitle(node) {
    const dropTypes = [ToolTypes.Content, ToolTypes.Action, ToolTypes.Transition]
    return <NodeTitle dropType={dropTypes} isWaiting={node.waitOnReceive} title={node.name} node={node} parent={this} />
  }

  render() {
    const node = this.props.node
    return (
      <div className={style.nodeContainer}>
        <div className={style.topPort}>
          <StandardPortWidget name="in" node={node} />
        </div>
        <div className={style.header} />
        <div className={style.content}>
          {node.onEnter && this.renderContent(node, ActionTypes.OnEnter)}
          {this.renderTitle(node)}
          {node.onReceive && this.renderContent(node, ActionTypes.OnReceive)}
          {node.next && this.renderTransition(node)}
        </div>
        <div className={style.footer}>
          <div />
        </div>
      </div>
    )
  }
}

export class StandardNodeModel extends NodeModel {
  constructor({ id, x, y, name, onEnter = [], onReceive = [], next = [], isStartNode = false }) {
    super('standard', id)

    this.setData({ name, onEnter, onReceive, next, isStartNode })

    if (x) {
      this.x = x
    }
    if (y) {
      this.y = y
    }
  }

  serialize() {
    return _.merge(super.serialize(), {
      name: this.name,
      onEnter: this.onEnter,
      onReceive: this.onReceive,
      next: this.next
    })
  }

  deSerialize(data) {
    super.deSerialize(data)

    this.setData({ name: data.name, onEnter: data.onEnter, onReceive: data.onReceive, next: data.next })
  }

  getOutPorts() {
    return _.filter(_.values(this.ports), p => p.name.startsWith('out'))
  }

  setData({ name, onEnter = [], onReceive = [], next = [], isStartNode }) {
    this.isStartNode = isStartNode
    const inNodeType = isStartNode ? 'start' : 'normal'
    const waitOnReceive = !_.isNil(onReceive)

    if (!this.ports['in']) {
      this.addPort(new StandardIncomingPortModel('in', inNodeType))
    }

    // We create as many output port as needed
    for (let i = 0; i < next.length; i++) {
      if (!this.ports['out' + i]) {
        this.addPort(new StandardOutgoingPortModel('out' + i))
      }
    }

    if (_.isString(onEnter)) {
      onEnter = [onEnter]
    }

    if (_.isString(onReceive)) {
      onReceive = [onReceive]
    } else if (_.isNil(onReceive)) {
      onReceive = []
    }

    onReceive = onReceive.map(x => x.function || x)

    if (!_.isArray(next) && _.isObjectLike(next)) {
      next = [next]
    }

    this.onEnter = onEnter
    this.onReceive = onReceive
    this.waitOnReceive = waitOnReceive
    this.next = next
    this.name = name
  }
}

export const StandardNodeWidgetFactory = React.createFactory(StandardNodeWidget)

export class StandardWidgetFactory extends NodeFactory {
  constructor() {
    super('standard')
  }

  generateReactWidget(diagramEngine, node) {
    return StandardNodeWidgetFactory({ node })
  }
}
