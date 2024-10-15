import * as tf from '@tensorflow/tfjs'
import * as faceapi from '@vladmandic/face-api'
import * as canvas from 'canvas'
import { readdir, writeFile } from 'fs/promises'
import { resolve } from 'path'

// ===========================================
// === prepare face-api.js and load models ===
// ===========================================
async function load() {
	// === base path of the models/weights ===
	const models = resolve('.', 'node_modules/@vladmandic/face-api/model')

	// === pass the implementation of HTMLCanvasElement and HTMLImageElement ===
	const { Canvas, Image, ImageData } = canvas
	faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

	// === load the models/weights ===
	const note = '✅ Loaded models'
	console.time(note)
	await Promise.all([
		faceapi.nets.ssdMobilenetv1.loadFromDisk(models),
		faceapi.nets.faceLandmark68Net.loadFromDisk(models),
		faceapi.nets.faceRecognitionNet.loadFromDisk(models)
	])
	console.timeEnd(note)
}

// ===================================================
// === get all subdirectories of a given directory ===
// ===================================================
async function directories(path) {
	try {
		const parent = await readdir(path, { withFileTypes: true })
		return parent
			.filter(dirent => dirent.isDirectory()) // === filter out directories ===
			.map(dirent => dirent.name) // =============== we only need the names ===
			.sort() // =================================== sort them alphabetically ===
	} catch (error) {
		return []
	}
}

// ============================================================
// === create labeled descriptors using the training images ===
// ============================================================
async function train(labels, parent) {
	return Promise.all(
		labels.map(async label => {
			const descriptions = []
			const labelpath = resolve(parent, label)

			// === get all images in the directory and their full paths ===
			const items = await readdir(labelpath, { withFileTypes: true })
			const images = items
				.filter(i => i.isFile() && i.name.match(/\.(png|jpg|jpeg)$/i))
				.map(i => resolve(labelpath, i.name))

			console.log(' ')
			console.log(`✅ Training "${label}"`)

			let i = 0
			const n = images.length
			for (let item of images) {
				i++
				const note = `${' '.repeat(3)}🔷 Training ${label} (${i}/${n})`
				console.time(note)

				// === load image into a canvas and detect a single face ===
				const HTMLImage = await canvas.loadImage(item)
				const detections = await faceapi.detectSingleFace(HTMLImage).withFaceLandmarks().withFaceDescriptor()
				descriptions.push(detections.descriptor)
				console.timeEnd(note)
			}

			// === create a labeled face descriptor object with the label and the descriptors ===
			const result = new faceapi.LabeledFaceDescriptors(label, descriptions)
			return result
		})
	)
}

// =====================
// === main function ===
// =====================
async function main() {
	// === print a list from an array ===
	const listify = (array, bullet) => `${bullet} ${array.join('\n' + bullet + ' ')}`

	// === get all subdirectories from the data directory ===
	const parent = resolve('.', 'data')
	const labels = await directories(parent)
	if (labels.length === 0) {
		console.log('⛔ No data found')
		return false
	}

	// === load the models/weights ===
	await load()

	const note = '✅ Trained'
	console.time(note)

	// === list all available data ===
	console.log('✅ Found data:')
	console.log(listify(labels, `${' '.repeat(3)}🔷`))

	// === train the model ===
	const results = await train(labels, parent)
	console.log(' ')

	// === save the result weights into a JSON file ===
	const resultsJSON = results.map(i => i.toJSON())
	await writeFile('trained.json', JSON.stringify(resultsJSON), 'utf8')
	console.timeEnd(note)
	return true
}

main()
