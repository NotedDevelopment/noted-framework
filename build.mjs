#!/usr/bin/env node
// Generates recipe.yaml from the latest upstream recipe. Zero dependencies. Node 18+.
// Downloads are pinned to the versions current at build time, so recipe.yaml keeps working
// until this is run again. Nothing downloaded here ends up in this repo.
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, cpSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const UPSTREAM = 'https://raw.githubusercontent.com/Qbox-project/txAdminRecipe/main/qbox-lean.yaml'
const LOGO = 'https://raw.githubusercontent.com/NotedDevelopment/noted-framework/main/logo.png'
const HERE = dirname(fileURLToPath(import.meta.url))

const NOTICE = `# Notice

The resources in this folder were downloaded from their original projects and renamed
during installation. The framework is Qbox (https://github.com/Qbox-project), licensed
GPL-3.0, with every "qbx" and "qbox" replaced by "noted". Other resources keep their own
authors and licenses, and those LICENSE files were not changed. If you share this folder,
keep them and this notice with it.
`

// A name is left alone inside real links (not NUI ones like https://qbx_core/cb, which have
// no dot in the host), repo slugs, Discord invites, the qbox.re domain and base64 blobs.
const KEEP_BEFORE = [
    'https?:\\/\\/[\\w-]+(?:\\.[\\w-]+)+[^\\s"\'`<>)\\]]*',
    '[Qq][Bb][Oo][Xx]-[Pp][Rr][Oo][Jj][Ee][Cc][Tt]\\/[\\w.-]*',
    'discord\\.gg\\/\\w*',
    '[A-Za-z0-9+\\/]{100}',
].join('|')
const KEEP_AFTER = '(?!-[Pp][Rr][Oo][Jj][Ee][Cc][Tt])(?!\\.re\\b)(?![A-Za-z0-9+\\/]{100})'
const pattern = (spelling) => `${spelling}(?<!(?:${KEEP_BEFORE})${spelling})${KEEP_AFTER}`

const swap = (spelling) => {
    if (spelling === spelling.toUpperCase()) return 'NOTED'
    return spelling[0] === spelling[0].toUpperCase() ? 'Noted' : 'noted'
}
const renamePath = (path) => path.replace(/qbox|qbx/gi, swap)

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

async function download(url) {
    for (let attempt = 1; ; attempt++) {
        try {
            const response = await fetch(url)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return Buffer.from(await response.arrayBuffer())
        } catch (error) {
            if (attempt === 4) throw new Error(`${url}: ${error.message}`)
            await sleep(attempt * 5000)
        }
    }
}

function unzip(buffer, onEntry) {
    let end = buffer.length - 22
    while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--
    if (end < 0) throw new Error('not a zip file')

    let offset = buffer.readUInt32LE(end + 16)
    for (let i = buffer.readUInt16LE(end + 10); i > 0; i--) {
        const method = buffer.readUInt16LE(offset + 10)
        const compressedSize = buffer.readUInt32LE(offset + 20)
        const nameLength = buffer.readUInt16LE(offset + 28)
        const extraLength = buffer.readUInt16LE(offset + 30)
        const commentLength = buffer.readUInt16LE(offset + 32)
        const local = buffer.readUInt32LE(offset + 42)
        const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength)
        offset += 46 + nameLength + extraLength + commentLength

        if (name.endsWith('/')) continue
        const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
        const raw = buffer.subarray(start, start + compressedSize)
        onEntry(name, () => (method === 0 ? raw : inflateRawSync(raw)))
    }
}

function writeEntry(root, name, read) {
    const path = resolve(root, name)
    const inside = relative(root, path)
    if (inside.startsWith('..') || isAbsolute(inside)) throw new Error(`refusing to write outside the target: ${name}`)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, read())
}

function parseRecipe(yaml) {
    const tasks = []
    for (const line of yaml.split(/\r?\n/)) {
        const entry = line.match(/^\s*(- )?(\w+):\s*(.*?)\s*(#.*)?$/)
        if (!entry) continue
        if (entry[1]) tasks.push({})
        if (tasks.length) tasks.at(-1)[entry[2]] = entry[3].replace(/^["']|["']$/g, '')
    }
    return tasks
}

// Turns "latest" and branch names into exact versions.
async function pin(task) {
    if (task.action === 'download_github') {
        const repo = task.src.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')
        const headers = { Accept: 'application/vnd.github.sha' }
        if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
        const response = await fetch(`https://api.github.com/repos/${repo}/commits/${task.ref || 'HEAD'}`, { headers })
        if (!response.ok) throw new Error(`${repo}: HTTP ${response.status}. Set GITHUB_TOKEN if this is a rate limit.`)
        return { ...task, ref: await response.text() }
    }
    if (task.action === 'download_file' && task.url.includes('/releases/latest/download/')) {
        const response = await fetch(task.url, { redirect: 'manual' })
        const location = response.headers.get('location')
        if (!location) throw new Error(`${task.url}: no release found`)
        return { ...task, url: location }
    }
    return task
}

async function runTask(task, out) {
    const at = (path) => resolve(out, path)
    switch (task.action) {
        case 'download_github': {
            const repo = task.src.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '')
            const zip = await download(`https://codeload.github.com/${repo}/zip/${task.ref}`)
            const prefix = task.subpath ? `${task.subpath.replace(/\/+$/, '')}/` : ''
            unzip(zip, (name, read) => {
                const inner = name.slice(name.indexOf('/') + 1)
                if (inner.startsWith(prefix)) writeEntry(at(task.dest), inner.slice(prefix.length), read)
            })
            break
        }
        case 'download_file':
            mkdirSync(dirname(at(task.path)), { recursive: true })
            writeFileSync(at(task.path), await download(task.url))
            break
        case 'unzip':
            unzip(readFileSync(at(task.src)), (name, read) => writeEntry(at(task.dest), name, read))
            break
        case 'move_path':
            mkdirSync(dirname(at(task.dest)), { recursive: true })
            rmSync(at(task.dest), { recursive: true, force: true })
            renameSync(at(task.src), at(task.dest))
            break
        case 'copy_path':
            mkdirSync(dirname(at(task.dest)), { recursive: true })
            cpSync(at(task.src), at(task.dest), { recursive: true, force: true })
            break
        case 'remove_path':
            rmSync(at(task.path), { recursive: true, force: true })
            break
        case 'waste_time':
            await sleep(Number(task.seconds) * 1000)
            break
        default:
            throw new Error(`unknown recipe action: ${task.action}`)
    }
}

// Collects, for every spelling of the names, the files it has to be replaced in,
// and every file or folder that needs a new name, deepest first.
function scan(root) {
    const files = new Map()
    const renames = []
    const walk = (dir, shown) => {
        for (const entry of readdirSync(dir)) {
            if (/^(licen[cs]e|copying)/i.test(entry) || (dir === root && entry === 'tmp')) continue
            const path = join(dir, entry)
            const name = `${shown}/${entry}`
            if (statSync(path).isDirectory()) {
                walk(path, name)
            } else {
                const bytes = readFileSync(path)
                if (!bytes.subarray(0, 8000).includes(0)) {
                    const text = bytes.toString('utf8')
                    for (const spelling of new Set(text.match(/qbox|qbx/gi))) {
                        if (!new RegExp(pattern(spelling)).test(text)) continue
                        if (!files.has(spelling)) files.set(spelling, [])
                        files.get(spelling).push(name)
                    }
                }
            }
            if (renamePath(entry) !== entry) renames.push({ action: 'move_path', src: name, dest: `${shown}/${renamePath(entry)}` })
        }
    }
    walk(root, '.')
    return { files, renames }
}

function toYaml(tasks) {
    const scalar = (value) => (typeof value === 'string' ? JSON.stringify(value) : String(value))
    const lines = ['$engine: 3', '$onesync: on', 'name: Noted Framework', 'version: 1.0.0', 'author: NotedDevelopment', 'description: The Noted Framework.', '', 'tasks:']
    for (const task of tasks) {
        let dash = '  - '
        for (const [key, value] of Object.entries(task)) {
            if (Array.isArray(value)) {
                lines.push(`${dash}${key}:`)
                for (const item of value) lines.push(`      - ${scalar(item)}`)
            } else {
                lines.push(`${dash}${key}: ${scalar(value)}`)
            }
            dash = '    '
        }
    }
    return `${lines.join('\n')}\n`
}

const upstream = parseRecipe((await download(UPSTREAM)).toString('utf8'))
const isDatabase = (task) => task.action.includes('database')
const isCleanup = (task) => task.action === 'remove_path' && task.path === './tmp'

console.log('Pinning downloads...')
const steps = []
for (const task of upstream.filter((task) => !isDatabase(task) && !isCleanup(task))) {
    const { overwrite, ...rest } = task
    const pinned = await pin(rest)
    if (overwrite !== undefined) pinned.overwrite = overwrite === 'true'
    if (pinned.seconds !== undefined) pinned.seconds = Number(pinned.seconds)
    steps.push(pinned)
}

// SQL kept in the temporary folder has to survive until the database step runs.
const queries = []
for (const task of upstream.filter((task) => task.action === 'query_database')) {
    if (task.file.startsWith('./tmp/')) {
        const kept = `./${basename(task.file)}`
        steps.push({ action: 'move_path', src: task.file, dest: kept })
        queries.push(renamePath(kept))
    } else {
        queries.push(renamePath(task.file))
    }
}

const work = mkdtempSync(join(tmpdir(), 'noted-build-'))
console.log('Downloading everything to see what needs renaming...')
for (const task of steps) await runTask(task, work)

const { files, renames } = scan(work)
rmSync(work, { recursive: true, force: true })

const tasks = [
    ...steps,
    ...[...files].map(([spelling, list]) => ({
        action: 'replace_string',
        mode: 'literal',
        timeoutSeconds: 180,
        file: list,
        search: pattern(spelling),
        replace: swap(spelling),
    })),
    ...renames,
    { action: 'download_file', url: LOGO, path: './myLogo.png' },
    { action: 'copy_path', src: './myLogo.png', dest: './resources/[standalone]/loadscreen/html/assets/logo.png', overwrite: true },
    { action: 'write_file', file: './NOTICE.md', data: NOTICE },
    { action: 'connect_database' },
    ...queries.map((file) => ({ action: 'query_database', file })),
    ...queries.filter((file) => file.lastIndexOf('/') === 1).map((path) => ({ action: 'remove_path', path })),
    { action: 'remove_path', path: './tmp' },
]

writeFileSync(join(HERE, 'recipe.yaml'), toYaml(tasks))
console.log(`recipe.yaml written: ${tasks.length} tasks, ${[...files.values()].flat().length} file edits, ${renames.length} renames.`)
