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
import Properties from './panels/Properties'
import style from './style.scss'

import { withDragDropContext } from './panels/WithDragDropContext'

class MainPage extends Component {
  gLayout

  componentDidMount() {
    setTimeout(() => {
      this.setupLayout()
    }, 0)

    window.addEventListener('resize', this.resizeLayout)
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeLayout)
    this.gLayout.destroy()
  }

  resizeLayout = () => this.gLayout.updateSize()

  setupLayout() {
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
              width: 175,
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
                  component: 'properties',
                  height: 500
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
    layout.registerComponent('properties', this.connectStoreRouter(Properties))
    layout.registerComponent('diagram', this.connectStoreRouter(withDragDropContext(FlowContainer)))
    layout.init()

    this.gLayout = layout
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

export default withRouter(MainPage)
