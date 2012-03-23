var clData = "", clCount = 0;

function collect(html, prgCallback, callback, rCount) {
    var re = /view(Tn|Ep)Popup\('(\d+)'\)/g,
        infos = [],
        parts;

    var isTN;

    while ((parts = re.exec(html)) && rCount--)
        infos.push({
            isTN: isTN = parts[1] == "Tn",
            url: (parts[1] == "Tn" ? "viewtn.do?operation=executeAction&tnId=" : "viewep.do?operation=executeAction&epId=") + parts[2]
        });

    var i = 0,
        count = infos.length,
        xhr,
        timeout;

    if (count > 0) next();
    else callback();

    return function () {
        try {
            xhr.onreadystatechange = function () { };
            xhr.abort();
        }
        catch (e) { }
    };

    function next() {
        var isTN = infos[i].isTN;
        var url = "http://www.myaiesec.net/exchange/" + infos[i++].url;

        connect();

        function connect() {
            clearTimeout(timeout);
            xhr = top.sendRequest("get", url, "", function (text) {
                clearTimeout(timeout);
                if (deal(text, isTN)) {
                    prgCallback();
                    if (i < count) next();
                    else callback();
                }
                else connect();
            });
            timeout = setTimeout(reTry, 30000);
        }

        function reTry() {
            try {
                xhr.onreadystatechange = function () { };
                xhr.abort();
            }
            catch (e) { }
            top.statusBox.reset();
            connect();
        }
    }

}

function deal(html, isTN) {
    var rightRE = /<div class="right-content .*?>\s*(<table(?: .*?)?>[\s\S]+?<\/table>)/;
    var rightHTML = (rightRE.exec(html) || [])[1];

    var leftRE = /<div class="left-content .*?>\s*(<table(?: .*?)?>[\s\S]+?<\/table>)/;
    var leftHTML = (leftRE.exec(html) || [])[1];

    if (!rightHTML || !leftHTML)
        return false;

    clCount++;
    clData += "\n--------------------------------------------------";

    try {
        //right-content
        (function () {
            var temp = document.createElement("div");
            temp.innerHTML = rightHTML.replace(/on\w+\s*=\s*".+?"/g, "");
            var table = temp.firstChild;
            var rows = table.rows;
            clData += '\n>> Basic\n';

            if (isTN) {
                var extra = 0;
                if (!rows[2].cells[1])
                    extra += 2;

                var mobile = getText(rows[11 + extra].cells[0], true);

                clData +=
                ' > TN ID\n' +
                getText(rows[1].cells[0], true) + '\n';

                if (extra)
                    clData +=
                        ' > Is GPI\n' +
                        'Yes\n';

                clData +=
                ' > Raised By\n' +
                getText(rows[7 + extra].cells[0], true) + '\n' +
                ' > Raised Date\n' +
                getText(rows[9 + extra].cells[0], true) + '\n' +
                ' > Status\n' +
                getText(rows[2 + extra].cells[1], true) + '\n' +
                ' > Exchange Type\n' +
                getText(rows[4 + extra].cells[1], true) + '\n' +
                ' > Mobile\n' +
                mobile + '\n';

                var cby = rows[13 + extra];
                if (cby)
                    clData +=
                        ' > Co-ordinated By\n' +
                        getText(cby.cells[0], true) + '\n';
            }
            else {
                var mobile = getText(rows[14].cells[0], true);
                clData +=
                ' > EP ID\n' +
                getText(rows[1].cells[0], true) + '\n' +
                ' > Raised By\n' +
                getText(rows[10].cells[0], true) + '\n' +
                ' > Raised Date\n' +
                getText(rows[12].cells[0], true) + '\n' +
                ' > Status\n' +
                getText(rows[2].cells[1], true) + '\n' +
                ' > Exchange Type\n' +
                getText(rows[4].cells[1], true) + '\n' +
                ' > Mobile\n' +
                mobile + '\n';
            }
        })();

        //left-content
        (function () {
            var temp = document.createElement("div");
            temp.innerHTML = leftHTML.replace(/on\w+\s*=\s*".+?"/g, "");
            var table = temp.firstChild;
            var rows = table.rows;

            (function () {
                var cell = rows[0].cells[0];
                var fonts = cell.getElementsByTagName('font');
                if (isTN)
                    clData +=
                    ' > Organisation Name\n' +
                    getText(fonts[0]) + '\n' +
                    ' > Organisational Position\n' +
                    getText(fonts[1]) + '\n' +
                    ' > Committee\n' +
                    getText(fonts[2]) + '\n';
                else
                    clData +=
                    ' > EP Name\n' +
                    getText(fonts[0]) + '\n' +
                    ' > Committee\n' +
                    getText(fonts[1]) + '\n' +
                    ' > Country\n' +
                    getText(fonts[2]) + '\n';
            })();

            for (var i = 3; i < rows.length; i++) {
                var row = rows[i];

                var cells = row.cells;
                if ((cells[0].getElementsByTagName('font')[0] || {}).className == 'heading-class')
                    clData += "\n>> " + getText(cells[0]) + "\n";
                else if (cells.length == 2) {
                    var itemName = getText(cells[0]);
                    clData += (itemName ? " > " + itemName + "\n" : "") + (getText(cells[1], true) || "-") + "\n";
                }
            }
        })();
    }
    catch (e) {
        top.air.trace(e);
        return false;
    }

    return true;

    function getText(ele, ct) {
        var text = ele.innerHTML.replace(/<.+?>/g, " ").replace(/&nbsp;/g, " ").replace(/>/g, "&gt;");  //.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        text = (text.match(/^\s*([\s\S]*?)\s*$/) || [null, ""])[1];
        if (!text) return "";
        if (ct && text.indexOf("\n") > 0)
            text = text.replace(/\s*\n\s*/g, "\n");
        text = text.replace(/\s+/g, " ");
        return text;
    }
}