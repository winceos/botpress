import axios, { AxiosInstance } from 'axios'
import chalk from 'chalk'
import followRedirects from 'follow-redirects'
import fse from 'fs-extra'
import glob from 'glob'
import _ from 'lodash'
import path from 'path'
import rimraf from 'rimraf'

import { extractArchive } from './core/misc/archive'
import { createArchiveFromFolder } from './core/misc/archive'
import { bytesToString } from './core/misc/utils'
import { asBytes } from './core/misc/utils'
import { BpfsScopedChange, FileChange } from './core/services'

// This is a dependency of axios, and sets the default body limit to 10mb. Need it to be higher
followRedirects.maxBodyLength = asBytes('500mb')

// If the push will cause one of these actions, then a force will be required
const blockingActions = ['del', 'edit']

/**
 * These files must be ignored when pushing them to the remote host.
 * assets and models are auto-generated and .js.map files are not required
 */
const pushedArchiveIgnoredFiles = ['assets/**/*', 'bots/*/models/**', '**/*.js.map']

interface ProcessedChanges {
  localFiles: string[]
  blockingChanges: FileChange[]
  changeList: FileChange[]
}

class BPFS {
  private serverUrl: string
  private authToken: string
  private targetDir: string
  private sourceDir: string

  constructor(args, action: string) {
    this.serverUrl = args.url.replace(/\/+$/, '')
    this.authToken = args.authToken
    this.targetDir = args.targetDir && path.resolve(args.targetDir)
    this.sourceDir = args.sourceDir && path.resolve(args.sourceDir)

    if (!this.serverUrl || !this.authToken || !this.authToken.length) {
      this._endWithError(`Missing parameter "url" or "authToken"`)
    }

    if (action === 'pull' && !this.targetDir) {
      this._endWithError(`Target directory is not valid: "${this.targetDir}"`)
    }

    if (action === 'push' && !this.sourceDir) {
      this._endWithError(`Source directory must be set: "${this.sourceDir}"`)
    }
  }

  async pullChanges() {
    const cleanBefore = process.argv.includes('--clean')
    const axiosClient = this._getPullAxiosClient()
    const dryRun = process.argv.includes('--dry')

    try {
      // We clear only those two folders, so assets are preserved
      if (cleanBefore) {
        console.log(chalk.blue(`Cleaning data folder before pulling data...`))
        await this._clearDir(path.join(this.targetDir, 'global'))
        await this._clearDir(path.join(this.targetDir, 'bots'))
      } else if (fse.existsSync(this.targetDir)) {
        const fileCount = await this._filesCount(this.targetDir)
        console.log(chalk.blue(`Remote files will be pulled in an existing folder containing ${fileCount} files`))
      }

      console.log(chalk.blue(`Pulling all remote changes from ${this.serverUrl} to ${this.targetDir} ...`))

      const { data: archive } = await axiosClient.get('export')
      if (dryRun) {
        console.log(chalk.yellow(`Dry run completed. Successfully downloaded archive.`))
        return process.exit()
      }

      console.log(
        chalk.blue(`Extracting archive to local file system... (archive size: ${bytesToString(archive.length)}`)
      )

      await extractArchive(archive, this.targetDir)

      const fileCount = await this._filesCount(this.targetDir)
      console.log(chalk.green(`Successfully extracted ${fileCount} files from the remote server!`))
    } catch (err) {
      const error = err.response ? `${err.response.statusText} (${err.response.status})` : err.message
      this._endWithError(`Could not pull changes: ${error}`)
    }
  }

  async pushChanges() {
    const useForce = process.argv.includes('--force')
    const dryRun = process.argv.includes('--dry')
    const keepRevisions = process.argv.includes('--keep-revisions')

    if (!fse.existsSync(this.sourceDir)) {
      this._endWithError(`Specified folder "${this.sourceDir}" doesn't exist.`)
    }

    try {
      console.log(chalk.blue(`Preparing an archive of your local files from ${this.sourceDir}...`))

      const archive = await createArchiveFromFolder(this.sourceDir, pushedArchiveIgnoredFiles)
      const axiosClient = this._getPushAxiosClient(archive.length)

      console.log(
        chalk.blue(`Sending archive to server for comparison... (archive size: ${bytesToString(archive.length)})`)
      )
      const { data } = await axiosClient.post('changes', archive)
      const { changeList, blockingChanges, localFiles } = this._processChanges(data)

      if (_.isEmpty(blockingChanges) || useForce) {
        this._printChangeList(changeList)

        if (dryRun) {
          console.log(chalk.yellow(`Dry run completed. Nothing was pushed to server`))
          return process.exit()
        }

        console.log(chalk.blue(`Pushing local changes to ${this.serverUrl}... ${useForce ? '(using --force)' : ''}`))

        await axiosClient.post('update', archive)

        if (!keepRevisions) {
          await this._clearRevisions(this.sourceDir)
        }

        console.log(
          chalk.green(
            `Successfully pushed ${localFiles.length} local file${localFiles.length === 1 ? '' : 's'} to remote server!`
          )
        )
      } else {
        this._printOutOfSync()
        this._printChangeList(changeList)
        console.log(chalk.red(`Nothing was pushed on the remote server.`))
      }
    } catch (err) {
      const error = err.response ? `${err.response.statusText} (${err.response.status})` : err.message
      this._endWithError(`Could not push changes: ${error}`)
    }
  }

  private async _clearRevisions(directory: string) {
    return Promise.fromCallback(cb =>
      glob('**/revisions.json', { cwd: directory }, (err, files) => {
        files.map(f => fse.removeSync(path.resolve(directory, f)))
        cb(err)
      })
    )
  }

  private async _filesCount(directory: string): Promise<number> {
    const files: string[] = await Promise.fromCallback(cb =>
      glob('**/*', { cwd: directory, nodir: true, dot: true }, cb)
    )
    return files.length
  }

  private _processChanges(data: BpfsScopedChange[]): ProcessedChanges {
    const changeList = _.flatten(data.map(x => x.changes))
    return {
      localFiles: _.flatten(data.map(x => x.localFiles)),
      blockingChanges: changeList.filter(x => blockingActions.includes(x.action)),
      changeList
    }
  }

  private _getPushAxiosClient(archiveSize: number): AxiosInstance {
    return axios.create({
      baseURL: `${this.serverUrl}/api/v1/admin/versioning`,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/tar+gzip',
        'Content-Disposition': `attachment; filename=archive_${Date.now()}.tgz`,
        'Content-Length': archiveSize
      }
    })
  }

  private _getPullAxiosClient(): AxiosInstance {
    return axios.create({
      baseURL: `${this.serverUrl}/api/v1/admin/versioning`,
      headers: {
        Authorization: `Bearer ${this.authToken}`
      },
      responseType: 'arraybuffer'
    })
  }

  private async _clearDir(destination: string): Promise<void> {
    if (fse.existsSync(destination)) {
      return Promise.fromCallback(cb => rimraf(destination, cb))
    }
  }

  private _printLine({ action, path, add, del }): string {
    if (action === 'add') {
      return chalk.green(` + ${path}`)
    } else if (action === 'del') {
      return chalk.red(` - ${path}`)
    } else if (action === 'edit') {
      return ` o ${path} (${chalk.green('+' + add)} / -${chalk.redBright(del)})`
    }
    return ''
  }

  private _printOutOfSync() {
    console.log(`
${chalk.yellow('Conflict warning')}
Remote has changes that are not synced to your environment.
Backup your changes and use "pull" to get those changes on your file system.`)

    console.log(`
Use ${chalk.yellow('--force')} to overwrite remote changes with yours.
`)
  }

  private _printChangeList(changes) {
    if (!changes.length) {
      return
    }

    const lines = _.orderBy(changes, 'action')
      .map(this._printLine)
      .join('\n')

    return console.log(`
Differences between ${chalk.green('local')} and ${chalk.red('remote')} changes

${lines}
`)
  }

  private _endWithError(message: string) {
    console.log(chalk.red(`${chalk.bold('Error:')} ${message}`))
    process.exit()
  }
}

export default async (argv, action) => {
  const bpfs = new BPFS(argv, action)
  console.log(`\n`)
  if (action === 'pull') {
    await bpfs.pullChanges()
  } else if (action === 'push') {
    await bpfs.pushChanges()
  }
  console.log(`\n`)
}
