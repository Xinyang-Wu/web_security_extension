var bg = chrome.extension.getBackgroundPage();
document.getElementById("btn").onclick = function() {
    bg.cookies_getAll();
};