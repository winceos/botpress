import _ from 'lodash'

const moveElement = (array, from, to) => {
  const item = array[from]
  const diff = from - to

  if (diff > 0) {
    return [...array.slice(0, to), item, ...array.slice(to, from), ...array.slice(from + 1, array.length)]
  } else if (diff < 0) {
    return [...array.slice(0, from), ...array.slice(from + 1, to + 1), item, ...array.slice(to + 1, array.length)]
  } else {
    return array
  }
}

const textToItemId = text => text && _.get(text.match(/^say #!(.*)$/), '[1]')

const extractContentType = text =>
  (text && _.get(text.match(/^say #!(.*)-.*$/), '[1]')) || text.replace('say', '').trim()

const extractActionDetails = text => {
  const action = text.trim()

  if (action.indexOf(' ') >= 0) {
    const tokens = action.split(' ')
    //const params = item.includes(' ') ? JSON.parse(item.substring(item.indexOf(' ') + 1)) : {}
    return {
      name: _.head(tokens),
      params: JSON.parse(_.tail(tokens).join(' '))
    }
  }
}

const isAction = item => typeof item !== 'string' || !item.startsWith('say ')

export { moveElement, textToItemId, extractContentType, extractActionDetails, isAction }
