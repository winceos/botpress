import React from 'react'

import classnames from 'classnames'

import style from '../style.scss'
import ContentForm from '~/components/ContentForm'
import { textToItemId, extractContentType } from '../../helpers'

export default class ContentProps extends React.Component {
  state = {
    contentType: undefined,
    contentElement: undefined
  }

  componentDidMount() {
    this.update()
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      this.update()
    }
  }

  update() {
    const item = this.props.data.item

    const elementId = textToItemId(item)
    const contentTypeId = extractContentType(item)

    this.setState({
      contentType: this.props.contentTypes.find(x => x.id === contentTypeId),
      contentElement: this.props.contentElements[elementId]
    })
  }

  render() {
    const { contentType, contentElement } = this.state
    if (!contentType) {
      return null
    }

    return (
      <div className={classnames(style.panel, style.padded)}>
        <div className={style.formField}>
          <label htmlFor="title">Parent Node</label>
          <span>{this.props.node.name}</span>
        </div>

        <hr />

        <ContentForm
          schema={contentType.schema.json}
          uiSchema={contentType.schema.ui}
          formData={contentElement && contentElement.formData}
        />
      </div>
    )
  }
}
