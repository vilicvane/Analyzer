/// <reference path="AIRAliases.js" />
var version = {
    ver: "1.5",
    count: 22
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
var sidFile = 'app:sid';

/*
var loader = new air.URLLoader();
var request = new air.URLRequest("http://localhost:55600/Test/t.ashx");
request.requestHeaders.push(new air.URLRequestHeader("Referer", "http://www.vilic.info"));
loader.load(request);
loader.addEventListener("complete", function () {
    var xhr = new XMLHttpRequest();
    xhr.open("get", "http://localhost:55600/Test/t.ashx");
    xhr.setRequestHeader("Referer", "http://vilic.info");
    xhr.send();
});
*/

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

    setTimeout(function () {
        sendRequest("get", "http://www.vilic.info/aiesec/analyzer/version.json", "", function (text) {
            onlineVer = eval("(" + text + ")");
            //latest version
            if (onlineVer.latest.count > version.count) {
                var nvs = onlineVer.latest.ver;
                defStatus = '<a href="#" onclick="update(true);">NEWer version (' + nvs + ') available.</a>';
                statusBox.reset();
            }
            //latest stable version
            if (onlineVer.count > version.count) {
                if (confirm("A new stable version(" + onlineVer.ver + ") is now available, click OK to update."))
                    update(false);
            }
        });
    }, 500);

    fns = {
        "import": { bt: import_bt, isAvail: function () { return !!user.account; }, src: "import.html", exeFn: importData },
        "export": { bt: export_bt, isAvail: function () { return formCount > 0 && user.account; }, src: "export.html", exeFn: exportData },
        "save": { bt: save_bt, isAvail: function () { return formCount > 0 && user.account; }, exeFn: saveData },
        "tools": { bt: tools_bt, isAvail: function () { return formCount > 0 && user.account; }, src: "tools.html", exeFn: showTools },
        "settings": { bt: settings_bt, isAvail: function () { return true; }, src: "settings.html", exeFn: showSettings },
        "exit": { bt: exit_bt, isAvail: function () { return true; }, exeFn: exit },
        "search": { src: "search.html", exeFn: search }
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
                win.x -= dw / 2;
                win.y -= dh / 2;
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
            return str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/^[\s\S]*[\r\n",][\s\S]*$/, function (m) {
                return '"' + m.replace(/"/g, '""') +'"';
            });
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

function exit(force) {
    if (force || confirm("Are you sure you want to exit?"))
        close();
    else return false;
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

function getVerStr(version) {
    return version.ver;
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

function update(latest) {
    var shell = new ActiveXObject("WScript.Shell");
    var ver = latest ? onlineVer.latest : onlineVer;

    if (confirm("Click OK to update automatically or Cancel to download manually.")) {
        shell.run('cscript /nologo source\\update.js "' + ver.update + '"');
        exit(true);
    }
    else shell.run('explorer "' + ver.url + '"');
}