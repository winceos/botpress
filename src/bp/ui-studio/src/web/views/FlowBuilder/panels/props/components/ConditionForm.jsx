import React from 'react'
import Select from 'react-select'
import { Radio, Alert, Button } from 'react-bootstrap'
import classnames from 'classnames'
import _ from 'lodash'

import style from './ConditionForm.styl'

export default class ConditionForm extends React.Component {
  state = {
    typeOfTransition: 'end',
    flowToSubflow: null,
    flowToNode: null,
    transitionError: null,
    conditionError: null,
    returnToNode: '',
    condition: '',
    caption: ''
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      this.update()
    }
  }

  update() {
    const { item } = this.props
    if (item && item.node) {
      let typeOfTransition = item.node.indexOf('.') !== -1 ? 'subflow' : 'node'
      typeOfTransition = item.node === 'END' ? 'end' : typeOfTransition
      typeOfTransition = /^#/.test(item.node) ? 'return' : typeOfTransition
      const node = { label: item.node, value: item.node }

      this.setState({
        typeOfTransition,
        condition: item.condition,
        caption: item.caption || '',
        flowToSubflow: typeOfTransition === 'subflow' ? node : null,
        flowToNode: typeOfTransition === 'node' ? node : null,
        returnToNode: typeOfTransition === 'return' ? item.node.substr(1) : ''
      })
    } else {
      this.resetForm({ condition: (item && item.condition) || '', caption: (item && item.caption) || '' })
    }
  }

  changeTransitionType(type) {
    const subflowOptions = this.getSubflowOptions()
    const nodeOptions = this.getNodeOptions()
    this.setState({
      typeOfTransition: type,
      flowToSubflow: this.state.flowToSubflow || _.get(subflowOptions, '[0].value'),
      flowToNode: this.state.flowToNode || _.get(nodeOptions, '[0].value'),
      transitionError: null
    })
  }

  validation() {
    if (this.state.typeOfTransition === 'subflow' && !this.state.flowToSubflow) {
      this.setState({ transitionError: 'You must select a subflow to transition to' })
      return false
    }

    if (_.isEmpty(this.state.condition)) {
      this.setState({ conditionError: 'Specify a condition' })
      return false
    }

    this.setState({ conditionError: null, transitionError: null })
    return true
  }

  resetForm(props) {
    this.setState({
      typeOfTransition: 'node',
      flowToSubflow: null,
      flowToNode: null,
      returnToNode: '',
      conditionError: null,
      transitionError: null,
      condition: '',
      caption: '',
      ...props
    })
  }

  handleSubmit = () => {
    if (!this.validation()) {
      return
    }
    const payload = { condition: this.state.condition, caption: this.state.caption }

    if (this.state.typeOfTransition === 'subflow') {
      payload.node = _.get(this.state, 'flowToSubflow.value') || _.get(this.state, 'flowToSubflow')
    } else if (this.state.typeOfTransition === 'end') {
      payload.node = 'END'
    } else if (this.state.typeOfTransition === 'node') {
      let earlierNode = this.state.isEdit && _.get(this.props, 'item.node')

      if (
        earlierNode &&
        (/^END$/i.test(earlierNode) || earlierNode.startsWith('#') || /\.flow\.json/i.test(earlierNode))
      ) {
        earlierNode = null
      }

      payload.node = _.get(this.state, 'flowToNode.value') || earlierNode || ''
    } else if (this.state.typeOfTransition === 'return') {
      payload.node = '#' + this.state.returnToNode
    } else {
      payload.node = ''
    }

    this.props.onSubmit(payload)
  }

  getSubflowOptions() {
    return this.props.subflows.filter(flow => !flow.startsWith('skills/')).map(flow => ({
      label: flow,
      value: flow
    }))
  }

  renderSubflowChoice() {
    return (
      <Select
        name="flowToSubflow"
        className={classnames(style.reactselect, style.smallopt)}
        classNamePrefix="rs"
        value={this.state.flowToSubflow}
        options={this.getSubflowOptions()}
        onChange={val => {
          this.setState({ flowToSubflow: val })
        }}
      />
    )
  }

  renderReturnToNode() {
    const updateNode = value => this.setState({ returnToNode: value })

    return (
      <div className={style.returnToNodeSection}>
        <div>Return to node called:</div>
        <input
          type="text"
          className={style.input}
          value={this.state.returnToNode}
          onChange={e => updateNode(e.target.value)}
        />
        <div>
          <input
            type="checkbox"
            id="rPreviousNode"
            checked={_.isEmpty(this.state.returnToNode)}
            onChange={() => updateNode('')}
          />
          <label htmlFor="rPreviousNode">Return to calling node</label>
        </div>
      </div>
    )
  }

  getNodeOptions() {
    const { currentFlow: flow, currentNodeName } = this.props

    const nodes = (flow && flow.nodes) || []
    return nodes.filter(({ name }) => name !== currentNodeName).map(({ name }) => ({ label: name, value: name }))
  }

  renderNodesChoice() {
    if (!this.props.currentFlow) {
      return null
    }

    return (
      <Select
        name="flowToNode"
        className={style.reactselect}
        classNamePrefix="rs"
        value={this.state.flowToNode}
        options={this.getNodeOptions()}
        onChange={flowToNode => this.setState({ flowToNode })}
      />
    )
  }

  handleConditionChanged = event => this.setState({ condition: event.target.value })
  handleCaptionChanged = event => this.setState({ caption: event.target.value })

  render() {
    return (
      <div>
        <h5>Condition:</h5>
        <div className={style.section}>
          {this.state.conditionError && <Alert bsStyle="danger">{this.state.conditionError}</Alert>}
          <Radio defaultChecked={true}>Raw Expression</Radio>
          <input
            className={style.input}
            type="text"
            placeholder="Javascript expression"
            value={this.state.condition}
            onChange={this.handleConditionChanged}
          />
        </div>
        <h5>Caption:</h5>
        <div className={style.section}>
          <input
            className={style.input}
            type="text"
            placeholder="Label for transition"
            value={this.state.caption}
            onChange={this.handleCaptionChanged}
          />
        </div>
        <h5>When condition is met, do:</h5>
        <div className={style.section}>
          <Radio checked={this.state.typeOfTransition === 'end'} onChange={() => this.changeTransitionType('end')}>
            End flow <span className={style.endBloc} />
          </Radio>
          <Radio
            checked={this.state.typeOfTransition === 'return'}
            onChange={() => this.changeTransitionType('return')}
          >
            Return to previous flow <span className={style.returnBloc} />
          </Radio>
          {this.state.typeOfTransition === 'return' && this.renderReturnToNode()}
          <Radio checked={this.state.typeOfTransition === 'node'} onChange={() => this.changeTransitionType('node')}>
            Transition to node <span className={style.nodeBloc} />
          </Radio>
          {this.state.typeOfTransition === 'node' && this.renderNodesChoice()}
          <Radio
            checked={this.state.typeOfTransition === 'subflow'}
            onChange={() => this.changeTransitionType('subflow')}
          >
            Transition to subflow <span className={style.subflowBloc} />
          </Radio>
          {this.state.transitionError && <Alert bsStyle="danger">{this.state.transitionError}</Alert>}
          {this.state.typeOfTransition === 'subflow' && this.renderSubflowChoice()}
        </div>

        <Button onClick={this.handleSubmit}>Save </Button>
      </div>
    )
  }
}
