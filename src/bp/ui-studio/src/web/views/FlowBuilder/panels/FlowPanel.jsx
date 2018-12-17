import React from 'react'
import style from './FlowPanel.styl'
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'

export default class FlowPanel extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
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
        <Button className={style.btn} bsStyle="default" bsSize="xs">
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
