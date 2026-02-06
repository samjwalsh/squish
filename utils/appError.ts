import fs from 'fs';

import { config } from '../config';
import { insertBar } from './consoleEffects';

const appError = (message: string, exit: boolean, e?: unknown) => {
  insertBar();
  console.log(message);
  if (e) console.log(e);
  insertBar();
  if (exit) {
    let date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    date = new Date(`${year}-${month}-${day}`);
    const errorMessage = e instanceof Error ? e.toString() : String(e);
    fs.writeFileSync(
      `${config.inputDir}/Squish CRON ${day}-${month}-${year} CRASH.log`,
      errorMessage
    );

    process.exit(1);
  }
};

export default appError;
