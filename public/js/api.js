var sh = require("shelljs");

var Upload = ((hook) => {
  /* the hook is the location of the server folder. */
  let utils = {
    sendRequest: (credentials, callback) => {
      $.ajax({
        type: "POST",
        url: utils.path("file-info"),
        data: {
          credentials: credentials
        },
        callback: callback,
        dataType: "json"
      });
    },
    upload: function (file, name, credentials, callback) {
      var chunks = utils.strops.chunk(file, 500000);

      let sendPiece = (x, id) => {
        let finished = (x == chunks.length - 1);

        $.ajax({
          type: "POST",
          url: utils.path("file-upload"),
          data: {
            finished: finished,
            file: {
              data: chunks[x],
              name: name,
              id: id
            }
          },
          callback: function (data) {
            /* send a callback to the parent function w/ progress. */
            try {
              data = JSON.parse(data);
            } catch (err) {
              console.log(data);
            }

            callback({
              data: {
                percent: (x + 1) / chunks.length,
                id: data.id,
                path: data.path,
                name: data.name,
                piece: x
              },
              finished: finished
            });

            /* if not finished, send the next chunk and data.id. */
            if (!finished && typeof data == "object") sendPiece(x + 1, data.id);
          }
        });
      };

      /* if ID isn't assigned, it'll be null & sent to server to create. */
      sendPiece(0, null);
    },
    path: function (api_name) {
      return hook + "/" + api_name + ".php";
    },
    strops: {
      chunk: (str, ch_size) => {
        let chunks = [];

        while (str.length > 0) {
          chunks.push(str.substr(0, ch_size));
          str = str.substr(ch_size);
        }

        return chunks;
      }
    }
  };

  let _Upload = {
    fileInformation: (credentials, callback) => {
      utils.sendRequest(credentials, callback);
    },
    uploadFile: (file, name, credentials, callback) => {
      utils.upload(file, name, credentials, callback);
    }
  };

  return _Upload;
});

var upload = Upload("http://localhost/personal/dropbox/server");
