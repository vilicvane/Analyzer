
var totalCount;
var stopHandle, startHandle;

window.onload = function () {
    top.idToVar(window);
    var saved = top.searchValues;

    (function () {
        var selects = document.getElementsByTagName("select");
        for (var i = 0; i < selects.length; i++)
            selects[i].onpropertychange = function () { this.blur(); };
    })();

    (function () {
        if (saved.used) {
            datefrom.value = saved.datefrom;
            dateto.value = saved.dateto;
        }
        else {
            var date = new Date();
            datefrom.value = formatDate(new Date(date.getTime() + 3600000 * 24 * 30));
            dateto.value = formatDate(new Date(date.getTime() + 3600000 * 24 * 210));
        }
    })();

    (function () {
        type_tn.onclick = type_ep.onclick = check;

        check();

        function check() {
            gep_tn.parentNode.style.display = type_tn.checked ? 'block' : 'none';
        }
    })();

    (function () {
        var items = [];

        var world = new CommitteeItem(committeeData.text, committeeData.name, committeeData.value);
        items.push(world);

        var regions = committeeData.subs;
        for (var i = 0, region; region = regions[i]; i++) {
            var subRegions = region.subs;
            var item = new CommitteeItem(region.text, region.name, region.value);
            world.add(item);
            items.push(item);
            for (var j = 0, subRegion; subRegion = subRegions[j]; j++) {
                var subItem = new CommitteeItem(subRegion.text, subRegion.name, subRegion.value);
                items.push(subItem);
                item.add(subItem);
            }
        }

        world.appendTo(committee_list);
        world.open();

        committee_open_selector.onclick = function () {
            committee_selector.style.display = committee_selector_bg.style.display = 'block';
        };

        committee_done.onclick = function () {
            committee_selector.style.display = committee_selector_bg.style.display = 'none';
            setCommitteesList();
        };

        committee_import.onclick = function () {
            var obj = top.docStorage.resolvePath("");
            obj.browseForOpen("Import", [new top.air.FileFilter("Analyzer Committee List File", "*.clf")]);
            obj.addEventListener("select", function (e) {
                var file = e.target;
                var text = top.readFile(file);
                importList(text);
            });
        };

        committee_export.onclick = function () {
            var obj = top.getAvailFile(top.docStorage, "list(*).clf");
            obj.browseForSave("Export");

            obj.addEventListener("select", function (e) {
                var file = e.target;
                top.writeFile(file, top.committeesList);
            });
        };

        importList();
        setCommitteesList();

        function importList(text) {
            var fromFile = arguments.length > 0;
            if (!fromFile)
                text = top.committeesList;

            var count = 0;
            for (var i = 0; i < items.length; i++)
                if (text.indexOf(items[i].id) >= 0) {
                    count++;
                    items[i].setChecked(true);
                }

            if (fromFile) {
                if (count)
                    committee_open_selector.onclick();
                else
                    alert('Can not get the committees list in this file.');
            }
        }

        function setCommitteesList() {
            var ids = [];
            for (var i = 0; i < items.length; i++)
                if (items[i].checked)
                    ids.push(items[i].id);
            top.committeesList = ids.join(';');
            committee_open_selector.innerHTML = 'Open Selector (' + ids.length + ')';
        }
    })();

    search_bt.onclick = search;

    collect_num.onkeypress = function (e) {
        e = e || event;
        var key = e.keyCode;
        if (key == 61 || key == 43) {
            var n = Math.floor(Number(this.value) / 50 || 0) * 50 + 50;
            this.value = n < 1 ? 1 : (n > totalCount ? totalCount : n);

            return false;
        }
        if (key == 45) {
            var n = Math.ceil(Number(this.value) / 50 || 0) * 50 - 50;
            this.value = n < 1 ? 1 : (n > totalCount ? totalCount : n);

            this.returnValue = false;
            return false;
        }
    };

    collect_num.onblur = function () {
        var n = Number(this.value) || 1;
        this.value = n < 1 ? 1 : (n > totalCount ? totalCount : n);
    };

    collect_bt.onclick = function () {
        totalCount = Number(collect_num.value) || 0;

        before_collect.style.display = "none";
        collecting.style.display = "block";

        startHandle();
    };

    stop_bt.onclick = function () {
        stopHandle();
    };

};

function search() {
    //check duration
    if (Number(duration_from.value) > Number(duration_to.value))
        return alert('The minimum duration can\'t be larger than the maximum one.');

    //check time format
    var df = top.trim(datefrom.value);
    var dt = top.trim(dateto.value);

    var isTN = type_tn.checked;

    (function () {
        var dateRe = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

        if (!dateRe.test(df))
            return alert("Please enter a legal Date From value.");
        if (!dateRe.test(dt))
            return alert("Please enter a legal Date To value.");

        df = format(df);
        dt = format(dt);

        var saved = top.searchValues;
        saved.used = true;
        saved.datefrom = df;
        saved.dateto = dt;

        function format(date) {
            return date.replace(dateRe, function (a, d, m, y) {
                if (d.length == 1)
                    d = '0' + d;
                if (m.length == 1)
                    m = '0' + m;
                return d + '.' + m + '.' + y;
            });
        }
    })();

    var data = new top.RequestData();

    data.add('browsetype', isTN ? 'tn' : 'ep');
    if (isTN && gep_tn.checked)
        data.add('getTN', 'gepTN');

    //committee
    (function () {
        var committees = committee_list.getElementsByTagName('input');

        for (var i = 0, c; c = committees[i]; i++)
            if (c.checked)
                data.add(c.name, c.value);
    })();

    data.add('status', form_status.value);

    data.add('duration_from', duration_from.value);
    data.add('duration_to', duration_to.value);

    addMulti(data, 'selectedAcadAndWorkProp', background_filter);
    addMulti(data, 'selectedSkillsProp', skills_filter);
    addMulti(data, 'selectedLanguage', languages_filter);
    addMulti(data, 'selectedDegree', degree_filter);

    data.add('date_from', df);
    data.add('date_to', dt);

    //other params
    //data.add('page', '1');
    data.add(isTN ? 'tncode' : 'sncode', '');
    data.add('statusid', '9');
    data.add('buttontype', '');
    data.add('countrycode', '');
    data.add('orgsearchtext', '');
    data.add('questiontext', '');

    (function () {
        var url = 'http://www.myaiesec.net/exchange/' + (isTN ? 'browseintern.do?operation=BrowseInternSearchResult&program=browse' : 'browsestudent.do?operation=BrowseStudentSearchResult');

        var pageCount;
        var pageIndex;
        var rCount;
        var cancelWait;

        clData = "";
        clCount = 0;

        cancelWait = top.wait(window);

        h400.style.display = "none";
        h200.style.display = "block";

        top.minimize();

        var timeout, xhr;

        (function () {
            var process = arguments.callee;

            pageIndex = 1;

            xhr = top.sendRequest("post", url, data, function (text) {
                clearTimeout(timeout);
                if (dealOverload(text, process))
                    return;

                var count = Number((/ \| 1-\d+ \| of (\d+) /.exec(text) || [0, 0])[1]);
                totalCount = count;

                startHandle = function () {
                    rCount = totalCount;
                    pageCount = Math.ceil(totalCount / 50);
                    cl_percent.innerHTML = "0/" + totalCount;
                    getForms(text);
                };

                cancelWait();
                found_count.innerHTML = count ? (count > 1 ? "There're " + count + " forms found." : "There's 1 form found.") : "No form found.";
                collect_num.value = count < 100 ? count : 100;
            });

            dealTimeout(xhr, process);
        })();

        function getForms(text) {
            clearTimeout(timeout);
            if (dealOverload(text, callback))
                return;

            var count = Number((/ \| \d+-\d+ \| of (\d+) /.exec(text) || [0, 0])[1]);

            if (totalCount > 0) {
                if (count == 0) {
                    if (!top.noConn && confirm("There seems to be some problems with the request, do you want to retry? (Recommended, if you haven't seen this message for too many times.)"))
                        pageIndex--;
                    else
                        return finish();
                }
            }
            else
                return finish();

            var handle = collect(text, prgCallback, callback, rCount > 50 ? 50 : rCount);

            stopHandle = function () {
                handle();
                finish();
            };

            pageIndex++;

            function prgCallback() {
                rCount--;
                cl_percent.innerHTML = (totalCount - rCount) + "/" + totalCount;
            }

            function callback() {
                if (pageIndex <= pageCount) {
                    var xhr = top.sendRequest("post", url + (url.indexOf("?") < 0 ? "?" : "&") + "page=" + pageIndex, data, getForms);
                    dealTimeout(xhr, callback);
                }
                else finish();
            }
        }

        function dealTimeout(xhr, callback) {
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                try { xhr.onreadystatechange = function () { }; xhr.abort() }
                catch (e) { }
                if (confirm('It has taken too much time to get the form list. Would you like to retry?'))
                    callback();
                else
                    finish();
            }, 180000);
        }

        function dealOverload(text, callback) {
            var groups;
            if (groups = /(Due to heavy load on the system)|(Unfortunately we are experiencing a temporary problem)/.exec(text)) {
                var msg = 'Would you like to retry?';
                if (groups[1])
                    msg = 'Due to heavy load on the system, your request can not be executed right now. ' + msg;
                else if (groups[2])
                    msg = 'Unfortunately myaiesec.net is experiencing a temporary problem that prevents it from completing your request. ' + msg;

                if (confirm(msg))
                    callback();
                else finish();

                return true;
            }
            else return false;
        }

    })();

    function addMulti(data, name, select) {
        var ops = select.options;
        for (var i = 0; i < ops.length; i++)
            if (ops[i].selected)
                data.add(name, ops[i].value);
    }

    function finish() {
        top.setFormInfo(clData, clCount);
        top.fns["import"].exec();
    }
}

function removeChildNodes(parent) {
    while (parent.childNodes[0])
        parent.removeChild(parent.childNodes[0]);
}

function formatDate(date) {
    var y = date.getFullYear().toString();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    m = (m < 10 ? "0" : "") + m;
    d = (d < 10 ? "0" : "") + d;
    return d + "." + m + "." + y;
}

/*
var cf = $('committeeFilter');
var cbs = cf.getElementsByTagName('input');
var world;
var region;
for (var i = 0, cb; cb = cbs[i]; i++)
switch (cb.name) {
case 'world':
world = {
name: cb.name,
value: cb.value,
text: cb.nextSibling.data.replace(/^\s+|\s+$/g, ''),
subs: []
};
break;
case 'regions':
region = {
name: cb.name,
value: cb.value,
text: cb.parentNode.getElementsByTagName('b')[0].innerHTML.replace(/^\s+|\s+$/g, ''),
subs: []
};
world.subs.push(region);
break;
case 'subRegionsId':
region.subs.push({
name: cb.name,
value: cb.value,
text: cb.nextSibling.data.replace(/^\s+|\s+$/g, '')
});
break;
}
*/


//committee selector

function CommitteeItem(text, name, value) {
    var that = this;
    
    var lineHeight = 22;
    var ele = document.createElement('li');
    ele.className = 'committee_item';

    var checkbox = document.createElement('input');
    var label = document.createElement('label');
    checkbox.id = label.htmlFor = 'comittee_item_' + Math.floor(Math.random() * 100000000);
    checkbox.type = 'checkbox';
    checkbox.name = name;
    checkbox.value = value;
    label.innerHTML = label.title = text;

    checkbox.onclick = function () {
        that.setChecked(this.checked, true);
    };

    ele.appendChild(checkbox);
    ele.appendChild(label);

    var parentItem;
    var childItems = null;
    var childList = null;

    this.id = name + ':' + value;
    this.checked = false;

    this.add = function (item) {
        if (!childItems) {
            childItems = [];
            childList = document.createElement('ul');
            childList.className = 'committee_list';
            ele.appendChild(childList);
            initToggle();
        }

        childItems.push(item);
        item.appendTo(childList, that);
    };

    this.appendTo = function (parent, _parentItem) {
        parent.appendChild(ele);
        parentItem = _parentItem;
    };

    this.setChecked = function (checked, down) {
        that.checked = checkbox.checked = checked;
        if (down && childItems)
            for (var i = 0, item; item = childItems[i]; i++)
                item.setChecked(checked, true);
    };

    function initToggle() {
        var closed = true;

        var toggle = document.createElement('span');
        toggle.className = 'toggle';
        ele.insertBefore(toggle, ele.firstChild);

        toggle.onclick = function () {
            (closed ? that.open : that.close)();
        };

        that.close = function () {
            closed = true;
            toggle.innerHTML = '+';
            ele.style.height = lineHeight + 'px';
        };

        that.open = function () {
            closed = false;
            toggle.innerHTML = '-';
            ele.style.height = 'auto';
        };

        that.close();
    }

}