import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { NavLink, withRouter } from 'react-router-dom'
import classnames from 'classnames'
import { Tooltip, OverlayTrigger } from 'react-bootstrap'
import { GoBeaker } from 'react-icons/go'
import _ from 'lodash'
import { AccessControl } from '../Shared/Utils'

const style = require('./Sidebar.scss')

const BASIC_MENU_ITEMS = [
  {
    name: 'Content',
    path: '/content',
    rule: { res: 'bot.content', op: 'read' },
    icon: 'description'
  },
  {
    name: 'Flows',
    path: '/flows',
    rule: { res: 'bot.flows', op: 'read' },
    icon: 'device_hub'
  }
].filter(Boolean)

class Sidebar extends React.Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
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

  handleMenuItemClicked = () => window.toggleSidebar && window.toggleSidebar()

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
          <NavLink
            to={path}
            title={module.menuText}
            activeClassName={style.active}
            onClick={this.handleMenuItemClicked}
          >
            {moduleIcon}
            <span>{module.menuText}</span>
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

  renderBasicItem = ({ name, path, rule, icon, renderSuffix }) => (
    <AccessControl resource={rule.res} operation={rule.op} key={name}>
      <li id={`bp-menu_${name}`} key={path}>
        <NavLink to={path} title={name} activeClassName={style.active} onClick={this.handleMenuItemClicked}>
          <i className="icon material-icons" style={{ marginRight: '5px' }}>
            {icon}
          </i>
          {name}
          {renderSuffix && renderSuffix()}
        </NavLink>
      </li>
    </AccessControl>
  )

  render() {
    return (
      <aside style={{ zIndex: '1000' }}>
        <div className={classnames(style.sidebar, 'bp-sidebar')}>
          <div style={{ padding: '8px 13px', overflowX: 'hidden' }}>
            <a href="admin/" className={classnames(style.logo, 'bp-logo')}>
              <img width="125" src="assets/ui-studio/public/img/logo_white.png" alt="Botpress Logo" />
            </a>
          </div>
          <ul className={classnames('nav', style.mainMenu)}>
            {window.IS_BOT_MOUNTED ? (
              <React.Fragment>
                {BASIC_MENU_ITEMS.map(this.renderBasicItem)}
                {this.props.modules.filter(m => !m.noInterface).map(this.renderModuleItem)}
              </React.Fragment>
            ) : (
              <React.Fragment>
                {this.props.modules.filter(m => m.name === 'code-editor').map(this.renderModuleItem)}
              </React.Fragment>
            )}
            <li className={classnames(style.empty, 'bp-empty')} />
          </ul>
        </div>
        {this.props.children}
      </aside>
    )
  }
}

const mapStateToProps = state => ({
  viewMode: state.ui.viewMode,
  modules: state.modules
})

export default withRouter(connect(mapStateToProps)(Sidebar))
