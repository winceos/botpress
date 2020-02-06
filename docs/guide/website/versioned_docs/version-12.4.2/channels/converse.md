---
id: version-12.4.2-converse
title: Converse API
original_id: converse
---

The Converse API is an easy way to integrate Botpress with any application or any other channels. This API will allow you to speak to your bot and get an answer synchronously.

## Usage (Public API)

`POST /api/v1/bots/{botId}/converse/{userId}` where **userId** is a unique string identifying a user that chats with your bot (**botId**), you can use random string for **userId**, also don't forget to set the `Content-Type` HTTP header to `application/json`.

### Request Body

```json
{
  "type": "text",
  "text": "Hey!"
}
```

## Usage (Debug API)

There's also a secured route (requires authentication to Botpress to consume this API). Using this route, you can include more data to your response by using the `include` query params separated by commas.

### Example

```
POST /api/v1/bots/{botId}/converse/{userId}/secured?include=nlu,state,suggestions,decision
```

Possible options:

- **nlu**: The output of Botpress NLU
- **state**: The state object of the user conversation
- **suggestions**: The reply suggestions made by the modules
- **decision**: The final decision made by the Decision Engine

### API Response

This is a sample of the response given by the `welcome-bot` when its the first time you chat with it.

```json
{
  "responses": [
    {
      "type": "typing",
      "value": true
    },
    {
      "type": "text",
      "markdown": true,
      "text": "May I know your name please?"
    }
  ],
  "nlu": {
    "language": "en",
    "entities": [],
    "intent": {
      "name": "hello",
      "confidence": 1
    },
    "intents": [
      {
        "name": "hello",
        "confidence": 1
      }
    ]
  },
  "state": {}
}
```

## Caveats

Please note that for now this API can't:

- Be used to receive proactive messages (messages initiated by the bot instead of the user)
- Be disabled, throttled or restricted
