import React, { Component } from 'react'

import { Provider } from 'react-redux'
import { withRouter, Router } from 'react-router-dom'
import _ from 'lodash'
import PropTypes from 'prop-types'
import GoldenLayout from 'golden-layout'
import 'golden-layout/src/css/goldenlayout-base.css'
import 'golden-layout/src/css/goldenlayout-dark-theme.css'
import ToolsPanel from './panels/ToolsPanel'
import FlowPanel from './panels/FlowPanel'
import FlowContainer from './FlowContainer'
import Properties from './panels/Properties'
import style from './index.styl'

import { withDragDropContext } from './panels/WithDragDropContext'

class PanelContainer extends Component {
  gLayout

  componentDidMount() {
    setTimeout(() => {
      this.loadLayoutWithConfig(this.getBaseConfig())
    }, 0)

    window.addEventListener('resize', this.resizeLayout)
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeLayout)
    this.gLayout.destroy()
  }

  resizeLayout = () => this.gLayout.updateSize && this.gLayout.updateSize()

  getBaseConfig() {
    return {
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
                }
              ]
            }
          ]
        }
      ]
    }
  }

  loadLayoutWithConfig = config => {
    const layout = new GoldenLayout(config, document.getElementById('container'))
    layout.registerComponent('tools', this.connectStoreRouter(withDragDropContext(ToolsPanel)))
    layout.registerComponent('flows', withDragDropContext(FlowPanel))
    layout.registerComponent('properties', this.connectStoreRouter(Properties))
    layout.registerComponent('diagram', this.connectStoreRouter(withDragDropContext(FlowContainer)))
    layout.init()

    layout.eventHub.on('saveWorkspace', () => this.saveWorkspace())
    layout.eventHub.on('loadWorkspace', () => this.restoreWorkspace())

    this.gLayout = layout
  }

  saveWorkspace = () => {
    const config = this.gLayout.toConfig()
    localStorage.setItem('savedState', JSON.stringify(config))
  }

  restoreWorkspace = () => {
    const savedState = localStorage.getItem('savedState')
    if (!savedState) {
      return
    }

    try {
      const config = JSON.parse(savedState)

      this.gLayout.destroy()
      this.loadLayoutWithConfig(config)
    } catch (err) {
      console.log(`Can't load workspace.`, err)
    }
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

PanelContainer.contextTypes = {
  store: PropTypes.object.isRequired,
  router: PropTypes.object
}

export default withRouter(PanelContainer)
