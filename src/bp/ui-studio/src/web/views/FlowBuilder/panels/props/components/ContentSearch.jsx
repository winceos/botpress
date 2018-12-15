import React from 'react'
import { connect } from 'react-redux'
import { fetchContentItems, fetchContentItemsCount } from '~/actions'
import ddStyle from '../../dropdown.scss'
import AsyncSelect from 'react-select/lib/Async'
import _ from 'lodash'

const SEARCH_RESULTS_LIMIT = 10

class ContentSearch extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      newItemCategory: null,
      searchTerm: '',
      newItemData: null
    }
  }

  searchContentItems() {
    if (!this.state.searchTerm || !this.state.searchTerm.length) {
      return
    }

    return this.props.fetchContentItems({
      count: SEARCH_RESULTS_LIMIT,
      searchTerm: this.state.searchTerm,
      contentType: this.props.contentTypeId || 'all',
      sortOrder: [{ column: 'createdOn', desc: true }]
    })
  }

  debounceSearch = _.debounce((searchTerm, cb) => {
    this.searchContentItems().then(result => {
      cb(
        result.payload.map(x => ({
          label: x.previewText,
          value: x
        }))
      )
    })
  }, 500)

  handleSelectChanged = element => {
    this.props.onElementChanged(element.value)
    this.setState({ searchTerm: '' })
  }
  handleInputChanged = inputValue => this.setState({ searchTerm: inputValue })

  render() {
    return (
      <AsyncSelect
        defaultOptions
        placeholder="Select an existing content element"
        loadOptions={this.debounceSearch}
        onChange={this.handleSelectChanged}
        onInputChange={this.handleInputChanged}
        value={this.state.searchTerm}
        className={ddStyle.reactselect}
        classNamePrefix="rs"
      />
    )
  }
}

const mapStateToProps = state => ({
  contentItems: state.content.currentItems,
  itemsCount: state.content.itemsCount
})

const mapDispatchToProps = {
  fetchContentItems,
  fetchContentItemsCount
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContentSearch)
