(function () {
  let async = require("async");

  var local = $("input[name=local]").val();
  var server = $("input[name=server]").val();

  let dropbox = new Dropbox(local, server);

  var view = () => {
    dropbox.view("local");
    dropbox.view("server");
  };

  view();
  dropbox.watch((version, event, path) => {
    view();
    console.log(version, event, path);
  });


  $("button[name=sync]").click(function () {
    let self = this;
    dropbox.sync((obj) => {
      $(self).html("Sync'd! ✓");
      view();
    });
  });
})();
