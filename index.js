import * as tf from '@tensorflow/tfjs'
import * as faceapi from '@vladmandic/face-api'
import * as canvas from 'canvas'
import Color from 'colorjs.io'
import webcam from 'node-webcam'
import { Monitor, Window } from 'node-screenshots'
import { existsSync } from 'fs'
import { readFile, unlink, writeFile } from 'fs/promises'
import { basename, resolve } from 'path'

// === image source or input ===
const source = 'file' // 'webcam', 'screenshot' or 'file'

// === ID of the window to capture ===
const sourceID = null // can be obtained by running `node metadata.js`

// === ID of the webcam device ===
const webcamDeviceID = false // can be obtained by running `node metadata.js`

// === source file name if 'file' was selected as the source ===
const testPhoto = 'test.jpg' // png/jpg/jpeg

// === max distance from the reference image(s) ===
const maxDistance = 0.55 // 0.55 is a good starting point

// === output file name ===
const resultPhoto = 'result.jpg' // png/jpg/jpeg

// === label options ===
const fontFamily = '"JetBrains Mono", Hack, Roboto, Arial'
const fontSize = 40
const algo = 'APCA' // color contrast algorithm

// === some humble helper functions ===
const isJPEG = filename => filename.includes('.jpg') || filename.includes('.jpeg')
const getImgFmt = filename => (isJPEG(filename) ? 'jpeg' : 'png')

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

// ================================================
// === remove residual files from previous runs ===
// ================================================
async function clean() {
	const note = '✅ Cleaning up'
	console.time(note)
	// === do not remove test.jpg if source is 'file' ===
	if (!source === 'file') {
		try {
			await unlink(testPhoto)
		} catch (error) {}
	}

	try {
		await unlink(resultPhoto)
	} catch (error) {}
	console.timeEnd(note)
}

// ==============================================
// === capture a single frame from the webcam ===
// ==============================================
async function capture() {
	const basefilename = basename(testPhoto)
	const note = '✅ Taking picture'
	console.time(note)
	const options = {
		quality: 100,
		frames: 60,
		delay: 0,
		saveShots: true,
		output: getImgFmt(testPhoto),
		device: webcamDeviceID ? webcamDeviceID : false,
		callbackReturn: 'location',
		verbose: false
	}

	return new Promise(resolve => {
		webcam.capture(basefilename, options, function (err, data) {
			console.timeEnd(note)
			resolve(true)
		})
	})
}

// =============================================
// === take a screenshot of the given window ===
// =============================================
async function screenshot() {
	const note = '✅ Taking screenshot'
	console.time(note)

	// === find the desired window by ID ===
	const window = Window.all().find(item => {
		if (sourceID && item.id === sourceID) return item
	})

	// === capture the image ===
	// === if no window is found, capture the primary monitor ===
	const image = window ? window.captureImageSync() : Monitor.fromPoint(0, 0).captureImageSync()
	await writeFile(testPhoto, isJPEG(testPhoto) ? image.toJpegSync() : image.toPngSync())
	console.timeEnd(note)
}

// ======================================
// === detect faces in the test image ===
// ======================================
async function detect(faceMatcher, colors) {
	// === load the test image ===
	const testImage = await canvas.loadImage(testPhoto)

	// === create a base result image ===
	const output = faceapi.createCanvasFromMedia(testImage)

	// === detect all faces in the test image ===
	const detections = await faceapi.detectAllFaces(testImage).withFaceLandmarks().withFaceDescriptors()

	// === create a list of detected faces ===
	const listify = (array, bullet) => `${bullet} ${array.join('\n' + bullet + ' ')}`

	let people = []
	let i = 0
	for (const item of detections) {
		const bestMatch = faceMatcher.findBestMatch(item.descriptor)
		const label = bestMatch.toString()
		const label_name = label.split(' ')[0] // === we only need the name/label ===
		const label_bg = new Color(colors[i])

		const rect_style = {
			lineWidth: 5,
			boxColor: colors[i]
		}

		// === borrowed from https://apps.colorjs.io/blackwhite/index.js ===
		const onWhite = Math.abs(label_bg.contrast('white', algo))
		const onBlack = Math.abs(label_bg.contrast('black', algo))
		const textColor = onWhite > onBlack ? 'white' : 'black'

		const label_style = {
			fontSize,
			fontColor: textColor,
			fontStyle: fontFamily
		}

		if (!label.includes('unknown')) {
			const rect = new faceapi.draw.DrawBox(item.detection.box, {
				label: label_name,
				...rect_style,
				drawLabelOptions: label_style
			})
			rect.draw(output)
			if (!people.includes(label_name)) people.push(label_name)
		}
		i++
	}

	// === print the detected faces ===
	if (people.length > 0) {
		console.log('✅ Detected faces:')
		console.log(listify(people, '🔷'))
		if (source !== 'file') console.log(' ')
	}

	if (people.length === 0 && source === 'file') {
		console.log('⛔ No faces detected')
	}

	// === save the result image ===
	await writeFile(resultPhoto, output.toBuffer(`image/${getImgFmt(resultPhoto)}`))
}

// ===============================
// === test the implementation ===
// ===============================
async function test() {
	if (!existsSync('trained.json')) {
		console.log('⛔ Missing: trained.json')
		return
	}
	if (!existsSync(testPhoto) && source === 'file') {
		console.log('⛔ Missing:', testPhoto)
		return
	}

	await clean()
	await load()

	// === load the trained data from JSON ===
	const textData = await readFile('trained.json', 'utf8')
	const result = JSON.parse(textData)

	// === load colors ===
	const colorsObj = await readFile('./node_modules/html-colors/html-colors.json', 'utf8')
	const colors = Object.values(JSON.parse(colorsObj))

	// === shuffle the colors ===
	// === @author superluminary
	// === @info https://stackoverflow.com/a/46545530
	const shuffledColors = colors
		.map(value => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value)

	const descriptors = result.map(i => faceapi.LabeledFaceDescriptors.fromJSON(i))

	// === create a face matcher from the trained data ===
	const faceMatcher = new faceapi.FaceMatcher(descriptors, maxDistance)

	// === run the test ===
	for (;;) {
		if (source === 'webcam') await capture()
		if (source === 'screenshot') await screenshot()
		await detect(faceMatcher, shuffledColors)

		// === test source file only once ===
		if (source === 'file') break
	}
}

test()
