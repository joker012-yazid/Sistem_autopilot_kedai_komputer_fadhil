const fs = require("node:fs");

function normalize(error) {
  if (error && error.code === "EISDIR" && error.syscall === "readlink") {
    error.code = "EINVAL";
  }
  return error;
}

const originalReadlink = fs.readlink;
fs.readlink = function patchedReadlink(...args) {
  const callback = args[args.length - 1];
  if (typeof callback === "function") {
    args[args.length - 1] = (error, result) => callback(normalize(error), result);
  }
  return originalReadlink.apply(this, args);
};

const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function patchedReadlinkSync(...args) {
  try {
    return originalReadlinkSync.apply(this, args);
  } catch (error) {
    throw normalize(error);
  }
};

if (fs.promises?.readlink) {
  const originalPromiseReadlink = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = async (...args) => {
    try {
      return await originalPromiseReadlink(...args);
    } catch (error) {
      throw normalize(error);
    }
  };
}
