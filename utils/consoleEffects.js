const consoleEffects = require('./consoleEffects');

exports.insertBar = () => {
	console.log('-'.repeat(process.stdout.columns));
};

exports.nowDoing = (message) => {
	consoleEffects.insertBar();
	console.log(message);
	consoleEffects.insertBar();
};
