import React, { Fragment } from 'react'
import style from './style.scss'
import DragNode from './DragNode'
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { connect } from 'react-redux'
import { setDiagramAction, updateFlow, flowEditorRedo, flowEditorUndo, buildNewSkill } from '~/actions'
import { getCurrentFlow, getCurrentFlowNode, getDirtyFlows, canFlowUndo, canFlowRedo } from '~/reducers'

class ToolsPanel extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    this.setState({
      elements: [
        { id: 'text', label: 'Text' },
        { id: 'single-choice', label: 'Single-Choice' },
        { id: 'card', label: 'Card' },
        { id: 'image', label: 'Image' }
      ]
    })
  }

  renderItem(item) {
    return (
      <div className={style.toolContainer} key={item.label}>
        <div className={style.title}>{item.label}</div>
        <DragNode type={item.id} />
      </div>
    )
  }

  render() {
    return (
      <div className={style.panel}>
        {this.renderBtn()}
        <header>
          <span>Node</span>
        </header>
        {this.renderItem({ id: 'node', label: 'Node' })}
        {this.renderItem({ id: 'node', label: 'Action' })}
        {this.renderItem({ id: 'node', label: 'Transition' })}
        <header>
          <span>Content</span>
        </header>
        {this.state.elements && this.state.elements.map(element => this.renderItem(element))}
        <header>
          <span>Skills</span>
        </header>
        {this.renderItem({ id: 'node', label: 'Choice' })}
        {this.renderItem({ id: 'node', label: 'SF LiveAgent' })}
      </div>
    )
  }

  renderBtn() {
    return (
      <div>
        <Button className={style.btn} bsStyle="default" onClick={() => this.emit('saveAllFlows')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('saveAll', 'Save all (ctrl+s)')}>
            <i className="material-icons">save</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} bsStyle="default" disabled={!this.props.canUndo} onClick={this.props.undo}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('undo', 'Undo')}>
            <i className="material-icons">undo</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} bsStyle="default" disabled={!this.props.canRedo} onClick={this.props.redo}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('redo', 'Redo')}>
            <i className="material-icons">redo</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} bsStyle="default" onClick={() => this.emit('copyClipboard')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('copy', 'Copy')}>
            <i className="material-icons">content_copy</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} bsStyle="default" onClick={() => this.emit('pasteClipboard')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('paste', 'Paste')}>
            <i className="material-icons">content_paste</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} bsStyle="default">
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('makeStartNode', 'Set as Start node')}>
            <i className="material-icons">stars</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} bsStyle="default" onClick={() => this.emit('deleteSelection')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('delete', 'Delete')}>
            <i className="material-icons">delete</i>
          </OverlayTrigger>
        </Button>
      </div>
    )
  }

  createTooltip = (name, text) => <Tooltip id={name}>{text}</Tooltip>
  emit = (event, ...args) => {
    this.props.glEventHub.emit(event, ...args)
  }
}

const mapStateToProps = state => ({
  flowElementSelected: state.panels.flowElementSelected,
  dirtyFlows: getDirtyFlows(state),
  canUndo: canFlowUndo(state),
  canRedo: canFlowRedo(state),
  canPasteNode: Boolean(state.flows.nodeInBuffer),
  skills: state.skills.installed
})

const mapDispatchToProps = {
  updateFlow: updateFlow,
  undo: flowEditorUndo,
  redo: flowEditorRedo,
  buildSkill: buildNewSkill
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ToolsPanel)
