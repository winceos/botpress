import { BotDetails, Flow, FlowNode, IO, RolloutStrategy, StageRequestApprovers, StrategyUser } from 'botpress/sdk'
import { Request } from 'express'

import { BotpressConfig } from '../core/config/botpress.config'
import { LicenseInfo, LicenseStatus } from './licensing-service'

export interface IDisposeOnExit {
  disposeOnExit(): void
}

export interface IInitializeFromConfig {
  initializeFromConfig(config: BotpressConfig): void
}

export interface UniqueUser {
  email: string
  strategy: string
}

export interface CreatedUser {
  email: string
  tempPassword: string
}

export interface AuthStrategyConfig {
  strategyType: string
  strategyId: string
  loginUrl?: string
  registerUrl?: string
  label?: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  audience: 'internal' | 'external'
  roles: AuthRole[]
  defaultRole: string
  adminRole: string
  bots: string[]
  pipeline: Pipeline
  rolloutStrategy: RolloutStrategy
}

export type CreateWorkspace = Pick<Workspace, 'id' | 'name' | 'description' | 'audience'> & {
  pipelineId: string
}

export interface AuthRule {
  res: string
  op: string
}

export interface AuthRole {
  id: string
  name: string
  description: string
  rules: Array<AuthRule>
}

export interface TokenUser {
  email: string
  strategy: string
  tokenVersion: number
  isSuperAdmin: boolean
  csrfToken?: string
  exp?: number
  iat?: number
}

export interface StoredToken {
  token: string
  expiresAt: number
  issuedAt: number
}

export interface TokenResponse {
  jwt: string
  csrf: string
  exp: number
}

export type RequestWithUser = Request & {
  tokenUser?: TokenUser
  authUser?: StrategyUser
  workspace?: string
}

export interface Bot {
  id: string
  name: string
  description: string
  category?: string
  disabled?: boolean
  private?: boolean
  details?: BotDetails
  version?: string
  author?: string
  license?: string
  created_at: string
  updated_at: string
}

export type Pipeline = Stage[]

export type StageAction = 'promote_copy' | 'promote_move'

export interface Stage {
  id: string
  label: string
  action: StageAction
  reviewers: StageRequestApprovers[]
  minimumApprovals: number
  reviewSequence: 'serial' | 'parallel'
}

export interface UserProfile {
  email: string
  isSuperAdmin: boolean
  strategyType: string
  strategy: string
  firstname?: string
  lastname?: string
  picture_url?: string
  fullName: string
  permissions: AuthRule[] | undefined
}

export interface FlowMutex {
  lastModifiedBy: string
  lastModifiedAt: Date
  remainingSeconds?: number // backend calculate this because all clients time might be wrong
}

export type FlowView = Flow & {
  nodes: NodeView[]
  links: NodeLinkView[]
  currentMutex?: FlowMutex
}

export interface NodeLinkView {
  source: string
  target: string
  points: FlowPoint[]
}

export interface FlowPoint {
  x: number
  y: number
}

export type NodeView = FlowNode & FlowPoint

export interface ServerConfig {
  config: BotpressConfig
  env: { [keyName: string]: string }
  live: { [keyName: string]: string }
}

export interface NodeProblem {
  nodeName: string
  missingPorts: any
}

export interface ChatUserAuth {
  sessionId: string
  botId: string
  signature: string
}

export interface AuthPayload {
  /** User is considered authenticated until that date (duration is determined per channel) */
  authenticatedUntil?: Date
  /** An authorized user has an access (any) to the workspace the bot is part of */
  isAuthorized?: boolean
  /** User must provide a valid invite code before he's added to the workspace & authorized */
  inviteRequired?: boolean
  identity?: TokenUser
}

export interface ModuleInfo {
  name: string
  fullName?: string
  description?: string
  /** Archived modules must be unpacked before information is available */
  archived?: boolean
  /** The location of the module as listed in botpress config */
  location: string
  /** The complete location of the module */
  fullPath: string
  enabled: boolean
  status?: 'stable' | 'experimental'
}

export interface LibraryElement {
  contentId: string
  type: 'say_something' | 'execute'
  preview: string
  path: string
}

export interface OutgoingEventCommonArgs {
  event: IO.Event
  // Any other additional property
  [property: string]: any
}

export interface EventCommonArgs {
  event: IO.IncomingEvent
  user: { [attribute: string]: any }
  temp: { [property: string]: any }
  bot: { [property: string]: any }
  session: IO.CurrentSession
  workflow: IO.WorkflowHistory
  // Any other additional property
  [property: string]: any
}

export interface ServerHealth {
  serverId: string
  hostname: string
  bots: { [botId: string]: BotHealth }
}

export interface BotHealth {
  status: 'healthy' | 'unhealthy' | 'disabled'
  errorCount: number
  criticalCount: number
  warningCount: number
}

export interface ActionServer {
  id: string
  baseUrl: string
}

export type ActionScope = 'bot' | 'global'

export interface ActionDefinition {
  name: string
  category: string
  description: string
  author: string
  params: ActionParameterDefinition[]
}

export type LocalActionDefinition = ActionDefinition & {
  title: string
  scope: ActionScope
  legacy: boolean
  hidden: boolean
}

export interface ActionParameterDefinition {
  name: string
  description: string
  required: boolean
  type: string
  default: any
}

export type ActionServerWithActions = ActionServer & {
  actions: ActionDefinition[] | undefined
}

export type LicensingStatus = {
  isPro: boolean
  isBuiltWithPro: boolean
  fingerprints: {
    cluster_url: string
  }
  license?: LicenseInfo
} & LicenseStatus
