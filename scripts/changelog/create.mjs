#!/usr/bin/env node

/**
 * scripts/changelog/create.mjs
 *
 * Interactive authoring tool for `.changes/*.md` entries — the file every
 * PR should add alongside its change (see CONTRIBUTING.md). Prompts for the
 * entry's `type` and a plain-language description, then writes the file
 * under a randomly generated name.
 *
 * The filename itself carries no meaning — it's deleted the moment its
 * content is folded into CHANGELOG.md at release time — so it's generated
 * rather than asked for. It's built from two small curated word lists
 * (never from what the author typed) specifically so it can't come out
 * offensive.
 *
 * This is the human-facing counterpart to index.mjs, which folds these
 * entries into CHANGELOG.md at release time and never runs interactively.
 *
 * Usage:
 *   yarn changeset
 *   node scripts/changelog/create.mjs
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import prompts from 'prompts'
import { TYPE_LABELS, VALID_TYPES } from './index.mjs'

const ROOT_DIR = process.cwd()
const CHANGES_DIR = join(ROOT_DIR, '.changes')

const TYPE_HINTS = {
  added: 'A new feature or capability',
  changed: 'A change to something that already existed',
  fixed: 'A bug fix',
  removed: 'Something that was taken away',
}

// Deliberately plain and neutral — nothing here should ever read as
// offensive in any combination, so there's no need to review pairs.
const ADJECTIVES = [
  'brave',
  'calm',
  'clever',
  'eager',
  'gentle',
  'happy',
  'jolly',
  'kind',
  'lively',
  'merry',
  'nimble',
  'proud',
  'quiet',
  'rapid',
  'steady',
  'swift',
  'tidy',
  'vivid',
  'warm',
  'wise',
  'bold',
  'bright',
  'crisp',
  'fresh',
  'sunny',
  'sturdy',
  'trusty',
  'zesty',
  'breezy',
  'cheerful',
]

const NOUNS = [
  'otter',
  'heron',
  'falcon',
  'badger',
  'sparrow',
  'beaver',
  'dolphin',
  'lynx',
  'moose',
  'raven',
  'salmon',
  'walrus',
  'wombat',
  'gecko',
  'panda',
  'puffin',
  'meadow',
  'harbor',
  'summit',
  'orchard',
  'glacier',
  'canyon',
  'brook',
  'ridge',
  'lantern',
  'compass',
  'anchor',
  'maple',
  'cedar',
  'willow',
]

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function changeFilePath(slug) {
  return join(CHANGES_DIR, `${slug}.md`)
}

function defaultSlugExists(slug) {
  return existsSync(changeFilePath(slug))
}

/**
 * Picks a random "adjective-noun" pair. Retries on the rare chance it
 * collides with an existing .changes/ filename; `slugExists` is injectable
 * so tests don't have to touch the filesystem.
 */
function randomSlug(slugExists = defaultSlugExists) {
  let slug
  do {
    slug = `${randomChoice(ADJECTIVES)}-${randomChoice(NOUNS)}`
  } while (slugExists(slug))
  return slug
}

async function main() {
  if (!process.stdin.isTTY) {
    console.error('yarn changeset needs an interactive terminal.')
    console.error('Create a .changes/<slug>.md file by hand instead — see CONTRIBUTING.md for the format.')
    process.exit(1)
  }

  console.log("Let's add a changelog entry.")
  console.log('The description you write here is shown to users — plain language, no jargon or ticket numbers.\n')

  const responses = await prompts(
    [
      {
        type: 'select',
        name: 'type',
        message: 'What kind of change is this?',
        choices: VALID_TYPES.map((type) => ({
          title: TYPE_LABELS[type],
          description: TYPE_HINTS[type],
          value: type,
        })),
      },
      {
        type: 'text',
        name: 'description',
        message: 'Describe the change for a non-technical reader',
        validate: (value) => (value.trim().length > 0 ? true : 'A description is required'),
      },
    ],
    {
      onCancel: () => {
        console.log('\nCancelled — no file was created.')
        process.exit(1)
      },
    }
  )

  mkdirSync(CHANGES_DIR, { recursive: true })
  const slug = randomSlug()
  const content = `---\ntype: ${responses.type}\n---\n\n${responses.description.trim()}\n`
  writeFileSync(changeFilePath(slug), content)

  console.log(`\n✓ Wrote .changes/${slug}.md — commit it with your PR.`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { ADJECTIVES, NOUNS, randomSlug }
