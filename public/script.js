const video = document.querySelector('#videoFeed')
const canvas = document.querySelector('#resultFeed')
const statusText = document.querySelector('#status')

// === video options ===
const webcamID = 2 // can be obtained by running `node metadata.js`
const portrait = true // set to false for landscape mode
const ratio = portrait ? 9 / 16 : 16 / 9 // aspect ratio
const height = 720 // can be 720 or 1080
const frameRate = 30

// === label options ===
const fontFamily = '"JetBrains Mono", Hack, Roboto, Arial'
const fontSize = 40
const algo = 'APCA' // color contrast algorithm

// === detection options ===
const maxDistance = 0.6 // max distance from the reference image(s)
const interval = 200

// ==========================================
// === function to obtain the webcam feed ===
// ==========================================
async function startVideo() {
	const note = '✅ Started video'
	console.time(note)
	const videoContainer = document.querySelector('#container')
	video.muted = true

	// === get available devices ===
	const mediaDevices = navigator.mediaDevices
	const devices = await mediaDevices.enumerateDevices()

	let opts = { width: height * ratio, height, frameRate }

	// === check if the preferred device is available ===
	if (webcamID) {
		const preferredDevice = devices[Number(webcamID)]
		if (preferredDevice.kind === 'videoinput') opts.deviceId = { exact: preferredDevice.deviceId }
	}

	const stream = await mediaDevices.getUserMedia({ video: opts, audio: false })
	videoContainer.style.setProperty('--width', `${opts.width}`)
	videoContainer.style.setProperty('--height', `${opts.height}`)

	// === pass the stream to the video element ===
	video.srcObject = stream
	video.addEventListener('loadedmetadata', () => {
		console.timeEnd(note)
		video.play()
		videoContainer.style.opacity = 1
	})

	// === resize the canvas to match the video feed ===
	new ResizeObserver(entries => {
		for (let entry of entries) {
			const rect = entry.contentRect
			canvas.width = rect.width
			canvas.height = rect.height
		}
	}).observe(video)
}

// ===============================
// === function to load models ===
// ===============================
async function loadModels() {
	const models = './model'
	const note = '✅ Loaded models'
	console.time(note)
	await Promise.all([
		faceapi.nets.ssdMobilenetv1.loadFromUri(models),
		faceapi.nets.faceLandmark68Net.loadFromUri(models),
		faceapi.nets.faceRecognitionNet.loadFromUri(models)
	])
	console.timeEnd(note)
}

// ===============================================================
// === function to detect and identify faces from video stream ===
// ===============================================================
async function detect(faceMatcher, colors) {
	// === detect all faces from the video stream ===
	let detectedFaces = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors()

	// === clear the canvas before updating the detection boxes ===
	canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

	// === resize the detections to match the canvas ===
	detectedFaces = faceapi.resizeResults(detectedFaces, canvas)

	let people = []
	for (const item of detectedFaces) {
		// === find the closest match based on its descriptor ===
		const bestMatch = faceMatcher.findBestMatch(item.descriptor)
		const label = bestMatch.toString()
		const label_name = label.split(' ')[0]
		const label_bg = new Color(colors[label_name.length])

		const rect_style = {
			lineWidth: 5,
			boxColor: label_bg.toString('hex')
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

		// === draw the detection box for recognized faces ===
		if (!label.includes('unknown')) {
			const rect = new faceapi.draw.DrawBox(item.detection.box, {
				label: label_name,
				...rect_style,
				drawLabelOptions: label_style
			})
			rect.draw(canvas)
			people.push(label_name)
		}
	}

	// === update status text ===
	let newText = ''
	if (people.length > 0) newText = `Recognized ${people.length} face${people.length > 1 ? 's' : ''}`
	else newText = 'No faces detected'

	// === only update the inner text if it has changed ===
	if (newText != statusText.innerText) statusText.innerText = newText
}

// =====================
// === main function ===
// =====================
async function main() {
	await loadModels()
	await startVideo()

	// === load trained weights ===
	const textData = await fetch('./trained.json').then(res => res.text())
	const result = JSON.parse(textData)

	// === load colors ===
	const colorsObj = await fetch('./html-colors.json').then(res => res.json())
	const colors = Object.values(colorsObj)

	// === shuffle the colors ===
	// === @author superluminary
	// === @info https://stackoverflow.com/a/46545530
	const shuffledColors = colors
		.map(value => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value)

	// === create descriptors from the trained weights ===
	const descriptors = result.map(i => faceapi.LabeledFaceDescriptors.fromJSON(i))

	// === create a face matcher from the descriptors ===
	const faceMatcher = new faceapi.FaceMatcher(descriptors, maxDistance)

	// === interval to detect faces ===
	setInterval(async () => await detect(faceMatcher, shuffledColors), interval)
}

main()
