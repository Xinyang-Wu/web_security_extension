function cookies_getAll() {
    var flag = confirm("Confirm to delete all cookies in browser?");
    if (flag) {
        var trans = db.transaction(urlTable, 'readwrite');
        var store = trans.objectStore(urlTable);
        var cursorRequest = store.clear();
        cursorRequest.onsuccess = function() {
            console.log("Success")
        }
        cursorRequest.onerror = function() {
            console.log("Error")
        }
        chrome.cookies.getAll({}, function(cookie) {
            console.log(cookie);
            cookies_del(cookie);
        })
    }
}

function cookies_del(cookie) {
    for (var s = 0; s < cookie.length; s++) {
        var url = "http" + (cookie[s].secure ? "s" : "") + "://" + cookie[s].domain + cookie[s].path;
        chrome.cookies.remove({ url: url, name: cookie[s].name })
    }
}

var db, dbName = 'demoDb',
    dbVersion = 1,
    urlTable = 'CkDel';
//create indexeddb
var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
if (!indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available");
} else {
    console.log("Database created successfully!");
}
openIndexedDB();

// open database
function openIndexedDB() {
    // open a database
    var request = indexedDB.open(dbName, dbVersion);

    // error when open
    request.onerror = function(e) {
        console.log(e.currentTarget.error.message);
    };

    // success!
    request.onsuccess = function(e) {
        db = e.target.result;
        console.log('DB opened successfully!');
    };


    request.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(urlTable)) {
            console.log("create new object store");
     
            var objectStore = db.createObjectStore(urlTable, {
                keyPath: "name",
                autoIncrement: false
            });

          
            objectStore.createIndex("name", "name", {
                unique: true
            });
        }
        console.log('database version： ' + dbVersion);
    };
}

function loadTableData() {
    var trans = db.transaction(urlTable, 'readwrite');
    var store = trans.objectStore(urlTable);
    var cursorRequest = store.openCursor();
    cursorRequest.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
            console.log(cursor.value);
            cursor.continue(); 
        }
    }
}

function delById(id) {
    if (!db || !id) {
        return;
    }
  
    var transaction = db.transaction(urlTable, 'readwrite');

  
    var store = transaction.objectStore(urlTable);

    
    var delPersonRequest = store.delete(id);
    delPersonRequest.onsuccess = function(e) {
        //console.log("function delete success");
    }
    delPersonRequest.onerror = function(e) {
        //console.log(e.target.error);
    }
}


function addUrl(tab_id, tab_url) {

    if (!db) {
        return;
    }

    var transaction = db.transaction(urlTable, 'readwrite');

    
    var store = transaction.objectStore(urlTable);

    var addUrlRequest = store.add({ name: tab_id, url: tab_url });
    addUrlRequest.onsuccess = function(e) {
        console.log("function add success");
    }
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status != "loading") {
        return;
    }

    if (tab['url'] != "chrome://newtab/" && tab['url'] != "chrome://extensions/") {
        var trans = db.transaction(urlTable, 'readwrite');
        var store = trans.objectStore(urlTable);
        var cursorRequest = store.getAll();

        cursorRequest.onsuccess = function(e) {

            var n1; //id
            var n2; //url
            var n3 = "";
            for (var i = 0; i < cursorRequest.result.length; i++) {
                n3 = n3 + cursorRequest.result[i].url + "\r\n";
                if (cursorRequest.result[i].name == tabId) {
                    n1 = cursorRequest.result[i].name;
                    n2 = cursorRequest.result[i].url;
                }
            }

            if (n1 != undefined) {
                if (n2.split('/')[2] != tab['url'].split('/')[2]) {
                    console.log("Notequal");
                    var flag = confirm("Currently active url \r\n" + n3 + "\r\ndetect url switched from" + n2.split('/')[2] + " to " + tab['url'].split('/')[2] + " Confirm to delete the cookies?");
                    if (flag) {
                        chrome.cookies.getAll({ url: n2 }, function(cookie) {
                            cookies_del(cookie);
                        });
                        console.log("cookies deleted successfully" + n2);
                    }
                    delById(tabId);
                    addUrl(tabId, tab['url']);
                }
            } else {
                addUrl(tabId, tab['url']);
            }
        }
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status == "complete") {
        loadTableData();
    }
});

chrome.tabs.onRemoved.addListener(function(tab_id) {

    var trans = db.transaction(urlTable, 'readwrite');
    var store = trans.objectStore(urlTable);
    var cursorRequest = store.getAll();

    cursorRequest.onsuccess = function(e) {
        var n1; //id
        var n2; //url
        var n3 = "";
        for (var i = 0; i < cursorRequest.result.length; i++) {

            if (cursorRequest.result[i].name == tab_id) {
                n1 = cursorRequest.result[i].name;
                n2 = cursorRequest.result[i].url;
            } else {
                n3 = n3 + cursorRequest.result[i].url + "\r\n";
            }
        }

        if (n1 != undefined) {
            console.log("Notequal");
            var flag = confirm("Currently active url \r\n" + n3 + "\r\ndetect user closed a session " + n2 + " confirm to delete the cookies?");
            if (flag) {
                chrome.cookies.getAll({ url: n2 }, function(cookie) {
                    cookies_del(cookie);
                });
                console.log("cookies deleted successfully" + n2);
                delById(tab_id);
            }
            
        }
        loadTableData();
    }
});