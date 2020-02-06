const typedoc = require('gulp-typedoc')
const gulp = require('gulp')
const path = require('path')
const exec = require('child_process').exec
const showdown = require('showdown')
const cheerio = require('cheerio')
const fs = require('fs')

const buildRef = () => {
  return gulp.src(['./src/bp/sdk/botpress.d.ts']).pipe(
    typedoc({
      out: './docs/reference/public',
      mode: 'file',
      name: 'Botpress SDK',
      readme: './docs/reference/README.md',
      gaID: 'UA-90034220-1',
      includeDeclarations: true,
      ignoreCompilerErrors: true,
      version: true,
      excludeExternals: true,
      excludePattern: '**/node_modules/**',
      tsconfig: path.resolve(__dirname, '../src/tsconfig.json')
    })
  )
}

const alterReference = async () => {
  const converter = new showdown.Converter()
  const markdown = fs.readFileSync(path.join(__dirname, '../docs/reference/README.md'), 'utf8')
  const html = converter.makeHtml(markdown)

  const original = fs.readFileSync(path.join(__dirname, '../docs/reference/public/modules/_botpress_sdk_.html'), 'utf8')
  const $ = cheerio.load(original)

  $('.container-main .col-content > .tsd-comment')
    .removeClass('tsd-comment')
    .addClass('tsd-typography')
    .html(html)

  const newFile = $.html()

  fs.writeFileSync(path.join(__dirname, '../docs/reference/public/modules/_botpress_sdk_.html'), newFile)

  const hrefsToReplace = ['../enums', '../classes', '../interfaces']
  $('a').map(function () {
    const href = $(this).attr('href')
    if (!href) {
      return;
    }

    if (href.startsWith('_botpress_sdk')) {
      $(this).attr('href', 'modules/' + href)
    }

    if (hrefsToReplace.find(x => href.startsWith(x))) {
      $(this).attr('href', href.replace('../', ''))
    }
  })

  const fixedContentPaths = $.html().replace('../assets/', 'assets/').replace(/\.\.\/globals.html/g, 'globals.html')
  fs.writeFileSync(path.join(__dirname, '../docs/reference/public/index.html'), fixedContentPaths)
}

const buildReference = () => {
  return gulp.series([buildRef, alterReference])
}

const createGuide = cb => {
  const src = 'docs/guide/website'
  exec('yarn && yarn build', { cwd: src }, (err, stdout, stderr) => {
    if (err) {
      console.error(stderr)
      return cb(err)
    }
    cb()
  })
}

const alterGuide = async () => {
  const prioritiesMap = {
    'docs/12': '0.8',
    'docs/11.9': '0.6',
    'docs/11': '0.4'
  }

  const fixPriority = line => {
    const found = Object.keys(prioritiesMap).find(search => line.includes(search))
    return found ? line.replace('<priority>1.0</priority>', `<priority>${prioritiesMap[found]}</priority>`) : line
  }

  const sitemap = path.join(__dirname, '../docs/guide/website/build/botpress-docs/sitemap.xml')
  const fileContent = fs.readFileSync(sitemap, 'utf8')

  const newContent = fileContent
    .replace(/\/docs\/docs\//g, '/docs/')
    .replace('/docs/versions', '/versions')
    .replace('/docs/index', '/docs')
    .split('\n')
    .map(fixPriority)
    .join('\n')

  fs.writeFileSync(sitemap, newContent)
}

const buildGuide = () => {
  return gulp.series([createGuide, alterGuide])
}

const startDevServer = cb => {
  const src = 'docs/guide/website'
  exec('yarn && yarn start', { cwd: src }, (err, stdout, stderr) => {
    if (err) {
      console.error(stderr)
      return cb(err)
    }
    cb()
  })
}

module.exports = {
  buildReference,
  buildGuide,
  startDevServer
}
