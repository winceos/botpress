import React from 'react'
import { connect } from 'react-redux'
import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap'
import axios from 'axios'
import _ from 'lodash'
import Markdown from 'react-markdown'
import { editFlowNodeAction } from '~/actions'
import SelectActionDropdown from './components/SelectActionDropdown'
import ParametersTable from './components/ParametersTable'
import style from '../style.scss'

const extractActionDetails = text => {
  const action = text.trim()

  if (action.indexOf(' ') >= 0) {
    const tokens = action.split(' ')
    return {
      name: _.head(tokens),
      params: JSON.parse(_.tail(tokens).join(' '))
    }
  }
}

class ActionProps extends React.Component {
  state = {
    actionsList: [],
    actionMetadata: {},
    selectedItem: '',
    parameters: {},
    isParamsDirty: false
  }

  componentDidMount() {
    this.fetchAvailableFunctions()
    this.updateView()
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      this.updateView()
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (
      this.state.parameters !== nextState.parameters ||
      this.state.selectedItem !== nextState.selectedItem ||
      this.state.actionsList !== nextState.actionsList
    ) {
      return true
    }
    return false
  }

  updateView() {
    if (!this.props.data.item) {
      return
    }
    const action = extractActionDetails(this.props.data.item)

    this.setState({
      selectedItem: { value: action.name, label: action.name },
      parameters: action.params
    })
  }

  fetchAvailableFunctions() {
    return axios.get(`${window.BOT_API_PATH}/actions`).then(({ data }) => {
      this.setState({ actionsList: data.filter(action => !action.metadata.hidden) })
    })
  }

  handleActionChanged = option => {
    const fn = this.state.actionsList.find(fn => fn.name === option.value)
    const paramsDefinition = _.get(fn, 'metadata.params') || []

    this.setState({
      selectedItem: option,
      paramsDef: paramsDefinition,
      actionMetadata: fn.metadata || {}
    })

    if (this.state.isParamsDirty && !confirm('Do you want to overwrite existing parameters?')) {
      return
    }

    this.setState({
      parameters: _.fromPairs(paramsDefinition.map(param => [param.name, param.default || ''])),
      isParamsDirty: false
    })
  }

  handleParamsChanged = params => {
    params = _.values(params).reduce((sum, n) => {
      if (n.key === '') {
        return sum
      }
      return { ...sum, [n.key]: n.value }
    }, {})

    this.setState({ parameters: params, isParamsDirty: true })
  }

  renderPicker() {
    const tooltip = (
      <Tooltip id="notSeeingAction">
        Actions are registered on the server-side. Read about how to register new actions by searching for
        `bp.registerActions()`.
      </Tooltip>
    )

    const tooltip2 = (
      <Tooltip id="whatIsThis">
        You can change how the Action is executed by providing it parameters. Some parameters are required, some are
        optional.
      </Tooltip>
    )

    const help = (
      <OverlayTrigger placement="bottom" overlay={tooltip}>
        <span className={style.tip}>Can&apos;t see your action?</span>
      </OverlayTrigger>
    )

    const paramsHelp = (
      <OverlayTrigger placement="bottom" overlay={tooltip2}>
        <span className={style.tip}>What is this?</span>
      </OverlayTrigger>
    )

    return (
      <div>
        <h5>Action to run {help}</h5>
        <div className={style.section}>
          <SelectActionDropdown
            value={this.state.selectedItem}
            options={this.state.actionsList}
            onChange={this.handleActionChanged}
          />
          {this.state.actionMetadata.title && <h4>{this.state.actionMetadata.title}</h4>}
          {this.state.actionMetadata.description && <Markdown source={this.state.actionMetadata.description} />}
        </div>
        <hr />
        <h5>Action parameters {paramsHelp}</h5>
        <div className={style.section}>
          <ParametersTable
            ref={el => (this.parametersTable = el)}
            onChange={this.handleParamsChanged}
            value={this.state.parameters}
            definitions={this.state.paramsDef}
          />
        </div>
      </div>
    )
  }

  handleSubmit = async () => {
    const { selectedItem, parameters } = this.state
    const { node, actionType, index } = this.props.data

    this.props.editFlowNodeAction({
      nodeId: node.id,
      actionType,
      replace: { index },
      item: `${selectedItem.value} ${JSON.stringify(parameters || {})}`
    })
  }

  render() {
    return (
      <div>
        {this.renderPicker()}
        <Button onClick={this.handleSubmit}>Save </Button>
      </div>
    )
  }
}

const mapStateToProps = state => ({})
const mapDispatchToProps = { editFlowNodeAction }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ActionProps)
