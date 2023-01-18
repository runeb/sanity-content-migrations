import {readdir, writeFile} from 'fs/promises'
import path from 'path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient()

// All the files in migrations folder that match the pattern 1234-*.js
async function allMigrations() {
  const dir = path.join(__dirname, 'migrations')
  const files = (await readdir(dir)).filter((file) => file.match(/^[0-9]+-.*\.js$/))
  return files
}

// Save the current version to the dataset This is a document with the id
// 'plugin.migrations' and the shape {current: 1234} We use this document to
// keep track of the current version and to know which migrations to run, up or
// down.
async function saveCurrent(current) {
  await client
    .mutate([
      {
        createOrReplace: {
          _id: 'plugin.migrations',
          _type: 'plugin.migrations',
          current,
        },
      },
    ])
    .then(() => {
      console.debug('saved current version', current)
    })
}

async function pendingUpMigrations(current) {
  const files = (await allMigrations())
    .filter((file) => Number(file.split('-')[0]) > current)
    .sort()
  return files
}

async function pendingDownMigrations(current) {
  const files = (await allMigrations())
    .filter((file) => Number(file.split('-')[0]) <= current)
    .sort()
    .reverse()
  return files
}

async function up(current) {
  console.debug('Current version', current)
  // Get all the migration files in the migrations subfolder
  const files = await pendingUpMigrations(current)
  let lastRan = current
  for (const file of files) {
    const version = Number(file.split('-')[0])
    if (lastRan && lastRan >= version) continue
    const module = await import(path.join(__dirname, 'migrations', file))
    if (module.default.up === undefined) continue
    await module.default
      .up(client)
      .then(() => {
        lastRan = version
      })
      .catch((err) => {
        console.error(err.stack)
      })
  }
  if (lastRan != current) await saveCurrent(lastRan)
}

async function down(current) {
  console.debug('Current version', current)
  const files = await pendingDownMigrations(current)
  let lastRan = current
  console.log(files)
  for (const file of files) {
    const version = Number(file.split('-')[0])
    if (lastRan < version) continue
    const module = await import(path.join(__dirname, 'migrations', file))
    if (module.default.down === undefined) continue
    await module.default
      .down(client)
      .then(() => {
        lastRan = version
      })
      .catch((err) => {
        console.error(err.stack)
      })
  }
  if (lastRan) await saveCurrent(lastRan - 1)
}

async function run() {
  const current = (await client.fetch('*[_id == "plugin.migrations"][0].current')) || 0

  // get the first parameter
  const param = process.argv[2]
  if (param === 'up') {
    await up(current)
  }

  if (param === 'down') {
    await down(current)
  }

  if (param === 'create') {
    // Take in rest of the parameters and make a filename
    const name = process.argv
      .slice(3)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
    // Create a new migration file
    const timestamp = Date.now()
    const filename = `${timestamp}-${name}.js`
    const filepath = path.join(__dirname, 'migrations', filename)
    const template = `// Path: migrations/${filename}
// client is a fully configured sanity client
export const up = async (client) => {
    console.log('up migration')
}
export const down = async (client) => {
    console.log('down migration')
}
`
    // Write the file
    await writeFile(filepath, template)
  }
}

run()
