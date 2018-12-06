import React, { Component } from 'react'

import { connect, Provider } from 'react-redux'
import { withRouter, Router } from 'react-router-dom'
import _ from 'lodash'
import PropTypes from 'prop-types'
import GoldenLayout from 'golden-layout'
import 'golden-layout/src/css/goldenlayout-base.css'
import 'golden-layout/src/css/goldenlayout-dark-theme.css'
import ToolsPanel from './panels/ToolsPanel'
import FlowPanel from './panels/FlowPanel'
import ChatWindow from './panels/ChatWindow'
import FlowContainer from './FlowContainer'
import ContentEditorPanel from './panels/ContentEditorPanel'
import style from './style.scss'

import { withDragDropContext } from './panels/WithDragDropContext'

class MainPage extends Component {
  componentDidMount() {
    this.setupWindows()
  }

  setupWindows() {
    const config = {
      settings: {
        showPopoutIcon: false,
        showCloseIcon: false
      },
      content: [
        {
          type: 'row',
          content: [
            {
              type: 'stack',
              width: 170,
              content: [
                {
                  title: 'Tools',
                  type: 'react-component',
                  component: 'tools',
                  isClosable: false
                },
                {
                  title: 'Flows',
                  type: 'react-component',
                  component: 'flows',
                  isClosable: false
                }
              ]
            },
            {
              title: 'Flow Builder',
              type: 'react-component',
              component: 'diagram',
              props: this.props,
              isClosable: false,
              width: 700,
              componentState: { test: 'B' }
            },
            {
              type: 'column',
              width: 217,
              content: [
                {
                  title: 'Properties',
                  type: 'react-component',
                  component: 'contentEditor'
                },
                {
                  title: 'Chat Window',
                  type: 'react-component',
                  component: 'chatWindow',
                  componentState: { label: 'B' }
                }
              ]
            }
          ]
        }
      ]
    }

    const layout = new GoldenLayout(config, document.getElementById('container'))
    layout.registerComponent('chatWindow', this.connectStoreRouter(ChatWindow))
    layout.registerComponent('tools', this.connectStoreRouter(withDragDropContext(ToolsPanel)))
    layout.registerComponent('flows', withDragDropContext(FlowPanel))
    layout.registerComponent('contentEditor', this.connectStoreRouter(ContentEditorPanel))
    layout.registerComponent('diagram', this.connectStoreRouter(withDragDropContext(FlowContainer)))
    layout.init()
  }

  connectStoreRouter(Component) {
    const { store, router } = this.context
    class Wrapped extends React.Component {
      render() {
        return (
          <Provider store={store}>
            <Router history={router.history}>
              <Component {...this.props} />
            </Router>
          </Provider>
        )
      }
    }
    return Wrapped
  }

  render() {
    return <div id="container" className={style.container} />
  }
}

MainPage.contextTypes = {
  store: PropTypes.object.isRequired,
  router: PropTypes.object
}

const mapStateToProps = state => ({})

export default connect(mapStateToProps)(withRouter(MainPage))
