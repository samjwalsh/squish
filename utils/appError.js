const consoleEffects = require('./consoleEffects');
const fs = require('fs');
const path = require('path');

module.exports = (message, exit, e) => {
	consoleEffects.insertBar();
	console.log(message);
	if (e) console.log(e);
	consoleEffects.insertBar();
	if (exit) {
		//Writes error to root directory
		let date = new Date();
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
		const year = date.getFullYear();
		date = `${day}-${month}-${year}`;
		fs.writeFileSync(`${path.resolve('./')}/Squish CRON ${date} CRASH.log`, e.toString());

		process.exit(1);
	}
};
