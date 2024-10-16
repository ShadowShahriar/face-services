import express from 'express'
import open, { apps } from 'open'
const app = express()
const port = 3000

app.use(express.static('.'))
app.use(express.static('public'))
app.use(express.static('node_modules/@vladmandic/face-api'))
app.use(express.static('node_modules/colorjs.io'))
app.use(express.static('node_modules/html-colors'))

app.listen(port, async _ => {
	const url = `http://localhost:${port}`
	console.log(`✅ Ready at ${url}`)
	await open(url, { app: { name: apps.chrome }, wait: true })
	console.log('✅ Browser closed, exiting...')
	process.exit(0)
})
