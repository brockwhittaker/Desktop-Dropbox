var Dropbox = (() => {
  let async = require("async");
  let chokidar = require("chokidar");

  var defaultStorage;

  var utils = {
    readDirectory: (parent_callback) => {
      storage = defaultStorage();

      var readLocal = (callback) => {
        utils.file.directory(storage.local.dir, (data) => {
          storage.local.files = data;
          callback();
        });
      };

      /* we don't need to read the files from the server. Both this and the info
         are done in the next step. */

      async.parallel(
        [readLocal],
        parent_callback
      );
    },
    getFileInformation: (parent_callback) => {
      var fileInfoLocal = (callback) => {
        let counter = 0;

        storage.local.files.forEach((o) => {
          fs.stat(utils.strops.toFullLocal(o), (err, data) => {
            storage.local.info[o] = data;

            counter++;
            if (counter == storage.local.files.length) callback();
          });
        });

        if (storage.local.files.length === 0) callback();
      };

      var fileInfoServer = (callback) => {
        let counter = 0;

        upload.fileInformation(null, function (data) {
          storage.server.files = Object.keys(data);
          storage.server.info = data;

          callback();
        });
      };

      async.parallel(
        [fileInfoLocal, fileInfoServer],
        parent_callback
      );
    },

    /* this function will only return an array of DIFFERENCES. If two files are
       identical, it isn't going to change anything nor add to object. */
    getLatestVersion: (parent_callback) => {
      var pv = storage.composite.pref_version;

      for (let x in storage.local.info) {
        let local = storage.local.info[x],
            server = storage.server.info[x];
        /* if the server doesn't have it, or if the ctime is different, add it. */
        if (!storage.server.info[x] ||
            (local.ctime > server.ctime && server.size !== local.size)) {
          pv[x] = {source: "local", path: x};
        }
      }

      for (let x in storage.server.info) {
        let local = storage.local.info[x],
            server = storage.server.info[x];
        /* if the local doesn't have it, or if the ctime is newer, add it. */
        if (!storage.local.info[x] ||
            (server.ctime > local.ctime && server.size !== local.size)) {
          pv[x] = {source: "server", path: x};
        }
      }

      parent_callback();
    },

    copyFiles: (parent_callback) => {
      var toServer = (callback) => {
        var pv = storage.composite.pref_version;
        pv = Object.keys(pv)
          .map((o) => pv[o] )
          .filter((o) => o.source == "local");

        var counter = 0,
            total = pv.length;

        // if a file is on step one, create the file...
        var fileInit = (response) => {
          utils.UI.drawElemFromLocal(response.data.name, $(".file-system.server"));
        };

        // if it is another step (block) uploaded from file...
        var fileStep = (response) => {
          let hash = crypto.createHash('md5').update(response.data.name).digest('hex');

          $(`[name=h-${hash}]`)
            .find("div.percent")
            .html((response.data.percent * 100).toFixed(0) + "%");
        };

        // if the file has finished uploading...
        var fileFinished = (response) => {
          let hash = crypto.createHash('md5').update(response.data.name).digest('hex'),
              $percent = $(`[name=h-${hash}]`);

          $percent
            .find("div.percent")
            .html("100%");

          setTimeout(function () {
            $percent.remove();
          }, 500);
        };

        pv.forEach((file) => {
          utils.file.sendToServer(
            utils.strops.toFullLocal(file.path),
            file.path,
            (response) => {
              if (response.data.piece === 0) fileInit(response);

              if (response.finished) {
                fileFinished(response);
                if (++counter == total) callback();
              } else {
                fileStep(response);
              }
            }
          );
        });

        if (pv.length === 0) callback();
      };

      var toLocal = (callback) => {
        var pv = storage.composite.pref_version;
        pv = Object.keys(pv)
          .map((o) => pv[o] )
          .filter((o) => o.source == "server");

        var counter = 0,
            total = pv.length;

        pv.forEach((file) => {
          utils.file.copy(
            utils.strops.toFullServer(file.path),
            utils.strops.toFullLocal(file.path),
            () => {
              if (++counter == total) callback();
            });
        });

        if (pv.length === 0) callback();
      };

      async.parallel(
        [toServer, toLocal],
        parent_callback
      );
    },

    __meta: (parent_callback) => {
      //console.log(storage);

      parent_callback();
    },

    filter: {
      hiddenFiles: (arr) => {
        return arr.filter((o) => {
          return !/^\./.test(o);
        });
      }
    },

    index: {
      read: (parent_callback) => {
        let readLocalIndex = (callback) => {
          fs.readFile(utils.strops.toFullLocal(".dropbxindex"), (error, data) => {
            if (!error) {
              storage.index.local = JSON.parse(data);
            }
            callback();
          });
        };

        let readServerIndex = (callback) => {
          fs.readFile(utils.strops.toFullServer(".dropbxindex"), (error, data) => {
            if (!error) {
              storage.index.server = JSON.parse(data);
            }
            callback();
          });
        };

        async.parallel(
          [readLocalIndex, readServerIndex],
          parent_callback
        );
      },

      operate: (parent_callback) => {
        let changes = {
          local: [],
          server: []
        };

        if ((!storage.index.server.delete && !storage.index.local.delete) &&
            (!storage.index.server.add && !storage.index.local.add)) {
              parent_callback();
        }

        let deleteLocal = (callback) => {
          let server = storage.index.server.delete,
              counter = 0;

          if (server.length === 0) callback();

          server.forEach(o => {
            utils.file.remove(utils.strops.toFullLocal(o), () => {
              if (++counter == server.length) callback();
            });
          });
        };

        let deleteServer = (callback) => {
          let local = storage.index.local.delete,
              counter = 0;

          if (local.length === 0) callback();

          local.forEach(o => {
            utils.file.remove(utils.strops.toFullServer(o), () => {
              if (++counter == local.length) callback();
            });
          });
        };

        let addLocal = (callback) => {
          let server = storage.index.server.add,
              counter = 0;

          if (server.length === 0) callback();

          server.forEach(o => {
            utils.file.copy(
              utils.strops.toFullServer(o),
              utils.strops.toFullLocal(o),
              () => { if (++counter == server.length) callback(); }
            );
          });
        };

        let addServer = (callback) => {
          let local = storage.index.local.add,
              counter = 0;

          if (local.length === 0) callback();

          local.forEach(o => {
            utils.file.copy(
              utils.strops.toFullLocal(o),
              utils.strops.toFullServer(o),
              () => { if (++counter == local.length) callback(); }
            );
          });
        };

        async.parallel(
          [deleteLocal, deleteServer, addLocal, addServer],
          parent_callback
        );
      },

      write: (parent_callback) => {
        let writeLocal = () => {
          util.file.write(
            utils.strops.toFullLocal(".dropbxindex"),
            JSON.stringify(storage.index.local),
            callback
          );
        };

        let writeServer = () => {
          util.file.write(
            utils.strops.toFullServer(".dropbxindex"),
            JSON.stringify(storage.index.server),
            callback
          );
        };

        async.parallel(
          [writeLocal, writeServer],
          parent_callback
        );
      }
    },

    file: {
      copy: (source, target, callback) => {
        var rd = fs.createReadStream(source);
        rd.on("error", (err) => {
          //done(err);
        });
        var wr = fs.createWriteStream(target);
        wr.on("error", (err) => {
          //done(err);
        });
        wr.on("close", (ex) => {
          callback();
        });
        rd.pipe(wr);
      },

      sendToServer: function (path, name, callback) {
        fs.readFile(path, function (err, data) {
          data = new Buffer(data).toString('base64');

          console.log(data.substr(0, 100));

          upload.uploadFile(data, name, {}, (response, finished) => {
            callback(response, finished);
          });
        });
      },

      directory: (path, callback) => {
        fs.readdir(path, (err, data) => {
          callback(utils.filter.hiddenFiles(data || []));
        });
      },

      information: (path, files, callback) => {
        let counter = 0;
        let info = [];

        if (files.length === 0) callback([]);

        files.forEach((o) => {
          fs.stat(path + "/" + o, (err, data) => {
            info[o] = data;

            counter++;
            if (counter == files.length) callback(info);
          });
        });
      },

      remove: (path, callback) => {
        fs.unlink(path, callback);
      },

      rename: (old_path, new_path, callback) => {
        fs.rename(old_path, new_path, callback);
      },

      watch: (callback) => {
        chokidar.watch(storage.local.dir, {ignored: /[\/\\]\./}).on("all", (event, path) => {
          path = utils.strops.toLocal(path);

          if (event == "add" && storage.local.files.indexOf(path) == -1) {
            storage.index.local.add.push(path);
            utils.index.operate(callback.bind(null, "local", event, path));
          } else if (event == "unlink") {
            storage.index.local.delete.push(path);
            console.log(event, path);
            utils.index.operate(callback.bind(null, "local", event, path));
          }
        });
      },

      write: (path, data, callback) => {
        fs.writeFile(path, data, callback);
      }
    },
    UI: {
      drawList: (arr, pv, $container) => {
        var diff = Object.keys(pv).length > 0;

        let $header = $container.parent()
          .find(".file-system-header div")
          .html("");

        $container.html("");


        $header.append(
          $.create(
            `<div class='uptodate${diff ? " not" : ""}'>
            ${diff ? "Not up to date ✘" : "Up to date ✓"}</div>`
          )
        );

        for (let x in arr) {
          let size = (arr[x].size / Math.pow(1024, 2)).toFixed(2);

          let item = $.create(`<div class='file-item'>
            <div class='name'>${x}</div>
            <div class='size'>${size}MB</div>
            <div class='clear-float'></div>
          </div>`);
          $container.append(item);
        }
      },
      drawElemFromLocal: (name, $container) => {
        let size = (storage.local.info[name].size / Math.pow(1024, 2)).toFixed(2),
            hash = crypto.createHash('md5').update(name).digest('hex');

        // prefix with h- because name attr can't start w/ number
        let item = $.create(`<div class='file-item' name='h-${hash}'>
          <div class='name'>${name}</div>
          <div class='size'>${size}MB</div>
          <div class='percent'>0%</div>
          <div class='clear-float'></div>
        </div>`);

        $container.append(item);
      }
    },
    strops: {
      toLocal: (full_path) => {
        return full_path.replace(storage.local.dir + "/", "");
      },
      toServer: (full_path) => {
        return full_path.replace(storage.server.dir + "/", "");
      },
      toFullLocal: (path) => {
        return storage.local.dir + "/" + path;
      },
      toFullServer: (path) => {
        return storage.server.dir + "/" + path;
      }
    }
  };

  class _Dropbox {
    constructor (local, server) {
      defaultStorage = () => {
       return {
         local: {
           dir: local,
           files: null,
           info: {}
         },
         server: {
           dir: server,
           files: null,
           info: {}
         },
         composite: {
           pref_version: {}
         },
         index: {
           local: {
             add: [],
             delete: []
           },
           server: {
             add: [],
             delete: []
           }
         }
       };
     };
    }

    sync (callback) {
      async.series([
        utils.readDirectory,
        utils.getFileInformation,
        utils.getLatestVersion,
        utils.copyFiles,
        utils.__meta,
        utils.index.read,
        callback.bind(this, storage.composite.pref_version)
      ]);
    }

    updateIndex (callback) {
      async.series([
        utils.index.read,
        utils.index.operate,
        //callback.bind(this, storage.index)
      ]);
    }

    view (version) {
      var getStats = (callback) => {
        utils.file.directory(storage[version].dir, (files) => {
          utils.file.information(storage[version].dir, files, (stats) => {
            callback(stats);
          });
        });
      };

      var readInformation = (parent_callback) => {
        async.series([
          utils.readDirectory,
          utils.getFileInformation,
          utils.getLatestVersion,
          function (callback) {
            callback();
            parent_callback(storage.composite.pref_version);
          }
        ]);
      };

      readInformation((pv) => {
        getStats((stats) => {
          utils.UI.drawList(stats, pv, $(".file-system." + version));
        });
      });
    }

    watch (callback) {
      utils.file.watch(callback);
    }
  }

  return _Dropbox;
})();

/*
3. Merge conflicts with same file updates. Keep local, server, or both?
4. Uploading graphics. Currently it happens so fast it doesn't matter (since it's local), but on the web I'll want to track progress and show it.
5. Option to sync only a particular file at a given time if internet is slow or if you don't want to sync ALL files.
*/
