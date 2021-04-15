import * as sdk from 'botpress/sdk'
import _ from 'lodash'
import path from 'path'
import Telegraf, { Button, CallbackButton, ContextMessageUpdate, Markup } from 'telegraf'
import Extra from 'telegraf/extra'

import { Clients } from './typings'

const outgoingTypes = ['text', 'typing', 'image', 'login_prompt', 'carousel']

export const sendEvent = async (bp: typeof sdk, botId: string, ctx: ContextMessageUpdate, args: { type: string }) => {
  // NOTE: getUpdate and setWebhook dot not return the same context mapping
  const chatId = `${ctx.chat?.id || ctx.message?.chat.id}`
  const userId = `${ctx.from?.id || ctx.message?.from.id}`

  const payload = ctx.message || ctx.callbackQuery
  const preview = ctx.message.text || ctx.callbackQuery.data

  let convoId: sdk.uuid
  if (chatId) {
    convoId = await bp.experimental.conversations.forBot(botId).getLocalId('telegram', chatId)

    if (!convoId) {
      const conversation = await bp.experimental.conversations.forBot(botId).create(userId)
      convoId = conversation.id

      await bp.experimental.conversations.forBot(botId).createMapping('telegram', conversation.id, chatId)
    }
  } else {
    const conversation = await bp.experimental.conversations.forBot(botId).recent(userId)
    convoId = conversation.id
  }

  await bp.experimental.messages
    .forBot(botId)
    .receive(convoId, { ...args, ...payload }, { channel: 'telegram', preview })
}

export const registerMiddleware = (bp: typeof sdk, outgoingHandler) => {
  bp.events.registerMiddleware({
    description:
      'Sends out messages that targets platform = telegram.' +
      ' This middleware should be placed at the end as it swallows events once sent.',
    direction: 'outgoing',
    handler: outgoingHandler,
    name: 'telegram.sendMessages',
    order: 100
  })
}

export async function setupBot(bp: typeof sdk, botId: string, clients: Clients) {
  const client = clients[botId]

  client.start(async ctx => sendEvent(bp, botId, ctx, { type: 'start' }))
  client.help(async ctx => sendEvent(bp, botId, ctx, { type: 'help' }))
  client.on('message', async ctx => sendEvent(bp, botId, ctx, { type: 'message' }))
  client.on('callback_query', async ctx => sendEvent(bp, botId, ctx, { type: 'callback' }))
  // TODO We don't support understanding and accepting more complex stuff from users such as files, audio etc
}

export async function setupMiddleware(bp: typeof sdk, clients: Clients) {
  registerMiddleware(bp, outgoingHandler)

  async function outgoingHandler(event: sdk.IO.OutgoingEvent, next: sdk.IO.MiddlewareNextCallback) {
    if (event.channel !== 'telegram') {
      return next()
    }

    const client: Telegraf<ContextMessageUpdate> = clients[event.botId]
    if (!client) {
      return next()
    }

    const messageType = event.type === 'default' ? 'text' : event.type
    const chatId =
      (await bp.experimental.conversations.forBot(event.botId).getForeignId('telegram', event.threadId)) || event.target

    if (!_.includes(outgoingTypes, messageType)) {
      return next(new Error(`Unsupported event type: ${event.type}`))
    }

    if (messageType === 'typing') {
      await sendTyping(event, client, chatId)
    } else if (messageType === 'text') {
      await sendTextMessage(event, client, chatId)
    } else if (messageType === 'image') {
      await sendImage(event, client, chatId)
    } else if (messageType === 'carousel') {
      await sendCarousel(event, client, chatId)
    } else {
      // TODO We don't support sending files, location requests (and probably more) yet
      throw new Error(`Message type "${messageType}" not implemented yet`)
    }

    await bp.experimental.messages
      .forBot(event.botId)
      .create(event.threadId, event.payload, undefined, event.id, event.incomingEventId)

    next(undefined, false)
  }
}

async function sendCarousel(event: sdk.IO.Event, client: Telegraf<ContextMessageUpdate>, chatId: string) {
  if (event.payload.elements && event.payload.elements.length) {
    const { title, picture, subtitle } = event.payload.elements[0]
    const buttons = event.payload.elements.map(x => x.buttons)
    if (picture) {
      await client.telegram.sendChatAction(chatId, 'upload_photo')
      await client.telegram.sendPhoto(chatId, { url: picture, filename: path.basename(picture) })
    }
    const keyboard = keyboardButtons<CallbackButton>(buttons)
    await client.telegram.sendMessage(
      chatId,
      `*${title}*\n${subtitle}`,
      Extra.markdown(true).markup(Markup.inlineKeyboard(keyboard))
    )
  }
}

async function sendTextMessage(event: sdk.IO.Event, client: Telegraf<ContextMessageUpdate>, chatId: string) {
  const keyboard = Markup.keyboard(keyboardButtons<Button>(event.payload.quick_replies))
  if (event.payload.markdown !== false) {
    // Attempt at sending with markdown first, fallback to regular text on failure
    await client.telegram
      .sendMessage(chatId, event.preview, Extra.markdown(true).markup({ ...keyboard, one_time_keyboard: true }))
      .catch(() =>
        client.telegram.sendMessage(
          chatId,
          event.preview,
          Extra.markdown(false).markup({ ...keyboard, one_time_keyboard: true })
        )
      )
  } else {
    await client.telegram.sendMessage(
      chatId,
      event.preview,
      Extra.markdown(false).markup({ ...keyboard, one_time_keyboard: true })
    )
  }
}

async function sendImage(event: sdk.IO.Event, client: Telegraf<ContextMessageUpdate>, chatId: string) {
  const keyboard = Markup.keyboard(keyboardButtons<Button>(event.payload.quick_replies))
  if (event.payload.url.toLowerCase().endsWith('.gif')) {
    await client.telegram.sendAnimation(
      chatId,
      event.payload.url,
      Extra.markdown(false).markup({ ...keyboard, one_time_keyboard: true })
    )
  } else {
    await client.telegram.sendPhoto(
      chatId,
      event.payload.url,
      Extra.markdown(false).markup({ ...keyboard, one_time_keyboard: true })
    )
  }
}

async function sendTyping(event: sdk.IO.Event, client: Telegraf<ContextMessageUpdate>, chatId: string) {
  const typing = parseTyping(event.payload.value)
  await client.telegram.sendChatAction(chatId, 'typing')
  await Promise.delay(typing)
}

function parseTyping(typing) {
  if (isNaN(typing)) {
    return 1000
  }

  return Math.max(typing, 500)
}

function keyboardButtons<T>(arr: any[] | undefined): T[] | undefined {
  if (!arr || !arr.length) {
    return undefined
  }

  const rows = arr[0].length ? arr : [arr]

  return rows.map(
    row =>
      row.map(x => {
        if (x.url) {
          return Markup.urlButton(x.title, x.url)
        }

        return Markup.callbackButton(x.title, x.payload || '')
      }) as any
  )
}
