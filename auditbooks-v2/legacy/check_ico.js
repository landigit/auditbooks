import fs from "node:fs";

function getIcoDimensions(filePath) {
	try {
		const buffer = fs.readFileSync(filePath);
		if (
			buffer[0] !== 0 ||
			buffer[1] !== 0 ||
			buffer[2] !== 1 ||
			buffer[3] !== 0
		) {
			console.log(`${filePath}: Not a valid ICO file`);
			return;
		}
		const count = buffer.readUInt16LE(4);
		console.log(`${filePath}: Number of images: ${count}`);
		for (let i = 0; i < count; i++) {
			const offset = 6 + i * 16;
			let width = buffer[offset];
			let height = buffer[offset + 1];
			if (width === 0) width = 256;
			if (height === 0) height = 256;
			console.log(`  Image ${i}: ${width}x${height}`);
		}
	} catch (e) {
		console.log(`${filePath}: Error reading file: ${e.message}`);
	}
}

const files = process.argv.slice(2);
files.forEach(getIcoDimensions);
