#!/usr/bin/env node
/**
 * Start the Android emulator with DNS servers that give reliable internet
 * (8.8.8.8, 8.8.4.4). Use the same AVD name as ANDROID_DEVICE so WDIO
 * connects to this emulator when you run yarn test:android:local.
 *
 * Usage: node scripts/start-android-emulator.mjs
 * Env:   ANDROID_DEVICE (default: Pixel_7) — AVD name
 *
 * The emulator is started in the background. Run tests in another terminal
 * after the emulator has booted.
 */

import { spawn } from 'child_process'

const avd = process.env.ANDROID_DEVICE || 'Pixel_7'
const emulatorBin = process.env.ANDROID_HOME
  ? `${process.env.ANDROID_HOME}/emulator/emulator`
  : process.env.ANDROID_SDK_ROOT
    ? `${process.env.ANDROID_SDK_ROOT}/emulator/emulator`
    : 'emulator'

const child = spawn(emulatorBin, ['-avd', avd, '-dns-server', '8.8.8.8,8.8.4.4'], {
  detached: true,
  stdio: 'ignore',
})

child.unref()
console.log(`Started Android emulator: ${avd} (DNS: 8.8.8.8, 8.8.4.4)`)
console.log('Wait for boot to complete, then run: yarn test:android:local')
