export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,
};

export const access = async () => {};
export const unlink = async () => {};
export const mkdir = async () => {};
export const writeFile = async () => {};
export const readFile = async () => '';
export const readdir = async () => [];

export default {
  constants,
  access,
  unlink,
  mkdir,
  writeFile,
  readFile,
  readdir,
};
