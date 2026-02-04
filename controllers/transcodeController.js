const fs = require('fs');

const shell = require('shelljs');

const consoleEffects = require('../utils/consoleEffects');

exports.transcodeVideos = (files, handBrakeCLI, preset, dir) => {
	// Arrays for files to be sorted into based on if any errors occur
	let success = [];
	let failedInHandbrake = [];
	let sourceNotDeleted = [];
	let handBrakeCommandFail = [];

	files.forEach((file) => {
		const outputLocation = createOutputLocation(file);
		const presetName = getPresetName(preset);

		//Creates string with current video file
		const nowDoing = `Transcoding video ${files.indexOf(file) + 1} of ${files.length} (${Math.round(((files.indexOf(file) + 1) / files.length) * 100)}%)`
		consoleEffects.nowDoing(nowDoing);

		//Writes update to file so user can check progress even if program is run as CRON job
		const fileOutput = `${nowDoing}\n ${file}`
		fs.writeFileSync(`${dir}/Squish CRON.log`, fileOutput)

		//Transcode video
		try {
			// Executes command
			let output = shell.exec(`"${handBrakeCLI}" -i "${file}" -o "${outputLocation}" --preset-import-file "${preset}" -Z "${presetName}"`);
			// Checks if HandBrake failed
			if (output.stderr.includes('Encode done!')) {
				//Delete original file
				try {
					fs.unlinkSync(file);
					success.push({ name: file });
				} catch (e) {
					sourceNotDeleted.push({ name: file });
				}
			} else {
				failedInHandbrake.push({ name: file });
			}
		} catch (e) {
			handBrakeCommandFail.push({ name: file });
		}
	});
	fs.unlinkSync(`${dir}/Squish CRON.log`);
	return { errors: failedInHandbrake, success, sourceNotDeleted, handBrakeCommandFail };
};

const createOutputLocation = (file) => {
	//Does some stuff with arrays to change the file name so it ends with [SQUISH] before the file extension
	let outputLocation = file.split('.');
	outputLocation[outputLocation.length - 2] = `${outputLocation[outputLocation.length - 2]} [SQUISH]`;
	outputLocation[outputLocation.length - 1] = `mkv`;
	outputLocation = outputLocation.join('.');
	return outputLocation;
};

const getPresetName = (preset) => {
	//Imports the handbrake preset and finds the internal name so it can be found by handbrake
	const presetJSON = JSON.parse(fs.readFileSync(preset));
	const presetName = presetJSON.PresetList[0].PresetName;

	return presetName;
};
