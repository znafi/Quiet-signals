import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

function loadEnvFile(path) {
  let contents

  try {
    contents = readFileSync(path, 'utf8')
  } catch {
    return
  }

  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const [key, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '')
    process.env[key.trim()] ??= value
  }
}

function loadDefaultQuizContent() {
  const scenariosPath = resolve(repoRoot, 'lib/quiet-signals/scenarios.ts')
  const source = readFileSync(scenariosPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  })

  const require = createRequire(import.meta.url)
  const module = { exports: {} }
  const evaluate = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled.outputText)
  evaluate(module.exports, require, module, scenariosPath, dirname(scenariosPath))

  return module.exports.DEFAULT_QUIZ_CONTENT
}

function getFirebaseRcProjectId() {
  try {
    const firebaseRc = JSON.parse(readFileSync(resolve(repoRoot, '.firebaserc'), 'utf8'))
    return firebaseRc.projects?.default
  } catch {
    return null
  }
}

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccountPath = resolve(repoRoot, process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return admin.credential.cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8')))
  }

  return admin.credential.applicationDefault()
}

async function seedCollection(db, collectionName, items, getId) {
  const batch = db.batch()

  items.forEach((item, index) => {
    const id = getId(item, index)
    batch.set(db.collection(collectionName).doc(id), item)
  })

  await batch.commit()
  return items.length
}

function printCredentialHelp() {
  console.error('')
  console.error('Firestore seeding needs Firebase Admin credentials.')
  console.error('Use one of these options:')
  console.error('- gcloud auth application-default login')
  console.error('- FIREBASE_SERVICE_ACCOUNT_KEY=./service-account.json npm run seed:firestore')
  console.error('- FIREBASE_SERVICE_ACCOUNT_JSON=\'{"type":"service_account",...}\' npm run seed:firestore')
  console.error('')
}

async function main() {
  loadEnvFile(resolve(repoRoot, '.env.local'))

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    getFirebaseRcProjectId()

  if (!projectId) {
    throw new Error('Missing Firebase project id. Set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.')
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredential(),
      projectId,
    })
  }

  const db = admin.firestore()
  const content = loadDefaultQuizContent()

  const questionCount = await seedCollection(
    db,
    'questions',
    content.questions,
    (scenario, index) => scenario.id ?? `scenario-${index + 1}`
  )
  const resourceCount = await seedCollection(
    db,
    'resources',
    content.resources,
    (resource, index) => resource.id ?? `resource-${index + 1}`
  )
  const mappingCount = await seedCollection(
    db,
    'resultMappings',
    content.resultMappings,
    (mapping) => mapping.signal.toLowerCase()
  )

  console.log(`Seeded Firestore project "${projectId}".`)
  console.log(`- questions: ${questionCount}`)
  console.log(`- resources: ${resourceCount}`)
  console.log(`- resultMappings: ${mappingCount}`)
}

main().catch((error) => {
  if (String(error?.message ?? error).includes('default credentials')) {
    console.error(error.message)
    printCredentialHelp()
  } else {
    console.error(error)
  }
  process.exit(1)
})
