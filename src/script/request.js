/// <reference path="AIRAliases.js" />
var loginExpKey = "<title>AIESEC - Welcome</title>";

var xhrs = [];

(function () {
    var queue = [];

    this.logining = false;

    this.login = function(callback) {
        if (callback) queue.push(callback);
        if (logining) return;

        logining = true;

        var data = new air.URLVariables();
        data.userName = user.account;
        data.password = user.password;

        loginMain();

        function loginMain () {

            var loader = new air.URLLoader();
            var request = new air.URLRequest("http://www.myaiesec.net/login.do");
            request.requestHeaders.push(new air.URLRequestHeader("Referer", "http://www.myaiesec.net/"));
            request.method = "post";
            request.data = data;
            loader.load(request);
            loader.addEventListener("complete", function () {
                logining = false;
                for (var i = 0; i < queue.length; i++)
                    try {
                        queue[i]();
                    } catch (e) { }
                queue.length = 0;

            });

            xhrs.push(loader);

            statusBox.set("Logging in...");
        }
    };
})();

function sendRequest(method, url, data, callback, isLogin) {
    if (noConn) return null;

    var xhr = new XMLHttpRequest();
    xhrs.push(xhr);

    method = method.toLowerCase();

    var dStr = data ? data.toString() : "";

    switch (method) {
        case "get":
            xhr.open("get", url + (dStr ? "?" + dStr : ""));
            xhr.setRequestHeader("If-Modified-Since", "0");
            xhr.send(null);
            break;
        case "get-cache":
            xhr.open("get", url + (dStr ? "?" + dStr : ""));
            xhr.send(null);
            break;
        case "post":
            xhr.open("post", url);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.send(dStr);
            break;
    }

    if (window.statusBox) statusBox.set("Loading...");

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (window.statusBox) statusBox.reset();
            var text = xhr.responseText;
            if (text.indexOf(loginExpKey) < 0 || isLogin)
                try {
                    callback(text, xhr.status);
                } catch (e) { }
            else
                login(function () { sendRequest(method, url, data, callback); }, true);
        }
    };

    return xhr;
}

function RequestData() {
    var data = {};

    this.add = function (name, value) {
        if (data["#" + name])
            data["#" + name].push(encodeURIComponent(value));
        else
            data["#" + name] = [encodeURIComponent(value)];
    };

    this.remove = function (name) {
        delete data["#" + name];
    };

    this.toString = function () {
        var strs = [];
        for (var i in data)
            if (i.indexOf("#") == 0)
                for (var j = 0; j < data[i].length; j++)
                    strs.push(i.substr(1) + "=" + data[i][j]);
        return strs.join("&");
    };
}