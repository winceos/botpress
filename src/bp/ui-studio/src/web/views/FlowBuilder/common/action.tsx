import classnames from 'classnames'
import _ from 'lodash'
import Mustache from 'mustache'
import React, { Component } from 'react'
import { OverlayTrigger, Popover } from 'react-bootstrap'
import Markdown from 'react-markdown'
import { connect } from 'react-redux'
import { fetchContentItem, refreshFlowsLinks } from '~/actions'

import withLanguage from '../../../components/Util/withLanguage'
import { textToItemId } from '../diagram/nodes_v2/utils'

import style from './style.scss'

interface Props {
  text: string
  fetchContentItem: any
  refreshFlowsLinks: any
  className: string
  items: any
  contentLang: string
  layoutv2?: boolean
}

class ActionItem extends Component<Props> {
  state = {
    itemId: null
  }

  componentDidMount() {
    this.loadElement()
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.text !== this.props.text) {
      this.loadElement()
    }

    if (prevState.itemId !== this.state.itemId && this.state.itemId) {
      this.props.fetchContentItem(this.state.itemId, { force: true, batched: true }).then(this.props.refreshFlowsLinks)
    }
  }

  loadElement() {
    this.setState({ itemId: textToItemId(this.props.text) })
  }

  renderAction() {
    const action = this.props.text.trim()

    let actionName = action
    let parameters = {}

    if (action.indexOf(' ') >= 0) {
      const tokens = action.split(' ')
      actionName = _.head(tokens) + ' (args)'
      parameters = JSON.parse(_.tail(tokens).join(' '))
    }

    const callPreview = JSON.stringify(parameters, null, 2)

    const popoverHoverFocus = (
      <Popover id="popover-action" title={`⚡ ${actionName}`}>
        Called with these arguments:
        <pre>{callPreview}</pre>
      </Popover>
    )

    return (
      <OverlayTrigger trigger={['hover', 'focus']} placement="top" delayShow={500} overlay={popoverHoverFocus}>
        <div className={classnames(this.props.className, style['fn'], style['action-item'])}>
          <span className={style.icon}>⚡</span>
          <span className={style.name}>{actionName}</span>
          {this.props.children}
        </div>
      </OverlayTrigger>
    )
  }

  render() {
    const action = this.props.text
    const isAction = typeof action !== 'string' || !action.startsWith('say ')

    if (isAction) {
      return this.renderAction()
    }

    const item = this.props.items[this.state.itemId]

    const preview = item && item.previews && item.previews[this.props.contentLang]
    const className = classnames(style.name, {
      [style.missingTranslation]: preview && preview.startsWith('(missing translation) ')
    })

    if (preview && item && item.schema && item.schema.title === 'Image') {
      const markdownRender = (
        <Markdown
          source={preview}
          renderers={{
            image: props => <img {...props} className={style.imagePreview} />,
            link: props => (
              <a href={props.href} target="_blank">
                {props.children}
              </a>
            )
          }}
        />
      )

      if (this.props.layoutv2) {
        return (
          <div className={classnames(this.props.className, style['action-item'])}>
            {markdownRender}
            {this.props.children}
          </div>
        )
      }

      return (
        <div className={classnames(this.props.className, style['action-item'], style.msg)}>
          <span className={style.icon}>💬</span>
          {markdownRender}
          {this.props.children}
        </div>
      )
    }

    const textContent = (item && `${item.schema && item.schema.title} | ${preview}`) || ''
    const vars = {}

    const stripDots = str => str.replace(/\./g, '--dot--')
    const restoreDots = str => str.replace(/--dot--/g, '.')

    const htmlTpl = textContent.replace(/{{([a-z$@0-9. _-]*?)}}/gi, x => {
      const name = stripDots(x.replace(/{|}/g, ''))
      vars[name] = '<span class="var">' + x + '</span>'
      return '{' + stripDots(x) + '}'
    })

    const mustached = restoreDots(Mustache.render(htmlTpl, vars))

    const html = { __html: mustached }

    if (this.props.layoutv2) {
      return (
        <div className={classnames(this.props.className, style['action-item'])}>
          <span className={className} dangerouslySetInnerHTML={html} />
          {this.props.children}
        </div>
      )
    }

    return (
      <div className={classnames(this.props.className, style['action-item'], style.msg)}>
        <span className={style.icon}>💬</span>
        <span className={className} dangerouslySetInnerHTML={html} />
        {this.props.children}
      </div>
    )
  }
}

const mapStateToProps = state => ({ items: state.content.itemsById })
const mapDispatchToProps = { fetchContentItem, refreshFlowsLinks }

export default connect(mapStateToProps, mapDispatchToProps)(withLanguage(ActionItem))
