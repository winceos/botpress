import { Button, Classes, Dialog, FileInput, FormGroup, InputGroup, Intent } from '@blueprintjs/core'
import _ from 'lodash'
import React, { Component } from 'react'

import api from '../../../api'

import { sanitizeBotId } from './CreateBotModal'
interface Props {
  onCreateBotSuccess: () => void
  toggle: () => void
  isOpen: boolean
}

interface State {
  botId: string
  error: any
  filePath: string | null
  fileContent: Buffer | null
  isProcessing: boolean
  isIdTaken: boolean
}

const defaultState = {
  botId: '',
  error: null,
  filePath: null,
  fileContent: null,
  isIdTaken: false,
  isProcessing: false
}

class ImportBotModal extends Component<Props, State> {
  private _form: HTMLFormElement | null = null

  state: State = { ...defaultState }

  importBot = async e => {
    e.preventDefault()
    if (this.isButtonDisabled) {
      return
    }
    this.setState({ isProcessing: true })

    try {
      await api.getSecured({ timeout: 60000 }).post(`/admin/bots/${this.state.botId}/import`, this.state.fileContent, {
        headers: { 'Content-Type': 'application/tar+gzip' }
      })

      this.props.onCreateBotSuccess()
      this.toggleDialog()
    } catch (error) {
      this.setState({ error: error.message, isProcessing: false })
    }
  }

  checkIdAvailability = _.debounce(async () => {
    if (!this.state.botId) {
      return this.setState({ isIdTaken: false })
    }

    try {
      const { data: isIdTaken } = await api.getSecured().get(`/admin/bots/${this.state.botId}/exists`)
      this.setState({ isIdTaken })
    } catch (error) {
      this.setState({ error: error.message })
    }
  }, 500)

  handleBotIdChanged = e => this.setState({ botId: sanitizeBotId(e.target.value) }, this.checkIdAvailability)

  handleFileChanged = (files: FileList | null) => {
    if (!files) {
      return
    }

    const fr = new FileReader()
    fr.readAsArrayBuffer(files[0])
    fr.onload = loadedEvent => {
      this.setState({ fileContent: _.get(loadedEvent, 'target.result') })
    }

    this.setState({ filePath: files[0].name })

    if (!this.state.botId.length) {
      this.generateBotId(files[0].name)
    }
  }

  generateBotId = (filename: string) => {
    const noExt = filename.substr(0, filename.indexOf('.'))
    const matches = noExt.match(/bot_(.*)_[0-9]+/)
    this.setState({ botId: sanitizeBotId((matches && matches[1]) || noExt) })
  }

  toggleDialog = () => {
    this.setState({ ...defaultState })
    this.props.toggle()
  }

  get isButtonDisabled() {
    const { isProcessing, botId, fileContent, isIdTaken } = this.state
    return isProcessing || !botId || !fileContent || isIdTaken || !this._form || !this._form.checkValidity()
  }

  render() {
    return (
      <Dialog
        title="Import bot from archive"
        icon="import"
        isOpen={this.props.isOpen}
        onClose={this.toggleDialog}
        transitionDuration={0}
        canOutsideClickClose={false}
      >
        <form
          ref={form => (this._form = form)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            this.handleFileChanged(e.dataTransfer.files)
          }}
        >
          <div className={Classes.DIALOG_BODY}>
            <FormGroup
              label={<span>Bot ID {this.state.isIdTaken && <span className="text-danger">Already in use</span>}</span>}
              labelFor="input-botId"
              labelInfo="*"
              helperText="This ID cannot be changed, so choose wisely. It will be displayed in the URL and your visitors can see it.
              Special characters are not allowed. Minimum length: 4"
            >
              <InputGroup
                id="input-botId"
                tabIndex={1}
                placeholder="The ID of your bot"
                intent={Intent.PRIMARY}
                minLength={3}
                value={this.state.botId}
                onChange={this.handleBotIdChanged}
                autoFocus={true}
              />
            </FormGroup>
            <FormGroup label="Bot Archive" labelInfo="*" labelFor="archive">
              <FileInput
                tabIndex={2}
                text={this.state.filePath || 'Choose file...'}
                onChange={event => this.handleFileChanged((event.target as HTMLInputElement).files)}
                inputProps={{ accept: '.zip,.tgz' }}
              />
            </FormGroup>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            {!!this.state.error && <p className="text-danger">{this.state.error}</p>}
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                id="btn-upload"
                tabIndex={3}
                type="submit"
                text={this.state.isProcessing ? 'Please wait...' : 'Import Bot'}
                onClick={this.importBot}
                disabled={this.isButtonDisabled}
                intent={Intent.PRIMARY}
              />
            </div>
          </div>
        </form>
      </Dialog>
    )
  }
}

export default ImportBotModal
