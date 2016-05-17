<?php
error_reporting(0);

$credentials = json_decode($_POST["credentials"], true);
$params = json_decode($_POST["parameters"], true);

// var_dump($credentials, $params);

// path of the folder where files are stored.
$path = "../dropbox/server";

// scan the directory for files.
$dir = scandir($path);

$dir = array_filter($dir, function ($o) {
  // remove system files and directories
  return !preg_match("/^\./", $o);
});

$results = array();

// create an assoc array of [name] = {ctime, size}
foreach ($dir as $x) {
  $results[$x] = array(
    "ctime" => filectime($path . "/" . $x),
    "size" => filesize($path . "/" . $x)
  );
}

// return the JSON encoded results
echo json_encode($results);

?>
