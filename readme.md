#Dropbox Application
This is a basic dropbox application that runs on Electron. Currently this does not connect to a server; it is being tested to perfection locally before building an API to interface with a server.

#How It Works
You input a local directory (eg. `dropbox/local`) and a server directory (eg. `dropbox/server`). Now, every time you put files into the local directory, they should automatically copy over to the server directory.

#Connecting
By clicking the "Connect" button, it analyzes both directories for files and will list all files along with a notification as to whether they are "Up to date" (mirrored) or not.

#Sync
The sync feature finds all the differences in the folders, and updates in both directions by sending missing files in each direction and overwriting older copies of files with newer copies.

#Watch
Now that the local and server folders are connected &mdash; adding files, removing files, and renaming files will all take place on both versions. No syncing required.

#Demo Image
![Demo Image](https://raw.githubusercontent.com/brockwhittaker/Desktop-Dropbox/master/dropbox/local/demo_screenshot.png)
