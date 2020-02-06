import { Icon, Position, Tooltip } from '@blueprintjs/core'
import _ from 'lodash'
import { observe } from 'mobx'
import { inject, observer } from 'mobx-react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import babylon from 'prettier/parser-babylon'
import prettier from 'prettier/standalone'
import React from 'react'

import SplashScreen from './components/SplashScreen'
import { RootStore, StoreDef } from './store'
import { EditorStore } from './store/editor'
import style from './style.scss'

class Editor extends React.Component<Props> {
  private editor: monaco.editor.IStandaloneCodeEditor
  private editorContainer: HTMLDivElement

  async componentDidMount() {
    this.setupEditor()
    // tslint:disable-next-line: no-floating-promises
    this.loadTypings()

    observe(this.props.editor, 'currentFile', this.loadFile, true)
  }

  componentWillUnmount() {
    this.editor && this.editor.dispose()
  }

  setupEditor() {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowJs: true,
      typeRoots: ['types']
    })

    monaco.languages.registerDocumentFormattingEditProvider('typescript', {
      async provideDocumentFormattingEdits(model, options, token) {
        const text = prettier.format(model.getValue(), {
          parser: 'babel',
          plugins: [babylon],
          singleQuote: true,
          printWidth: 120,
          trailingComma: 'none',
          semi: false,
          bracketSpacing: true,
          requirePragma: false
        })

        return [
          {
            range: model.getFullModelRange(),
            text
          }
        ]
      }
    })

    this.editor = monaco.editor.create(this.editorContainer, { theme: 'vs-light', automaticLayout: true })
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, this.props.editor.saveChanges)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KEY_N, this.props.createNewAction)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KEY_P, () =>
      this.editor.trigger('', 'editor.action.quickCommand', '')
    )

    this.editor.onDidChangeModelContent(this.handleContentChanged)
    this.editor.onDidChangeModelDecorations(this.handleDecorationChanged)

    this.props.store.editor.setMonacoEditor(this.editor)
  }

  loadFile = () => {
    if (!this.props.editor.currentFile) {
      return
    }

    const { location, readOnly } = this.props.editor.currentFile
    const fileType = location.endsWith('.json') ? 'json' : 'typescript'
    const filepath = fileType === 'json' ? location : location.replace(/\.js$/i, '.ts')

    const uri = monaco.Uri.parse(`bp://files/${filepath}`)

    const oldModel = monaco.editor.getModel(uri)
    if (oldModel) {
      oldModel.dispose()
    }

    const model = monaco.editor.createModel(this.props.editor.fileContentWrapped, fileType, uri)
    this.editor && this.editor.setModel(model)

    this.editor.updateOptions({ readOnly })
    this.editor.focus()
  }

  loadTypings = async () => {
    const typings = await this.props.fetchTypings()

    this.setSchemas(typings)

    _.forEach(typings, (content, name) => {
      if (!name.includes('.schema.')) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, 'bp://types/' + name)
      }
    })
  }

  setSchemas = (typings: any) => {
    const schemas = _.reduce(
      _.pickBy(typings, (content, name) => name.includes('.schema.')),
      (result, content, name) => {
        result.push({
          uri: 'bp://types/' + name,
          schema: JSON.parse(content)
        })
        return result
      },
      []
    )

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      schemas,
      validate: true
    })
  }

  handleContentChanged = () => {
    this.props.editor.updateContent(this.editor.getValue())
  }

  handleDecorationChanged = () => {
    const uri = this.editor.getModel().uri
    const markers = monaco.editor.getModelMarkers({ resource: uri })
    this.props.editor.setFileProblems(markers)
  }

  render() {
    return (
      <React.Fragment>
        {!this.props.editor.isOpenedFile && <SplashScreen rawEditor={this.props.store.useRawEditor} />}
        <div className={style.editorContainer}>
          <div className={style.tabsContainer}>
            <div className={style.tab}>
              <span>{this.props.editor.currentFile && this.props.editor.currentFile.name}</span>

              <div>
                <Tooltip content="Discard" position={Position.RIGHT}>
                  <Icon icon="delete" iconSize={10} className={style.btn} onClick={this.props.editor.discardChanges} />
                </Tooltip>
              </div>
            </div>
          </div>
          <div id="monaco-editor" ref={ref => (this.editorContainer = ref)} className={style.editor} />
        </div>
      </React.Fragment>
    )
  }
}

export default inject(({ store }: { store: RootStore }) => ({
  store,
  createNewAction: store.createNewAction,
  typings: store.typings,
  fetchTypings: store.fetchTypings,
  editor: store.editor
}))(observer(Editor))

type Props = { store?: RootStore; editor?: EditorStore } & Pick<
  StoreDef,
  'typings' | 'fetchTypings' | 'createNewAction'
>
