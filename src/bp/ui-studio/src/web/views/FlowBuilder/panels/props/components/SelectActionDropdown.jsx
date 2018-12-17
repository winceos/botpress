import React from 'react'
import Select, { components } from 'react-select'
import Highlighter from 'react-highlight-words'

import style from './SelectActionDropdown.styl'

export default class SelectActionDropdown extends React.Component {
  renderOption = props => {
    const { metadata } = props.data
    const highlight = txt => <Highlighter searchWords={[this._inputValue]} textToHighlight={txt} />

    if (metadata) {
      const category = metadata.category ? (
        <span className={style.action_category}>{highlight(metadata.category)} –</span>
      ) : null
      const title = metadata.title ? <span className={style.action_title}>{highlight(metadata.title)}</span> : null

      return (
        <components.Option {...props}>
          <span>
            {category}
            {title}
            <span className={style.action_name}>–&gt; {highlight(props.label)}</span>
          </span>
        </components.Option>
      )
    }

    return highlight(props.label)
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
        className={style.reactselect}
        classNamePrefix="rs"
        options={options}
        value={this.props.value}
        components={{ Option: this.renderOption }}
      />
    )
  }
}
