import React, { Component } from 'react'
import Select, { components } from 'react-select'
import Highlighter from 'react-highlight-words'
const style = require('./actionDropdown.scss')

export default class SelectActionDropdown extends Component {
  renderOption = props => {
    const { label, className, cx, getStyles, isDisabled, isFocused, isSelected, innerRef, innerProps } = props
    const { metadata } = props.data
    const highlight = txt => <Highlighter searchWords={[this._inputValue]} textToHighlight={txt} />

    if (metadata) {
      const category = metadata.category ? (
        <span className={style.category}>{highlight(metadata.category)} –</span>
      ) : null
      const title = metadata.title ? <span className={style.title}>{highlight(metadata.title)}</span> : null

      return (
        <components.Option {...props}>
          <span>
            {category}
            {title}
            <span className={style.name}>–&gt; {highlight(label)}</span>
          </span>
        </components.Option>
      )
    }

    return highlight(label)
  }

  render() {
    const options = this.props.options.map(x => ({
      label: x.name,
      value: x.name,
      metadata: x.metadata
    }))

    return (
      <Select
        onInputChange={inputValue => (this._inputValue = inputValue)}
        onChange={this.props.onChange}
        options={options}
        value={this.props.value}
        components={{ Option: this.renderOption }}
      />
    )
  }
}
