import { resolve } from 'path'
import { writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { Monitor, Window } from 'node-screenshots'
import webcam from 'node-webcam'
const checkmark = '✅'
const bullet = '   🔷'

// ===============================
// === create/delete directory ===
// ===============================
const root = resolve('.', 'metadata')
try {
	unlinkSync(resolve(root))
} catch (e) {}
mkdirSync(root, { recursive: true })

// ============================
// === list active monitors ===
// ============================
const monitors = Monitor.all()
const monlen = monitors.length
console.log(checkmark, monlen, `monitor${monlen > 1 ? 's' : ''} found`)

for (const monitor of monitors) {
	const image = monitor.captureImageSync()
	console.log(bullet, `ID:`, monitor.id, monitor.name, monitor.isPrimary ? '(Primary)' : '')
	writeFileSync(resolve(root, `monitor-${monitor.id}.png`), image.toPngSync())
}

console.log(' ')

// ==============================
// === list available windows ===
// ==============================
const windows = Window.all()
const winlen = windows.length
console.log(checkmark, winlen, `window${winlen > 1 ? 's' : ''} found`)
for (const window of windows) {
	console.log(bullet, `ID:`, window.id, `(${window.appName})`)
	const image = window.captureImageSync()
	writeFileSync(resolve(root, `window-${window.id}.png`), image.toPngSync())
}

console.log(' ')

// ==============================
// === list available webcams ===
// ==============================
console.log(checkmark, 'Available cameras:')
webcam.list(array => {
	for (const camera of array) {
		console.log(bullet, 'ID:', `"${camera}"`)
	}
})
