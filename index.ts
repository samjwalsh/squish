import fs from 'fs';
import path from 'path';

import { config } from './config';
import { searchFolders } from './controllers/mediaController';
import { transcodeVideos } from './controllers/transcodeController';
import { nowDoing } from './utils/consoleEffects';

const start = Date.now();
const startDate = new Date();

(async () => {
  checkIfAlreadyRunning(config.inputDir);

  nowDoing(
    'Searching all folders and subfolders for content (Will take a while)'
  );
  const files = await searchFolders(config.inputDir);

  const { results, queuedFiles, skippedFiles } = await transcodeVideos(
    files,
    config
  );

  createReport(
    start,
    queuedFiles,
    skippedFiles,
    results,
    config.inputDir
  );
})().catch((e) => {
  console.log(e);
  handleError(e);
});

function createReport(
  startTime: number,
  files: string[],
  skippedFiles: string[],
  results: {
    errors: { name: string; presetId: string }[];
    success: { name: string; presetId: string }[];
    sourceNotDeleted: { name: string; presetId: string }[];
    handBrakeCommandFail: { name: string; presetId: string }[];
  },
  dir: string
) {
  const day = String(startDate.getDate()).padStart(2, '0');
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const year = startDate.getFullYear();
  const date = `${year}-${month}-${day}`;

  let output = '';
  output += `Squish CRON log for ${date}\n\n`;

  const milliseconds = Date.now() - startTime;
  const executionTime =
    Math.floor(milliseconds / (1000 * 60 * 60)) +
    ':' +
    (Math.floor(milliseconds / (1000 * 60)) % 60) +
    ':' +
    (Math.floor(milliseconds / 1000) % 60);

  output += `Execution Time: ${executionTime}\n`;
  output += `Videos Detected: ${files.length + skippedFiles.length}\n`;
  output += `Videos Queued: ${files.length}\n`;
  output += `Videos Skipped: ${skippedFiles.length}\n`;
  output += `Videos Succeeded: ${results.success.length}\n`;
  output += `Source Not Deleted: ${results.sourceNotDeleted.length}\n`;
  output += `Failed In Handbrake: ${results.errors.length}\n`;
  output += `Error Opening Handbrake: ${results.handBrakeCommandFail.length}\n`;

  output += '\n \nVideos Succeeded:';
  results.success.forEach((file) => {
    output += `\n ${file.name} (${file.presetId})`;
  });

  output += '\n \nSource not deleted:';
  results.sourceNotDeleted.forEach((file) => {
    output += `\n ${file.name} (${file.presetId})`;
  });

  output += '\n \nVideos Failed in Handbrake:';
  results.errors.forEach((file) => {
    output += `\n ${file.name} (${file.presetId})`;
  });

  output += '\n \nVideos not opened in Handbrake:';
  results.handBrakeCommandFail.forEach((file) => {
    output += `\n ${file.name} (${file.presetId})`;
  });

  if (skippedFiles.length > 0) {
    output += '\n \nVideos skipped (already completed):';
    skippedFiles.forEach((file) => {
      output += `\n ${file}`;
    });
  }

  fs.writeFileSync(`${dir}/Squish CRON ${date}.log`, output);
}

function handleError(e: unknown) {
  const day = String(startDate.getDate()).padStart(2, '0');
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const year = startDate.getFullYear();
  const date = `${year}-${month}-${day}`;

  console.log(path.resolve('./'));

  const message = e instanceof Error ? e.toString() : String(e);
  fs.writeFileSync(
    `${path.resolve('./')}/Squish CRON ${date} CRASH.log`,
    message
  );
}

function checkIfAlreadyRunning(dir: string) {
  if (fs.existsSync(`${dir}/Squish CRON.log`)) {
    const day = String(startDate.getDate()).padStart(2, '0');
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const year = startDate.getFullYear();
    const date = `${year}-${month}-${day}`;

    fs.writeFileSync(
      `${dir}/Squish CRON ${date}.log`,
      'Process already running at time of CRON job'
    );

    process.exit();
  }
}
