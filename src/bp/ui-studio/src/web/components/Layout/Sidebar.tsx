import { lang } from 'botpress/shared'
import classnames from 'classnames'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React, { Fragment } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { GoBeaker } from 'react-icons/go'
import { connect } from 'react-redux'
import { NavLink, RouteComponentProps, withRouter } from 'react-router-dom'
import { RootReducer } from '~/reducers'

import { AccessControl } from '../Shared/Utils'

import style from './Sidebar.scss'

type StateProps = ReturnType<typeof mapStateToProps>
type Props = StateProps & RouteComponentProps

const BASIC_MENU_ITEMS = [
  {
    name: lang.tr('content'),
    path: '/content',
    rule: { res: 'bot.content', op: 'read' },
    icon: 'description'
  },
  {
    name: lang.tr('flows'),
    path: window.USE_ONEFLOW ? '/oneflow' : '/flows',
    rule: { res: 'bot.flows', op: 'read' },
    icon: 'device_hub'
  }
]

const configItem = {
  name: lang.tr('configuration'),
  path: '/config',
  rule: { res: 'admin.bots.*', op: 'write' },
  icon: 'settings'
}

interface State {
  mql: any
  sidebarDocked: boolean
}

class Sidebar extends React.Component<Props, State> {
  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  state: State = {
    sidebarDocked: false,
    mql: undefined
  }

  componentDidMount() {
    const mql = window.matchMedia(`(min-width: 800px)`)
    mql.addListener(this.mediaQueryChanged)
    this.setState({ mql, sidebarDocked: mql.matches })
  }

  componentWillUnmount() {
    this.state.mql.removeListener(this.mediaQueryChanged)
  }

  mediaQueryChanged = () => this.setState({ sidebarDocked: this.state.mql.matches })

  renderModuleItem = module => {
    const rule = { res: `module.${module.name}`, op: 'write' }
    const path = `/modules/${module.name}`
    const iconPath = `assets/modules/${module.name}/icon.png`
    const moduleIcon =
      module.menuIcon === 'custom' ? (
        <img className={classnames(style.customIcon, 'bp-custom-icon')} src={iconPath} />
      ) : (
        <i className="icon material-icons" style={{ marginRight: '5px' }}>
          {module.menuIcon}
        </i>
      )

    const experimentalTooltip = (
      <Tooltip id="experimental-tooltip">
        This feature is <strong>experimental</strong> and is subject to change in the next version
      </Tooltip>
    )

    return (
      <AccessControl key={`menu_module_${module.name}`} resource={rule.res} operation={rule.op}>
        <li id={`bp-menu_${module.name}`}>
          <NavLink to={path} title={module.menuText} activeClassName={style.active}>
            {moduleIcon}
            <span>{lang.tr(`module.${module.name}.fullName`) || module.menuText}</span>
            {module.experimental && (
              <OverlayTrigger trigger={['hover', 'focus']} placement="right" overlay={experimentalTooltip}>
                <GoBeaker className={style.experimental} />
              </OverlayTrigger>
            )}
          </NavLink>
        </li>
      </AccessControl>
    )
  }

  renderBasicItem = ({ name, path, rule, icon }) => (
    <AccessControl resource={rule.res} operation={rule.op} key={name}>
      <li id={`bp-menu_${name}`} key={path}>
        <NavLink to={path} title={name} activeClassName={style.active}>
          <i className="icon material-icons" style={{ marginRight: '5px' }}>
            {icon}
          </i>
          {name}
        </NavLink>
      </li>
    </AccessControl>
  )

  render() {
    return (
      <aside className={classnames(style.sidebar, 'bp-sidebar')}>
        <a href="admin/" className={classnames(style.logo, 'bp-logo')}>
          <img width="125" src="assets/ui-studio/public/img/logo_white.png" alt="Botpress Logo" />
        </a>
        <ul className={classnames('nav', style.mainMenu)}>
          {window.IS_BOT_MOUNTED ? (
            <Fragment>
              {BASIC_MENU_ITEMS.map(this.renderBasicItem)}
              {this.props.modules.filter(m => !m.noInterface).map(this.renderModuleItem)}
              {this.renderBasicItem(configItem)}
            </Fragment>
          ) : (
            <Fragment>
              {this.props.modules.filter(m => m.name === 'code-editor').map(this.renderModuleItem)}
              {this.renderBasicItem(configItem)}
            </Fragment>
          )}
          <li className={classnames(style.empty, 'bp-empty')} />
        </ul>
      </aside>
    )
  }
}

const mapStateToProps = (state: RootReducer) => ({
  viewMode: state.ui.viewMode,
  modules: state.modules
})

export default withRouter(connect(mapStateToProps)(Sidebar))
