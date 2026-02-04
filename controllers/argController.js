const path = require('path');

const argv = require('yargs').argv;

const appError = require('../utils/appError');

exports.getArgs = () => {
	// getting args from yargs
	let relativeDir = argv.dir;
	let relativePreset = argv.preset ? argv.preset : `${__dirname}/../H265.json`; //Needs /../ because argController.js is one layer deep in file structure
	let handBrakeCLI = argv.handBrakeCLI ? argv.handBrakeCLI : 'HandBrakeCLI';

	//changing relative file paths to absolute ones
	const dir = resolvePath(relativeDir);
	const preset = resolvePath(relativePreset);

	//Check that all args are present
	if (dir == undefined || preset == undefined || handBrakeCLI == undefined) {
		appError(`Bad arguments:\n ${dir} \n ${preset} \n ${handBrakeCLI}`, true);
	}

	//return arguments
	return { dir, handBrakeCLI, preset };
};

const resolvePath = (filePath) => {
	try {
		filePath = path.resolve(filePath);
		return filePath;
	} catch (e) {
		appError(`Bad path inputted: ${filePath}`, true, e);
	}
};
