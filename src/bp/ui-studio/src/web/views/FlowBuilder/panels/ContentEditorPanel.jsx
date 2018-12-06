import React from 'react'
import style from './style.scss'
import { FormControl, Tooltip } from 'react-bootstrap'
import { connect } from 'react-redux'
import _ from 'lodash'
import Select from 'react-select'
import classnames from 'classnames'

class ContentEditor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    this.setState({ elements: [{ id: 'Text' }, { id: 'Choice' }, { id: 'Card' }, { id: 'Image' }] })
  }

  createTooltip = (name, text) => <Tooltip id={name}>{text}</Tooltip>

  changeSelection = () => {}

  render() {
    const selected = _.get(this, 'props.flowElementSelected')
    if (!selected) {
      return null
    }
    const list = []
    selected.onEnter && list.push(...selected.onEnter)
    selected.onReceive && list.push(...selected.onReceive)

    const options = list.map(x => ({
      label: x,
      value: x
    }))

    return (
      <div className={classnames(style.panel, style.padded)}>
        <div className={style.formField}>
          <label htmlFor="title">Search Existing Element</label>

          <Select
            styles={style.select}
            options={options}
            value={this.state.pen}
            onChange={option => this.changeSelection(option.value)}
          />
          <select className={style.select} options={options}>
            <option value="">abc</option>
            <option value="">xyz</option>
          </select>
        </div>
        <hr />
        <div className={style.formField}>
          <label htmlFor="title">Create new element</label>
          <input type="text" id="title" />
        </div>
        <br />
        <div className={style.formField}>
          <label htmlFor="title">
            Title
            <span className={style.optional}> (optional)</span>
          </label>
          <small>Some platform requires you</small>
          <input type="text" id="title" />
        </div>
        <hr />
        Selected Node: {selected.id}
        <br />
      </div>
    )
  }
}

const mapStateToProps = state => ({ flowElementSelected: state.panels.flowElementSelected })
export default connect(mapStateToProps)(ContentEditor)
