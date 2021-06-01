import * as sdk from 'botpress/sdk'
import { UserProfile } from 'common/typings'

// TODO fix this and use those from common/typings
declare global {
  interface Window {
    botpressWebChat: {
      init: (config: any, containerSelector?: string) => void
      sendEvent: (payload: any, webchatId?: string) => void
    }
    BOT_ID: string
    BP_STORAGE: any
    ROOT_PATH: string
  }
}
export interface AuthRule {
  res: string
  op: string
}

export type IAgent = sdk.WorkspaceUserWithAttributes & {
  agentId: string
  online: boolean
  attributes: Partial<{ firstname: string; lastname: string; picture_url: string }>
}

export type AgentWithPermissions = IAgent & UserProfile

export type HandoffStatus = 'pending' | 'assigned' | 'resolved'
export interface IHandoff {
  id: string
  botId: string
  agentId?: string
  userId: string
  status: HandoffStatus
  userChannel: string
  userThreadId: string
  agentThreadId: string
  userConversation: IEvent
  comments: IComment[]
  tags: string[]
  user: IUser
  assignedAt?: Date
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface IUserAttributes extends Object {
  timezone: string
  language: string
  email: string
  [key: string]: any
}

export interface IUser {
  id: string
  attributes: IUserAttributes
}

export type IEvent = {
  event: string | sdk.IO.Event
} & sdk.IO.StoredEvent

export interface IComment {
  id: string
  agentId: string
  handoffId: string
  threadId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface ISocketMessage {
  payload: any
  resource: string
  type: string
  id: string
}
