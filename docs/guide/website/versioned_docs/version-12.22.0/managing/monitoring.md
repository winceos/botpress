---
id: version-12.22.0-monitoring
title: Monitoring & Alerting
original_id: monitoring
---

## Server Monitoring

Monitoring is an essential part of any software deployment. Botpress includes, out of the box, a simple but intuitive dashboard
designed to keep an eye on your servers. Key metrics are collected (like CPU and Memory usage), including a couple of botpress-related metrics.

Metric data is collected and stored using a Redis server.

This feature is only available to users of the Pro version.

### Prerequisite

- Botpress Pro must be enabled with a valid license key
- Redis Server must be running (minimum: version 2.8)

### Quick Start

1. Open your `botpress.config.json` file and set `pro.monitoring.enabled` to `true`
2. Set an environment variable named `CLUSTER_ENABLED` to `true`
3. Set another environment variable named `REDIS_URL` which should point to your server (example provided below)
4. Start your Botpress Server

### Configuration

The default values should be good for most situations. They are described in details directly in the [Botpress Config Definition](https://github.com/botpress/botpress/blob/master/src/bp/core/config/botpress.config.ts)

#### Redis Configuration

The environment variable `REDIS_URL` must be constructed like this: `redis://user:pass@hostname:port`
If you start it locally, this should do the trick: `REDIS_URL=redis://localhost:6379`

### Metrics

These metrics are collected for every node of your Botpress Cluster.

- Average % of CPU usage
- Average % of Memory usage
- Number of HTTP requests processed
- Number of incoming events (when users sends messages to the bot)
- Number of outgoing events (anything the bot sends back to users)
- Number of warnings
- Number of errors
- Latency of HTTP requests

## Alerting Service

The alerting service will trigger an alarm when your configured threshold are exceeded.

### Prerequisite

- Botpress Pro must be enabled with a valid license key
- Redis Server must be running (minimum: version 2.8)
- Monitoring must be enabled

### Quick Start

1. Edit `botpress.config.json` and set `pro.alerting.enabled` to `true`
2. Add at least one Incident Rule (more on that below) in `pro.alerting.rules`
3. Restart Botpress

### Incident Rules

This is where you will define your thresholds

Let's see an example of a rule, then we will break it apart

```js
{
  "name": " High CPU Usage ",
  "field": "cpu.usage",
  "aggregation": "avg",
  "operand": "equalOrMoreThan",
  "value": 60,
  "timeframe": "2m",
  "cooldown": "1m"
}
```

This rule can be read like this:

> Raise an alarm if the `average` value of `cpu.usage` is `equal or more than` `60` for `2 minutes`.
> When the incident is resolved, `wait at least one minute` before triggering another alert for the same reason

We use a simple "rolling window" method to calculate results. If your timeframe is 2 minutes and you collect data each 10 seconds, then there will be 12 different "ticks" that will be evaluated each 10 seconds with your chosen aggregation. The value is then compared with your configured threshold.

#### Fields

| Field                | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| cpu.usage            | Average % of CPU usage                                           |
| mem.usage            | Average % of Memory usage                                        |
| mem.free             | Amount of free memory (in KB)                                    |
| requests.count       | Number of HTTP requests processed                                |
| requests.latency_avg | Average latency of HTTP requests                                 |
| requests.latency_sum | The sum of the latency of all HTTP requests                      |
| eventsIn.count       | Number of incoming events (when users sends messages to the bot) |
| eventsOut.count      | Number of outgoing events (anything the bot sends back to users) |
| warnings.count       | Number of warnings                                               |
| errors.count         | Number of errors                                                 |

#### Aggregation

- avg: Average
- sum: Sum
- min: Minimum
- max: Maximum
- last: The last value received from the monitoring service
- count: The number of "ticks" in the timeframe

#### Operands

- equalOrLessThan: Equal or less than =<
- equalOrMoreThan: Equal or more than =>

#### Cooldown

When an incident is resolved, no other incident of the same nature (same name / same host) will be opened until this delay expires.

### Incident & Hook

Now that you have some incident rules, how do you get alerted when something happens? This is where hooks comes in handy. Every time an incident is opened or resolved, Botpress will call the hook `on_incident_status_changed` with the incident as an object. When the property `endTime` is not defined, it means that the incident was opened. When it is set, the incident is resolved.

Here's an example of `data/global/hooks/on_incident_status_changed/alert.js`

```js
async function alertChanged() {
  if (!incident.endTime) {
    console.log('HOOK: Incident Opened:', incident)
  } else {
    console.log('HOOK: Incident Closed:', incident)
  }

  // Here you could send a SMS, an E-mail, etc...
  // await axios.post....
}

return alertChanged()
```

The incident object has these properties:

```js
{
  id: 'A unique ID randomly generated',
  ruleName: 'The name of your incident rule',
  hostName: 'The host name which hosts the Botpress instance',
  startTime: 'Date when the incident was opened',
  endTime: 'When the incident was resolved',
  triggerValue: 'The value that triggered the incident'
}
```

#### Other Rules Examples

Raise an incident when there is more than 10 errors in the last minute

```js
{
  "name": "High number of errors",
  "field": "errors.count",
  "aggregation": "sum",
  "operand": "equalOrMoreThan",
  "value": 10,
  "timeframe": "1m"
}
```

No incoming events for the past 10 minutes

```js
{
  "name": "No more incoming events",
  "field": "eventsIn.count",
  "aggregation": "sum",
  "operand": "equalOrLessThan",
  "value": 0,
  "timeframe": "10m"
},
```
