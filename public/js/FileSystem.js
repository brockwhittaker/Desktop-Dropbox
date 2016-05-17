let fs = require("fs");
let crypto = require('crypto');

var FileSystem = (function () {
  var _FileSystem = function () {

  };

  var storage = {
    cd: null
  };

  _FileSystem.prototype = {
    getFilesInDirectory: function (dir, callback) {
      storage.cd = dir;

      fs.readdir(storage.cd, function (err, data) {
        callback(err, data);
      });
    },
    getDirectory: function () {
      return storage.cd;
    },
    nextDirectory: function (dir, callback) {
      this.getFilesInDirectory(storage.cd + "/" + dir, callback);
    },
    file: {
      info: function (file_path, callback) {
        fs.stat(storage.cd + "/" + file_path, function (err, data) {
          callback(err, data);
        });
      },
      hash: function (file_path, callback) {
        fs.readFile(storage.cd + "/" + file_path, "utf8", function (err, data) {
          let hash = crypto
            .createHash("md5")
            .update(data)
            .digest("hex");

          callback(hash);
        });
      },
      read: function (file_path, callback) {
        fs.readFile(storage.cd + "/" + file_path, "utf8", function (err, data) {
          callback(data);
        });
      }
    }
  };

  return _FileSystem;
})();
