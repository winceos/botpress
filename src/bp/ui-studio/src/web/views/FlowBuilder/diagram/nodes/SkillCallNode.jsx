import React, { Component } from 'react'
import classnames from 'classnames'
import _ from 'lodash'
import { NodeModel, NodeFactory } from 'storm-react-diagrams'

import ActionItem from '../../common/action'
import ConditionItem from '../../common/condition'
import { StandardOutgoingPortModel, StandardPortWidget, StandardIncomingPortModel } from './Ports'
import { ToolTypes, ActionTypes } from '../../panels/Constants'
import NodeElement from './NodeElement'
import style from './style.scss'

export class SkillCallNodeWidget extends React.Component {
  static defaultProps = {
    size: 200,
    node: null
  }

  state = {}

  renderTransition(node) {
    const dropTypes = [ToolTypes.Transition]
    return (
      <div className={classnames(style.sectionTransition, style.section)}>
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

  render() {
    const node = this.props.node
    const isWaiting = node.waitOnReceive

    const className = classnames(style['skill-call-node'], style['node-container'])

    return (
      <div className={className}>
        <div className={style.topPort}>
          <StandardPortWidget name="in" node={node} />
        </div>
        <div className={style.header} />
        <div className={style.content}>
          <div className={classnames(style.sectionTitle, style.section, { [style.waiting]: isWaiting })}>
            <div>{node.skill}</div>
            <div className={style['subtitle']}>Skill | {node.name}</div>
          </div>
          <div className={classnames(style.sectionContent, style.section)}>
            {node.onReceive &&
              node.onReceive.map((item, i) => {
                return <ActionItem key={`${i}.${item}`} className={style.item} text={item} />
              })}
          </div>
          {node.next && this.renderTransition(node)}
        </div>
        <div className={style.footer}>
          <div />
        </div>
      </div>
    )
  }
}

export class SkillCallNodeModel extends NodeModel {
  constructor({ id, x, y, name, skill, next = [], isStartNode = false }) {
    super('skill-call', id)

    this.setData({ name, next, isStartNode, skill })

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
      next: this.next,
      skill: this.skill
    })
  }

  deSerialize(data) {
    super.deSerialize(data)

    this.setData({ name: data.name, skill: data.skill, next: data.next })
  }

  getOutPorts() {
    return _.filter(_.values(this.ports), p => p.name.startsWith('out'))
  }

  setData({ name, next = [], isStartNode, skill }) {
    this.isStartNode = isStartNode
    const inNodeType = isStartNode ? 'start' : 'normal'

    if (!this.ports['in']) {
      this.addPort(new StandardIncomingPortModel('in', inNodeType))
    }

    // We create as many output port as needed
    for (let i = 0; i < next.length; i++) {
      if (!this.ports['out' + i]) {
        this.addPort(new StandardOutgoingPortModel('out' + i))
      }
    }

    if (!_.isArray(next) && _.isObjectLike(next)) {
      next = [next]
    }

    this.skill = skill
    this.next = next
    this.name = name
  }
}

export const SkillCallNodeWidgetFactory = React.createFactory(SkillCallNodeWidget)

export class SkillCallWidgetFactory extends NodeFactory {
  constructor() {
    super('skill-call')
  }

  generateReactWidget(diagramEngine, node) {
    return SkillCallNodeWidgetFactory({ node })
  }
}
