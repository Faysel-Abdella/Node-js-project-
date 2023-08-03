const fs = require("fs");

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    //unlike() will remove the file
    if (err) {
      throw err;
    }
  });
};

exports.deleteFile = deleteFile;
