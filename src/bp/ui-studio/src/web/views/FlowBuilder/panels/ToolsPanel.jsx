import React from 'react'
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { connect } from 'react-redux'

import DragNode from '../common/DragNode'
import PermissionsChecker from '~/components/Layout/PermissionsChecker'
import { updateFlow, flowEditorRedo, flowEditorUndo, buildNewSkill, fetchContentCategories } from '~/actions'
import { getDirtyFlows, canFlowUndo, canFlowRedo } from '~/reducers'
import { ToolTypes } from './Constants'
import style from './ToolsPanel.styl'

class ToolsPanel extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentDidMount() {
    if (!this.props.contentTypes) {
      this.props.fetchContentCategories()
    }
  }

  shouldComponentUpdate(nextProps) {
    return (
      this.props.skills !== nextProps.skills ||
      this.props.contentTypes !== nextProps.contentTypes ||
      this.props.canUndo !== nextProps.canUndo ||
      this.props.canRedo !== nextProps.canRedo
    )
  }

  save = () => this.emit('saveWorkspace')
  restore = () => this.emit('loadWorkspace')

  render() {
    return (
      <div className={style.panel}>
        {this.renderBtn()}
        <header>
          <span>Node</span>
        </header>
        {this.renderTool('Node', 'node', ToolTypes.Node)}
        {this.renderTool('Action', 'action', ToolTypes.Action, '')}
        {this.renderTool('Transition', 'transition', ToolTypes.Transition, { condition: 'true', node: '' })}
        <header>
          <span>Content</span>
        </header>
        {this.props.contentTypes && this.props.contentTypes.map(type => this.renderContentType(type))}
        <header>
          <span>Skills</span>
        </header>
        <PermissionsChecker user={this.props.user} op="write" res="bot.skills">
          {this.props.skills && this.props.skills.map(skill => this.renderSkill(skill))}
        </PermissionsChecker>

        <hr />

        <Button onClick={this.save} bsSize="xs">
          Save Workspace
        </Button>
        <Button onClick={this.restore} bsSize="xs">
          Restore Workspace
        </Button>
      </div>
    )
  }

  renderBtn() {
    return (
      <div className={style.btns}>
        <Button className={style.btn} onClick={() => this.emit('saveAllFlows')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('saveAll', 'Save all (ctrl+s)')}>
            <i className="material-icons">save</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} disabled={!this.props.canUndo} onClick={this.props.undo}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('undo', 'Undo')}>
            <i className="material-icons">undo</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} disabled={!this.props.canRedo} onClick={this.props.redo}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('redo', 'Redo')}>
            <i className="material-icons">redo</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} onClick={() => this.emit('copyClipboard')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('copy', 'Copy')}>
            <i className="material-icons">content_copy</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} onClick={() => this.emit('pasteClipboard')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('paste', 'Paste')}>
            <i className="material-icons">content_paste</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('makeStartNode', 'Set as Start node')}>
            <i className="material-icons">stars</i>
          </OverlayTrigger>
        </Button>

        <Button className={style.btn} onClick={() => this.emit('deleteSelection')}>
          <OverlayTrigger placement="bottom" overlay={this.createTooltip('delete', 'Delete')}>
            <i className="material-icons">delete</i>
          </OverlayTrigger>
        </Button>
      </div>
    )
  }

  renderContentType = type => this.renderTool(type.title, type.id, ToolTypes.Content, `say ${type.id}`)
  renderSkill = skill => this.renderTool(skill.name, skill.id, ToolTypes.Skills)

  renderTool(name, id, type, defaultValue) {
    return (
      <div className={style.toolContainer} key={id}>
        <div className={style.title}>{name}</div>
        <DragNode type={type} id={id} defaultValue={defaultValue} />
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
  skills: state.skills.installed,
  contentTypes: state.content.categories,
  user: state.user
})

const mapDispatchToProps = {
  updateFlow,
  fetchContentCategories,
  undo: flowEditorUndo,
  redo: flowEditorRedo,
  buildSkill: buildNewSkill
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ToolsPanel)
