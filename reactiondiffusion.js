
const transfer = array => (cell, i) => {
	array[i] = cell
}

const bits = 32 / 8

const weightsValues = [
	0.05, 0.2, 0.05,
   0.2,  -1, 0.2,
	0.05, 0.2, 0.05
]

const weightsBuffer = new ArrayBuffer(bits * 3 * 3)


const weights = new Float32Array(weightsBuffer)
weightsValues.forEach(transfer(weights))


const coordsToIndex = (width, x, y) => {
	return (y * width) + x
}

const indexToX = (width, i) => {
	return i % width
}
const indexToY = (width, i) => {
	return (i / width)|0
}

const convolve = (width, max, dataY, weightsY, boundary, cX, cY) => {
	let sum = 0
	const weightsYLen = 3
	const weightsXLen = 3
	for(let w = 0; w < weightsXLen * weightsYLen; w ++){
		const wX = indexToX(3, w)
		const wY = indexToY(3, w)
		const finalY = cY - (wY-1)
		const finalX = cX - (wX-1)
		const i = coordsToIndex(width, finalX, finalY)

		sum += Math.fround(weightsY[w] * dataY[(i + max) % max])
	}
	return sum
}

const length = 256
const width = length
const height = length

const feedRate = 0.055

const killRate = 0.062

const variableFeed = (x, width) => (
	((x / width) * 0.0367)
  + ((1.0 - (x / width)) * 0.057)
  )

const variableKillModifier = (y, height) => {
	const yFract = Math.pow(y / height, 0.6)
	return ((yFract * 0.015)
  + ((1.0 - yFract) * -0.02)
  ) * 0.25
}

const modifyA = (cell, x, y) =>
	(variableFeed(x, width)) * (1.0 - cell)

const modifyB = (cell, x, y) =>
	0.0 - (
	(
		((killRate + variableFeed(x, width))
	+ variableKillModifier(y, height) ) * cell
	)
)

const processAllCells = state => {
	const ping = state.ping
	const newA = ping ? state.a2 : state.a1
	const oldA = ping ? state.a1 : state.a2
	const newB = ping ? state.b2 : state.b1
	const oldB = ping ? state.b1 : state.b2
	const max = width * height

	for(let i = 0; i < max; i ++){
		const x = indexToX(width, i)
		const y = indexToY(width, i)

		const a = oldA[i]
		const b = oldB[i]

		const dispersed = Math.fround(1.0 * convolve(width, max, oldA, weights, 1.0, x, y))

		const reaction = Math.fround(0.0 - (a * Math.pow(b, 2.0)))

		const newValue = Math.fround(Math.max(0.0, Math.min(1.0,
			a + (((dispersed + reaction) + modifyA(a, x, y)))
		)))

		newA[i] = newValue
	}

	for(let i = 0; i < max; i ++){
		const x = indexToX(width, i)
		const y = indexToY(width, i)

		const a = oldA[i]
		const b = oldB[i]

		const dispersed = Math.fround(0.5 * convolve(width, max, oldB, weights, 1.0, x, y))

		const reaction = Math.fround(0.0 + (a * Math.pow(b, 2.0)))

		const newValue = Math.fround(Math.max(0.0, Math.min(1.0,
			b + (((dispersed + reaction) + modifyB(b, x, y)))
		)))
		newB[i] = newValue
	}

	state.ping = !state.ping
	return state
}

const matrix = Array.from({ length: width * height }, () => 0)

const value = {
	a1: matrix
	.map(() => 0.5),
	// .map(cell => Math.max(0, Math.min(1.0, 2.0 * Math.pow(Math.random(), 2)))),
	a2: matrix
	.map(() => 0),
	b1: matrix
	.map((cell, i) => {
		const x = indexToX(width, i)
		const y = indexToY(width, i)
		const half = length / 2
		const size = 20

		const v = //Math.max(0, Math.min(1.0,
			1.0 * Math.pow(
				1.0 / Math.sqrt(
					Math.pow(1.0 + Math.abs(x - half), 2)
				  + Math.pow(1.0 + Math.abs(y - half), 2)
				),
				1.0
			)
		return v
	}),
	b2: matrix
	.map(() => 0),
	ping: true
}

const typedValue = {
	a1: new Float32Array(new ArrayBuffer(bits * width * height)),
	a2: new Float32Array(new ArrayBuffer(bits * width * height)),
	b1: new Float32Array(new ArrayBuffer(bits * width * height)),
	b2: new Float32Array(new ArrayBuffer(bits * width * height)),
	ping: true
}

value.a1.forEach(transfer(typedValue.a1))
value.a2.forEach(transfer(typedValue.a2))

value.b1.forEach(transfer(typedValue.b1))
value.b2.forEach(transfer(typedValue.b2))

let draw = 0
const drawMax = 10
const scale = 1

const iterations = 10
const calculate = value => {
	for(let i = 0; i < iterations; i ++){
		value = processAllCells(value)
	}
	return value
}

const canvas = document.querySelector('#canvas')
canvas.width = length
canvas.height = length
const context = canvas.getContext('2d')
let state = typedValue

const render = () => {
	state = calculate(state)

	let prevR = 0
	let prevG = 0
	let prevB = 0

	for(let y = 0; y < length; y += scale){
		let drawingX = 0
		for(let x = 0; x < length; x += scale){

			const aV = (state.a1[coordsToIndex(width, x, y)])
			const bV = (state.b1[coordsToIndex(width, x, y)])

			const r = (aV * 255)|0
			const g = (bV * 255)|0
			const b = 100
			if(r !== prevR || g !== prevG || b !== prevB){
				prevR = r
				prevG = g
				prevB = b

				context.fillRect(drawingX, y, x - drawingX, 2)
				context.fillStyle = `rgb(${r}, ${g}, ${b})`
				drawingX = x
			}
		}
		context.fillRect(drawingX, y, length - drawingX, 2)
	}
	requestAnimationFrame(render)
}
requestAnimationFrame(render)
