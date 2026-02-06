export const insertBar = () => {
  const width = process.stdout.columns ?? 80;
  console.log('-'.repeat(width));
};

export const nowDoing = (message: string) => {
  insertBar();
  console.log(message);
  insertBar();
};
