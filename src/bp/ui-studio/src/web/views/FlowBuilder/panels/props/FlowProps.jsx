import React from 'react'

export default class Topbar extends React.Component {
  promptRenameFlow = () => {
    const name = window.prompt('Please enter the new name for that flow', this.getCurrentFlowName())

    if (!name) {
      return
    }

    if (/[^A-Z0-9-_\/]/i.test(name)) {
      return alert('ERROR: The flow name can only contain letters, numbers, underscores and hyphens.')
    }

    const flows = _.map(this.props.flows, f => this.cleanFlowName(f.name).toLowerCase())

    if (name !== this.getCurrentFlowName() && _.includes(flows, name.toLowerCase())) {
      alert(`ERROR: There's an other flow called "${name}". Flow names must be unique.`)
    } else {
      this.props.renameFlow(name + '.flow.json')
    }
  }
}
