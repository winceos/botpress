import React from 'react'
import { Label } from 'react-bootstrap'
import classnames from 'classnames'
import { connect } from 'react-redux'
import { getCurrentFlow } from '~/reducers'
import ConditionForm from './components/ConditionForm'

import style from '../style.scss'

class TransitionProps extends React.Component {
  state = {}

  componentDidMount() {
    this.update()
  }
  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      this.update()
    }
  }

  update() {
    this.setState({
      subflows: _.filter(_.map(this.props.flows, f => f.name), f => f !== _.get(this.props, 'currentFlow.name'))
    })
  }

  renderType = node => {
    if (!node || node === '') {
      return <Label bsStyle="danger">Missing Link</Label>
    } else if (node === 'END') {
      return <Label bsStyle="warning">End</Label>
    } else if (node === '#') {
      return <Label bsStyle="warning">Return</Label>
    } else if (node.includes('.flow.json')) {
      return <Label bsStyle="primary">{node}</Label>
    }

    return <Label bsStyle="default">{node}</Label>
  }

  render() {
    // {this.renderType(this.props.item.node)}

    const { node } = this.props

    return (
      <div className={classnames(style.panel, style.padded)}>
        <div className={style.formField}>
          <label htmlFor="title">Parent Node</label>
          <span>{node.name}</span>
        </div>
        <hr />

        <ConditionForm
          currentFlow={this.props.currentFlow}
          currentNodeName={node.name}
          subflows={this.state.subflows}
          item={this.props.item}
        />
      </div>
    )
  }
}

const mapStateToProps = state => ({
  flows: state.flows.flowsByName,
  currentFlow: getCurrentFlow(state)
})
const mapDispatchToProps = {}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TransitionProps)
