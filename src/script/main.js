/// <reference path="AIRAliases.js" />
/// <reference path="request.js" />
/// <reference path="fileoperation.js" />

/*
    SELF REMINDER
    DON'T FORGET TO CHANGE THE VERSION PROPERTY OF THESE FILES:
    analyzer-app.xml
    ver.json
*/
var version = {
    ver: "1.5.2",
    verString: "1.5.2 Beta",
    verCount: 24
};

var onlineVer;

var appendMode = false;
var multiMode = false;
var formData = '';
var formCount = 0;
var searchValues = {};
var committeesList = '';
var fns;
var exportHandle, exportDataTree;

var user;

var noConn = false;

var defStatus = 'By <a href="http://www.vilic.info/" target="_blank" title="Click to visit VILIC\'s Blog (Chinese).">VILIC@CQU</a>';
var accountFile = 'app:account';

var branch = "master";

(function () {
    var headFile = new air.File("C:\\VSProjects\\Analyzer\\Analyzer\\.git\\HEAD");
    if (!headFile.exists) return;

    var text = readFile(headFile);
    var line = text.match(/ref: .+/)[0];
    var b = line.match(/[^\/]+$/)[0];
    if (b)
        branch = b;
})();

var gitBaseUrl = "https://raw.github.com/vilic/Analyzer/" + branch;

(function () {
    var info;
    try {
        info = atob(readFile(accountFile)).split("\n");
    }
    catch (e) {
        info = "";
    }
    user = { account: info[0] || "", password: info[1] || "" };
})();

//login();

window.onbeforeunload = clearConn;

window.onload = function () {
    idToVar(window);

    //statusbox
    (function () {
        status_box.innerHTML = defStatus;

        this.statusBox = {
            reset: function () {
                status_box.innerHTML = defStatus;
            },
            set: function (status) {
                status_box.innerHTML = status;
            }
        };

        statusBox.reset();
    })();

    if (!docStorage.resolvePath("vilic_analyzer_mark").exists)
        cnzz.src = "http://www.vilic.info/aiesec/tnfa/cnzz.html?v=" + version.ver;
        
    document.title += " [" + version.verString + "]";
    setTimeout(function () {
        sendRequest("get", gitBaseUrl + "ver.json", "", function (json) {
            var onlineVer = JSON.parse(json);
            if (onlineVer.verCount > version.verCount) {
                var force = onlineVer.forceUpdate >= version.verCount;
                var msg = "A newer version(" + onlineVer.verString + ") is now available, " + (force ? "you'll have to update before you can continue using Analyzer." : "click OK to update.");
                if (onlineVer.description)
                    msg += "\n\nDescription:\n" + onlineVer.description;
                if ((force ? alert : confirm)(msg) || force)
                    update(onlineVer.ver);
            }
        });
    }, 500);

    fns = {
        "import": { bt: import_bt, isAvail: function () { return !!user.account; }, src: "import.html", exeFn: importData },
        "export": { bt: export_bt, isAvail: function () { return formCount > 0 && user.account; }, src: "export.html", exeFn: exportData },
        "save": { bt: save_bt, isAvail: function () { return formCount > 0 && user.account; }, exeFn: saveData },
        "tools": { bt: tools_bt, isAvail: function () { return formCount > 0 && user.account; }, src: "tools.html", exeFn: showTools },
        "settings": { bt: settings_bt, isAvail: function () { return true; }, src: "settings.html", exeFn: showSettings },
        "search": { src: "search.html", exeFn: search },
        "analysisDetails": { src: "analysisDetails.html", exeFn: function () { return true; } }
    };

    var current;

    for (var i in fns)
        (function () {
            var fn = fns[i];

            fn.exec = exec;

            if (fn.bt)
                fn.bt.onmouseover = function () {
                    if (this.className == "current") return;
                    this.className = fn.isAvail() ? (this.onclick = exec, "enable") : (this.onclick = null, "");
                };

            function exec() {
                clearConn();
                statusBox.reset();
                if (fn.src) main_iframe.src = fn.src;
                var cc = false;
                if (fn.exeFn) cc = !(fn.exeFn() == false);
                if (cc) {
                    if (current) current.className = "";
                    if (current = fn.bt) fn.bt.className = "current";
                }
            }
        })();

    if (user.account)
        fns["import"].exec();
    else
        fns["settings"].exec();

    document.addEventListener("keypress", function (e) {
        //shift + ctrl + A
        if (e.keyCode == 1)
            fns["analysisDetails"].exec();
    });

    //fns["analysisDetails"].exec();

    //login();
};

(function () {
    var interval;
    this.resize = function(width, height, callback) {
        clearInterval(interval);

        var win = nativeWindow;

        var ow = document.body.offsetWidth;
        var oh = document.body.offsetHeight;

        interval = setInterval(step, 20);

        function step() {
            var dw = Math.ceil((width - document.body.offsetWidth) / 2);
            var dh = Math.ceil((height - document.body.offsetHeight) / 2);
            holder.style.width = (ow += dw) + "px";
            holder.style.height = (oh += dh) + "px";
            if (dw || dh)
            {
                //win.x -= dw / 2;
                //win.y -= dh / 2;
                win.width += dw;
                win.height += dh;
            }
            else
            {
                clearInterval(interval);
                if (callback) callback();
            }
        }
    };
    
    this.maximize = function(callback){ resize(600, 370); };
    this.minimize = function(callback){ resize(400, 240); };
})();

function importData() {
    minimize();
}

function exportData() {
    maximize();

    var tree = {},
        forms = [],
        re = /(?:\r?\n|^)-{50}(\r?\n[\s\S]*?)(?=\r?\n-{50}\r?\n|$)/g,
        cRE = />> ([\s\S]+?)(?=(\r?\n>> |$))/g,
        dRE = / > (.+)/g,
        parts;

    while (parts = re.exec(formData))
        forms.push(parts[1]);

    for (var i = 0; i < forms.length; i++)
        while (parts = cRE.exec(forms[i])) {
            var text = parts[1],
                h = trim(text.substr(0, text.indexOf("\n"))),
                b = tree[h] = tree[h] || [],
                subParts;
            while (subParts = dRE.exec(text))
                insertUnique(b, addHeader(trim(subParts[1]), h));
        }

    exportDataTree = tree;

    exportHandle = function (items) {
        var db = [],
            reStrs = [],
            iCount = items.length,
            map = {};

        var csv = "";

        for (var i = 0; i < iCount; ++i) {
            if (i) csv += ",";
            csv += formatString(items[i]);
            map[items[i]] = true;
            reStrs.push(items[i].replace(/ \([\s\S]*\)$/, "").replace(/([\.\[\]\*\+\?\|\^\$\{\}\\\<\>\(\)])/g, "\\$1"));
        }

        var reStr = "(?: > (" + reStrs.join("|") + ")[\\r\\n]|>> ([^\\r\\n]*))([\\s\\S]*?)(?=\\r?\\n > |\\r?\\n>> |$)";
        var iRE = new RegExp(reStr, "g");
        var fi = 0;

        for (var i = 0; i < forms.length; i++) {
            var cdb = db[fi++] = {};
            var lH = "";
            while (parts = iRE.exec(forms[i])) {
                var itemName;
                if (parts[2])
                    lH = parts[2];
                else if (map[itemName = addHeader(parts[1], lH)])
                    cdb[itemName] = contentDeal(parts[3]);
            }
        }

        for (var i = 0; i < fi; ++i) {
            csv += "\n";
            var cdb = db[i];
            for (var j = 0; j < iCount; ++j) {
                if (j) csv += ",";
                csv += formatString(cdb[items[j]] || "-");
            }
        }

        var obj = getAvailFile(docStorage, "forms(*).csv");
        obj.browseForSave("Export");

        obj.addEventListener("select", function (e) {
            var file = e.target;
            writeFile(file, csv);
            fns["import"].exec();
        });

        function formatString(str) {
            str = str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
            str = str.replace(/^[\s\S]*[\r\n",][\s\S]*$/, function (m) {
                return '"' + m.replace(/"/g, '""') + '"';
            });
            str = str.replace(/^\+?\d+(\.\d+)?$/g, function (m) {
                return '="' + m + '"';
            });

            return str;
        }

    };
}

function saveData() {
    var obj = getAvailFile(docStorage, "form-data(*).txt");
    obj.browseForSave("Save");

    obj.addEventListener("select", function (e) {
        var file = e.target;
        writeFile(file, formData);
    });

    setTimeout(fns["import"].exec, 0);
    return true;
}

function showTools() {
    minimize();
}

function showSettings() {
    minimize();
}

function search() {
    maximize();
}

function setFormInfo(fd, fc) {
    if (appendMode) {
        formData += fd;
        formCount += fc;
    }
    else {
        formData = fd;
        formCount = fc;
    }
}

function idToVar(window) {
    var eles = window.document.all || window.document.getElementsByTagName("*");
    for (var i = 0; i < eles.length; i++)
        if (eles[i].id)
            window[eles[i].id] = window.document.getElementById(eles[i].id);
}

function wait(window) {
    var cover = window.document.createElement("div");
    var waitimg = window.document.createElement("div");
    cover.className = "wait";
    waitimg.className = "waitimg";

    var body = window.document.body;
    body.appendChild(cover);
    body.appendChild(waitimg);

    return cancel;

    function cancel() {
        body.removeChild(cover);
        body.removeChild(waitimg);
    }
}

//------------------------------------------------------------

function addHeader(str, header) {
    return str + " (" + header + ")";
}

function contentDeal(str) {
    return str ? str.replace(/ +/g, " ").replace(/^\s+/, "").replace(/\s+$/, "").replace(/\r?\n/g, " / ") : "-";
}

function trim(str) {
    return str.replace(/(^\s+|\s+$)/g, "");
}

function getDate() {
    var date = new Date(),
        y = date.getFullYear(),
        m = date.getMonth() + 1,
        d = date.getDate();
    return y.toString() + (m < 10 ? "0" + m : m) + (d < 10 ? "0" + d : d);
}

function clearConn() {
    noConn = true;
    for (var i = 0; i < xhrs.length; i++)
        try {
            var xhr = xhrs[i]; //XMLHttpRequest or URLLoader
            if (xhr.abort) {
                xhr.onreadystatechange = function () { };
                xhr.abort();
            }
            else if (xhr.close)
                xhr.close();
        }
        catch (e) { }
    xhrs.length = 0;
    noConn = false;
}

function insertUnique(arr, value) {
    for (var i = 0; i < arr.length; i++)
        if (arr[i] == value) return;
    arr.push(value);
}

//--------------------------

function update(ver) {
    wait(window);

    var loader = new air.URLLoader();
    loader.dataFormat = "binary";
    var request = new air.URLRequest(gitBaseUrl + "analyzer.air");
    loader.load(request);
    loader.addEventListener("complete", function () {
        var stream = new air.FileStream();
        var file = appStorage.resolvePath("analyzer.air");
        stream.open(file, "write");
        stream.writeBytes(loader.data);
        stream.close();

        var updater = new air.Updater();
        updater.update(file, ver);
    });
}