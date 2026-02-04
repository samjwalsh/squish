const fs = require('fs');
const path = require('path');

const start = Date.now();
const startDate = new Date();

try {
  const argController = require('./controllers/argController');
  const mediaController = require('./controllers/mediaController');
  const transcodeController = require('./controllers/transcodeController');
  const consoleEffects = require('./utils/consoleEffects');

  //Getting arguments
  const { dir, handBrakeCLI, preset } = argController.getArgs();

  checkIfAlreadyRunning(dir);

  //Async function used to allow async functions
  (async () => {
    //Gets all the video files in the directory without [SQUISH] at the end
    consoleEffects.nowDoing(
      `Searching all folders and subfolders for content (Will take a while)`
    );
    const files = await mediaController.searchFolders(dir);

    let { errors, success, sourceNotDeleted, handBrakeCommandFail } =
      transcodeController.transcodeVideos(files, handBrakeCLI, preset, dir);

    createReport(
      start,
      files,
      errors,
      success,
      sourceNotDeleted,
      handBrakeCommandFail,
      dir
    );
  })().catch((e) => {
    console.log(e);
    handleError(e);
  });
} catch (e) {
  console.log(e);

  handleError(e);
}

function createReport(
  start,
  files,
  errors,
  success,
  sourceNotDeleted,
  handBrakeCommandFail,
  dir
) {
  //Get todays date for output file
  const day = String(startDate.getDate()).padStart(2, '0');
  const month = String(startDate.getMonth() + 1).padStart(2, '0'); //January is 0!
  const year = startDate.getFullYear();
  let date = `${year}-${month}-${day}`;

  let output = '';
  output += `Squish CRON log for ${date}\n\n`;

  //Format execution time
  const milliseconds = Date.now() - start;

  let executionTime =
    Math.floor(milliseconds / (1000 * 60 * 60)) +
    ':' +
    (Math.floor(milliseconds / (1000 * 60)) % 60) +
    ':' +
    (Math.floor(milliseconds / 1000) % 60);

  output += `Execution Time: ${executionTime}\n`;
  output += `Videos Detected: ${files.length}\n`;
  output += `Videos Succeeded: ${success.length}\n`;
  output += `Source Not Deleted: ${sourceNotDeleted.length}\n`;
  output += `Failed In Handbrake: ${errors.length}\n`;
  output += `Error Opening Handbrake: ${handBrakeCommandFail.length}\n`;

  output += '\n \nVideos Succeeded:';
  success.forEach((file) => {
    output += `\n ${file.name}`;
  });

  output += `\n \nSource not deleted:`;
  sourceNotDeleted.forEach((file) => {
    output += `\n ${file.name}`;
  });

  output += `\n \nVideos Failed in Handbrake:`;
  errors.forEach((file) => {
    output += `\n ${file.name}`;
  });

  output += `\n \nVideos not opened in Handbrake:`;
  handBrakeCommandFail.forEach((file) => {
    output += `\n ${file.name}`;
  });

  //Writing output file
  fs.writeFileSync(`${dir}/Squish CRON ${date}.log`, output);
}

function handleError(e) {
  const day = String(startDate.getDate()).padStart(2, '0');
  const month = String(startDate.getMonth() + 1).padStart(2, '0'); //January is 0!
  const year = startDate.getFullYear();
  let date = `${year}-${month}-${day}`;

  console.log(path.resolve('./'));

  fs.writeFileSync(
    `${path.resolve('./')}/Squish CRON ${date} CRASH.log`,
    e.toString()
  );
}

function checkIfAlreadyRunning(dir) {
  if (fs.existsSync(`${dir}/Squish CRON.log`)) {
    const day = String(startDate.getDate()).padStart(2, '0');
    const month = String(startDate.getMonth() + 1).padStart(2, '0'); //January is 0!
    const year = startDate.getFullYear();
    let date = `${year}-${month}-${day}`;

    fs.writeFileSync(
      `${dir}/Squish CRON ${date}.log`,
      'Process alreading running at time of CRON job'
    );

    process.exit();
  }
  return;
}
