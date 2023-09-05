function CLANNAD(){
     var urls = [
        'https://userscloud.com/p3qdw6dptegf',
        'https://userscloud.com/mkujaxg8myx2',
        'https://userscloud.com/hlh042najz3w',
    ]
    for (var i = 0; i < urls.length; i++){
        window.open(urls[i]);
    }
}

function CLANNADa(){
     var urls = [
        'https://userscloud.com/mf8uugo0lmnv',
        'https://userscloud.com/gxwvpi7389pz',
    ]
    for (var i = 0; i < urls.length; i++){
        window.open(urls[i]);
    }
}

// 获取当前的 cookie 值
var voteCookie = getCookie("vote");
var tagScriptCookie = getCookie("tag-script");
var hideNewsTickerCookie = getCookie("hide-news-ticker");
var modeCookie = getCookie("mode");

// 设置 SameSite 和 Secure 属性，并更新 cookie 值
document.cookie = "vote=" + voteCookie + "; SameSite=None; Secure";
document.cookie = "tag-script=" + tagScriptCookie + "; SameSite=None; Secure";
document.cookie = "hide-news-ticker=" + hideNewsTickerCookie + "; SameSite=None; Secure";
document.cookie = "mode=" + modeCookie + "; SameSite=None; Secure";

function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length === 2) return parts.pop().split(";").shift();
}

window.addEventListener('DOMContentLoaded', function() {
    var apiKey = 'ZWiIYM8EHJLUt7SiBut2ig';
    var apiUrl = 'https://yande.re/post.json?limit=1000000&api_key=' + apiKey;

    fetch(apiUrl)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            var randomIndex = Math.floor(Math.random() * data.length);
            var imageUrl = data[randomIndex].file_url;

            document.body.style.backgroundImage = 'url(' + imageUrl + ')';
            document.body.style.backgroundSize = 'cover';  // 设置背景图片大小以填充整个元素
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundPosition = 'top';  
        })
        .catch(function(error) {
            console.log(error);
        });
});
