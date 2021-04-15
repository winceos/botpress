---
id: version-12.19.0-messenger
title: Facebook Messenger
original_id: messenger
---

## Requirements

Messenger requires you to have a Facebook App and a Facebook Page to connect your chatbot to their platform.

### Create a Facebook App
To create a Facebook App, log in to your Facebook account and ensure you have admin rights for the Facebook page to which you want to connect your chatbot.

After that, go to the [Facebook for Developers website](https://developers.facebook.com/), select "My Apps" from the top menu, and create a new app. For more details and assistance, visit the [Facebook developer documentation](https://developers.facebook.com/docs/development)

### Create a Facebook Page
You require if you do not already have a Facebook page to link your chatbot. [You can find details on how to create a new Facebook page here](https://www.facebook.com/pages/creation/).

To link your chatbot to a pre-existing page, you must have an administrator or developer role.

### HTTPS Endpoint to your chatbot
Facebook only integrates its apps and services to secured endpoints. Below are tutorials to help you create an HTTPS endpoint if you do not have one:
  
  - Create an HTTPS tunnel to your machine using Ngrok. [**Tutorial**](https://api.slack.com/tutorials/tunneling-with-ngrok)
  - Using Nginx and Let's Encrypt. This tutorial bases on the Linux Ubuntu 16.04 Operating System. [**Tutorial**](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04)
  - Create an HTTPS tunnel to your machine using Serveo. [**Tutorial**](https://medium.com/automationmaster/how-to-forward-my-local-port-to-public-using-serveo-4979f352a3bf)  

## Setup

### Enable the Messenger Channel

You can do this by opening the file `data/global/botpress.config.json` in a text editor and setting the value to `true` as below. 

```js
"modules": [
  ...
    {
      "location": "MODULES_ROOT/channel-messenger",
      "enabled": true
    },
```

You can also enable the `channel-messenger` module directly from the admin user interface. Go to the module management tab to achieve this.

![Module Management for Messenger](assets/messenger-admin-config.png)

### Get App Secret & Verify Token

#### App Secret
- Go to your Facebook App
- In the left sidebar, expand the Settings menu and select Basic. Here you can find the App ID and App Secret.
- Click on the "Show" button in the "App Secret" text box. You can copy the "App ID" and "App Secret" to use for your Facebook API calls.

#### Verify Token
Set a long string of your own making as a verify token or use a random string generator service like random.org to create a verify token.

## Configurations
The following configurations are required for a connection, enabling you to access your chatbot from your Facebook page. 

While the first three are mandatory, the last three configurations (greeting text, get started, and persistent menu) are not.


### Botpress HTTPS Endpoint 
- Head over to `data/global/config/channel-messenger.json`. If it doesn't exist, restart Botpress Server.

- Set the following properties:
  - `appSecret`. You will find this value on your Facebook App page.
  - `verifyToken`. Use a preferably long and cryptic random string and keep it secret. You'll need to copy/paste this token in the Facebook App portal when setting up your webhook.

- Make sure you have an HTTPS URL pointing to your Botpress Server and set the `EXTERNAL_URL` environment variable as follows:
  - Open `data/global/botpress.config.json` and set the value of the `
httpServer.externalUrl` configuration variable to the complete hostname of your HTTPS endpoint, for example, `https://bot.botpress.com`. The resulting file should be as below:

```json
  {
  "$schema": "../botpress.config.schema.json",
  "httpServer": {
    "host": "localhost",
    "port": 3000,
    "backlog": 0,
    "bodyLimit": "10mb",
    "cors": {
      "enabled": true
    },
    "externalUrl": "https://bot.botpress.com",
```    
   - Restart Botpress Server to reload the configuration

### Individual Chatbot Configuration

Head over to `data/bots/<your_bot>/config/channel-messenger.json` (create the file if it doesn't exist). Insert the following json in the file.

 ```json
{
  "$schema": "../../assets/modules/channel-messenger/config.schema.json",
  "enabled": true,
  "accessToken": "<accessToken>"
}
```

After that, go to `data/bots/global/config/channel-messenger.json` and insert this json code.

```json
{
  "$schema": "../../assets/modules/channel-messenger/config.schema.json",
  "enabled": false,
  "appSecret": "<appSecret>",
  "verifyToken": "<verifyToken>",
  "persistentMenu": [],
  "chatUserAuthDuration": "24h",
  "disabledActions": []
}
```
> **Important:** One bot is connected to **one** facebook page.

You will need to set up the following properties:

- `accessToken` has to be set to your page access token. To obtain this token
  - Go to products in your Facebook App Dashboard's left sidebar.
  - Add Messenger; you should see it added to the left sidebar.
  - Select settings under the sidebar menu item.
  - Add a Facebook page you manage to your App.
  - You should see a generate token button. Click and copy that token to the json file.
- `enabled` has to be set to `true`
- `appSecret`. You will find this value on your Facebook App page.
  - Go to Settings then Basic. Click show and get your app secret.
- `verifyToken`. A secret random string. See the [webhook](#Facebook Webhook) section for details on how to configure your Webhook.

Read the [config definition file](https://github.com/botpress/botpress/blob/master/modules/channel-messenger/src/config.ts) to learn more about configurations.

> All changes to the configuration will take effect on `onBotMount`. To refresh the at runtime, you can disable and enable the chatbot again without restarting the server.

### Facebook Webhook
Messenger will use a webhook that you'll need to register to communicate with your chatbot.

1. In your Facebook app, go to Products > Messenger > Settings > Webhooks > Setup Webhooks
2. Under Callback URL, enter your secured public URL and make sure to point to the `/webhook` endpoint.
3. Paste your `verifyToken` (the random string you generated) in the Verify Token field.
4. Make sure you enable `messages` and `messaging_postbacks` in Subscription Fields.

> **⭐ Note**: When you set up your webhook, Messenger requires a **secured public** address. To test on localhost, we recommend using services like [pagekite](https://pagekite.net/), [ngrok](https://ngrok.com) or [tunnelme](https://localtunnel.github.io/www/) to expose your server.

### Greeting Text
```json
"greeting": "Hello, I'm your chatbot!"
```

Your chatbot's Messenger profile's greeting property allows you to specify the greeting message people will see on your chatbot's welcome screen. Your chatbot will display the welcome screen for people interacting with your chatbot for the first time.

Read more about [greeting](https://developers.facebook.com/docs/messenger-platform/reference/messenger-profile-api/greeting).

### Get Started
```json
"getStarted": "<GET_STARTED_PAYLOAD>"
```

The Get Started button will allow you to send a pro-active message to your chat with the user. The Page Messenger welcome screen displays this Get Started button. When clicked, this button the Messenger Platform will send a messaging_postbacks event to your webhook. You can also configure a greeting message after you add the "Get Started" button. 

Read more about [get started](https://developers.facebook.com/docs/messenger-platform/reference/messenger-profile-api/get-started-button).

### Persistent Menu
The persistent menu allows you to have an always-on user interface element inside Messenger conversations. It is an easy way to help people discover and access your Messenger chatbot's core functionality at any point in the conversation.

Read more about persistent menu [here](https://developers.facebook.com/docs/messenger-platform/send-messages/persistent-menu).

> The persistent menu is cached locally on the user's client, with updates fetched periodically. If you change the persistent menu, it can take some time for the menu to update. You can force a refresh by deleting the conversation and starting a new one.

**Persistent Menu object example**:

```json
 "persistentMenu": [
    {
      "locale": "default",
      "call_to_actions": [
        {
          "title": "My Account",
          "type": "nested",
          "call_to_actions": [
            {
              "title": "Pay Bill",
              "type": "postback",
              "payload": "PAYBILL_PAYLOAD"
            },
            {
              "type": "web_url",
              "title": "Latest News",
              "url": "https://www.messenger.com/",
              "webview_height_ratio": "full"
            }
          ]
        }
      ]
    }
  ]
```
