import React from 'react'
import { connect } from 'react-redux'
import { getCurrentFlow } from '~/reducers'
import { editFlowNodeAction } from '~/actions'
import ConditionForm from './components/ConditionForm'

class TransitionProps extends React.Component {
  state = {}

  componentDidMount() {
    this.update()
  }

  componentDidUpdate(prevProps) {
    if (this.props.data !== prevProps.data) {
      this.update()
    }
  }

  update() {
    this.setState({
      subflows: _.filter(_.map(this.props.flows, f => f.name), f => f !== _.get(this.props, 'currentFlow.name')),
      item: this.props.data.item
    })
  }

  handleSubmit = async payload => {
    const { node, actionType, index } = this.props.data

    this.setState({ item: payload })
    this.props.editFlowNodeAction({
      nodeId: node.id,
      actionType,
      replace: { index },
      item: payload
    })
  }

  render() {
    return (
      <div>
        <ConditionForm
          currentFlow={this.props.currentFlow}
          currentNodeName={this.props.node.name}
          subflows={this.state.subflows}
          item={this.state.item}
          onSubmit={this.handleSubmit}
        />
      </div>
    )
  }
}

const mapStateToProps = state => ({
  flows: state.flows.flowsByName,
  currentFlow: getCurrentFlow(state)
})
const mapDispatchToProps = { editFlowNodeAction }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TransitionProps)
