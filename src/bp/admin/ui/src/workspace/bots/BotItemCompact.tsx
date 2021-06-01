import {
  AnchorButton,
  Button,
  Icon,
  Intent,
  Menu,
  MenuItem,
  Popover,
  PopoverInteractionKind,
  Position,
  Tag,
  Tooltip
} from '@blueprintjs/core'
import { BotConfig, ModuleDefinition } from 'botpress/sdk'
import { lang } from 'botpress/shared'
import cx from 'classnames'
import React, { FC } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import AccessControl, { isChatUser, isOperationAllowed } from '~/auth/AccessControl'
import { NeedsTrainingWarning } from './NeedsTrainingWarning'
import style from './style.scss'
import { WorkspaceAppItems } from './WorkspaceAppItems'

interface Props {
  bot: BotConfig
  hasError: boolean
  loadedModules: ModuleDefinition[]
  deleteBot?: () => void
  exportBot?: () => void
  createRevision?: () => void
  rollback?: () => void
  reloadBot?: () => void
  viewLogs?: () => void
}

const BotItemCompact: FC<Props> = ({
  bot,
  hasError,
  loadedModules,
  deleteBot,
  exportBot,
  createRevision,
  rollback,
  reloadBot,
  viewLogs
}) => {
  const botShortLink = `${window.location.origin + window['ROOT_PATH']}/s/${bot.id}`
  const botStudioLink = isChatUser() ? botShortLink : `studio/${bot.id}`
  const nluModuleEnabled = !!loadedModules.find(m => m.name === 'nlu')
  const hasStudioAccess = isOperationAllowed({ resource: 'studio', operation: 'read' })

  return (
    <div className={cx('bp_table-row', style.tableRow)} key={bot.id}>
      <div className={cx('actions', style.actions)}>
        {hasError && (
          <AnchorButton text={lang.tr('admin.workspace.bots.item.reload')} icon="refresh" onClick={reloadBot} minimal />
        )}

        <AccessControl resource="admin.bots.*" operation="write">
          <Button
            text={lang.tr('admin.workspace.bots.item.config')}
            icon="cog"
            minimal
            onClick={() => (location.href = `${botStudioLink}/config`)}
          />
        </AccessControl>

        {!bot.disabled && !hasError && (
          <AnchorButton
            text={lang.tr('admin.workspace.bots.item.openChat')}
            icon="chat"
            href={botShortLink}
            target="_blank"
            minimal
          />
        )}

        <AccessControl resource="admin.bots.*" operation="read">
          <Popover minimal position={Position.BOTTOM} interactionKind={PopoverInteractionKind.HOVER}>
            <Button id="btn-menu" icon={<Icon icon="menu" />} minimal />

            <Menu>
              <WorkspaceAppItems loadedModules={loadedModules} botId={bot.id} />

              {!bot.disabled && !hasError && hasStudioAccess && (
                <MenuItem
                  disabled={bot.locked}
                  icon="edit"
                  text={lang.tr('admin.workspace.bots.item.editInStudio')}
                  href={botStudioLink}
                />
              )}

              <CopyToClipboard text={botShortLink} onCopy={() => lang.tr('admin.workspace.bots.item.copyToClipboard')}>
                <MenuItem icon="link" text={lang.tr('admin.workspace.bots.item.copyLinkToClipboard')} />
              </CopyToClipboard>

              <AccessControl resource="admin.logs" operation="read">
                <MenuItem
                  text={lang.tr('admin.workspace.bots.item.viewLogs')}
                  icon="manual"
                  id="btn-viewLogs"
                  onClick={viewLogs}
                />
              </AccessControl>

              <AccessControl resource="admin.bots.*" operation="write">
                <MenuItem
                  text={lang.tr('admin.workspace.bots.item.createRevision')}
                  icon="cloud-upload"
                  id="btn-createRevision"
                  onClick={createRevision}
                />
                <MenuItem
                  text={lang.tr('admin.workspace.bots.item.rollback')}
                  icon="undo"
                  id="btn-rollbackRevision"
                  onClick={rollback}
                />
              </AccessControl>
              <AccessControl resource="admin.bots.archive" operation="read">
                <MenuItem
                  text={lang.tr('admin.workspace.bots.item.export')}
                  icon="export"
                  id="btn-export"
                  onClick={exportBot}
                />
              </AccessControl>
              <AccessControl resource="admin.bots.*" operation="write">
                <MenuItem
                  text={lang.tr('admin.workspace.bots.item.delete')}
                  icon="trash"
                  id="btn-delete"
                  onClick={deleteBot}
                />
              </AccessControl>
            </Menu>
          </Popover>
        </AccessControl>
      </div>

      <div className={style.title}>
        {bot.locked && (
          <span>
            <Icon icon="lock" intent={Intent.PRIMARY} iconSize={13} />
            &nbsp;
          </span>
        )}

        {hasStudioAccess ? <a href={botStudioLink}>{bot.name || bot.id}</a> : <span>{bot.name || bot.id}</span>}

        {/*
          TODO: remove this NeedsTrainingWarning component.
          This is a temp fix but won't be usefull after we bring back training on bot mount.
          */}
        <AccessControl resource="module.nlu" operation="write">
          {nluModuleEnabled && <NeedsTrainingWarning bot={bot.id} languages={bot.languages} />}
        </AccessControl>

        {!bot.defaultLanguage && (
          <Tooltip position="right" content={lang.tr('admin.workspace.bots.item.languageIsMissing')}>
            <Icon icon="warning-sign" intent={Intent.DANGER} style={{ marginLeft: 10 }} />
          </Tooltip>
        )}

        {bot.disabled && (
          <Tag intent={Intent.WARNING} className={style.botbadge}>
            disabled
          </Tag>
        )}
        {bot.private && (
          <Tag intent={Intent.PRIMARY} className={style.botbadge}>
            private
          </Tag>
        )}
        {hasError && (
          <Tag intent={Intent.DANGER} className={style.botbadge}>
            error
          </Tag>
        )}
      </div>
      <p>{bot.description}</p>
    </div>
  )
}

export default BotItemCompact
