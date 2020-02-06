import { Alignment, Icon, Navbar } from '@blueprintjs/core'
import { UserProfile } from 'common/typings'
import React, { FC, Fragment, useEffect } from 'react'
import { connect } from 'react-redux'
import { NavLink } from 'reactstrap'
import WorkspaceSelect from '~/Pages/Components/WorkspaceSelect'

import logo from '../media/logo_white.png'
import { fetchLicensing } from '../reducers/license'
import { fetchProfile } from '../reducers/user'
import { fetchCurrentVersion } from '../reducers/versions'

import Menu from './Menu'
import UserDropdownMenu from './UserDropdownMenu'

interface Props {
  profile: UserProfile
  licensing: any
  version: string
  fetchLicensing: () => void
  fetchProfile: () => void
  fetchCurrentVersion: Function
}

const App: FC<Props> = props => {
  useEffect(() => {
    props.fetchLicensing()
    props.fetchProfile()

    if (!props.version) {
      props.fetchCurrentVersion()
    }
  }, [])

  if (!props.profile) {
    return null
  }

  const isLicensed = !props.licensing || !props.licensing.isPro || props.licensing.status === 'licensed'

  return (
    <Fragment>
      <Header />

      <div className="bp-sa-wrapper">
        <Menu />
        <div className="bp-sa-content-wrapper">
          {!isLicensed && <Unlicensed />}
          {props.children}
        </div>
      </div>

      <Footer version={props.version} />
    </Fragment>
  )
}

const Header = () => (
  <header className="bp-header">
    <Navbar>
      <Navbar.Group>
        <Navbar.Heading>
          <a href="admin/">
            <img src={logo} alt="logo" className="bp-header__logo" />
          </a>
        </Navbar.Heading>
      </Navbar.Group>

      <Navbar.Group align={Alignment.RIGHT}>
        <WorkspaceSelect />
        <Navbar.Divider />
        <UserDropdownMenu />
      </Navbar.Group>
    </Navbar>
  </header>
)

const Footer = props => (
  <footer className="statusBar">
    <div className="statusBar-list">
      <div className="statusBar-item">
        <strong>{props.version}</strong>
      </div>
    </div>
  </footer>
)

const Unlicensed = () => (
  <div className="bp-header__warning">
    <NavLink href="/admin/server/license">
      <Icon icon="warning-sign" />
      Botpress is currently not licensed. Please update your license to re-enable all features.
    </NavLink>
  </div>
)

const mapStateToProps = state => ({
  profile: state.user.profile,
  licensing: state.license.licensing,
  version: state.version.currentVersion
})

const mapDispatchToProps = {
  fetchLicensing,
  fetchProfile,
  fetchCurrentVersion
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App)
