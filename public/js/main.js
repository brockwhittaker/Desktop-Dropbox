(function () {
  let async = require("async");

  var $el = {
    local: $("input[name=local]"),
    server: $("input[name=server]"),
    connect: $("button[name=connect]")
  };

  var utils = {
    disableConnection: () => {
      $el.connect
        .disable()
        .addClass("disabled")
        .html("Connected");
    },
    enableConnection: () => {
      $el.connect
        .enable()
        .removeClass("disabled")
        .html("Connect");
    }
  };

  var local_path = $el.local.val();
  var server_path = $el.server.val();

  $el.local.on("input", function () {
    utils.enableConnection();
    local_path = this.value;
  });

  $el.server.on("input", function () {
    utils.enableConnection();
    server_path = this.value;
  });

  $el.connect.click(() => newDropbox());

  var view = (dropbox) => {
    dropbox.view("local");
    dropbox.view("server");
  };

  var newDropbox = () => {
    utils.disableConnection();

    dropbox = new Dropbox(local_path, server_path);
    view(dropbox);

    dropbox.watch((version, event, path) => {
      view(dropbox);
      console.log(version, event, path);
    });
  };

  $("button[name=sync]").click(function () {
    let self = this;
    dropbox.sync((obj) => {
      $(self).html("Sync'd! ✓");
      view(dropbox);
    });
  });
})();
