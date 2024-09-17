export const sleep = (msec: number) => new Promise(resolve => setTimeout(resolve, msec));

export const randRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
