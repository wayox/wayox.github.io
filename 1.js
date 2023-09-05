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
