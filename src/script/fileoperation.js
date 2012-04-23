//App目录对应的air.File对象
var appStorage = air.File.applicationStorageDirectory;
//Document目录对应的air.File对象
var docStorage = air.File.documentsDirectory;

//写文件的通用方法
function writeFile(path, content) {
    var file = getFile(path);

    try {

        var stream = new air.FileStream();
        stream.open(file, "write");

        content = content.replace(/\r?\n/g, "\r\n");
        stream.writeUTFBytes(content);
        stream.close();
        return true;
    }
    catch (e) {
        alert("An error occurred, maybe you should close the opening file?");
        return false;
    }
}

function readFile(path) {
    var file = getFile(path);

    var data;
    try {
        var stream = new air.FileStream();
        stream.open(file, "read");
        data = stream.readUTFBytes(stream.bytesAvailable);
        stream.close();
    }
    catch (e) {
        data = "";
    }

    return data;
}

function getAvailFile(dir, nameTpl) {
    var file;
    var i = 1;
    do file = dir.resolvePath(nameTpl.replace("*", i++));
    while (file.exists);
    return file;
}

function getFile(path) {
    var file;
    if (typeof path == "string") {
        var pathInfo = path.match(/(app|doc):(.+)/);
        if (pathInfo) {
            var storage = pathInfo[1] == "app" ? appStorage : docStorage;
            path = pathInfo[2];
            file = storage.resolvePath(path);
        }
        else {
            file = new air.File(path);
        }
    }
    else {
        file = path;
    }

    return file;
}