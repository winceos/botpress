import React from 'react'
import style from './FlowPanel.styl'
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'

export default class FlowPanel extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  promptNewFlow = () => {
    let name = prompt('Enter the name of the new flow')

    if (!name) {
      return
    }

    name = name.replace(/\.flow\.json$/i, '')

    if (/[^A-Z0-9-_\/]/i.test(name)) {
      return alert('ERROR: The flow name can only contain letters, numbers, underscores and hyphens.')
    }

    if (_.includes(this.props.flowsNames, name + '.flow.json')) {
      return alert('ERROR: This flow already exists')
    }

    this.props.glEventHub.emit('createNewFlow', name)
  }

  createTooltip = (name, text) => <Tooltip id={name}>{text}</Tooltip>

  componentDidMount() {
    this.setState({ flows: [{ id: 'main' }] })
  }

  renderItem(icon) {
    return <DragNode key={icon} />
  }

  render() {
    return (
      <div className={style.panel}>
        <Button className={style.btn} bsStyle="default" bsSize="xs" onClick={this.promptNewFlow}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('addFlow', 'Create new flow')}>
            <i className="material-icons">create_new_folder</i>
          </OverlayTrigger>
        </Button>
        <br />
        {this.state.flows &&
          this.state.flows.map(el => {
            return <div key={el.id}>{el.id}</div>
          })}
      </div>
    )
  }
}
