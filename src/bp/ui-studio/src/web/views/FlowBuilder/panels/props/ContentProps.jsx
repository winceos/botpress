import React from 'react'
import { connect } from 'react-redux'
import ContentForm from '~/components/ContentForm'
import { textToItemId } from '~/util'
import { fetchContentItem, fetchContentCategories, upsertContentItem, editFlowNodeAction } from '~/actions'
import ContentSearch from './components/ContentSearch'
import style from '../style.scss'

const extractContentType = text =>
  (text && _.get(text.match(/^say #!(.*)-.*$/), '[1]')) || text.replace('say', '').trim()

class ContentProps extends React.Component {
  state = {
    contentType: undefined,
    contentElement: undefined
  }

  componentDidMount() {
    if (!this.props.contentTypes) {
      this.props.fetchContentCategories()
    }
    this.update()
  }

  componentDidUpdate(prevProps) {
    if (this.props.data.item !== prevProps.data.item) {
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

  handleFormEdited = data => {
    this.setState({ contentElement: { ...this.state.contentElement, formData: data.formData } }) //
  }

  handleSave = () => {
    this.props
      .upsertContentItem({
        contentType: this.state.contentType.id,
        formData: this.state.contentElement.formData,
        modifyId: this.state.contentElement.id
      })
      .then(({ data }) => {
        this.setState({ contentElement: { ...this.state.contentElement, id: data } })
        const { node, actionType, index } = this.props.data

        this.props.editFlowNodeAction({
          nodeId: node.id,
          actionType,
          replace: { index },
          item: `say #!${data}`
        })
      })
  }

  handleElementChanged = element => this.setState({ contentElement: element })

  render() {
    const { contentType, contentElement } = this.state
    if (!contentType) {
      return null
    }

    return (
      <div>
        <ContentSearch contentTypeId={contentType.id} onElementChanged={this.handleElementChanged} />
        <hr />
        <ContentForm
          className={style.rjsf}
          schema={contentType.schema.json}
          uiSchema={contentType.schema.ui}
          formData={contentElement && contentElement.formData}
          onChange={this.handleFormEdited}
          onSubmit={this.handleSave}
        />
      </div>
    )
  }
}

const mapStateToProps = state => ({
  contentElements: state.content.itemsById,
  contentTypes: state.content.categories
})

const mapDispatchToProps = {
  fetchContentItem,
  fetchContentCategories,
  upsertContentItem,
  editFlowNodeAction
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContentProps)
