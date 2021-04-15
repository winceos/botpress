import { confirmDialog, lang } from 'botpress/shared'
import { LicenseInfo } from 'common/licensing-service'
import _ from 'lodash'
import moment from 'moment'
import React, { Fragment } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { connect, ConnectedProps } from 'react-redux'
import { Button, Col, Row, UncontrolledTooltip, Alert, Jumbotron } from 'reactstrap'

import api from '~/app/api'
import PageContainer from '~/app/common/PageContainer'
import { AppState } from '~/app/rootReducer'
import EditLicense from './EditLicense'
import LicensePolicies from './LicensePolicies'
import { fetchLicensing } from './reducer'

type Props = ConnectedProps<typeof connector>

class LicenseStatus extends React.Component<Props> {
  state = {
    waitingForReboot: false
  }
  componentDidMount() {
    this.props.fetchLicensing()
  }

  get isUnderLimits() {
    return _.get(this.props.licensing, 'status') !== 'breached'
  }

  get isLicensed() {
    return _.get(this.props.licensing, 'status') === 'licensed'
  }

  get renewDate() {
    return moment(_.get(this.props.licensing, 'license.paidUntil', new Date())).format('lll')
  }

  get serverFingerprints() {
    return this.props.licensing && this.props.licensing.fingerprints
  }

  get license(): LicenseInfo {
    return (this.props.licensing && this.props.licensing.license) || ({} as LicenseInfo)
  }

  get isWrongFingerprint() {
    if (!this.serverFingerprints || !this.license || !this.license.fingerprint) {
      return false
    }

    return this.serverFingerprints[this.license.fingerprintType] !== this.license.fingerprint
  }

  refreshKey = async () => {
    await api.getSecured().post('/admin/management/licensing/refresh')
    await this.props.fetchLicensing()
  }

  rebootServer = async () => {
    try {
      await api.getSecured().post('/admin/management/rebootServer')
      this.setState({ waitingForReboot: true })

      setTimeout(() => {
        window.location.reload()
      }, 10000)
    } catch (error) {
      this.setState({ error })
    }
  }

  enableProEdition = async () => {
    try {
      if (
        await confirmDialog(lang.tr('admin.license.status.areYouSure'), {
          acceptLabel: lang.tr('enable')
        })
      ) {
        const result = await api.getSecured().post('/admin/management/licensing/config/enablePro')
        if (result.status === 200) {
          await this.rebootServer()
        }
      }
    } catch (error) {
      this.setState({ error })
    }
  }

  renderReboot() {
    return (
      <Jumbotron>
        <Row>
          <Col style={{ textAlign: 'center' }} sm="12" md={{ size: 10, offset: 1 }}>
            <p>{lang.tr('admin.license.status.waitWhileReboot')}</p>
          </Col>
        </Row>
      </Jumbotron>
    )
  }

  renderLicenseStatus() {
    return (
      <div className={'license-status ' + (this.isLicensed ? 'licensed' : 'unlicensed')}>
        <div>
          <span className="license-status__badge" />
          <span className="license-status__status">
            {this.isLicensed ? lang.tr('admin.license.status.licensed') : lang.tr('admin.license.status.unlicensed')}
          </span>
          <span className="license-status__limits">
            {this.isUnderLimits
              ? lang.tr('admin.license.status.underLimits')
              : lang.tr('admin.license.status.limitsBreached')}
          </span>
        </div>

        <Button color="link" className="license-status__refresh" onClick={this.refreshKey}>
          <svg className="icon" viewBox="0 0 90 80" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M74.59 57.824l10.498-5.863a3 3 0 1 1 2.926 5.238l-17.779 9.93a2.998 2.998 0 0 1-4.16-1.302l-8.934-18.299a3.002 3.002 0 0 1 1.38-4.013 3.005 3.005 0 0 1 4.013 1.38l5.795 11.87A33.02 33.02 0 0 0 72.865 40c0-18.311-14.897-33.207-33.209-33.207-18.31 0-33.206 14.896-33.206 33.207 0 18.312 14.896 33.209 33.206 33.209 1.236 0 2.476-.068 3.685-.202a3 3 0 0 1 .663 5.963 39.448 39.448 0 0 1-4.348.239C18.038 79.208.45 61.619.45 39.999.45 18.38 18.038.792 39.656.792c21.62 0 39.209 17.588 39.209 39.207a39.011 39.011 0 0 1-4.276 17.825z"
              fillRule="evenodd"
            />
          </svg>
        </Button>
      </div>
    )
  }

  renderFingerprintStatus() {
    if (!this.serverFingerprints) {
      return null
    }

    return (
      <Fragment>
        <div className="license-infos license-infos--fingerprint">
          <strong className="license-infos__label">{lang.tr('admin.license.status.clusterFingerprint')}:</strong>
          <code>{this.serverFingerprints.cluster_url}</code>
          <CopyToClipboard text={this.serverFingerprints.cluster_url}>
            <Button color="link" size="sm" className="license-infos__icon">
              <svg href="#" id="TooltipCopy" height="15" viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3.996 0H16v16h-4.004v4H0V4h3.996V0zM6 2v12h8V2H6zM2 6v12h8v-1.997H3.998V6H2z"
                  fill="#4A4A4A"
                  fillRule="evenodd"
                />
              </svg>
            </Button>
          </CopyToClipboard>
          <UncontrolledTooltip placement="right" target="TooltipCopy">
            {lang.tr('admin.license.status.copyToClipboard')}
          </UncontrolledTooltip>
        </div>
        {this.isWrongFingerprint && <Alert color="danger">{lang.tr('admin.license.status.fingerprintNoMatch')}</Alert>}
      </Fragment>
    )
  }

  renderProDisabled = () => {
    return (
      <PageContainer title="Server License">
        <Jumbotron>
          <Row>
            <Col style={{ textAlign: 'center' }} sm="12" md={{ size: 10, offset: 1 }}>
              <h4>Enable Botpress Professional</h4>
              <p>
                {lang.tr('admin.license.status.useOfficial', {
                  officialBinary: <strong>{lang.tr('admin.license.status.officialBinary')}</strong>
                })}
              </p>
              <p>
                <u>{lang.tr('admin.license.status.method1')}</u>
                <br />
                {lang.tr('admin.license.status.enableMethod1', {
                  file: <strong>data/global/botpress.config.json</strong>,
                  field: <strong>pro.enabled</strong>
                })}
              </p>
              <p>
                <u>{lang.tr('admin.license.status.method2')}</u>
                <br />
                {lang.tr('admin.license.status.enabledMethod2')}
                <br />
                <br />
                <Button onClick={this.enableProEdition}>{lang.tr('admin.license.status.enabledAndReboot')}</Button>
              </p>
            </Col>
          </Row>
        </Jumbotron>
      </PageContainer>
    )
  }

  renderUnofficialBuild = () => {
    return (
      <PageContainer title="Server License">
        <Jumbotron>
          <Row>
            <Col style={{ textAlign: 'center' }} sm="12" md={{ size: 10, offset: 1 }}>
              <h4>{lang.tr('admin.license.status.unofficialBuild')}</h4>
              <p>
                {lang.tr('admin.license.status.unofficialBuildText', {
                  official: <strong>{lang.tr('admin.license.status.official')}</strong>,
                  pro: <strong>{lang.tr('admin.license.status.pro')}</strong>
                })}
              </p>
            </Col>
          </Row>
        </Jumbotron>
      </PageContainer>
    )
  }

  renderBody() {
    if (this.state.waitingForReboot) {
      return this.renderReboot()
    }

    if (this.props.licensing && !this.props.licensing.isBuiltWithPro) {
      return this.renderUnofficialBuild()
    }

    if (this.props.licensing && !this.props.licensing.isPro) {
      return this.renderProDisabled()
    }

    // @TODO: Fix those typings once we are sure what they represent
    // @ts-ignore
    const nodes = Number((this.license.limits && this.license.limits.nodes) || 0)

    return (
      <PageContainer title={lang.tr('admin.sideMenu.serverLicense')} superAdmin={true}>
        <Row>
          <Col sm="12" lg="7">
            {this.renderLicenseStatus()}
            {this.renderFingerprintStatus()}
            <EditLicense refresh={this.props.fetchLicensing} />
          </Col>
          <Col sm="12" lg="5">
            <div className="license-infos">
              <strong className="license-infos__label">{lang.tr('admin.license.status.friendlyName')}:</strong>
              {this.license.label || 'N/A'}
            </div>
            <div className="license-infos">
              <strong className="license-infos__label">{lang.tr('admin.license.status.renewDate')}:</strong>
              {this.renewDate}
            </div>
            <div className="license-infos">
              <strong className="license-infos__label">{lang.tr('admin.license.status.support')}:</strong>
              {this.license.support}
              <svg
                className="license-infos__icon"
                href="#"
                id="TooltipSupport"
                width="15"
                height="15"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 16h2v-2H9v2zm1-16C4.477 0 0 4.477 0 10A10 10 0 1 0 10 0zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z"
                  fill="#4A4A4A"
                  fillRule="nonzero"
                />
              </svg>
              <UncontrolledTooltip placement="right" target="TooltipSupport">
                {lang.tr('admin.license.status.thisIsSupport')}
              </UncontrolledTooltip>
            </div>
            <div className="license-infos">
              <strong className="license-infos__label">{lang.tr('admin.license.status.allowedNodes')}:</strong>
              {this.license.limits && nodes + 1}
            </div>
            <hr />
            {this.props.licensing && (
              <div>
                <h5>{lang.tr('admin.license.status.policies')}</h5>
                <LicensePolicies license={this.license} breachs={this.props.licensing.breachReasons} />
              </div>
            )}
          </Col>
        </Row>
      </PageContainer>
    )
  }

  render() {
    return this.renderBody()
  }
}

const mapStateToProps = (state: AppState) => ({ licensing: state.licensing.license })

const connector = connect(mapStateToProps, { fetchLicensing })

export default connector(LicenseStatus)
