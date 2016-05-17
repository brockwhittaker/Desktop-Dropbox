<?php

/* BUG SOLUTION --
The reason why some errored out but still successfully came through was because
the photos uploaded in only one step. The ID didn't already exist, so it needed
to be created on the fly!
*/

$finished = $_POST["finished"];
$file = json_decode($_POST["file"], true);

function randomString ($length = 10) {
  $alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  $a_len = strlen($alphabet);

  $str = '';

  for ($i = 0; $i < $length; $i++) {
      $str .= $alphabet[rand(0, $a_len - 1)];
  }

  return $str;
}

function notDone ($data, $id) {
  file_put_contents("temp/" . $id . ".txt", $data, FILE_APPEND);
}

function done ($data, $id, $name) {
  // if the file doesn't exist because it's only a single block, don't freak out.
  $contents = @file_get_contents("temp/" . $id . ".txt");

  // append this block of data.
  $contents .= $data;
  $contents = str_replace(" ", "+", $contents);
  $contents = base64_decode($contents);

  file_put_contents("../dropbox/server/" . $name, $contents);

  // if the file doesn't exist, you can't unlink. Stop PHP from freaking out.
  @unlink("temp/" . $id . ".txt");
}

if (isset($file["id"])) {
  $id = $file["id"];
} else {
  $id = randomString(20);
}

if ($finished != "true") {
  notDone($file["data"], $id);
} else {
  done(
    $file["data"],
    $id,
    $file["name"]
  );
}

echo json_encode(array(
  "name" => $file["name"],
  "id" => $id,
  "path" => getcwd() . "/" . $file["name"]
));

?>
