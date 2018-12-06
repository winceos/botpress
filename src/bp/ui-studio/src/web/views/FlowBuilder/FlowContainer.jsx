import React, { Component } from 'react'
import { connect } from 'react-redux'
import { compose } from 'redux'
import { withRouter } from 'react-router-dom'
import _ from 'lodash'
import { HotKeys } from 'react-hotkeys'

import ContentWrapper from '~/components/Layout/ContentWrapper'
import PageHeader from '~/components/Layout/PageHeader'
import { operationAllowed } from '~/components/Layout/PermissionsChecker'

import Diagram from './containers/Diagram'
import Topbar from './containers/Topbar'
import SkillsBuilder from './containers/SkillsBuilder'
import NodeProps from './containers/NodeProps'

import { switchFlow, setDiagramAction } from '~/actions'
import { getDirtyFlows } from '~/reducers'
import 'golden-layout/src/css/goldenlayout-base.css'
import 'golden-layout/src/css/goldenlayout-dark-theme.css'

const style = require('./style.scss')

class FlowContainer extends Component {
  state = {
    initialized: false
  }

  init() {
    if (this.state.initialized || !this.props.user || this.props.user.id == null) {
      return
    }
    this.setState({
      initialized: true,
      readOnly: !operationAllowed({ user: this.props.user, op: 'write', res: 'bot.flows' })
    })
  }

  componentDidMount() {
    this.init()
  }

  componentDidUpdate() {
    this.init()
  }

  componentWillReceiveProps(nextProps) {
    const { flow } = nextProps.match.params
    if (flow) {
      const nextFlow = `${flow}.flow.json`
      if (this.props.currentFlow !== nextFlow) {
        this.props.switchFlow(nextFlow)
      }
    } else if (this.props.currentFlow) {
      this.props.history.push(`/flows/${this.props.currentFlow.replace(/\.flow\.json/, '')}`)
    }
  }

  componentWillUnmount() {
    const { pathname } = this.props.history.location
    const hasDirtyFlows = !_.isEmpty(this.props.dirtyFlows)

    const hasUnsavedChanges = !/^\/flows\//g.exec(pathname) && !window.BOTPRESS_FLOW_EDITOR_DISABLED && hasDirtyFlows

    if (hasUnsavedChanges) {
      const isSave = confirm('Save changes?')

      if (isSave) {
        this.diagram.saveAllFlows()
      }
    }
  }

  render() {
    if (!this.state.initialized) {
      return null
    }

    const { readOnly } = this.state

    const keyHandlers = {
      'flow-add-node': () => this.props.setDiagramAction('insert_node'),
      'flow-save': () => this.diagram.saveAllFlows()
    }

    return (
      <HotKeys handlers={keyHandlers} focused>
        <ContentWrapper stretch={true} className={style.wrapper}>
          <PageHeader className={style.header} width="100%">
            <Topbar readOnly={readOnly} />
          </PageHeader>

          <div className={style.workspace}>
            <div className={style.diagram}>
              <Diagram
                readOnly={false}
                ref={el => {
                  if (!!el) {
                    this.diagram = el.getWrappedInstance()
                  }
                }}
                glEventHub={this.props.glEventHub}
              />
            </div>

            <SkillsBuilder />
            <NodeProps readOnly={readOnly} show={this.props.showFlowNodeProps} />
          </div>
        </ContentWrapper>
      </HotKeys>
    )
  }
}

const mapStateToProps = state => ({
  currentFlow: state.flows.currentFlow,
  showFlowNodeProps: state.flows.showFlowNodeProps,
  dirtyFlows: getDirtyFlows(state),
  user: state.user
})

export default compose(
  connect(
    mapStateToProps,
    { switchFlow, setDiagramAction }
  ),
  withRouter
)(FlowContainer)
