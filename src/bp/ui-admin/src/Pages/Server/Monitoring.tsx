import { calculateOverviewForHost, groupEntriesByTime, mergeEntriesByTime } from 'common/monitoring'
import _ from 'lodash'
import moment from 'moment'
import ms from 'ms'
import React, { Component, Fragment } from 'react'
import { IoIosArchive } from 'react-icons/io'
import { connect } from 'react-redux'
import Select from 'react-select'
import { Col, Jumbotron, Label, Row } from 'reactstrap'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { fetchBotHealth } from '~/reducers/bots'
import PageContainer from '~/App/PageContainer'

import { fetchStats, refreshStats } from '../../reducers/monitoring'
import CheckRequirements from '../Components/CheckRequirements'
import LoadingSection from '../Components/LoadingSection'
import ChartTooltip from '../Components/Monitoring/ChartTooltip'
import SummaryTable from '../Components/Monitoring/SummaryTable'

import BotHealth from './BotHealth'

const timeFrameOptions = [
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '10m', label: '10 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '2h', label: '2 hours' },
  { value: '5h', label: '5 hours' }
]

const resolutionOptions = [
  { value: '10s', label: '10 seconds' },
  { value: '30s', label: '30 seconds' },
  { value: '1m', label: '1 minutes' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' }
]

const tickSize = { fontSize: 11 }

interface Props {
  loading: boolean
  rawStats: any
  fetchStats: any
  refreshStats: any
  fetchBotStatus: () => void
}

interface State {
  intervalId: any
  timeFrame: any
  resolution: any
  rawStats: any
  preparedStats: any
  timeFrameOptions: any
  lastUniqueEntries: any
  uniqueHosts: any
  autoRefresh: boolean
  error: string | null
}

class Monitoring extends Component<Props, State> {
  state: State = {
    intervalId: null,
    timeFrame: null,
    resolution: null,
    rawStats: null,
    preparedStats: null,
    timeFrameOptions,
    lastUniqueEntries: null,
    error: null,
    uniqueHosts: null,
    autoRefresh: false
  }

  componentDidMount() {
    this.setState({ timeFrame: timeFrameOptions[3], resolution: _.head(resolutionOptions) }, this.queryData)
  }

  componentWillUnmount() {
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId)
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.rawStats !== this.props.rawStats) {
      this.prepareForDisplay()
    }
  }

  async queryData() {
    if (!this.state.timeFrame) {
      return
    }

    try {
      const fromTime = moment()
        .subtract(ms(this.state.timeFrame.value))
        .toDate()
        .getTime()

      const toTime = moment()
        .toDate()
        .getTime()

      this.props.fetchStats(fromTime, toTime)
    } catch (error) {
      this.setState({ error: error.message })
    }
  }

  prepareForDisplay() {
    if (!this.props.rawStats || !this.props.rawStats.length) {
      return
    }

    const lastUniqueEntries = _.sortBy(_.uniqBy(_.orderBy(this.props.rawStats, ['ts'], ['desc']), 'host'), 'host')
    const uniqueHosts = _.map(lastUniqueEntries, 'host')
    this.setState({ uniqueHosts, lastUniqueEntries })

    // Group results by interval, then calculates total and average
    const grouped = groupEntriesByTime(this.props.rawStats, this.state.resolution.value)
    if (grouped) {
      const merged = mergeEntriesByTime(grouped, uniqueHosts)
      this.setState({ preparedStats: merged })
    }
  }

  handleTimeFrameChanged = timeFrame => this.setState({ timeFrame }, this.queryData)
  handleResolutionChanged = resolution => this.setState({ resolution }, this.queryData)

  handleAutoRefreshChanged = event => {
    const autoRefresh = event.target.checked
    let intervalId: any = undefined

    if (autoRefresh && !this.state.intervalId) {
      intervalId = setInterval(() => this.refreshStats(), 10000)
    } else if (!autoRefresh && this.state.intervalId) {
      clearInterval(this.state.intervalId)
    }
    this.setState({ autoRefresh, intervalId })
  }

  renderTooltip = ({ active, payload, label }) => {
    if (active && payload) {
      return <ChartTooltip payload={payload} uniqueHosts={this.state.uniqueHosts} date={label} />
    }
  }

  refreshStats() {
    this.props.refreshStats()
    this.props.fetchBotStatus()
  }

  renderOverview() {
    const hosts: any[] = []

    this.state.lastUniqueEntries.forEach(entry => {
      hosts.push({
        host: entry.host,
        uptime: entry.uptime,
        ...calculateOverviewForHost(_.filter(this.props.rawStats, f => f.host === entry.host))
      })
    })

    return <SummaryTable data={hosts} />
  }

  renderCpu() {
    return (
      <ResponsiveContainer height={300}>
        <LineChart data={this.state.preparedStats}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" tickFormatter={val => moment(val).format('HH:mm')} scale="time" tick={tickSize} />
          <YAxis domain={[0, 100]} unit="%" tick={tickSize} width={50} />
          <YAxis yAxisId="r" orientation="right" width={30} />
          <Tooltip content={this.renderTooltip} />
          <Legend />

          <Line
            name="Memory Usage"
            dataKey="summary.mem.usage"
            unit="%"
            stroke="#1C4E80"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            name="CPU Usage"
            dataKey="summary.cpu.usage"
            unit="%"
            stroke="#0091D5"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  renderMeasures() {
    return (
      <ResponsiveContainer height={300}>
        <ComposedChart data={this.state.preparedStats}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" tickFormatter={val => moment(val).format('HH:mm')} tick={tickSize} />
          <YAxis yAxisId="l" domain={[0, 'dataMax']} tick={tickSize} width={50} />
          <YAxis yAxisId="r" domain={[0, 'dataMax']} tick={tickSize} width={30} orientation="right" />
          <Tooltip content={this.renderTooltip} />
          <Legend />
          <Bar stackId="stack" yAxisId="l" name="HTTP Requests" dataKey="summary.requests.count" fill="#1C4E80" />
          <Bar stackId="stack" yAxisId="l" name="Events In" dataKey="summary.eventsIn.count" fill="#7E909A" />
          <Bar stackId="stack" yAxisId="l" name="Events Out" dataKey="summary.eventsOut.count" fill="#6AB187" />
          <Line
            yAxisId="r"
            name="Warnings"
            dataKey="summary.warnings.count"
            stroke="#DBAE58"
            strokeWidth={2}
            dot={false}
          />
          <Line yAxisId="r" name="Errors" dataKey="summary.errors.count" stroke="#AC3E31" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  renderCharts() {
    if (!this.state.preparedStats) {
      return null
    }

    return (
      <div className="monitoring">
        <Row>
          <Col md={6}>
            <h5>CPU & Memory Usage (average)</h5>
            {this.renderCpu()}
          </Col>
          <Col md={6}>
            <h5>Metrics (total)</h5>
            {this.renderMeasures()}
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <h5>Overview</h5>
            {this.renderOverview()}
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <h5>Bot Health</h5>
            <BotHealth />
          </Col>
        </Row>
      </div>
    )
  }

  renderHeader() {
    const reactSelectStyle = {
      control: base => ({ ...base, minHeight: 30 }),
      dropdownIndicator: base => ({ ...base, padding: 4 }),
      clearIndicator: base => ({ ...base, padding: 4 }),
      valueContainer: base => ({ ...base, padding: '0px 6px' }),
      input: base => ({ ...base, margin: 0, padding: 0 })
    }

    return (
      <div className="monitoring-toolbar">
        <div className="monitoring-toolbar-item" style={{ marginLeft: 'auto' }}>
          <strong>Time Frame</strong>
          <Select
            styles={reactSelectStyle}
            options={timeFrameOptions}
            value={this.state.timeFrame}
            onChange={this.handleTimeFrameChanged}
            isSearchable={false}
          />
        </div>
        <div className="monitoring-toolbar-item">
          <strong>Resolution</strong>
          <Select
            styles={reactSelectStyle}
            options={resolutionOptions}
            value={this.state.resolution}
            onChange={this.handleResolutionChanged}
            isSearchable={false}
          />
        </div>
        <div>
          <strong>Auto-Refresh</strong>
          <br />
          <Label>
            <input
              style={{ marginTop: 8 }}
              name="autoRefresh"
              type="checkbox"
              checked={this.state.autoRefresh}
              onChange={this.handleAutoRefreshChanged}
            />{' '}
            <strong>Enabled</strong>
          </Label>
        </div>
      </div>
    )
  }

  renderNoStats() {
    return (
      <Jumbotron>
        <Row>
          <Col style={{ textAlign: 'center' }} sm="12" md={{ size: 8, offset: 2 }}>
            <h1>
              <IoIosArchive />
              &nbsp; Monitoring is enabled, however there is no statistics to display.
            </h1>
            <p>
              Make sure your Redis configuration is correct (and that you have restarted the server if you just made the
              change).
            </p>
          </Col>
        </Row>
      </Jumbotron>
    )
  }

  renderChild() {
    if (this.props.loading) {
      return <LoadingSection />
    }

    if (!this.props.rawStats || !this.props.rawStats.length) {
      return this.renderNoStats()
    }

    return (
      <Fragment>
        {this.renderHeader()}
        {this.renderCharts()}
      </Fragment>
    )
  }

  render() {
    return (
      <PageContainer title="Server Monitoring" fullWidth={true} superAdmin={true}>
        <CheckRequirements requirements={['redis', 'pro']} feature="monitoring">
          {this.renderChild()}
        </CheckRequirements>
      </PageContainer>
    )
  }
}

const mapStateToProps = state => ({
  rawStats: state.monitoring.stats,
  lastDate: state.monitoring.lastDate,
  loading: state.monitoring.loading
})

const mapDispatchToProps = { fetchStats, refreshStats, fetchBotStatus: fetchBotHealth }

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Monitoring)
